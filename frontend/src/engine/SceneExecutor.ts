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
  ExecutionResult,
  CommandResult,
} from '@shared/types';
import type { SpringConfig } from '@shared/types';
import { SYNC_MARKER_TOLERANCE_MS } from '@shared/constants';
import { EnvironmentAPI } from './EnvironmentAPI';
import { getMapper } from './MapperRegistry';

// ── Types ────────────────────────────────────────────────────

export type ExecutorState = 'idle' | 'executing' | 'completed' | 'aborted';

export interface SceneExecutorOptions {
  onComplete?: () => void;
  /** Called when a command fails. Return 'skip' to continue, 'abort' to stop. Default: 'skip'. */
  onCommandError?: (cmd: AgentCommand, error: Error) => 'skip' | 'abort';
}

const ALLOWED_METHODS = new Set([
  'createElement', 'destroyElement', 'showElement', 'hideElement', 'updateElement',
  'moveTo', 'moveBy', 'scaleTo', 'rotateTo', 'fadeIn', 'fadeOut',
  'zoomTo', 'panTo', 'focusOn', 'resetView', 'highlight', 'addLabel',
  'drawConnection', 'removeAnnotation', 'createCheckpoint', 'restoreCheckpoint',
  'setParameter', 'defineParameter', 'bindElementToParameter',
]);

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
  private currentNarrationTimeMs = 0;

  /** Tracks element IDs created during the current scene for cross-scene cleanup. */
  private currentSceneElementIds: Set<string> = new Set();
  private currentSceneId: string | null = null;

  private completedCommands: CommandResult[] = [];
  private resolveCompletion: ((result: ExecutionResult) => void) | null = null;

  constructor(env: EnvironmentAPI, options?: SceneExecutorOptions) {
    this.env = env;
    this.options = options ?? {};
  }

  // ── Public API ─────────────────────────────────────────────

  execute(
    scene: StoryboardScene,
    syncMarkers?: SyncMarker[],
    wordTimestamps?: WordTimestamp[],
  ): Promise<ExecutionResult> {
    const completionPromise = new Promise<ExecutionResult>((resolve) => {
      this.resolveCompletion = resolve;
    });

    if (this.state === 'executing') {
      this.abort();
    }

    // Cross-scene cleanup: destroy elements created by the previous scene.
    // Law 1 compliance: only scene-owned elements are removed; elements
    // placed by the agent outside of scene scripts persist.
    this.cleanupPreviousScene();

    this.state = 'executing';
    this.elapsedMs = 0;
    this.executedCommands = 0;
    this.completedCommands = [];
    this.sequentialDone = false;
    this.timedQueue = [];
    this.sequentialQueue = [];
    this.syncMarkerQueue = [];
    this.wordTimestamps = wordTimestamps ?? [];
    this.currentNarrationTimeMs = 0;
    this.currentSceneId = scene.id;
    this.currentSceneElementIds = new Set();

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

    return completionPromise;
  }

  tick(deltaMs: number): void {
    if (this.state !== 'executing') return;

    this.elapsedMs += deltaMs;

    // Fire timed commands whose offset <= elapsed
    for (const entry of this.timedQueue) {
      if (entry.fired) continue;
      if (entry.offsetMs <= this.elapsedMs) {
        entry.fired = true;
        void this.dispatchCommand(entry.command);
      }
    }

    this.checkCompletion();
  }

  updateNarrationTime(currentTimeMs: number): void {
    if (this.state !== 'executing') return;
    this.currentNarrationTimeMs = currentTimeMs;
    this.sweepSyncMarkers(currentTimeMs);
    this.checkCompletion();
  }

  /** Update word timestamps — call when agent_audio_meta arrives after scene_change. */
  setWordTimestamps(timestamps: WordTimestamp[]): void {
    this.wordTimestamps = timestamps;
    // Retroactive sweep: fire pending sync markers whose words
    // have already been passed by the current narration time.
    if (this.currentNarrationTimeMs > 0 && timestamps.length > 0) {
      this.sweepSyncMarkers(this.currentNarrationTimeMs);
    }
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

      const action =
        cmd.timing === 'await-previous'
          ? await this.dispatchCommand(cmd)
          : await this.dispatchCommand(cmd);
      if (action === 'abort') return;
    }

    this.sequentialDone = true;
    this.checkCompletion();
  }

  // ── Private: Command dispatch ──────────────────────────────

  private async dispatchCommand(cmd: AgentCommand): Promise<'continue' | 'abort'> {
    if (!ALLOWED_METHODS.has(cmd.method)) {
      const err = new Error(`Method "${cmd.method}" is not in ALLOWED_METHODS whitelist`);
      this.completedCommands.push({ command: cmd, status: 'skipped', error: err });
      const handler = this.options.onCommandError;
      const action = handler ? handler(cmd, err) : 'skip';
      if (action === 'abort') {
        this.resolveWithAbort(cmd, err);
        return 'abort';
      }
      return 'continue';
    }
    try {
      await this.invokeMethod(cmd.method, cmd.args);
      this.executedCommands++;
      this.completedCommands.push({ command: cmd, status: 'success' });
      return 'continue';
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.executedCommands++;
      this.completedCommands.push({ command: cmd, status: 'skipped', error });
      const handler = this.options.onCommandError;
      const action = handler ? handler(cmd, error) : 'skip';
      if (action === 'abort') {
        this.resolveWithAbort(cmd, error);
        return 'abort';
      }
      return 'continue';
    }
  }

  private resolveWithAbort(failedCommand: AgentCommand, error: Error): void {
    this.state = 'aborted';
    this.timedQueue = [];
    this.sequentialQueue = [];
    this.syncMarkerQueue = [];
    const result: ExecutionResult = {
      status: 'aborted',
      completedCommands: [...this.completedCommands],
      failedCommand,
      error,
    };
    this.resolveCompletion?.(result);
    this.resolveCompletion = null;
  }

  private async invokeMethod(
    method: string,
    args: Record<string, unknown>,
  ): Promise<void> {
    switch (method) {
      case 'createElement': {
        const elId = args['id'] as string;
        this.env.createElement({
          id: elId,
          type: args['type'] as 'box' | 'circle' | 'arrow' | 'text' | 'code' | 'diagram' | 'label' | 'connection' | 'group',
          position: args['position'] as Vector2,
          properties: args['properties'] as Record<string, unknown> | undefined,
          visible: args['visible'] as boolean | undefined,
          opacity: args['opacity'] as number | undefined,
          zIndex: args['zIndex'] as number | undefined,
        });
        this.currentSceneElementIds.add(elId);
        return;
      }

      case 'destroyElement': {
        const destroyId = args['id'] as string;
        this.env.destroyElement(destroyId);
        this.currentSceneElementIds.delete(destroyId);
        return;
      }

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

      case 'removeAnnotation': {
        const handleId = (args['handle'] ?? args['id']) as string;
        this.env.removeAnnotation({
          id: handleId,
          type: 'highlight',
          remove: () => {},
        });
        return;
      }

      case 'bindElementToParameter': {
        const mapperName = args['mapper'] as string;
        const mapper = getMapper(mapperName);
        this.env.bindElementToParameter(
          args['elementId'] as string,
          args['paramName'] as string,
          mapper,
        );
        return;
      }

      default:
        throw new Error(`Unknown command method: "${method}"`);
    }
  }

  // ── Private: Cross-scene cleanup ──────────────────────────

  private cleanupPreviousScene(): void {
    if (this.currentSceneElementIds.size === 0) return;

    for (const id of this.currentSceneElementIds) {
      // Element may already have been destroyed during normal execution
      if (this.env.getElementById(id)) {
        this.env.destroyElement(id);
      }
    }
    this.currentSceneElementIds.clear();
  }

  // ── Private: Sync marker sweep ──────────────────────────────

  private sweepSyncMarkers(currentTimeMs: number): void {
    for (const entry of this.syncMarkerQueue) {
      if (entry.fired) continue;
      const wordStartMs = this.getWordStartMs(entry.wordIndex);
      if (wordStartMs === undefined) continue;
      if (currentTimeMs >= wordStartMs - SYNC_MARKER_TOLERANCE_MS) {
        entry.fired = true;
        void this.dispatchCommand(entry.command);
      }
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
      const result: ExecutionResult = {
        status: 'complete',
        completedCommands: [...this.completedCommands],
      };
      this.resolveCompletion?.(result);
      this.resolveCompletion = null;
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    }
  }
}
