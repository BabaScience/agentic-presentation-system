/* ═══════════════════════════════════════════════════════════════
   Presentation Planner — Knowledge Graph → Scene Sequence
   Transforms the KG into a linear presentation path using
   RL policy for traversal order and scene composition.
   ═══════════════════════════════════════════════════════════════ */

import {
  type KnowledgeGraph, type KGNode, type KGEdge,
  type PresentationScene, type TraversalPath, type VisualCommand,
  type RLPolicy, DataType,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';

export class PresentationPlanner {

  // ── Plan Complete Traversal Path ─────────────────────────
  planTraversal(graph: KnowledgeGraph, policy: RLPolicy): TraversalPath {
    const orderedNodes = this.computeTraversalOrder(graph, policy);
    const scenes = this.nodesToScenes(graph, orderedNodes, policy);
    const branchPoints = this.identifyBranchPoints(graph, scenes);

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationEstimate, 0);

    console.log(`[Planner] Created ${scenes.length} scenes, estimated ${Math.round(totalDuration / 1000)}s`);

    return {
      sceneSequence: scenes,
      estimatedDuration: totalDuration,
      branchPoints,
    };
  }

  // ── Compute Node Traversal Order ─────────────────────────
  // Uses BFS from root, weighted by RL relevance scores
  private computeTraversalOrder(graph: KnowledgeGraph, policy: RLPolicy): KGNode[] {
    const visited = new Set<string>();
    const order: KGNode[] = [];
    const root = graph.nodes[graph.rootNodeId];

    if (!root) return [];

    // BFS queue with priority
    const queue: KGNode[] = [root];
    visited.add(root.id);

    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      // Find children via edges
      const childEdges = Object.values(graph.edges)
        .filter(e => e.sourceId === node.id && !visited.has(e.targetId));

      // Sort children by RL relevance + policy preferences
      const children = childEdges
        .map(e => ({ node: graph.nodes[e.targetId], edge: e }))
        .filter(c => c.node)
        .sort((a, b) => {
          // Boost types matching policy's expansion priority
          const aBoost = policy.expansionPriority.indexOf(a.node.type);
          const bBoost = policy.expansionPriority.indexOf(b.node.type);
          const aPriority = aBoost >= 0 ? 1 - aBoost * 0.1 : 0;
          const bPriority = bBoost >= 0 ? 1 - bBoost * 0.1 : 0;
          return (b.node.rlRelevanceScore + bPriority) - (a.node.rlRelevanceScore + aPriority);
        });

      for (const child of children) {
        if (!visited.has(child.node.id) && child.node.depth <= 2) {
          // Only include depth 0-2 in main traversal
          visited.add(child.node.id);
          queue.push(child.node);
        }
      }
    }

    return order;
  }

  // ── Convert Ordered Nodes → Presentation Scenes ──────────
  // Always 1 node per scene for focused, progressive presentation.
  // Each scene includes staggered sub-reveals for related edges.
  private nodesToScenes(
    graph: KnowledgeGraph,
    nodes: KGNode[],
    policy: RLPolicy,
  ): PresentationScene[] {
    const scenes: PresentationScene[] = [];
    const presentedSoFar = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      const focusNode = nodes[i];

      // Find edges involving this node
      const sceneEdges = Object.values(graph.edges).filter(
        e => e.sourceId === focusNode.id || e.targetId === focusNode.id,
      );
      // Only include edges where the other node has been presented or is the focus
      const relevantEdges = sceneEdges.filter(e => {
        const otherId = e.sourceId === focusNode.id ? e.targetId : e.sourceId;
        return presentedSoFar.has(otherId);
      });

      // Build visual commands with staggered timing
      const visualCommands: VisualCommand[] = [];
      const narrationWords = focusNode.narration.split(/\s+/).length;

      // First: reveal the focus node immediately
      visualCommands.push({
        type: 'reveal',
        targetId: focusNode.id,
        wordTrigger: 0,
      });

      // Then: reveal connecting edges at staggered intervals
      const edgeInterval = Math.max(Math.floor(narrationWords / (relevantEdges.length + 1)), 5);
      for (let j = 0; j < relevantEdges.length; j++) {
        visualCommands.push({
          type: 'connect',
          targetId: relevantEdges[j].id,
          wordTrigger: Math.min((j + 1) * edgeInterval, narrationWords - 2),
          params: {
            from: relevantEdges[j].sourceId,
            to: relevantEdges[j].targetId,
            label: relevantEdges[j].label,
          },
        });
      }

      // Compose narration
      const narration = this.composeNarration([focusNode], relevantEdges, policy, i === 0);

      // Compute viewport framing this node + connected presented nodes
      const viewportNodes = [focusNode];
      for (const e of relevantEdges) {
        const otherId = e.sourceId === focusNode.id ? e.targetId : e.sourceId;
        const other = graph.nodes[otherId];
        if (other) viewportNodes.push(other);
      }
      const viewport = this.computeViewport(viewportNodes);

      // Duration based on narration length
      const wordCount = narration.split(/\s+/).length;
      const durationMs = (wordCount / (policy.pace / 60)) * 1000 + 1500; // +1.5s for reveals

      scenes.push({
        id: `scene-${uuid().slice(0, 8)}`,
        nodeIds: [focusNode.id],
        edgeIds: relevantEdges.map(e => e.id),
        narration,
        focusNodeId: focusNode.id,
        viewport,
        visualCommands,
        durationEstimate: Math.max(durationMs, 4000),
      });

      presentedSoFar.add(focusNode.id);
    }

    return scenes;
  }

  // ── Compose Narration for a Scene ────────────────────────
  private composeNarration(
    nodes: KGNode[],
    edges: KGEdge[],
    policy: RLPolicy,
    isFirst: boolean,
  ): string {
    const parts: string[] = [];

    if (isFirst) {
      parts.push(`Let's explore ${nodes[0].label}.`);
    }

    for (const node of nodes) {
      // Use node's pre-generated narration
      parts.push(node.narration);
    }

    // Add relationship narration for edges connecting scene nodes
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.sourceId);
      const target = nodes.find(n => n.id === edge.targetId);
      if (source && target) {
        parts.push(`${source.label} ${edge.label} ${target.label}.`);
      }
    }

    return parts.join(' ');
  }

  // ── Compute Viewport to Frame Scene Nodes ────────────────
  private computeViewport(nodes: KGNode[]): { x: number; y: number; zoom: number } {
    if (nodes.length === 0) return { x: 500, y: 300, zoom: 1 };

    const xs = nodes.map(n => n.visual.x);
    const ys = nodes.map(n => n.visual.y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 260;
    const minY = Math.min(...ys) - 50;
    const maxY = Math.max(...ys) + 150;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const zoom = Math.min(1000 / spanX, 600 / spanY, 1.5);

    return { x: centerX, y: centerY, zoom: Math.max(zoom, 0.5) };
  }

  // ── Identify Branch Points (Expandable Nodes) ────────────
  private identifyBranchPoints(
    graph: KnowledgeGraph,
    scenes: PresentationScene[],
  ): Array<{ sceneIndex: number; possibleBranches: string[] }> {
    const branchPoints: Array<{ sceneIndex: number; possibleBranches: string[] }> = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const branches: string[] = [];

      for (const nodeId of scene.nodeIds) {
        const node = graph.nodes[nodeId];
        if (!node) continue;

        // Check if this node has deeper children not in the main traversal
        const childEdges = Object.values(graph.edges).filter(e => e.sourceId === nodeId);
        for (const edge of childEdges) {
          const child = graph.nodes[edge.targetId];
          if (child && child.depth > 2 && !child.isPresented) {
            branches.push(child.id);
          }
        }
      }

      if (branches.length > 0) {
        branchPoints.push({ sceneIndex: i, possibleBranches: branches });
      }
    }

    return branchPoints;
  }
}
