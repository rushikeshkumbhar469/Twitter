"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import axiosInstance from "@/lib/axiosinstance";
import { Input } from "./ui/input";
import { Search, X, TrendingUp } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import TweetCard from "./tweetcard";
import LoadingSpinner from "./loading-spinner";
import { useDebounce } from "@/hooks/useDebounce";

const TRENDING = [
  { tag: "#NextJS", tweets: "12.4K" },
  { tag: "#TypeScript", tweets: "8.9K" },
  { tag: "#ReactJS", tweets: "22.1K" },
  { tag: "#MongoDB", tweets: "5.3K" },
  { tag: "#TailwindCSS", tweets: "14.7K" },
];

export default function ExplorePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, setuser } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ tweets: any[]; users: any[] }>({ tweets: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [trendingTweets, setTrendingTweets] = useState<any[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const debouncedQuery = useDebounce(query, 400);

  // Load trending on mount
  useEffect(() => {
    axiosInstance.get("/explore").then((res) => {
      setTrendingTweets(res.data.tweets || []);
    }).catch(() => {});
  }, []);

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ tweets: [], users: [] });
      return;
    }
    setLoading(true);
    axiosInstance.get(`/explore?query=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => setResults(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleFollow = async (targetId: string) => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.post(`/user/${targetId}/follow`, { currentUserId: user._id });
      setFollowingMap((prev) => ({ ...prev, [targetId]: res.data.isFollowing }));

      const updatedFollowing = Array.isArray(res.data.following) ? res.data.following.map(String) : [];
      setuser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, following: updatedFollowing };
        localStorage.setItem("twitter-user", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;
    const followingSet = new Set((user.following || []).map(String));
    const nextMap: Record<string, boolean> = {};
    results.users.forEach((u) => {
      nextMap[u._id] = followingSet.has(String(u._id));
    });
    setFollowingMap(nextMap);
  }, [user, results.users]);

  const hasResults = results.tweets.length > 0 || results.users.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Search Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-3">
        <h1 className="text-xl font-bold mb-3">{t("explore")}</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users and tweets..."
            className="pl-10 pr-10 bg-gray-900 border-gray-700 text-white rounded-full focus-visible:ring-blue-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl">
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Search results */}
        {!loading && query && hasResults && (
          <>
            {/* User results */}
            {results.users.length > 0 && (
              <div className="border-b border-gray-800">
                <p className="px-4 py-2 text-sm font-bold text-gray-400">{t("people")}</p>
                {results.users.map((u) => (
                  <div key={u._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-gray-700 text-white">{u.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white">{u.displayName}</p>
                        {u.bio && <p className="text-gray-400 text-sm mt-1 max-w-xs truncate">{u.bio}</p>}
                        <p className="text-gray-600 text-xs mt-0.5">
                          {u.followers?.length || 0} followers · {u.following?.length || 0} following
                        </p>
                      </div>
                    </div>
                    {u._id !== user?._id && (
                      <Button
                        size="sm"
                        variant={followingMap[u._id] ? "outline" : "default"}
                        onClick={() => handleFollow(u._id)}
                        className={`rounded-full font-bold shrink-0 ${
                          followingMap[u._id]
                            ? "border-gray-600 text-white bg-transparent hover:bg-red-900/20 hover:text-red-400 hover:border-red-500"
                            : "bg-white text-black hover:bg-gray-200"
                        }`}
                      >
                        {followingMap[u._id] ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tweet results */}
            {results.tweets.length > 0 && (
              <div>
                <p className="px-4 py-2 text-sm font-bold text-gray-400">{t("tweets")}</p>
                <div className="divide-y divide-gray-800">
                  {results.tweets.map((tweet) => (
                    <TweetCard key={tweet._id} tweet={tweet} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* No results */}
        {!loading && query && !hasResults && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Search className="h-12 w-12 text-gray-600 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No results for &quot;{query}&quot;</h2>
            <p className="text-gray-500 text-sm">Try searching for something else, or check your spelling.</p>
          </div>
        )}

        {/* Trending (shown when no search) */}
        {!query && (
          <>
            {/* Trending Tags */}
            <div className="border-b border-gray-800 pb-2">
              <p className="px-4 py-3 text-xl font-bold">{t("trending")}</p>
              {TRENDING.map((trend) => (
                <div
                  key={trend.tag}
                  onClick={() => setQuery(trend.tag)}
                  className="px-4 py-3 hover:bg-gray-900 cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <TrendingUp className="h-5 w-5 text-gray-500 shrink-0" />
                  <div>
                    <p className="font-bold text-white">{trend.tag}</p>
                    <p className="text-gray-500 text-sm">{trend.tweets} {t("tweets")}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Latest tweets */}
            <div>
              <p className="px-4 py-3 text-xl font-bold">{t("latest")}</p>
              <div className="divide-y divide-gray-800">
                {trendingTweets.map((tweet) => (
                  <TweetCard key={tweet._id} tweet={tweet} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
