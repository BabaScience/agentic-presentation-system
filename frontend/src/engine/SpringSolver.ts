/* ═══════════════════════════════════════════════════════════════
   SpringSolver — Pure function module for spring physics
   Semi-implicit Euler integration (same approach as react-spring).
   NO classes, NO state, NO DOM.
   ═══════════════════════════════════════════════════════════════ */

import type { SpringConfig } from '@shared/types';
import {
  SPRING_SETTLE_POSITION_THRESHOLD,
  SPRING_SETTLE_VELOCITY_THRESHOLD,
} from '@shared/constants';

export interface SpringState {
  value: number;
  velocity: number;
}

export interface SpringStepResult {
  value: number;
  velocity: number;
  settled: boolean;
}

const MAX_SUB_STEP_S = 1 / 60; // Cap sub-step at ~16.67ms for stability

/**
 * Advance a spring by `dtSeconds`.
 * Uses semi-implicit Euler with sub-stepping when dt is large
 * (e.g. tab was backgrounded).
 */
export function stepSpring(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  dtSeconds: number,
): SpringStepResult {
  const { stiffness, damping, mass } = config;

  let v = velocity;
  let x = current;
  let remaining = dtSeconds;

  while (remaining > 0) {
    const step = Math.min(remaining, MAX_SUB_STEP_S);
    remaining -= step;

    // Spring force: F = -k * displacement - c * velocity
    const displacement = x - target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * v;
    const acceleration = (springForce + dampingForce) / mass;

    // Semi-implicit Euler: update velocity first, then position
    v += acceleration * step;
    x += v * step;
  }

  // Snap to target when settled
  const settled =
    Math.abs(x - target) < SPRING_SETTLE_POSITION_THRESHOLD &&
    Math.abs(v) < SPRING_SETTLE_VELOCITY_THRESHOLD;

  if (settled) {
    return { value: target, velocity: 0, settled: true };
  }

  return { value: x, velocity: v, settled: false };
}
