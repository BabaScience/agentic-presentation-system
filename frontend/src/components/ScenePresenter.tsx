/* ═══════════════════════════════════════════════════════════════
   ScenePresenter — Fluid card-based presentation view.

   Replaces the SVG knowledge graph canvas with a centered,
   animated content card + related concept cluster chips.
   The knowledge graph is internal only — not rendered as a graph.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import type { KGNode, KGEdge, PresentationScene } from '../stores/sessionStore';
import { useSessionStore } from '../stores/sessionStore';
import { SubtitleDisplay } from './SubtitleDisplay';
import { IllustrationCanvas } from './IllustrationCanvas';
import type { ElementType, IllustrationSpec } from '../../../shared/types';

const TYPE_COLORS: Record<string, string> = {
  CONCEPT: '#00e5ff', RELATIONSHIP: '#ff2d7b', EXAMPLE: '#00e676',
  ANALOGY: '#ffab00', DEFINITION: '#b388ff', PROCESS: '#00bcd4',
  RESOURCE: '#4caf50', COUNTERPOINT: '#ff6b9d',
};

const TYPE_ICONS: Record<string, string> = {
  CONCEPT: '\uD83D\uDCA1', RELATIONSHIP: '\uD83D\uDD17', EXAMPLE: '\uD83D\uDCCB',
  ANALOGY: '\uD83D\uDD04', DEFINITION: '\uD83D\uDCD6', PROCESS: '\u26A1',
  RESOURCE: '\uD83D\uDD17', COUNTERPOINT: '\u26A0\uFE0F',
};

// Helper functions for illustration metadata
function getIllustrationIcon(elementType: ElementType): string {
  const iconMap: Record<ElementType, string> = {
    box: '◻️',
    circle: '⭕',
    arrow: '➡️',
    text: '📝',
    code: '💻',
    icon: '🎭',
    split_panel: '⚡',
    flow_sequence: '🔄',
    callout: '💬',
  };
  return iconMap[elementType] || '✨';
}

function formatIllustrationLabel(illus: IllustrationSpec): string {
  const typeMap: Record<string, string> = {
    shape: 'Shape',
    icon: 'Icon',
    diagram: 'Diagram',
  };
  return `${typeMap[illus.type] || 'Visual'} · ${illus.elementType}`;
}

interface ScenePresenterProps {
  currentScene: PresentationScene | null;
  nodes: Record<string, KGNode>;
  edges: Record<string, KGEdge>;
  narrationText: string;
  sceneTransitioning: boolean;
  revealedNodeIds: string[];
}

// Build breadcrumb path from parentId chain
function buildBreadcrumbs(
  node: KGNode | undefined,
  nodes: Record<string, KGNode>,
): Array<{ id: string; label: string; icon?: string }> {
  if (!node) return [];
  const crumbs: Array<{ id: string; label: string; icon?: string }> = [];
  let current: KGNode | undefined = node;

  while (current) {
    crumbs.unshift({
      id: current.id,
      label: current.label,
      icon: current.visual?.icon || TYPE_ICONS[current.type],
    });
    current = current.parentId ? nodes[current.parentId] : undefined;
  }

  return crumbs;
}

export function ScenePresenter({
  currentScene,
  nodes,
  edges,
  narrationText,
  sceneTransitioning,
  revealedNodeIds,
}: ScenePresenterProps) {
  const store = useSessionStore();
  const focusNode = currentScene ? nodes[currentScene.focusNodeId] : null;
  const revealedSet = useMemo(() => new Set(revealedNodeIds), [revealedNodeIds]);

  // Find related concepts via edges
  const relatedConcepts = useMemo(() => {
    if (!focusNode) return [];

    const related: Array<{
      node: KGNode;
      edgeLabel: string;
      direction: 'from' | 'to';
    }> = [];

    for (const edge of Object.values(edges)) {
      if (edge.sourceId === focusNode.id) {
        const target = nodes[edge.targetId];
        if (target && target.id !== focusNode.id) {
          related.push({ node: target, edgeLabel: edge.label, direction: 'to' });
        }
      } else if (edge.targetId === focusNode.id) {
        const source = nodes[edge.sourceId];
        if (source && source.id !== focusNode.id) {
          related.push({ node: source, edgeLabel: edge.label, direction: 'from' });
        }
      }
    }

    // Deduplicate by node id
    const seen = new Set<string>();
    return related.filter(r => {
      if (seen.has(r.node.id)) return false;
      seen.add(r.node.id);
      return true;
    });
  }, [focusNode, edges, nodes]);

  // Breadcrumb path
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(focusNode || undefined, nodes),
    [focusNode, nodes],
  );

  if (!currentScene || !focusNode) {
    return (
      <div className="scene-presenter">
        <div className="scene-empty">
          <p>Waiting for presentation to begin...</p>
        </div>
      </div>
    );
  }

  const color = TYPE_COLORS[focusNode.type] || '#00e5ff';
  const icon = focusNode.visual?.icon || TYPE_ICONS[focusNode.type] || '\uD83D\uDCA1';

  return (
    <div className="scene-presenter">
      {/* Left Panel: Content Card */}
      <div className="scene-content-panel">
        {/* Breadcrumb Path */}
        {breadcrumbs.length > 1 && (
          <div className="breadcrumb-path">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id}>
                {i > 0 && <span className="breadcrumb-sep">/</span>}
                <span className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}>
                  {crumb.icon} {crumb.label}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Active Scene Card */}
        <div
          className={`scene-card ${sceneTransitioning ? 'scene-card-entering' : ''}`}
          style={{ '--accent-color': color } as React.CSSProperties}
        >
          {/* Accent bar at top */}
          <div className="scene-card-accent" style={{ background: color }} />

          {/* Header: icon + title + type badge */}
          <div className="scene-card-header">
            <span className="scene-card-icon">{icon}</span>
            <h2 className="scene-card-title">{focusNode.label}</h2>
            <span
              className="scene-card-type"
              style={{ color, borderColor: color }}
            >
              {focusNode.type}
            </span>
          </div>

          {/* Content text */}
          <div className="scene-card-content">
            <p>{focusNode.content}</p>
          </div>
        </div>

        {/* Animated Illustrations Metadata Section */}
        {currentScene?.illustrations && currentScene.illustrations.length > 0 && (
          <div className="illustration-cluster">
            <span className="illustration-label">Visual Timeline</span>
            <div className="illustration-chips">
              {currentScene.illustrations.map((illus, idx) => {
                const isRevealed = store.currentAudioTime >= illus.appearTimingMs;
                const chipColor = illus.style.stroke || illus.style.fill || '#00e5ff';

                return (
                  <div
                    key={illus.id}
                    className={`illustration-chip ${isRevealed ? 'chip-revealed' : 'chip-dim'}`}
                    style={{
                      '--chip-color': chipColor,
                      animationDelay: `${idx * 80}ms`,
                    } as React.CSSProperties}
                  >
                    <span className="chip-icon">{getIllustrationIcon(illus.elementType)}</span>
                    <div className="chip-text">
                      <span className="chip-label">{formatIllustrationLabel(illus)}</span>
                      <span className="chip-timing">{(illus.appearTimingMs / 1000).toFixed(1)}s</span>
                    </div>
                    {isRevealed && <span className="chip-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Large Illustration Canvas */}
      <div className="scene-visual-panel">
        <div className="scene-illustration-canvas">
          {(currentScene?.visualScript || currentScene?.illustrations) ? (
            <IllustrationCanvas
              visualScript={currentScene.visualScript}
              illustrations={currentScene.illustrations}
              currentTime={store.currentAudioTime}
              width={1600}
              height={900}
            />
          ) : (
            <div className="canvas-placeholder">
              <span className="canvas-placeholder-icon">🎨</span>
              <p>Visual illustrations will appear here</p>
            </div>
          )}
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
