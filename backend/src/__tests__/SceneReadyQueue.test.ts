import { SceneReadyQueue } from '../services/SceneReadyQueue';
import type { PreparedScene } from '../../shared/types';

function makePreparedScene(id: string): PreparedScene {
  const storyboard = {
    id,
    name: id,
    narration: 'test',
    checkpointName: `cp-${id}`,
    agentCommands: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    interactiveParameters: [],
    estimatedDurationSeconds: 5,
  };
  return {
    storyboard,
    scene: {
      id,
      nodeIds: [],
      edgeIds: [],
      narration: 'test',
      focusNodeId: 'n1',
      viewport: { x: 0, y: 0, zoom: 1 },
      visualCommands: [],
      durationEstimate: 5000,
    },
    status: 'ready',
  };
}

describe('SceneReadyQueue', () => {
  it('should return immediately if scene is already ready', async () => {
    const queue = new SceneReadyQueue();
    const scene = makePreparedScene('s1');
    queue.markReady(0, scene);

    const result = await queue.waitForScene(0);
    expect(result).toBe(scene);
  });

  it('should wait until scene is marked ready', async () => {
    const queue = new SceneReadyQueue();
    const scene = makePreparedScene('s1');

    const promise = queue.waitForScene(0);

    // Mark ready after a delay
    setTimeout(() => queue.markReady(0, scene), 50);

    const result = await promise;
    expect(result).toBe(scene);
  });

  it('should handle out-of-order readiness', async () => {
    const queue = new SceneReadyQueue();
    const scene0 = makePreparedScene('s0');
    const scene1 = makePreparedScene('s1');
    const scene2 = makePreparedScene('s2');

    // Mark scene 2 ready first, then 0, then 1
    queue.markReady(2, scene2);
    queue.markReady(0, scene0);
    queue.markReady(1, scene1);

    // Requesting in order should still work
    expect(await queue.waitForScene(0)).toBe(scene0);
    expect(await queue.waitForScene(1)).toBe(scene1);
    expect(await queue.waitForScene(2)).toBe(scene2);
  });

  it('should return null when cancelled', async () => {
    const queue = new SceneReadyQueue();

    const promise = queue.waitForScene(0);
    queue.cancel();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('should return null immediately if already cancelled', async () => {
    const queue = new SceneReadyQueue();
    queue.cancel();

    const result = await queue.waitForScene(0);
    expect(result).toBeNull();
  });

  it('should respect AbortSignal', async () => {
    const queue = new SceneReadyQueue();
    const controller = new AbortController();

    const promise = queue.waitForScene(0, controller.signal);

    setTimeout(() => controller.abort(), 50);

    const result = await promise;
    expect(result).toBeNull();
  });

  it('should return null if AbortSignal is already aborted', async () => {
    const queue = new SceneReadyQueue();
    const controller = new AbortController();
    controller.abort();

    const result = await queue.waitForScene(0, controller.signal);
    expect(result).toBeNull();
  });

  it('should report isReady correctly', () => {
    const queue = new SceneReadyQueue();
    expect(queue.isReady(0)).toBe(false);

    queue.markReady(0, makePreparedScene('s0'));
    expect(queue.isReady(0)).toBe(true);
    expect(queue.isReady(1)).toBe(false);
  });

  it('should report readyCount correctly', () => {
    const queue = new SceneReadyQueue();
    expect(queue.readyCount).toBe(0);

    queue.markReady(0, makePreparedScene('s0'));
    expect(queue.readyCount).toBe(1);

    queue.markReady(3, makePreparedScene('s3'));
    expect(queue.readyCount).toBe(2);
  });

  it('should not store scenes after cancel', () => {
    const queue = new SceneReadyQueue();
    queue.cancel();
    queue.markReady(0, makePreparedScene('s0'));
    expect(queue.isReady(0)).toBe(false);
  });
});
