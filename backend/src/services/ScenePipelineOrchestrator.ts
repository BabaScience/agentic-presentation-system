/* ═══════════════════════════════════════════════════════════════
   Scene Pipeline Orchestrator — Concurrent Scene Preparation
   Coordinates parallel visual script generation + TTS synthesis
   for all scenes, feeding results to a SceneReadyQueue for
   progressive presentation (no waiting for all scenes).
   ═══════════════════════════════════════════════════════════════ */

import {
  type KnowledgeGraph,
  type KGNode,
  type RLPolicy,
  type PreparedScene,
  type PresentationScene,
  type WordTimestamp,
  type VisualScript,
  ANIMATION_DELAY_MIN_MS,
  FRAME_DURATION_MIN_MS,
  ILLUSTRATION_APPEAR_MIN_MS,
  INTER_ENTITY_STAGGER_MIN_MS,
  ENTITY_MIN_VISIBLE_MS,
} from '../../shared/types';
import { PresentationPlanner } from './PresentationPlanner';
import { VisualScriptGenerator } from './VisualScriptGenerator';
import { VoiceService } from './VoiceService';
import { ConcurrencyPool } from './ConcurrencyPool';
import { SceneReadyQueue } from './SceneReadyQueue';
import { AgentOrchestrator } from './AgentOrchestrator';

export interface ScenePipelineConfig {
  enableTTS: boolean;
}

export class ScenePipelineOrchestrator {
  private queue: SceneReadyQueue;
  private totalScenes = 0;
  private cancelled = false;
  private orchestrator: AgentOrchestrator;

  constructor(
    private planner: PresentationPlanner,
    private voiceService: VoiceService,
    private pool: ConcurrencyPool,
    private config: ScenePipelineConfig,
  ) {
    this.queue = new SceneReadyQueue();
    this.orchestrator = new AgentOrchestrator(this.planner.getVisualScriptGenerator());
  }

  prepareAllScenes(
    graph: KnowledgeGraph,
    orderedNodes: KGNode[],
    policy: RLPolicy,
    onStatusChange?: (sceneIndex: number, status: 'pending' | 'preparing' | 'ready' | 'failed', totalScenes: number) => void,
  ): void {
    this.totalScenes = orderedNodes.length;
    const presentedSoFar = new Set<string>();

    // Kick off all scenes concurrently through the pool.
    // Scene 1 is enqueued first, guaranteeing earliest pool access.
    for (let i = 0; i < orderedNodes.length; i++) {
      const nodeIndex = i;
      const focusNode = orderedNodes[i];

      // composeSceneLocals is synchronous — compute before enqueuing
      const locals = this.planner.composeSceneLocals(
        graph, focusNode, nodeIndex, presentedSoFar, policy,
      );
      presentedSoFar.add(focusNode.id);

      onStatusChange?.(nodeIndex, 'preparing', this.totalScenes);

      this.prepareScene(nodeIndex, locals.scene, locals.estimatedTimestamps, locals.focusNode, policy)
        .then((prepared) => {
          if (!this.cancelled) {
            this.queue.markReady(nodeIndex, prepared);
            onStatusChange?.(nodeIndex, prepared.status, this.totalScenes);
          }
        })
        .catch(() => {
          // Even on error, mark as ready with degraded scene
          if (!this.cancelled) {
            const fallback: PreparedScene = { scene: locals.scene, status: 'failed' };
            this.queue.markReady(nodeIndex, fallback);
            onStatusChange?.(nodeIndex, 'failed', this.totalScenes);
          }
        });
    }
  }

  private async prepareScene(
    index: number,
    scene: PresentationScene,
    estimatedTimestamps: WordTimestamp[],
    focusNode: KGNode,
    _policy: RLPolicy,
  ): Promise<PreparedScene> {
    // Fork: Multi-agent visual script orchestration + TTS in parallel via pool
    const claudePromise = this.orchestrator.orchestrateScene(
      scene,
      focusNode,
      estimatedTimestamps,
      this.pool,
    ).catch((err) => {
      console.error(`[Pipeline] Visual script failed for scene ${index}:`, err.message);
      return undefined;
    });

    const ttsPromise = this.config.enableTTS
      ? this.pool.enqueue('elevenlabs', () =>
          this.voiceService.synthesizeSpeech(scene.narration),
        ).catch((err) => {
          console.error(`[Pipeline] TTS failed for scene ${index}:`, err.message);
          return undefined;
        })
      : Promise.resolve(undefined);

    const [visualScript, ttsResult] = await Promise.all([claudePromise, ttsPromise]);

    // Merge results
    if (visualScript) {
      scene.visualScript = visualScript;
    }

    const prepared: PreparedScene = {
      scene,
      status: 'ready',
    };

    if (ttsResult && ttsResult.audioData.byteLength > 0) {
      prepared.audioData = new Uint8Array(ttsResult.audioData.buffer, ttsResult.audioData.byteOffset, ttsResult.audioData.byteLength);
      prepared.wordTimestamps = ttsResult.wordTimestamps;
      prepared.audioDurationMs = ttsResult.durationMs;

      // Rescale visual script to match real audio duration
      this.rescaleVisualScript(scene, ttsResult.durationMs);
    }

    return prepared;
  }

  getSceneQueue(): SceneReadyQueue {
    return this.queue;
  }

  getTotalSceneCount(): number {
    return this.totalScenes;
  }

  cancelPending(): void {
    this.cancelled = true;
    this.pool.cancelAll();
    this.queue.cancel();
  }

  private rescaleVisualScript(scene: PresentationScene, realDurationMs: number): void {
    if (!scene.visualScript?.frames.length) return;
    const estimatedDuration = scene.visualScript.totalDuration;
    if (estimatedDuration <= 0 || realDurationMs <= 0) return;

    const scale = realDurationMs / estimatedDuration;

    // Phase 1: Scale frame boundaries and enforce minimum frame duration
    for (const frame of scene.visualScript.frames) {
      frame.startTime = Math.round(frame.startTime * scale);
      frame.endTime = Math.round(frame.endTime * scale);
    }

    // Enforce minimum frame duration — extend short frames and shift subsequent ones
    for (let i = 0; i < scene.visualScript.frames.length; i++) {
      const frame = scene.visualScript.frames[i];
      const duration = frame.endTime - frame.startTime;
      if (duration < FRAME_DURATION_MIN_MS) {
        const extension = FRAME_DURATION_MIN_MS - duration;
        frame.endTime += extension;
        // Shift all subsequent frames forward
        for (let j = i + 1; j < scene.visualScript.frames.length; j++) {
          scene.visualScript.frames[j].startTime += extension;
          scene.visualScript.frames[j].endTime += extension;
        }
      }
    }

    // Phase 2: Scale entity animation delays and enforce minimums
    for (const frame of scene.visualScript.frames) {
      const frameDuration = frame.endTime - frame.startTime;
      const origFrameDuration = frameDuration / scale; // approximate original
      const frameDurationScale = origFrameDuration > 0 ? frameDuration / origFrameDuration : 1;

      for (const entity of frame.entities) {
        if (entity.animation && entity.animation.delay > 0) {
          entity.animation.delay = Math.max(
            ANIMATION_DELAY_MIN_MS,
            Math.round(entity.animation.delay * frameDurationScale),
          );
        }
      }

      // Re-stagger: sort non-zero delays and ensure minimum gap
      const nonZeroEntities = frame.entities.filter(e => e.animation && e.animation.delay > 0);
      nonZeroEntities.sort((a, b) => (a.animation?.delay || 0) - (b.animation?.delay || 0));
      for (let i = 1; i < nonZeroEntities.length; i++) {
        const prev = nonZeroEntities[i - 1].animation!.delay;
        const curr = nonZeroEntities[i].animation!.delay;
        if (curr - prev < INTER_ENTITY_STAGGER_MIN_MS) {
          nonZeroEntities[i].animation!.delay = prev + INTER_ENTITY_STAGGER_MIN_MS;
        }
      }
    }

    // Phase 2b: Enforce per-entity minimum visible time after rescaling
    for (let i = 0; i < scene.visualScript.frames.length; i++) {
      const frame = scene.visualScript.frames[i];
      const maxDelay = frame.entities.reduce((mx, e) => Math.max(mx, e.animation?.delay || 0), 0);
      const needed = maxDelay + ENTITY_MIN_VISIBLE_MS;
      const frameDur = frame.endTime - frame.startTime;
      if (frameDur < needed) {
        const extension = needed - frameDur;
        frame.endTime += extension;
        for (let j = i + 1; j < scene.visualScript.frames.length; j++) {
          scene.visualScript.frames[j].startTime += extension;
          scene.visualScript.frames[j].endTime += extension;
        }
      }
    }

    scene.visualScript.totalDuration = scene.visualScript.frames[scene.visualScript.frames.length - 1].endTime;

    // Phase 3: Rescale legacy illustration timings with minimum floor
    if (scene.illustrations) {
      for (const illus of scene.illustrations) {
        const scaled = Math.round(illus.appearTimingMs * scale);
        illus.appearTimingMs = illus.appearTimingMs > 0
          ? Math.max(scaled, ILLUSTRATION_APPEAR_MIN_MS)
          : scaled;
      }
    }
  }
}
