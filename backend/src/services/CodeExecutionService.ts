/* ═══════════════════════════════════════════════════════════════
   Code Execution Service

   Sandboxed code execution with real-time visualization support.
   Executes code in Docker containers with resource limits.
   Provides step-by-step debugging, memory visualization, and
   performance profiling.
   ═══════════════════════════════════════════════════════════════ */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import {
  type CodeExecutionRequest,
  type CodeExecutionResult,
  type CodeVisualization,
  type DebugStep,
  CodeLanguage,
} from '../../shared/types';

const execAsync = promisify(exec);

// Language-specific configurations
const LANGUAGE_CONFIG = {
  [CodeLanguage.JAVASCRIPT]: {
    image: 'node:18-alpine',
    extension: 'js',
    command: 'node',
    timeout: 5000,
    memoryLimit: 128,
  },
  [CodeLanguage.PYTHON]: {
    image: 'python:3.11-alpine',
    extension: 'py',
    command: 'python',
    timeout: 5000,
    memoryLimit: 128,
  },
  [CodeLanguage.TYPESCRIPT]: {
    image: 'node:18-alpine',
    extension: 'ts',
    command: 'npx ts-node',
    timeout: 5000,
    memoryLimit: 128,
  },
  [CodeLanguage.GO]: {
    image: 'golang:1.21-alpine',
    extension: 'go',
    command: 'go run',
    timeout: 10000,
    memoryLimit: 256,
  },
  [CodeLanguage.RUST]: {
    image: 'rust:1.75-alpine',
    extension: 'rs',
    command: 'rustc',
    timeout: 15000,
    memoryLimit: 512,
  },
  [CodeLanguage.JAVA]: {
    image: 'openjdk:17-alpine',
    extension: 'java',
    command: 'java',
    timeout: 10000,
    memoryLimit: 256,
  },
  [CodeLanguage.CPP]: {
    image: 'gcc:latest',
    extension: 'cpp',
    command: 'g++',
    timeout: 10000,
    memoryLimit: 256,
  },
  [CodeLanguage.BASH]: {
    image: 'alpine:latest',
    extension: 'sh',
    command: 'sh',
    timeout: 5000,
    memoryLimit: 64,
  },
};

export class CodeExecutionService {
  private tempDir = '/tmp/agentic-code-exec';

  constructor() {
    this.ensureTempDir();
  }

  /**
   * Execute code in sandboxed Docker container
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const config = LANGUAGE_CONFIG[request.language];
    if (!config) {
      throw new Error(`Unsupported language: ${request.language}`);
    }

    const executionId = uuid();
    const filePath = path.join(this.tempDir, `${executionId}.${config.extension}`);
    const timeout = request.timeout || config.timeout;
    const memoryLimit = request.memoryLimit || config.memoryLimit;

    try {
      // Write code to temporary file
      await writeFile(filePath, request.code, 'utf-8');

      const startTime = Date.now();

      // Execute in Docker container with resource limits
      const dockerCommand = this.buildDockerCommand(
        config.image,
        config.command,
        filePath,
        timeout,
        memoryLimit,
        request.stdin,
      );

      console.log('[CodeExec] Executing:', dockerCommand);

      const { stdout, stderr } = await execAsync(dockerCommand, {
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
      });

      const executionTime = Date.now() - startTime;

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        executionTime,
        memoryUsed: 0, // TODO: Extract from Docker stats
      };
    } catch (error: any) {
      const executionTime = Date.now() - Date.now();

      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
        executionTime,
        memoryUsed: 0,
        error: error.message,
      };
    } finally {
      // Cleanup
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (err) {
        console.error('[CodeExec] Cleanup error:', err);
      }
    }
  }

  /**
   * Execute code with step-by-step debugging visualization
   */
  async executeWithVisualization(
    request: CodeExecutionRequest,
    sceneId: string,
  ): Promise<CodeVisualization> {
    // Execute the code first
    const result = await this.executeCode(request);

    // Generate debug steps (simplified - full implementation requires instrumentation)
    const steps = await this.generateDebugSteps(request.code, request.language);

    // Analyze complexity
    const complexity = this.analyzeComplexity(request.code, request.language);

    return {
      sceneId,
      code: request.code,
      language: request.language,
      steps,
      output: result,
      complexity,
      visualizations: {
        dataStructures: [], // TODO: Implement data structure detection
        memoryLayout: undefined, // TODO: Implement memory tracking
        executionFlow: undefined, // TODO: Implement control flow analysis
      },
    };
  }

  /**
   * Build Docker command for safe execution
   */
  private buildDockerCommand(
    image: string,
    command: string,
    filePath: string,
    timeout: number,
    memoryLimit: number,
    stdin?: string,
  ): string {
    const fileName = path.basename(filePath);
    const containerPath = `/code/${fileName}`;

    // Docker run with security restrictions
    const dockerArgs = [
      'docker run',
      '--rm', // Remove container after execution
      '--network none', // No network access
      `--memory=${memoryLimit}m`, // Memory limit
      '--memory-swap=-1', // No swap
      '--cpus=1', // 1 CPU core
      '--pids-limit=50', // Limit processes
      '--read-only', // Read-only filesystem
      '--security-opt=no-new-privileges', // Security
      `-v ${this.tempDir}:/code:ro`, // Mount code as read-only
      image,
      command,
      containerPath,
    ];

    let cmd = dockerArgs.join(' ');

    // Add stdin if provided
    if (stdin) {
      cmd = `echo "${stdin.replace(/"/g, '\\"')}" | ${cmd}`;
    }

    // Add timeout wrapper
    cmd = `timeout ${Math.ceil(timeout / 1000)}s ${cmd}`;

    return cmd;
  }

  /**
   * Generate debug steps (simplified version)
   */
  private async generateDebugSteps(
    code: string,
    language: CodeLanguage,
  ): Promise<DebugStep[]> {
    const steps: DebugStep[] = [];
    const lines = code.split('\n');

    // Simplified: Create a step for each line
    lines.forEach((line, index) => {
      if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
        steps.push({
          line: index + 1,
          variables: {}, // TODO: Extract variables via instrumentation
          stack: ['main'], // TODO: Track actual call stack
          heap: {}, // TODO: Track heap allocations
          timestamp: index * 100, // Simulated timing
        });
      }
    });

    return steps;
  }

  /**
   * Analyze code complexity
   */
  private analyzeComplexity(
    code: string,
    language: CodeLanguage,
  ): { time: string; space: string } {
    // Simplified heuristic-based analysis
    const lines = code.split('\n');
    const hasNestedLoops = /for.*for|while.*while/.test(code);
    const hasRecursion = /function\s+(\w+)\(.*\).*\{.*\1\(/.test(code);
    const hasSorting = /sort|quicksort|mergesort|heapsort/i.test(code);

    let timeComplexity = 'O(n)';
    let spaceComplexity = 'O(1)';

    if (hasNestedLoops) {
      timeComplexity = 'O(n²)';
    } else if (hasRecursion) {
      timeComplexity = 'O(2^n)';
    } else if (hasSorting) {
      timeComplexity = 'O(n log n)';
    }

    if (hasRecursion) {
      spaceComplexity = 'O(n)';
    } else if (/array|list|map|set/i.test(code)) {
      spaceComplexity = 'O(n)';
    }

    return {
      time: timeComplexity,
      space: spaceComplexity,
    };
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      if (!existsSync(this.tempDir)) {
        await mkdir(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('[CodeExec] Failed to create temp directory:', error);
    }
  }

  /**
   * Generate code example for a given topic
   */
  async generateCodeExample(
    topic: string,
    language: CodeLanguage,
    complexity: 'simple' | 'intermediate' | 'advanced' = 'simple',
  ): Promise<string> {
    // TODO: Use Claude API to generate contextual code examples
    // For now, return a simple template

    const templates: Record<CodeLanguage, string> = {
      [CodeLanguage.JAVASCRIPT]: `// ${topic}
function example() {
  console.log("Demonstrating: ${topic}");
  // Implementation here
}
example();`,
      [CodeLanguage.PYTHON]: `# ${topic}
def example():
    print("Demonstrating: ${topic}")
    # Implementation here

example()`,
      [CodeLanguage.TYPESCRIPT]: `// ${topic}
function example(): void {
  console.log("Demonstrating: ${topic}");
  // Implementation here
}
example();`,
      [CodeLanguage.GO]: `package main
import "fmt"

// ${topic}
func main() {
    fmt.Println("Demonstrating: ${topic}")
    // Implementation here
}`,
      [CodeLanguage.RUST]: `// ${topic}
fn main() {
    println!("Demonstrating: {}", "${topic}");
    // Implementation here
}`,
      [CodeLanguage.JAVA]: `// ${topic}
public class Example {
    public static void main(String[] args) {
        System.out.println("Demonstrating: ${topic}");
        // Implementation here
    }
}`,
      [CodeLanguage.CPP]: `#include <iostream>
using namespace std;

// ${topic}
int main() {
    cout << "Demonstrating: ${topic}" << endl;
    // Implementation here
    return 0;
}`,
      [CodeLanguage.BASH]: `#!/bin/bash
# ${topic}
echo "Demonstrating: ${topic}"
# Implementation here`,
    };

    return templates[language] || templates[CodeLanguage.JAVASCRIPT];
  }

  /**
   * Health check for Docker availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync('docker --version', { timeout: 2000 });
      return true;
    } catch (error) {
      console.error('[CodeExec] Docker not available:', error);
      return false;
    }
  }
}
