import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkME-tf57YlideGfQ30gaGD3FTWbyK9rg",
  authDomain: "twittterr-6789a.firebaseapp.com",
  projectId: "twittterr-6789a",
  storageBucket: "twittterr-6789a.firebasestorage.app",
  messagingSenderId: "109926979644",
  appId: "1:109926979644:web:757ac4d0d85b3ec9ca8b39"
};

const app = initializeApp(firebaseConfig);
export const auth=getAuth(app);
export default app;