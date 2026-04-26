"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Check, X, Crown, Zap, Star, Gift, Clock,
  AlertCircle, Loader2, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import axiosInstance from "@/lib/axiosinstance";

import { TranslatedText } from "@/components/ui/translated-text";

// Inline helper: translates a fixed string to the current language
function T({ children }: { children: string }) {
  const { translated } = useAutoTranslate(children);
  return <>{translated}</>;
}

declare global { interface Window { Razorpay: any; } }

const PLAN_UI = {
  free:   { icon: Gift,  gradient: "from-gray-800 to-gray-900",    border: "border-gray-700", accent: "text-gray-300",   btn: "bg-gray-700 hover:bg-gray-600 text-white" },
  bronze: { icon: Zap,   gradient: "from-amber-950 to-yellow-950", border: "border-amber-600", accent: "text-amber-400",  btn: "bg-amber-600 hover:bg-amber-500 text-white" },
  silver: { icon: Star,  gradient: "from-slate-800 to-slate-900",  border: "border-slate-400", accent: "text-slate-300",  btn: "bg-slate-500 hover:bg-slate-400 text-white" },
  gold:   { icon: Crown, gradient: "from-yellow-800 to-amber-950", border: "border-yellow-500",accent: "text-yellow-400", btn: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold" },
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── Subscription Modal ────────────────────────────────────────────────────────
function SubscriptionModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isOutsideWindow, setIsOutsideWindow] = useState(false);

  const checkTime = useCallback(() => {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    setIsOutsideWindow(ist.getUTCHours() < 10 || ist.getUTCHours() >= 11);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get(`/subscription-status?email=${user.email}`);
      setStatus(res.data);
    } catch (_) {}
  }, [user?.email]);

  useEffect(() => {
    fetchStatus(); checkTime();
    const t = setInterval(checkTime, 30000);
    return () => clearInterval(t);
  }, [fetchStatus, checkTime]);

  const handleSubscribe = async (planKey: string) => {
    if (!user?.email) return;
    if (planKey === "free") { setMessage({ type: "info", text: "You are already on the Free plan." }); return; }
    if (isOutsideWindow) { setMessage({ type: "error", text: "Payments only allowed 10:00–11:00 AM IST." }); return; }

    setLoadingPlan(planKey); setMessage(null);
    try {
      const { data } = await axiosInstance.post("/create-order", { email: user.email, plan: planKey });
      const loaded = await loadRazorpayScript();
      if (!loaded) { setMessage({ type: "error", text: "Failed to load Razorpay. Try again." }); return; }

      const rzp = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: "Twitter Clone", description: `${data.planLabel} Subscription`,
        order_id: data.orderId, theme: { color: "#1d9bf0" },
        prefill: { email: user.email },
        handler: async (response: any) => {
          try {
            await axiosInstance.post("/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email: user.email, plan: planKey,
            });
            setMessage({ type: "success", text: `🎉 Subscribed to ${data.planLabel}! Invoice sent to your email.` });
            fetchStatus();
          } catch (e: any) {
            setMessage({ type: "error", text: e.response?.data?.error || "Verification failed." });
          }
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
      });
      rzp.on("payment.failed", (r: any) => {
        setMessage({ type: "error", text: `Payment failed: ${r.error.description}` });
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (e: any) {
      setMessage({ type: "error", text: e.response?.data?.error || "Failed to initiate payment." });
    } finally { setLoadingPlan(null); }
  };

  const plans = status?.plans || [
    { key: "free",   label: "Free",   priceINR: 0, tweetLimit: "1" },
    { key: "bronze", label: "Bronze", priceINR: 1, tweetLimit: "3" },
    { key: "silver", label: "Silver", priceINR: 2, tweetLimit: "5" },
    { key: "gold",   label: "Gold",   priceINR: 3, tweetLimit: "Unlimited" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
          <div>
            <TranslatedText text="Choose a Plan" as="h2" className="text-xl font-bold text-white" />
            <TranslatedText text="Unlock more tweets with a subscription" as="p" className="text-sm text-gray-400 mt-0.5" />
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {status && (
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm">
              <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="text-gray-300 flex items-center gap-1 flex-wrap">
                <TranslatedText text="Current:" />
                <TranslatedText text={status.plan} className="font-bold text-white capitalize" />
                <span className="mx-1">·</span>
                <span>{status.tweetsUsed} / {status.tweetLimit}</span>
                <TranslatedText text="tweets used" />
              </div>
            </div>
          )}
          {isOutsideWindow && (
            <div className="flex items-start gap-2 bg-yellow-950 border border-yellow-800 rounded-xl px-3 py-2">
              <Clock className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-xs">
                <TranslatedText text="Payments available" /> <strong>10:00–11:00 AM IST</strong> <TranslatedText text="only." />
              </p>
            </div>
          )}
          {message && (
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2 border text-sm ${
              message.type === "success" ? "bg-green-950 border-green-800 text-green-300" :
              message.type === "error"   ? "bg-red-950 border-red-800 text-red-300" :
              "bg-blue-950 border-blue-800 text-blue-300"
            }`}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <TranslatedText text={message.text} as="p" />
            </div>
          )}
          {plans.map((plan: any) => {
            const ui = PLAN_UI[plan.key as keyof typeof PLAN_UI] || PLAN_UI.free;
            const IconComp = ui.icon;
            const isCurrent = status?.plan === plan.key;
            const isLoading = loadingPlan === plan.key;
            return (
              <div key={plan.key} className={`bg-gradient-to-br ${ui.gradient} ${ui.border} border rounded-xl p-4 transition-transform hover:scale-[1.01]`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-black/30">
                      <IconComp className={`h-5 w-5 ${ui.accent}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <TranslatedText text={plan.label} className="font-bold text-white" />
                        {isCurrent && <span className="text-xs bg-white/10 text-white px-1.5 py-0.5 rounded-full"><TranslatedText text="Current" /></span>}
                      </div>
                      <div className={`text-xs ${ui.accent} flex items-center gap-1`}>
                        {plan.priceINR === 0 ? <TranslatedText text="Free" /> : <span>₹{plan.priceINR}/<TranslatedText text="month" /></span>}
                        <span>·</span>
                        {plan.tweetLimit === "Unlimited" ? <TranslatedText text="Unlimited tweets" /> : <span>{plan.tweetLimit} <TranslatedText text="tweets/mo" /></span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className={`rounded-full text-xs px-4 ${ui.btn} ${isCurrent ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => !isCurrent && handleSubscribe(plan.key)}
                    disabled={isCurrent || isLoading || (isOutsideWindow && plan.key !== "free")}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isCurrent ? <TranslatedText text="Active ✓" /> : plan.key === "free" ? <TranslatedText text="Free" /> : <TranslatedText text="Subscribe" />}
                  </Button>
                </div>
              </div>
            );
          })}
          <TranslatedText text="Secure payments via Razorpay · Invoice sent by email" as="p" className="text-center text-gray-600 text-xs pt-1" />
        </div>
      </div>
    </div>
  );
}


// ─── Right Sidebar ─────────────────────────────────────────────────────────────
const RightSidebar = ({ onNavigate }: { onNavigate?: (page: string) => void }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const suggestedUsers = [
    { name: "Narendra Modi",      username: "narendramodi",    fallback: "N", _id: "preset1" },
    { name: "Akshay Kumar",       username: "akshaykumar",     fallback: "A", _id: "preset2" },
    { name: "President of India", username: "rashtrapatibhvn", fallback: "P", _id: "preset3" },
  ];

  const handleFollow = async (targetId: string) => {
    if (!user?._id || targetId.startsWith("preset")) {
      // For preset names just toggle UI
      setFollowingMap((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
      return;
    }
    try {
      const res = await axiosInstance.post(`/user/${targetId}/follow`, { currentUserId: user._id });
      setFollowingMap((prev) => ({ ...prev, [targetId]: res.data.isFollowing }));
    } catch (e) { console.error(e); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onNavigate) {
      onNavigate("explore");
    }
  };

  return (
    <>
      {showModal && <SubscriptionModal onClose={() => setShowModal(false)} />}

      <div className="w-80 h-screen overflow-y-auto border-l border-gray-800 bg-black text-white px-4 py-4 space-y-4 sticky top-0">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              type="text"
              placeholder={t("search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 rounded-full h-12 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            />
          </div>
        </form>

        {/* Subscribe to Premium */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              {t("subscribe")} <T>to Premium</T>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-gray-400 text-sm">
              <T>Subscribe to unlock more tweets and premium features.</T>
            </CardDescription>
            <Button
              className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full h-11 flex items-center justify-center shadow-sm transition-all active:scale-95"
              onClick={() => setShowModal(true)}
            >
              {t("subscribe")}
            </Button>
          </CardContent>
        </Card>

        {/* You might like */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white"><T>You might like</T></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gray-700 text-white">{u.fallback}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-white truncate">{u.name}</span>
                      <Check className="h-4 w-4 text-blue-500 fill-blue-500 shrink-0" />
                    </div>
                    <p className="text-gray-500 text-sm truncate">@{u.username}</p>
                  </div>
                </div>
                <Button
                  variant={followingMap[u._id] ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleFollow(u._id)}
                  className={`ml-2 rounded-full shrink-0 font-bold text-sm ${
                    followingMap[u._id]
                      ? "border-gray-600 text-white bg-transparent hover:bg-red-900/20 hover:text-red-400 hover:border-red-500"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {followingMap[u._id] ? <T>Unfollow</T> : <T>Follow</T>}
                </Button>
              </div>
            ))}
            <button
              className="text-blue-500 hover:text-blue-400 text-sm font-medium w-full text-left pt-1"
              onClick={() => onNavigate?.("explore")}
            >
              <T>Show more</T>
            </button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="px-2 py-4 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
            <a href="#" className="hover:underline"><T>Terms of Service</T></a>
            <a href="#" className="hover:underline"><T>Privacy Policy</T></a>
            <a href="#" className="hover:underline"><T>Cookie Policy</T></a>
            <a href="#" className="hover:underline"><T>Accessibility</T></a>
            <a href="#" className="hover:underline"><T>Ads info</T></a>
          </div>
          <p className="text-xs text-gray-500">© 2024 X Corp.</p>
        </div>
      </div>
    </>
  );
};

export default RightSidebar;
