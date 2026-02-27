import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyA2Mma5kfiRvG4bUwdY18XtmH_bdDcVL4U",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "nerdshouse.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "nerdshouse",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "nerdshouse.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "53902225815",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:53902225815:web:9d6b2294edb45e3b7994d2",
};

function getApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp(firebaseConfig);
}

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

/**
 * Get Firestore instance (singleton). Safe to call on client and in components.
 */
export function getDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getApp());
  }
  return firestoreInstance;
}

/**
 * Get Firebase Auth instance (for Google Sign-In on client).
 */
export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getApp());
  }
  return authInstance;
}

export { getApp };
