/* ═══════════════════════════════════════════════════════════════
   Layout Engine — Auto-positioning with collision avoidance

   Post-processes entity positions to prevent overlaps, enforce
   layout patterns, and ensure visual clarity.
   ═══════════════════════════════════════════════════════════════ */

import { type VisualEntity, type IllustrationFrame, type LayoutPattern, clampEntityPosition } from '../../shared/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Check if two rectangles overlap (with padding)
 */
function overlaps(a: Rect, b: Rect, padding = 2): boolean {
  return !(
    a.x + a.w / 2 + padding < b.x - b.w / 2 - padding ||
    a.x - a.w / 2 - padding > b.x + b.w / 2 + padding ||
    a.y + a.h / 2 + padding < b.y - b.h / 2 - padding ||
    a.y - a.h / 2 - padding > b.y + b.h / 2 + padding
  );
}

/**
 * Convert entity to rect in percentage space
 */
function entityToRect(e: VisualEntity): Rect {
  // Approximate size in percentage space (canvas is 1600x900 by default)
  // Entity size is in pixels, position in 0-100%
  return {
    x: e.position.x,
    y: e.position.y,
    w: (e.size.width / 1600) * 100,
    h: (e.size.height / 900) * 100,
  };
}

/**
 * Resolve collisions by nudging overlapping entities apart.
 * Uses iterative separation with force-based repulsion.
 */
export function resolveCollisions(entities: VisualEntity[], maxIterations = 20): void {
  // Skip connectors (arrows/dataflows with from/to) — they auto-position
  const movable = entities.filter(e =>
    !(e.sourceEntityId && e.targetEntityId) && !e.parentEntityId
  );

  if (movable.length <= 1) return;

  for (let iter = 0; iter < maxIterations; iter++) {
    let hadCollision = false;

    for (let i = 0; i < movable.length; i++) {
      for (let j = i + 1; j < movable.length; j++) {
        const a = entityToRect(movable[i]);
        const b = entityToRect(movable[j]);

        if (overlaps(a, b, 3)) {
          hadCollision = true;

          // Push apart along the axis of least overlap
          const overlapX = (a.w / 2 + b.w / 2 + 3) - Math.abs(a.x - b.x);
          const overlapY = (a.h / 2 + b.h / 2 + 3) - Math.abs(a.y - b.y);

          if (overlapX < overlapY) {
            // Push horizontally
            const push = overlapX / 2 + 1;
            if (a.x < b.x) {
              movable[i].position.x -= push;
              movable[j].position.x += push;
            } else {
              movable[i].position.x += push;
              movable[j].position.x -= push;
            }
          } else {
            // Push vertically
            const push = overlapY / 2 + 1;
            if (a.y < b.y) {
              movable[i].position.y -= push;
              movable[j].position.y += push;
            } else {
              movable[i].position.y += push;
              movable[j].position.y -= push;
            }
          }
          // Size-aware clamp: keep each entity fully within the canvas
          movable[i].position = clampEntityPosition(movable[i].position, movable[i].size.width, movable[i].size.height);
          movable[j].position = clampEntityPosition(movable[j].position, movable[j].size.width, movable[j].size.height);
        }
      }
    }

    if (!hadCollision) break;
  }
}

/**
 * Apply layout pattern to entities if their positions seem clustered.
 * Returns true if positions were adjusted.
 */
export function applyLayoutPattern(
  entities: VisualEntity[],
  pattern?: LayoutPattern,
): boolean {
  const movable = entities.filter(e =>
    !(e.sourceEntityId && e.targetEntityId) && !e.parentEntityId
  );

  if (movable.length <= 1) return false;

  // Detect clustering: if all entities are within a 20% box, they're clustered
  const xs = movable.map(e => e.position.x);
  const ys = movable.map(e => e.position.y);
  const xRange = Math.max(...xs) - Math.min(...xs);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const isClustered = xRange < 20 && yRange < 20;

  if (!isClustered && !pattern) return false;

  // If no pattern specified and entities are clustered, spread them out
  if (!pattern || pattern === 'central-radial') {
    // Place first entity at center, others in a circle around it
    if (movable.length >= 2) {
      movable[0].position = { x: 50, y: 45 };
      const others = movable.slice(1);
      const radius = 30;
      others.forEach((e, i) => {
        const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
        e.position = {
          x: Math.max(10, Math.min(90, 50 + radius * Math.cos(angle))),
          y: Math.max(10, Math.min(90, 45 + radius * Math.sin(angle))),
        };
      });
    }
    return true;
  }

  // Apply specific patterns
  switch (pattern) {
    case 'flow-lr':
      movable.forEach((e, i) => {
        e.position = {
          x: 15 + (i / Math.max(movable.length - 1, 1)) * 70,
          y: 45,
        };
      });
      return true;

    case 'flow-tb':
      movable.forEach((e, i) => {
        e.position = {
          x: 50,
          y: 15 + (i / Math.max(movable.length - 1, 1)) * 70,
        };
      });
      return true;

    case 'hierarchical':
      // Root at top, children below
      if (movable.length >= 1) {
        movable[0].position = { x: 50, y: 15 };
        const levels = Math.ceil(Math.log2(movable.length + 1));
        let idx = 1;
        for (let level = 1; level < levels && idx < movable.length; level++) {
          const countAtLevel = Math.min(Math.pow(2, level), movable.length - idx);
          for (let j = 0; j < countAtLevel && idx < movable.length; j++) {
            movable[idx].position = {
              x: 15 + ((j + 0.5) / countAtLevel) * 70,
              y: 15 + (level / levels) * 70,
            };
            idx++;
          }
        }
      }
      return true;

    case 'comparison':
      // Left vs right
      const halfLen = Math.ceil(movable.length / 2);
      movable.forEach((e, i) => {
        if (i < halfLen) {
          e.position = {
            x: 25,
            y: 20 + (i / Math.max(halfLen - 1, 1)) * 60,
          };
        } else {
          e.position = {
            x: 75,
            y: 20 + ((i - halfLen) / Math.max(movable.length - halfLen - 1, 1)) * 60,
          };
        }
      });
      return true;

    case 'layered':
      // 3 layers
      const perLayer = Math.ceil(movable.length / 3);
      movable.forEach((e, i) => {
        const layer = Math.floor(i / perLayer);
        const posInLayer = i % perLayer;
        e.position = {
          x: 15 + ((posInLayer + 0.5) / perLayer) * 70,
          y: 20 + layer * 30,
        };
      });
      return true;

    case 'circular':
      movable.forEach((e, i) => {
        const angle = (i / movable.length) * Math.PI * 2 - Math.PI / 2;
        e.position = {
          x: Math.max(10, Math.min(90, 50 + 30 * Math.cos(angle))),
          y: Math.max(10, Math.min(90, 45 + 30 * Math.sin(angle))),
        };
      });
      return true;

    case 'timeline':
      movable.forEach((e, i) => {
        e.position = {
          x: 10 + (i / Math.max(movable.length - 1, 1)) * 80,
          y: 45 + (i % 2 === 0 ? -10 : 10), // Alternate above/below
        };
      });
      return true;

    default:
      return false;
  }
}

/**
 * Post-process all frames: resolve collisions in each frame
 */
export function postProcessFrames(
  frames: IllustrationFrame[],
  layoutPattern?: LayoutPattern,
): void {
  for (const frame of frames) {
    // First apply layout pattern if entities seem clustered
    applyLayoutPattern(frame.entities, layoutPattern);
    // Then resolve any remaining collisions
    resolveCollisions(frame.entities);
    // Final pass: ensure all entities are within canvas bounds (size-aware)
    for (const entity of frame.entities) {
      if (!(entity.sourceEntityId && entity.targetEntityId)) {
        entity.position = clampEntityPosition(entity.position, entity.size.width, entity.size.height);
      }
    }
  }
}
