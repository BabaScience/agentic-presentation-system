/* ═══════════════════════════════════════════════════════════════
   VisualScriptCompiler — Translates backend output into AgentCommand[]
   Bridges VisualScript/VisualCommand[] from the pipeline to the
   engine's AgentCommand format for SceneExecutor consumption.
   NO DOM, NO React.
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
} from '@shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@shared/constants';

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

// ── compilePresentationScene ─────────────────────────────────

export function compilePresentationScene(
  scene: PresentationScene,
  wordTimestamps?: WordTimestamp[],
): StoryboardScene {
  const commands: AgentCommand[] = [];
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

  const viewport: ViewportState = scene.viewport
    ? { x: scene.viewport.x, y: scene.viewport.y, zoom: scene.viewport.zoom, rotation: 0 }
    : { x: 0, y: 0, zoom: 1, rotation: 0 };

  return {
    id: scene.id,
    name: scene.id,
    narration: scene.narration,
    agentCommands: commands,
    viewport,
    interactiveParameters: [],
    estimatedDurationSeconds: scene.durationEstimate,
  };
}
