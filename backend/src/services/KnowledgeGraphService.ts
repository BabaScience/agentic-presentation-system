/* ═══════════════════════════════════════════════════════════════
   Knowledge Graph Service — Graph Construction, Async Expansion,
   Bounded Mutation, and Traversal Operations
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import {
  DataType, EdgeType,
  DATA_TYPE_VISUALS,
  KG_NODE_LIMIT, KG_MAX_DEPTH,
  type KnowledgeGraph, type KGNode, type KGEdge,
  type GraphMutation, type ReasoningOutput,
  type SceneContract,
} from '../../shared/types';
import type { RLService } from './RLService';

export class KnowledgeGraphService {

  // ── Build Core Graph from Reasoning Output (Sync) ────────
  buildFromReasoning(sessionId: string, reasoning: ReasoningOutput): KnowledgeGraph {
    const graph: KnowledgeGraph = {
      sessionId,
      rootNodeId: '',
      nodes: {},
      edges: {},
      maxDepth: KG_MAX_DEPTH,
      nodeLimit: KG_NODE_LIMIT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Label → node ID mapping for edge resolution
    const labelToId = new Map<string, string>();

    // Build nodes from conceptual primitives
    const layoutPositions = this.computeLayout(reasoning.conceptualPrimitives.length);

    reasoning.conceptualPrimitives.forEach((primitive, index) => {
      const nodeId = `node-${uuid().slice(0, 8)}`;
      const typeVisual = DATA_TYPE_VISUALS[primitive.type] || DATA_TYPE_VISUALS[DataType.CONCEPT];
      const pos = layoutPositions[index];

      const node: KGNode = {
        id: nodeId,
        label: primitive.label,
        type: primitive.type,
        domain: primitive.domain || 'general',
        depth: index === 0 ? 0 : 1,
        content: primitive.content,
        narration: primitive.narration,
        visual: {
          elementType: typeVisual.elementType,
          x: pos.x,
          y: pos.y,
          width: 160,
          height: 90,
          style: {
            fill: '#151924',
            stroke: typeVisual.color,
            strokeWidth: 2,
            cornerRadius: 12,
            fontSize: 13,
            opacity: 1,
          },
          animation: {
            type: 'fadeIn',
            duration: 500,
            delay: index * 150,
          },
          icon: typeVisual.icon,
        },
        rlRelevanceScore: 1.0 - index * 0.1,
        isExpanded: false,
        isPresented: false,
        parentId: index === 0 ? null : graph.rootNodeId || null,
        metadata: {
          ...(primitive.sceneContract ? { sceneContract: primitive.sceneContract } : {}),
        },
        visualHint: primitive.visualHint,
        createdAt: Date.now(),
      };

      graph.nodes[nodeId] = node;
      labelToId.set(primitive.label, nodeId);

      if (index === 0) {
        graph.rootNodeId = nodeId;
      }
    });

    // Update parentIds now that root is known
    for (const node of Object.values(graph.nodes)) {
      if (node.id !== graph.rootNodeId && !node.parentId) {
        node.parentId = graph.rootNodeId;
      }
    }

    // Build edges from relationships
    for (const rel of reasoning.relationships) {
      const sourceId = labelToId.get(rel.from);
      const targetId = labelToId.get(rel.to);
      if (!sourceId || !targetId) continue;

      const edgeId = `edge-${uuid().slice(0, 8)}`;
      const edge: KGEdge = {
        id: edgeId,
        sourceId,
        targetId,
        label: rel.label,
        type: rel.type,
        weight: 1.0,
        isPresented: false,
      };

      graph.edges[edgeId] = edge;
    }

    // Ensure all depth-1 nodes connect to root if not already
    for (const node of Object.values(graph.nodes)) {
      if (node.id === graph.rootNodeId) continue;
      const hasIncomingFromRoot = Object.values(graph.edges).some(
        e => e.sourceId === graph.rootNodeId && e.targetId === node.id,
      );
      if (!hasIncomingFromRoot && node.depth <= 1) {
        const edgeId = `edge-${uuid().slice(0, 8)}`;
        graph.edges[edgeId] = {
          id: edgeId,
          sourceId: graph.rootNodeId,
          targetId: node.id,
          label: 'contains',
          type: EdgeType.CONTAINS,
          weight: 0.8,
          isPresented: false,
        };
      }
    }

    console.log(`[KG] Built core graph: ${Object.keys(graph.nodes).length} nodes, ${Object.keys(graph.edges).length} edges`);
    return graph;
  }

  // ── Async Expansion (Background, Bounded) ────────────────
  async expandAsync(
    graph: KnowledgeGraph,
    rl: RLService,
    onMutation: (mutation: GraphMutation) => void,
  ): Promise<void> {
    const expansionInterval = setInterval(() => {
      const nodeCount = Object.keys(graph.nodes).length;

      // Bound check: stop if limits exceeded
      if (nodeCount >= graph.nodeLimit) {
        console.log(`[KG] Async expansion halted: node limit (${graph.nodeLimit}) reached`);
        clearInterval(expansionInterval);
        return;
      }

      // Find unexpanded nodes, scored by RL relevance
      const unexpanded = Object.values(graph.nodes)
        .filter(n => !n.isExpanded && n.depth < graph.maxDepth)
        .sort((a, b) => b.rlRelevanceScore - a.rlRelevanceScore);

      if (unexpanded.length === 0) {
        console.log('[KG] Async expansion complete: no more expandable nodes');
        clearInterval(expansionInterval);
        return;
      }

      // Expand the highest-priority node
      const target = unexpanded[0];
      this.expandNode(graph, target, onMutation);
      target.isExpanded = true;

    }, 3000); // Expand one node every 3 seconds

    // Auto-stop after 30 seconds regardless
    setTimeout(() => clearInterval(expansionInterval), 30000);
  }

  // ── Expand a single node (generate children) ─────────────
  private expandNode(
    graph: KnowledgeGraph,
    parent: KGNode,
    onMutation: (mutation: GraphMutation) => void,
  ): void {
    const nodeCount = Object.keys(graph.nodes).length;
    if (nodeCount >= graph.nodeLimit) return;

    // Generate 1-2 child nodes based on parent type
    const children = this.generateChildren(parent);
    const layoutX = parent.visual.x;
    const layoutY = parent.visual.y + 140;

    children.forEach((child, i) => {
      if (Object.keys(graph.nodes).length >= graph.nodeLimit) return;

      const nodeId = `node-${uuid().slice(0, 8)}`;
      const typeVisual = DATA_TYPE_VISUALS[child.type] || DATA_TYPE_VISUALS[DataType.CONCEPT];

      const node: KGNode = {
        id: nodeId,
        label: child.label,
        type: child.type,
        depth: parent.depth + 1,
        content: child.content,
        narration: child.narration,
        visual: {
          elementType: typeVisual.elementType,
          x: layoutX + (i - 0.5) * 180,
          y: layoutY,
          width: 140,
          height: 80,
          style: {
            fill: '#151924',
            stroke: typeVisual.color,
            strokeWidth: 1.5,
            cornerRadius: 10,
            fontSize: 12,
            opacity: 0.7,
          },
          animation: { type: 'fadeIn', duration: 400, delay: i * 100 },
          icon: typeVisual.icon,
        },
        rlRelevanceScore: parent.rlRelevanceScore * 0.7,
        isExpanded: false,
        isPresented: false,
        parentId: parent.id,
        metadata: { source: 'async_expansion' },
        createdAt: Date.now(),
      };

      graph.nodes[nodeId] = node;
      const nodeMutation: GraphMutation = { type: 'add_node', data: node, timestamp: Date.now() };
      onMutation(nodeMutation);

      // Create edge from parent
      const edgeId = `edge-${uuid().slice(0, 8)}`;
      const edge: KGEdge = {
        id: edgeId,
        sourceId: parent.id,
        targetId: nodeId,
        label: child.edgeLabel || 'contains',
        type: child.edgeType || EdgeType.DEEPENS,
        weight: 0.7,
        isPresented: false,
      };

      graph.edges[edgeId] = edge;
      const edgeMutation: GraphMutation = { type: 'add_edge', data: edge, timestamp: Date.now() };
      onMutation(edgeMutation);
    });

    graph.updatedAt = Date.now();
    console.log(`[KG] Expanded "${parent.label}" → +${children.length} nodes (total: ${Object.keys(graph.nodes).length})`);
  }

  // ── Generate child concepts for a node ───────────────────
  private generateChildren(parent: KGNode): Array<{
    label: string; type: DataType; content: string; narration: string;
    edgeLabel?: string; edgeType?: EdgeType;
  }> {
    // In production: call Agent to generate context-aware children
    // Here: generate type-appropriate children
    switch (parent.type) {
      case DataType.CONCEPT:
        return [
          {
            label: `${parent.label} — Detail`,
            type: DataType.DEFINITION,
            content: `Detailed definition of ${parent.label}`,
            narration: `Let's dig deeper into what ${parent.label} means precisely.`,
            edgeLabel: 'defined by',
            edgeType: EdgeType.DEEPENS,
          },
          {
            label: `${parent.label} — Example`,
            type: DataType.EXAMPLE,
            content: `Concrete example of ${parent.label}`,
            narration: `Here's a real-world example of ${parent.label} in action.`,
            edgeLabel: 'exemplified by',
            edgeType: EdgeType.EXEMPLIFIES,
          },
        ];
      case DataType.PROCESS:
        return [
          {
            label: `${parent.label} Internals`,
            type: DataType.PROCESS,
            content: `Internal mechanics of ${parent.label}`,
            narration: `Under the hood, ${parent.label} works through several sub-steps.`,
            edgeLabel: 'implemented by',
            edgeType: EdgeType.DEEPENS,
          },
        ];
      case DataType.DEFINITION:
        return [
          {
            label: `${parent.label} — Misconception`,
            type: DataType.COUNTERPOINT,
            content: `Common misconception about ${parent.label}`,
            narration: `A common mistake people make about ${parent.label} is thinking...`,
            edgeLabel: 'commonly confused with',
            edgeType: EdgeType.CONTRADICTS,
          },
        ];
      default:
        return [
          {
            label: `More on ${parent.label}`,
            type: DataType.CONCEPT,
            content: `Additional details about ${parent.label}`,
            narration: `There's more to ${parent.label} than meets the eye.`,
            edgeLabel: 'leads to',
            edgeType: EdgeType.LEADS_TO,
          },
        ];
    }
  }

  // ── Apply a mutation to the graph ────────────────────────
  applyMutation(graph: KnowledgeGraph, mutation: GraphMutation): void {
    switch (mutation.type) {
      case 'add_node':
        graph.nodes[(mutation.data as KGNode).id] = mutation.data as KGNode;
        break;
      case 'add_edge':
        graph.edges[(mutation.data as KGEdge).id] = mutation.data as KGEdge;
        break;
      case 'update_node': {
        const update = mutation.data as { id: string; updates: Partial<KGNode> };
        if (graph.nodes[update.id]) {
          Object.assign(graph.nodes[update.id], update.updates);
        }
        break;
      }
      case 'remove_node':
        delete graph.nodes[(mutation.data as any).id];
        break;
      case 'remove_edge':
        delete graph.edges[(mutation.data as any).id];
        break;
    }
    graph.updatedAt = Date.now();
  }

  // ── Layout Computation (radial around center) ────────────
  private computeLayout(count: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const centerX = 500;
    const centerY = 300;
    const radius = 200;

    // First node at center
    positions.push({ x: centerX, y: centerY - 20 });

    // Remaining nodes in a circle around center
    for (let i = 1; i < count; i++) {
      const angle = ((i - 1) / (count - 1)) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }

    return positions;
  }
}
