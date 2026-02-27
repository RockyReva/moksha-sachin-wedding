// =============================================================
// FIREBASE CONFIGURATION
// =============================================================
// Follow SETUP_GUIDE.md to get these values from your Firebase Console.
// Replace ALL placeholder values below with your actual Firebase config.
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
  apiKey: "AIzaSyARTZ1rAq0g0dW11ew9eLI1q8rCKALhyPs",
  authDomain: "moksha-sachin-wedding.firebaseapp.com",
  projectId: "moksha-sachin-wedding",
  storageBucket: "moksha-sachin-wedding.firebasestorage.app",
  messagingSenderId: "830433030837",
  appId: "1:830433030837:web:af0df19896c3c5c3fd84fc",
};

// VAPID key for push notifications (get from Firebase Console → Cloud Messaging)
export const VAPID_KEY =
  "BNtgvFlIsDHmW9q3t3fAkm1y9b8GGVUT_mJFezlUpSGSJQ_2W_3dy6OUycZ2nbT2wy-KFSA3tT5FvWUjy2SCOgE";

// Google Sheets Web App URL — must be the FULL URL from Deploy → Web app (starts with https://, ends with /exec)
export const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbwD51O3ZpvR6c2qHBj-bNIbEQAZjWYOMaKy5nntdNlHuN2TyOKFR-btSNE1iPmpQ5nx/exec";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Messaging (only works in browser, not SSR)
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.log("Firebase Messaging not supported in this environment");
}
export { messaging };

// --- RSVP: Save to Google Sheets ---
export async function submitRSVPToSheets(formData) {
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
      await addDoc(collection(db, "notification_tokens"), {
        token,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });
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
