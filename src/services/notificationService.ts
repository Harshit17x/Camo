import { db, getMessagingInstance, auth } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { getApiUrl } from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
if (!VAPID_KEY) {
  console.warn('WARNING: VITE_FIREBASE_VAPID_KEY is not defined in environment variables. Push notifications will not work.');
}

export const requestNotificationPermission = async (userId: string) => {
  const messaging = await getMessagingInstance();
  
  if (!messaging || !VAPID_KEY) {
    console.error('Messaging or VAPID key missing. messaging:', !!messaging, 'VAPID_KEY:', !!VAPID_KEY);
    return;
  }

  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return;
  }

  try {
    let registration: ServiceWorkerRegistration | undefined;
    
    // Manually register service worker for better reliability on some platforms
    if ('serviceWorker' in navigator) {
      try {
        // First check if there's already a registration for this file
        const registrations = await navigator.serviceWorker.getRegistrations();
        registration = registrations.find(r => r.active && r.active.scriptURL.includes('firebase-messaging-sw.js'));
        
        if (!registration) {
          console.log('Registering new firebase-messaging-sw.js...');
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
        }
        
        // Wait for the service worker to be active
        let retryCount = 0;
        while (!registration.active && retryCount < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
        }
        
        console.log('Service Worker status:', registration.active ? 'active' : 'not active');
      } catch (swErr) {
        console.error('Service worker registration failed:', swErr);
      }
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    
    if (permission === 'granted') {
      // Check if we already have a token to avoid redundant requests
      const existingToken = localStorage.getItem('fcm_token');
      if (existingToken) {
        console.log('Using existing FCM token from storage');
        return existingToken;
      }

      console.log('Requesting new FCM token with VAPID key:', !!VAPID_KEY);
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      }).catch(err => {
        console.error('Detailed error getting FCM token:', err);
        if (err.code === 'messaging/invalid-vapid-key') {
          console.error('CRITICAL: The VAPID key provided is invalid. Please check VITE_FIREBASE_VAPID_KEY in your environment variables.');
        } else if (err.code === 'messaging/failed-service-worker-registration') {
          console.error('CRITICAL: Service worker registration failed or is not ready.');
        }
        return null;
      });
      
      if (token) {
        console.log('FCM Token:', token);
        
        // Only update Firestore if the token is different from what we have in storage
        // or if it's been more than 24 hours since the last update
        const existingToken = localStorage.getItem('fcm_token');
        const lastUpdate = localStorage.getItem('fcm_token_last_update_web');
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (existingToken === token && lastUpdate && (now - parseInt(lastUpdate)) < oneDay) {
          console.log('FCM token is already up to date in Firestore (throttled)');
          return token;
        }

        // Save to localStorage for debugging and comparison
        localStorage.setItem('fcm_token', token);
        localStorage.setItem('fcm_token_last_update_web', now.toString());
        
        // Save token to Firestore using setDoc with merge to ensure it works even if profile isn't fully created yet
        await setDoc(doc(db, 'users', userId), {
          fcmToken: token,
          lastTokenUpdate: new Date().toISOString()
        }, { merge: true });
        return token;
      }
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
};

export const onMessageListener = () =>
  new Promise(async (resolve) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });

export const sendPushNotification = async (recipientId: string, title: string, body: string, data?: any) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found to send notification');
      return { error: 'Unauthorized: No user logged in' };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(getApiUrl('/api/send-notification'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        recipientId,
        title,
        body,
        data
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Push notification API failed:', response.status, text);
      return { error: `API returned ${response.status}`, details: text };
    }
    
    const result = await response.json();
    if (result.success === false) {
      console.warn('Push notification not sent:', result.error);
    }
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { error: 'Network error', details: error };
  }
};

/**
 * Sends a HIGH-PRIORITY DATA-ONLY FCM message to a specific driver's device.
 * The message contains the ride details and triggers `OverlayService` on Android
 * to show the floating ride-request card even when the driver is using another app.
 *
 * This should be called by whoever dispatches a new ride to online drivers —
 * e.g. from the rider's side when they submit a booking, or from the admin panel.
 */
export const sendRideRequestOverlay = async (options: {
  driverUserId: string;
  rideId: string;
  pickup: string;
  dropoff: string;
  fare: number;
  rideType: string;
  distance?: string;
}): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const idToken = await user.getIdToken();

    const response = await fetch(getApiUrl('/api/send-ride-request-overlay'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        driverUserId: options.driverUserId,
        rideId: options.rideId,
        pickup: options.pickup,
        dropoff: options.dropoff,
        fare: String(Math.round(options.fare)),
        rideType: options.rideType,
        distance: options.distance ?? '',
      }),
    });

    if (!response.ok) {
      console.warn('[Overlay FCM] Failed to send data message:', response.status);
    }
  } catch (err) {
    console.error('[Overlay FCM] Network error:', err);
  }
};

