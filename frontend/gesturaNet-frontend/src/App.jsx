import React, { useEffect, useState, useCallback } from 'react';
import useGestureSocket from './hooks/useGestureSocket';
import SurgicalDashboard from './pages/SurgicalDashboard';

export default function App() {
  const BACKEND_HOST = import.meta.env.BACKEND_HOST || 'localhost';
  const BACKEND_PORT = import.meta.env.BACKEND_PORT || '5000';
  const WS_URL = `ws://${BACKEND_HOST}:${BACKEND_PORT}/ws`; // Connect to dynamic host
  const { state, log, sendCommand, fileRequest, setFileRequest, toast, setToast, grabProgress } = useGestureSocket(WS_URL);
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
    if (fileRequest) {
      console.log("[App] File request received. Forcing Engine into Mode 3 (Transfer Mode)");
      sendCommand({ action: "force_mode", mode: 3 });
    }
  }, [fileRequest, sendCommand]);

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
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  return (
    <div className="min-h-screen bg-surface-container-lowest relative">
      <SurgicalDashboard
        state={state}
        log={log}
        sendCommand={sendCommand}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-primary text-on-primary px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20">
            <span className="material-symbols-outlined text-sm">info</span>
            <span className="text-xs font-bold tracking-widest uppercase">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Grab Progress Overlay */}
      {grabProgress > 0 && grabProgress < 100 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90">
                <circle 
                  cx="96" cy="96" r="80" 
                  className="stroke-surface-container-highest fill-none stroke-[8]" 
                />
                <circle 
                  cx="96" cy="96" r="80" 
                  className="stroke-primary fill-none stroke-[8] transition-all duration-200"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - grabProgress / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-mono font-bold text-primary">{grabProgress}%</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-headline font-bold text-on-surface tracking-[0.2em] uppercase">Grabbing File...</h2>
              <p className="text-[10px] text-on-surface-variant font-mono mt-2 opacity-60">HOLD FIST TO INITIALIZE TRANSFER</p>
            </div>
          </div>
        </div>
      )}

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