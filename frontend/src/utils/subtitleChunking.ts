/* ═══════════════════════════════════════════════════════════════
   Subtitle Chunking Utility

   Converts word-level timestamps into synchronized 5-word chunks
   for display during presentation narration.
   ═══════════════════════════════════════════════════════════════ */

import type { WordTimestamp } from '../../../shared/types';

export interface SubtitleChunk {
  text: string;
  startTime: number;
  endTime: number;
  words: WordTimestamp[];
}

/**
 * Chunks word timestamps into subtitle segments
 * @param timestamps Array of word timestamps
 * @param maxWords Maximum words per chunk (default: 5)
 * @returns Array of subtitle chunks
 */
export function chunkWordTimestamps(
  timestamps: WordTimestamp[],
  maxWords: number = 5
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

/**
 * Finds the currently active subtitle chunk based on playback time
 * @param chunks Array of subtitle chunks
 * @param currentTime Current playback time in milliseconds
 * @returns Currently active chunk or null
 */
export function getCurrentChunk(
  chunks: SubtitleChunk[],
  currentTime: number
): SubtitleChunk | null {
  // Binary search for performance
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
