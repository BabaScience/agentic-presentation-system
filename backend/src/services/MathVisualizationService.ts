/* ═══════════════════════════════════════════════════════════════
   Math Visualization Service

   Generates mathematical visualizations including equations, function
   plots, geometric proofs, and step-by-step solutions. Supports LaTeX
   rendering, calculus animations, and linear algebra visualizations.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type MathVisualization,
  type MathComponent,
  type FunctionPlot,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class MathVisualizationService {
  /**
   * Analyze narration and generate appropriate math visualization
   */
  async generateVisualization(
    narration: string,
    context: string,
  ): Promise<MathVisualization | null> {
    // Detect if math visualization is needed
    if (!this.needsMathVisualization(narration)) {
      return null;
    }

    // Use Claude to extract mathematical content
    const mathSpec = await this.analyzeForMath(narration, context);
    if (!mathSpec) {
      return null;
    }

    return {
      id: uuid(),
      type: mathSpec.type,
      latex: mathSpec.latex,
      components: mathSpec.components,
      interactive: mathSpec.interactive || false,
    };
  }

  /**
   * Detect if narration contains mathematical content
   */
  private needsMathVisualization(narration: string): boolean {
    const mathKeywords = [
      'equation',
      'formula',
      'function',
      'integral',
      'derivative',
      'matrix',
      'vector',
      'graph',
      'plot',
      'theorem',
      'proof',
      'calculate',
      '=',
      '+',
      '-',
      '*',
      '/',
      '^',
      'sqrt',
      'sum',
      'product',
    ];

    return mathKeywords.some((keyword) =>
      new RegExp(keyword, 'i').test(narration),
    );
  }

  /**
   * Use Claude to analyze and extract mathematical content
   */
  private async analyzeForMath(
    narration: string,
    context: string,
  ): Promise<{
    type: 'equation' | 'function' | 'geometric' | 'calculus' | 'linear_algebra';
    latex?: string;
    components: MathComponent[];
    interactive?: boolean;
  } | null> {
    const prompt = `Analyze this narration for mathematical content and determine how to visualize it.

Narration: "${narration}"
Context: "${context}"

If mathematical visualization is appropriate, extract:
1. Type (equation, function, geometric, calculus, linear_algebra)
2. LaTeX representation of the main equation/formula
3. Components to visualize (equation, graph, shape, etc.)
4. Animation steps if applicable

Return JSON:
{
  "needsMathViz": true/false,
  "type": "equation" | "function" | "calculus" | etc.,
  "latex": "LaTeX string of main equation",
  "components": [
    {
      "type": "equation" | "graph" | "integral",
      "data": { ... },
      "position": { "x": 50, "y": 30 }
    }
  ],
  "interactive": true/false
}

Examples:
- "f(x) = x²" → function plot with equation
- "integral from 0 to 5 of x²" → calculus with area visualization
- "matrix multiplication" → linear algebra with matrix visualization

If no math visualization needed, return { "needsMathViz": false }`;

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

      if (!result.needsMathViz) {
        return null;
      }

      return {
        type: result.type,
        latex: result.latex,
        components: result.components || [],
        interactive: result.interactive,
      };
    } catch (error) {
      console.error('[MathViz] Analysis error:', error);
      return null;
    }
  }

  /**
   * Generate function plot visualization
   */
  generateFunctionPlot(
    expression: string,
    domain: [number, number] = [-10, 10],
    options?: {
      derivative?: boolean;
      integral?: { from: number; to: number };
    },
  ): MathVisualization {
    const components: MathComponent[] = [];

    // Main equation
    components.push({
      type: 'equation',
      data: { latex: `f(x) = ${this.toLatex(expression)}` },
      position: { x: 50, y: 10 },
      animation: {
        type: 'highlight',
        steps: [],
        duration: 500,
      },
    });

    // Function graph
    const points = this.evaluateFunction(expression, domain, 100);
    components.push({
      type: 'graph',
      data: {
        points,
        domain,
        color: '#2196f3',
        thickness: 2,
      },
      position: { x: 50, y: 50 },
      animation: {
        type: 'draw',
        steps: points,
        duration: 2000,
      },
    });

    // Integral area if requested
    if (options?.integral) {
      const { from, to } = options.integral;
      const integralPoints = this.evaluateFunction(expression, [from, to], 50);

      components.push({
        type: 'integral',
        data: {
          points: integralPoints,
          from,
          to,
          fill: '#2196f333',
        },
        position: { x: 50, y: 50 },
        animation: {
          type: 'draw',
          steps: integralPoints,
          duration: 1500,
        },
      });

      // Integral value
      const integralValue = this.approximateIntegral(expression, from, to);
      components.push({
        type: 'equation',
        data: {
          latex: `\\int_{${from}}^{${to}} f(x)\\,dx \\approx ${integralValue.toFixed(2)}`,
        },
        position: { x: 50, y: 85 },
        animation: {
          type: 'highlight',
          steps: [],
          duration: 500,
        },
      });
    }

    return {
      id: uuid(),
      type: 'function',
      latex: `f(x) = ${this.toLatex(expression)}`,
      components,
      interactive: true,
    };
  }

  /**
   * Generate step-by-step equation solving visualization
   */
  generateEquationSolving(
    equation: string,
    steps: Array<{ step: string; explanation: string }>,
  ): MathVisualization {
    const components: MathComponent[] = [];

    // Original equation
    components.push({
      type: 'equation',
      data: { latex: equation },
      position: { x: 50, y: 20 },
      animation: {
        type: 'highlight',
        steps: [],
        duration: 500,
      },
    });

    // Solution steps
    steps.forEach((step, index) => {
      components.push({
        type: 'equation',
        data: {
          latex: step.step,
          explanation: step.explanation,
        },
        position: { x: 50, y: 30 + index * 12 },
        animation: {
          type: 'highlight',
          steps: [],
          duration: 500,
        },
      });
    });

    return {
      id: uuid(),
      type: 'equation',
      latex: equation,
      components,
      interactive: false,
    };
  }

  /**
   * Generate matrix visualization
   */
  generateMatrixVisualization(
    matrix: number[][],
    operation?: string,
    resultMatrix?: number[][],
  ): MathVisualization {
    const components: MathComponent[] = [];

    // Original matrix
    const matrixLatex = this.matrixToLatex(matrix);
    components.push({
      type: 'matrix',
      data: { matrix, latex: matrixLatex },
      position: { x: 30, y: 50 },
      animation: {
        type: 'highlight',
        steps: [],
        duration: 600,
      },
    });

    // Operation and result
    if (operation && resultMatrix) {
      // Operation symbol
      components.push({
        type: 'equation',
        data: { latex: operation },
        position: { x: 50, y: 50 },
        animation: {
          type: 'highlight',
          steps: [],
          duration: 400,
        },
      });

      // Result matrix
      const resultLatex = this.matrixToLatex(resultMatrix);
      components.push({
        type: 'matrix',
        data: { matrix: resultMatrix, latex: resultLatex },
        position: { x: 70, y: 50 },
        animation: {
          type: 'transform',
          steps: [],
          duration: 1000,
        },
      });
    }

    return {
      id: uuid(),
      type: 'linear_algebra',
      components,
      interactive: true,
    };
  }

  /**
   * Generate geometric proof visualization
   */
  generateGeometricProof(
    theorem: string,
    shapes: Array<{
      type: 'circle' | 'rectangle' | 'triangle' | 'line';
      points?: Array<{ x: number; y: number }>;
      radius?: number;
    }>,
  ): MathVisualization {
    const components: MathComponent[] = [];

    // Theorem statement
    components.push({
      type: 'equation',
      data: { latex: theorem },
      position: { x: 50, y: 10 },
      animation: {
        type: 'highlight',
        steps: [],
        duration: 500,
      },
    });

    // Geometric shapes
    shapes.forEach((shape, index) => {
      components.push({
        type: 'shape',
        data: shape,
        position: { x: 50, y: 50 },
        animation: {
          type: 'draw',
          steps: [],
          duration: 800,
        },
      });
    });

    return {
      id: uuid(),
      type: 'geometric',
      latex: theorem,
      components,
      interactive: true,
    };
  }

  /**
   * Convert expression to LaTeX
   */
  private toLatex(expression: string): string {
    return expression
      .replace(/\^/g, '^')
      .replace(/\*/g, '\\cdot ')
      .replace(/sqrt\((.*?)\)/g, '\\sqrt{$1}')
      .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
  }

  /**
   * Convert matrix to LaTeX
   */
  private matrixToLatex(matrix: number[][]): string {
    const rows = matrix
      .map((row) => row.join(' & '))
      .join(' \\\\ ');
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
  }

  /**
   * Evaluate function at points
   */
  private evaluateFunction(
    expression: string,
    domain: [number, number],
    points: number,
  ): Array<{ x: number; y: number }> {
    const [min, max] = domain;
    const step = (max - min) / points;
    const result: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      try {
        // Simple expression evaluation (use math.js in production)
        const y = this.safeEval(expression.replace(/x/g, `(${x})`));
        result.push({ x, y });
      } catch (error) {
        // Skip invalid points
      }
    }

    return result;
  }

  /**
   * Safe expression evaluation (simplified)
   */
  private safeEval(expression: string): number {
    // Replace common math functions
    const sanitized = expression
      .replace(/\^/g, '**')
      .replace(/sqrt/g, 'Math.sqrt');

    try {
      // Use Function constructor for safer eval
      const func = new Function('Math', `return ${sanitized}`);
      return func(Math);
    } catch (error) {
      return NaN;
    }
  }

  /**
   * Approximate integral using trapezoidal rule
   */
  private approximateIntegral(
    expression: string,
    from: number,
    to: number,
    intervals: number = 100,
  ): number {
    const h = (to - from) / intervals;
    let sum = 0;

    for (let i = 0; i <= intervals; i++) {
      const x = from + i * h;
      const y = this.safeEval(expression.replace(/x/g, `(${x})`));

      if (i === 0 || i === intervals) {
        sum += y;
      } else {
        sum += 2 * y;
      }
    }

    return (h / 2) * sum;
  }
}
