# Migration: Pipeline to Stage

## Data Flow Corrections (see docs/DATA_FLOW_IMPLEMENTATION.md)
- [x] checkpointName required
- [x] agent_audio_meta: remove visualScript/illustrations
- [x] PreparedScene: storyboard required, scene optional
- [x] Frontend: remove agent_audio_meta visualScript merge

## Session 1 — StoryboardEngine (Phases A–H)
- [x] Phase A: Types in shared/types.ts and shared/constants.ts
- [x] Phase B: StoryboardValidator
- [x] Phase C: StoryboardEngine
- [x] Phase D: VisualScriptCompiler extension
- [x] Phase E: SceneExecutor error recovery
- [x] Phase F: Gateway integration
- [x] Phase G: VisualScriptGenerator scaffolding
- [x] Phase H: Frontend storyboard_ready

## Session 2 — SceneGraph.ts
- [x] Persistent stage core
- [x] Elements, dirty tracking, snapshots, viewport
- [x] 7 mandatory tests, performance contracts

## Session 3 — EnvironmentAPI.ts
- [x] Full agent manipulation surface
- [x] 25 API methods tested, <100ms per command

## Session 4 — CheckpointManager + TimelineBar
- [ ] Time travel: create, restore, navigate
- [ ] Restore <100ms for 20 checkpoints, 50 elements each

## Session 5 — ParameterPanel.tsx
- [ ] Reactive controls
- [ ] Parameter propagation <16ms, zero API calls

## Session 6 — Migration
- [ ] SceneGraph replaces frame selector in Illustration
- [ ] Deprecate PresentationScene
- [ ] Remove old path when new path achieves parity
