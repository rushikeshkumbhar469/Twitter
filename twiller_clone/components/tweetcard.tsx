"use client";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Heart, MessageCircle, MoreHorizontal, Repeat2, Share,
  Bookmark, BookmarkCheck, X, Send, Link2, Trash2, Copy, Check
} from "lucide-react";
import { useAuth } from "@/context/authcontext";
import axiosInstance from "@/lib/axiosinstance";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

// ─── TranslatedText: renders a single string with auto-translation ────────────
function TranslatedText({ text, className }: { text: string; className?: string }) {
  const { translated, loading } = useAutoTranslate(text);
  return (
    <span
      className={`${className || ""} transition-opacity duration-200 ${
        loading ? "opacity-50" : "opacity-100"
      }`}
    >
      {translated}
    </span>
  );
}

// ─── CommentItem: each comment gets its own translation hook ─────────────────
function CommentItem({ c }: { c: any }) {
  const { translated: translatedContent, loading } = useAutoTranslate(c.content || "");
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={c.author?.avatar || undefined} />
        <AvatarFallback className="bg-gray-700 text-white text-xs">{c.author?.displayName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="bg-gray-900 rounded-xl px-3 py-2 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-white text-sm">{c.author?.displayName}</span>
          <span className="text-gray-500 text-xs">@{c.author?.username}</span>
          <span className="text-gray-600 text-xs ml-auto">
            {c.createdAt && new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className={`text-white text-sm transition-opacity duration-200 ${loading ? "opacity-50" : "opacity-100"}`}>
          {translatedContent}
        </p>
      </div>
    </div>
  );
}

const TweetCard = ({ tweet, onUpdate }: { tweet: any; onUpdate?: (updated: any) => void }) => {
  const { user } = useAuth();

  // Likes
  const [likes, setLikes] = useState<number>(tweet.likes || 0);
  const [liked, setLiked] = useState<boolean>(() =>
    user?._id ? (tweet.likedBy || []).includes(user._id) : false
  );

  // Retweets
  const [retweets, setRetweets] = useState<number>(tweet.retweets || 0);
  const [retweeted, setRetweeted] = useState<boolean>(() =>
    user?._id ? (tweet.retweetedBy || []).includes(user._id) : false
  );

  // Comments
  const [commentCount, setCommentCount] = useState<number>(tweet.comments || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Bookmarks
  const [bookmarked, setBookmarked] = useState(false);

  // More menu
  const [showMore, setShowMore] = useState(false);

  // Share toast
  const [copied, setCopied] = useState(false);

  const formatNumber = (value?: number) => {
    const num = typeof value === "number" && !isNaN(value) ? value : 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const tweetAuthor = tweet.author;
  const displayName = tweetAuthor?.displayName || "";
  const avatar = tweetAuthor?.avatar || "";
  const verified = tweetAuthor?.verified || false;

  // ─── Like ────────────────────────────────────────────────────────────────────
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?._id) return;
    const prev = { liked, likes };
    setLiked(!liked);
    setLikes(liked ? Math.max(0, likes - 1) : likes + 1);
    try {
      const res = await axiosInstance.post(`/tweet/${tweet._id}/like`, { userId: user._id });
      setLikes(res.data.likes);
      setLiked(res.data.liked);
    } catch {
      setLiked(prev.liked);
      setLikes(prev.likes);
    }
  };

  // ─── Retweet ─────────────────────────────────────────────────────────────────
  const handleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?._id) return;
    const prev = { retweeted, retweets };
    setRetweeted(!retweeted);
    setRetweets(retweeted ? Math.max(0, retweets - 1) : retweets + 1);
    try {
      const res = await axiosInstance.post(`/tweet/${tweet._id}/retweet`, { userId: user._id });
      setRetweets(res.data.retweets);
      setRetweeted(res.data.retweeted);
    } catch {
      setRetweeted(prev.retweeted);
      setRetweets(prev.retweets);
    }
  };

  // ─── Comments ─────────────────────────────────────────────────────────────────
  const toggleComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showComments) { setShowComments(false); return; }
    setShowComments(true);
    setCommentsLoading(true);
    try {
      const res = await axiosInstance.get(`/tweet/${tweet._id}/comments`);
      setComments(res.data);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  const postComment = async () => {
    if (!newComment.trim() || !user?._id) return;
    try {
      const res = await axiosInstance.post(`/tweet/${tweet._id}/comment`, {
        userId: user._id, content: newComment.trim(),
      });
      setComments((prev) => [res.data, ...prev]);
      setCommentCount((c) => c + 1);
      setNewComment("");
    } catch { console.error("Failed to post comment"); }
  };

  // ─── Bookmark ─────────────────────────────────────────────────────────────────
  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?._id) return;
    const prev = bookmarked;
    setBookmarked(!bookmarked);
    try {
      await axiosInstance.post("/user/bookmark", { userId: user._id, tweetId: tweet._id });
    } catch { setBookmarked(prev); }
  };

  // ─── Share ─────────────────────────────────────────────────────────────────────
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = tweet.content;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?._id) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await axiosInstance.delete(`/tweet/${tweet._id}`, { data: { userId: user._id } });
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to delete tweet:", err);
    }
  };

  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none hover:bg-gray-950 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="bg-gray-700 text-white">{displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1 mb-0.5 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-white hover:underline cursor-pointer truncate">{displayName}</span>
                {verified && (
                  <div className="shrink-0">
                    <svg className="h-4 w-4 text-blue-500 fill-blue-500" viewBox="0 0 22 22">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0 text-gray-500 text-[13px] sm:text-sm">
                <span className="shrink-0">
                  {tweet.timestamp && new Date(tweet.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              {/* More menu */}
              <div className="ml-auto relative">
                <Button
                  variant="ghost" size="sm"
                  className="p-1 rounded-full hover:bg-gray-900"
                  onClick={(e) => { e.stopPropagation(); setShowMore(!showMore); }}
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-500" />
                </Button>
                {showMore && (
                  <div className="absolute right-0 top-8 bg-[#16181c] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[180px] overflow-hidden">
                    <button
                      onClick={handleBookmark}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      {bookmarked
                        ? <><BookmarkCheck className="h-4 w-4 text-[#1d9bf0]" /> Remove bookmark</>
                        : <><Bookmark className="h-4 w-4" /> Bookmark</>
                      }
                    </button>
                    <button
                      onClick={(e) => { handleShare(e); setShowMore(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <Link2 className="h-4 w-4" /> Copy link
                    </button>
                    {user?._id === tweetAuthor?._id && (
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" /> Delete post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="text-white mb-3 leading-relaxed">
              <TranslatedText text={tweet.content || ""} />
            </div>

            {/* Image */}
            {tweet.image && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                <img src={tweet.image} alt="tweet" className="w-full h-auto max-h-96 object-cover" />
              </div>
            )}

            {/* Audio */}
            {tweet.audio && (
              <div className="mb-3 rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 p-2">
                <audio controls src={tweet.audio} className="w-full h-10 outline-none" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-1 flex items-center justify-between max-w-md">
              {/* Comment */}
              <Button
                variant="ghost" size="sm"
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-[#1d9bf0] group"
                onClick={toggleComments}
                title="Reply"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{formatNumber(commentCount)}</span>
              </Button>

              {/* Retweet
              <Button
                variant="ghost" size="sm"
                className={`flex items-center space-x-2 p-2 rounded-full hover:bg-emerald-900/20 group ${
                  retweeted ? "text-emerald-500" : "text-gray-500 hover:text-emerald-400"
                }`}
                onClick={handleRetweet}
                title={retweeted ? "Undo repost" : "Repost"}
              >
                <Repeat2 className={`h-5 w-5 ${retweeted ? "text-emerald-500" : ""}`} />
                <span className="text-sm">{formatNumber(retweets)}</span>
              </Button> */}

              {/* Like */}
              <Button
                variant="ghost" size="sm"
                className={`flex items-center space-x-2 p-2 rounded-full hover:bg-red-900/20 group ${
                  liked ? "text-red-500" : "text-gray-500 hover:text-red-400"
                }`}
                onClick={handleLike}
                title={liked ? "Unlike" : "Like"}
              >
                <Heart className={`h-5 w-5 ${liked ? "text-red-500 fill-red-500" : ""}`} />
                <span className="text-sm">{formatNumber(likes)}</span>
              </Button>

              {/* Bookmark */}
              <Button
                variant="ghost" size="sm"
                className={`flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 group ${
                  bookmarked ? "text-[#1d9bf0]" : "text-gray-500 hover:text-[#1d9bf0]"
                }`}
                onClick={handleBookmark}
                title={bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {bookmarked
                  ? <BookmarkCheck className="h-5 w-5" />
                  : <Bookmark className="h-5 w-5" />
                }
              </Button>

              {/* Copy Tweet */}
              <Button
                variant="ghost" size="sm"
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-[#1d9bf0]"
                onClick={handleShare}
                title="Copy tweet text"
              >
                {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>

            {/* Comment Section */}
            {showComments && (
              <div className="mt-3 border-t border-gray-800 pt-3">
                {/* Comment Input */}
                {user && (
                  <div className="flex gap-3 mb-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white text-xs">{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Post your reply"
                        className="bg-transparent border-none text-white placeholder-gray-500 resize-none min-h-10 focus-visible:ring-0 p-0 text-sm"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); }
                        }}
                      />
                      <Button
                        size="icon"
                        disabled={!newComment.trim()}
                        onClick={postComment}
                        className="rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 h-8 w-8 shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                {commentsLoading ? (
                  <div className="py-4 text-center text-gray-500 text-sm">Loading replies…</div>
                ) : comments.length === 0 ? (
                  <div className="py-4 text-center text-gray-500 text-sm">No replies yet. Be the first!</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c: any) => (
                      <CommentItem key={c._id} c={c} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Global click outside handler for more menu */}
      {showMore && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
      )}
    </Card>
  );
};

export default TweetCard;
