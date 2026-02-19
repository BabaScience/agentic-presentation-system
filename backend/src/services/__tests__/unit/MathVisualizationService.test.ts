/* ═══════════════════════════════════════════════════════════════
   Math Visualization Service — Unit Tests
   ═══════════════════════════════════════════════════════════════ */

import { MathVisualizationService } from '../../MathVisualizationService';

describe('MathVisualizationService', () => {
  let service: MathVisualizationService;

  beforeEach(() => {
    service = new MathVisualizationService();
  });

  describe('generateFunctionPlot', () => {
    it('should generate function plot with equation', () => {
      const viz = service.generateFunctionPlot('x^2', [-10, 10]);

      expect(viz.type).toBe('function');
      expect(viz.latex).toContain('x^2');
      expect(viz.components).toBeDefined();
      expect(viz.components.length).toBeGreaterThan(0);
    });

    it('should include graph component with points', () => {
      const viz = service.generateFunctionPlot('x^2', [-5, 5]);

      const graphComponent = viz.components.find((c: any) => c.type === 'graph');
      expect(graphComponent).toBeDefined();
      expect(graphComponent?.data.points).toBeDefined();
      expect(graphComponent?.data.points.length).toBeGreaterThan(0);
    });

    it('should include integral visualization when requested', () => {
      const viz = service.generateFunctionPlot('x^2', [-10, 10], {
        integral: { from: 0, to: 5 },
      });

      const integralComponent = viz.components.find((c: any) => c.type === 'integral');
      expect(integralComponent).toBeDefined();

      const integralEquation = viz.components.find(
        (c) => c.type === 'equation' && c.data.latex?.includes('\\int'),
      );
      expect(integralEquation).toBeDefined();
    });

    it('should be marked as interactive', () => {
      const viz = service.generateFunctionPlot('x^2', [-10, 10]);

      expect(viz.interactive).toBe(true);
    });
  });

  describe('generateEquationSolving', () => {
    it('should create step-by-step solution visualization', () => {
      const steps = [
        { step: '2x + 4 = 10', explanation: 'Original equation' },
        { step: '2x = 6', explanation: 'Subtract 4 from both sides' },
        { step: 'x = 3', explanation: 'Divide both sides by 2' },
      ];

      const viz = service.generateEquationSolving('2x + 4 = 10', steps);

      expect(viz.type).toBe('equation');
      expect(viz.latex).toBe('2x + 4 = 10');
      expect(viz.components.length).toBe(4); // Original + 3 steps
    });

    it('should include explanations in components', () => {
      const steps = [
        { step: 'x = 5', explanation: 'Solution' },
      ];

      const viz = service.generateEquationSolving('x = 5', steps);

      const stepComponent = viz.components.find(
        (c) => c.data.explanation === 'Solution',
      );
      expect(stepComponent).toBeDefined();
    });
  });

  describe('generateMatrixVisualization', () => {
    it('should visualize single matrix', () => {
      const matrix = [
        [1, 2],
        [3, 4],
      ];

      const viz = service.generateMatrixVisualization(matrix);

      expect(viz.type).toBe('linear_algebra');
      expect(viz.components).toBeDefined();

      const matrixComponent = viz.components.find((c: any) => c.type === 'matrix');
      expect(matrixComponent).toBeDefined();
      expect(matrixComponent?.data.matrix).toEqual(matrix);
    });

    it('should visualize matrix operation', () => {
      const matrix1 = [
        [1, 2],
        [3, 4],
      ];
      const result = [
        [2, 4],
        [6, 8],
      ];

      const viz = service.generateMatrixVisualization(matrix1, '\\times 2', result);

      expect(viz.components.length).toBe(3); // Matrix + operation + result
    });

    it('should convert matrix to LaTeX format', () => {
      const matrix = [
        [1, 2],
        [3, 4],
      ];

      const viz = service.generateMatrixVisualization(matrix);

      const matrixComponent = viz.components[0];
      expect(matrixComponent.data.latex).toContain('\\begin{bmatrix}');
      expect(matrixComponent.data.latex).toContain('1 & 2');
      expect(matrixComponent.data.latex).toContain('3 & 4');
    });
  });

  describe('generateGeometricProof', () => {
    it('should create geometric proof visualization', () => {
      const theorem = 'Pythagorean Theorem: a^2 + b^2 = c^2';
      const shapes = [
        { type: 'triangle' as const, points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }] },
      ];

      const viz = service.generateGeometricProof(theorem, shapes);

      expect(viz.type).toBe('geometric');
      expect(viz.latex).toBe(theorem);
      expect(viz.components.length).toBeGreaterThan(1);
    });

    it('should include theorem statement', () => {
      const theorem = 'Sum of angles = 180°';
      const viz = service.generateGeometricProof(theorem, []);

      const theoremComponent = viz.components.find(
        (c) => c.type === 'equation',
      );
      expect(theoremComponent?.data.latex).toBe(theorem);
    });
  });

  describe('needsMathVisualization (detection)', () => {
    it('should detect mathematical content', () => {
      const narrations = [
        'Let f(x) = x squared',
        'The integral from 0 to 5',
        'Matrix multiplication example',
        'Plot the function y = 2x + 1',
        'Calculate the derivative',
      ];

      narrations.forEach((narration) => {
        const result = (service as any).needsMathVisualization(narration);
        expect(result).toBe(true);
      });
    });

    it('should not trigger on non-mathematical content', () => {
      const narrations = [
        'This is a simple container',
        'The server handles requests',
        'Deploy the application',
      ];

      narrations.forEach((narration) => {
        const result = (service as any).needsMathVisualization(narration);
        expect(result).toBe(false);
      });
    });
  });
});
