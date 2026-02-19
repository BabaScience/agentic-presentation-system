/* ═══════════════════════════════════════════════════════════════
   ParameterBootstrap — Defines parameters in the engine when
   storyboard_ready arrives. Renders nothing.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useStageEngine } from '../engine/StageEngineContext';
import { useSessionStore } from '../stores/sessionStore';
import type { ParameterDefinition } from '@shared/types';

export function ParameterBootstrap() {
  const { env } = useStageEngine();
  const parameters = useSessionStore((s) => s.storyboardParameters);

  useEffect(() => {
    for (const p of parameters) {
      if (env.getParameter(p.name)) continue;
      try {
        env.defineParameter(p.name, {
          type: p.type,
          value: p.default,
          default: p.default,
          min: p.min,
          max: p.max,
        });
      } catch {
        /* duplicate, ignore */
      }
    }
    // env is included in deps so bootstrap re-runs if the engine is recreated
    // (e.g. provider remount, dev hot reload)
  }, [env, parameters]);

  return null;
}
