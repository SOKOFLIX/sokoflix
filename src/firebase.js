// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmLfor474iCeiGKtkB6_5bRUgBxqjLRmQ",
  authDomain: "sokoflix1.firebaseapp.com",
  projectId: "sokoflix1",
  storageBucket: "sokoflix1.firebasestorage.app",
  messagingSenderId: "23935742126",
  appId: "1:23935742126:web:e7c1dc9c2a031da292bd3f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);