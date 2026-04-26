"use client";

import React from "react";
import { Home, Search, Bell, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/context/translationcontext";

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onPostClick: () => void;
  notifCount?: number;
  msgUnread?: number;
}

const BottomNav = ({ 
  currentPage, 
  onNavigate, 
  onPostClick,
  notifCount = 0,
  msgUnread = 0 
}: BottomNavProps) => {
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, page: "home", label: t("home") },
    { icon: Search, page: "explore", label: t("explore") },
    { icon: Bell, page: "notifications", label: t("notifications"), badge: notifCount },
    { icon: Mail, page: "messages", label: t("messages"), badge: msgUnread },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800 flex items-center justify-around py-3 px-4 z-50 sm:hidden">
      {navItems.map((item) => {
        const isActive = currentPage === item.page;
        return (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className="relative p-2 rounded-full hover:bg-gray-900 transition-colors"
          >
            <item.icon 
              className={`h-[22px] w-[22px] ${isActive ? "text-white fill-white" : "text-gray-500"}`} 
            />
            {item.badge != null && item.badge > 0 && (
              <span className="absolute top-1 right-1 bg-[#1d9bf0] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
      
      {/* Post FAB on mobile is already in MainLayout, but we can put it here if we want a different style */}
    </div>
  );
};

export default BottomNav;
