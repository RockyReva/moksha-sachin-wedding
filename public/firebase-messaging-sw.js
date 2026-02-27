// Firebase Messaging Service Worker
// This runs in the background and handles push notifications when the app is closed

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// Replace with your Firebase config (same values as in src/firebase.js)
firebase.initializeApp({
  apiKey: "AIzaSyARTZ1rAq0g0dW11ew9eLI1q8rCKALhyPs",
  authDomain: "moksha-sachin-wedding.firebaseapp.com",
  projectId: "moksha-sachin-wedding",
  storageBucket: "moksha-sachin-wedding.firebasestorage.app",
  messagingSenderId: "830433030837",
  appId: "1:830433030837:web:af0df19896c3c5c3fd84fc",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const notificationTitle = payload.notification?.title || "Wedding Update 💍";
  const notificationOptions = {
    body:
      payload.notification?.body ||
      "You have a new update from Moksha & Sachin's wedding!",
    icon: "/wedding-icon.png",
    badge: "/wedding-icon.png",
    tag: "wedding-notification",
    data: payload.data,
    actions: [{ action: "open", title: "Open App" }],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});
