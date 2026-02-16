/* ═══════════════════════════════════════════════════════════════
   Live Web Content Integration Service

   Embeds live documentation, GitHub repos, and API playgrounds
   into presentations. Handles web scraping, code highlighting,
   and real-time API testing.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type WebEmbedding,
  type GitHubRepo,
  type APIPlayground,
  type WebScrapeResult,
  type DocumentationSection,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class LiveWebContentService {
  /**
   * Create documentation embedding
   */
  createDocumentationEmbed(
    url: string,
    targetSection?: string,
  ): WebEmbedding {
    return {
      id: uuid(),
      type: 'documentation',
      url,
      title: this.extractTitleFromUrl(url),
      iframeable: true,
      annotations: targetSection ? [
        {
          type: 'highlight',
          selector: targetSection,
          color: '#00e5ff',
          label: 'Focus Area',
        },
      ] : [],
      scrollTo: targetSection,
      interactive: true,
    };
  }

  /**
   * Fetch GitHub repository information
   */
  async fetchGitHubRepo(
    owner: string,
    repo: string,
    branch: string = 'main',
  ): Promise<GitHubRepo> {
    // Simulated GitHub API call - real implementation would use Octokit
    return {
      id: uuid(),
      owner,
      repo,
      branch,
      description: `Repository ${owner}/${repo}`,
      stars: Math.floor(Math.random() * 10000),
      forks: Math.floor(Math.random() * 1000),
      language: 'TypeScript',
      topics: ['typescript', 'react', 'nodejs'],
      fileTree: await this.getFileTree(owner, repo, branch),
      readme: await this.getReadme(owner, repo, branch),
      recentCommits: await this.getRecentCommits(owner, repo, branch),
    };
  }

  /**
   * Get file content from GitHub
   */
  async getGitHubFile(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main',
  ): Promise<{
    content: string;
    language: string;
    size: number;
    url: string;
  }> {
    // Simulated file fetch
    const language = this.detectLanguageFromPath(path);

    return {
      content: `// Sample content from ${path}\n// This is a simulated response\n\nfunction example() {\n  console.log('Hello from ${path}');\n}`,
      language,
      size: 1024,
      url: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
    };
  }

  /**
   * Create API playground
   */
  createAPIPlayground(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    headers?: Record<string, string>,
    body?: any,
  ): APIPlayground {
    return {
      id: uuid(),
      url: endpoint,
      endpoint,
      method,
      headers: headers || {},
      body,
      responseTime: 0,
      apiResponse: null,
      status: 'idle',
      curlCommand: this.generateCurlCommand(endpoint, method, headers, body),
    };
  }

  /**
   * Execute API request
   */
  async executeAPIRequest(
    playground: APIPlayground,
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Simulated API call - real implementation would use fetch or axios
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

      const duration = Date.now() - startTime;

      // Simulated response
      return {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-response-time': `${duration}ms`,
        },
        data: {
          success: true,
          message: `Response from ${playground.endpoint}`,
          timestamp: Date.now(),
          data: { id: 1, name: 'Example' },
        },
        duration,
      };
    } catch (error) {
      return {
        status: 500,
        statusText: 'Error',
        headers: {},
        data: { error: 'Request failed' },
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Scrape and summarize web page
   */
  async scrapeWebPage(url: string): Promise<WebScrapeResult> {
    // Simulated web scraping - real implementation would use Puppeteer or Cheerio
    const content = `Simulated content from ${url}`;

    // Use Claude to summarize
    const summary = await this.summarizeContent(content, url);

    return {
      id: uuid(),
      url,
      title: this.extractTitleFromUrl(url),
      summary,
      keyPoints: [
        'Main concept explained',
        'Technical implementation details',
        'Best practices highlighted',
      ],
      links: [
        { text: 'Related Documentation', url: `${url}/docs` },
        { text: 'GitHub Repository', url: `${url}/github` },
      ],
      images: [],
      scrapedAt: Date.now(),
    };
  }

  /**
   * Extract documentation sections
   */
  async extractDocumentation(url: string): Promise<DocumentationSection[]> {
    // Simulated documentation extraction
    return [
      {
        id: uuid(),
        title: 'Getting Started',
        level: 1,
        content: 'Introduction to the topic...',
        url: `${url}#getting-started`,
      },
      {
        id: uuid(),
        title: 'Installation',
        level: 2,
        content: 'npm install package-name',
        url: `${url}#installation`,
      },
      {
        id: uuid(),
        title: 'Basic Usage',
        level: 2,
        content: 'Example code showing basic usage...',
        url: `${url}#usage`,
      },
      {
        id: uuid(),
        title: 'API Reference',
        level: 1,
        content: 'Complete API documentation...',
        url: `${url}#api`,
      },
    ];
  }

  /**
   * Create code playground (sandbox)
   */
  createCodePlayground(
    language: 'javascript' | 'python' | 'typescript',
    initialCode?: string,
  ): {
    id: string;
    language: string;
    code: string;
    output: string;
    status: 'idle' | 'running' | 'success' | 'error';
  } {
    const defaultCode: Record<string, string> = {
      javascript: '// Write your JavaScript code here\nconsole.log("Hello World!");',
      python: '# Write your Python code here\nprint("Hello World!")',
      typescript: '// Write your TypeScript code here\nconsole.log("Hello World!");',
    };

    return {
      id: uuid(),
      language,
      code: initialCode || defaultCode[language],
      output: '',
      status: 'idle',
    };
  }

  /**
   * Search GitHub repositories
   */
  async searchGitHub(query: string, limit: number = 5): Promise<
    Array<{
      owner: string;
      repo: string;
      description: string;
      stars: number;
      language: string;
      url: string;
    }>
  > {
    // Simulated GitHub search - real implementation would use GitHub API
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      owner: `user${i + 1}`,
      repo: query.toLowerCase().replace(/\s+/g, '-'),
      description: `Repository matching "${query}"`,
      stars: Math.floor(Math.random() * 5000),
      language: ['TypeScript', 'JavaScript', 'Python'][i % 3],
      url: `https://github.com/user${i + 1}/${query.toLowerCase().replace(/\s+/g, '-')}`,
    }));
  }

  /**
   * Private helper methods
   */

  private async getFileTree(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<
    Array<{
      path: string;
      type: 'file' | 'directory';
      size?: number;
    }>
  > {
    // Simulated file tree
    return [
      { path: 'src/', type: 'directory' },
      { path: 'src/index.ts', type: 'file', size: 1024 },
      { path: 'src/app.ts', type: 'file', size: 2048 },
      { path: 'tests/', type: 'directory' },
      { path: 'package.json', type: 'file', size: 512 },
      { path: 'README.md', type: 'file', size: 4096 },
    ];
  }

  private async getReadme(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<string> {
    return `# ${repo}\n\nA sample repository by ${owner}.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nSee documentation for details.`;
  }

  private async getRecentCommits(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<
    Array<{
      sha: string;
      message: string;
      author: string;
      date: number;
    }>
  > {
    const now = Date.now();
    return [
      {
        sha: 'abc123',
        message: 'feat: add new feature',
        author: owner,
        date: now - 86400000,
      },
      {
        sha: 'def456',
        message: 'fix: resolve bug',
        author: owner,
        date: now - 172800000,
      },
      {
        sha: 'ghi789',
        message: 'docs: update README',
        author: owner,
        date: now - 259200000,
      },
    ];
  }

  private detectLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      md: 'markdown',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
    };

    return langMap[ext || ''] || 'text';
  }

  private generateCurlCommand(
    endpoint: string,
    method: string,
    headers?: Record<string, string>,
    body?: any,
  ): string {
    let cmd = `curl -X ${method} '${endpoint}'`;

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        cmd += ` \\\n  -H '${key}: ${value}'`;
      });
    }

    if (body) {
      cmd += ` \\\n  -d '${JSON.stringify(body)}'`;
    }

    return cmd;
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      return pathParts[pathParts.length - 1] || urlObj.hostname;
    } catch {
      return url;
    }
  }

  private async summarizeContent(content: string, url: string): Promise<string> {
    try {
      const prompt = `Summarize this web page content in 2-3 concise sentences.

URL: ${url}
Content: ${content.slice(0, 2000)}

Provide a clear, informative summary.`;

      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content[0];
      if (textContent.type === 'text') {
        return textContent.text.trim();
      }

      return 'Summary not available';
    } catch (error) {
      console.error('[LiveWebContent] Summarization error:', error);
      return 'Summary not available';
    }
  }

  /**
   * Generate iframe embed HTML
   */
  generateEmbedHTML(embedding: WebEmbedding): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    iframe { border: none; width: 100%; height: 100vh; }
    .annotation {
      position: absolute;
      background: ${embedding.annotations[0]?.color || '#00e5ff'};
      opacity: 0.3;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <iframe src="${embedding.url}" allow="fullscreen"></iframe>
  ${embedding.annotations.map((ann, i) => `
    <div class="annotation" id="annotation-${i}"></div>
  `).join('')}
</body>
</html>`;

    return html;
  }
}
