/* ═══════════════════════════════════════════════════════════════
   Agentic Presentation System — Performance Constants
   Single source of truth for all numeric contracts.
   ═══════════════════════════════════════════════════════════════ */

// ── Stage Environment Performance Contracts ─────────────────
export const CHECKPOINT_RESTORE_MS = 100;
export const PARAMETER_PROPAGATION_MS = 16;
export const SCENE_DIRTY_RENDER_MS = 8;
export const AGENT_COMMAND_MS = 100;
export const STORYBOARD_GENERATION_MS = 5000;
export const SPATIAL_GRID_CELL_SIZE = 100;

// ── Pipeline & Interaction Latencies ────────────────────────
export const VOICE_FIRST_WORD_MS = 2000;
export const INTERRUPT_DETECTION_MS = 300;
export const GRAPH_MUTATION_MS = 1000;
export const BOOKMARK_RESUME_MS = 500;
export const VISUAL_SYNC_ACCURACY_MS = 100;
export const RL_UPDATE_INTERVAL_MS = 50;

// ── Graph Constraints ───────────────────────────────────────
export const KG_NODE_LIMIT = 50;
export const KG_MAX_DEPTH = 4;

// ── Canvas & Visual Constants ───────────────────────────────
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;

// ── Visual Timing Floors ────────────────────────────────────
export const ANIMATION_DELAY_MIN_MS = 150;
export const FRAME_DURATION_MIN_MS = 2500;
export const ILLUSTRATION_APPEAR_MIN_MS = 200;
export const INTER_ENTITY_STAGGER_MIN_MS = 100;
export const ENTITY_MIN_VISIBLE_MS = 1200;
export const ENTITY_LABEL_PADDING_PX = 22;

// ── Voice Constants ─────────────────────────────────────────
export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_CHUNK_SIZE = 4096;

// ── Concurrency Limits ──────────────────────────────────────
export const CONCURRENCY_POOL_CLAUDE_MAX = 5;
export const CONCURRENCY_POOL_TTS_MAX = 2;
export const CONCURRENCY_POOL_TOTAL_MAX = 6;

// ── Spring Physics ────────────────────────────────────────────
export const DEFAULT_SPRING_CONFIG = {
  stiffness: 170,
  damping: 26,
  mass: 1,
  velocity: 0,
} as const;

export const SPRING_SETTLE_POSITION_THRESHOLD = 0.01;
export const SPRING_SETTLE_VELOCITY_THRESHOLD = 0.01;
export const DEFAULT_FADE_DURATION_MS = 300;
