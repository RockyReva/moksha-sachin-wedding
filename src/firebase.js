// =============================================================
// FIREBASE CONFIGURATION — Uses environment variables
// =============================================================
// Set values in .env (copy from .env.example). Never commit .env to Git.
// For Vercel: add env vars in Project Settings → Environment Variables
// =============================================================

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
export const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;

// Initialize Firebase (only if config is present)
let app = null;
let db = null;
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}
export { db };

// Messaging (only works in browser, not SSR)
let messaging = null;
if (app) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.log("Firebase Messaging not supported in this environment");
  }
}
export { messaging };

// --- RSVP: Save to Google Sheets ---
export async function submitRSVPToSheets(formData) {
  if (!GOOGLE_SHEETS_URL) return { success: false, error: "No Sheets URL configured" };
  try {
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString(),
      }),
    });
    return { success: true };
  } catch (error) {
    console.error("Google Sheets submission error:", error);
    return { success: false, error };
  }
}

// --- RSVP: Also save to Firebase (backup + for linking notifications) ---
export async function submitRSVPToFirebase(formData) {
  if (!db) return { success: false, error: "Firebase not configured" };
  try {
    const docRef = await addDoc(collection(db, "rsvps"), {
      ...formData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Firebase submission error:", error);
    return { success: false, error };
  }
}

// --- Push Notifications: Request permission & get token ---
export async function requestNotificationPermission() {
  if (!messaging) return { success: false, reason: "Messaging not supported" };
  if (!VAPID_KEY) return { success: false, reason: "VAPID key not configured" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: "Permission denied" };
    }

    // Register service worker and wait for it to be active
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token (copy for Firebase test message):", token);
      // Save token to Firestore for sending notifications later
      if (db) {
        await addDoc(collection(db, "notification_tokens"), {
        token,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });
      }
      return { success: true, token };
    }
    return { success: false, reason: "No token received" };
  } catch (error) {
    console.error("Notification permission error:", error);
    return { success: false, error };
  }
}

// --- Get FCM token when permission is already granted (for copying / testing) ---
export async function getFCMTokenIfGranted() {
  if (!messaging || Notification.permission !== "granted") return null;
  if (!VAPID_KEY) return null;
  try {
    // Register and wait for service worker to be active before getToken
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (e) {
    console.error("Get token error:", e);
    return null;
  }
}

// --- Listen for foreground messages ---
export function onForegroundMessage(callback) {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    callback(payload);
  });
}
