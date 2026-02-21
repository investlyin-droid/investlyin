// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

/**
 * Firebase client config from environment only.
 * No hardcoded secrets or fallbacks – set all NEXT_PUBLIC_FIREBASE_* in .env.local (dev) or deployment (prod).
 * See .env.example for required keys.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

/** True if required Firebase config is missing (auth will fail until env is set). */
export function isFirebaseConfigMissing(): boolean {
  return !(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

// Single instance; avoid duplicate app on HMR. Empty config is allowed – auth calls will fail until env is set.
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : (getApps()[0] as FirebaseApp);
const auth = getAuth(app);

// Only enable Google Analytics when explicitly opted in or in production (skip on localhost to avoid dev traffic).
const analyticsEnabled =
  typeof window !== "undefined" &&
  firebaseConfig.measurementId &&
  (process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED === "true" ||
    (process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED !== "false" &&
      !/^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname)));

let analytics: Analytics | null = null;
if (analyticsEnabled) {
  try {
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
}

export { app, auth, analytics };
