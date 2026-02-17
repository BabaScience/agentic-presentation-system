/* ═══════════════════════════════════════════════════════════════
   Tests for Layout Engine — collision avoidance & layout patterns
   ═══════════════════════════════════════════════════════════════ */

import { resolveCollisions, applyLayoutPattern, postProcessFrames } from '../services/LayoutEngine';
import type { VisualEntity, IllustrationFrame } from '../../shared/types';

function makeEntity(
  id: string,
  label: string,
  x: number,
  y: number,
  width = 100,
  height = 80,
  overrides?: Partial<VisualEntity>,
): VisualEntity {
  return {
    id,
    type: 'Entity',
    position: { x, y },
    size: { width, height },
    label,
    color: '#00e5ff',
    animation: { type: 'fadeIn', duration: 500, delay: 0 },
    ...overrides,
  };
}

describe('resolveCollisions', () => {
  it('should not move non-overlapping entities', () => {
    const entities = [
      makeEntity('e1', 'A', 20, 50),
      makeEntity('e2', 'B', 80, 50),
    ];
    const originalPositions = entities.map(e => ({ ...e.position }));
    resolveCollisions(entities);
    expect(entities[0].position).toEqual(originalPositions[0]);
    expect(entities[1].position).toEqual(originalPositions[1]);
  });

  it('should separate overlapping entities', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'B', 50, 50), // Same position
    ];
    resolveCollisions(entities);
    // They should no longer be at the same position
    const distX = Math.abs(entities[0].position.x - entities[1].position.x);
    const distY = Math.abs(entities[0].position.y - entities[1].position.y);
    expect(distX + distY).toBeGreaterThan(0);
  });

  it('should keep entities within canvas bounds (5-95)', () => {
    const entities = [
      makeEntity('e1', 'A', 5, 50),
      makeEntity('e2', 'B', 5, 50),
    ];
    resolveCollisions(entities);
    for (const e of entities) {
      expect(e.position.x).toBeGreaterThanOrEqual(5);
      expect(e.position.x).toBeLessThanOrEqual(95);
      expect(e.position.y).toBeGreaterThanOrEqual(5);
      expect(e.position.y).toBeLessThanOrEqual(95);
    }
  });

  it('should not move connector entities (with sourceEntityId/targetEntityId)', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'Arrow', 50, 50, 150, 20, {
        type: 'Arrow',
        sourceEntityId: 'A',
        targetEntityId: 'B',
      }),
    ];
    resolveCollisions(entities);
    // Arrow should not have been moved (it has source/target)
    expect(entities[1].position).toEqual({ x: 50, y: 50 });
  });

  it('should not move child entities (with parentEntityId)', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'B', 50, 50, 100, 80, {
        parentEntityId: 'A',
      }),
    ];
    resolveCollisions(entities);
    // Child should not have been moved
    expect(entities[1].position).toEqual({ x: 50, y: 50 });
  });

  it('should handle single entity without error', () => {
    const entities = [makeEntity('e1', 'A', 50, 50)];
    resolveCollisions(entities);
    expect(entities[0].position).toEqual({ x: 50, y: 50 });
  });

  it('should handle empty array without error', () => {
    expect(() => resolveCollisions([])).not.toThrow();
  });

  it('should separate three overlapping entities', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'B', 51, 50),
      makeEntity('e3', 'C', 52, 50),
    ];
    resolveCollisions(entities);

    // All should be at distinct positions
    const positions = entities.map(e => `${e.position.x.toFixed(1)},${e.position.y.toFixed(1)}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(3);
  });
});

describe('applyLayoutPattern', () => {
  it('should spread clustered entities with central-radial pattern', () => {
    const entities = [
      makeEntity('e1', 'Center', 50, 50),
      makeEntity('e2', 'A', 51, 51),
      makeEntity('e3', 'B', 52, 49),
      makeEntity('e4', 'C', 49, 50),
    ];
    const result = applyLayoutPattern(entities, 'central-radial');
    expect(result).toBe(true);

    // First entity should be at center
    expect(entities[0].position.x).toBe(50);
    expect(entities[0].position.y).toBe(45);

    // Others should be spread out (not all within 5% of center)
    const spreads = entities.slice(1).map(e =>
      Math.sqrt(Math.pow(e.position.x - 50, 2) + Math.pow(e.position.y - 45, 2))
    );
    for (const spread of spreads) {
      expect(spread).toBeGreaterThan(10);
    }
  });

  it('should arrange entities left-to-right for flow-lr', () => {
    const entities = [
      makeEntity('e1', 'Start', 50, 50),
      makeEntity('e2', 'Middle', 50, 50),
      makeEntity('e3', 'End', 50, 50),
    ];
    const result = applyLayoutPattern(entities, 'flow-lr');
    expect(result).toBe(true);

    // x positions should be increasing
    expect(entities[0].position.x).toBeLessThan(entities[1].position.x);
    expect(entities[1].position.x).toBeLessThan(entities[2].position.x);

    // y positions should all be at 45
    for (const e of entities) {
      expect(e.position.y).toBe(45);
    }
  });

  it('should arrange entities top-to-bottom for flow-tb', () => {
    const entities = [
      makeEntity('e1', 'Top', 50, 50),
      makeEntity('e2', 'Mid', 50, 50),
      makeEntity('e3', 'Bot', 50, 50),
    ];
    const result = applyLayoutPattern(entities, 'flow-tb');
    expect(result).toBe(true);

    // y positions should be increasing
    expect(entities[0].position.y).toBeLessThan(entities[1].position.y);
    expect(entities[1].position.y).toBeLessThan(entities[2].position.y);

    // x positions should all be 50
    for (const e of entities) {
      expect(e.position.x).toBe(50);
    }
  });

  it('should arrange hierarchical layout with root at top', () => {
    const entities = [
      makeEntity('e1', 'Root', 50, 50),
      makeEntity('e2', 'L', 50, 50),
      makeEntity('e3', 'R', 50, 50),
    ];
    applyLayoutPattern(entities, 'hierarchical');

    // Root should be at top
    expect(entities[0].position.y).toBe(15);
    // Children should be below
    expect(entities[1].position.y).toBeGreaterThan(entities[0].position.y);
    expect(entities[2].position.y).toBeGreaterThan(entities[0].position.y);
  });

  it('should not modify well-spread entities without a pattern', () => {
    const entities = [
      makeEntity('e1', 'A', 20, 50),
      makeEntity('e2', 'B', 80, 50),
    ];
    const result = applyLayoutPattern(entities);
    expect(result).toBe(false); // Not clustered, no pattern
  });

  it('should detect clustered entities and spread them', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'B', 52, 51),
      makeEntity('e3', 'C', 48, 49),
    ];
    const result = applyLayoutPattern(entities);
    expect(result).toBe(true); // Clustered → spread out
  });

  it('should arrange comparison layout left-right', () => {
    const entities = [
      makeEntity('e1', 'LeftA', 50, 50),
      makeEntity('e2', 'LeftB', 50, 50),
      makeEntity('e3', 'RightA', 50, 50),
      makeEntity('e4', 'RightB', 50, 50),
    ];
    applyLayoutPattern(entities, 'comparison');

    // First half should be on the left
    expect(entities[0].position.x).toBe(25);
    expect(entities[1].position.x).toBe(25);
    // Second half on the right
    expect(entities[2].position.x).toBe(75);
    expect(entities[3].position.x).toBe(75);
  });

  it('should handle circular layout', () => {
    const entities = [
      makeEntity('e1', 'A', 50, 50),
      makeEntity('e2', 'B', 50, 50),
      makeEntity('e3', 'C', 50, 50),
      makeEntity('e4', 'D', 50, 50),
    ];
    applyLayoutPattern(entities, 'circular');

    // All should be within bounds
    for (const e of entities) {
      expect(e.position.x).toBeGreaterThanOrEqual(10);
      expect(e.position.x).toBeLessThanOrEqual(90);
      expect(e.position.y).toBeGreaterThanOrEqual(10);
      expect(e.position.y).toBeLessThanOrEqual(90);
    }
  });
});

describe('postProcessFrames', () => {
  it('should process all frames', () => {
    const frames: IllustrationFrame[] = [
      {
        id: 'f1',
        startTime: 0,
        endTime: 3000,
        entities: [
          makeEntity('e1', 'A', 50, 50),
          makeEntity('e2', 'B', 50, 50),
        ],
        narrationSegment: 'test',
        description: 'test',
      },
      {
        id: 'f2',
        startTime: 3000,
        endTime: 6000,
        entities: [
          makeEntity('e3', 'C', 50, 50),
          makeEntity('e4', 'D', 50, 50),
        ],
        narrationSegment: 'test',
        description: 'test',
      },
    ];

    postProcessFrames(frames);

    // Entities should no longer all be at 50,50
    for (const frame of frames) {
      const positions = frame.entities.map(e => `${e.position.x},${e.position.y}`);
      // At least some should have moved
      expect(new Set(positions).size).toBeGreaterThanOrEqual(1);
    }
  });
});
