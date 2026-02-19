/* ═══════════════════════════════════════════════════════════════
   Compiled Demo Scenes — Pre-compiled StoryboardScene[] for demo mode.
   Compiles DEMO_SCENES at module load. No runtime compilation in render cycle.
   ═══════════════════════════════════════════════════════════════ */

import type { StoryboardScene } from '../stores/sessionStore';
import { compilePresentationScene } from '@shared/VisualScriptCompiler';
import { DEMO_SCENES } from './demoGraph';

/** Pre-compiled demo scenes. Demo has no TTS — wordTimestamps omitted; commands fire by timing only. */
export const COMPILED_DEMO_SCENES: StoryboardScene[] = DEMO_SCENES.map((scene) =>
  compilePresentationScene(scene) as StoryboardScene,
);
