/* ═══════════════════════════════════════════════════════════════
   ScenePresenter — Stage container.

   Wraps SceneGraphPresenter (engine-driven SVG renderer) and
   SubtitleDisplay. All visual command dispatch, sync markers,
   and cross-scene cleanup are handled by the stage engine.
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import type { StoryboardScene } from '../stores/sessionStore';
import { useSessionStore } from '../stores/sessionStore';
import { SubtitleDisplay } from './SubtitleDisplay';
import { SceneGraphPresenter } from './SceneGraphPresenter';

interface ScenePresenterProps {
  currentScene: StoryboardScene | null;
}

export function ScenePresenter({ currentScene }: ScenePresenterProps) {
  const store = useSessionStore();

  if (!currentScene) {
    return (
      <div className="scene-presenter">
        <div className="scene-empty">
          <p>Waiting for presentation to begin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scene-presenter">
      {/* Stage Canvas — engine-driven SVG renderer */}
      <div className="scene-visual-panel">
        <div className="scene-illustration-canvas">
          <SceneGraphPresenter
            currentScene={currentScene}
            currentAudioTime={store.currentAudioTime}
            wordTimestamps={store.currentWordTimestamps}
            width={1600}
            height={900}
          />
        </div>
      </div>

      {/* Synchronized Subtitles */}
      <SubtitleDisplay
        wordTimestamps={store.currentWordTimestamps}
        currentTime={store.currentAudioTime}
        visible={store.voiceEnabled && store.isSpeaking}
      />
    </div>
  );
}
