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

    // Validate API key on startup
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[Agent] ⚠️  ANTHROPIC_API_KEY is not set! AI reasoning will use fallback templates.');
    } else if (!apiKey.startsWith('sk-ant-')) {
      console.warn('[Agent] ⚠️  ANTHROPIC_API_KEY does not start with "sk-ant-" — it may be invalid.');
    } else {
      console.log(`[Agent] ANTHROPIC_API_KEY configured (${apiKey.slice(0, 12)}...${apiKey.slice(-4)})`);
    }
  }

  /** Generic Claude call for JSON output. Used by StoryboardEngine and other planners. */
  async callForJSON(prompt: string, systemPrompt: string): Promise<unknown> {
    const response = await this.client.messages.create({
      model: this.reasoningModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  // ── Phase 1+2: Reasoning + Classification ────────────────
  async reason(topic: string, rlPolicy: RLPolicy): Promise<ReasoningOutput & { _fallbackReason?: string }> {
    // Primary attempt with full prompt
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
      const errorDetail = err.status
        ? `HTTP ${err.status}: ${err.message}`
        : err.message;
      console.error(`[Agent] Reasoning error (primary): ${errorDetail}`);
      if (err.status) {
        console.error(`[Agent]   Error type: ${err.type || 'unknown'}, status: ${err.status}`);
      }

      // Retry with a simpler prompt before giving up
      try {
        console.log('[Agent] Retrying with simplified prompt...');
        const retryResult = await this.retryWithSimplePrompt(topic);
        return retryResult;
      } catch (retryErr: any) {
        const retryDetail = retryErr.status
          ? `HTTP ${retryErr.status}: ${retryErr.message}`
          : retryErr.message;
        console.error(`[Agent] Retry also failed: ${retryDetail}`);
      }

      // Final fallback: template reasoning
      console.warn('[Agent] ⚠️  Using template fallback — AI reasoning is unavailable');
      const result = this.fallbackReasoning(topic);
      (result as any)._fallbackReason = errorDetail;
      return result as ReasoningOutput & { _fallbackReason?: string };
    }
  }

  // ── Retry with simpler prompt ─────────────────────────────
  private async retryWithSimplePrompt(topic: string): Promise<ReasoningOutput> {
    const response = await this.client.messages.create({
      model: this.fastModel,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a knowledge architect. Decompose the topic "${topic}" into 5-7 conceptual primitives for a visual presentation.

Output ONLY valid JSON (no markdown):
{
  "topic": "${topic}",
  "conceptualPrimitives": [
    {
      "label": "short 2-4 word name",
      "type": "CONCEPT | DEFINITION | EXAMPLE | ANALOGY | PROCESS",
      "content": "2-3 sentence explanation",
      "narration": "spoken narration for TTS (conversational, 2-3 sentences)"
    }
  ],
  "relationships": [
    { "from": "label1", "to": "label2", "type": "CONTAINS | LEADS_TO | EXEMPLIFIES | RELATES_TO", "label": "2-4 word description" }
  ],
  "prerequisiteDependencies": [],
  "complexityGradient": ["label in order from simplest to most complex"],
  "anticipatedFollowUps": ["likely follow-up question"]
}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as ReasoningOutput;
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

  // ── Topic Parser — Extract core topic and subtopics ─────
  private parseTopic(input: string): { coreTopic: string; subtopics: string[] } {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).trim();

    // Split on phrases like "including", "such as", "like", "specifically"
    const separatorPattern = /,?\s*(?:including|such as|like|specifically|especially|namely|e\.g\.|for example|with focus on|focusing on|and also)\s+/i;
    const parts = input.split(separatorPattern);

    let coreTopic = parts[0].trim();
    const subtopics: string[] = [];

    if (parts.length > 1) {
      // Split the rest by "and" / commas
      const rest = parts.slice(1).join(', ');
      const subs = rest.split(/\s*(?:,\s*and\s+|,\s+|\s+and\s+)\s*/i);
      for (const sub of subs) {
        const cleaned = sub.trim().replace(/[.!?]+$/, '');
        if (cleaned.length > 1) subtopics.push(capitalize(cleaned));
      }
    }

    // If no separator found but topic has commas, split on commas
    if (subtopics.length === 0 && coreTopic.includes(',')) {
      const commaParts = coreTopic.split(/\s*,\s*/);
      coreTopic = commaParts[0];
      for (const p of commaParts.slice(1)) {
        const cleaned = p.trim().replace(/[.!?]+$/, '');
        if (cleaned.length > 1) subtopics.push(capitalize(cleaned));
      }
    }

    // Clean up core topic: remove trailing "and" or empty text
    coreTopic = coreTopic.replace(/\s+and\s*$/i, '').trim();

    return {
      coreTopic: capitalize(coreTopic),
      subtopics,
    };
  }

  // ── Fallback Reasoning — Generates meaningful educational content ─
  private fallbackReasoning(topic: string): ReasoningOutput {
    const { coreTopic, subtopics } = this.parseTopic(topic);

    const primitives: ReasoningOutput['conceptualPrimitives'] = [];
    const relationships: ReasoningOutput['relationships'] = [];

    // ── Node 1: Root concept ──
    primitives.push({
      label: coreTopic,
      type: DataType.CONCEPT,
      content: `${coreTopic} is an important topic that encompasses several key ideas. Understanding it requires breaking it down into its core definition, how it works in practice, and why it matters.`,
      narration: `Today we're going to explore ${coreTopic}. This is a fascinating topic, and we'll break it down step by step so you can build a solid understanding.`,
      visualHint: {
        suggestedEntities: [{ type: 'Concept', label: coreTopic, role: 'primary' }],
        layoutPattern: 'central-radial',
      },
    });

    // ── Node 2: Definition ──
    const defLabel = `What is ${coreTopic}`;
    primitives.push({
      label: defLabel,
      type: DataType.DEFINITION,
      content: `${coreTopic} refers to a set of principles and techniques in this field. At its core, it provides a structured way to approach problems and organize information effectively.`,
      narration: `Let's start with the fundamentals. ${coreTopic} is best understood as a framework for solving a specific class of problems. Getting this definition clear gives us a strong foundation for everything else.`,
      visualHint: {
        suggestedEntities: [{ type: 'Quote', label: 'Definition', role: 'primary' }],
        layoutPattern: 'central-radial',
      },
    });
    relationships.push({ from: coreTopic, to: defLabel, type: EdgeType.CONTAINS, label: 'defined by' });

    // ── Nodes 3+: Subtopic nodes (from user input parsing) ──
    for (let i = 0; i < subtopics.length; i++) {
      const sub = subtopics[i];
      primitives.push({
        label: sub,
        type: i === 0 ? DataType.PROCESS : DataType.CONCEPT,
        content: `${sub} is a key aspect of ${coreTopic}. It addresses a specific dimension of the topic and has its own set of principles and trade-offs that are worth examining closely.`,
        narration: `Now let's focus on ${sub}. This is one of the most important aspects of ${coreTopic}. Understanding ${sub} gives us practical insight into how ${coreTopic} works in real scenarios.`,
        visualHint: {
          suggestedEntities: [
            { type: i === 0 ? 'Process' : 'Entity', label: sub, role: 'primary' },
            { type: 'Arrow', label: 'part of', role: 'connector' },
          ],
          layoutPattern: 'flow-lr',
        },
      });
      relationships.push({ from: coreTopic, to: sub, type: EdgeType.CONTAINS, label: 'includes' });

      // Link subtopics sequentially
      if (i > 0) {
        relationships.push({ from: subtopics[i - 1], to: sub, type: EdgeType.RELATES_TO, label: 'relates to' });
      }
    }

    // ── If no subtopics were parsed, add generic educational nodes ──
    if (subtopics.length === 0) {
      const howLabel = `How ${coreTopic} Works`;
      primitives.push({
        label: howLabel,
        type: DataType.PROCESS,
        content: `Understanding how ${coreTopic} works involves examining its internal mechanics. There are typically several stages or components that work together to produce the desired result.`,
        narration: `Let's walk through how ${coreTopic} actually works under the hood. By understanding the process step by step, you'll be able to apply this knowledge confidently.`,
        visualHint: {
          suggestedEntities: [
            { type: 'Process', label: 'Step 1', role: 'primary' },
            { type: 'Arrow', label: 'leads to', role: 'connector' },
            { type: 'Process', label: 'Step 2', role: 'secondary' },
          ],
          layoutPattern: 'flow-lr',
        },
      });
      relationships.push({ from: defLabel, to: howLabel, type: EdgeType.LEADS_TO, label: 'enables' });

      const exLabel = `${coreTopic} in Practice`;
      primitives.push({
        label: exLabel,
        type: DataType.EXAMPLE,
        content: `Seeing ${coreTopic} applied in a concrete scenario makes the abstract concepts tangible. Real-world applications demonstrate its value and reveal practical considerations.`,
        narration: `Here's where things get interesting. Let's look at a concrete example of ${coreTopic} in action. Seeing it applied to a real problem makes the concept much clearer.`,
        visualHint: {
          suggestedEntities: [
            { type: 'Entity', label: 'Example', role: 'primary' },
            { type: 'Arrow', label: 'demonstrates', role: 'connector' },
          ],
          layoutPattern: 'flow-lr',
        },
      });
      relationships.push({ from: howLabel, to: exLabel, type: EdgeType.EXEMPLIFIES, label: 'demonstrated by' });

      const analogyLabel = `${coreTopic} Analogy`;
      primitives.push({
        label: analogyLabel,
        type: DataType.ANALOGY,
        content: `Comparing ${coreTopic} to something familiar can make it easier to grasp. Analogies bridge the gap between abstract concepts and intuitive understanding.`,
        narration: `To help solidify your understanding, think of ${coreTopic} like organizing a library. The underlying principles are similar — you need structure, lookup mechanisms, and ways to handle growth.`,
        visualHint: {
          suggestedEntities: [
            { type: 'Comparison', label: 'Analogy', role: 'primary' },
          ],
          layoutPattern: 'comparison',
        },
      });
      relationships.push({ from: coreTopic, to: analogyLabel, type: EdgeType.RELATES_TO, label: 'similar to' });
    }

    // ── Always add a "Why it Matters" closing node ──
    const whyLabel = `Why ${coreTopic} Matters`;
    primitives.push({
      label: whyLabel,
      type: DataType.CONCEPT,
      content: `Understanding ${coreTopic} is valuable because it appears frequently in both theory and practice. Mastering it opens doors to more advanced topics and practical problem-solving.`,
      narration: `Finally, let's talk about why ${coreTopic} matters. This isn't just academic knowledge — it's something you'll encounter repeatedly, and a solid understanding gives you a real advantage.`,
      visualHint: {
        suggestedEntities: [
          { type: 'Badge', label: 'Key Takeaway', role: 'primary' },
          { type: 'Concept', label: coreTopic, role: 'secondary' },
        ],
        layoutPattern: 'central-radial',
      },
    });
    const lastContentLabel = subtopics.length > 0 ? subtopics[subtopics.length - 1] : `${coreTopic} in Practice`;
    // Only add relationship if the source label exists in primitives
    if (primitives.some(p => p.label === lastContentLabel)) {
      relationships.push({ from: lastContentLabel, to: whyLabel, type: EdgeType.LEADS_TO, label: 'motivates' });
    } else {
      relationships.push({ from: coreTopic, to: whyLabel, type: EdgeType.LEADS_TO, label: 'motivates' });
    }

    const allLabels = primitives.map(p => p.label);

    return {
      topic: coreTopic,
      conceptualPrimitives: primitives,
      relationships,
      prerequisiteDependencies: [],
      complexityGradient: allLabels,
      anticipatedFollowUps: [
        `What are common misconceptions about ${coreTopic}?`,
        `How does ${coreTopic} compare to alternatives?`,
        ...(subtopics.length > 0 ? [`Can you go deeper into ${subtopics[0]}?`] : []),
      ],
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
