import math
import numpy as np
import screen_brightness_control as sbc
import time
import threading
import json
import urllib.request

import pyautogui

import state as st

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

# ── Pinch & Slide System ─────────────────────────────────────────────────────
# Index+Thumb pinch  → Volume slider
# Middle+Thumb pinch → Brightness slider
# Y-position of pinch point maps to level (top=100%, bottom=0%)
# Only one control active at a time. Release pinch = stop adjusting.

PINCH_ON_THRESHOLD = 50.0    # Distance below which = pinched (start adjusting)
PINCH_OFF_THRESHOLD = 70.0   # Distance above which = released (stop adjusting)
# Hysteresis gap prevents flickering on/off at the boundary

# Track which control is currently active
active_control = None  # None | "volume" | "brightness"

def update_brightness_from_y(y_norm: float) -> None:
    """Set brightness based on Y position (0.0=top=100%, 1.0=bottom=0%)."""
    level = np.interp(y_norm, [0.1, 0.9], [100, 0])
    level = max(0, min(100, level))
    try:
        sbc.set_brightness(int(level))
    except Exception as e:
        print(f"[Brightness] error: {e}")


def update_volume_from_y(audio_volume, y_norm: float) -> None:
    """Set volume based on Y position (0.0=top=100%, 1.0=bottom=0%)."""
    if audio_volume is None:
        return
    scalar = np.interp(y_norm, [0.1, 0.9], [1.0, 0.0])
    scalar = max(0.0, min(1.0, scalar))
    try:
        audio_volume.SetMasterVolumeLevelScalar(scalar, None)
    except Exception as e:
        print(f"[Volume] scalar control error: {e}")


def process_set2(right_hand, frame, audio_volume) -> str:
    """
    Pinch & Slide controller for System Controls (Set 2).

    Detects which finger is pinched with thumb, then uses Y-position
    of the pinch midpoint to set the level.

    Args:
        right_hand: MediaPipe normalized landmarks for the right hand
        frame: OpenCV frame (for dimensions)
        audio_volume: pycaw audio volume interface
    Returns:
        Active gesture string
    """
    global active_control, last_logged_control, fist_start_time, fist_dispatched

    if not right_hand:
        active_control = None
        fist_start_time = None
        fist_dispatched = False
        return "none"

    thumb = right_hand[4]
    index = right_hand[8]
    middle = right_hand[12]

    height, width, _ = frame.shape

    # Calculate pixel distances
    thumb_x, thumb_y = thumb.x * width, thumb.y * height
    index_x, index_y = index.x * width, index.y * height
    middle_x, middle_y = middle.x * width, middle.y * height

    index_dist = math.hypot(index_x - thumb_x, index_y - thumb_y)
    middle_dist = math.hypot(middle_x - thumb_x, middle_y - thumb_y)

    # ── Determine which control to activate (with hysteresis) ────────────
    index_pinched = index_dist < PINCH_ON_THRESHOLD if active_control != "volume" else index_dist < PINCH_OFF_THRESHOLD
    middle_pinched = middle_dist < PINCH_ON_THRESHOLD if active_control != "brightness" else middle_dist < PINCH_OFF_THRESHOLD

    if index_pinched and not middle_pinched:
        # Index+Thumb pinch → Volume
        active_control = "volume"
        # Use midpoint Y of thumb+index as the slider position
        mid_y = (thumb.y + index.y) / 2.0
        update_volume_from_y(audio_volume, mid_y)

        if last_logged_control != "volume":
            print(f"[Set 2] Volume control ACTIVE (pinch dist: {index_dist:.1f})")
            last_logged_control = "volume"

        return "volume"

    elif middle_pinched and not index_pinched:
        # Middle+Thumb pinch → Brightness
        active_control = "brightness"
        # Use midpoint Y of thumb+middle as the slider position
        mid_y = (thumb.y + middle.y) / 2.0
        update_brightness_from_y(mid_y)

        if last_logged_control != "brightness":
            print(f"[Set 2] Brightness control ACTIVE (pinch dist: {middle_dist:.1f})")
            last_logged_control = "brightness"

        return "brightness"

    else:
        # Neither pinched — reset
        if active_control is not None and active_control in ("volume", "brightness"):
            print(f"[Set 2] Controls IDLE (released)")
            last_logged_control = None
        active_control = None
        return "none"
