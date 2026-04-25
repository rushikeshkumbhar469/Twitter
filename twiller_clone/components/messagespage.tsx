"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import { useSocket } from "@/context/socketcontext";
import axiosInstance from "@/lib/axiosinstance";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

// Each message bubble gets its own translation hook
function MessageBubble({ msg, isMe }: { msg: any; isMe: boolean }) {
  const { translated, loading } = useAutoTranslate(msg.text || "");
  return (
    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
      isMe
        ? "bg-blue-500 text-white rounded-br-sm"
        : "bg-gray-800 text-white rounded-bl-sm"
    }`}>
      <p className={`transition-opacity duration-200 ${loading ? "opacity-50" : "opacity-100"}`}>
        {translated}
      </p>
      <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-500"}`}>
        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </p>
    </div>
  );
}

// Simple in-memory conversations built from followed users
export default function MessagesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket } = useSocket();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch followed users as message contacts
  useEffect(() => {
    if (!user?._id) return;
    axiosInstance.get(`/loggedinuser?email=${user.email}`)
      .then((res) => {
        const following = res.data?.following || [];
        if (following.length === 0) { setLoading(false); return; }
        // Fetch each followed user's profile
        Promise.all(following.map((id: string) =>
          axiosInstance.get(`/loggedinuser?email=&_id=${id}`).catch(() => null)
        )).then((results) => {
          const valid = results.filter(Boolean).map((r: any) => r?.data).filter(Boolean);
          setContacts(valid);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    socket.on("newMessage", (data: any) => {
      const convId = data.conversationId;
      setMessages((prev) => ({ ...prev, [convId]: [...(prev[convId] || []), data] }));
      if (!selected || selected._id !== data.senderId) {
        setUnreadMap((prev) => ({ ...prev, [data.senderId]: (prev[data.senderId] || 0) + 1 }));
      }
    });
    return () => { socket.off("newMessage"); };
  }, [socket, selected]);

  const getConvId = (otherId: string) => {
    if (!user?._id) return "";
    return [user._id, otherId].sort().join("_");
  };

  const openConversation = (contact: any) => {
    const convId = getConvId(contact._id);
    setSelected(contact);
    setUnreadMap((prev) => ({ ...prev, [contact._id]: 0 }));
    socket?.emit("joinConversation", convId);
    if (!messages[convId]) {
      setMessages((prev) => ({ ...prev, [convId]: [] }));
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !selected || !socket || !user) return;
    const convId = getConvId(selected._id);
    const msg = {
      conversationId: convId,
      senderId: user._id,
      senderName: user.displayName,
      senderAvatar: user.avatar,
      text: input.trim(),
    };
    socket.emit("sendMessage", msg);
    setMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), { ...msg, timestamp: new Date().toISOString() }],
    }));
    setInput("");
  };

  const convId = selected ? getConvId(selected._id) : "";
  const currentMessages = convId ? (messages[convId] || []) : [];
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Left: Contact list */}
      <div className={`flex flex-col border-r border-gray-800 ${selected ? "hidden md:flex" : "flex"} w-full md:w-80`}>
        <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("messages")}</h1>
            {totalUnread > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t("messages")} not yet</h2>
            <p className="text-gray-500 text-sm">Follow users to start a conversation with them.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                onClick={() => openConversation(contact)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-900 cursor-pointer transition-colors ${
                  selected?._id === contact._id ? "bg-gray-900" : ""
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="bg-gray-700 text-white">{contact.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  {(unreadMap[contact._id] || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMap[contact._id]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{contact.displayName}</p>
                  <p className="text-gray-500 text-sm truncate">@{contact.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Chat area */}
      <div className={`flex-1 flex flex-col ${!selected ? "hidden md:flex" : "flex"}`}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Select a message</h2>
            <p className="text-gray-500">Choose from your existing conversations or start a new one.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3 z-10">
              <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setSelected(null)}>
                <ArrowLeft className="h-5 w-5 text-white" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={selected.avatar} />
                <AvatarFallback className="bg-gray-700 text-white">{selected.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-white">{selected.displayName}</p>
                <p className="text-gray-500 text-sm">@{selected.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Start a conversation with {selected.displayName}!
                </div>
              ) : (
                currentMessages.map((msg: any, i: number) => {
                const isMe = msg.senderId === user?._id;
                return (
                  <div key={i} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={msg.senderAvatar} />
                        <AvatarFallback className="bg-gray-700 text-white">{msg.senderName?.[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <MessageBubble msg={msg} isMe={isMe} />
                  </div>
                );
              })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-3 bg-black">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Start a new message"
                className="flex-1 bg-gray-900 border-gray-700 text-white rounded-full px-4 focus-visible:ring-blue-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim()}
                size="icon"
                className="rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
