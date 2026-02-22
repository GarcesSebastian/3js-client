"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import { Render3JS } from "@/lib/render";
import { useSocket } from "@/hooks/useSocket";
import Cookies from "js-cookie";

interface GameContextProps {
    render: Render3JS;
    initGame: (container: HTMLDivElement) => () => void;
}

export const GameContext = createContext<GameContextProps | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [render, setRender] = useState<Render3JS | null>(null);
    const { socket } = useSocket();

    const initGame = (container: HTMLDivElement) => {
        const renderInstance = new Render3JS(container);
        setRender(renderInstance);
        renderInstance.start();

        return () => {
            renderInstance.destroy();
        }
    }

    const [pendingPlayers, setPendingPlayers] = useState<{ id: string, username: string }[]>([]);

    const handlePlayerJoined = (data: { id: string, username: string }) => {
        if (render) {
            render.room.createPlayer({
                id: data.id,
                name: data.username,
                hasController: false
            });
        } else {
            setPendingPlayers(prev => [...prev, data]);
        }
    };

    const handleSocketConnectedClient = (data: { id: string, players: { id: string, username: string }[] }) => {
        Cookies.set("SID_SKT", data.id);
        if (render) {
            data.players.forEach((player) => {
                render.room.createPlayer({
                    id: player.id,
                    name: player.username,
                    hasController: false
                });
            });
        } else {
            setPendingPlayers(data.players);
        }
    }

    const handlePlayerLeft = (data: { id: string, username: string }) => {
        if (!render) return;
        const player = render.room.getPlayerById(data.id);
        if (!player) {
            console.warn(`El jugador ${data.username} no se encontró`);
            return;
        }

        render.room.leave(player);
    }

    useEffect(() => {
        if (render && pendingPlayers.length > 0) {
            pendingPlayers.forEach(player => {
                if (!render.room.getPlayerById(player.id)) {
                    render.room.createPlayer({
                        id: player.id,
                        name: player.username,
                        hasController: false
                    });
                }
            });
            setPendingPlayers([]);
        }
    }, [render, pendingPlayers]);

    useEffect(() => {
        socket?.on("player:joined", handlePlayerJoined);
        socket?.on("socket:connected:client", handleSocketConnectedClient);
        socket?.on("player:left", handlePlayerLeft);

        return () => {
            socket?.off("player:joined", handlePlayerJoined);
            socket?.off("socket:connected:client", handleSocketConnectedClient);
            socket?.off("player:left", handlePlayerLeft);
        }
    }, [socket, render, pendingPlayers])

    return (
        <GameContext.Provider value={{ render: render!, initGame }}>
            {children}
        </GameContext.Provider>
    );
};