"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import TwitterLogo from "./twitterlogo";
import LoadingSpinner from "./loading-spinner";
import { X, User, Lock, EyeOff, Eye } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { useAuth } from "@/context/authcontext";

interface AuthModelProps {
  isopen: boolean;
  onclose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModel({
  isopen,
  onclose,
  initialMode = "login",
}: AuthModelProps) {
  const { login, signup, isLoading } = useAuth();
  const [Mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showpassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayname: "",
  });

  const [error, setError] = useState<Record<string, string>>({});

  if (!isopen) return null;

  const validateForm = () => {
    const newError: Record<string, string> = {};

    if (!formData.email.trim()) {
      newError.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newError.email = "Please enter a valid email";
    }

    if (!formData.password.trim()) {
      newError.password = "Password is required";
    } else if (formData.password.length < 6) {
      newError.password = "Password must be atleast 6 characters";
    }

    if (Mode === "signup") {
      if (!formData.username.trim()) {
        newError.username = "Username is required";
      } else if (formData.username.length < 3) {
        newError.username = "Username must be atleast 3 characters";
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newError.username = "Username can only contain letters, numbers and underscores";
      }

      if (!formData.displayname.trim()) {
        newError.displayname = "Display name is required";
      }
    }

    setError(newError);
    return Object.keys(newError).length === 0;
  };
  const handelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;
    try {
      if (Mode === "login") {
        await login(formData.email, formData.password);
      } else {
        await signup(
          formData.email,
          formData.password,
          formData.username,
          formData.displayname
        );
      }
      onclose();
      setError({});
      setFormData({
        email: "",
        password: "",
        username: "",
        displayname: "",
      });
    } catch (error) {
      setError({ general: "Authentication failed. Please try again" });
    }
  };
  const handleInputchange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error[field]) {
      setError((prev: any) => ({ ...prev, [field]: "" }));
    }
  };
  const switchMode = () => {
    setMode(Mode === "login" ? "signup" : "login");
    setError({});
    setFormData({
      email: "",
      password: "",
      username: "",
      displayname: "",
    });
  };
  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-md bg-black border-gray-800 text-white">
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onclose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" classname="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {Mode === "login" ? "Sign in to X" : "Create your account"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {error.general}
            </div>
          )}
          <form onSubmit={handelSubmit} className="space-y-4">
            {Mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                      handleInputchange("email", e.target.value)
                    }
                    className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                  {error.email && (
                    <p className="text-red-400 text-sm">{error.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your Display Name"
                      value={formData.displayname}
                      onChange={(e) =>
                        handleInputchange("displayname", e.target.value)
                      }
                      className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                  {error.displayname && (
                    <p className="text-red-400 text-sm">{error.displayname}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">
                    Username
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      @
                    </span>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) =>
                        handleInputchange("username", e.target.value)
                      }
                      className="pl-8 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                  {error.username && (
                    <p className="text-red-400 text-sm">{error.username}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password"
                      type={showpassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputchange("password", e.target.value)
                      }
                      className="pl-10 pr-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showpassword)}
                    >
                      {showpassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {error.password && (
                    <p className="text-red-400 text-sm">{error.password}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </>
            )}
            {Mode === "login" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                      handleInputchange("email", e.target.value)
                    }
                    className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                  {error.email && (
                    <p className="text-red-400 text-sm">{error.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password-login"
                      type={showpassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputchange("password", e.target.value)
                      }
                      className="pl-10 pr-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showpassword)}
                    >
                      {showpassword ? (
                        <EyeOff className="h-4 w-4  " />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {error.password && (
                    <p className="text-red-400 text-sm">{error.password}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </>
            )}
          </form>
          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              OR
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              {Mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {Mode === "login" ? "Sign up" : "Sign in"}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

