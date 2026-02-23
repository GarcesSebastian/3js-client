"use client";
import * as THREE from "three";
import { createContext, ReactNode, useEffect, useState, useCallback } from "react";
import { Render3JS } from "@/lib/render";
import { useSocket } from "@/hooks/useSocket";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import { PlayerStats } from "@/lib/instances/player";
import { ProjectileProps } from "@/lib/instances/projectile";

interface GameContextProps {
    render: Render3JS | null;
    players: PlayerStats[];
    initGame: (container: HTMLDivElement) => void;
    handleJoinGame: (username: string) => void;
}

export const GameContext = createContext<GameContextProps | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket();
    const [render, setRender] = useState<Render3JS | null>(null);
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [pendingPlayers, setPendingPlayers] = useState<PlayerStats[]>([]);

    const initGame = useCallback((container: HTMLDivElement) => {
        if (!socket) return;

        const renderInstance = new Render3JS(socket, container);
        setRender(renderInstance);
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
            hasController: true
        });

        player.events.onMove((data) => {
            socket?.emit("player:move", {
                id: player.id,
                position: data.position,
                rotation: data.rotation
            });
        });

        render.room.join(player, (p) => {
            const stats = p.getStats();
            socket?.emit("player:join", stats);
            setPlayers(prev => [...prev, stats]);
        });
    }, [render, socket]);

    const handlePlayerJoined = useCallback((data: PlayerStats) => {
        if (!render) {
            setPendingPlayers(prev => [...prev, data]);
            return;
        }

        if (render.room.getPlayerById(data.id)) return;

        render.room.createPlayer({
            ...data,
            hasController: false,
        });

        setPlayers(prev => [...prev, data]);
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
            setPlayers(prev => {
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

    const handlePlayerMoved = useCallback((data: PlayerStats & { position: any, rotation: any }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setPosition(data.position.x, data.position.y, data.position.z);
            player.setRotation(data.rotation.x, data.rotation.y, data.rotation.z);
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
        setPlayers(data.players.filter(p => p && p.id));
    }, [render]);

    const handlePlayerLeft = useCallback((data: { id: string, username: string }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) render.room.leave(player);
        setPlayers(prev => prev.filter(p => p.id !== data.id));
    }, [render]);

    const handlePlayerHealth = useCallback((data: { id: string, health: number, maxHealth: number }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setHealth(data.health);
            setPlayers(prev => prev.map(p => p.id === data.id ? { ...p, health: data.health } : p));
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
            setPlayers(prev => {
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
            socket.off("projectile:created", handleProjectileCreated);
            socket.off("projectile:died", handleProjectileDied);
            socket.off("socket:connected:client", handleSocketConnectedClient);
            socket.off("player:health", handlePlayerHealth);
            socket.off("player:died", handlePlayerDied);
            socket.off("player:left", handlePlayerLeft);
        }
    }, [socket, handlePlayerJoin, handlePlayerJoined, handlePlayerMoved, handleProjectileCreated, handleProjectileDied, handlePlayerHealth, handlePlayerDied, handleSocketConnectedClient, handlePlayerLeft]);

    return (
        <GameContext.Provider value={{ render, players, initGame, handleJoinGame }}>
            {children}
        </GameContext.Provider>
    );
};