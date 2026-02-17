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

// ═══ INFRASTRUCTURE (Distinct Shapes) ═══

export const LoadBalancerShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  // Hexagon with diverging arrows
  const s = size / 2;
  const hex = [
    [0, -s], [s * 0.87, -s * 0.5], [s * 0.87, s * 0.5],
    [0, s], [-s * 0.87, s * 0.5], [-s * 0.87, -s * 0.5],
  ].map(([px, py]) => `${px},${py}`).join(' ');
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <polygon points={hex} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Diverging arrows inside */}
      <line x1={0} y1={-s * 0.25} x2={-s * 0.4} y2={s * 0.3} stroke={color} strokeWidth={2} opacity={0.7} />
      <line x1={0} y1={-s * 0.25} x2={s * 0.4} y2={s * 0.3} stroke={color} strokeWidth={2} opacity={0.7} />
      <polygon points={`${-s * 0.4 - 4},${s * 0.3 - 2} ${-s * 0.4},${s * 0.3 + 6} ${-s * 0.4 + 4},${s * 0.3 - 2}`} fill={color} opacity={0.7} />
      <polygon points={`${s * 0.4 - 4},${s * 0.3 - 2} ${s * 0.4},${s * 0.3 + 6} ${s * 0.4 + 4},${s * 0.3 - 2}`} fill={color} opacity={0.7} />
      {label && <text x={0} y={s + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const QueueShape: React.FC<SVGComponentProps> = ({ x, y, size = 65, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  // Three stacked horizontal bars with arrow
  const w = size * 0.8;
  const h = size * 0.15;
  const gap = size * 0.22;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      {[0, 1, 2].map(i => (
        <rect key={i} x={-w / 2} y={-gap + i * gap} width={w} height={h} rx={3}
          fill={`${color}${30 - i * 8}`} stroke={color} strokeWidth={1.5} />
      ))}
      {/* Right arrow indicating FIFO direction */}
      <line x1={w / 2 + 6} y1={0} x2={w / 2 + 20} y2={0} stroke={color} strokeWidth={2} opacity={0.7} />
      <polygon points={`${w / 2 + 16},-4 ${w / 2 + 24},0 ${w / 2 + 16},4`} fill={color} opacity={0.7} />
      {label && <text x={0} y={gap + h + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const CacheShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  // Lightning bolt inside circle
  const r = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <circle cx={0} cy={0} r={r} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Lightning bolt */}
      <path d={`M ${-r * 0.15} ${-r * 0.5} L ${-r * 0.3} ${r * 0.05} L ${r * 0.05} ${-r * 0.05} L ${-r * 0.1} ${r * 0.5} L ${r * 0.3} ${-r * 0.05} L ${-r * 0.05} ${r * 0.05} Z`}
        fill={color} opacity={0.6} />
      {label && <text x={0} y={r + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const ServiceShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  // Gear icon inside rounded rectangle
  const w = size;
  const h = size * 0.8;
  const gr = size * 0.2; // gear radius
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Simple gear: circle with notches */}
      <circle cx={0} cy={-h * 0.05} r={gr} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />
      <circle cx={0} cy={-h * 0.05} r={gr * 0.4} fill={color} opacity={0.4} />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const ix = Math.cos(rad) * gr;
        const iy = Math.sin(rad) * gr - h * 0.05;
        return <rect key={i} x={ix - 3} y={iy - 3} width={6} height={6} rx={1} fill={color} opacity={0.5} transform={`rotate(${angle}, ${ix}, ${iy})`} />;
      })}
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const ProcessShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00bcd4', label, className = '', animationDelay = 0 }) => {
  // Rectangle with play-button triangle inside
  const w = size;
  const h = size * 0.8;
  const ts = size * 0.2; // triangle size
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Play triangle */}
      <polygon points={`${-ts * 0.6},${-ts} ${ts * 0.8},0 ${-ts * 0.6},${ts}`}
        fill={color} opacity={0.5} />
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

// ═══ EXTENDED IT INFRASTRUCTURE ═══

export const FirewallShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#ff4444', label, className = '', animationDelay = 0 }) => {
  // Shield shape with lock icon
  const s = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <path d={`M 0 ${-s} L ${s * 0.85} ${-s * 0.4} L ${s * 0.85} ${s * 0.3} Q ${s * 0.5} ${s} 0 ${s * 1.1} Q ${-s * 0.5} ${s} ${-s * 0.85} ${s * 0.3} L ${-s * 0.85} ${-s * 0.4} Z`}
        fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Lock body */}
      <rect x={-s * 0.2} y={-s * 0.05} width={s * 0.4} height={s * 0.35} rx={2} fill={color} opacity={0.5} />
      {/* Lock shackle */}
      <path d={`M ${-s * 0.12} ${-s * 0.05} L ${-s * 0.12} ${-s * 0.25} A ${s * 0.12} ${s * 0.15} 0 0 1 ${s * 0.12} ${-s * 0.25} L ${s * 0.12} ${-s * 0.05}`}
        fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
      {label && <text x={0} y={s * 1.1 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const APIGatewayShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  // Rectangle with diagonal gateway bars
  const w = size;
  const h = size * 0.65;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {/* Gateway bars */}
      {[-2, 0, 2].map((offset, i) => (
        <line key={i} x1={-w * 0.15 + offset * 5} y1={-h * 0.35} x2={w * 0.15 + offset * 5} y2={h * 0.35}
          stroke={color} strokeWidth={2.5} opacity={0.4 + i * 0.15} />
      ))}
      {/* Arrows entering */}
      <line x1={-w / 2 - 10} y1={0} x2={-w / 2 + 5} y2={0} stroke={color} strokeWidth={1.5} opacity={0.5} />
      <line x1={w / 2 - 5} y1={0} x2={w / 2 + 10} y2={0} stroke={color} strokeWidth={1.5} opacity={0.5} />
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const LambdaShape: React.FC<SVGComponentProps> = ({ x, y, size = 45, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  // Lambda symbol inside rounded box
  const w = size;
  const h = size * 0.85;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={`${color}15`} stroke={color} strokeWidth={2} />
      <text x={0} y={6} textAnchor="middle" fill={color} fontSize={size * 0.45} fontWeight={700} fontFamily="serif" opacity={0.6}>{'\u03BB'}</text>
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const SubnetShape: React.FC<SVGComponentProps> = ({ x, y, size = 90, color = '#4488ff', label, className = '', animationDelay = 0 }) => {
  // Rounded dashed rectangle (container-like)
  const w = size;
  const h = size * 0.75;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} fill={`${color}08`}
        stroke={color} strokeWidth={2} strokeDasharray="10,5" />
      {/* IP range badge at top */}
      <rect x={-w * 0.3} y={-h / 2 - 8} width={w * 0.6} height={16} rx={8} fill={`${color}30`} stroke={color} strokeWidth={1} />
      <text x={0} y={-h / 2 + 3} textAnchor="middle" fill={color} fontSize={8} fontWeight={600} fontFamily="'Geist Mono', monospace">CIDR</text>
      {label && <text x={0} y={-h / 2 - 14} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const VolumeShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => {
  // Cylinder with platter lines (distinct from Database: wider, shorter)
  const w = size * 0.45;
  const h = size * 0.55;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <ellipse cx={0} cy={-h / 2} rx={w} ry={h * 0.25} fill={`${color}20`} stroke={color} strokeWidth={2} />
      <rect x={-w} y={-h / 2} width={w * 2} height={h} fill={`${color}15`} stroke="none" />
      <ellipse cx={0} cy={h / 2} rx={w} ry={h * 0.25} fill={`${color}20`} stroke={color} strokeWidth={2} />
      <line x1={-w} y1={-h / 2} x2={-w} y2={h / 2} stroke={color} strokeWidth={2} />
      <line x1={w} y1={-h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth={2} />
      {/* Platter lines */}
      <ellipse cx={0} cy={-h * 0.1} rx={w * 0.85} ry={h * 0.15} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
      <ellipse cx={0} cy={h * 0.2} rx={w * 0.85} ry={h * 0.15} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
      {label && <text x={0} y={h / 2 + h * 0.25 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const RegistryShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  // Grid of small squares (package grid)
  const w = size;
  const h = size * 0.85;
  const cellW = w * 0.25;
  const cellH = h * 0.28;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}10`} stroke={color} strokeWidth={2} />
      {/* 3x2 grid of package squares */}
      {[0, 1, 2].map(col =>
        [0, 1].map(row => (
          <rect key={`${col}-${row}`}
            x={-w * 0.38 + col * (cellW + 4)} y={-h * 0.32 + row * (cellH + 4)}
            width={cellW} height={cellH} rx={2}
            fill={`${color}${25 + (col + row) * 5}`} stroke={color} strokeWidth={1} opacity={0.6} />
        ))
      )}
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const MonitorShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  // Screen with pulse/heartbeat line
  const w = size;
  const h = size * 0.7;
  const pulseY = 0;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={`${color}12`} stroke={color} strokeWidth={2} />
      {/* Stand */}
      <line x1={0} y1={h / 2} x2={0} y2={h / 2 + 8} stroke={color} strokeWidth={2} opacity={0.5} />
      <line x1={-w * 0.2} y1={h / 2 + 8} x2={w * 0.2} y2={h / 2 + 8} stroke={color} strokeWidth={2} opacity={0.5} />
      {/* Heartbeat/pulse line */}
      <polyline
        points={`${-w * 0.35},${pulseY} ${-w * 0.15},${pulseY} ${-w * 0.08},${-h * 0.25} ${0},${h * 0.2} ${w * 0.08},${-h * 0.15} ${w * 0.15},${pulseY} ${w * 0.35},${pulseY}`}
        fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
      {label && <text x={0} y={h / 2 + 26} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const PipelineShape: React.FC<SVGComponentProps> = ({ x, y, size = 90, color = '#00bcd4', label, className = '', animationDelay = 0 }) => {
  // Chevron chain (>>>>)
  const w = size;
  const h = size * 0.35;
  const chevronW = w / 4;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      {[0, 1, 2, 3].map(i => {
        const cx = -w / 2 + chevronW * 0.5 + i * chevronW;
        return (
          <polygon key={i}
            points={`${cx - chevronW * 0.4},${-h / 2} ${cx + chevronW * 0.3},0 ${cx - chevronW * 0.4},${h / 2} ${cx - chevronW * 0.1},${h / 2} ${cx + chevronW * 0.55},0 ${cx - chevronW * 0.1},${-h / 2}`}
            fill={`${color}${15 + i * 8}`} stroke={color} strokeWidth={1.5} />
        );
      })}
      {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const DecisionShape: React.FC<SVGComponentProps> = ({ x, y, size = 45, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  // Diamond shape
  const s = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`}
        fill={`${color}15`} stroke={color} strokeWidth={2} />
      <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} opacity={0.6}>?</text>
      {label && <text x={0} y={s + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

export const ClusterShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#4488ff', label, className = '', animationDelay = 0 }) => {
  // Three overlapping circles (Venn-like)
  const r = size * 0.3;
  const offset = size * 0.18;
  return (
    <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
      <circle cx={-offset} cy={offset * 0.5} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
      <circle cx={offset} cy={offset * 0.5} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
      <circle cx={0} cy={-offset * 0.6} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={r + offset + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  );
};

// ═══ ABSTRACT SHAPES ═══

export const Box: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`} className={className} style={{ animationDelay: `${animationDelay}ms` }}>
    <rect x={-size/2} y={-size/2} width={size} height={size} rx={6} fill={`${color}20`} stroke={color} strokeWidth={2} />
    {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(14, size/5)} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
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
