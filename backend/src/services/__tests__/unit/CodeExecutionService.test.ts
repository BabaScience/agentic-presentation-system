/* ═══════════════════════════════════════════════════════════════
   Code Execution Service — Unit Tests
   ═══════════════════════════════════════════════════════════════ */

import { CodeExecutionService } from '../../CodeExecutionService';
import { CodeLanguage } from '../../../../shared/types';

describe('CodeExecutionService', () => {
  let service: CodeExecutionService;

  beforeEach(() => {
    service = new CodeExecutionService();
  });

  describe('executeCode', () => {
    it('should execute JavaScript code successfully', async () => {
      const request = {
        code: 'console.log("Hello, World!");',
        language: CodeLanguage.JAVASCRIPT,
      };

      const result = await service.executeCode(request);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello, World!');
      expect(result.executionTime).toBeGreaterThan(0);
    }, 15000);

    it('should execute Python code successfully', async () => {
      const request = {
        code: 'print("Hello, Python!")',
        language: CodeLanguage.PYTHON,
      };

      const result = await service.executeCode(request);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello, Python!');
    }, 15000);

    it('should handle syntax errors', async () => {
      const request = {
        code: 'console.log("missing quote);',
        language: CodeLanguage.JAVASCRIPT,
      };

      const result = await service.executeCode(request);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.error).toBeTruthy();
    }, 15000);

    it('should respect timeout limits', async () => {
      const request = {
        code: 'while(true) {}',
        language: CodeLanguage.JAVASCRIPT,
        timeout: 2000,
      };

      const result = await service.executeCode(request);

      expect(result.error || result.stderr).toBeTruthy();
      expect(result.executionTime).toBeLessThan(3000);
    }, 15000);

    it('should handle stdin input', async () => {
      const request = {
        code: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => { console.log('Echo:', line); rl.close(); });`,
        language: CodeLanguage.JAVASCRIPT,
        stdin: 'Test Input',
      };

      const result = await service.executeCode(request);

      expect(result.stdout).toContain('Echo: Test Input');
    }, 15000);
  });

  describe('executeWithVisualization', () => {
    it('should generate visualization with debug steps', async () => {
      const request = {
        code: 'let x = 5;\nlet y = 10;\nconsole.log(x + y);',
        language: CodeLanguage.JAVASCRIPT,
      };

      const viz = await service.executeWithVisualization(request, 'test-scene');

      expect(viz.code).toBe(request.code);
      expect(viz.language).toBe(CodeLanguage.JAVASCRIPT);
      expect(viz.steps).toBeDefined();
      expect(viz.steps.length).toBeGreaterThan(0);
      expect(viz.complexity).toBeDefined();
      expect(viz.complexity.time).toBeTruthy();
      expect(viz.complexity.space).toBeTruthy();
    }, 15000);

    it('should analyze complexity correctly', async () => {
      const nestedLoopsCode = `
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    console.log(i, j);
  }
}`;

      const request = {
        code: nestedLoopsCode,
        language: CodeLanguage.JAVASCRIPT,
      };

      const viz = await service.executeWithVisualization(request, 'test-scene');

      expect(viz.complexity.time).toBe('O(n²)');
    }, 15000);
  });

  describe('generateCodeExample', () => {
    it('should generate JavaScript template', async () => {
      const code = await service.generateCodeExample(
        'Array Sorting',
        CodeLanguage.JAVASCRIPT,
      );

      expect(code).toContain('// Array Sorting');
      expect(code).toContain('function');
    });

    it('should generate Python template', async () => {
      const code = await service.generateCodeExample(
        'List Comprehension',
        CodeLanguage.PYTHON,
      );

      expect(code).toContain('# List Comprehension');
      expect(code).toContain('def');
    });
  });

  describe('healthCheck', () => {
    it('should check Docker availability', async () => {
      const isHealthy = await service.healthCheck();

      expect(typeof isHealthy).toBe('boolean');
      // Note: Test may fail if Docker is not installed
    });
  });
});
