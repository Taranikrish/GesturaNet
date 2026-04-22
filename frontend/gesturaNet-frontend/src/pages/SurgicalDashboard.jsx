import React, { useState, useEffect, useRef } from 'react';
import FileDispatcher from './FileDispatcher';

export default function SurgicalDashboard({ state, log, sendCommand }) {
  const [cmdInput, setCmdInput] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const logEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const handleCommand = (e) => {
    e.preventDefault();
    if (cmdInput.trim() !== '') {
      sendCommand(cmdInput.trim());
      setCmdInput('');
    }
  };

  const allGestures = [
    { id: 'pinch', label: 'Precision Pinch', icon: 'pinch' },
    { id: 'volume', label: 'Audio Volume', icon: 'volume_up' },
    { id: 'brightness', label: 'Luminance', icon: 'brightness_high' },
    { id: 'scroll', label: 'Vertical Scroll', icon: 'swipe_vertical' },
  ];

  const isGestureActive = (id) => {
    if (id === 'pinch' && state.gesture === 'left_click') return true;
    if (id === 'volume' && state.gesture?.includes('volume')) return true;
    if (id === 'brightness' && state.gesture?.includes('brightness')) return true;
    return state.gesture === id;
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body selection:bg-primary/30 overflow-hidden h-screen w-full flex">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full z-40 bg-surface-container-lowest w-20 flex flex-col border-r border-surface-variant/20 font-headline text-sm tracking-tight">
        <div className="h-16 flex items-center justify-center border-b border-surface-variant/10 mb-4">
          <span className="text-lg font-bold text-on-surface">S</span>
        </div>
        <nav className="flex flex-col items-center gap-4 flex-1">
          <a onClick={() => setActiveTab('Overview')} className={`group relative flex flex-col items-center p-3 rounded-sm transition-colors cursor-pointer ${activeTab === 'Overview' ? 'text-primary bg-surface-container-low' : 'text-on-surface/50 hover:bg-surface-variant'}`}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] mt-1 opacity-80 font-label">Overview</span>
          </a>
          <a onClick={() => setActiveTab('Controls')} className={`group relative flex flex-col items-center p-3 rounded-sm transition-colors cursor-pointer ${activeTab === 'Controls' ? 'text-primary bg-surface-container-low' : 'text-on-surface/50 hover:bg-surface-variant'}`}>
            <span className="material-symbols-outlined">tune</span>
            <span className="text-[10px] mt-1 font-label">Controls</span>
          </a>
          <a onClick={() => setActiveTab('Vault')} className={`group relative flex flex-col items-center p-3 rounded-sm transition-colors cursor-pointer ${activeTab === 'Vault' ? 'text-primary bg-surface-container-low' : 'text-on-surface/50 hover:bg-surface-variant'}`}>
            <span className="material-symbols-outlined">folder_shared</span>
            <span className="text-[10px] mt-1 font-label">Vault</span>
          </a>
        </nav>
        <div className="pb-6 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAB5H6a9nM5UFw6RXDGE3ytDsXbpZx5xi5PXFb3vjvlZT8cnvJ7URU3aiz0rkAVVWqeW3ZJpNm8urgENBYwQoDtfys_WDObqMdA9MuNzlJ3db7R-b2hm0GcynGwa9IZgFJiXqTQTeFMN1SgfGb7wVwKLkbiIfS8CDsMsc4Yh7Uts89xvzM4A2MipRAEks1m4SVhCxiuPOly6L8RhlQ5AN8RYF40lEVwK3CwE8pgbIIKaRD5XH6qzcbLGTooK7mr0wvi-I6WvLa-XPj2" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-on-surface">V-01</p>
          </div>
        </div>
      </aside>

      <div className="pl-20 flex-1 flex flex-col overflow-hidden">
        {/* TopAppBar */}
        <header className="h-16 border-b border-surface-variant/10 bg-surface-container-lowest/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 relative z-30">
          <div className="flex items-center gap-8">
            <h1 className="font-headline font-semibold text-on-surface text-xl tracking-tight">Surgical Interface</h1>
            <div className="flex items-center gap-6">
              <span onClick={() => setActiveTab('Overview')} className={`font-label text-xs font-medium uppercase tracking-widest h-16 flex items-center border-b-2 cursor-pointer transition-all ${activeTab === 'Overview' ? 'text-primary border-primary' : 'text-on-surface/60 border-transparent hover:text-primary'}`}>Overview</span>
              <span onClick={() => setActiveTab('Controls')} className={`font-label text-xs font-medium uppercase tracking-widest h-16 flex items-center border-b-2 cursor-pointer transition-all ${activeTab === 'Controls' ? 'text-primary border-primary' : 'text-on-surface/60 border-transparent hover:text-primary'}`}>Settings</span>
              <span onClick={() => setActiveTab('Vault')} className={`font-label text-xs font-medium uppercase tracking-widest h-16 flex items-center border-b-2 cursor-pointer transition-all ${activeTab === 'Vault' ? 'text-primary border-primary' : 'text-on-surface/60 border-transparent hover:text-primary'}`}>File Vault</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             {/* status indicators... */}
          </div>
        </header>

        <main className="flex-1 flex flex-row overflow-hidden">
          {/* Analysis View */}
          <section className="w-[320px] bg-surface-dim p-6 flex flex-col gap-6 overflow-y-auto border-r border-surface-variant/10">
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-500 ${state.active ? 'bg-surface-container-high border-primary/30 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'bg-surface-container-low border-outline-variant/20'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${state.active ? 'border-primary/50 animate-pulse' : 'border-outline-variant/50 opacity-40 grayscale'}`}>
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoHI6JIdbqGKSmLVBaNJZxWdFWEMLvQKbqrxMc5PYYhIwxcnz9x7ETGzauvX3pe-uELL47UXZHg6o70jzg5cZrMIF4lZnf8PvPwfn9KR00-M3QEbVFHseA-5hsbvx2rLJ1IAf99XtgwVD96Mi1ruZziejqytl7D6aTW1xUrNo2DceGo0t-cGh9hGl1ORYkFEMZft4nI6XGv4PT2UvR0JJ9a8UC6hCjqEJDJ4xAoUuTRCEMt5efreMamIPnBJRzmLspaB7J-8tuEYYx"
                  className="w-6 h-6 object-contain mix-blend-screen"
                />
              </div>
              <p className={`font-headline text-[10px] font-bold tracking-widest text-center ${state.active ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                {state.current_mode === 2 ? 'SYSTEM CONTROL MODE' : state.active ? 'CURSOR CONTROL MODE' : 'SYSTEM STANDBY'}
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${state.engineConnected ? 'bg-tertiary animate-pulse' : 'bg-error'}`}></span>
                System Health
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-surface-container-low p-4 border-l-2 border-primary">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Process Frequency</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-headline font-bold text-on-surface">{state.fps ? state.fps.toFixed(2) : "0.00"}</span>
                    <span className="text-xs text-primary">FPS</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Live Gestures</h3>
              <div className="space-y-2">
                {allGestures.map((g) => {
                  const active = isGestureActive(g.id);
                  return (
                    <div key={g.id} className={`bg-surface-container-low px-4 py-3 flex items-center justify-between transition-all duration-200 ${active ? 'border-r-2 border-primary ring-1 ring-primary/20' : 'opacity-40 hover:opacity-100'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${active ? 'text-primary' : ''}`}>{g.icon}</span>
                        <span className={`text-sm font-label ${active ? 'text-on-surface font-semibold' : 'text-on-surface/70'}`}>{g.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Middle View */}
          <section className="flex-1 bg-surface-container-lowest relative overflow-hidden flex flex-col">
            {activeTab === 'Overview' ? (
              <div className="flex-1 p-6 flex items-center justify-center relative overflow-hidden">
                  <div className="w-full h-full rounded-xl bg-surface-dim border border-outline-variant/10 depth-grid relative flex items-center justify-center group overflow-hidden">
                    {!state.show_camera && (
                      <div className="relative z-10 text-center transition-all duration-500">
                        <div className={`w-64 h-64 border-[0.3px] ${state.active ? 'border-tertiary/40' : 'border-outline/20'} rounded-full flex items-center justify-center transition-all duration-700 ${state.active ? 'animate-[pulse_4s_infinite]' : ''}`}>
                          <div className={`w-48 h-48 border-[0.3px] ${state.active ? 'border-primary/50' : 'border-outline/10'} rounded-full flex items-center justify-center`}>
                            <div className={`w-36 h-36 flex items-center justify-center transition-all duration-1000 ${state.active ? 'scale-110' : 'scale-90 opacity-20 grayscale'}`}>
                              <img 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoHI6JIdbqGKSmLVBaNJZxWdFWEMLvQKbqrxMc5PYYhIwxcnz9x7ETGzauvX3pe-uELL47UXZHg6o70jzg5cZrMIF4lZnf8PvPwfn9KR00-M3QEbVFHseA-5hsbvx2rLJ1IAf99XtgwVD96Mi1ruZziejqytl7D6aTW1xUrNo2DceGo0t-cGh9hGl1ORYkFEMZft4nI6XGv4PT2UvR0JJ9a8UC6hCjqEJDJ4xAoUuTRCEMt5efreMamIPnBJRzmLspaB7J-8tuEYYx"
                                className="w-full h-full object-contain mix-blend-screen"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {state.show_camera && state.frame && (
                      <img src={`data:image/jpeg;base64,${state.frame}`} className="absolute inset-0 w-full h-full object-cover z-0" />
                    )}
                </div>
              </div>
            ) : activeTab === 'Controls' ? (
              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto space-y-12">
                  <header className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight uppercase">Controller Parameters</h2>
                      <p className="text-on-surface-variant mt-2 max-w-md">Fine-tune the gesture-to-cursor translation engine for your specific surgical simulation environment.</p>
                    </div>
                    <button 
                      onClick={() => {
                        sendCommand({ action: "set_smoothing", value: 0.2 });
                        sendCommand({ action: "set_sensitivity", value: 0.20 });
                      }}
                      className="px-4 py-2 bg-surface-container-highest text-[10px] font-mono text-primary font-bold border border-primary/20 hover:bg-primary/10 transition-all uppercase tracking-widest"
                    >
                      Restore Defaults
                    </button>
                  </header>

                  <div className="grid gap-8">
                    <div className="group relative bg-surface-container-low p-10 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 shadow-xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                        <div className="text-right">
                          <span className="block text-[8px] font-mono text-primary uppercase tracking-[0.3em] opacity-60">Smoothing Index</span>
                          <span className="text-5xl font-mono font-bold text-primary tabular-nums tracking-tighter">
                            {(state.smoothing || 0).toFixed(3)}
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="max-w-xs">
                          <h4 className="font-headline font-bold text-on-surface text-lg tracking-wide uppercase">Damping Filter</h4>
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                            Controls the exponential smoothing factor. Higher values eliminate hand tremors but introduce slight input latency.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <input 
                            type="range" min="0.01" max="0.5" step="0.01" 
                            value={state.smoothing || 0.12}
                            onChange={(e) => sendCommand({ action: "set_smoothing", value: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="group relative bg-surface-container-low p-10 rounded-2xl border border-outline-variant/10 hover:border-tertiary/30 transition-all duration-500 shadow-xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                        <div className="text-right">
                          <span className="block text-[8px] font-mono text-tertiary uppercase tracking-[0.3em] opacity-60">Detection Width</span>
                          <span className="text-5xl font-mono font-bold text-tertiary tabular-nums tracking-tighter">
                            {((1 - ((state.sensitivity || 0.2) * 2)) * 100).toFixed(0)}<span className="text-xl">%</span>
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="max-w-xs">
                          <h4 className="font-headline font-bold text-on-surface text-lg tracking-wide uppercase">Capture Sensitivity</h4>
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                            Defines the active sensor boundaries. Higher percentages map a smaller physical hand zone to the entire screen.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <input 
                            type="range" min="0.05" max="0.4" step="0.01" 
                            value={state.sensitivity || 0.2}
                            onChange={(e) => sendCommand({ action: "set_sensitivity", value: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-tertiary hover:accent-tertiary/80 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="group relative bg-surface-container-low p-10 rounded-2xl border border-outline-variant/10 hover:border-error/30 transition-all duration-500 shadow-xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                        <div className="text-right">
                          <span className="block text-[8px] font-mono text-error uppercase tracking-[0.3em] opacity-60">Device Index</span>
                          <span className="text-5xl font-mono font-bold text-error tabular-nums tracking-tighter">
                            {state.camera_index || 0}
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="max-w-xs">
                          <h4 className="font-headline font-bold text-on-surface text-lg tracking-wide uppercase">Camera Input</h4>
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                            Selects the physical camera hardware interface. Changes take effect immediately.
                          </p>
                        </div>
                        <div className="space-y-3 relative">
                          <select
                            value={state.camera_index || 0}
                            onChange={(e) => sendCommand({ action: "set_camera", value: parseInt(e.target.value) })}
                            className="w-full bg-surface-container-highest text-on-surface text-sm px-4 py-3 rounded-lg border border-outline-variant/20 focus:outline-none focus:border-error/50 transition-all cursor-pointer appearance-none pr-10"
                          >
                            {state.available_cameras && state.available_cameras.length > 0 ? (
                              state.available_cameras.map((cam_name, idx) => (
                                <option key={idx} value={idx} className="bg-surface-dim">
                                  {cam_name}
                                </option>
                              ))
                            ) : (
                              [0, 1, 2, 3, 4].map((idx) => (
                                <option key={idx} value={idx} className="bg-surface-dim">
                                  Camera {idx}
                                </option>
                              ))
                            )}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/50">
                            arrow_drop_down
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`group relative p-10 rounded-2xl border transition-all duration-500 shadow-xl overflow-hidden cursor-pointer ${state.apply_denoise ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-surface-container-low border-outline-variant/10 hover:border-yellow-500/30'}`} onClick={() => sendCommand({ action: "set_denoise", value: !state.apply_denoise })}>
                      <div className="absolute top-0 right-0 p-8">
                        <div className="text-right">
                          <span className={`block text-[8px] font-mono uppercase tracking-[0.3em] opacity-60 ${state.apply_denoise ? 'text-yellow-500' : 'text-on-surface-variant'}`}>Filter Status</span>
                          <span className={`text-2xl font-mono font-bold tracking-tighter ${state.apply_denoise ? 'text-yellow-500' : 'text-on-surface-variant/50'}`}>
                            {state.apply_denoise ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="max-w-xs">
                          <h4 className="font-headline font-bold text-on-surface text-lg tracking-wide uppercase">Shader Denoise</h4>
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                            Applies a real-time bilateral filter to smooth out sensor noise while preserving sharp edges for MediaPipe.
                          </p>
                        </div>
                        <div className="pt-4">
                           <div className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${state.apply_denoise ? 'bg-yellow-500' : 'bg-surface-container-highest'}`}>
                             <div className={`absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all duration-300 ${state.apply_denoise ? 'left-7' : 'left-1'}`}></div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className={`group relative p-10 rounded-2xl border transition-all duration-500 shadow-xl overflow-hidden cursor-pointer ${state.apply_sharpen ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-surface-container-low border-outline-variant/10 hover:border-cyan-500/30'}`} onClick={() => sendCommand({ action: "set_sharpen", value: !state.apply_sharpen })}>
                      <div className="absolute top-0 right-0 p-8">
                        <div className="text-right">
                          <span className={`block text-[8px] font-mono uppercase tracking-[0.3em] opacity-60 ${state.apply_sharpen ? 'text-cyan-500' : 'text-on-surface-variant'}`}>Filter Status</span>
                          <span className={`text-2xl font-mono font-bold tracking-tighter ${state.apply_sharpen ? 'text-cyan-500' : 'text-on-surface-variant/50'}`}>
                            {state.apply_sharpen ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-6">
                        <div className="max-w-xs">
                          <h4 className="font-headline font-bold text-on-surface text-lg tracking-wide uppercase">Shader Sharpen</h4>
                          <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                            Applies a convolution kernel to enhance edge contrast and detail definition.
                          </p>
                        </div>
                        <div className="pt-4">
                           <div className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${state.apply_sharpen ? 'bg-cyan-500' : 'bg-surface-container-highest'}`}>
                             <div className={`absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all duration-300 ${state.apply_sharpen ? 'left-7' : 'left-1'}`}></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto">
                  <FileDispatcher state={state} />
                </div>
              </div>
            )}

            {activeTab === 'Overview' && (
              <div className="absolute bottom-8 right-8 p-4 bg-surface-container-high/40 backdrop-blur-2xl border border-outline-variant/10 rounded-lg flex gap-4 shadow-2xl z-20">
                <button 
                  onClick={() => sendCommand(state.active ? "disable" : "enable")}
                  className={`px-4 py-2 rounded-sm font-headline font-bold text-[10px] tracking-widest ${state.active ? 'bg-error text-on-error' : 'bg-primary text-on-primary'}`}
                >
                  {state.active ? "DEACTIVATE" : "ACTIVATE"}
                </button>
                <button 
                  onClick={() => sendCommand(state.show_camera ? "camera_off" : "camera_on")}
                  className={`px-4 py-2 rounded-sm font-headline font-bold text-[10px] tracking-widest ${state.show_camera ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/20'}`}
                >
                   {state.show_camera ? "CAMERA_OFF" : "CAMERA_ON"}
                </button>
              </div>
            )}
          </section>

          {/* Right Log Feed */}
          <section className="w-[360px] bg-surface-container-low border-l border-outline-variant/10 flex flex-col">
            <div className="p-6 border-b border-outline-variant/10">
              <h3 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Live Console Feed</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed space-y-3 custom-scrollbar">
              {log.map((entry, idx) => (
                <div key={idx} className={`flex gap-3 transition-opacity duration-300 ${entry.type === 'info' ? 'text-on-surface-variant' : entry.type === 'gesture' ? 'text-primary' : 'text-error'}`}>
                  <span className="opacity-40 shrink-0">{entry.time}</span>
                  <span className="break-all">{entry.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </section>
        </main>
      </div>

      <div className="fixed right-0 top-1/4 bottom-1/4 w-[2px] bg-tertiary shadow-[0_0_10px_rgba(102,217,204,0.5)] z-50 animate-pulse"></div>
    </div>
  );
}
