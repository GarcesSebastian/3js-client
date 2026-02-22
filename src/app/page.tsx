"use client"

import { useState, useRef, useEffect } from "react";
import { useGame } from "@/hooks/useGame";

export default function Home() {
  const { initGame, handleJoinGame, players } = useGame();
  const [gameJoined, setGameJoined] = useState(false);
  const [name, setName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      initGame(containerRef.current);
    }
  }, [initGame])

  const handleJoin = () => {
    if (!name.trim()) {
      alert("Por favor, ingresa un nombre para jugar.");
      return;
    }

    handleJoinGame(name);
    setGameJoined(true);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      <div
        ref={containerRef}
        className="fixed inset-0 z-0"
      />

      {!gameJoined && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full bg-black/30 backdrop-blur-sm transition-all duration-700">
          <div className="absolute inset-0 bg-radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%) pointer-events-none" />
          <div className="flex flex-col items-center space-y-8 p-12 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
              <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent italic drop-shadow-2xl">
                3JS WORLD
              </h1>
              <p className="text-purple-400/80 text-sm uppercase tracking-[0.3em] font-bold">Unirse al servidor</p>
            </div>
            <div className="w-full space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Tu nombre de avatar..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-xl outline-none focus:border-purple-500/50 transition-all text-center text-lg placeholder:text-gray-600 group-hover:bg-black/80"
                  autoFocus
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <button
                onClick={handleJoin}
                className="group relative w-full overflow-hidden rounded-xl bg-white px-8 py-4 text-black font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                <span className="relative flex items-center justify-center gap-2">
                  ENTRAR AL MUNDO
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </button>
            </div>
            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                ONLINE
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="text-xs text-gray-500 tracking-widest">ALPHA V.0.1.0</div>
            </div>
          </div>
        </div>
      )}

      {gameJoined && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col items-center justify-center animate-in fade-in duration-1000">
          <div className="w-2 h-2 bg-white/50 rounded-full border border-black/20" />

          <div className="absolute top-8 left-8 flex flex-col gap-2 min-w-[200px]">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jugadores Online</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">{players.length}</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                {players.map((plr) => (
                  <div key={plr.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${plr.username === name ? 'bg-white/20 border border-white/10' : ''}`}>
                    <div className="relative">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {plr.username === name && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />}
                    </div>
                    <span className={`text-xs font-medium ${plr.username === name ? 'text-white' : 'text-white/60'}`}>
                      {plr.username} {plr.username === name ? '(Tú)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 flex flex-col items-center gap-2">
            <div className="px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-[10px] text-white/40 uppercase tracking-[0.2em]">
              WASD • Espacio • Click para capturar
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
