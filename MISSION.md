# MISSION.md

## The Platform

Making self-learning easier, accessible, and gamified — empowering the passionate minority to achieve superhuman mastery through structured, explorable roadmaps, in a world where most people delegate learning to AI.

That is the mission. Not "AI-powered presentations." Not "knowledge graph visualization." The mission is a **learning platform** that turns curious, driven individuals into domain experts faster than any school, course, or textbook ever could.

The Agentic Presentation System is **one layer** of that platform — the delivery mechanism. It is the engine that takes a concept from a roadmap and brings it to life through voice, visuals, and interaction on a persistent, explorable stage. It does not exist in isolation. It exists to serve the platform. Every architectural decision, every performance contract, every product trade-off flows from this hierarchy:

```
Platform (the mission)
  └── Roadmap Engine (the curriculum)
       └── Presentation System (the delivery)  ← you are here
            └── Stage Environment (the runtime)
```

When you are making a decision and the options conflict, the platform wins. Always.

---

## The Core Paradigm: The Stage, Not The Pipeline

This is the single most important section of this document. Read it twice.

The current implementation describes a **pipeline**: Voice → Claude → KG → Scenes → TTS → Output. That framing is wrong. It is a useful implementation detail, but it is not the product's mental model. The correct mental model:

**The agent is a DIRECTOR with a LIVE STAGE.**

Think: a child using Scratch. They place sprites on a canvas. They set parameters — position, size, color, speed. They build scenes. They can jump to any point in the scenario instantly, without rebuilding anything, because the stage **persists**. The sprites are still there. The parameters are still bound. The child just says "go to scene 3" and the stage snaps to that state in a single frame.

That is what this system is. Not a video player. Not a slideshow. A **stateful, explorable simulation** that the agent directs and the user inhabits.

### Wrong vs. Right

**WRONG:** User asks → AI generates a response → content is dumped to screen → done. User wants a variation? Start over. New API call. Loading spinner. Wait. Stale.

**RIGHT:** Agent builds a live scene graph on the stage. Elements are placed. Parameters are bound. The user navigates freely — forward, backward, sideways into branches. When a parameter changes, the stage updates reactively in one render frame. The stage always persists. The agent can re-enter at any time and manipulate it further. The user can explore it alone.

This distinction has concrete implementation consequences:

- Scene transitions are **checkpoint restores**, not re-renders
- "What if there were 5 pods?" is a `setParameter('pod_count', 5)` call, not a new Claude request
- The user can scrub backward through the presentation like a timeline, because every checkpoint is a frozen snapshot of the stage
- The agent's commands (createElement, moveTo, highlight) are the Scratch blocks — atomic, composable, auditable

If you are writing code that regenerates anything the stage already has, you are doing it wrong.

---

## Guiding Principle: Parameters Over Regeneration

Name it. Internalize it. Enforce it.

When a user asks "what if there were 5 pods instead of 1?", the answer is **instant and visual**. No new API call. No regeneration spinner. No 2-second wait.

The agent previously bound `pod_count` to the pod-grid element during scene construction:

```
defineParameter('pod_count', { type: 'integer', value: 1, min: 1, max: 100 })
bindElementToParameter('pod-grid', 'pod_count', (count) => ({
  properties: { itemCount: count, layout: count > 6 ? 'grid' : 'row' }
}))
```

Now: `setParameter('pod_count', 5)` propagates through reactive bindings in one render frame (<16ms). Five pods appear. Arrows re-route. Labels update. The user sees causality, not latency.

This is the live simulation promise. It is what separates this product from every AI chat wrapper that regenerates output from scratch on every interaction.

Every element the agent places on the stage should, wherever possible, be bound to a parameter. Parameters are the user's knobs. The stage is their sandbox. The agent is the guide who builds the sandbox and teaches them how to explore it.

---

## RL Scope: The Journey, Not The Session

The RL engine in the current architecture optimizes within a single session. That is a feature. The mission is bigger.

The correct scope for reinforcement learning is the **full learning journey**:

- Where is this user in their roadmap? (e.g., Kubernetes Week 4 of 12)
- Which atomic concepts have they mastered vs. struggled with?
- Which explanation modality drove their best comprehension historically?
- What is their optimal pace, not just today, but as a convergent signal across 20+ sessions?

Session-level adaptation (Thompson Sampling on strategy/pace/density) is real-time tuning. Journey-level optimization is the mission. The system should know that this user always struggles with networking abstractions but flies through storage concepts. It should know that analogies work for them in math but examples work better in distributed systems. It should know they are 63% through their Kubernetes roadmap and anchor today's explanation to what they already understand.

The `LearnerProfile` is not a session artifact. It is a **longitudinal learning record** that persists across months, accumulates mastery signals, and informs every future session before the first word is spoken.

### Mastery Write-Back Contract

A concept is considered mastered when:

- Zero confusion signals in the final 2 scenes of a concept explanation
- At least one acknowledgment signal (+1.0 reward) on the summary scene
- Session completion without revisiting the root node

Mastery write-back fires to the roadmap platform API. In Phase 1, it writes to `LearnerProfile.masteredConcepts`. In Phase 2+, it updates the roadmap progress tracker and unlocks downstream concepts.

---

## Who This Is For

The passionate minority.

The person who chooses to **deeply understand** Kubernetes rather than just copy-paste `kubectl apply`. Who learns quantum mechanics out of curiosity, not because a syllabus demands it. Who is building mastery while the world outsources thinking to AI.

This is the user who:

- Spends 45 minutes on a single concept because they want to understand it, not just know it
- Asks "why?" after every explanation and means it
- Builds mental models, not bookmarks
- Values depth over breadth, comprehension over completion
- Treats learning as a craft, not a chore

Every product decision flows from this positioning. The UI is dense because these users are not afraid of density. The RL engine optimizes for comprehension depth, not time-to-completion. The interrupt protocol exists because these users ask real questions mid-explanation. The stage paradigm exists because these users want to explore, not just consume.

### Who This Is NOT For

This product is **not** for people who want quick answers. It is not a search engine. It is not a summarizer. It is not a chatbot with pretty animations.

If someone asks "what is a Kubernetes pod?" and wants a three-sentence answer, they should use ChatGPT. Our system would construct a knowledge graph, build a visual stage, narrate a multi-scene explanation, and invite them to explore pod lifecycle, resource limits, and scheduling constraints. That is the right experience for someone who wants to *understand* pods. It is the wrong experience for someone who wants to *define* pods.

We are building a precision instrument for a specific type of person. We are not building for everyone. We are not building for most people. And that is the product decision that makes everything else possible.

---

## Future Architecture — Phase 2+

The Agentic Presentation System is Phase 1. The composable future:

### Roadmap Platform Integration

The presentation system knows the user's position in their learning roadmap. Before generating a single scene, it queries the roadmap API: what has this user already mastered? What are they supposed to learn this week? What did they struggle with last session?

Explanations anchor to the user's specific knowledge gaps. If they already understand services but not ingress controllers, the system spends 10 seconds on services (a visual callback) and 5 minutes on ingress (the actual lesson). The roadmap is the curriculum. The presentation system is the teacher. The teacher reads the curriculum.

### Mastery Signals (Bidirectional)

Completing a concept in the presentation system writes back to the roadmap progress tracker. The roadmap updates. New concepts unlock. The user sees their progress move. The loop closes:

```
Roadmap assigns concept → Presentation teaches it → RL confirms mastery → Roadmap marks complete → Next concept unlocks
```

This is the gamification layer: visible progress, unlockable content, mastery streaks. Not badges. Not points. Actual skill progression that the user can feel.

### Gamification

Presentation capabilities unlock as users level up:

- **Level 1 (New):** Guided mode. The agent controls the stage. The user watches and asks questions.
- **Level 2 (Familiar):** Interactive mode. The user can tweak parameters mid-presentation. "What if I change the replica count?"
- **Level 3 (Practiced):** Exploration mode. The user navigates the knowledge graph freely. The agent provides narration on demand.
- **Level 4 (Mastered):** Teaching mode. The user builds their own stage configurations and the system critiques them.

### AI Agent API

Semantic, structured endpoints so external AI agents can query and navigate the platform's knowledge graph:

```
GET  /api/v1/roadmap/{userId}/position
GET  /api/v1/concepts/{conceptId}/mastery
POST /api/v1/stage/command          ← Agent Environment API
GET  /api/v1/learner/{userId}/profile
POST /api/v1/sessions/start         ← with roadmap context
```

Other AI systems (tutoring bots, coding assistants, study planners) can integrate with the platform, leveraging its knowledge graph and mastery data to provide richer, context-aware assistance.

---

## Guiding Principles

**The stage persists.** Every design decision assumes the visual environment is stateful and explorable, never disposable.

**Parameters over regeneration.** If the answer to "what if?" requires a new API call, the architecture is wrong.

**Teach, don't dump.** Every design decision optimizes for knowledge transfer, not information display.

**Journey over session.** The RL engine optimizes the full learning arc, not just today's 15 minutes.

**Adapt, don't assume.** The system learns how each user learns best and adjusts accordingly, across sessions, across months.

**Flow, don't interrupt.** Interruptions enhance the teaching flow rather than breaking it. Context is never lost.

**Show, don't tell.** Voice and visuals work together. Neither carries the full explanation alone.

**Build, don't replace.** Visuals accumulate progressively on the stage. Nothing disappears until explicitly removed.

**Depth over breadth.** Serve the passionate minority completely. Do not dilute for the casual majority.

---

## Performance Contracts

These are not aspirational targets. They are architectural laws. If a contract is violated, the implementation is broken, not the contract.

### Stage Paradigm Contracts (Primary)

These define the UX promise of the live stage:

| Metric | Target | Why It Matters |
|---|---|---|
| Checkpoint restore | <100ms | Stage paradigm requires instant jump to any point |
| Parameter propagation | <16ms | One render frame — feels instant, no perceptible delay |
| Scene graph dirty render | <8ms | Only changed elements re-render, never full redraws |
| Agent API command execution | <100ms | Scratch-like immediacy for all agent operations |
| Storyboard generation | <5s | Full plan available before first spoken word |

### Voice Pipeline Contracts

| Metric | Target | Why It Matters |
|---|---|---|
| Voice to first spoken word | <2s | Perceived responsiveness of the system |
| Interrupt detection | <300ms | User feels heard immediately |
| Graph mutation on interrupt | <1s | Answer construction is fast |
| Resume from bookmark | <500ms | Seamless return to main flow |
| Visual sync accuracy | <100ms | Voice and visuals feel locked together |
| RL policy update | <50ms | Adaptation is invisible to the user |

### Graph Constraints

| Parameter | Value |
|---|---|
| Knowledge graph node limit | 50 nodes |
| Knowledge graph depth limit | 4 levels |
| Canvas resolution | 1600 x 900 |
| Voice sample rate | 16,000 Hz |
| Voice chunk size | 4,096 bytes |

---

## What Success Looks Like

A user is in Week 4 of their Kubernetes roadmap. They open the platform. The system knows they mastered pods and services last week but struggled with ingress. Today's lesson: Kubernetes Networking.

Within 2 seconds, a voice begins explaining while the stage comes alive. A cluster appears. Pods materialize inside nodes, connected by animated service meshes. The narration adapts — it skims pods (a quick visual callback to last week) and dives deep into ingress controllers with a step-by-step process visualization.

The user tweaks a parameter: "What if there are 3 replicas?" Three pods appear instantly. Arrows re-route. Load balancing visualization activates. No spinner. No wait. The stage reacts.

They interrupt: "How does DNS resolution work inside the cluster?" The system pauses, branches into a focused mini-explanation with CoreDNS visualizations, checks for understanding, then seamlessly resumes from exactly where it left off.

By the end, the user hasn't just received information. They've inhabited a live simulation of Kubernetes networking. They can scrub back to any checkpoint. They can tweak any parameter. The knowledge graph persists as a navigable map of everything they explored. Their mastery score updates. Next week's lesson unlocks.

That is what we are building.

---

The journey from passive responder to active stage director starts here.
