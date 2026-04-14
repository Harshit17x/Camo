import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
} from 'firebase/firestore';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private unsubCall: (() => void) | null = null;
  private unsubRemoteCandidates: (() => void) | null = null;

  public onRemoteStreamAdd: ((stream: MediaStream) => void) | null = null;
  public onRemoteStreamRemove: (() => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;

  // 1. Fetch TURN config from your existing Node backend
  private async getIceServers(): Promise<RTCConfiguration> {
    try {
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';

      const apiBaseURL = import.meta.env.VITE_API_URL || '';
      
      const res = await fetch(`${apiBaseURL}/api/turn-credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Could not fetch turn credentials');
      const iceServers = await res.json();
      return { iceServers };
    } catch (e) {
      console.warn('[WebRTC] STUN/TURN fetch failed, relying on default Google STUN:', e);
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };
    }
  }

  // 2. Initialize the stream and RTCPeerConnection
  public async initConnection(): Promise<void> {
    console.log('[WebRTC] Initiating Connection...');
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.remoteStream = new MediaStream();

    const config = await this.getIceServers();
    this.peerConnection = new RTCPeerConnection(config);

    // Push local audio tracks to the peer connection
    this.localStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // Listen for remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.onRemoteStreamAdd && this.remoteStream) {
        this.onRemoteStreamAdd(this.remoteStream);
      }
    };

    // Monitor Connection State
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      console.log('[WebRTC] Connection State:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  // 3. CALLER: Generate Offer and listen for Receiver Answer
  public async startCall(callId: string): Promise<void> {
    if (!this.peerConnection) await this.initConnection();
    const callDoc = doc(db, 'calls', callId);
    
    // Setup ICE Candidates gathering
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    this.peerConnection!.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    // Create Offer
    const offerDescription = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await updateDoc(callDoc, { offer });

    // Listen for Answer
    this.unsubCall = onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!this.peerConnection?.currentRemoteDescription && data?.answer) {
        console.log('[WebRTC] Answer received, setting remote description');
        const answerDescription = new RTCSessionDescription(data.answer);
        this.peerConnection.setRemoteDescription(answerDescription);
      }
    });

    // Listen for Remote ICE Candidates
    this.unsubRemoteCandidates = onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection?.addIceCandidate(candidate).catch(e => console.error('[WebRTC] addIceCandidate failed:', e));
        }
      });
    });
  }

  // 4. RECEIVER: Accept Offer and generate Answer
  public async answerCall(callId: string): Promise<void> {
    if (!this.peerConnection) await this.initConnection();
    const callDoc = doc(db, 'calls', callId);
    
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    this.peerConnection!.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    // Listen for Offer changes (incase caller hasn't written it yet)
    this.unsubCall = onSnapshot(callDoc, async (snapshot) => {
      const data = snapshot.data();
      if (!this.peerConnection?.currentRemoteDescription && data?.offer) {
        console.log('[WebRTC] Offer received, setting remote description');
        const offerDescription = new RTCSessionDescription(data.offer);
        await this.peerConnection!.setRemoteDescription(offerDescription);

        // Create Answer
        const answerDescription = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answerDescription);

        const answer = {
          sdp: answerDescription.sdp,
          type: answerDescription.type,
        };

        await updateDoc(callDoc, { answer });
      }
    });

    // Listen for Remote ICE Candidates
    this.unsubRemoteCandidates = onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.peerConnection?.addIceCandidate(candidate).catch(e => console.error('[WebRTC] addIceCandidate failed:', e));
        }
      });
    });
  }

  public toggleMute(isMuted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }

  // 5. Tear Down
  public cleanup(): void {
    console.log('[WebRTC] Cleaning up WebRTC...');
    if (this.unsubCall) this.unsubCall();
    if (this.unsubRemoteCandidates) this.unsubRemoteCandidates();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.onRemoteStreamAdd = null;
    this.onRemoteStreamRemove = null;
    this.onConnectionStateChange = null;
  }
}

export const webRTCService = new WebRTCService();