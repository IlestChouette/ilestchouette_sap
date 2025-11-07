// apps/web/src/app/_lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// ✅ Configuration Firebase (avec tes variables d'environnement)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ✅ Empêche la réinitialisation multiple (hot reload Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exports Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Messaging (notifications)
let messaging: ReturnType<typeof getMessaging> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((ok) => {
    if (ok) messaging = getMessaging(app);
  });
}
export { messaging };

// ✅ Debug (facultatif)
console.log("Firebase API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

export default app;