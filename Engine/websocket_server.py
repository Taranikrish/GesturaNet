import asyncio
import json

import websockets

import state as st
from config import WEBSOCKET_HOST, WEBSOCKET_PORT, ACTIVE_FPS, INACTIVE_FPS


# ── Broadcast ─────────────────────────────────────────────────────────────────
async def broadcast(message: dict) -> None:
    """Send *message* as JSON to every connected WebSocket client."""
    if st.connected_clients:
        data = json.dumps(message)
        await asyncio.gather(
            *[client.send(data) for client in st.connected_clients],
            return_exceptions=True,
        )


# ── Connection Handler ────────────────────────────────────────────────────────
async def ws_handler(websocket, path="/") -> None:
    st.connected_clients.add(websocket)
    print(f"[WS] Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                cmd = json.loads(message)
                if cmd.get("action") == "enable":
                    st.state.active = True
                    st.state.fps    = ACTIVE_FPS
                    import time
                    st.state.last_gesture_time = time.time()
                    print("[Engine] → ACTIVE (command)")
                elif cmd.get("action") == "disable":
                    st.state.active = False
                    st.state.fps    = INACTIVE_FPS
                    print("[Engine] → INACTIVE (command)")
                elif cmd.get("action") == "camera_on":
                    st.state.show_camera = True
                    print("[Engine] Camera feed → ON")
                elif cmd.get("action") == "camera_off":
                    st.state.show_camera = False
                    print("[Engine] Camera feed → OFF")
                elif cmd.get("action") == "set_smoothing":
                    st.state.smoothing = float(cmd.get("value", 0.12))
                    st.save_user_config()
                    print(f"[Engine] Smoothing → {st.state.smoothing}")
                elif cmd.get("action") == "set_sensitivity":
                    st.state.sensitivity = float(cmd.get("value", 0.2))
                    st.save_user_config()
                    print(f"[Engine] Sensitivity (Margin) → {st.state.sensitivity}")
                elif cmd.get("action") == "set_camera":
                    st.state.camera_index = int(cmd.get("value", 0))
                    st.save_user_config()
                    print(f"[Engine] Camera Index → {st.state.camera_index}")
                elif cmd.get("action") == "set_denoise":
                    st.state.apply_denoise = bool(cmd.get("value", False))
                    st.save_user_config()
                    print(f"[Engine] Shader Denoise → {st.state.apply_denoise}")
                elif cmd.get("action") == "set_sharpen":
                    st.state.apply_sharpen = bool(cmd.get("value", False))
                    st.save_user_config()
                    print(f"[Engine] Shader Sharpen → {st.state.apply_sharpen}")
            except json.JSONDecodeError:
                pass
    finally:
        st.connected_clients.discard(websocket)
        print("[WS] Client disconnected")


# ── Server Entry Point ────────────────────────────────────────────────────────
async def ws_server() -> None:
    async with websockets.serve(ws_handler, WEBSOCKET_HOST, WEBSOCKET_PORT):
        print(f"[WS] Server listening on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        await asyncio.Future()  # run forever
