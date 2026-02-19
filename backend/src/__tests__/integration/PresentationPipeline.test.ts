/* ═══════════════════════════════════════════════════════════════
   Presentation Pipeline Integration — Storyboard → SceneGraph path.
   Verifies StoryboardEngine + ScenePipelineOrchestrator produce valid
   StoryboardScene with agentCommands. No WebSocket; mocked inputs.
   Phase 3 of Session 8 Integration Test.
   ═══════════════════════════════════════════════════════════════ */

import { StoryboardEngine } from '../../services/StoryboardEngine';
import { ScenePipelineOrchestrator } from '../../services/ScenePipelineOrchestrator';
import { ConcurrencyPool } from '../../services/ConcurrencyPool';
import type { KnowledgeGraph, KGNode, Storyboard, RLPolicy, DataType } from '../../../shared/types';

// ── Mock AgentService ─────────────────────────────────────────

const mockCallForJSON = jest.fn();

jest.mock('../../services/AgentService', () => ({
  AgentService: jest.fn().mockImplementation(() => ({
    callForJSON: mockCallForJSON,
  })),
}));

// ── Test data ─────────────────────────────────────────────────

function makeNode(id: string, label: string, depth = 0): KGNode {
  return {
    id,
    label,
    type: 'CONCEPT' as DataType,
    depth,
    content: `Content for ${label}`,
    narration: `Narration for ${label} with enough words.`,
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
    rootNodeId: nodes[0]?.id ?? '',
    nodes: nodesMap,
    edges: {},
    maxDepth: 4,
    nodeLimit: 50,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const mockPolicy: RLPolicy = {
  explanationStrategy: 'definition_first',
  pace: 120,
  visualDensity: 'moderate',
  expansionPriority: ['CONCEPT' as DataType],
  comprehensionCheckFrequency: 3,
};

// ── Mock planner + voice for ScenePipelineOrchestrator ─────────

const createMockPlanner = (nodes: KGNode[]) => ({
  composeSceneLocals: jest.fn((_graph: KnowledgeGraph, _focusNode: KGNode, nodeIndex: number) => ({
    scene: {
      id: `scene-${nodeIndex}`,
      nodeIds: [nodes[nodeIndex]?.id ?? 'n1'],
      edgeIds: [],
      narration: nodes[nodeIndex]?.narration ?? 'Test',
      focusNodeId: nodes[nodeIndex]?.id ?? 'n1',
      viewport: { x: 100, y: 100, zoom: 1 },
      visualCommands: [],
      durationEstimate: 5000,
      illustrations: [],
    },
    estimatedTimestamps: [{ word: 'test', start: 0, end: 1000 }],
    focusNode: nodes[nodeIndex],
  })),
  getVisualScriptGenerator: jest.fn(() => ({
    generateScript: jest.fn(async (sceneId: string) => ({
      sceneId,
      frames: [{ id: 'f1', startTime: 0, endTime: 3000, entities: [], narrationSegment: '', description: '' }],
      totalDuration: 3000,
      entities: {},
    })),
  })),
});

const createMockVoiceService = () => ({
  synthesizeSpeech: jest.fn(async () => ({
    audioData: Buffer.from('fake-audio'),
    wordTimestamps: [{ word: 'test', start: 0, end: 500 }],
    durationMs: 3000,
  })),
});

// ── Tests ─────────────────────────────────────────────────────

describe('PresentationPipeline integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('StoryboardEngine with mocked agent returns valid Storyboard', async () => {
    const nodes = [makeNode('n1', 'Node1'), makeNode('n2', 'Node2')];
    const graph = makeGraph(nodes);

    mockCallForJSON.mockResolvedValue({
      scenes: nodes.map((n, i) => ({
        id: `scene-${i}`,
        name: n.label,
        narration: n.narration,
        nodeIds: [n.id],
        checkpointName: `cp-${i}`,
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      })),
      parameters: [],
      interactionPoints: [],
    });

    const engine = new StoryboardEngine({ callForJSON: mockCallForJSON } as any);
    const storyboard = await engine.plan(graph, { userId: 'test' });

    expect(storyboard).toBeDefined();
    expect(storyboard.scenes.length).toBe(2);
    expect(storyboard.scenes[0].checkpointName).toBeDefined();
    expect(storyboard.scenes[0].nodeIds).toContain('n1');
  });

  it('ScenePipelineOrchestrator with Storyboard produces PreparedScene with agentCommands', async () => {
    const nodes = [makeNode('n1', 'Node1'), makeNode('n2', 'Node2')];
    const graph = makeGraph(nodes);

    const storyboard: Storyboard = {
      id: 'sb-1',
      title: 'Test',
      topic: 'Test Topic',
      scenes: nodes.map((n, i) => ({
        id: `scene-${i}`,
        name: n.label,
        narration: n.narration,
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

    const planner = createMockPlanner(nodes) as any;
    const voice = createMockVoiceService() as any;
    const pool = new ConcurrencyPool();

    const orchestrator = new ScenePipelineOrchestrator(planner, voice, pool, { enableTTS: false });
    orchestrator.prepareAllScenesFromStoryboard(graph, storyboard, mockPolicy);

    const scene0 = await orchestrator.getSceneQueue().waitForScene(0);
    expect(scene0).not.toBeNull();
    expect(scene0!.status).toBe('ready');
    expect(scene0!.storyboard).toBeDefined();
    expect(scene0!.storyboard!.agentCommands).toBeDefined();
    expect(Array.isArray(scene0!.storyboard!.agentCommands)).toBe(true);
  });
});
