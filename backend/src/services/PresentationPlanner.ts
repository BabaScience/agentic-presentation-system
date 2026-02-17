/* ═══════════════════════════════════════════════════════════════
   Presentation Planner — Knowledge Graph → Scene Sequence
   Transforms the KG into a linear presentation path using
   RL policy for traversal order and scene composition.
   ═══════════════════════════════════════════════════════════════ */

import {
  type KnowledgeGraph, type KGNode, type KGEdge,
  type PresentationScene, type TraversalPath, type VisualCommand,
  type RLPolicy, type IllustrationSpec, type WordTimestamp, type SceneContract,
  DataType, DATA_TYPE_VISUALS,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';
import { VisualScriptGenerator } from './VisualScriptGenerator';

export interface SceneLocalData {
  scene: PresentationScene;
  estimatedTimestamps: WordTimestamp[];
  focusNode: KGNode;
}

export class PresentationPlanner {
  private visualScriptGenerator: VisualScriptGenerator;

  constructor() {
    this.visualScriptGenerator = new VisualScriptGenerator();
  }

  getVisualScriptGenerator(): VisualScriptGenerator {
    return this.visualScriptGenerator;
  }

  // ── Plan Complete Traversal Path ─────────────────────────
  async planTraversal(graph: KnowledgeGraph, policy: RLPolicy): Promise<TraversalPath> {
    const orderedNodes = this.computeTraversalOrder(graph, policy);
    const scenes = await this.nodesToScenes(graph, orderedNodes, policy);
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
  computeTraversalOrder(graph: KnowledgeGraph, policy: RLPolicy): KGNode[] {
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
  async nodesToScenes(
    graph: KnowledgeGraph,
    nodes: KGNode[],
    policy: RLPolicy,
  ): Promise<PresentationScene[]> {
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

      // Generate estimated word timestamps for visual script generation
      const estimatedTimestamps = this.generateEstimatedTimestamps(narration, Math.max(durationMs, 4000));

      // Generate visual script using AI
      const sceneId = `scene-${uuid().slice(0, 8)}`;
      let visualScript;
      try {
        visualScript = await this.visualScriptGenerator.generateScript(
          sceneId,
          narration,
          focusNode.type,
          estimatedTimestamps,
          Math.max(durationMs, 4000),
          focusNode.visualHint,
          focusNode.domain,
        );
      } catch (error) {
        console.error('[PresentationPlanner] Visual script generation failed:', error);
        // Fallback to legacy illustrations
        visualScript = undefined;
      }

      // Generate fallback illustrations for legacy support
      const illustrations = this.generateIllustrations(focusNode, Math.max(durationMs, 4000));

      scenes.push({
        id: sceneId,
        nodeIds: [focusNode.id],
        edgeIds: relevantEdges.map(e => e.id),
        narration,
        focusNodeId: focusNode.id,
        viewport,
        visualCommands,
        durationEstimate: Math.max(durationMs, 4000),
        illustrations, // Legacy support
        visualScript, // New frame-based system
      });

      presentedSoFar.add(focusNode.id);
    }

    return scenes;
  }

  // ── Compose Scene Locals (synchronous, no API calls) ─────
  // Extracts all locally-computable scene data for a single node.
  // Used by ScenePipelineOrchestrator to prepare scenes concurrently.
  composeSceneLocals(
    graph: KnowledgeGraph,
    focusNode: KGNode,
    nodeIndex: number,
    presentedSoFar: Set<string>,
    policy: RLPolicy,
  ): SceneLocalData {
    const sceneEdges = Object.values(graph.edges).filter(
      e => e.sourceId === focusNode.id || e.targetId === focusNode.id,
    );
    const relevantEdges = sceneEdges.filter(e => {
      const otherId = e.sourceId === focusNode.id ? e.targetId : e.sourceId;
      return presentedSoFar.has(otherId);
    });

    const visualCommands: VisualCommand[] = [];
    const narrationWords = focusNode.narration.split(/\s+/).length;

    visualCommands.push({
      type: 'reveal',
      targetId: focusNode.id,
      wordTrigger: 0,
    });

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

    const narration = this.composeNarration([focusNode], relevantEdges, policy, nodeIndex === 0);

    const viewportNodes = [focusNode];
    for (const e of relevantEdges) {
      const otherId = e.sourceId === focusNode.id ? e.targetId : e.sourceId;
      const other = graph.nodes[otherId];
      if (other) viewportNodes.push(other);
    }
    const viewport = this.computeViewport(viewportNodes);

    const wordCount = narration.split(/\s+/).length;
    const durationMs = (wordCount / (policy.pace / 60)) * 1000 + 1500;
    const finalDuration = Math.max(durationMs, 4000);

    const estimatedTimestamps = this.generateEstimatedTimestamps(narration, finalDuration);
    const illustrations = this.generateIllustrations(focusNode, finalDuration);
    const sceneId = `scene-${uuid().slice(0, 8)}`;

    const sceneContract: SceneContract | undefined = focusNode.metadata?.sceneContract;

    const scene: PresentationScene = {
      id: sceneId,
      nodeIds: [focusNode.id],
      edgeIds: relevantEdges.map(e => e.id),
      narration,
      focusNodeId: focusNode.id,
      viewport,
      visualCommands,
      durationEstimate: finalDuration,
      illustrations,
      ...(sceneContract ? { sceneContract } : {}),
    };

    return { scene, estimatedTimestamps, focusNode };
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

  // ── Generate Illustrations for Scene ──────────────────────────
  // Intelligent illustration generator that analyzes content and creates
  // meaningful visual metaphors
  /* ─── Color palette for illustration variety ─── */
  private static readonly PALETTE = {
    cyan:    '#00e5ff',
    pink:    '#ff2d7b',
    green:   '#00e676',
    amber:   '#ffab00',
    purple:  '#b388ff',
    teal:    '#00bcd4',
    coral:   '#ff6b6b',
    lime:    '#c6ff00',
  };

  /** Pick a contrasting accent color that differs from the primary */
  private accentColor(primary: string): string {
    const palette = Object.values(PresentationPlanner.PALETTE);
    const filtered = palette.filter(c => c !== primary);
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  generateIllustrations(
    node: KGNode,
    narrationDuration: number
  ): IllustrationSpec[] {
    const illustrations: IllustrationSpec[] = [];
    const typeVisual = DATA_TYPE_VISUALS[node.type];
    const contentLower = (node.label + ' ' + node.content + ' ' + node.narration).toLowerCase();
    const keywords = this.extractVisualKeywords(contentLower);

    switch (node.type) {
      case DataType.CONCEPT:
        illustrations.push(...this.generateConceptIllustrations(node, keywords, typeVisual.color));
        break;
      case DataType.PROCESS:
        illustrations.push(...this.generateProcessIllustrations(node, keywords, typeVisual.color, narrationDuration));
        break;
      case DataType.EXAMPLE:
        illustrations.push(...this.generateExampleIllustrations(node, keywords, typeVisual.color));
        break;
      case DataType.ANALOGY:
        illustrations.push(...this.generateAnalogyIllustrations(node, keywords, typeVisual.color));
        break;
      case DataType.DEFINITION:
        illustrations.push(...this.generateDefinitionIllustrations(node, keywords, typeVisual.color));
        break;
      case DataType.RELATIONSHIP:
        illustrations.push(...this.generateRelationshipIllustrations(node, keywords, typeVisual.color));
        break;
      default:
        illustrations.push(...this.generateDefaultIllustrations(node, typeVisual.color));
    }

    return illustrations;
  }

  private extractVisualKeywords(content: string): Set<string> {
    const keywords = new Set<string>();
    if (/(server|backend|api|endpoint)/i.test(content)) keywords.add('server');
    if (/(database|storage|persist|store|sql|nosql)/i.test(content)) keywords.add('database');
    if (/(container|docker|pod|kubernetes|k8s)/i.test(content)) keywords.add('container');
    if (/(cloud|aws|azure|gcp)/i.test(content)) keywords.add('cloud');
    if (/(network|connection|link|communicate)/i.test(content)) keywords.add('network');
    if (/(user|client|person|human)/i.test(content)) keywords.add('user');
    if (/(device|computer|laptop|phone|mobile)/i.test(content)) keywords.add('device');
    if (/(flow|stream|pipeline|transfer|move)/i.test(content)) keywords.add('flow');
    if (/(data|information|message|payload)/i.test(content)) keywords.add('data');
    if (/(process|step|sequence|stage|phase)/i.test(content)) keywords.add('process');
    if (/(layer|stack|hierarchy|level)/i.test(content)) keywords.add('layer');
    if (/(group|cluster|collection|set)/i.test(content)) keywords.add('group');
    if (/(transform|convert|change|modify)/i.test(content)) keywords.add('transform');
    return keywords;
  }

  /*
   * ── CONCEPT ────────────────────────────────────────
   * Large central element with distinct satellite accents.
   */
  private generateConceptIllustrations(node: KGNode, keywords: Set<string>, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    const illustrations: IllustrationSpec[] = [];

    if (keywords.has('container')) {
      // Outer container — large, top-center
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'diagram',
        elementType: 'box',
        position: { x: 50, y: 40 },
        size: { width: 320, height: 240 },
        style: { stroke: color, strokeWidth: 3, fill: `${color}08` },
        animation: { type: 'scaleIn', duration: 700, delay: 0 },
        content: node.label,
        appearTimingMs: 300,
      });
      // Inner pod A — left
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'box',
        position: { x: 38, y: 38 },
        size: { width: 100, height: 80 },
        style: { stroke: accent, strokeWidth: 2, fill: `${accent}18` },
        animation: { type: 'fadeIn', duration: 500, delay: 0 },
        appearTimingMs: 900,
      });
      // Inner pod B — right
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'box',
        position: { x: 62, y: 38 },
        size: { width: 100, height: 80 },
        style: { stroke: PresentationPlanner.PALETTE.green, strokeWidth: 2, fill: `${PresentationPlanner.PALETTE.green}18` },
        animation: { type: 'fadeIn', duration: 500, delay: 0 },
        appearTimingMs: 1300,
      });
      // Decorative orbit circle
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 75 },
        size: { width: 80, height: 80 },
        style: { stroke: `${accent}60`, strokeWidth: 1.5, fill: 'transparent', opacity: 0.4 },
        animation: { type: 'pulse', duration: 3000, delay: 0 },
        appearTimingMs: 1600,
      });
    } else if (keywords.has('server')) {
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'diagram',
        elementType: 'box',
        position: { x: 50, y: 35 },
        size: { width: 260, height: 180 },
        style: { stroke: color, strokeWidth: 3, fill: `${color}0C` },
        animation: { type: 'scaleIn', duration: 600, delay: 0 },
        content: node.label,
        appearTimingMs: 300,
      });
      // Small accent dot
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 80, y: 70 },
        size: { width: 60, height: 60 },
        style: { stroke: accent, strokeWidth: 2, fill: `${accent}15` },
        animation: { type: 'fadeIn', duration: 500, delay: 0 },
        appearTimingMs: 1000,
      });
    } else if (keywords.has('database')) {
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'icon',
        elementType: 'icon',
        position: { x: 50, y: 40 },
        size: { width: 200, height: 200 },
        style: { fill: color, opacity: 0.9 },
        animation: { type: 'scaleIn', duration: 700, delay: 0 },
        content: '🗄️',
        appearTimingMs: 300,
      });
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 40 },
        size: { width: 280, height: 280 },
        style: { stroke: `${accent}40`, strokeWidth: 1.5, fill: 'transparent' },
        animation: { type: 'pulse', duration: 3000, delay: 0 },
        appearTimingMs: 800,
      });
    } else {
      // Default: prominent central circle with accent ring
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 42 },
        size: { width: 240, height: 240 },
        style: { stroke: color, strokeWidth: 3, fill: `${color}0C`, opacity: 0.9 },
        animation: { type: 'pulse', duration: 2500, delay: 0 },
        content: node.label,
        appearTimingMs: 300,
      });
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 42 },
        size: { width: 340, height: 340 },
        style: { stroke: `${accent}35`, strokeWidth: 1, fill: 'transparent' },
        animation: { type: 'fadeIn', duration: 800, delay: 0 },
        appearTimingMs: 800,
      });
      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 22, y: 72 },
        size: { width: 70, height: 70 },
        style: { stroke: accent, strokeWidth: 2, fill: `${accent}12` },
        animation: { type: 'scaleIn', duration: 500, delay: 0 },
        appearTimingMs: 1200,
      });
    }

    return illustrations;
  }

  /*
   * ── PROCESS ────────────────────────────────────────
   * Wide horizontal flow with large boxes and coloured arrows.
   */
  private generateProcessIllustrations(node: KGNode, keywords: Set<string>, color: string, duration: number): IllustrationSpec[] {
    const illustrations: IllustrationSpec[] = [];
    const stepInterval = Math.min(duration / 5, 1200);

    const stepColors = [
      color,
      this.accentColor(color),
      PresentationPlanner.PALETTE.green,
    ];

    const steps = 3;
    for (let i = 0; i < steps; i++) {
      // Spread across 15% → 85% of canvas
      const xPos = 20 + i * 30;
      const yPos = 42;
      const c = stepColors[i % stepColors.length];

      illustrations.push({
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'box',
        position: { x: xPos, y: yPos },
        size: { width: 180, height: 140 },
        style: { stroke: c, strokeWidth: 2.5, fill: `${c}0C` },
        animation: { type: 'scaleIn', duration: 500, delay: 0 },
        content: `Step ${i + 1}`,
        appearTimingMs: 400 + i * stepInterval,
      });

      if (i < steps - 1) {
        illustrations.push({
          id: `illus-${uuid().slice(0, 8)}`,
          type: 'shape',
          elementType: 'arrow',
          position: { x: xPos + 14, y: yPos },
          size: { width: 200, height: 10 },
          style: { stroke: `${c}90`, strokeWidth: 3 },
          animation: { type: 'slideIn', duration: 400, delay: 0 },
          appearTimingMs: 700 + i * stepInterval,
        });
      }
    }

    // Bottom decorative line
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'arrow',
      position: { x: 15, y: 78 },
      size: { width: 600, height: 10 },
      style: { stroke: `${color}25`, strokeWidth: 1.5 },
      animation: { type: 'slideIn', duration: 800, delay: 0 },
      appearTimingMs: 400 + steps * stepInterval,
    });

    return illustrations;
  }

  /*
   * ── EXAMPLE ────────────────────────────────────────
   * Large code card with accent highlight strip.
   */
  private generateExampleIllustrations(node: KGNode, keywords: Set<string>, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    const illustrations: IllustrationSpec[] = [];

    // Large code block — centred
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'diagram',
      elementType: 'code',
      position: { x: 50, y: 40 },
      size: { width: 400, height: 260 },
      style: { stroke: color, strokeWidth: 2, fill: `${color}08` },
      animation: { type: 'fadeIn', duration: 600, delay: 0 },
      content: node.label,
      appearTimingMs: 400,
    });
    // Accent highlight bar
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'box',
      position: { x: 50, y: 72 },
      size: { width: 300, height: 8 },
      style: { stroke: 'transparent', strokeWidth: 0, fill: accent },
      animation: { type: 'slideIn', duration: 500, delay: 0 },
      appearTimingMs: 1000,
    });
    // Small accent dot
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 85, y: 22 },
      size: { width: 50, height: 50 },
      style: { stroke: accent, strokeWidth: 2, fill: `${accent}15` },
      animation: { type: 'scaleIn', duration: 400, delay: 0 },
      appearTimingMs: 1300,
    });

    return illustrations;
  }

  /*
   * ── ANALOGY ────────────────────────────────────────
   * Two large panels with distinct colours and a central connector.
   */
  private generateAnalogyIllustrations(node: KGNode, keywords: Set<string>, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    const illustrations: IllustrationSpec[] = [];

    // Left panel
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'box',
      position: { x: 25, y: 42 },
      size: { width: 280, height: 200 },
      style: { stroke: color, strokeWidth: 2.5, fill: `${color}0A` },
      animation: { type: 'slideIn', duration: 600, delay: 0 },
      appearTimingMs: 300,
    });

    // Right panel — different colour
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'box',
      position: { x: 75, y: 42 },
      size: { width: 280, height: 200 },
      style: { stroke: accent, strokeWidth: 2.5, fill: `${accent}0A` },
      animation: { type: 'slideIn', duration: 600, delay: 0 },
      appearTimingMs: 800,
    });

    // Central double-headed arrow
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'arrow',
      position: { x: 40, y: 42 },
      size: { width: 200, height: 10 },
      style: { stroke: PresentationPlanner.PALETTE.amber, strokeWidth: 3 },
      animation: { type: 'fadeIn', duration: 500, delay: 0 },
      content: '≈',
      appearTimingMs: 1300,
    });

    // Decorative circles at corners
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 25, y: 75 },
      size: { width: 40, height: 40 },
      style: { stroke: `${color}50`, strokeWidth: 1.5, fill: 'transparent' },
      animation: { type: 'fadeIn', duration: 400, delay: 0 },
      appearTimingMs: 1600,
    });
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 75, y: 75 },
      size: { width: 40, height: 40 },
      style: { stroke: `${accent}50`, strokeWidth: 1.5, fill: 'transparent' },
      animation: { type: 'fadeIn', duration: 400, delay: 0 },
      appearTimingMs: 1600,
    });

    return illustrations;
  }

  /*
   * ── DEFINITION ─────────────────────────────────────
   * Large bordered definition card with accent bracket and quote icon.
   */
  private generateDefinitionIllustrations(node: KGNode, keywords: Set<string>, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    const illustrations: IllustrationSpec[] = [];

    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'diagram',
      elementType: 'box',
      position: { x: 50, y: 40 },
      size: { width: 380, height: 220 },
      style: { stroke: color, strokeWidth: 3, fill: `${color}0A` },
      animation: { type: 'scaleIn', duration: 600, delay: 0 },
      content: node.label,
      appearTimingMs: 300,
    });
    // Accent left-border bar
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'box',
      position: { x: 30, y: 40 },
      size: { width: 6, height: 180 },
      style: { stroke: 'transparent', strokeWidth: 0, fill: accent },
      animation: { type: 'slideIn', duration: 400, delay: 0 },
      appearTimingMs: 700,
    });
    // Quote icon top-right
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'icon',
      elementType: 'icon',
      position: { x: 80, y: 20 },
      size: { width: 80, height: 80 },
      style: { fill: `${accent}40`, opacity: 0.5 },
      animation: { type: 'fadeIn', duration: 500, delay: 0 },
      content: '❝',
      appearTimingMs: 1000,
    });

    return illustrations;
  }

  /*
   * ── RELATIONSHIP ───────────────────────────────────
   * Two large circles at opposing ends with a bold connecting arrow.
   */
  private generateRelationshipIllustrations(node: KGNode, keywords: Set<string>, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    const illustrations: IllustrationSpec[] = [];

    // Left node — large
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 25, y: 42 },
      size: { width: 200, height: 200 },
      style: { stroke: color, strokeWidth: 2.5, fill: `${color}0C` },
      animation: { type: 'scaleIn', duration: 600, delay: 0 },
      appearTimingMs: 300,
    });

    // Right node — different colour, slightly smaller
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 75, y: 42 },
      size: { width: 180, height: 180 },
      style: { stroke: accent, strokeWidth: 2.5, fill: `${accent}0C` },
      animation: { type: 'scaleIn', duration: 600, delay: 0 },
      appearTimingMs: 700,
    });

    // Bold connecting arrow
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'arrow',
      position: { x: 37, y: 42 },
      size: { width: 260, height: 10 },
      style: { stroke: PresentationPlanner.PALETTE.amber, strokeWidth: 4 },
      animation: { type: 'slideIn', duration: 500, delay: 0 },
      content: node.label,
      appearTimingMs: 1100,
    });

    // Subtle ring around the whole relationship
    illustrations.push({
      id: `illus-${uuid().slice(0, 8)}`,
      type: 'shape',
      elementType: 'circle',
      position: { x: 50, y: 42 },
      size: { width: 500, height: 300 },
      style: { stroke: `${color}18`, strokeWidth: 1, fill: 'transparent' },
      animation: { type: 'fadeIn', duration: 800, delay: 0 },
      appearTimingMs: 1400,
    });

    return illustrations;
  }

  // Default fallback — centred circle with accent ring
  private generateDefaultIllustrations(node: KGNode, color: string): IllustrationSpec[] {
    const accent = this.accentColor(color);
    return [
      {
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 42 },
        size: { width: 220, height: 220 },
        style: { stroke: color, strokeWidth: 2.5, fill: `${color}0C` },
        animation: { type: 'pulse', duration: 2500, delay: 0 },
        content: node.label,
        appearTimingMs: 300,
      },
      {
        id: `illus-${uuid().slice(0, 8)}`,
        type: 'shape',
        elementType: 'circle',
        position: { x: 50, y: 42 },
        size: { width: 320, height: 320 },
        style: { stroke: `${accent}30`, strokeWidth: 1, fill: 'transparent' },
        animation: { type: 'fadeIn', duration: 800, delay: 0 },
        appearTimingMs: 800,
      },
    ];
  }

  /**
   * Generate estimated word timestamps for narration
   * Uses syllable-weighted distribution for more natural alignment.
   * Short words get less time, long words get more, with pauses after punctuation.
   */
  generateEstimatedTimestamps(narration: string, durationMs: number): WordTimestamp[] {
    const words = narration.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    // Count syllables heuristically (count vowel groups)
    const countSyllables = (word: string): number => {
      const cleaned = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (cleaned.length <= 2) return 1;
      const matches = cleaned.match(/[aeiouy]+/g);
      return Math.max(1, matches ? matches.length : 1);
    };

    // Compute weight per word based on syllable count
    const weights = words.map((word, i) => {
      const syllables = countSyllables(word);
      let weight: number;
      if (syllables === 1 && word.replace(/[^a-zA-Z]/g, '').length <= 3) {
        weight = 0.5; // Short words: "a", "the", "is"
      } else if (syllables <= 3) {
        weight = 1.0; // Medium words
      } else {
        weight = 1.5; // Long words: "Kubernetes", "infrastructure"
      }

      // Add pause after punctuation
      if (/[.]$/.test(word)) weight += 0.4; // period pause
      else if (/[,;:]$/.test(word)) weight += 0.2; // comma pause

      return weight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const msPerWeight = durationMs / totalWeight;

    let currentTime = 0;
    return words.map((word, i) => {
      const wordDuration = weights[i] * msPerWeight;
      const ts = {
        word,
        start: currentTime,
        end: currentTime + wordDuration,
      };
      currentTime += wordDuration;
      return ts;
    });
  }
}
