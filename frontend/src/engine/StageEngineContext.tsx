/* ═══════════════════════════════════════════════════════════════
   StageEngineContext — Lifts the stage engine to shared context
   so TimelineBar and other siblings can trigger checkpoint restore.
   SceneGraphPresenter and TimelineBar consume via useStageEngine().
   ═══════════════════════════════════════════════════════════════ */

import React, { createContext, useContext, useCallback } from 'react';
import type { SceneElement, ViewportState } from '@shared/types';
import { useSceneEngine } from './useSceneEngine';
import type { EnvironmentAPI } from './EnvironmentAPI';
import type { SceneExecutor } from './SceneExecutor';

export interface StageEngineValue {
  env: EnvironmentAPI;
  executor: SceneExecutor;
  elementStates: Map<string, SceneElement>;
  viewport: ViewportState;
  restoreCheckpoint: (name: string) => Promise<void>;
}

const StageEngineContext = createContext<StageEngineValue | null>(null);

export function StageEngineProvider({ children }: { children: React.ReactNode }) {
  const { env, executor, elementStates, viewport } = useSceneEngine();

  const restoreCheckpoint = useCallback(
    (name: string) => env.restoreCheckpoint(name),
    [env],
  );

  const value: StageEngineValue = {
    env,
    executor,
    elementStates,
    viewport,
    restoreCheckpoint,
  };

  return (
    <StageEngineContext.Provider value={value}>
      {children}
    </StageEngineContext.Provider>
  );
}

export function useStageEngine(): StageEngineValue {
  const ctx = useContext(StageEngineContext);
  if (!ctx) {
    throw new Error('useStageEngine must be used within StageEngineProvider');
  }
  return ctx;
}
