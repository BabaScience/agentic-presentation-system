/* ═══════════════════════════════════════════════════════════════
   Multimodal Input Service

   Processes images, screenshots, sketches, and PDFs using Claude
   Vision API. Extracts diagrams, interprets hand-drawn content,
   and converts visual inputs into structured presentations.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type MultimodalInput,
  type ImageAnalysis,
  type SketchInterpretation,
  type PDFProcessing,
  type DiagramExtraction,
  type KnowledgeGraph,
  type KGNode,
  type KGEdge,
  DataType,
  EdgeType,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class MultimodalInputService {
  /**
   * Analyze image and extract concepts
   */
  async analyzeImage(
    imageData: string,
    mimeType: string,
    context?: string,
  ): Promise<ImageAnalysis> {
    const prompt = `Analyze this image and extract key concepts, relationships, and visual elements.

${context ? `Context: ${context}` : ''}

Provide a structured analysis:
1. Main subject/topic
2. Key concepts visible
3. Relationships between elements
4. Technical details (if any)
5. Suggested presentation structure

Return as JSON:
{
  "topic": "Main topic",
  "concepts": [{"label": "concept", "description": "..."}],
  "relationships": [{"from": "A", "to": "B", "type": "relationship"}],
  "visualElements": ["element1", "element2"],
  "technicalDetails": ["detail1", "detail2"],
  "isDiagram": true/false,
  "diagramType": "flowchart/architecture/network/class/etc",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_REASONING || 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        id: uuid(),
        topic: result.topic,
        concepts: result.concepts || [],
        relationships: result.relationships || [],
        visualElements: result.visualElements || [],
        technicalDetails: result.technicalDetails || [],
        isDiagram: result.isDiagram || false,
        diagramType: result.diagramType,
        confidence: result.confidence || 0.8,
        extractedText: '',
        suggestedKnowledgeGraph: await this.convertToKnowledgeGraph(result),
      };
    } catch (error) {
      console.error('[MultimodalInput] Image analysis error:', error);
      throw error;
    }
  }

  /**
   * Interpret hand-drawn sketch
   */
  async interpretSketch(
    sketchData: string,
    mimeType: string,
  ): Promise<SketchInterpretation> {
    const prompt = `This is a hand-drawn sketch or diagram. Interpret what it represents and convert it to a structured format.

Analyze:
1. What type of diagram is this? (flowchart, mind map, architecture, process, etc.)
2. What are the main elements/nodes?
3. What are the connections/relationships?
4. What labels or text are visible?
5. What is the overall purpose or message?

Return as JSON:
{
  "diagramType": "type",
  "elements": [{"id": "1", "type": "box/circle/etc", "label": "text", "position": {"x": 0-100, "y": 0-100}}],
  "connections": [{"from": "id1", "to": "id2", "label": "relationship"}],
  "interpretation": "Overall interpretation",
  "cleanedDiagram": "Description of how to draw this cleanly",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_REASONING || 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: sketchData,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        id: uuid(),
        diagramType: result.diagramType || 'unknown',
        elements: result.elements || [],
        connections: result.connections || [],
        interpretation: result.interpretation || '',
        cleanedDiagram: result.cleanedDiagram || '',
        confidence: result.confidence || 0.7,
        suggestedVisualSpec: this.convertSketchToVisualSpec(result),
      };
    } catch (error) {
      console.error('[MultimodalInput] Sketch interpretation error:', error);
      throw error;
    }
  }

  /**
   * Process PDF document
   */
  async processPDF(
    pdfPages: Array<{ pageNumber: number; imageData: string }>,
    mimeType: string = 'image/png',
  ): Promise<PDFProcessing> {
    const summaries: Array<{ pageNumber: number; summary: string; keyPoints: string[] }> = [];
    const allConcepts: string[] = [];

    // Process first 5 pages (or all if less than 5)
    const pagesToProcess = pdfPages.slice(0, Math.min(5, pdfPages.length));

    for (const page of pagesToProcess) {
      const prompt = `Analyze this PDF page and extract key information.

Provide:
1. Page summary (2-3 sentences)
2. Key points or concepts (bullet points)
3. Important technical terms
4. Diagrams or figures (if any)

Return as JSON:
{
  "summary": "Brief summary",
  "keyPoints": ["point1", "point2"],
  "technicalTerms": ["term1", "term2"],
  "hasDiagrams": true/false
}`;

      try {
        const response = await anthropic.messages.create({
          model: process.env.AGENT_MODEL_REASONING || 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType as any,
                    data: page.imageData,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            summaries.push({
              pageNumber: page.pageNumber,
              summary: result.summary || '',
              keyPoints: result.keyPoints || [],
            });
            allConcepts.push(...(result.technicalTerms || []));
          }
        }
      } catch (error) {
        console.error(`[MultimodalInput] PDF page ${page.pageNumber} error:`, error);
      }
    }

    // Generate overall summary
    const overallSummary = await this.generateDocumentSummary(summaries);

    return {
      id: uuid(),
      pageCount: pdfPages.length,
      processedPages: summaries.length,
      overallSummary,
      pageSummaries: summaries,
      extractedConcepts: Array.from(new Set(allConcepts)),
      suggestedPresentation: this.generatePresentationStructure(summaries),
    };
  }

  /**
   * Extract diagram from screenshot
   */
  async extractDiagram(
    imageData: string,
    mimeType: string,
  ): Promise<DiagramExtraction> {
    const prompt = `This image contains a diagram or architecture. Extract its structure.

Identify:
1. Diagram type (architecture, flowchart, sequence, class, network, etc.)
2. All nodes/components with their labels
3. All connections/relationships
4. Layers or groupings (if any)
5. Data flow direction

Return as JSON:
{
  "type": "diagram type",
  "nodes": [{"id": "1", "label": "Component A", "type": "Server/Database/etc"}],
  "edges": [{"source": "1", "target": "2", "label": "HTTP/API/etc"}],
  "layers": [{"name": "Frontend", "nodeIds": ["1", "2"]}],
  "dataFlow": "left-to-right/top-to-bottom/etc"
}`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_REASONING || 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as any,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        id: uuid(),
        type: result.type || 'unknown',
        nodes: result.nodes || [],
        edges: result.edges || [],
        layers: result.layers || [],
        dataFlow: result.dataFlow || 'left-to-right',
        reconstructedKnowledgeGraph: await this.diagramToKnowledgeGraph(result),
      };
    } catch (error) {
      console.error('[MultimodalInput] Diagram extraction error:', error);
      throw error;
    }
  }

  /**
   * Convert image analysis to knowledge graph
   */
  private async convertToKnowledgeGraph(
    analysis: any,
  ): Promise<KnowledgeGraph> {
    const graph: KnowledgeGraph = {
      sessionId: uuid(),
      rootNodeId: '',
      nodes: {},
      edges: {},
      maxDepth: 1,
      nodeLimit: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create nodes from concepts
    analysis.concepts?.forEach((concept: any, index: number) => {
      const nodeId = `node-${index}`;

      if (index === 0) {
        graph.rootNodeId = nodeId;
      }

      const node: KGNode = {
        id: nodeId,
        label: concept.label || 'Unknown',
        type: DataType.CONCEPT,
        depth: 0,
        content: concept.description || '',
        narration: `This is ${concept.label}. ${concept.description || ''}`,
        visual: {
          elementType: 'box' as any,
          x: 50,
          y: 50,
          width: 120,
          height: 100,
          style: { fill: '#2196f3', stroke: '#1976d2', strokeWidth: 2 },
          animation: { type: 'fadeIn', duration: 500, delay: 0 },
        },
        rlRelevanceScore: 1.0,
        isExpanded: false,
        isPresented: false,
        parentId: null,
        metadata: {},
        createdAt: Date.now(),
      };

      graph.nodes[nodeId] = node;
    });

    // Create edges from relationships
    analysis.relationships?.forEach((rel: any, index: number) => {
      const sourceNode = Object.values(graph.nodes).find(
        (n: any) => n.label === rel.from,
      ) as KGNode | undefined;
      const targetNode = Object.values(graph.nodes).find(
        (n: any) => n.label === rel.to,
      ) as KGNode | undefined;

      if (sourceNode && targetNode) {
        const edge: KGEdge = {
          id: `edge-${index}`,
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          label: rel.type || 'relates to',
          type: EdgeType.RELATES_TO,
          weight: 1.0,
          isPresented: false,
        };

        graph.edges[edge.id] = edge;
      }
    });

    return graph;
  }

  /**
   * Convert sketch to visual spec
   */
  private convertSketchToVisualSpec(sketchResult: any): any {
    return {
      entities: sketchResult.elements?.map((el: any) => ({
        id: el.id,
        type: this.inferEntityType(el.type),
        label: el.label || '',
        position: el.position || { x: 50, y: 50 },
      })) || [],
      connections: sketchResult.connections?.map((conn: any) => ({
        id: uuid(),
        sourceId: conn.from,
        targetId: conn.to,
        label: conn.label || '',
      })) || [],
    };
  }

  /**
   * Convert diagram to knowledge graph
   */
  private async diagramToKnowledgeGraph(
    diagram: any,
  ): Promise<KnowledgeGraph> {
    const graph: KnowledgeGraph = {
      sessionId: uuid(),
      rootNodeId: '',
      nodes: {},
      edges: {},
      maxDepth: 1,
      nodeLimit: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create nodes
    diagram.nodes?.forEach((diagramNode: any, index: number) => {
      const nodeId = diagramNode.id || `node-${index}`;

      if (index === 0) {
        graph.rootNodeId = nodeId;
      }

      const node: KGNode = {
        id: nodeId,
        label: diagramNode.label || 'Component',
        type: this.inferDataType(diagramNode.type),
        depth: 0,
        content: `${diagramNode.type}: ${diagramNode.label}`,
        narration: `This is ${diagramNode.label}, a ${diagramNode.type} component.`,
        visual: {
          elementType: 'box' as any,
          x: 50,
          y: 50,
          width: 140,
          height: 120,
          style: { fill: '#00bcd4', stroke: '#0097a7', strokeWidth: 2 },
          animation: { type: 'scaleIn', duration: 600, delay: 0 },
        },
        rlRelevanceScore: 1.0,
        isExpanded: false,
        isPresented: false,
        parentId: null,
        metadata: {},
        createdAt: Date.now(),
      };

      graph.nodes[nodeId] = node;
    });

    // Create edges
    diagram.edges?.forEach((diagramEdge: any, index: number) => {
      const edge: KGEdge = {
        id: `edge-${index}`,
        sourceId: diagramEdge.source,
        targetId: diagramEdge.target,
        label: diagramEdge.label || 'connects to',
        type: EdgeType.CONTAINS,
        weight: 1.0,
        isPresented: false,
      };

      graph.edges[edge.id] = edge;
    });

    return graph;
  }

  /**
   * Generate document summary from page summaries
   */
  private async generateDocumentSummary(
    pageSummaries: Array<{ pageNumber: number; summary: string; keyPoints: string[] }>,
  ): Promise<string> {
    if (pageSummaries.length === 0) {
      return 'No content extracted from document.';
    }

    const combinedText = pageSummaries
      .map((ps) => `Page ${ps.pageNumber}: ${ps.summary}`)
      .join('\n');

    return `Document with ${pageSummaries.length} pages analyzed. ${combinedText.slice(0, 300)}...`;
  }

  /**
   * Generate presentation structure from document
   */
  private generatePresentationStructure(
    pageSummaries: Array<{ pageNumber: number; summary: string; keyPoints: string[] }>,
  ): string[] {
    const structure: string[] = [];

    pageSummaries.forEach((ps) => {
      if (ps.keyPoints.length > 0) {
        structure.push(`Page ${ps.pageNumber}: ${ps.keyPoints[0]}`);
      }
    });

    return structure.slice(0, 5); // Top 5 slides
  }

  /**
   * Helper methods
   */

  private inferEntityType(sketchType: string): string {
    const typeMap: Record<string, string> = {
      box: 'Box',
      circle: 'Circle',
      rectangle: 'Box',
      oval: 'Circle',
      cylinder: 'Database',
      diamond: 'Decision',
    };

    return typeMap[sketchType.toLowerCase()] || 'Box';
  }

  private inferDataType(componentType: string): DataType {
    const type = componentType.toLowerCase();

    if (type.includes('server') || type.includes('api')) return DataType.PROCESS;
    if (type.includes('database') || type.includes('db')) return DataType.RESOURCE;
    if (type.includes('user') || type.includes('client')) return DataType.CONCEPT;
    if (type.includes('service')) return DataType.PROCESS;

    return DataType.CONCEPT;
  }

  /**
   * Batch process multiple images
   */
  async batchProcessImages(
    images: Array<{ data: string; mimeType: string; context?: string }>,
  ): Promise<ImageAnalysis[]> {
    const results: ImageAnalysis[] = [];

    for (const img of images) {
      try {
        const analysis = await this.analyzeImage(
          img.data,
          img.mimeType,
          img.context,
        );
        results.push(analysis);
      } catch (error) {
        console.error('[MultimodalInput] Batch processing error:', error);
      }
    }

    return results;
  }
}
