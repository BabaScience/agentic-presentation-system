/* ═══════════════════════════════════════════════════════════════
   EnvironmentAPI — Agent-facing surface for the stage
   Wraps SceneGraph with async spring-physics motion, linear fades,
   viewport control, ephemeral annotations, and checkpoint management.
   NO DOM, NO React, NO requestAnimationFrame.
   An external render loop calls tick(deltaMs) each frame.
   ═══════════════════════════════════════════════════════════════ */

import type {
  SpringConfig,
  Vector2,
  ViewportState,
  SceneElement,
  Parameter,
  BindingHandle,
  ElementHandle,
  StageAnnotation,
  StageAnnotationType,
  AnnotationHandle,
  CheckpointHandle,
  AnchorPosition,
  ConnectionStyle,
} from '@shared/types';
import {
  DEFAULT_SPRING_CONFIG,
  DEFAULT_FADE_DURATION_MS,
} from '@shared/constants';
import { SceneGraph } from './SceneGraph';
import { stepSpring } from './SpringSolver';

// ── Internal animation types (not exported to shared) ────────

interface SpringAnimationState {
  kind: 'spring';
  current: number;
  velocity: number;
  target: number;
  config: SpringConfig;
}

interface LinearAnimationState {
  kind: 'linear';
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

type AnimationState = SpringAnimationState | LinearAnimationState;

interface ActiveAnimation {
  id: string;
  targetType: 'element' | 'viewport';
  elementId?: string;
  property: string;
  state: AnimationState;
  resolve: () => void;
  reject: (reason: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────

let annotationCounter = 0;
let animationCounter = 0;

function makeAnimationId(): string {
  return `anim_${++animationCounter}`;
}

function makeAnnotationId(): string {
  return `ann_${++annotationCounter}`;
}

/** Composite key for deduplication: one animation per (target, property). */
function animationKey(anim: ActiveAnimation): string {
  if (anim.targetType === 'viewport') {
    return `viewport:${anim.property}`;
  }
  return `element:${anim.elementId}:${anim.property}`;
}

const POSITION_EPSILON = 0.001;

// ── EnvironmentAPI ──────────────────────────────────────────

export class EnvironmentAPI {
  private sceneGraph: SceneGraph;
  private animations: Map<string, ActiveAnimation> = new Map();
  private annotations: Map<string, StageAnnotation> = new Map();

  /** Key → animation id, for quick cancellation of conflicting animations */
  private animationKeyIndex: Map<string, string> = new Map();

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  // ── Element Lifecycle (passthroughs) ──────────────────────

  createElement(config: Parameters<SceneGraph['createElement']>[0]): ElementHandle {
    return this.sceneGraph.createElement(config);
  }

  destroyElement(id: string): void {
    // Cancel all animations targeting this element
    this.cancelAnimationsForElement(id);
    // Remove annotations referencing this element
    this.removeAnnotationsForElement(id);
    this.sceneGraph.destroyElement(id);
  }

  updateElement(id: string, changes: Partial<SceneElement>): void {
    this.sceneGraph.updateElement(id, changes);
  }

  getElementById(id: string): SceneElement | null {
    return this.sceneGraph.getElementById(id);
  }

  getAllElements(): SceneElement[] {
    return this.sceneGraph.getAllElements();
  }

  // ── Show / Hide ───────────────────────────────────────────

  showElement(id: string, durationMs?: number): Promise<void> {
    if (durationMs !== undefined && durationMs > 0) {
      this.sceneGraph.updateElement(id, { visible: true, opacity: 0 });
      return this.fadeIn(id, durationMs);
    }
    this.sceneGraph.showElement(id);
    return Promise.resolve();
  }

  hideElement(id: string, durationMs?: number): Promise<void> {
    if (durationMs !== undefined && durationMs > 0) {
      return this.fadeOut(id, durationMs).then(() => {
        // Only set invisible if element still exists
        if (this.sceneGraph.getElementById(id)) {
          this.sceneGraph.updateElement(id, { visible: false });
        }
      });
    }
    this.sceneGraph.hideElement(id);
    return Promise.resolve();
  }

  // ── Motion (spring-based) ─────────────────────────────────

  moveTo(
    id: string,
    pos: Vector2,
    spring?: Partial<SpringConfig>,
  ): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);

    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };

    // No-op if already at target
    if (
      Math.abs(element.position.x - pos.x) < POSITION_EPSILON &&
      Math.abs(element.position.y - pos.y) < POSITION_EPSILON
    ) {
      return Promise.resolve();
    }

    // Create two spring animations (x and y), resolve when both settle
    return new Promise<void>((resolve) => {
      let xDone = false;
      let yDone = false;
      const checkDone = () => {
        if (xDone && yDone) resolve();
      };

      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'position.x',
        state: {
          kind: 'spring',
          current: element.position.x,
          velocity: config.velocity,
          target: pos.x,
          config,
        },
        onResolve: () => { xDone = true; checkDone(); },
      });

      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'position.y',
        state: {
          kind: 'spring',
          current: element.position.y,
          velocity: config.velocity,
          target: pos.y,
          config,
        },
        onResolve: () => { yDone = true; checkDone(); },
      });
    });
  }

  moveBy(
    id: string,
    delta: Vector2,
    spring?: Partial<SpringConfig>,
  ): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);
    return this.moveTo(
      id,
      { x: element.position.x + delta.x, y: element.position.y + delta.y },
      spring,
    );
  }

  scaleTo(
    id: string,
    scale: number,
    spring?: Partial<SpringConfig>,
  ): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);
    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };
    const current = (element.properties['scale'] as number) ?? 1;

    if (Math.abs(current - scale) < POSITION_EPSILON) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'properties.scale',
        state: {
          kind: 'spring',
          current,
          velocity: config.velocity,
          target: scale,
          config,
        },
        onResolve: resolve,
      });
    });
  }

  rotateTo(
    id: string,
    angle: number,
    spring?: Partial<SpringConfig>,
  ): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);
    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };
    const current = (element.properties['rotation'] as number) ?? 0;

    if (Math.abs(current - angle) < POSITION_EPSILON) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'properties.rotation',
        state: {
          kind: 'spring',
          current,
          velocity: config.velocity,
          target: angle,
          config,
        },
        onResolve: resolve,
      });
    });
  }

  // ── Fades (linear) ────────────────────────────────────────

  fadeIn(id: string, durationMs?: number): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);
    const duration = durationMs ?? DEFAULT_FADE_DURATION_MS;

    this.sceneGraph.updateElement(id, { visible: true });

    return new Promise<void>((resolve) => {
      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'opacity',
        state: {
          kind: 'linear',
          from: element.opacity,
          to: 1,
          elapsed: 0,
          duration,
        },
        onResolve: resolve,
      });
    });
  }

  fadeOut(id: string, durationMs?: number): Promise<void> {
    const element = this.sceneGraph.getElementById(id);
    if (!element) throw new Error(`Element "${id}" not found`);
    const duration = durationMs ?? DEFAULT_FADE_DURATION_MS;

    return new Promise<void>((resolve) => {
      this.createAnimation({
        targetType: 'element',
        elementId: id,
        property: 'opacity',
        state: {
          kind: 'linear',
          from: element.opacity,
          to: 0,
          elapsed: 0,
          duration,
        },
        onResolve: resolve,
      });
    });
  }

  // ── Viewport ──────────────────────────────────────────────

  zoomTo(level: number, spring?: Partial<SpringConfig>): Promise<void> {
    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };
    const vp = this.sceneGraph.getViewport();

    if (Math.abs(vp.zoom - level) < POSITION_EPSILON) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.createAnimation({
        targetType: 'viewport',
        property: 'zoom',
        state: {
          kind: 'spring',
          current: vp.zoom,
          velocity: config.velocity,
          target: level,
          config,
        },
        onResolve: resolve,
      });
    });
  }

  panTo(pos: Vector2, spring?: Partial<SpringConfig>): Promise<void> {
    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };
    const vp = this.sceneGraph.getViewport();

    if (
      Math.abs(vp.x - pos.x) < POSITION_EPSILON &&
      Math.abs(vp.y - pos.y) < POSITION_EPSILON
    ) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let xDone = false;
      let yDone = false;
      const checkDone = () => {
        if (xDone && yDone) resolve();
      };

      this.createAnimation({
        targetType: 'viewport',
        property: 'x',
        state: {
          kind: 'spring',
          current: vp.x,
          velocity: config.velocity,
          target: pos.x,
          config,
        },
        onResolve: () => { xDone = true; checkDone(); },
      });

      this.createAnimation({
        targetType: 'viewport',
        property: 'y',
        state: {
          kind: 'spring',
          current: vp.y,
          velocity: config.velocity,
          target: pos.y,
          config,
        },
        onResolve: () => { yDone = true; checkDone(); },
      });
    });
  }

  focusOn(elementId: string, _padding?: number): Promise<void> {
    const element = this.sceneGraph.getElementById(elementId);
    if (!element) throw new Error(`Element "${elementId}" not found`);
    this.sceneGraph.setViewport({ focusElementId: elementId });
    return this.panTo({ x: element.position.x, y: element.position.y });
  }

  resetView(spring?: Partial<SpringConfig>): Promise<void> {
    const config = { ...DEFAULT_SPRING_CONFIG, ...spring };
    const vp = this.sceneGraph.getViewport();

    return new Promise<void>((resolve) => {
      let done = 0;
      const total = 4;
      const checkDone = () => {
        if (++done >= total) resolve();
      };

      // x
      this.createAnimation({
        targetType: 'viewport',
        property: 'x',
        state: {
          kind: 'spring',
          current: vp.x,
          velocity: config.velocity,
          target: 0,
          config,
        },
        onResolve: checkDone,
      });

      // y
      this.createAnimation({
        targetType: 'viewport',
        property: 'y',
        state: {
          kind: 'spring',
          current: vp.y,
          velocity: config.velocity,
          target: 0,
          config,
        },
        onResolve: checkDone,
      });

      // zoom
      this.createAnimation({
        targetType: 'viewport',
        property: 'zoom',
        state: {
          kind: 'spring',
          current: vp.zoom,
          velocity: config.velocity,
          target: 1,
          config,
        },
        onResolve: checkDone,
      });

      // rotation
      this.createAnimation({
        targetType: 'viewport',
        property: 'rotation',
        state: {
          kind: 'spring',
          current: vp.rotation,
          velocity: config.velocity,
          target: 0,
          config,
        },
        onResolve: checkDone,
      });
    });
  }

  // ── Annotations ───────────────────────────────────────────

  highlight(elementId: string, color?: string): AnnotationHandle {
    const id = makeAnnotationId();
    const annotation: StageAnnotation = {
      id,
      type: 'highlight',
      elementId,
      color: color ?? '#ffeb3b',
      createdAt: Date.now(),
    };
    this.annotations.set(id, annotation);
    return this.makeAnnotationHandle(id, 'highlight');
  }

  addLabel(elementId: string, text: string, anchor: AnchorPosition): AnnotationHandle {
    const id = makeAnnotationId();
    const annotation: StageAnnotation = {
      id,
      type: 'label',
      elementId,
      text,
      anchor,
      createdAt: Date.now(),
    };
    this.annotations.set(id, annotation);
    return this.makeAnnotationHandle(id, 'label');
  }

  drawConnection(
    fromElementId: string,
    toElementId: string,
    style?: ConnectionStyle,
  ): AnnotationHandle {
    const id = makeAnnotationId();
    const annotation: StageAnnotation = {
      id,
      type: 'connection',
      fromElementId,
      toElementId,
      connectionStyle: style,
      createdAt: Date.now(),
    };
    this.annotations.set(id, annotation);
    return this.makeAnnotationHandle(id, 'connection');
  }

  removeAnnotation(handle: AnnotationHandle): void {
    this.annotations.delete(handle.id);
  }

  getAnnotations(): StageAnnotation[] {
    return Array.from(this.annotations.values());
  }

  // ── Checkpoints ───────────────────────────────────────────

  createCheckpoint(name: string): CheckpointHandle {
    const snapshot = this.sceneGraph.createSnapshot(name);
    return {
      id: snapshot.id,
      name: snapshot.checkpointName,
      timestamp: snapshot.timestamp,
    };
  }

  restoreCheckpoint(id: string): Promise<void> {
    this.cancelAllAnimations();
    this.sceneGraph.restoreSnapshot(id);
    return Promise.resolve();
  }

  listCheckpoints(): CheckpointHandle[] {
    return this.sceneGraph.listSnapshots().map((s) => ({
      id: s.id,
      name: s.checkpointName,
      timestamp: s.timestamp,
    }));
  }

  // ── Parameters (passthroughs) ─────────────────────────────

  defineParameter(name: string, config: Omit<Parameter, 'name'>): void {
    this.sceneGraph.defineParameter(name, config);
  }

  setParameter(name: string, value: unknown): void {
    this.sceneGraph.setParameter(name, value);
  }

  getParameter(name: string): Parameter | null {
    return this.sceneGraph.getParameter(name);
  }

  bindElementToParameter(
    elementId: string,
    paramName: string,
    mapper: (value: unknown) => Partial<SceneElement>,
  ): BindingHandle {
    return this.sceneGraph.bindElementToParameter(elementId, paramName, mapper);
  }

  // ── Dirty Tracking (passthroughs) ─────────────────────────

  getDirtyElements(): Set<string> {
    return this.sceneGraph.getDirtyElements();
  }

  clearDirty(): void {
    this.sceneGraph.clearDirty();
  }

  // ── Viewport Read (passthrough) ───────────────────────────

  getViewport(): ViewportState {
    return this.sceneGraph.getViewport();
  }

  // ── Animation Scheduler ───────────────────────────────────

  /** Advance all animations by deltaMs. Returns count of still-active animations. */
  tick(deltaMs: number): number {
    if (this.animations.size === 0) return 0;

    const dtSeconds = deltaMs / 1000;
    const settled: string[] = [];

    for (const [animId, anim] of this.animations) {
      const done = this.advanceAnimation(anim, dtSeconds, deltaMs);
      if (done) settled.push(animId);
    }

    for (const animId of settled) {
      const anim = this.animations.get(animId);
      if (anim) {
        this.animations.delete(animId);
        this.animationKeyIndex.delete(animationKey(anim));
        anim.resolve();
      }
    }

    return this.animations.size;
  }

  getActiveAnimationCount(): number {
    return this.animations.size;
  }

  // ── Private: Animation management ─────────────────────────

  private createAnimation(opts: {
    targetType: 'element' | 'viewport';
    elementId?: string;
    property: string;
    state: AnimationState;
    onResolve: () => void;
  }): void {
    const id = makeAnimationId();
    const anim: ActiveAnimation = {
      id,
      targetType: opts.targetType,
      elementId: opts.elementId,
      property: opts.property,
      state: opts.state,
      resolve: opts.onResolve,
      reject: () => {},
    };

    const key = animationKey(anim);

    // Cancel existing animation for same key (resolve, not reject)
    const existingId = this.animationKeyIndex.get(key);
    if (existingId !== undefined) {
      const existing = this.animations.get(existingId);
      if (existing) {
        this.animations.delete(existingId);
        existing.resolve();
      }
    }

    this.animations.set(id, anim);
    this.animationKeyIndex.set(key, id);
  }

  /** Returns true if the animation has settled. */
  private advanceAnimation(
    anim: ActiveAnimation,
    dtSeconds: number,
    deltaMs: number,
  ): boolean {
    const { state } = anim;

    if (state.kind === 'spring') {
      const result = stepSpring(
        state.current,
        state.target,
        state.velocity,
        state.config,
        dtSeconds,
      );
      state.current = result.value;
      state.velocity = result.velocity;
      this.applyAnimationValue(anim, result.value);
      return result.settled;
    }

    // Linear interpolation
    state.elapsed = Math.min(state.elapsed + deltaMs, state.duration);
    const t = state.duration > 0 ? state.elapsed / state.duration : 1;
    const value = state.from + (state.to - state.from) * t;
    this.applyAnimationValue(anim, value);
    return t >= 1;
  }

  private applyAnimationValue(anim: ActiveAnimation, value: number): void {
    if (anim.targetType === 'viewport') {
      this.sceneGraph.setViewport({ [anim.property]: value });
      return;
    }

    const elementId = anim.elementId!;
    const element = this.sceneGraph.getElementById(elementId);
    if (!element) return;

    const prop = anim.property;
    if (prop === 'position.x') {
      this.sceneGraph.updateElement(elementId, {
        position: { x: value, y: element.position.y },
      });
    } else if (prop === 'position.y') {
      this.sceneGraph.updateElement(elementId, {
        position: { x: element.position.x, y: value },
      });
    } else if (prop === 'opacity') {
      this.sceneGraph.updateElement(elementId, { opacity: value });
    } else if (prop.startsWith('properties.')) {
      const propKey = prop.slice('properties.'.length);
      this.sceneGraph.updateElement(elementId, {
        properties: { ...element.properties, [propKey]: value },
      });
    }
  }

  private cancelAnimationsForElement(elementId: string): void {
    const toRemove: string[] = [];
    for (const [animId, anim] of this.animations) {
      if (anim.targetType === 'element' && anim.elementId === elementId) {
        toRemove.push(animId);
      }
    }
    for (const animId of toRemove) {
      const anim = this.animations.get(animId)!;
      this.animations.delete(animId);
      this.animationKeyIndex.delete(animationKey(anim));
      anim.resolve();
    }
  }

  private cancelAllAnimations(): void {
    for (const anim of this.animations.values()) {
      anim.resolve();
    }
    this.animations.clear();
    this.animationKeyIndex.clear();
  }

  private removeAnnotationsForElement(elementId: string): void {
    const toRemove: string[] = [];
    for (const [annId, ann] of this.annotations) {
      if (
        ann.elementId === elementId ||
        ann.fromElementId === elementId ||
        ann.toElementId === elementId
      ) {
        toRemove.push(annId);
      }
    }
    for (const annId of toRemove) {
      this.annotations.delete(annId);
    }
  }

  private makeAnnotationHandle(id: string, type: StageAnnotationType): AnnotationHandle {
    return {
      id,
      type,
      remove: () => {
        this.annotations.delete(id);
      },
    };
  }
}
