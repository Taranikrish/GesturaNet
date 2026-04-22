import time
import threading
import urllib.request
import json
import pyautogui

import state as st

# ── Fist hold timer for ambient dispatch ──────────────────────────────────────
FIST_HOLD_SECONDS = 2.0
fist_start_time = None
fist_dispatched = False
active_control = None

def _get_clipboard_files():
    import subprocess
    try:
        result = subprocess.run(
            ['powershell', '-Command', '(Get-Clipboard -Format FileDropList).FullName'],
            capture_output=True, text=True, timeout=3
        )
        return [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
    except Exception as e:
        print(f"[Set 3] Clipboard error: {e}")
        return []

def _dispatch_native_file():
    """Trigger the screenshot hotkey via pynput, wait for clipboard, and dispatch."""
    global fist_dispatched
    try:
        from config import BACKEND_HOST, BACKEND_PORT
        from pynput.keyboard import Key, Controller
        from PIL import ImageGrab, Image
        import time
        import os
        import state as st

        keyboard = Controller()

        # 1. Parse Hotkey string to list
        hotkey_str = st.state.screenshot_hotkey.lower()
        keys = [k.strip() for k in hotkey_str.split('+')]
        
        # 2. Map and Press Hotkey
        # We handle 'alt', 'ctrl', 'shift', 'win' as special keys
        print(f"[Set 3] Triggering robust hotkey via pynput: {keys}")
        
        active_special_keys = []
        for k in keys:
            if k == 'alt': active_special_keys.append(Key.alt)
            elif k == 'altgr': active_special_keys.append(Key.alt_gr)
            elif k == 'ctrl': active_special_keys.append(Key.ctrl)
            elif k == 'shift': active_special_keys.append(Key.shift)
            elif k == 'win': active_special_keys.append(Key.cmd)

        # Press modifiers
        for sk in active_special_keys:
            keyboard.press(sk)
        
        # Press the character keys (non-modifiers)
        for k in keys:
            if k not in ['alt', 'altgr', 'ctrl', 'shift', 'win']:
                keyboard.press(k)
                keyboard.release(k)
        
        # Release modifiers
        for sk in reversed(active_special_keys):
            keyboard.release(sk)
        
        # 3. Wait for clipboard
        time.sleep(1.0) 

        # 4. Try to grab image from clipboard
        img = ImageGrab.grabclipboard()
        
        if isinstance(img, Image.Image):
            # Save to temporary file
            temp_path = os.path.abspath("clipboard_share.png")
            img.save(temp_path)
            filePath = temp_path
        else:
            # Fallback: Capture screen manually
            print("[Set 3] Clipboard image not found. Using fallback screenshot.")
            img = ImageGrab.grab()
            temp_path = os.path.abspath("fallback_share.png")
            img.save(temp_path)
            filePath = temp_path

        # 5. Notify Backend
        req = urllib.request.Request(
            f"http://{BACKEND_HOST}:{BACKEND_PORT}/native-dispatch",
            data=json.dumps({"filePath": filePath}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        print(f"[Set 3] Dispatched: {filePath}")

    except Exception as e:
        print(f"[Set 3] Dispatch Error: {e}")

def _dispatch_native_drop():
    try:
        from config import BACKEND_HOST, BACKEND_PORT
        req = urllib.request.Request(
            f"http://{BACKEND_HOST}:{BACKEND_PORT}/native-drop",
            data=b"{}",
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=3.0)
        print("[Set 3] Drop signal sent.")
    except Exception:
        pass

def _send_grab_progress(percent: int):
    """Notify backend of grab hold progress."""
    try:
        from config import BACKEND_HOST, BACKEND_PORT
        req = urllib.request.Request(
            f"http://{BACKEND_HOST}:{BACKEND_PORT}/grab-progress",
            data=json.dumps({"percent": percent}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=1.0)
    except Exception:
        pass

def process_set3(right_hand, frame) -> str:
    global active_control, fist_start_time, fist_dispatched
    if not right_hand:
        if active_control == "closed":
            _send_grab_progress(0)
        active_control = None
        fist_start_time = None
        fist_dispatched = False
        return "none"

    index_curled  = right_hand[8].y  > right_hand[6].y
    middle_curled = right_hand[12].y > right_hand[10].y
    ring_curled   = right_hand[16].y > right_hand[14].y
    pinky_curled  = right_hand[20].y > right_hand[18].y

    all_curled   = index_curled and middle_curled and ring_curled and pinky_curled
    all_extended = (not index_curled) and (not middle_curled) and (not ring_curled) and (not pinky_curled)

    if all_curled:
        if active_control != "closed":
            fist_start_time = time.time()
            fist_dispatched = False
            print("[Set 3] Grab Hold Started...")
        
        if fist_start_time and not fist_dispatched:
            elapsed = time.time() - fist_start_time
            percent = int(min(100, (elapsed / FIST_HOLD_SECONDS) * 100))
            
            # Send progress every ~20% step to avoid flooding
            if percent % 10 == 0:
                threading.Thread(target=_send_grab_progress, args=(percent,), daemon=True).start()

            if elapsed >= FIST_HOLD_SECONDS:
                fist_dispatched = True
                print("[Set 3] Grab Hold COMPLETE!")
                threading.Thread(target=_dispatch_native_file, daemon=True).start()

        active_control = "closed"
        return "closed"

    elif all_extended:
        if active_control == "closed":
            _send_grab_progress(0) # Reset UI
            # Drop logic remains instant
            print("[Set 3] DROP transition detected!")
            threading.Thread(target=_dispatch_native_drop, daemon=True).start()

        active_control = "open"
        fist_start_time = None
        fist_dispatched = False
        return "open"
    else:
        if active_control == "closed":
            _send_grab_progress(0)
        fist_start_time = None
        fist_dispatched = False
        active_control = None
        return "none"
