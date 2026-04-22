from pynput.keyboard import Key, Controller
import time

keyboard = Controller()

print("--- Pynput AltGr Tester ---")
print("I will simulate AltGr + \\ using the pynput library in 3 seconds.")
time.sleep(3)

print("Triggering: AltGr + \\")
# Use pynput's AltGr modifier
with keyboard.pressed(Key.alt_gr):
    keyboard.press('\\')
    keyboard.release('\\')

print("\nDone! Did your screenshot app open?")
print("If yes, I will switch GesturaNet to use pynput for your hotkeys.")
