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
} from '../../shared/types';
import { PresentationPlanner } from './PresentationPlanner';
import { VisualScriptGenerator } from './VisualScriptGenerator';
import { VoiceService } from './VoiceService';
import { ConcurrencyPool } from './ConcurrencyPool';
import { SceneReadyQueue } from './SceneReadyQueue';

export interface ScenePipelineConfig {
  enableTTS: boolean;
}

export class ScenePipelineOrchestrator {
  private queue: SceneReadyQueue;
  private totalScenes = 0;
  private cancelled = false;

  constructor(
    private planner: PresentationPlanner,
    private voiceService: VoiceService,
    private pool: ConcurrencyPool,
    private config: ScenePipelineConfig,
  ) {
    this.queue = new SceneReadyQueue();
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
    // Fork: Claude visual script + TTS in parallel via pool
    const claudePromise = this.pool.enqueue('claude', () =>
      this.planner.getVisualScriptGenerator().generateScript(
        scene.id,
        scene.narration,
        focusNode.type,
        estimatedTimestamps,
        scene.durationEstimate,
        focusNode.visualHint,
      ),
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

    for (const frame of scene.visualScript.frames) {
      const frameDuration = frame.endTime - frame.startTime;
      frame.startTime = Math.round(frame.startTime * scale);
      frame.endTime = Math.round(frame.endTime * scale);

      const newFrameDuration = frame.endTime - frame.startTime;
      const frameDurationScale = frameDuration > 0 ? newFrameDuration / frameDuration : 1;

      for (const entity of frame.entities) {
        if (entity.animation && entity.animation.delay > 0) {
          entity.animation.delay = Math.round(entity.animation.delay * frameDurationScale);
        }
      }
    }
    scene.visualScript.totalDuration = realDurationMs;

    if (scene.illustrations) {
      for (const illus of scene.illustrations) {
        illus.appearTimingMs = Math.round(illus.appearTimingMs * scale);
      }
    }
  }
}
