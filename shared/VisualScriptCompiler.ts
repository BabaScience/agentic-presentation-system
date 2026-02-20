/* ═══════════════════════════════════════════════════════════════
   VisualScriptCompiler — Translates PresentationScene into StoryboardScene
   Bridges VisualScript/VisualCommand[] from the pipeline to the
   engine's AgentCommand format for SceneExecutor consumption.

   Shared between backend (server-side compilation during scene
   preparation) and frontend (tests, demo mode).

   NO DOM, NO React — pure transformation logic.
   ═══════════════════════════════════════════════════════════════ */

import type {
  VisualScript,
  VisualEntity,
  VisualEntityType,
  VisualCommand,
  WordTimestamp,
  StageElementType,
  AgentCommand,
  SyncMarker,
  StoryboardScene,
  ViewportState,
  PresentationScene,
  Storyboard,
  ParameterDefinition,
  PlannerViewport,
  Bounds,
} from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ENTITY_PARAMETER_MAP } from './constants';

// ── Entity Type Mapping ──────────────────────────────────────

export const VISUAL_ENTITY_TO_STAGE_ELEMENT: Record<VisualEntityType, StageElementType> = {
  // box
  Server: 'box',
  Database: 'box',
  Container: 'box',
  Pod: 'box',
  Cloud: 'box',
  User: 'box',
  Device: 'box',
  Network: 'box',
  Process: 'box',
  Queue: 'box',
  Cache: 'box',
  LoadBalancer: 'box',
  Service: 'box',
  Firewall: 'box',
  APIGateway: 'box',
  Lambda: 'box',
  Subnet: 'box',
  Volume: 'box',
  Registry: 'box',
  Monitor: 'box',
  Pipeline: 'box',
  Decision: 'box',
  Cluster: 'box',
  // circle
  Concept: 'circle',
  Particle: 'circle',
  Badge: 'circle',
  Metric: 'circle',
  // arrow
  Arrow: 'arrow',
  DataFlow: 'arrow',
  // text
  Label: 'text',
  Quote: 'text',
  Annotation: 'text',
  Definition: 'text',
  Callout: 'text',
  // code
  CodeBlock: 'code',
  Expression: 'code',
  Equation: 'code',
  // diagram
  Graph2D: 'diagram',
  NumberLine: 'diagram',
  CoordinateSystem: 'diagram',
  FreeBodyDiagram: 'diagram',
  Circuit: 'diagram',
  Field: 'diagram',
  Wave: 'diagram',
  Vector: 'diagram',
  Matrix: 'diagram',
  FlowDiagram: 'diagram',
  VennDiagram: 'diagram',
  Histogram: 'diagram',
  PieChart: 'diagram',
  BarChart: 'diagram',
  ScatterPlot: 'diagram',
  Table: 'diagram',
  // label
  StepList: 'label',
  Proof: 'label',
  // group
  Entity: 'group',
  Group: 'group',
  Comparison: 'group',
  Timeline: 'group',
  Cycle: 'group',
  Stack: 'group',
  Tree: 'group',
  Analogy: 'group',
};

// ── Position Conversion ──────────────────────────────────────

function pctToPixel(pctX: number, pctY: number): { x: number; y: number } {
  return {
    x: (pctX / 100) * CANVAS_WIDTH,
    y: (pctY / 100) * CANVAS_HEIGHT,
  };
}

// ── Viewport Auto-Center ─────────────────────────────────────

/** Compute area-weighted centroid of all entities in pixel space.
 *  Larger entities pull the viewport center toward them. */
function computeVisualScriptCenter(script: VisualScript): { x: number; y: number } {
  const seen = new Map<string, VisualEntity>();
  for (const frame of script.frames) {
    for (const entity of frame.entities) {
      if (!seen.has(entity.id)) seen.set(entity.id, entity);
    }
  }
  if (seen.size === 0) return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

  let sumX = 0;
  let sumY = 0;
  let totalWeight = 0;
  for (const entity of seen.values()) {
    const pos = pctToPixel(entity.position.x, entity.position.y);
    const area = entity.size.width * entity.size.height; // percentage area as weight
    sumX += pos.x * area;
    sumY += pos.y * area;
    totalWeight += area;
  }
  return totalWeight > 0
    ? { x: sumX / totalWeight, y: sumY / totalWeight }
    : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
}

// ── compileVisualScript ──────────────────────────────────────

export function compileVisualScript(
  script: VisualScript,
  sceneId: string,
): AgentCommand[] {
  const commands: AgentCommand[] = [];
  const activeEntities = new Map<string, VisualEntity>();

  for (const frame of script.frames) {
    const frameEntityIds = new Set(frame.entities.map((e) => e.id));

    // Entities in this frame
    for (const entity of frame.entities) {
      const prev = activeEntities.get(entity.id);

      if (!prev) {
        // New entity — createElement + fadeIn
        const pos = pctToPixel(entity.position.x, entity.position.y);
        const stageType = VISUAL_ENTITY_TO_STAGE_ELEMENT[entity.type] ?? 'box';
        const delay = entity.animation?.delay ?? 0;
        const timing = frame.startTime + delay;

        commands.push({
          method: 'createElement',
          args: {
            id: `${sceneId}:${entity.id}`,
            type: stageType,
            position: pos,
            visible: false,
            opacity: 0,
            properties: {
              visualEntityType: entity.type,
              label: entity.label,
              color: entity.color,
              width: entity.size.width,
              height: entity.size.height,
              textContent: entity.textContent,
              codeLanguage: entity.codeLanguage,
              sourceEntityId: entity.sourceEntityId,
              targetEntityId: entity.targetEntityId,
            },
          },
          timing,
        });

        commands.push({
          method: 'fadeIn',
          args: {
            id: `${sceneId}:${entity.id}`,
            durationMs: entity.animation?.duration ?? 300,
          },
          timing: 'await-previous',
        });

        activeEntities.set(entity.id, entity);
      } else {
        // Existing entity — check for movement
        if (
          prev.position.x !== entity.position.x ||
          prev.position.y !== entity.position.y
        ) {
          const newPos = pctToPixel(entity.position.x, entity.position.y);
          commands.push({
            method: 'moveTo',
            args: {
              id: `${sceneId}:${entity.id}`,
              position: newPos,
            },
            timing: frame.startTime,
          });
        }

        // Check for highlight change
        if (!prev.highlight && entity.highlight) {
          commands.push({
            method: 'highlight',
            args: {
              elementId: `${sceneId}:${entity.id}`,
            },
            timing: frame.startTime,
          });
        }

        activeEntities.set(entity.id, entity);
      }
    }

    // Removed entities — in active but not in this frame
    for (const [id, _entity] of activeEntities) {
      if (!frameEntityIds.has(id)) {
        commands.push({
          method: 'fadeOut',
          args: {
            id: `${sceneId}:${id}`,
          },
          timing: frame.startTime,
        });

        commands.push({
          method: 'destroyElement',
          args: {
            id: `${sceneId}:${id}`,
          },
          timing: 'await-previous',
        });

        activeEntities.delete(id);
      }
    }
  }

  return commands;
}

// ── compileVisualCommands ────────────────────────────────────

const COMMAND_TYPE_TO_METHOD: Record<string, string> = {
  reveal: 'showElement',
  highlight: 'highlight',
  dim: 'fadeOut',
  hide: 'hideElement',
  zoom: 'zoomTo',
  pan: 'panTo',
  connect: 'drawConnection',
  annotate: 'addLabel',
};

export function compileVisualCommands(
  commands: VisualCommand[],
  wordTimestamps?: WordTimestamp[],
): { agentCommands: AgentCommand[]; syncMarkers: SyncMarker[] } {
  const agentCommands: AgentCommand[] = [];
  const syncMarkers: SyncMarker[] = [];

  for (const cmd of commands) {
    const method = COMMAND_TYPE_TO_METHOD[cmd.type];
    if (!method) continue;

    const args: Record<string, unknown> = { ...cmd.params };

    // Map command-specific args
    switch (cmd.type) {
      case 'reveal':
      case 'highlight':
      case 'dim':
      case 'hide':
        args['id'] = cmd.targetId;
        break;
      case 'zoom':
        args['level'] = cmd.params?.['level'] ?? cmd.params?.['zoom'] ?? 1;
        break;
      case 'pan':
        args['position'] = cmd.params?.['position'] ?? { x: 0, y: 0 };
        break;
      case 'connect':
        args['fromElementId'] = cmd.targetId;
        args['toElementId'] = cmd.params?.['toId'];
        break;
      case 'annotate':
        args['elementId'] = cmd.targetId;
        args['text'] = cmd.params?.['text'] ?? '';
        args['anchor'] = cmd.params?.['anchor'] ?? 'top';
        break;
    }

    if (cmd.wordTrigger !== undefined) {
      // Word-triggered commands become sync markers
      const agentCmd: AgentCommand = {
        method,
        args,
        timing: 'immediate',
      };
      syncMarkers.push({
        wordIndex: cmd.wordTrigger,
        command: agentCmd,
      });
    } else {
      agentCommands.push({
        method,
        args,
        timing: 'immediate',
      });
    }
  }

  // Sort sync markers by word index
  syncMarkers.sort((a, b) => a.wordIndex - b.wordIndex);

  return { agentCommands, syncMarkers };
}

// ── fixCommandOrdering ───────────────────────────────────────
//
// compileVisualScript generates paired commands:
//   createElement  timing=<number>       → timed queue
//   fadeIn         timing='await-previous' → sequential queue
//
// SceneExecutor processes these queues independently. The sequential queue
// starts immediately on execute(), so fadeIn fires BEFORE createElement runs,
// hitting "element not found" and staying invisible forever.
//
// Fix: convert every 'await-previous' command to timing = prevOffset + 1.
// Both commands land in the timed queue in the correct order. Because
// env.createElement() is synchronous, the element exists by the time the
// loop reaches fadeIn one iteration later.

function fixCommandOrdering(commands: AgentCommand[]): AgentCommand[] {
  const fixed: AgentCommand[] = [];
  let lastTimedOffset = 0;

  for (const cmd of commands) {
    if (cmd.timing === 'await-previous') {
      fixed.push({ ...cmd, timing: lastTimedOffset + 1 });
    } else {
      if (typeof cmd.timing === 'number') {
        lastTimedOffset = cmd.timing;
      }
      fixed.push(cmd);
    }
  }

  return fixed;
}

// ── compilePresentationScene ─────────────────────────────────

export function compilePresentationScene(
  scene: PresentationScene,
  wordTimestamps?: WordTimestamp[],
): StoryboardScene {
  let commands: AgentCommand[] = [];
  const allSyncMarkers: SyncMarker[] = [];

  // Viewport setup at t=0 — auto-center on entity centroid, instant snap
  const center = scene.visualScript
    ? computeVisualScriptCenter(scene.visualScript)
    : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  const zoom = scene.viewport?.zoom ?? 1;
  commands.push({
    method: 'setViewport',
    args: { viewport: { x: center.x, y: center.y, zoom, rotation: 0 } },
    timing: 0,
  });

  // Compile visual script if present
  if (scene.visualScript) {
    const scriptCmds = compileVisualScript(scene.visualScript, scene.id);
    commands.push(...scriptCmds);
  }

  // Compile legacy visual commands
  if (scene.visualCommands && scene.visualCommands.length > 0) {
    const { agentCommands, syncMarkers } = compileVisualCommands(
      scene.visualCommands,
      wordTimestamps,
    );
    commands.push(...agentCommands);
    allSyncMarkers.push(...syncMarkers);
  }

  // Fix the timed/sequential queue ordering mismatch so
  // createElement always fires before its paired fadeIn.
  commands = fixCommandOrdering(commands);

  // Demo mode: emit bindElementToParameter when interactiveParameters + visualScript present
  const interactiveParams = scene.interactiveParameters ?? [];
  if (interactiveParams.length > 0 && scene.visualScript) {
    const entities = buildEntitiesFromScript(scene.visualScript);
    const paramUpdates = inferParameterBindings(
      scene.id,
      entities,
      interactiveParams,
    );
    const bindingCommands: AgentCommand[] = [];
    for (const paramName of interactiveParams) {
      const bindings = paramUpdates.get(paramName);
      if (!bindings?.length) continue;
      for (const b of bindings) {
        bindingCommands.push({
          method: 'bindElementToParameter',
          args: { elementId: b.elementId, paramName, mapper: b.mapper },
          timing: 0,
        });
      }
    }
    const createCommandMaxT = Math.max(
      0,
      ...commands
        .filter((c) => c.method === 'createElement')
        .map((c) => (typeof c.timing === 'number' ? c.timing : 0)),
    );
    for (const c of bindingCommands) {
      (c as AgentCommand & { timing: number }).timing = createCommandMaxT + 1;
    }
    commands.push(...bindingCommands);
  }

  // Viewport state for the compiled scene — uses auto-computed center
  const viewport: ViewportState = { x: center.x, y: center.y, zoom, rotation: 0 };

  return {
    id: scene.id,
    name: scene.id,
    narration: scene.narration,
    checkpointName: `checkpoint-${scene.id}`,
    agentCommands: commands,
    syncMarkers: allSyncMarkers.length > 0 ? allSyncMarkers : undefined,
    viewport,
    interactiveParameters: interactiveParams,
    estimatedDurationSeconds: scene.durationEstimate,
    // Pass through for demo/legacy compatibility
    nodeIds: scene.nodeIds,
    focusNodeId: scene.focusNodeId,
    durationEstimate: scene.durationEstimate,
  };
}

/** Build entities map from visual script frames (for demo mode binding inference). */
function buildEntitiesFromScript(script: VisualScript): Record<string, VisualEntity> {
  const entities: Record<string, VisualEntity> = {};
  for (const frame of script.frames) {
    for (const entity of frame.entities) {
      if (!entities[entity.id]) entities[entity.id] = entity;
    }
  }
  return entities;
}

// ── compileStoryboardScene (StoryboardEngine pipeline) ─────────

function computeBoundsFromCenter(center: { x: number; y: number }, zoom: number): Bounds {
  const w = CANVAS_WIDTH / zoom;
  const h = CANVAS_HEIGHT / zoom;
  return {
    x: center.x - w / 2,
    y: center.y - h / 2,
    width: w,
    height: h,
  };
}

function plannerViewportToViewportState(vp: PlannerViewport): ViewportState {
  const bounds = computeBoundsFromCenter(vp.center, vp.zoom);
  return {
    x: vp.center.x,
    y: vp.center.y,
    zoom: vp.zoom,
    rotation: 0,
    bounds,
  };
}

/** Rescale visual script timings to match actual audio duration. */
function rescaleVisualScript(script: VisualScript, scale: number): VisualScript {
  if (scale === 1) return script;
  return {
    ...script,
    frames: script.frames.map((f) => ({
      ...f,
      startTime: Math.round(f.startTime * scale),
      endTime: Math.round(f.endTime * scale),
    })),
    totalDuration: Math.round(script.totalDuration * scale),
  };
}

/** Map numeric timing (ms) to closest word index from word timestamps. */
function timingToWordIndex(timingMs: number, wordTimestamps: WordTimestamp[]): number {
  if (wordTimestamps.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  let cumulative = 0;
  for (let i = 0; i < wordTimestamps.length; i++) {
    const w = wordTimestamps[i];
    const mid = cumulative + (w.end - w.start) / 2;
    const dist = Math.abs(mid - timingMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
    cumulative = w.end;
  }
  return best;
}

/** Infer parameter bindings from entities using ENTITY_PARAMETER_MAP. */
function inferParameterBindings(
  sceneId: string,
  entities: Record<string, VisualEntity>,
  interactiveParams: string[],
): Map<string, Array<{ elementId: string; mapper: string }>> {
  const updates = new Map<string, Array<{ elementId: string; mapper: string }>>();
  for (const paramName of interactiveParams) {
    for (const [entityType, paramMap] of Object.entries(ENTITY_PARAMETER_MAP)) {
      if (!(paramName in paramMap)) continue;
      const propertyPath = paramMap[paramName];
      for (const [eid, ent] of Object.entries(entities)) {
        if (ent.type === entityType) {
          const elementId = `${sceneId}:${eid}`;
          const existing = updates.get(paramName) ?? [];
          existing.push({ elementId, mapper: propertyPath });
          updates.set(paramName, existing);
        }
      }
    }
  }
  return updates;
}

/**
 * Compile a StoryboardScene with VisualScript + TTS into AgentCommands, SyncMarkers, and parameter bindings.
 * Pure: does not mutate inputs.
 */
export function compileStoryboardScene(
  scene: StoryboardScene,
  storyboard: Storyboard,
  visualScript: VisualScript,
  wordTimestamps: WordTimestamp[],
  audioDurationMs: number,
): { scene: StoryboardScene; updatedParameters: ParameterDefinition[] } {
  const scale = visualScript.totalDuration > 0 ? audioDurationMs / visualScript.totalDuration : 1;
  const rescaledScript = rescaleVisualScript(visualScript, scale);

  let commands: AgentCommand[] = [];

  // 1. Checkpoint first (checkpointName is required)
  commands.push({
    method: 'createCheckpoint',
    args: { name: scene.checkpointName },
    timing: 0,
  });

  // 2. Viewport — auto-center on entity centroid, instant snap
  const baseViewport =
    scene.viewport && 'center' in scene.viewport
      ? plannerViewportToViewportState(scene.viewport as PlannerViewport)
      : (scene.viewport as ViewportState);
  const center = computeVisualScriptCenter(rescaledScript);
  const viewport: ViewportState = {
    x: center.x,
    y: center.y,
    zoom: baseViewport.zoom,
    rotation: baseViewport.rotation ?? 0,
  };
  commands.push({
    method: 'setViewport',
    args: { viewport },
    timing: 0,
  });

  // 3. Frames to commands (from rescaled script)
  const scriptCommands = compileVisualScript(rescaledScript, scene.id);
  commands.push(...scriptCommands);
  commands = fixCommandOrdering(commands);

  // 5. Parameter bindings
  const paramUpdates = inferParameterBindings(
    scene.id,
    visualScript.entities,
    scene.interactiveParameters,
  );
  const updatedParameters = storyboard.parameters.map((p) => {
    const bindings = paramUpdates.get(p.name);
    if (bindings && bindings.length > 0) {
      return { ...p, bindings };
    }
    return p;
  });

  // 6. Emit bindElementToParameter commands — elements must exist before binding.
  // Use createElement max timing only so bindings fire after last element created,
  // not after last animation (e.g. fadeIn). Parameters become interactive immediately.
  const bindingCommands: AgentCommand[] = [];
  for (const p of updatedParameters) {
    if (!p.bindings?.length) continue;
    for (const b of p.bindings) {
      const spec = 'elementId' in b ? b : { elementId: (b as { elementId: string }).elementId, mapper: (b as { mapper: string }).mapper };
      bindingCommands.push({
        method: 'bindElementToParameter',
        args: { elementId: spec.elementId, paramName: p.name, mapper: spec.mapper },
        timing: 0,
      });
    }
  }
  const createCommandMaxT = Math.max(
    0,
    ...commands
      .filter((c) => c.method === 'createElement')
      .map((c) => (typeof c.timing === 'number' ? c.timing : 0)),
  );
  for (const c of bindingCommands) {
    (c as AgentCommand & { timing: number }).timing = createCommandMaxT + 1;
  }
  commands.push(...bindingCommands);

  // Re-run sync marker extraction to include binding commands.
  // Sync markers require wordTimestamps which may arrive after execute().
  // Keep first-frame entity pairs (timing < 50ms) in the timed queue
  // so they fire immediately regardless of wordTimestamp arrival timing.
  // Only promote later-frame commands (t >= 50ms) to sync markers.
  const SYNC_MARKER_MIN_OFFSET_MS = 50;
  const syncMarkersFinal: SyncMarker[] = [];
  const timedCommandsFinal: AgentCommand[] = [];
  for (const cmd of commands) {
    if (typeof cmd.timing === 'number' && cmd.timing >= SYNC_MARKER_MIN_OFFSET_MS && wordTimestamps.length > 0) {
      const wordIdx = timingToWordIndex(cmd.timing, wordTimestamps);
      syncMarkersFinal.push({ wordIndex: wordIdx, command: { ...cmd, timing: 'immediate' as const } });
    } else {
      timedCommandsFinal.push(cmd);
    }
  }
  syncMarkersFinal.sort((a, b) => a.wordIndex - b.wordIndex);

  const compiledScene: StoryboardScene = {
    ...scene,
    agentCommands: timedCommandsFinal,
    syncMarkers: syncMarkersFinal.length > 0 ? syncMarkersFinal : undefined,
    viewport,
  };

  return { scene: compiledScene, updatedParameters };
}
