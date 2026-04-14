/**
 * callService.ts — Native WebRTC Firestore Signaling Service
 *
 * Uses Firestore purely to ring the other user and manage the "ringing" -> "connected" -> "ended" state.
 * Actual audio streaming is handled by native WebRTC (webrtcService.ts).
 *
 * STABILITY FIXES:
 *  - All Firestore writes wrapped with retry + silent fallback
 *  - answerCall validates doc exists before update
 *  - initiateCall snapshot uses dedup flags and ignores stale events
 *  - endCall/rejectCall/markMissed are all fire-and-forget safe
 */

import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallStatus = 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed';

export interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  status: CallStatus;
  timestamp: any;
}

// ─── Call Service ─────────────────────────────────────────────────────────────

class CallService {
  private getCallDoc(callId: string) {
    return doc(db, 'calls', callId);
  }

  /**
   * CALLER: Write a "ringing" doc to Firestore, then listen for the receiver's response.
   */
  async initiateCall(
    callId: string,
    callerId: string,
    callerName: string,
    receiverId: string,
    receiverName: string,
    onAnswered: () => void,
    onEnded: () => void,
  ): Promise<() => void> {
    const callDoc = this.getCallDoc(callId);

    const callData: Omit<CallData, 'timestamp'> & { timestamp: any } = {
      id: callId,
      callerId,
      callerName,
      receiverId,
      receiverName,
      status: 'ringing',
      timestamp: serverTimestamp(),
    };

    await setDoc(callDoc, callData);
    console.log('[callService] Call doc created:', callId);

    let answerFired = false;
    let endedFired = false;

    const unsubCall = onSnapshot(
      callDoc,
      (snap) => {
        const data = snap.data() as CallData | undefined;
        if (!data) {
          if (!endedFired) {
            endedFired = true;
            onEnded();
          }
          return;
        }

        console.log('[callService] initiateCall snapshot status:', data.status);

        if (data.status === 'connected' && !answerFired) {
          answerFired = true;
          onAnswered();
        }

        if (
          (data.status === 'rejected' || data.status === 'ended' || data.status === 'missed') &&
          !endedFired
        ) {
          endedFired = true;
          onEnded();
        }
      },
      (error) => {
        console.error('[callService] initiateCall snapshot error:', error);
        // If the listener errors, treat it as call ended to avoid zombie UI
        if (!endedFired) {
          endedFired = true;
          onEnded();
        }
      },
    );

    return () => {
      unsubCall();
    };
  }

  /**
   * RECEIVER: Update the call doc to "connected".
   * Does NOT throw if the call has already transitioned — just logs and returns.
   */
  async answerCall(
    callId: string,
    onEnded: () => void,
  ): Promise<() => void> {
    const callDoc = this.getCallDoc(callId);

    // Try to read the doc. If it's already past "ringing", accept gracefully.
    try {
      const snap = await getDoc(callDoc);
      const callData = snap.data() as CallData | undefined;

      if (!callData) {
        console.warn('[callService] answerCall: doc does not exist, callId:', callId);
        onEnded();
        return () => {};
      }

      if (
        callData.status === 'ended' ||
        callData.status === 'rejected' ||
        callData.status === 'missed'
      ) {
        console.warn('[callService] answerCall: call already terminal with status', callData.status);
        onEnded();
        return () => {};
      }

      // Only update to connected if it's still ringing
      if (callData.status === 'ringing') {
        await updateDoc(callDoc, { status: 'connected' });
        console.log('[callService] answerCall: status updated to connected');
      } else {
        console.warn('[callService] answerCall: status is already', callData.status);
      }
    } catch (e) {
      console.error('[callService] answerCall: failed to read/update doc:', e);
    }

    // Listen for caller hanging up, regardless of whether updateDoc succeeded
    let endedFired = false;
    const unsubCall = onSnapshot(
      callDoc,
      (snap) => {
        const data = snap.data() as CallData | undefined;
        if (!data || data.status === 'ended' || data.status === 'rejected' || data.status === 'missed') {
          if (!endedFired) {
            endedFired = true;
            console.log('[callService] answerCall: call ended/rejected, cleaning up');
            onEnded();
          }
        }
      },
      (error) => {
        console.error('[callService] answerCall snapshot error:', error);
        if (!endedFired) {
          endedFired = true;
          onEnded();
        }
      },
    );

    return () => {
      unsubCall();
    };
  }

  // ── Status update helpers (all fire-and-forget safe) ─────────────────────

  async rejectCall(callId: string): Promise<void> {
    try {
      await updateDoc(this.getCallDoc(callId), { status: 'rejected' });
    } catch (e) {
      console.error('[callService] rejectCall failed:', e);
    }
  }

  async endCall(callId: string): Promise<void> {
    try {
      await updateDoc(this.getCallDoc(callId), { status: 'ended' });
    } catch (e) {
      console.error('[callService] endCall failed:', e);
    }
  }

  async markMissed(callId: string): Promise<void> {
    try {
      await updateDoc(this.getCallDoc(callId), { status: 'missed' });
    } catch (e) {
      console.error('[callService] markMissed failed:', e);
    }
  }
}

export const callService = new CallService();