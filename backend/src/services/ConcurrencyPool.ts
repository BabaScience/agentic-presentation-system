/* ═══════════════════════════════════════════════════════════════
   Concurrency Pool — Bounded Async Task Execution
   Limits concurrent Claude API and TTS calls to prevent
   rate limiting while maximizing parallel throughput.
   ═══════════════════════════════════════════════════════════════ */

import {
  CONCURRENCY_POOL_CLAUDE_MAX,
  CONCURRENCY_POOL_TTS_MAX,
  CONCURRENCY_POOL_TOTAL_MAX,
} from '../../shared/types';

export type PoolTaskType = 'claude' | 'elevenlabs';

interface QueuedTask<T = any> {
  type: PoolTaskType;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

export class ConcurrencyPool {
  private queue: QueuedTask[] = [];
  private activeTotal = 0;
  private activeClaude = 0;
  private activeTTS = 0;
  private cancelled = false;

  private maxTotal: number;
  private maxClaude: number;
  private maxTTS: number;

  constructor(config?: { maxTotal?: number; maxClaude?: number; maxTTS?: number }) {
    this.maxTotal = config?.maxTotal ?? CONCURRENCY_POOL_TOTAL_MAX;
    this.maxClaude = config?.maxClaude ?? CONCURRENCY_POOL_CLAUDE_MAX;
    this.maxTTS = config?.maxTTS ?? CONCURRENCY_POOL_TTS_MAX;
  }

  enqueue<T>(type: PoolTaskType, fn: () => Promise<T>): Promise<T> {
    if (this.cancelled) {
      return Promise.reject(new Error('Pool has been cancelled'));
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ type, fn, resolve, reject });
      this.drain();
    });
  }

  cancelAll(): void {
    this.cancelled = true;
    for (const task of this.queue) {
      task.reject(new Error('Pool cancelled'));
    }
    this.queue = [];
  }

  /**
   * Reset the pool so it can accept new tasks after a cancelAll().
   * Active tasks are allowed to finish; only the cancelled flag and queue are reset.
   */
  reset(): void {
    this.cancelled = false;
    this.queue = [];
  }

  get stats() {
    return {
      activeTotal: this.activeTotal,
      activeClaude: this.activeClaude,
      activeTTS: this.activeTTS,
      queued: this.queue.length,
      cancelled: this.cancelled,
    };
  }

  private canRun(type: PoolTaskType): boolean {
    if (this.activeTotal >= this.maxTotal) return false;
    if (type === 'claude' && this.activeClaude >= this.maxClaude) return false;
    if (type === 'elevenlabs' && this.activeTTS >= this.maxTTS) return false;
    return true;
  }

  private drain(): void {
    if (this.cancelled) return;

    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i];
      if (this.canRun(task.type)) {
        this.queue.splice(i, 1);
        i--;
        this.run(task);
      }
    }
  }

  private async run<T>(task: QueuedTask<T>): Promise<void> {
    this.activeTotal++;
    if (task.type === 'claude') this.activeClaude++;
    else this.activeTTS++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeTotal--;
      if (task.type === 'claude') this.activeClaude--;
      else this.activeTTS--;
      this.drain();
    }
  }
}
