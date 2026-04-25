"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import axiosInstance from "@/lib/axiosinstance";
import TweetCard from "./tweetcard";
import { Bookmark } from "lucide-react";
import LoadingSpinner from "./loading-spinner";

export default function BookmarksPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    axiosInstance.get(`/user/${user._id}/bookmarks`)
      .then((res) => setBookmarks(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?._id]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-3">
        <h1 className="text-xl font-bold">{t("bookmarks")}</h1>
        <p className="text-sm text-gray-500">@{user?.username}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-4">
            <Bookmark className="h-10 w-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Save Tweets for later</h2>
          <p className="text-gray-500 max-w-xs">
            Don&apos;t let the good ones fly away! Bookmark Tweets to easily find them again in the future.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {bookmarks.map((tweet: any) => (
            <TweetCard key={tweet._id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
}
