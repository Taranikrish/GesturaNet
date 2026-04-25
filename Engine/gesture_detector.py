import math
import time
from typing import Tuple

from config import DRAG_THRESHOLD, DRAG_RELEASE_THRESHOLD
import state as st

# Scroll timing tracking
scroll_state = {
    "active": False,
    "start_time": None,
    "delay_seconds": 3
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_landmark(landmarks, idx: int) -> Tuple[float, float]:
    lm = landmarks[idx]
    return lm.x, lm.y


def distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


# ── Gesture Detection ─────────────────────────────────────────────────────────
def detect_gesture(landmarks) -> dict:
    """
    Classify a single hand's landmarks into gestures based on finger proximity.

    Priority order: drag > drop > right_click > left_click > scroll > move > open

    Landmarks: 4=thumb, 8=index, 12=middle, 16=ring, 20=pinky

    drag        — lm 4 + 8 + 12 all pinch together (all dists < DRAG_THRESHOLD)
    drop        — lm 8 + 12 still close, lm 4 pulls away (only if WAS dragging)
    right_click — lm 12 + 4 pinch (middle + thumb close, dist < 0.08)
    left_click  — lm 8 + 4 pinch (index + thumb close, dist < 0.08, middle away)
    double_click— lm 16 + 4 pinch (ring + thumb close, dist < 0.08)
    scroll      — lm 8, 12, 16, 20 all clustered (all dists < 0.12, held 3 seconds)
    move        — lm 8 + 12 pinch (index + middle close, dist < 0.08)
    open        — everything else
    """
    index_tip  = get_landmark(landmarks, 8)
    thumb_tip  = get_landmark(landmarks, 4)
    middle_tip = get_landmark(landmarks, 12)
    ring_tip   = get_landmark(landmarks, 16)
    pinky_tip  = get_landmark(landmarks, 20)

    thumb_index_dist  = distance(thumb_tip, index_tip)
    index_middle_dist = distance(index_tip, middle_tip)
    middle_ring_dist  = distance(middle_tip, ring_tip)
    ring_pinky_dist   = distance(ring_tip, pinky_tip)
    thumb_middle_dist = distance(thumb_tip, middle_tip)
    thumb_pinky_dist  = distance(thumb_tip, pinky_tip)

    # DRAG: all three main tips (4, 8, 12) pinch together
    if (thumb_index_dist < DRAG_THRESHOLD
            and thumb_middle_dist < DRAG_THRESHOLD
            and index_middle_dist < DRAG_THRESHOLD):
        return {"gesture": "drag", "point": index_tip}

    # DROP: only trigger if we WERE already in dragging state, and thumb pulls away
    if st.is_dragging and index_middle_dist < DRAG_THRESHOLD and thumb_index_dist > DRAG_RELEASE_THRESHOLD:
        return {"gesture": "drop", "point": index_tip}

    # RIGHT CLICK: middle finger curled down (closer to wrist) and far from index finger
    wrist = get_landmark(landmarks, 0)
    mid_palm_dist = distance(middle_tip, wrist)
    if mid_palm_dist < 0.12 and index_middle_dist > 0.10:
        return {"gesture": "right_click", "point": index_tip}

    # LEFT CLICK: index + thumb pinch (8 & 4) — only if middle is NOT close
    # LEFT CLICK: thumb + pinky finger pinch/overlap (4 & 20)
    if thumb_pinky_dist < 0.08 :#and thumb_index_dist > 0.10:
        return {"gesture": "left_click", "point": index_tip}
    # SCROLL: all four fingers (index, middle, ring, pinky) clustered together
    # Must be held for 3 seconds before triggering to avoid interference with left_click
    if (index_middle_dist < 0.12 and middle_ring_dist < 0.12 and ring_pinky_dist < 0.12):
        # Start or continue scroll timing
        if not scroll_state["active"]:
            scroll_state["active"] = True
            scroll_state["start_time"] = time.time()
        
        # Only trigger scroll if held for 3 seconds
        elapsed = time.time() - scroll_state["start_time"]
        if elapsed >= scroll_state["delay_seconds"]:
            scroll_y = (index_tip[1] + middle_tip[1] + ring_tip[1] + pinky_tip[1]) / 4.0
            return {"gesture": "scroll", "point": index_tip, "scroll_y": scroll_y}
        else:
            # Still in delay period, return open to avoid move interference
            return {"gesture": "open", "point": index_tip}
    else:
        # Scroll gesture broken, reset timing
        scroll_state["active"] = False
        scroll_state["start_time"] = None

    # MOVE: index + middle pinch (8 & 12) — for cursor movement
    if index_middle_dist < 0.08 and thumb_index_dist > 0.10:
        return {"gesture": "move", "point": index_tip}

    # OPEN: everything else
    return {"gesture": "open", "point": index_tip}


