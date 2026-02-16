/* ═══════════════════════════════════════════════════════════════
   Data Visualization Service

   Generates dynamic data visualizations from narration content.
   Parses data references, creates appropriate chart types, and
   provides configuration for frontend rendering.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type DataVisualization,
  type ChartConfig,
  ChartType,
  type AxisConfig,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class DataVisualizationService {
  /**
   * Analyze narration and generate appropriate data visualization
   */
  async generateVisualization(
    narration: string,
    context: string,
  ): Promise<DataVisualization | null> {
    // Detect if visualization is needed
    if (!this.needsVisualization(narration)) {
      return null;
    }

    // Use Claude to extract data and determine chart type
    const vizSpec = await this.analyzeForVisualization(narration, context);
    if (!vizSpec) {
      return null;
    }

    return {
      id: uuid(),
      type: vizSpec.type,
      data: vizSpec.data,
      config: vizSpec.config,
      title: vizSpec.title,
      description: vizSpec.description,
      position: { x: 50, y: 50 },
      size: { width: 600, height: 400 },
      animation: {
        type: 'fadeIn',
        duration: 800,
        delay: 200,
      },
    };
  }

  /**
   * Detect if narration contains data that should be visualized
   */
  private needsVisualization(narration: string): boolean {
    const visualizationKeywords = [
      'graph',
      'chart',
      'plot',
      'performance',
      'comparison',
      'trend',
      'distribution',
      'statistics',
      'metric',
      'data',
      'O\\(n',
      'complexity',
      'before and after',
      'increase',
      'decrease',
      'growth',
      'timeline',
    ];

    return visualizationKeywords.some((keyword) =>
      new RegExp(keyword, 'i').test(narration),
    );
  }

  /**
   * Use Claude to analyze narration and extract visualization spec
   */
  private async analyzeForVisualization(
    narration: string,
    context: string,
  ): Promise<{
    type: ChartType;
    data: any;
    config: ChartConfig;
    title?: string;
    description?: string;
  } | null> {
    const prompt = `Analyze this narration and determine if it contains data that should be visualized as a chart.

Narration: "${narration}"
Context: "${context}"

If visualization is appropriate, extract:
1. Chart type (line, bar, scatter, pie, heatmap, etc.)
2. Data points (infer reasonable values if not explicitly stated)
3. Labels and axes
4. Title and description

Return JSON in this format:
{
  "needsVisualization": true/false,
  "type": "line" | "bar" | "scatter" | "pie" | etc.,
  "title": "Chart title",
  "description": "Brief description",
  "data": {
    // Chart-specific data format
    // For line/bar: { labels: [...], datasets: [{ label: "...", data: [...] }] }
    // For pie: { labels: [...], values: [...] }
  },
  "config": {
    "xAxis": { "label": "X axis label" },
    "yAxis": { "label": "Y axis label" }
  }
}

Examples:
- "O(n) is faster than O(n²)" → line chart comparing growth rates
- "Performance improved 3x" → bar chart showing before/after
- "50% users on mobile, 30% desktop, 20% tablet" → pie chart
- "Response time: 100ms, 150ms, 120ms, 90ms" → line chart over time

If no visualization is needed, return { "needsVisualization": false }`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return null;
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!result.needsVisualization) {
        return null;
      }

      return {
        type: result.type as ChartType,
        data: result.data,
        config: result.config || {},
        title: result.title,
        description: result.description,
      };
    } catch (error) {
      console.error('[DataViz] Analysis error:', error);
      return null;
    }
  }

  /**
   * Generate performance comparison chart (O(n) vs O(n²) etc.)
   */
  generateComplexityComparison(
    complexities: string[],
    maxN: number = 100,
  ): DataVisualization {
    const n = Array.from({ length: 50 }, (_, i) => i + 1);

    const datasets = complexities.map((complexity) => {
      const data = n.map((x) => this.evaluateComplexity(complexity, x));
      return {
        label: complexity,
        data,
        borderColor: this.getComplexityColor(complexity),
        backgroundColor: `${this.getComplexityColor(complexity)}33`,
      };
    });

    return {
      id: uuid(),
      type: ChartType.LINE,
      data: {
        labels: n,
        datasets,
      },
      config: {
        xAxis: {
          label: 'Input Size (n)',
          scale: 'linear',
        },
        yAxis: {
          label: 'Operations',
          scale: 'linear',
        },
        legend: {
          show: true,
          position: 'top',
        },
        interactive: true,
        tooltips: true,
      },
      title: 'Time Complexity Comparison',
      description: 'Growth rate comparison of different algorithms',
      position: { x: 50, y: 50 },
      size: { width: 700, height: 400 },
      animation: {
        type: 'fadeIn',
        duration: 1000,
        delay: 300,
      },
    };
  }

  /**
   * Evaluate complexity function for a given n
   */
  private evaluateComplexity(complexity: string, n: number): number {
    const c = complexity.toLowerCase();

    if (c.includes('1') || c === 'o(1)') return 1;
    if (c.includes('log n') || c === 'o(log n)') return Math.log2(n);
    if (c === 'o(n)') return n;
    if (c === 'o(n log n)') return n * Math.log2(n);
    if (c === 'o(n²)' || c === 'o(n^2)') return n * n;
    if (c === 'o(n³)' || c === 'o(n^3)') return n * n * n;
    if (c === 'o(2^n)') return Math.pow(2, Math.min(n, 20)); // Cap for display

    return n; // Default to linear
  }

  /**
   * Get color for complexity class
   */
  private getComplexityColor(complexity: string): string {
    const c = complexity.toLowerCase();

    if (c.includes('1')) return '#00e676'; // Green - constant
    if (c.includes('log')) return '#2196f3'; // Blue - logarithmic
    if (c === 'o(n)') return '#ff9800'; // Orange - linear
    if (c.includes('n log n')) return '#ff5722'; // Deep orange
    if (c.includes('n²') || c.includes('n^2')) return '#f44336'; // Red - quadratic
    if (c.includes('2^n')) return '#9c27b0'; // Purple - exponential

    return '#607d8b'; // Grey - unknown
  }

  /**
   * Generate before/after comparison bar chart
   */
  generateBeforeAfterComparison(
    metric: string,
    beforeValue: number,
    afterValue: number,
    unit?: string,
  ): DataVisualization {
    return {
      id: uuid(),
      type: ChartType.BAR,
      data: {
        labels: ['Before', 'After'],
        datasets: [
          {
            label: metric,
            data: [beforeValue, afterValue],
            backgroundColor: ['#ff5722', '#00e676'],
          },
        ],
      },
      config: {
        yAxis: {
          label: unit || 'Value',
          scale: 'linear',
        },
        legend: {
          show: false,
          position: 'top',
        },
        interactive: true,
        tooltips: true,
      },
      title: `${metric} Comparison`,
      description: `Improvement: ${Math.round(((afterValue - beforeValue) / beforeValue) * 100)}%`,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 350 },
      animation: {
        type: 'slideIn',
        duration: 800,
        delay: 200,
      },
    };
  }

  /**
   * Generate distribution pie chart
   */
  generatePieChart(
    title: string,
    labels: string[],
    values: number[],
  ): DataVisualization {
    return {
      id: uuid(),
      type: ChartType.PIE,
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#2196f3',
              '#00e676',
              '#ff9800',
              '#f44336',
              '#9c27b0',
              '#00bcd4',
            ],
          },
        ],
      },
      config: {
        legend: {
          show: true,
          position: 'right',
        },
        interactive: true,
        tooltips: true,
      },
      title,
      description: `Distribution of ${title.toLowerCase()}`,
      position: { x: 50, y: 50 },
      size: { width: 500, height: 400 },
      animation: {
        type: 'scaleIn',
        duration: 600,
        delay: 0,
      },
    };
  }

  /**
   * Generate time series line chart
   */
  generateTimeSeries(
    title: string,
    timestamps: number[],
    values: number[],
    label: string,
  ): DataVisualization {
    return {
      id: uuid(),
      type: ChartType.TIMESERIES,
      data: {
        labels: timestamps.map((t) => new Date(t).toISOString()),
        datasets: [
          {
            label,
            data: values,
            borderColor: '#2196f3',
            backgroundColor: '#2196f333',
            fill: true,
          },
        ],
      },
      config: {
        xAxis: {
          label: 'Time',
          scale: 'time',
        },
        yAxis: {
          label,
          scale: 'linear',
        },
        legend: {
          show: true,
          position: 'top',
        },
        interactive: true,
        zoomable: true,
        tooltips: true,
      },
      title,
      description: `${label} over time`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 350 },
      animation: {
        type: 'fadeIn',
        duration: 800,
        delay: 400,
      },
    };
  }

  /**
   * Generate network graph visualization
   */
  generateNetworkGraph(
    nodes: Array<{ id: string; label: string }>,
    edges: Array<{ from: string; to: string; label?: string }>,
  ): DataVisualization {
    return {
      id: uuid(),
      type: ChartType.NETWORK,
      data: {
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.label,
          size: 20,
        })),
        edges: edges.map((e, i) => ({
          id: `edge-${i}`,
          from: e.from,
          to: e.to,
          label: e.label || '',
          arrows: 'to',
        })),
      },
      config: {
        interactive: true,
        legend: {
          show: false,
          position: 'top',
        },
      },
      title: 'Network Topology',
      description: 'Relationship graph',
      position: { x: 50, y: 50 },
      size: { width: 800, height: 600 },
      animation: {
        type: 'fadeIn',
        duration: 1000,
        delay: 200,
      },
    };
  }
}
