import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../firebase';
import { Globe, ChevronRight, Home, History, Users, HelpCircle, User, CreditCard, Bell, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

// --- CinematicScramble: Smooth scramble + depth animation ---
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function CinematicScramble({ text, className = '', style = {} }: { text: string; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = React.useState('');
  const [phase, setPhase] = React.useState<'scramble' | 'done'>('scramble');
  const frameRef = React.useRef(0);
  const startRef = React.useRef(0);

  React.useEffect(() => {
    if (!text) return;

    const totalDuration = 1200;
    const resolveStart = 300;

    const seed = text.split('').map(() => Math.floor(Math.random() * SCRAMBLE_CHARS.length));

    startRef.current = performance.now();
    setPhase('scramble');

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);

      if (progress >= 1) {
        setDisplay(text);
        setPhase('done');
        return;
      }

      let result = '';
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          result += ' ';
          continue;
        }

        const charThreshold = resolveStart / totalDuration + (i / text.length) * 0.5;

        if (progress > charThreshold) {
          result += text[i];
        } else {
          const cycleSpeed = 4;
          const idx = (seed[i] + Math.floor(elapsed / (50 + i * 8)) * cycleSpeed) % SCRAMBLE_CHARS.length;
          result += SCRAMBLE_CHARS[idx];
        }
      }

      setDisplay(result);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text]);

  return (
    <motion.p
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
      }}
      transition={{
        duration: 1.0,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.5 },
        filter: { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
    >
      {display}
    </motion.p>
  );
}

export function Profile() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const language = (profile?.language as 'en' | 'hi' | 'gu') || 'en';
  
  const [ridesCount, setRidesCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Sora:wght@100..800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const targetRides = 24;
    const targetDistance = 87;

    let rAF: number;
    const updateCounters = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setRidesCount(Math.floor(targetRides * easeOut));
      setDistance(Math.floor(targetDistance * easeOut));

      if (progress < 1) rAF = requestAnimationFrame(updateCounters);
    };
    rAF = requestAnimationFrame(updateCounters);
    return () => cancelAnimationFrame(rAF);
  }, [profile]);

  const handleLanguageChange = async (newLang: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { language: newLang });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Sign out of CampusMobility?')) {
      auth.signOut();
    }
  };

  return (
    <>
      <div 
        ref={scrollContainerRef}
        className="fixed inset-0 bg-zinc-950 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 20px))' }}
      >
      {/* ════════ HEADER ════════ */}
      <motion.div 
        className="px-5 pt-24 pb-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div 
          className="relative w-28 h-28 mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="relative z-10 w-full h-full rounded-full border border-white/[0.05] overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1c1c1e] to-[#121213] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover grayscale-[0.2]" />
            ) : (
              <span className="text-3xl font-bold text-zinc-600 tracking-widest">
                {profile?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'P'}
              </span>
            )}
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-3"
        >
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
        </motion.p>
        
        <div className="mb-1 pointer-events-none">
          <CinematicScramble 
            text={profile?.displayName || 'Raj Tak'}
            className="text-white font-bold tracking-tight"
            style={{
              fontSize: '42px',
              lineHeight: 1.0,
              margin: 0,
              fontFamily: '"Sora", sans-serif',
            }}
          />
        </div>

        <p className="text-zinc-600 text-xs font-medium opacity-50 mb-5">{user?.email || 'user@campus.edu'}</p>

        <div className="flex items-center gap-2 justify-center px-4 py-1 rounded-full border border-zinc-900 bg-zinc-950/50">
          <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
          <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.25em]">
            {profile?.role === 'driver' ? 'DRV CONSOLE' : 'RIDER PASS'}
          </span>
        </div>
      </motion.div>

      {/* ════════ ACTIVITY ════════ */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="px-5 mt-4">
          <motion.button 
            onClick={() => navigate('/history')}
            className="group relative w-full bg-gradient-to-br from-[#1c1c1e] to-[#121213] rounded-2xl border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-5 flex items-center justify-between transition-all duration-300"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-center shrink-0">
                <History size={18} className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-bold tracking-normal">Journey Records</div>
                <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70">
                  {ridesCount} Total • {distance} KM
                </div>
              </div>
            </div>
            
            <ChevronRight size={16} className="text-zinc-800 group-hover:text-zinc-400 transition-colors" />
          </motion.button>
        </div>
      </motion.div>

      {/* ════════ LANGUAGE ════════ */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="px-5 mt-8 mb-4">
          <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Regional</h3>
        </div>
        <div className="px-5 flex gap-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'en', label: 'English' },
            { id: 'hi', label: 'हिन्दी' },
            { id: 'gu', label: 'ગુજરાતી' }
          ].map(lang => {
            const isActive = language === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                className={`px-5 py-2.5 rounded-xl shrink-0 transition-all text-xs font-bold border ${
                  isActive 
                    ? 'bg-white text-black border-white shadow-[0_4px_24px_rgba(255,255,255,0.15)]' 
                    : 'bg-gradient-to-br from-[#1c1c1e] to-[#121213] border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] text-zinc-600 hover:text-white transition-colors'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ════════ WALLET ════════ */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="px-5 mt-6 mb-4">
          <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Wallet</h3>
        </div>
        <div className="px-5">
          <div className="group relative bg-gradient-to-br from-[#1c1c1e] to-[#121213] rounded-2xl border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-5 flex items-center justify-between transition-colors duration-300">
            <div className="relative z-10">
              <div className="text-white font-bold text-xl tracking-tight">₹0.00</div>
              <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-wider mt-1 opacity-70">Balance</div>
            </div>
            <button className="relative z-10 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-4 py-2 rounded-full border border-emerald-500/20 active:opacity-70 transition-opacity">
              Add Money
            </button>
          </div>
        </div>
      </motion.div>

      {/* ════════ SETTINGS ════════ */}
      {/* ════════ SETTINGS ════════ */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="px-5 mt-8 mb-4">
          <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Settings</h3>
        </div>
        <div className="px-5">
          <div className="bg-gradient-to-br from-[#1c1c1e] to-[#121213] rounded-2xl border border-white/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
            {[
              { id: 'profile', icon: User, label: 'Account Profile', onClick: () => alert('Account profile editing will be available soon.') },
              { id: 'payment', icon: CreditCard, label: 'Payment Methods', subLabel: 'Personal • UPI', onClick: () => alert('Payment method configuration will be available soon.') },
              { id: 'theme', icon: Globe, label: 'Light Mode', isToggle: true, value: isLightMode, onClick: () => setIsLightMode(!isLightMode) },
              { id: 'notifications', icon: Bell, label: 'App Notifications', isToggle: true, value: notificationsEnabled, onClick: () => setNotificationsEnabled(!notificationsEnabled) },
              { id: 'help', icon: HelpCircle, label: 'Support & Help', onClick: () => navigate('/support') },
            ].map((item, i, arr) => (
              <motion.button 
                key={item.id}
                onClick={item.onClick}
                whileTap={{ scale: item.isToggle ? 1 : 0.98 }}
                className={`group w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-200 ${
                  i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center shrink-0">
                  <item.icon size={16} className="text-zinc-500" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm tracking-tight">{item.label}</div>
                  {item.subLabel && <div className="text-zinc-700 text-[10px] font-bold uppercase tracking-wider mt-0.5">{item.subLabel}</div>}
                </div>
                {item.isToggle ? (
                  <div className={`w-10 h-5 rounded-full relative flex items-center px-1 transition-colors ${item.value ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                    <motion.div 
                      className="w-3 h-3 rounded-full bg-white shadow-sm"
                      animate={{ x: item.value ? 20 : 0 }}
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                ) : (
                  <ChevronRight size={14} className="text-zinc-800" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ════════ SIGN OUT ════════ */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="px-5 mt-auto pt-8 mb-24">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 rounded-2xl transition-all group">
            <LogOut size={16} className="text-red-500" />
            <span className="text-red-500 font-bold text-xs uppercase tracking-widest">Sign Out of Account</span>
          </button>
        </div>
        <div className="text-zinc-800 text-[9px] font-bold uppercase tracking-[0.2em] text-center mb-8 opacity-40">
          CampusMobility v1.1.0-Release
        </div>
      </motion.div>

      </div>

      {/* Shared Bottom Navigation */}
      <BottomNav activeTab="profile" />
    </>
  );
}
