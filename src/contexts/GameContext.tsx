"use client";
import { createContext, ReactNode, useEffect, useState, useCallback } from "react";
import { Render3JS } from "@/lib/render";
import { useSocket } from "@/hooks/useSocket";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import { Player, PlayerStats } from "@/lib/instances/_game/player";
import { ProjectileProps } from "@/lib/instances/_game/projectile";
import { PlayerAnimateData, PlayerMoveData } from "@/types/socket-events";

interface GameContextProps {
    render: Render3JS | null;
    statsPlayers: PlayerStats[];
    initGame: (container: HTMLDivElement) => void;
    handleJoinGame: (username: string) => void;
    isLoaded: boolean;
}

export const GameContext = createContext<GameContextProps | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket();
    const [render, setRender] = useState<Render3JS | null>(null);
    const [statsPlayers, setStatsPlayers] = useState<PlayerStats[]>([]);
    const [pendingPlayers, setPendingPlayers] = useState<PlayerStats[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const initGame = useCallback((container: HTMLDivElement) => {
        if (!socket) return;

        const renderInstance = new Render3JS(socket, container);
        setRender(renderInstance);

        renderInstance.events.onLoaded(() => {
            setIsLoaded(true);
        });

        renderInstance.start();

        return () => {
            renderInstance.destroy();
        }
    }, [socket]);

    const handleJoinGame = useCallback((username: string) => {
        if (!render) return;

        const id = uuidv4();
        const player = render.room.createPlayer({
            id,
            username,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            maxHealth: 100,
            speed: 120,
            jump_force: 160,
            hasController: true
        });

        player.playAnimationSequence("Spawn_Air", {
            atPercent: 1.0,
            pauseFor: 0,
            speedBefore: 1.0,
            speedAfter: 1.0
        });

        player.events.onMove((data) => {
            socket?.emit("player:move", {
                id: player.id,
                position: data.position,
                rotation: data.rotation,
                isMoving: data.isMoving,
                isSprinting: data.isSprinting,
                isJumping: data.isJumping
            });
        });

        render.room.join(player, (p) => {
            const stats = p.getStats();
            socket?.emit("player:join", stats);
            setStatsPlayers(prev => [...prev, stats]);
        });

        setTimeout(() => {
            render.renderer.domElement.requestPointerLock();
        }, 50);
    }, [render, socket]);

    const handlePlayerJoined = useCallback((data: PlayerStats) => {
        if (!render) {
            setPendingPlayers(prev => [...prev, data]);
            return;
        }

        if (render.room.getPlayerById(data.id)) return;

        const plr = render.room.createPlayer({
            ...data,
            hasController: false,
        });

        plr.playAnimationSequence("Spawn_Air", {
            atPercent: 1.0,
            pauseFor: 0,
            speedBefore: 1.0,
            speedAfter: 1.0
        });
        setStatsPlayers(prev => [...prev, data]);
    }, [render]);

    const handlePlayerJoin = useCallback((data: { players: PlayerStats[], projectiles: ProjectileProps[] }) => {
        if (render) {
            data.players.forEach((p) => {
                if (render.room.getPlayerById(p.id)) return;
                render.room.createPlayer({
                    ...p,
                    hasController: false,
                });
            });

            setStatsPlayers(prev => {
                const uniquePlayers = [...prev];
                data.players.filter(p => p && p.id).forEach(p => {
                    if (!uniquePlayers.find(up => up.id === p.id)) {
                        uniquePlayers.push(p);
                    }
                });
                return uniquePlayers;
            });

            data.projectiles.forEach(p => {
                render.room.createProjectile(p, true);
            });
        } else {
            setPendingPlayers(prev => [...prev, ...data.players]);
        }
    }, [render]);

    const handlePlayerMoved = useCallback((data: PlayerMoveData) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setPosition(data.position.x, data.position.y, data.position.z);
            player.setRotation(data.rotation.x, data.rotation.y, data.rotation.z);
            player.setIsMoving(data.isMoving ?? false);
            if (data.isSprinting) player.run();
            else player.noRun();
            player.setIsJumping(data.isJumping ?? false);
        }
    }, [render]);

    const handlePlayerAnimated = useCallback((data: PlayerAnimateData) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.playAnimationSequence(data.animation, {
                atPercent: data.atPercent,
                pauseFor: data.pauseFor,
                speedBefore: data.speedBefore,
                speedAfter: data.speedAfter
            });
        }
    }, [render]);

    const handleProjectileCreated = useCallback((data: ProjectileProps) => {
        if (!render) return;
        render.room.createProjectile(data, true);
    }, [render]);

    const handleProjectileDied = useCallback((data: { id: string, ownerId: string }) => {
        if (!render) return;
        const projectile = render.room.getProjectileById(data.id);
        if (projectile) projectile.destroy();
    }, [render]);

    const handleSocketConnectedClient = useCallback((data: { id: string, players: PlayerStats[], projectiles: ProjectileProps[] }) => {
        Cookies.set("SID_SKT", data.id);
        setStatsPlayers(data.players.filter(p => p && p.id));
    }, [render]);

    const handlePlayerLeft = useCallback((data: { id: string, username: string }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) render.room.leave(player);
        setStatsPlayers(prev => prev.filter(p => p.id !== data.id));
    }, [render]);

    const handlePlayerHealth = useCallback((data: { id: string, health: number, maxHealth: number }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setHealth(data.health);
            setStatsPlayers(prev => prev.map(p => p.id === data.id ? { ...p, health: data.health } : p));
        }
    }, [render]);

    const handlePlayerDied = useCallback((data: { id: string }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setHealth(0);
        }
    }, [render]);

    useEffect(() => {
        if (render && pendingPlayers.length > 0) {
            pendingPlayers.forEach(p => {
                if (!render.room.getPlayerById(p.id)) {
                    render.room.createPlayer({
                        ...p,
                        hasController: false,
                    });
                }
            });
            setStatsPlayers(prev => {
                const uniquePlayers = [...prev];
                pendingPlayers.filter(p => p && p.id).forEach(p => {
                    if (!uniquePlayers.find(up => up.id === p.id)) {
                        uniquePlayers.push(p);
                    }
                });
                return uniquePlayers;
            });
            setPendingPlayers([]);
        }
    }, [render, pendingPlayers]);

    useEffect(() => {
        if (!socket) return;
        socket.on("player:join", handlePlayerJoin);
        socket.on("player:joined", handlePlayerJoined);
        socket.on("player:moved", handlePlayerMoved);
        socket.on("player:animated", handlePlayerAnimated);
        socket.on("projectile:created", handleProjectileCreated);
        socket.on("projectile:died", handleProjectileDied);
        socket.on("socket:connected:client", handleSocketConnectedClient);
        socket.on("player:health", handlePlayerHealth);
        socket.on("player:died", handlePlayerDied);
        socket.on("player:left", handlePlayerLeft);

        return () => {
            socket.off("player:join", handlePlayerJoin);
            socket.off("player:joined", handlePlayerJoined);
            socket.off("player:moved", handlePlayerMoved);
            socket.off("player:animated", handlePlayerAnimated);
            socket.off("projectile:created", handleProjectileCreated);
            socket.off("projectile:died", handleProjectileDied);
            socket.off("socket:connected:client", handleSocketConnectedClient);
            socket.off("player:health", handlePlayerHealth);
            socket.off("player:died", handlePlayerDied);
            socket.off("player:left", handlePlayerLeft);
        }
    }, [socket, handlePlayerJoin, handlePlayerJoined, handlePlayerMoved, handleProjectileCreated, handleProjectileDied, handlePlayerHealth, handlePlayerDied, handleSocketConnectedClient, handlePlayerLeft]);

    return (
        <GameContext.Provider value={{ render, statsPlayers, initGame, handleJoinGame, isLoaded }}>
            {!isLoaded && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden font-sans select-none touch-none">
                    <div className="relative flex flex-col items-center gap-8 -translate-y-4">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-t-2 border-r-2 border-white/20 rounded-full animate-spin duration-[2000ms]" />
                            <div className="absolute inset-2 border-t-2 border-white/40 rounded-full animate-spin-reverse duration-[1500ms]" />
                            <div className="absolute inset-4 border-t-2 border-white/80 rounded-full animate-spin duration-[1000ms]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                CARGANDO MUNDO
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] w-8 bg-gradient-to-l from-white/20 to-transparent" />
                                <span className="text-white/20 text-[10px] font-bold uppercase tracking-[0.5em] animate-pulse">
                                    INICIALIZANDO ASSETS
                                </span>
                                <div className="h-[1px] w-8 bg-gradient-to-r from-white/20 to-transparent" />
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/10 text-[9px] font-bold tracking-[0.3em]">
                        <span className="uppercase">Three.js Engine</span>
                        <div className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="uppercase">World Renderer v2.0</span>
                    </div>

                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01),rgba(255,255,255,0.01))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />

                    <style jsx>{`
                        @keyframes spin-reverse {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(-360deg); }
                        }
                        .animate-spin-reverse {
                            animation: spin-reverse linear infinite;
                        }
                    `}</style>
                </div>
            )}
            {children}
        </GameContext.Provider>
    );
};