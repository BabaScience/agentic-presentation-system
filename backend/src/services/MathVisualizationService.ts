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
      'parametric',
      'implicit',
      'ellipse',
      'hyperbola',
      'parabola',
      'conic',
      'lissajous',
      'cycloid',
      'polar',
      'curve',
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
    type: 'equation' | 'function' | 'geometric' | 'calculus' | 'linear_algebra' | 'parametric' | 'implicit';
    latex?: string;
    components: MathComponent[];
    interactive?: boolean;
  } | null> {
    const prompt = `Analyze this narration for mathematical content and determine how to visualize it.

Narration: "${narration}"
Context: "${context}"

If mathematical visualization is appropriate, extract:
1. Type (equation, function, geometric, calculus, linear_algebra, parametric, implicit)
2. LaTeX representation of the main equation/formula
3. Components to visualize (equation, graph, shape, parametric_curve, implicit_curve, etc.)
4. Animation steps if applicable

Return JSON:
{
  "needsMathViz": true/false,
  "type": "equation" | "function" | "calculus" | "parametric" | "implicit" | etc.,
  "latex": "LaTeX string of main equation",
  "components": [
    {
      "type": "equation" | "graph" | "integral" | "parametric_curve" | "implicit_curve",
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
- "parametric curve x = cos(t), y = sin(t)" → parametric with type "parametric_curve", data: { xExpression: "cos(t)", yExpression: "sin(t)", tRange: [0, 6.283] }
- "ellipse x²/4 + y²/9 = 1" → implicit with type "implicit_curve", data: { expression: "x*x/4 + y*y/9 - 1", xRange: [-3, 3], yRange: [-4, 4] }

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
   * Generate parametric curve visualization: x(t), y(t) over a parameter range.
   * Supports circles, ellipses, Lissajous figures, cycloids, spirals, etc.
   */
  generateParametricPlot(
    xExpression: string,
    yExpression: string,
    tRange: [number, number] = [0, 2 * Math.PI],
    options?: {
      label?: string;
      numPoints?: number;
    },
  ): MathVisualization {
    const components: MathComponent[] = [];
    const numPoints = options?.numPoints ?? 200;
    const label = options?.label ?? `x(t) = ${xExpression},\\; y(t) = ${yExpression}`;

    // LaTeX label for the parametric equations
    components.push({
      type: 'equation',
      data: {
        latex: `\\begin{cases} x(t) = ${this.toLatex(xExpression)} \\\\ y(t) = ${this.toLatex(yExpression)} \\end{cases},\\quad t \\in [${tRange[0].toFixed(2)},\\, ${tRange[1].toFixed(2)}]`,
      },
      position: { x: 50, y: 10 },
      animation: { type: 'highlight', steps: [], duration: 500 },
    });

    // Evaluate the parametric curve
    const points = this.evaluateParametric(xExpression, yExpression, tRange, numPoints);

    components.push({
      type: 'graph',
      data: {
        points,
        parametric: true,
        color: '#e040fb',
        thickness: 2,
      },
      position: { x: 50, y: 50 },
      animation: { type: 'draw', steps: points, duration: 2500 },
    });

    return {
      id: uuid(),
      type: 'function',
      latex: label,
      components,
      interactive: true,
    };
  }

  /**
   * Generate implicit function visualization: F(x, y) = 0.
   * Uses a marching-squares algorithm to trace the zero-contour.
   * Supports conic sections (ellipses, hyperbolas, parabolas), circles, etc.
   */
  generateImplicitPlot(
    expression: string,
    xRange: [number, number] = [-5, 5],
    yRange: [number, number] = [-5, 5],
    options?: {
      label?: string;
      resolution?: number;
    },
  ): MathVisualization {
    const components: MathComponent[] = [];
    const resolution = options?.resolution ?? 80;
    const label = options?.label ?? `${expression} = 0`;

    // LaTeX label
    components.push({
      type: 'equation',
      data: { latex: this.toLatex(label) },
      position: { x: 50, y: 10 },
      animation: { type: 'highlight', steps: [], duration: 500 },
    });

    // Marching squares to find contour segments
    const segments = this.marchingSquares(expression, xRange, yRange, resolution);

    // Flatten segments into a points array for the graph component
    const points: Array<{ x: number; y: number }> = [];
    for (const seg of segments) {
      points.push(seg.start, seg.end);
    }

    components.push({
      type: 'graph',
      data: {
        points,
        segments,
        implicit: true,
        color: '#ff9100',
        thickness: 2,
      },
      position: { x: 50, y: 50 },
      animation: { type: 'draw', steps: points, duration: 2000 },
    });

    return {
      id: uuid(),
      type: 'function',
      latex: this.toLatex(label),
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

  /**
   * Evaluate a parametric curve x(t), y(t) over [tMin, tMax]
   */
  private evaluateParametric(
    xExpr: string,
    yExpr: string,
    tRange: [number, number],
    numPoints: number,
  ): Array<{ x: number; y: number }> {
    const [tMin, tMax] = tRange;
    const step = (tMax - tMin) / numPoints;
    const result: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = tMin + i * step;
      try {
        const xVal = this.safeEvalParam(xExpr, t);
        const yVal = this.safeEvalParam(yExpr, t);
        if (isFinite(xVal) && isFinite(yVal)) {
          result.push({ x: xVal, y: yVal });
        }
      } catch {
        // Skip invalid points
      }
    }

    return result;
  }

  /**
   * Evaluate an expression with parameter t substituted
   */
  private safeEvalParam(expression: string, t: number): number {
    const sanitized = expression
      .replace(/\bt\b/g, `(${t})`)
      .replace(/\^/g, '**')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/abs/g, 'Math.abs')
      .replace(/exp/g, 'Math.exp')
      .replace(/log/g, 'Math.log')
      .replace(/pi/gi, 'Math.PI');

    try {
      const func = new Function('Math', `return ${sanitized}`);
      return func(Math);
    } catch {
      return NaN;
    }
  }

  /**
   * Evaluate F(x, y) for an implicit function
   */
  private safeEval2D(expression: string, x: number, y: number): number {
    const sanitized = expression
      .replace(/\bx\b/g, `(${x})`)
      .replace(/\by\b/g, `(${y})`)
      .replace(/\^/g, '**')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/abs/g, 'Math.abs')
      .replace(/exp/g, 'Math.exp')
      .replace(/log/g, 'Math.log')
      .replace(/pi/gi, 'Math.PI');

    try {
      const func = new Function('Math', `return ${sanitized}`);
      return func(Math);
    } catch {
      return NaN;
    }
  }

  /**
   * Marching squares algorithm for tracing the zero-contour of F(x,y) = 0.
   * Returns an array of line segments that approximate the contour.
   */
  private marchingSquares(
    expression: string,
    xRange: [number, number],
    yRange: [number, number],
    resolution: number,
  ): Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const dx = (xMax - xMin) / resolution;
    const dy = (yMax - yMin) / resolution;

    // Pre-compute the grid of F(x,y) values
    const grid: number[][] = [];
    for (let j = 0; j <= resolution; j++) {
      const row: number[] = [];
      for (let i = 0; i <= resolution; i++) {
        const gx = xMin + i * dx;
        const gy = yMin + j * dy;
        row.push(this.safeEval2D(expression, gx, gy));
      }
      grid.push(row);
    }

    const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];

    // Walk each cell and classify its corners
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        const x0 = xMin + i * dx;
        const y0 = yMin + j * dy;

        const bl = grid[j][i];       // bottom-left
        const br = grid[j][i + 1];   // bottom-right
        const tr = grid[j + 1][i + 1]; // top-right
        const tl = grid[j + 1][i];   // top-left

        // Classify corners: 1 if positive, 0 if negative/zero
        const cellCase =
          (bl > 0 ? 1 : 0) |
          (br > 0 ? 2 : 0) |
          (tr > 0 ? 4 : 0) |
          (tl > 0 ? 8 : 0);

        if (cellCase === 0 || cellCase === 15) continue; // fully inside or outside

        // Linear interpolation helper
        const lerp = (v1: number, v2: number, f1: number, f2: number): number => {
          if (Math.abs(f1 - f2) < 1e-12) return (v1 + v2) / 2;
          return v1 + (v2 - v1) * (-f1 / (f2 - f1));
        };

        // Edge midpoints via interpolation
        const bottom = { x: lerp(x0, x0 + dx, bl, br), y: y0 };
        const right  = { x: x0 + dx, y: lerp(y0, y0 + dy, br, tr) };
        const top    = { x: lerp(x0, x0 + dx, tl, tr), y: y0 + dy };
        const left   = { x: x0, y: lerp(y0, y0 + dy, bl, tl) };

        // Lookup table for the 16 marching squares cases
        switch (cellCase) {
          case 1:  case 14: segments.push({ start: bottom, end: left });   break;
          case 2:  case 13: segments.push({ start: right,  end: bottom }); break;
          case 3:  case 12: segments.push({ start: right,  end: left });   break;
          case 4:  case 11: segments.push({ start: top,    end: right });  break;
          case 5:
            segments.push({ start: bottom, end: right });
            segments.push({ start: top, end: left });
            break;
          case 6:  case 9:  segments.push({ start: top,    end: bottom }); break;
          case 7:  case 8:  segments.push({ start: top,    end: left });   break;
          case 10:
            segments.push({ start: bottom, end: left });
            segments.push({ start: top, end: right });
            break;
        }
      }
    }

    return segments;
  }
}
