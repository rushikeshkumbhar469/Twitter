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
  MoreHorizontal, Settings2, LogOut, CreditCard,
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
    <div className="flex flex-col h-screen w-64 border-r border-gray-800 bg-black sticky top-0">
      {/* Logo */}
      <div className="p-4">
        <TwitterLogo size="lg" classname="text-white" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <li key={item.name}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-xl py-6 px-4 rounded-full hover:bg-gray-900 ${
                    isActive ? "font-bold" : "font-normal"
                  } text-white hover:text-white`}
                  onClick={() => onNavigate(item.page)}
                >
                  <item.icon className="mr-4 h-7 w-7 shrink-0" />
                  {item.name}
                  {/* Badge */}
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Post Button */}
        <div className="mt-4 px-2">
          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg"
            onClick={onPostClick}
          >
            {t("post")}
          </Button>
        </div>
      </nav>

      {/* User Account Dropdown */}
      {user && (
        <div className="p-2 border-t border-gray-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-full px-3 py-6 hover:bg-gray-900 text-white"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {user.displayName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm truncate">{user.displayName}</div>
                  <div className="text-gray-500 text-sm truncate">@{user.username}</div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-gray-400 shrink-0" />
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