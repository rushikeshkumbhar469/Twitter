"use client";
import { useEffect, useCallback } from "react";
import { useAuth } from "@/context/authcontext";
import { useSocket } from "@/context/socketcontext";

export const useBrowserNotifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Request permission for browser notifications
  const requestPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        tag: "twitter-clone", // Prevents duplicate notifications
        requireInteraction: false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Click to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Show alert (fallback for when notifications aren't available)
  const showAlert = useCallback((message: string) => {
    // Only show alert if page is not visible (user is away)
    if (document.hidden) {
      alert(message);
    }
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !user) return () => {}; // Return empty cleanup function

    const handleNewMessage = (data: any) => {
      // Don't notify for own messages
      if (data.senderId === user._id) return;

      const title = `New message from ${data.senderName}`;
      const body = data.text.length > 50 ? `${data.text.substring(0, 50)}...` : data.text;

      showNotification(title, body, data.senderAvatar);
      showAlert(`New message: ${body}`);
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, user?._id]);

  // Listen for new notifications
  useEffect(() => {
    if (!socket || !user) return () => {}; // Return empty cleanup function

    const handleNewNotification = (notification: any) => {
      // Don't notify for own actions
      if (notification.sender?._id === user._id) return;

      let title = "New notification";
      let body = "";

      switch (notification.type) {
        case "like":
          title = `${notification.sender?.displayName || "Someone"} liked your tweet`;
          body = notification.tweet?.content?.substring(0, 100) || "";
          break;
        case "retweet":
          title = `${notification.sender?.displayName || "Someone"} retweeted your tweet`;
          body = notification.tweet?.content?.substring(0, 100) || "";
          break;
        case "follow":
          title = `${notification.sender?.displayName || "Someone"} followed you`;
          body = "You have a new follower!";
          break;
        case "comment":
          title = `${notification.sender?.displayName || "Someone"} commented on your tweet`;
          body = notification.tweet?.content?.substring(0, 100) || "";
          break;
        case "mention":
          title = `${notification.sender?.displayName || "Someone"} mentioned you`;
          body = notification.tweet?.content?.substring(0, 100) || "";
          break;
        default:
          body = "You have a new notification";
      }

      showNotification(title, body, notification.sender?.avatar);
      showAlert(title);
    };

    socket.on("notification", handleNewNotification);
    return () => socket.off("notification", handleNewNotification);
  }, [socket, user?._id]);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return { requestPermission, showNotification, showAlert };
};