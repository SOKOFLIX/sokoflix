// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmLfor474iCeiGKtkB6_5bRUgBxqjLRmQ",
  authDomain: "sokoflix1.firebaseapp.com",
  projectId: "sokoflix1",
  storageBucket: "sokoflix1.firebasestorage.app",
  messagingSenderId: "23935742126",
  appId: "1:23935742126:web:e7c1dc9c2a031da292bd3f",
  measurementId: "G-9XDVWJXYVT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);