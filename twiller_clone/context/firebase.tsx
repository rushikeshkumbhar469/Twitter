import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDkME-tf57YlideGfQ30gaGD3FTWbyK9rg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "twittterr-6789a.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "twittterr-6789a",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "twittterr-6789a.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "109926979644",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:109926979644:web:757ac4d0d85b3ec9ca8b39",
};

const app = initializeApp(firebaseConfig);
export const auth=getAuth(app);
export default app;