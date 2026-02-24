import { useEffect, useRef } from "react";
import { useAuth } from "@/context/authcontext";
import axiosInstance from "@/lib/axiosinstance";

export function useTweetNotifications() {
    const { user } = useAuth();
    const lastTweetIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user || !user.notificationsEnabled) return;

        // Request notification permission if not granted
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }

        const checkNewTweets = async () => {
            try {
                const res = await axiosInstance.get("/post");
                const tweets = res.data;
                if (!tweets || tweets.length === 0) return;

                // On first load, just set the latest tweet ID and don't notify
                if (!lastTweetIdRef.current) {
                    lastTweetIdRef.current = tweets[0]._id;
                    return;
                }

                const latestTweet = tweets[0];

                // If there's a new tweet
                if (latestTweet._id !== lastTweetIdRef.current) {
                    lastTweetIdRef.current = latestTweet._id;

                    // Don't notify for user's own tweets
                    if (latestTweet.author?._id === user._id || latestTweet.author === user._id) {
                        return;
                    }

                    const contentLower = latestTweet.content.toLowerCase();
                    if (contentLower.includes("cricket") && contentLower.includes("science")) {
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("New Keyword Match Tweet", {
                                body: `${latestTweet.author?.displayName || 'Someone'} tweeted: ${latestTweet.content}`,
                                icon: "/favicon.png",
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error polling for tweets:", error);
            }
        };

        // Initial check
        checkNewTweets();

        // Poll every 15 seconds
        const interval = setInterval(checkNewTweets, 15000);
        return () => clearInterval(interval);
    }, [user]);
}
