"use client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider } from "firebase/auth";
import axiosInstance from "../lib/axiosinstance";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedDate: string;
  email: string;
  followers?: string[];
  following?: string[];
  notificationsEnabled?: boolean;
  language?: string;
  phone?: string;
  cover?: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresOtp?: boolean;
}

interface LanguageOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  phoneMismatch?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (email: string, password: string, otp: string) => Promise<LoginResult>;
  getLoginHistory: (email: string) => Promise<any[]>;
  sendLanguageSwitchOtp: (targetLanguage: string, phoneOverride?: string) => Promise<LanguageOtpResult>;
  verifyLanguageSwitchOtp: (targetLanguage: string, otp: string, phoneOverride?: string) => Promise<LanguageOtpResult>;
  switchLanguageDirectly: (targetLanguage: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    language: string,
    phone: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    notificationsEnabled?: boolean;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
  setuser: React.Dispatch<React.SetStateAction<User | null>>;
}
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setuser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Prevents onAuthStateChanged from interfering while login() is in flight
  const isLoggingInRef = useRef(false);

  const upsertBackendUser = async (firebaseuser: any): Promise<User | null> => {
    const res = await axiosInstance.post("/loggedinuser", {
      email: firebaseuser.email,
    });

    if (res.data) {
      setuser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
      return res.data;
    }

    const newuser = {
      username: firebaseuser.email.split("@")[0],
      displayName: firebaseuser.displayName || firebaseuser.email.split("@")[0],
      avatar: firebaseuser.photoURL || "",
      email: firebaseuser.email,
      bio: "",
      joinedDate: new Date().toISOString(),
    };
    const registerRes = await axiosInstance.post("/register", newuser);
    if (registerRes.data) {
      setuser(registerRes.data);
      localStorage.setItem("twitter-user", JSON.stringify(registerRes.data));
      return registerRes.data;
    }
    return null;
  };

  useEffect(() => {
    // First, try to restore user from localStorage on mount
    const savedUser = localStorage.getItem("twitter-user");
    if (savedUser) {
      try {
        setuser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse saved user:", error);
      }
    }

    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      // Skip if an explicit login() call is managing state right now
      if (isLoggingInRef.current) return;
      if (firebaseuser?.email) {
        try {
          const res = await axiosInstance.post("/loggedinuser", {
            email: firebaseuser.email,
          });
          if (res.data) {
            setuser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
          setIsLoading(false);
        } catch (error) {
          console.log("Failed to fetch user from backend:", error);
          // If backend request fails, keep the user from localStorage instead of logging out
          if (!savedUser) {
            logout();
          }
          setIsLoading(false);
        }
      } else if (!firebaseuser && !savedUser) {
        // Only logout if there's no Firebase user AND no saved user
        logout();
      }
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    isLoggingInRef.current = true; // block onAuthStateChanged observer
    setIsLoading(true);
    try {
      const usercred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseuser = usercred.user;

      if (!firebaseuser.email) {
        return { success: false, error: "Invalid email or password" };
      }

      const policyRes = await axiosInstance.post("/login-access/initiate", {
        email: firebaseuser.email,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });

      if (policyRes.data?.otpRequired) {
        await signOut(auth);
        return { success: false, requiresOtp: true, error: "OTP sent to your email. Please verify to continue." };
      }

      if (policyRes.data?.allow === false) {
        await signOut(auth);
        return { success: false, error: "Access denied for this login attempt." };
      }

      const loggedInUser = await upsertBackendUser(firebaseuser);
      if (!loggedInUser) return { success: false, error: "Failed to create user in backend" };
      return { success: true };
    } catch (err: any) {
      const code = err?.code || err?.response?.status;
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-email"
      ) {
        return { success: false, error: "Invalid email or password" };
      }
      console.error("Login failed:", err);
      return { success: false, error: "Authentication failed. Please try again" };
    } finally {
      isLoggingInRef.current = false; // re-enable observer after login attempt
      setIsLoading(false);
    }
  };

  const verifyLoginOtp = async (email: string, password: string, otp: string): Promise<LoginResult> => {
    isLoggingInRef.current = true;
    setIsLoading(true);
    try {
      await axiosInstance.post("/login-access/verify-otp", { email, otp });
      const usercred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseuser = usercred.user;
      if (!firebaseuser.email) {
        return { success: false, error: "Invalid email or password" };
      }
      const loggedInUser = await upsertBackendUser(firebaseuser);
      if (!loggedInUser) return { success: false, error: "Failed to create user in backend" };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || "Invalid OTP" };
    } finally {
      isLoggingInRef.current = false;
      setIsLoading(false);
    }
  };

  const getLoginHistory = async (email: string) => {
    const res = await axiosInstance.post("/login-history", { email });
    return res.data || [];
  };

  const sendLanguageSwitchOtp = async (targetLanguage: string, phoneOverride?: string) => {
    if (!user?.email) return { success: false, error: "User not logged in" };
    const phoneMismatch = Boolean(phoneOverride && user.phone && phoneOverride !== user.phone);
    const emailOnly: boolean = targetLanguage === "fr" || !user.phone || phoneMismatch;
    try {
      const res = await axiosInstance.post<{ message?: string; phoneMismatch?: boolean }>("/send-signup-otp", {
        email: user.email,
        phone: emailOnly ? "" : phoneOverride || user.phone || "",
        language: targetLanguage,
        emailOnly,
      });
      return {
        success: true,
        message: res.data?.message || "Verification OTP sent successfully",
        phoneMismatch: emailOnly,
      } as LanguageOtpResult;
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || "Failed to send OTP" };
    }
  };

  const verifyLanguageSwitchOtp = async (targetLanguage: string, otp: string, phoneOverride?: string) => {
    if (!user?.email) return { success: false, error: "User not logged in" };
    try {
      await axiosInstance.post("/verify-signup-otp", {
        email: user.email,
        phone: phoneOverride || "",
        language: targetLanguage,
        otp,
      });
      const updateData: any = { language: targetLanguage };
      if (phoneOverride && phoneOverride !== user.phone) {
        updateData.phone = phoneOverride;
      }
      const res = await axiosInstance.patch(`/userupdate/${user.email}`, updateData);
      if (res.data) {
        const updatedUser = { ...user, ...updateData };
        setuser(updatedUser);
        localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
      }
      return { success: true, message: "Language updated successfully" };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || "Failed to verify OTP" };
    }
  };

  const switchLanguageDirectly = async (targetLanguage: string) => {
    if (!user?.email) return { success: false, error: "User not logged in" };
    try {
      const res = await axiosInstance.patch(`/userupdate/${user.email}`, { language: targetLanguage });
      if (res.data) {
        const updatedUser = { ...user, language: targetLanguage };
        setuser(updatedUser);
        localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
      }
      return { success: true, message: "Language updated successfully" };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.error || "Failed to switch language" };
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    language: string,
    phone: string
  ) => {
    setIsLoading(true);
    const usercred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = usercred.user;
    const newuser: any = {
      username,
      displayName,
      avatar: user.photoURL || "",
      email: user.email,
      language,
      phone
    };
    const res = await axiosInstance.post("/register", newuser);
    if (res.data) {
      setuser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    // const mockUser: User = {
    //     id: "1",
    //     username: username,
    //     displayName: displayName,
    //     avatar:
    //         "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
    //     bio: "Software developer passionate about building great products",
    //     joinedDate: "April 2024",
    // };
    setIsLoading(false);
  };

  const logout = async () => {
    setuser(null);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    notificationsEnabled?: boolean;
  }) => {
    if (!user) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const updateUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      profileData
    );
    if (res.data) {
      setuser(updateUser);
      localStorage.setItem("twitter-user", JSON.stringify(updateUser));
    }
    setIsLoading(false);
  };

  const googlesignin = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;

      if (firebaseuser.email) {
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseuser.email },
          });

          if (res.data) {
            setuser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          } else {
            // User not in DB yet — register them
            const newuser = {
              username: firebaseuser.email.split("@")[0],
              displayName: firebaseuser.displayName || "User",
              avatar: firebaseuser.photoURL || "",
              email: firebaseuser.email,
              bio: "",
              joinedDate: new Date().toISOString(),
            };
            const registerRes = await axiosInstance.post("/register", newuser);
            if (registerRes.data) {
              setuser(registerRes.data);
              localStorage.setItem("twitter-user", JSON.stringify(registerRes.data));
            }
          }
        } catch (backendErr: any) {
          if (backendErr?.code === "ERR_NETWORK" || backendErr?.message === "Network Error") {
            console.error("Google sign-in: Cannot connect to backend at", axiosInstance.defaults.baseURL, "— Is the backend server running on port 5000?");
          } else {
            console.error("Google sign-in backend error:", backendErr);
          }
          // Sign out of Firebase if backend fails, so user isn't stuck
          await signOut(auth);
        }
      }
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        console.error("Google sign-in failed:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        verifyLoginOtp,
        getLoginHistory,
        sendLanguageSwitchOtp,
        verifyLanguageSwitchOtp,
        switchLanguageDirectly,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
        setuser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
