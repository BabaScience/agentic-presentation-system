/* ═══════════════════════════════════════════════════════════════
   SVG Component Library

   Reusable SVG visual elements for animated illustrations:
   - Infrastructure (Server, Database, Container, Pod, Network, Cloud)
   - User elements (User, Device, Terminal)
   - Flow elements (Arrow, DataFlow, Pipeline)
   - Abstract shapes (Box, Circle, Grid, Layer)
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';

interface SVGComponentProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
  label?: string;
  className?: string;
  animationDelay?: number;
}

// ═══ INFRASTRUCTURE ═══

export const Server: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2} width={size} height={size * 0.8} rx={4} fill={`${color}15`} stroke={color} strokeWidth={2} />
    <line x1={-size/2} y1={-size/6} x2={size/2} y2={-size/6} stroke={color} strokeWidth={1} opacity={0.5} />
    <line x1={-size/2} y1={size/6} x2={size/2} y2={size/6} stroke={color} strokeWidth={1} opacity={0.5} />
    <circle cx={-size/3} cy={-size/3} r={3} fill={color} opacity={0.8} />
    <circle cx={-size/6} cy={-size/3} r={3} fill={color} opacity={0.8} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
  </g>
);

export const Database: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <ellipse cx={0} cy={-size/3} rx={size/2} ry={size/6} fill={`${color}15`} stroke={color} strokeWidth={2} />
    <rect x={-size/2} y={-size/3} width={size} height={size * 0.6} fill={`${color}15`} stroke="none" />
    <ellipse cx={0} cy={size/4} rx={size/2} ry={size/6} fill={`${color}15`} stroke={color} strokeWidth={2} />
    <line x1={-size/2} y1={-size/3} x2={-size/2} y2={size/4} stroke={color} strokeWidth={2} />
    <line x1={size/2} y1={-size/3} x2={size/2} y2={size/4} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
  </g>
);

export const Container: React.FC<SVGComponentProps> = ({ x, y, size = 70, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2} width={size} height={size * 0.9} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2.5} strokeDasharray="8,4" />
    <rect x={-size/3} y={-size/4} width={size * 0.25} height={size * 0.3} rx={2} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
    <rect x={size/12} y={-size/4} width={size * 0.25} height={size * 0.3} rx={2} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
  </g>
);

export const Pod: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2} width={size} height={size * 0.7} rx={4} fill={`${color}20`} stroke={color} strokeWidth={2} />
    <rect x={-size/3} y={-size/3.5} width={size * 0.6} height={size * 0.4} rx={2} fill={`${color}40`} stroke={color} strokeWidth={1.5} />
    <circle cx={-size/4} cy={size/5} r={2} fill={color} />
    <circle cx={0} cy={size/5} r={2} fill={color} />
    <circle cx={size/4} cy={size/5} r={2} fill={color} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
  </g>
);

export const Cloud: React.FC<SVGComponentProps> = ({ x, y, size = 80, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <ellipse cx={-size/4} cy={0} rx={size/3} ry={size/4} fill={`${color}20`} stroke={color} strokeWidth={2} />
    <ellipse cx={size/6} cy={0} rx={size/2.5} ry={size/3.5} fill={`${color}20`} stroke={color} strokeWidth={2} />
    <ellipse cx={0} cy={-size/6} rx={size/3.5} ry={size/3} fill={`${color}20`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
  </g>
);

// ═══ USER ELEMENTS ═══

export const User: React.FC<SVGComponentProps> = ({ x, y, size = 40, color = '#ff2d7b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <circle cx={0} cy={-size/3} r={size/4} fill={`${color}30`} stroke={color} strokeWidth={2} />
    <path d={`M ${-size/2.5} ${size/6} Q 0 ${-size/6} ${size/2.5} ${size/6}`} fill={`${color}30`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
  </g>
);

export const Device: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2.5} width={size} height={size * 0.7} rx={4} fill={`${color}15`} stroke={color} strokeWidth={2} />
    <rect x={-size/2.5} y={size/5} width={size * 1.1} height={size/8} rx={2} fill={`${color}25`} stroke={color} strokeWidth={1.5} />
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
  </g>
);

// ═══ FLOW ELEMENTS ═══

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  label?: string;
  className?: string;
  animated?: boolean;
  animationDelay?: number;
}

export const Arrow: React.FC<ArrowProps> = ({ x1, y1, x2, y2, color = '#00e5ff', label, className = '', animated = false, animationDelay = 0 }) => {
  const id = `arrow-${Math.random().toString(36).substr(2, 9)}`;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <defs>
        <marker id={id} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} markerEnd={`url(#${id})`} opacity={0.8}>
        {animated && (
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
        )}
      </line>
      {label && <text x={midX} y={midY - 10} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const DataFlow: React.FC<ArrowProps> = ({ x1, y1, x2, y2, color = '#b388ff', className = '', animationDelay = 0 }) => (
  <g className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeDasharray="8,4" opacity={0.6}>
      <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.8s" repeatCount="indefinite" />
    </line>
  </g>
);

// ═══ ABSTRACT SHAPES ═══

export const Box: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2} width={size} height={size} rx={6} fill={`${color}20`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight={600}>{label}</text>}
  </g>
);

export const Layer: React.FC<SVGComponentProps & { layers?: number }> = ({ x, y, size = 70, color = '#00bcd4', label, layers = 3, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    {Array.from({ length: layers }).map((_, i) => (
      <rect
        key={i}
        x={-size/2 + i * 5}
        y={-size/2 + i * 5}
        width={size - i * 10}
        height={size/3}
        rx={4}
        fill={`${color}${20 - i * 5}`}
        stroke={color}
        strokeWidth={1.5}
        opacity={1 - i * 0.2}
      />
    ))}
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
  </g>
);

// ═══ UNIVERSAL TYPES (Topic-Agnostic) ═══

export const Concept: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <circle cx={0} cy={0} r={size/2} fill={`${color}15`} stroke={color} strokeWidth={2.5} />
    <circle cx={0} cy={0} r={size/2 - 8} fill="none" stroke={`${color}40`} strokeWidth={1} strokeDasharray="4,4" />
    {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(12, size/5)} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const Entity: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={8} fill={`${color}15`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(12, size/5)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const GroupEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={12} fill={`${color}08`} stroke={color} strokeWidth={2} strokeDasharray="8,4" />
    {label && <text x={0} y={-size*0.4 - 8} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const LabelEntity: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight={600} fontFamily="'Geist Mono', monospace">{label || ''}</text>
    <line x1={-size/3} y1={14} x2={size/3} y2={14} stroke={`${color}60`} strokeWidth={1.5} />
  </g>
);

export const ComparisonEntity: React.FC<SVGComponentProps> = ({ x, y, size = 120, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size*0.35} width={size*0.45} height={size*0.7} rx={6} fill={`${color}10`} stroke={color} strokeWidth={1.5} />
    <rect x={size*0.05} y={-size*0.35} width={size*0.45} height={size*0.7} rx={6} fill={`${color}10`} stroke={color} strokeWidth={1.5} />
    <text x={0} y={6} textAnchor="middle" fill={color} fontSize={16} fontWeight={700} opacity={0.6}>vs</text>
    {label && <text x={0} y={size*0.35 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const TimelineEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <line x1={-size/2} y1={0} x2={size/2} y2={0} stroke={color} strokeWidth={3} opacity={0.5} />
    <circle cx={0} cy={0} r={8} fill={color} />
    <circle cx={0} cy={0} r={4} fill="#0a0c14" />
    {label && <text x={0} y={25} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const MetricEntity: React.FC<SVGComponentProps> = ({ x, y, size = 40, color = '#ff2d7b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <circle cx={0} cy={0} r={size/2} fill={`${color}20`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={6} textAnchor="middle" fill={color} fontSize={Math.min(size/3, 16)} fontWeight={700} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const CycleEntity: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <circle cx={0} cy={0} r={size/2} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="12,4" opacity={0.8}>
      <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="8s" repeatCount="indefinite" />
    </circle>
    <circle cx={0} cy={0} r={size/2 - 10} fill={`${color}08`} stroke="none" />
    {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(11, size/6)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const StackEntity: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    {[0, 1, 2].map(i => (
      <rect key={i} x={-size/2 + i*3} y={-size/2 + i*14} width={size - i*6} height={size*0.28} rx={4}
        fill={`${color}${25 - i*5}`} stroke={color} strokeWidth={1.5} opacity={1 - i*0.15} />
    ))}
    {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const TreeEntity: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <circle cx={0} cy={-size/4} r={size/5} fill={`${color}25`} stroke={color} strokeWidth={2} />
    <line x1={-size/4} y1={size/8} x2={0} y2={-size/10} stroke={color} strokeWidth={1.5} opacity={0.6} />
    <line x1={size/4} y1={size/8} x2={0} y2={-size/10} stroke={color} strokeWidth={1.5} opacity={0.6} />
    <circle cx={-size/4} cy={size/4} r={size/7} fill={`${color}15`} stroke={color} strokeWidth={1.5} />
    <circle cx={size/4} cy={size/4} r={size/7} fill={`${color}15`} stroke={color} strokeWidth={1.5} />
    {label && <text x={0} y={size/2 + 18} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const BadgeEntity: React.FC<SVGComponentProps> = ({ x, y, size = 30, color = '#ff6b6b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size} y={-size/3} width={size*2} height={size*0.65} rx={size*0.3} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
    {label && <text x={0} y={4} textAnchor="middle" fill={color} fontSize={10} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);

export const QuoteEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={8} fill={`${color}0A`} stroke={color} strokeWidth={2} />
    <rect x={-size/2} y={-size*0.4} width={4} height={size*0.8} rx={2} fill={color} />
    <text x={-size/2 + 16} y={-size*0.22} fill={`${color}50`} fontSize={22} fontWeight={700}>"</text>
    {label && <text x={4} y={8} textAnchor="middle" fill={color} fontSize={Math.min(12, size/8)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
  </g>
);
