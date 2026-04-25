"use client";
import React from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Settings, HelpCircle, Keyboard, Globe, Moon, AtSign,
  LogOut, ExternalLink, BarChart2, ThumbsUp, Verified, CheckCircle2, AlertCircle
} from "lucide-react";
import { TranslatedText } from "@/components/ui/translated-text";

export default function MorePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user, logout, sendLanguageSwitchOtp, verifyLanguageSwitchOtp, switchLanguageDirectly } = useAuth();
  const { language, t } = useTranslation();
  const [toast, setToast] = React.useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showLanguagePanel, setShowLanguagePanel] = React.useState(false);
  const [targetLanguage, setTargetLanguage] = React.useState(language || "en");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState(user?.phone || "");
  const [busy, setBusy] = React.useState(false);

  const languageOptions = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "es", label: "Spanish" },
    { code: "pt", label: "Portuguese" },
    { code: "zh", label: "Chinese" },
    { code: "fr", label: "French" },
  ];

  const notify = (type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
  };

  const openLanguagePanel = () => {
    setShowLanguagePanel(true);
    setOtpSent(false);
    setOtpCode("");
    setTargetLanguage(language || "en");
    setToast(null);
  };

  const handleSendOtp = async () => {
    if (!targetLanguage) return;
    
    if (targetLanguage === "en") {
      setBusy(true);
      const res = await switchLanguageDirectly("en");
      setBusy(false);
      if (!res.success) {
        notify("error", res.error || "Failed to switch language");
        return;
      }
      notify("success", "Language switched to English successfully");
      setShowLanguagePanel(false);
      return;
    }

    if (targetLanguage !== "fr" && !phoneNumber) {
      notify("error", "Phone number is required for mobile OTP");
      return;
    }
    setBusy(true);
    const res = await sendLanguageSwitchOtp(targetLanguage, targetLanguage !== "fr" ? phoneNumber : undefined);
    setBusy(false);
    if (!res.success) {
      notify("error", res.error || "Failed to send OTP");
      return;
    }
    setOtpSent(true);
    if (targetLanguage === "fr") {
      notify("info", "OTP sent to your email.");
    } else {
      notify("info", "OTP generated! Check your backend terminal console for the code.");
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      notify("error", "Please enter a valid 6-digit OTP");
      return;
    }
    setBusy(true);
    const res = await verifyLanguageSwitchOtp(targetLanguage, otpCode, targetLanguage !== "fr" ? phoneNumber : undefined);
    setBusy(false);
    if (!res.success) {
      notify("error", res.error || "OTP verification failed");
      return;
    }
    notify("success", "Language switched successfully");
    setShowLanguagePanel(false);
    setOtpSent(false);
    setOtpCode("");
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: Settings, label: "Settings and privacy", action: () => notify("info", "Settings panel will be added in next update.") },
        { icon: HelpCircle, label: "Help Center", action: () => window.open("https://help.twitter.com/", "_blank") },
        { icon: Keyboard, label: "Keyboard shortcuts", action: () => notify("info", "Keyboard shortcuts are not configured yet.") },
      ],
    },
    {
      title: "Management",
      items: [
        { icon: Globe, label: "Language", action: openLanguagePanel },
        { icon: Moon, label: "Display", action: () => notify("info", "Display controls will be added soon.") },
        { icon: AtSign, label: "Accessibility", action: () => notify("info", "Accessibility settings will be added soon.") },
      ],
    },
    {
      title: "Analytics",
      items: [
        { icon: BarChart2, label: "Analytics", action: () => onNavigate?.("explore") },
        { icon: ThumbsUp, label: "Monetization", action: () => onNavigate?.("subscription") },
        { icon: Verified, label: "Verified Organizations", action: () => notify("info", "Verified organizations feature is coming soon.") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10 px-4 py-3">
        <TranslatedText text="More" as="h1" className="text-xl font-bold" />
      </div>

      <div className="max-w-lg">
        {toast && (
          <div
            className={`mx-4 mt-4 rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${
              toast.type === "success"
                ? "border-green-700 bg-green-950 text-green-300"
                : toast.type === "error"
                  ? "border-red-700 bg-red-950 text-red-300"
                  : "border-blue-700 bg-blue-950 text-blue-300"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <TranslatedText text={toast.text} as="span" />
          </div>
        )}

        {/* Profile preview */}
        {user && (
          <div className="flex items-center gap-4 px-4 py-5 border-b border-gray-800">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gray-700 text-white text-lg">{user.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-lg">{user.displayName}</p>
              <p className="text-gray-500">@{user.username}</p>
            </div>
          </div>
        )}

        {/* Language switch panel */}
        {showLanguagePanel && (
          <div className="border-b border-gray-800 px-4 py-4 space-y-3">
            <div className="flex items-center gap-1 text-sm font-semibold text-white">
              <TranslatedText text="Language" /> <TranslatedText text="switch verification" />
            </div>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
              disabled={busy}
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            {targetLanguage !== "fr" && !otpSent && (
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number (e.g. +1234567890)"
                className="bg-gray-900 border-gray-700 text-white"
                disabled={busy}
              />
            )}
            {!otpSent ? (
              <Button
                onClick={handleSendOtp}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={busy || targetLanguage === language}
              >
                {busy ? (
                  targetLanguage === "en" ? <TranslatedText text="Applying..." /> : <TranslatedText text="Sending OTP..." />
                ) : targetLanguage === language ? (
                  <TranslatedText text="Already selected language" />
                ) : targetLanguage === "en" ? (
                  <TranslatedText text="Switch to English" />
                ) : (
                  <TranslatedText text="Send OTP" />
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="bg-gray-900 border-gray-700 text-white text-center tracking-widest"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    variant="outline"
                    className="border-gray-700 text-white bg-transparent hover:bg-gray-800 hover:text-white"
                    disabled={busy}
                  >
                    <TranslatedText text="Back" />
                  </Button>
                  <Button
                    onClick={handleVerifyOtp}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={busy || otpCode.length !== 6}
                  >
                    {busy ? <TranslatedText text="Verifying..." /> : <TranslatedText text="Verify & Apply" />}
                  </Button>
                </div>
              </div>
            )}
            <TranslatedText 
              text="French uses email OTP. Other languages use mobile OTP based on your saved phone number." 
              as="p" 
              className="text-xs text-gray-500" 
            />
          </div>
        )}

        {/* Menu sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="border-b border-gray-800 py-2">
            <TranslatedText 
              text={section.title} 
              as="p" 
              className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider" 
            />
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
              >
                <item.icon className="h-5 w-5 text-gray-400" />
                <TranslatedText text={item.label} className="text-white" />
                <ExternalLink className="h-4 w-4 text-gray-600 ml-auto" />
              </button>
            ))}
          </div>
        ))}

        {/* Logout */}
        <div className="px-4 py-4">
          <Button
            onClick={logout}
            variant="outline"
            className="w-full rounded-full border-red-600 text-red-500 hover:bg-red-900/20 hover:text-red-400 bg-transparent font-bold flex items-center gap-2 justify-center"
          >
            <LogOut className="h-5 w-5" />
            <TranslatedText text="Log out" /> @{user?.username}
          </Button>
        </div>

        <TranslatedText 
          text="© 2024 X Corp. · Privacy · Terms · Cookies · Accessibility · Ads info" 
          as="p" 
          className="text-center text-xs text-gray-600 py-4 px-4" 
        />
      </div>
    </div>
  );
}
