/* ═══════════════════════════════════════════════════════════════
   SceneGraphPresenter — Engine-driven SVG stage renderer.

   Replaces IllustrationCanvas. Connects the stage engine to React:
     useSceneEngine → dirty elements → elementsToVisualEntities → FrameRenderer

   Law compliance:
     Law 1: Stage persists — engine retains elements across scenes.
     Law 2: Parameters bind — engine propagates setParameter calls.
     Law 3: Dirty render — FrameRenderer re-renders only when
            elementStates Map reference changes (dirty elements exist).
   ═══════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo } from 'react';
import type {
  PresentationScene,
  WordTimestamp,
  StoryboardScene,
  AgentCommand,
} from '@shared/types';
import { useSceneEngine } from '../engine/useSceneEngine';
import { compilePresentationScene } from '../engine/VisualScriptCompiler';
import { elementsToVisualEntities } from '../engine/elementToVisualEntity';
import { FrameRenderer } from './FrameRenderer';

interface SceneGraphPresenterProps {
  currentScene: PresentationScene | null;
  currentAudioTime: number;
  wordTimestamps: WordTimestamp[];
  width: number;
  height: number;
}

/**
 * Fix the timed/sequential queue ordering mismatch from VisualScriptCompiler.
 *
 * compileVisualScript generates paired commands:
 *   createElement  timing=<number>       → timed queue
 *   fadeIn         timing='await-previous' → sequential queue
 *
 * SceneExecutor processes these queues independently. The sequential queue
 * starts immediately on execute(), so fadeIn fires BEFORE createElement runs,
 * hitting "element not found" and staying invisible forever.
 *
 * Fix: convert every 'await-previous' command to timing = prevOffset + 1.
 * Both commands land in the timed queue in the correct order. Because
 * env.createElement() is synchronous, the element exists by the time the
 * loop reaches fadeIn one iteration later.
 */
function fixCommandOrdering(scene: StoryboardScene): StoryboardScene {
  const fixed: AgentCommand[] = [];
  let lastTimedOffset = 0;

  for (const cmd of scene.agentCommands) {
    if (cmd.timing === 'await-previous') {
      // Place this command 1ms after its timed predecessor so both
      // end up in the timed queue with guaranteed createElement-first order.
      fixed.push({ ...cmd, timing: lastTimedOffset + 1 });
    } else {
      if (typeof cmd.timing === 'number') {
        lastTimedOffset = cmd.timing;
      }
      fixed.push(cmd);
    }
  }

  return { ...scene, agentCommands: fixed };
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

  // When scene changes: compile and execute against the live engine.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentScene) return;

    executor.abort();

    const storyboard = compilePresentationScene(currentScene, wordTimestamps);
    // Fix the ordering mismatch before handing off to the executor.
    const fixed = fixCommandOrdering(storyboard);

    executor.execute(fixed, fixed.syncMarkers ?? [], wordTimestamps);
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
