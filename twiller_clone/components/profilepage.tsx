import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/authcontext";
import TweetCard from "./tweetcard";
import { Button } from "./ui/button";
import EditProfile from "./editprofile";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Link2Icon,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import axiosInstance from "@/lib/axiosinstance";

export type Tweet = {
  id: number;
  author: {
    id: string;
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

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return;

  const [tweets, setTweets] = useState<any>([]);
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

  const userTweets = tweets.filter(
    (tweet: any) => tweet.author?.id === user._id || tweet.author === user._id
  );


  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 z-10">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-900"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{user.displayName}</h1>
            <p className="text-sm text-gray-500">
              {userTweets.length} posts
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto border-x border-gray-800">
        <div className="relative">
          <div className="relative">
            <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600" />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70"
            >
              <Camera className="h-5 w-5 text-white" />
            </Button>
            <div className="absolute -bottom-16 left-4">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-black">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.displayName}
                  />
                  <AvatarFallback className="text-2xl">
                    {user.displayName?.[0] || "@"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90"
                >
                  <Camera className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 mt-20">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.displayName}
                </h1>
                <p className="text-gray-400">@{user.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-600 text-white hover:bg-white/10 hover:text-white bg-transparent px-4"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit profile
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-900"
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
            </div>
            {user?.bio && (
              <p className="text-white mb-3 leading-relaxed">{user.bio}</p>
            )}

            <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{user?.location || "Earth"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Link2Icon className="h-4 w-4" />
                <span className="text-blue-400">
                  {user?.website || "example.com"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {""} {user?.joinedDate && new Date(user.joinedDate).toLocaleDateString("en-us", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mt-2 grid w-full grid-cols-5 bg-transparent border-b border-gray-800 rounded-none h-auto">
              <TabsTrigger
                value="posts"
                className="text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:rounded-none"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="replies"
                className="text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:rounded-none"
              >
                Replies
              </TabsTrigger>
              <TabsTrigger
                value="highlights"
                className="text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:rounded-none"
              >
                Highlights
              </TabsTrigger>
              <TabsTrigger
                value="articles"
                className="text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:rounded-none"
              >
                Articles
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:rounded-none"
              >
                Media
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <div>
                {loading ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    Loading posts...
                  </div>
                ) : userTweets.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    No posts yet
                  </div>
                ) : (
                  userTweets.map((tweet: any) => (
                    <TweetCard key={tweet.id} tweet={tweet} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="replies">
              <div className="py-8 text-center text-gray-500 text-sm">
                Replies to other posts will appear here.
              </div>
            </TabsContent>

            <TabsContent value="highlights">
              <div className="py-8 text-center text-gray-500 text-sm">
                Highlighted posts will appear here.
              </div>
            </TabsContent>

            <TabsContent value="articles">
              <div className="py-8 text-center text-gray-500 text-sm">
                Longer articles or threads will appear here.
              </div>
            </TabsContent>

            <TabsContent value="media">
              <div className="py-8 text-center text-gray-500 text-sm">
                Photos and videos you share will appear here.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditProfile
        isopen={showEditModal}
        isclose={() => setShowEditModal(false)}
      />
    </div>
  );
};

export default ProfilePage;
