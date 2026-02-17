/* ═══════════════════════════════════════════════════════════════
   IllustrationCanvas Component

   Large SVG canvas for rendering frame-based visual narratives.
   Unified rendering: both legacy IllustrationSpec and VisualScript
   are rendered through the FrameRenderer pipeline.
   Synchronized to audio narration timing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { IllustrationSpec, VisualScript, VisualEntity, IllustrationFrame } from '../../../shared/types';
import { FrameRenderer } from './FrameRenderer';

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
    const frameEntities = [...prevBucketEntities, ...currentBucketEntities];

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

export function IllustrationCanvas({ illustrations, visualScript, currentTime, width = 1600, height = 900 }: IllustrationCanvasProps) {

  // Unified: convert legacy illustrations to frame system if no visualScript
  const effectiveScript = useMemo(() => {
    if (visualScript && visualScript.frames.length > 0) return visualScript;
    if (illustrations && illustrations.length > 0) return convertIllustrationsToScript(illustrations);
    return null;
  }, [visualScript, illustrations]);

  const hasFrames = effectiveScript && effectiveScript.frames.length > 0;

  const currentFrame = useMemo(() => {
    if (!effectiveScript || effectiveScript.frames.length === 0) return null;
    const frames = effectiveScript.frames;
    const matched = frames.find(
      frame => currentTime >= frame.startTime && currentTime < frame.endTime
    );
    if (matched) return matched;
    // If currentTime exceeds all frames (stale from previous scene), show first frame
    const lastFrame = frames[frames.length - 1];
    if (currentTime >= lastFrame.endTime) return frames[0];
    // If currentTime is before all frames, show first frame
    return frames[0];
  }, [effectiveScript, currentTime]);

  // Entity lifecycle tracking for smooth frame transitions
  const [exitingEntities, setExitingEntities] = useState<VisualEntity[]>([]);
  const prevFrameRef = useRef<IllustrationFrame | null>(null);
  const prevSceneIdRef = useRef<string | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  // Cross-scene fadeout: when sceneId changes, fade out ALL previous entities
  useEffect(() => {
    const currentSceneId = effectiveScript?.sceneId || null;
    if (prevSceneIdRef.current && currentSceneId !== prevSceneIdRef.current) {
      // Scene changed — fade out all entities from previous scene's last frame
      const prevEntities = prevFrameRef.current?.entities || [];
      if (prevEntities.length > 0) {
        setExitingEntities(prevEntities);
        if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = window.setTimeout(() => setExitingEntities([]), 400);
      }
      prevFrameRef.current = null;
    }
    prevSceneIdRef.current = currentSceneId;
  }, [effectiveScript?.sceneId]);

  // Within-scene frame transitions
  useEffect(() => {
    if (!currentFrame || currentFrame === prevFrameRef.current) return;

    const prevEntities = prevFrameRef.current?.entities || [];
    const nextKeys = new Set(currentFrame.entities.map(e => `${e.type}-${e.label}`));

    // Entities in previous frame but not in current → exiting
    const exiting = prevEntities.filter(e => !nextKeys.has(`${e.type}-${e.label}`));

    if (exiting.length > 0) {
      setExitingEntities(exiting);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = window.setTimeout(() => setExitingEntities([]), 400);
    } else {
      setExitingEntities([]);
    }

    prevFrameRef.current = currentFrame;
  }, [currentFrame]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  if (!hasFrames) {
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
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5"/>
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

        <rect width={width} height={height} fill="url(#grid)" />

        {currentFrame && (
          <FrameRenderer
            entities={currentFrame.entities}
            exitingEntities={exitingEntities}
            canvasWidth={width}
            canvasHeight={height}
            frameElapsedMs={currentTime - currentFrame.startTime}
          />
        )}
      </svg>
    </div>
  );
}
