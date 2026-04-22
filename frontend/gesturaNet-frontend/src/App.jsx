import React, { useEffect, useState, useCallback } from 'react';
import useGestureSocket from './hooks/useGestureSocket';
import SurgicalDashboard from './pages/SurgicalDashboard';

export default function App() {
  const BACKEND_HOST = import.meta.env.BACKEND_HOST || 'localhost';
  const BACKEND_PORT = import.meta.env.BACKEND_PORT || '5000';
  const WS_URL = `ws://${BACKEND_HOST}:${BACKEND_PORT}/ws`; // Connect to dynamic host
  const { state, log, sendCommand, fileRequest, setFileRequest } = useGestureSocket(WS_URL);
  const [acceptProgress, setAcceptProgress] = useState(0);

  const handleFileResponse = useCallback((accepted) => {
    if (fileRequest) {
      sendCommand({
        action: 'handshake_response',
        requestId: fileRequest.requestId,
        accepted
      });
      setFileRequest(null);
      setAcceptProgress(0);
    }
  }, [fileRequest, sendCommand, setFileRequest]);

  useEffect(() => {
    if (fileRequest && state.gesture) {
      if (state.gesture === 'right_click') {
        handleFileResponse(false);
      }
    }
  }, [state.gesture, fileRequest, handleFileResponse]);

  useEffect(() => {
    if (!fileRequest || !state.gesture) {
      setAcceptProgress(0);
      return;
    }

    let interval;
    if (state.gesture === 'open') {
      interval = setInterval(() => {
        setAcceptProgress(prev => {
          if (prev >= 100) {
            handleFileResponse(true);
            return 0;
          }
          return prev + 5; // 2000ms total
        });
      }, 100);
    } else {
      setAcceptProgress(0);
    }

    return () => clearInterval(interval);
  }, [state.gesture, fileRequest, handleFileResponse]);
  return (
    <div className="min-h-screen bg-surface-container-lowest relative">
      <SurgicalDashboard
        state={state}
        log={log}
        sendCommand={sendCommand}
      />

      {/* File Request Modal */}
      {fileRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_-5px_rgba(34,211,238,0.3)]">
            <h3 className="text-xl font-bold tracking-tighter text-cyan-400 mb-2 border-b border-white/10 pb-2">
              INCOMING FILE TRANSFER
            </h3>

            <div className="space-y-2 mb-6 mt-4">
              <p className="text-sm text-slate-300">
                <span className="text-cyan-600 font-bold text-[10px] tracking-tighter uppercase block mb-1">FILE NAME</span>
                <span className="font-mono bg-black/40 px-2 py-1 rounded inline-block w-full truncate">{fileRequest.fileName}</span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <p className="text-sm text-slate-300">
                  <span className="text-cyan-600 font-bold text-[10px] tracking-tighter uppercase block mb-1">SIZE</span>
                  <span className="font-mono">{(fileRequest.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                </p>
                <p className="text-sm text-slate-300">
                  <span className="text-cyan-600 font-bold text-[10px] tracking-tighter uppercase block mb-1">SENDER</span>
                  <span className="font-mono">{fileRequest.senderIp}:{fileRequest.senderPort}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleFileResponse(true)}
                className="relative flex-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/50 py-2 rounded-lg transition-colors font-bold tracking-widest text-xs group overflow-hidden"
              >
                <div className="absolute top-0 left-0 h-full bg-cyan-400/40 transition-all duration-100 ease-linear" style={{ width: `${acceptProgress}%` }} />
                <span className="relative z-10">ACCEPT</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-60">Gesture: Hold Open</span>
              </button>
              <button
                onClick={() => handleFileResponse(false)}
                className="relative flex-1 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-2 rounded-lg transition-colors font-bold tracking-widest text-xs group"
              >
                REJECT
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-60">Gesture: Right Click</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}