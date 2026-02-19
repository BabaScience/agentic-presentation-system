import { validateStoryboard, validateParameterBindings } from '../services/StoryboardValidator';
import type { Storyboard, StoryboardScene, KnowledgeGraph, KGNode, ParameterDefinition } from '../../shared/types';
import { DataType } from '../../shared/types';

// ── Helpers ───────────────────────────────────────────────────

function makeNode(id: string, label: string, depth = 0): KGNode {
  return {
    id,
    label,
    type: 'CONCEPT' as DataType,
    depth,
    content: `Content for ${label}`,
    narration: `This is the narration for ${label}.`,
    visual: {
      elementType: 'box',
      x: 100,
      y: 100,
      width: 160,
      height: 100,
      style: { fill: '#00e5ff', stroke: '#00e5ff', strokeWidth: 2 },
      animation: { type: 'fadeIn' as const, duration: 500, delay: 0 },
    },
    rlRelevanceScore: 0.8,
    isExpanded: false,
    isPresented: false,
    parentId: null,
    metadata: {},
    createdAt: Date.now(),
  };
}

function makeGraph(nodes: KGNode[]): KnowledgeGraph {
  const nodesMap: Record<string, KGNode> = {};
  for (const n of nodes) nodesMap[n.id] = n;
  return {
    sessionId: 'test-session',
    rootNodeId: nodes[0]?.id || '',
    nodes: nodesMap,
    edges: {},
    maxDepth: 4,
    nodeLimit: 50,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeScene(id: string, nodeIds: string[], overrides: Partial<StoryboardScene> = {}): StoryboardScene {
  return {
    id,
    name: `Scene ${id}`,
    narration: 'This is a valid narration with at least ten characters.',
    nodeIds,
    checkpointName: `cp-${id}`,
    agentCommands: [],
    viewport: { zoom: 1, center: { x: 0, y: 0 } },
    interactiveParameters: [],
    estimatedDurationSeconds: 15,
    ...overrides,
  };
}

function makeValidStoryboard(graph: KnowledgeGraph): Storyboard {
  const nodeIds = Object.keys(graph.nodes);
  const scenes: StoryboardScene[] = nodeIds.map((nid, i) =>
    makeScene(`scene-${i}`, [nid], { checkpointName: `checkpoint-${i}` })
  );
  return {
    id: 'sb-1',
    title: 'Test Storyboard',
    topic: 'Test Topic',
    scenes,
    parameters: [
      {
        name: 'pod_count',
        type: 'integer',
        default: 3,
        label: 'Pod Count',
        bindings: [],
      },
    ],
    interactionPoints: [],
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('StoryboardValidator', () => {
  const nodes = [makeNode('n1', 'Node1'), makeNode('n2', 'Node2'), makeNode('n3', 'Node3')];
  const graph = makeGraph(nodes);

  describe('valid storyboard passes all layers', () => {
    it('passes when storyboard is valid and graph provided', () => {
      const sb = makeValidStoryboard(graph);
      const result = validateStoryboard(sb, graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes Layer 1 and 2 when graph not provided', () => {
      const sb = makeValidStoryboard(graph);
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(true);
    });
  });

  describe('Layer 1 - Schema', () => {
    it('fails when narration is too short', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].narration = 'short';
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('narration') || e.includes('10'))).toBe(true);
    });

    it('fails when nodeIds is empty', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].nodeIds = [];
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('nodeid'))).toBe(true);
    });

    it('fails when estimatedDurationSeconds is zero or negative', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].estimatedDurationSeconds = 0;
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
    });

    it('fails when parameter name violates regex', () => {
      const sb = makeValidStoryboard(graph);
      sb.parameters = [{ name: 'InvalidName', type: 'integer', default: 1, label: 'X', bindings: [] }];
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Parameter') || e.includes('parameter'))).toBe(true);
    });
  });

  describe('Layer 2 - Semantic', () => {
    it('fails on duplicate checkpoint names', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].checkpointName = 'dup';
      sb.scenes[1].checkpointName = 'dup';
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate checkpoint'))).toBe(true);
    });

    it('fails when interactiveParameters references unknown parameter', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].interactiveParameters = ['unknown_param'];
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('unknown_param'))).toBe(true);
    });

    it('fails on branch cycle', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].branches = [{ id: 'b1', targetSceneId: 'scene-1' }];
      sb.scenes[1].branches = [{ id: 'b2', targetSceneId: 'scene-0' }];
      const result = validateStoryboard(sb);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cycle'))).toBe(true);
    });
  });

  describe('Layer 3 - KG', () => {
    it('fails when scene references missing KG node', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].nodeIds = ['nonexistent-node'];
      const result = validateStoryboard(sb, graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('nonexistent-node'))).toBe(true);
    });

    it('fails when first scene does not include rootNodeId', () => {
      const sb = makeValidStoryboard(graph);
      sb.scenes[0].nodeIds = [nodes[1].id]; // n2, not n1 (root)
      const result = validateStoryboard(sb, graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('rootNodeId') || e.includes('First scene'))).toBe(true);
    });
  });

  describe('validateParameterBindings (Layer 4)', () => {
    it('drops invalid bindings and returns updated param', () => {
      const param: ParameterDefinition = {
        name: 'pod_count',
        type: 'integer',
        default: 3,
        label: 'Pod Count',
        bindings: [
          { elementId: 'el-1', mapper: 'itemCount' },
          { elementId: 'el-missing', mapper: 'itemCount' },
        ] as any,
      };
      const elementIds = new Set(['el-1']);
      const updated = validateParameterBindings(param, elementIds);
      expect(updated.bindings).toHaveLength(1);
      expect((updated.bindings[0] as any).elementId).toBe('el-1');
    });

    it('preserves all bindings when all elementIds exist', () => {
      const param: ParameterDefinition = {
        name: 'pod_count',
        type: 'integer',
        default: 3,
        label: 'Pod Count',
        bindings: [
          { elementId: 'el-1', mapper: 'itemCount' },
          { elementId: 'el-2', mapper: 'itemCount' },
        ] as any,
      };
      const elementIds = new Set(['el-1', 'el-2']);
      const updated = validateParameterBindings(param, elementIds);
      expect(updated.bindings).toHaveLength(2);
    });
  });
});
