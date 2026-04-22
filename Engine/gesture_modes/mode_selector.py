import math

def count_extended_fingers(landmarks) -> int:
    """
    Count extended fingers on a hand to determine mode.
    landmarks: MediaPipe normalized landmarks.
    Fingers:
    Index: tip=8, pip=6
    Middle: tip=12, pip=10
    Ring: tip=16, pip=14
    Pinky: tip=20, pip=18
    Thumb: tip=4, ip=3
    """
    count = 0
    wrist = landmarks[0]
    
    def dist(p1, p2):
        return math.hypot(p1.x - p2.x, p1.y - p2.y)
    
    # We only count Index (8), Middle (12), Ring (16), Pinky (20)
    # Compare tip-to-wrist distance vs PIP(joint)-to-wrist distance.
    # PIP is more reliable than MCP since it sits mid-finger.
    finger_data = [(8, 6), (12, 10), (16, 14), (20, 18)]
    for tip, pip in finger_data:
        # If tip is further from wrist than the PIP joint, finger is extended.
        if dist(landmarks[tip], wrist) > dist(landmarks[pip], wrist) * 1.15:
            count += 1
            
    return count

last_finger_count = -1

def update_mode_from_left_hand(left_landmarks, current_mode: int) -> int:
    """
    Returns mode 1 if 1 finger is up, mode 2 if 2 fingers are up.
    Returns 1 if 0 fingers up as a default safe mode.
    """
    global last_finger_count
    if not left_landmarks:
        return current_mode
        
    fingers = count_extended_fingers(left_landmarks)
    
    if fingers != last_finger_count:
        print(f"[Mode Selector] Left Hand visible: Concluded {fingers} fingers are extended.")
        last_finger_count = fingers
        
    if fingers == 0:
        return 1
    if fingers == 1:
        return 1
    elif fingers == 2:
        return 2
    elif fingers >= 3:
        return 3
        
    return current_mode
