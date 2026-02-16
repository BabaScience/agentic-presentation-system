# Presentation Environment: How It Works and How the Agent Interacts

This document describes how the Active Presenter's presentation environment operates and how the AI agent orchestrates reasoning, knowledge graph construction, scene planning, and live interaction.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  USER                                                                           │
│  - Enters topic (or asks question)                                              │
│  - Voice input → Microphone → MediaRecorder → Binary WebSocket                  │
│  - Text input → Chat → JSON WebSocket                                           │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│  WEBSOCKET GATEWAY (backend/src/websocket/gateway.ts)                           │
│  - Receives: start_session, text_input (JSON), binary audio                      │
│  - Dispatches to: AgentService, KnowledgeGraphService, VoiceService,            │
│    PresentationPlanner, InterruptHandler, RLService                              │
│  - Sends: state_change, graph_update, scene_change, narration_text,            │
│    visual_command, agent_audio_meta, binary TTS audio                            │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│  FRONTEND (React + Zustand)                                                      │
│  - Session store: nodes, edges, currentScene, narrationText, revealedNodeIds    │
│  - ScenePresenter: card-based fluid presentation, related concept chips         │
│  - AudioPlaybackManager: plays binary TTS from backend                           │
│  - SoundEffectEngine: procedural reveal/transition sounds                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

The agent (Claude via Anthropic API) never directly "drives" the UI. Instead, it produces structured output (reasoning, interrupt answers) that backend services consume to build the knowledge graph and scene sequence. The presentation loop then streams those scenes to the frontend.

---

## 2. The Full Pipeline: From Topic to Presentation

When a user starts a session (e.g., "Kubernetes Networking"), the following phases run in sequence:

### Phase 1: Reasoning (AgentService)

The agent receives the topic and the current RL policy (explanation strategy, pace, visual density, etc.) and produces a `ReasoningOutput`:

- **conceptualPrimitives**: 5–8 nodes with `label`, `type`, `content`, and `narration`
- **relationships**: edges between nodes (`from`, `to`, `type`, `label`)

The agent uses `REASONING_SYSTEM_PROMPT`, which instructs it to:
- Break the topic into 2–3 sentence "beats" focused on one concept at a time
- Use transitional phrases between concepts
- Order concepts from fundamental to advanced

**Agent output format (JSON)**:
```json
{
  "topic": "Kubernetes Networking",
  "conceptualPrimitives": [
    { "label": "Pod", "type": "CONCEPT", "content": "...", "narration": "..." },
    ...
  ],
  "relationships": [
    { "from": "Pod", "to": "Service", "type": "RELATES_TO", "label": "routes to" },
    ...
  ]
}
```

### Phase 2: Knowledge Graph Construction (KnowledgeGraphService)

The `KnowledgeGraphService.buildFromReasoning()` converts the reasoning output into a graph:

1. **Nodes**: Each primitive becomes a `KGNode` with:
   - `id`, `label`, `type`, `content`, `narration`
   - `visual`: coordinates (radial layout around center), size, style, icon, animation
   - `depth`: 0 for root, 1 for direct children
   - `parentId`: for tree structure
   - `rlRelevanceScore`: used for traversal ordering

2. **Edges**: Relationships become `KGEdge` objects linking nodes by ID.

3. **Layout**: Nodes are positioned with root at center (500, 280), others in a circle of radius 200.

The knowledge graph is an **internal data structure**. The frontend never renders it as a raw graph; it uses nodes and edges to drive the card-based presentation (breadcrumbs, related concept chips).

### Phase 3: Graph Delivery to Frontend

The gateway sends each node and edge to the client as `graph_update` mutations:

```json
{ "type": "graph_update", "mutation": { "type": "add_node", "data": { ... } } }
{ "type": "graph_update", "mutation": { "type": "add_edge", "data": { ... } } }
```

The frontend store applies these to its `nodes` and `edges` maps.

### Phase 4: Scene Planning (PresentationPlanner)

The planner converts the ordered graph into a linear presentation path:

1. **Traversal order**: BFS from root, children sorted by RL relevance + policy `expansionPriority`. Only depth 0–2 included in main path.

2. **One node per scene**: Each scene has a single `focusNodeId`, with `nodeIds: [focusNodeId]` and `edgeIds` for edges connecting to previously presented nodes.

3. **Visual commands**: For each scene:
   - `reveal` on focus node (wordTrigger: 0)
   - `connect` on relevant edges at staggered `wordTrigger` intervals

4. **Narration**: Composed from node `narration` plus edge relationship phrases.

5. **Duration**: Derived from word count and RL policy `pace` (WPM).

### Phase 5: Presentation Loop (Gateway.presentLoop)

For each scene in `traversalPath`:

1. **Inter-scene gap**: 300 ms delay (except first scene) for transition animation.

2. **scene_change**: Sent to client; frontend updates `currentScene`, triggers transition sound and CSS.

3. **narration_text**: Sent with the spoken text; client shows it in sidebar and narration strip.

4. **visual_command**: Each command (`reveal`, `connect`) sent; frontend queues them and processes with 300 ms stagger, triggering sound effects and animations.

5. **TTS audio** (if ElevenLabs API key set):
   - `VoiceService.synthesizeSpeech(scene.narration)` → binary MP3
   - `agent_audio_meta` (duration) sent as JSON
   - Raw audio sent as binary WebSocket frame
   - Client plays via `AudioPlaybackManager`

6. **Fallback**: If no TTS, `delay(scene.durationEstimate)` instead.

7. **Node marking**: Nodes in the scene marked `isPresented` in the graph.

8. **Comprehension check**: Every N nodes (RL policy), a "Does that make sense?" prompt is sent.

9. **Completion**: After last scene, a closing narration is sent and state → `COMPLETED`.

---

## 3. Agent Interaction Summary

| Phase | Agent Role | Output | Consumed By |
|-------|------------|--------|-------------|
| Start session | Decompose topic into concepts + relationships | `ReasoningOutput` JSON | KnowledgeGraphService |
| Interrupt | Answer question, add nodes/edges, create answer scenes | `{ mutations, answerScenes }` | Gateway applies mutations, presents scenes |
| Rephrase | Re-explain node with alternate strategy | `{ narration }` | Gateway sends as `narration_text` |

The agent does **not**:
- Control timing or pacing (handled by RL policy + planner)
- Send WebSocket messages (the gateway does)
- Render UI (the frontend does)

---

## 4. WebSocket Protocol

### Client → Server

| Type | Payload | Purpose |
|------|---------|---------|
| `start_session` | `{ topic: string }` | Begin full pipeline for a new topic |
| `text_input` | `{ text: string }` | User typed message; triggers intent classification, interrupt, or new session |
| `user_command` | `{ command: string }` | `pause`, `resume`, `skip`, `go_back`, `show_graph` |
| (binary) | `ArrayBuffer` | Microphone audio; sent to Deepgram STT |

### Server → Client

| Type | Payload | Purpose |
|------|---------|---------|
| `state_change` | `{ from, to }` | Session state transition (IDLE → REASONING → etc.) |
| `graph_update` | `{ mutation }` | Add/update node or edge |
| `scene_change` | `{ scene }` | New active scene; frontend clears visual queue, shows card |
| `narration_text` | `{ text, sceneId }` | Spoken narration for display and chat |
| `visual_command` | `{ command }` | `reveal` or `connect` with `targetId`, `wordTrigger` |
| `agent_audio_meta` | `{ durationMs, sceneId }` | Precedes binary audio frame |
| (binary) | `ArrayBuffer` | TTS audio; played by AudioPlaybackManager |
| `bookmark_created` | `{ bookmark }` | Interrupt pause; UI shows "Interrupted" |
| `bookmark_resumed` | `{ bookmark }` | Resume after interrupt answer |
| `rl_update` | `{ policy }` | Updated RL policy (explanation strategy, pace, etc.) |
| `error` | `{ message }` | Server error |

---

## 5. Knowledge Graph: Internal vs. Presentation

The knowledge graph (`nodes`, `edges`) is the agent's **internal map** of the topic. It is used for:

- **Traversal order**: BFS from root, RL-weighted
- **Scene structure**: Each scene focuses one node; edges determine related concepts
- **Interrupt context**: Agent receives current node + full graph when answering
- **Breadcrumbs**: `parentId` chain → `Topic > Parent > Current`
- **Related chips**: Edges from focus node → other nodes shown as concept chips

The frontend **never** renders the graph as nodes and edges. Instead, `ScenePresenter` shows:
- A centered **scene card** with focus node's content, narration, and type
- **Related concept chips** (other nodes connected via edges, with edge label)
- **Breadcrumb path** (parent chain)

---

## 6. Visual Commands and Animation

Visual commands are queued on the frontend and processed with a 300 ms stagger:

- **reveal**: Add node ID to `revealedNodeIds`; play `SoundEffectEngine.playReveal()`; chip appears
- **connect**: Play `SoundEffectEngine.playConnect()`; edge relationship shown via related chip

On `scene_change`, the frontend:
- Clears `visualCommandQueue` and `revealingNodeIds`
- Triggers `SoundEffectEngine.playTransition()`
- Applies `canvas-transitioning` CSS class
- Renders the new scene card with focus node

---

## 7. Voice Pipeline

### Speech-to-Text (User → Agent)

1. User holds mic; `MediaRecorder` captures audio (WebM/Opus).
2. On stop, chunks are concatenated and sent as binary over WebSocket.
3. Gateway's `handleAudioChunk()` calls `VoiceService.transcribeAudio()` (Deepgram API).
4. Transcript is passed to `handleTextInput()`, which classifies intent.

### Text-to-Speech (Agent → User)

1. For each scene, `VoiceService.synthesizeSpeech(scene.narration)` calls ElevenLabs API.
2. Returns `{ audioData: Buffer, wordTimestamps }`.
3. Gateway sends `agent_audio_meta` (duration) then binary audio.
4. Frontend `AudioPlaybackManager` decodes and plays via Web Audio API.

### Intent Classification (VoiceService.classifyIntent)

Regex patterns map transcript to:
- **QUESTION**: Triggers interrupt protocol
- **CONFUSION**: Triggers rephrase of current node; RL records -1.0 reward
- **ACKNOWLEDGMENT**: RL records +1.0 reward
- **COMMAND**: `go_back`, `skip`, `pause`, etc.

---

## 8. Interrupt Protocol

When the user asks a question during presentation:

1. **Pause**: `presentationAbortController.abort()` stops the loop.
2. **Bookmark**: `InterruptHandler.createBookmark()` saves scene ID, focus node, traversal index.
3. **State**: Transition to `INTERRUPTED`; send `bookmark_created`.
4. **Reason**: `AgentService.handleInterrupt(question, graph, currentNodeId)` calls Claude with `INTERRUPT_SYSTEM_PROMPT`. Returns:
   - `mutations`: new nodes and edges
   - `answerScenes`: scenes to present the answer
5. **Mutate**: Apply mutations to graph; send `graph_update` for each.
6. **Present answer**: For each answer scene, send `scene_change`, `narration_text`, `visual_command`, and TTS (or delay).
7. **Comprehension check**: "Does that clarify your question?"
8. **Resume**: Send `bookmark_resumed`; transition to `PRESENTING`; re-enter `presentLoop` from bookmark index.

---

## 9. RL (Reinforcement Learning) Scaffolding

`RLService` maintains a **Contextual Bandit** with Thompson Sampling:

- **Arms**: Explanation strategy (analogy_first, example_first, etc.), pace (slow/medium/fast), visual density (minimal/moderate/rich).
- **Rewards**: +1.0 acknowledgment, -1.0 confusion, +1.5 deep question.
- **Policy**: Sampled policy influences agent prompts and planner (expansion priority, pace WPM).

The agent receives `rlPolicy` in its reasoning prompt and interrupt prompt. The planner uses `policy.pace`, `policy.visualDensity`, and `policy.expansionPriority` when building scenes and traversal order.

---

## 10. Frontend Presentation Flow

1. **Config screen**: User enters topic or clicks demo.
2. **Live mode**: Connects WebSocket; on open, sends `start_session` with topic.
3. **State transitions**: Store updates `sessionState`; UI shows state badge (REASONING, BUILDING_GRAPH, PRESENTING, etc.).
4. **Graph updates**: `add_node`/`add_edge` mutations update `nodes` and `edges`.
5. **Scene changes**: `setCurrentScene(scene)`; `sceneHistory` grows; `ScenePresenter` renders focus node card.
6. **Visual commands**: Queued; processed every 300 ms; `revealNode` updates `revealedNodeIds`; chips animate in.
7. **Audio**: Binary frames → `AudioPlaybackManager.play(buffer)`.
8. **Chat**: `narration_text` and user messages go to `chatMessages`.

---

## 11. Key Files Reference

| Component | File |
|-----------|------|
| WebSocket gateway, present loop, interrupt | `backend/src/websocket/gateway.ts` |
| Agent reasoning, interrupt, rephrase | `backend/src/services/AgentService.ts` |
| Graph construction, async expansion | `backend/src/services/KnowledgeGraphService.ts` |
| KG → scene sequence | `backend/src/services/PresentationPlanner.ts` |
| TTS (ElevenLabs), STT (Deepgram), intent | `backend/src/services/VoiceService.ts` |
| Bookmark, bridging phrases | `backend/src/services/InterruptHandler.ts` |
| RL policy, rewards | `backend/src/services/RLService.ts` |
| System prompts | `backend/src/prompts/systemPrompts.ts` |
| Session state, graph, commands | `frontend/src/stores/sessionStore.ts` |
| Card presentation, chips, breadcrumbs | `frontend/src/components/ScenePresenter.tsx` |
| TTS playback | `frontend/src/audio/AudioPlaybackManager.ts` |
| Sound effects | `frontend/src/audio/SoundEffectEngine.ts` |
