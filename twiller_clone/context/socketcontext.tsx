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
    const s = io(BACKEND, { query: { userId: user._id }, transports: ["websocket"] });
    socketRef.current = s;
    setSocket(s);
    return () => { s.disconnect(); };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
