"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { useGame } from "@/hooks/useGame";

export default function Home() {
  const { initGame, handleJoinGame, statsPlayers, render } = useGame();

  const [gameJoined, setGameJoined] = useState(false);
  const [name, setName] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [isDead, setIsDead] = useState(false);
  const [deathTimer, setDeathTimer] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const joystickState = useRef({ active: false, id: -1, baseX: 0, baseY: 0 });
  const [joystickUI, setJoystickUI] = useState({ currentX: 0, currentY: 0 });
  const [messages, setMessages] = useState<{ name: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lookState = useRef({ active: false, id: -1, lastX: 0, lastY: 0 });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { name: name || "Visitante", content: chatInput }]);
    setChatInput("");
  };

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (containerRef.current) return initGame(containerRef.current);
  }, [initGame]);

  const handleJoin = () => {
    if (!name.trim()) return alert("Ingresa un nombre.");
    handleJoinGame(name);
    setGameJoined(true);
  };

  const handleRespawn = useCallback(() => {
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      render?.socket.emit("player:respawn");
      player.setHealth(100);
      player.setPosition(0, 0, 0);
      setIsDead(false);
      setDeathTimer(0);

      setTimeout(() => {
        render?.renderer.domElement.requestPointerLock();
      }, 100);
    }
  }, [render]);

  useEffect(() => {
    if (!render) return;
    const player = render.room.getPlayers().find(p => p.hasController);
    if (!player) return;

    const onDeath = () => {
      setIsDead(true);
      setDeathTimer(5000);
    };

    player.events.onDeath(onDeath);
  }, [render, gameJoined]);

  useEffect(() => {
    if (!isDead) return;

    let startTime = performance.now();
    let animationFrame: number;

    const update = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, 5000 - elapsed);

      setDeathTimer(remaining);

      if (remaining > 0) {
        animationFrame = requestAnimationFrame(update);
      } else {
        handleRespawn();
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [isDead, handleRespawn]);

  const onJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    joystickState.current = {
      active: true,
      id: touch.identifier,
      baseX: rect.left + rect.width / 2,
      baseY: rect.top + rect.height / 2
    };
  };

  const onJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!joystickState.current.active) return;
    const touch = Array.from(e.touches).find(t => t.identifier === joystickState.current.id);
    if (!touch) return;

    const dx = touch.clientX - joystickState.current.baseX;
    const dy = touch.clientY - joystickState.current.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 40;

    let moveX = dx;
    let moveY = dy;
    if (dist > maxDist) {
      moveX = (dx / dist) * maxDist;
      moveY = (dy / dist) * maxDist;
    }

    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.input_direction.joystickX = moveX / maxDist;
      player.input_direction.joystickY = -(moveY / maxDist);
    }
    setJoystickUI({ currentX: moveX, currentY: moveY });
  };

  const onJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    joystickState.current.active = false;
    joystickState.current.id = -1;
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.input_direction.joystickX = 0;
      player.input_direction.joystickY = 0;
    }
    setJoystickUI({ currentX: 0, currentY: 0 });
  };

  const onGlobalTouchStart = (e: React.TouchEvent) => {
    if (!gameJoined || lookState.current.active) return;
    const touch = e.changedTouches[0];
    lookState.current = {
      active: true,
      id: touch.identifier,
      lastX: touch.clientX,
      lastY: touch.clientY
    };
  };

  const onGlobalTouchMove = (e: React.TouchEvent) => {
    if (!lookState.current.active) return;
    const touch = Array.from(e.touches).find(t => t.identifier === lookState.current.id);
    if (!touch) return;
    const deltaX = touch.clientX - lookState.current.lastX;
    const deltaY = touch.clientY - lookState.current.lastY;
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) player.updateRotation(deltaX * 2.5, deltaY * 2.5);
    lookState.current.lastX = touch.clientX;
    lookState.current.lastY = touch.clientY;
  };

  const onGlobalTouchEnd = (e: React.TouchEvent) => {
    const touch = Array.from(e.changedTouches).find(t => t.identifier === lookState.current.id);
    if (touch) {
      lookState.current.active = false;
      lookState.current.id = -1;
    }
  };

  const displaySeconds = Math.max(0, Math.ceil(deathTimer / 1000));
  const progress = deathTimer / 5000;

  return (
    <main
      className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none touch-none"
      onTouchStart={onGlobalTouchStart}
      onTouchMove={onGlobalTouchMove}
      onTouchEnd={onGlobalTouchEnd}
    >
      <div ref={containerRef} className="fixed inset-0 z-0" />

      {!gameJoined && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6 p-10 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 w-[90%] max-w-md">
            <h1 className="text-5xl font-black italic tracking-tighter text-white">3JS WORLD</h1>
            <div className="w-full space-y-4 pointer-events-auto">
              <input
                type="text"
                placeholder="Nickname..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-6 py-3 bg-black/60 border border-white/10 rounded-xl outline-none text-center focus:border-purple-500/50"
              />
              <button
                onClick={handleJoin}
                className="w-full bg-white text-black font-bold py-3 rounded-xl active:scale-95 transition-all"
              >
                JUGAR
              </button>
            </div>
          </div>
        </div>
      )}

      {gameJoined && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {isDead && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-700 pointer-events-auto">
              <div className="absolute inset-0 shadow-[inset_0_0_250px_rgba(0,0,0,1)] bg-gradient-to-t from-red-950/40 via-transparent to-black/40 pointer-events-none" />

              <div className="relative flex flex-col items-center gap-1 scale-90 sm:scale-100 md:scale-110">
                <div className="relative group px-4 text-center">
                  <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] animate-pulse leading-none">
                    HAS MUERTO
                  </h2>
                  <div className="absolute -inset-x-12 sm:-inset-x-24 top-1/2 h-[1px] bg-red-500/30 blur-sm hidden sm:block" />
                </div>

                <div className="flex flex-col items-center mt-8 sm:mt-12 gap-4 sm:gap-6 text-white/90">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] w-12 sm:w-16 bg-gradient-to-l from-white/20 to-transparent" />
                    <span className="text-white/40 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.4em] sm:tracking-[0.6em]">REAPARECIENDO</span>
                    <div className="h-[1px] w-12 sm:w-16 bg-gradient-to-r from-white/20 to-transparent" />
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="text-6xl sm:text-8xl font-black text-white font-mono tabular-nums leading-none tracking-tighter drop-shadow-2xl">
                      0{displaySeconds}
                    </div>
                    <svg className="absolute w-28 h-28 sm:w-40 sm:h-40 -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="38%"
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="38%"
                        fill="transparent"
                        stroke="rgba(220, 38, 38, 0.4)"
                        strokeWidth="2"
                        strokeDasharray="240"
                        style={{
                          strokeDashoffset: (240 - (240 * progress)),
                          transition: 'stroke-dashoffset 0.1s linear'
                        }}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
            </div>
          )}

          <div
            className="absolute top-4 left-4 flex flex-col gap-2 w-[140px]"
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/5">
                <span className="text-[10px] font-bold text-gray-400">PLAYERS</span>
                <span className="text-[10px] font-bold text-purple-400">{statsPlayers.length}</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto font-mono">
                {statsPlayers.map((plr) => (
                  <div key={plr?.id} className={`flex flex-col gap-1 px-1.5 py-1 ${plr?.username === name ? 'bg-white/10 rounded' : ''}`}>
                    <div className="flex items-center gap-1.5 ">
                      <div className={`w-1.5 h-1.5 rounded-full ${plr?.health > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[9px] truncate font-medium">{plr?.username}</span>
                      <span className="text-[8px] ml-auto text-gray-400">{plr?.health || 0}/{plr?.maxHealth || 100}</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${((plr?.health || 0) / (plr?.maxHealth || 100)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="absolute top-4 left-[160px] flex flex-col gap-2 w-[280px] pointer-events-auto hidden"
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 overflow-hidden ${!isChatOpen ? 'h-10' : 'h-[240px]'}`}>
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/80">Global Chat</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <svg className={`w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform duration-300 ${isChatOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {isChatOpen && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[9px] text-white/20 uppercase tracking-widest italic">No hay mensajes</span>
                      </div>
                    ) : (
                      messages.map((msg, i) => (
                        <div key={i} className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-2 duration-300">
                          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter">{msg.name}</span>
                          <span className="text-[11px] text-white/90 leading-tight bg-white/5 px-2 py-1 rounded-md border border-white/5">{msg.content}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-2 bg-black/20 border-t border-white/5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="p-2 bg-white/10 hover:bg-purple-500 hover:text-white rounded-xl transition-all active:scale-90 flex items-center justify-center border border-white/10"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 3px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
              }
            `}</style>
          </div>

          {isMobile && (
            <div className="fixed inset-0 pointer-events-none">
              <div
                className="absolute bottom-8 left-8 w-32 h-32 flex items-center justify-center pointer-events-auto touch-none"
                onTouchStart={onJoystickStart}
                onTouchMove={onJoystickMove}
                onTouchEnd={onJoystickEnd}
              >
                <div className="w-28 h-28 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center relative shadow-inner">
                  <div className="w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center transition-transform duration-75"
                    style={{ transform: `translate(${joystickUI.currentX}px, ${joystickUI.currentY}px)` }}>
                    <div className="w-4 h-4 rounded-full border border-black/10" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 right-8 flex flex-col gap-4 pointer-events-auto">
                <div className="flex gap-4 items-end">
                  <button
                    className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center active:scale-95 active:bg-white/20 transition-all shadow-xl"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      render?.room.getPlayers().find(p => p.hasController)?.run();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      render?.room.getPlayers().find(p => p.hasController)?.noRun();
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">Sprint</span>
                      <svg className="w-5 h-5 text-white mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </button>

                  <button
                    className="w-20 h-20 rounded-full bg-red-500/10 backdrop-blur-lg border border-red-500/30 flex items-center justify-center active:scale-90 active:bg-red-500/40 transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      const player = render?.room.getPlayers().find(p => p.hasController);
                      if (player) player.input_direction.shooting = true;
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      const player = render?.room.getPlayers().find(p => p.hasController);
                      if (player) player.input_direction.shooting = false;
                    }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-red-500/50 flex items-center justify-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    </div>
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center active:scale-95 active:bg-white/20 transition-all shadow-xl"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      render?.room.getPlayers().find(p => p.hasController)?.jump();
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">Jump</span>
                      <svg className="w-5 h-5 text-white mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
