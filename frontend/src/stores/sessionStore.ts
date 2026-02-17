/* ═══════════════════════════════════════════════════════════════
   Session Store — Zustand + Immer
   Central state for: session lifecycle, knowledge graph,
   presentation progress, voice, RL policy, and interrupts.
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { produce } from 'immer';
import { AudioPlaybackManager } from '../audio/AudioPlaybackManager';

// Inline types to avoid import resolution issues in Vite
type SessionState = 'IDLE' | 'LISTENING' | 'REASONING' | 'BUILDING_GRAPH' | 'PRESENTING' | 'INTERRUPTED' | 'COMPLETED';
type DataType = 'CONCEPT' | 'RELATIONSHIP' | 'EXAMPLE' | 'ANALOGY' | 'DEFINITION' | 'PROCESS' | 'RESOURCE' | 'COUNTERPOINT';
type EdgeType = 'REQUIRES' | 'CONTAINS' | 'RELATES_TO' | 'EXEMPLIFIES' | 'CONTRADICTS' | 'LEADS_TO' | 'DEEPENS';
type ElementType = 'box' | 'circle' | 'arrow' | 'text' | 'code' | 'split_panel' | 'flow_sequence' | 'callout' | 'icon';

export interface KGNode {
  id: string;
  label: string;
  type: DataType;
  depth: number;
  content: string;
  narration: string;
  visual: {
    elementType: string;
    x: number; y: number;
    width: number; height: number;
    style: Record<string, any>;
    animation: { type: string; duration: number; delay: number };
    icon?: string;
  };
  rlRelevanceScore: number;
  isExpanded: boolean;
  isPresented: boolean;
  parentId: string | null;
  metadata: Record<string, any>;
}

export interface KGEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: EdgeType;
  weight: number;
  isPresented: boolean;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface IllustrationSpec {
  id: string;
  type: 'shape' | 'icon' | 'diagram';
  elementType: ElementType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, any>;
  animation: { type: 'fadeIn' | 'scaleIn' | 'slideIn' | 'pulse' | 'dashFlow' | 'none'; duration: number; delay: number; easing?: string };
  content?: string;
  appearTimingMs: number;
}

export interface VisualScript {
  sceneId: string;
  frames: any[];
  totalDuration: number;
  entities: Record<string, any>;
}

export interface PresentationScene {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  narration: string;
  focusNodeId: string;
  viewport: { x: number; y: number; zoom: number };
  visualCommands: any[];
  durationEstimate: number;
  illustrations?: IllustrationSpec[];
  visualScript?: VisualScript;
}

export interface PresentationBookmark {
  sceneId: string;
  nodeId: string;
  wordOffset: number;
  traversalIndex: number;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export interface RLPolicy {
  explanationStrategy: string;
  pace: number;
  visualDensity: string;
  comprehensionCheckFrequency: number;
}

// ── Store Interface ──────────────────────────────────────────
type WSConnectionStatus = 'disconnected' | 'connected' | 'reconnecting' | 'failed';

interface SessionStore {
  // Session
  sessionState: SessionState;
  sessionId: string | null;
  topic: string;
  ws: WebSocket | null;

  // WebSocket reconnection
  wsConnectionStatus: WSConnectionStatus;
  reconnectAttempts: number;

  // Knowledge Graph
  nodes: Record<string, KGNode>;
  edges: Record<string, KGEdge>;

  // Presentation
  currentScene: PresentationScene | null;
  narrationText: string;
  sceneHistory: PresentationScene[];
  bookmark: PresentationBookmark | null;

  // Voice
  voiceEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentWordTimestamps: WordTimestamp[];
  currentAudioTime: number;

  // RL
  rlPolicy: RLPolicy | null;

  // Chat (text fallback)
  chatMessages: ChatMessage[];

  // Scene preparation tracking
  scenePreparationStatus: Record<number, 'pending' | 'preparing' | 'ready' | 'failed'>;
  totalScenesToPrepare: number;

  // Visual command animation
  revealedNodeIds: string[];
  visualCommandQueue: Array<{ type: string; targetId: string; wordTrigger?: number; params?: any }>;

  // UI
  sidebarTab: 'info' | 'graph' | 'chat';
  showMinimap: boolean;

  // Actions
  setSessionState: (state: SessionState) => void;
  connectWS: (url: string, onReady?: () => void) => void;
  disconnectWS: () => void;
  sendMessage: (msg: any) => void;
  startSession: (topic: string) => void;

  addNode: (node: KGNode) => void;
  addEdge: (edge: KGEdge) => void;
  updateNode: (id: string, updates: Partial<KGNode>) => void;

  setCurrentScene: (scene: PresentationScene) => void;
  setNarration: (text: string) => void;
  setBookmark: (bookmark: PresentationBookmark | null) => void;

  setVoiceEnabled: (enabled: boolean) => void;
  stopAudio: () => void;
  sendBinaryAudio: (data: ArrayBuffer) => void;
  setSidebarTab: (tab: 'info' | 'graph' | 'chat') => void;
  setRLPolicy: (policy: RLPolicy) => void;
  setWordTimestamps: (timestamps: WordTimestamp[]) => void;
  updateAudioTime: (time: number) => void;

  enqueueVisualCommand: (cmd: { type: string; targetId: string; wordTrigger?: number; params?: any }) => void;
  dequeueVisualCommand: () => void;
  revealNode: (id: string) => void;

  addChatMessage: (msg: ChatMessage) => void;
  sendTextInput: (text: string) => void;
  sendCommand: (cmd: string) => void;

  reset: () => void;
}

// ── WebSocket Reconnection (internal, non-reactive) ─────────
const MAX_RECONNECT_ATTEMPTS = 5;
let _intentionalClose = false;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _lastWsUrl: string | null = null;

// ── Initial State ────────────────────────────────────────────
const initialState = {
  sessionState: 'IDLE' as SessionState,
  sessionId: null as string | null,
  topic: '',
  ws: null as WebSocket | null,
  wsConnectionStatus: 'disconnected' as WSConnectionStatus,
  reconnectAttempts: 0,
  nodes: {} as Record<string, KGNode>,
  edges: {} as Record<string, KGEdge>,
  currentScene: null as PresentationScene | null,
  narrationText: '',
  sceneHistory: [] as PresentationScene[],
  bookmark: null as PresentationBookmark | null,
  voiceEnabled: true,
  isListening: false,
  isSpeaking: false,
  currentWordTimestamps: [] as WordTimestamp[],
  currentAudioTime: 0,
  rlPolicy: null as RLPolicy | null,
  scenePreparationStatus: {} as Record<number, 'pending' | 'preparing' | 'ready' | 'failed'>,
  totalScenesToPrepare: 0,
  revealedNodeIds: [] as string[],
  visualCommandQueue: [] as Array<{ type: string; targetId: string; params?: any }>,
  chatMessages: [] as ChatMessage[],
  sidebarTab: 'info' as const,
  showMinimap: true,
};

// ── Store ────────────────────────────────────────────────────
export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  setSessionState: (state) => set({ sessionState: state }),

  connectWS: (url: string, onReady?: () => void) => {
    // Clean up any pending reconnect and previous connection
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    _intentionalClose = true;
    get().ws?.close();
    _intentionalClose = false;

    _lastWsUrl = url;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[WS] Connected');
      set({ wsConnectionStatus: 'connected', reconnectAttempts: 0 });
      onReady?.();
    };

    ws.onmessage = (event) => {
      // Binary data = TTS audio from backend → play via AudioPlaybackManager
      if (event.data instanceof Blob) {
        if (get().voiceEnabled) {
          event.data.arrayBuffer().then(buffer => {
            const manager = AudioPlaybackManager.getInstance();
            manager.setTimeUpdateCallback((time) => {
              get().updateAudioTime(time);
            });
            manager.play(buffer);
          });
        }
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        const store = get();

        switch (msg.type) {
          case 'state_change':
            set({ sessionState: msg.to });
            break;

          case 'graph_update':
            if (msg.mutation.type === 'add_node') {
              store.addNode(msg.mutation.data);
            } else if (msg.mutation.type === 'add_edge') {
              store.addEdge(msg.mutation.data);
            } else if (msg.mutation.type === 'update_node') {
              store.updateNode(msg.mutation.data.id, msg.mutation.data.updates);
            }
            break;

          case 'scene_change':
            // Clear visual command queue and reset audio time for new scene
            AudioPlaybackManager.getInstance().stop();
            set({ visualCommandQueue: [], currentAudioTime: 0, currentWordTimestamps: [] });
            store.setCurrentScene(msg.scene);
            break;

          case 'visual_command':
            store.enqueueVisualCommand(msg.command);
            break;

          case 'narration_text':
            store.setNarration(msg.text);
            store.addChatMessage({ role: 'agent', text: msg.text, timestamp: Date.now() });
            break;

          case 'agent_audio_meta':
            // Informational — audio binary follows immediately
            if (msg.wordTimestamps) {
              store.setWordTimestamps(msg.wordTimestamps);
            }
            // Apply rescaled visual timing from real TTS duration
            if (msg.visualScript || msg.illustrations) {
              set(produce((s: any) => {
                if (s.currentScene?.id === msg.sceneId) {
                  if (msg.visualScript) s.currentScene.visualScript = msg.visualScript;
                  if (msg.illustrations) s.currentScene.illustrations = msg.illustrations;
                }
              }));
            }
            break;

          case 'bookmark_created':
            store.setBookmark(msg.bookmark);
            break;

          case 'bookmark_resumed':
            store.setBookmark(null);
            break;

          case 'scene_prepare_status':
            set(produce((s: SessionStore) => {
              s.scenePreparationStatus[msg.sceneIndex] = msg.status;
              s.totalScenesToPrepare = msg.totalScenes;
            }));
            break;

          case 'rl_update':
            store.setRLPolicy(msg.policy);
            break;

          case 'error':
            console.error('[WS] Server error:', msg.message);
            break;
        }
      } catch (err) {
        console.warn('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      set({ ws: null });

      if (_intentionalClose) {
        set({ wsConnectionStatus: 'disconnected', reconnectAttempts: 0 });
        return;
      }

      // Auto-reconnect with exponential backoff
      const attempts = get().reconnectAttempts;
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`[WS] Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        set({ wsConnectionStatus: 'failed' });
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      set({ wsConnectionStatus: 'reconnecting', reconnectAttempts: attempts + 1 });

      _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        if (_lastWsUrl) {
          get().connectWS(_lastWsUrl);
        }
      }, delay);
    };

    ws.onerror = (err) => console.error('[WS] Error:', err);

    set({ ws });
  },

  disconnectWS: () => {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    _intentionalClose = true;
    AudioPlaybackManager.getInstance().stop();
    get().ws?.close();
    _intentionalClose = false;
    set({ ws: null, wsConnectionStatus: 'disconnected', reconnectAttempts: 0 });
  },

  sendMessage: (msg: any) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  },

  startSession: (topic: string) => {
    set({ topic, sessionState: 'LISTENING' });
    get().sendMessage({ type: 'start_session', topic });
  },

  addNode: (node: KGNode) => set(produce((s: SessionStore) => { s.nodes[node.id] = node; })),
  addEdge: (edge: KGEdge) => set(produce((s: SessionStore) => { s.edges[edge.id] = edge; })),
  updateNode: (id, updates) => set(produce((s: SessionStore) => {
    if (s.nodes[id]) Object.assign(s.nodes[id], updates);
  })),

  setCurrentScene: (scene) => set(produce((s: SessionStore) => {
    s.currentScene = scene;
    s.sceneHistory.push(scene);
  })),

  setNarration: (text) => set({ narrationText: text }),
  setBookmark: (bookmark) => set({ bookmark }),
  setVoiceEnabled: (enabled) => {
    if (!enabled) {
      // Stop any currently playing audio immediately
      AudioPlaybackManager.getInstance().stop();
    }
    set({ voiceEnabled: enabled });
  },
  stopAudio: () => {
    AudioPlaybackManager.getInstance().stop();
  },
  sendBinaryAudio: (data: ArrayBuffer) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  },
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setRLPolicy: (policy) => set({ rlPolicy: policy }),
  setWordTimestamps: (timestamps) => set({ currentWordTimestamps: timestamps }),
  updateAudioTime: (time) => set({ currentAudioTime: time }),

  enqueueVisualCommand: (cmd) => set(produce((s: SessionStore) => {
    s.visualCommandQueue.push(cmd);
  })),
  dequeueVisualCommand: () => set(produce((s: SessionStore) => {
    s.visualCommandQueue.shift();
  })),
  revealNode: (id) => set(produce((s: SessionStore) => {
    if (!s.revealedNodeIds.includes(id)) {
      s.revealedNodeIds.push(id);
    }
  })),

  addChatMessage: (msg) => set(produce((s: SessionStore) => { s.chatMessages.push(msg); })),

  sendTextInput: (text: string) => {
    const store = get();
    store.addChatMessage({ role: 'user', text, timestamp: Date.now() });
    store.sendMessage({ type: 'text_input', text });
  },

  sendCommand: (cmd: string) => {
    get().sendMessage({ type: 'user_command', command: cmd });
  },

  reset: () => {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    _intentionalClose = false;
    _lastWsUrl = null;
    AudioPlaybackManager.getInstance().destroy();
    set({ ...initialState });
  },
}));
