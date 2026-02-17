/* ═══════════════════════════════════════════════════════════════
   Agent Orchestrator — Phase 2.5 Multi-Agent Intelligence

   Central coordinator that orchestrates the 4-agent cooperative
   flow per scene via a SceneBlackboard:

   1. Director Agent → SceneContract (already done in AgentService)
   2. Domain Expert → DomainGuidance (entity metadata + choreography)
   3. Visual Architect → VisualScript (frame-based visual narrative)
   4. Quality Critic → CriticReview (approve or request revision)

   Falls back to single-agent mode when no SceneContract exists
   (100% backward compatible with pre-Phase-2.5 reasoning output).
   ═══════════════════════════════════════════════════════════════ */

import {
  type PresentationScene,
  type KGNode,
  type WordTimestamp,
  type VisualScript,
  type SceneBlackboard,
  type SceneContract,
  type DomainGuidance,
} from '../../shared/types';
import { DomainExpertService } from './DomainExpertService';
import { QualityCriticService } from './QualityCriticService';
import { VisualScriptGenerator } from './VisualScriptGenerator';
import { ConcurrencyPool } from './ConcurrencyPool';

const MAX_REVISIONS = 1;
const CONFIDENCE_BYPASS_THRESHOLD = 0.8;

export class AgentOrchestrator {
  private domainExpert: DomainExpertService;
  private critic: QualityCriticService;

  constructor(private visualScriptGenerator: VisualScriptGenerator) {
    this.domainExpert = new DomainExpertService();
    this.critic = new QualityCriticService();
  }

  /**
   * Orchestrate the multi-agent flow for a single scene.
   * If no SceneContract exists, falls back to direct generateScript() call.
   */
  async orchestrateScene(
    scene: PresentationScene,
    focusNode: KGNode,
    wordTimestamps: WordTimestamp[],
    pool: ConcurrencyPool,
  ): Promise<VisualScript> {
    const contract: SceneContract | undefined = scene.sceneContract;

    // ── Fallback: no contract → single-agent mode (backward compatible) ──
    if (!contract) {
      console.log(`[MultiAgent] Scene ${scene.id}: No contract, using single-agent mode`);
      return pool.enqueue('claude', () =>
        this.visualScriptGenerator.generateScript(
          scene.id,
          scene.narration,
          focusNode.type,
          wordTimestamps,
          scene.durationEstimate,
          focusNode.visualHint,
          focusNode.domain,
        ),
      );
    }

    // ── Multi-agent flow ────────────────────────────────────────────────

    // Step 1: Create SceneBlackboard
    const blackboard: SceneBlackboard = {
      sceneId: scene.id,
      contract,
      revisionCount: 0,
    };

    // Step 2: Domain Expert — generate domain-specific guidance
    const expertStart = Date.now();
    let domainGuidance: DomainGuidance;
    try {
      domainGuidance = await pool.enqueue('claude', () =>
        this.domainExpert.generateGuidance(
          scene.narration,
          contract,
          contract.domain,
        ),
      );
      blackboard.domainGuidance = domainGuidance;
    } catch (err: any) {
      console.warn(`[MultiAgent] Scene ${scene.id}: Domain Expert failed (${err.message}), proceeding without guidance`);
      domainGuidance = {
        domain: contract.domain,
        entityMetadata: {},
        animationChoreography: [],
        domainRules: [],
      };
      blackboard.domainGuidance = domainGuidance;
    }
    const expertMs = Date.now() - expertStart;
    console.log(`[MultiAgent] Scene ${scene.id}: Domain Expert completed (${expertMs}ms)`);

    // Step 3: Visual Architect — generate visual script with enriched inputs
    const architectStart = Date.now();
    let visualScript: VisualScript & { confidence?: number };
    try {
      visualScript = await pool.enqueue('claude', () =>
        this.visualScriptGenerator.generateScript(
          scene.id,
          scene.narration,
          focusNode.type,
          wordTimestamps,
          scene.durationEstimate,
          focusNode.visualHint,
          focusNode.domain,
          contract,
          domainGuidance,
        ),
      );
    } catch (err: any) {
      console.error(`[MultiAgent] Scene ${scene.id}: Visual Architect failed (${err.message})`);
      throw err;
    }
    blackboard.visualScript = visualScript;
    const architectMs = Date.now() - architectStart;
    const confidence = visualScript.confidence ?? 0;
    console.log(`[MultiAgent] Scene ${scene.id}: Visual Architect completed (confidence: ${confidence.toFixed(2)}, ${architectMs}ms)`);

    // Step 4: Confidence bypass — skip Critic if confidence is high enough
    if (confidence >= CONFIDENCE_BYPASS_THRESHOLD) {
      console.log(`[MultiAgent] Scene ${scene.id}: Confidence ${confidence.toFixed(2)} >= ${CONFIDENCE_BYPASS_THRESHOLD}, skipping Critic`);
      blackboard.finalScript = visualScript;
      return visualScript;
    }

    // Step 5: Quality Critic — review the visual script
    const criticStart = Date.now();
    try {
      const review = await pool.enqueue('claude', () =>
        this.critic.review(blackboard),
      );
      blackboard.criticReview = review;
      const criticMs = Date.now() - criticStart;
      console.log(`[MultiAgent] Scene ${scene.id}: Critic ${review.approved ? 'approved' : 'requested revision'} (quality: ${review.qualityScore.toFixed(2)}, ${criticMs}ms)`);

      // Step 6: If approved, return the script
      if (review.approved) {
        blackboard.finalScript = visualScript;
        return visualScript;
      }

      // Step 7: If not approved and revision budget remains, revise
      if (blackboard.revisionCount < MAX_REVISIONS && review.revisions?.length) {
        blackboard.revisionCount++;
        const revisionFeedback = review.revisions
          .map(r => `[${r.priority.toUpperCase()}] ${r.issue}: ${r.fix}`)
          .join('\n');

        console.log(`[MultiAgent] Scene ${scene.id}: Requesting revision (attempt ${blackboard.revisionCount})`);

        try {
          const revisedScript = await pool.enqueue('claude', () =>
            this.visualScriptGenerator.generateScript(
              scene.id,
              scene.narration,
              focusNode.type,
              wordTimestamps,
              scene.durationEstimate,
              focusNode.visualHint,
              focusNode.domain,
              contract,
              domainGuidance,
              revisionFeedback,
            ),
          );

          console.log(`[MultiAgent] Scene ${scene.id}: Revision completed`);
          blackboard.finalScript = revisedScript;
          return revisedScript;
        } catch (revErr: any) {
          console.warn(`[MultiAgent] Scene ${scene.id}: Revision failed (${revErr.message}), using original`);
          blackboard.finalScript = visualScript;
          return visualScript;
        }
      }

      // Step 8: Revision budget exhausted — return original script
      console.warn(`[MultiAgent] Scene ${scene.id}: Revision budget exhausted, using original script`);
      blackboard.finalScript = visualScript;
      return visualScript;
    } catch (criticErr: any) {
      console.warn(`[MultiAgent] Scene ${scene.id}: Critic failed (${criticErr.message}), using original script`);
      blackboard.finalScript = visualScript;
      return visualScript;
    }
  }
}
