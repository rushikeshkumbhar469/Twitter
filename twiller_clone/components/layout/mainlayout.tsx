"use client";
import Sidebar from "./sidebar";
import RightSidebar from "./rightsidebar";
import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "../loading-spinner";
import { useAuth } from "@/context/authcontext";
import ProfilePage from "../profilepage";
import SubscriptionPage from "../subscriptionpage";
import NotificationsPage from "../notificationspage";
import MessagesPage from "../messagespage";
import ExplorePage from "../explorepage";
import BookmarksPage from "../bookmarkspage";
import MorePage from "../morepage";
import TweetComposer from "../tweetcomposer";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { SocketProvider, useSocket } from "@/context/socketcontext";
import axiosInstance from "@/lib/axiosinstance";

import BottomNav from "./bottomnav";

// Inner layout that consumes socket for live notification/message badges
const InnerLayout = ({ children }: any) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentPage, setCurrentPage] = useState("home");
  const [notifCount, setNotifCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // ... (previous effects)
  useEffect(() => {
    (window as any).__navigateToSubscription = () => setCurrentPage("subscription");
    return () => { delete (window as any).__navigateToSubscription; };
  }, []);

  const fetchNotifCount = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/notifications/${user._id}`);
      const unread = (res.data as any[]).filter((n) => !n.read).length;
      setNotifCount(unread);
    } catch { /* ignore */ }
  }, [user?._id]);

  useEffect(() => { fetchNotifCount(); }, [fetchNotifCount]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setNotifCount((c) => c + 1);
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (currentPage !== "messages" && data.senderId !== user?._id) {
        setMsgUnread((c) => c + 1);
      }
    };
    socket.on("newMessage", handler);
    return () => { socket.off("newMessage", handler); };
  }, [socket, currentPage, user?._id]);

  useEffect(() => {
    if (currentPage === "notifications") {
      setNotifCount(0);
      if (user?._id) {
        axiosInstance.put("/notifications/read-all", { userId: user._id }).catch(() => {});
      }
    }
    if (currentPage === "messages") {
      setMsgUnread(0);
    }
  }, [currentPage, user?._id]);

  if (!user) return <>{children}</>;

  const renderPage = () => {
    switch (currentPage) {
      case "profile":       return <ProfilePage />;
      case "subscription":  return <SubscriptionPage />;
      case "notifications": return <NotificationsPage />;
      case "messages":      return <MessagesPage />;
      case "explore":       return <ExplorePage onNavigate={setCurrentPage} />;
      case "bookmarks":     return <BookmarksPage />;
      case "more":          return <MorePage onNavigate={setCurrentPage} />;
      default:              return children;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center no-scrollbar">
      {/* Container for centering content on large screens */}
      <div className="flex w-full max-w-7xl">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onPostClick={() => setIsComposeOpen(true)}
          notifCount={notifCount}
          msgUnread={msgUnread}
        />
        
        <main className="flex-1 min-w-0 border-x border-gray-800 pb-20 md:pb-0 relative">
          <div className="max-w-[600px] mx-auto w-full">
            {renderPage()}
          </div>
        </main>

        <div className="hidden xl:flex w-80 flex-col">
          <RightSidebar onNavigate={setCurrentPage} />
        </div>
      </div>

      <BottomNav 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onPostClick={() => setIsComposeOpen(true)}
        notifCount={notifCount}
        msgUnread={msgUnread}
      />

      {/* Global Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] px-4">
          <div className="w-full max-w-xl bg-black rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-gray-900 rounded-full h-8 w-8 p-0"
                onClick={() => setIsComposeOpen(false)}
              >
                <Plus className="h-5 w-5 rotate-45" />
              </Button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[80vh]">
              <TweetComposer 
                onTweetPosted={() => {
                  setIsComposeOpen(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Mainlayout = ({ children }: any) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl font-bold mb-4">X</div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  return (
    <SocketProvider>
      <InnerLayout>{children}</InnerLayout>
    </SocketProvider>
  );
};

export default Mainlayout;
