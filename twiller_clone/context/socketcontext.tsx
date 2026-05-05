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
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      secure: BACKEND.startsWith("https"),
      withCredentials: true,
    });

    s.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err.message);
    });

    s.on("connect", () => {
      console.log("✅ Socket connected:", s.id);
    });

    s.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.off("connect_error");
      s.off("connect");
      s.off("disconnect");
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
