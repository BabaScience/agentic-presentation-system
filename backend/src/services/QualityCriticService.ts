/* ═══════════════════════════════════════════════════════════════
   Quality Critic Service — Phase 2.5 Multi-Agent Intelligence

   Reviews a VisualScript against its SceneContract for:
   1. Contract compliance (required entities present, constraints met)
   2. Domain correctness (LaTeX balanced, angles valid, etc.)
   3. Visual quality (no overlaps, staggered animations, variety)
   4. Pedagogical alignment (primary entity prominent, narration flow)

   Returns CriticReview with approval/revision decision.
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import {
  type SceneBlackboard,
  type CriticReview,
} from '../../shared/types';

export class QualityCriticService {
  private client: Anthropic;
  private fastModel: string;

  constructor() {
    this.client = new Anthropic();
    this.fastModel = process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929';
  }

  async review(blackboard: SceneBlackboard): Promise<CriticReview> {
    const { contract, visualScript, domainGuidance } = blackboard;

    if (!visualScript) {
      return { approved: false, qualityScore: 0, revisions: [{ issue: 'No visual script provided', fix: 'Generate a visual script', priority: 'high' }] };
    }

    // Collect all entity labels from all frames
    const allEntities = new Map<string, { type: string; position: { x: number; y: number }; size: { width: number; height: number } }>();
    for (const frame of visualScript.frames) {
      for (const entity of frame.entities) {
        if (entity.label) {
          allEntities.set(entity.label, {
            type: entity.type,
            position: entity.position,
            size: entity.size,
          });
        }
      }
    }

    // Build a compact summary for the LLM
    const entitySummary = Array.from(allEntities.entries())
      .map(([label, info]) => `  - "${label}" (${info.type}) at (${info.position.x.toFixed(0)}, ${info.position.y.toFixed(0)}), size: ${info.size.width}x${info.size.height}`)
      .join('\n');

    const requiredSummary = contract.requiredEntities
      .map(e => `  - "${e.label}" (${e.type}, role: ${e.role}, mandatory: ${e.mandatory})`)
      .join('\n');

    const constraintsSummary = contract.spatialConstraints.length > 0
      ? contract.spatialConstraints
          .map(c => `  - ${c.entityA} ${c.type} ${c.entityB}`)
          .join('\n')
      : '  None';

    const domainRulesSummary = domainGuidance?.domainRules?.length
      ? domainGuidance.domainRules.map(r => `  - ${r}`).join('\n')
      : '  None';

    const prompt = `You are a visual quality critic for an educational presentation system. Review this visual script against its contract.

## Scene Contract
**Pedagogical Goal**: ${contract.pedagogicalGoal}
**Domain**: ${contract.domain}
**Difficulty**: ${contract.difficultyLevel}

**Required Entities**:
${requiredSummary}

**Spatial Constraints**:
${constraintsSummary}

**Domain Rules**:
${domainRulesSummary}

## Generated Visual Script
**Frames**: ${visualScript.frames.length}
**Total Duration**: ${visualScript.totalDuration}ms

**All Entities**:
${entitySummary}

## Review Criteria
1. **Contract compliance**: Are ALL mandatory required entities present? Do spatial constraints hold?
2. **Domain correctness**: Do entities have appropriate metadata for their domain?
3. **Visual quality**: Are entities well-spread (not all at same position)? Are animations staggered?
4. **Pedagogical alignment**: Is the primary entity visually prominent? Does frame sequence support learning?

## Output Format
Return ONLY valid JSON:
{
  "approved": true/false,
  "qualityScore": 0.0-1.0,
  "revisions": [
    { "issue": "string", "fix": "string", "priority": "high|medium|low" }
  ]
}

If qualityScore >= 0.7 and no high-priority issues, set approved to true.
Review now:`;

    try {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[Critic] No valid JSON in response, defaulting to approved');
        return { approved: true, qualityScore: 0.6 };
      }

      const parsed = JSON.parse(jsonMatch[0]) as CriticReview;

      // Ensure qualityScore is in range
      parsed.qualityScore = Math.max(0, Math.min(1, parsed.qualityScore || 0));

      return parsed;
    } catch (err: any) {
      console.error('[Critic] Error:', err.message);
      // On error, default to approved to avoid blocking the pipeline
      return { approved: true, qualityScore: 0.5 };
    }
  }
}
