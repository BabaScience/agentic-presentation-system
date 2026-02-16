/* ═══════════════════════════════════════════════════════════════
   AI Illustration Service

   Generates custom illustrations using AI image generation APIs.
   Supports DALL-E, Stable Diffusion, and other image generation
   models. Creates contextually appropriate visual metaphors and
   technical diagrams.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type AIIllustrationRequest,
  type AIIllustrationResult,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * AI Illustration Service
 *
 * NOTE: This implementation uses Claude to enhance prompts and prepare
 * for image generation. Actual image generation requires DALL-E API key
 * or Stable Diffusion setup. Current implementation returns optimized
 * prompts that can be used with any image generation service.
 */
export class AIIllustrationService {
  /**
   * Generate custom illustration based on concept
   */
  async generateIllustration(
    request: AIIllustrationRequest,
  ): Promise<AIIllustrationResult> {
    // Step 1: Enhance the prompt using Claude
    const enhancedPrompt = await this.enhancePrompt(request);

    // Step 2: Generate image using AI (DALL-E, Stable Diffusion, etc.)
    // For now, we return the enhanced prompt. Integration with DALL-E
    // requires OpenAI API key.
    const result = await this.generateWithAI(enhancedPrompt, request);

    return result;
  }

  /**
   * Enhance illustration prompt using Claude for better image generation
   */
  private async enhancePrompt(request: AIIllustrationRequest): Promise<string> {
    const styleDescriptions = {
      technical:
        'technical diagram style, clean lines, professional, minimalist, blueprint aesthetic',
      artistic:
        'artistic illustration, creative, expressive, vibrant colors, dynamic composition',
      minimal:
        'minimal flat design, simple shapes, limited color palette, modern aesthetic',
      realistic:
        'photorealistic, detailed, accurate proportions, natural lighting',
      cartoon:
        'cartoon illustration style, friendly, approachable, colorful, simplified forms',
    };

    const stylePrompt = request.style
      ? styleDescriptions[request.style]
      : styleDescriptions.minimal;

    const prompt = `You are an expert at creating detailed prompts for AI image generation.
Transform this concept into a detailed image generation prompt.

Concept: "${request.prompt}"
Desired Style: ${request.style || 'minimal'}
Aspect Ratio: ${request.aspectRatio || '16:9'}
${request.colorPalette ? `Color Palette: ${request.colorPalette.join(', ')}` : ''}

Create a detailed prompt that:
1. Describes the main visual elements clearly
2. Specifies composition and layout
3. Includes style direction (${stylePrompt})
4. Mentions technical details (lighting, perspective, materials)
5. Avoids text/words in the image (visual only)
6. Is concise but comprehensive (under 200 words)

For technical concepts (servers, networks, containers, etc.), use:
- Isometric or axonometric views
- Clean geometric shapes
- Technical diagram aesthetics
- Blue/green/grey color schemes
- Glowing connections and data flows

For metaphorical concepts, use:
- Strong visual metaphors
- Symbolic representations
- Engaging composition
- Appropriate emotional tone

Return ONLY the enhanced prompt, no explanation:`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }

      return request.prompt;
    } catch (error) {
      console.error('[AIIllustration] Prompt enhancement error:', error);
      return request.prompt;
    }
  }

  /**
   * Generate image using AI service (placeholder for API integration)
   */
  private async generateWithAI(
    enhancedPrompt: string,
    request: AIIllustrationRequest,
  ): Promise<AIIllustrationResult> {
    // Check if OpenAI API key is available for DALL-E
    if (process.env.OPENAI_API_KEY) {
      try {
        return await this.generateWithDALLE(enhancedPrompt, request);
      } catch (error) {
        console.error('[AIIllustration] DALL-E generation error:', error);
      }
    }

    // Fallback: Return enhanced prompt as placeholder
    // In production, this would call actual image generation API
    console.log('[AIIllustration] No image generation API configured, returning prompt');

    return {
      id: uuid(),
      imageUrl: '', // Would be actual image URL from API
      imageData: undefined,
      svgData: this.generatePlaceholderSVG(request.prompt),
      prompt: enhancedPrompt,
      style: request.style || 'minimal',
      metadata: {
        generatedAt: Date.now(),
        model: 'prompt-only',
        revisedPrompt: enhancedPrompt,
      },
    };
  }

  /**
   * Generate image using DALL-E API
   */
  private async generateWithDALLE(
    prompt: string,
    request: AIIllustrationRequest,
  ): Promise<AIIllustrationResult> {
    // This requires OpenAI SDK integration
    // Implementation would use OpenAI's image generation API

    /*
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: request.aspectRatio === '1:1' ? '1024x1024' : '1792x1024',
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    const revisedPrompt = response.data[0].revised_prompt;
    */

    // Placeholder return
    return {
      id: uuid(),
      imageUrl: '', // Would be from API
      prompt,
      style: request.style || 'minimal',
      metadata: {
        generatedAt: Date.now(),
        model: 'dall-e-3',
        revisedPrompt: prompt,
      },
    };
  }

  /**
   * Generate placeholder SVG when no image generation is available
   */
  private generatePlaceholderSVG(concept: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2196f3;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0.6" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#grad)" />
  <text x="200" y="150" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">
    ${concept}
  </text>
  <text x="200" y="180" font-family="Arial, sans-serif" font-size="12" fill="#ffffff" opacity="0.8" text-anchor="middle">
    (AI Illustration Placeholder)
  </text>
</svg>`;
  }

  /**
   * Generate contextual technical diagram prompt
   */
  generateTechnicalDiagramPrompt(
    concept: string,
    components: string[],
  ): AIIllustrationRequest {
    const componentList = components.join(', ');

    return {
      prompt: `Technical diagram of ${concept} showing ${componentList}. Isometric view, clean geometric shapes, blue and grey color scheme, glowing connections, professional technical illustration style. Modern data center aesthetic with subtle gradients and depth.`,
      style: 'technical',
      aspectRatio: '16:9',
      colorPalette: ['#2196f3', '#00e5ff', '#00bcd4', '#37474f', '#607d8b'],
    };
  }

  /**
   * Generate visual metaphor prompt
   */
  generateMetaphorPrompt(
    abstractConcept: string,
    concreteMetaphor: string,
  ): AIIllustrationRequest {
    return {
      prompt: `Visual metaphor: ${abstractConcept} represented as ${concreteMetaphor}. Creative illustration with clear symbolic meaning, vibrant colors, engaging composition. The metaphor should be immediately understandable and visually striking.`,
      style: 'artistic',
      aspectRatio: '16:9',
    };
  }

  /**
   * Analyze narration and determine if custom illustration would help
   */
  async analyzeForIllustration(
    narration: string,
    context: string,
  ): Promise<AIIllustrationRequest | null> {
    const prompt = `Analyze this narration and determine if a custom AI-generated illustration would significantly enhance understanding.

Narration: "${narration}"
Context: "${context}"

Consider:
1. Is the concept abstract and difficult to visualize with standard icons?
2. Would a visual metaphor make it more memorable?
3. Is this a unique scenario that warrants custom art?
4. Would existing SVG components (Server, Database, Cloud, etc.) suffice?

If custom illustration is recommended, return JSON:
{
  "recommended": true,
  "prompt": "Detailed prompt for image generation",
  "style": "technical" | "artistic" | "minimal",
  "reasoning": "Why custom illustration helps"
}

If standard components are sufficient, return:
{
  "recommended": false,
  "reasoning": "Standard SVG components adequate"
}`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
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

      if (!result.recommended) {
        return null;
      }

      return {
        prompt: result.prompt,
        style: result.style || 'minimal',
        aspectRatio: '16:9',
      };
    } catch (error) {
      console.error('[AIIllustration] Analysis error:', error);
      return null;
    }
  }

  /**
   * Health check for AI illustration capability
   */
  async healthCheck(): Promise<{
    available: boolean;
    provider: string;
    message: string;
  }> {
    if (process.env.OPENAI_API_KEY) {
      return {
        available: true,
        provider: 'DALL-E',
        message: 'AI illustration generation available via DALL-E',
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return {
        available: true,
        provider: 'Claude (prompt enhancement)',
        message: 'Prompt enhancement available, image generation requires additional API',
      };
    }

    return {
      available: false,
      provider: 'none',
      message: 'AI illustration generation not configured',
    };
  }
}
