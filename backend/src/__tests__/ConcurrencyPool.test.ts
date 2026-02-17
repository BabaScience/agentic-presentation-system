import { ConcurrencyPool } from '../services/ConcurrencyPool';

describe('ConcurrencyPool', () => {
  it('should execute tasks and return results', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 4, maxClaude: 3, maxTTS: 2 });
    const result = await pool.enqueue('claude', async () => 42);
    expect(result).toBe(42);
  });

  it('should respect total concurrency limit', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 2, maxClaude: 2, maxTTS: 2 });
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const makeTask = () => pool.enqueue('claude', async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise(r => setTimeout(r, 50));
      currentConcurrent--;
    });

    await Promise.all([makeTask(), makeTask(), makeTask(), makeTask()]);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should respect per-type claude limit', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 10, maxClaude: 2, maxTTS: 10 });
    let maxClaudeConcurrent = 0;
    let currentClaudeConcurrent = 0;

    const makeTask = () => pool.enqueue('claude', async () => {
      currentClaudeConcurrent++;
      maxClaudeConcurrent = Math.max(maxClaudeConcurrent, currentClaudeConcurrent);
      await new Promise(r => setTimeout(r, 50));
      currentClaudeConcurrent--;
    });

    await Promise.all([makeTask(), makeTask(), makeTask(), makeTask()]);
    expect(maxClaudeConcurrent).toBeLessThanOrEqual(2);
  });

  it('should respect per-type TTS limit', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 10, maxClaude: 10, maxTTS: 1 });
    let maxTTSConcurrent = 0;
    let currentTTSConcurrent = 0;

    const makeTask = () => pool.enqueue('elevenlabs', async () => {
      currentTTSConcurrent++;
      maxTTSConcurrent = Math.max(maxTTSConcurrent, currentTTSConcurrent);
      await new Promise(r => setTimeout(r, 50));
      currentTTSConcurrent--;
    });

    await Promise.all([makeTask(), makeTask(), makeTask()]);
    expect(maxTTSConcurrent).toBeLessThanOrEqual(1);
  });

  it('should allow mixed types up to total limit', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 3, maxClaude: 2, maxTTS: 2 });
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const makeTask = (type: 'claude' | 'elevenlabs') => pool.enqueue(type, async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await new Promise(r => setTimeout(r, 50));
      currentConcurrent--;
    });

    await Promise.all([
      makeTask('claude'), makeTask('claude'),
      makeTask('elevenlabs'), makeTask('elevenlabs'),
    ]);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('should process tasks in FIFO order', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 1, maxClaude: 1, maxTTS: 1 });
    const order: number[] = [];

    const makeTask = (id: number) => pool.enqueue('claude', async () => {
      order.push(id);
    });

    await Promise.all([makeTask(1), makeTask(2), makeTask(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('should reject enqueue after cancelAll', async () => {
    const pool = new ConcurrencyPool();
    pool.cancelAll();
    await expect(pool.enqueue('claude', async () => 42)).rejects.toThrow('cancelled');
  });

  it('should reject pending tasks on cancelAll', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 1, maxClaude: 1, maxTTS: 1 });

    // Fill the pool
    const blocker = pool.enqueue('claude', () => new Promise(r => setTimeout(r, 200)));

    // This should be queued
    const pending = pool.enqueue('claude', async () => 'done');

    pool.cancelAll();

    await expect(pending).rejects.toThrow('cancelled');
    // Blocker may resolve or reject depending on timing
    await blocker.catch(() => {});
  });

  it('should report stats correctly', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 4, maxClaude: 3, maxTTS: 2 });
    expect(pool.stats.activeTotal).toBe(0);
    expect(pool.stats.queued).toBe(0);
    expect(pool.stats.cancelled).toBe(false);

    pool.cancelAll();
    expect(pool.stats.cancelled).toBe(true);
  });

  it('should propagate task errors without affecting other tasks', async () => {
    const pool = new ConcurrencyPool({ maxTotal: 2, maxClaude: 2, maxTTS: 2 });

    const failingTask = pool.enqueue('claude', async () => { throw new Error('fail'); });
    const succeedingTask = pool.enqueue('claude', async () => 'success');

    await expect(failingTask).rejects.toThrow('fail');
    await expect(succeedingTask).resolves.toBe('success');
  });
});
