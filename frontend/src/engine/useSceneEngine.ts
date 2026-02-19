/* ═══════════════════════════════════════════════════════════════
   useSceneEngine — React hook owning the EnvironmentAPI + SceneExecutor lifecycle.
   Drives a single requestAnimationFrame loop that ticks BOTH:
     executor.tick() — fires timed AgentCommands from the queue
     env.tick()      — advances spring/linear animations, marks dirty
   Zero setState calls when the engine is idle (no dirty elements).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import type { SceneElement, ViewportState } from '@shared/types';
import { SceneGraph } from './SceneGraph';
import { EnvironmentAPI } from './EnvironmentAPI';
import { SceneExecutor } from './SceneExecutor';

export function useSceneEngine(): {
  env: EnvironmentAPI;
  executor: SceneExecutor;
  elementStates: Map<string, SceneElement>;
  viewport: ViewportState;
} {
  // Create engine once, synchronously — never null after mount.
  // useState lazy initializers run exactly once per component instance.
  const [env] = useState<EnvironmentAPI>(() => new EnvironmentAPI(new SceneGraph()));
  const [executor] = useState<SceneExecutor>(() =>
    new SceneExecutor(env, {
      onCommandError: (cmd, err) => {
        console.error(`[SceneExecutor] command "${cmd.method}" failed:`, err);
        return 'skip';
      },
    }),
  );

  const [elementStates, setElementStates] = useState<Map<string, SceneElement>>(new Map());
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1, rotation: 0 });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    function loop(now: number) {
      const deltaMs = lastTimeRef.current > 0 ? now - lastTimeRef.current : 0;
      lastTimeRef.current = now;

      // Tick executor FIRST: timed AgentCommands call env.createElement etc.
      // which run synchronously — the element exists before env.tick touches it.
      executor.tick(deltaMs);
      // Tick env: advances spring/linear animations, marks elements dirty.
      env.tick(deltaMs);

      const dirty = env.getDirtyElements();
      if (dirty.size > 0) {
        // Law 3: only setState when dirty elements exist.
        // Rebuild from getAllElements so destroyed elements are naturally absent.
        const allElements = env.getAllElements();
        const next = new Map<string, SceneElement>();
        for (const el of allElements) {
          next.set(el.id, el);
        }
        setElementStates(next);
        setViewport(env.getViewport());
        env.clearDirty();
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [env, executor]);

  return { env, executor, elementStates, viewport };
}
