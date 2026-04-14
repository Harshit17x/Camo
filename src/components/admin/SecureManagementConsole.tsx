import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Map as MapIcon, 
  TrendingUp, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  Globe,
  Download,
  FileText,
  Plus,
  AlertTriangle,
  ChevronRight,
  Star,
  Database,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit, 
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  addDoc,
  Timestamp,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { logSecurityEvent } from '../../services/auditService';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { 
  UserProfile, 
  DriverProfile, 
  RideRequest, 
  VehicleCategory, 
  SupportTicket,
  AdminRole 
} from '../../types';

// Import sections
import DashboardOverview from './sections/DashboardOverview';
import FleetMap from './sections/FleetMap';
import DriverManager from './sections/DriverManager';
import RideOperations from './sections/RideOperations';
import VehicleManager from './sections/VehicleManager';
import RevenueAnalytics from './sections/RevenueAnalytics';
import SupportSafety from './sections/SupportSafety';
import SystemConfig from './sections/SystemConfig';
import FeedbackManager from './sections/FeedbackManager';
import DataCleanerManager from './sections/DataCleanerManager';
import PricingManager from './sections/PricingManager';

const GlobalSOSAlarm = ({ tickets, onAcknowledge, onViewRide }: { tickets: SupportTicket[], onAcknowledge: (id: string) => void, onViewRide: (id: string) => void }) => {
  const activeSOS = tickets.find(t => t.type === 'sos' && t.status === 'open');

  useEffect(() => {
    if (activeSOS) {
      // Use a more reliable siren sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => {
        console.log('Audio play failed (likely browser interaction policy):', e);
        // Fallback: alert the user they need to interact with the page
      });
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [activeSOS]);

  if (!activeSOS) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/90 backdrop-blur-md animate-pulse">
      <div className="bg-zinc-950 border-2 border-red-500 p-8 rounded-3xl max-w-lg w-full text-center shadow-[0_0_100px_rgba(239,68,68,0.5)]">
        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <AlertTriangle className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-red-500">SOS Alert Triggered!</h1>
        <p className="text-xl text-red-400 font-bold mb-6">Immediate Action Required</p>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 text-left space-y-3">
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Rider Details</p>
            <p className="text-white font-medium">{activeSOS.userEmail || 'Unknown Rider'}</p>
            <p className="text-[10px] text-zinc-500 font-mono">ID: {activeSOS.userId}</p>
          </div>

          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Emergency Details</p>
            <p className="text-white font-medium">{activeSOS.description}</p>
          </div>

          {activeSOS.location && (
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Exact Coordinates</p>
              <div className="flex items-center gap-2 text-white font-mono text-sm bg-black/40 p-2 rounded-lg border border-white/5">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{activeSOS.location.lat.toFixed(6)}, {activeSOS.location.lng.toFixed(6)}</span>
              </div>
            </div>
          )}

          <p className="text-white font-medium text-[10px] text-zinc-600 mt-4 uppercase tracking-widest">
            Triggered at: {activeSOS.createdAt?.toDate ? activeSOS.createdAt.toDate().toLocaleString() : new Date(activeSOS.createdAt as any).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => {
              onAcknowledge(activeSOS.id);
              if (activeSOS.rideId) {
                onViewRide(activeSOS.rideId);
              }
            }}
            className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black text-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-3"
          >
            <ShieldAlert className="w-6 h-6" />
            ACKNOWLEDGE & VIEW
          </button>
        </div>
      </div>
    </div>
  );
};

// Multi-language translations
const translations = {
  en: {
    dashboard: 'Dashboard',
    fleet: 'God\'s Eye View',
    drivers: 'Drivers',
    rides: 'Rides',
    vehicles: 'Vehicles',
    revenue: 'Revenue',
    support: 'Support & Safety',
    settings: 'Settings',
    logout: 'Logout',
    feedbacks: 'Feedbacks',
    database: 'Data Cleaner',
    pricing: 'Pricing Engine',
    accessRestricted: 'Access Restricted',
    mobileWarning: 'This management console is only accessible from desktop devices for security reasons.',
    welcome: 'Welcome back, Admin',
    realTimeUpdates: 'Real-time updates active'
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    fleet: 'फ्लीट मैप',
    drivers: 'ड्राइवर',
    rides: 'सवारियां',
    vehicles: 'वाहन',
    revenue: 'राजस्व',
    support: 'सहायता और सुरक्षा',
    settings: 'सेटिंग्स',
    logout: 'लॉगआउट',
    feedbacks: 'प्रतिक्रिया',
    database: 'डेटा क्लीनर',
    pricing: 'मूल्य निर्धारण इंजन',
    accessRestricted: 'पहुंच प्रतिबंधित',
    mobileWarning: 'सुरक्षा कारणों से यह प्रबंधन कंसोल केवल डेस्कटॉप उपकरणों से ही सुलभ है।',
    welcome: 'स्वागत है, एडमिन',
    realTimeUpdates: 'रीयल-टाइम अपडेट सक्रिय'
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    fleet: 'ફ્લીટ મેપ',
    drivers: 'ડ્રાઇવરો',
    rides: 'સવારી',
    vehicles: 'વાહનો',
    revenue: 'મહેસૂલ',
    support: 'સહાય અને સુરક્ષા',
    settings: 'સેટિંગ્સ',
    logout: 'લોગઆઉટ',
    feedbacks: 'પ્રતિસાદ',
    database: 'ડેટા ક્લીનર',
    pricing: 'પ્રાઇસીંગ એન્જીન',
    accessRestricted: 'પ્રવેશ પ્રતિબંધિત',
    mobileWarning: 'સુરક્ષા કારણોસર આ મેનેજમેન્ટ કન્સોલ ફક્ત ડેસ્કટોપ ઉપકરણો પરથી જ ઉપલબ્ધ છે.',
    welcome: 'સ્વાગત છે, એડમિન',
    realTimeUpdates: 'રીયલ-ટાઇમ અપડેટ સક્રિય'
  }
};

const SecureManagementConsole: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const t = translations[language];

  // Data states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rawDrivers, setRawDrivers] = useState<DriverProfile[]>([]);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive drivers from users with role=driver and raw driver data
  const drivers = useMemo(() => {
    return users
      .filter(u => u.role === 'driver')
      .map(u => {
        const driverData = rawDrivers.find(d => d.uid === u.uid);
        
        // Determine real status: if u.isActive is false, they are offline.
        // If u.isActive is true, check lastActive for the 15-minute timeout.
        let isActuallyOnline = !!u.isActive;
        if (isActuallyOnline && u.lastActive) {
          const lastActiveDate = typeof u.lastActive.toDate === 'function' ? u.lastActive.toDate() : new Date(u.lastActive as any);
          if (Math.abs(new Date().getTime() - lastActiveDate.getTime()) >= 900000) {
            isActuallyOnline = false; // timed out after 15 minutes
          }
        }

        const status = isActuallyOnline 
          ? (driverData?.status === 'busy' ? 'busy' : 'online') 
          : 'offline';

        return {
          ...driverData,
          uid: u.uid,
          status,
          rating: driverData?.rating || 0,
          totalRides: driverData?.totalRides || 0,
          earnings: driverData?.earnings || 0,
          currentLocation: u.currentLocation || driverData?.currentLocation,
          profile: u
        } as (DriverProfile & { profile?: UserProfile });
      });
  }, [users, rawDrivers]);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<VehicleCategory>>({
    name: '',
    baseFare: 0,
    perKmRate: 0,
    capacity: 4,
    isActive: true,
    icon: ''
  });

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time data fetching
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      setRawDrivers(snap.docs.map(doc => doc.data() as DriverProfile));
    });

    const unsubRides = onSnapshot(
      query(collection(db, 'rides'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        setRides(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest)));
      }
    );

    const unsubCategories = onSnapshot(collection(db, 'vehicle_categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory)));
    });

    const unsubTickets = onSnapshot(
      query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc')),
      (snap) => {
        setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
      }
    );

    const unsubFeedbacks = onSnapshot(
      query(collection(db, 'rideFeedbacks'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        setFeedbacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }
    );

    setLoading(false);

    return () => {
      unsubUsers();
      unsubDrivers();
      unsubRides();
      unsubCategories();
      unsubTickets();
      unsubFeedbacks();
    };
  }, [profile]);

  // Derived stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRides = rides.filter(r => {
      let dateStr = '';
      if (r.createdAt?.toDate && typeof r.createdAt.toDate === 'function') {
        dateStr = r.createdAt.toDate().toISOString();
      } else if (r.createdAt instanceof Date) {
        dateStr = r.createdAt.toISOString();
      } else {
        dateStr = String(r.createdAt || '');
      }
      return dateStr.includes(today);
    });
    const activeDrivers = drivers.filter(d => d.status === 'online' || d.status === 'busy').length;
    const activePassengers = users.filter(u => u.role === 'rider' && u.isActive).length;
    const totalRevenue = rides.filter(r => r.status === 'completed').reduce((acc, r) => acc + r.fare, 0);
    const pendingRequests = rides.filter(r => r.status === 'searching').length;
    const cancelledRides = rides.filter(r => r.status === 'cancelled').length;
    const cancellationRate = rides.length > 0 ? Math.round((cancelledRides / rides.length) * 100) : 0;

    return {
      totalRidesToday: todayRides.length,
      activeDrivers,
      activePassengers,
      totalRevenue,
      pendingRequests,
      cancellationRate
    };
  }, [rides, drivers, users]);

  // Chart data
  const revenueTrendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => ({
      name: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      revenue: rides
        .filter(r => {
          let dateStr = '';
          if (r.createdAt?.toDate && typeof r.createdAt.toDate === 'function') {
            dateStr = r.createdAt.toDate().toISOString();
          } else if (r.createdAt instanceof Date) {
            dateStr = r.createdAt.toISOString();
          } else {
            dateStr = String(r.createdAt || '');
          }
          return r.status === 'completed' && dateStr.includes(date);
        })
        .reduce((acc, r) => acc + r.fare, 0)
    }));
  }, [rides]);

  const rideVolumeData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => ({
      name: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      rides: rides.filter(r => {
        let dateStr = '';
        if (r.createdAt?.toDate && typeof r.createdAt.toDate === 'function') {
          dateStr = r.createdAt.toDate().toISOString();
        } else if (r.createdAt instanceof Date) {
          dateStr = r.createdAt.toISOString();
        } else {
          dateStr = String(r.createdAt || '');
        }
        return dateStr.includes(date);
      }).length
    }));
  }, [rides]);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    rides.filter(r => r.status === 'completed').forEach(r => {
      counts[r.rideType] = (counts[r.rideType] || 0) + r.fare;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rides]);

  const vehicleIcons = [
    { name: 'Sedan', url: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png' },
    { name: 'SUV', url: 'https://cdn-icons-png.flaticon.com/512/3085/3085330.png' },
    { name: 'Luxury', url: 'https://cdn-icons-png.flaticon.com/512/744/744465.png' },
    { name: 'Bike', url: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png' },
    { name: 'Auto', url: 'https://cdn-icons-png.flaticon.com/512/2164/2164632.png' },
    { name: 'Mini', url: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png' },
  ];

  // Handlers
  const handleUpdateDriverStatus = async (uid: string, status: 'online' | 'offline' | 'busy') => {
    try {
      await setDoc(doc(db, 'drivers', uid), { status }, { merge: true });
      if (profile) {
        await logSecurityEvent({
          action: 'Update Driver Status',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Updated driver ${uid} status to ${status}`
        });
      }
    } catch (err) {
      console.error('Failed to update driver status:', err);
    }
  };

  const handleToggleSuspension = async (uid: string, isSuspended: boolean) => {
    try {
      const updates: any = { isSuspended };
      if (isSuspended) {
        updates.isActive = false;
      } else {
        updates.isActive = true;
        updates.lastActive = serverTimestamp(); // Reset timeout
      }
      await updateDoc(doc(db, 'users', uid), updates);
      
      if (isSuspended) {
        await updateDoc(doc(db, 'drivers', uid), { status: 'offline' }).catch(() => {});
      } else {
        await updateDoc(doc(db, 'drivers', uid), { status: 'online' }).catch(() => {});
      }
      if (profile) {
        await logSecurityEvent({
          action: 'Toggle User Suspension',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Set user ${uid} suspension to ${isSuspended}`
        });
      }
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
    }
  };

  const handleVerifyDocuments = async (uid: string, verified: boolean) => {
    try {
      await setDoc(doc(db, 'drivers', uid), { documents: { verified } }, { merge: true });
      if (profile) {
        await logSecurityEvent({
          action: 'Verify Driver Documents',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Set driver ${uid} document verification to ${verified}`
        });
      }
    } catch (err) {
      console.error('Failed to verify documents:', err);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    try {
      const ride = rides.find(r => r.id === rideId);
      await updateDoc(doc(db, 'rides', rideId), { status: 'cancelled' });
      if (ride?.driverId) {
        await updateDoc(doc(db, 'drivers', ride.driverId), { status: 'online' }).catch(() => {});
      }
      if (profile) {
        await logSecurityEvent({
          action: 'Cancel Ride',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Cancelled ride ${rideId}`
        });
      }
    } catch (err) {
      console.error('Failed to cancel ride:', err);
    }
  };

  const handleManualBooking = () => {
    alert('Manual booking interface coming soon...');
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status });
      if (profile) {
        await logSecurityEvent({
          action: 'Update Ticket Status',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Updated ticket ${ticketId} status to ${status}`
        });
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Strip id from form data to avoid overwriting document ID or having redundant field
      const { id, ...data } = categoryForm;
      
      if (editingCategory) {
        await updateDoc(doc(db, 'vehicle_categories', editingCategory.id), data);
      } else {
        await addDoc(collection(db, 'vehicle_categories'), {
          ...data,
          isActive: true
        });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', baseFare: 0, perKmRate: 0, capacity: 4, isActive: true, icon: '' });
    } catch (err) {
      console.error('Failed to save category:', err);
      handleFirestoreError(err, editingCategory ? OperationType.UPDATE : OperationType.CREATE, 'vehicle_categories');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'vehicle_categories', categoryToDelete));
      if (profile) {
        await logSecurityEvent({
          action: 'Delete Vehicle Category',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Deleted vehicle category ${categoryToDelete}`
        });
      }
      setIsDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
      handleFirestoreError(err, OperationType.DELETE, `vehicle_categories/${categoryToDelete}`);
    }
  };

  const handleToggleCategoryActive = async (id: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'vehicle_categories', id), { isActive });
      if (profile) {
        await logSecurityEvent({
          action: 'Toggle Vehicle Category Active',
          userEmail: profile.email || 'Unknown',
          userId: profile.uid,
          details: `Set vehicle category ${id} active to ${isActive}`
        });
      }
    } catch (err) {
      console.error('Failed to toggle category active:', err);
      handleFirestoreError(err, OperationType.UPDATE, `vehicle_categories/${id}`);
    }
  };

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'fleet', label: t.fleet, icon: MapIcon },
    { id: 'drivers', label: t.drivers, icon: Users },
    { id: 'rides', label: t.rides, icon: Car },
    { id: 'vehicles', label: t.vehicles, icon: Car },
    { id: 'revenue', label: t.revenue, icon: TrendingUp },
    { id: 'support', label: t.support, icon: ShieldAlert },
    { id: 'feedbacks', label: t.feedbacks, icon: Star },
    { id: 'database', label: t.database, icon: Database },
    { id: 'pricing', label: t.pricing, icon: Calculator },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-400 font-sans selection:bg-blue-500/30">
      <GlobalSOSAlarm 
        tickets={tickets} 
        onAcknowledge={async (id) => {
          await updateDoc(doc(db, 'support_tickets', id), { status: 'investigating' });
        }}
        onViewRide={(id) => {
          setSelectedRideId(id);
          setActiveTab('rides');
        }}
      />
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Admin-Konsole</span>}
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-zinc-500 group-hover:text-blue-500'}`} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-3">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all group"
          >
            <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-red-500" />
            {isSidebarOpen && <span className="text-sm font-medium">{t.logout}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <header className="h-20 bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-white font-bold text-xl">{t.welcome}</h2>
              <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t.realTimeUpdates}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
              <Globe className="w-4 h-4 text-zinc-500" />
              <select 
                className="bg-transparent text-xs text-white focus:outline-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="gu">ગુજરાતી</option>
              </select>
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-zinc-950" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              <div className="text-right">
                <div className="text-sm font-bold text-white leading-none">{profile?.displayName}</div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{profile?.adminRole || 'Super Admin'}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {profile?.displayName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardOverview 
                  stats={stats} 
                  revenueData={revenueTrendData} 
                  rideData={rideVolumeData} 
                />
              )}
              {activeTab === 'fleet' && (
                <FleetMap drivers={drivers} />
              )}
              {activeTab === 'drivers' && (
                <DriverManager 
                  drivers={drivers} 
                  onUpdateStatus={handleUpdateDriverStatus}
                  onToggleSuspension={handleToggleSuspension}
                  onVerifyDocuments={handleVerifyDocuments}
                />
              )}
              {activeTab === 'rides' && (
                <RideOperations 
                  rides={rides} 
                  onCancelRide={handleCancelRide}
                  onManualBooking={handleManualBooking}
                  highlightRideId={selectedRideId || undefined}
                />
              )}
              {activeTab === 'vehicles' && (
                <VehicleManager 
                  categories={categories}
                  onAddCategory={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', baseFare: 0, perKmRate: 0, capacity: 4, isActive: true, icon: '' });
                    setIsCategoryModalOpen(true);
                  }}
                  onEditCategory={(cat) => {
                    setEditingCategory(cat);
                    setCategoryForm(cat);
                    setIsCategoryModalOpen(true);
                  }}
                  onDeleteCategory={handleDeleteCategory}
                  onToggleActive={handleToggleCategoryActive}
                />
              )}
              {activeTab === 'revenue' && (
                <RevenueAnalytics 
                  revenueData={revenueTrendData}
                  categoryData={categoryDistribution}
                  drivers={drivers}
                  onExportData={(format) => console.log(`Exporting as ${format}`)}
                />
              )}
              {activeTab === 'support' && (
                <SupportSafety 
                  tickets={tickets}
                  onUpdateTicketStatus={handleUpdateTicketStatus}
                  onViewRideDetails={(id) => {
                    setSelectedRideId(id);
                    setActiveTab('rides');
                  }}
                />
              )}
              {activeTab === 'feedbacks' && (
                <FeedbackManager feedbacks={feedbacks.map(f => {
                  let dName = f.driverName;
                  let rName = f.riderName;
                  
                  const ride = rides.find(r => r.id === f.rideId);

                  if (!dName && f.driverId) {
                     const driver = drivers.find(d => d.uid === f.driverId);
                     if (driver) dName = driver.profile?.displayName;
                  }
                  if (!dName && ride) dName = ride.driverName;
                  
                  if (!rName && f.riderId) {
                     const user = users.find(u => u.uid === f.riderId);
                     if (user) rName = user.displayName;
                  }
                  if (!rName && ride) rName = ride.riderName;

                  return { 
                     ...f, 
                     driverName: dName || 'Unknown Driver',
                     riderName: rName || 'Anonymous Rider'
                  };
                })} />
              )}
              {activeTab === 'database' && (
                <DataCleanerManager />
              )}
              {activeTab === 'pricing' && (
                <PricingManager />
              )}
              {activeTab === 'settings' && (
                <SystemConfig />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl"
            >
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Delete Category?</h3>
              <p className="text-zinc-400 text-center mb-8">
                This action cannot be undone. All drivers using this category will need to be reassigned.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteCategory}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Category Name</label>
                  <input 
                    type="text" 
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Economy, Premium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Base Fare (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={categoryForm.baseFare}
                      onChange={(e) => setCategoryForm({ ...categoryForm, baseFare: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Per KM Rate (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={categoryForm.perKmRate}
                      onChange={(e) => setCategoryForm({ ...categoryForm, perKmRate: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Capacity (Persons)</label>
                  <input 
                    type="number" 
                    required
                    value={categoryForm.capacity}
                    onChange={(e) => setCategoryForm({ ...categoryForm, capacity: parseInt(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Icon</label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {vehicleIcons.map((vIcon) => (
                      <button
                        key={vIcon.name}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, icon: vIcon.url })}
                        className={`p-2 rounded-lg border transition-all ${
                          categoryForm.icon === vIcon.url 
                            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                        title={vIcon.name}
                      >
                        <img src={vIcon.url} alt={vIcon.name} className="w-full h-auto object-contain" />
                      </button>
                    ))}
                  </div>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Or Custom Icon URL</label>
                  <input 
                    type="text" 
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 py-2 bg-zinc-800 text-white rounded-lg font-bold hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecureManagementConsole;
