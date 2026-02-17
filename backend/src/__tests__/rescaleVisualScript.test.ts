/* ═══════════════════════════════════════════════════════════════
   Tests for rescaleVisualScript — timing rescaling when real
   audio duration differs from estimated duration
   ═══════════════════════════════════════════════════════════════ */

import type { PresentationScene, VisualScript, IllustrationFrame, VisualEntity, IllustrationSpec } from '../../shared/types';

/**
 * Standalone version of rescaleVisualScript from gateway.ts for testing.
 * (The original is a private method on WebSocketGateway.)
 */
function rescaleVisualScript(scene: PresentationScene, realDurationMs: number): void {
  if (!scene.visualScript?.frames.length) return;
  const estimatedDuration = scene.visualScript.totalDuration;
  if (estimatedDuration <= 0 || realDurationMs <= 0) return;

  const scale = realDurationMs / estimatedDuration;

  for (const frame of scene.visualScript.frames) {
    const frameDuration = frame.endTime - frame.startTime;
    frame.startTime = Math.round(frame.startTime * scale);
    frame.endTime = Math.round(frame.endTime * scale);

    const newFrameDuration = frame.endTime - frame.startTime;
    const frameDurationScale = frameDuration > 0 ? newFrameDuration / frameDuration : 1;

    for (const entity of frame.entities) {
      if (entity.animation && entity.animation.delay > 0) {
        entity.animation.delay = Math.round(entity.animation.delay * frameDurationScale);
      }
    }
  }
  scene.visualScript.totalDuration = realDurationMs;

  if (scene.illustrations) {
    for (const illus of scene.illustrations) {
      illus.appearTimingMs = Math.round(illus.appearTimingMs * scale);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function makeEntity(delay = 0): VisualEntity {
  return {
    id: 'e1',
    type: 'Server',
    position: { x: 50, y: 50 },
    size: { width: 120, height: 100 },
    label: 'Server',
    animation: { type: 'fadeIn', duration: 500, delay },
  };
}

function makeFrame(startTime: number, endTime: number, entities: VisualEntity[]): IllustrationFrame {
  return {
    id: `frame-${startTime}`,
    startTime,
    endTime,
    entities,
    narrationSegment: 'test',
    description: 'test',
  };
}

function makeScene(frames: IllustrationFrame[], totalDuration: number, illustrations?: IllustrationSpec[]): PresentationScene {
  return {
    id: 'scene-1',
    nodeIds: [],
    edgeIds: [],
    narration: 'test',
    focusNodeId: 'n1',
    viewport: { x: 0, y: 0, zoom: 1 },
    visualCommands: [],
    durationEstimate: totalDuration,
    visualScript: {
      sceneId: 'scene-1',
      frames,
      totalDuration,
      entities: {},
    },
    illustrations,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('rescaleVisualScript', () => {
  it('should scale frame boundaries proportionally', () => {
    const scene = makeScene(
      [
        makeFrame(0, 3000, [makeEntity()]),
        makeFrame(3000, 6000, [makeEntity()]),
      ],
      6000,
    );

    rescaleVisualScript(scene, 12000); // double the duration

    expect(scene.visualScript!.frames[0].startTime).toBe(0);
    expect(scene.visualScript!.frames[0].endTime).toBe(6000);
    expect(scene.visualScript!.frames[1].startTime).toBe(6000);
    expect(scene.visualScript!.frames[1].endTime).toBe(12000);
    expect(scene.visualScript!.totalDuration).toBe(12000);
  });

  it('should scale animation delays proportionally to frame duration', () => {
    const scene = makeScene(
      [makeFrame(0, 5000, [makeEntity(500)])],
      5000,
    );

    rescaleVisualScript(scene, 10000); // double

    // Frame went from 5000ms to 10000ms, so delay should also double
    expect(scene.visualScript!.frames[0].entities[0].animation!.delay).toBe(1000);
  });

  it('should not modify zero-delay animations', () => {
    const scene = makeScene(
      [makeFrame(0, 5000, [makeEntity(0)])],
      5000,
    );

    rescaleVisualScript(scene, 10000);

    expect(scene.visualScript!.frames[0].entities[0].animation!.delay).toBe(0);
  });

  it('should handle shrinking duration (compression)', () => {
    const scene = makeScene(
      [
        makeFrame(0, 4000, [makeEntity(800)]),
        makeFrame(4000, 8000, [makeEntity(400)]),
      ],
      8000,
    );

    rescaleVisualScript(scene, 4000); // halve

    expect(scene.visualScript!.frames[0].startTime).toBe(0);
    expect(scene.visualScript!.frames[0].endTime).toBe(2000);
    expect(scene.visualScript!.frames[1].startTime).toBe(2000);
    expect(scene.visualScript!.frames[1].endTime).toBe(4000);
    // Delay should halve too
    expect(scene.visualScript!.frames[0].entities[0].animation!.delay).toBe(400);
    expect(scene.visualScript!.frames[1].entities[0].animation!.delay).toBe(200);
  });

  it('should do nothing for scene without visualScript', () => {
    const scene: PresentationScene = {
      id: 'scene-1',
      nodeIds: [],
      edgeIds: [],
      narration: 'test',
      focusNodeId: 'n1',
      viewport: { x: 0, y: 0, zoom: 1 },
      visualCommands: [],
      durationEstimate: 5000,
    };

    // Should not throw
    rescaleVisualScript(scene, 10000);
  });

  it('should do nothing for empty frames array', () => {
    const scene = makeScene([], 5000);
    rescaleVisualScript(scene, 10000);
    expect(scene.visualScript!.frames.length).toBe(0);
  });

  it('should do nothing when estimated duration is 0', () => {
    const scene = makeScene(
      [makeFrame(0, 0, [makeEntity()])],
      0,
    );
    rescaleVisualScript(scene, 5000);
    // Should not crash, total duration stays 0
    expect(scene.visualScript!.totalDuration).toBe(0);
  });

  it('should do nothing when real duration is 0', () => {
    const scene = makeScene(
      [makeFrame(0, 5000, [makeEntity(200)])],
      5000,
    );
    rescaleVisualScript(scene, 0);
    // Should not crash, nothing changes
    expect(scene.visualScript!.totalDuration).toBe(5000);
  });

  it('should rescale legacy illustrations too', () => {
    const illustrations: IllustrationSpec[] = [
      {
        id: 'ill-1',
        type: 'shape',
        elementType: 'box',
        position: { x: 50, y: 50 },
        size: { width: 100, height: 80 },
        style: { fill: '#00e5ff' },
        animation: { type: 'fadeIn', duration: 500, delay: 0 },
        appearTimingMs: 1000,
      },
      {
        id: 'ill-2',
        type: 'icon',
        elementType: 'circle',
        position: { x: 70, y: 50 },
        size: { width: 60, height: 60 },
        style: { fill: '#00e676' },
        animation: { type: 'scaleIn', duration: 500, delay: 0 },
        appearTimingMs: 3000,
      },
    ];

    const scene = makeScene(
      [makeFrame(0, 5000, [makeEntity()])],
      5000,
      illustrations,
    );

    rescaleVisualScript(scene, 10000); // double

    expect(scene.illustrations![0].appearTimingMs).toBe(2000);
    expect(scene.illustrations![1].appearTimingMs).toBe(6000);
  });

  it('should handle identity scaling (no change)', () => {
    const scene = makeScene(
      [makeFrame(0, 5000, [makeEntity(300)])],
      5000,
    );

    rescaleVisualScript(scene, 5000); // same duration

    expect(scene.visualScript!.frames[0].startTime).toBe(0);
    expect(scene.visualScript!.frames[0].endTime).toBe(5000);
    expect(scene.visualScript!.frames[0].entities[0].animation!.delay).toBe(300);
  });

  it('should handle multiple entities per frame', () => {
    const scene = makeScene(
      [makeFrame(0, 4000, [
        makeEntity(0),
        makeEntity(200),
        makeEntity(600),
      ])],
      4000,
    );

    rescaleVisualScript(scene, 8000); // double

    const entities = scene.visualScript!.frames[0].entities;
    expect(entities[0].animation!.delay).toBe(0);
    expect(entities[1].animation!.delay).toBe(400);
    expect(entities[2].animation!.delay).toBe(1200);
  });
});
