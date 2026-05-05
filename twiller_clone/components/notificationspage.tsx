"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import { useSocket } from "@/context/socketcontext";
import axiosInstance from "@/lib/axiosinstance";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Bell, Heart, Repeat2, UserPlus, MessageCircle, CheckCheck } from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

const typeIcon: Record<string, React.ReactNode> = {
  like: <Heart className="h-5 w-5 text-red-500 fill-red-500" />,
  retweet: <Repeat2 className="h-5 w-5 text-green-500" />,
  follow: <UserPlus className="h-5 w-5 text-blue-500" />,
  comment: <MessageCircle className="h-5 w-5 text-blue-400" />,
  mention: <Bell className="h-5 w-5 text-yellow-400" />,
};

const typeText: Record<string, string> = {
  like: "liked your tweet",
  retweet: "retweeted your tweet",
  follow: "followed you",
  comment: "commented on your tweet",
  mention: "mentioned you",
};

// Each notification item translates its action text + tweet snippet
function NotificationItem({ n }: { n: any }) {
  const actionText = typeText[n.type] || "interacted with you";
  const { translated: translatedAction } = useAutoTranslate(actionText);
  const { translated: translatedSnippet } = useAutoTranslate(n.tweet?.content || "");
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-900/50 transition-colors cursor-pointer ${
        !n.read ? "bg-blue-950/10 border-l-2 border-blue-500" : ""
      }`}
    >
      <div className="mt-1 shrink-0">
        {typeIcon[n.type] || <Bell className="h-5 w-5 text-gray-400" />}
      </div>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={n.sender?.avatar || undefined} />
          <AvatarFallback className="bg-gray-700 text-white">
            {n.sender?.displayName?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-white text-sm">
            <span className="font-bold">{n.sender?.displayName || "Someone"}</span>{" "}
            <span className="text-gray-300">{translatedAction}</span>
          </p>
          {n.tweet?.content && (
            <p className="text-gray-500 text-sm mt-0.5 truncate">{translatedSnippet}</p>
          )}
          <p className="text-gray-600 text-xs mt-1">
            {n.createdAt
              ? new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : ""}
          </p>
        </div>
      </div>
      {!n.read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/notifications/${user._id}`);
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!user?._id) return;
    await axiosInstance.put("/notifications/read-all", { userId: user._id });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (notif: any) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("notifications")}</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-full flex items-center gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="text-sm">Mark all read</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
            <Bell className="h-10 w-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Nothing to see here — yet</h2>
          <p className="text-gray-500 max-w-xs">
            From likes and retweets to follows and replies, notifications about your interactions will show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {notifications.map((n: any) => (
            <NotificationItem key={n._id} n={n} />
          ))}
        </div>
      )}
    </div>
  );
}
