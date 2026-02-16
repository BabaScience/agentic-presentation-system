/* ═══════════════════════════════════════════════════════════════
   AudioPlaybackManager — Singleton for all TTS audio playback.
   
   Architecture:
   - Single shared AudioContext (created on first user gesture)
   - One active source at a time — new audio cancels previous
   - Clean stop/cancel API for voice toggle, skip, reset
   - Handles browser autoplay policy via resume-on-play
   ═══════════════════════════════════════════════════════════════ */

type PlaybackState = 'idle' | 'playing' | 'stopping';

export class AudioPlaybackManager {
  private static instance: AudioPlaybackManager | null = null;

  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private state: PlaybackState = 'idle';
  private onStateChange: ((playing: boolean) => void) | null = null;

  // Queue: if audio arrives while decoding, replace (latest wins)
  private pendingBuffer: ArrayBuffer | null = null;
  private decoding = false;

  // Time tracking for word synchronization
  private startTime: number | null = null;
  private audioDuration: number = 0;
  private animationFrameId: number | null = null;
  private onTimeUpdate: ((currentTime: number) => void) | null = null;

  private constructor() {}

  static getInstance(): AudioPlaybackManager {
    if (!AudioPlaybackManager.instance) {
      AudioPlaybackManager.instance = new AudioPlaybackManager();
    }
    return AudioPlaybackManager.instance;
  }

  /** Register a callback for play/stop state changes */
  setStateCallback(cb: (playing: boolean) => void): void {
    this.onStateChange = cb;
  }

  /** Register a callback for time updates during playback */
  setTimeUpdateCallback(cb: (currentTime: number) => void): void {
    this.onTimeUpdate = cb;
  }

  /** Get current playback time in milliseconds */
  getCurrentTime(): number {
    if (!this.startTime || this.state !== 'playing') return 0;
    const elapsed = performance.now() - this.startTime;
    return Math.min(elapsed, this.audioDuration);
  }

  /** Ensure AudioContext exists and is resumed (call after user gesture) */
  private async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Handle browser autoplay policy — context starts suspended
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play an MP3 buffer. Cancels any currently playing audio first.
   * Latest-wins semantics: if called while decoding, the new buffer replaces the pending one.
   */
  async play(mp3Buffer: ArrayBuffer): Promise<void> {
    // If we're currently decoding, just replace the pending buffer
    if (this.decoding) {
      this.pendingBuffer = mp3Buffer;
      this.stopCurrent();
      return;
    }

    this.stopCurrent();
    this.decoding = true;
    this.pendingBuffer = null;

    try {
      const ctx = await this.ensureContext();
      const audioBuffer = await ctx.decodeAudioData(mp3Buffer.slice(0)); // slice to avoid detached buffer

      // Check if a newer buffer arrived while we were decoding
      if (this.pendingBuffer) {
        const next = this.pendingBuffer;
        this.pendingBuffer = null;
        this.decoding = false;
        return this.play(next);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
          this.stopTimeUpdateLoop();
          this.setState('idle');
        }
      };

      this.currentSource = source;
      this.startTime = performance.now();
      this.audioDuration = audioBuffer.duration * 1000; // Convert to ms
      this.setState('playing');
      source.start();
      this.startTimeUpdateLoop();
    } catch (err) {
      console.warn('[AudioPlayback] Decode/play error:', err);
      this.setState('idle');
    } finally {
      this.decoding = false;
    }
  }

  /** Stop currently playing audio immediately */
  stop(): void {
    this.pendingBuffer = null;
    this.stopTimeUpdateLoop();
    this.startTime = null;
    this.stopCurrent();
  }

  /** Returns whether audio is currently playing */
  isPlaying(): boolean {
    return this.state === 'playing';
  }

  /** Teardown — release AudioContext (e.g. on session reset) */
  destroy(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  // ── Internal ────────────────────────────────────────────

  private stopCurrent(): void {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    if (this.state === 'playing') {
      this.setState('idle');
    }
  }

  private setState(s: PlaybackState): void {
    this.state = s;
    this.onStateChange?.(s === 'playing');
  }

  private startTimeUpdateLoop(): void {
    const update = () => {
      if (this.state === 'playing') {
        const currentTime = this.getCurrentTime();
        this.onTimeUpdate?.(currentTime);

        if (currentTime < this.audioDuration) {
          this.animationFrameId = requestAnimationFrame(update);
        } else {
          this.stopTimeUpdateLoop();
        }
      }
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopTimeUpdateLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
