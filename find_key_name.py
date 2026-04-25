import pynput.keyboard as keyboard

def on_press(key):
    try:
        print(f"Key pressed: {key.char} | Name: {key}")
    except AttributeError:
        print(f"Special key pressed: {key}")

print("--- Key Name Finder ---")
print("Press the '\' key (or any combination) to see its exact name.")
print("Press ESC to exit.")

with keyboard.Listener(on_press=on_press) as listener:
    listener.join()
