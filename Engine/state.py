import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional

from config import INACTIVE_FPS, CAMERA_INDEX
# ── Gesture State ─────────────────────────────────────────────────────────────
@dataclass
class GestureState:
    gesture: str = "none"          # none | move | left_click | right_click | scroll | drag | drop | volume | brightness
    active: bool = False           # system active state
    show_camera: bool = True       # UI camera feed toggle (Enabled by default)
    window_open: bool = False      # Track native window status
    cursor_x: float = 0.0
    cursor_y: float = 0.0
    fps: int = INACTIVE_FPS
    last_gesture_time: float = field(default_factory=time.time)
    scroll_delta: float = 0.0
    volume: int = 50               # 0-100
    brightness: int = 50           # 0-100
    volume_mode: bool = False      # Track if volume adjustment is active
    brightness_mode: bool = False  # Track if brightness adjustment is active
    smoothing: float = 0.12        # Cursor smoothing factor
    sensitivity: float = 0.2       # Active zone margin (inverted sensitivity)
    current_mode: int = 1          # 1 = Cursor Set, 2 = System Set
    camera_index: int = CAMERA_INDEX # Current camera index
    available_cameras: list = field(default_factory=list)
    apply_denoise: bool = False    # Shader denoise toggle
    apply_sharpen: bool = False    # Shader sharpen toggle


# Singleton state shared across all modules
state = GestureState()

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "user_settings.json")

def load_user_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                if 'smoothing' in data: state.smoothing = data['smoothing']
                if 'sensitivity' in data: state.sensitivity = data['sensitivity']
                if 'camera_index' in data: state.camera_index = data['camera_index']
                if 'apply_denoise' in data: state.apply_denoise = data['apply_denoise']
                if 'apply_sharpen' in data: state.apply_sharpen = data['apply_sharpen']
                print(f"[State] Loaded user settings: {data}")
        except Exception as e:
            print(f"[State] Error loading config: {e}")

def save_user_config():
    data = {
        'smoothing': state.smoothing,
        'sensitivity': state.sensitivity,
        'camera_index': state.camera_index,
        'apply_denoise': state.apply_denoise,
        'apply_sharpen': state.apply_sharpen
    }
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"[State] Error saving config: {e}")

load_user_config()

# WebSocket clients
connected_clients: set = set()

# ── Cursor smoothing globals ───────────────────────────────────────────────────
prev_cursor_x: float = 0.0
prev_cursor_y: float = 0.0

# ── Gesture transition globals ────────────────────────────────────────────────
scroll_prev_y: Optional[float] = None
prev_gesture: str = "none"
pinch_was_held: bool = False
click_fired: bool = False

# ── Drag & drop globals ───────────────────────────────────────────────────────
is_dragging: bool = False       # True while mouseDown is held for drag