import { describe, it, expect, vi } from 'vitest';
import { SceneGraph } from '../SceneGraph';
import { EnvironmentAPI } from '../EnvironmentAPI';
import { SceneExecutor } from '../SceneExecutor';
import type { StoryboardScene, SyncMarker, WordTimestamp, AgentCommand } from '@shared/types';
import { AGENT_COMMAND_MS } from '@shared/constants';

// ── Helpers ──────────────────────────────────────────────────

function makeEnv(): { sg: SceneGraph; env: EnvironmentAPI } {
  const sg = new SceneGraph();
  const env = new EnvironmentAPI(sg);
  return { sg, env };
}

function tickUntilSettled(
  env: EnvironmentAPI,
  stepMs = 16,
  maxSteps = 1000,
): void {
  let steps = 0;
  while (env.getActiveAnimationCount() > 0 && steps < maxSteps) {
    env.tick(stepMs);
    steps++;
  }
}

function makeScene(overrides: Partial<StoryboardScene> & { id: string }): StoryboardScene {
  return {
    name: overrides.id,
    narration: '',
    agentCommands: [],
    viewport: { x: 0, y: 0, zoom: 1, rotation: 0 },
    interactiveParameters: [],
    estimatedDurationSeconds: 5,
    ...overrides,
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SceneExecutor', () => {
  // ── Test 1: Immediate commands execute without delay ───────
  it('immediate commands execute without delay', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({
      id: 'immediate-test',
      agentCommands: [
        {
          method: 'createElement',
          args: {
            id: 'el1',
            type: 'box',
            position: { x: 100, y: 100 },
            properties: { width: 50, height: 50 },
          },
          timing: 'immediate',
        },
      ],
    });

    executor.execute(scene);
    await flushMicrotasks();

    const el = env.getElementById('el1');
    expect(el).toBeDefined();
    expect(el!.position.x).toBe(100);
  });

  // ── Test 2: Timed commands fire at correct elapsed time ────
  it('timed commands fire at correct elapsed time', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({
      id: 'timed-test',
      agentCommands: [
        {
          method: 'createElement',
          args: {
            id: 'timed-el',
            type: 'circle',
            position: { x: 50, y: 50 },
            properties: { width: 40, height: 40 },
          },
          timing: 500, // Fire at 500ms
        },
      ],
    });

    executor.execute(scene);

    // At 200ms — should not have fired
    executor.tick(200);
    expect(env.getElementById('timed-el')).toBeUndefined();

    // At 500ms total — should fire
    executor.tick(300);
    expect(env.getElementById('timed-el')).toBeDefined();
  });

  // ── Test 3: await-previous commands execute sequentially ───
  it('await-previous commands execute sequentially', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({
      id: 'seq-test',
      agentCommands: [
        {
          method: 'createElement',
          args: {
            id: 'seq1',
            type: 'box',
            position: { x: 0, y: 0 },
            properties: { width: 50, height: 50 },
            visible: false,
            opacity: 0,
          },
          timing: 'immediate',
        },
        {
          method: 'fadeIn',
          args: { id: 'seq1', durationMs: 100 },
          timing: 'await-previous',
        },
      ],
    });

    executor.execute(scene);
    await flushMicrotasks();

    // Element should exist and fadeIn should be running
    const el = env.getElementById('seq1');
    expect(el).toBeDefined();

    // Tick to complete fade
    tickUntilSettled(env);
    await flushMicrotasks();

    const final = env.getElementById('seq1')!;
    expect(final.opacity).toBeCloseTo(1.0, 1);
  });

  // ── Test 4: SyncMarker fires when narration time reaches word boundary ──
  it('SyncMarker fires when narration time reaches word boundary', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    // Pre-create element for the highlight command
    env.createElement({
      id: 'sync-target',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const syncMarkers: SyncMarker[] = [
      {
        wordIndex: 2,
        command: {
          method: 'highlight',
          args: { elementId: 'sync-target', color: '#ff0' },
          timing: 'immediate',
        },
      },
    ];

    const wordTimestamps: WordTimestamp[] = [
      { word: 'hello', start: 0, end: 300 },
      { word: 'world', start: 300, end: 600 },
      { word: 'here', start: 600, end: 900 },
    ];

    const scene = makeScene({ id: 'sync-test' });
    executor.execute(scene, syncMarkers, wordTimestamps);
    await flushMicrotasks();

    // Before word 2 starts — no highlight
    executor.updateNarrationTime(500);
    expect(env.getAnnotations().length).toBe(0);

    // At word 2 start time (600ms) — should fire
    executor.updateNarrationTime(600);
    expect(env.getAnnotations().length).toBe(1);
  });

  // ── Test 5: Checkpoint created at scene start ──────────────
  it('checkpoint is created at scene start', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({ id: 'cp-test' });
    executor.execute(scene);

    const checkpoints = env.listCheckpoints();
    const sceneCheckpoint = checkpoints.find((cp) => cp.name === 'scene:cp-test');
    expect(sceneCheckpoint).toBeDefined();
  });

  // ── Test 6: abort() stops further command dispatch ─────────
  it('abort() stops further command dispatch', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({
      id: 'abort-test',
      agentCommands: [
        {
          method: 'createElement',
          args: {
            id: 'abort-el',
            type: 'box',
            position: { x: 0, y: 0 },
            properties: { width: 50, height: 50 },
          },
          timing: 1000, // Would fire at 1000ms
        },
      ],
    });

    executor.execute(scene);
    executor.abort();
    expect(executor.getState()).toBe('aborted');

    // Even after sufficient time, the command should not fire
    executor.tick(2000);
    expect(env.getElementById('abort-el')).toBeUndefined();
  });

  // ── Test 7: Unknown method triggers onCommandError ─────────
  it('unknown method triggers onCommandError callback', async () => {
    const { env } = makeEnv();
    const errorSpy = vi.fn();
    const executor = new SceneExecutor(env, { onCommandError: errorSpy });

    const scene = makeScene({
      id: 'error-test',
      agentCommands: [
        {
          method: 'nonExistentMethod',
          args: {},
          timing: 'immediate',
        },
      ],
    });

    executor.execute(scene);
    await flushMicrotasks();

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toBe('nonExistentMethod');
  });

  // ── Test 8: getProgress() reports correctly ────────────────
  it('getProgress() reports correctly', async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const scene = makeScene({
      id: 'progress-test',
      agentCommands: [
        {
          method: 'createElement',
          args: {
            id: 'p1',
            type: 'box',
            position: { x: 0, y: 0 },
            properties: { width: 50, height: 50 },
          },
          timing: 'immediate',
        },
        {
          method: 'createElement',
          args: {
            id: 'p2',
            type: 'box',
            position: { x: 100, y: 0 },
            properties: { width: 50, height: 50 },
          },
          timing: 1000,
        },
      ],
    });

    executor.execute(scene);
    await flushMicrotasks();

    // One immediate command executed, one timed pending
    expect(executor.getProgress()).toBeCloseTo(0.5, 1);

    // Fire timed
    executor.tick(1000);
    await flushMicrotasks();
    expect(executor.getProgress()).toBeCloseTo(1.0, 1);
  });

  // ── Test 9: tick() is no-op when idle ──────────────────────
  it('tick() is no-op when idle', () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    expect(executor.getState()).toBe('idle');
    // Should not throw
    executor.tick(16);
    expect(executor.getState()).toBe('idle');
  });

  // ── Test 10: 50 immediate createElement commands within perf budget ──
  it(`50 immediate createElement commands execute within ${AGENT_COMMAND_MS}ms`, async () => {
    const { env } = makeEnv();
    const executor = new SceneExecutor(env);

    const commands: AgentCommand[] = [];
    for (let i = 0; i < 50; i++) {
      commands.push({
        method: 'createElement',
        args: {
          id: `perf-el-${i}`,
          type: 'box',
          position: { x: i * 10, y: i * 10 },
          properties: { width: 30, height: 30 },
        },
        timing: 'immediate',
      });
    }

    const scene = makeScene({ id: 'perf-test', agentCommands: commands });

    const start = performance.now();
    executor.execute(scene);
    await flushMicrotasks();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(AGENT_COMMAND_MS);

    // Verify all created
    for (let i = 0; i < 50; i++) {
      expect(env.getElementById(`perf-el-${i}`)).toBeDefined();
    }
  });
});
