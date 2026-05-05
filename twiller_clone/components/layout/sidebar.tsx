"use client";

import React from "react";
import { useAuth } from "@/context/authcontext";
import { useTranslation } from "@/context/translationcontext";
import TwitterLogo from "@/components/twitterlogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Home, Search, Bell, Mail, Bookmark, User,
  MoreHorizontal, Settings2, LogOut, CreditCard, Plus,
} from "lucide-react";

interface SidebarProps {
  currentPage?: string;
  onNavigate: (page: string) => void;
  notifCount?: number;
  msgUnread?: number;
  onPostClick?: () => void;
}

const Sidebar = ({ currentPage = "home", onNavigate, notifCount = 0, msgUnread = 0, onPostClick }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t("home"),         icon: Home,         page: "home" },
    { name: t("explore"),      icon: Search,        page: "explore" },
    { name: t("notifications"),icon: Bell,          page: "notifications", badge: notifCount },
    { name: t("messages"),     icon: Mail,          page: "messages",      badge: msgUnread },
    { name: t("bookmarks"),    icon: Bookmark,      page: "bookmarks" },
    { name: t("profile"),      icon: User,          page: "profile" },
    { name: t("subscribe"),    icon: CreditCard,    page: "subscription" },
    { name: t("more"),         icon: MoreHorizontal,page: "more" },
  ];

  return (
    <div className="hidden md:flex flex-col h-screen w-20 xl:w-64 border-r border-gray-800 bg-black sticky top-0 transition-all duration-300 overflow-x-hidden">
      {/* Logo */}
      <div className="p-4 flex justify-center xl:justify-start">
        <TwitterLogo size="lg" classname="text-white" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1 overflow-y-auto no-scrollbar">
        <ul className="space-y-1 flex flex-col items-center xl:items-start">
          {navigation.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <li key={item.page} className="w-full flex justify-center xl:justify-start">
                <Button
                  variant="ghost"
                  className={`xl:w-full justify-center xl:justify-start text-xl py-6 px-4 rounded-full hover:bg-gray-900 ${
                    isActive ? "font-bold" : "font-normal"
                  } text-white hover:text-white transition-all`}
                  onClick={() => onNavigate(item.page)}
                >
                  <item.icon className="xl:mr-4 h-7 w-7 shrink-0" />
                  <span className="hidden xl:inline">{item.name}</span>
                  {/* Badge */}
                  {item.badge != null && item.badge > 0 && (
                    <span className="xl:ml-2 bg-blue-500 text-white text-[10px] xl:text-xs font-bold rounded-full h-4 w-4 xl:h-5 xl:min-w-[20px] px-1 flex items-center justify-center absolute top-2 right-2 xl:static">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Post Button */}
        <div className="mt-4 px-4 w-full">
          <Button
            className="w-full h-10 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full text-base hidden xl:flex items-center justify-center shadow-md transition-all active:scale-95"
            onClick={onPostClick}
          >
            {t("post")}
          </Button>
          <Button
            className="w-12 h-12 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full flex items-center justify-center xl:hidden mx-auto shadow-sm transition-all active:scale-95"
            onClick={onPostClick}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </nav>

      {/* User Account Dropdown */}
      {user && (
        <div className="p-3 border-t border-gray-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group w-full justify-center xl:justify-start gap-3 rounded-full px-3 xl:px-4 py-5 hover:bg-white/10 text-white transition-all"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {user.displayName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-1 text-left min-w-0 flex-col">
                  <div className="font-bold text-sm truncate text-white group-hover:text-white">{user.displayName}</div>
                </div>
                <MoreHorizontal className="hidden xl:block h-5 w-5 text-gray-400 group-hover:text-white shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black border-gray-700 text-white w-56" side="top" align="start">
              <DropdownMenuItem
                className="hover:bg-gray-900 cursor-pointer"
                onClick={() => onNavigate("more")}
              >
                <Settings2 className="mr-2 h-4 w-4" /> {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem
                className="hover:bg-gray-900 cursor-pointer text-red-400 hover:text-red-400"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")} @{user.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default Sidebar;