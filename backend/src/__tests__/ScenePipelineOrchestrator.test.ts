import { ScenePipelineOrchestrator } from '../services/ScenePipelineOrchestrator';
import { ConcurrencyPool } from '../services/ConcurrencyPool';
import type { KnowledgeGraph, KGNode, RLPolicy, DataType, VisualScript, WordTimestamp } from '../../shared/types';
import type { SceneLocalData } from '../services/PresentationPlanner';

// ── Mock factories ──────────────────────────────────────────

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
      x: 100, y: 100, width: 160, height: 100,
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

const mockPolicy: RLPolicy = {
  explanationStrategy: 'definition_first',
  pace: 120,
  visualDensity: 'moderate',
  expansionPriority: ['CONCEPT' as DataType],
  comprehensionCheckFrequency: 3,
};

function makeSceneLocal(index: number, node: KGNode): SceneLocalData {
  return {
    scene: {
      id: `scene-${index}`,
      nodeIds: [node.id],
      edgeIds: [],
      narration: node.narration,
      focusNodeId: node.id,
      viewport: { x: 100, y: 100, zoom: 1 },
      visualCommands: [],
      durationEstimate: 5000,
      illustrations: [],
    },
    estimatedTimestamps: [{ word: 'test', start: 0, end: 1000 }],
    focusNode: node,
  };
}

// ── Mock services ───────────────────────────────────────────

function createMockPlanner(nodes: KGNode[]) {
  let callIndex = 0;
  return {
    composeSceneLocals: jest.fn((_graph: any, focusNode: KGNode, nodeIndex: number) => {
      return makeSceneLocal(nodeIndex, focusNode);
    }),
    getVisualScriptGenerator: jest.fn(() => ({
      generateScript: jest.fn(async (sceneId: string): Promise<VisualScript> => ({
        sceneId,
        frames: [],
        totalDuration: 5000,
        entities: {},
      })),
    })),
  };
}

function createMockVoiceService(shouldFail = false) {
  return {
    synthesizeSpeech: jest.fn(async (text: string) => {
      if (shouldFail) throw new Error('TTS failed');
      return {
        audioData: Buffer.from('fake-audio'),
        wordTimestamps: [{ word: 'test', start: 0, end: 500 }] as WordTimestamp[],
        durationMs: 3000,
      };
    }),
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('ScenePipelineOrchestrator', () => {
  it('should prepare all scenes and make them available via queue', async () => {
    const nodes = [makeNode('n1', 'Node 1'), makeNode('n2', 'Node 2'), makeNode('n3', 'Node 3')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    const voice = createMockVoiceService();
    const pool = new ConcurrencyPool({ maxTotal: 4, maxClaude: 3, maxTTS: 2 });

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: true },
    );

    const statusUpdates: Array<{ index: number; status: string }> = [];
    orchestrator.prepareAllScenes(graph, nodes, mockPolicy, (idx, status) => {
      statusUpdates.push({ index: idx, status });
    });

    expect(orchestrator.getTotalSceneCount()).toBe(3);

    const queue = orchestrator.getSceneQueue();

    // All scenes should eventually be ready
    const scene0 = await queue.waitForScene(0);
    const scene1 = await queue.waitForScene(1);
    const scene2 = await queue.waitForScene(2);

    expect(scene0).not.toBeNull();
    expect(scene1).not.toBeNull();
    expect(scene2).not.toBeNull();
    expect(scene0!.status).toBe('ready');
    expect(scene1!.status).toBe('ready');
    expect(scene2!.status).toBe('ready');
  });

  it('should include audio data when TTS is enabled and succeeds', async () => {
    const nodes = [makeNode('n1', 'Node 1')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    const voice = createMockVoiceService(false);
    const pool = new ConcurrencyPool();

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: true },
    );

    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    const scene = await orchestrator.getSceneQueue().waitForScene(0);
    expect(scene).not.toBeNull();
    expect(scene!.audioData).toBeDefined();
    expect(scene!.audioDurationMs).toBe(3000);
    expect(scene!.wordTimestamps).toBeDefined();
  });

  it('should still produce scene when TTS fails (graceful degradation)', async () => {
    const nodes = [makeNode('n1', 'Node 1')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    const voice = createMockVoiceService(true); // TTS fails
    const pool = new ConcurrencyPool();

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: true },
    );

    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    const scene = await orchestrator.getSceneQueue().waitForScene(0);
    expect(scene).not.toBeNull();
    expect(scene!.status).toBe('ready');
    // No audio data since TTS failed
    expect(scene!.audioData).toBeUndefined();
  });

  it('should not include TTS when disabled', async () => {
    const nodes = [makeNode('n1', 'Node 1')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    const voice = createMockVoiceService();
    const pool = new ConcurrencyPool();

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: false },
    );

    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    const scene = await orchestrator.getSceneQueue().waitForScene(0);
    expect(scene).not.toBeNull();
    expect(scene!.audioData).toBeUndefined();
    expect(voice.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('should cancel pending scenes', async () => {
    const nodes = [makeNode('n1', 'Node 1'), makeNode('n2', 'Node 2')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    // Slow voice service to ensure scene 2 is still pending
    const voice = {
      synthesizeSpeech: jest.fn(async () => {
        await new Promise(r => setTimeout(r, 500));
        return { audioData: Buffer.from('audio'), wordTimestamps: [], durationMs: 3000 };
      }),
    };
    const pool = new ConcurrencyPool({ maxTotal: 1, maxClaude: 1, maxTTS: 1 });

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: true },
    );

    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    // Cancel immediately
    orchestrator.cancelPending();

    // Waiting should return null
    const scene = await orchestrator.getSceneQueue().waitForScene(1);
    expect(scene).toBeNull();
  });

  it('should call composeSceneLocals for each node', async () => {
    const nodes = [makeNode('n1', 'A'), makeNode('n2', 'B')];
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    const voice = createMockVoiceService();
    const pool = new ConcurrencyPool();

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: false },
    );

    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    await orchestrator.getSceneQueue().waitForScene(0);
    await orchestrator.getSceneQueue().waitForScene(1);

    expect(planner.composeSceneLocals).toHaveBeenCalledTimes(2);
  });

  it('concurrent scene prep should be faster than sequential', async () => {
    const nodes = Array.from({ length: 4 }, (_, i) => makeNode(`n${i}`, `Node ${i}`));
    const graph = makeGraph(nodes);
    const planner = createMockPlanner(nodes);
    // Each "API call" takes 50ms
    const voice = {
      synthesizeSpeech: jest.fn(async () => {
        await new Promise(r => setTimeout(r, 50));
        return { audioData: Buffer.from('audio'), wordTimestamps: [], durationMs: 3000 };
      }),
    };
    const pool = new ConcurrencyPool({ maxTotal: 4, maxClaude: 4, maxTTS: 4 });

    const orchestrator = new ScenePipelineOrchestrator(
      planner as any,
      voice as any,
      pool,
      { enableTTS: true },
    );

    const start = Date.now();
    orchestrator.prepareAllScenes(graph, nodes, mockPolicy);

    // Wait for all scenes
    for (let i = 0; i < 4; i++) {
      await orchestrator.getSceneQueue().waitForScene(i);
    }
    const elapsed = Date.now() - start;

    // Sequential would be ~200ms (4 * 50ms). Concurrent should be much less.
    // Allow some overhead but it should be clearly faster than sequential.
    expect(elapsed).toBeLessThan(200);
  });
});
