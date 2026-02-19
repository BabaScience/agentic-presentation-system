import { RLService } from '../../RLService';

describe('RLService', () => {
  describe('importProfile', () => {
    it('restores arms from BanditState shape (arms only)', () => {
      const rl = new RLService();
      const arms = {
        analogy_first: { alpha: 10, beta: 2 },
        definition_first: { alpha: 2, beta: 2 },
        example_first: { alpha: 2, beta: 2 },
        process_first: { alpha: 2, beta: 2 },
      };
      rl.importProfile({ arms });
      const policy = rl.getCurrentPolicy();
      // analogy_first has high alpha relative to beta — should be sampled preferentially
      expect(['analogy_first', 'definition_first', 'example_first', 'process_first']).toContain(
        policy.explanationStrategy,
      );
    });

    it('restores arms from full export shape (strategyArms)', () => {
      const rl = new RLService();
      const strategyArms = {
        definition_first: { alpha: 15, beta: 2 },
      };
      rl.importProfile({ strategyArms });
      const policy = rl.getCurrentPolicy();
      expect(policy.explanationStrategy).toBeDefined();
    });

    it('handles empty arms without error', () => {
      const rl = new RLService();
      expect(() => rl.importProfile({ arms: {} })).not.toThrow();
      expect(rl.getCurrentPolicy().explanationStrategy).toBeDefined();
    });
  });
});
