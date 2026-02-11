import { useAuth } from "@/context/authcontext";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { BarChart3, Calendar, Globe, Image, MapPin, Smile } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosinstance";

const TweetComposer = ({ onTweetPosted }: any) => {
    const { user } = useAuth();
    const [content, setcontent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [imageurl, setImageurl] = useState(" ");
    const maxlength = 200;
    const handlesubmit = async (e: any) => {
        e.preventDefault();
        if(!user || !content.trim()) return;
        try {
            const tweetdata ={
                author:user?._id,
                content,
                image:imageurl
            }
            const res=await axiosInstance.post('/tweet',tweetdata);
            onTweetPosted(res.data);
            setcontent("");
            setImageurl("");
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    };
    const characterCount = content.length;
    const isoverlimit = characterCount > maxlength;
    const isnearlimit = characterCount > maxlength * 0.8;
    if (!user) return null;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsLoading(true);
        const image = e.target.files[0];
        const formdataimg = new FormData();
        formdataimg.set("image", image);
        try {
            const res = await axios.post(
                "https://api.imgbb.com/1/upload?key=76890dfeb9394a0690592041ba2be777",
                formdataimg,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            const url = res.data.data.display_url;
            if (url) {
                setImageurl(url);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
            <CardContent className="pt-4">
                <div className="flex space-x-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.displayName} />
                        <AvatarFallback>
                            {user.displayName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <form onSubmit={handlesubmit}>
                            <Textarea
                                value={content}
                                onChange={(e) => setcontent(e.target.value)}
                                placeholder="What's happening?"
                                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                            />

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                                <div className="flex items-center gap-1">
                                    <label
                                    htmlFor="tweetImage"
                                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer"
                                    >
                                        <Image className="h-5 w-5" />
                                        <input
                                        type="file"
                                        accept="image/"
                                        id="tweetImage"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={isLoading}
                                        />
                                    </label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-white text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <BarChart3 className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-white text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Smile className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-white text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Calendar className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-white text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <MapPin className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="h-4 w-4 text-blue-400" />
                                        <span className="text-sm text-blue-400 font-semibold">
                                            Everyone can reply
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {characterCount > 0 && (
                                            <div className="flex items-center space-x-2">
                                                <div className="relative w-8 h-8">
                                                    <svg className="w-8 h-8 transform -rotate-90">
                                                        <circle
                                                            cx="16"
                                                            cy="16"
                                                            r="14"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                            className="text-gray-700"
                                                        />
                                                        <circle
                                                            cx="16"
                                                            cy="16"
                                                            r="14"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 14}`}
                                                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - characterCount / maxlength)}`}
                                                            className={
                                                                isoverlimit
                                                                    ? "text-red-500"
                                                                    : isnearlimit
                                                                        ? "text-yellow-500"
                                                                        : "text-blue-500"
                                                            }
                                                        />
                                                    </svg>
                                                </div>
                                                {isnearlimit && (
                                                    <span className={`text-sm ${isoverlimit ? "text-red-500" : "text-blue-500"
                                                        }`}
                                                    >
                                                        {maxlength - characterCount}
                                                    </span>
                                                )}
                                                <Separator
                                                    orientation="vertical"
                                                    className="h-6 bg-gray-700"
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={!content.trim() || isoverlimit || isLoading}
                                                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                                                >
                                                    Post
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
export default TweetComposer;