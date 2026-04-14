import React, { useEffect, useState } from 'react';
import { Bell, X, Check, XCircle, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { sendPushNotification } from '../../services/notificationService';
import { format } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  type: 'ride_join_request' | 'ride_accepted' | 'ride_rejected' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: any;
}

export const NotificationsPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (notif: Notification) => {
    if (!notif.data?.rideId || !notif.data?.requesterId) return;

    try {
      const rideRef = doc(db, 'rides', notif.data.rideId);
      const rideSnap = await getDoc(rideRef);
      
      if (!rideSnap.exists()) {
        alert('Ride no longer exists');
        return;
      }

      const rideData = rideSnap.data();
      if (rideData.availableSeats <= 0) {
        alert('No seats available');
        return;
      }

      // 1. Update ride document
      await updateDoc(rideRef, {
        joinedRiders: arrayUnion(notif.data.requesterId),
        availableSeats: rideData.availableSeats - 1
      });

      // 2. Update notification status
      await updateDoc(doc(db, 'notifications', notif.id), {
        'data.status': 'accepted',
        read: true
      });

      // 3. Notify requester
      await addDoc(collection(db, 'notifications'), {
        userId: notif.data.requesterId,
        type: 'ride_accepted',
        title: 'Ride Request Accepted',
        message: `${user?.displayName || 'The sharer'} has accepted your request to join the ride. You can now see each other's usernames.`,
        data: {
          rideId: notif.data.rideId,
          sharerId: user?.uid,
          sharerName: user?.displayName || 'Sharer'
        },
        read: false,
        createdAt: serverTimestamp()
      });

      await sendPushNotification(
        notif.data.requesterId,
        'Ride Request Accepted',
        'Your request to join a shared ride has been accepted!',
        { rideId: notif.data.rideId, type: 'ride_accepted' }
      );

      alert('Request accepted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rides');
    }
  };

  const handleReject = async (notif: Notification) => {
    try {
      // 1. Update notification status
      await updateDoc(doc(db, 'notifications', notif.id), {
        'data.status': 'rejected',
        read: true
      });

      // 2. Notify requester
      await addDoc(collection(db, 'notifications'), {
        userId: notif.data.requesterId,
        type: 'ride_rejected',
        title: 'Ride Request Rejected',
        message: `Your request to join the ride has been rejected.`,
        data: {
          rideId: notif.data.rideId
        },
        read: false,
        createdAt: serverTimestamp()
      });

      await sendPushNotification(
        notif.data.requesterId,
        'Ride Request Rejected',
        'Your request to join a shared ride was rejected.',
        { rideId: notif.data.rideId, type: 'ride_rejected' }
      );

      alert('Request rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                  <Bell size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Notifications</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Bell size={32} className="text-zinc-800" />
                  </div>
                  <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <motion.div 
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border ${notif.read ? 'bg-zinc-900/30 border-white/5' : 'bg-zinc-900 border-emerald-500/20'} transition-colors`}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'ride_join_request' ? 'bg-blue-500/10 text-blue-500' :
                        notif.type === 'ride_accepted' ? 'bg-emerald-500/10 text-emerald-500' :
                        notif.type === 'ride_rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {notif.type === 'ride_join_request' ? <User size={18} /> : <Bell size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-white truncate">{notif.title}</h4>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase whitespace-nowrap ml-2">
                            {notif.createdAt ? format(notif.createdAt.toDate(), 'HH:mm') : 'Just now'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{notif.message}</p>

                        {notif.type === 'ride_join_request' && notif.data?.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                              className="flex-1 py-2 bg-emerald-500 text-black text-[10px] font-black rounded-lg hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1"
                            >
                              <Check size={12} />
                              ACCEPT
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReject(notif); }}
                              className="flex-1 py-2 bg-zinc-800 text-white text-[10px] font-black rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <X size={12} />
                              REJECT
                            </button>
                          </div>
                        )}

                        {notif.data?.status === 'accepted' && (
                          <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                            <Check size={12} />
                            Accepted
                          </div>
                        )}

                        {notif.data?.status === 'rejected' && (
                          <div className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase tracking-widest">
                            <XCircle size={12} />
                            Rejected
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
