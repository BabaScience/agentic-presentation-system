# MISSION.md — Agentic Presentation System

## The Problem We Solve

The way AI systems deliver knowledge today is fundamentally broken.

When a user asks a question, every major AI assistant responds the same way:
a wall of text. Paragraphs. Bullet points. Markdown formatting. The user is
left to read, re-read, parse, and mentally reconstruct the conceptual
relationships buried in that text. This is the **Passive Responder** paradigm,
and it fails learners in three critical ways:

1. **No structure.** Text dumps lack spatial organization. The learner cannot
   see how concepts connect, which ideas depend on others, or where they
   currently stand in the explanation.

2. **No adaptation.** Every user gets the same explanation regardless of
   their background, pace, or comprehension level.

3. **No interactivity.** The explanation is a monologue. If the learner has
   a question mid-explanation, they must start a new prompt and lose all
   context of the original teaching flow.

These are not minor UX inconveniences. They are fundamental barriers to
knowledge transfer. Humans learn best through multimodal, adaptive,
interactive instruction — not through reading static text.

---

## Our Mission

**Transform passive AI text generation into active, voice-driven teaching
through live knowledge graphs, visual narratives, and reinforcement
learning-based cognitive scaffolding.**

We are building the first AI system that doesn't just *answer* questions —
it *teaches*. It constructs a mental model of the topic, presents it through
synchronized voice and visuals, adapts its strategy to the individual
learner in real time, and handles interruptions without losing context.

The core innovation is a single architectural shift:

```
Passive Responder (text dump) → Active Presenter (knowledge graph + voice)
```

This is not a wrapper around a chatbot. It is a fundamentally different
interaction paradigm for AI-assisted learning.

---

## The Goal

Build an end-to-end agentic presentation system that:

### 1. Decomposes Knowledge into Structured Graphs

When given a topic, the system uses Claude to perform conceptual
decomposition — breaking the topic into its fundamental building blocks
and classifying each piece into one of eight semantic data types:

- **CONCEPT** — Core ideas and abstract notions
- **RELATIONSHIP** — Connections between concepts
- **EXAMPLE** — Concrete instances that illustrate abstractions
- **ANALOGY** — Bridges from familiar to unfamiliar
- **DEFINITION** — Precise, formal descriptions
- **PROCESS** — Step-by-step procedures and workflows
- **RESOURCE** — External references and further reading
- **COUNTERPOINT** — Alternative views, caveats, and edge cases

These classified pieces are assembled into a **knowledge graph** — a
directed graph where nodes represent information units and edges encode
semantic relationships (REQUIRES, CONTAINS, RELATES_TO, EXEMPLIFIES,
CONTRADICTS, LEADS_TO, DEEPENS).

The graph is bounded (50 nodes max, depth 4 max) and constructed in
two phases: core concepts synchronously before presentation begins,
deeper expansions asynchronously in the background — prioritized by
the RL engine's predictions of what the learner will explore next.

### 2. Present Through Voice-Driven Visual Narratives

The knowledge graph is traversed and transformed into a sequence of
**presentation scenes**. Each scene focuses on one or more nodes,
includes a narration script, and is accompanied by a **visual script**
— a frame-by-frame specification of what appears on screen.

The visual system renders:
- SVG illustrations that build progressively (entities accumulate)
- Semantic entity types: diagrams, math, physics, code, flowcharts
- Spring-based animations with staggered choreography
- Zoom and pan focus to direct the learner's attention
- Scene transitions with guaranteed cleanup (no visual artifacts)

Voice narration is synchronized with visuals at the word level.
As the AI speaks, illustrations appear, arrows connect, and the
canvas animates in lockstep with the narration. This creates the
experience of a live tutor drawing on a whiteboard while explaining.

The target latency from user voice input to the first spoken word
of response is under 2 seconds.

### 3. Adapt in Real Time via Reinforcement Learning

The system uses a **Contextual Bandit with Thompson Sampling** to
learn the optimal teaching strategy for each individual user:

**State space** — Real-time session signals:
- Time per node, interrupt rate, confusion rate, acknowledgment rate
- Silence duration, revisit count, current graph depth
- Vocabulary complexity tolerance, modality preference

**Action space** — Adjustable dimensions:
- Explanation strategy (analogy-first, definition-first, example-first)
- Pacing (slow 120 WPM, medium 150, fast 190)
- Visual density (minimal, moderate, rich)
- Comprehension check frequency, graph expansion priority

**Reward signals** — From user behavior:
- +1.0 acknowledgment, +1.5 deep question
- -1.0 confusion, -0.5 prolonged silence

The RL engine updates every 50ms. Learner profiles persist across
sessions — a returning user benefits from everything the system
learned about their preferences in previous interactions.

### 4. Handle Interruptions Without Breaking Flow

Unlike traditional presentations, this system treats interruptions
as a feature, not a bug. When a learner asks a question mid-explanation,
the system executes a five-step interrupt protocol:

**Step 1 — Pause & Bookmark.** Snapshot the current state: scene ID,
word offset, audio timestamp, visual states, traversal position.

**Step 2 — Reason & Mutate.** The AI processes the question in context
of the existing graph, generating new nodes and edges via type-safe
graph mutations.

**Step 3 — Present Answer.** New nodes render as a visual branch with
synchronized narration — a mini presentation within the larger one.

**Step 4 — Comprehension Check.** "Does that clarify? Any other
questions?" — a natural conversation checkpoint.

**Step 5 — Resume.** Restore the bookmark. A bridging phrase connects
the interruption back to the main flow ("So, as we were saying...").
The presentation continues from exactly where it left off — same
scene, same word offset, same visual state.

The target latency for interrupt detection is under 300 milliseconds.
Graph mutation completes in under 1 second. Resume from bookmark
takes under 500 milliseconds.

### 5. Deliver a Premium Visual Experience

- **Liquid glass aesthetic** — Frosted glass surfaces with backdrop
  blur, gradient highlights, and translucent backgrounds
- **Progressive accumulation** — Visuals build up within a scene,
  creating construction rather than abrupt replacement
- **Spring animations** — Natural overshoot and settle on all motion
- **Intelligent zoom/pan** — Auto-focus on relevant illustration regions
- **Clean transitions** — State machine guarantees full scene cleanup

---

## Architecture

All real-time communication flows through a WebSocket gateway.
The client sends audio chunks and commands; the server streams
back audio, visual commands, graph updates, state transitions,
scene changes, and RL policy updates.

```
┌──────────────────────────────────────────────────────┐
│  Client (React + SVG + Web Audio)                    │
│  - Illustration Canvas (frame-based visual scripts)  │
│  - Voice UI (microphone + TTS playback)              │
│  - Knowledge Graph Canvas (D3 force-directed)        │
│  - Sidebar (info panel + chat + RL policy display)   │
│  - Timeline (scene navigation + checkpoints)         │
└──────────────────┬───────────────────────────────────┘
                   │ WebSocket (audio + commands + graph mutations)
┌──────────────────▼───────────────────────────────────┐
│  Backend Services                                     │
│  - Agent Core (Claude) — reasoning + classification   │
│  - Knowledge Graph Engine — build + expand + mutate   │
│  - Voice Pipeline — STT + TTS + VAD + intent          │
│  - Presentation Planner — KG traversal → scenes       │
│  - Visual Script Generator — scenes → frame scripts   │
│  - Interrupt Handler — bookmark + resume protocol      │
│  - RL Service — Thompson Sampling policy engine        │
│  - Scene Pipeline — concurrent scene preparation       │
└──────────────────────────────────────────────────────┘
```

---

## The Pipeline

1. **User Voice** — Microphone → WebRTC → Silero VAD → STT → transcript
2. **Agent Reasoning** — Claude decomposes topic into typed primitives
3. **Knowledge Graph** — Primitives assembled into bounded graph
4. **RL Sampling** — Thompson Sampling selects strategy, pace, density
5. **Scene Planning** — Graph traversal → ordered scene sequence
6. **Visual Scripts** — Scenes expanded into frame-by-frame specs
7. **Voice + Visuals** — TTS with word timestamps synced to canvas
8. **Interrupt Loop** — Bookmark → reason → mutate → present → resume

---

## What Success Looks Like

A user says "Explain how Kubernetes networking works." Within two
seconds, a voice begins explaining while illustrations progressively
build on screen — pods appear, then services, then ingress controllers,
connected by animated arrows showing data flow.

The explanation adapts. If the user seems confused, the system slows
down and switches to analogies. If they're following easily, it picks
up pace and dives deeper.

When the user interrupts — "Wait, how does DNS resolution work inside
a cluster?" — the system smoothly pauses, branches into a focused
mini-explanation with new illustrations, checks for understanding,
then seamlessly resumes from exactly where it left off.

By the end, the user hasn't just received information. They've been
taught. The knowledge graph serves as a persistent map of everything
covered, available for review and further exploration.

---

## Guiding Principles

**Teach, don't dump.** Every design decision optimizes for knowledge
transfer, not information display.

**Adapt, don't assume.** The system learns how each user learns best
and adjusts accordingly.

**Flow, don't interrupt.** Interruptions enhance the teaching flow
rather than breaking it. Context is never lost.

**Show, don't tell.** Voice and visuals work together. Neither carries
the full explanation alone.

**Build, don't replace.** Visuals accumulate progressively. Nothing
disappears until the scene is complete.

**Polish, don't prototype.** The UI targets production quality with
fluid animations, glass aesthetics, and sub-100ms visual sync.

---

## Performance Contracts

| Metric                        | Target       |
|-------------------------------|--------------|
| Voice to first word spoken    | < 2 seconds  |
| Interrupt detection           | < 300 ms     |
| Graph mutation on interrupt   | < 1 second   |
| Resume from bookmark          | < 500 ms     |
| Visual sync accuracy          | < 100 ms     |
| RL policy update              | < 50 ms      |
| Knowledge graph node limit    | 50 nodes     |
| Knowledge graph depth limit   | 4 levels     |

---

## Who This Is For

- **Students** exploring complex topics who need structured, adaptive
  explanations rather than walls of text
- **Professionals** learning new technical domains who benefit from
  visual knowledge graphs and interactive Q&A
- **Educators** seeking AI-powered teaching assistants that model
  good pedagogical practices
- **Anyone** who has ever asked an AI a question and wished it would
  *explain* rather than just *answer*

---

## The Bigger Picture

This project is a proof of concept for a new paradigm in human-AI
interaction. Today's AI interfaces are text-in, text-out. They treat
every user the same and every response as a one-shot monologue.

We believe the future of AI-assisted learning looks different. It
looks like a patient tutor who builds understanding step by step,
adjusts to your pace, welcomes your questions, and never loses the
thread. It looks like knowledge that is shown, not just stated.
It looks like a conversation, not a document.

This system is our attempt to build that future.


The journey from passive responder to active presenter starts here.