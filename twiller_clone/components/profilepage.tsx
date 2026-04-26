import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
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
import { TranslatedText } from "@/components/ui/translated-text";

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
  const { user, getLoginHistory } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { setuser } = useAuth();

  // Translate bio text to current language
  const { translated: translatedBio } = useAutoTranslate(user?.bio || "");

  if (!user) return;

  const [tweets, setTweets] = useState<any>([]);
  const [replies, setReplies] = useState<any>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
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

  const fetchReplies = async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/user/${user._id}/replies`);
      setReplies(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTweets();
    fetchReplies();
    const fetchLoginHistory = async () => {
      if (!user?.email) return;
      try {
        const data = await getLoginHistory(user.email);
        setLoginHistory(data.slice(0, 20));
      } catch (error) {
        console.error(error);
      }
    };
    fetchLoginHistory();
  }, []);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      setLoading(true);
      
      // Post to our local upload endpoint
      const uploadRes = await axiosInstance.post("/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (!uploadRes.data?.imageUrl) {
        throw new Error("Server failed to return image URL.");
      }

      const baseUrl = axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "";
      const fullImageUrl = uploadRes.data.imageUrl.startsWith("http") 
        ? uploadRes.data.imageUrl 
        : `${baseUrl}${uploadRes.data.imageUrl}`;
      
      // Update user profile in backend
      const updateData = type === "avatar" ? { avatar: fullImageUrl } : { cover: fullImageUrl };
      const updateRes = await axiosInstance.patch(`/userupdate/${encodeURIComponent(user.email)}`, updateData);
      
      if (updateRes.data) {
        setuser(updateRes.data);
        localStorage.setItem("twitter-user", JSON.stringify(updateRes.data));
        console.log(`${type} updated successfully:`, fullImageUrl);
      }
    } catch (error: any) {
      console.error(`Error updating ${type}:`, error);
      const message = error.response?.data?.error || error.message || "Unknown error";
      alert(`Failed to update ${type}: ${message}`);
    } finally {
      setLoading(false);
      // Reset input value so same file can be selected again
      e.target.value = "";
    }
  };

  const userTweets = tweets.filter(
    (tweet: any) => (tweet.author?._id === user._id) || (tweet.author === user._id)
  );

  const mediaTweets = userTweets.filter(
    (tweet: any) => tweet.image || (tweet.images && tweet.images.length > 0) || tweet.audio
  );

  const highlightTweets = userTweets.filter(
    (tweet: any) => tweet.likes > 0
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
              {userTweets.length} <TranslatedText text="posts" />
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto border-x border-gray-800 bg-black min-h-screen">
        <div className="relative">
          <div className="relative">
            <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden relative">
              {user.cover ? (
                <img src={user.cover} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            <input 
              type="file" 
              ref={coverInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, "cover")} 
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              onClick={() => coverInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 text-white" />
            </Button>
            <div className="absolute -bottom-12 sm:-bottom-16 left-4">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-black">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.displayName}
                  />
                  <AvatarFallback className="text-2xl">
                    {user.displayName?.[0] || "@"}
                  </AvatarFallback>
                </Avatar>
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, "avatar")} 
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 p-1.5 sm:p-2 rounded-full bg-black/70 hover:bg-black/90 transition-colors"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 mt-14 sm:mt-20">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {user.displayName}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-600 text-white hover:bg-white/10 hover:text-white bg-transparent px-3 sm:px-4 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setShowEditModal(true)}
                >
                  {t("editProfile")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-900 h-8 w-8 sm:h-9 sm:w-9"
                >
                  <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </Button>
              </div>
            </div>
            {user?.bio && (
              <p className="text-white mb-3 leading-relaxed text-sm sm:text-base">{translatedBio}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-[13px] sm:text-sm mb-3">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{user?.location || "Earth"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Link2Icon className="h-4 w-4" />
                <span className="text-blue-400 truncate max-w-[150px]">
                  {user?.website || "example.com"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {user?.joinedDate && new Date(user.joinedDate).toLocaleDateString("en-us", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mt-2 grid w-full grid-cols-6 bg-transparent border-b border-gray-800 rounded-none h-auto p-0 overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="posts"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="replies"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                Replies
              </TabsTrigger>
              <TabsTrigger
                value="highlights"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                Highlights
              </TabsTrigger>
              <TabsTrigger
                value="articles"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                Articles
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                Media
              </TabsTrigger>
              <TabsTrigger
                value="logins"
                className="text-xs sm:text-sm text-gray-500 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none py-3 px-1"
              >
                <TranslatedText text="Logins" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <div>
                {loading ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="Loading posts..." />
                  </div>
                ) : userTweets.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="No posts yet" />
                  </div>
                ) : (
                  userTweets.map((tweet: any) => (
                    <TweetCard key={tweet._id || tweet.id} tweet={tweet} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="replies">
              <div>
                {replies.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="No replies yet" />
                  </div>
                ) : (
                  replies.map((reply: any) => (
                    <div key={reply._id} className="p-4 border-b border-gray-800 hover:bg-white/5 transition-colors">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={reply.author?.avatar} />
                          <AvatarFallback>{reply.author?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{reply.author?.displayName}</span>
                            <span className="text-gray-500 text-sm">@{reply.author?.username}</span>
                            <span className="text-gray-500 text-sm">· {new Date(reply.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-white mt-1">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="highlights">
              <div>
                {highlightTweets.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="No highlights yet. Like your own posts to see them here!" />
                  </div>
                ) : (
                  highlightTweets.map((tweet: any) => (
                    <TweetCard key={tweet._id} tweet={tweet} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="articles">
              <div className="py-8 text-center text-gray-500 text-sm">
                <TranslatedText text="Longer articles or threads will appear here." />
              </div>
            </TabsContent>

            <TabsContent value="media">
              <div>
                {mediaTweets.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="No media posts yet" />
                  </div>
                ) : (
                  mediaTweets.map((tweet: any) => (
                    <TweetCard key={tweet._id} tweet={tweet} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="logins">
              <div className="divide-y divide-gray-800">
                {loginHistory.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <TranslatedText text="No login history found." />
                  </div>
                ) : (
                  loginHistory.map((entry, index) => (
                    <div key={`${entry.loginAt}-${index}`} className="p-4 hover:bg-gray-900/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-white font-bold flex items-center gap-2">
                          <TranslatedText text={entry.browser} /> 
                          <span className="text-gray-600 font-normal">on</span> 
                          <TranslatedText text={entry.os} />
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                          entry.success ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"
                        }`}>
                          {entry.success ? <TranslatedText text="Success" /> : <TranslatedText text="Denied" />}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs flex flex-wrap gap-x-3 gap-y-1">
                        <span className="capitalize"><TranslatedText text={entry.deviceType} /></span>
                        <span>•</span>
                        <span>IP: {entry.ipAddress || "Unknown"}</span>
                        <span>•</span>
                        <span>{new Date(entry.loginAt).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-1 italic">
                        <TranslatedText text="Policy" />: <TranslatedText text={entry.policyAction || "standard"} />
                      </div>
                    </div>
                  ))
                )}
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
