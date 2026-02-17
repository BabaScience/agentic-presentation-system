/* ═══════════════════════════════════════════════════════════════
   SubtitleDisplay Component

   Displays synchronized subtitles at the bottom center of the screen.
   Shows 5 words at a time with smooth fade transitions between chunks.
   Highlights the current word being spoken.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo, useState, useEffect, useRef } from 'react';
import type { WordTimestamp } from '../../../shared/types';
import { chunkWordTimestamps, getCurrentChunk } from '../utils/subtitleChunking';

interface SubtitleDisplayProps {
  wordTimestamps: WordTimestamp[];
  currentTime: number;
  visible: boolean;
}

export function SubtitleDisplay({ wordTimestamps, currentTime, visible }: SubtitleDisplayProps) {
  const [isExiting, setIsExiting] = useState(false);
  const previousChunkRef = useRef<string | null>(null);

  const chunks = useMemo(
    () => chunkWordTimestamps(wordTimestamps, 5),
    [wordTimestamps]
  );

  const currentChunk = useMemo(
    () => getCurrentChunk(chunks, currentTime),
    [chunks, currentTime]
  );

  useEffect(() => {
    if (currentChunk?.text !== previousChunkRef.current) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsExiting(false);
        previousChunkRef.current = currentChunk?.text || null;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentChunk]);

  if (!visible || !currentChunk) return null;

  return (
    <div className="subtitle-container">
      <div className={`subtitle-text ${isExiting ? 'exiting' : ''}`}>
        {currentChunk.words.map((word, i) => {
          const isActive = currentTime >= word.start && currentTime < word.end;
          const isPast = currentTime >= word.end;
          return (
            <span
              key={`${word.word}-${i}`}
              className={`subtitle-word${isActive ? ' subtitle-word-active' : ''}${isPast ? ' subtitle-word-past' : ''}`}
            >
              {word.word}{i < currentChunk.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
