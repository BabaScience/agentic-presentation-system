/* ═══════════════════════════════════════════════════════════════
   Visual Adaptation Service

   Intelligently adapts visual complexity, style, and pacing based
   on user behavior and comprehension signals. Detects confusion,
   infers expertise level, identifies learning styles, and adjusts
   presentations in real-time.
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import {
  type VisualComplexity,
  type LearningStyle,
  type ExpertiseLevel,
  type AdaptationMetrics,
  DataType,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export class VisualAdaptationService {
  private metricsHistory: AdaptationMetrics[] = [];
  private currentComplexity: VisualComplexity = {
    level: 'moderate',
    entityCount: 3,
    animationIntensity: 'medium',
    labelDensity: 'moderate',
    colorComplexity: 'limited',
  };

  /**
   * Analyze user behavior and adapt visual complexity
   */
  async adaptVisualComplexity(
    metrics: AdaptationMetrics,
    currentDataType: DataType,
  ): Promise<{
    complexity: VisualComplexity;
    reasoning: string;
    adjustments: string[];
  }> {
    this.metricsHistory.push(metrics);

    // Detect confusion signals
    const isConfused = this.detectConfusion(metrics);

    // Analyze trends over recent history
    const trends = this.analyzeTrends();

    // Determine new complexity level
    const newComplexity = this.calculateOptimalComplexity(
      metrics,
      isConfused,
      trends,
      currentDataType,
    );

    // Identify specific adjustments
    const adjustments = this.identifyAdjustments(this.currentComplexity, newComplexity);

    // Generate reasoning
    const reasoning = this.generateAdaptationReasoning(metrics, isConfused, trends);

    this.currentComplexity = newComplexity;

    return {
      complexity: newComplexity,
      reasoning,
      adjustments,
    };
  }

  /**
   * Detect confusion from user behavior
   */
  detectConfusion(metrics: AdaptationMetrics): boolean {
    // Multiple signals indicate confusion
    const confusionSignals = [
      metrics.confusionRate > 0.3, // Explicit confusion expressions
      metrics.interruptFrequency > 0.5, // Frequent interruptions
      metrics.pauseDuration > 3000, // Long pauses
      metrics.questionComplexity < 2, // Basic clarification questions
      metrics.acknowledgmentRate < 0.3, // Low acknowledgment
    ];

    // Confusion if multiple signals are present
    return confusionSignals.filter((s) => s).length >= 2;
  }

  /**
   * Infer user's expertise level
   */
  async inferExpertiseLevel(
    questions: string[],
    interactions: number,
    topic: string,
  ): Promise<ExpertiseLevel> {
    if (questions.length === 0) {
      return {
        level: 'intermediate',
        domain: topic,
        confidence: 0.5,
        inferredFrom: ['default'],
      };
    }

    const prompt = `Analyze these user questions to infer their expertise level on ${topic}.

Questions:
${questions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Interactions: ${interactions}

Classify expertise as: beginner, intermediate, advanced, expert

Indicators:
- Beginner: Basic "what is" questions, needs fundamentals
- Intermediate: Comparative questions, some depth
- Advanced: Implementation details, optimization
- Expert: Architecture, trade-offs, edge cases

Return JSON:
{
  "level": "beginner" | "intermediate" | "advanced" | "expert",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "indicators": ["list", "of", "key", "indicators"]
}`;

    try {
      const response = await anthropic.messages.create({
        model: process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return this.getDefaultExpertiseLevel(topic);
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.getDefaultExpertiseLevel(topic);
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        level: result.level,
        domain: topic,
        confidence: result.confidence,
        inferredFrom: result.indicators || [],
      };
    } catch (error) {
      console.error('[VisualAdaptation] Expertise inference error:', error);
      return this.getDefaultExpertiseLevel(topic);
    }
  }

  /**
   * Identify user's learning style
   */
  identifyLearningStyle(metrics: AdaptationMetrics): LearningStyle {
    // Analyze interaction patterns
    const indicators: string[] = [];
    let visualScore = 0;
    let textualScore = 0;
    let kinestheticScore = 0;

    // Visual learners: Low interruptions, high acknowledgment
    if (metrics.interruptFrequency < 0.3 && metrics.acknowledgmentRate > 0.6) {
      visualScore += 2;
      indicators.push('low interruptions with visual content');
    }

    // Textual learners: More questions, revisits
    if (metrics.questionComplexity > 3 && metrics.revisitPatterns.length > 0) {
      textualScore += 2;
      indicators.push('detailed questions and revisiting');
    }

    // Kinesthetic learners: Frequent interactions, experimentation
    if (metrics.interruptFrequency > 0.5 && metrics.questionComplexity > 2) {
      kinestheticScore += 2;
      indicators.push('high interaction frequency');
    }

    // Determine dominant style
    const maxScore = Math.max(visualScore, textualScore, kinestheticScore);
    let type: 'visual' | 'textual' | 'kinesthetic' | 'balanced' = 'balanced';

    if (maxScore > 0) {
      if (visualScore === maxScore) type = 'visual';
      else if (textualScore === maxScore) type = 'textual';
      else if (kinestheticScore === maxScore) type = 'kinesthetic';
    }

    const confidence = maxScore > 0 ? Math.min(maxScore / 4, 1) : 0.5;

    return {
      type,
      confidence,
      indicators,
    };
  }

  /**
   * Adjust complexity for expertise level
   */
  adjustForExpertiseLevel(
    baseComplexity: VisualComplexity,
    expertise: ExpertiseLevel,
  ): VisualComplexity {
    const adjusted = { ...baseComplexity };

    switch (expertise.level) {
      case 'beginner':
        adjusted.level = 'simple';
        adjusted.entityCount = Math.min(adjusted.entityCount, 3);
        adjusted.animationIntensity = 'low';
        adjusted.labelDensity = 'dense';
        break;

      case 'intermediate':
        adjusted.level = 'moderate';
        adjusted.entityCount = Math.min(adjusted.entityCount, 5);
        adjusted.animationIntensity = 'medium';
        adjusted.labelDensity = 'moderate';
        break;

      case 'advanced':
        adjusted.level = 'detailed';
        adjusted.entityCount = Math.min(adjusted.entityCount, 7);
        adjusted.animationIntensity = 'medium';
        adjusted.labelDensity = 'moderate';
        break;

      case 'expert':
        adjusted.level = 'complex';
        adjusted.entityCount = Math.min(adjusted.entityCount, 10);
        adjusted.animationIntensity = 'high';
        adjusted.labelDensity = 'sparse';
        break;
    }

    return adjusted;
  }

  /**
   * Adjust complexity for learning style
   */
  adjustForLearningStyle(
    baseComplexity: VisualComplexity,
    learningStyle: LearningStyle,
  ): VisualComplexity {
    const adjusted = { ...baseComplexity };

    switch (learningStyle.type) {
      case 'visual':
        // More visuals, less text
        adjusted.entityCount += 1;
        adjusted.labelDensity = 'sparse';
        adjusted.colorComplexity = 'full';
        adjusted.animationIntensity = 'high';
        break;

      case 'textual':
        // More labels and explanations
        adjusted.labelDensity = 'dense';
        adjusted.animationIntensity = 'low';
        break;

      case 'kinesthetic':
        // More interactive elements
        adjusted.animationIntensity = 'high';
        adjusted.entityCount += 1;
        break;

      case 'balanced':
        // Keep defaults
        break;
    }

    return adjusted;
  }

  /**
   * Generate detailed explanation for adaptation
   */
  private generateAdaptationReasoning(
    metrics: AdaptationMetrics,
    isConfused: boolean,
    trends: {
      confusionTrend: 'increasing' | 'decreasing' | 'stable';
      engagementTrend: 'increasing' | 'decreasing' | 'stable';
    },
  ): string {
    const reasons: string[] = [];

    if (isConfused) {
      reasons.push('Confusion signals detected (frequent interruptions or clarification questions)');
    }

    if (trends.confusionTrend === 'increasing') {
      reasons.push('Confusion rate is increasing - simplifying presentation');
    } else if (trends.confusionTrend === 'decreasing') {
      reasons.push('Comprehension improving - can increase complexity');
    }

    if (trends.engagementTrend === 'decreasing') {
      reasons.push('Engagement decreasing - adding more visual interest');
    }

    if (metrics.acknowledgmentRate > 0.7) {
      reasons.push('High acknowledgment rate - content resonating well');
    }

    if (metrics.interruptFrequency > 0.5) {
      reasons.push('High interrupt frequency - user seeking more detail');
    }

    return reasons.join('. ') || 'Maintaining current complexity level';
  }

  /**
   * Private helper methods
   */

  private analyzeTrends(): {
    confusionTrend: 'increasing' | 'decreasing' | 'stable';
    engagementTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.metricsHistory.length < 3) {
      return { confusionTrend: 'stable', engagementTrend: 'stable' };
    }

    const recent = this.metricsHistory.slice(-3);

    // Analyze confusion trend
    const confusionValues = recent.map((m) => m.confusionRate);
    const confusionTrend = this.determineTrend(confusionValues);

    // Analyze engagement trend (acknowledgment rate)
    const engagementValues = recent.map((m) => m.acknowledgmentRate);
    const engagementTrend = this.determineTrend(engagementValues);

    return { confusionTrend, engagementTrend };
  }

  private determineTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const slope = (values[values.length - 1] - values[0]) / values.length;

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateOptimalComplexity(
    metrics: AdaptationMetrics,
    isConfused: boolean,
    trends: { confusionTrend: string; engagementTrend: string },
    dataType: DataType,
  ): VisualComplexity {
    let complexity = { ...this.currentComplexity };

    // Simplify if confused
    if (isConfused || trends.confusionTrend === 'increasing') {
      complexity = this.simplifyComplexity(complexity);
    }

    // Increase if going well
    if (
      !isConfused &&
      trends.confusionTrend === 'decreasing' &&
      metrics.acknowledgmentRate > 0.6
    ) {
      complexity = this.increaseComplexity(complexity);
    }

    // Adjust for data type
    complexity = this.adjustForDataType(complexity, dataType);

    return complexity;
  }

  private simplifyComplexity(complexity: VisualComplexity): VisualComplexity {
    return {
      level: this.decreaseLevel(complexity.level),
      entityCount: Math.max(2, complexity.entityCount - 1),
      animationIntensity: this.decreaseIntensity(complexity.animationIntensity),
      labelDensity: 'dense',
      colorComplexity: 'limited',
    };
  }

  private increaseComplexity(complexity: VisualComplexity): VisualComplexity {
    return {
      level: this.increaseLevel(complexity.level),
      entityCount: Math.min(8, complexity.entityCount + 1),
      animationIntensity: this.increaseIntensity(complexity.animationIntensity),
      labelDensity: complexity.labelDensity,
      colorComplexity: 'full',
    };
  }

  private adjustForDataType(
    complexity: VisualComplexity,
    dataType: DataType,
  ): VisualComplexity {
    const adjusted = { ...complexity };

    switch (dataType) {
      case DataType.CONCEPT:
        adjusted.entityCount = Math.max(2, adjusted.entityCount);
        break;
      case DataType.PROCESS:
        adjusted.entityCount = Math.max(3, adjusted.entityCount);
        adjusted.animationIntensity = 'medium';
        break;
      case DataType.RELATIONSHIP:
        adjusted.entityCount = Math.max(4, adjusted.entityCount);
        break;
      case DataType.EXAMPLE:
        adjusted.labelDensity = 'dense';
        break;
    }

    return adjusted;
  }

  private identifyAdjustments(
    before: VisualComplexity,
    after: VisualComplexity,
  ): string[] {
    const adjustments: string[] = [];

    if (before.level !== after.level) {
      adjustments.push(`Complexity level: ${before.level} → ${after.level}`);
    }

    if (before.entityCount !== after.entityCount) {
      adjustments.push(`Entity count: ${before.entityCount} → ${after.entityCount}`);
    }

    if (before.animationIntensity !== after.animationIntensity) {
      adjustments.push(`Animation intensity: ${before.animationIntensity} → ${after.animationIntensity}`);
    }

    if (before.labelDensity !== after.labelDensity) {
      adjustments.push(`Label density: ${before.labelDensity} → ${after.labelDensity}`);
    }

    if (before.colorComplexity !== after.colorComplexity) {
      adjustments.push(`Color complexity: ${before.colorComplexity} → ${after.colorComplexity}`);
    }

    return adjustments;
  }

  private decreaseLevel(
    level: 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex',
  ): 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex' {
    const levels: Array<'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex'> = [
      'minimal',
      'simple',
      'moderate',
      'detailed',
      'complex',
    ];
    const index = levels.indexOf(level);
    return levels[Math.max(0, index - 1)];
  }

  private increaseLevel(
    level: 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex',
  ): 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex' {
    const levels: Array<'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex'> = [
      'minimal',
      'simple',
      'moderate',
      'detailed',
      'complex',
    ];
    const index = levels.indexOf(level);
    return levels[Math.min(4, index + 1)];
  }

  private decreaseIntensity(
    intensity: 'low' | 'medium' | 'high',
  ): 'low' | 'medium' | 'high' {
    return intensity === 'high' ? 'medium' : intensity === 'medium' ? 'low' : 'low';
  }

  private increaseIntensity(
    intensity: 'low' | 'medium' | 'high',
  ): 'low' | 'medium' | 'high' {
    return intensity === 'low' ? 'medium' : intensity === 'medium' ? 'high' : 'high';
  }

  private getDefaultExpertiseLevel(topic: string): ExpertiseLevel {
    return {
      level: 'intermediate',
      domain: topic,
      confidence: 0.5,
      inferredFrom: ['default'],
    };
  }

  /**
   * Get current complexity level
   */
  getCurrentComplexity(): VisualComplexity {
    return { ...this.currentComplexity };
  }

  /**
   * Reset adaptation state
   */
  reset(): void {
    this.metricsHistory = [];
    this.currentComplexity = {
      level: 'moderate',
      entityCount: 3,
      animationIntensity: 'medium',
      labelDensity: 'moderate',
      colorComplexity: 'limited',
    };
  }
}
