import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCGQmgTir0aW4aXmHTdZqdUXMHWt1N7n4U",
  authDomain: "zovro-45f04.firebaseapp.com",
  projectId: "zovro-45f04",
  storageBucket: "zovro-45f04.firebasestorage.app",
  messagingSenderId: "1072186079842",
  appId: "1:1072186079842:web:a8506b738accc0633e6f3b",
  measurementId: "G-7LR88B0F5G"
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export auth so Login and Signup can use it
export const auth = getAuth(app);