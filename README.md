# Agentic Presentation System V2

## Active Presenter with Personalized Cognitive Scaffolding

An AI agent that constructs **live knowledge graphs** from classified response data, presents through **voice-driven visual narratives**, and continuously adapts its pedagogical strategy via **reinforcement learning** — transforming passive text generation into active, interruptible teaching.

```
Passive Responder (text dump)  →  Active Presenter (knowledge graph + voice)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React + SVG + Web Audio)                            │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ KG Canvas  │  │  Voice UI   │  │  Sidebar (Info/Chat) │  │
│  │ (D3 Force) │  │  (Mic/TTS)  │  │  RL Policy Display   │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │ WebSocket (audio + commands + graph mutations)
┌─────────────────▼───────────────────────────────────────────┐
│  Backend Services                                            │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Agent Core   │  │ KG Engine     │  │ Voice Pipeline   │  │
│  │ (Claude)     │  │ (Async Build) │  │ (STT/TTS/VAD)   │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Planner      │  │ Interrupt     │  │ RL Service       │  │
│  │ (KG→Scenes)  │  │ Handler       │  │ (Thompson Samp.) │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Pipeline

1. **User Voice** → Speech-to-Text → Transcript
2. **Agent Reasoning** (Claude) → Conceptual decomposition
3. **Fetch & Classify** → 8 data types: `CONCEPT`, `RELATIONSHIP`, `EXAMPLE`, `ANALOGY`, `DEFINITION`, `PROCESS`, `RESOURCE`, `COUNTERPOINT`
4. **User Preferences + RL Engine** → Influence classification and traversal
5. **Knowledge Graph Construction** → Core graph (sync) + depth 2+ (async, bounded to 50 nodes)
6. **Presentation Planning** → KG traversal → scene sequence
7. **Voice + Visual Output** → TTS narration + SVG canvas + graph visualization
8. **Interrupt Handling** → Bookmark → Mutate graph → Present answer → Resume

---

## Quick Start

### Demo Mode (No Backend Required)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000 → Click "Launch Demo"
```

### Full Mode (With Backend)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# 2. Start backend
cd backend
npm install
npm run dev

# 3. Start frontend (separate terminal)
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

### Docker

```bash
# 1. Configure environment (required for live mode: ANTHROPIC_API_KEY)
cp .env.example .env

# 2. Build and run all services (backend, frontend, redis)
docker compose up --build -d

# App: http://localhost:3000
# Backend API: http://localhost:4000
# Health: http://localhost:4000/health
```

**Services:** frontend (nginx + React on 3000), backend (Express + WebSocket on 4000), redis (6379).

**Stop:** `docker compose down`

---

## Project Structure

```
agentic-presentation-system/
├── shared/
│   └── types.ts                    # All TypeScript types (KG, RL, Voice, Session)
│
├── backend/
│   ├── src/
│   │   ├── index.ts                # Express + WebSocket server
│   │   ├── websocket/
│   │   │   └── gateway.ts          # Full-duplex WS: audio, commands, graph updates
│   │   ├── services/
│   │   │   ├── AgentService.ts     # Claude reasoning + classification + interrupts
│   │   │   ├── KnowledgeGraphService.ts  # Graph CRUD, async expansion, mutation
│   │   │   ├── VoiceService.ts     # STT/TTS integration, intent classification
│   │   │   ├── PresentationPlanner.ts    # KG traversal → scene sequence
│   │   │   ├── InterruptHandler.ts # Bookmark, state snapshot, resume
│   │   │   └── RLService.ts        # Contextual Bandit + Thompson Sampling
│   │   ├── routes/
│   │   │   └── sessions.ts         # REST: session CRUD, user profiles
│   │   └── prompts/
│   │       └── systemPrompts.ts    # Agent reasoning/classifier/interrupt prompts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Main app: KG canvas, sidebar, timeline
│   │   ├── styles.css              # Complete dark theme
│   │   ├── main.tsx                # React entry
│   │   ├── stores/
│   │   │   └── sessionStore.ts     # Zustand: session, KG, voice, RL state
│   │   └── demo/
│   │       └── demoGraph.ts        # Embedded K8s knowledge graph (offline)
│   └── package.json
│
├── docs/
│   ├── V2_SPECIFICATION.html       # Complete V2 technical specification
│   ├── SPECIFICATION.html          # V1 specification (reference)
│   ├── ARCHITECTURE.md             # Architecture diagrams (Mermaid)
│   ├── API.md                      # API reference
│   └── PROMPTS.md                  # Prompt engineering guide
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Key Systems

### Knowledge Graph Engine
- **Sync build**: Depth 0-1 nodes built before presentation starts
- **Async expansion**: Depth 2+ expanded in background, bounded by 50 nodes / max depth 4
- **RL-prioritized**: Only expand nodes the RL agent predicts the user will explore
- **Live mutation**: Interrupt questions add new nodes/edges in real-time

### Interrupt Protocol
1. **Pause & Bookmark** — Save scene ID, word offset, visual state snapshot
2. **Reason & Mutate** — Agent processes question, adds new KG connections
3. **Present Answer** — Show new nodes as visual branch with narration
4. **Comprehension Check** — "Does that clarify? Any other questions?"
5. **Resume** — Restore bookmark, bridging phrase, continue from word offset

### RL Cognitive Scaffolding
- **Algorithm**: Contextual Bandit with Thompson Sampling
- **State space**: Real-time session signals (confusion rate, interrupt rate, pace, etc.)
- **Action space**: Explanation strategy, pacing, visual density, expansion priority
- **Rewards**: +1.0 acknowledgment, +1.5 deep question, -1.0 confusion, -0.5 silence
- **Cross-session**: Learner profile persists across sessions

### Voice Pipeline
- **Input**: WebRTC microphone → Silero VAD → Whisper/Deepgram STT
- **Output**: ElevenLabs/OpenAI TTS → word-level timestamps → visual sync
- **Intent classification**: QUESTION, ACKNOWLEDGMENT, CONFUSION, COMMAND
- **Interrupt detection**: < 300ms via client-side VAD

---

## Performance Targets

| Metric | Target |
|---|---|
| Voice → First word spoken | < 2s |
| Interrupt detection | < 300ms |
| Graph mutation (interrupt) | < 1s |
| Resume from bookmark | < 500ms |
| Visual sync accuracy | < 100ms drift |
| RL policy update | < 50ms |

---

## Technology Stack

| Layer | Technology |
|---|---|
| AI Agent | Claude Sonnet 4.5 (Anthropic) |
| Speech-to-Text | Whisper Large V3 / Deepgram |
| Text-to-Speech | ElevenLabs / OpenAI TTS |
| Knowledge Graph | In-memory (session) / Neo4j (persistent) |
| RL Engine | Custom Contextual Bandit (TypeScript) |
| Frontend | React 18 + Zustand + D3.js + SVG |
| Transport | WebSocket (ws) |
| State Management | Zustand + Immer |
