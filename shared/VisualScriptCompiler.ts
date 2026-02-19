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

  // Viewport setup at t=0
  if (scene.viewport) {
    commands.push({
      method: 'panTo',
      args: { position: { x: scene.viewport.x, y: scene.viewport.y } },
      timing: 0,
    });
    commands.push({
      method: 'zoomTo',
      args: { level: scene.viewport.zoom },
      timing: 0,
    });
  }

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

  const viewport: ViewportState = scene.viewport
    ? { x: scene.viewport.x, y: scene.viewport.y, zoom: scene.viewport.zoom, rotation: 0 }
    : { x: 0, y: 0, zoom: 1, rotation: 0 };

  return {
    id: scene.id,
    name: scene.id,
    narration: scene.narration,
    checkpointName: `checkpoint-${scene.id}`,
    agentCommands: commands,
    syncMarkers: allSyncMarkers.length > 0 ? allSyncMarkers : undefined,
    viewport,
    interactiveParameters: [],
    estimatedDurationSeconds: scene.durationEstimate,
    // Pass through for demo/legacy compatibility
    nodeIds: scene.nodeIds,
    focusNodeId: scene.focusNodeId,
    durationEstimate: scene.durationEstimate,
  };
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

  // 2. Viewport
  const viewport =
    scene.viewport && 'center' in scene.viewport
      ? plannerViewportToViewportState(scene.viewport as PlannerViewport)
      : (scene.viewport as ViewportState);
  commands.push({
    method: 'panTo',
    args: { position: { x: viewport.x, y: viewport.y } },
    timing: 0,
  });
  commands.push({
    method: 'zoomTo',
    args: { level: viewport.zoom },
    timing: 0,
  });

  // 3. Frames to commands (from rescaled script)
  const scriptCommands = compileVisualScript(rescaledScript, scene.id);
  commands.push(...scriptCommands);
  commands = fixCommandOrdering(commands);

  // 4. Sync markers: map numeric timing to closest word
  const syncMarkers: SyncMarker[] = [];
  const timedCommands: AgentCommand[] = [];
  for (const cmd of commands) {
    if (typeof cmd.timing === 'number' && cmd.timing > 0 && wordTimestamps.length > 0) {
      const wordIdx = timingToWordIndex(cmd.timing, wordTimestamps);
      syncMarkers.push({ wordIndex: wordIdx, command: { ...cmd, timing: 'immediate' as const } });
    } else {
      timedCommands.push(cmd);
    }
  }
  syncMarkers.sort((a, b) => a.wordIndex - b.wordIndex);

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

  const compiledScene: StoryboardScene = {
    ...scene,
    agentCommands: timedCommands,
    syncMarkers: syncMarkers.length > 0 ? syncMarkers : undefined,
    viewport,
  };

  return { scene: compiledScene, updatedParameters };
}
