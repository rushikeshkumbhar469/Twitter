"use client";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Copy, Check, Calendar, Globe, Image, MapPin, Smile, Mic, Square, Trash2, Crown } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosinstance";
import { Input } from "./ui/input";
import { TranslatedText } from "@/components/ui/translated-text";

const TweetComposer = ({ onTweetPosted }: any) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [content, setcontent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [imageurl, setImageurl] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);

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

    // Subscription state
    const [subStatus, setSubStatus] = useState<any>(null);
    const [tweetLimitError, setTweetLimitError] = useState("");
    const [copied, setCopied] = useState(false);

    const maxlength = 200;

    const fetchSubStatus = useCallback(async () => {
        if (!user?.email) return;
        try {
            const res = await axiosInstance.get(`/subscription-status?email=${user.email}`);
            setSubStatus(res.data);
        } catch (_) {}
    }, [user?.email]);

    useEffect(() => {
        fetchSubStatus();
    }, [fetchSubStatus]);

    const handleCopy = async () => {
        const textToCopy = content.trim();
        if (!textToCopy) return;

        try {
            // Modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Fallback for non-secure contexts or older browsers
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            
            // Ensure the textarea is not visible but part of the DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            } catch (fallbackErr) {
                console.error('Copy failed:', fallbackErr);
            }
            
            document.body.removeChild(textArea);
        }
    };

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
        setTweetLimitError("");
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
            setImagePreview(null);
            if (!uploadedAudioUrl) deleteRecording();
            // Refresh subscription count after posting
            fetchSubStatus();
        } catch (error: any) {
            if (error?.response?.status === 403 && error?.response?.data?.planLimitReached) {
                setTweetLimitError(error.response.data.error);
            } else {
                console.log(error);
            }
        } finally {
            setIsLoading(false);
        }
    };
    const characterCount = content.length;
    const isoverlimit = characterCount > maxlength;
    const isnearlimit = characterCount > maxlength * 0.8;
    const tweetsUsed: number = subStatus?.tweetsUsed ?? 0;
    const tweetLimit = subStatus?.tweetLimit;
    const tweetsRemaining = subStatus?.tweetsRemaining;
    const isLimitReached = typeof tweetsRemaining === 'number' && tweetsRemaining <= 0;

    if (!user) return null;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const image = e.target.files[0];
        
        // Immediately show local preview
        const localPreviewUrl = URL.createObjectURL(image);
        setImagePreview(localPreviewUrl);
        
        setIsLoading(true);
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
            setImagePreview(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-black border-none rounded-none shadow-none">
            <CardContent className="pt-4">
                <div className="flex space-x-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar || undefined} alt={user.displayName} />
                        <AvatarFallback>
                            {user.displayName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <form onSubmit={initiateSubmit}>
                            <Textarea
                                value={content}
                                onChange={(e) => setcontent(e.target.value)}
                                placeholder={t("whatshappening")}
                                className="bg-transparent border-none text-lg text-white placeholder-gray-500 resize-none min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0 p-0 mb-2"
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative mt-2 mb-3 rounded-xl overflow-hidden border border-gray-700">
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                            <div className="w-5 h-5 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs text-gray-300 ml-2">Uploading...</span>
                                        </div>
                                    )}
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="max-h-48 w-full object-cover rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
                                        onClick={() => { setImageurl(""); setImagePreview(null); }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Tweet limit error */}
                            {tweetLimitError && (
                                <div className="mb-3 flex items-start gap-2 bg-red-950/30 border border-red-800/50 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-1">
                                    <Crown className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <TranslatedText text={tweetLimitError} className="text-red-300 text-xs leading-tight" />
                                        <button
                                            type="button"
                                            className="text-[10px] text-blue-400 hover:underline mt-0.5 font-bold"
                                            onClick={() => (window as any).__navigateToSubscription?.()}
                                        >
                                            <TranslatedText text="UPGRADE PLAN" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                                <div className="flex items-center gap-0 sm:gap-1 overflow-x-auto no-scrollbar">
                                    <label
                                        htmlFor="tweetImage"
                                        className="p-2 rounded-full hover:bg-blue-500/20 cursor-pointer text-[#1d9bf0] transition-colors flex items-center justify-center"
                                        title="Add image"
                                    >
                                        <Image className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="tweetImage"
                                            className="hidden"
                                            onChange={handlePhotoUpload}
                                            disabled={isLoading || isRecording}
                                        />
                                    </label>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`p-2 h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full transition-colors shrink-0 ${isRecording ? "bg-red-900/40 text-red-500 hover:bg-red-900/60 hover:text-red-400" : "hover:bg-blue-500/20 text-[#1d9bf0] hover:text-[#1d9bf0]"}`}
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={isLoading || !!audioBlob}
                                        title={isRecording ? "Stop recording" : "Record audio"}
                                    >
                                        {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full hover:bg-blue-500/20 text-[#1d9bf0] hover:text-[#1d9bf0] shrink-0"
                                        onClick={handleCopy}
                                        title="Copy tweet text"
                                    >
                                        {copied ? <Check className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-green-400" /> : <Copy className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center space-x-1 shrink-0">
                                        <Globe className="h-3.5 w-3.5 text-blue-400" />
                                        <span className="text-[10px] text-blue-400 font-bold uppercase hidden sm:inline">
                                            <TranslatedText text="Public" />
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 shrink-0">
                                    {subStatus && tweetLimit !== "Unlimited" && isLimitReached && (
                                        <button 
                                            type="button"
                                            onClick={() => (window as any).__navigateToSubscription?.()}
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-900/50 animate-pulse hover:bg-red-900/50 transition-colors"
                                        >
                                            LIMIT REACHED
                                        </button>
                                    )}
                                        {characterCount > 0 && (
                                            <div className="flex items-center space-x-2">
                                                <div className="relative w-5 h-5">
                                                    <svg className="w-5 h-5 transform -rotate-90">
                                                        <circle
                                                            cx="10"
                                                            cy="10"
                                                            r="8"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            fill="none"
                                                            className="text-gray-800"
                                                        />
                                                        <circle
                                                            cx="10"
                                                            cy="10"
                                                            r="8"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 8}`}
                                                            strokeDashoffset={`${2 * Math.PI * 8 * (1 - Math.min(characterCount, maxlength) / maxlength)}`}
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
                                                <Button
                                                    type="submit"
                                                    disabled={(!content.trim() && !imageurl && !audioBlob) || isoverlimit || isLoading || isRecording}
                                                    className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:bg-[#1d9bf0]/50 disabled:text-white/50 text-white font-bold rounded-full px-5 h-8.5 transition-all shadow-sm active:scale-95 text-sm"
                                                >
                                                    <TranslatedText text="Post" />
                                                </Button>
                                            </div>
                                        )}
                                        {characterCount === 0 && (
                                            <Button
                                                type="submit"
                                                disabled={(!content.trim() && !imageurl && !audioBlob) || isoverlimit || isLoading || isRecording}
                                                className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:bg-[#1d9bf0]/50 disabled:text-white/50 text-white font-bold rounded-full px-5 h-8.5 transition-all shadow-sm active:scale-95 text-sm"
                                            >
                                                <TranslatedText text="Post" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Audio Preview & Recording Status */}
                            {isRecording && (
                                <div className="flex items-center gap-3 mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-500 font-medium">
                                        <TranslatedText text="Recording" />: {formatTime(recordingTime)} / 5:00
                                    </span>
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
                                <h2 className="text-xl font-bold text-white text-center">
                                    <TranslatedText text="Verify Email to Upload" />
                                </h2>
                                <p className="text-sm text-gray-400 text-center">
                                    <TranslatedText text="An OTP has been sent to your email. Please verify to post this audio tweet." />
                                </p>
                                <Input
                                    placeholder="Enter 6-digit OTP"
                                    className="bg-gray-900 border-gray-700 text-white text-center text-lg tracking-widest"
                                    value={otpCode}
                                    maxLength={6}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                />
                                {otpError && <p className="text-sm text-red-500 text-center"><TranslatedText text={otpError} /></p>}
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 bg-transparent text-white border-gray-700 hover:bg-gray-800 hover:text-white" onClick={() => setShowOtpModal(false)}>
                                        <TranslatedText text="Cancel" />
                                    </Button>
                                    <Button className="flex-1 bg-white text-black hover:bg-gray-200 font-semibold" onClick={verifyOtpAndSubmit} disabled={otpLoading || otpCode.length !== 6}>
                                        {otpLoading ? <TranslatedText text="Verifying..." /> : <TranslatedText text="Verify & Post" />}
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