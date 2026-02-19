/* ═══════════════════════════════════════════════════════════════
   LearnerProfileService — Stub for cross-session learner data
   Returns default profile when no persisted data exists.
   ═══════════════════════════════════════════════════════════════ */

import type { LearnerProfile } from '../../shared/types';

export function defaultLearnerProfile(userId?: string): LearnerProfile {
  return {
    userId: userId ?? 'anonymous',
    presentationPreferences: {
      optimalPaceWPM: 150,
      visualDensity: 'moderate',
      bestExplanationStyle: 'definition',
    },
  };
}

export class LearnerProfileService {
  /** Stub: always returns null. Use defaultLearnerProfile when null. */
  async loadProfile(userId?: string): Promise<LearnerProfile | null> {
    return null;
  }
}
