import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, TrendingUp, User, Bell, Clock, ChevronRight, Check, X, Car, ShieldAlert, ShieldCheck, AlertCircle, Languages, Menu, Users, Phone, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Translation } from '@capacitor-mlkit/translation';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { doc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useGeolocation } from '../../hooks/useGeolocation';
import { mapService } from '../../services/mapService';
import { sendPushNotification } from '../../services/notificationService';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { triggerHaptic } from '../../services/nativeService';
import { ImpactStyle } from '@capacitor/haptics';
import { DriverProfile } from '../../types';
import {
  checkOverlayPermission,
  requestOverlayPermission,
  showRideOverlay,
  dismissRideOverlay,
  addOverlayActionListener,
  getPendingOverlayAction,
} from '../../services/overlayService';

const translations = {
  en: {
    online: 'ONLINE',
    offline: 'OFFLINE',
    earningsToday: 'Earnings Today',
    totalRides: 'Total Rides',
    waitingRequests: 'Waiting for requests...',
    youAreOffline: 'You are offline',
    stayHighDemand: 'Stay in high-demand areas',
    goOnlineEarn: 'Go online to start earning',
    newRequest: 'New Request',
    reject: 'REJECT',
    accept: 'ACCEPT',
    arrivedAtPickup: 'ARRIVED AT PICKUP',
    completeTrip: 'COMPLETE TRIP',
    pickupLocation: 'Pickup Location',
    dropoffLocation: 'Dropoff Location',
    verificationRequired: 'Verification Required',
    underReview: 'Your driver account is currently under review. Our administration team is verifying your documents to ensure platform safety.',
    statusPending: 'Status: Pending Review',
    takesTime: 'Usually takes 24-48 hours. We\'ll notify you once approved.',
    viewProfile: 'View Profile',
    riderCancelled: 'The rider has cancelled the trip.',
    driver: 'DRIVER',
    auto: 'Auto Rickshaw',
    economy: 'Economy Cab (4 seater)',
    premium: 'Premium Cab (6 seater)',
    rideAccepted: 'Ride Accepted!',
    driverOnWay: 'has accepted your ride request and is on the way.',
    driverArrived: 'Driver Arrived!',
    driverAtPickup: 'Your driver has arrived at the pickup location.',
    tripCompleted: 'Trip Completed!',
    reachedDestination: 'You have reached your destination. Thank you for riding with CampusMobility.',
    scheduledRides: 'Scheduled Rides',
    noScheduledRides: 'No scheduled rides available',
    scheduledFor: 'Scheduled for',
    acceptScheduled: 'Accept Scheduled Ride',
    myScheduledRides: 'My Scheduled Rides',
    startRide: 'START RIDE',
    noAcceptedScheduledRides: 'No accepted scheduled rides'
  },
  hi: {
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    earningsToday: 'आज की कमाई',
    totalRides: 'कुल सवारी',
    waitingRequests: 'अनुरोधों की प्रतीक्षा कर रहे हैं...',
    youAreOffline: 'आप ऑफलाइन हैं',
    stayHighDemand: 'उच्च मांग वाले क्षेत्रों में रहें',
    goOnlineEarn: 'कमाना शुरू करने के लिए ऑनलाइन जाएं',
    newRequest: 'नया अनुरोध',
    reject: 'अस्वीकार करें',
    accept: 'स्वीकार करें',
    arrivedAtPickup: 'पिकअप पर पहुंचे',
    completeTrip: 'यात्रा पूरी करें',
    pickupLocation: 'पिकअप स्थान',
    dropoffLocation: 'ड्रॉपऑफ़ स्थान',
    verificationRequired: 'सत्यापन आवश्यक',
    underReview: 'आपका ड्राइवर खाता वर्तमान में समीक्षाधीन है। हमारी प्रशासन टीम सुरक्षा सुनिश्चित करने के लिए आपके दस्तावेजों का सत्यापन कर रही है।',
    statusPending: 'स्थिति: समीक्षा लंबित',
    takesTime: 'आमतौर पर 24-48 घंटे लगते हैं। स्वीकृत होने पर हम आपको सूचित करेंगे।',
    viewProfile: 'प्रोफ़ाइल देखें',
    riderCancelled: 'सवार ने यात्रा रद्द कर दी है।',
    driver: 'ड्राइवर',
    auto: 'ऑटो रिक्शा',
    economy: 'इकोनॉमी कैब (4 सीटर)',
    premium: 'प्रीमियम कैब (6 सीटर)',
    rideAccepted: 'सवारी स्वीकार कर ली गई!',
    driverOnWay: 'ने आपका सवारी अनुरोध स्वीकार कर लिया है और रास्ते में है।',
    driverArrived: 'ड्राइवर पहुँच गया!',
    driverAtPickup: 'आपका ड्राइवर पिकअप स्थान पर पहुँच गया है।',
    tripCompleted: 'यात्रा पूरी हुई!',
    reachedDestination: 'आप अपने गंतव्य पर पहुँच गए हैं। CampusMobility के साथ सवारी करने के लिए धन्यवाद।',
    scheduledRides: 'अनुसूचित सवारी',
    noScheduledRides: 'कोई अनुसूचित सवारी उपलब्ध नहीं है',
    scheduledFor: 'के लिए निर्धारित',
    acceptScheduled: 'अनुसूचित सवारी स्वीकार करें',
    myScheduledRides: 'मेरी अनुसूचित सवारी',
    startRide: 'सवारी शुरू करें',
    noAcceptedScheduledRides: 'कोई स्वीकृत अनुसूचित सवारी नहीं'
  },
  gu: {
    online: 'ઓનલાઇન',
    offline: 'ઓફલાઇન',
    earningsToday: 'આજની કમાણી',
    totalRides: 'કુલ સવારી',
    waitingRequests: 'વિનંતીઓની રાહ જોઈ રહ્યા છીએ...',
    youAreOffline: 'તમે ઓફલાઇન છો',
    stayHighDemand: 'વધારે માંગવાળા વિસ્તારોમાં રહો',
    goOnlineEarn: 'કમાણી શરૂ કરવા માટે ઓનલાઇન જાઓ',
    newRequest: 'નવી વિનંતી',
    reject: 'અસ્વીકાર કરો',
    accept: 'સ્વીકારો',
    arrivedAtPickup: 'પિકઅપ પર પહોંચ્યા',
    completeTrip: 'યાત્રા પૂર્ણ કરો',
    pickupLocation: 'પિકઅપ સ્થાન',
    dropoffLocation: 'ડ્રોપઓફ સ્થાન',
    verificationRequired: 'ચકાસણી જરૂરી',
    underReview: 'તમારું ડ્રાઇવર એકાઉન્ટ હાલમાં સમીક્ષા હેઠળ છે. અમારી વહીવટી ટીમ સુરક્ષા સુનિશ્ચિત કરવા માટે તમારા દસ્તાવેજોની ચકાસણી કરી રહી છે.',
    statusPending: 'સ્થિતિ: સમીક્ષા બાકી',
    takesTime: 'સામાન્ય રીતે 24-48 કલાક લાગે છે. મંજૂર થયા પછી અમે તમને જાણ કરીશું.',
    viewProfile: 'પ્રોફાઇલ જુઓ',
    riderCancelled: 'સવારે યાત્રા રદ કરી છે.',
    driver: 'ડ્રાઇવર',
    auto: 'ઓટો રિક્ષા',
    economy: 'ઇકોનોમી કેબ (4 સીટર)',
    premium: 'પ્રીમિયમ કેબ (6 સીટર)',
    rideAccepted: 'સવારી સ્વીકારવામાં આવી!',
    driverOnWay: 'તમારી સવારીની વિનંતી સ્વીકારી છે અને રસ્તામાં છે.',
    driverArrived: 'ડ્રાઇવર આવી પહોંચ્યા!',
    driverAtPickup: 'તમારા ડ્રાઇવર પિકઅપ સ્થાન પર પહોંચી ગયા છે.',
    tripCompleted: 'યાત્રા પૂર્ણ થઈ!',
    reachedDestination: 'તમે તમારા ગંતવ્ય પર પહોંચી ગયા છો. CampusMobility સાથે સવારી કરવા બદલ આભાર.',
    scheduledRides: 'નિર્ધારિત સવારી',
    noScheduledRides: 'કોઈ નિર્ધારિત સવારી ઉપલબ્ધ નથી',
    scheduledFor: 'માટે નિર્ધારિત',
    acceptScheduled: 'નિર્ધારિત સવારી સ્વીકારો',
    myScheduledRides: 'મારી નિર્ધારિત સવારી',
    startRide: 'સવારી શરૂ કરો',
    noAcceptedScheduledRides: 'કોઈ સ્વીકૃત નિર્ધારિત સવારી નથી'
  }
};

const translateAddress = (englishText: string, lang: 'en' | 'hi' | 'gu') => {
  if (!englishText || lang === 'en') return englishText;

  const addressMap: Record<string, { hi: string, gu: string }> = {
    'Rashtriya Raksha University': { hi: 'राष्ट्रीय रक्षा विश्वविद्यालय', gu: 'રાષ્ટ્રીય રક્ષા યુનિવર્સિટી' },
    'Lavad, Dahegam, Gandhinagar, Gujarat 382305': { hi: 'लवाड, दहेगाम, गांधीनगर, गुजरात 382305', gu: 'લવાડ, દહેગામ, ગાંધીનગર, ગુજરાત 382305' },
    'RRU(Gate-1)': { hi: 'आरआरयू (गेट-1)', gu: 'આરઆરયુ (ગેટ-1)' },
    'Main Entrance, RRU Campus': { hi: 'मुख्य प्रवेश द्वार, आरआरयू कैंपस', gu: 'મુખ્ય પ્રવેશ દ્વાર, આરઆરયુ કેમ્પસ' },
    'RRU(Gate-2)': { hi: 'आरआरयू (गेट-2)', gu: 'આરઆરયુ (ગેટ-2)' },
    'Secondary Entrance, RRU Campus': { hi: 'द्वितीयक प्रवेश द्वार, आरआरयू कैंपस', gu: 'ગૌણ પ્રવેશ દ્વાર, આરઆરયુ કેમ્પસ' },
    'Dahegam Bus Stand': { hi: 'दहेगाम बस स्टैंड', gu: 'દહેગામ બસ સ્ટેન્ડ' },
    'Dahegam, Gandhinagar, Gujarat': { hi: 'दहेगाम, गांधीनगर, गुजरात', gu: 'દહેગામ, ગાંધીનગર, ગુજરાત' }
  };

  if (addressMap[englishText]) {
    return addressMap[englishText][lang];
  }

  let translated = englishText;
  for (const [enStr, trans] of Object.entries(addressMap)) {
    if (translated.includes(enStr)) {
      translated = translated.replace(enStr, trans[lang]);
    }
  }

  return translated;
};

const getTranslatedAddress = async (address: string, lat?: number, lng?: number, lang: 'en' | 'hi' | 'gu' = 'en') => {
  const staticTrans = translateAddress(address, lang);
  if (lang === 'en' || staticTrans !== address) {
    return staticTrans;
  }

  // Attempt on-device ML Kit translation as primary dynamic translation
  try {
    const mlResult = await Translation.translate({
      text: address,
      sourceLanguage: 'en',
      targetLanguage: lang === 'hi' ? 'hi' : lang === 'gu' ? 'gu' : 'en'
    });
    
    if (mlResult && mlResult.text) {
      return mlResult.text;
    }
  } catch (e) {
    // Will fail on the web or if the model failed to download; gracefully fall back
  }

  // Fallback to network reverse geocoding
  if (lat && lng) {
    try {
      const dynamicTrans = await mapService.reverseGeocode(lat, lng, 1, lang);
      if (dynamicTrans && dynamicTrans !== 'Unknown Location' && !dynamicTrans.includes('Rate') && !dynamicTrans.includes('Busy')) {
        return dynamicTrans;
      }
    } catch (e) {
      // ignore
    }
  }

  return staticTrans;
};

const DynamicAddress = ({ address, lat, lng, language }: { address?: string, lat?: number, lng?: number, language: 'en' | 'hi' | 'gu' }) => {
  const [translated, setTranslated] = useState(address || '');

  useEffect(() => {
    if (!address) return;
    let isActive = true;
    
    // Set static immediately to avoid flickering
    setTranslated(translateAddress(address, language));
    
    getTranslatedAddress(address, lat, lng, language).then(res => {
      if (isActive) setTranslated(res);
    });
    
    return () => { isActive = false; };
  }, [address, lat, lng, language]);

  return <>{translated}</>;
};

export default function DriverDashboard() {
  const { profile, user } = useAuth();
  const { initiateCall } = useCall();
  const navigate = useNavigate();
  const { location, path } = useGeolocation();
  const isOnline = profile?.isActive || false;
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [scheduledRides, setScheduledRides] = useState<any[]>([]);
  const [myScheduledRides, setMyScheduledRides] = useState<any[]>([]);
  const [ignoredRequestIds, setIgnoredRequestIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ earnings: 0, totalRides: 0 });
  const [tripStatus, setTripStatus] = useState<'to_pickup' | 'to_dropoff'>('to_pickup');
  const [distanceToTarget, setDistanceToTarget] = useState<string>('...');
  const [etaToTarget, setEtaToTarget] = useState<string>('...');
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>((profile?.language as any) || 'en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // ── Overlay state ────────────────────────────────────────────────────────
  const [overlayPermission, setOverlayPermission] = useState<boolean | null>(null);
  const [showOverlayBanner, setShowOverlayBanner] = useState(false);
  // Track which ride IDs we've already shown an overlay for
  const overlayShownForRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (profile?.language && profile.language !== language) {
      setLanguage(profile.language as any);
    }
  }, [profile?.language]);

  const t = translations[language];

  // ── Overlay permission: check once on mount ───────────────────────────────
  useEffect(() => {
    let mounted = true;
    checkOverlayPermission().then((granted) => {
      if (!mounted) return;
      setOverlayPermission(granted);
      // Show the banner only if we haven't prompted before this session
      if (!granted && !sessionStorage.getItem('overlay_banner_dismissed')) {
        setShowOverlayBanner(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleRequestOverlayPermission = async () => {
    const granted = await requestOverlayPermission();
    setOverlayPermission(granted);
    if (granted) {
      setShowOverlayBanner(false);
    }
  };

  const dismissOverlayBanner = () => {
    setShowOverlayBanner(false);
    sessionStorage.setItem('overlay_banner_dismissed', '1');
  };

  // ── Listen for accept/reject coming FROM the native overlay window ────────
  useEffect(() => {
    const handleOverlayAction = async ({ rideId, action }: any) => {
      if (action === 'accepted') {
        // Find the ride in availableRequests
        let ride = availableRequests.find((r) => r.id === rideId);
        
        // If not found in current state (e.g. app was just launched), fetch directly
        if (!ride) {
          try {
            const docSnap = await getDoc(doc(db, 'rides', rideId));
            if (docSnap.exists()) {
              ride = { id: docSnap.id, ...docSnap.data() } as any;
            }
          } catch (e) {
            console.error("Error fetching ride for overlay accept:", e);
          }
        }
        
        if (ride) {
          await handleAccept(ride);
        }
      } else if (action === 'rejected') {
        handleReject(rideId);
      }
    };

    const removeListener = addOverlayActionListener(handleOverlayAction);
    
    // Also check for any pending action when dashboard mounts
    getPendingOverlayAction().then((pending) => {
      if (pending && pending.action && pending.rideId) {
        handleOverlayAction(pending);
      }
    });

    return removeListener;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRequests]);

  const handleLanguageChange = async (newLang: 'en' | 'hi' | 'gu') => {
    setLanguage(newLang);
    setShowLangMenu(false);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          language: newLang
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  // Fetch driver profile
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'drivers', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DriverProfile;
        setDriverProfile(data);
        // If profile exists but is incomplete, redirect to onboarding
        if (!data.licenseNo || !data.vehicleNo) {
          navigate('/driver-onboarding');
        }
      } else {
        // If driver profile doesn't exist, they need to complete onboarding
        navigate('/driver-onboarding');
      }
    });
    return () => unsub();
  }, [user, navigate]);

  // Fetch real vehicle categories from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicle_categories'), (snap) => {
      const fetchedCategories = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(cat => cat.isActive);
      
      setCategories(fetchedCategories);
    });

    return () => unsub();
  }, []);

  // Trigger haptic feedback and sound when new requests arrive
  useEffect(() => {
    if (availableRequests.length > 0) {
      triggerHaptic(ImpactStyle.Heavy);
      try {
        const audio = new Audio('/sound.aac');
        audio.play().catch(e => console.log('Audio playback failed:', e));
      } catch (err) {
        console.error('Failed to play sound:', err);
      }
    }
  }, [availableRequests.length]);

  // ── Show native overlay for EACH new ride request (only once per rideId) ──
  useEffect(() => {
    if (!overlayPermission || !isOnline || currentTrip) return;

    availableRequests.forEach((ride) => {
      if (overlayShownForRef.current.has(ride.id)) return;
      overlayShownForRef.current.add(ride.id);

      // Prevent triggering the native system overlay if the app is actively in the foreground.
      // The normal React UI will be shown to the driver instead.
      if (!document.hidden) {
        return;
      }

      const rideType =
        categories.find((c) => c.id === ride.rideType)?.name ||
        (t as any)[ride.rideType?.toLowerCase()] ||
        ride.rideType ||
        'Ride';

      Promise.all([
        getTranslatedAddress(ride.pickup?.address || '', ride.pickup?.lat, ride.pickup?.lng, language),
        getTranslatedAddress(ride.dropoff?.address || '', ride.dropoff?.lat, ride.dropoff?.lng, language)
      ]).then(([transPickup, transDropoff]) => {
        showRideOverlay({
          rideId: ride.id,
          pickup: transPickup,
          dropoff: transDropoff,
          fare: ride.fare ?? 0,
          rideType,
          distance: ride.distance ?? '',
        });
      });
    });
  }, [availableRequests, overlayPermission, isOnline, currentTrip, categories]);

  // Update distance to target periodically when a trip is active
  useEffect(() => {
    if (!currentTrip || !location) return;

    const updateDistance = async () => {
      const target = tripStatus === 'to_pickup' ? currentTrip.pickup : currentTrip.dropoff;
      const routeData = await mapService.getRoute(location, target);
      if (routeData) {
        setDistanceToTarget((routeData.distance / 1000).toFixed(1) + ' km');
        setEtaToTarget(Math.round(routeData.duration / 60) + ' min');
      }
    };

    const interval = setInterval(updateDistance, 30000); // Update every 30s to avoid API spam and save quota
    updateDistance();

    return () => clearInterval(interval);
  }, [currentTrip, location, tripStatus]);

  // Handle online/offline status toggle
  const handleToggleOnline = async () => {
    if (!user) return;
    
    // Prevent unverified drivers from going online
    if (!isOnline && driverProfile && !driverProfile.documents?.verified) {
      triggerHaptic(ImpactStyle.Medium);
      return;
    }

    if (!isOnline && profile?.isSuspended) {
      triggerHaptic(ImpactStyle.Heavy);
      alert('Your account is currently suspended. Please contact support.');
      return;
    }

    const newStatus = !isOnline;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isActive: newStatus,
        role: 'driver',
        lastActive: serverTimestamp()
      });
      // Also update the drivers collection for consistency
      await updateDoc(doc(db, 'drivers', user.uid), {
        status: newStatus ? 'online' : 'offline'
      }).catch(() => {
        // If driver doc doesn't exist, we don't strictly need to create it here
        // as the admin panel derives status from users collection too.
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  // Recover active trip on mount
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'arrived', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const ride = { id: doc.id, ...doc.data() } as any;
        setCurrentTrip(ride);
        setTripStatus(ride.status === 'in_progress' ? 'to_dropoff' : 'to_pickup');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rides');
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch scheduled rides
  useEffect(() => {
    if (!user || !isOnline) return;

    const q = query(
      collection(db, 'rides'),
      where('status', '==', 'scheduled')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScheduledRides(rides);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rides');
    });

    return () => unsubscribe();
  }, [user, isOnline]);

  // Fetch my accepted scheduled rides
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', '==', 'scheduled_accepted')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyScheduledRides(rides);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rides');
    });

    return () => unsubscribe();
  }, [user]);

  // Handle location updates separately with throttling
  const lastLocationUpdate = React.useRef<number>(0);
  useEffect(() => {
    if (!user || !location || !isOnline) return;

    const now = Date.now();
    // Only update Firestore every 30 seconds to save quota (increased from 10s)
    if (now - lastLocationUpdate.current < 30000) return;

    const updateLocation = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          currentLocation: {
            lat: location.lat,
            lng: location.lng,
            updatedAt: serverTimestamp()
          },
          lastActive: serverTimestamp()
        });
        lastLocationUpdate.current = Date.now();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    updateLocation();
  }, [location, user, isOnline]);

  // Listen for current trip status changes (e.g., rider cancellation)
  useEffect(() => {
    if (!currentTrip?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'rides', currentTrip.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'cancelled') {
          alert(t.riderCancelled);
          setCurrentTrip(null);
          setDistanceToTarget('...');
          setEtaToTarget('...');
          // Reset driver status to online
          if (user) {
            updateDoc(doc(db, 'drivers', user.uid), { status: 'online' }).catch(() => {});
          }
        } else {
          setCurrentTrip({ id: docSnap.id, ...data });
          setTripStatus(data.status === 'in_progress' ? 'to_dropoff' : 'to_pickup');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rides/${currentTrip.id}`);
    });

    return () => unsubscribe();
  }, [currentTrip?.id]);

  // Listen for available ride requests — only for this driver's vehicle category
  useEffect(() => {
    if (!isOnline || currentTrip || !driverProfile?.vehicleType) {
      setAvailableRequests([]);
      return;
    }

    console.log(`Driver is online (${driverProfile.vehicleType}), starting ride request listener...`);

    const q = query(
      collection(db, 'rides'),
      where('status', '==', 'searching'),
      where('vehicleCategory', '==', driverProfile.vehicleType)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Received ${snapshot.size} searching rides for category ${driverProfile.vehicleType}`);
      const requests = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((req: any) => {
          // Skip rides the driver has already rejected
          if (ignoredRequestIds.has(req.id)) return false;
          // If ride has a candidateDrivers list, only show it to those drivers
          if (req.candidateDrivers && Array.isArray(req.candidateDrivers)) {
            return req.candidateDrivers.includes(user!.uid);
          }
          return true;
        });
      
      setAvailableRequests(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rides');
    });

    return () => unsubscribe();
  }, [isOnline, currentTrip, ignoredRequestIds, driverProfile?.vehicleType]);

  // Fetch driver stats (one-time fetch to save quota)
  const fetchStats = async () => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', '==', 'completed')
    );

    try {
      const snapshot = await getDocs(q);
      let totalEarnings = 0;
      let todayEarnings = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fare = data.fare || 0;
        totalEarnings += fare;
        
        let completedAtDate: Date | null = null;
        if (data.completedAt?.toDate) {
          completedAtDate = data.completedAt.toDate();
        } else if (data.completedAt) {
          completedAtDate = new Date(data.completedAt);
        }

        if (completedAtDate && completedAtDate >= today) {
          todayEarnings += fare;
        }
      });
      
      setStats({
        earnings: todayEarnings,
        totalRides: snapshot.size
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'rides');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleReject = (rideId: string) => {
    setIgnoredRequestIds(prev => new Set(prev).add(rideId));
    // Dismiss any overlay that might still be showing for this ride
    dismissRideOverlay();
  };

  const handleAccept = async (ride: any) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'rides', ride.id), {
        status: 'accepted',
        driverId: user.uid,
        driverName: profile?.displayName || 'Driver',
        driverPhoto: profile?.photoURL || '',
        vehicleNo: driverProfile?.vehicleNo || '',
        vehicleType: driverProfile?.vehicleType || '',
        acceptedAt: serverTimestamp()
      });

      // Set driver status to busy
      await updateDoc(doc(db, 'drivers', user.uid), {
        status: 'busy'
      }).catch(() => {});

      setCurrentTrip({ ...ride, status: 'accepted' });
      setTripStatus('to_pickup');

      // Dismiss overlay (driver accepted from inside the app)
      dismissRideOverlay();
      
      // Send notification to rider
      sendPushNotification(
        ride.riderId,
        t.rideAccepted,
        `${profile?.displayName || 'A driver'} ${t.driverOnWay}`
      );

      // Get route to pickup
      if (location) {
        const routeData = await mapService.getRoute(location, ride.pickup);
        if (routeData) {
          setDistanceToTarget((routeData.distance / 1000).toFixed(1) + ' km');
          setEtaToTarget(Math.round(routeData.duration / 60) + ' min');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rides/${ride.id}`);
    }
  };

  const handleAcceptScheduled = async (ride: any) => {
    if (!user || !driverProfile) return;

    try {
      await updateDoc(doc(db, 'rides', ride.id), {
        driverId: user.uid,
        driverName: profile?.displayName || 'Driver',
        driverPhoto: profile?.photoURL || '',
        vehicleNo: driverProfile?.vehicleNo || '',
        vehicleType: driverProfile?.vehicleType || '',
        status: 'scheduled_accepted',
        acceptedAt: serverTimestamp()
      });
      
      // Notify rider
      sendPushNotification(
        ride.riderId,
        t.rideAccepted,
        `${profile?.displayName || t.driver} has accepted your scheduled ride.`
      );

      triggerHaptic(ImpactStyle.Medium);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rides/${ride.id}`);
    }
  };

  const handleStartScheduledRide = async (ride: any) => {
    if (!user || !location) return;

    try {
      await updateDoc(doc(db, 'rides', ride.id), {
        status: 'accepted',
        startedAt: serverTimestamp()
      });

      // Set driver status to busy
      await updateDoc(doc(db, 'drivers', user.uid), {
        status: 'busy'
      }).catch(() => {});

      setCurrentTrip({ ...ride, status: 'accepted' });
      setTripStatus('to_pickup');

      // Get route to pickup
      const routeData = await mapService.getRoute(location, ride.pickup);
      if (routeData) {
        setDistanceToTarget((routeData.distance / 1000).toFixed(1) + ' km');
        setEtaToTarget(Math.round(routeData.duration / 60) + ' min');
      }
      
      triggerHaptic(ImpactStyle.Medium);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rides/${ride.id}`);
    }
  };

  const handleArrivedAtPickup = async () => {
    if (!currentTrip || !location) return;
    
    try {
      // Update ride status to arrived in Firestore
      await updateDoc(doc(db, 'rides', currentTrip.id), {
        status: 'arrived',
        arrivedAt: serverTimestamp()
      });

      // Send notification to rider
      sendPushNotification(
        currentTrip.riderId,
        t.driverArrived,
        t.driverAtPickup
      );

      triggerHaptic(ImpactStyle.Medium);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rides/${currentTrip.id}`);
    }
  };

  const handleVerifyOTP = async () => {
    if (!currentTrip || !otpInput || otpInput.length !== 6) return;
    
    setIsVerifying(true);
    setOtpError(false);
    
    try {
      const correctOTP = currentTrip.rideOTP;
      
      if (!correctOTP) {
        // Fallback for older rides that don't have rideOTP
        console.warn('Ride does not have an OTP attached. Bypassing verification for legacy ride.');
        await updateDoc(doc(db, 'rides', currentTrip.id), {
          status: 'in_progress',
          startedAt: serverTimestamp()
        });
        
        setTripStatus('to_dropoff');
        setShowOTPModal(false);
        setOtpInput('');
        
        sendPushNotification(
          currentTrip.riderId,
          'Ride Started',
          'Your ride has successfully started. Have a safe trip!'
        );
        
        triggerHaptic(ImpactStyle.Heavy);
        return;
      }
      
      if (otpInput === correctOTP) {
        // Correct OTP, start the ride
        await updateDoc(doc(db, 'rides', currentTrip.id), {
          status: 'in_progress',
          startedAt: serverTimestamp()
        });
        
        setTripStatus('to_dropoff');
        setShowOTPModal(false);
        setOtpInput('');
        
        // Send notification to rider
        sendPushNotification(
          currentTrip.riderId,
          'Ride Started',
          'Your ride has successfully started. Have a safe trip!'
        );
        
        triggerHaptic(ImpactStyle.Heavy);
      } else {
        setOtpError(true);
        triggerHaptic(ImpactStyle.Medium);
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      alert('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleComplete = async () => {
    if (!currentTrip) return;
    
    try {
      await updateDoc(doc(db, 'rides', currentTrip.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // Set driver status back to online
      await updateDoc(doc(db, 'drivers', user.uid), {
        status: 'online'
      }).catch(() => {});

      // Send notification to rider
      sendPushNotification(
        currentTrip.riderId,
        t.tripCompleted,
        t.reachedDestination
      );

      setCurrentTrip(null);
      setDistanceToTarget('...');
      setEtaToTarget('...');
      
      // Refresh stats after completion
      fetchStats();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rides/${currentTrip.id}`);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-50 overflow-hidden relative font-sans text-zinc-950">

      {/* ── Overlay permission banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {showOverlayBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute top-0 left-0 right-0 z-[60] mx-4 mt-[env(safe-area-inset-top,0px)] mt-2"
          >
            <div className="bg-zinc-950 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl border border-zinc-800">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Layers size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Ride Alerts</p>
                <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5">
                  Enable &quot;Display over other apps&quot; to see ride requests while using other apps.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRequestOverlayPermission}
                  className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={dismissOverlayBanner}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={14} className="text-zinc-500" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm z-40"
            />
            {/* Sidebar Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Clock className="text-emerald-600" size={20} />
                  </div>
                  <h2 className="font-black font-display text-lg uppercase italic tracking-tight">{t.myScheduledRides}</h2>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar light">
                {myScheduledRides.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100">
                      <Clock size={24} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">{t.noAcceptedScheduledRides}</p>
                  </div>
                ) : (
                  myScheduledRides.map((ride) => (
                    <motion.div 
                      key={ride.id}
                      layout
                      className="bg-zinc-50 border border-zinc-100 rounded-[32px] p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-emerald-500" />
                          <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                            {t.scheduledFor} {ride.scheduledTime ? new Date(ride.scheduledTime).toLocaleString(language, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '...'}
                          </p>
                        </div>
                        <p className="text-xl font-black font-display">₹{ride.fare.toFixed(0)}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                          </div>
                          <p className="font-bold text-xs text-zinc-500 truncate"><DynamicAddress address={ride.pickup.address} lat={ride.pickup.lat} lng={ride.pickup.lng} language={language} /></p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                            <div className="w-1 h-1 bg-red-500 rounded-full" />
                          </div>
                          <p className="font-bold text-xs text-zinc-950 truncate"><DynamicAddress address={ride.dropoff.address} lat={ride.dropoff.lat} lng={ride.dropoff.lng} language={language} /></p>
                        </div>
                      </div>

                      {ride.isShared && (
                        <div className="flex items-center gap-2 text-zinc-500 bg-white p-2 rounded-lg border border-zinc-100">
                          <Users size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{ride.passengers?.length || 1} Passengers (Shared Ride)</span>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          handleStartScheduledRide(ride);
                          setIsSidebarOpen(false);
                        }}
                        className="w-full bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {t.startRide}
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Background with Premium Theme */}
      <div className="absolute inset-0 z-0 bg-zinc-50 overflow-hidden">
        {/* Abstract Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        {/* Main Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50/20 to-blue-50/20" />
      </div>

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-white/90 via-white/40 to-transparent">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 sm:p-3 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm relative shrink-0"
          >
            <Menu size={18} className="sm:w-5 sm:h-5" />
            {myScheduledRides.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {myScheduledRides.length}
              </span>
            )}
          </button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl border border-zinc-200 overflow-hidden shadow-2xl shrink-0">
            <img src={profile?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=driver"} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h2 className="font-black tracking-tight font-display text-base sm:text-lg uppercase italic text-zinc-950 truncate">CampusMobility <span className="text-emerald-600 not-italic font-bold text-[9px] sm:text-[10px] ml-1 sm:ml-2 tracking-widest border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10">{t.driver}</span></h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 sm:p-3 bg-white border border-zinc-200 rounded-xl sm:rounded-2xl text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <Languages size={18} className="sm:w-5 sm:h-5" />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-40 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <button onClick={() => handleLanguageChange('en')} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-50 transition-colors ${language === 'en' ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-600'}`}>English</button>
                  <button onClick={() => handleLanguageChange('hi')} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-50 transition-colors ${language === 'hi' ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-600'}`}>हिन्दी (Hindi)</button>
                  <button onClick={() => handleLanguageChange('gu')} className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-zinc-50 transition-colors ${language === 'gu' ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-600'}`}>ગુજરાતી (Gujarati)</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className={`flex items-center gap-1.5 sm:gap-3 px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black transition-all text-xs sm:text-sm border shrink-0 ${
              isOnline 
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                : driverProfile && !driverProfile.documents?.verified
                  ? 'bg-zinc-50 text-zinc-300 border-zinc-100 opacity-50'
                  : 'bg-white text-zinc-400 border-zinc-200'
            }`}
          >
            <Power size={14} className="sm:w-4 sm:h-4" />
            <span>{isOnline ? t.online : t.offline}</span>
          </div>
        </div>
      </div>

      {/* Floating Stats - Bento Grid Style */}
      <div className="absolute top-24 sm:top-28 left-4 sm:left-6 right-4 sm:right-6 z-10 grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-panel-light p-5 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">{t.earningsToday}</span>
          </div>
          <p className="text-2xl font-black font-display tracking-tight">₹{stats.earnings.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
        </motion.div>
        
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="glass-panel-light p-5 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.totalRides}</span>
          </div>
          <p className="text-2xl font-black font-display tracking-tight">{stats.totalRides}</p>
        </motion.div>
      </div>

      {/* Main UI Overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
        <div className="max-w-xl mx-auto p-4 sm:p-6 pb-safe pointer-events-auto">
          
          {/* Restricted Access / Verification View */}
          {driverProfile && !driverProfile.documents?.verified ? (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-panel-light rounded-[40px] p-8 text-center space-y-6 shadow-2xl border border-amber-500/20"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                <ShieldAlert className="text-amber-600 animate-pulse" size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black font-display tracking-tight text-zinc-950 uppercase italic">{t.verificationRequired}</h3>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                  {t.underReview}
                </p>
              </div>

              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10">
                <div className="flex items-center justify-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-widest mb-1">
                  <AlertCircle size={14} /> {t.statusPending}
                </div>
                <p className="text-zinc-600 text-[10px] font-bold">{t.takesTime}</p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  {t.viewProfile}
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Default Dashboard State */}
              {!availableRequests.length && !currentTrip && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="glass-panel-light rounded-[32px] p-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto border border-zinc-100">
                    <Car className={isOnline ? "text-emerald-500 animate-pulse" : "text-zinc-300"} size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black font-display tracking-tight text-zinc-950">
                      {isOnline ? t.waitingRequests : t.youAreOffline}
                    </h3>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      {isOnline ? t.stayHighDemand : t.goOnlineEarn}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Incoming Requests List */}
              <AnimatePresence>
                {availableRequests.length > 0 && !currentTrip && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar light pr-2 mb-4"
                  >
                    {availableRequests.map((ride) => (
                      <motion.div 
                        key={ride.id}
                        layout
                        className="bg-white text-zinc-950 rounded-[32px] p-6 shadow-2xl space-y-6 relative overflow-hidden border border-zinc-100"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        
                        <div className="flex items-center justify-between relative">
                          <div className="space-y-1">
                            <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">{t.newRequest}</p>
                            <h2 className="text-2xl font-black font-display tracking-tight uppercase italic">
                              CampusMobility {categories.find(c => c.id === ride.rideType)?.name || t[ride.rideType.toLowerCase() as keyof typeof t] || ride.rideType}
                            </h2>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black font-display">₹{ride.fare.toFixed(0)}</p>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">{ride.distance}</p>
                          </div>
                        </div>

                        <div className="space-y-4 relative">
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-100" />
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shrink-0">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            </div>
                            <p className="font-bold text-sm text-zinc-500 truncate"><DynamicAddress address={ride.pickup.address} lat={ride.pickup.lat} lng={ride.pickup.lng} language={language} /></p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center shrink-0">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            </div>
                            <p className="font-bold text-sm text-zinc-950 truncate"><DynamicAddress address={ride.dropoff.address} lat={ride.dropoff.lat} lng={ride.dropoff.lng} language={language} /></p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative">
                          <button 
                            onClick={() => handleReject(ride.id)}
                            className="bg-zinc-100 py-4 rounded-2xl font-black text-zinc-400 hover:bg-zinc-200 transition-all text-sm uppercase tracking-widest"
                          >
                            {t.reject}
                          </button>
                          <button 
                            onClick={() => handleAccept(ride)}
                            className="bg-zinc-950 text-white py-4 rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl text-sm uppercase tracking-widest"
                          >
                            {t.accept}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scheduled Rides List */}
              <AnimatePresence>
                {scheduledRides.length > 0 && !currentTrip && isOnline && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{t.scheduledRides}</h3>
                      <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{scheduledRides.length}</span>
                    </div>
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar light pr-2">
                      {scheduledRides.map((ride) => (
                        <motion.div 
                          key={ride.id}
                          layout
                          className="bg-white border border-blue-100 rounded-[32px] p-6 shadow-xl space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-blue-500" />
                              <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest">
                                {t.scheduledFor} {ride.scheduledTime ? new Date(ride.scheduledTime).toLocaleString(language, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '...'}
                              </p>
                            </div>
                            <p className="text-xl font-black font-display">₹{ride.fare.toFixed(0)}</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                              </div>
                              <p className="font-bold text-xs text-zinc-500 truncate"><DynamicAddress address={ride.pickup.address} lat={ride.pickup.lat} lng={ride.pickup.lng} language={language} /></p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                                <div className="w-1 h-1 bg-red-500 rounded-full" />
                              </div>
                              <p className="font-bold text-xs text-zinc-950 truncate"><DynamicAddress address={ride.dropoff.address} lat={ride.dropoff.lat} lng={ride.dropoff.lng} language={language} /></p>
                            </div>
                          </div>

                          {ride.isShared && (
                            <div className="flex items-center gap-2 text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                              <Users size={14} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{ride.passengers?.length || 1} Passengers (Shared Ride)</span>
                            </div>
                          )}

                          <button 
                            onClick={() => handleAcceptScheduled(ride)}
                            className="w-full bg-blue-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                          >
                            {t.acceptScheduled}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Trip UI */}
              {currentTrip && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="glass-panel-light rounded-[40px] p-6 sm:p-8 space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-[20px] flex items-center justify-center overflow-hidden border border-zinc-100 shadow-xl">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTrip.riderId}`} alt="Rider" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-black font-display text-xl tracking-tight text-zinc-950">{currentTrip.riderName}</h3>
                        <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-1">
                          <Clock size={12} /> {distanceToTarget} • {etaToTarget}
                        </div>
                        {currentTrip.isShared && (
                          <div className="flex items-center gap-1 text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1">
                            <Users size={12} /> {currentTrip.passengers?.length || 1} Passengers
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          if (currentTrip.id && currentTrip.riderId) {
                            initiateCall(currentTrip.id, currentTrip.riderId, currentTrip.riderName || 'Rider');
                          }
                        }}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-emerald-50 border border-emerald-100 text-emerald-500"
                      >
                        <Phone size={20} />
                      </button>
                      <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-zinc-50 border border-zinc-100">
                        <Bell size={20} className="text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-6 rounded-[32px] space-y-4 border border-zinc-100">
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                        {tripStatus === 'to_pickup' ? t.pickupLocation : t.dropoffLocation}
                      </p>
                      <div className={`w-2 h-2 rounded-full ${tripStatus === 'to_pickup' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                    </div>
                    <p className="font-bold text-lg leading-snug text-zinc-950">
                      <DynamicAddress 
                        address={tripStatus === 'to_pickup' ? currentTrip.pickup.address : currentTrip.dropoff.address}
                        lat={tripStatus === 'to_pickup' ? currentTrip.pickup.lat : currentTrip.dropoff.lat}
                        lng={tripStatus === 'to_pickup' ? currentTrip.pickup.lng : currentTrip.dropoff.lng}
                        language={language}
                      />
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      if (currentTrip.status === 'accepted') {
                        handleArrivedAtPickup();
                        setShowOTPModal(true);
                      } else if (currentTrip.status === 'arrived') {
                        setShowOTPModal(true);
                      } else {
                        handleComplete();
                      }
                    }}
                    className="w-full bg-emerald-500/10 text-emerald-600 py-5 rounded-[32px] font-black text-lg premium-button shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                  >
                    {currentTrip.status === 'accepted' ? t.arrivedAtPickup : currentTrip.status === 'arrived' ? t.startRide : t.completeTrip}
                  </button>
                </motion.div>
              )}
            </>
          )}

        </div>
      </div>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOTPModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <ShieldCheck className="text-emerald-600" size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black font-display tracking-tight text-zinc-950 uppercase italic">Verify Ride OTP</h2>
                <p className="text-zinc-500 text-sm font-medium">
                  Ask the rider for their 6-digit permanent ride OTP to start the trip.
                </p>
              </div>

              <div className="space-y-4">
                <input 
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtpInput(val);
                    setOtpError(false);
                  }}
                  placeholder="0 0 0 0 0 0"
                  className={`w-full bg-zinc-50 border ${otpError ? 'border-red-500' : 'border-zinc-100'} rounded-2xl py-5 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-emerald-500 transition-all`}
                />
                {otpError && (
                  <p className="text-red-500 text-xs font-bold uppercase tracking-widest">Invalid OTP. Please try again.</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleVerifyOTP}
                  disabled={isVerifying || otpInput.length !== 6}
                  className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Start Ride'}
                </button>
                <button 
                  onClick={() => {
                    setShowOTPModal(false);
                    setOtpInput('');
                    setOtpError(false);
                  }}
                  className="w-full bg-zinc-100 text-zinc-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
