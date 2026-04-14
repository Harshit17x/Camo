import React, { useState, useEffect } from 'react';
import { Users, MapPin, Clock, ChevronRight, Search, ChevronLeft, ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../shared/BottomNav';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { sendPushNotification } from '../../services/notificationService';

const translations = {
  en: {
    ride_sharing: 'Ride Sharing',
    available_rides: 'Available Rides',
    join_ride: 'Join Ride',
    no_rides: 'No shared rides available right now',
    pickup: 'Pickup',
    dropoff: 'Dropoff',
    seats_left: 'seats left',
    scheduled_for: 'Scheduled for',
    joining: 'Joining...',
    joined: 'Joined Successfully!',
    already_joined: 'Already Joined',
    full: 'Full'
  },
  hi: {
    ride_sharing: 'सवारी साझा करना',
    available_rides: 'उपलब्ध सवारी',
    join_ride: 'सवारी में शामिल हों',
    no_rides: 'अभी कोई साझा सवारी उपलब्ध नहीं है',
    pickup: 'पिकअप',
    dropoff: 'ड्रॉपऑफ़',
    seats_left: 'सीटें बाकी हैं',
    scheduled_for: 'के लिए शेड्यूल किया गया',
    joining: 'शामिल हो रहे हैं...',
    joined: 'सफलतापूर्वक शामिल हुए!',
    already_joined: 'पहले से ही शामिल हैं',
    full: 'भरा हुआ'
  },
  gu: {
    ride_sharing: 'રાઇડ શેરિંગ',
    available_rides: 'ઉપલબ્ધ સવારી',
    join_ride: 'સવારીમાં જોડાઓ',
    no_rides: 'અત્યારે કોઈ શેર કરેલી સવારી ઉપલબ્ધ નથી',
    pickup: 'પિકઅપ',
    dropoff: 'ડ્રોપઓફ',
    seats_left: 'બેઠકો બાકી છે',
    scheduled_for: 'માટે શેડ્યૂલ કરેલ',
    joining: 'જોડાઈ રહ્યા છીએ...',
    joined: 'સફળતાપૂર્વક જોડાયા!',
    already_joined: 'પહેલેથી જોડાયેલા છે',
    full: 'ભરેલું'
  }
};

export default function RideSharing() {
  const { profile, user } = useAuth();
  const lang = (profile?.language as 'en' | 'hi' | 'gu') || 'en';
  const t = translations[lang];
  const navigate = useNavigate();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rides'),
      where('isShared', '==', true),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sharedRides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((ride: any) => {
        // Filter out rides where the current user is the rider
        if (ride.riderId === user?.uid) return false;
        // Filter out rides that are already full (unless user is already in it)
        if (ride.availableSeats <= 0 && !ride.joinedRiders?.includes(user?.uid)) return false;
        return true;
      });
      setRides(sharedRides);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rides');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleJoinRide = async (rideId: string) => {
    if (!user) return;
    setJoiningId(rideId);
    try {
      const ride = rides.find(r => r.id === rideId);
      
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Create a notification for the ride creator instead of joining directly
      await addDoc(collection(db, 'notifications'), {
        userId: ride.riderId,
        type: 'ride_join_request',
        title: 'New Ride Sharing Request',
        message: `${user.displayName || 'A rider'} wants to join your ride from ${ride.pickup?.address || 'Pickup'} to ${ride.dropoff?.address || 'Destination'}.`,
        data: {
          rideId: rideId,
          requesterId: user.uid,
          requesterName: user.displayName || 'Rider',
          status: 'pending'
        },
        read: false,
        createdAt: serverTimestamp()
      });

      // Notify the ride creator via push
      if (ride.riderId) {
        await sendPushNotification(
          ride.riderId,
          'New Join Request',
          `${user.displayName || 'Someone'} wants to join your shared ride.`,
          { rideId: rideId, type: 'ride_join_request' }
        ).catch(err => console.error("Error notifying creator:", err));
      }
      
      alert('Request sent to the ride sharer!');
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications`);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <>
      <div 
        className="min-h-screen bg-zinc-950 flex flex-col font-sans"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 20px))' }}
      >
      {/* ════════ HEADER ════════ */}
      <div className="px-5 pt-12 pb-6 border-b border-white/[0.03] flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white tracking-tight">{t.ride_sharing}</h1>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{t.available_rides}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em]">{t.available_rides}</h2>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Users size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{rides.length} Active</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading shared rides...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-center mb-4">
              <Users size={24} className="text-zinc-700" />
            </div>
            <p className="text-white font-bold text-sm tracking-tight mb-1">{t.no_rides}</p>
            <p className="text-zinc-600 text-xs font-medium mb-4">Check back later for newly shared rides.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <motion.div 
                key={ride.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all"
              >
                <div className="p-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ride.riderId}`} alt="Rider" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black text-sm">
                          {ride.joinedRiders?.includes(user?.uid) ? ride.riderName : 'Anonymous Sharer'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{ride.rideType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">{t.seats_left}</p>
                      <div className="flex items-center justify-end gap-1">
                        {[...Array(ride.availableSeats)].map((_, i) => (
                          <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        ))}
                        <span className="text-lg font-black ml-1">{ride.availableSeats}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-800" />
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{t.pickup}</p>
                        <p className="text-sm font-bold text-zinc-200 truncate">{ride.pickup.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{t.dropoff}</p>
                        <p className="text-sm font-bold text-zinc-200 truncate">{ride.dropoff.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {format(new Date(ride.scheduledAt), 'PPp')}
                      </span>
                    </div>
                    <p className="text-lg font-black text-white">₹{(ride.fare / 2).toFixed(0)} <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">/ person</span></p>
                  </div>

                  <button 
                    onClick={() => !ride.joinedRiders?.includes(user?.uid) && handleJoinRide(ride.id)}
                    disabled={joiningId === ride.id || ride.joinedRiders?.includes(user?.uid)}
                    className={`w-full py-4 rounded-2xl font-black text-sm premium-button shadow-[0_20px_40px_rgba(16,185,129,0.1)] flex items-center justify-center gap-2 disabled:opacity-50 ${
                      ride.joinedRiders?.includes(user?.uid) ? 'bg-zinc-800 text-emerald-500 border-emerald-500/20' : 'bg-emerald-500 text-black'
                    }`}
                  >
                    {joiningId === ride.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        {t.joining}
                      </>
                    ) : ride.joinedRiders?.includes(user?.uid) ? (
                      <>
                        <Check size={18} />
                        {t.already_joined}
                      </>
                    ) : (
                      <>
                        <Users size={18} />
                        {t.join_ride}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      </div>
      <BottomNav activeTab="share" />
    </>
  );
}
