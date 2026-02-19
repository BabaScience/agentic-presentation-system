/* ═══════════════════════════════════════════════════════════════
   StoryboardEngine — Mission-driven storyboard planning
   Calls Claude with PLANNER_SYSTEM_PROMPT, validates, retries,
   falls back to buildFallbackStoryboard on exhaustion or timeout.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import type { KnowledgeGraph, Storyboard, StoryboardScene, LearnerProfile, KGNode } from '../../shared/types';
import { validateStoryboard } from './StoryboardValidator';
import { AgentService } from './AgentService';
import { PLANNER_SYSTEM_PROMPT } from '../prompts/systemPrompts';
import {
  MAX_PLAN_RETRIES,
  MIN_SCENE_DURATION_S,
  MAX_SCENE_DURATION_S,
  DEFAULT_PACE_WPM,
  STORYBOARD_GENERATION_MS,
} from '../../shared/constants';

export class StoryboardEngine {
  constructor(
    private agentService: AgentService,
  ) {}

  /**
   * Plan a storyboard from knowledge graph and learner profile.
   * Retries on validation failure; falls back to BFS one-scene-per-node on exhaustion or timeout.
   */
  async plan(graph: KnowledgeGraph, learnerProfile: LearnerProfile): Promise<Storyboard> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Storyboard planning timeout')), STORYBOARD_GENERATION_MS);
    });

    const planPromise = (async (): Promise<Storyboard> => {
      const nodeList = Object.values(graph.nodes)
        .map(n => `  - ${n.id}: ${n.label} (${n.type})`)
        .join('\n');
      const rootNode = graph.nodes[graph.rootNodeId];
      const learnerContext = learnerProfile.presentationPreferences
        ? `Pace: ${learnerProfile.presentationPreferences.optimalPaceWPM ?? 150} WPM, ` +
          `Visual: ${learnerProfile.presentationPreferences.visualDensity ?? 'moderate'}`
        : 'Default pace and visual density';

      const userPrompt = `Knowledge graph for topic "${graph.sessionId}" (or use a short topic name):

Nodes:
${nodeList}

Root node id: ${graph.rootNodeId}${rootNode ? ` (${rootNode.label})` : ''}

Learner context: ${learnerContext}

Generate a complete Storyboard JSON. Each scene must have nodeIds referencing the node ids above. First scene must include rootNodeId "${graph.rootNodeId}".`;

      let lastErrors: string[] = [];
      for (let attempt = 0; attempt <= MAX_PLAN_RETRIES; attempt++) {
        try {
          const systemPrompt =
            attempt === 0
              ? PLANNER_SYSTEM_PROMPT
              : `${PLANNER_SYSTEM_PROMPT}

PREVIOUS ATTEMPT FAILED VALIDATION. Errors:
${lastErrors.map(e => `- ${e}`).join('\n')}

Fix these errors and output valid JSON again.`;

          const raw = await this.agentService.callForJSON(userPrompt, systemPrompt);
          const storyboard = this.normalizeStoryboard(raw as Record<string, unknown>, graph);

          const result = validateStoryboard(storyboard, graph);
          if (result.valid) {
            return {
              ...storyboard,
              generatedAt: Date.now(),
              targetUser: {
                expertise: learnerProfile.presentationPreferences?.bestExplanationStyle,
                userId: learnerProfile.userId,
                roadmapPosition: learnerProfile.roadmapPosition,
                presentationPreferences: learnerProfile.presentationPreferences,
              },
              metadata: {
                totalEstimatedDurationSeconds: storyboard.scenes.reduce((s, sc) => s + sc.estimatedDurationSeconds, 0),
                checkpointCount: storyboard.scenes.filter(s => s.checkpointName).length,
                parameterCount: storyboard.parameters.length,
                branchCount: storyboard.scenes.reduce((s, sc) => s + (sc.branches?.length ?? 0), 0),
                plannerVersion: 'planner-1.0',
                validationStatus: 'valid',
              },
            };
          }
          lastErrors = result.errors;
        } catch (err: any) {
          lastErrors = [err.message || String(err)];
        }
      }

      return this.buildFallbackStoryboard(graph, learnerProfile);
    })();

    return Promise.race([planPromise, timeoutPromise]).catch(err => {
      if (err?.message === 'Storyboard planning timeout') {
        return this.buildFallbackStoryboard(graph, learnerProfile);
      }
      throw err;
    });
  }

  /** Normalize raw planner output to Storyboard shape. */
  private normalizeStoryboard(raw: Record<string, unknown>, graph: KnowledgeGraph): Storyboard {
    const scenes = (raw.scenes as any[])?.map((s: any, i: number) => ({
      id: s.id ?? `scene-${i}`,
      name: s.name ?? `Scene ${i}`,
      narration: s.narration ?? '',
      nodeIds: Array.isArray(s.nodeIds) ? s.nodeIds : [Object.keys(graph.nodes)[0]],
      checkpointName: s.checkpointName ?? `checkpoint-${i}`,
      viewport: s.viewport ?? { zoom: 1, center: { x: 0, y: 0 } },
      interactiveParameters: Array.isArray(s.interactiveParameters) ? s.interactiveParameters : [],
      estimatedDurationSeconds: typeof s.estimatedDurationSeconds === 'number' ? s.estimatedDurationSeconds : 15,
      agentCommands: [],
      scaffolding: s.scaffolding,
      branches: s.branches,
    })) ?? [];

    return {
      id: (raw.id as string) ?? `sb-${uuid().slice(0, 8)}`,
      title: (raw.title as string) ?? 'Presentation',
      topic: (raw.topic as string) ?? graph.sessionId,
      scenes,
      parameters: Array.isArray(raw.parameters) ? raw.parameters : [],
      interactionPoints: Array.isArray(raw.interactionPoints) ? raw.interactionPoints : [],
    };
  }

  /** Fallback: one scene per node, BFS order. No parameters, branches, or interaction points. */
  buildFallbackStoryboard(graph: KnowledgeGraph, learnerProfile: LearnerProfile): Storyboard {
    const nodes = this.bfsOrder(graph);
    const scenes: StoryboardScene[] = nodes.map((node, i) => {
      const wordCount = (node.narration?.split(/\s+/).length ?? 20) + 10;
      const rawDuration = (wordCount / (learnerProfile.presentationPreferences?.optimalPaceWPM ?? DEFAULT_PACE_WPM)) * 60;
      const estimatedDurationSeconds = Math.max(
        MIN_SCENE_DURATION_S,
        Math.min(MAX_SCENE_DURATION_S, Math.round(rawDuration))
      );
      return {
        id: `scene-${i}`,
        name: node.label,
        narration: node.narration || `Let's explore ${node.label}.`,
        nodeIds: [node.id],
        checkpointName: `fallback-${i}`,
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds,
        agentCommands: [],
      };
    });

    const narrationManifest = {
      scenes: scenes.map(s => ({ sceneId: s.id, text: s.narration })),
    };

    return {
      id: `sb-fallback-${uuid().slice(0, 8)}`,
      title: 'Presentation',
      topic: graph.sessionId,
      generatedAt: Date.now(),
      targetUser: {
        userId: learnerProfile.userId,
        roadmapPosition: learnerProfile.roadmapPosition,
        presentationPreferences: learnerProfile.presentationPreferences,
      },
      scenes,
      parameters: [],
      narrationManifest,
      interactionPoints: [],
      metadata: {
        totalEstimatedDurationSeconds: scenes.reduce((s, sc) => s + sc.estimatedDurationSeconds, 0),
        checkpointCount: scenes.length,
        parameterCount: 0,
        branchCount: 0,
        plannerVersion: 'fallback-1.0',
        validationStatus: 'fallback',
      },
    };
  }

  private bfsOrder(graph: KnowledgeGraph): KGNode[] {
    const visited = new Set<string>();
    const queue: string[] = [graph.rootNodeId];
    const result: KGNode[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = graph.nodes[id];
      if (node) {
        result.push(node);
        const edges = Object.values(graph.edges).filter(e => e.sourceId === id);
        for (const e of edges) {
          if (!visited.has(e.targetId)) queue.push(e.targetId);
        }
      }
    }
    // Include any nodes not reached by BFS from root
    for (const id of Object.keys(graph.nodes)) {
      if (!visited.has(id)) {
        const node = graph.nodes[id];
        if (node) result.push(node);
      }
    }
    return result;
  }
}
