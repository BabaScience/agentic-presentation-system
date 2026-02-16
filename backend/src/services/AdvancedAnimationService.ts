/* ═══════════════════════════════════════════════════════════════
   Advanced Animation Service

   Generates sophisticated animation sequences including morphing,
   particle systems, physics-based animations, and cinematic
   camera movements. Coordinates multi-entity choreography.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type AdvancedAnimation,
  type AnimationType,
  type ParticleConfig,
  type SpringConfig,
  type CinematicPath,
  type CameraKeyframe,
  type VisualEntity,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Easing function library
 */
export const EasingFunctions = {
  // Standard easings
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Elastic
  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Bounce
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

export class AdvancedAnimationService {
  /**
   * Generate advanced animation for entity based on context
   */
  async generateAnimation(
    entityType: string,
    action: string,
    context: string,
  ): Promise<AdvancedAnimation> {
    // Use Claude to determine best animation approach
    const animationType = await this.analyzeAnimationNeeds(entityType, action, context);

    switch (animationType) {
      case 'morph':
        return this.generateMorphAnimation(entityType, action);
      case 'particle':
        return this.generateParticleAnimation(entityType, action);
      case 'spring':
        return this.generateSpringAnimation(entityType, action);
      case 'cinematic':
        return this.generateCinematicAnimation(entityType, 'reveal');
      default:
        return this.generateBasicAnimation(animationType);
    }
  }

  /**
   * Analyze narration to determine animation needs
   */
  private async analyzeAnimationNeeds(
    entityType: string,
    action: string,
    context: string,
  ): Promise<AnimationType> {
    const prompt = `Analyze this entity and action to determine the best animation type.

Entity Type: ${entityType}
Action: ${action}
Context: ${context}

Animation Types Available:
- fadeIn: Simple opacity transition
- scaleIn: Size growth
- slideIn: Position + opacity
- pulse: Continuous attention-grabbing
- morph: Transform shape/type
- particle: Data flow, message passing
- spring: Natural physics movement
- cinematic: Camera-based reveal

Return ONLY the animation type name (one word), nothing else.`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const type = content.text.trim().toLowerCase() as AnimationType;
        if (this.isValidAnimationType(type)) {
          return type;
        }
      }
    } catch (error) {
      console.error('[AdvancedAnimation] Analysis error:', error);
    }

    return 'fadeIn'; // Fallback
  }

  /**
   * Generate morphing animation (shape transformation)
   */
  generateMorphAnimation(entityType: string, action: string): AdvancedAnimation {
    return {
      type: 'morph',
      duration: 1000,
      delay: 0,
      easing: 'easeInOutCubic',
      morphTarget: {
        // Target shape based on action
        type: this.determineMorphTarget(entityType, action),
      },
    };
  }

  /**
   * Generate particle system animation
   */
  generateParticleAnimation(
    entityType: string,
    action: string,
    count: number = 30,
  ): AdvancedAnimation {
    const particleConfig: ParticleConfig = {
      count,
      lifetime: 2000,
      speed: { min: 0.5, max: 2.0 },
      size: { min: 2, max: 6 },
      color: this.getEntityColor(entityType),
      emitter: { x: 50, y: 50 },
      gravity: { x: 0, y: 0.1 },
    };

    return {
      type: 'particle',
      duration: 3000,
      delay: 0,
      easing: 'linear',
      particleConfig,
    };
  }

  /**
   * Generate spring physics animation
   */
  generateSpringAnimation(
    entityType: string,
    action: string,
    intensity: 'soft' | 'normal' | 'bouncy' = 'normal',
  ): AdvancedAnimation {
    const springPresets = {
      soft: { stiffness: 120, damping: 14, mass: 1, velocity: 0 },
      normal: { stiffness: 170, damping: 26, mass: 1, velocity: 0 },
      bouncy: { stiffness: 300, damping: 10, mass: 1, velocity: 0 },
    };

    return {
      type: 'spring',
      duration: 1200,
      delay: 0,
      springConfig: springPresets[intensity],
    };
  }

  /**
   * Generate cinematic camera animation
   */
  generateCinematicAnimation(
    focusEntityId: string,
    style: 'reveal' | 'zoom' | 'pan' | 'orbit' = 'reveal',
  ): AdvancedAnimation {
    const keyframes = this.generateCinematicKeyframes(focusEntityId, style);

    const cinematicPath: CinematicPath = {
      keyframes,
      easing: 'easeInOutCubic',
      totalDuration: 2500,
    };

    return {
      type: 'cinematic',
      duration: 2500,
      delay: 0,
      easing: 'easeInOutCubic',
      cinematicPath,
    };
  }

  /**
   * Generate basic animation
   */
  generateBasicAnimation(type: AnimationType): AdvancedAnimation {
    const durations: Record<string, number> = {
      fadeIn: 500,
      scaleIn: 600,
      slideIn: 700,
      pulse: 2000,
      dashFlow: 1500,
      none: 0,
    };

    return {
      type: type as any,
      duration: durations[type] || 500,
      delay: 0,
      easing: 'easeOutQuad',
    };
  }

  /**
   * Generate cinematic keyframes based on style
   */
  private generateCinematicKeyframes(
    focusEntityId: string,
    style: 'reveal' | 'zoom' | 'pan' | 'orbit',
  ): CameraKeyframe[] {
    switch (style) {
      case 'reveal':
        return [
          { time: 0, position: { x: 50, y: 20 }, zoom: 0.5, rotation: 0 },
          { time: 1000, position: { x: 50, y: 40 }, zoom: 0.8, rotation: 0 },
          { time: 2500, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0, focusTarget: focusEntityId },
        ];

      case 'zoom':
        return [
          { time: 0, position: { x: 50, y: 50 }, zoom: 0.3, rotation: 0 },
          { time: 2500, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0, focusTarget: focusEntityId },
        ];

      case 'pan':
        return [
          { time: 0, position: { x: 20, y: 50 }, zoom: 1.0, rotation: 0 },
          { time: 1200, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0 },
          { time: 2500, position: { x: 80, y: 50 }, zoom: 1.0, rotation: 0, focusTarget: focusEntityId },
        ];

      case 'orbit':
        return [
          { time: 0, position: { x: 50, y: 30 }, zoom: 1.0, rotation: 0 },
          { time: 800, position: { x: 70, y: 50 }, zoom: 1.0, rotation: 90 },
          { time: 1600, position: { x: 50, y: 70 }, zoom: 1.0, rotation: 180 },
          { time: 2500, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0, focusTarget: focusEntityId },
        ];

      default:
        return [
          { time: 0, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0 },
          { time: 2500, position: { x: 50, y: 50 }, zoom: 1.0, rotation: 0, focusTarget: focusEntityId },
        ];
    }
  }

  /**
   * Choreograph multiple entity animations
   */
  choreographAnimations(
    entities: VisualEntity[],
    pattern: 'sequential' | 'parallel' | 'wave' | 'cascade',
  ): Map<string, AdvancedAnimation> {
    const animations = new Map<string, AdvancedAnimation>();

    switch (pattern) {
      case 'sequential':
        entities.forEach((entity, index) => {
          animations.set(entity.id, {
            type: 'fadeIn',
            duration: 500,
            delay: index * 400,
            easing: 'easeOutQuad',
          });
        });
        break;

      case 'parallel':
        entities.forEach((entity) => {
          animations.set(entity.id, {
            type: 'scaleIn',
            duration: 600,
            delay: 0,
            easing: 'easeOutCubic',
          });
        });
        break;

      case 'wave':
        entities.forEach((entity, index) => {
          animations.set(entity.id, {
            type: 'slideIn',
            duration: 700,
            delay: index * 150,
            easing: 'easeInOutQuad',
          });
        });
        break;

      case 'cascade':
        entities.forEach((entity, index) => {
          const delay = Math.floor(index / 2) * 300;
          animations.set(entity.id, {
            type: 'fadeIn',
            duration: 500,
            delay,
            easing: 'easeOutQuad',
          });
        });
        break;
    }

    return animations;
  }

  /**
   * Generate transition animation between scenes
   */
  generateSceneTransition(
    style: 'fade' | 'slide' | 'zoom' | 'wipe' | 'morph' = 'fade',
  ): AdvancedAnimation {
    const transitions = {
      fade: {
        type: 'fadeIn' as AnimationType,
        duration: 800,
        delay: 0,
        easing: 'easeInOutQuad',
      },
      slide: {
        type: 'slideIn' as AnimationType,
        duration: 1000,
        delay: 0,
        easing: 'easeOutCubic',
      },
      zoom: {
        type: 'scaleIn' as AnimationType,
        duration: 900,
        delay: 0,
        easing: 'easeInOutCubic',
      },
      wipe: {
        type: 'slideIn' as AnimationType,
        duration: 1200,
        delay: 0,
        easing: 'linear',
      },
      morph: {
        type: 'morph' as AnimationType,
        duration: 1500,
        delay: 0,
        easing: 'easeInOutCubic',
        morphTarget: {},
      },
    };

    return transitions[style];
  }

  /**
   * Calculate optimal animation timing based on complexity
   */
  calculateOptimalTiming(
    entityCount: number,
    complexity: 'simple' | 'moderate' | 'complex',
  ): { baseDuration: number; staggerDelay: number } {
    const timingTable = {
      simple: { baseDuration: 400, staggerDelay: 100 },
      moderate: { baseDuration: 600, staggerDelay: 150 },
      complex: { baseDuration: 800, staggerDelay: 200 },
    };

    const base = timingTable[complexity];

    // Adjust for entity count
    const scaleFactor = Math.min(1 + entityCount * 0.05, 1.5);

    return {
      baseDuration: base.baseDuration * scaleFactor,
      staggerDelay: base.staggerDelay,
    };
  }

  /**
   * Helper methods
   */

  private isValidAnimationType(type: string): boolean {
    const validTypes = [
      'fadeIn',
      'scaleIn',
      'slideIn',
      'pulse',
      'dashFlow',
      'none',
      'morph',
      'particle',
      'spring',
      'cinematic',
    ];
    return validTypes.includes(type);
  }

  private determineMorphTarget(entityType: string, action: string): string {
    // Simple heuristic for morph targets
    if (action.includes('transform') || action.includes('becomes')) {
      return 'transformed';
    }
    if (action.includes('expand') || action.includes('grows')) {
      return 'expanded';
    }
    return 'default';
  }

  private getEntityColor(entityType: string): string[] {
    const colorMap: Record<string, string[]> = {
      Server: ['#2196f3', '#1976d2', '#1565c0'],
      Database: ['#4caf50', '#388e3c', '#2e7d32'],
      Container: ['#00bcd4', '#0097a7', '#00838f'],
      Pod: ['#9c27b0', '#7b1fa2', '#6a1b9a'],
      Cloud: ['#00e5ff', '#00b8d4', '#0091ea'],
      User: ['#ff9800', '#f57c00', '#ef6c00'],
      default: ['#00e5ff', '#00bcd4', '#0097a7'],
    };

    return colorMap[entityType] || colorMap.default;
  }
}
