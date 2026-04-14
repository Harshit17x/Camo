import React, { useEffect, useState } from 'react';
import { ChevronLeft, Clock, MapPin, Calendar, CreditCard, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, getDocFromServer, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import BottomNav from '../components/shared/BottomNav';

interface Ride {
  id: string;
  riderId: string;
  pickup: { address: string };
  dropoff: { address: string };
  fare: number;
  createdAt: any;
  scheduledAt?: string;
  status: string;
  rideType: string;
  isShared?: boolean;
  availableSeats?: number;
  joinedRiders?: string[];
}

export function TripHistory() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelRide = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled ride?')) return;
    
    setCancellingId(tripId);
    try {
      await updateDoc(doc(db, 'rides', tripId), {
        status: 'cancelled',
        updatedAt: new Date()
      });
      // Optionally remove from the list or mark as cancelled. Here we remove to keep the history clean, 
      // or map it to show as cancelled. Let's map it.
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: 'cancelled' } : t));
    } catch (error) {
      console.error("Error cancelling ride:", error);
      alert("Failed to cancel ride. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    const fetchTrips = async () => {
      if (!auth.currentUser) return;

      try {
        const q1 = query(
          collection(db, 'rides'),
          where('riderId', '==', auth.currentUser.uid),
          where('status', 'in', ['completed', 'scheduled']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const q2 = query(
          collection(db, 'rides'),
          where('joinedRiders', 'array-contains', auth.currentUser.uid),
          where('status', 'in', ['completed', 'scheduled']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const fetchedTrips = [...snap1.docs, ...snap2.docs].map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ride[];

        // Sort by createdAt desc
        fetchedTrips.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });

        const finalTrips = fetchedTrips.slice(0, 10);
        setTrips(finalTrips);

        // Fetch profiles for shared rides
        const uidsToFetch = new Set<string>();
        finalTrips.forEach(trip => {
          if (trip.isShared) {
            uidsToFetch.add(trip.riderId as any); // announcer
            trip.joinedRiders?.forEach(uid => uidsToFetch.add(uid));
          }
        });

        const profilePromises = Array.from(uidsToFetch).map(async (uid) => {
          const userDoc = await getDocFromServer(doc(db, 'users', uid));
          if (userDoc.exists()) {
            return { uid, ...userDoc.data() };
          }
          return null;
        });

        const fetchedProfiles = await Promise.all(profilePromises);
        const profileMap: Record<string, any> = {};
        fetchedProfiles.forEach(p => {
          if (p) profileMap[p.uid] = p;
        });
        setProfiles(profileMap);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'rides');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

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
            <h1 className="text-lg font-bold text-white tracking-tight">Your Trips</h1>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Journey History</span>
          </div>
        </div>
      </div>

      {/* ════════ CONTENT ════════ */}
      <div className="px-5 pt-4 pb-24 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading history...</p>
          </div>
        ) : trips.length > 0 ? (
          trips.map((trip, index) => (
            <motion.div 
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] rounded-2xl p-5 block relative space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {trip.status === 'scheduled' && trip.scheduledAt 
                      ? new Date(trip.scheduledAt).toLocaleString()
                      : trip.createdAt?.toDate 
                        ? trip.createdAt.toDate().toLocaleDateString() 
                        : 'Recent'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {trip.isShared && (
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                      Shared
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    trip.status === 'scheduled' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {trip.status}
                  </div>
                </div>
              </div>

              <div className="space-y-3 relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-zinc-800" />
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                  <p className="text-sm font-bold text-zinc-300 truncate">{trip.pickup.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  </div>
                  <p className="text-sm font-bold text-zinc-100 truncate">{trip.dropoff.address}</p>
                </div>
              </div>

              {trip.isShared && (
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Participants</p>
                  <div className="flex flex-wrap gap-3">
                    {/* Announcer */}
                    {profiles[(trip as any).riderId] && (
                      <div className="flex items-center gap-2 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg overflow-hidden border border-emerald-500/30">
                          <img 
                            src={profiles[(trip as any).riderId].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(trip as any).riderId}`} 
                            alt="Announcer" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-500">{profiles[(trip as any).riderId].displayName || 'Announcer'}</p>
                          <p className="text-[8px] text-emerald-500/60 font-black uppercase tracking-widest">Announcer</p>
                        </div>
                      </div>
                    )}
                    {/* Joined Riders */}
                    {trip.joinedRiders?.map(uid => profiles[uid] && (
                      <div key={uid} className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-xl border border-white/5">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
                          <img 
                            src={profiles[uid].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`} 
                            alt="Rider" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-300">{profiles[uid].displayName || 'Rider'}</p>
                          <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Joined</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                  <CreditCard size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">{trip.rideType}</span>
                </div>
                <p className="text-lg font-black text-zinc-50">₹{trip.fare}</p>
              </div>

              {trip.status === 'scheduled' && (
                <div className="pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCancelRide(trip.id); }}
                    disabled={cancellingId === trip.id}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {cancellingId === trip.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <X size={16} strokeWidth={2.5} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Cancel Scheduled Ride</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-[#121213] border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-center mb-4">
              <Clock size={24} className="text-zinc-700" />
            </div>
            <p className="text-white font-bold text-sm tracking-tight mb-1">No trips yet</p>
            <p className="text-zinc-600 text-xs font-medium mb-4">Your journey history will appear here once you complete your first ride.</p>
            <button 
              onClick={() => navigate('/')}
              className="text-emerald-500 text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
            >
              Book your first ride
            </button>
          </div>
        )}
      </div>
      </div>
      <BottomNav activeTab="trips" />
    </>
  );
}
