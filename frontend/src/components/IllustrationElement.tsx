/* ═══════════════════════════════════════════════════════════════
   IllustrationElement Component

   Renders individual animated illustration elements (shapes, icons,
   arrows, diagrams) with time-based animations and positioning.
   ═══════════════════════════════════════════════════════════════ */

import type { IllustrationSpec } from '../../../shared/types';

interface IllustrationElementProps {
  spec: IllustrationSpec;
  elapsed: number;
}

export function IllustrationElement({ spec, elapsed }: IllustrationElementProps) {
  const { position, size, style, animation, elementType, content } = spec;

  // Calculate animation progress
  const progress = Math.min(elapsed / animation.duration, 1);

  // Base styles
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    ...style,
  };

  // Add animation class based on type
  const animationClass = `illus-${animation.type}`;

  // Render different element types
  switch (elementType) {
    case 'circle':
      return (
        <div
          className={`illustration-element ${animationClass}`}
          style={{
            ...baseStyle,
            borderRadius: '50%',
            border: style.stroke ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
            background: style.fill || 'transparent',
          }}
        />
      );

    case 'box':
      return (
        <div
          className={`illustration-element ${animationClass}`}
          style={{
            ...baseStyle,
            borderRadius: `${style.cornerRadius || 8}px`,
            border: style.stroke ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
            background: style.fill || 'transparent',
          }}
        />
      );

    case 'arrow':
      return (
        <div
          className={`illustration-element illustration-arrow ${animationClass}`}
          style={baseStyle}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 30">
            <defs>
              <marker
                id={`arrowhead-${spec.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={style.stroke} />
              </marker>
            </defs>
            <line
              x1="0"
              y1="15"
              x2="100"
              y2="15"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth || 2}
              markerEnd={`url(#arrowhead-${spec.id})`}
            />
          </svg>
        </div>
      );

    case 'icon':
      return (
        <div
          className={`illustration-element illustration-icon ${animationClass}`}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${size.width * 0.6}px`,
          }}
        >
          {content}
        </div>
      );

    case 'split_panel':
      return (
        <div
          className={`illustration-element illustration-split-panel ${animationClass}`}
          style={{
            ...baseStyle,
            borderRadius: '8px',
            border: style.stroke ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
            background: style.fill || 'transparent',
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, borderRight: `1px solid ${style.stroke}` }} />
          <div style={{ flex: 1 }} />
        </div>
      );

    default:
      return (
        <div className={`illustration-element ${animationClass}`} style={baseStyle} />
      );
  }
}
