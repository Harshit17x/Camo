import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, ClipboardList, Users, MessageSquare, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavProps {
  activeTab?: 'home' | 'trips' | 'support' | 'profile' | 'share';
}

export default function BottomNav({ activeTab: propActiveTab }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on route if not provided
  const getActiveTab = () => {
    if (propActiveTab) return propActiveTab;
    const path = location.pathname;
    if (path === '/' || path === '/rider-home') return 'home';
    if (path === '/history') return 'trips';
    if (path === '/support') return 'support';
    if (path === '/profile') return 'profile';
    if (path === '/ride-sharing') return 'share';
    return 'home';
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'trips', icon: ClipboardList, label: 'History', path: '/history' },
    { id: 'share', icon: Users, label: 'Share', path: '/ride-sharing', isCenter: true },
    { id: 'support', icon: MessageSquare, label: 'Support', path: '/support' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <motion.div 
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] isolation-isolate"
      style={{ width: 'calc(100vw - 40px)', maxWidth: '360px' }}
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.3,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <div className="relative h-[68px] rounded-[32px] overflow-visible">
        
        {/* Primary Glass Surface - no video for mobile perf */}
        <div className="absolute inset-0 z-[1] rounded-[32px] bg-black/80 backdrop-blur-[20px]" />

        {/* Layer 3: Top Edge Rim Light */}
        <div 
          className="absolute top-0 left-[10%] right-[10%] h-[1px] z-[2] opacity-60"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, transparent)'
          }}
        />

        {/* Layer 4: Neutral External Border and Inner Highlights */}
        <div className="absolute inset-0 z-[3] rounded-[32px] border border-white/[0.08] pointer-events-none shadow-[inset_0_2px_0_rgba(255,255,255,0.04)]" />

        {/* Layer 5: Spatial Shadow */}
        <div className="absolute inset-0 -z-10 rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.70),0_4px_12px_rgba(0,0,0,0.50)]" />

        {/* Content Container */}
        <div className="relative z-10 flex items-center justify-around h-full px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            if (tab.isCenter) {
              return (
                <div key={tab.id} className="relative flex flex-col items-center">
                  <motion.button
                    onClick={() => navigate(tab.path)}
                    className="relative flex-shrink-0 -mt-8 group outline-none"
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    {/* Hero Media Circle (56x56) */}
                    <div className="w-14 h-14 rounded-full relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-white/15 bg-[#09090b]">
                      {/* Deep internal shadow for a concave look */}
                      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/5 to-transparent" />
                      
                      {/* Centered White Icon */}
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <Icon 
                          size={22} 
                          className={`${isActive && tab.id === 'share' ? 'text-yellow-400 drop-shadow-[0_2px_10px_rgba(250,204,21,0.4)]' : 'text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]'}`} 
                          strokeWidth={2.5} 
                        />
                      </div>
                    </div>

                    {/* Outer Neutral Ring (Minimalist) */}
                    <div className="absolute inset-[-1.5px] border border-white/[0.08] rounded-full z-30 pointer-events-none" />
                  </motion.button>

                  {/* Share Label - Neutral */}
                  <span className={`mt-1 text-[8px] font-dm font-medium tracking-[0.10em] uppercase transition-colors duration-200 ${isActive && tab.id === 'share' ? 'text-yellow-400/60' : 'text-white/35'}`}>
                    {tab.label}
                  </span>
                </div>
              );
            }

            return (
              <motion.button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center justify-center min-w-[54px] py-1 gap-[3px] rounded-full group outline-none"
                whileTap={{
                  scale: 0.90,
                  transition: { type: 'spring', stiffness: 500, damping: 15 }
                }}
              >
                {/* Active Minimalist Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="navActiveBg"
                    className="absolute inset-0 bg-white/[0.06] border border-white/[0.08] rounded-[20px] -z-10 w-[110%] left-[-5%]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}

                {/* Top Emerald Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className={`absolute -top-[12px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full ${tab.id === 'share' ? 'bg-yellow-400' : 'bg-[#22C55E]'}`}
                  />
                )}

                <motion.div
                  className={`transition-colors duration-200 ${isActive ? (tab.id === 'share' ? 'text-yellow-400' : 'text-[#22C55E]') : 'text-white/28 group-hover:text-white/55'}`}
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>

                <span className={`text-[8px] font-dm font-medium tracking-[0.10em] uppercase transition-colors duration-200 ${isActive ? (tab.id === 'share' ? 'text-yellow-400' : 'text-[#22C55E]') : 'text-white/20 group-hover:text-white/40'}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
