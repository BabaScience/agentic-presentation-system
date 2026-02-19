/* ═══════════════════════════════════════════════════════════════
   SceneExecutor — Executes AgentCommand[] against EnvironmentAPI
   Three dispatch mechanisms: timed queue, sequential queue, sync markers.
   NO DOM, NO React.
   ═══════════════════════════════════════════════════════════════ */

import type {
  AgentCommand,
  SyncMarker,
  StoryboardScene,
  WordTimestamp,
  Vector2,
  ConnectionStyle,
  AnchorPosition,
} from '@shared/types';
import type { SpringConfig } from '@shared/types';
import { SYNC_MARKER_TOLERANCE_MS } from '@shared/constants';
import { EnvironmentAPI } from './EnvironmentAPI';

// ── Types ────────────────────────────────────────────────────

export type ExecutorState = 'idle' | 'executing' | 'completed' | 'aborted';

export interface SceneExecutorOptions {
  onComplete?: () => void;
  onCommandError?: (method: string, error: unknown) => void;
}

interface TimedCommand {
  offsetMs: number;
  command: AgentCommand;
  fired: boolean;
}

interface SyncMarkerEntry {
  wordIndex: number;
  command: AgentCommand;
  fired: boolean;
}

// ── SceneExecutor ────────────────────────────────────────────

export class SceneExecutor {
  private env: EnvironmentAPI;
  private options: SceneExecutorOptions;
  private state: ExecutorState = 'idle';

  private timedQueue: TimedCommand[] = [];
  private sequentialQueue: AgentCommand[] = [];
  private syncMarkerQueue: SyncMarkerEntry[] = [];

  private elapsedMs = 0;
  private totalCommands = 0;
  private executedCommands = 0;
  private sequentialDone = false;
  private wordTimestamps: WordTimestamp[] = [];

  constructor(env: EnvironmentAPI, options?: SceneExecutorOptions) {
    this.env = env;
    this.options = options ?? {};
  }

  // ── Public API ─────────────────────────────────────────────

  execute(
    scene: StoryboardScene,
    syncMarkers?: SyncMarker[],
    wordTimestamps?: WordTimestamp[],
  ): void {
    if (this.state === 'executing') {
      this.abort();
    }

    this.state = 'executing';
    this.elapsedMs = 0;
    this.executedCommands = 0;
    this.sequentialDone = false;
    this.timedQueue = [];
    this.sequentialQueue = [];
    this.syncMarkerQueue = [];
    this.wordTimestamps = wordTimestamps ?? [];

    // Create checkpoint at scene start (Law 1)
    this.env.createCheckpoint(`scene:${scene.id}`);

    // Partition commands into queues
    for (const cmd of scene.agentCommands) {
      if (typeof cmd.timing === 'number') {
        this.timedQueue.push({ offsetMs: cmd.timing, command: cmd, fired: false });
      } else {
        this.sequentialQueue.push(cmd);
      }
    }

    // Sort timed queue by offset
    this.timedQueue.sort((a, b) => a.offsetMs - b.offsetMs);

    // Build sync marker queue
    if (syncMarkers) {
      for (const marker of syncMarkers) {
        this.syncMarkerQueue.push({
          wordIndex: marker.wordIndex,
          command: marker.command,
          fired: false,
        });
      }
      this.syncMarkerQueue.sort((a, b) => a.wordIndex - b.wordIndex);
    }

    this.totalCommands =
      this.timedQueue.length +
      this.sequentialQueue.length +
      this.syncMarkerQueue.length;

    // Process sequential queue asynchronously
    this.processSequentialCommands();
  }

  tick(deltaMs: number): void {
    if (this.state !== 'executing') return;

    this.elapsedMs += deltaMs;

    // Fire timed commands whose offset <= elapsed
    for (const entry of this.timedQueue) {
      if (entry.fired) continue;
      if (entry.offsetMs <= this.elapsedMs) {
        entry.fired = true;
        this.dispatchCommand(entry.command);
      }
    }

    this.checkCompletion();
  }

  updateNarrationTime(currentTimeMs: number): void {
    if (this.state !== 'executing') return;

    for (const entry of this.syncMarkerQueue) {
      if (entry.fired) continue;

      // Look up the start time for this word
      const wordStartMs = this.getWordStartMs(entry.wordIndex);
      if (wordStartMs === undefined) continue;

      if (currentTimeMs >= wordStartMs - SYNC_MARKER_TOLERANCE_MS) {
        entry.fired = true;
        this.dispatchCommand(entry.command);
      }
    }

    this.checkCompletion();
  }

  abort(): void {
    this.state = 'aborted';
    this.timedQueue = [];
    this.sequentialQueue = [];
    this.syncMarkerQueue = [];
  }

  getState(): ExecutorState {
    return this.state;
  }

  getProgress(): number {
    if (this.totalCommands === 0) return 1;
    return this.executedCommands / this.totalCommands;
  }

  // ── Private: Sequential processing ─────────────────────────

  private async processSequentialCommands(): Promise<void> {
    const queue = [...this.sequentialQueue];

    for (const cmd of queue) {
      if (this.state !== 'executing') return;

      if (cmd.timing === 'await-previous') {
        await this.dispatchCommand(cmd);
      } else {
        // 'immediate' — fire without waiting
        this.dispatchCommand(cmd);
      }
    }

    this.sequentialDone = true;
    this.checkCompletion();
  }

  // ── Private: Command dispatch ──────────────────────────────

  private async dispatchCommand(cmd: AgentCommand): Promise<void> {
    try {
      await this.invokeMethod(cmd.method, cmd.args);
      this.executedCommands++;
    } catch (err: unknown) {
      this.executedCommands++;
      if (this.options.onCommandError) {
        this.options.onCommandError(cmd.method, err);
      }
    }
  }

  private async invokeMethod(
    method: string,
    args: Record<string, unknown>,
  ): Promise<void> {
    switch (method) {
      case 'createElement':
        this.env.createElement({
          id: args['id'] as string,
          type: args['type'] as 'box' | 'circle' | 'arrow' | 'text' | 'code' | 'diagram' | 'label' | 'connection' | 'group',
          position: args['position'] as Vector2,
          properties: args['properties'] as Record<string, unknown> | undefined,
          visible: args['visible'] as boolean | undefined,
          opacity: args['opacity'] as number | undefined,
          zIndex: args['zIndex'] as number | undefined,
        });
        return;

      case 'destroyElement':
        this.env.destroyElement(args['id'] as string);
        return;

      case 'updateElement':
        this.env.updateElement(
          args['id'] as string,
          args['changes'] as Record<string, unknown>,
        );
        return;

      case 'showElement':
        await this.env.showElement(
          args['id'] as string,
          args['durationMs'] as number | undefined,
        );
        return;

      case 'hideElement':
        await this.env.hideElement(
          args['id'] as string,
          args['durationMs'] as number | undefined,
        );
        return;

      case 'moveTo':
        await this.env.moveTo(
          args['id'] as string,
          args['position'] as Vector2,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'moveBy':
        await this.env.moveBy(
          args['id'] as string,
          args['delta'] as Vector2,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'scaleTo':
        await this.env.scaleTo(
          args['id'] as string,
          args['scale'] as number,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'rotateTo':
        await this.env.rotateTo(
          args['id'] as string,
          args['angle'] as number,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'fadeIn':
        await this.env.fadeIn(
          args['id'] as string,
          args['durationMs'] as number | undefined,
        );
        return;

      case 'fadeOut':
        await this.env.fadeOut(
          args['id'] as string,
          args['durationMs'] as number | undefined,
        );
        return;

      case 'zoomTo':
        await this.env.zoomTo(
          args['level'] as number,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'panTo':
        await this.env.panTo(
          args['position'] as Vector2,
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'focusOn':
        await this.env.focusOn(
          args['elementId'] as string,
          args['padding'] as number | undefined,
        );
        return;

      case 'resetView':
        await this.env.resetView(
          args['spring'] as Partial<SpringConfig> | undefined,
        );
        return;

      case 'highlight':
        this.env.highlight(
          args['elementId'] as string,
          args['color'] as string | undefined,
        );
        return;

      case 'addLabel':
        this.env.addLabel(
          args['elementId'] as string,
          args['text'] as string,
          args['anchor'] as AnchorPosition,
        );
        return;

      case 'drawConnection':
        this.env.drawConnection(
          args['fromElementId'] as string,
          args['toElementId'] as string,
          args['style'] as ConnectionStyle | undefined,
        );
        return;

      case 'createCheckpoint':
        this.env.createCheckpoint(args['name'] as string);
        return;

      case 'restoreCheckpoint':
        await this.env.restoreCheckpoint(args['id'] as string);
        return;

      case 'defineParameter':
        this.env.defineParameter(
          args['name'] as string,
          args['config'] as { type: 'integer' | 'float' | 'boolean' | 'string' | 'enum'; value: unknown; default: unknown; min?: number; max?: number },
        );
        return;

      case 'setParameter':
        this.env.setParameter(
          args['name'] as string,
          args['value'] as unknown,
        );
        return;

      default:
        throw new Error(`Unknown command method: "${method}"`);
    }
  }

  // ── Private: Helpers ───────────────────────────────────────

  private getWordStartMs(wordIndex: number): number | undefined {
    if (wordIndex < 0 || wordIndex >= this.wordTimestamps.length) {
      return undefined;
    }
    return this.wordTimestamps[wordIndex].start;
  }

  private checkCompletion(): void {
    if (this.state !== 'executing') return;

    const timedDone = this.timedQueue.every((e) => e.fired);
    const syncDone = this.syncMarkerQueue.every((e) => e.fired);

    if (timedDone && this.sequentialDone && syncDone) {
      this.state = 'completed';
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    }
  }
}
