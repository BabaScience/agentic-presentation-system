/* ═══════════════════════════════════════════════════════════════
   Agent Service — Reasoning Engine + Information Classifier
   Orchestrates Claude for conceptual decomposition, data-type
   classification, interrupt reasoning, and node rephrasing.
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import {
  DataType, EdgeType,
  type ReasoningOutput, type ClassifiedChunk,
  type KnowledgeGraph, type GraphMutation,
  type PresentationScene, type RLPolicy,
  type SceneContract,
} from '../../shared/types';
import { REASONING_SYSTEM_PROMPT, CLASSIFIER_SYSTEM_PROMPT, INTERRUPT_SYSTEM_PROMPT } from '../prompts/systemPrompts';

export class AgentService {
  private client: Anthropic;
  private reasoningModel: string;
  private fastModel: string;

  constructor() {
    this.client = new Anthropic();
    this.reasoningModel = process.env.AGENT_MODEL_REASONING || 'claude-sonnet-4-5-20250929';
    this.fastModel = process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929';
  }

  // ── Phase 1+2: Reasoning + Classification ────────────────
  async reason(topic: string, rlPolicy: RLPolicy): Promise<ReasoningOutput> {
    try {
      const response = await this.client.messages.create({
        model: this.reasoningModel,
        max_tokens: 4096,
        system: REASONING_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Topic: "${topic}"

RL Policy Context:
- Explanation strategy: ${rlPolicy.explanationStrategy}
- Pace: ${rlPolicy.pace} WPM
- Visual density: ${rlPolicy.visualDensity}
- Comprehension check frequency: every ${rlPolicy.comprehensionCheckFrequency} nodes

Decompose this topic into a knowledge graph structure. Output ONLY valid JSON.`,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned) as ReasoningOutput;
    } catch (err: any) {
      console.error('[Agent] Reasoning error:', err.message);
      // Return fallback reasoning for demo
      return this.fallbackReasoning(topic);
    }
  }

  // ── Interrupt Handling — Reason about question in context ─
  async handleInterrupt(
    question: string,
    graph: KnowledgeGraph,
    currentNodeId: string,
    rlPolicy: RLPolicy,
  ): Promise<{ mutations: GraphMutation[]; answerScenes: PresentationScene[] }> {
    try {
      const currentNode = graph.nodes[currentNodeId];
      const nodeList = Object.values(graph.nodes).map(n => `${n.id}: ${n.label} (${n.type})`).join('\n');

      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 3000,
        system: INTERRUPT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `User question: "${question}"
Current node: ${currentNode?.label || 'unknown'} (${currentNode?.type || 'unknown'})
Current graph nodes:
${nodeList}

Generate new knowledge graph nodes and edges to answer this question, plus presentation scenes.
Output ONLY valid JSON with { "nodes": [...], "edges": [...], "scenes": [...] }`,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const cleaned = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleaned);

      // Convert to mutations
      const mutations: GraphMutation[] = [];
      for (const node of result.nodes || []) {
        mutations.push({
          type: 'add_node',
          data: this.createNodeFromClassified(node, Object.keys(graph.nodes).length),
          timestamp: Date.now(),
        });
      }
      for (const edge of result.edges || []) {
        mutations.push({
          type: 'add_edge',
          data: {
            id: `edge-${uuid().slice(0, 8)}`,
            sourceId: edge.from || edge.sourceId,
            targetId: edge.to || edge.targetId,
            label: edge.label,
            type: edge.type || EdgeType.RELATES_TO,
            weight: 1.0,
            isPresented: false,
          },
          timestamp: Date.now(),
        });
      }

      // Convert scenes
      const answerScenes: PresentationScene[] = (result.scenes || []).map((s: any, i: number) => ({
        id: `interrupt-scene-${uuid().slice(0, 8)}`,
        nodeIds: s.nodeIds || [],
        edgeIds: s.edgeIds || [],
        narration: s.narration || `Let me explain: ${question}`,
        focusNodeId: s.nodeIds?.[0] || '',
        viewport: { x: 0, y: 0, zoom: 1 },
        visualCommands: [],
        durationEstimate: (s.narration?.length || 100) * 40,
      }));

      // Fallback if no scenes generated
      if (answerScenes.length === 0) {
        answerScenes.push({
          id: `interrupt-scene-fallback`,
          nodeIds: mutations.filter(m => m.type === 'add_node').map(m => (m.data as any).id),
          edgeIds: [],
          narration: `Great question! ${result.explanation || 'Let me explain that in more detail.'}`,
          focusNodeId: mutations[0] ? (mutations[0].data as any).id : '',
          viewport: { x: 0, y: 0, zoom: 1 },
          visualCommands: [],
          durationEstimate: 5000,
        });
      }

      return { mutations, answerScenes };
    } catch (err: any) {
      console.error('[Agent] Interrupt handling error:', err.message);
      return this.fallbackInterrupt(question, currentNodeId);
    }
  }

  // ── Rephrase a node with alternate strategy ──────────────
  async rephraseNode(
    graph: KnowledgeGraph,
    nodeId: string,
    rlPolicy: RLPolicy,
  ): Promise<{ narration: string }> {
    const node = graph.nodes[nodeId];
    if (!node) return { narration: 'Let me try explaining that differently.' };

    try {
      // Pick alternate strategy
      const strategies = ['analogy_first', 'example_first', 'process_first', 'definition_first'];
      const current = rlPolicy.explanationStrategy;
      const alternate = strategies.find(s => s !== current) || 'example_first';

      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Re-explain this concept using a ${alternate.replace('_', '-')} approach:
Concept: ${node.label}
Content: ${node.content}
Original narration: ${node.narration}

Provide a fresh, clearer explanation. Output just the narration text, no JSON.`,
          },
        ],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      return { narration: text.trim() };
    } catch (err: any) {
      return { narration: `Let me put it another way: ${node.content}` };
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  private createNodeFromClassified(chunk: any, existingCount: number): any {
    return {
      id: chunk.id || `node-${uuid().slice(0, 8)}`,
      label: chunk.label,
      type: chunk.type || DataType.CONCEPT,
      depth: chunk.depth || 2,
      content: chunk.content || chunk.label,
      narration: chunk.narration || chunk.content || chunk.label,
      visual: {
        elementType: 'box',
        x: 200 + (existingCount % 5) * 160,
        y: 100 + Math.floor(existingCount / 5) * 120,
        width: 140,
        height: 80,
        style: { fill: '#1a2332', stroke: '#00e5ff', strokeWidth: 2 },
        animation: { type: 'fadeIn', duration: 500, delay: 0 },
      },
      rlRelevanceScore: 0.8,
      isExpanded: false,
      isPresented: false,
      parentId: chunk.parentRef || null,
      metadata: {},
      createdAt: Date.now(),
    };
  }

  private fallbackReasoning(topic: string): ReasoningOutput {
    return {
      topic,
      conceptualPrimitives: [
        {
          label: topic, type: DataType.CONCEPT,
          content: `Core concept: ${topic}`,
          narration: `Let's explore ${topic}. This is a foundational concept we'll build upon.`,
          visualHint: {
            suggestedEntities: [{ type: 'Concept', label: topic, role: 'primary' }],
            layoutPattern: 'central-radial',
          },
        },
        {
          label: `${topic} Basics`, type: DataType.DEFINITION,
          content: `Fundamental definitions of ${topic}`,
          narration: `First, let's establish what ${topic} means at its core.`,
          visualHint: {
            suggestedEntities: [{ type: 'Quote', label: 'Definition', role: 'primary' }],
            layoutPattern: 'central-radial',
          },
        },
        {
          label: `${topic} in Practice`, type: DataType.EXAMPLE,
          content: `Real-world example of ${topic}`,
          narration: `Here's a concrete example of how ${topic} works in practice.`,
          visualHint: {
            suggestedEntities: [
              { type: 'Entity', label: 'Example', role: 'primary' },
              { type: 'Arrow', label: 'demonstrates', role: 'connector' },
            ],
            layoutPattern: 'flow-lr',
          },
        },
        {
          label: `How ${topic} Works`, type: DataType.PROCESS,
          content: `The internal process of ${topic}`,
          narration: `Now let's walk through how ${topic} operates step by step.`,
          visualHint: {
            suggestedEntities: [
              { type: 'Process', label: 'Step 1', role: 'primary' },
              { type: 'Arrow', label: 'leads to', role: 'connector' },
              { type: 'Process', label: 'Step 2', role: 'secondary' },
            ],
            layoutPattern: 'flow-lr',
          },
        },
        {
          label: `${topic} Analogy`, type: DataType.ANALOGY,
          content: `${topic} is like a familiar concept`,
          narration: `Think of ${topic} like something you already know well.`,
          visualHint: {
            suggestedEntities: [
              { type: 'Comparison', label: 'Analogy', role: 'primary' },
            ],
            layoutPattern: 'comparison',
          },
        },
      ],
      relationships: [
        { from: topic, to: `${topic} Basics`, type: EdgeType.CONTAINS, label: 'defined by' },
        { from: topic, to: `${topic} in Practice`, type: EdgeType.EXEMPLIFIES, label: 'demonstrated by' },
        { from: `${topic} Basics`, to: `How ${topic} Works`, type: EdgeType.LEADS_TO, label: 'enables understanding of' },
        { from: topic, to: `${topic} Analogy`, type: EdgeType.RELATES_TO, label: 'similar to' },
      ],
      prerequisiteDependencies: [],
      complexityGradient: [topic, `${topic} Basics`, `${topic} Analogy`, `How ${topic} Works`, `${topic} in Practice`],
      anticipatedFollowUps: [`What are common misconceptions about ${topic}?`, `How does ${topic} compare to alternatives?`],
    };
  }

  private fallbackInterrupt(question: string, currentNodeId: string): { mutations: GraphMutation[]; answerScenes: PresentationScene[] } {
    const nodeId = `interrupt-${uuid().slice(0, 8)}`;
    return {
      mutations: [
        {
          type: 'add_node',
          data: {
            id: nodeId,
            label: question.slice(0, 40),
            type: DataType.CONCEPT,
            depth: 3,
            content: question,
            narration: `That's a great question. Let me address that: ${question}`,
            visual: {
              elementType: 'box',
              x: 500, y: 300, width: 160, height: 80,
              style: { fill: '#2a1a3a', stroke: '#b388ff', strokeWidth: 2 },
              animation: { type: 'scaleIn', duration: 400, delay: 0 },
            },
            rlRelevanceScore: 0.9,
            isExpanded: false,
            isPresented: false,
            parentId: currentNodeId,
            metadata: { source: 'interrupt' },
            createdAt: Date.now(),
          },
          timestamp: Date.now(),
        },
        {
          type: 'add_edge',
          data: {
            id: `edge-interrupt-${uuid().slice(0, 8)}`,
            sourceId: currentNodeId,
            targetId: nodeId,
            label: 'user asked',
            type: EdgeType.DEEPENS,
            weight: 1.0,
            isPresented: false,
          },
          timestamp: Date.now(),
        },
      ],
      answerScenes: [
        {
          id: `interrupt-scene-${uuid().slice(0, 8)}`,
          nodeIds: [nodeId],
          edgeIds: [],
          narration: `Great question! ${question} — Let me explain that in context.`,
          focusNodeId: nodeId,
          viewport: { x: 0, y: 0, zoom: 1 },
          visualCommands: [
            { type: 'reveal', targetId: nodeId },
            { type: 'connect', targetId: currentNodeId, params: { to: nodeId } },
          ],
          durationEstimate: 5000,
        },
      ],
    };
  }
}
