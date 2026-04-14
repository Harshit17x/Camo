import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { CapacitorPhoneHint } from '@ak3696/capacitor-phone-hint';

export default function PhoneNumberPrompt() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAndroid = Capacitor.getPlatform() === 'android';

  useEffect(() => {
    const triggerPhoneHint = async () => {
      if (isAndroid) {
        try {
          const result = await CapacitorPhoneHint.getPhoneNumber();
          if (result.phoneNumber) {
            // result.phoneNumber usually comes as +91XXXXXXXXXX
            setPhoneNumber(result.phoneNumber.replace('+91', ''));
          }
        } catch (err) {
          console.log('Phone hint cancelled or failed:', err);
        }
      }
    };

    triggerPhoneHint();
  }, [isAndroid]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        phoneNumber: fullPhone,
        updatedAt: new Date().toISOString()
      });
      // The profile listener in AuthContext will detect this and set needsPhoneNumber to false
    } catch (err: any) {
      console.error('Error updating phone number:', err);
      setError('Failed to save phone number. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="relative space-y-6">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
            <Phone size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-zinc-50 italic">Last Step!</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We need your phone number to coordinate rides and send important updates.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 px-1">
                Phone Number
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold border-r border-zinc-800 pr-3">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="XXXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneNumber(val);
                    setError(null);
                  }}
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-4 py-4 text-zinc-50 font-bold focus:outline-none focus:border-emerald-500 transition-all text-lg tracking-widest placeholder:text-zinc-800"
                />
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-500 text-xs font-medium px-1 flex items-center gap-1"
                >
                  <Info size={12} /> {error}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || phoneNumber.length < 10}
              className="w-full flex items-center justify-center gap-3 bg-zinc-50 text-zinc-950 font-black py-4 rounded-2xl hover:bg-white transition-all active:scale-[0.98] shadow-lg disabled:opacity-20 disabled:grayscale"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  Complete Setup <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-2 px-2 py-3 bg-zinc-950/50 rounded-xl">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-tight">
              Verified by CampusMobility Security
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
