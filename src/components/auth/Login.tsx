// CampusMobility Login - Version 1.1.0
import React, { useState, useCallback, useEffect } from 'react';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, UserCredential } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { LogIn, Key, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import Logo from '../shared/Logo';
import { logSecurityEvent } from '../../services/auditService';
import TypewriterEffect from './TypewriterEffect';

const RANDOM_HEADERS = [
  { title: "Get moving", subtitle: "Sign in to start your journey" },
  { title: "By the students", subtitle: "For the students" },
  { title: "Made by RRU", subtitle: "With ❤️ and probably too much caffeine" },
  { title: "Adventure awaits", subtitle: "Or just the library. We don't judge." },
  { title: "Ready to roll?", subtitle: "Let's get you where you need to be." },
  { title: "Is it a bird? Is it a plane?", subtitle: "No, it's just your ride arriving." },
  { title: "Next stop:", subtitle: "Academic success (hopefully)." },
  { title: "Buckle up", subtitle: "Your degree is waiting." },
  { title: "Campus bounds", subtitle: "Taking you from A to B." },
  { title: "Skip the sweat", subtitle: "Let us do the walking." },
  { title: "Time is an illusion.", subtitle: "But your class starts in 5 minutes. Hurry up." },
  { title: "Running late?", subtitle: "We can't bend time, but we can drive." },
  { title: "The 8:59 AM Sprint", subtitle: "Let's get you there before the door locks." },
  { title: "Professor already there?", subtitle: "Time to slip in the back silently." },
  { title: "Attendance is mandatory.", subtitle: "Your walking is optional." },
  { title: "Snooze button regrets?", subtitle: "We've all been there. Hop in." },
  { title: "Don't run.", subtitle: "Riding is much more dignified." },
  { title: "Beat the clock", subtitle: "Campus rides on demand." },
  { title: "Out of time?", subtitle: "In to the cab." },
  { title: "Deadlines closer than they appear", subtitle: "So is your ride." },
  { title: "I think, therefore I am...", subtitle: "...late for my 9 AM lecture." },
  { title: "To be or not to be...", subtitle: "...on time. That is the question." },
  { title: "Schrödinger's Class", subtitle: "You are both present and absent until you arrive." },
  { title: "Nihilism is exhausting.", subtitle: "Take a ride and rest your legs instead." },
  { title: "If a tree falls in a forest...", subtitle: "...it still needs a driver to get to class." },
  { title: "What is the meaning of life?", subtitle: "Passing this semester." },
  { title: "Plato's Cave", subtitle: "Is just the basement study room. Let's get out." },
  { title: "Existential dread?", subtitle: "At least you don't have to walk." },
  { title: "We are stardust.", subtitle: "Stardust that really needs a ride right now." },
  { title: "The absurd is born...", subtitle: "...from walking across campus in the sun." },
  { title: "Why did the student cross the road?", subtitle: "To catch the campus ride, obviously." },
  { title: "My GPA might drop", subtitle: "But our drivers won't drop you." },
  { title: "Powered by coffee.", subtitle: "And electric motors." },
  { title: "Assignments due at 11:59", subtitle: "Your ride arrives at 11:50." },
  { title: "Group project meeting?", subtitle: "Don't be the one who's late." },
  { title: "Library all-nighter?", subtitle: "We'll get you back to bed." },
  { title: "Forgot your laptop charger?", subtitle: "Fastest U-turn on campus." },
  { title: "Mess food awaits", subtitle: "Beat the lunch queue." },
  { title: "Surviving on instant noodles?", subtitle: "At least your ride is premium." },
  { title: "Midterms incoming", subtitle: "Brace for impact." },
  { title: "Welcome to RRU", subtitle: "Where every minute counts." },
  { title: "Campus Mobility", subtitle: "Because running is for athletes." },
  { title: "The smart way", subtitle: "To navigate the campus." },
  { title: "Save your energy", subtitle: "You'll need it for the exams." },
  { title: "A ride for a ride", subtitle: "Share the journey." },
  { title: "Destination: Graduation", subtitle: "We're just helping you along the way." },
  { title: "No more long walks", subtitle: "Just smooth rides." },
  { title: "RRU's finest", subtitle: "Driven by the students." },
  { title: "Your campus, your ride", subtitle: "Take control of your time." },
  { title: "Less walking", subtitle: "More learning (or sleeping)." },
  { title: "You got this.", subtitle: "One lecture at a time." },
  { title: "Deep breaths.", subtitle: "Your ride is on the way." },
  { title: "Make today count.", subtitle: "Starting with a good ride." },
  { title: "Smile", subtitle: "You're doing great." },
  { title: "Bored in hostel room?", subtitle: "Walk pe chale?" },
];

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [showDriverCodeModal, setShowDriverCodeModal] = useState(false);
  const [driverCode, setDriverCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [headerContent, setHeaderContent] = useState(RANDOM_HEADERS[0]);

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * RANDOM_HEADERS.length);
    setHeaderContent(RANDOM_HEADERS[randomIdx]);
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);

    setIsVerifying(true);
    try {
      let userCred: UserCredential;
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          userCred = await signInWithCredential(auth, credential);
        } else {
          throw new Error("No ID token returned from Google Sign-In");
        }
      } else {
        userCred = await signInWithPopup(auth, googleProvider);
      }

      if (userCred && userCred.user) {
        await logSecurityEvent({
          action: 'User Login',
          userEmail: userCred.user.email || 'Unknown',
          userId: userCred.user.uid,
          details: `Logged in via Google. Intended role: ${localStorage.getItem('desiredRole') || 'rider'}`
        });
      }
    } catch (error: any) {
      const ignoredErrors = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', '12501'];
      if (!ignoredErrors.includes(error.code) && !ignoredErrors.includes(String(error.code))) {
        console.error("Login error:", error);
        setError(`Login failed: ${error.message || JSON.stringify(error)}`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDriverSubmit = async () => {
    // Simple hardcoded access code for MVP to prevent unauthorized driver signups
    if (driverCode.trim().toUpperCase() === 'CAMPUS2026') {
      setShowDriverCodeModal(false);
      setCodeError('');
      localStorage.setItem('desiredRole', 'driver');
      await handleGoogleLogin();
    } else {
      setCodeError('Invalid driver access code');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-6 overflow-hidden relative">
      {/* Lava Glowing Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-0">
        <motion.div
          animate={{
            x: ["0%", "20%", "-10%", "0%"],
            y: ["0%", "-20%", "10%", "0%"],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[120vw] h-[120vw] sm:w-[60vw] sm:h-[60vw] bg-emerald-500/20 blur-[80px] sm:blur-[120px] rounded-full mix-blend-screen"
        />
        <motion.div
          animate={{
            x: ["0%", "-25%", "15%", "0%"],
            y: ["0%", "25%", "-15%", "0%"],
            scale: [1, 1.3, 0.8, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[100vw] h-[100vw] sm:w-[50vw] sm:h-[50vw] bg-teal-500/20 blur-[80px] sm:blur-[100px] rounded-full mix-blend-screen -left-[20%] -top-[10%]"
        />
        <motion.div
          animate={{
            x: ["0%", "25%", "-20%", "0%"],
            y: ["0%", "20%", "-25%", "0%"],
            scale: [1, 0.9, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[140vw] h-[140vw] sm:w-[70vw] sm:h-[70vw] bg-cyan-600/20 blur-[100px] sm:blur-[120px] rounded-full mix-blend-screen -right-[20%] -bottom-[20%]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-zinc-950/60 to-black/90 pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm space-y-8 sm:space-y-10 text-center relative z-10"
      >
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block"
          >
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 drop-shadow-sm">Campus</h1>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter italic text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Mobility</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="min-h-[20px] flex justify-center"
          >
            <TypewriterEffect
              words={[
                { word: "Premium Mobility Platform" },
                { word: "Smart Campus Travel" },
                { word: "Your Daily Commute" }
              ]}
              typingSpeed={50}
              deletingSpeed={30}
              pauseDuration={2000}
              cursorColor="#34d399"
              cursorWidth={2}
              cursorHeight={100}
              font={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.3em", textTransform: "uppercase" }}
              textColor="#71717a"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* Spinning Green Border Wrapper */}
          <div className="relative rounded-[2.5rem] p-[1px] overflow-hidden">
            {/* Spinning conic-gradient border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-100%] rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 30%, rgba(52, 211, 153, 0.3) 40%, rgba(16, 185, 129, 0.9) 48%, rgba(52, 211, 153, 1) 50%, rgba(16, 185, 129, 0.9) 52%, rgba(52, 211, 153, 0.3) 60%, transparent 70%, transparent 100%)',
              }}
            />

            {/* Inner Liquid Glass Card */}
            <div
              className="relative p-6 sm:p-8 rounded-[2.45rem] overflow-hidden z-10"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(40px) saturate(140%) brightness(1.1)',
                WebkitBackdropFilter: 'blur(40px) saturate(140%) brightness(1.1)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Card Header — Random Quote */}
              <div className="mb-6 space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {headerContent.title}
                </h2>
                <p className="text-zinc-300 text-xs font-semibold">
                  {headerContent.subtitle}
                </p>
              </div>

              {/* Error State */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-2xl text-left mb-4">
                  {error}
                  <p className="mt-2 text-[10px] opacity-70">Tip: Ensure your domain is added to "Authorized Domains" in Firebase Console.</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Rider Button */}
                <button
                  onClick={async () => {
                    localStorage.setItem('desiredRole', 'rider');
                    await handleGoogleLogin();
                  }}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
                >
                  {isVerifying ? (
                    <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span className="text-[0.95rem]">
                    {isVerifying ? 'Verifying...' : 'Continue as Rider'}
                  </span>
                </button>

                {/* Driver Button */}
                <button
                  onClick={() => setShowDriverCodeModal(true)}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-2 bg-black/60 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <LogIn size={18} />
                  <span className="text-[0.95rem]">Continue as Driver</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium"
        >
          By continuing, you agree to our Terms &amp; Privacy Policy
        </motion.p>
      </motion.div>

      {/* Driver Access Code Modal */}
      <AnimatePresence>
        {showDriverCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-zinc-900/90 border border-zinc-800/80 w-full max-w-sm rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden"
            >
              {/* Modal Inner Accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

              <button
                onClick={() => {
                  setShowDriverCodeModal(false);
                  setCodeError('');
                  setDriverCode('');
                }}
                className="absolute top-6 right-6 p-2 bg-zinc-800/50 rounded-full text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700/50 transition-all"
              >
                <X size={16} />
              </button>

              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                <Key size={24} />
              </div>

              <h3 className="text-2xl font-bold text-zinc-100 mb-2">Driver Access</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mb-8 font-medium">
                Please enter the secure access code provided by administration to continue.
              </p>

              <div className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Enter Access Code"
                    value={driverCode}
                    onChange={(e) => {
                      setDriverCode(e.target.value);
                      setCodeError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleDriverSubmit()}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-50 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all uppercase tracking-wider font-semibold shadow-inner"
                  />
                  {codeError && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs mt-2 font-medium px-1">
                      {codeError}
                    </motion.p>
                  )}
                </div>

                <button
                  onClick={handleDriverSubmit}
                  className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl p-[1px] group/btn active:scale-[0.98] transition-all"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-80 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  <div className="relative w-full py-4 bg-emerald-600/90 group-hover/btn:bg-emerald-600 text-white font-bold rounded-2xl transition-colors">
                    Verify &amp; Login
                  </div>
                </button>

                <p className="text-[10px] text-zinc-500 text-center font-medium">
                  Existing drivers: You still need to enter the code to log in on a new device.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
