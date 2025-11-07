/* public/firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "<TA_CLE_ICI>",
  authDomain: "<TON_AUTH_DOMAIN>",
  projectId: "<TON_PROJECT_ID>",
  messagingSenderId: "<TON_SENDER_ID>",
  appId: "<TON_APP_ID>",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});