# Performance Contracts

Performance constants from `shared/constants.ts` and their test coverage.

| Constant | Contract | Test File |
|----------|----------|-----------|
| CHECKPOINT_RESTORE_MS | <100ms | SceneGraph.test.ts |
| PARAMETER_PROPAGATION_MS | <16ms | SceneGraph.test.ts |
| SCENE_DIRTY_RENDER_MS | getDirtyElements+clearDirty <8ms (200 el, 10 dirty) | SceneGraph.test.ts |
| SPATIAL_QUERY_MS | <1ms | SceneGraph.test.ts |
| AGENT_COMMAND_MS | <100ms (25 commands) | SceneExecutor.test.ts |

Run performance-related tests:

```bash
# Frontend
cd frontend && npm run test -- --run src/engine/__tests__/SceneGraph.test.ts src/engine/__tests__/EnvironmentAPI.test.ts src/engine/__tests__/SceneExecutor.test.ts

# Backend
cd backend && npm test
```
