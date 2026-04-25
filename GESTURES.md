# GesturaNet: Complete Gesture Reference

GesturaNet uses a dual-hand approach. The **Left Hand** determines the current operating mode, while the **Right Hand** executes actions within that mode.

---

## Mode Selection (Left Hand)
Hold up your left hand facing the camera to switch between control modes.

| Left Hand Gesture | Resulting Mode | Description |
| :--- | :--- | :--- |
| **0 or 1 Finger Extended** | **Mode 1: Cursor Control** | Default safe mode. Used for standard mouse operations (move, click, scroll, drag). |
| **2 Fingers Extended** | **Mode 2: System Control** | Used for adjusting system volume and screen brightness. |
| **3 Fingers Extended** | **Mode 3: File Transfer** | Used for the "Grab and Drop" cross-device file sharing system. |

*(Note: "Fingers" refers to Index, Middle, Ring, and Pinky. The thumb is ignored for counting).*

---

## Mode 1: Cursor Control (Right Hand)
*Requires Left Hand to show 0 or 1 finger, or be hidden after selecting Mode 1.*

| Right Hand Gesture | Action | Execution Details |
| :--- | :--- | :--- |
| **Index + Middle Pinch** | Move Cursor | Pinch your **Index (8)** and **Middle (12)** fingers together and move your hand. |
| **Thumb + Pinky Pinch** | Left Click | Bring your **Thumb (4)** tip close to or overlapping your **Pinky (20)** tip. *Ensure Index and Middle fingers remain extended.* |
| **Thumb + Middle Pinch** | Right Click | Pinch your **Thumb (4)** and **Middle (12)** fingers together. *Ensure Index finger remains extended.* |
| **All Fingers Clustered** | Scroll Mode | Bring **all four fingertips** (Index, Middle, Ring, Pinky) close together and **hold for 3 seconds**. Moving your hand up/down will then scroll the screen. |
| **Thumb + Index + Middle Pinch** | Drag & Drop | Pinch your **Thumb, Index, and Middle** fingers together to initiate a drag (click & hold). Move your hand to drag. To **Drop**, separate your thumb while keeping Index/Middle pinched. |
| **Open Hand** | Idle / Release | Releasing any pinch returns the system to an idle state (stops moving, releases drag, etc). |

---

---

## Mode 2: System Controls (Right Hand)
*Requires Left Hand to show 2 fingers, or be hidden after selecting Mode 2.*

### System Sliders (Pinch & Slide)
These gestures act like invisible vertical sliders. Pinch to grab the slider, move your hand up (100%) or down (0%), and release the pinch to stop adjusting.

| Right Hand Gesture | Action | Execution Details |
| :--- | :--- | :--- |
| **Index + Thumb Pinch** | Volume Control | Pinch **Index** and **Thumb**. Move hand up/down to adjust system volume. |
| **Middle + Thumb Pinch** | Brightness Control | Pinch **Middle** and **Thumb**. Move hand up/down to adjust screen brightness. |

---

## Mode 3: File Transfer Mode (Right Hand)
*Requires Left Hand to show 3 fingers, or be automatically triggered during transfer.*

### P2P Grab & Drop
To send a file, select it in Windows. In Mode 3, close your fist to "Grab". On the receiving machine (also forced into Mode 3), open your fist into a palm to "Drop" and accept.

| Right Hand Gesture | Action | Execution Details |
| :--- | :--- | :--- |
| **Closed Fist** (Hold 2s) | Grab & Dispatch | Hold a tight fist for 2s. Grabs selected file (or takes a screenshot if none) and broadcasts to network. |
| **Fist to Open Palm** | Drop & Accept | Transition from a closed fist to an open palm to instantly "catch" and download an incoming file. |

---

## Troubleshooting / Tips
- **Camera Mirroring**: The camera view is mirrored. What looks like your left hand on screen is indeed processed as your physical left hand.
- **Active Zone Margin**: You only need to move your hand within a central "Active Zone" of the camera to reach the edges of your physical monitor. Large arm movements are not necessary.
- **Interference**: Ensure your background doesn't have skin-colored objects or bright glare that might confuse the MediaPipe tracking.
