# Manual Verification Checklist

Permanent infrastructure for anyone touching the demo path. Run before marking Session 8 (or any demo-related changes) complete.

## 11-Item Checklist

1. **Config screen** — Navigate to localhost:3000; config screen shows with topic input and "Launch Demo" button
2. **Launch Demo** — Click "Launch Demo"; demo starts without errors
3. **Scene 1** — First scene (Kubernetes Networking intro) renders with visual elements
4. **TimelineBar** — 5 checkpoints visible in timeline
5. **Advance to scene 2** — Auto-advance or skip; scene 2 (Pod) renders
6. **ParameterPanel** — Sidebar Info tab shows ParameterPanel with `pod_count` slider when on scene 2
7. **pod_count → 3 pods** — Set slider to 3; visual updates to show 3 pod icons (proves parameter propagation)
8. **Checkpoint back** — Click checkpoint 1; navigates to scene 1
9. **Checkpoint forward** — Click checkpoint 2; navigates to scene 2
10. **Start Over** — Click "Start Over"; session resets to config screen
11. **No jank** — Scene transitions and parameter changes feel smooth (no visible lag)

## Pass/Fail

- **Pass:** All 11 items complete without errors
- **Fail:** Any item errors, hangs, or fails to meet the expected behavior
