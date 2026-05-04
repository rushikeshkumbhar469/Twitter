import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import TweetCard from "./tweetcard";
import LoadingSpinner from "./loading-spinner";
import TweetComposer from "./tweetcomposer";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/context/authcontext";
export type Tweet = {
    id: number;
    user: {
        name: string;
        username: string;
        avatar: string;
        verified: boolean;
    };
    content: string;
    timestamp: string;
    likes: number;
    retweets: number;
    comments: number;
    liked: boolean;
    retweeted: boolean;
    image?: string;
    audio?: string;
};

const tweets: Tweet[] = [
    {
        id: 1,
        user: {
            name: "Alex Johnson",
            username: "alex_dev",
            avatar:
                "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400",
            verified: true,
        },
        content:
            "The new design system is finally complete! It took 6 months but the results are incredible. Clean, consistent, and accessible.",
        timestamp: "6h",
        likes: 456,
        retweets: 78,
        comments: 34,
        liked: false,
        retweeted: true,
        image:
            "https://images.pexels.com/photos/196645/pexels-photo-196645.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
        id: 2,
        user: {
            name: "Priya Nair",
            username: "priya_ui",
            avatar:
                "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
            verified: false,
        },
        content:
            "Trying out a lighter nav and I actually like it. Also, micro-interactions on the buttons feel so much smoother now.",
        timestamp: "3h",
        likes: 189,
        retweets: 42,
        comments: 18,
        liked: true,
        retweeted: false,
    },
    {
        id: 3,
        user: {
            name: "Ben Carter",
            username: "benbuilds",
            avatar:
                "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400",
            verified: true,
        },
        content:
            "Shipping a small QoL update today: keyboard shortcuts for the feed and a smoother scroll to compose. Let me know if anything feels off.",
        timestamp: "1h",
        likes: 92,
        retweets: 21,
        comments: 11,
        liked: false,
        retweeted: false,
    },
    {
        id: 4,
        user: {
            name: "DesignOps Weekly",
            username: "designops",
            avatar:
                "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=400",
            verified: true,
        },
        content:
            "Template drop: retro-style case study deck. Includes hero frames, before/after visuals, and metrics slides.",
        timestamp: "45m",
        likes: 311,
        retweets: 88,
        comments: 54,
        liked: false,
        retweeted: true,
        image:
            "https://images.pexels.com/photos/3747140/pexels-photo-3747140.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
];

const Feed = () => {
    const { user } = useAuth();
    const [tweets, setTweets] = useState<any>([]);
    const [activeTab, setActiveTab] = useState<string>("foryou");
    const [loading, setLoading] = useState(false);
    const fetchTweets = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/post");
            setTweets(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTweets();
    }, []);
    const handlenewtweet = (newtweet: any) => {
        setTweets((prev: any) => [newtweet, ...prev]);
    };
    return (
        <div className="min-h-screen">
            <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
                <div className="px-4 py-3">
                    <h1 className="text-xl font-bold text-white">Home</h1>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex w-full bg-transparent border-b border-gray-800 rounded-none h-auto p-0">
                        <TabsTrigger
                            value="foryou"
                            className="flex-1 h-14 relative flex items-center justify-center text-gray-500 font-medium transition-all hover:bg-white/5 border-none rounded-none data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:h-1 data-[state=active]:after:w-14 data-[state=active]:after:bg-[#1d9bf0] data-[state=active]:after:rounded-full data-[state=active]:shadow-none"
                        >
                            For you
                        </TabsTrigger>
                        <TabsTrigger
                            value="following"
                            className="flex-1 h-14 relative flex items-center justify-center text-gray-500 font-medium transition-all hover:bg-white/5 border-none rounded-none data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:h-1 data-[state=active]:after:w-14 data-[state=active]:after:bg-[#1d9bf0] data-[state=active]:after:rounded-full data-[state=active]:shadow-none"
                        >
                            Following
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <TweetComposer onTweetPosted={handlenewtweet} />
            <div className="divide-y divide-gray-800">
                {loading ? (
                    <Card className="bg-black border-none">
                        <CardContent className="py-12 text-center">
                            <div className="text-gray-400 mb-4">
                                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                                <p>Loading tweets...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    (() => {
                      const followingSet = new Set((user?.following || []).map(String));
                      const displayTweets = activeTab === "following"
                        ? tweets.filter((tweet: any) => followingSet.has(String(tweet.author?._id)))
                        : tweets;

                      if (activeTab === "following" && displayTweets.length === 0) {
                        return (
                          <Card className="bg-black border-none">
                            <CardContent className="py-12 text-center text-gray-400">
                              <p>Follow people to see their latest posts here.</p>
                            </CardContent>
                          </Card>
                        );
                      }

                      return displayTweets.map((tweet: any) => <TweetCard key={tweet._id} tweet={tweet} />);
                    })()
                )}
            </div>
        </div>
    )
}

export default Feed;

