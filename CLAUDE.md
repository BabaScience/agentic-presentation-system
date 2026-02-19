# CLAUDE.md — Developer Contract

This file is read by Claude Code at the start of every session. It defines the rules of engagement for all implementation work on this repository.

---

## 1. Project Identity

This is the **Agentic Presentation System** — a stateful, explorable learning simulation directed by an AI agent and inhabited by a human learner. It is NOT a chatbot wrapper. It is NOT a presentation player. It is NOT a pipeline that generates and discards content.

The mental model is a **live stage** — think Scratch, not PowerPoint. The agent places elements, binds parameters, composes scenes. The user navigates, explores, tweaks parameters. The stage persists. Elements react. Checkpoints restore instantly.

The mission: making self-learning easier, accessible, and gamified for the passionate minority — people who choose to deeply understand subjects, not just skim them. Read `MISSION.md` for the full product context. Read `TECHNICAL_ARCHITECTURE.md` for the technical contract.

---

## 2. The Three Laws

These are inviolable. If a proposed change conflicts with a Law, the change is wrong.

### LAW 1 — THE STAGE PERSISTS

The SceneGraph is a persistent, mutable runtime environment. It is never destroyed between scenes — only mutated. Code that tears down and rebuilds the stage between scenes violates this law.

**What this means in practice:**

- Scene transitions are checkpoint restores (state replacement), never full re-renders
- Elements placed by the agent remain on the stage until explicitly removed
- The user can scrub backward to any checkpoint because every checkpoint is a frozen snapshot
- No `innerHTML = ''` or equivalent nuclear resets except on initial load

**Test:** If removing the "clear stage" step between scenes does not break anything, Law 1 is satisfied. If it does break, the architecture is wrong.

### LAW 2 — PARAMETERS OVER REGENERATION

When a user or agent changes a parameter, the stage updates reactively in one render frame (<16ms). No API calls. No regeneration. No loading spinners.

**What this means in practice:**

- `setParameter('pod_count', 5)` propagates through bindings and marks affected elements dirty
- The dirty render cycle updates ONLY changed elements on the next animation frame
- If you are calling Claude to answer "what if X were different?", you are violating Law 2
- Every element the agent places should be bound to parameters wherever possible

**Test:** Change a parameter. If the stage updates in <16ms with zero network requests, Law 2 is satisfied.

### LAW 3 — DIRTY RENDER ONLY

Full scene re-renders are PROHIBITED except on initial load and explicit scene transitions. Every frame cycle touches ONLY elements in the dirty set.

**What this means in practice:**

- Parameter changes mark affected elements dirty — nothing else
- The render function is a no-op when `dirtyElements.size === 0`
- Adding a `console.error` that fires when `dirtyElements.size > 20` is encouraged as a heuristic guard
- React re-renders that touch the full SVG tree violate this law

**Test:** With 100 elements on stage, changing one parameter should touch exactly the bound elements. If a performance profile shows all 100 elements re-rendering, Law 3 is violated.

---

## 3. Development Commands

### Local Development

```bash
# Backend
cd backend
npm install
npm run dev        # Hot-reload development server (tsx watch)
npm run build      # TypeScript compilation to dist/
npm start          # Production server

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # Production build (TypeScript + Vite)
npm run preview    # Preview production build
```

### Docker Deployment

```bash
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY and credentials

docker compose up --build -d    # Start all services
docker compose down             # Stop services

# Services:
# Frontend: http://localhost:3000 (nginx)
# Backend:  http://localhost:4000
# Redis:    localhost:6379
# Health:   http://localhost:4000/health
```

### Demo Mode (No Backend Required)

```bash
cd frontend && npm run dev
# Navigate to http://localhost:3000 and click "Launch Demo"
```

---

## 4. Architecture Quick Reference

Full details in `TECHNICAL_ARCHITECTURE.md`. Here is the structural summary:

### Directory Structure

```
shared/types.ts              ← ALL types (single source of truth)
shared/constants.ts          ← ALL performance constants (single source of truth)

backend/src/
  index.ts                   ← Express + WebSocket server
  websocket/gateway.ts       ← Session orchestrator
  services/
    AgentService.ts          ← Claude reasoning + classification
    AgentOrchestrator.ts     ← Multi-agent scene coordination
    KnowledgeGraphService.ts ← Graph CRUD + async expansion
    VoiceService.ts          ← STT/TTS + intent classification
    PresentationPlanner.ts   ← KG → scene sequence
    InterruptHandler.ts      ← Bookmark + resume
    RLService.ts             ← Thompson Sampling bandit
    VisualScriptGenerator.ts ← Frame-by-frame visual narratives
    ScenePipelineOrchestrator.ts ← Concurrent scene prep
    SceneReadyQueue.ts       ← Async scene queue
    ConcurrencyPool.ts       ← API rate limiting
    + 15 auxiliary services

frontend/src/
  App.tsx                    ← Main app shell
  stores/sessionStore.ts     ← Zustand state management
  components/
    ScenePresenter.tsx       ← Canvas container
    IllustrationCanvas.tsx   ← SVG frame manager
    FrameRenderer.tsx        ← Entity dispatch
    svg/SVGLibrary.tsx       ← 40+ SVG entity components
    SubtitleDisplay.tsx      ← Word-synced subtitles
  audio/
    AudioPlaybackManager.ts  ← TTS playback
    SoundEffectEngine.ts     ← Procedural audio FX
  demo/demoGraph.ts          ← Offline K8s demo
```

### Core Pipeline

```
User input → AgentService.reason() → KnowledgeGraph → Storyboard
  → ScenePipelineOrchestrator (concurrent visual scripts + TTS)
  → SceneReadyQueue → progressivePresentLoop → Client
```

### State Machine

```
IDLE → LISTENING → REASONING → BUILDING_GRAPH → PRESENTING → COMPLETED
                                                    ↕
                                               INTERRUPTED
```

---

## 5. Coding Conventions

### Type System

- **ALL types** live in `shared/types.ts`. Both frontend and backend import from here.
- **ALL constants** live in `shared/constants.ts`. Never hardcode performance numbers.
- When adding a new data structure: add the type to `shared/types.ts` first, then implement.

### Shared Types Rule

When modifying data structures, update `shared/types.ts` first, then update consuming code in both frontend and backend. Never define the same type in two places.

### Performance Constants Rule

All performance contracts are exported as named constants from `shared/constants.ts`:

```typescript
export const CHECKPOINT_RESTORE_MS = 100;
export const PARAMETER_PROPAGATION_MS = 16;
export const SCENE_DIRTY_RENDER_MS = 8;
export const AGENT_COMMAND_MS = 100;
export const STORYBOARD_GENERATION_MS = 5000;
// ... etc
```

Import and reference these constants in assertions, tests, and implementations. Never use magic numbers.

### WebSocket Events

Use type-safe event types from `shared/types.ts` (`WSClientEvent`, `WSServerEvent`). All new real-time events must be added to these unions.

### Graph Mutations

All graph changes flow through `GraphMutation` objects. Never mutate `KnowledgeGraph.nodes` or `.edges` directly. Use `KnowledgeGraphService.applyMutation()`.

### Spring Physics Default

All motion animations use spring physics by default. Default config: `{ stiffness: 170, damping: 26, mass: 1, velocity: 0 }`. Linear easing is only for fade operations.

---

## 6. Testing

### Demo Mode

Frontend has standalone demo mode with embedded K8s knowledge graph. No backend required. Use `frontend/src/demo/demoGraph.ts` as reference for test data.

### Full System Test

1. Start backend with valid `ANTHROPIC_API_KEY`
2. Start frontend: `cd frontend && npm run dev`
3. Test with a simple topic like "Kubernetes pods"
4. Verify: knowledge graph construction, scene rendering, audio sync
5. Test interrupt: ask follow-up question during presentation
6. Verify: bookmark creation, answer scenes, seamless resume
7. Check RL policy updates in sidebar

### Unit Tests

```bash
cd backend && npm test
```

Existing test coverage: ConcurrencyPool, LayoutEngine, ScenePipelineOrchestrator, SceneReadyQueue, VisualScriptGenerator, subtitle chunking.

---

## 7. Environment Configuration

Required in `.env`:

```
ANTHROPIC_API_KEY=          # Required for live mode
```

Optional:

```
AGENT_MODEL_REASONING=claude-sonnet-4-5-20250929
AGENT_MODEL_FAST=claude-sonnet-4-5-20250929
ELEVENLABS_API_KEY=         # Premium TTS
DEEPGRAM_API_KEY=           # Enterprise STT
OPENAI_API_KEY=             # Alternative TTS/STT
REDIS_URL=redis://localhost:6379
PORT=4000
```

---

## 8. Decision Framework

When making implementation decisions, apply these checks in order:

1. **Does it violate a Law?** → Do not proceed. Find an alternative.
2. **Does it respect the Stage metaphor?** → Elements persist, parameters bind, checkpoints restore.
3. **Does it serve the passionate minority?** → Optimize for depth and exploration, not quick answers.
4. **Does it meet the performance contract?** → Check the constant in `shared/constants.ts`. If your implementation cannot meet the target, raise an issue — do not silently degrade.
5. **Is the type defined in `shared/types.ts`?** → If not, add it there first.

When in doubt, read `MISSION.md` for product context and `TECHNICAL_ARCHITECTURE.md` for technical contracts.
