"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";

interface SocketContextProps {
    socket: Socket | null;
}

export const SocketContext = createContext<SocketContextProps | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        console.log(process.env.NEXT_PUBLIC_WS_URL);
        const MainSocket = io(`${process.env.NEXT_PUBLIC_WS_URL}`, {
            transports: ["websocket"],
            withCredentials: true,
            reconnectionAttempts: 5,
            timeout: 20000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        })

        MainSocket.on("disconnect", () => {
            console.log("Disconnected from server");
        })

        MainSocket.on("error", (error) => {
            console.log("Error: ", error);
        })

        setSocket(MainSocket);

        return () => {
            MainSocket.disconnect();
        }
    }, [])

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};