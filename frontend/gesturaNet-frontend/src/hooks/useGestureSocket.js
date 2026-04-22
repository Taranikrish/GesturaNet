import { useState, useEffect, useRef, useCallback } from "react";

export default function useGestureSocket(url) {
  const [state, setState] = useState({
    gesture: "none",
    active: false,
    fps: 5,
    cursor_x: 0,
    cursor_y: 0,
    scroll_delta: 0,
    engineConnected: false,
    current_mode: 1,
  });
  const [log, setLog] = useState([]);
  const [fileRequest, setFileRequest] = useState(null);
  const [toast, setToast] = useState(null);
  const [grabProgress, setGrabProgress] = useState(0);
  const wsRef = useRef(null);
  const prevGestureRef = useRef("none");

  const addLog = useCallback((msg, type = "info") => {
    const entry = { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() };
    setLog(prev => [entry, ...prev].slice(0, 60));
  }, []);

  const sendCommand = useCallback((command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = typeof command === 'string' ? { action: command } : command;
      wsRef.current.send(JSON.stringify(payload));
      addLog(`[CMD] ${payload.action.toUpperCase()}`, "info");
    } else {
      addLog("WS closed. Command failed.", "warn");
    }
  }, [addLog]);

  useEffect(() => {
    let reconnectTimer = null;
    let isDestroyed = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed) return;
        addLog("Connected to Gesture backend", "success");
        setState(prev => ({ ...prev, engineConnected: true }));
      };

      ws.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const message = JSON.parse(event.data);
          // (Rest of the message handling logic stays the same)
          if (message.type === "init") {
            setState(prev => ({ ...prev, ...message.state, engineConnected: message.engineConnected }));
          } else if (message.type === "gesture_state") {
            setState(prev => ({ ...prev, ...message, engineConnected: true }));
            const gesture = message.gesture;
            const active = message.active;
            const isActive = gesture && gesture !== "none" && gesture !== "open" && active;
            if (isActive && gesture !== prevGestureRef.current) {
              addLog(`[GESTURE] ${gesture.toUpperCase()} detected`, "gesture");
              prevGestureRef.current = gesture;
            } else if (!isActive) {
              prevGestureRef.current = "none";
            }
          } else if (message.type === "control") {
            setState(prev => ({ ...prev, ...message }));
          } else if (message.type === "engine_connected") {
            setState(prev => ({ ...prev, engineConnected: true }));
            addLog("Python Engine connected", "success");
          } else if (message.type === "engine_disconnected") {
            setState(prev => ({ ...prev, engineConnected: false }));
            addLog("Python Engine lost", "error");
          } else if (message.type === "file_receive_request") {
            setFileRequest(message);
            addLog(`Incoming file request: ${message.fileName}`, "info");
          } else if (message.type === "info_toast") {
            setToast({ message: message.message, id: Date.now() });
            addLog(`[SYSTEM] ${message.message}`, "info");
          } else if (message.type === "grab_progress") {
            setGrabProgress(message.percent);
          }
        } catch (error) {
          addLog(`WS message parse error: ${error.message}`, "error");
        }
      };

      ws.onclose = () => {
        if (isDestroyed) return;
        setState(prev => ({ ...prev, engineConnected: false, active: false }));
        addLog("Disconnected. Reconnecting in 2s...", "error");
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        if (isDestroyed) return;
        // console.error("WS error", err); // Muting to prevent console noise
        ws.close();
      };
    };

    connect();

    return () => {
      isDestroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent onclose from firing and triggering reconnect
        wsRef.current.close();
      }
    };
  }, [url, addLog]);

  return { state, log, sendCommand, fileRequest, setFileRequest, toast, setToast, grabProgress };
}