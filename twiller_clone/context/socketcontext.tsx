"use client";
import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/authcontext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SocketContextValue {
  socket: Socket | null;
}
const SocketContext = createContext<SocketContextValue>({ socket: null });
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?._id) return;

    const s = io(BACKEND, {
      path: "/socket.io",
      auth: { userId: user._id },
      transports: ["polling", "websocket"],
      reconnection: true,
      secure: false,
      withCredentials: true,
    });

    s.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
    });

    s.on("connect", () => {
      console.log("Socket connected", s.id);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.off("connect_error");
      s.off("connect");
      s.disconnect();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
