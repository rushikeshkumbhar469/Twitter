import { useAuth } from "@/context/authcontext";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { BarChart3, Calendar, Globe, Image, MapPin, Smile, Mic, Square, Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosinstance";
import { Input } from "./ui/input";

const TweetComposer = ({ onTweetPosted }: any) => {
    const { user } = useAuth();
    const [content, setcontent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [imageurl, setImageurl] = useState("");

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const maxAudioDuration = 5 * 60; // 5 minutes

    // OTP State
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState("");

    const maxlength = 200;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                // Check 100MB limit (approx 100 * 1024 * 1024 bytes)
                if (blob.size > 100 * 1024 * 1024) {
                    alert("Audio exceeds 100MB limit.");
                    return;
                }
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= maxAudioDuration - 1) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone", error);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const deleteRecording = () => {
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setRecordingTime(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const initiateSubmit = async (e: any) => {
        e.preventDefault();
        if (!user || (!content.trim() && !imageurl && !audioBlob)) return;

        if (audioBlob) {
            // Need OTP for audio
            setIsLoading(true);
            try {
                await axiosInstance.post('/send-otp', { email: user?.email });
                setShowOtpModal(true);
            } catch (error: any) {
                alert(error.response?.data?.error || "Failed to send OTP");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Standard tweet
            submitTweet(null);
        }
    };

    const verifyOtpAndSubmit = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setOtpError("Please enter a 6-digit OTP");
            return;
        }

        setOtpLoading(true);
        setOtpError("");
        try {
            await axiosInstance.post('/verify-otp', { email: user?.email, otp: otpCode });

            // Upload Audio
            const formData = new FormData();
            formData.set("audio", audioBlob as Blob, "audio.webm");
            formData.append("email", user?.email || "");

            // We use the backend URL for this specific upload
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const uploadRes = await axios.post(`${backendUrl}/upload-audio`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const uploadedAudioUrl = backendUrl + uploadRes.data.audioUrl;
            setShowOtpModal(false);
            submitTweet(uploadedAudioUrl);
            setOtpCode("");
            deleteRecording();

        } catch (error: any) {
            setOtpError(error.response?.data?.error || "Invalid OTP or Upload Failed");
        } finally {
            setOtpLoading(false);
        }
    };

    const submitTweet = async (uploadedAudioUrl: string | null) => {
        setIsLoading(true);
        try {
            const tweetdata = {
                author: user?._id,
                content,
                image: imageurl,
                audio: uploadedAudioUrl
            }
            const res = await axiosInstance.post('/tweet', tweetdata);
            onTweetPosted(res.data);
            setcontent("");
            setImageurl("");
            if (!uploadedAudioUrl) deleteRecording();
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
                        <form onSubmit={initiateSubmit}>
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
                                            accept="image/*"
                                            id="tweetImage"
                                            className="hidden"
                                            onChange={handlePhotoUpload}
                                            disabled={isLoading || isRecording}
                                        />
                                    </label>

                                    {/* Mic recording button */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`p-2 rounded-full transition-colors ${isRecording ? "bg-red-900/40 text-red-500 hover:bg-red-900/60" : "hover:bg-blue-900/20 text-blue-400"}`}
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={isLoading || !!audioBlob}
                                    >
                                        {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-blue-900/20 text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <BarChart3 className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-blue-900/20 text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Smile className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-blue-900/20 text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <Calendar className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 rounded-full hover:bg-blue-900/20 text-blue-400 hover:text-blue-400 transition-colors"
                                    >
                                        <MapPin className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="h-4 w-4 text-blue-400" />
                                        <span className="text-sm text-blue-400 font-semibold hidden sm:inline">
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
                                                    disabled={(!content.trim() && !imageurl && !audioBlob) || isoverlimit || isLoading || isRecording}
                                                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                                                >
                                                    Post
                                                </Button>
                                            </div>
                                        )}
                                        {characterCount === 0 && (
                                            <Button
                                                type="submit"
                                                disabled={(!content.trim() && !imageurl && !audioBlob) || isoverlimit || isLoading || isRecording}
                                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                                            >
                                                Post
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Audio Preview & Recording Status */}
                            {isRecording && (
                                <div className="flex items-center gap-3 mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-500 font-medium">Recording: {formatTime(recordingTime)} / 5:00</span>
                                </div>
                            )}

                            {audioUrl && !isRecording && (
                                <div className="flex items-center gap-3 mt-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                                    <audio controls src={audioUrl} className="h-10 outline-none w-full" />
                                    <Button type="button" variant="ghost" size="icon" onClick={deleteRecording} className="text-red-400 hover:bg-red-900/20 hover:text-red-500">
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}

                        </form>
                    </div>
                </div>

                {/* OTP Modal */}
                {showOtpModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <Card className="w-full max-w-sm bg-black border border-gray-800">
                            <CardContent className="pt-6 space-y-4">
                                <h2 className="text-xl font-bold text-white text-center">Verify Email to Upload</h2>
                                <p className="text-sm text-gray-400 text-center">
                                    An OTP has been sent to your email. Please verify to post this audio tweet.
                                </p>
                                <Input
                                    placeholder="Enter 6-digit OTP"
                                    className="bg-gray-900 border-gray-700 text-white text-center text-lg tracking-widest"
                                    value={otpCode}
                                    maxLength={6}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                />
                                {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 bg-transparent text-white border-gray-700 hover:bg-gray-800 hover:text-white" onClick={() => setShowOtpModal(false)}>Cancel</Button>
                                    <Button className="flex-1 bg-white text-black hover:bg-gray-200 font-semibold" onClick={verifyOtpAndSubmit} disabled={otpLoading || otpCode.length !== 6}>
                                        {otpLoading ? "Verifying..." : "Verify & Post"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
export default TweetComposer;