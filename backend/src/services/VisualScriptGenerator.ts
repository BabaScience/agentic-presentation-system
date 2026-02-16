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
  DataType,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';
import { getEnvironmentGuideForPrompt } from '../prompts/presentationEnvironmentGuide';
import { CodeExecutionService } from './CodeExecutionService';
import { DataVisualizationService } from './DataVisualizationService';
import { AIIllustrationService } from './AIIllustrationService';
import { MathVisualizationService } from './MathVisualizationService';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface VisualSegment {
  text: string;
  startTime: number;
  endTime: number;
  entities: Array<{
    type: VisualEntityType;
    action: string;
    label?: string;
    position?: 'left' | 'center' | 'right' | 'top' | 'bottom';
  }>;
  description: string;
}

export class VisualScriptGenerator {
  private codeExecution: CodeExecutionService;
  private dataViz: DataVisualizationService;
  private aiIllustration: AIIllustrationService;
  private mathViz: MathVisualizationService;

  constructor() {
    this.codeExecution = new CodeExecutionService();
    this.dataViz = new DataVisualizationService();
    this.aiIllustration = new AIIllustrationService();
    this.mathViz = new MathVisualizationService();
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
  ): Promise<VisualScript> {

    // Use Claude to analyze narration and generate visual segments
    const segments = await this.analyzeNarration(narration, dataType, wordTimestamps, durationMs);

    // Convert segments to frames
    const frames = this.segmentsToFrames(segments, durationMs);

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
  ): Promise<VisualSegment[]> {

    const environmentGuide = getEnvironmentGuideForPrompt();

    const prompt = `${environmentGuide}

## YOUR TASK: Generate Visual Script for Narration

You are generating a frame-by-frame visual script for the following narration.
Use the complete presentation environment guide above to make intelligent decisions.

**Narration**: "${narration}"
**Data Type**: ${dataType}
**Duration**: ${durationMs}ms (${Math.round(durationMs / 1000)}s)

## Analysis Steps:

1. **Semantic Analysis**: Identify key concepts, actions, and relationships
2. **Entity Mapping**: Map concepts to appropriate VisualEntityType from the guide
3. **Temporal Segmentation**: Break into 3-5 frames based on natural pauses
4. **Position Strategy**: Use layout patterns that support the narrative
5. **Animation Choreography**: Time appearances with spoken words

## Output Format:

Return ONLY a JSON array (no markdown, no explanation):

[
  {
    "text": "exact portion of narration for this segment",
    "timeRangePercent": [startPercent, endPercent],
    "entities": [
      {
        "type": "Server",
        "action": "appears and pulses",
        "label": "API Server",
        "position": "center"
      }
    ],
    "description": "Brief description of visual scene"
  }
]

## Requirements:
- 3-5 frames total (balanced timing)
- Each entity MUST use types from guide: User, Server, Database, Container, Pod, Cloud, Network, Device, Arrow, DataFlow, Process, Queue, Cache, LoadBalancer, Service
- Position must be: "left", "center", "right", "top", or "bottom"
- Labels should be concise (1-3 words)
- Ensure smooth progression (entities build on each other)
- Match DataType visualization strategy from guide

Generate the visual script now:`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
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

      const rawSegments = JSON.parse(jsonMatch[0]);

      // Convert to VisualSegment with proper timing
      return rawSegments.map((seg: any, idx: number) => {
        const [startPercent, endPercent] = seg.timeRangePercent || [idx * 33, (idx + 1) * 33];
        return {
          text: seg.text,
          startTime: Math.floor((startPercent / 100) * durationMs),
          endTime: Math.floor((endPercent / 100) * durationMs),
          entities: seg.entities || [],
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
   * Infer visual entities from text using pattern matching
   */
  private inferEntitiesFromText(
    text: string,
    dataType: DataType,
    index: number,
  ): Array<{ type: VisualEntityType; action: string; label?: string; position?: 'left' | 'center' | 'right' | 'top' | 'bottom' }> {

    const textLower = text.toLowerCase();
    const entities: Array<{ type: VisualEntityType; action: string; label?: string; position?: 'left' | 'center' | 'right' | 'top' | 'bottom' }> = [];

    // Pattern matching for common concepts
    if (/(user|client|person)/i.test(text)) {
      entities.push({ type: 'User', action: 'appears', position: 'left' });
    }
    if (/(server|backend|api)/i.test(text)) {
      entities.push({ type: 'Server', action: 'appears', position: 'center' });
    }
    if (/(database|storage|store)/i.test(text)) {
      entities.push({ type: 'Database', action: 'appears', position: 'right' });
    }
    if (/(container|docker)/i.test(text)) {
      entities.push({ type: 'Container', action: 'appears', position: 'center' });
    }
    if (/(pod|kubernetes)/i.test(text)) {
      entities.push({ type: 'Pod', action: 'appears', position: 'center' });
    }
    if (/(cloud|aws|azure)/i.test(text)) {
      entities.push({ type: 'Cloud', action: 'appears', position: 'top' });
    }
    if (/(send|transmit|request|call)/i.test(text) && entities.length > 0) {
      entities.push({ type: 'Arrow', action: 'flows', position: 'center' });
    }
    if (/(flow|stream|pipeline)/i.test(text)) {
      entities.push({ type: 'DataFlow', action: 'animates', position: 'center' });
    }

    // If no entities detected, use data type to infer
    if (entities.length === 0) {
      entities.push(this.getDefaultEntityForDataType(dataType, index));
    }

    return entities;
  }

  /**
   * Get default entity based on data type
   */
  private getDefaultEntityForDataType(
    dataType: DataType,
    index: number,
  ): { type: VisualEntityType; action: string; position?: 'left' | 'center' | 'right' | 'top' | 'bottom' } {

    const positionMap: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
    const position = positionMap[index % 3];

    switch (dataType) {
      case DataType.PROCESS:
        return { type: 'Process', action: 'appears', position };
      case DataType.EXAMPLE:
        return { type: 'Server', action: 'appears', position };
      case DataType.CONCEPT:
        return { type: 'Container', action: 'appears', position };
      default:
        return { type: 'Service', action: 'appears', position };
    }
  }

  /**
   * Convert visual segments to illustration frames
   */
  private segmentsToFrames(segments: VisualSegment[], totalDuration: number): IllustrationFrame[] {
    const frames: IllustrationFrame[] = [];
    const entityRegistry = new Map<string, VisualEntity>(); // Track entities across frames

    segments.forEach((segment, segmentIdx) => {
      const frameEntities: VisualEntity[] = [];

      segment.entities.forEach((entityDef, entityIdx) => {
        const entityKey = `${entityDef.type}-${entityDef.position || 'center'}`;

        let entity = entityRegistry.get(entityKey);

        if (!entity) {
          // Create new entity
          entity = this.createEntity(
            entityDef.type,
            entityDef.label || entityDef.type,
            this.getPositionCoordinates(entityDef.position || 'center', segmentIdx, entityIdx),
          );
          entityRegistry.set(entityKey, entity);
        } else {
          // Entity already exists, update if needed
          if (entityDef.action.includes('highlight')) {
            entity = { ...entity, highlight: true };
          }
        }

        frameEntities.push(entity);
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

    return frames;
  }

  /**
   * Create a visual entity
   */
  private createEntity(
    type: VisualEntityType,
    label: string,
    position: { x: number; y: number },
  ): VisualEntity {

    const sizeMap: Record<VisualEntityType, { width: number; height: number }> = {
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
    };

    return {
      id: `entity-${uuid().slice(0, 8)}`,
      type,
      position,
      size: sizeMap[type] || { width: 100, height: 80 },
      label,
      animation: {
        type: 'fadeIn',
        duration: 500,
        delay: 0,
      },
    };
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

    return {
      x: Math.max(10, Math.min(90, base.x + offsetX)),
      y: Math.max(10, Math.min(90, base.y + offsetY)),
    };
  }
}
