/**
 * CallOverlay.tsx
 *
 * Full-screen call overlay:
 *   - Ringing/Calling → custom UI with pulse animation
 *   - Connected → embedded JitsiMeeting iframe (handles audio/video)
 *
 * STABILITY FIXES (v3):
 *   - Config objects are memoized to prevent JitsiMeeting remounts
 *   - videoConferenceLeft is guarded with a "joined" flag to prevent premature endCall
 *   - readyToClose is ALSO guarded — only fires hangup if user has joined
 *   - A stable React key on JitsiMeeting prevents unmount/remount cycles
 *   - Added a 3s delay before rendering Jitsi to ensure Firestore state is settled
 *   - Fallback "End Call" button always visible above the iframe
 */

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, PhoneIncoming, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import { useAuth } from '../../contexts/AuthContext';
import { webRTCService } from '../../services/webrtcService';

// ── Pulsing ring animation ──────────────────────────────────────────────────
const PulseRing: React.FC<{ color: string }> = ({ color }) => (
  <>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: color }}
        initial={{ opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 1.8 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.6,
          ease: 'easeOut',
        }}
      />
    ))}
  </>
);

// ── Action button ───────────────────────────────────────────────────────────
interface ActionBtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: 'red' | 'green' | 'ghost';
}

const ActionBtn: React.FC<ActionBtnProps> = ({ onClick, icon, label, variant }) => {
  const colors: Record<string, string> = {
    red: 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30 text-white',
    green: 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 text-white',
    ghost: 'bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-colors ${colors[variant]}`}
      >
        {icon}
      </motion.button>
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

// ── WebRTC connected view ──────────────────────────────────────────────────
const WebRTCCallView: React.FC<{
  peerName: string;
  onHangup: () => void;
}> = ({ peerName, onHangup }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Handle remote stream
    webRTCService.onRemoteStreamAdd = (stream) => {
      console.log('[WebRTC UI] Remote stream added');
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
      }
    };

    // Handle connection state
    webRTCService.onConnectionStateChange = (state) => {
      setConnectionState(state);
    };

    return () => {
      webRTCService.onRemoteStreamAdd = null;
      webRTCService.onConnectionStateChange = null;
    };
  }, []);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webRTCService.toggleMute(newMuted);
  };

  const peerInitials = peerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const isConnecting = connectionState === 'new' || connectionState === 'connecting';
  const isFailed = connectionState === 'failed' || connectionState === 'disconnected';

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-between py-20">
      <audio ref={audioRef} autoPlay />

      {/* Peer Info */}
      <div className="flex flex-col items-center gap-6 mt-10">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 flex items-center justify-center text-4xl font-black text-white shadow-2xl border-4 border-white/10">
            {peerInitials || '?'}
          </div>
          {connectionState === 'connected' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-zinc-950 flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </motion.div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">{peerName}</h2>
          <div className="flex items-center justify-center gap-2">
            {isConnecting && <Loader2 size={16} className="text-emerald-400 animate-spin" />}
            <p className={`text-sm font-medium uppercase tracking-widest ${
              isFailed ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {isConnecting ? 'Connecting...' : isFailed ? 'Connection Failed' : 'Secure Call Connected'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-12 mb-10">
        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors border-2 ${
              isMuted 
                ? 'bg-red-500/20 border-red-500 text-red-500' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </motion.button>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onHangup}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20 hover:bg-red-400 transition-colors"
          >
            <PhoneOff size={32} />
          </motion.button>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Call</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-zinc-400">
            <Volume2 size={28} />
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Speaker</span>
        </div>
      </div>
    </div>
  );
};

WebRTCCallView.displayName = 'WebRTCCallView';

// ─────────────────────────────────────────────────────────────────────────────

export const CallOverlay: React.FC = () => {
  const {
    activeCall,
    isRinging,
    isCalling,
    isInCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useCall();

  const { user, profile } = useAuth();

  const show = isRinging || isCalling || isInCall;
  if (!show || !activeCall || !user) return null;

  // ── Connected → WebRTC ──────────────────────────────────────────────────
  if (isInCall) {
    const iAmCaller = activeCall.callerId === user.uid;
    const peerName = iAmCaller ? activeCall.receiverName : activeCall.callerName;

    return (
      <WebRTCCallView
        key={activeCall.id}
        peerName={peerName}
        onHangup={endCall}
      />
    );
  }

  // ── Ringing / Calling UI ──────────────────────────────────────────────────
  const iAmCaller = activeCall.callerId === user.uid;
  const peerName = iAmCaller ? activeCall.receiverName : activeCall.callerName;
  const peerInitials = peerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const statusLabel = isCalling ? 'Calling…' : 'Incoming Call';
  const pulseColor = isRinging ? '#10b981' : '#6366f1';

  return (
    <AnimatePresence>
      <motion.div
        key="call-overlay-ringing"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, #0f0f13 0%, #16161f 60%, #0c1a14 100%)',
        }}
      >
        {/* Top status */}
        <div className="w-full flex items-center px-6 pt-14 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              {isRinging ? 'Incoming' : 'Calling'}
            </span>
          </div>
        </div>

        {/* Avatar + Pulse */}
        <div className="flex flex-col items-center gap-6 flex-1 justify-center">
          <div className="relative flex items-center justify-center w-36 h-36">
            <PulseRing color={pulseColor} />
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${
                  isRinging ? '#059669' : '#4f46e5'
                } 0%, ${isRinging ? '#064e3b' : '#312e81'} 100%)`,
              }}
            >
              {peerInitials || '?'}
            </motion.div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-4xl font-black text-white tracking-tight">
              {peerName}
            </h2>
            <div className="flex items-center justify-center gap-2">
              {isRinging && (
                <PhoneIncoming
                  size={14}
                  className="text-emerald-400 animate-bounce"
                />
              )}
              <p
                className={`text-base font-semibold ${
                  isRinging ? 'text-emerald-400' : 'text-indigo-400'
                }`}
              >
                {statusLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="w-full px-12 pb-16">
          {isRinging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-end justify-between"
            >
              <ActionBtn
                onClick={rejectCall}
                icon={<PhoneOff size={26} />}
                label="Decline"
                variant="red"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <ActionBtn
                  onClick={acceptCall}
                  icon={<Phone size={26} />}
                  label="Accept"
                  variant="green"
                />
              </motion.div>
            </motion.div>
          )}

          {isCalling && (
            <div className="flex justify-center">
              <ActionBtn
                onClick={endCall}
                icon={<PhoneOff size={26} />}
                label="Cancel"
                variant="red"
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
