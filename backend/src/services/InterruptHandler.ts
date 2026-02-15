/* ═══════════════════════════════════════════════════════════════
   Interrupt Handler — Bookmark Creation, State Snapshot,
   Seamless Resume with Bridging Phrases
   ═══════════════════════════════════════════════════════════════ */

import { type PresentationBookmark, type PresentationScene } from '../../shared/types';

const BRIDGING_PHRASES = [
  'So, as we were saying,',
  'Coming back to where we were,',
  'Returning to our main topic,',
  'Now, picking up from where we left off,',
  'Alright, back to the main thread —',
  'Good question! Now, continuing from before,',
];

export class InterruptHandler {

  // ── Create Bookmark at Interrupt Point ────────────────────
  createBookmark(
    currentScene: PresentationScene | undefined,
    traversalIndex: number,
  ): PresentationBookmark {
    if (!currentScene) {
      return {
        sceneId: '',
        nodeId: '',
        wordOffset: 0,
        audioTimestamp: 0,
        elementStates: {},
        traversalIndex,
        timestamp: Date.now(),
      };
    }

    // Snapshot element visual states
    const elementStates: Record<string, { opacity: number; x: number; y: number; highlighted: boolean }> = {};

    for (const nodeId of currentScene.nodeIds) {
      elementStates[nodeId] = {
        opacity: 1,
        x: 0,
        y: 0,
        highlighted: nodeId === currentScene.focusNodeId,
      };
    }

    return {
      sceneId: currentScene.id,
      nodeId: currentScene.focusNodeId,
      wordOffset: 0, // In production: track actual word offset from TTS sync
      audioTimestamp: Date.now(),
      elementStates,
      traversalIndex,
      timestamp: Date.now(),
    };
  }

  // ── Generate Bridging Phrase for Resume ───────────────────
  getBridgingPhrase(bookmarkedScene: PresentationScene): string {
    const phrase = BRIDGING_PHRASES[Math.floor(Math.random() * BRIDGING_PHRASES.length)];
    return phrase;
  }

  // ── Compute Resume Narration ─────────────────────────────
  // Trims narration from the bookmarked word offset
  getResumeNarration(scene: PresentationScene, bookmark: PresentationBookmark): string {
    const words = scene.narration.split(/\s+/);
    const resumeFrom = Math.max(0, bookmark.wordOffset - 3); // Overlap 3 words for context
    const remaining = words.slice(resumeFrom).join(' ');

    const bridging = this.getBridgingPhrase(scene);
    return `${bridging} ${remaining}`;
  }

  // ── Compute Visual Commands to Restore State ─────────────
  // After interrupt answer, we need to:
  // 1. Dim the interrupt nodes
  // 2. Restore focus to the bookmarked scene
  // 3. Re-highlight the bookmarked elements
  getRestoreCommands(bookmark: PresentationBookmark): Array<{
    type: string;
    targetId: string;
    params?: Record<string, any>;
  }> {
    const commands: Array<{ type: string; targetId: string; params?: Record<string, any> }> = [];

    // Restore each element to its bookmarked state
    for (const [nodeId, state] of Object.entries(bookmark.elementStates)) {
      commands.push({
        type: 'highlight',
        targetId: nodeId,
        params: {
          opacity: state.opacity,
          highlighted: state.highlighted,
        },
      });
    }

    // Zoom back to bookmarked scene viewport
    commands.push({
      type: 'zoom',
      targetId: bookmark.sceneId,
      params: { smooth: true, duration: 800 },
    });

    return commands;
  }
}
