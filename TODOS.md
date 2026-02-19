# Migration: Pipeline to Stage

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
- [ ] Persistent stage core
- [ ] Elements, dirty tracking, snapshots, viewport
- [ ] 7 mandatory tests, performance contracts

## Session 3 — EnvironmentAPI.ts
- [ ] Full agent manipulation surface
- [ ] 25 API methods tested, <100ms per command

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
