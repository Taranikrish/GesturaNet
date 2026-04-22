import asyncio
import time
from math import hypot

import cv2
import mediapipe as mp
import numpy as np
import screen_brightness_control as sbc
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

import state as st
from config import (
    CAMERA_INDEX,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    CAMERA_FPS,
    INACTIVE_TIMEOUT,
    INACTIVE_FPS,
)
from draw_utils import draw_landmarks_on_frame
from mediapipe_setup import hands
from websocket_server import broadcast

from gesture_modes.mode_selector import update_mode_from_left_hand
from gesture_modes.set1_cursor import process_set1
from gesture_modes.set2_system import process_set2

# ── Volume & Brightness Integration ─────────────────────────────────────────
AUDIO_VOLUME = None
VOLUME_MIN = -65.25
VOLUME_MAX = 0.0

def init_audio_device() -> None:
    global AUDIO_VOLUME, VOLUME_MIN, VOLUME_MAX
    try:
        speakers = AudioUtilities.GetSpeakers()
        if hasattr(speakers, "EndpointVolume"):
            volume = speakers.EndpointVolume
        elif hasattr(speakers, "Activate"):
            interface = speakers.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
        else:
            raise RuntimeError("No EndpointVolume interface available from speakers")

        AUDIO_VOLUME = volume
        if hasattr(volume, "GetVolumeRange"):
            VOLUME_MIN, VOLUME_MAX, _ = volume.GetVolumeRange()
        elif hasattr(volume, "GetMasterVolumeLevelRange"):
            VOLUME_MIN, VOLUME_MAX, _ = volume.GetMasterVolumeLevelRange()
        else:
            VOLUME_MIN, VOLUME_MAX = -65.25, 0.0

        print(f"[Audio] inited volume range {VOLUME_MIN}..{VOLUME_MAX}")
    except Exception as e:
        AUDIO_VOLUME = None
        print(f"[Audio] init error: {e}")

last_hand_count = 0

def get_hands(results):
    """Sort landmarks into left and right physical hands using MediaPipe labels directly."""
    left_hand = None
    right_hand = None

    if not results.hand_landmarks:
        return left_hand, right_hand

    handedness_list = getattr(results, 'handedness', None)

    for hand_idx, handlm in enumerate(results.hand_landmarks):
        if handedness_list and len(handedness_list) > hand_idx:
            label = handedness_list[hand_idx][0].category_name
        else:
            label = "Right" if hand_idx == 0 else "Left"

        # Mirror swap: flipped frame causes MediaPipe to invert labels
        if label == "Left":
            right_hand = handlm
        elif label == "Right":
            left_hand = handlm

    global last_hand_count
    current_hand_count = len(results.hand_landmarks)
    if current_hand_count != last_hand_count:
        labels = []
        if handedness_list:
            for h in handedness_list:
                labels.append(h[0].category_name)
        print(f"[Camera Tracker] Hands: {current_hand_count}, MP Labels: {labels} → Left(Mode): {'YES' if left_hand else 'NO'}, Right(Gesture): {'YES' if right_hand else 'NO'}")
        last_hand_count = current_hand_count

    return left_hand, right_hand

def get_finger_distances(frame, right_hand):
    """Calculates index-thumb and middle-thumb distances in pixels."""
    if not right_hand:
        return []
    
    idx_lm = right_hand[8]
    thumb_lm = right_hand[4]
    middle_lm = right_hand[12]
    
    height, width, _ = frame.shape
    x_t, y_t = int(thumb_lm.x * width), int(thumb_lm.y * height)
    x_i, y_i = int(idx_lm.x * width), int(idx_lm.y * height)
    x_m, y_m = int(middle_lm.x * width), int(middle_lm.y * height)
    
    cv2.line(frame, (x_t, y_t), (x_i, y_i), (0, 255, 0), 2)
    cv2.line(frame, (x_t, y_t), (x_m, y_m), (255, 0, 0), 2)
    
    dist_index = hypot(x_i - x_t, y_i - y_t)
    dist_middle = hypot(x_m - x_t, y_m - y_t)
    
    return [dist_index, dist_middle]

# ── Activity Monitor ──────────────────────────────────────────────────────────
def check_activity() -> None:
    """
    Background thread: flips the engine to INACTIVE after INACTIVE_TIMEOUT
    seconds of no detected gesture activity.
    """
    while True:
        elapsed = time.time() - st.state.last_gesture_time
        if st.state.active and elapsed > INACTIVE_TIMEOUT:
            st.state.active = False
            st.state.fps    = INACTIVE_FPS
            print("[Engine] → INACTIVE (timeout)")
        time.sleep(1)


# ── Capture Loop ──────────────────────────────────────────────────────────────
def run_capture(loop: asyncio.AbstractEventLoop) -> None:
    """
    Main OpenCV loop.  Runs in the main thread; uses *loop* to schedule
    WebSocket broadcasts from this synchronous context.
    """
    current_camera_index = st.state.camera_index
    cap = cv2.VideoCapture(current_camera_index, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS,          CAMERA_FPS)
    print(f"[Engine] Camera started at index {current_camera_index}")

    try:
        from pygrabber.dshow_graph import FilterGraph
        st.state.available_cameras = FilterGraph().get_input_devices()
        print(f"[Engine] Available cameras: {st.state.available_cameras}")
    except ImportError:
        print("[Engine] pygrabber not installed, cannot fetch camera names.")
        st.state.available_cameras = []

    while True:
        if st.state.camera_index != current_camera_index:
            cap.release()
            current_camera_index = st.state.camera_index
            cap = cv2.VideoCapture(current_camera_index, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS,          CAMERA_FPS)
            print(f"[Engine] Camera switched to index {current_camera_index}")

        if not cap.isOpened():
            time.sleep(1)
            continue

        target_fps  = st.state.fps
        frame_delay = 1.0 / target_fps
        start       = time.time()

        ret, frame = cap.read()
        if not ret:
            print("[Engine] Failed to read frame")
            time.sleep(1)
            continue

        frame = cv2.flip(frame, 1)
        frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

        # ── MediaPipe inference ───────────────────────────────────────────
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        results   = hands.detect(mp_image)

        gesture_info = {"gesture": "none"}

        if results.hand_landmarks:
            draw_landmarks_on_frame(frame, results.hand_landmarks)
            
            if st.state.active:
                left_hand, right_hand = get_hands(results)
                
                # ── Left Hand: Mode Selector ─────────────────────────────────
                if left_hand:
                    new_mode = update_mode_from_left_hand(left_hand, st.state.current_mode)
                    if new_mode != st.state.current_mode:
                        st.state.current_mode = new_mode
                        print(f"[Engine] Switched to MODE {st.state.current_mode}")

                # ── Right Hand: Action Executor ──────────────────────────────
                if right_hand:
                    if st.state.current_mode == 1:
                        # Set 1 (Cursor mode) uses normalized landmarks internally
                        gesture_info["gesture"] = process_set1(right_hand)
                    elif st.state.current_mode == 2:
                        # Set 2 (System mode) — Pinch & Slide
                        gesture_info["gesture"] = process_set2(right_hand, frame, AUDIO_VOLUME)
                else:
                    gesture_info["gesture"] = "none" # Right hand missing
                st.state.gesture = gesture_info.get("gesture", "none")
            else:
                st.state.gesture = 'none'

        # ── Broadcast state ───────────────────────────────────────────────
        payload = {
            "gesture":         st.state.gesture,
            "active":          st.state.active,
            "show_camera":     st.state.show_camera,
            "current_mode":    st.state.current_mode,
            "smoothing":       st.state.smoothing,
            "sensitivity":     st.state.sensitivity,
            "fps":             st.state.fps,
            "cursor_x":        st.state.cursor_x,
            "cursor_y":        st.state.cursor_y,
            "scroll_delta":    st.state.scroll_delta,
            "camera_index":    st.state.camera_index,
            "available_cameras": st.state.available_cameras,
            "timestamp":       time.time(),
        }

        if st.state.show_camera:
            import base64
            # Keep quality low for performance over WS
            _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 40])
            payload["frame"] = base64.b64encode(buffer).decode("utf-8")

        asyncio.run_coroutine_threadsafe(broadcast(payload), loop)

        # Reset only scroll delta (transient state), NOT gesture
        st.state.scroll_delta = 0.0

        # ── Overlay & Display (Optional for debugging) ─────────────────
        # cv2.imshow("Gesture Engine", frame) # REVERSIBLE: Uncomment for DESKTOP DEBUG
        st.state.window_open = False

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        # ── Frame pacing ──────────────────────────────────────────────────
        processing_time = time.time() - start
        sleep_time = max(0, frame_delay - processing_time)
        time.sleep(sleep_time)

    cap.release()
    cv2.destroyAllWindows()
