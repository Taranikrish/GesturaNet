# ── Config ────────────────────────────────────────────────────────────────────

import os

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

WEBSOCKET_HOST = os.environ.get("ENGINE_HOST", "localhost")
WEBSOCKET_PORT = int(os.environ.get("ENGINE_PORT", 8765))
BACKEND_HOST = os.environ.get("BACKEND_HOST", "localhost")
BACKEND_PORT = os.environ.get("BACKEND_PORT", "5000")

INACTIVE_TIMEOUT = 60          # seconds before going inactive
ACTIVE_FPS = 30                # frames per second when active
INACTIVE_FPS = 5               # frames per second when inactive

SMOOTHING = 0.12              # cursor smoothing factor (0=no smooth, 1=frozen)
PINCH_THRESHOLD = 0.06         # normalized distance for pinch detection
SCROLL_SENSITIVITY = 20        # pixels per scroll unit

MIN_PINCH_HOLD = 0.0           # seconds pinch must be held before move starts
MIN_OPEN_TIME = 0.05           # seconds hand must be open before left click fires

CLICK_HOLD_TIME = 0.15
SCROLL_HOLD_TIME = 0.1

# Drag & drop
DRAG_THRESHOLD = 0.06          # all three tips (4, 8, 12) must be within this to start drag
DRAG_RELEASE_THRESHOLD = 0.10  # thumb (4) must exceed this from index/middle to drop

CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
CAMERA_FPS = 30

ACTIVE_ZONE_MARGIN = 0.8      # normalized margin to remap active zone to full screen

# File Transfer Settings
FIST_HOLD_SECONDS = 2.0
SCREENSHOT_HOTKEY = ['printscreen'] # List of keys to press (e.g. ['win', 'shift', 's'])

MODEL_PATH = "hand_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
)