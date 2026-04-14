importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// These values are from your firebase-applet-config.json
firebase.initializeApp({
  apiKey: "AIzaSyCe5s1Om0Ai0zLA07_CeNkBeBJdHGYCJmo",
  authDomain: "gen-lang-client-0506345259.firebaseapp.com",
  projectId: "gen-lang-client-0506345259",
  storageBucket: "gen-lang-client-0506345259.firebasestorage.app",
  messagingSenderId: "1008017557525",
  appId: "1:1008017557525:web:8bcdf37a847162cbf9a61c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Firebase automatically displays the notification if the payload contains a 'notification' object.
  // We only log it here for debugging.
});
