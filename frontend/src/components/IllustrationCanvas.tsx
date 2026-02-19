/* ═══════════════════════════════════════════════════════════════
   IllustrationCanvas Component

   Large SVG canvas for rendering frame-based visual narratives.
   Unified rendering: both legacy IllustrationSpec and VisualScript
   are rendered through the FrameRenderer pipeline.
   Synchronized to audio narration timing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo, useReducer, useRef, useEffect } from 'react';
import type { IllustrationSpec, VisualScript, VisualEntity, IllustrationFrame } from '../../../shared/types';
import { FrameRenderer } from './FrameRenderer';
import { useSessionStore } from '../stores/sessionStore';

interface IllustrationCanvasProps {
  illustrations?: IllustrationSpec[];
  visualScript?: VisualScript;
  currentTime: number;
  width?: number;
  height?: number;
}

/**
 * Convert legacy IllustrationSpec[] to a single-frame VisualScript.
 * This unifies the dual visual systems into the FrameRenderer pipeline.
 */
function convertIllustrationsToScript(illustrations: IllustrationSpec[]): VisualScript {
  if (illustrations.length === 0) {
    return { sceneId: 'legacy', frames: [], totalDuration: 0, entities: {} };
  }

  // Group illustrations by their appear timing into frames
  const sorted = [...illustrations].sort((a, b) => a.appearTimingMs - b.appearTimingMs);
  const maxTime = Math.max(...sorted.map(i => i.appearTimingMs)) + 5000;

  // Create time buckets (each bucket = 2s window)
  const bucketSize = 2000;
  const buckets = new Map<number, IllustrationSpec[]>();

  for (const illus of sorted) {
    const bucket = Math.floor(illus.appearTimingMs / bucketSize) * bucketSize;
    const list = buckets.get(bucket) || [];
    list.push(illus);
    buckets.set(bucket, list);
  }

  // Convert each bucket to a frame with sliding window entities
  // (current bucket + previous bucket, not all previous buckets)
  const frames: IllustrationFrame[] = [];
  const entityMap: Record<string, VisualEntity> = {};

  const bucketKeys = [...buckets.keys()].sort((a, b) => a - b);
  let prevBucketEntities: VisualEntity[] = [];

  for (let i = 0; i < bucketKeys.length; i++) {
    const bucketStart = bucketKeys[i];
    const bucketEnd = i < bucketKeys.length - 1 ? bucketKeys[i + 1] : maxTime;
    const bucketIllus = buckets.get(bucketStart)!;

    // Convert this bucket's illustrations to entities
    const currentBucketEntities: VisualEntity[] = [];
    for (const illus of bucketIllus) {
      const entity = illustrationToEntity(illus);
      currentBucketEntities.push(entity);
      entityMap[entity.id] = entity;
    }

    // Sliding window: previous bucket + current bucket
    // Deep-copy previous bucket entities to prevent cross-frame mutation
    // (layout processing or React reconciliation could mutate shared references)
    const frameEntities = [
      ...prevBucketEntities.map(e => ({
        ...e,
        position: { ...e.position },
        size: { ...e.size },
        animation: e.animation ? { ...e.animation } : undefined,
      })),
      ...currentBucketEntities,
    ];

    frames.push({
      id: `legacy-frame-${i}`,
      startTime: bucketStart,
      endTime: bucketEnd,
      entities: frameEntities,
      narrationSegment: '',
      description: `Legacy frame ${i}`,
    });

    prevBucketEntities = currentBucketEntities;
  }

  return {
    sceneId: 'legacy-converted',
    frames,
    totalDuration: maxTime,
    entities: entityMap,
  };
}

/** Convert a single IllustrationSpec to a VisualEntity */
function illustrationToEntity(illus: IllustrationSpec): VisualEntity {
  // Map elementType to closest VisualEntityType
  const typeMap: Record<string, string> = {
    box: 'Entity',
    circle: 'Concept',
    arrow: 'Arrow',
    text: 'Label',
    code: 'Entity',
    icon: 'Badge',
    split_panel: 'Comparison',
    flow_sequence: 'Process',
    callout: 'Quote',
  };

  return {
    id: illus.id,
    type: (typeMap[illus.elementType] || 'Entity') as any,
    position: { ...illus.position },
    size: { ...illus.size },
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

// ── Scene Transition State Machine ─────────────────────────────
type ScenePhase = 'RENDERING' | 'FADING_OUT' | 'CLEARED' | 'RENDERING_NEW';

interface CanvasState {
  phase: ScenePhase;
  activeSceneId: string | null;
  exitingEntities: VisualEntity[];
  bufferedScript: VisualScript | null;
}

type CanvasAction =
  | { type: 'SCENE_CHANGED'; newScript: VisualScript }
  | { type: 'FADEOUT_COMPLETE' }
  | { type: 'CLEAR_COMPLETE' }
  | { type: 'SAME_SCENE_UPDATE'; script: VisualScript };

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SCENE_CHANGED':
      if (state.phase === 'FADING_OUT') {
        // Already fading — just update the buffered script
        return { ...state, bufferedScript: action.newScript };
      }
      if (!state.activeSceneId) {
        // First scene — go straight to rendering
        return { phase: 'RENDERING', activeSceneId: action.newScript.sceneId, exitingEntities: [], bufferedScript: action.newScript };
      }
      // Start fadeout; buffer new scene
      return { ...state, phase: 'FADING_OUT', bufferedScript: action.newScript };

    case 'FADEOUT_COMPLETE':
      // All old entities gone — clear everything
      return { ...state, phase: 'CLEARED', exitingEntities: [] };

    case 'CLEAR_COMPLETE':
      if (state.bufferedScript) {
        return { phase: 'RENDERING_NEW', activeSceneId: state.bufferedScript.sceneId, exitingEntities: [], bufferedScript: state.bufferedScript };
      }
      return { ...state, phase: 'RENDERING' };

    case 'SAME_SCENE_UPDATE':
      return { ...state, bufferedScript: action.script };

    default:
      return state;
  }
}

export function IllustrationCanvas({ illustrations, visualScript, currentTime, width = 1600, height = 900 }: IllustrationCanvasProps) {

  // Unified: convert legacy illustrations to frame system if no visualScript
  const effectiveScript = useMemo(() => {
    if (visualScript && visualScript.frames.length > 0) return visualScript;
    if (illustrations && illustrations.length > 0) return convertIllustrationsToScript(illustrations);
    return null;
  }, [visualScript, illustrations]);

  // ── Viewport state from Zustand store ──
  const canvasViewport = useSessionStore(s => s.canvasViewport);
  const viewportTransitionMs = useSessionStore(s => s.viewportTransitionMs);

  // ── State machine for scene transitions ──
  const [canvasState, dispatch] = useReducer(canvasReducer, {
    phase: 'RENDERING',
    activeSceneId: null,
    exitingEntities: [],
    bufferedScript: null,
  });
  const prevSceneIdRef = useRef<string | null>(null);
  const lastFrameRef = useRef<IllustrationFrame | null>(null);

  // Track scene changes
  useEffect(() => {
    const currentSceneId = effectiveScript?.sceneId || null;
    if (currentSceneId !== prevSceneIdRef.current) {
      if (effectiveScript) {
        dispatch({ type: 'SCENE_CHANGED', newScript: effectiveScript });
      }
    } else if (effectiveScript) {
      dispatch({ type: 'SAME_SCENE_UPDATE', script: effectiveScript });
    }
    prevSceneIdRef.current = currentSceneId;
  }, [effectiveScript?.sceneId, effectiveScript]);

  // Fadeout timer
  useEffect(() => {
    if (canvasState.phase === 'FADING_OUT') {
      const timer = window.setTimeout(() => dispatch({ type: 'FADEOUT_COMPLETE' }), 500);
      return () => clearTimeout(timer);
    }
    if (canvasState.phase === 'CLEARED') {
      // Instant transition to rendering new
      const timer = window.setTimeout(() => dispatch({ type: 'CLEAR_COMPLETE' }), 16);
      return () => clearTimeout(timer);
    }
  }, [canvasState.phase]);

  // After RENDERING_NEW, transition back to RENDERING on next frame
  useEffect(() => {
    if (canvasState.phase === 'RENDERING_NEW') {
      // Immediately treated as RENDERING
    }
  }, [canvasState.phase]);

  // Determine what script to render
  const renderScript = useMemo(() => {
    if (canvasState.phase === 'FADING_OUT') {
      // Keep showing the OLD scene during fadeout (but with exit animation)
      return null; // We render exitingEntities instead
    }
    if (canvasState.phase === 'CLEARED') {
      return null; // Nothing visible during clear
    }
    return canvasState.bufferedScript || effectiveScript;
  }, [canvasState.phase, canvasState.bufferedScript, effectiveScript]);

  const hasFrames = renderScript && renderScript.frames.length > 0;

  const currentFrame = useMemo(() => {
    if (!renderScript || renderScript.frames.length === 0) return null;
    const frames = renderScript.frames;
    const matched = frames.find(
      frame => currentTime >= frame.startTime && currentTime < frame.endTime
    );
    if (matched) return matched;

    // Between frames: find the most recent frame that has ended and keep it visible
    let best: typeof frames[0] | null = null;
    for (const frame of frames) {
      if (frame.endTime <= currentTime) {
        if (!best || frame.endTime > best.endTime) best = frame;
      }
    }
    if (best) return best;

    return frames[0];
  }, [renderScript, currentTime]);

  // Track last frame for cross-scene exit entities
  useEffect(() => {
    if (currentFrame) {
      lastFrameRef.current = currentFrame;
    }
  }, [currentFrame]);

  // Build exiting entities for fadeout phase
  const exitingEntities = useMemo(() => {
    if (canvasState.phase === 'FADING_OUT') {
      return lastFrameRef.current?.entities || [];
    }
    return [];
  }, [canvasState.phase]);

  // Is fading out?
  const isFadingOut = canvasState.phase === 'FADING_OUT' || canvasState.phase === 'CLEARED';

  // ── Viewport transform computation ──
  const viewportTransform = useMemo(() => {
    const vp = canvasViewport;
    if (vp.zoom === 1 && vp.x === width / 2 && vp.y === height / 2) {
      return ''; // No transform needed
    }
    // Transform: translate to center the viewport target, then scale
    const tx = width / 2 - vp.x * vp.zoom;
    const ty = height / 2 - vp.y * vp.zoom;
    return `translate(${tx}, ${ty}) scale(${vp.zoom})`;
  }, [canvasViewport, width, height]);

  if (!hasFrames && !isFadingOut) {
    return (
      <div className="illustration-canvas-empty">
        <div className="canvas-placeholder">
          <span className="canvas-placeholder-icon">✨</span>
          <p>Visual illustration will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="illustration-canvas-container">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="hidden"
        className="illustration-canvas-svg"
      >
        {/* ── Shared Defs: grid, glow filters, gradients ── */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.012)" strokeWidth="0.5"/>
          </pattern>

          {/* Soft glow used on shapes */}
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#00e5ff" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ff2d7b" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#00e676" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ffab00" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#b388ff" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Additional glow filters for extended entity types */}
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ff4444" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#4488ff" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ff8800" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Soft shadow for text labels */}
          <filter id="text-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.7"/>
          </filter>
        </defs>

        {/* Viewport transform wrapper for zoom/pan */}
        <g
          className="canvas-viewport-group"
          style={{
            transform: viewportTransform || undefined,
            transition: viewportTransitionMs > 0
              ? `transform ${viewportTransitionMs}ms cubic-bezier(0.34, 1.56, 0.64, 1)`
              : undefined,
          }}
        >
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Scene exit animation */}
          {isFadingOut && exitingEntities.length > 0 && (
            <g className="scene-exit-group">
              <FrameRenderer
                entities={[]}
                exitingEntities={exitingEntities}
                canvasWidth={width}
                canvasHeight={height}
                frameElapsedMs={Infinity}
              />
            </g>
          )}

          {/* Current frame — with accumulative entities, no within-scene exits */}
          {!isFadingOut && currentFrame && (
            <FrameRenderer
              entities={currentFrame.entities}
              exitingEntities={[]}
              canvasWidth={width}
              canvasHeight={height}
              frameElapsedMs={currentTime - currentFrame.startTime}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
