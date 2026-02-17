/* ═══════════════════════════════════════════════════════════════
   Visual Script Generator

   Uses Claude API to analyze narration and generate frame-by-frame
   visual narratives that unfold with the audio.

   Process:
   1. Analyze narration semantically
   2. Break into temporal segments
   3. Map segments to visual entities
   4. Generate frame sequence with timing
   5. Define transitions between frames
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import {
  type VisualScript,
  type IllustrationFrame,
  type VisualEntity,
  type VisualEntityType,
  type WordTimestamp,
  type VisualHint,
  DataType,
  FRAME_DURATION_MIN_MS,
  INTER_ENTITY_STAGGER_MIN_MS,
  clampEntityPosition,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';
import { getEnvironmentGuideForPrompt } from '../prompts/presentationEnvironmentGuide';
import { CodeExecutionService } from './CodeExecutionService';
import { DataVisualizationService } from './DataVisualizationService';
import { AIIllustrationService } from './AIIllustrationService';
import { MathVisualizationService } from './MathVisualizationService';
import { postProcessFrames } from './LayoutEngine';
import { SceneCompositionService } from './SceneCompositionService';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface SegmentEntity {
  type: VisualEntityType;
  label?: string;
  position?: { x: number; y: number };
  color?: string;
  size?: number; // scale factor relative to default, 0.5-1.5
  animation?: { type: string; delay: number };
  // Entity-to-entity connections (for Arrow/DataFlow)
  from?: string; // label of source entity
  to?: string;   // label of target entity
  // Hierarchical nesting
  parent?: string; // label of parent container entity
  // Rich text
  textContent?: string[];
  codeLanguage?: string;
}

interface VisualSegment {
  text: string;
  startTime: number;
  endTime: number;
  entities: SegmentEntity[];
  description: string;
}

export class VisualScriptGenerator {
  private codeExecution: CodeExecutionService;
  private dataViz: DataVisualizationService;
  private aiIllustration: AIIllustrationService;
  private mathViz: MathVisualizationService;
  private composition: SceneCompositionService;

  constructor() {
    this.codeExecution = new CodeExecutionService();
    this.dataViz = new DataVisualizationService();
    this.aiIllustration = new AIIllustrationService();
    this.mathViz = new MathVisualizationService();
    this.composition = new SceneCompositionService();
  }

  /**
   * Generate a complete visual script from narration with enhanced capabilities
   */
  async generateScript(
    sceneId: string,
    narration: string,
    dataType: DataType,
    wordTimestamps: WordTimestamp[],
    durationMs: number,
    visualHint?: VisualHint,
  ): Promise<VisualScript> {

    // Use Claude to analyze narration and generate visual segments
    const segments = await this.analyzeNarration(narration, dataType, wordTimestamps, durationMs, visualHint);

    // Convert segments to frames
    const frames = this.segmentsToFrames(segments, durationMs);

    // Post-process: layout engine (collision avoidance + pattern enforcement)
    postProcessFrames(frames, visualHint?.layoutPattern);

    // Optional: use SceneCompositionService for complex frames with poor layout
    for (const frame of frames) {
      if (frame.entities.length >= 4) {
        try {
          const layoutType = this.mapLayoutPattern(visualHint?.layoutPattern);
          const layout = this.composition.generateLayout(frame.entities, layoutType);
          if (layout.aestheticScore !== undefined && layout.aestheticScore < 0.5) {
            // Re-apply positions from composition service, then re-clamp for size
            for (const layoutEntity of layout.entities) {
              const entity = frame.entities.find(e => e.id === layoutEntity.id);
              if (entity) {
                entity.position = clampEntityPosition(
                  layoutEntity.position,
                  entity.size.width,
                  entity.size.height,
                );
              }
            }
          }
        } catch {
          // Composition service is optional — ignore errors
        }
      }
    }

    // Collect all entities
    const allEntities: Record<string, VisualEntity> = {};
    frames.forEach(frame => {
      frame.entities.forEach(entity => {
        allEntities[entity.id] = entity;
      });
    });

    return {
      sceneId,
      frames,
      totalDuration: durationMs,
      entities: allEntities,
    };
  }

  /**
   * Use Claude API to analyze narration and extract visual segments
   */
  private async analyzeNarration(
    narration: string,
    dataType: DataType,
    wordTimestamps: WordTimestamp[],
    durationMs: number,
    visualHint?: VisualHint,
  ): Promise<VisualSegment[]> {

    const environmentGuide = getEnvironmentGuideForPrompt();

    // Build visual hint section if agent provided guidance
    const layoutInstructions = visualHint?.layoutPattern ? this.getLayoutInstructions(visualHint.layoutPattern) : '';
    const visualHintSection = visualHint ? `
**Agent Visual Hint** (the reasoning agent analyzed this concept and suggests these visuals — use as your PRIMARY guide):
- Suggested entities: ${JSON.stringify(visualHint.suggestedEntities)}
- Layout pattern: ${visualHint.layoutPattern}
${visualHint.visualMetaphor ? `- Visual metaphor: "${visualHint.visualMetaphor}"` : ''}
${visualHint.colorScheme ? `- Color scheme: ${visualHint.colorScheme}` : ''}

IMPORTANT: Use the agent's suggested entities as your starting point. Map them to the closest available VisualEntityType. You may add supplementary entities but keep the agent's primary/secondary structure.

**LAYOUT POSITIONING (follow this pattern for entity positions):**
${layoutInstructions}
` : '';

    const prompt = `${environmentGuide}

## YOUR TASK: Generate Visual Script for Narration

You are generating a frame-by-frame visual script for the following narration.
Use the complete presentation environment guide above to make intelligent decisions.
${visualHintSection}
**Narration**: "${narration}"
**Data Type**: ${dataType}
**Duration**: ${durationMs}ms (${Math.round(durationMs / 1000)}s)

## Analysis Steps:

1. **Semantic Analysis**: Identify key concepts, actions, and relationships
2. **Entity Mapping**: Map concepts to appropriate VisualEntityType from the guide
3. **Temporal Segmentation**: Break into 3-5 frames based on natural pauses
4. **Position Strategy**: Use percentage-based x,y coordinates (0-100) for precise canvas placement
5. **Color Strategy**: Assign semantically meaningful colors to distinguish entities
6. **Animation Choreography**: Use varied animation types with staggered delays

## Color Palette (match to semantic meaning):
- Cyan #00e5ff — primary concepts, networking, core ideas
- Green #00e676 — examples, instances, healthy states, pods
- Amber #ffab00 — analogies, services, stable elements
- Purple #b388ff — processes, infrastructure, internal mechanisms
- Pink #ff6b9d — counterpoints, warnings, contrasts
- Teal #00bcd4 — cloud, external, environments
- White #ffffff — users, neutral connectors
- Subtle white #ffffff40 — arrows, data flows, connection lines
Use VARIED colors to distinguish entities — never make all entities the same color.

## Output Format:

Return ONLY a JSON array (no markdown, no explanation):

[
  {
    "text": "exact portion of narration for this segment",
    "timeRangePercent": [startPercent, endPercent],
    "entities": [
      {
        "type": "Server",
        "label": "API Server",
        "position": { "x": 50, "y": 35 },
        "color": "#00e5ff",
        "size": 1.2,
        "animation": { "type": "scaleIn", "delay": 200 }
      },
      {
        "type": "Arrow",
        "label": "request",
        "from": "API Server",
        "to": "Database",
        "color": "#ffffff40",
        "size": 0.8,
        "animation": { "type": "flow", "delay": 400 }
      }
    ],
    "description": "Brief description of visual scene"
  }
]

## Entity Field Requirements:
- **type**: Must be one of: User, Server, Database, Container, Pod, Cloud, Network, Device, Arrow, DataFlow, Process, Queue, Cache, LoadBalancer, Service, Firewall, APIGateway, Lambda, Subnet, Volume, Registry, Monitor, Pipeline, Decision, Cluster, Concept, Entity, Group, Label, Comparison, Timeline, Metric, Cycle, Stack, Tree, Badge, Quote
- **label**: Concise (1-3 words)
- **position**: Object with x (0-100) and y (0-100) as percentage coordinates. Spread entities across the canvas — avoid clustering everything at x:50, y:50. Use the layout patterns from the guide. Not required for Arrow/DataFlow if "from"/"to" are specified — position will be computed automatically.
- **color**: Hex color from the palette above. Match to the entity's semantic role. Primary entities get bright colors, connectors get subtle ones.
- **size**: Scale factor (0.5-1.5) relative to the entity type's default size. Primary focus entities should be 1.0-1.3, secondary 0.7-1.0, decorative 0.5-0.8.
- **animation.type**: One of "fadeIn", "slideIn", "scaleIn", "pulse", "flow", "dashFlow". Use scaleIn for primary entities, fadeIn for secondary, flow for arrows/data.
- **animation.delay**: Milliseconds (0-1000). Stagger reveals: primary=0, secondary=200-400, connectors=400-700.

## Entity Connections (IMPORTANT for arrows/flows):
- **from**: Label of the source entity this arrow/flow originates from. The arrow will be drawn FROM that entity TO the target.
- **to**: Label of the target entity this arrow/flow points to. Both from/to must match labels of other entities in the same frame.
- Example: To draw an arrow from "User" to "API Server", create an Arrow entity with "from": "User", "to": "API Server".
- Arrows without from/to will render as standalone horizontal arrows at their position.

## Hierarchical Nesting (for containers):
- **parent**: Label of a container entity (Group, Cloud, Container, Pod) that visually contains this entity.
- Child entities are rendered INSIDE their parent's bounds, with positions relative to the parent.
- Example: To show containers inside a pod, give each container "parent": "Pod Name".

## Rich Text (for Label, Quote, Entity types):
- **textContent**: Array of strings for multi-line text. Each string is a separate line.
- **codeLanguage**: Language identifier for code block styling (e.g., "javascript", "python").

## Additional Requirements:
- 3-5 frames total (balanced timing)
- Entities that persist across frames should keep the same label and type
- Ensure smooth visual progression (entities build on each other)
- Match DataType visualization strategy from guide
- USE ARROWS WITH from/to to show relationships between entities — this is critical for understanding
- When showing a flow (A → B → C), use Arrow entities with from/to connecting each step

Generate the visual script now:`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[VisualScript] No valid JSON in response, using fallback');
        return this.generateFallbackSegments(narration, dataType, durationMs);
      }

      let rawSegments: any[];
      try {
        rawSegments = JSON.parse(jsonMatch[0]);
      } catch {
        // Claude's response may have been truncated — try to repair
        rawSegments = this.repairTruncatedJSON(jsonMatch[0]);
        if (!rawSegments.length) {
          console.warn('[VisualScript] Could not repair truncated JSON, using fallback');
          return this.generateFallbackSegments(narration, dataType, durationMs);
        }
        console.warn(`[VisualScript] Repaired truncated JSON, recovered ${rawSegments.length} segments`);
      }

      // Convert to VisualSegment with proper timing and rich entity attributes
      return rawSegments.map((seg: any, idx: number) => {
        const [startPercent, endPercent] = seg.timeRangePercent || [idx * 33, (idx + 1) * 33];
        return {
          text: seg.text,
          startTime: Math.floor((startPercent / 100) * durationMs),
          endTime: Math.floor((endPercent / 100) * durationMs),
          entities: (seg.entities || []).map((e: any) => ({
            type: e.type,
            label: e.label,
            position: e.position && typeof e.position === 'object' ? e.position : undefined,
            color: e.color,
            size: e.size,
            animation: e.animation,
            from: e.from,
            to: e.to,
            parent: e.parent,
            textContent: e.textContent,
            codeLanguage: e.codeLanguage,
          })),
          description: seg.description || '',
        };
      });

    } catch (error) {
      console.error('[VisualScript] Claude API error:', error);
      return this.generateFallbackSegments(narration, dataType, durationMs);
    }
  }

  /**
   * Fallback: Generate segments using rule-based approach
   */
  private generateFallbackSegments(
    narration: string,
    dataType: DataType,
    durationMs: number,
  ): VisualSegment[] {

    const segments: VisualSegment[] = [];
    const words = narration.split(' ');
    const segmentCount = Math.min(Math.ceil(words.length / 15), 4); // Max 4 segments
    const segmentDuration = durationMs / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * segmentDuration;
      const endTime = (i + 1) * segmentDuration;
      const segmentText = words.slice(i * 15, (i + 1) * 15).join(' ');

      segments.push({
        text: segmentText,
        startTime,
        endTime,
        entities: this.inferEntitiesFromText(segmentText, dataType, i),
        description: `Segment ${i + 1}`,
      });
    }

    return segments;
  }

  /**
   * Infer visual entities from text using pattern matching (fallback path)
   */
  private inferEntitiesFromText(
    text: string,
    dataType: DataType,
    index: number,
  ): SegmentEntity[] {

    const entities: SegmentEntity[] = [];
    const positions: Array<{ x: number; y: number }> = [
      { x: 20, y: 45 }, { x: 50, y: 45 }, { x: 80, y: 45 },
    ];
    let posIdx = 0;

    // Pattern matching for common concepts
    if (/(user|client|person)/i.test(text)) {
      entities.push({ type: 'User', label: 'User', position: positions[posIdx++], color: '#ffffff', animation: { type: 'scaleIn', delay: 0 } });
    }
    if (/(server|backend|api)/i.test(text)) {
      entities.push({ type: 'Server', label: 'Server', position: positions[Math.min(posIdx++, 2)], color: '#00e5ff', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(database|storage|store)/i.test(text)) {
      entities.push({ type: 'Database', label: 'Database', position: positions[Math.min(posIdx++, 2)], color: '#b388ff', animation: { type: 'fadeIn', delay: 400 } });
    }
    if (/(container|docker)/i.test(text)) {
      entities.push({ type: 'Container', label: 'Container', position: positions[Math.min(posIdx++, 2)], color: '#00e5ff', animation: { type: 'fadeIn', delay: 200 } });
    }
    if (/(pod|kubernetes)/i.test(text)) {
      entities.push({ type: 'Pod', label: 'Pod', position: positions[Math.min(posIdx++, 2)], color: '#00e676', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(cloud|aws|azure)/i.test(text)) {
      entities.push({ type: 'Cloud', label: 'Cloud', position: { x: 50, y: 25 }, color: '#00bcd4', animation: { type: 'fadeIn', delay: 0 } });
    }
    if (/(firewall|waf|security.group|acl)/i.test(text)) {
      entities.push({ type: 'Firewall', label: 'Firewall', position: positions[Math.min(posIdx++, 2)], color: '#ff4444', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(api.gateway|ingress|reverse.proxy|kong|envoy)/i.test(text)) {
      entities.push({ type: 'APIGateway', label: 'API Gateway', position: positions[Math.min(posIdx++, 2)], color: '#00e5ff', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(lambda|serverless|faas)/i.test(text)) {
      entities.push({ type: 'Lambda', label: 'Lambda', position: positions[Math.min(posIdx++, 2)], color: '#ffab00', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(subnet|vpc|cidr)/i.test(text)) {
      entities.push({ type: 'Subnet', label: 'Subnet', position: { x: 50, y: 40 }, color: '#4488ff', animation: { type: 'fadeIn', delay: 0 } });
    }
    if (/(volume|disk|pvc|ebs|persistent.storage)/i.test(text)) {
      entities.push({ type: 'Volume', label: 'Volume', position: positions[Math.min(posIdx++, 2)], color: '#b388ff', animation: { type: 'fadeIn', delay: 200 } });
    }
    if (/(registry|repository|ecr|docker.hub)/i.test(text)) {
      entities.push({ type: 'Registry', label: 'Registry', position: positions[Math.min(posIdx++, 2)], color: '#00e676', animation: { type: 'fadeIn', delay: 200 } });
    }
    if (/(monitor|prometheus|grafana|metrics|dashboard)/i.test(text)) {
      entities.push({ type: 'Monitor', label: 'Monitor', position: positions[Math.min(posIdx++, 2)], color: '#00e676', animation: { type: 'fadeIn', delay: 200 } });
    }
    if (/(ci\/cd|pipeline|jenkins|github.actions)/i.test(text)) {
      entities.push({ type: 'Pipeline', label: 'Pipeline', position: { x: 50, y: 45 }, color: '#00bcd4', animation: { type: 'slideIn', delay: 200 } });
    }
    if (/(decision|condition|if.*then|routing.rule)/i.test(text)) {
      entities.push({ type: 'Decision', label: 'Decision', position: positions[Math.min(posIdx++, 2)], color: '#ffab00', animation: { type: 'scaleIn', delay: 200 } });
    }
    if (/(cluster|replica.set|node.pool)/i.test(text)) {
      entities.push({ type: 'Cluster', label: 'Cluster', position: { x: 50, y: 40 }, color: '#4488ff', animation: { type: 'scaleIn', delay: 0 } });
    }
    if (/(send|transmit|request|call)/i.test(text) && entities.length > 0) {
      entities.push({ type: 'Arrow', position: { x: 50, y: 45 }, color: '#ffffff40', size: 0.8, animation: { type: 'flow', delay: 400 } });
    }
    if (/(flow|stream)/i.test(text)) {
      entities.push({ type: 'DataFlow', position: { x: 50, y: 45 }, color: '#ffffff30', size: 0.8, animation: { type: 'flow', delay: 300 } });
    }

    // If no entities detected, use data type to infer
    if (entities.length === 0) {
      entities.push(this.getDefaultEntityForDataType(dataType, index));
    }

    return entities;
  }

  /**
   * Get default entity based on data type (fallback path)
   */
  private getDefaultEntityForDataType(
    dataType: DataType,
    index: number,
  ): SegmentEntity {

    const xPositions = [30, 50, 70];
    const x = xPositions[index % 3];

    switch (dataType) {
      case DataType.PROCESS:
        return { type: 'Process', position: { x, y: 45 }, color: '#00bcd4', size: 1.0, animation: { type: 'slideIn', delay: index * 200 } };
      case DataType.EXAMPLE:
        return { type: 'Entity', position: { x, y: 45 }, color: '#00e676', size: 1.0, animation: { type: 'fadeIn', delay: index * 200 } };
      case DataType.CONCEPT:
        return { type: 'Concept', position: { x: 50, y: 40 }, color: '#00e5ff', size: 1.1, animation: { type: 'scaleIn', delay: 0 } };
      case DataType.ANALOGY:
        return { type: 'Comparison', position: { x: 50, y: 40 }, color: '#ffab00', size: 1.0, animation: { type: 'scaleIn', delay: 0 } };
      case DataType.DEFINITION:
        return { type: 'Quote', position: { x: 50, y: 40 }, color: '#b388ff', size: 1.0, animation: { type: 'fadeIn', delay: 0 } };
      case DataType.COUNTERPOINT:
        return { type: 'Comparison', position: { x: 50, y: 40 }, color: '#ff6b9d', size: 1.0, animation: { type: 'scaleIn', delay: 0 } };
      case DataType.RESOURCE:
        return { type: 'Badge', position: { x, y: 45 }, color: '#4caf50', size: 0.9, animation: { type: 'fadeIn', delay: 0 } };
      default:
        return { type: 'Entity', position: { x, y: 45 }, color: '#00e5ff', size: 1.0, animation: { type: 'fadeIn', delay: index * 200 } };
    }
  }

  /**
   * Convert visual segments to illustration frames
   * Enforces minimum frame duration and validates segment count
   */
  private segmentsToFrames(segments: VisualSegment[], totalDuration: number): IllustrationFrame[] {
    // Validate segment count — fall back to uniform segmentation if invalid
    if (segments.length < 2 || segments.length > 6) {
      const targetCount = Math.max(2, Math.min(segments.length, 6));
      if (segments.length > 6) {
        segments = segments.slice(0, 6);
      }
      // If fewer than 2, handled by caller (fallback generates at least 1)
    }

    const frames: IllustrationFrame[] = [];
    const entityRegistry = new Map<string, VisualEntity>(); // Track entities across frames

    segments.forEach((segment, segmentIdx) => {
      const frameEntities: VisualEntity[] = [];
      let prevDelay = -1; // Track for stagger enforcement

      segment.entities.forEach((entityDef, entityIdx) => {
        // Use type+label as stable key for entity reuse across frames
        const entityKey = `${entityDef.type}-${entityDef.label || entityDef.type}`;

        let entity = entityRegistry.get(entityKey);

        if (!entity) {
          // Resolve position: use Claude's numeric position, fall back to keyword mapper
          const position = entityDef.position || this.getPositionCoordinates('center', segmentIdx, entityIdx);

          entity = this.createEntity(
            entityDef.type,
            entityDef.label || entityDef.type,
            position,
            entityDef.color,
            entityDef.size,
            entityDef.animation,
            {
              from: entityDef.from,
              to: entityDef.to,
              parent: entityDef.parent,
              textContent: entityDef.textContent,
              codeLanguage: entityDef.codeLanguage,
            },
          );
          entityRegistry.set(entityKey, entity);
        }

        // Deep-copy entity for this frame so layout mutations don't propagate
        // across frames (the registry keeps the canonical version)
        const frameEntity: VisualEntity = {
          ...entity,
          position: { ...entity.position },
          size: { ...entity.size },
          animation: entity.animation ? { ...entity.animation } : undefined,
        };

        // Enforce inter-entity stagger for non-first entities
        if (frameEntity.animation && entityIdx > 0) {
          const minDelay = prevDelay + INTER_ENTITY_STAGGER_MIN_MS;
          if (frameEntity.animation.delay < minDelay) {
            frameEntity.animation.delay = minDelay;
          }
        }
        prevDelay = frameEntity.animation?.delay || 0;

        frameEntities.push(frameEntity);
      });

      frames.push({
        id: `frame-${uuid().slice(0, 8)}`,
        startTime: segment.startTime,
        endTime: segment.endTime,
        entities: frameEntities,
        narrationSegment: segment.text,
        description: segment.description,
      });
    });

    // Enforce minimum frame duration — extend short frames, shift subsequent
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const duration = frame.endTime - frame.startTime;
      if (duration < FRAME_DURATION_MIN_MS) {
        const extension = FRAME_DURATION_MIN_MS - duration;
        frame.endTime += extension;
        for (let j = i + 1; j < frames.length; j++) {
          frames[j].startTime += extension;
          frames[j].endTime += extension;
        }
      }
    }

    return frames;
  }

  // Default sizes per entity type (used as base for scale factor)
  private static readonly SIZE_MAP: Record<VisualEntityType, { width: number; height: number }> = {
    // Infrastructure types
    User: { width: 80, height: 80 },
    Server: { width: 120, height: 100 },
    Database: { width: 100, height: 100 },
    Container: { width: 140, height: 120 },
    Pod: { width: 100, height: 80 },
    Cloud: { width: 150, height: 100 },
    Network: { width: 200, height: 20 },
    Device: { width: 90, height: 70 },
    Arrow: { width: 150, height: 20 },
    DataFlow: { width: 180, height: 20 },
    Process: { width: 110, height: 90 },
    Queue: { width: 130, height: 80 },
    Cache: { width: 100, height: 80 },
    LoadBalancer: { width: 120, height: 80 },
    Service: { width: 110, height: 90 },
    // Extended IT infrastructure types
    Firewall: { width: 100, height: 90 },
    APIGateway: { width: 120, height: 80 },
    Lambda: { width: 90, height: 80 },
    Subnet: { width: 180, height: 140 },
    Volume: { width: 90, height: 100 },
    Registry: { width: 100, height: 90 },
    Monitor: { width: 110, height: 80 },
    Pipeline: { width: 180, height: 60 },
    Decision: { width: 90, height: 90 },
    Cluster: { width: 120, height: 100 },
    // Universal types
    Concept: { width: 120, height: 120 },
    Entity: { width: 110, height: 90 },
    Group: { width: 200, height: 160 },
    Label: { width: 120, height: 40 },
    Comparison: { width: 240, height: 100 },
    Timeline: { width: 200, height: 60 },
    Metric: { width: 80, height: 80 },
    Cycle: { width: 120, height: 120 },
    Stack: { width: 100, height: 120 },
    Tree: { width: 100, height: 100 },
    Badge: { width: 60, height: 30 },
    Quote: { width: 200, height: 120 },
  };

  /**
   * Create a visual entity with rich attributes
   */
  private createEntity(
    type: VisualEntityType,
    label: string,
    position: { x: number; y: number },
    color?: string,
    sizeScale?: number,
    animationDef?: { type: string; delay: number },
    extra?: {
      from?: string;
      to?: string;
      parent?: string;
      textContent?: string[];
      codeLanguage?: string;
    },
  ): VisualEntity {

    const baseSize = VisualScriptGenerator.SIZE_MAP[type] || { width: 100, height: 80 };
    // Cap max scale based on entity base size to prevent overflow
    const maxDim = Math.max(baseSize.width, baseSize.height);
    const maxScale = maxDim >= 180 ? 1.2 : maxDim >= 120 ? 1.4 : 2.0;
    const scale = Math.max(0.3, Math.min(maxScale, sizeScale || 1.0));
    const finalWidth = Math.round(baseSize.width * scale);
    const finalHeight = Math.round(baseSize.height * scale);

    const validAnimTypes = ['fadeIn', 'slideIn', 'scaleIn', 'pulse', 'flow', 'dashFlow', 'none'];
    const animType = animationDef?.type && validAnimTypes.includes(animationDef.type)
      ? animationDef.type
      : 'fadeIn';

    const entity: VisualEntity = {
      id: `entity-${uuid().slice(0, 8)}`,
      type,
      position: clampEntityPosition(position, finalWidth, finalHeight),
      size: {
        width: finalWidth,
        height: finalHeight,
      },
      label,
      color,
      animation: {
        type: animType as 'fadeIn' | 'slideIn' | 'scaleIn' | 'pulse' | 'flow' | 'dashFlow' | 'none',
        duration: 500,
        delay: animationDef?.delay || 0,
      },
    };

    // Entity connections
    if (extra?.from) entity.sourceEntityId = extra.from;
    if (extra?.to) entity.targetEntityId = extra.to;
    // Hierarchical nesting
    if (extra?.parent) entity.parentEntityId = extra.parent;
    // Rich text
    if (extra?.textContent) entity.textContent = extra.textContent;
    if (extra?.codeLanguage) entity.codeLanguage = extra.codeLanguage;

    return entity;
  }

  /**
   * Convert position keyword to coordinates
   */
  private getPositionCoordinates(
    position: string,
    segmentIdx: number,
    entityIdx: number,
  ): { x: number; y: number } {

    const positionMap: Record<string, { x: number; y: number }> = {
      left: { x: 20, y: 50 },
      center: { x: 50, y: 50 },
      right: { x: 80, y: 50 },
      top: { x: 50, y: 25 },
      bottom: { x: 50, y: 75 },
    };

    const base = positionMap[position] || { x: 50, y: 50 };

    // Add slight variation for multiple entities
    const offsetX = entityIdx * 5 - 2.5;
    const offsetY = segmentIdx * 3 - 1.5;

    // Clamp generously — final size-aware clamp happens in createEntity()
    return {
      x: Math.max(8, Math.min(92, base.x + offsetX)),
      y: Math.max(8, Math.min(92, base.y + offsetY)),
    };
  }

  /**
   * Get layout positioning instructions for Claude based on layout pattern
   */
  private getLayoutInstructions(pattern: string): string {
    const instructions: Record<string, string> = {
      'flow-lr': `Left-to-right flow layout:
- Place entities in a horizontal line: x values should progress from 15→85
- y values should stay around 40-55 for the main flow
- Primary entity at x:15, secondary at x:40, tertiary at x:65, quaternary at x:85
- Arrows connect left-to-right between entities (use "from"/"to" fields)
- Decorative/label entities above or below the flow (y:20 or y:75)`,

      'flow-tb': `Top-to-bottom flow layout:
- Place entities in a vertical column: y values should progress from 15→85
- x values should stay around 45-55 for the main flow
- Primary at y:15, secondary at y:40, tertiary at y:65, quaternary at y:85
- Arrows connect top-to-bottom between entities
- Side annotations at x:15 or x:85`,

      'hierarchical': `Hierarchical tree layout:
- Root entity at top center: x:50, y:15
- Second level spread: x:25/x:75 at y:45
- Third level spread: x:15/x:40/x:60/x:85 at y:75
- Use Arrow entities with from/to to show parent-child relationships`,

      'circular': `Circular/radial layout:
- Central concept at x:50, y:50
- Surrounding entities at equal angular spacing:
  - 4 entities: x:50,y:15 / x:85,y:50 / x:50,y:85 / x:15,y:50
  - 6 entities: x:50,y:15 / x:80,y:30 / x:80,y:70 / x:50,y:85 / x:20,y:70 / x:20,y:30
- Arrows from center to periphery`,

      'central-radial': `Central-radial layout (hub-spoke):
- Primary concept at center: x:50, y:45 with size 1.3
- Spoke entities at radius ~35 from center, evenly spaced
- Arrow entities from center to each spoke
- Labels/badges near their parent entities`,

      'comparison': `Side-by-side comparison layout:
- Left concept at x:25, y:45
- Right concept at x:75, y:45
- "vs" label or Comparison entity at x:50, y:45
- Supporting details below each side: x:25,y:75 and x:75,y:75
- Arrows or DataFlow between comparable aspects`,

      'layered': `Layered/stacked layout:
- Top layer: y:15-25 (external/user-facing)
- Middle layer: y:40-55 (business logic/services)
- Bottom layer: y:70-85 (data/infrastructure)
- Entities spread across x within each layer
- Vertical arrows between layers`,

      'timeline': `Timeline layout:
- Timeline entity spanning x:10-90 at y:50
- Events positioned along the timeline at different x values
- Labels above (y:30) or below (y:70) each event
- Arrows showing progression`,
    };

    return instructions[pattern] || `Follow the "${pattern}" layout pattern: spread entities logically across the canvas using the full x:10-90 and y:15-85 range. Avoid clustering.`;
  }

  /**
   * Map layout pattern string to SceneCompositionService layout type
   */
  private mapLayoutPattern(pattern?: string): 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'flow' {
    if (!pattern) return 'force-directed';
    if (pattern.includes('hierarchical') || pattern.includes('tree')) return 'hierarchical';
    if (pattern.includes('circular') || pattern.includes('radial')) return 'circular';
    if (pattern.includes('flow') || pattern.includes('timeline')) return 'flow';
    if (pattern.includes('grid') || pattern.includes('layered')) return 'grid';
    return 'force-directed';
  }

  /**
   * Attempt to repair truncated JSON from Claude (response cut off by max_tokens).
   * Strategy: find the last complete object in the array and close the array.
   */
  private repairTruncatedJSON(raw: string): any[] {
    // Find the last complete segment object by looking for the pattern }\s*,\s*{ or }\s*]
    // We try progressively shorter substrings until JSON.parse succeeds.

    // First, try to find the last complete segment boundary ("},")
    const segmentBoundaries: number[] = [];
    let braceDepth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\' && inString) { escapeNext = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '{') braceDepth++;
      if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          // This closes a top-level object inside the array
          segmentBoundaries.push(i);
        }
      }
    }

    // Try from the last boundary backwards until we get valid JSON
    for (let b = segmentBoundaries.length - 1; b >= 0; b--) {
      const truncated = raw.slice(0, segmentBoundaries[b] + 1) + ']';
      try {
        const parsed = JSON.parse(truncated);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Try next boundary
      }
    }

    return [];
  }
}
