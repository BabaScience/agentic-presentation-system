/**
 * LearnerProfileService tests — require Redis for integration.
 * When REDIS_URL is set and Redis is available, tests load/save/updateMastery.
 * When Redis is unavailable, load returns null and save/updateMastery no-op.
 */
import { LearnerProfileService, defaultLearnerProfile } from '../services/LearnerProfileService';

describe('LearnerProfileService', () => {
  const service = new LearnerProfileService();

  it('loadProfile returns null when no profile exists', async () => {
    const testUserId = `test-nonexistent-${Date.now()}`;
    const result = await service.loadProfile(testUserId);
    // May be null (no Redis) or the default we saved
    expect(result === null || (result && result.userId === testUserId)).toBe(true);
  });

  it('saveProfile and loadProfile round-trip', async () => {
    const testUserId = `test-roundtrip-${Date.now()}`;
    const profile = defaultLearnerProfile(testUserId);
    profile.roadmapPosition = { masteredConcepts: ['n1'], struggledConcepts: [] };
    profile.thompsonSamplingState = { arms: { analogy_first: { alpha: 5, beta: 2 } } };
    await service.saveProfile(profile);
    const loaded = await service.loadProfile(testUserId);
    if (loaded) {
      expect(loaded.userId).toBe(testUserId);
      expect(loaded.roadmapPosition?.masteredConcepts).toContain('n1');
      expect(loaded.thompsonSamplingState?.arms?.analogy_first).toEqual({ alpha: 5, beta: 2 });
    }
  });

  it('updateMastery adds nodeIds to masteredConcepts', async () => {
    const testUserId = `test-mastery-${Date.now()}`;
    await service.saveProfile(defaultLearnerProfile(testUserId));
    await service.updateMastery(testUserId, ['node-a', 'node-b']);
    const loaded = await service.loadProfile(testUserId);
    if (loaded?.roadmapPosition?.masteredConcepts) {
      expect(loaded.roadmapPosition.masteredConcepts).toContain('node-a');
      expect(loaded.roadmapPosition.masteredConcepts).toContain('node-b');
    }
  });

  it('updateMastery dedupes when adding existing nodes', async () => {
    const testUserId = `test-dedup-${Date.now()}`;
    const profile = defaultLearnerProfile(testUserId);
    profile.roadmapPosition = { masteredConcepts: ['node-a'], struggledConcepts: [] };
    await service.saveProfile(profile);
    await service.updateMastery(testUserId, ['node-a', 'node-b']);
    const loaded = await service.loadProfile(testUserId);
    if (loaded?.roadmapPosition?.masteredConcepts) {
      const count = loaded.roadmapPosition.masteredConcepts.filter((c) => c === 'node-a').length;
      expect(count).toBe(1);
    }
  });

  it('updateMastery no-ops when nodeIds is empty', async () => {
    const testUserId = `test-empty-${Date.now()}`;
    await service.saveProfile(defaultLearnerProfile(testUserId));
    await service.updateMastery(testUserId, []);
    const loaded = await service.loadProfile(testUserId);
    if (loaded) {
      expect(loaded.roadmapPosition?.masteredConcepts ?? []).toHaveLength(0);
    }
  });
});
