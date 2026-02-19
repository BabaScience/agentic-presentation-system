/* ═══════════════════════════════════════════════════════════════
   SceneGraphPresenter — Engine-driven SVG stage renderer.

   Connects the stage engine to React:
     useSceneEngine → dirty elements → elementsToVisualEntities → FrameRenderer

   The backend compiles PresentationScene → StoryboardScene (with
   AgentCommand[] + SyncMarkers) during scene preparation. This
   component receives the ready-to-execute StoryboardScene and passes
   it directly to the SceneExecutor — no client-side compilation.

   Law compliance:
     Law 1: Stage persists — engine retains elements across scenes.
     Law 2: Parameters bind — engine propagates setParameter calls.
     Law 3: Dirty render — FrameRenderer re-renders only when
            elementStates Map reference changes (dirty elements exist).
   ═══════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo } from 'react';
import type { WordTimestamp, StoryboardScene } from '@shared/types';
import { useSceneEngine } from '../engine/useSceneEngine';
import { elementsToVisualEntities } from '../engine/elementToVisualEntity';
import { FrameRenderer } from './FrameRenderer';

interface SceneGraphPresenterProps {
  currentScene: StoryboardScene | null;
  currentAudioTime: number;
  wordTimestamps: WordTimestamp[];
  width: number;
  height: number;
}

export function SceneGraphPresenter({
  currentScene,
  currentAudioTime,
  wordTimestamps,
  width,
  height,
}: SceneGraphPresenterProps) {
  // executor is created inside useSceneEngine and ticked every rAF frame.
  const { executor, elementStates, viewport } = useSceneEngine();

  // When scene changes: execute the pre-compiled StoryboardScene.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentScene) return;

    executor.abort();

    // Scene arrives pre-compiled from the backend with AgentCommand[]
    // and fixCommandOrdering already applied. Execute directly.
    executor.execute(currentScene, currentScene.syncMarkers ?? [], wordTimestamps);
  }, [currentScene?.id]); // re-run only on scene identity change

  // Drive sync-marker commands with the narration clock.
  useEffect(() => {
    executor.updateNarrationTime(currentAudioTime);
  }, [currentAudioTime, executor]);

  // Convert engine state to VisualEntity[].
  // useMemo depends on elementStates reference — which only changes when
  // the engine marks elements dirty. Idle frames cost zero React work.
  const entities = useMemo(
    () => elementsToVisualEntities(elementStates),
    [elementStates],
  );

  // Viewport transform: center the stage then apply zoom.
  const tx = width / 2 - viewport.x * viewport.zoom;
  const ty = height / 2 - viewport.y * viewport.zoom;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="hidden"
      className="illustration-canvas-svg"
    >
      <defs>
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
      </defs>
      <g style={{ transform: `translate(${tx}px,${ty}px) scale(${viewport.zoom})` }}>
        <FrameRenderer
          entities={entities}
          exitingEntities={[]}
          canvasWidth={width}
          canvasHeight={height}
          frameElapsedMs={currentAudioTime}
        />
      </g>
    </svg>
  );
}
