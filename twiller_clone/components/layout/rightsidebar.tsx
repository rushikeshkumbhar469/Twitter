"use client";

import React from "react";
import { Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const RightSidebar = () => {
  const suggestedUsers = [
    {
      name: "Narendra Modi",
      username: "narendramodi",
      avatar: "",
      verified: true,
      fallback: "N",
    },
    {
      name: "Akshay Kumar",
      username: "akshaykumar",
      avatar: "",
      verified: true,
      fallback: "A",
    },
    {
      name: "President of India",
      username: "rashtrapatibhvn",
      avatar: "",
      verified: true,
      fallback: "P",
    },
  ];

  return (
    <div className="w-80 h-screen overflow-y-auto border-l border-gray-800 bg-black text-white px-4 py-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
        <Input
          type="text"
          placeholder="Search"
          className="pl-10 bg-gray-900 border-gray-800 rounded-full h-12 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 focus-visible:border-blue-500"
        />
      </div>

      {/* Subscribe to Premium Card */}
      <Card className="bg-gray-900 border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Subscribe to Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-gray-400 text-sm">
            Subscribe to unlock new features and if eligible, receive a share of revenue.
          </CardDescription>
          <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full py-2">
            Subscribe
          </Button>
        </CardContent>
      </Card>

      {/* You might like Section */}
      <Card className="bg-gray-900 border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">You might like</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestedUsers.map((user, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  {user.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-gray-700 text-white">
                      {user.fallback || user.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-white truncate">{user.name}</span>
                    {user.verified && (
                      <Check className="h-4 w-4 text-blue-500 fill-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="ml-2 rounded-full border-gray-700 text-white hover:bg-gray-800 bg-transparent flex-shrink-0 hover:text-white"
              >
                Follow
              </Button>
            </div>
          ))}
          <button className="text-blue-500 hover:text-blue-600 text-sm font-medium w-full text-left pt-2">
            Show more
          </button>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="px-2 py-4 space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Cookie Policy
          </a>
          <a href="#" className="hover:underline">
            Accessibility
          </a>
          <a href="#" className="hover:underline">
            Ads info
          </a>
        </div>
        <p className="text-xs text-gray-500">© 2024 X Corp.</p>
      </div>
    </div>
  );
};

export default RightSidebar;

