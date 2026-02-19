import { StoryboardEngine } from '../services/StoryboardEngine';
import { AgentService } from '../services/AgentService';
import type { KnowledgeGraph, KGNode, LearnerProfile } from '../../shared/types';
import { DataType } from '../../shared/types';
import { validateStoryboard } from '../services/StoryboardValidator';

function makeNode(id: string, label: string, depth = 0): KGNode {
  return {
    id,
    label,
    type: 'CONCEPT' as DataType,
    depth,
    content: `Content for ${label}`,
    narration: `This is the narration for ${label}. It has enough words to pass validation.`,
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

const defaultProfile: LearnerProfile = {
  userId: 'user-1',
};

describe('StoryboardEngine', () => {
  const nodes = [
    makeNode('n1', 'Node1'),
    makeNode('n2', 'Node2'),
    makeNode('n3', 'Node3'),
    makeNode('n4', 'Node4'),
    makeNode('n5', 'Node5'),
  ];
  const graph = makeGraph(nodes);

  describe('plan()', () => {
    it('returns valid Storyboard for 5-node KG when mock returns valid JSON', async () => {
      const validStoryboard = {
        id: 'sb-1',
        title: 'Test',
        topic: 'Test Topic',
        scenes: nodes.map((n, i) => ({
          id: `scene-${i}`,
          name: n.label,
          narration: `Narration for ${n.label} with at least ten characters.`,
          nodeIds: [n.id],
          checkpointName: `cp-${i}`,
          viewport: { zoom: 1, center: { x: 0, y: 0 } },
          interactiveParameters: [],
          estimatedDurationSeconds: 15,
          agentCommands: [],
        })),
        parameters: [],
        interactionPoints: [],
      };

      const mockAgent = {
        callForJSON: jest.fn().mockResolvedValue(validStoryboard),
      } as unknown as AgentService;

      const engine = new StoryboardEngine(mockAgent);
      const result = await engine.plan(graph, defaultProfile);

      expect(result.scenes).toHaveLength(5);
      expect(result.scenes[0].nodeIds).toContain('n1');
      expect(validateStoryboard(result, graph).valid).toBe(true);
    });

    it('falls back when validator rejects consistently', async () => {
      const invalidStoryboard = {
        id: 'sb-1',
        title: 'Test',
        topic: 'Test Topic',
        scenes: [
          {
            id: 'scene-0',
            name: 'Bad',
            narration: 'short', // too short
            nodeIds: ['n1'],
            checkpointName: 'cp-0',
            viewport: { zoom: 1, center: { x: 0, y: 0 } },
            interactiveParameters: [],
            estimatedDurationSeconds: 15,
            agentCommands: [],
          },
        ],
        parameters: [],
        interactionPoints: [],
      };

      const mockAgent = {
        callForJSON: jest.fn().mockResolvedValue(invalidStoryboard),
      } as unknown as AgentService;

      const engine = new StoryboardEngine(mockAgent);
      const result = await engine.plan(graph, defaultProfile);

      expect(result.metadata?.validationStatus).toBe('fallback');
      expect(result.scenes).toHaveLength(5); // fallback = one per node
    });

    it('completes within timeout (mock returns quickly)', async () => {
      const validStoryboard = {
        id: 'sb-1',
        title: 'Test',
        topic: 'Test',
        scenes: nodes.map((n, i) => ({
          id: `scene-${i}`,
          name: n.label,
          narration: `Valid narration for ${n.label} with enough characters.`,
          nodeIds: [n.id],
          checkpointName: `cp-${i}`,
          viewport: { zoom: 1, center: { x: 0, y: 0 } },
          interactiveParameters: [],
          estimatedDurationSeconds: 15,
          agentCommands: [],
        })),
        parameters: [],
        interactionPoints: [],
      };

      const mockAgent = {
        callForJSON: jest.fn().mockResolvedValue(validStoryboard),
      } as unknown as AgentService;

      const engine = new StoryboardEngine(mockAgent);
      const start = Date.now();
      await engine.plan(graph, defaultProfile);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(6000); // 5s + buffer
    });
  });

  describe('buildFallbackStoryboard', () => {
    it('produces one scene per node', () => {
      const mockAgent = {} as AgentService;
      const engine = new StoryboardEngine(mockAgent);
      const result = engine.buildFallbackStoryboard(graph, defaultProfile);
      expect(result.scenes).toHaveLength(5);
      expect(result.scenes.map(s => s.nodeIds?.[0])).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    });

    it('never throws', () => {
      const mockAgent = {} as AgentService;
      const engine = new StoryboardEngine(mockAgent);
      expect(() => engine.buildFallbackStoryboard(graph, defaultProfile)).not.toThrow();
    });

    it('fallback passes Layer 3 KG validation', () => {
      const mockAgent = {} as AgentService;
      const engine = new StoryboardEngine(mockAgent);
      const result = engine.buildFallbackStoryboard(graph, defaultProfile);
      const validation = validateStoryboard(result, graph);
      expect(validation.valid).toBe(true);
    });
  });
});
