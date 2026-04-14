import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { logSecurityEvent } from '../services/auditService';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  needsPhoneNumber: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
  needsPhoneNumber: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [needsPhoneNumber, setNeedsPhoneNumber] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          const desiredRole = localStorage.getItem('desiredRole');

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Bootstrap admin role if email matches
            if (firebaseUser.email === '25bcscs017@student.rru.ac.in' && data.role !== 'admin') {
              updateDoc(userDocRef, { role: 'admin' }).catch(err => {
                console.error('Failed to bootstrap admin role:', err);
              });
            }

            // Generate rideOTP if missing
            if (!data.rideOTP) {
              const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
              updateDoc(userDocRef, { rideOTP: newOTP }).catch(err => {
                console.error('Failed to generate rideOTP:', err);
              });
            }

            if (desiredRole && desiredRole !== data.role && data.role !== 'admin') {
              // If user logged in with a specific role intent, update it (unless they are admin)
              console.log(`Updating user role from ${data.role} to ${desiredRole}`);
              const updates: any = { role: desiredRole };
              if (desiredRole === 'driver') {
                updates.isActive = true;
              }
              updateDoc(userDocRef, updates).then(() => {
                localStorage.removeItem('desiredRole');
              }).catch(err => {
                console.error('Failed to update role to desiredRole:', err);
              });
              // Don't set profile yet, wait for the next snapshot with the updated role
              return;
            } else if (desiredRole === data.role) {
              // Role already matches, clean up
              localStorage.removeItem('desiredRole');
            }

            // Update needsPhoneNumber state
            setNeedsPhoneNumber(!data.phoneNumber && data.role !== 'admin');

            // Only update if data actually changed to prevent unnecessary re-renders
            setProfile(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
              return data;
            });
          } else {
            const roleToSet = desiredRole || 'rider';
            localStorage.removeItem('desiredRole');
            
            // Check if this new user should be an admin
            const finalRole = firebaseUser.email === '25bcscs017@student.rru.ac.in' ? 'admin' : roleToSet;
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: finalRole as 'rider' | 'driver' | 'admin',
              createdAt: new Date().toISOString(),
              walletBalance: 0,
              isActive: true,
              rideOTP: Math.floor(100000 + Math.random() * 900000).toString(),
            };
            setDoc(userDocRef, newProfile).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            });
            setProfile(newProfile);
            setNeedsPhoneNumber(true); // New users definitely need a phone number
          }
          setLoading(false);
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const logout = async () => {
    if (auth.currentUser) {
      await logSecurityEvent({
        action: 'User Logout',
        userEmail: auth.currentUser.email || 'Unknown',
        userId: auth.currentUser.uid,
        details: 'User initiated logout'
      });
    }
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, needsPhoneNumber, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
