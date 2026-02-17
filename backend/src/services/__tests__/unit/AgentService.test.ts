import { AgentService } from '../../AgentService';
import { DataType, EdgeType, type RLPolicy, type KnowledgeGraph } from '../../../../shared/types';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

// Get a reference to the mocked create function
function getMockCreate() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Anthropic = require('@anthropic-ai/sdk');
  const instance = new Anthropic();
  return instance.messages.create as jest.Mock;
}

const DEFAULT_RL_POLICY: RLPolicy = {
  explanationStrategy: 'analogy_first',
  pace: 150,
  visualDensity: 'moderate',
  expansionPriority: [DataType.CONCEPT, DataType.EXAMPLE],
  comprehensionCheckFrequency: 3,
};

function makeGraph(nodeCount = 2): KnowledgeGraph {
  const nodes: Record<string, any> = {};
  for (let i = 0; i < nodeCount; i++) {
    const id = `node-${i}`;
    nodes[id] = {
      id,
      label: `Node ${i}`,
      type: DataType.CONCEPT,
      depth: i,
      content: `Content for node ${i}`,
      narration: `Narration for node ${i}`,
      visual: { elementType: 'box', x: 100, y: 100, width: 140, height: 80, style: {}, animation: { type: 'fadeIn', duration: 500, delay: 0 } },
      rlRelevanceScore: 0.8,
      isExpanded: false,
      isPresented: false,
      parentId: null,
      metadata: {},
      createdAt: Date.now(),
    };
  }
  return {
    sessionId: 'test-session',
    rootNodeId: 'node-0',
    nodes,
    edges: {},
    maxDepth: 4,
    nodeLimit: 50,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('AgentService', () => {
  let agent: AgentService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new AgentService();
    mockCreate = getMockCreate();
  });

  describe('reason()', () => {
    it('parses a valid JSON response from Claude', async () => {
      const reasoningOutput = {
        topic: 'React Hooks',
        conceptualPrimitives: [
          { label: 'useState', type: 'CONCEPT', content: 'State management hook', narration: 'useState lets you add state.' },
        ],
        relationships: [
          { from: 'React Hooks', to: 'useState', type: 'CONTAINS', label: 'includes' },
        ],
        prerequisiteDependencies: [],
        complexityGradient: ['React Hooks', 'useState'],
        anticipatedFollowUps: ['What about useEffect?'],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reasoningOutput) }],
      });

      const result = await agent.reason('React Hooks', DEFAULT_RL_POLICY);

      expect(result.topic).toBe('React Hooks');
      expect(result.conceptualPrimitives).toHaveLength(1);
      expect(result.conceptualPrimitives[0].label).toBe('useState');
      expect(result.relationships).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('strips markdown code fences from response', async () => {
      const payload = { topic: 'Test', conceptualPrimitives: [], relationships: [], prerequisiteDependencies: [], complexityGradient: [], anticipatedFollowUps: [] };
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '```json\n' + JSON.stringify(payload) + '\n```' }],
      });

      const result = await agent.reason('Test', DEFAULT_RL_POLICY);
      expect(result.topic).toBe('Test');
    });

    it('falls back to fallbackReasoning on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit'));

      const result = await agent.reason('Machine Learning', DEFAULT_RL_POLICY);

      expect(result.topic).toBe('Machine Learning');
      expect(result.conceptualPrimitives.length).toBeGreaterThanOrEqual(3);
      expect(result.relationships.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back on invalid JSON response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      });

      const result = await agent.reason('Docker', DEFAULT_RL_POLICY);

      expect(result.topic).toBe('Docker');
      expect(result.conceptualPrimitives.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('handleInterrupt()', () => {
    it('returns mutations and answer scenes from valid response', async () => {
      const interruptResponse = {
        nodes: [
          { id: 'new-1', label: 'iptables', type: 'PROCESS', content: 'NAT rules', narration: 'iptables handles NAT.' },
        ],
        edges: [
          { from: 'node-0', to: 'new-1', label: 'uses', type: 'LEADS_TO' },
        ],
        scenes: [
          { nodeIds: ['new-1'], edgeIds: [], narration: 'iptables manages packet routing.' },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(interruptResponse) }],
      });

      const graph = makeGraph();
      const result = await agent.handleInterrupt('How does iptables work?', graph, 'node-0', DEFAULT_RL_POLICY);

      expect(result.mutations.length).toBeGreaterThanOrEqual(2);
      expect(result.mutations[0].type).toBe('add_node');
      expect(result.mutations[1].type).toBe('add_edge');
      expect(result.answerScenes).toHaveLength(1);
      expect(result.answerScenes[0].narration).toContain('iptables');
    });

    it('generates fallback scene when no scenes in response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({ explanation: 'Here is the explanation', nodes: [{ label: 'Fallback', type: 'CONCEPT', content: 'test' }], edges: [], scenes: [] }) }],
      });

      const graph = makeGraph();
      const result = await agent.handleInterrupt('What?', graph, 'node-0', DEFAULT_RL_POLICY);

      expect(result.answerScenes.length).toBeGreaterThanOrEqual(1);
      expect(result.answerScenes[0].narration).toContain('Great question');
    });

    it('falls back to fallbackInterrupt on error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network failure'));

      const graph = makeGraph();
      const result = await agent.handleInterrupt('Why is this happening?', graph, 'node-0', DEFAULT_RL_POLICY);

      expect(result.mutations.length).toBeGreaterThanOrEqual(1);
      expect(result.answerScenes.length).toBeGreaterThanOrEqual(1);
      expect(result.answerScenes[0].narration).toContain('Great question');
    });
  });

  describe('rephraseNode()', () => {
    it('returns alternate narration from Claude', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Think of it like a postal system.' }],
      });

      const graph = makeGraph();
      const result = await agent.rephraseNode(graph, 'node-0', DEFAULT_RL_POLICY);

      expect(result.narration).toBe('Think of it like a postal system.');
    });

    it('returns fallback narration if node not found', async () => {
      const graph = makeGraph();
      const result = await agent.rephraseNode(graph, 'nonexistent', DEFAULT_RL_POLICY);

      expect(result.narration).toBe('Let me try explaining that differently.');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns fallback narration on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Timeout'));

      const graph = makeGraph();
      const result = await agent.rephraseNode(graph, 'node-0', DEFAULT_RL_POLICY);

      expect(result.narration).toContain('Content for node 0');
    });
  });
});
