/* ═══════════════════════════════════════════════════════════════
   StoryboardValidator — Four-layer validation for Storyboard
   Layer 1: Schema (Zod) — structure and basic constraints
   Layer 2: Semantic — cross-references, uniqueness, cycles
   Layer 3: KG — nodeIds exist in graph, root in first scene
   Layer 4: Execution-time — parameter bindings (drop invalid, no throw)
   ═══════════════════════════════════════════════════════════════ */

import { z } from 'zod';
import type {
  Storyboard,
  StoryboardScene,
  KnowledgeGraph,
  ValidationResult,
  ParameterDefinition,
} from '../../shared/types';
import { MAX_BRANCHES_PER_SCENE } from '../../shared/constants';

// ── Layer 1: Zod Schemas ──────────────────────────────────────

const PARAM_NAME_REGEX = /^[a-z][a-z0-9_]*$/;

const plannerViewportSchema = z.object({
  zoom: z.number(),
  center: z.object({ x: z.number(), y: z.number() }),
});

const viewportStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
  bounds: z
    .object({
      minX: z.number(),
      minY: z.number(),
      maxX: z.number(),
      maxY: z.number(),
    })
    .optional(),
});

const viewportSchema = z.union([plannerViewportSchema, viewportStateSchema]);

const parameterDefinitionSchema = z.object({
  name: z.string().regex(PARAM_NAME_REGEX, 'Parameter name must match /^[a-z][a-z0-9_]*$/'),
  type: z.enum(['integer', 'float', 'boolean', 'string', 'enum']),
  default: z.unknown(),
  label: z.string(),
  bindings: z.array(z.any()),
  exposedInScenes: z.array(z.string()).optional(),
  semanticTarget: z.string().optional(),
});

const storyboardSceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  narration: z.string().min(10, 'Narration must be at least 10 characters'),
  nodeIds: z.array(z.string()).min(1, 'Each scene must have at least one nodeId'),
  checkpointName: z.string().optional(),
  focusNodeId: z.string().optional(),
  durationEstimate: z.number().optional(),
  agentCommands: z.array(z.any()),
  syncMarkers: z.array(z.any()).optional(),
  viewport: viewportSchema,
  interactiveParameters: z.array(z.string()),
  transitionFrom: z.any().optional(),
  estimatedDurationSeconds: z.number().positive('estimatedDurationSeconds must be > 0'),
  branches: z.array(z.any()).optional(),
  scaffolding: z.any().optional(),
});

const storyboardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  topic: z.string().min(1),
  scenes: z.array(storyboardSceneSchema).min(1),
  parameters: z.array(parameterDefinitionSchema),
  interactionPoints: z.array(z.any()),
});

// ── Layer 1: Schema validation ─────────────────────────────────

function validateLayer1(storyboard: Storyboard): ValidationResult {
  const errors: string[] = [];
  const result = storyboardSchema.safeParse(storyboard);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors.push(path ? `${path}: ${issue.message}` : issue.message);
    }
    return { valid: false, errors };
  }
  // Also validate each parameter name in parameters
  for (const param of storyboard.parameters) {
    const paramResult = parameterDefinitionSchema.safeParse(param);
    if (!paramResult.success) {
      for (const issue of paramResult.error.issues) {
        errors.push(`parameters.${param.name}: ${issue.message}`);
      }
    }
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [] };
}

// ── Layer 2: Semantic validation ───────────────────────────────

function validateLayer2(storyboard: Storyboard): ValidationResult {
  const errors: string[] = [];
  const sceneIds = new Set(storyboard.scenes.map((s) => s.id));
  const checkpointNames = new Set<string>();
  const paramNames = new Set(storyboard.parameters.map((p) => p.name));

  for (const scene of storyboard.scenes) {
    // Unique checkpoint names
    if (scene.checkpointName) {
      if (checkpointNames.has(scene.checkpointName)) {
        errors.push(`Duplicate checkpoint name: ${scene.checkpointName}`);
      }
      checkpointNames.add(scene.checkpointName);
    }

    // interactiveParameters reference parameters[]
    for (const p of scene.interactiveParameters) {
      if (!paramNames.has(p)) {
        errors.push(`Scene ${scene.id}: interactiveParameters references unknown parameter "${p}"`);
      }
    }

    // parameter exposedInScenes reference scene ids
    for (const param of storyboard.parameters) {
      if (param.exposedInScenes) {
        for (const sid of param.exposedInScenes) {
          if (!sceneIds.has(sid)) {
            errors.push(`Parameter ${param.name}: exposedInScenes references unknown scene "${sid}"`);
          }
        }
      }
    }

    // branches: targets exist, no cycles
    if (scene.branches) {
      if (scene.branches.length > MAX_BRANCHES_PER_SCENE) {
        errors.push(`Scene ${scene.id}: exceeds MAX_BRANCHES_PER_SCENE (${MAX_BRANCHES_PER_SCENE})`);
      }
      for (const b of scene.branches) {
        const targetId = b.targetSceneId ?? (b as any).target;
        if (targetId && !sceneIds.has(targetId)) {
          errors.push(`Scene ${scene.id}: branch targets unknown scene "${targetId}"`);
        }
        const returnId = b.returnToSceneId ?? (b as any).returnTo;
        if (returnId && !sceneIds.has(returnId)) {
          errors.push(`Scene ${scene.id}: branch returnToSceneId references unknown scene "${returnId}"`);
        }
      }
    }
  }

  // interactionPoints: sceneIds exist
  for (const ip of storyboard.interactionPoints) {
    if (!sceneIds.has(ip.sceneId)) {
      errors.push(`InteractionPoint references unknown scene "${ip.sceneId}"`);
    }
    if (ip.branchTo && !sceneIds.has(ip.branchTo)) {
      errors.push(`InteractionPoint branchTo references unknown scene "${ip.branchTo}"`);
    }
    if (ip.branches) {
      for (const b of ip.branches) {
        const targetId = b.targetSceneId ?? (b as any).target;
        if (targetId && !sceneIds.has(targetId)) {
          errors.push(`InteractionPoint in ${ip.sceneId}: branch targets unknown scene "${targetId}"`);
        }
      }
    }
  }

  // Branch cycles (DFS)
  const cycleResult = detectBranchCycles(storyboard);
  if (!cycleResult.valid) {
    errors.push(...cycleResult.errors);
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [] };
}

function detectBranchCycles(storyboard: Storyboard): ValidationResult {
  const sceneIds = new Set(storyboard.scenes.map((s) => s.id));
  const sceneById = new Map(storyboard.scenes.map((s) => [s.id, s]));

  const getTargets = (scene: StoryboardScene): string[] => {
    const targets: string[] = [];
    if (scene.branches) {
      for (const b of scene.branches) {
        const t = b.targetSceneId ?? (b as any).target;
        if (t && sceneIds.has(t)) targets.push(t);
      }
    }
    return targets;
  };

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycle: string[] = [];
  const errors: string[] = [];

  function dfs(id: string, path: string[]): boolean {
    if (stack.has(id)) {
      const idx = path.indexOf(id);
      const cycleNodes = path.slice(idx).concat(id);
      errors.push(`Branch cycle detected: ${cycleNodes.join(' → ')}`);
      return true;
    }
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    path.push(id);
    const scene = sceneById.get(id);
    if (scene) {
      for (const t of getTargets(scene)) {
        if (dfs(t, path)) {
          stack.delete(id);
          path.pop();
          return true;
        }
      }
    }
    stack.delete(id);
    path.pop();
    return false;
  }

  for (const id of sceneIds) {
    if (!visited.has(id) && dfs(id, [])) break;
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

// ── Layer 3: KG validation ────────────────────────────────────

function validateLayer3(storyboard: Storyboard, graph: KnowledgeGraph): ValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set(Object.keys(graph.nodes));

  for (const scene of storyboard.scenes) {
    const ids = scene.nodeIds ?? [];
    for (const nid of ids) {
      if (!nodeIds.has(nid)) {
        errors.push(`Scene ${scene.id}: nodeIds references unknown graph node "${nid}"`);
      }
    }
  }

  // First scene must include rootNodeId
  const firstScene = storyboard.scenes[0];
  if (firstScene) {
    const firstNodeIds = firstScene.nodeIds ?? [];
    if (!firstNodeIds.includes(graph.rootNodeId)) {
      errors.push(`First scene must include graph rootNodeId "${graph.rootNodeId}"`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [] };
}

// ── Layer 4: Execution-time (parameter bindings) ───────────────
// Does not throw; drops invalid bindings with console.warn.

export function validateParameterBindings(
  param: ParameterDefinition,
  elementIds: Set<string>
): ParameterDefinition {
  const validBindings = (param.bindings ?? []).filter((b: any) => {
    const eid = b.elementId ?? b.targetId;
    if (!elementIds.has(eid)) {
      console.warn(`StoryboardValidator: dropping invalid binding for param ${param.name} (element ${eid} not found)`);
      return false;
    }
    return true;
  });
  return { ...param, bindings: validBindings };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Validate storyboard. Layers 1–3 run here. Layer 4 is for execution-time only.
 * @param storyboard - The storyboard to validate
 * @param graph - Optional. If provided, Layer 3 (KG) validation runs.
 * @returns ValidationResult. Never throws; caller decides retry vs fallback.
 */
export function validateStoryboard(
  storyboard: Storyboard,
  graph?: KnowledgeGraph | null
): ValidationResult {
  const allErrors: string[] = [];

  const l1 = validateLayer1(storyboard);
  if (!l1.valid) allErrors.push(...l1.errors);

  const l2 = validateLayer2(storyboard);
  if (!l2.valid) allErrors.push(...l2.errors);

  if (graph) {
    const l3 = validateLayer3(storyboard, graph);
    if (!l3.valid) allErrors.push(...l3.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
