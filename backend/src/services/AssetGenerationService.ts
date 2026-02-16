/* ═══════════════════════════════════════════════════════════════
   Asset Generation Service

   Context-aware fetching of logos, icons, and illustrations.
   Maintains asset library, handles caching, and ensures brand
   consistency. Integrates with CDNs and icon libraries.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type AssetLibrary,
  type LogoAsset,
  type IconAsset,
  type IllustrationAsset,
  type CachedAsset,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Built-in logo database (common tech companies/tools)
 */
const BUILTIN_LOGOS: LogoAsset[] = [
  {
    name: 'Kubernetes',
    keywords: ['k8s', 'kubernetes', 'container orchestration'],
    url: 'https://kubernetes.io/images/kubernetes-horizontal-color.png',
    color: '#326CE5',
    category: 'infrastructure',
  },
  {
    name: 'Docker',
    keywords: ['docker', 'container', 'containerization'],
    url: 'https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png',
    color: '#2496ED',
    category: 'infrastructure',
  },
  {
    name: 'AWS',
    keywords: ['aws', 'amazon', 'cloud'],
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
    color: '#FF9900',
    category: 'cloud',
  },
  {
    name: 'React',
    keywords: ['react', 'reactjs', 'frontend', 'ui'],
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    color: '#61DAFB',
    category: 'frontend',
  },
  {
    name: 'Node.js',
    keywords: ['node', 'nodejs', 'javascript', 'backend'],
    url: 'https://nodejs.org/static/images/logo.svg',
    color: '#339933',
    category: 'backend',
  },
  {
    name: 'PostgreSQL',
    keywords: ['postgres', 'postgresql', 'database', 'sql'],
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg',
    color: '#336791',
    category: 'database',
  },
  {
    name: 'MongoDB',
    keywords: ['mongo', 'mongodb', 'database', 'nosql'],
    url: 'https://www.mongodb.com/assets/images/global/leaf.svg',
    color: '#47A248',
    category: 'database',
  },
  {
    name: 'Redis',
    keywords: ['redis', 'cache', 'database', 'in-memory'],
    url: 'https://redis.io/images/redis-white.png',
    color: '#DC382D',
    category: 'database',
  },
];

/**
 * Built-in icon library (semantic icons)
 */
const BUILTIN_ICONS: Record<string, string> = {
  // Infrastructure
  server: '🖥️',
  database: '🗄️',
  container: '📦',
  cloud: '☁️',
  network: '🌐',

  // Actions
  send: '📤',
  receive: '📥',
  process: '⚙️',
  search: '🔍',
  delete: '🗑️',

  // Status
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',

  // Development
  code: '💻',
  bug: '🐛',
  test: '🧪',
  deploy: '🚀',
  git: '🔀',
};

export class AssetGenerationService {
  private assetLibrary: AssetLibrary = {
    logos: BUILTIN_LOGOS,
    icons: [],
    illustrations: [],
    cached: new Map<string, CachedAsset>(),
  };

  private cacheExpiration = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Find logo for a technology/company
   */
  async findLogo(keyword: string): Promise<LogoAsset | null> {
    // Search built-in logos
    const logo = this.assetLibrary.logos.find((l) =>
      l.keywords.some((k) => keyword.toLowerCase().includes(k.toLowerCase())),
    );

    if (logo) {
      return logo;
    }

    // Try to fetch from external source (if API available)
    return await this.fetchLogoExternal(keyword);
  }

  /**
   * Find multiple logos from narration
   */
  async findLogosFromNarration(narration: string): Promise<LogoAsset[]> {
    const keywords = await this.extractTechKeywords(narration);
    const logos: LogoAsset[] = [];

    for (const keyword of keywords) {
      const logo = await this.findLogo(keyword);
      if (logo) {
        logos.push(logo);
      }
    }

    return logos;
  }

  /**
   * Get icon for semantic meaning
   */
  getIcon(semantic: string): string {
    const key = semantic.toLowerCase().replace(/\s+/g, '_');
    return BUILTIN_ICONS[key] || '✨';
  }

  /**
   * Get icon pack for category
   */
  getIconPack(category: 'infrastructure' | 'actions' | 'status' | 'development'): Record<string, string> {
    const packs = {
      infrastructure: {
        server: BUILTIN_ICONS.server,
        database: BUILTIN_ICONS.database,
        container: BUILTIN_ICONS.container,
        cloud: BUILTIN_ICONS.cloud,
        network: BUILTIN_ICONS.network,
      },
      actions: {
        send: BUILTIN_ICONS.send,
        receive: BUILTIN_ICONS.receive,
        process: BUILTIN_ICONS.process,
        search: BUILTIN_ICONS.search,
        delete: BUILTIN_ICONS.delete,
      },
      status: {
        success: BUILTIN_ICONS.success,
        error: BUILTIN_ICONS.error,
        warning: BUILTIN_ICONS.warning,
        info: BUILTIN_ICONS.info,
        loading: BUILTIN_ICONS.loading,
      },
      development: {
        code: BUILTIN_ICONS.code,
        bug: BUILTIN_ICONS.bug,
        test: BUILTIN_ICONS.test,
        deploy: BUILTIN_ICONS.deploy,
        git: BUILTIN_ICONS.git,
      },
    };

    return packs[category];
  }

  /**
   * Fetch illustration from stock library
   */
  async fetchIllustration(
    keywords: string[],
    style: 'minimal' | 'detailed' = 'minimal',
  ): Promise<IllustrationAsset | null> {
    // Check cache first
    const cacheKey = `illustration:${keywords.join(',')}:${style}`;
    const cached = this.getCachedAsset(cacheKey);
    if (cached) {
      return {
        id: uuid(),
        url: cached.url,
        keywords,
        style,
        category: 'illustration',
      };
    }

    // In production, this would fetch from Unsplash, Pexels, or similar
    // For now, return placeholder
    return {
      id: uuid(),
      url: `https://via.placeholder.com/800x600?text=${keywords[0]}`,
      keywords,
      style,
      category: 'illustration',
    };
  }

  /**
   * Generate SVG icon programmatically
   */
  generateSVGIcon(
    type: 'server' | 'database' | 'container' | 'cloud' | 'user',
    color: string = '#2196f3',
  ): string {
    const icons: Record<string, string> = {
      server: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <rect x="2" y="3" width="20" height="6" rx="2"/>
        <rect x="2" y="11" width="20" height="6" rx="2"/>
        <rect x="2" y="19" width="20" height="2" rx="1"/>
        <circle cx="6" cy="6" r="1" fill="#fff"/>
        <circle cx="6" cy="14" r="1" fill="#fff"/>
      </svg>`,

      database: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5 v6 c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
        <path d="M3 11 v6 c0 1.657 4.03 3 9 3s9-1.343 9-3V11"/>
      </svg>`,

      container: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <rect x="3" y="6" width="18" height="14" rx="2" stroke="${color}" fill="none" stroke-width="2"/>
        <path d="M3 10 h18" stroke="${color}" stroke-width="2"/>
        <rect x="7" y="2" width="10" height="4" rx="1" fill="${color}"/>
      </svg>`,

      cloud: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
      </svg>`,

      user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
        <circle cx="12" cy="7" r="4"/>
        <path d="M12 14c-5 0-9 2-9 6v2h18v-2c0-4-4-6-9-6z"/>
      </svg>`,
    };

    return icons[type] || icons.server;
  }

  /**
   * Extract technology keywords from narration
   */
  private async extractTechKeywords(narration: string): Promise<string[]> {
    const prompt = `Extract technology/tool/company names from this narration:

"${narration}"

Return ONLY a JSON array of keywords, no explanation:
["keyword1", "keyword2", ...]

Focus on: cloud providers, databases, frameworks, tools, companies.`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return [];
      }

      const jsonMatch = content.text.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[AssetGeneration] Keyword extraction error:', error);
      return [];
    }
  }

  /**
   * Fetch logo from external API (placeholder)
   */
  private async fetchLogoExternal(keyword: string): Promise<LogoAsset | null> {
    // In production, this would call:
    // - Clearbit Logo API
    // - Brandfetch API
    // - Similar services

    // For now, return null (fallback to generated icons)
    return null;
  }

  /**
   * Cache management
   */
  private getCachedAsset(key: string): CachedAsset | null {
    const cached = this.assetLibrary.cached.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.assetLibrary.cached.delete(key);
      return null;
    }

    return cached;
  }

  cacheAsset(key: string, url: string, contentType: string, data: string): void {
    const asset: CachedAsset = {
      url,
      data,
      contentType,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.cacheExpiration,
    };

    this.assetLibrary.cached.set(key, asset);
  }

  clearCache(): void {
    this.assetLibrary.cached.clear();
  }

  /**
   * Add custom logo to library
   */
  addLogo(logo: LogoAsset): void {
    this.assetLibrary.logos.push(logo);
  }

  /**
   * Get asset library stats
   */
  getStats(): {
    logos: number;
    icons: number;
    illustrations: number;
    cachedAssets: number;
  } {
    return {
      logos: this.assetLibrary.logos.length,
      icons: this.assetLibrary.icons.length,
      illustrations: this.assetLibrary.illustrations.length,
      cachedAssets: this.assetLibrary.cached.size,
    };
  }
}
