/* ═══════════════════════════════════════════════════════════════
   Scene Ready Queue — Ordered Promise-Based Scene Delivery
   Allows the present loop to await scenes in order while
   the pipeline prepares them concurrently out of order.
   ═══════════════════════════════════════════════════════════════ */

import type { PreparedScene } from '../../shared/types';

export class SceneReadyQueue {
  private scenes = new Map<number, PreparedScene>();
  private waiters = new Map<number, {
    resolve: (scene: PreparedScene | null) => void;
  }>();
  private cancelled = false;

  markReady(index: number, prepared: PreparedScene): void {
    if (this.cancelled) return;

    this.scenes.set(index, prepared);

    const waiter = this.waiters.get(index);
    if (waiter) {
      this.waiters.delete(index);
      waiter.resolve(prepared);
    }
  }

  waitForScene(index: number, signal?: AbortSignal): Promise<PreparedScene | null> {
    if (this.cancelled) return Promise.resolve(null);

    const existing = this.scenes.get(index);
    if (existing) return Promise.resolve(existing);

    return new Promise<PreparedScene | null>((resolve) => {
      if (signal?.aborted) {
        resolve(null);
        return;
      }

      this.waiters.set(index, { resolve });

      signal?.addEventListener('abort', () => {
        this.waiters.delete(index);
        resolve(null);
      }, { once: true });
    });
  }

  isReady(index: number): boolean {
    return this.scenes.has(index);
  }

  cancel(): void {
    this.cancelled = true;
    for (const [index, waiter] of this.waiters) {
      waiter.resolve(null);
    }
    this.waiters.clear();
  }

  get readyCount(): number {
    return this.scenes.size;
  }
}
