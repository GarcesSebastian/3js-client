"use client";
import * as THREE from "three";
import { createContext, ReactNode, useEffect, useState, useCallback } from "react";
import { Render3JS } from "@/lib/render";
import { useSocket } from "@/hooks/useSocket";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

export interface IPlayer {
    id: string;
    username: string;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
}

interface GameContextProps {
    render: Render3JS | null;
    players: IPlayer[];
    initGame: (container: HTMLDivElement) => void;
    handleJoinGame: (username: string) => void;
}

export const GameContext = createContext<GameContextProps | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket();
    const [render, setRender] = useState<Render3JS | null>(null);
    const [players, setPlayers] = useState<IPlayer[]>([]);
    const [pendingPlayers, setPendingPlayers] = useState<IPlayer[]>([]);

    const initGame = useCallback((container: HTMLDivElement) => {
        const renderInstance = new Render3JS(container);
        setRender(renderInstance);
        renderInstance.start();

        return () => {
            renderInstance.destroy();
        }
    }, []);

    const handleJoinGame = useCallback((username: string) => {
        if (!render) return;

        const id = uuidv4();
        const player = render.room.createPlayer({
            id,
            name: username,
            hasController: true
        });

        const initialPos = { x: player.getPosition().x, y: player.getPosition().y, z: player.getPosition().z };
        const initialRot = { x: 0, y: player.mesh.rotation.y, z: 0 };

        player.events.onMove((data) => {
            socket?.emit("player:move", {
                id: player.id,
                position: data.position,
                rotation: data.rotation
            });
        });

        render.room.join(player, (p) => {
            socket?.emit("player:join", {
                id: p.id,
                username: p.name,
                position: initialPos,
                rotation: initialRot
            });

            setPlayers(prev => [...prev, {
                id: p.id,
                username: p.name,
                position: initialPos,
                rotation: initialRot
            }]);
        });
    }, [render, socket]);

    const handlePlayerJoined = useCallback((data: IPlayer) => {
        if (!render) {
            setPendingPlayers(prev => [...prev, data]);
            return;
        }

        if (render.room.getPlayerById(data.id)) return;

        const plr = render.room.createPlayer({
            id: data.id,
            name: data.username,
            hasController: false
        });

        if (data.position) plr.setPosition(data.position.x, data.position.y, data.position.z);
        if (data.rotation) plr.setRotation(data.rotation.x, data.rotation.y, data.rotation.z);

        setPlayers(prev => [...prev, data]);
    }, [render]);

    const handlePlayerJoin = useCallback((data: { players: IPlayer[] }) => {
        if (render) {
            data.players.forEach((p) => {
                if (render.room.getPlayerById(p.id)) return;
                const plr = render.room.createPlayer({
                    id: p.id,
                    name: p.username,
                    hasController: false,
                    position: p.position ? new THREE.Vector3(p.position.x, p.position.y, p.position.z) : undefined
                });

                if (p.rotation) plr.setRotation(p.rotation.x, p.rotation.y, p.rotation.z);
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
        } else {
            setPendingPlayers(prev => [...prev, ...data.players]);
        }
    }, [render]);

    const handlePlayerMoved = useCallback((data: IPlayer & { position: any, rotation: any }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) {
            player.setPosition(data.position.x, data.position.y, data.position.z);
            player.setRotation(data.rotation.x, data.rotation.y, data.rotation.z);
        }
    }, [render]);

    const handleSocketConnectedClient = useCallback((data: { id: string, players: IPlayer[] }) => {
        Cookies.set("SID_SKT", data.id);
        setPlayers(data.players.filter(p => p && p.id));
    }, []);

    const handlePlayerLeft = useCallback((data: { id: string, username: string }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (player) render.room.leave(player);
        setPlayers(prev => prev.filter(p => p.id !== data.id));
    }, [render]);

    useEffect(() => {
        if (render && pendingPlayers.length > 0) {
            pendingPlayers.forEach(p => {
                if (!render.room.getPlayerById(p.id)) {
                    const plr = render.room.createPlayer({
                        id: p.id,
                        name: p.username,
                        hasController: false,
                        position: p.position ? new THREE.Vector3(p.position.x, p.position.y, p.position.z) : undefined
                    });
                    if (p.rotation) plr.setRotation(p.rotation.x, p.rotation.y, p.rotation.z);
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
        socket.on("socket:connected:client", handleSocketConnectedClient);
        socket.on("player:left", handlePlayerLeft);

        return () => {
            socket.off("player:join", handlePlayerJoin);
            socket.off("player:joined", handlePlayerJoined);
            socket.off("player:moved", handlePlayerMoved);
            socket.off("socket:connected:client", handleSocketConnectedClient);
            socket.off("player:left", handlePlayerLeft);
        }
    }, [socket, handlePlayerJoin, handlePlayerJoined, handlePlayerMoved, handleSocketConnectedClient, handlePlayerLeft]);

    return (
        <GameContext.Provider value={{ render, players, initGame, handleJoinGame }}>
            {children}
        </GameContext.Provider>
    );
};