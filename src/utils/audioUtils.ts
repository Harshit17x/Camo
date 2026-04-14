/**
 * audioUtils.ts
 *
 * Synthesized phone-grade ringtones via Web Audio API.
 *
 * KEY FIX: AudioContext can only be created/resumed AFTER a user gesture.
 * We create the context lazily and provide a `prime()` method that should
 * be called once in response to any user interaction (e.g. the app loads
 * and user taps anywhere). This primes the context so subsequent ring
 * calls in Firestore snapshot callbacks can actually play.
 */

type RingType = 'incoming' | 'outgoing';

class RingtoneManager {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;
  private currentType: RingType | null = null;

  // ── Priming ──────────────────────────────────────────────────────────────
  /** Call this once in response to a user gesture to unlock Web Audio. */
  prime(): void {
    if (this.ctx) return;
    try {
      const Cls = window.AudioContext || (window as any).webkitAudioContext;
      if (!Cls) return;
      this.ctx = new Cls();
      // Immediately suspend — we just want the context created.
      if (this.ctx.state === 'running') this.ctx.suspend();
    } catch (_) { /* not supported */ }
  }

  private async ensureRunning(): Promise<boolean> {
    if (!this.ctx) {
      // Last-ditch attempt — may be blocked without user gesture
      try {
        const Cls = window.AudioContext || (window as any).webkitAudioContext;
        if (!Cls) return false;
        this.ctx = new Cls();
      } catch (_) { return false; }
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (_) { return false; }
    }
    return this.ctx.state === 'running';
  }

  // ── Incoming ring: two sharp chirps, repeating every 2 s ─────────────────
  async startIncomingRing(): Promise<void> {
    if (this.isPlaying && this.currentType === 'incoming') return;
    this.stopRing();
    this.isPlaying = true;
    this.currentType = 'incoming';

    const ok = await this.ensureRunning();
    if (!ok || !this.ctx) { this.isPlaying = false; return; }

    const playChirp = (ctx: AudioContext) => {
      const now = ctx.currentTime;
      [[600, now], [900, now + 0.12], [600, now + 0.24], [900, now + 0.36]].forEach(
        ([freq, t]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq as number;
          gain.gain.setValueAtTime(0, t as number);
          gain.gain.linearRampToValueAtTime(0.45, (t as number) + 0.04);
          gain.gain.setValueAtTime(0.45, (t as number) + 0.08);
          gain.gain.linearRampToValueAtTime(0, (t as number) + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t as number);
          osc.stop((t as number) + 0.12);
        },
      );
    };

    const tick = async () => {
      if (!this.isPlaying) return;
      const ok = await this.ensureRunning();
      if (ok && this.ctx) playChirp(this.ctx);
    };

    await tick();
    this.intervalId = setInterval(tick, 2200);
  }

  // ── Outgoing ring: 440 + 480 Hz (US PSTN ringback) ───────────────────────
  async startOutgoingRing(): Promise<void> {
    if (this.isPlaying && this.currentType === 'outgoing') return;
    this.stopRing();
    this.isPlaying = true;
    this.currentType = 'outgoing';

    const ok = await this.ensureRunning();
    if (!ok || !this.ctx) { this.isPlaying = false; return; }

    const playRingback = (ctx: AudioContext) => {
      const now = ctx.currentTime;
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + 1.9);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.0);
      });
    };

    const tick = async () => {
      if (!this.isPlaying) return;
      const ok = await this.ensureRunning();
      if (ok && this.ctx) playRingback(this.ctx);
    };

    await tick();
    // US pattern: 2 s ring, 4 s silence → 6 s interval
    this.intervalId = setInterval(tick, 6000);
  }

  stopRing(): void {
    this.isPlaying = false;
    this.currentType = null;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringtoneManager = new RingtoneManager();
