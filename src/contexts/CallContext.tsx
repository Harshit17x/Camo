/**
 * CallContext.tsx — Jitsi Call Signaling Context
 *
 * Manages the full lifecycle of a call session via Firestore flags:
 *   incoming detection → ringing → accept/reject → connected → end
 *
 * The actual audio is handled by JitsiMeeting in CallOverlay.
 *
 * STABILITY FIXES (v3):
 *  - Incoming call listener has onError handler to log index issues
 *  - cleanupCall uses a proper lock flag instead of fragile 200ms timer
 *  - acceptCall transitions ref BEFORE Firestore write to prevent race with query listener
 *  - The "removed" event in incoming listener is gated on status still being "ringing"
 *    AND the ref not having been updated by acceptCall yet
 *  - Added debounce protection against multiple rapid initiateCall invocations
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { callService, CallData } from '../services/callService';
import { webRTCService } from '../services/webrtcService';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { ringtoneManager } from '../utils/audioUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallContextType {
  activeCall: CallData | null;
  isInCall: boolean;
  isRinging: boolean;
  isCalling: boolean;
  initiateCall: (rideId: string, receiverId: string, receiverName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [activeCall, setActiveCall] = useState<CallData | null>(null);

  // Stable refs to avoid stale closures
  const unsubFirestoreRef = useRef<(() => void) | null>(null);
  const missedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCallRef = useRef<CallData | null>(null);
  const isCleaningUpRef = useRef(false);
  const initiateInProgressRef = useRef(false);

  // Keep ref in sync with state — but we also set it manually in critical paths
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // ── AudioContext priming on first gesture ─────────────────────────────────
  useEffect(() => {
    const prime = () => {
      ringtoneManager.prime();
      window.removeEventListener('click', prime);
      window.removeEventListener('touchstart', prime);
      window.removeEventListener('keydown', prime);
    };
    window.addEventListener('click', prime, { once: true });
    window.addEventListener('touchstart', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('click', prime);
      window.removeEventListener('touchstart', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  // ── Core cleanup (idempotent, properly locked) ────────────────────────────
  const cleanupCall = useCallback(() => {
    // Use a proper lock — only ONE cleanup can run at a time
    if (isCleaningUpRef.current) {
      console.log('[Call] cleanupCall skipped — already cleaning up');
      return;
    }
    isCleaningUpRef.current = true;
    console.log('[Call] cleanupCall executing');

    if (missedTimerRef.current) {
      clearTimeout(missedTimerRef.current);
      missedTimerRef.current = null;
    }

    ringtoneManager.stopRing();
    webRTCService.cleanup();

    if (unsubFirestoreRef.current) {
      unsubFirestoreRef.current();
      unsubFirestoreRef.current = null;
    }

    activeCallRef.current = null;
    setActiveCall(null);
    initiateInProgressRef.current = false;

    // Reset lock after a short delay so future calls can proceed
    // 500ms is long enough to absorb any trailing snapshot events
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 500);
  }, []);

  useEffect(() => {
    if (!user?.uid && activeCallRef.current) {
      cleanupCall();
    }
  }, [user?.uid, cleanupCall]);

  // ── Global listener: detect incoming calls for this user ──────────────────
  useEffect(() => {
    if (!user?.uid) return;

    console.log('[Call] Setting up incoming call listener for', user.uid);

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing'),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
            // Skip if we're already handling a call or cleaning up
            if (activeCallRef.current || isCleaningUpRef.current) {
              console.log('[Call] Incoming call skipped — already in a call or cleaning up');
              continue;
            }

            const data = { ...change.doc.data(), id: change.doc.id } as CallData;
            console.log('[Call] Incoming call from', data.callerName, '- callId:', data.id);
            activeCallRef.current = data;
            setActiveCall(data);
            ringtoneManager.startIncomingRing();
          }

          if (change.type === 'removed') {
            const removedId = change.doc.id;
            const current = activeCallRef.current;

            // Only tear down if:
            // 1. We're tracking THIS specific call
            // 2. The call is still in "ringing" state (not yet accepted)
            // This prevents the query filter's "removed" event from killing an accepted call
            if (
              current?.id === removedId &&
              current?.status === 'ringing'
            ) {
              console.log('[Call] Caller cancelled or call expired, callId:', removedId);
              cleanupCall();
            } else {
              console.log('[Call] Ignored removed event for callId:', removedId,
                '(current status:', current?.status, ')');
            }
          }
        }
      },
      (error) => {
        // CRITICAL: This error fires if the composite index is missing
        console.error('[Call] Incoming call listener ERROR:', error.message);
        console.error('[Call] If you see "requires an index", deploy the Firestore composite index!');
        console.error('[Call] Run: npx firebase-tools deploy --only firestore:indexes');
      },
    );

    return () => {
      console.log('[Call] Tearing down incoming call listener');
      unsub();
    };
  }, [user?.uid, cleanupCall]);

  // ── Initiate call (CALLER) ────────────────────────────────────────────────
  const initiateCall = useCallback(
    async (rideId: string, receiverId: string, receiverName: string) => {
      if (!user) {
        console.warn('[Call] Cannot initiate: missing user');
        return;
      }
      if (activeCallRef.current) {
        console.warn('[Call] Cannot initiate: already in a call');
        return;
      }
      if (initiateInProgressRef.current) {
        console.warn('[Call] Cannot initiate: initiation already in progress');
        return;
      }

      initiateInProgressRef.current = true;
      const safeRideId = rideId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const callId = `${safeRideId}_${Date.now()}`;
      const callerName =
        profile?.displayName ||
        profile?.phoneNumber ||
        profile?.email ||
        'Camo User';

      const callData: CallData = {
        id: callId,
        callerId: user.uid,
        callerName,
        receiverId,
        receiverName,
        status: 'ringing',
        timestamp: new Date(),
      };

      // Show overlay immediately
      activeCallRef.current = callData;
      setActiveCall(callData);
      ringtoneManager.startOutgoingRing();
      console.log('[Call] Initiating call, callId:', callId, 'to:', receiverName);

      try {
        const unsub = await callService.initiateCall(
          callId,
          user.uid,
          callerName,
          receiverId,
          receiverName,
          // onAnswered
          () => {
            console.log('[Call] Call answered by receiver');
            ringtoneManager.stopRing();
            
            // Start WebRTC as Caller
            webRTCService.startCall(callId).catch(err => {
              console.error('[Call] WebRTC startCall failed:', err);
            });

            // Manually sync ref AND state to "connected"
            const updated = { ...callData, status: 'connected' as const };
            activeCallRef.current = updated;
            setActiveCall(updated);
            if (missedTimerRef.current) {
              clearTimeout(missedTimerRef.current);
              missedTimerRef.current = null;
            }
          },
          // onEnded
          () => {
            console.log('[Call] Call ended by other side or error');
            cleanupCall();
          },
        );

        unsubFirestoreRef.current = unsub;

        // 45s missed-call timeout
        missedTimerRef.current = setTimeout(async () => {
          if (
            activeCallRef.current?.id === callId &&
            activeCallRef.current?.status === 'ringing'
          ) {
            console.log('[Call] Missed call timeout, callId:', callId);
            await callService.markMissed(callId).catch(console.error);
            cleanupCall();
          }
        }, 45_000);
      } catch (err) {
        console.error('[Call] initiateCall failed:', err);
        initiateInProgressRef.current = false;
        cleanupCall();
      }
    },
    [user, profile?.displayName, profile?.phoneNumber, profile?.email, cleanupCall],
  );

  // ── Accept call (RECEIVER) ────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call?.id) {
      console.warn('[Call] acceptCall: no active call');
      return;
    }

    console.log('[Call] Accepting call, callId:', call.id);
    ringtoneManager.stopRing();

    // Transition to connected IMMEDIATELY so:
    // 1. The overlay stays visible and switches to Jitsi view
    // 2. The incoming call listener's "removed" event (because doc no longer
    //    matches status=='ringing') sees status=='connected' and doesn't clean up
    const updated = { ...call, status: 'connected' as const };
    activeCallRef.current = updated;
    setActiveCall(updated);

    try {
      // Start WebRTC as Receiver
      webRTCService.answerCall(call.id).catch(err => {
        console.error('[Call] WebRTC answerCall failed:', err);
      });

      const unsub = await callService.answerCall(
        call.id,
        () => {
          console.log('[Call] Call ended after accept');
          cleanupCall();
        },
      );
      unsubFirestoreRef.current = unsub;
    } catch (err) {
      console.error('[Call] acceptCall error:', err);
      callService.rejectCall(call.id).catch(() => {});
      cleanupCall();
    }
  }, [cleanupCall]);

  // ── Reject call (RECEIVER) ────────────────────────────────────────────────
  const rejectCall = useCallback(async () => {
    const call = activeCallRef.current;
    console.log('[Call] Rejecting call, callId:', call?.id);
    ringtoneManager.stopRing();
    if (call?.id) await callService.rejectCall(call.id).catch(() => {});
    cleanupCall();
  }, [cleanupCall]);

  // ── End call (either side) ────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const call = activeCallRef.current;
    console.log('[Call] Ending call, callId:', call?.id);
    ringtoneManager.stopRing();
    if (call?.id) await callService.endCall(call.id).catch(() => {});
    cleanupCall();
  }, [cleanupCall]);

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isInCall = activeCall?.status === 'connected';
  const isRinging =
    activeCall?.status === 'ringing' && activeCall?.receiverId === user?.uid;
  const isCalling =
    activeCall?.status === 'ringing' && activeCall?.callerId === user?.uid;

  return (
    <CallContext.Provider
      value={{
        activeCall,
        isInCall,
        isRinging,
        isCalling,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
};
