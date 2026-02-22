"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { useGame } from "@/hooks/useGame";

export default function Home() {
  const { initGame, handleJoinGame, players, render } = useGame();
  const [gameJoined, setGameJoined] = useState(false);
  const [name, setName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const joystickRef = useRef<{ active: boolean; base: { x: number; y: number }; current: { x: number; y: number } }>({
    active: false,
    base: { x: 0, y: 0 },
    current: { x: 0, y: 0 }
  });

  const [joystickUI, setJoystickUI] = useState({ currentX: 0, currentY: 0 });

  const touchState = useRef({
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
    if (!name.trim()) {
      alert("Por favor, ingresa un nombre para jugar.");
      return;
    }
    handleJoinGame(name);
    setGameJoined(true);
  };

  const onJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    joystickRef.current = {
      active: true,
      base: { x: centerX, y: centerY },
      current: { x: touch.clientX, y: touch.clientY }
    };
  };

  const onJoystickMove = (e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;

    const touch = Array.from(e.touches).find(t => {
      const dx = t.clientX - joystickRef.current.base.x;
      const dy = t.clientY - joystickRef.current.base.y;
      return Math.sqrt(dx * dx + dy * dy) < 150;
    }) || e.touches[0];

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

  const onJoystickEnd = () => {
    joystickRef.current.active = false;
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.input_direction.joystickX = 0;
      player.input_direction.joystickY = 0;
    }
    setJoystickUI({ currentX: 0, currentY: 0 });
  };

  const onTouchCameraStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX > window.innerWidth / 2) {
      touchState.current = {
        lastX: touch.clientX,
        lastY: touch.clientY,
        active: true,
        id: touch.identifier
      };
    }
  };

  const onTouchCameraMove = (e: React.TouchEvent) => {
    if (!touchState.current.active) return;
    const touch = Array.from(e.touches).find(t => t.identifier === touchState.current.id);
    if (!touch) return;

    const deltaX = touch.clientX - touchState.current.lastX;
    const deltaY = touch.clientY - touchState.current.lastY;

    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) {
      player.updateRotation(deltaX * 0.7, deltaY * 0.7);
    }

    touchState.current.lastX = touch.clientX;
    touchState.current.lastY = touch.clientY;
  };

  const onTouchCameraEnd = () => {
    touchState.current.active = false;
  };

  const onJump = () => {
    const player = render?.room.getPlayers().find(p => p.hasController);
    if (player) player.jump();
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none touch-none">
      <div
        ref={containerRef}
        className="fixed inset-0 z-0"
        onTouchStart={onTouchCameraStart}
        onTouchMove={onTouchCameraMove}
        onTouchEnd={onTouchCameraEnd}
      />

      {!gameJoined && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6 p-8 sm:p-12 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 w-[90%] max-w-md">
            <div className="text-center space-y-2">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent italic tracking-tight">
                3JS WORLD
              </h1>
              <p className="text-purple-400/80 text-[10px] sm:text-sm uppercase tracking-[0.3em] font-bold text-nowrap">Unirse al servidor</p>
            </div>
            <div className="w-full space-y-4">
              <input
                type="text"
                placeholder="Nickname..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-6 py-3 sm:py-4 bg-black/60 border border-white/10 rounded-xl outline-none text-center text-base sm:text-lg focus:border-purple-500/50"
              />
              <button
                onClick={handleJoin}
                className="w-full bg-white text-black font-bold py-3 sm:py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ENTRAR AL MUNDO
              </button>
            </div>
          </div>
        </div>
      )}

      {gameJoined && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
          <div className="w-2 h-2 bg-white/50 rounded-full border border-black/20" />

          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 flex flex-col gap-2 w-[140px] sm:min-w-[180px]">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/5">
                <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Online</span>
                <span className="text-[8px] sm:text-[10px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-full">{players.length}</span>
              </div>
              <div className="flex flex-col gap-0.5 max-h-[150px] sm:max-h-[300px] overflow-y-auto pr-1">
                {players.map((plr) => (
                  <div key={plr?.id} className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors ${plr?.username === name ? 'bg-white/10' : ''}`}>
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500" />
                    <span className={`text-[9px] sm:text-xs font-medium truncate ${plr?.username === name ? 'text-white' : 'text-white/60'}`}>
                      {plr?.username} {plr?.username === name ? '(Tú)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="fixed inset-0 pointer-events-auto overflow-hidden">
              <div
                className="absolute bottom-6 left-6 w-32 h-32 flex items-center justify-center touch-none"
                onTouchStart={onJoystickStart}
                onTouchMove={onJoystickMove}
                onTouchEnd={onJoystickEnd}
              >
                <div className="w-28 h-28 rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />

                  <div
                    className="w-10 h-10 bg-white/90 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform duration-75 ease-out flex items-center justify-center"
                    style={{
                      transform: `translate(${joystickUI.currentX}px, ${joystickUI.currentY}px)`
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border border-black/10" />
                  </div>
                </div>
              </div>

              <button
                className="absolute bottom-8 right-8 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 active:bg-white/30 transition-all shadow-xl"
                onTouchStart={onJump}
              >
                <span className="font-bold text-white/90 tracking-widest text-[10px] uppercase">Jump</span>
              </button>
            </div>
          )}

          {!isMobile && (
            <div className="absolute bottom-10 px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-[10px] text-white/40 uppercase tracking-[0.2em]">
              WASD • Space • Drag right to look
            </div>
          )}
        </div>
      )}
    </main>
  );
}
