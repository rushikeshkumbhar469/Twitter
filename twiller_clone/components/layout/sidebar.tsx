"use client";

import React from "react";
import { useAuth } from "@/context/authcontext";
import TwitterLogo from "@/components/twitterlogo";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
    Home,
    Search,
    Bell,
    Mail,
    Bookmark,
    User,
    MoreHorizontal,
    Settings2,
    LogOut,
  } from "lucide-react";

const Sidebar = ({ currentPage = "home" , onNavigate}: any) =>{
    const {user, logout} = useAuth();
    const navigation = [
        { name: "Home", icon : Home, current: currentPage === "home", page: "home"},
        { name: "Explore", icon : Search, current: currentPage === "explore", page: "explore"},
        { name: "Notifications", icon : Bell, current: currentPage === "notifications", page: "notifications", badge: true,},
        { name: "Messages", icon : Mail, current: currentPage === "messages", page: "messages"},
        { name: "Bookmarks", icon : Bookmark, current: currentPage === "bookmarks", page: "bookmarks"},
        { name: "Profile", icon : User, current: currentPage === "profile", page: "profile"},
        { name: "More", icon : MoreHorizontal, current: currentPage === "more", page: "more"}
    ];
    return(
        <div className="flex flex-col h-screen w-64 border-r border-gray-800 bg-black">
            <div className="p-4">
                <TwitterLogo size="lg" classname="text-white"/>
            </div>
            <nav className="flex-1 px-1">
                <ul className="space-y-2">
                    {navigation.map((item) => (
                        <li key={item.name}>
                            <Button
                            variant="ghost"
                            className= {`w-full justify-start text-xl py-6 px-4 rounded-full hover:bg-gray-900 ${
                                item.current ? "font-bold" : "font-normal"
                            } text-white hover:text-white`}
                            onClick={() => onNavigate?.(item.page)}
                            >
                            <item.icon className="mr-4 h-7 w-7" />
                            {item.name}
                            {item.badge && (
                                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    3
                                </span>
                            )}
                            </Button>
                        </li>
                    ))}
                </ul>
                <div className="mt-8 px-2">
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full text-lg">
                        Post
                    </Button>
                </div>
            </nav>
            {user &&(
                <div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <Avatar>
                                    <AvatarImage src={user.avatar} />
                                </Avatar>
                                <div>
                                    <div>{user.displayName}</div>
                                    <div>@{user.username}</div>
                                </div>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <Settings2 className="mr-2 h-4 w-4"/> Setting
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4"/>
                                Logout @{user.username}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    )
}

export default Sidebar;