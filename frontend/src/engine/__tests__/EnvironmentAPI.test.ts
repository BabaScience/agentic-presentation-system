import { describe, it, expect } from 'vitest';
import { SceneGraph } from '../SceneGraph';
import { EnvironmentAPI } from '../EnvironmentAPI';

// ── Helper ──────────────────────────────────────────────────

function tickUntilSettled(
  env: EnvironmentAPI,
  stepMs = 16,
  maxSteps = 1000,
): number {
  let steps = 0;
  while (env.getActiveAnimationCount() > 0 && steps < maxSteps) {
    env.tick(stepMs);
    steps++;
  }
  return steps;
}

describe('EnvironmentAPI', () => {
  // ── Test 1: Spring moveTo settles at target ───────────────
  it('spring moveTo settles at target position', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'mover',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const promise = env.moveTo('mover', { x: 300, y: 200 });
    tickUntilSettled(env);
    await promise;

    const el = env.getElementById('mover')!;
    expect(el.position.x).toBeCloseTo(300, 1);
    expect(el.position.y).toBeCloseTo(200, 1);
    expect(env.getActiveAnimationCount()).toBe(0);
  });

  // ── Test 2: Linear fadeIn interpolates 0→1 ────────────────
  it('linear fadeIn interpolates opacity correctly', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'fader',
      type: 'box',
      position: { x: 0, y: 0 },
      opacity: 0,
      properties: { width: 50, height: 50 },
    });

    const promise = env.fadeIn('fader', 300);

    // At 150ms: should be ~0.5
    env.tick(150);
    const midEl = env.getElementById('fader')!;
    expect(midEl.opacity).toBeCloseTo(0.5, 1);

    // At 300ms total: should be 1.0
    env.tick(150);
    await promise;
    const finalEl = env.getElementById('fader')!;
    expect(finalEl.opacity).toBeCloseTo(1.0, 1);
    expect(env.getActiveAnimationCount()).toBe(0);
  });

  // ── Test 3: Concurrent animations on different elements ───
  it('concurrent animations on different elements both resolve', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'a',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });
    env.createElement({
      id: 'b',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const pA = env.moveTo('a', { x: 100, y: 100 });
    const pB = env.moveTo('b', { x: 200, y: 200 });

    tickUntilSettled(env);
    await Promise.all([pA, pB]);

    expect(env.getElementById('a')!.position.x).toBeCloseTo(100, 1);
    expect(env.getElementById('b')!.position.x).toBeCloseTo(200, 1);
  });

  // ── Test 4: Annotation lifecycle ──────────────────────────
  it('annotation lifecycle: create, read, remove', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'target',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const handle = env.highlight('target', '#ff0000');
    expect(handle.type).toBe('highlight');
    expect(env.getAnnotations().length).toBe(1);
    expect(env.getAnnotations()[0].color).toBe('#ff0000');

    handle.remove();
    expect(env.getAnnotations().length).toBe(0);
  });

  // ── Test 5: Checkpoint round-trip ─────────────────────────
  it('checkpoint round-trip: create, destroy, restore', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'persist',
      type: 'text',
      position: { x: 100, y: 200 },
      properties: { width: 50, height: 50, label: 'hello' },
    });

    const cp = env.createCheckpoint('before-destroy');
    expect(cp.name).toBe('before-destroy');

    env.destroyElement('persist');
    expect(env.getElementById('persist')).toBeUndefined();

    await env.restoreCheckpoint(cp.id);
    const restored = env.getElementById('persist')!;
    expect(restored).toBeDefined();
    expect(restored.position.x).toBe(100);
    expect(restored.position.y).toBe(200);
  });

  // ── Test 6: Viewport zoomTo animation ─────────────────────
  it('viewport zoomTo settles at target', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);

    const promise = env.zoomTo(2.0);
    tickUntilSettled(env);
    await promise;

    expect(env.getViewport().zoom).toBeCloseTo(2.0, 1);
  });

  // ── Test 7: Parameter passthrough ─────────────────────────
  it('parameter define, set, get passthrough works', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);

    env.defineParameter('count', { type: 'integer', value: 1, default: 1 });
    env.setParameter('count', 5);
    const param = env.getParameter('count')!;
    expect(param.value).toBe(5);
  });

  // ── Test 8: tick() no-op when idle ────────────────────────
  it('tick returns 0 when no animations are active', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    expect(env.tick(16)).toBe(0);
  });

  // ── Test 9: New moveTo cancels in-flight moveTo ───────────
  it('new moveTo cancels in-flight moveTo, element settles at new target', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'cancel_test',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const p1 = env.moveTo('cancel_test', { x: 500, y: 500 });
    // Tick a few frames then redirect
    env.tick(16);
    env.tick(16);
    const p2 = env.moveTo('cancel_test', { x: 100, y: 100 });

    // Old promise should resolve (not reject)
    await p1;

    tickUntilSettled(env);
    await p2;

    const el = env.getElementById('cancel_test')!;
    expect(el.position.x).toBeCloseTo(100, 1);
    expect(el.position.y).toBeCloseTo(100, 1);
  });

  // ── Test 10: destroyElement cancels animations ────────────
  it('destroyElement cancels active animations', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'doomed',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const promise = env.moveTo('doomed', { x: 999, y: 999 });
    env.tick(16);
    expect(env.getActiveAnimationCount()).toBeGreaterThan(0);

    env.destroyElement('doomed');
    expect(env.getActiveAnimationCount()).toBe(0);
    await promise; // Should resolve, not reject
  });

  // ── Test 11: Annotations cleaned up on element destroy ────
  it('annotations are removed when their element is destroyed', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'ann_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });
    env.createElement({
      id: 'ann_el2',
      type: 'box',
      position: { x: 100, y: 0 },
      properties: { width: 50, height: 50 },
    });

    env.highlight('ann_el');
    env.addLabel('ann_el', 'test label', 'top');
    env.drawConnection('ann_el', 'ann_el2');
    expect(env.getAnnotations().length).toBe(3);

    env.destroyElement('ann_el');
    // All 3 annotations reference ann_el (elementId, fromElementId)
    expect(env.getAnnotations().length).toBe(0);
  });

  // ── Test 12: restoreCheckpoint cancels all animations ─────
  it('restoreCheckpoint cancels all animations and restores state', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'cp_el',
      type: 'box',
      position: { x: 50, y: 50 },
      properties: { width: 50, height: 50 },
    });

    const cp = env.createCheckpoint('safe');

    // Start animation
    const movePromise = env.moveTo('cp_el', { x: 999, y: 999 });
    const zoomPromise = env.zoomTo(3.0);
    env.tick(16);
    expect(env.getActiveAnimationCount()).toBeGreaterThan(0);

    await env.restoreCheckpoint(cp.id);
    expect(env.getActiveAnimationCount()).toBe(0);

    // Promises should resolve
    await movePromise;
    await zoomPromise;

    // State should be restored
    const el = env.getElementById('cp_el')!;
    expect(el.position.x).toBe(50);
    expect(el.position.y).toBe(50);
  });

  // ── Test 13: addLabel + drawConnection types ──────────────
  it('addLabel and drawConnection create correct annotation types', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'src',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });
    env.createElement({
      id: 'dst',
      type: 'box',
      position: { x: 100, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const label = env.addLabel('src', 'Source Node', 'bottom-right');
    expect(label.type).toBe('label');

    const conn = env.drawConnection('src', 'dst', {
      stroke: '#ff0000',
      strokeWidth: 2,
      dashArray: '5 5',
      animated: true,
    });
    expect(conn.type).toBe('connection');

    const annotations = env.getAnnotations();
    expect(annotations.length).toBe(2);

    const labelAnn = annotations.find((a) => a.type === 'label')!;
    expect(labelAnn.text).toBe('Source Node');
    expect(labelAnn.anchor).toBe('bottom-right');
    expect(labelAnn.elementId).toBe('src');

    const connAnn = annotations.find((a) => a.type === 'connection')!;
    expect(connAnn.fromElementId).toBe('src');
    expect(connAnn.toElementId).toBe('dst');
    expect(connAnn.connectionStyle!.stroke).toBe('#ff0000');
    expect(connAnn.connectionStyle!.strokeWidth).toBe(2);
    expect(connAnn.connectionStyle!.dashArray).toBe('5 5');
    expect(connAnn.connectionStyle!.animated).toBe(true);
  });
});
