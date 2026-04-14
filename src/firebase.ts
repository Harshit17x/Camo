import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Messaging initialization needs to be safe for browsers that don't support it
let messagingInstance: any = null;
let messagingPromise: Promise<any> | null = null;

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;
  
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isSupported();
        if (supported) {
          messagingInstance = getMessaging(app);
          return messagingInstance;
        }
        return null;
      } catch (err) {
        console.warn('Error initializing messaging:', err);
        return null;
      }
    })();
  }
  
  return messagingPromise;
};

export const messaging = messagingInstance; // For backward compatibility, but getMessagingInstance is preferred
export const googleProvider = new GoogleAuthProvider();

export default app;
