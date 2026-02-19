/* ═══════════════════════════════════════════════════════════════
   LearnerProfileService — Cross-session learner data with Redis persistence.
   Returns default profile when no persisted data exists.
   Graceful degradation when Redis is unavailable.
   ═══════════════════════════════════════════════════════════════ */

import type { LearnerProfile } from '../../shared/types';
import { getRedisClient, learnerProfileKey } from '../lib/redis';

const PROFILE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

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

let unavailableLogged = false;

function isValidProfile(obj: unknown): obj is LearnerProfile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userId' in obj &&
    typeof (obj as LearnerProfile).userId === 'string'
  );
}

export class LearnerProfileService {
  /** Load profile from Redis. Returns null if missing or Redis unavailable. */
  async loadProfile(userId: string): Promise<LearnerProfile | null> {
    const redis = getRedisClient();
    if (!redis) {
      if (!unavailableLogged) {
        unavailableLogged = true;
        console.warn('[LearnerProfile] Redis unavailable, profiles will not persist');
      }
      return null;
    }

    try {
      const raw = await redis.get(learnerProfileKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidProfile(parsed)) return null;
      return parsed;
    } catch (err: any) {
      console.warn('[LearnerProfile] loadProfile failed:', err.message);
      return null;
    }
  }

  /** Save profile to Redis. No-op if Redis unavailable. */
  async saveProfile(profile: LearnerProfile): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const key = learnerProfileKey(profile.userId);
      await redis.set(key, JSON.stringify(profile), 'EX', PROFILE_TTL_SECONDS);
    } catch (err: any) {
      console.warn('[LearnerProfile] saveProfile failed:', err.message);
    }
  }

  /** Add node IDs to masteredConcepts. Dedupes and persists. */
  async updateMastery(userId: string, nodeIds: string[]): Promise<void> {
    if (nodeIds.length === 0) return;

    const profile = await this.loadProfile(userId) ?? defaultLearnerProfile(userId);
    profile.roadmapPosition ??= { masteredConcepts: [], struggledConcepts: [] };
    const mastered = new Set(profile.roadmapPosition.masteredConcepts ?? []);
    for (const id of nodeIds) mastered.add(id);
    profile.roadmapPosition.masteredConcepts = [...mastered];
    await this.saveProfile(profile);
  }
}
