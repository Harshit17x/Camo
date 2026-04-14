import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { requestNotificationPermission, onMessageListener } from '../../services/notificationService';
import { Bell, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isNative } from '../../services/nativeService';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const NotificationManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [foregroundMessage, setForegroundMessage] = useState<any>(null);
  const [incomingRideId, setIncomingRideId] = useState<string | null>(null);

  useEffect(() => {
    // Check if on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    let timer: NodeJS.Timeout;
    let unsubscribeForeground: () => void;

    if (user && profile) {
      if (isNative) {
        // Native push notification setup
        const setupNativePush = async () => {
          try {
            const platform = Capacitor.getPlatform();
            
            let perm = await PushNotifications.checkPermissions();
            if (perm.receive === 'prompt') {
              perm = await PushNotifications.requestPermissions();
            }
            
            if (perm.receive === 'granted') {
              if (platform === 'android') {
                try {
                  await PushNotifications.createChannel({
                    id: 'high_importance_channel',
                    name: 'High Importance Notifications',
                    description: 'Notifications that appear over other apps',
                    importance: 5, // 5 = HIGH
                    visibility: 1, // 1 = PUBLIC
                    vibration: true,
                    lights: true,
                    lightColor: '#10b981'
                  });
                  console.log('Created high importance notification channel');
                } catch (e) {
                  console.error('Error creating notification channel:', e);
                }
              }

              // Remove existing listeners to prevent duplicates
              await PushNotifications.removeAllListeners();

              // Add listeners BEFORE registering
              await PushNotifications.addListener('registration', async (token) => {
                console.log(`${platform} Push Registration Token:`, token.value);
                
                // Throttle updates to Firestore to save quota
                const lastToken = localStorage.getItem('fcm_token_native');
                const lastUpdate = localStorage.getItem('fcm_token_last_update');
                const now = new Date().getTime();
                const oneDay = 24 * 60 * 60 * 1000;

                if (lastToken === token.value && lastUpdate && (now - parseInt(lastUpdate)) < oneDay) {
                  console.log('Native push token is already up to date in Firestore (throttled)');
                  return;
                }

                try {
                  await setDoc(doc(db, 'users', user.uid), {
                    fcmToken: token.value,
                    lastTokenUpdate: new Date().toISOString()
                  }, { merge: true });
                  
                  localStorage.setItem('fcm_token_native', token.value);
                  localStorage.setItem('fcm_token_last_update', now.toString());
                  console.log('Native push token saved to Firestore');
                } catch (err) {
                  console.error('Error saving native push token:', err);
                }
              });
              
              await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log(`${platform} Push Received:`, notification);
                if (notification.data?.rideId) {
                  setIncomingRideId(notification.data.rideId);
                }
                setForegroundMessage({
                  notification: {
                    title: notification.title,
                    body: notification.body
                  },
                  data: notification.data
                });
              });

              await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log(`${platform} Push Action Performed:`, notification);
                if (notification.notification.data?.rideId) {
                  setIncomingRideId(notification.notification.data.rideId);
                }
              });

              // Register AFTER adding listeners
              await PushNotifications.register();
            }
          } catch (err) {
            console.error('Error setting up native push:', err);
          }
        };
        setupNativePush();
      } else {
        // Web push notification setup
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            timer = setTimeout(() => setShowBanner(true), 3000);
          } else if (Notification.permission === 'denied' && profile?.role === 'driver') {
            // Drivers MUST have notifications enabled
            setShowBanner(true);
          } else if (Notification.permission === 'granted') {
            requestNotificationPermission(user.uid);
          }
        }

        // Setup foreground listener (Web only)
        const setupListener = async () => {
          try {
            const messaging = await getMessagingInstance();
            if (messaging) {
              const { onMessage } = await import('firebase/messaging');
              unsubscribeForeground = onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
                if (payload.data?.rideId) {
                  setIncomingRideId(payload.data.rideId as string);
                }
                setForegroundMessage(payload);
                // Auto-hide after 10 seconds if it's not a ride request
                if (!payload.data?.rideId) {
                  setTimeout(() => setForegroundMessage(null), 5000);
                }
              });
            }
          } catch (err) {
            console.error('Error in foreground message listener:', err);
          }
        };
        setupListener();
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [user, profile]);

  const handleEnable = async () => {
    if (Notification.permission === 'denied') {
      alert("To enable notifications, please click the lock icon in your browser's address bar and reset the notification permission to 'Allow'.");
      return;
    }
    if (user) {
      try {
        const token = await requestNotificationPermission(user.uid);
        setShowBanner(false);
        if (!token) {
          console.warn("Failed to get FCM token. Check VAPID key.");
          if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
            alert("Push notifications require VITE_FIREBASE_VAPID_KEY to be set in your environment variables.");
          }
        }
      } catch (err) {
        console.error('Error enabling notifications:', err);
        setShowBanner(false);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-zinc-900 border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white">
                {Notification.permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
              </h4>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {Notification.permission === 'denied' 
                  ? "You've blocked notifications. Please reset permissions in your browser settings to receive ride requests."
                  : isIOS 
                    ? "On iOS, you must first 'Add to Home Screen' to receive notifications."
                    : "Stay updated on your ride status and important alerts."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleEnable}
                className="px-4 py-2 bg-emerald-500 text-black text-xs font-black rounded-xl hover:bg-emerald-400 transition-colors"
              >
                {Notification.permission === 'denied' ? 'How to Fix' : 'Enable'}
              </button>
              <button 
                onClick={() => setShowBanner(false)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {foregroundMessage && !incomingRideId && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-white border border-zinc-200 p-4 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-black">{foregroundMessage.notification?.title}</h4>
              <p className="text-xs text-zinc-500 leading-tight">{foregroundMessage.notification?.body}</p>
            </div>
            <button 
              onClick={() => setForegroundMessage(null)}
              className="p-2 text-zinc-400 hover:text-black transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}

        {incomingRideId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 animate-bounce">
                <Bell size={40} />
              </div>
              <h2 className="text-2xl font-black text-black mb-2">New Ride Request!</h2>
              <p className="text-zinc-500 mb-8">You have a new ride request waiting. Open your dashboard to accept it.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setIncomingRideId(null);
                    setForegroundMessage(null);
                    // If we had a router, we'd navigate to dashboard here
                  }}
                  className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-zinc-800 transition-colors"
                >
                  View Request
                </button>
                <button 
                  onClick={() => {
                    setIncomingRideId(null);
                    setForegroundMessage(null);
                  }}
                  className="w-full py-4 bg-zinc-100 text-zinc-500 font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
};
