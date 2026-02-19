import { describe, it, expect } from 'vitest';
import { SceneGraph } from '../SceneGraph';
import { EnvironmentAPI } from '../EnvironmentAPI';
import { AGENT_COMMAND_MS } from '@shared/constants';

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
    expect(env.getElementById('persist')).toBeNull();

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

  // ── Test 14: showElement ───────────────────────────────────
  it('showElement — immediate and with duration', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'show_el',
      type: 'box',
      position: { x: 0, y: 0 },
      visible: false,
      opacity: 0,
      properties: { width: 50, height: 50 },
    });

    // Immediate
    await env.showElement('show_el');
    expect(env.getElementById('show_el')!.visible).toBe(true);
    expect(env.getElementById('show_el')!.opacity).toBe(1);

    // With duration (fadeIn path)
    env.updateElement('show_el', { opacity: 0 });
    const promise = env.showElement('show_el', 200);
    tickUntilSettled(env);
    await promise;
    expect(env.getElementById('show_el')!.opacity).toBeCloseTo(1, 1);
  });

  // ── Test 15: hideElement ───────────────────────────────────
  it('hideElement — immediate and with duration', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'hide_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    // With duration (fadeOut path)
    const promise = env.hideElement('hide_el', 200);
    tickUntilSettled(env);
    await promise;
    expect(env.getElementById('hide_el')!.visible).toBe(false);

    // Immediate (element still exists)
    env.updateElement('hide_el', { visible: true });
    await env.hideElement('hide_el');
    expect(env.getElementById('hide_el')!.visible).toBe(false);
  });

  // ── Test 16: moveBy ───────────────────────────────────────
  it('moveBy — delta applied, settles at new position', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'moveby_el',
      type: 'box',
      position: { x: 100, y: 50 },
      properties: { width: 50, height: 50 },
    });

    const promise = env.moveBy('moveby_el', { x: 30, y: -20 });
    tickUntilSettled(env);
    await promise;

    const el = env.getElementById('moveby_el')!;
    expect(el.position.x).toBeCloseTo(130, 1);
    expect(el.position.y).toBeCloseTo(30, 1);
  });

  // ── Test 17: scaleTo ──────────────────────────────────────
  it('scaleTo — element properties.scale updated', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'scale_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const promise = env.scaleTo('scale_el', 2.5);
    tickUntilSettled(env);
    await promise;

    const el = env.getElementById('scale_el')!;
    expect(el.properties['scale']).toBeCloseTo(2.5, 1);
  });

  // ── Test 18: rotateTo ─────────────────────────────────────
  it('rotateTo — element properties.rotation updated', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'rot_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    const promise = env.rotateTo('rot_el', 90);
    tickUntilSettled(env);
    await promise;

    const el = env.getElementById('rot_el')!;
    expect(el.properties['rotation']).toBeCloseTo(90, 1);
  });

  // ── Test 19: fadeOut ───────────────────────────────────────
  it('fadeOut — opacity 1→0 over duration', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'fadeout_el',
      type: 'box',
      position: { x: 0, y: 0 },
      opacity: 1,
      properties: { width: 50, height: 50 },
    });

    const promise = env.fadeOut('fadeout_el', 300);
    env.tick(150);
    expect(env.getElementById('fadeout_el')!.opacity).toBeCloseTo(0.5, 1);
    env.tick(150);
    await promise;
    expect(env.getElementById('fadeout_el')!.opacity).toBeCloseTo(0, 1);
  });

  // ── Test 20: panTo ─────────────────────────────────────────
  it('panTo — viewport x,y updated', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);

    const promise = env.panTo({ x: 150, y: 200 });
    tickUntilSettled(env);
    await promise;

    const vp = env.getViewport();
    expect(vp.x).toBeCloseTo(150, 1);
    expect(vp.y).toBeCloseTo(200, 1);
  });

  // ── Test 21: focusOn ───────────────────────────────────────
  it('focusOn — centers viewport on element and sets focusElementId', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'target',
      type: 'box',
      position: { x: 400, y: 300 },
      properties: { width: 100, height: 80 },
    });

    const promise = env.focusOn('target', 20);
    tickUntilSettled(env);
    await promise;

    const vp = env.getViewport();
    expect(vp.focusElementId).toBe('target');
    expect(vp.x).toBeCloseTo(400, -1);
    expect(vp.y).toBeCloseTo(300, -1);
  });

  // ── Test 22: resetView ─────────────────────────────────────
  it('resetView — viewport returns to 0,0,1,0', async () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);

    let promise = env.panTo({ x: 100, y: 200 });
    tickUntilSettled(env);
    await promise;

    promise = env.zoomTo(2.5);
    tickUntilSettled(env);
    await promise;

    promise = env.resetView();
    tickUntilSettled(env);
    await promise;

    const vp = env.getViewport();
    expect(vp.x).toBeCloseTo(0, 1);
    expect(vp.y).toBeCloseTo(0, 1);
    expect(vp.zoom).toBeCloseTo(1, 1);
    expect(vp.rotation ?? 0).toBeCloseTo(0, 1);
  });

  // ── Test 23: bindElementToParameter — binding propagates, unbinding stops ─
  it('bindElementToParameter — binding propagates, unbinding stops', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'el1',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: {},
    });
    env.defineParameter('count', {
      type: 'integer',
      value: 1,
      default: 1,
      min: 1,
      max: 5,
    });

    const handle = env.bindElementToParameter('el1', 'count', (v) => ({
      properties: { itemCount: v },
    }));

    env.setParameter('count', 3);
    expect(env.getElementById('el1')!.properties['itemCount']).toBe(3);

    handle.unbind();
    env.setParameter('count', 5);
    expect(env.getElementById('el1')!.properties['itemCount']).toBe(3);
  });

  // ── Performance tests ───────────────────────────────────────

  it('createCheckpoint — single call with 50 elements completes within AGENT_COMMAND_MS', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    for (let i = 0; i < 50; i++) {
      env.createElement({
        id: `perf_${i}`,
        type: 'box',
        position: { x: i * 10, y: i * 10 },
        properties: { width: 30, height: 30 },
      });
    }

    const start = performance.now();
    env.createCheckpoint('perf-checkpoint');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(AGENT_COMMAND_MS);
  });

  it('restoreCheckpoint — single call completes within AGENT_COMMAND_MS', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    for (let i = 0; i < 50; i++) {
      env.createElement({
        id: `restore_${i}`,
        type: 'box',
        position: { x: i * 10, y: i * 10 },
        properties: { width: 30, height: 30 },
      });
    }
    const cp = env.createCheckpoint('restore-test');
    env.updateElement('restore_0', { position: { x: 999, y: 999 } });

    const start = performance.now();
    env.restoreCheckpoint(cp.id);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(AGENT_COMMAND_MS);
    expect(env.getElementById('restore_0')!.position.x).toBe(0);
  });

  it('createElement batch — 25 createElement calls complete within AGENT_COMMAND_MS', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);

    const start = performance.now();
    for (let i = 0; i < 25; i++) {
      env.createElement({
        id: `batch_${i}`,
        type: 'box',
        position: { x: i * 10, y: i * 10 },
        properties: { width: 30, height: 30 },
      });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(AGENT_COMMAND_MS);
    for (let i = 0; i < 25; i++) {
      expect(env.getElementById(`batch_${i}`)).toBeDefined();
    }
  });

  it('updateElement batch — 50 sequential updates complete within AGENT_COMMAND_MS', () => {
    const sg = new SceneGraph();
    const env = new EnvironmentAPI(sg);
    env.createElement({
      id: 'upd_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });

    // Tests the synchronous state mutation cost, not animation duration.
    // Each updateElement marks the element dirty and updates the Map —
    // no animation, no async work.
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      env.updateElement('upd_el', { opacity: i / 50 });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(AGENT_COMMAND_MS);
    expect(env.getElementById('upd_el')!.opacity).toBeCloseTo(1, 1);
  });
});
