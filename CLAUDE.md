# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Agentic Presentation System** that transforms passive AI text generation into active, voice-driven teaching. The system constructs live knowledge graphs from classified response data, presents through voice-driven visual narratives, and adapts its pedagogical strategy via reinforcement learning.

**Core Innovation:** Passive Responder (text dump) → Active Presenter (knowledge graph + voice)

## Development Commands

### Local Development (Recommended)

```bash
# Backend
cd backend
npm install
npm run dev        # Hot-reload development server (tsx watch)
npm run build      # TypeScript compilation to dist/
npm start          # Production server (runs compiled JS)

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # Production build (TypeScript + Vite)
npm run preview    # Preview production build
```

### Docker Deployment

```bash
# Configure environment first
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY and other credentials

# Start all services (backend, frontend, redis)
docker compose up --build -d

# Stop services
docker compose down

# Services:
# - Frontend: http://localhost:3000 (nginx + React)
# - Backend API: http://localhost:4000
# - Redis: localhost:6379
# - Health check: http://localhost:4000/health
```

### Demo Mode

The frontend has a standalone demo mode with an embedded knowledge graph (no backend required):

```bash
cd frontend
npm run dev
# Navigate to http://localhost:3000 and click "Launch Demo"
```

## Architecture Overview

### Service Structure

```
┌─────────────────────────────────────────────────────────┐
│  Client (React + SVG + Web Audio)                       │
│  - KG Canvas (D3 Force-directed graph)                  │
│  - Voice UI (Mic/TTS)                                   │
│  - Sidebar (Info/Chat + RL Policy Display)             │
└────────────────┬────────────────────────────────────────┘
                 │ WebSocket (audio + commands + graph mutations)
┌────────────────▼────────────────────────────────────────┐
│  Backend Services                                        │
│  - Agent Core (Claude)                                   │
│  - KG Engine (Async Build)                              │
│  - Voice Pipeline (STT/TTS/VAD)                         │
│  - Planner (KG→Scenes)                                   │
│  - Interrupt Handler                                     │
│  - RL Service (Thompson Sampling)                       │
└─────────────────────────────────────────────────────────┘
```

### Core Pipeline Flow

1. **User Voice** → Speech-to-Text → Transcript
2. **Agent Reasoning** (Claude) → Conceptual decomposition
3. **Fetch & Classify** → 8 data types: CONCEPT, RELATIONSHIP, EXAMPLE, ANALOGY, DEFINITION, PROCESS, RESOURCE, COUNTERPOINT
4. **User Preferences + RL Engine** → Influence classification and traversal
5. **Knowledge Graph Construction** → Core graph (sync) + depth 2+ (async, bounded to 50 nodes)
6. **Presentation Planning** → KG traversal → scene sequence
7. **Voice + Visual Output** → TTS narration + SVG canvas + graph visualization
8. **Interrupt Handling** → Bookmark → Mutate graph → Present answer → Resume

### Directory Structure

```
agentic-presentation-system/
├── shared/types.ts              # ALL TypeScript types (shared by frontend & backend)
├── backend/src/
│   ├── index.ts                 # Express + WebSocket server entry point
│   ├── websocket/gateway.ts     # Full-duplex WebSocket gateway
│   ├── services/                # Core business logic
│   │   ├── AgentService.ts      # Claude reasoning + classification + interrupts
│   │   ├── KnowledgeGraphService.ts  # Graph CRUD, async expansion, mutation
│   │   ├── VoiceService.ts      # STT/TTS integration, intent classification
│   │   ├── PresentationPlanner.ts    # KG traversal → scene sequence
│   │   ├── InterruptHandler.ts  # Bookmark, state snapshot, resume
│   │   └── RLService.ts         # Contextual Bandit + Thompson Sampling
│   ├── routes/sessions.ts       # REST: session CRUD, user profiles
│   └── prompts/systemPrompts.ts # Agent reasoning/classifier/interrupt prompts
└── frontend/src/
    ├── App.tsx                  # Main app: KG canvas, sidebar, timeline
    ├── stores/sessionStore.ts   # Zustand: session, KG, voice, RL state
    └── demo/demoGraph.ts        # Embedded K8s knowledge graph (offline demo)
```

## Key Architectural Patterns

### 1. Shared Type System

**ALL types are defined in `shared/types.ts`** and imported by both frontend and backend. This is the single source of truth for:
- Knowledge graph structures (KGNode, KGEdge, KnowledgeGraph)
- Data classification enums (DataType, EdgeType)
- WebSocket event types (WSClientEvent, WSServerEvent)
- RL types (LearnerState, RLPolicy, RLReward)
- Session state machine (SessionState)
- Voice events (VoiceIntent, VoiceEvent)

When modifying data structures, update `shared/types.ts` first, then update consuming code in both frontend and backend.

### 2. Knowledge Graph Engine

**Two-phase construction:**
- **Sync build (depth 0-1):** Built synchronously before presentation starts, ensures core concepts are ready
- **Async expansion (depth 2+):** Expanded in background, bounded by 50 nodes (KG_NODE_LIMIT) and max depth 4 (KG_MAX_DEPTH)
- **RL-prioritized:** Only expands nodes the RL agent predicts user will explore
- **Live mutation:** Interrupt questions add new nodes/edges in real-time

**Graph mutation protocol:** All graph changes flow through GraphMutation objects with type-safe operations: `add_node`, `add_edge`, `update_node`, `remove_node`, `remove_edge`.

### 3. Interrupt Protocol (5-step)

The system handles user interruptions with a stateful protocol:

1. **Pause & Bookmark** — Save scene ID, word offset, visual state snapshot (PresentationBookmark)
2. **Reason & Mutate** — Agent processes question, adds new KG connections via GraphMutation[]
3. **Present Answer** — Show new nodes as visual branch with narration
4. **Comprehension Check** — "Does that clarify? Any other questions?"
5. **Resume** — Restore bookmark, bridging phrase, continue from word offset

Implementation: `backend/src/services/InterruptHandler.ts` + `AgentService.handleInterrupt()`

### 4. RL Cognitive Scaffolding

**Algorithm:** Contextual Bandit with Thompson Sampling
**State space:** Real-time session signals (confusion rate, interrupt rate, pace, etc.) in LearnerState
**Action space:** Explanation strategy, pacing, visual density, expansion priority in RLPolicy
**Rewards:** +1.0 acknowledgment, +1.5 deep question, -1.0 confusion, -0.5 silence

The RL system is cross-session aware: learner profiles persist in UserPreferences and influence future sessions.

### 5. WebSocket Communication

All real-time communication flows through WebSocket (`backend/src/websocket/gateway.ts`):
- **Client → Server:** audio_chunk, user_command, start_session, ping
- **Server → Client:** agent_audio, visual_command, graph_update, state_change, scene_change, rl_update, error

Use the type-safe event types from `shared/types.ts` (WSClientEvent, WSServerEvent).

### 6. Agent Service (Claude Integration)

`backend/src/services/AgentService.ts` is the core AI orchestrator with three main operations:

- **reason(topic, rlPolicy):** Initial conceptual decomposition → ReasoningOutput
- **handleInterrupt(question, graph, currentNodeId, rlPolicy):** Real-time question handling → GraphMutation[] + PresentationScene[]
- **rephraseNode(graph, nodeId, rlPolicy):** Alternate explanation strategy

All Claude interactions use streaming disabled (max_tokens configuration), JSON output format, and fallback mechanisms for error handling.

### 7. Data Type Classification

8 semantic types (DataType enum) drive both AI classification and visual presentation:
- CONCEPT → blue box (💡)
- RELATIONSHIP → pink arrow (🔗)
- EXAMPLE → green code (📋)
- ANALOGY → orange split panel (🔄)
- DEFINITION → purple text (📖)
- PROCESS → teal flow sequence (⚡)
- RESOURCE → green callout (🔗)
- COUNTERPOINT → pink callout (⚠️)

Visual mappings are defined in `DATA_TYPE_VISUALS` constant in `shared/types.ts`.

## Environment Configuration

Required variables in `.env`:
- **ANTHROPIC_API_KEY:** Claude API access (required for live mode)
- **AGENT_MODEL_REASONING:** Default is `claude-sonnet-4-5-20250929`
- **AGENT_MODEL_FAST:** Default is `claude-sonnet-4-5-20250929`
- **REDIS_URL:** Session state persistence (default: `redis://localhost:6379`)
- **PORT:** Backend server port (default: 4000)

Optional (voice features):
- **ELEVENLABS_API_KEY:** Premium TTS
- **DEEPGRAM_API_KEY:** Enterprise STT
- **OPENAI_API_KEY:** Alternative TTS/STT

## Performance Targets

| Metric | Target |
|--------|--------|
| Voice → First word spoken | < 2s |
| Interrupt detection | < 300ms |
| Graph mutation (interrupt) | < 1s |
| Resume from bookmark | < 500ms |
| Visual sync accuracy | < 100ms drift |
| RL policy update | < 50ms |

These constants are defined in `shared/types.ts`:
- `INTERRUPT_DETECTION_MS = 300`
- `BOOKMARK_RESUME_MS = 500`
- `RL_UPDATE_INTERVAL_MS = 50`

## Important Implementation Notes

### State Machine

The session follows a strict state machine (SessionState enum):
```
IDLE → LISTENING → REASONING → BUILDING_GRAPH → PRESENTING → INTERRUPTED → PRESENTING → COMPLETED
```

State transitions emit `state_change` WebSocket events. The system can only be interrupted during PRESENTING state.

### Graph Constraints

- Max nodes: 50 (KG_NODE_LIMIT)
- Max depth: 4 (KG_MAX_DEPTH)
- Async expansion starts after depth 1
- New interrupt nodes always added at depth 3

### Zustand Store Pattern

Frontend uses a single Zustand store (`frontend/src/stores/sessionStore.ts`) with Immer for immutable updates. All graph mutations, scene transitions, and RL updates flow through this store.

### Voice Pipeline

Voice processing uses:
- **Input:** WebRTC microphone → Silero VAD → Whisper/Deepgram STT
- **Output:** ElevenLabs/OpenAI TTS → word-level timestamps → visual sync
- **Intent classification:** QUESTION, ACKNOWLEDGMENT, CONFUSION, COMMAND
- Sample rate: 16000 Hz (VOICE_SAMPLE_RATE)
- Chunk size: 4096 bytes (VOICE_CHUNK_SIZE)

## Testing

The system has a demo mode for testing UI/UX without backend dependencies. Use `frontend/src/demo/demoGraph.ts` as a reference for creating test knowledge graphs.

To test the full system:
1. Start backend with valid ANTHROPIC_API_KEY
2. Test with a simple topic like "Kubernetes pods"
3. Verify knowledge graph construction
4. Test interrupt handling by asking follow-up questions during presentation
5. Check RL policy updates in the sidebar
