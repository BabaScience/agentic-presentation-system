# Data Flow Implementation Plan

Apply the corrections from `docs/DATA_FLOW_TRANSFORMATION.html` to the codebase. Ordered by dependency and risk.

---

## 1. checkpointName Required (Low Risk)

**Goal:** Every StoryboardScene has a checkpointName after validation.

**Files:**
- `shared/types.ts` — `StoryboardScene.checkpointName`: remove `?`, make required
- `backend/src/services/StoryboardValidator.ts` — ensure `checkpointName` is required in schema; add normalization step that assigns `checkpointName: scene.checkpointName ?? \`checkpoint-${i}\`` if missing before validation

**StoryboardEngine** already assigns it in `normalizeStoryboard` and `buildFallbackStoryboard`. The validator just needs to enforce it.

**Verification:** StoryboardValidator tests pass; StoryboardEngine tests pass.

---

## 2. agent_audio_meta: Remove visualScript/illustrations (Medium Risk)

**Goal:** New path sends only `durationMs`, `sceneId`, `wordTimestamps`. Frontend uses `agentCommands` from `scene_change` as single source of visual truth.

**Files:**
- `backend/src/websocket/gateway.ts` — remove `visualScript` and `illustrations` from all `agent_audio_meta` sends (progressivePresentLoop, presentLoop, interrupt resume path)
- `shared/types.ts` — in `WSServerEvent` for `agent_audio_meta`, mark `visualScript` and `illustrations` as `@deprecated` in the type comment (or keep optional for demo mode)
- `frontend/src/stores/sessionStore.ts` — the `agent_audio_meta` handler that merges `visualScript`/`illustrations` into `currentScene` can be removed or left as no-op (it will receive nothing)

**Demo mode:** If demo uses `agent_audio_meta` with `visualScript`, keep the type optional in shared/types for backward compat. Demo may use `scene_change` with pre-compiled `agentCommands` instead — verify.

**Verification:** Start live session; illustrations render from `agentCommands`. Demo mode still works.

---

## 3. PreparedScene: storyboard Required, scene Optional (Medium Risk)

**Goal:** `storyboard` is the primary artifact on the new path. `scene` is deprecated for legacy.

**Files:**
- `shared/types.ts` — `PreparedScene`: `storyboard: StoryboardScene` (required), `scene?: PresentationScene` (optional)
- `backend/src/services/ScenePipelineOrchestrator.ts` — ensure every `PreparedScene` has `storyboard` set. Fallbacks already set it. `prepareStoryboardScene` and `prepareScene` both set `storyboard`. Add `scene` only when needed for traversalPath (e.g. for narration, nodeIds). The pipeline currently sets both — we just need to ensure `storyboard` is never undefined when status is 'ready'.
- `backend/src/websocket/gateway.ts` — use `prepared.storyboard` as primary. Current: `const storyboard = prepared.storyboard ?? compilePresentationScene(scene)`. After change, `prepared.storyboard` is always defined. For `scene` we use `prepared.scene` — if optional, we need to derive narration/nodeIds from storyboard when scene is absent. The storyboard has `narration`, `nodeIds`, `id`. So we can use `storyboard` for narration and scene id. The `traversalPath` stores `PresentationScene` for interrupt — we need that. So we must keep setting `scene` in the pipeline for traversalPath. The type change is: storyboard required, scene optional. The pipeline will continue to set both when we have a valid prepared scene. The fallbacks also set both. So the only change is the type definition — the runtime behavior stays the same. We just need to update the type and ensure no consumer assumes `scene` is always present. The gateway uses `scene` for: `traversalPath[sceneIndex] = scene`, `scene.narration`, `scene.nodeIds`, `scene.durationEstimate`. If we make scene optional, we need a fallback. We could derive from storyboard: `const scene = prepared.scene ?? { id: storyboard.id, narration: storyboard.narration, nodeIds: storyboard.nodeIds ?? [], ... }`. So we need a small helper.
- `backend/src/services/SceneReadyQueue.ts` — no change (uses PreparedScene)
- `backend/src/__tests__/SceneReadyQueue.test.ts` — update `makePreparedScene` to include `storyboard` (required)

**Verification:** `npm run build`; `npm test`; live session works.

---

## 4. Frontend: Remove agent_audio_meta visualScript/illustrations Merge (Low Risk)

**Goal:** Stop merging `visualScript`/`illustrations` into `currentScene` — they are no longer sent.

**Files:**
- `frontend/src/stores/sessionStore.ts` — in `agent_audio_meta` handler, remove the block that updates `s.currentScene.visualScript` and `s.currentScene.illustrations`. Keep `wordTimestamps` handling.

**Verification:** No references to `currentScene.visualScript` or `currentScene.illustrations` in render path (SceneGraphPresenter uses `agentCommands`).

---

## 5. RL Feedback Loops (Future)

**Goal:** Document the intended design. Implementation is optional for this sprint.

**Mid-session:** `SceneExecutor` completion → `RLService.recordReward()` → `ScenePipelineOrchestrator.reorderPendingScenes(updatedPolicy)`. The `reorderPendingScenes` method may not exist yet — add to backlog.

**Cross-session:** `LearnerProfileService.save()` on session end; `load(userId)` on next session; pass to `StoryboardEngine.plan(graph, learnerProfile)`.

**Verification:** N/A for this sprint.

---

## 6. Interaction Paths (Implementation Check)

**Goal:** Verify checkpoint restore and parameter change flows match the document.

**Checkpoint restore:** Gateway handles `restore_checkpoint`? Check `gateway.ts` for handler. If present, ensure it calls `CheckpointManager.restoreCheckpoint` and sends `checkpoint_restored`. Frontend: `sendRestoreCheckpoint` sends the event; `parameter_update` is echoed for `set_parameter`.

**Parameter change:** Frontend `sendSetParameter` sends to server; server echoes `parameter_update`. But the document says parameter changes are frontend-only — no server round-trip for the visual update. The frontend should call `EnvironmentAPI.setParameter` locally. The `set_parameter` message to server is for multi-client sync. Verify: does the frontend update locally on slider change, or does it wait for server echo?

**Verification:** Manual test of checkpoint click and parameter slider.

---

## Execution Order

1. **checkpointName** (1) — type + validator
2. **agent_audio_meta** (2) — gateway + types
3. **Frontend** (4) — sessionStore cleanup
4. **PreparedScene** (3) — types + pipeline + gateway + tests

RL (5) and Interaction Paths (6) are verification/documentation; implement when ready.
