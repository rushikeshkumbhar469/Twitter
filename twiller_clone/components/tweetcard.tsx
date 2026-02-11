import React from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MoreHorizontal, Repeat2, Share } from "lucide-react";

const TweetCard = ({ tweet }: any) => {
    const liketweet = async (tweetid: any) => { };
    const retweet = async (tweetid: any) => { };
    const formatnumber = (value?: number) => {
        const num = typeof value === "number" && !isNaN(value) ? value : 0;
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M";
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "K";
        }
        return num.toFixed();
    };
    const user = tweet.author;
    const displayName = user?.displayName || "";
    const avatar = user?.avatar || "";
    const verified = user?.verified || false;

    return <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none hover:bg-gray-950 transition-colors">
        <CardContent className="p-4">
            <div className="flex gap-3">
                <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={avatar} />
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white hover:underline cursor-pointer">{displayName}</span>
                        {verified && (
                            <div className="flex-shrink-0">
                                <svg className="h-4 w-4 text-blue-500 fill-blue-500" viewBox="0 0 22 22" aria-label="Verified account">
                                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                </svg>
                            </div>
                        )}
                        <span className="text-gray-500">@{user?.username || ""}</span>
                        <span className="text-gray-500">.</span>
                        <span className="text-gray-500">{tweet.timestamp &&
                            new Date(tweet.timestamp).toLocaleDateString("en-us",{
                                month: "long",
                                year: "numeric",
                            })}</span>
                        <div className="ml-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 rounded-full hover:bg-gray-900">
                                <MoreHorizontal className="h-5 w-5 text-gray-500" />
                            </Button>
                        </div>
                    </div>
                    <div className="text-white mb-3 leading-relaxed">{tweet.content}</div>
                    {tweet.image && (
                        <div className="mb-3 rounded-2xl overflow-hidden">
                            <img src={tweet.image} alt="tweet image" className="w-full h-auto max-h-96 object-cover" />
                        </div>
                    )}
                    <div className="mt-1 flex items-center justify-between max-w-md">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-blue-400 group">
                            <MessageCircle className="h-5 w-5 group-hover:text-blue-400" />
                            <span className="text-sm">{formatnumber(tweet.comments)}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`flex items-center space-x-2 p-2 rounded-full hover:bg-emerald-900/20 group ${
                                tweet.retweeted
                                    ? "text-emerald-500"
                                    : "text-gray-500 hover:text-emerald-400"
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                retweet(tweet.id);
                            }}
                        >
                            <Repeat2
                                className={`h-5 w-5 ${
                                    tweet.retweeted
                                        ? "text-emerald-500 fill-current"
                                        : "group-hover:text-emerald-400"
                                }`} />
                            <span className="text-sm">{formatnumber(tweet.retweets)}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`flex items-center space-x-2 p-2 rounded-full hover:bg-red-900/20 group ${
                                tweet.liked
                                    ? "text-red-500"
                                    : "text-gray-500 hover:text-red-400"
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                liketweet(tweet.id);
                            }}
                        >
                            <Heart
                                className={`h-5 w-5 ${
                                    tweet.liked
                                        ? "text-red-500 fill-current"
                                        : "group-hover:text-red-400"
                                }`}
                            />
                            <span className="text-sm">{formatnumber(tweet.likes)}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-blue-400 group"
                        >
                            <Share className="h-5 w-5 group-hover:text-blue-400" />
                            <span>{formatnumber(tweet.comments)}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>

}
export default TweetCard;