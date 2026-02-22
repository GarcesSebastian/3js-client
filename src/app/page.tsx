"use client"

import { useState, useRef, useEffect } from "react";
import { useGame } from "@/hooks/useGame";

export default function Home() {
  const { initGame, handleJoinGame, players, render } = useGame();
  const [gameJoined, setGameJoined] = useState(false);
  const [name, setName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const joystickRef = useRef<{ active: boolean; base: { x: number; y: number } }>({
    active: false,
    base: { x: 0, y: 0 }
  });
  const [joystickUI, setJoystickUI] = useState({ currentX: 0, currentY: 0 });

  const lookTouchState = useRef({
    lastX: 0,
    lastY: 0,
    active: false,
    id: -1
  });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (containerRef.current) {
      initGame(containerRef.current);
    }
  }, [initGame]);

  const handleJoin = () => {
    if (!name.trim()) return alert("Por favor, ingresa un nombre.");
    handleJoinGame(name);
    setGameJoined(true);
  };

  const onJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    joystickRef.current = {
      active: true,
      base: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    };
  };

  const onJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickRef.current.base.x;
    const dy = touch.clientY - joystickRef.current.base.y;
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
    joystickRef.current.active = false;
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.input_direction.joystickX = 0;
      player.input_direction.joystickY = 0;
    }
    setJoystickUI({ currentX: 0, currentY: 0 });
  };

  const handleGlobalTouchStart = (e: React.TouchEvent) => {
    if (!gameJoined) return;
    const touch = e.touches[0];
    lookTouchState.current = {
      lastX: touch.clientX,
      lastY: touch.clientY,
      active: true,
      id: touch.identifier
    };
  };

  const handleGlobalTouchMove = (e: React.TouchEvent) => {
    if (!lookTouchState.current.active) return;
    const touch = Array.from(e.touches).find(t => t.identifier === lookTouchState.current.id);
    if (!touch) return;

    const deltaX = touch.clientX - lookTouchState.current.lastX;
    const deltaY = touch.clientY - lookTouchState.current.lastY;

    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.updateRotation(deltaX * 2.5, deltaY * 2.5);
    }

    lookTouchState.current.lastX = touch.clientX;
    lookTouchState.current.lastY = touch.clientY;
  };

  const handleGlobalTouchEnd = () => {
    lookTouchState.current.active = false;
  };

  return (
    <main
      className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none touch-none"
      onTouchStart={handleGlobalTouchStart}
      onTouchMove={handleGlobalTouchMove}
      onTouchEnd={handleGlobalTouchEnd}
    >
      <div ref={containerRef} className="fixed inset-0 z-0" />

      {!gameJoined && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6 p-8 sm:p-12 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 w-[90%] max-w-md">
            <div className="text-center">
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter text-white">3JS WORLD</h1>
              <p className="text-purple-400 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Unirse al servidor</p>
            </div>
            <div className="w-full space-y-4 pointer-events-auto">
              <input
                type="text"
                placeholder="Nickname..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-6 py-3 bg-black/60 border border-white/10 rounded-xl outline-none text-center text-lg focus:border-purple-500/50"
              />
              <button
                onClick={handleJoin}
                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ENTRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {gameJoined && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <div className="absolute top-4 left-4 flex flex-col gap-2 w-[140px]">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/5">
                <span className="text-[10px] font-bold text-gray-400">ONLINE</span>
                <span className="text-[10px] font-bold text-purple-400">{players.length}</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                {players.map((plr) => (
                  <div key={plr?.id} className={`flex items-center gap-1.5 px-1.5 py-1 ${plr?.username === name ? 'bg-white/10 rounded' : ''}`}>
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                    <span className="text-[10px] truncate">{plr?.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="fixed inset-0 pointer-events-none">
              <div
                className="absolute bottom-6 left-6 w-32 h-32 flex items-center justify-center pointer-events-auto touch-none"
                onTouchStart={onJoystickStart}
                onTouchMove={onJoystickMove}
                onTouchEnd={onJoystickEnd}
              >
                <div className="w-28 h-28 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-0 rounded-full border border-white/5" />
                  <div
                    className="w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center"
                    style={{ transform: `translate(${joystickUI.currentX}px, ${joystickUI.currentY}px)` }}
                  >
                    <div className="w-4 h-4 rounded-full border border-black/10" />
                  </div>
                </div>
              </div>

              <button
                className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto active:scale-90 active:bg-white/30"
                onTouchStart={() => render?.room.getPlayers().find(p => p.hasController)?.jump()}
              >
                <span className="font-bold text-white text-[10px] uppercase">Jump</span>
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
