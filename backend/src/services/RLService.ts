/* ═══════════════════════════════════════════════════════════════
   Reinforcement Learning Service — Contextual Bandit with
   Thompson Sampling for Personalized Cognitive Scaffolding.

   Learns the optimal explanation strategy, pacing, visual
   density, and interaction frequency for each unique learner.
   ═══════════════════════════════════════════════════════════════ */

import {
  DataType,
  type RLPolicy, type RLReward, type LearnerState,
  type ExplanationStrategy,
} from '../../shared/types';

// ── Thompson Sampling Arm ────────────────────────────────────
interface BetaArm {
  alpha: number;  // Success count + prior
  beta: number;   // Failure count + prior
}

// ── Per-Strategy Reward Tracker ──────────────────────────────
interface StrategyStats {
  arm: BetaArm;
  totalReward: number;
  count: number;
}

export class RLService {
  // Strategy arms: one per explanation strategy
  private strategyArms: Record<ExplanationStrategy, StrategyStats> = {
    analogy_first:    { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
    definition_first: { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
    example_first:    { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
    process_first:    { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
  };

  // Pace arms: discrete pace buckets (WPM)
  private paceArms: Record<string, StrategyStats> = {
    slow:   { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },  // 120 WPM
    medium: { arm: { alpha: 3, beta: 2 }, totalReward: 0, count: 0 },  // 150 WPM
    fast:   { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },  // 190 WPM
  };

  // Visual density arms
  private densityArms: Record<string, StrategyStats> = {
    minimal:  { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
    moderate: { arm: { alpha: 3, beta: 2 }, totalReward: 0, count: 0 },
    rich:     { arm: { alpha: 2, beta: 2 }, totalReward: 0, count: 0 },
  };

  // Learner state tracking
  private learnerState: LearnerState = {
    avgTimePerNode: 0,
    interruptRate: 0,
    confusionRate: 0,
    acknowledgmentRate: 0,
    silenceDuration: 0,
    revisitCount: 0,
    currentDepth: 0,
    nodesPresented: 0,
    expertiseLevel: 0.5,
    preferredModality: 'visual',
    vocabularyComplexity: 0.5,
    optimalPace: 150,
    analogyEffectiveness: 0.5,
    exampleEffectiveness: 0.5,
    processEffectiveness: 0.5,
  };

  // Reward history (for analysis)
  private rewardHistory: RLReward[] = [];

  // Current active policy
  private currentPolicy: RLPolicy;

  // Counters for comprehension check logic
  private nodesSinceLastCheck = 0;

  constructor() {
    this.currentPolicy = this.samplePolicy();
  }

  // ── Get Current Policy ───────────────────────────────────
  getCurrentPolicy(): RLPolicy {
    return { ...this.currentPolicy };
  }

  // ── Get Learner State ────────────────────────────────────
  getLearnerState(): LearnerState {
    return { ...this.learnerState };
  }

  // ── Record a Reward Signal ───────────────────────────────
  recordReward(reward: RLReward): void {
    this.rewardHistory.push(reward);

    // Update strategy arm
    const strategyStats = this.strategyArms[reward.explanationStrategy];
    if (strategyStats) {
      strategyStats.count++;
      strategyStats.totalReward += reward.value;
      if (reward.value > 0) {
        strategyStats.arm.alpha += reward.value;
      } else {
        strategyStats.arm.beta += Math.abs(reward.value);
      }
    }

    // Update learner state based on signal type
    this.updateLearnerState(reward);

    // Re-sample policy after every reward (lightweight update)
    this.currentPolicy = this.samplePolicy();
    this.nodesSinceLastCheck++;

    console.log(`[RL] Reward: ${reward.signal} (${reward.value > 0 ? '+' : ''}${reward.value}) → Strategy: ${this.currentPolicy.explanationStrategy}, Pace: ${this.currentPolicy.pace}`);
  }

  // ── Should Trigger Comprehension Check? ──────────────────
  shouldCheckComprehension(sceneIndex: number): boolean {
    const frequency = this.currentPolicy.comprehensionCheckFrequency;

    // Always check after the 2nd scene for new users
    if (sceneIndex === 1 && this.rewardHistory.length < 5) return true;

    // Adaptive: check more often when confusion is high
    const effectiveFrequency = this.learnerState.confusionRate > 0.3
      ? Math.max(frequency - 1, 1)
      : frequency;

    if (this.nodesSinceLastCheck >= effectiveFrequency) {
      this.nodesSinceLastCheck = 0;
      return true;
    }

    return false;
  }

  // ── Sample Policy via Thompson Sampling ──────────────────
  private samplePolicy(): RLPolicy {
    // Sample best explanation strategy
    const explanationStrategy = this.thompsonSelect(this.strategyArms) as ExplanationStrategy;

    // Sample best pace
    const paceKey = this.thompsonSelect(this.paceArms);
    const paceMap: Record<string, number> = { slow: 120, medium: 150, fast: 190 };
    const pace = paceMap[paceKey] || 150;

    // Sample best visual density
    const visualDensity = this.thompsonSelect(this.densityArms) as 'minimal' | 'moderate' | 'rich';

    // Compute expansion priority based on effectiveness signals
    const expansionPriority = this.computeExpansionPriority();

    // Adaptive comprehension check frequency
    const confusionRate = this.learnerState.confusionRate;
    const comprehensionCheckFrequency = confusionRate > 0.4 ? 2 :
                                         confusionRate > 0.2 ? 3 : 4;

    return {
      explanationStrategy,
      pace,
      visualDensity,
      expansionPriority,
      comprehensionCheckFrequency,
    };
  }

  // ── Thompson Sampling: Select Best Arm ───────────────────
  private thompsonSelect<T extends string>(arms: Record<T, StrategyStats>): T {
    let bestArm: T | null = null;
    let bestSample = -Infinity;

    for (const [key, stats] of Object.entries(arms) as [T, StrategyStats][]) {
      const sample = this.sampleBeta(stats.arm.alpha, stats.arm.beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestArm = key;
      }
    }

    return bestArm!;
  }

  // ── Sample from Beta Distribution ────────────────────────
  // Uses Jöhnk's algorithm for Beta(a, b)
  private sampleBeta(alpha: number, beta: number): number {
    const gammaA = this.sampleGamma(alpha);
    const gammaB = this.sampleGamma(beta);
    return gammaA / (gammaA + gammaB);
  }

  // ── Sample from Gamma Distribution (Marsaglia & Tsang) ───
  private sampleGamma(shape: number): number {
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number, v: number;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  // ── Standard Normal Random (Box-Muller) ──────────────────
  private normalRandom(): number {
    const u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── Update Learner State from Reward ─────────────────────
  private updateLearnerState(reward: RLReward): void {
    const ls = this.learnerState;

    switch (reward.signal) {
      case 'acknowledgment':
        ls.acknowledgmentRate = this.exponentialMovingAvg(ls.acknowledgmentRate, 1, 0.3);
        ls.nodesPresented++;
        break;

      case 'confusion':
        ls.confusionRate = this.exponentialMovingAvg(ls.confusionRate, 1, 0.4);
        // Update modality effectiveness based on what confused them
        if (reward.explanationStrategy === 'analogy_first') {
          ls.analogyEffectiveness = this.exponentialMovingAvg(ls.analogyEffectiveness, 0, 0.2);
        } else if (reward.explanationStrategy === 'example_first') {
          ls.exampleEffectiveness = this.exponentialMovingAvg(ls.exampleEffectiveness, 0, 0.2);
        }
        break;

      case 'deep_question':
        // Good signal: user is engaged, not confused
        ls.interruptRate = this.exponentialMovingAvg(ls.interruptRate, 1, 0.2);
        ls.expertiseLevel = Math.min(1, ls.expertiseLevel + 0.02);
        break;

      case 'silence':
        ls.silenceDuration = this.exponentialMovingAvg(ls.silenceDuration, 1, 0.3);
        break;

      case 'revisit':
        ls.revisitCount++;
        break;

      case 'skip':
        // User skipped: content wasn't relevant
        ls.nodesPresented++;
        break;

      case 'fast_completion':
        ls.expertiseLevel = Math.min(1, ls.expertiseLevel + 0.01);
        break;
    }

    // Update inferred modality preference
    if (ls.analogyEffectiveness > ls.exampleEffectiveness && ls.analogyEffectiveness > ls.processEffectiveness) {
      ls.preferredModality = 'verbal';
    } else if (ls.exampleEffectiveness > ls.processEffectiveness) {
      ls.preferredModality = 'example';
    } else {
      ls.preferredModality = 'visual';
    }
  }

  // ── Compute Expansion Priority from Learner State ────────
  private computeExpansionPriority(): DataType[] {
    const ls = this.learnerState;
    const scores: [DataType, number][] = [
      [DataType.ANALOGY, ls.analogyEffectiveness],
      [DataType.EXAMPLE, ls.exampleEffectiveness],
      [DataType.PROCESS, ls.processEffectiveness],
      [DataType.DEFINITION, 0.5],
      [DataType.COUNTERPOINT, ls.confusionRate > 0.3 ? 0.8 : 0.3],
    ];

    return scores
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  }

  // ── Exponential Moving Average ───────────────────────────
  private exponentialMovingAvg(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current;
  }

  // ── Export Profile for Persistence ───────────────────────
  exportProfile(): {
    learnerState: LearnerState;
    strategyArms: Record<string, { alpha: number; beta: number }>;
    rewardCount: number;
  } {
    const arms: Record<string, { alpha: number; beta: number }> = {};
    for (const [key, stats] of Object.entries(this.strategyArms)) {
      arms[key] = { alpha: stats.arm.alpha, beta: stats.arm.beta };
    }
    return {
      learnerState: this.learnerState,
      strategyArms: arms,
      rewardCount: this.rewardHistory.length,
    };
  }

  // ── Import Profile (cross-session persistence) ───────────
  importProfile(profile: {
    learnerState: LearnerState;
    strategyArms: Record<string, { alpha: number; beta: number }>;
  }): void {
    this.learnerState = { ...this.learnerState, ...profile.learnerState };
    for (const [key, arm] of Object.entries(profile.strategyArms)) {
      if (this.strategyArms[key as ExplanationStrategy]) {
        this.strategyArms[key as ExplanationStrategy].arm = { ...arm };
      }
    }
    this.currentPolicy = this.samplePolicy();
    console.log(`[RL] Imported profile: expertise=${this.learnerState.expertiseLevel}, preferred=${this.learnerState.preferredModality}`);
  }
}
