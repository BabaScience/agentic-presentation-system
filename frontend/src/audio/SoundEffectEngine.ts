/* ═══════════════════════════════════════════════════════════════
   SoundEffectEngine — Procedural Web Audio sound effects.
   
   All sounds generated via OscillatorNode / noise buffers.
   No external audio files needed.
   
   Sounds:
   - reveal:     soft pop (sine 800Hz, 50ms decay)
   - connect:    subtle ping (sine 1200Hz, echo)
   - transition: gentle whoosh (bandpass noise sweep)
   - chime:      warm two-tone (C5 + E5 sequence)
   ═══════════════════════════════════════════════════════════════ */

export class SoundEffectEngine {
  private static instance: SoundEffectEngine | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _enabled = true;

  private constructor() {}

  static getInstance(): SoundEffectEngine {
    if (!SoundEffectEngine.instance) {
      SoundEffectEngine.instance = new SoundEffectEngine();
    }
    return SoundEffectEngine.instance;
  }

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  private async ensure(): Promise<{ ctx: AudioContext; master: GainNode }> {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return { ctx: this.ctx, master: this.masterGain! };
  }

  // ── Node Reveal: soft pop ──────────────────────────────
  async playReveal(): Promise<void> {
    if (!this._enabled) return;
    try {
      const { ctx, master } = await this.ensure();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch { /* swallow */ }
  }

  // ── Edge Connect: subtle ping ──────────────────────────
  async playConnect(): Promise<void> {
    if (!this._enabled) return;
    try {
      const { ctx, master } = await this.ensure();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      // Slight delay for echo feel
      const delay = ctx.createDelay(0.3);
      delay.delayTime.value = 0.08;
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.1;

      osc.connect(gain).connect(master);
      gain.connect(delay).connect(echoGain).connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch { /* swallow */ }
  }

  // ── Scene Transition: gentle whoosh ────────────────────
  async playTransition(): Promise<void> {
    if (!this._enabled) return;
    try {
      const { ctx, master } = await this.ensure();
      const now = ctx.currentTime;
      const duration = 0.25;

      // White noise source
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Bandpass filter that sweeps
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.6);
      filter.frequency.exponentialRampToValueAtTime(300, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      source.connect(filter).connect(gain).connect(master);
      source.start(now);
      source.stop(now + duration);
    } catch { /* swallow */ }
  }

  // ── Comprehension Check: warm chime ────────────────────
  async playChime(): Promise<void> {
    if (!this._enabled) return;
    try {
      const { ctx, master } = await this.ensure();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25]; // C5, E5

      for (let i = 0; i < notes.length; i++) {
        const t = now + i * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 0.35);
      }
    } catch { /* swallow */ }
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
