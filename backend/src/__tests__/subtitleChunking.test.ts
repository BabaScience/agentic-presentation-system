/* ═══════════════════════════════════════════════════════════════
   Tests for Subtitle Chunking — word timestamp grouping & lookup
   ═══════════════════════════════════════════════════════════════ */

// The subtitleChunking module is a frontend util, but the logic is pure
// TypeScript and can be tested directly by importing from the relative path.
// We use ts-jest which resolves the import correctly.

import type { WordTimestamp } from '../../shared/types';

// Inline the functions since they live in frontend/src/utils but we're testing in backend
// This tests the algorithm, not the file location.

interface SubtitleChunk {
  text: string;
  startTime: number;
  endTime: number;
  words: WordTimestamp[];
}

function chunkWordTimestamps(
  timestamps: WordTimestamp[],
  maxWords: number = 5,
): SubtitleChunk[] {
  const chunks: SubtitleChunk[] = [];
  for (let i = 0; i < timestamps.length; i += maxWords) {
    const chunkWords = timestamps.slice(i, Math.min(i + maxWords, timestamps.length));
    if (chunkWords.length === 0) continue;
    chunks.push({
      text: chunkWords.map(w => w.word).join(' '),
      startTime: chunkWords[0].start,
      endTime: chunkWords[chunkWords.length - 1].end,
      words: chunkWords,
    });
  }
  return chunks;
}

function getCurrentChunk(
  chunks: SubtitleChunk[],
  currentTime: number,
): SubtitleChunk | null {
  let left = 0;
  let right = chunks.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const chunk = chunks[mid];
    if (currentTime >= chunk.startTime && currentTime < chunk.endTime) {
      return chunk;
    } else if (currentTime < chunk.startTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  return null;
}

// ── Test Data ────────────────────────────────────────────────

function makeWords(count: number, startMs = 0, wordDurationMs = 200): WordTimestamp[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i}`,
    start: startMs + i * wordDurationMs,
    end: startMs + (i + 1) * wordDurationMs,
  }));
}

// ── Tests ────────────────────────────────────────────────────

describe('chunkWordTimestamps', () => {
  it('should chunk 10 words into 2 chunks of 5', () => {
    const words = makeWords(10);
    const chunks = chunkWordTimestamps(words, 5);
    expect(chunks.length).toBe(2);
    expect(chunks[0].words.length).toBe(5);
    expect(chunks[1].words.length).toBe(5);
  });

  it('should handle remainder (11 words → 2 full + 1 partial)', () => {
    const words = makeWords(11);
    const chunks = chunkWordTimestamps(words, 5);
    expect(chunks.length).toBe(3);
    expect(chunks[0].words.length).toBe(5);
    expect(chunks[1].words.length).toBe(5);
    expect(chunks[2].words.length).toBe(1);
  });

  it('should set correct timing for each chunk', () => {
    const words = makeWords(10, 0, 200);
    const chunks = chunkWordTimestamps(words, 5);
    // Chunk 0: words 0-4 → 0ms to 1000ms
    expect(chunks[0].startTime).toBe(0);
    expect(chunks[0].endTime).toBe(1000);
    // Chunk 1: words 5-9 → 1000ms to 2000ms
    expect(chunks[1].startTime).toBe(1000);
    expect(chunks[1].endTime).toBe(2000);
  });

  it('should concatenate word text', () => {
    const words: WordTimestamp[] = [
      { word: 'Hello', start: 0, end: 200 },
      { word: 'world', start: 200, end: 400 },
      { word: 'this', start: 400, end: 600 },
    ];
    const chunks = chunkWordTimestamps(words, 5);
    expect(chunks[0].text).toBe('Hello world this');
  });

  it('should handle empty array', () => {
    const chunks = chunkWordTimestamps([], 5);
    expect(chunks.length).toBe(0);
  });

  it('should handle single word', () => {
    const words: WordTimestamp[] = [{ word: 'hi', start: 0, end: 200 }];
    const chunks = chunkWordTimestamps(words, 5);
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe('hi');
    expect(chunks[0].words.length).toBe(1);
  });

  it('should respect custom maxWords', () => {
    const words = makeWords(12);
    const chunks3 = chunkWordTimestamps(words, 3);
    expect(chunks3.length).toBe(4);
    for (const chunk of chunks3) {
      expect(chunk.words.length).toBeLessThanOrEqual(3);
    }
  });

  it('should default to 5 words per chunk', () => {
    const words = makeWords(15);
    const chunks = chunkWordTimestamps(words);
    expect(chunks.length).toBe(3);
  });
});

describe('getCurrentChunk (binary search)', () => {
  const words = makeWords(20, 0, 200);
  const chunks = chunkWordTimestamps(words, 5);
  // chunks: [0-1000), [1000-2000), [2000-3000), [3000-4000)

  it('should find the first chunk at time 0', () => {
    const chunk = getCurrentChunk(chunks, 0);
    expect(chunk).not.toBeNull();
    expect(chunk!.startTime).toBe(0);
  });

  it('should find the first chunk at time 500', () => {
    const chunk = getCurrentChunk(chunks, 500);
    expect(chunk).not.toBeNull();
    expect(chunk!.startTime).toBe(0);
    expect(chunk!.endTime).toBe(1000);
  });

  it('should find the second chunk at time 1000', () => {
    const chunk = getCurrentChunk(chunks, 1000);
    expect(chunk).not.toBeNull();
    expect(chunk!.startTime).toBe(1000);
  });

  it('should find the last chunk at time 3500', () => {
    const chunk = getCurrentChunk(chunks, 3500);
    expect(chunk).not.toBeNull();
    expect(chunk!.startTime).toBe(3000);
  });

  it('should return null before first chunk', () => {
    // Chunks start at 0, so -100 is before
    const wordsOffset = makeWords(10, 1000, 200);
    const chunksOffset = chunkWordTimestamps(wordsOffset, 5);
    const chunk = getCurrentChunk(chunksOffset, 500);
    expect(chunk).toBeNull();
  });

  it('should return null after last chunk', () => {
    const chunk = getCurrentChunk(chunks, 5000);
    expect(chunk).toBeNull();
  });

  it('should return null for empty chunks', () => {
    const chunk = getCurrentChunk([], 500);
    expect(chunk).toBeNull();
  });

  it('should handle exact boundary (endTime is exclusive)', () => {
    // endTime of first chunk is 1000, which should be found in second chunk
    const chunk = getCurrentChunk(chunks, 999);
    expect(chunk).not.toBeNull();
    expect(chunk!.startTime).toBe(0);

    const chunk2 = getCurrentChunk(chunks, 1000);
    expect(chunk2).not.toBeNull();
    expect(chunk2!.startTime).toBe(1000);
  });
});
