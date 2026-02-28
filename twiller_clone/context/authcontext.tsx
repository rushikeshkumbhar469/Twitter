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
import { error } from "console";
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
  notificationsEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
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

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      // Skip if an explicit login() call is managing state right now
      if (isLoggingInRef.current) return;
      if (firebaseuser?.email) {
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseuser.email },
          });
          if (res.data) {
            setuser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
          setIsLoading(false);
        } catch (error) {
          console.log(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    isLoggingInRef.current = true; // block onAuthStateChanged observer
    setIsLoading(true);
    try {
      const usercred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseuser = usercred.user;

      if (!firebaseuser.email) {
        return { success: false, error: "Invalid email or password" };
      }

      const res = await axiosInstance.get("/loggedinuser", {
        params: { email: firebaseuser.email },
      });

      if (res.data) {
        setuser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      } else {
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
        } else {
          return { success: false, error: "Failed to create user in backend" };
        }
      }
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

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
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
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
        });

        if (res.data) {
          setuser(res.data);
          localStorage.setItem("twitter-user", JSON.stringify(res.data));
        } else {
          const newuser = {
            username: firebaseuser.email.split("@")[0],
            displayName: firebaseuser.displayName || "User",
            avatar: firebaseuser.photoURL || "",
            email: firebaseuser.email,
            bio: "",
            joinedDate: new Date().toISOString(),
          };

          const res = await axiosInstance.post("/register", newuser);
          if (res.data) {
            setuser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
        }
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
