/* ═══════════════════════════════════════════════════════════════
   IllustrationLayer Component

   Manages and renders multiple illustration elements based on
   timing. Only shows illustrations that have reached their
   appearTimingMs threshold.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import type { IllustrationSpec } from '../../../shared/types';
import { IllustrationElement } from './IllustrationElement';

interface IllustrationLayerProps {
  illustrations: IllustrationSpec[];
  currentTime: number;
}

export function IllustrationLayer({ illustrations, currentTime }: IllustrationLayerProps) {
  const visibleIllustrations = useMemo(() => {
    return illustrations.filter(illus => currentTime >= illus.appearTimingMs);
  }, [illustrations, currentTime]);

  if (visibleIllustrations.length === 0) return null;

  return (
    <div className="illustration-layer">
      {visibleIllustrations.map(illustration => (
        <IllustrationElement
          key={illustration.id}
          spec={illustration}
          elapsed={currentTime - illustration.appearTimingMs}
        />
      ))}
    </div>
  );
}
