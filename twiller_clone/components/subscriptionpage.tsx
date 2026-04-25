"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/authcontext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Zap, Star, Gift, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { TranslatedText } from "@/components/ui/translated-text";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_UI = {
  free: {
    icon: Gift,
    gradient: "from-gray-700 to-gray-900",
    border: "border-gray-700",
    accentColor: "text-gray-300",
    badge: "bg-gray-700 text-gray-300",
    buttonClass: "bg-gray-700 hover:bg-gray-600 text-white",
  },
  bronze: {
    icon: Zap,
    gradient: "from-amber-900 to-yellow-900",
    border: "border-amber-600",
    accentColor: "text-amber-400",
    badge: "bg-amber-900 text-amber-300",
    buttonClass: "bg-amber-600 hover:bg-amber-500 text-white",
  },
  silver: {
    icon: Star,
    gradient: "from-slate-700 to-slate-900",
    border: "border-slate-400",
    accentColor: "text-slate-300",
    badge: "bg-slate-700 text-slate-200",
    buttonClass: "bg-slate-500 hover:bg-slate-400 text-white",
  },
  gold: {
    icon: Crown,
    gradient: "from-yellow-700 to-amber-900",
    border: "border-yellow-500",
    accentColor: "text-yellow-400",
    badge: "bg-yellow-800 text-yellow-200",
    buttonClass: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold",
  },
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isOutsideWindow, setIsOutsideWindow] = useState(false);

  // Check IST payment window (10–11 AM)
  const checkTimeWindow = useCallback(() => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const h = istTime.getUTCHours();
    setIsOutsideWindow(h < 10 || h >= 11);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get(`/subscription-status?email=${user.email}`);
      setStatus(res.data);
    } catch (_) {}
  }, [user?.email]);

  useEffect(() => {
    fetchStatus();
    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, checkTimeWindow]);

  const handleSubscribe = async (planKey: string) => {
    if (!user?.email) return;
    if (isOutsideWindow) {
      setMessage({ type: "error", text: "Payments are only allowed between 10:00 AM – 11:00 AM IST." });
      return;
    }
    if (planKey === "free") {
      setMessage({ type: "info", text: "You are already on the Free plan." });
      return;
    }

    setLoadingPlan(planKey);
    setMessage(null);

    try {
      const orderRes = await axiosInstance.post("/create-order", { email: user.email, plan: planKey });
      const { orderId, amount, currency, keyId, planLabel } = orderRes.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setMessage({ type: "error", text: "Failed to load Razorpay SDK. Please try again." });
        return;
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Twitter Clone",
        description: `${planLabel} Subscription`,
        order_id: orderId,
        theme: { color: "#1d9bf0" },
        handler: async (response: any) => {
          try {
            await axiosInstance.post("/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email: user.email,
              plan: planKey,
            });
            setMessage({
              type: "success",
              text: `🎉 Successfully subscribed to ${planLabel}! An invoice has been sent to your email.`,
            });
            fetchStatus();
          } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.error || "Payment verification failed." });
          }
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
        prefill: { email: user.email },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setMessage({ type: "error", text: `Payment failed: ${resp.error.description}` });
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to initiate payment." });
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!user) return null;

  const plans: any[] = status?.plans || [
    { key: "free",   label: "Free",   priceINR: 0,    tweetLimit: "1" },
    { key: "bronze", label: "Bronze", priceINR: 1,    tweetLimit: "3" },
    { key: "silver", label: "Silver", priceINR: 2,    tweetLimit: "5" },
    { key: "gold",   label: "Gold",   priceINR: 3,    tweetLimit: "Unlimited" },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <TranslatedText text="Subscription Plans" as="h1" className="text-3xl font-bold text-white mb-1" />
        <TranslatedText text="Choose a plan that fits your tweeting style." as="p" className="text-gray-400 text-sm" />

        {/* Current plan badge */}
        {status && (
          <div className="mt-4 flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <CheckCircle className="h-4 w-4 text-blue-400" />
            <div className="text-sm text-gray-300 flex flex-wrap items-center gap-1">
              <TranslatedText text="Current plan:" />
              <TranslatedText text={status.plan} className="font-bold text-white capitalize" />
              <span className="mx-1">·</span>
              <span>{status.tweetsUsed} / {status.tweetLimit}</span>
              <TranslatedText text="tweets used this month" />
            </div>
            {status.subscriptionExpiry && (
              <span className="ml-auto text-xs text-gray-500">
                <TranslatedText text="Expires" /> {new Date(status.subscriptionExpiry).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Time window warning */}
      {isOutsideWindow && (
        <div className="mb-6 flex items-start gap-3 bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3">
          <Clock className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <TranslatedText text="Payment window closed" as="p" className="text-yellow-300 font-semibold text-sm" />
            <TranslatedText 
              text="Payments are only available between 10:00 AM – 11:00 AM IST. Come back then to upgrade!" 
              as="p" 
              className="text-yellow-500 text-xs mt-0.5" 
            />
          </div>
        </div>
      )}

      {/* Feedback message */}
      {message && (
        <div className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3 border ${
          message.type === "success" ? "bg-green-950 border-green-800 text-green-300" :
          message.type === "error"   ? "bg-red-950 border-red-800 text-red-300" :
          "bg-blue-950 border-blue-800 text-blue-300"
        }`}>
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <TranslatedText text={message.text} as="p" className="text-sm" />
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan: any) => {
          const ui = PLAN_UI[plan.key as keyof typeof PLAN_UI] || PLAN_UI.free;
          const IconComponent = ui.icon;
          const isCurrent = status?.plan === plan.key;
          const isLoading = loadingPlan === plan.key;

          return (
            <Card
              key={plan.key}
              className={`relative overflow-hidden bg-gradient-to-br ${ui.gradient} ${ui.border} border rounded-2xl transition-transform hover:scale-[1.01]`}
            >
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${ui.badge}`}>
                    <TranslatedText text="Current Plan" />
                  </span>
                </div>
              )}
              <CardContent className="pt-6 pb-5 px-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-full bg-black/30`}>
                    <IconComponent className={`h-6 w-6 ${ui.accentColor}`} />
                  </div>
                  <div>
                    <TranslatedText text={plan.label} as="h2" className="text-xl font-bold text-white" />
                    <p className={`text-sm font-medium ${ui.accentColor}`}>
                      {plan.priceINR === 0 ? <TranslatedText text="Free forever" /> : <span>₹{plan.priceINR}/<TranslatedText text="month" /></span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5 bg-black/20 rounded-lg px-3 py-2">
                  <Zap className={`h-4 w-4 ${ui.accentColor}`} />
                  <span className="text-white text-sm font-medium">
                    {plan.tweetLimit === "Unlimited" ? <TranslatedText text="Unlimited tweets" /> : <span>{plan.tweetLimit} <TranslatedText text="tweets/month" /></span>}
                  </span>
                </div>

                <Button
                  className={`w-full rounded-full font-semibold py-2 transition-all ${ui.buttonClass} ${
                    isCurrent ? "opacity-50 cursor-not-allowed" : ""
                  } ${isOutsideWindow && plan.key !== "free" ? "opacity-40" : ""}`}
                  onClick={() => !isCurrent && handleSubscribe(plan.key)}
                  disabled={isCurrent || isLoading || (isOutsideWindow && plan.key !== "free")}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> <TranslatedText text="Processing..." />
                    </span>
                  ) : isCurrent ? (
                    <TranslatedText text="Active Plan ✓" />
                  ) : plan.key === "free" ? (
                    <TranslatedText text="Downgrade to Free" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <TranslatedText text="Subscribe to" />
                      <TranslatedText text={plan.label} />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer note */}
      <TranslatedText 
        text="Payments are processed securely via Razorpay. You'll receive an invoice by email after purchase." 
        as="p" 
        className="text-center text-gray-600 text-xs mt-8" 
      />
    </div>
  );
}
