/* ═══════════════════════════════════════════════════════════════
   Agentic Presentation System V2 — Main Application
   Active Presenter with Knowledge Graph, Voice, RL Scaffolding
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from './stores/sessionStore';
import type { KGNode, PresentationScene, StoryboardScene } from './stores/sessionStore';
import { compilePresentationScene } from '@shared/VisualScriptCompiler';
import { DEMO_NODES, DEMO_EDGES, DEMO_SCENES } from './demo/demoGraph';
import { ScenePresenter } from './components/ScenePresenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SoundEffectEngine } from './audio/SoundEffectEngine';
import { StageEngineProvider, useStageEngine } from './engine/StageEngineContext';
import { ParameterBootstrap } from './components/ParameterBootstrap';
import { ParameterPanel } from './components/ParameterPanel';
import type { StoryboardCheckpoint } from '@shared/types';

// ── Data Type → Visual Config (used by Sidebar) ──────────────
const TYPE_COLORS: Record<string, string> = {
  CONCEPT: '#00e5ff', RELATIONSHIP: '#ff2d7b', EXAMPLE: '#00e676',
  ANALOGY: '#ffab00', DEFINITION: '#b388ff', PROCESS: '#00bcd4',
  RESOURCE: '#4caf50', COUNTERPOINT: '#ff6b9d',
};

const TYPE_ICONS: Record<string, string> = {
  CONCEPT: '💡', RELATIONSHIP: '🔗', EXAMPLE: '📋',
  ANALOGY: '🔄', DEFINITION: '📖', PROCESS: '⚡',
  RESOURCE: '🔗', COUNTERPOINT: '⚠️',
};

// ══════════════════════════════════════════════════════════════
// CONFIG SCREEN
// ══════════════════════════════════════════════════════════════
function ConfigScreen({ onLaunch }: { onLaunch: (topic: string, mode: 'live' | 'demo') => void }) {
  const [topic, setTopic] = useState('');

  return (
    <div className="config-screen">
      <div className="config-card">
        <div className="config-logo">🧠</div>
        <h1>Active Presenter</h1>
        <p className="config-subtitle">
          AI-driven knowledge graphs, voice narration, and personalized cognitive scaffolding.
          Not a passive responder — an active teacher.
        </p>

        <div className="config-input-group">
          <input
            className="config-input"
            type="text"
            placeholder="What would you like to learn? (e.g., Kubernetes Networking)"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && topic.trim() && onLaunch(topic, 'live')}
          />
          <button
            className="btn-primary"
            disabled={!topic.trim()}
            onClick={() => onLaunch(topic, 'live')}
          >
            Start Learning
          </button>
        </div>

        <div className="config-divider"><span>or</span></div>

        <button className="btn-demo" onClick={() => onLaunch('Kubernetes Networking', 'demo')}>
          Launch Demo: Kubernetes Networking
        </button>
        <p className="config-hint">Demo runs without backend — embedded knowledge graph</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR — Info / Graph List / Chat
// ══════════════════════════════════════════════════════════════
function Sidebar({
  nodes, currentScene, narrationText, chatMessages, sessionState,
  sidebarTab, bookmark, rlPolicy, selectedNodeId, storyboardParameters,
  onTabChange, onSendText, onCommand
}: {
  nodes: Record<string, KGNode>;
  currentScene: PresentationScene | StoryboardScene | null;
  narrationText: string;
  chatMessages: Array<{ role: string; text: string; timestamp: number }>;
  sessionState: string;
  sidebarTab: string;
  bookmark: any;
  rlPolicy: any;
  selectedNodeId: string | null;
  storyboardParameters: import('@shared/types').ParameterDefinition[];
  onTabChange: (tab: 'info' | 'graph' | 'chat') => void;
  onSendText: (text: string) => void;
  onCommand: (cmd: string) => void;
}) {
  const [inputText, setInputText] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [chatMessages]);

  const focusNodeId = currentScene && ('focusNodeId' in currentScene ? currentScene.focusNodeId : currentScene.nodeIds?.[0]);
  const focusNode = currentScene && focusNodeId ? nodes[focusNodeId] : null;
  const displayNode = focusNode;

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        {(['info', 'graph', 'chat'] as const).map(tab => (
          <button key={tab} className={`tab ${sidebarTab === tab ? 'active' : ''}`} onClick={() => onTabChange(tab)}>
            {tab === 'info' ? '📋 Info' : tab === 'graph' ? '🕸️ Graph' : '💬 Chat'}
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {/* ── Info Tab ────────────────────────────────── */}
        {sidebarTab === 'info' && (
          <div className="info-panel">
            {/* State Indicator */}
            <div className={`state-badge state-${sessionState.toLowerCase()}`}>
              {sessionState}
            </div>

            {/* Bookmark indicator */}
            {bookmark && (
              <div className="bookmark-indicator">
                ⏸️ Interrupted — Bookmark saved at scene {bookmark.sceneId}
              </div>
            )}

            {/* Current Node Details */}
            {displayNode ? (
              <>
                <h3 className="info-title">{displayNode.visual.icon} {displayNode.label}</h3>
                <span className="type-badge" style={{ color: TYPE_COLORS[displayNode.type], borderColor: TYPE_COLORS[displayNode.type] }}>
                  {displayNode.type}
                </span>
                <p className="info-narration">{displayNode.content}</p>

                {/* Narration text */}
                {narrationText && sidebarTab === 'info' && (
                  <div className="narration-block">
                    <div className="narration-label">🔊 NARRATION</div>
                    <p className="narration-text">{narrationText}</p>
                  </div>
                )}

                {/* Node metadata */}
                <div className="node-meta">
                  <span>Depth: {displayNode.depth}</span>
                  <span>Relevance: {(displayNode.rlRelevanceScore * 100).toFixed(0)}%</span>
                  <span>{displayNode.isPresented ? '✅ Presented' : '⏳ Pending'}</span>
                </div>
              </>
            ) : (
              <p className="panel-empty">Select a node or start a presentation to see details.</p>
            )}

            {/* Parameter controls */}
            <ParameterPanel
              parameters={storyboardParameters}
              currentScene={currentScene}
            />

            {/* RL Policy */}
            {rlPolicy && (
              <div className="rl-panel">
                <div className="rl-title">🎯 RL Policy</div>
                <div className="rl-stats">
                  <span>Strategy: {rlPolicy.explanationStrategy}</span>
                  <span>Pace: {rlPolicy.pace} WPM</span>
                  <span>Density: {rlPolicy.visualDensity}</span>
                  <span>Check every: {rlPolicy.comprehensionCheckFrequency} nodes</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Graph Tab ──────────────────────────────── */}
        {sidebarTab === 'graph' && (
          <div className="graph-list">
            <div className="graph-stats">
              {Object.keys(nodes).length} nodes · {sessionState}
            </div>
            {Object.values(nodes).sort((a, b) => a.depth - b.depth).map(node => (
              <div
                key={node.id}
                className={`graph-list-item ${currentScene?.nodeIds?.includes(node.id) ? 'active' : ''}`}
              >
                <span className="gli-icon">{node.visual.icon || TYPE_ICONS[node.type]}</span>
                <div className="gli-info">
                  <span className="gli-label">{node.label}</span>
                  <span className="gli-meta" style={{ color: TYPE_COLORS[node.type] }}>
                    {node.type} · d{node.depth}
                  </span>
                </div>
                {node.isPresented && <span className="gli-check">✓</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Chat Tab ───────────────────────────────── */}
        {sidebarTab === 'chat' && (
          <div className="chat-panel">
            <div className="chat-messages" ref={chatRef}>
              {chatMessages.length === 0 && (
                <p className="chat-placeholder">Ask a question to interrupt the presentation, or type a new topic to start learning.</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  <span className="msg-role">{msg.role === 'user' ? '🗣️' : '🧠'}</span>
                  <span className="msg-text">{msg.text}</span>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <input
                className="chat-input"
                placeholder={sessionState === 'PRESENTING' ? 'Ask a question (interrupts presentation)...' : 'Type a topic or question...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && inputText.trim()) {
                    onSendText(inputText.trim());
                    setInputText('');
                  }
                }}
              />
              <button
                className="btn-send"
                disabled={!inputText.trim()}
                onClick={() => {
                  if (inputText.trim()) {
                    onSendText(inputText.trim());
                    setInputText('');
                  }
                }}
              >→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TIMELINE BAR
// ══════════════════════════════════════════════════════════════
function TimelineBar({
  scenes,
  storyboardCheckpoints,
  currentSceneIndex,
  sessionState,
  onCommand,
  onCheckpointClick,
}: {
  scenes: Array<PresentationScene | StoryboardScene>;
  storyboardCheckpoints?: StoryboardCheckpoint[];
  currentSceneIndex: number;
  sessionState: string;
  onCommand: (cmd: string) => void;
  onCheckpointClick?: (index: number, checkpointName: string) => void;
}) {
  const markers = (storyboardCheckpoints?.length ? storyboardCheckpoints : scenes) as Array<{ id?: string; sceneId?: string }>;
  const markerCount = markers.length;

  // Duration-based positioning when storyboardCheckpoints have duration data
  const totalDuration =
    storyboardCheckpoints?.reduce(
      (sum, cp) => sum + (cp.actualDurationSeconds ?? cp.estimatedDurationSeconds),
      0,
    ) ?? 0;
  const useDurationBased = storyboardCheckpoints != null && markerCount > 0 && totalDuration > 0;

  const getLeft = (i: number) => {
    if (!useDurationBased) {
      return markerCount > 1 ? (i / (markerCount - 1)) * 100 : 50;
    }
    const cumulative = storyboardCheckpoints!
      .slice(0, i)
      .reduce((s, cp) => s + (cp.actualDurationSeconds ?? cp.estimatedDurationSeconds), 0);
    return (cumulative / totalDuration) * 100;
  };

  const progress = markerCount > 0 ? ((currentSceneIndex + 1) / markerCount) * 100 : 0;

  return (
    <div className="timeline">
      <div className="timeline-controls">
        <button className="btn-tl" onClick={() => onCommand('go_back')} disabled={currentSceneIndex <= 0}>⏮</button>
        <button
          className={`btn-tl play-btn ${sessionState === 'PRESENTING' ? 'active' : ''}`}
          onClick={() => onCommand(sessionState === 'PRESENTING' ? 'pause' : 'resume')}
        >
          {sessionState === 'PRESENTING' ? '⏸' : '▶'}
        </button>
        <button className="btn-tl" onClick={() => onCommand('skip')} disabled={currentSceneIndex >= markerCount - 1}>⏭</button>
      </div>

      <div className="timeline-track">
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        {markers.map((m, i) => {
          const left = getLeft(i);
          const isCurrent = i === currentSceneIndex;
          const isPassed = i < currentSceneIndex;
          const cp = storyboardCheckpoints?.[i];
          const title = cp?.checkpointName ?? (m as any).name ?? `Scene ${i + 1}`;
          const checkpointName = cp?.checkpointName;
          return (
            <button
              key={m.sceneId ?? m.id ?? `marker-${i}`}
              className={`tl-checkpoint ${isCurrent ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
              style={{ left: `${left}%` }}
              title={title}
              onClick={() => checkpointName != null && onCheckpointClick?.(i, checkpointName)}
            >
              <span className="cp-dot" />
            </button>
          );
        })}
      </div>

      <div className="timeline-info">
        <span className="scene-counter">
          {markerCount > 0 ? `${currentSceneIndex + 1} / ${markerCount}` : '—'}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRESENTATION CANVAS — Inside StageEngineProvider, wires checkpoint restore
// ══════════════════════════════════════════════════════════════
function PresentationCanvas({
  sceneTransitioning,
  scenes,
  currentSceneIdx,
  setDemoSceneIndex,
  isDemoMode,
  onCommand,
}: {
  sceneTransitioning: boolean;
  scenes: Array<PresentationScene | StoryboardScene>;
  currentSceneIdx: number;
  setDemoSceneIndex: (fn: (prev: number) => number) => void;
  isDemoMode: boolean;
  onCommand: (cmd: string) => void;
}) {
  const { restoreCheckpoint } = useStageEngine();
  const store = useSessionStore();

  const onCheckpointClick = (i: number, name: string) => {
    if (isDemoMode) {
      setDemoSceneIndex(() => i);
      return;
    }
    restoreCheckpoint(name);
    const historicalScene = store.sceneHistory[i];
    if (historicalScene) {
      store.setCurrentScene(historicalScene);
    }
    store.sendRestoreCheckpoint(name);
  };

  return (
    <>
      <div className={`canvas-container ${sceneTransitioning ? 'canvas-transitioning' : ''}`}>
        <ErrorBoundary fallbackMessage="Presentation renderer encountered an error.">
          <ScenePresenter currentScene={store.currentScene} />
        </ErrorBoundary>

        {(store.sessionState === 'LISTENING' || store.sessionState === 'REASONING' || store.sessionState === 'BUILDING_GRAPH') && Object.keys(store.nodes).length === 0 && (
          <div className="canvas-overlay">
            <div className="loading-spinner" />
            <p>
              {store.sessionState === 'LISTENING' && 'Starting presentation...'}
              {store.sessionState === 'REASONING' && 'Reasoning about your topic...'}
              {store.sessionState === 'BUILDING_GRAPH' && 'Building knowledge graph...'}
            </p>
          </div>
        )}
      </div>

      <TimelineBar
        scenes={scenes}
        storyboardCheckpoints={store.storyboardCheckpoints.length > 0 ? store.storyboardCheckpoints : undefined}
        currentSceneIndex={currentSceneIdx}
        sessionState={store.sessionState}
        onCommand={onCommand}
        onCheckpointClick={onCheckpointClick}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const store = useSessionStore();
  const [demoSceneIndex, setDemoSceneIndex] = useState(-1);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);

  // ── Scene Transition Effect ───────────────────────────
  useEffect(() => {
    if (!store.currentScene) return;
    setSceneTransitioning(true);
    SoundEffectEngine.getInstance().playTransition();
    const t = setTimeout(() => setSceneTransitioning(false), 450);
    // Viewport is handled by the stage engine (panTo + zoomTo commands at t=0)
    return () => clearTimeout(t);
  }, [store.currentScene?.id]);

  // ── Mic Toggle (MediaRecorder → binary WS → Deepgram STT) ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const toggleMic = useCallback(() => {
    if (store.isListening) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!store.ws || store.ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to backend. Start a live session first.');
      return;
    }

    if (!navigator.mediaDevices) {
      alert('Microphone access requires HTTPS or localhost.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        // Combine chunks and send as binary to backend for Deepgram STT
        const blob = new Blob(chunks, { type: 'audio/webm' });
        blob.arrayBuffer().then(buffer => {
          store.sendBinaryAudio(buffer);
          console.log(`[Mic] Sent ${buffer.byteLength} bytes of audio`);
        });
        // Release mic
        stream.getTracks().forEach(t => t.stop());
        useSessionStore.setState({ isListening: false });
      };

      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        useSessionStore.setState({ isListening: false });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      useSessionStore.setState({ isListening: true });
    }).catch(err => {
      console.error('[Mic] getUserMedia failed:', err);
      alert('Could not access microphone. Please allow microphone permission.');
    });
  }, [store]);

  // ── Launch Session ─────────────────────────────────────
  const handleLaunch = useCallback((topic: string, mode: 'live' | 'demo') => {
    if (mode === 'demo') {
      // Load demo data directly
      for (const node of Object.values(DEMO_NODES)) store.addNode(node);
      for (const edge of Object.values(DEMO_EDGES)) store.addEdge(edge);
      useSessionStore.setState({
        storyboardParameters: [
          {
            name: 'pod_count',
            type: 'integer',
            default: 1,
            min: 1,
            max: 5,
            label: 'Pod count',
            bindings: [],
          },
        ],
        totalScenes: DEMO_SCENES.length,
      });
      store.setSessionState('PRESENTING' as any);
      setDemoSceneIndex(0);
    } else {
      // Connect to backend via nginx proxy
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
      store.connectWS(wsUrl, () => store.startSession(topic));
    }
  }, [store]);

  // ── Demo Auto-Advance ──────────────────────────────────
  useEffect(() => {
    if (demoSceneIndex < 0 || demoSceneIndex >= DEMO_SCENES.length) return;

    const scene = DEMO_SCENES[demoSceneIndex];
    const compiled = compilePresentationScene(scene) as StoryboardScene;
    store.setCurrentScene(compiled);
    store.setNarration(scene.narration);
    store.addChatMessage({ role: 'agent', text: scene.narration, timestamp: Date.now() });

    // Mark nodes as presented
    for (const nid of scene.nodeIds) {
      store.updateNode(nid, { isPresented: true });
    }

    // Auto-advance
    demoTimerRef.current = setTimeout(() => {
      if (demoSceneIndex < DEMO_SCENES.length - 1) {
        setDemoSceneIndex(prev => prev + 1);
      } else {
        store.setSessionState('COMPLETED' as any);
        store.addChatMessage({
          role: 'agent',
          text: "That covers the main Kubernetes Networking concepts. Do you have any questions, or would you like to explore a topic in more depth?",
          timestamp: Date.now(),
        });
      }
    }, scene.durationEstimate);

    return () => { if (demoTimerRef.current) clearTimeout(demoTimerRef.current); };
  }, [demoSceneIndex]);

  // ── Demo Time Simulation (drives frame transitions) ───
  useEffect(() => {
    if (demoSceneIndex < 0 || demoSceneIndex >= DEMO_SCENES.length) return;

    const scene = DEMO_SCENES[demoSceneIndex];
    const startRealTime = performance.now();
    store.updateAudioTime(0);

    let rafId: number;
    const tick = () => {
      const elapsed = performance.now() - startRealTime;
      store.updateAudioTime(Math.min(elapsed, scene.durationEstimate));
      if (elapsed < scene.durationEstimate) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [demoSceneIndex]);

  // ── Demo Commands ──────────────────────────────────────
  const handleCommand = useCallback((cmd: string) => {
    if (demoSceneIndex >= 0) {
      // Demo mode commands
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);

      if (cmd === 'skip' && demoSceneIndex < DEMO_SCENES.length - 1) {
        setDemoSceneIndex(prev => prev + 1);
      } else if (cmd === 'go_back' && demoSceneIndex > 0) {
        setDemoSceneIndex(prev => prev - 1);
      } else if (cmd === 'pause') {
        store.setSessionState('INTERRUPTED' as any);
      } else if (cmd === 'resume') {
        store.setSessionState('PRESENTING' as any);
        setDemoSceneIndex(demoSceneIndex); // Re-trigger
      }
    } else {
      store.sendCommand(cmd);
    }
  }, [demoSceneIndex, store]);

  // ── Text Input Handler ─────────────────────────────────
  const handleSendText = useCallback((text: string) => {
    if (demoSceneIndex >= 0) {
      // Demo mode: simulate interrupt
      store.addChatMessage({ role: 'user', text, timestamp: Date.now() });
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      store.setSessionState('INTERRUPTED' as any);

      setTimeout(() => {
        store.addChatMessage({
          role: 'agent',
          text: `Great question about "${text}"! In a live session, the agent would reason about this, add new nodes to the knowledge graph, and present the answer visually. The demo doesn't connect to the backend, but try the live mode for the full experience!`,
          timestamp: Date.now(),
        });
        store.setSidebarTab('chat');
      }, 500);

      // Resume after 5s
      setTimeout(() => {
        store.setSessionState('PRESENTING' as any);
        if (demoSceneIndex < DEMO_SCENES.length - 1) {
          setDemoSceneIndex(prev => prev + 1);
        }
      }, 5000);
    } else {
      store.sendTextInput(text);
    }
  }, [demoSceneIndex, store]);

  // ── Render ─────────────────────────────────────────────
  if (store.sessionState === 'IDLE' && Object.keys(store.nodes).length === 0) {
    return <ConfigScreen onLaunch={handleLaunch} />;
  }

  const scenes: Array<PresentationScene | StoryboardScene> = demoSceneIndex >= 0 ? DEMO_SCENES : store.sceneHistory;
  const currentSceneIdx =
    demoSceneIndex >= 0
      ? demoSceneIndex
      : store.sceneHistory.length > 0
        ? store.sceneHistory.length - 1
        : 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-logo">🧠</span>
          <span className="header-title">Active Presenter</span>
          {store.bookmark && <span className="branch-badge">⏸ Interrupted</span>}
        </div>
        <div className="header-right">
          <button
            className="btn-reset"
            onClick={() => { store.disconnectWS(); store.reset(); }}
            title="Start over"
          >
            ↺ Start Over
          </button>
          <button
            className={`btn-voice ${store.voiceEnabled ? 'active' : ''}`}
            onClick={() => store.setVoiceEnabled(!store.voiceEnabled)}
            title={store.voiceEnabled ? 'Mute narration' : 'Enable narration'}
          >{store.voiceEnabled ? '🔊' : '🔇'}</button>
          <button
            className={`btn-mic ${store.isListening ? 'active' : ''}`}
            onClick={toggleMic}
            title={store.isListening ? 'Stop listening' : 'Voice input'}
          >🎙</button>
        </div>
      </header>

      {/* Main Layout — StageEngineProvider wraps both canvas and Sidebar for ParameterPanel env access */}
      <StageEngineProvider>
        <ParameterBootstrap />
        <div className="main-layout">
          <div className="canvas-area">
            <PresentationCanvas
              sceneTransitioning={sceneTransitioning}
              scenes={scenes}
              currentSceneIdx={currentSceneIdx}
              setDemoSceneIndex={setDemoSceneIndex}
              isDemoMode={demoSceneIndex >= 0}
              onCommand={handleCommand}
            />
          </div>

          {/* Sidebar */}
          <ErrorBoundary fallbackMessage="Sidebar encountered an error.">
            <Sidebar
              nodes={store.nodes}
              currentScene={store.currentScene}
              narrationText={store.narrationText}
              chatMessages={store.chatMessages}
              sessionState={store.sessionState}
              sidebarTab={store.sidebarTab}
              bookmark={store.bookmark}
              rlPolicy={store.rlPolicy}
              selectedNodeId={null}
              storyboardParameters={store.storyboardParameters}
              onTabChange={store.setSidebarTab}
              onSendText={handleSendText}
              onCommand={handleCommand}
            />
        </ErrorBoundary>
        </div>
      </StageEngineProvider>
    </div>
  );
}
