/* ═══════════════════════════════════════════════════════════════
   IllustrationCanvas Component

   Large SVG canvas for rendering frame-based visual narratives.
   Supports both legacy IllustrationSpec and new frame-based system.
   Synchronized to audio narration timing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { IllustrationSpec, VisualScript, VisualEntity, IllustrationFrame } from '../../../shared/types';
import { Server, Database, Container, Pod, Cloud, User, Device, Arrow, DataFlow, Box, Layer } from './svg/SVGLibrary';
import { FrameRenderer } from './FrameRenderer';

interface IllustrationCanvasProps {
  illustrations?: IllustrationSpec[];
  visualScript?: VisualScript;
  currentTime: number;
  width?: number;
  height?: number;
}

export function IllustrationCanvas({ illustrations, visualScript, currentTime, width = 1600, height = 900 }: IllustrationCanvasProps) {

  const useFrameSystem = visualScript && visualScript.frames.length > 0;

  const currentFrame = useMemo(() => {
    if (!visualScript) return null;
    return visualScript.frames.find(
      frame => currentTime >= frame.startTime && currentTime < frame.endTime
    ) || visualScript.frames[visualScript.frames.length - 1];
  }, [visualScript, currentTime]);

  // Entity lifecycle tracking for smooth frame transitions
  const [exitingEntities, setExitingEntities] = useState<VisualEntity[]>([]);
  const prevFrameRef = useRef<IllustrationFrame | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentFrame || currentFrame === prevFrameRef.current) return;

    const prevEntities = prevFrameRef.current?.entities || [];
    const nextKeys = new Set(currentFrame.entities.map(e => `${e.type}-${e.label}`));

    // Entities in previous frame but not in current → exiting
    const exiting = prevEntities.filter(e => !nextKeys.has(`${e.type}-${e.label}`));

    if (exiting.length > 0) {
      setExitingEntities(exiting);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = window.setTimeout(() => setExitingEntities([]), 400);
    } else {
      setExitingEntities([]);
    }

    prevFrameRef.current = currentFrame;
  }, [currentFrame]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  const visibleIllustrations = useMemo(() => {
    if (!illustrations) return [];
    return illustrations.filter(illus => currentTime >= illus.appearTimingMs);
  }, [illustrations, currentTime]);

  if (!useFrameSystem && visibleIllustrations.length === 0) {
    return (
      <div className="illustration-canvas-empty">
        <div className="canvas-placeholder">
          <span className="canvas-placeholder-icon">✨</span>
          <p>Visual illustration will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="illustration-canvas-container">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="illustration-canvas-svg"
      >
        {/* ── Shared Defs: grid, glow filters, gradients ── */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5"/>
          </pattern>

          {/* Soft glow used on shapes */}
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#00e5ff" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ff2d7b" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#00e676" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#ffab00" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#b388ff" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glowColor"/>
            <feMerge><feMergeNode in="glowColor"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Soft shadow for text labels */}
          <filter id="text-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.7"/>
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#grid)" />

        {useFrameSystem && currentFrame && (
          <FrameRenderer
            entities={currentFrame.entities}
            exitingEntities={exitingEntities}
            canvasWidth={width}
            canvasHeight={height}
          />
        )}

        {!useFrameSystem && visibleIllustrations.map(illus => renderIllustration(illus, currentTime, width, height))}
      </svg>
    </div>
  );
}

/* ─── Pick glow filter by colour ─── */
function glowFilter(color: string): string | undefined {
  if (color.includes('e5ff') || color.includes('bcd4')) return 'url(#glow-cyan)';
  if (color.includes('2d7b') || color.includes('6b9d') || color.includes('6b6b')) return 'url(#glow-pink)';
  if (color.includes('e676') || color.includes('ff00') || color.includes('4caf')) return 'url(#glow-green)';
  if (color.includes('ab00') || color.includes('f57c')) return 'url(#glow-amber)';
  if (color.includes('88ff') || color.includes('7c4d')) return 'url(#glow-purple)';
  return 'url(#glow-cyan)';
}

function renderIllustration(illus: IllustrationSpec, currentTime: number, canvasW: number, canvasH: number) {
  const elapsed = currentTime - illus.appearTimingMs;
  const animClass = `illus-${illus.animation.type}`;

  const x = (illus.position.x / 100) * canvasW;
  const y = (illus.position.y / 100) * canvasH;

  const color = illus.style.stroke || illus.style.fill || '#00e5ff';
  const sw = illus.style.strokeWidth || 2;
  const filter = glowFilter(color);

  switch (illus.elementType) {
    case 'box':
      return (
        <g key={illus.id} className={animClass} filter={filter}>
          <rect
            x={x - illus.size.width / 2}
            y={y - illus.size.height / 2}
            width={illus.size.width}
            height={illus.size.height}
            rx={12}
            fill={illus.style.fill || `${color}0A`}
            stroke={color}
            strokeWidth={sw}
            opacity={illus.style.opacity || 0.85}
          />
          {illus.content && (
            <text
              x={x} y={y + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize={Math.max(16, Math.min(illus.size.width / 8, 28))}
              fontWeight={600}
              fontFamily="'Geist Mono', monospace"
              filter="url(#text-shadow)"
            >
              {illus.content}
            </text>
          )}
        </g>
      );

    case 'circle':
      return (
        <g key={illus.id} className={animClass} filter={sw > 1.5 ? filter : undefined}>
          <circle
            cx={x}
            cy={y}
            r={illus.size.width / 2}
            fill={illus.style.fill || 'transparent'}
            stroke={color}
            strokeWidth={sw}
            opacity={illus.style.opacity || 0.8}
          />
          {illus.content && (
            <text
              x={x} y={y + illus.size.width / 2 + 28}
              textAnchor="middle"
              fill={color}
              fontSize={Math.max(14, Math.min(illus.size.width / 10, 22))}
              fontWeight={500}
              fontFamily="'Geist Mono', monospace"
              filter="url(#text-shadow)"
            >
              {illus.content}
            </text>
          )}
        </g>
      );

    case 'arrow':
      return (
        <Arrow
          key={illus.id}
          x1={x}
          y1={y}
          x2={x + illus.size.width}
          y2={y}
          color={color}
          label={illus.content}
          className={animClass}
          animated={illus.animation.type === 'pulse'}
        />
      );

    case 'code':
      return (
        <g key={illus.id} className={animClass} filter={filter}>
          {/* Outer frame */}
          <rect
            x={x - illus.size.width / 2}
            y={y - illus.size.height / 2}
            width={illus.size.width}
            height={illus.size.height}
            rx={12}
            fill={illus.style.fill || `${color}08`}
            stroke={color}
            strokeWidth={sw}
          />
          {/* Title bar */}
          <rect
            x={x - illus.size.width / 2}
            y={y - illus.size.height / 2}
            width={illus.size.width}
            height={32}
            rx={12}
            fill={`${color}18`}
          />
          {/* Decorative window dots */}
          <circle cx={x - illus.size.width / 2 + 20} cy={y - illus.size.height / 2 + 16} r={5} fill="#ff5f57" opacity={0.7}/>
          <circle cx={x - illus.size.width / 2 + 38} cy={y - illus.size.height / 2 + 16} r={5} fill="#ffbd2e" opacity={0.7}/>
          <circle cx={x - illus.size.width / 2 + 56} cy={y - illus.size.height / 2 + 16} r={5} fill="#28c940" opacity={0.7}/>
          {illus.content && (
            <text
              x={x} y={y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize={Math.max(16, Math.min(illus.size.width / 12, 26))}
              fontWeight={600}
              fontFamily="'Geist Mono', monospace"
              filter="url(#text-shadow)"
            >
              {illus.content}
            </text>
          )}
        </g>
      );

    case 'split_panel':
      return (
        <g key={illus.id} className={animClass}>
          <rect
            x={x - illus.size.width / 2}
            y={y - illus.size.height / 2}
            width={illus.size.width / 2 - 8}
            height={illus.size.height}
            rx={10}
            fill={`${color}0A`}
            stroke={color}
            strokeWidth={sw}
            filter={filter}
          />
          <rect
            x={x + 8}
            y={y - illus.size.height / 2}
            width={illus.size.width / 2 - 8}
            height={illus.size.height}
            rx={10}
            fill={`${color}0A`}
            stroke={color}
            strokeWidth={sw}
            filter={filter}
          />
          {illus.content && (
            <text
              x={x} y={y + illus.size.height / 2 + 28}
              textAnchor="middle" fill={color}
              fontSize={16} fontWeight={500}
              fontFamily="'Geist Mono', monospace"
              filter="url(#text-shadow)"
            >
              {illus.content}
            </text>
          )}
        </g>
      );

    case 'flow_sequence':
      return (
        <g key={illus.id} className={animClass}>
          {Array.from({ length: 3 }).map((_, i) => (
            <React.Fragment key={i}>
              <Box
                x={x + i * (illus.size.width / 2.5)}
                y={y}
                size={illus.size.width / 4}
                color={color}
                label={`${i + 1}`}
              />
              {i < 2 && (
                <Arrow
                  x1={x + i * (illus.size.width / 2.5) + illus.size.width / 8}
                  y1={y}
                  x2={x + (i + 1) * (illus.size.width / 2.5) - illus.size.width / 8}
                  y2={y}
                  color={color}
                  animated={true}
                />
              )}
            </React.Fragment>
          ))}
        </g>
      );

    case 'icon':
      return (
        <g key={illus.id} className={animClass}>
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={illus.size.width * 0.7}
            opacity={illus.style.opacity || 0.9}
          >
            {illus.content || '✨'}
          </text>
        </g>
      );

    case 'callout':
      return (
        <g key={illus.id} className={animClass} filter={filter}>
          <rect
            x={x - illus.size.width / 2}
            y={y - illus.size.height / 2}
            width={illus.size.width}
            height={illus.size.height}
            rx={16}
            fill={`${color}0C`}
            stroke={color}
            strokeWidth={sw}
          />
          {illus.content && (
            <text
              x={x} y={y + 5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize={16}
              fontWeight={500}
              fontFamily="'Geist Mono', monospace"
              filter="url(#text-shadow)"
            >
              {illus.content}
            </text>
          )}
        </g>
      );

    default:
      return null;
  }
}
