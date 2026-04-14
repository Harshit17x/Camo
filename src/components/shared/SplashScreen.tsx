import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 overflow-hidden">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            y: [0, -15, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="mb-8"
        >
          <Logo className="w-24 h-24 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="text-4xl font-bold tracking-tighter italic bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            CampusMobility
          </h1>
          <p className="text-zinc-400 text-sm tracking-widest uppercase font-medium">
            Premium Ride Sharing
          </p>
        </motion.div>

        {/* Loading bar */}
        <motion.div 
          className="mt-12 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 2, 
              ease: "easeInOut",
              repeat: Infinity
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
