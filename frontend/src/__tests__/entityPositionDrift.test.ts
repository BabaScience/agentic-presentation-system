/**
 * Entity Position Drift — Diagnostic Tests
 *
 * Problem: Entities initially render at correct positions, then jump to the
 * top-left corner of the presentation canvas.
 *
 * These tests isolate every stage of the positioning pipeline to find where
 * positions get corrupted, zeroed, or shared by mutable reference.
 */

import { describe, it, expect } from 'vitest';
import type {
  VisualEntity,
  VisualScript,
  IllustrationFrame,
  IllustrationSpec,
  VisualEntityType,
} from '../../../shared/types';

// Inline the clampEntityPosition function (mirrors shared/types.ts)
// to avoid ESM resolution issues with the shared module in vitest
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;
const ENTITY_LABEL_PADDING_PX = 22;

function clampEntityPosition(
  position: { x: number; y: number },
  entityWidthPx: number,
  entityHeightPx: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): { x: number; y: number } {
  // Guard against NaN — default to canvas center
  const px = isNaN(position.x) ? 50 : position.x;
  const py = isNaN(position.y) ? 50 : position.y;
  const halfWPct = (entityWidthPx / 2) / canvasWidth * 100;
  const halfHPct = (entityHeightPx / 2) / canvasHeight * 100;
  const labelPadPct = ENTITY_LABEL_PADDING_PX / canvasHeight * 100;
  const pad = 1;
  return {
    x: Math.max(halfWPct + pad, Math.min(100 - halfWPct - pad, px)),
    y: Math.max(halfHPct + pad, Math.min(100 - halfHPct - labelPadPct - pad, py)),
  };
}

// ───────────────────────────────────────────────────────
//  Helpers: create test entities & frames
// ───────────────────────────────────────────────────────

function makeEntity(overrides: Partial<VisualEntity> & { id: string; type: VisualEntityType }): VisualEntity {
  return {
    position: { x: 50, y: 50 },
    size: { width: 120, height: 100 },
    label: 'Test',
    color: '#00e5ff',
    animation: { type: 'fadeIn', duration: 500, delay: 0 },
    ...overrides,
  };
}

function makeFrame(id: string, start: number, end: number, entities: VisualEntity[]): IllustrationFrame {
  return {
    id,
    startTime: start,
    endTime: end,
    entities,
    narrationSegment: '',
    description: `Frame ${id}`,
  };
}

function makeScript(frames: IllustrationFrame[], sceneId = 'test-scene'): VisualScript {
  const allEntities: Record<string, VisualEntity> = {};
  frames.forEach(f => f.entities.forEach(e => { allEntities[e.id] = e; }));
  return {
    sceneId,
    frames,
    totalDuration: frames[frames.length - 1]?.endTime || 0,
    entities: allEntities,
  };
}

// Re-implement the pure functions from IllustrationCanvas & FrameRenderer
// so we can test them without React rendering

function findCurrentFrame(frames: IllustrationFrame[], currentTime: number): IllustrationFrame | null {
  if (frames.length === 0) return null;
  const matched = frames.find(
    frame => currentTime >= frame.startTime && currentTime < frame.endTime,
  );
  if (matched) return matched;
  const lastFrame = frames[frames.length - 1];
  if (currentTime >= lastFrame.endTime) return frames[0];
  return frames[0];
}

function buildEntityPositionMap(
  entities: VisualEntity[],
  canvasWidth: number,
  canvasHeight: number,
): Map<string, { x: number; y: number; w: number; h: number }> {
  const map = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const e of entities) {
    if (e.label) {
      map.set(e.label, {
        x: (e.position.x / 100) * canvasWidth,
        y: (e.position.y / 100) * canvasHeight,
        w: e.size.width,
        h: e.size.height,
      });
    }
  }
  return map;
}

function computeRenderPosition(
  entity: VisualEntity,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  // Guard against NaN — default to center (mirrors FrameRenderer + clampEntityPosition fix)
  const px = isNaN(entity.position.x) ? 50 : entity.position.x;
  const py = isNaN(entity.position.y) ? 50 : entity.position.y;
  const halfWPct = (entity.size.width / 2) / canvasWidth * 100;
  const halfHPct = (entity.size.height / 2) / canvasHeight * 100;
  const clampedPctX = Math.max(halfWPct + 1, Math.min(100 - halfWPct - 1, px));
  const clampedPctY = Math.max(halfHPct + 1, Math.min(100 - halfHPct - 1, py));
  return {
    x: (clampedPctX / 100) * canvasWidth,
    y: (clampedPctY / 100) * canvasHeight,
  };
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 1: Entity object reference sharing across frames
// ═══════════════════════════════════════════════════════

describe('Entity reference sharing across frames (ROOT CAUSE)', () => {
  it('should detect when the SAME entity object is shared between frames', () => {
    // This simulates the entityRegistry in segmentsToFrames()
    // where the same entity reference is pushed into multiple frames
    const sharedEntity = makeEntity({ id: 'e1', type: 'Server', label: 'API Server', position: { x: 50, y: 30 } });

    const frame1 = makeFrame('f1', 0, 3000, [sharedEntity]);
    const frame2 = makeFrame('f2', 3000, 6000, [
      sharedEntity, // SAME reference!
      makeEntity({ id: 'e2', type: 'Database', label: 'DB', position: { x: 80, y: 60 } }),
    ]);

    // Verify they share the same reference
    expect(frame1.entities[0]).toBe(frame2.entities[0]); // Same object!

    // Simulate postProcessFrames mutating positions for frame2
    // (e.g., collision resolution pushes the entity)
    frame2.entities[0].position = { x: 15, y: 15 };

    // BUG: Frame 1's entity was also mutated!
    expect(frame1.entities[0].position.x).toBe(15); // Corrupted!
    expect(frame1.entities[0].position.y).toBe(15); // Corrupted!

    // This is the bug: when the presentation plays frame1 after frame2
    // was laid out, the entity appears at frame2's position, not frame1's
  });

  it('should preserve original positions when entities are deep-copied per frame', () => {
    // This is the FIX: each frame should get its own copy of the entity
    const originalEntity = makeEntity({ id: 'e1', type: 'Server', label: 'API Server', position: { x: 50, y: 30 } });

    // Deep copy for each frame (what the fix should do)
    const frame1Entity = { ...originalEntity, position: { ...originalEntity.position } };
    const frame2Entity = { ...originalEntity, position: { ...originalEntity.position } };

    const frame1 = makeFrame('f1', 0, 3000, [frame1Entity]);
    const frame2 = makeFrame('f2', 3000, 6000, [frame2Entity]);

    // Mutate frame2's entity (simulating layout engine)
    frame2.entities[0].position = { x: 15, y: 15 };

    // Frame 1's entity is NOT affected
    expect(frame1.entities[0].position.x).toBe(50); // Preserved!
    expect(frame1.entities[0].position.y).toBe(30); // Preserved!
  });

  it('should detect position drift when layout engine mutates shared entities in sequence', () => {
    // Simulate 3 frames sharing an entity, with layout processing each frame
    const sharedServer = makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 50, y: 40 } });
    const dbEntity = makeEntity({ id: 'e2', type: 'Database', label: 'DB', position: { x: 50, y: 40 } });

    const frame1 = makeFrame('f1', 0, 2000, [sharedServer]);
    const frame2 = makeFrame('f2', 2000, 4000, [sharedServer, dbEntity]);
    const frame3 = makeFrame('f3', 4000, 6000, [sharedServer]);

    // Simulate resolveCollisions on frame2: both entities are at (50,40),
    // collision resolution pushes them apart
    const overlapX = (120 / 2 + 120 / 2 + 3) - Math.abs(50 - 50);
    const push = overlapX / 2 + 1;
    // Since they're at the same X, horizontal push moves first left, second right
    frame2.entities[0].position.x -= push; // Server pushed left
    frame2.entities[1].position.x += push; // DB pushed right

    // Now ALL frames see the mutated position for Server
    const serverPosInFrame1 = frame1.entities[0].position.x;
    const serverPosInFrame3 = frame3.entities[0].position.x;

    // Both frame1 and frame3 see the position that was set during frame2's collision resolution
    expect(serverPosInFrame1).toBe(frame2.entities[0].position.x);
    expect(serverPosInFrame3).toBe(frame2.entities[0].position.x);
    // The original position (50) is lost
    expect(serverPosInFrame1).not.toBe(50);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 2: Frame selection logic
// ═══════════════════════════════════════════════════════

describe('Frame selection (currentFrame) logic', () => {
  const frames = [
    makeFrame('f1', 0, 3000, [makeEntity({ id: 'e1', type: 'Server', position: { x: 20, y: 30 } })]),
    makeFrame('f2', 3000, 6000, [makeEntity({ id: 'e1', type: 'Server', position: { x: 60, y: 50 } })]),
    makeFrame('f3', 6000, 9000, [makeEntity({ id: 'e1', type: 'Server', position: { x: 80, y: 70 } })]),
  ];

  it('should match the correct frame for times within range', () => {
    expect(findCurrentFrame(frames, 0)?.id).toBe('f1');
    expect(findCurrentFrame(frames, 1500)?.id).toBe('f1');
    expect(findCurrentFrame(frames, 2999)?.id).toBe('f1');
    expect(findCurrentFrame(frames, 3000)?.id).toBe('f2');
    expect(findCurrentFrame(frames, 6000)?.id).toBe('f3');
  });

  it('should fall back to frames[0] when time exceeds all frames (not last frame)', () => {
    // This was previously returning frames[frames.length - 1] which caused a flash
    const frame = findCurrentFrame(frames, 10000);
    expect(frame?.id).toBe('f1'); // Should be first frame, not last
  });

  it('should fall back to frames[0] for negative time', () => {
    const frame = findCurrentFrame(frames, -100);
    expect(frame?.id).toBe('f1');
  });

  it('should return null for empty frames', () => {
    expect(findCurrentFrame([], 1000)).toBeNull();
  });

  it('should handle exact boundary times correctly', () => {
    // At exactly endTime of frame1 (3000), should match frame2 (startTime >= 3000)
    expect(findCurrentFrame(frames, 3000)?.id).toBe('f2');
    // At exactly endTime of last frame, falls back to first
    expect(findCurrentFrame(frames, 9000)?.id).toBe('f1');
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 3: Position map computation
// ═══════════════════════════════════════════════════════

describe('buildEntityPositionMap', () => {
  it('should convert percentage positions to pixel coordinates', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 50, y: 50 } }),
    ];
    const map = buildEntityPositionMap(entities, 1600, 900);
    expect(map.get('Server')).toEqual({ x: 800, y: 450, w: 120, h: 100 });
  });

  it('should handle entities at edges correctly', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'Server', label: 'EdgeEntity', position: { x: 5, y: 95 } }),
    ];
    const map = buildEntityPositionMap(entities, 1600, 900);
    expect(map.get('EdgeEntity')!.x).toBe(80);  // 5% of 1600
    expect(map.get('EdgeEntity')!.y).toBe(855);  // 95% of 900
  });

  it('should handle entities with position {x: 0, y: 0} — renders near top-left', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'Server', label: 'Zero', position: { x: 0, y: 0 } }),
    ];
    const map = buildEntityPositionMap(entities, 1600, 900);
    expect(map.get('Zero')!.x).toBe(0);  // This IS the bug — (0,0) maps to top-left
    expect(map.get('Zero')!.y).toBe(0);
  });

  it('should handle duplicate labels (last one wins)', () => {
    const entities = [
      makeEntity({ id: 'e1', type: 'Server', label: 'Same', position: { x: 20, y: 30 } }),
      makeEntity({ id: 'e2', type: 'Server', label: 'Same', position: { x: 80, y: 70 } }),
    ];
    const map = buildEntityPositionMap(entities, 1600, 900);
    // Last entity with same label overwrites
    expect(map.get('Same')!.x).toBe(1280); // 80% of 1600
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 4: Defense-in-depth clamping (FrameRenderer)
// ═══════════════════════════════════════════════════════

describe('FrameRenderer defense-in-depth clamping', () => {
  it('should clamp position {x:0, y:0} away from top-left corner', () => {
    const entity = makeEntity({ id: 'e1', type: 'Server', position: { x: 0, y: 0 }, size: { width: 120, height: 100 } });
    const pos = computeRenderPosition(entity, 1600, 900);
    // With 120px width on 1600 canvas: halfWPct = 3.75, so minX = 4.75%
    // x should be clamped to at least (3.75 + 1)% = 4.75% → 76px
    expect(pos.x).toBeGreaterThan(50);
    expect(pos.y).toBeGreaterThan(50);
  });

  it('should clamp large entities further from edges', () => {
    const smallEntity = makeEntity({ id: 'e1', type: 'Badge', position: { x: 95, y: 95 }, size: { width: 60, height: 30 } });
    const largeEntity = makeEntity({ id: 'e2', type: 'Group', position: { x: 95, y: 95 }, size: { width: 200, height: 160 } });

    const smallPos = computeRenderPosition(smallEntity, 1600, 900);
    const largePos = computeRenderPosition(largeEntity, 1600, 900);

    // Large entity should be pulled further from edge
    expect(largePos.x).toBeLessThan(smallPos.x);
    expect(largePos.y).toBeLessThan(smallPos.y);
  });

  it('should keep centered entities at their position', () => {
    const entity = makeEntity({ id: 'e1', type: 'Server', position: { x: 50, y: 50 }, size: { width: 120, height: 100 } });
    const pos = computeRenderPosition(entity, 1600, 900);
    expect(pos.x).toBe(800);
    expect(pos.y).toBe(450);
  });

  it('should never render any entity at pixel (0, 0)', () => {
    // Test with various degenerate positions
    const testPositions = [
      { x: 0, y: 0 },
      { x: -5, y: -5 },
      { x: 100, y: 100 },
      { x: 105, y: 105 },
    ];

    for (const position of testPositions) {
      const entity = makeEntity({ id: 'e1', type: 'Server', position, size: { width: 120, height: 100 } });
      const pos = computeRenderPosition(entity, 1600, 900);
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(1600);
      expect(pos.y).toBeLessThan(900);
    }
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 5: clampEntityPosition utility
// ═══════════════════════════════════════════════════════

describe('clampEntityPosition utility', () => {
  it('should not modify centered positions', () => {
    const pos = clampEntityPosition({ x: 50, y: 50 }, 120, 100);
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(50);
  });

  it('should clamp positions near edges based on entity size', () => {
    // 240px wide entity on 1600px canvas: halfW = 7.5%
    const pos = clampEntityPosition({ x: 5, y: 5 }, 240, 100);
    expect(pos.x).toBeGreaterThanOrEqual(8.5); // halfW(7.5) + pad(1)
    expect(pos.y).toBeGreaterThanOrEqual(5);
  });

  it('should clamp (0,0) to safe minimum', () => {
    const pos = clampEntityPosition({ x: 0, y: 0 }, 120, 100);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
  });

  it('should handle very large entities', () => {
    // 480px wide entity (Comparison at 2x) on 1600px canvas
    const pos = clampEntityPosition({ x: 50, y: 50 }, 480, 200);
    // halfW = 15%, so range is [16, 84]
    expect(pos.x).toBe(50); // Center is fine
    expect(pos.y).toBe(50);

    // But edges are pushed significantly inward
    const edgePos = clampEntityPosition({ x: 90, y: 90 }, 480, 200);
    expect(edgePos.x).toBeLessThanOrEqual(84);
    // Y has less restriction because label padding only subtracts from maxY
    expect(edgePos.y).toBeLessThanOrEqual(87);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 6: Cross-frame entity position stability
// ═══════════════════════════════════════════════════════

describe('Cross-frame entity position stability', () => {
  it('should maintain entity position when navigating between frames', () => {
    // Simulate a presentation where "Server" appears in all 3 frames
    // Frame 1: Server at (30, 40)
    // Frame 2: Server at (30, 40) + Database at (70, 60)
    // Frame 3: Server at (30, 40) + Cache at (50, 80)

    // If entities are NOT shared by reference, positions should be stable
    const server1 = makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 30, y: 40 } });
    const server2 = makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 30, y: 40 } });
    const server3 = makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 30, y: 40 } });

    const frames = [
      makeFrame('f1', 0, 3000, [server1]),
      makeFrame('f2', 3000, 6000, [server2, makeEntity({ id: 'e2', type: 'Database', label: 'DB', position: { x: 70, y: 60 } })]),
      makeFrame('f3', 6000, 9000, [server3, makeEntity({ id: 'e3', type: 'Cache', label: 'Cache', position: { x: 50, y: 80 } })]),
    ];

    // Play forward through time
    const t0Frame = findCurrentFrame(frames, 500)!;
    const t0Pos = t0Frame.entities.find(e => e.label === 'Server')!.position;
    expect(t0Pos).toEqual({ x: 30, y: 40 });

    const t1Frame = findCurrentFrame(frames, 4000)!;
    const t1Pos = t1Frame.entities.find(e => e.label === 'Server')!.position;
    expect(t1Pos).toEqual({ x: 30, y: 40 });

    // Go BACK to frame 1's time range
    const tBackFrame = findCurrentFrame(frames, 1000)!;
    const tBackPos = tBackFrame.entities.find(e => e.label === 'Server')!.position;
    expect(tBackPos).toEqual({ x: 30, y: 40 }); // Should still be at original position
  });

  it('should detect the bug: shared entity references cause position corruption on backward navigation', () => {
    // This test DEMONSTRATES the bug using shared references (as segmentsToFrames does)
    const sharedServer = makeEntity({ id: 'e1', type: 'Server', label: 'Server', position: { x: 30, y: 40 } });

    const frames = [
      makeFrame('f1', 0, 3000, [sharedServer]),
      makeFrame('f2', 3000, 6000, [
        sharedServer, // SHARED reference
        makeEntity({ id: 'e2', type: 'Database', label: 'DB', position: { x: 30, y: 40 } }), // Same position → will collide
      ]),
    ];

    // Record position before layout processing
    const originalPos = { x: sharedServer.position.x, y: sharedServer.position.y };
    expect(originalPos).toEqual({ x: 30, y: 40 });

    // Simulate collision resolution on frame2 (Server and DB are at same position)
    // This mutates the shared entity in-place
    frames[1].entities[0].position.x -= 15; // Push server left to x=15
    frames[1].entities[1].position.x += 15; // Push DB right to x=45

    // Navigate back to frame 1 — the entity's position is CORRUPTED
    const frame1Now = findCurrentFrame(frames, 500)!;
    const serverPos = frame1Now.entities[0].position;

    // BUG: Server in frame1 is at x=15 (frame2's layout result), not x=30 (original)
    expect(serverPos.x).toBe(15); // This proves the bug!
    expect(serverPos.x).not.toBe(originalPos.x);
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 7: Legacy illustration conversion
// ═══════════════════════════════════════════════════════

describe('Legacy IllustrationSpec → VisualScript conversion', () => {
  // Re-implement illustrationToEntity for testing
  function illustrationToEntity(illus: IllustrationSpec): VisualEntity {
    const typeMap: Record<string, string> = {
      box: 'Entity', circle: 'Concept', arrow: 'Arrow', text: 'Label',
      code: 'Entity', icon: 'Badge', split_panel: 'Comparison', flow_sequence: 'Process', callout: 'Quote',
    };
    return {
      id: illus.id,
      type: (typeMap[illus.elementType] || 'Entity') as VisualEntityType,
      position: illus.position,
      size: illus.size,
      label: illus.content,
      color: illus.style.stroke || illus.style.fill,
      animation: {
        type: illus.animation.type === 'dashFlow' ? 'dashFlow' :
              illus.animation.type === 'none' ? 'none' :
              illus.animation.type as any,
        duration: illus.animation.duration,
        delay: illus.animation.delay,
      },
    };
  }

  it('should preserve original illustration position in converted entity', () => {
    const illus: IllustrationSpec = {
      id: 'illus-1',
      type: 'shape',
      elementType: 'box',
      position: { x: 60, y: 35 },
      size: { width: 120, height: 100 },
      content: 'Test Box',
      style: { stroke: '#00e5ff', fill: '#00e5ff15' },
      animation: { type: 'fadeIn', duration: 500, delay: 0 },
      appearTimingMs: 1000,
    };

    const entity = illustrationToEntity(illus);
    expect(entity.position).toEqual({ x: 60, y: 35 });
  });

  it('should detect position sharing when legacy conversion reuses position objects', () => {
    // The legacy converter does `position: illus.position` — this shares the reference
    const illus: IllustrationSpec = {
      id: 'illus-1',
      type: 'shape',
      elementType: 'box',
      position: { x: 60, y: 35 },
      size: { width: 120, height: 100 },
      content: 'Test Box',
      style: { stroke: '#00e5ff' },
      animation: { type: 'fadeIn', duration: 500, delay: 0 },
      appearTimingMs: 1000,
    };

    const entity = illustrationToEntity(illus);

    // BUG: entity.position IS illus.position (same reference)
    expect(entity.position).toBe(illus.position);

    // Mutating entity position also mutates the original illustration
    entity.position.x = 10;
    expect(illus.position.x).toBe(10); // Original corrupted!
  });
});

// ═══════════════════════════════════════════════════════
// TEST SUITE 8: Entity position with missing/invalid data
// ═══════════════════════════════════════════════════════

describe('Entity position with missing or invalid data', () => {
  it('should handle entity with position {x: NaN, y: NaN} — defaults to center', () => {
    const entity = makeEntity({ id: 'e1', type: 'Server', position: { x: NaN, y: NaN } });
    const pos = computeRenderPosition(entity, 1600, 900);
    // After fix: NaN is caught and defaults to center (50%)
    expect(isNaN(pos.x)).toBe(false);
    expect(isNaN(pos.y)).toBe(false);
    expect(pos.x).toBe(800); // 50% of 1600
    expect(pos.y).toBe(450); // 50% of 900
  });

  it('should handle entity with zero-size (width: 0, height: 0)', () => {
    const entity = makeEntity({ id: 'e1', type: 'Server', position: { x: 50, y: 50 }, size: { width: 0, height: 0 } });
    const pos = computeRenderPosition(entity, 1600, 900);
    // halfWPct = 0, clamp range = [1, 99] — should work fine
    expect(pos.x).toBe(800);
    expect(pos.y).toBe(450);
  });

  it('clampEntityPosition should handle NaN gracefully — defaults to center', () => {
    const pos = clampEntityPosition({ x: NaN, y: NaN }, 120, 100);
    // After fix: NaN defaults to center (50%) before clamping
    expect(isNaN(pos.x)).toBe(false);
    expect(isNaN(pos.y)).toBe(false);
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(50);
  });
});
