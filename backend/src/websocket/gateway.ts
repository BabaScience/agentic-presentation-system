/* ═══════════════════════════════════════════════════════════════
   WebSocket Gateway — Full-Duplex Audio + Command Transport
   Handles: audio streaming, visual commands, graph mutations,
   state transitions, bookmarks, and RL updates.

   Uses ScenePipelineOrchestrator for concurrent scene preparation
   and progressive presentation (no waiting for all scenes).
   ═══════════════════════════════════════════════════════════════ */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuid } from 'uuid';
import { AgentService } from '../services/AgentService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { VoiceService } from '../services/VoiceService';
import { PresentationPlanner } from '../services/PresentationPlanner';
import { InterruptHandler } from '../services/InterruptHandler';
import { RLService } from '../services/RLService';
import { ConcurrencyPool } from '../services/ConcurrencyPool';
import { ScenePipelineOrchestrator } from '../services/ScenePipelineOrchestrator';
import {
  SessionState,
  VoiceIntent,
  type WSServerEvent,
  type PresentationScene,
  type PresentationBookmark,
  type KnowledgeGraph,
  type StoryboardScene,
} from '../../shared/types';
import { compilePresentationScene } from '../../shared/VisualScriptCompiler';
import {
  ANIMATION_DELAY_MIN_MS,
  FRAME_DURATION_MIN_MS,
  ILLUSTRATION_APPEAR_MIN_MS,
  INTER_ENTITY_STAGGER_MIN_MS,
} from '../../shared/constants';

interface ClientSession {
  id: string;
  ws: WebSocket;
  state: SessionState;
  topic: string | null;
  graph: KnowledgeGraph | null;
  currentSceneIndex: number;
  traversalPath: PresentationScene[];
  bookmark: PresentationBookmark | null;
  isPresenting: boolean;
  presentationAbortController: AbortController | null;
  scenePipeline: ScenePipelineOrchestrator | null;
}

export class WebSocketGateway {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientSession>();

  // Services
  private agent: AgentService;
  private kgService: KnowledgeGraphService;
  private voice: VoiceService;
  private planner: PresentationPlanner;
  private interruptHandler: InterruptHandler;
  private rl: RLService;

  // Shared concurrency pool (global rate limiting across all sessions)
  private pool: ConcurrencyPool;

  constructor(private server: http.Server) {
    this.agent = new AgentService();
    this.kgService = new KnowledgeGraphService();
    this.voice = new VoiceService();
    this.planner = new PresentationPlanner();
    this.interruptHandler = new InterruptHandler();
    this.rl = new RLService();
    this.pool = new ConcurrencyPool();
  }

  initialize(): void {
    this.wss = new WebSocketServer({ server: this.server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const sessionId = new URL(req.url || '', 'http://localhost').searchParams.get('sessionId') || uuid();

      const session: ClientSession = {
        id: sessionId,
        ws,
        state: SessionState.IDLE,
        topic: null,
        graph: null,
        currentSceneIndex: 0,
        traversalPath: [],
        bookmark: null,
        isPresenting: false,
        presentationAbortController: null,
        scenePipeline: null,
      };

      this.clients.set(sessionId, session);
      console.log(`[WS] Client connected: ${sessionId}`);

      this.send(ws, { type: 'state_change', from: SessionState.IDLE, to: SessionState.IDLE });

      ws.on('message', (data, isBinary) => this.handleMessage(sessionId, data, isBinary));
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${sessionId}`);
        session.presentationAbortController?.abort();
        session.scenePipeline?.cancelPending();
        this.clients.delete(sessionId);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error for ${sessionId}:`, err.message);
      });
    });

    console.log('[WS] WebSocket Gateway initialized on /ws');
  }

  // ── Message Dispatcher ───────────────────────────────────
  private async handleMessage(sessionId: string, raw: any, isBinary: boolean): Promise<void> {
    const session = this.clients.get(sessionId);
    if (!session) return;

    try {
      // Binary data = audio chunk
      if (isBinary) {
        await this.handleAudioChunk(session, raw as Buffer);
        return;
      }

      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'start_session':
          console.log('[WS] Received start_session for topic:', msg.topic);
          await this.handleStartSession(session, msg.topic);
          break;

        case 'user_command':
          await this.handleUserCommand(session, msg.command);
          break;

        case 'text_input':
          // Fallback: text input when voice is disabled
          await this.handleTextInput(session, msg.text);
          break;

        case 'set_parameter':
          // Forward parameter change to client's stage engine.
          // In Phase 1, the stage engine lives client-side; the server
          // echoes the update so other potential clients stay in sync.
          this.send(session.ws, { type: 'parameter_update', name: msg.name, value: msg.value });
          break;

        case 'restore_checkpoint':
          // Echo checkpoint restore confirmation.
          this.send(session.ws, { type: 'checkpoint_restored', name: msg.name });
          break;

        case 'ping':
          this.send(session.ws, { type: 'pong' });
          break;

        default:
          console.warn(`[WS] Unknown message type: ${msg.type}`);
      }
    } catch (err: any) {
      console.error(`[WS] Message handling error:`, err.message);
      this.send(session.ws, { type: 'error', message: err.message, code: 'HANDLER_ERROR' });
    }
  }

  // ── Start Session: Full Agent Pipeline (Concurrent) ─────
  private async handleStartSession(session: ClientSession, topic: string): Promise<void> {
    console.log('[WS] handleStartSession starting for topic:', topic);
    session.topic = topic;
    this.transition(session, SessionState.LISTENING);

    // Phase 1: Reasoning
    this.transition(session, SessionState.REASONING);
    const reasoning = await this.agent.reason(topic, this.rl.getCurrentPolicy());

    // Warn client if AI reasoning fell back to templates
    if ((reasoning as any)._fallbackReason) {
      console.warn(`[WS] Reasoning used fallback for session ${session.id}: ${(reasoning as any)._fallbackReason}`);
      this.send(session.ws, {
        type: 'error',
        message: 'AI reasoning is temporarily unavailable. Using simplified content.',
        code: 'REASONING_FALLBACK',
      });
    }

    // Phase 2: Build Knowledge Graph
    this.transition(session, SessionState.BUILDING_GRAPH);
    const graph = this.kgService.buildFromReasoning(session.id, reasoning);
    session.graph = graph;

    // Send initial graph to client
    for (const node of Object.values(graph.nodes)) {
      this.send(session.ws, {
        type: 'graph_update',
        mutation: { type: 'add_node', data: node, timestamp: Date.now() },
      });
    }
    for (const edge of Object.values(graph.edges)) {
      this.send(session.ws, {
        type: 'graph_update',
        mutation: { type: 'add_edge', data: edge, timestamp: Date.now() },
      });
    }

    // Phase 3: Compute traversal order (synchronous)
    const policy = this.rl.getCurrentPolicy();
    const orderedNodes = this.planner.computeTraversalOrder(graph, policy);
    session.currentSceneIndex = 0;

    // Phase 4: Transition to PRESENTING immediately — don't wait for scenes
    this.transition(session, SessionState.PRESENTING);

    // Phase 5: Fire off concurrent scene preparation
    // Reset pool in case a previous session cancelled it
    this.pool.reset();
    const pipeline = new ScenePipelineOrchestrator(
      this.planner,
      this.voice,
      this.pool,
      { enableTTS: !!process.env.ELEVENLABS_API_KEY },
    );
    session.scenePipeline = pipeline;

    pipeline.prepareAllScenes(graph, orderedNodes, policy, (sceneIndex, status, totalScenes) => {
      if (session.ws.readyState === WebSocket.OPEN) {
        this.send(session.ws, {
          type: 'scene_prepare_status',
          sceneIndex,
          status,
          totalScenes,
        });
      }
    });

    // Phase 6: Start async graph expansion in background
    this.kgService.expandAsync(graph, this.rl, (mutation) => {
      if (session.ws.readyState === WebSocket.OPEN) {
        this.send(session.ws, { type: 'graph_update', mutation });
      }
    });

    // Phase 7: Progressive present loop — consumes scenes as they become ready
    await this.progressivePresentLoop(session);
  }

  // ── Progressive Presentation Loop ─────────────────────────
  // Consumes prepared scenes from the SceneReadyQueue one at a time.
  // Scene 1 plays as soon as it's ready; later scenes prepare during playback.
  private async progressivePresentLoop(session: ClientSession): Promise<void> {
    const pipeline = session.scenePipeline;
    if (!pipeline) return;

    session.isPresenting = true;
    session.presentationAbortController = new AbortController();
    const signal = session.presentationAbortController.signal;

    const queue = pipeline.getSceneQueue();
    const totalScenes = pipeline.getTotalSceneCount();

    let sceneIndex = session.currentSceneIndex;

    while (sceneIndex < totalScenes && !signal.aborted) {
      // Wait for next scene to be ready
      const prepared = await queue.waitForScene(sceneIndex, signal);
      if (!prepared || signal.aborted) break;

      const scene = prepared.scene;
      const storyboard = prepared.storyboard ?? compilePresentationScene(scene);

      // Store in traversalPath for interrupt/resume compatibility
      session.traversalPath[sceneIndex] = scene;
      session.currentSceneIndex = sceneIndex;

      // Brief inter-scene gap for transition animation (skip for first scene)
      if (sceneIndex > 0) {
        await this.delay(300, signal);
        if (signal.aborted) break;
      }

      // Send compiled StoryboardScene to client — ready for SceneExecutor
      this.send(session.ws, { type: 'scene_change', scene: storyboard });

      // Small delay for scene transition animation to settle
      await this.delay(200, signal);
      if (signal.aborted) break;

      // Send narration text
      this.send(session.ws, {
        type: 'narration_text',
        text: scene.narration,
        sceneId: scene.id,
      });

      // Use pre-generated audio if available, otherwise fall back to delay
      if (prepared.audioData && prepared.audioData.byteLength > 0) {
        this.send(session.ws, {
          type: 'agent_audio_meta',
          durationMs: prepared.audioDurationMs!,
          sceneId: scene.id,
          wordTimestamps: prepared.wordTimestamps,
          visualScript: scene.visualScript,
          illustrations: scene.illustrations,
        });
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(prepared.audioData);
        }
        await this.delay(prepared.audioDurationMs! + 500, signal);
      } else {
        // No TTS audio — send visual metadata and use estimated duration
        if (scene.visualScript || scene.illustrations) {
          this.send(session.ws, {
            type: 'agent_audio_meta',
            durationMs: scene.durationEstimate,
            sceneId: scene.id,
            visualScript: scene.visualScript,
            illustrations: scene.illustrations,
          });
        }
        await this.delay(scene.durationEstimate || 5000, signal);
      }

      if (signal.aborted) break;

      // Mark nodes as presented
      for (const nodeId of scene.nodeIds) {
        if (session.graph?.nodes[nodeId]) {
          session.graph.nodes[nodeId].isPresented = true;
        }
      }

      // RL: comprehension check
      if (this.rl.shouldCheckComprehension(sceneIndex)) {
        this.send(session.ws, {
          type: 'narration_text',
          text: 'Does that make sense so far? Feel free to ask if anything is unclear.',
          sceneId: `check-${scene.id}`,
        });
        await this.delay(3000, signal);
        if (signal.aborted) break;
      }

      sceneIndex++;
    }

    if (!signal.aborted) {
      this.transition(session, SessionState.COMPLETED);
      this.send(session.ws, {
        type: 'narration_text',
        text: 'That covers the main concepts. Do you have any questions, or would you like to explore any topic in more depth?',
        sceneId: 'completion',
      });
    }

    session.isPresenting = false;
  }

  // ── Legacy Presentation Loop (for interrupt resume) ─────
  // Used after interrupt when resuming from already-prepared scenes
  private async presentLoop(session: ClientSession): Promise<void> {
    session.isPresenting = true;
    session.presentationAbortController = new AbortController();
    const signal = session.presentationAbortController.signal;

    while (
      session.currentSceneIndex < session.traversalPath.length &&
      !signal.aborted
    ) {
      const scene = session.traversalPath[session.currentSceneIndex];

      // Brief inter-scene gap for transition animation (skip for first scene)
      if (session.currentSceneIndex > 0) {
        await this.delay(300, signal);
        if (signal.aborted) break;
      }

      // Compile and send StoryboardScene to client
      const storyboard = compilePresentationScene(scene);
      this.send(session.ws, { type: 'scene_change', scene: storyboard });

      // Small delay for scene transition animation to settle
      await this.delay(200, signal);
      if (signal.aborted) break;

      // Send narration text (client renders + we stream TTS audio)
      this.send(session.ws, {
        type: 'narration_text',
        text: scene.narration,
        sceneId: scene.id,
      });

      // Generate and stream TTS audio (or fall back to delay)
      if (process.env.ELEVENLABS_API_KEY) {
        try {
          const { audioData, wordTimestamps, durationMs: realDurationMs } = await this.voice.synthesizeSpeech(scene.narration);
          if (audioData.length > 0) {
            // Rescale visual script frame timings to match real audio duration
            this.rescaleVisualScript(scene, realDurationMs);

            this.send(session.ws, {
              type: 'agent_audio_meta',
              durationMs: realDurationMs,
              sceneId: scene.id,
              wordTimestamps,
              visualScript: scene.visualScript,
              illustrations: scene.illustrations,
            });
            // Send audio as binary
            if (session.ws.readyState === WebSocket.OPEN) {
              session.ws.send(audioData);
            }
            // Wait for real audio duration instead of estimate
            await this.delay(realDurationMs + 500, signal);
          } else {
            await this.delay(scene.durationEstimate || 5000, signal);
          }
        } catch (err: any) {
          console.error('[TTS] ElevenLabs error, falling back to delay:', err.message);
          await this.delay(scene.durationEstimate || 5000, signal);
        }
      } else {
        const duration = scene.durationEstimate || 5000;
        await this.delay(duration, signal);
      }

      if (signal.aborted) break;

      // Mark nodes as presented
      for (const nodeId of scene.nodeIds) {
        if (session.graph?.nodes[nodeId]) {
          session.graph.nodes[nodeId].isPresented = true;
        }
      }

      // RL: Check if comprehension check is needed
      if (this.rl.shouldCheckComprehension(session.currentSceneIndex)) {
        this.send(session.ws, {
          type: 'narration_text',
          text: 'Does that make sense so far? Feel free to ask if anything is unclear.',
          sceneId: `check-${scene.id}`,
        });
        await this.delay(3000, signal);
        if (signal.aborted) break;
      }

      session.currentSceneIndex++;
    }

    if (!signal.aborted) {
      this.transition(session, SessionState.COMPLETED);
      this.send(session.ws, {
        type: 'narration_text',
        text: 'That covers the main concepts. Do you have any questions, or would you like to explore any topic in more depth?',
        sceneId: 'completion',
      });
    }

    session.isPresenting = false;
  }

  // ── Audio Chunk Handling (STT → Intent → Interrupt) ──────
  private async handleAudioChunk(session: ClientSession, audioData: Buffer): Promise<void> {
    if (!process.env.DEEPGRAM_API_KEY) return;
    try {
      const { text, confidence } = await this.voice.transcribeAudio(audioData);
      if (text && confidence > 0.5) {
        console.log('[STT] Transcript:', text, `(confidence: ${confidence.toFixed(2)})`);
        await this.handleTextInput(session, text);
      }
    } catch (err: any) {
      console.error('[STT] Deepgram error:', err.message);
    }
  }

  // ── Text Input (fallback when voice disabled) ────────────
  private async handleTextInput(session: ClientSession, text: string): Promise<void> {
    if (!text.trim()) return;

    // Classify intent
    const intent = this.voice.classifyIntent(text);

    if (intent === VoiceIntent.QUESTION && session.state === SessionState.PRESENTING) {
      // Trigger interrupt protocol
      await this.handleInterrupt(session, text);
    } else if (intent === VoiceIntent.CONFUSION && session.state === SessionState.PRESENTING) {
      // Rephrase current node
      await this.handleRephrase(session);
    } else if (intent === VoiceIntent.ACKNOWLEDGMENT) {
      this.rl.recordReward({
        signal: 'acknowledgment',
        value: 1.0,
        nodeId: session.traversalPath[session.currentSceneIndex]?.focusNodeId || '',
        dataType: 'CONCEPT' as any,
        explanationStrategy: this.rl.getCurrentPolicy().explanationStrategy,
        timestamp: Date.now(),
      });
    } else if (session.state === SessionState.IDLE || session.state === SessionState.COMPLETED) {
      // New topic or follow-up
      await this.handleStartSession(session, text);
    }
  }

  // ── Interrupt Protocol (§6 from V2 Spec) ─────────────────
  private async handleInterrupt(session: ClientSession, question: string): Promise<void> {
    // Phase A: Pause & Bookmark + cancel pending scene preparation
    session.presentationAbortController?.abort();
    session.scenePipeline?.cancelPending();

    const bookmark = this.interruptHandler.createBookmark(
      session.traversalPath[session.currentSceneIndex],
      session.currentSceneIndex,
    );
    session.bookmark = bookmark;

    this.transition(session, SessionState.INTERRUPTED);
    this.send(session.ws, { type: 'bookmark_created', bookmark });

    // Phase B: Reason about question in context & Mutate graph
    const currentNodeId = session.traversalPath[session.currentSceneIndex]?.focusNodeId;
    const interruptResult = await this.agent.handleInterrupt(
      question,
      session.graph!,
      currentNodeId || '',
      this.rl.getCurrentPolicy(),
    );

    // Apply mutations to graph
    for (const mutation of interruptResult.mutations) {
      this.kgService.applyMutation(session.graph!, mutation);
      this.send(session.ws, { type: 'graph_update', mutation });
    }

    // Phase C: Present the answer as new scenes
    for (const scene of interruptResult.answerScenes) {
      const storyboard = compilePresentationScene(scene);
      this.send(session.ws, { type: 'scene_change', scene: storyboard });
      this.send(session.ws, {
        type: 'narration_text',
        text: scene.narration,
        sceneId: scene.id,
      });

      // TTS with real timestamps for interrupt scenes
      if (process.env.ELEVENLABS_API_KEY) {
        try {
          const { audioData, wordTimestamps, durationMs } = await this.voice.synthesizeSpeech(scene.narration);
          if (audioData.length > 0) {
            this.rescaleVisualScript(scene, durationMs);
            this.send(session.ws, {
              type: 'agent_audio_meta',
              durationMs,
              sceneId: scene.id,
              wordTimestamps,
              visualScript: scene.visualScript,
              illustrations: scene.illustrations,
            });
            if (session.ws.readyState === WebSocket.OPEN) {
              session.ws.send(audioData);
            }
            await this.delay(durationMs + 500);
          } else {
            await this.delay(scene.durationEstimate || 4000);
          }
        } catch {
          await this.delay(scene.durationEstimate || 4000);
        }
      } else {
        await this.delay(scene.durationEstimate || 4000);
      }
    }

    // Phase D: Comprehension check
    this.send(session.ws, {
      type: 'narration_text',
      text: `Does that clarify your question about "${question}"? Any other questions before I continue?`,
      sceneId: 'interrupt-check',
    });

    // Wait for response (in production: listen for voice)
    await this.delay(4000);

    // Phase E: Resume from bookmark
    this.send(session.ws, { type: 'bookmark_resumed', bookmark });
    this.transition(session, SessionState.PRESENTING);

    // Resume presentation loop from already-prepared scenes
    await this.presentLoop(session);
  }

  // ── Rephrase Current Node ────────────────────────────────
  private async handleRephrase(session: ClientSession): Promise<void> {
    const currentScene = session.traversalPath[session.currentSceneIndex];
    if (!currentScene) return;

    this.rl.recordReward({
      signal: 'confusion',
      value: -1.0,
      nodeId: currentScene.focusNodeId,
      dataType: 'CONCEPT' as any,
      explanationStrategy: this.rl.getCurrentPolicy().explanationStrategy,
      timestamp: Date.now(),
    });

    const rephrase = await this.agent.rephraseNode(
      session.graph!,
      currentScene.focusNodeId,
      this.rl.getCurrentPolicy(),
    );

    this.send(session.ws, {
      type: 'narration_text',
      text: rephrase.narration,
      sceneId: `rephrase-${currentScene.id}`,
    });
  }

  // ── User Commands ────────────────────────────────────────
  private async handleUserCommand(session: ClientSession, command: string): Promise<void> {
    switch (command) {
      case 'pause':
        session.presentationAbortController?.abort();
        break;

      case 'resume':
        if (session.state === SessionState.PRESENTING && !session.isPresenting) {
          // Try progressive loop first if pipeline exists, else legacy
          if (session.scenePipeline) {
            await this.progressivePresentLoop(session);
          } else {
            await this.presentLoop(session);
          }
        }
        break;

      case 'skip':
        session.currentSceneIndex++;
        session.presentationAbortController?.abort();
        if (session.scenePipeline) {
          if (session.currentSceneIndex < session.scenePipeline.getTotalSceneCount()) {
            await this.progressivePresentLoop(session);
          }
        } else if (session.currentSceneIndex < session.traversalPath.length) {
          await this.presentLoop(session);
        }
        break;

      case 'go_back':
        if (session.currentSceneIndex > 0) {
          session.currentSceneIndex--;
          session.presentationAbortController?.abort();
          // For go_back, scenes are already prepared — use legacy loop with cached traversalPath
          await this.presentLoop(session);
        }
        break;

      case 'show_graph':
        if (session.graph) {
          // Re-send full graph state
          for (const node of Object.values(session.graph.nodes)) {
            this.send(session.ws, {
              type: 'graph_update',
              mutation: { type: 'add_node', data: node, timestamp: Date.now() },
            });
          }
        }
        break;
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  private transition(session: ClientSession, to: SessionState): void {
    const from = session.state;
    session.state = to;
    this.send(session.ws, { type: 'state_change', from, to });
    console.log(`[Session ${session.id}] ${from} → ${to}`);
  }

  private send(ws: WebSocket, event: WSServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
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
        for (let j = i + 1; j < scene.visualScript.frames.length; j++) {
          scene.visualScript.frames[j].startTime += extension;
          scene.visualScript.frames[j].endTime += extension;
        }
      }
    }

    // Phase 2: Scale entity animation delays and enforce minimums
    for (const frame of scene.visualScript.frames) {
      const frameDuration = frame.endTime - frame.startTime;
      const origFrameDuration = frameDuration / scale;
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

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) { resolve(); return; }
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timeout);
        resolve();
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
