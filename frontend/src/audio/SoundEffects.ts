/* ═══════════════════════════════════════════════════════════════
   Sound Effects System

   Web Audio API-based sound effects synchronized with animations.
   Generates procedural sounds for:
   - Scene transitions (whoosh)
   - Element reveals (pop, bloom)
   - Process steps (tick, click)
   - Completions (chime)
   ═══════════════════════════════════════════════════════════════ */

export class SoundEffects {
  private static instance: SoundEffects | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): SoundEffects {
    if (!SoundEffects.instance) {
      SoundEffects.instance = new SoundEffects();
    }
    return SoundEffects.instance;
  }

  /** Initialize audio context (call after user gesture) */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // Default volume
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // ═══ SOUND GENERATORS ═══

  /** Scene transition whoosh */
  async playTransition(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // White noise source for whoosh
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for whoosh character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    // Envelope for whoosh
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Frequency sweep
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  /** Element reveal pop */
  async playPop(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';

    // Quick frequency sweep for pop
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Element reveal bloom (softer) */
  async playBloom(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Process step tick */
  async playTick(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Process step click */
  async playClick(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /** Completion chime */
  async playChime(): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Three note chord
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.5);
    });
  }

  /** Flow sound (continuous data movement) */
  async playFlow(duration: number = 0.5): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(400, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.setValueAtTime(0.1, now + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /** Cleanup */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.masterGain = null;
    }
  }
}
