/* ═══════════════════════════════════════════════════════════════
   SVG Component Library

   Reusable SVG visual elements for animated illustrations:
   - Infrastructure (Server, Database, Container, Pod, Network, Cloud)
   - User elements (User, Device, Terminal)
   - Flow elements (Arrow, DataFlow, Pipeline)
   - Abstract shapes (Box, Circle, Grid, Layer)

   IMPORTANT: Every positioned component uses a double-<g> structure:
     Outer <g> — holds translate(x,y) for positioning (no CSS class)
     Inner <g> — holds className for CSS animation (with transformOrigin/transformBox)
   This prevents CSS animation `transform` from overriding the SVG
   `transform` attribute and snapping entities to (0,0).
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

const ANIM_STYLE = (delay: number): React.CSSProperties => ({
  animationDelay: `${delay}ms`,
  transformOrigin: 'center',
  transformBox: 'fill-box' as any,
});

// ═══ INFRASTRUCTURE ═══

export const Server: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size/2} width={size} height={size * 0.8} rx={4} fill={`${color}15`} stroke={color} strokeWidth={2} />
      <line x1={-size/2} y1={-size/6} x2={size/2} y2={-size/6} stroke={color} strokeWidth={1} opacity={0.5} />
      <line x1={-size/2} y1={size/6} x2={size/2} y2={size/6} stroke={color} strokeWidth={1} opacity={0.5} />
      <circle cx={-size/3} cy={-size/3} r={3} fill={color} opacity={0.8} />
      <circle cx={-size/6} cy={-size/3} r={3} fill={color} opacity={0.8} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

export const Database: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <ellipse cx={0} cy={-size/3} rx={size/2} ry={size/6} fill={`${color}15`} stroke={color} strokeWidth={2} />
      <rect x={-size/2} y={-size/3} width={size} height={size * 0.6} fill={`${color}15`} stroke="none" />
      <ellipse cx={0} cy={size/4} rx={size/2} ry={size/6} fill={`${color}15`} stroke={color} strokeWidth={2} />
      <line x1={-size/2} y1={-size/3} x2={-size/2} y2={size/4} stroke={color} strokeWidth={2} />
      <line x1={size/2} y1={-size/3} x2={size/2} y2={size/4} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

export const Container: React.FC<SVGComponentProps> = ({ x, y, size = 70, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size/2} width={size} height={size * 0.9} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2.5} strokeDasharray="8,4" />
      <rect x={-size/3} y={-size/4} width={size * 0.25} height={size * 0.3} rx={2} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
      <rect x={size/12} y={-size/4} width={size * 0.25} height={size * 0.3} rx={2} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

export const Pod: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size/2} width={size} height={size * 0.7} rx={4} fill={`${color}20`} stroke={color} strokeWidth={2} />
      <rect x={-size/3} y={-size/3.5} width={size * 0.6} height={size * 0.4} rx={2} fill={`${color}40`} stroke={color} strokeWidth={1.5} />
      <circle cx={-size/4} cy={size/5} r={2} fill={color} />
      <circle cx={0} cy={size/5} r={2} fill={color} />
      <circle cx={size/4} cy={size/5} r={2} fill={color} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

export const Cloud: React.FC<SVGComponentProps> = ({ x, y, size = 80, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <ellipse cx={-size/4} cy={0} rx={size/3} ry={size/4} fill={`${color}20`} stroke={color} strokeWidth={2} />
      <ellipse cx={size/6} cy={0} rx={size/2.5} ry={size/3.5} fill={`${color}20`} stroke={color} strokeWidth={2} />
      <ellipse cx={0} cy={-size/6} rx={size/3.5} ry={size/3} fill={`${color}20`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

// ═══ USER ELEMENTS ═══

export const User: React.FC<SVGComponentProps> = ({ x, y, size = 40, color = '#ff2d7b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <circle cx={0} cy={-size/3} r={size/4} fill={`${color}30`} stroke={color} strokeWidth={2} />
      <path d={`M ${-size/2.5} ${size/6} Q 0 ${-size/6} ${size/2.5} ${size/6}`} fill={`${color}30`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
    </g>
  </g>
);

export const Device: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size/2.5} width={size} height={size * 0.7} rx={4} fill={`${color}15`} stroke={color} strokeWidth={2} />
      <rect x={-size/2.5} y={size/5} width={size * 1.1} height={size/8} rx={2} fill={`${color}25`} stroke={color} strokeWidth={1.5} />
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
    </g>
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
    <g className={className} style={ANIM_STYLE(animationDelay)}>
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
  <g className={className} style={ANIM_STYLE(animationDelay)}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeDasharray="8,4" opacity={0.6}>
      <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.8s" repeatCount="indefinite" />
    </line>
  </g>
);

// ═══ INFRASTRUCTURE (Distinct Shapes) ═══

export const LoadBalancerShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  const s = size / 2;
  const hex = [
    [0, -s], [s * 0.87, -s * 0.5], [s * 0.87, s * 0.5],
    [0, s], [-s * 0.87, s * 0.5], [-s * 0.87, -s * 0.5],
  ].map(([px, py]) => `${px},${py}`).join(' ');
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <polygon points={hex} fill={`${color}15`} stroke={color} strokeWidth={2} />
        <line x1={0} y1={-s * 0.25} x2={-s * 0.4} y2={s * 0.3} stroke={color} strokeWidth={2} opacity={0.7} />
        <line x1={0} y1={-s * 0.25} x2={s * 0.4} y2={s * 0.3} stroke={color} strokeWidth={2} opacity={0.7} />
        <polygon points={`${-s * 0.4 - 4},${s * 0.3 - 2} ${-s * 0.4},${s * 0.3 + 6} ${-s * 0.4 + 4},${s * 0.3 - 2}`} fill={color} opacity={0.7} />
        <polygon points={`${s * 0.4 - 4},${s * 0.3 - 2} ${s * 0.4},${s * 0.3 + 6} ${s * 0.4 + 4},${s * 0.3 - 2}`} fill={color} opacity={0.7} />
        {label && <text x={0} y={s + 20} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const QueueShape: React.FC<SVGComponentProps> = ({ x, y, size = 65, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  const w = size * 0.8;
  const h = size * 0.15;
  const gap = size * 0.22;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        {[0, 1, 2].map(i => (
          <rect key={i} x={-w / 2} y={-gap + i * gap} width={w} height={h} rx={3}
            fill={`${color}${30 - i * 8}`} stroke={color} strokeWidth={1.5} />
        ))}
        <line x1={w / 2 + 6} y1={0} x2={w / 2 + 20} y2={0} stroke={color} strokeWidth={2} opacity={0.7} />
        <polygon points={`${w / 2 + 16},-4 ${w / 2 + 24},0 ${w / 2 + 16},4`} fill={color} opacity={0.7} />
        {label && <text x={0} y={gap + h + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const CacheShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  const r = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <circle cx={0} cy={0} r={r} fill={`${color}15`} stroke={color} strokeWidth={2} />
        <path d={`M ${-r * 0.15} ${-r * 0.5} L ${-r * 0.3} ${r * 0.05} L ${r * 0.05} ${-r * 0.05} L ${-r * 0.1} ${r * 0.5} L ${r * 0.3} ${-r * 0.05} L ${-r * 0.05} ${r * 0.05} Z`}
          fill={color} opacity={0.6} />
        {label && <text x={0} y={r + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const ServiceShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.8;
  const gr = size * 0.2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill={`${color}15`} stroke={color} strokeWidth={2} />
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
    </g>
  );
};

export const ProcessShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00bcd4', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.8;
  const ts = size * 0.2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2} />
        <polygon points={`${-ts * 0.6},${-ts} ${ts * 0.8},0 ${-ts * 0.6},${ts}`}
          fill={color} opacity={0.5} />
        {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

// ═══ EXTENDED IT INFRASTRUCTURE ═══

export const FirewallShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#ff4444', label, className = '', animationDelay = 0 }) => {
  const s = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <path d={`M 0 ${-s} L ${s * 0.85} ${-s * 0.4} L ${s * 0.85} ${s * 0.3} Q ${s * 0.5} ${s} 0 ${s * 1.1} Q ${-s * 0.5} ${s} ${-s * 0.85} ${s * 0.3} L ${-s * 0.85} ${-s * 0.4} Z`}
          fill={`${color}15`} stroke={color} strokeWidth={2} />
        <rect x={-s * 0.2} y={-s * 0.05} width={s * 0.4} height={s * 0.35} rx={2} fill={color} opacity={0.5} />
        <path d={`M ${-s * 0.12} ${-s * 0.05} L ${-s * 0.12} ${-s * 0.25} A ${s * 0.12} ${s * 0.15} 0 0 1 ${s * 0.12} ${-s * 0.25} L ${s * 0.12} ${-s * 0.05}`}
          fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
        {label && <text x={0} y={s * 1.1 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const APIGatewayShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.65;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}15`} stroke={color} strokeWidth={2} />
        {[-2, 0, 2].map((offset, i) => (
          <line key={i} x1={-w * 0.15 + offset * 5} y1={-h * 0.35} x2={w * 0.15 + offset * 5} y2={h * 0.35}
            stroke={color} strokeWidth={2.5} opacity={0.4 + i * 0.15} />
        ))}
        <line x1={-w / 2 - 10} y1={0} x2={-w / 2 + 5} y2={0} stroke={color} strokeWidth={1.5} opacity={0.5} />
        <line x1={w / 2 - 5} y1={0} x2={w / 2 + 10} y2={0} stroke={color} strokeWidth={1.5} opacity={0.5} />
        {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const LambdaShape: React.FC<SVGComponentProps> = ({ x, y, size = 45, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.85;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={`${color}15`} stroke={color} strokeWidth={2} />
        <text x={0} y={6} textAnchor="middle" fill={color} fontSize={size * 0.45} fontWeight={700} fontFamily="serif" opacity={0.6}>{'\u03BB'}</text>
        {label && <text x={0} y={h / 2 + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const SubnetShape: React.FC<SVGComponentProps> = ({ x, y, size = 90, color = '#4488ff', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.75;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} fill={`${color}08`}
          stroke={color} strokeWidth={2} strokeDasharray="10,5" />
        <rect x={-w * 0.3} y={-h / 2 - 8} width={w * 0.6} height={16} rx={8} fill={`${color}30`} stroke={color} strokeWidth={1} />
        <text x={0} y={-h / 2 + 3} textAnchor="middle" fill={color} fontSize={8} fontWeight={600} fontFamily="'Geist Mono', monospace">CIDR</text>
        {label && <text x={0} y={-h / 2 - 14} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const VolumeShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => {
  const w = size * 0.45;
  const h = size * 0.55;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <ellipse cx={0} cy={-h / 2} rx={w} ry={h * 0.25} fill={`${color}20`} stroke={color} strokeWidth={2} />
        <rect x={-w} y={-h / 2} width={w * 2} height={h} fill={`${color}15`} stroke="none" />
        <ellipse cx={0} cy={h / 2} rx={w} ry={h * 0.25} fill={`${color}20`} stroke={color} strokeWidth={2} />
        <line x1={-w} y1={-h / 2} x2={-w} y2={h / 2} stroke={color} strokeWidth={2} />
        <line x1={w} y1={-h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth={2} />
        <ellipse cx={0} cy={-h * 0.1} rx={w * 0.85} ry={h * 0.15} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
        <ellipse cx={0} cy={h * 0.2} rx={w * 0.85} ry={h * 0.15} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
        {label && <text x={0} y={h / 2 + h * 0.25 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const RegistryShape: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.85;
  const cellW = w * 0.25;
  const cellH = h * 0.28;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={`${color}10`} stroke={color} strokeWidth={2} />
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
    </g>
  );
};

export const MonitorShape: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e676', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.7;
  const pulseY = 0;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={`${color}12`} stroke={color} strokeWidth={2} />
        <line x1={0} y1={h / 2} x2={0} y2={h / 2 + 8} stroke={color} strokeWidth={2} opacity={0.5} />
        <line x1={-w * 0.2} y1={h / 2 + 8} x2={w * 0.2} y2={h / 2 + 8} stroke={color} strokeWidth={2} opacity={0.5} />
        <polyline
          points={`${-w * 0.35},${pulseY} ${-w * 0.15},${pulseY} ${-w * 0.08},${-h * 0.25} ${0},${h * 0.2} ${w * 0.08},${-h * 0.15} ${w * 0.15},${pulseY} ${w * 0.35},${pulseY}`}
          fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
        {label && <text x={0} y={h / 2 + 26} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const PipelineShape: React.FC<SVGComponentProps> = ({ x, y, size = 90, color = '#00bcd4', label, className = '', animationDelay = 0 }) => {
  const w = size;
  const h = size * 0.35;
  const chevronW = w / 4;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
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
    </g>
  );
};

export const DecisionShape: React.FC<SVGComponentProps> = ({ x, y, size = 45, color = '#ffab00', label, className = '', animationDelay = 0 }) => {
  const s = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`}
          fill={`${color}15`} stroke={color} strokeWidth={2} />
        <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} opacity={0.6}>?</text>
        {label && <text x={0} y={s + 18} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const ClusterShape: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#4488ff', label, className = '', animationDelay = 0 }) => {
  const r = size * 0.3;
  const offset = size * 0.18;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <circle cx={-offset} cy={offset * 0.5} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
        <circle cx={offset} cy={offset * 0.5} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
        <circle cx={0} cy={-offset * 0.6} r={r} fill={`${color}12`} stroke={color} strokeWidth={2} />
        {label && <text x={0} y={r + offset + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

// ═══ ABSTRACT SHAPES ═══

export const Box: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size/2} width={size} height={size} rx={6} fill={`${color}20`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(14, size/5)} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const Layer: React.FC<SVGComponentProps & { layers?: number }> = ({ x, y, size = 70, color = '#00bcd4', label, layers = 3, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
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
  </g>
);

// ═══ UNIVERSAL TYPES (Topic-Agnostic) ═══

export const Concept: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <circle cx={0} cy={0} r={size/2} fill={`${color}15`} stroke={color} strokeWidth={2.5} />
      <circle cx={0} cy={0} r={size/2 - 8} fill="none" stroke={`${color}40`} strokeWidth={1} strokeDasharray="4,4" />
      {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(12, size/5)} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const Entity: React.FC<SVGComponentProps> = ({ x, y, size = 55, color = '#00e5ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={8} fill={`${color}15`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(12, size/5)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const GroupEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={12} fill={`${color}08`} stroke={color} strokeWidth={2} strokeDasharray="8,4" />
      {label && <text x={0} y={-size*0.4 - 8} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const LabelEntity: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontWeight={600} fontFamily="'Geist Mono', monospace">{label || ''}</text>
      <line x1={-size/3} y1={14} x2={size/3} y2={14} stroke={`${color}60`} strokeWidth={1.5} />
    </g>
  </g>
);

export const ComparisonEntity: React.FC<SVGComponentProps> = ({ x, y, size = 120, color = '#ffab00', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size*0.35} width={size*0.45} height={size*0.7} rx={6} fill={`${color}10`} stroke={color} strokeWidth={1.5} />
      <rect x={size*0.05} y={-size*0.35} width={size*0.45} height={size*0.7} rx={6} fill={`${color}10`} stroke={color} strokeWidth={1.5} />
      <text x={0} y={6} textAnchor="middle" fill={color} fontSize={16} fontWeight={700} opacity={0.6}>vs</text>
      {label && <text x={0} y={size*0.35 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const TimelineEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <line x1={-size/2} y1={0} x2={size/2} y2={0} stroke={color} strokeWidth={3} opacity={0.5} />
      <circle cx={0} cy={0} r={8} fill={color} />
      <circle cx={0} cy={0} r={4} fill="#0a0c14" />
      {label && <text x={0} y={25} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const MetricEntity: React.FC<SVGComponentProps> = ({ x, y, size = 40, color = '#ff2d7b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <circle cx={0} cy={0} r={size/2} fill={`${color}20`} stroke={color} strokeWidth={2} />
      {label && <text x={0} y={6} textAnchor="middle" fill={color} fontSize={Math.min(size/3, 16)} fontWeight={700} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const CycleEntity: React.FC<SVGComponentProps> = ({ x, y, size = 60, color = '#00bcd4', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <circle cx={0} cy={0} r={size/2} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="12,4" opacity={0.8}>
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx={0} cy={0} r={size/2 - 10} fill={`${color}08`} stroke="none" />
      {label && <text x={0} y={5} textAnchor="middle" fill={color} fontSize={Math.min(11, size/6)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const StackEntity: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      {[0, 1, 2].map(i => (
        <rect key={i} x={-size/2 + i*3} y={-size/2 + i*14} width={size - i*6} height={size*0.28} rx={4}
          fill={`${color}${25 - i*5}`} stroke={color} strokeWidth={1.5} opacity={1 - i*0.15} />
      ))}
      {label && <text x={0} y={size/2 + 20} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const TreeEntity: React.FC<SVGComponentProps> = ({ x, y, size = 50, color = '#00e676', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <circle cx={0} cy={-size/4} r={size/5} fill={`${color}25`} stroke={color} strokeWidth={2} />
      <line x1={-size/4} y1={size/8} x2={0} y2={-size/10} stroke={color} strokeWidth={1.5} opacity={0.6} />
      <line x1={size/4} y1={size/8} x2={0} y2={-size/10} stroke={color} strokeWidth={1.5} opacity={0.6} />
      <circle cx={-size/4} cy={size/4} r={size/7} fill={`${color}15`} stroke={color} strokeWidth={1.5} />
      <circle cx={size/4} cy={size/4} r={size/7} fill={`${color}15`} stroke={color} strokeWidth={1.5} />
      {label && <text x={0} y={size/2 + 18} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const BadgeEntity: React.FC<SVGComponentProps> = ({ x, y, size = 30, color = '#ff6b6b', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size} y={-size/3} width={size*2} height={size*0.65} rx={size*0.3} fill={`${color}30`} stroke={color} strokeWidth={1.5} />
      {label && <text x={0} y={4} textAnchor="middle" fill={color} fontSize={10} fontWeight={600} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

export const QuoteEntity: React.FC<SVGComponentProps> = ({ x, y, size = 100, color = '#b388ff', label, className = '', animationDelay = 0 }) => (
  <g transform={`translate(${x}, ${y})`}>
    <g className={className} style={ANIM_STYLE(animationDelay)}>
      <rect x={-size/2} y={-size*0.4} width={size} height={size*0.8} rx={8} fill={`${color}0A`} stroke={color} strokeWidth={2} />
      <rect x={-size/2} y={-size*0.4} width={4} height={size*0.8} rx={2} fill={color} />
      <text x={-size/2 + 16} y={-size*0.22} fill={`${color}50`} fontSize={22} fontWeight={700}>"</text>
      {label && <text x={4} y={8} textAnchor="middle" fill={color} fontSize={Math.min(12, size/8)} fontWeight={500} fontFamily="'Geist Mono', monospace">{label}</text>}
    </g>
  </g>
);

// ═══ Extended props for entities that accept metadata ═══
interface MetadataComponentProps extends SVGComponentProps {
  metadata?: Record<string, any>;
  width?: number;
  height?: number;
}

// ═══ MATH & SCIENCE TYPES ═══

export const EquationEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 280, height = 80, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const latex = metadata?.latex || label || 'E = mc^2';
  let rendered = '';
  try {
    const katex = (window as any).__katex;
    if (katex) {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    }
  } catch { /* fallback below */ }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1480" stroke={color} strokeWidth={1.5} strokeDasharray="6 3" />
        {rendered ? (
          <foreignObject x={-width/2 + 8} y={-height/2 + 4} width={width - 16} height={height - 8}>
            <div style={{ color, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: rendered }} />
          </foreignObject>
        ) : (
          <text x={0} y={5} textAnchor="middle" fill={color} fontSize={16} fontFamily="'Geist Mono', monospace">{latex}</text>
        )}
        {label && !metadata?.latex && <text x={0} y={height/2 + 16} textAnchor="middle" fill={`${color}80`} fontSize={10}>{label}</text>}
      </g>
    </g>
  );
};

export const ExpressionEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 160, height = 50, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const latex = metadata?.latex || label || 'x^2';
  let rendered = '';
  try {
    const katex = (window as any).__katex;
    if (katex) {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: false });
    }
  } catch { /* fallback */ }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={6} fill="#0b0d1440" stroke={color} strokeWidth={1} strokeDasharray="4 2" />
        {rendered ? (
          <foreignObject x={-width/2 + 6} y={-height/2 + 4} width={width - 12} height={height - 8}>
            <div style={{ color, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: rendered }} />
          </foreignObject>
        ) : (
          <text x={0} y={4} textAnchor="middle" fill={color} fontSize={14} fontFamily="'Geist Mono', monospace">{latex}</text>
        )}
      </g>
    </g>
  );
};

export const MatrixEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 200, height = 160, color = '#b388ff', label, className = '', animationDelay = 0, metadata }) => {
  const latex = metadata?.latex || '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}';
  let rendered = '';
  try {
    const katex = (window as any).__katex;
    if (katex) {
      rendered = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    }
  } catch { /* fallback */ }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1460" stroke={color} strokeWidth={1.5} />
        {rendered ? (
          <foreignObject x={-width/2 + 8} y={-height/2 + 8} width={width - 16} height={height - 16}>
            <div style={{ color, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: rendered }} />
          </foreignObject>
        ) : (
          <text x={0} y={5} textAnchor="middle" fill={color} fontSize={14} fontFamily="'Geist Mono', monospace">[Matrix]</text>
        )}
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11}>{label}</text>}
      </g>
    </g>
  );
};

export const Graph2DEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 300, height = 280, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const pad = 30;
  const gw = width - pad * 2;
  const gh = height - pad * 2;
  const domain = metadata?.domain || [-5, 5];
  const range = metadata?.range || [-5, 5];
  const showGrid = metadata?.showGrid !== false;

  const mapX = (v: number) => -width/2 + pad + ((v - domain[0]) / (domain[1] - domain[0])) * gw;
  const mapY = (v: number) => height/2 - pad - ((v - range[0]) / (range[1] - range[0])) * gh;

  const points: { x: number; y: number }[] = metadata?.points || [];
  let curvePath = '';

  if (metadata?.parametric) {
    // Parametric curve: evaluate x(t), y(t)
    const xExpr = metadata.xExpression || 'Math.cos(t)';
    const yExpr = metadata.yExpression || 'Math.sin(t)';
    const tRange = metadata.tRange || [0, 2 * Math.PI];
    const steps = 200;
    const dt = (tRange[1] - tRange[0]) / steps;
    const pathParts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = tRange[0] + i * dt;
      try {
        const xv = Function('t', 'Math', `return (${xExpr})`)(t, Math);
        const yv = Function('t', 'Math', `return (${yExpr})`)(t, Math);
        if (!isFinite(xv) || !isFinite(yv)) continue;
        const px = mapX(xv);
        const py = mapY(yv);
        pathParts.push(`${pathParts.length === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
      } catch { /* skip */ }
    }
    curvePath = pathParts.join(' ');
  } else if (metadata?.implicit) {
    // Implicit curve F(x,y) = 0 via marching squares
    const expr = metadata.implicitExpression || '';
    if (expr) {
      const res = 60;
      const dx = (domain[1] - domain[0]) / res;
      const dy = (range[1] - range[0]) / res;
      const grid: number[][] = [];
      for (let j = 0; j <= res; j++) {
        const row: number[] = [];
        for (let i = 0; i <= res; i++) {
          const gx = domain[0] + i * dx;
          const gy = range[0] + j * dy;
          try { row.push(Function('x', 'y', 'Math', `return (${expr})`)(gx, gy, Math)); }
          catch { row.push(NaN); }
        }
        grid.push(row);
      }
      const segParts: string[] = [];
      const lerp = (v1: number, v2: number, f1: number, f2: number): number =>
        Math.abs(f1 - f2) < 1e-12 ? (v1 + v2) / 2 : v1 + (v2 - v1) * (-f1 / (f2 - f1));
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const x0 = domain[0] + i * dx, y0 = range[0] + j * dy;
          const bl = grid[j][i], br = grid[j][i+1], tr = grid[j+1][i+1], tl = grid[j+1][i];
          const cc = (bl > 0 ? 1 : 0) | (br > 0 ? 2 : 0) | (tr > 0 ? 4 : 0) | (tl > 0 ? 8 : 0);
          if (cc === 0 || cc === 15) continue;
          const b = { x: lerp(x0, x0+dx, bl, br), y: y0 };
          const r = { x: x0+dx, y: lerp(y0, y0+dy, br, tr) };
          const tp = { x: lerp(x0, x0+dx, tl, tr), y: y0+dy };
          const l = { x: x0, y: lerp(y0, y0+dy, bl, tl) };
          const addSeg = (s: {x:number;y:number}, e: {x:number;y:number}) => {
            segParts.push(`M${mapX(s.x).toFixed(1)},${mapY(s.y).toFixed(1)}L${mapX(e.x).toFixed(1)},${mapY(e.y).toFixed(1)}`);
          };
          switch (cc) {
            case 1: case 14: addSeg(b, l); break;
            case 2: case 13: addSeg(r, b); break;
            case 3: case 12: addSeg(r, l); break;
            case 4: case 11: addSeg(tp, r); break;
            case 5: addSeg(b, r); addSeg(tp, l); break;
            case 6: case 9: addSeg(tp, b); break;
            case 7: case 8: addSeg(tp, l); break;
            case 10: addSeg(b, l); addSeg(tp, r); break;
          }
        }
      }
      curvePath = segParts.join(' ');
    }
  } else if (metadata?.expression && points.length === 0) {
    // Standard explicit function y = f(x)
    const steps = 60;
    const dx = (domain[1] - domain[0]) / steps;
    const pathParts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const xv = domain[0] + i * dx;
      let yv: number;
      try { yv = Function('x', `return (${metadata.expression})`)(xv); } catch { yv = 0; }
      if (!isFinite(yv)) continue;
      const px = mapX(xv);
      const py = mapY(yv);
      pathParts.push(`${pathParts.length === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
    }
    curvePath = pathParts.join(' ');
  }

  const gridLines: React.ReactNode[] = [];
  if (showGrid) {
    for (let v = Math.ceil(domain[0]); v <= Math.floor(domain[1]); v++) {
      const px = mapX(v);
      gridLines.push(<line key={`gx${v}`} x1={px} y1={-height/2 + pad} x2={px} y2={height/2 - pad} stroke="#ffffff08" strokeWidth={1} />);
      if (v !== 0) gridLines.push(<text key={`lx${v}`} x={px} y={mapY(0) + 14} textAnchor="middle" fill="#ffffff40" fontSize={9}>{v}</text>);
    }
    for (let v = Math.ceil(range[0]); v <= Math.floor(range[1]); v++) {
      const py = mapY(v);
      gridLines.push(<line key={`gy${v}`} x1={-width/2 + pad} y1={py} x2={width/2 - pad} y2={py} stroke="#ffffff08" strokeWidth={1} />);
      if (v !== 0) gridLines.push(<text key={`ly${v}`} x={mapX(0) - 10} y={py + 3} textAnchor="end" fill="#ffffff40" fontSize={9}>{v}</text>);
    }
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1460" stroke={color} strokeWidth={1} />
        {gridLines}
        <line x1={-width/2 + pad} y1={mapY(0)} x2={width/2 - pad} y2={mapY(0)} stroke="#ffffff30" strokeWidth={1.5} />
        <line x1={mapX(0)} y1={-height/2 + pad} x2={mapX(0)} y2={height/2 - pad} stroke="#ffffff30" strokeWidth={1.5} />
        {curvePath && <path d={curvePath} fill="none" stroke={metadata?.parametric ? '#e040fb' : metadata?.implicit ? '#ff9100' : color} strokeWidth={2.5} className="graph-line-draw" />}
        {points.map((p: any, i: number) => (
          <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={4} fill={color} stroke="#0b0d14" strokeWidth={1.5} />
        ))}
        {label && <text x={0} y={-height/2 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={600}>{label}</text>}
      </g>
    </g>
  );
};

export const NumberLineEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 320, height = 60, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const min = metadata?.min ?? -5;
  const max = metadata?.max ?? 5;
  const ticks: number[] = metadata?.ticks || Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const highlights: { from: number; to: number; color?: string }[] = metadata?.highlights || [];
  const pad = 20;
  const lineW = width - pad * 2;
  const mapX = (v: number) => -width/2 + pad + ((v - min) / (max - min)) * lineW;
  const cy = 0;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        {highlights.map((h, i) => (
          <rect key={i} x={mapX(h.from)} y={cy - 8} width={mapX(h.to) - mapX(h.from)} height={16} rx={3} fill={`${h.color || color}30`} />
        ))}
        <line x1={-width/2 + pad} y1={cy} x2={width/2 - pad} y2={cy} stroke={color} strokeWidth={2} />
        <polygon points={`${width/2 - pad},${cy} ${width/2 - pad - 8},${cy - 4} ${width/2 - pad - 8},${cy + 4}`} fill={color} />
        {ticks.map(t => (
          <g key={t}>
            <line x1={mapX(t)} y1={cy - 6} x2={mapX(t)} y2={cy + 6} stroke={color} strokeWidth={1.5} />
            <text x={mapX(t)} y={cy + 20} textAnchor="middle" fill={color} fontSize={10} fontFamily="'Geist Mono', monospace">{t}</text>
          </g>
        ))}
        {label && <text x={0} y={-height/2 + 10} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const CoordinateSystemEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 320, height = 300, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const pad = 30;
  const gw = width - pad * 2;
  const gh = height - pad * 2;
  const gridSpacing = metadata?.gridSpacing || 1;
  const xRange = metadata?.xRange || [-5, 5];
  const yRange = metadata?.yRange || [-5, 5];
  const points: { x: number; y: number; label?: string; color?: string }[] = metadata?.points || [];
  const vectors: { dx: number; dy: number; label?: string; color?: string }[] = metadata?.vectors || [];

  const mapX = (v: number) => -width/2 + pad + ((v - xRange[0]) / (xRange[1] - xRange[0])) * gw;
  const mapY = (v: number) => height/2 - pad - ((v - yRange[0]) / (yRange[1] - yRange[0])) * gh;

  const gridLines: React.ReactNode[] = [];
  for (let v = Math.ceil(xRange[0] / gridSpacing) * gridSpacing; v <= xRange[1]; v += gridSpacing) {
    gridLines.push(<line key={`gx${v}`} x1={mapX(v)} y1={-height/2 + pad} x2={mapX(v)} y2={height/2 - pad} stroke="#ffffff08" strokeWidth={1} />);
  }
  for (let v = Math.ceil(yRange[0] / gridSpacing) * gridSpacing; v <= yRange[1]; v += gridSpacing) {
    gridLines.push(<line key={`gy${v}`} x1={-width/2 + pad} y1={mapY(v)} x2={width/2 - pad} y2={mapY(v)} stroke="#ffffff08" strokeWidth={1} />);
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1440" stroke={`${color}30`} strokeWidth={1} />
        {gridLines}
        <line x1={-width/2 + pad} y1={mapY(0)} x2={width/2 - pad} y2={mapY(0)} stroke="#ffffff40" strokeWidth={1.5} />
        <line x1={mapX(0)} y1={-height/2 + pad} x2={mapX(0)} y2={height/2 - pad} stroke="#ffffff40" strokeWidth={1.5} />
        <text x={width/2 - pad + 6} y={mapY(0) + 4} fill="#ffffff60" fontSize={10}>x</text>
        <text x={mapX(0) + 6} y={-height/2 + pad - 4} fill="#ffffff60" fontSize={10}>y</text>
        {points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={mapX(p.x)} cy={mapY(p.y)} r={5} fill={p.color || color} stroke="#0b0d14" strokeWidth={1.5} />
            {p.label && <text x={mapX(p.x) + 8} y={mapY(p.y) - 8} fill={p.color || color} fontSize={10}>{p.label}</text>}
          </g>
        ))}
        {vectors.map((v, i) => {
          const ox = mapX(0);
          const oy = mapY(0);
          const tx = mapX(v.dx);
          const ty = mapY(v.dy);
          const vc = v.color || color;
          return (
            <g key={`v${i}`}>
              <line x1={ox} y1={oy} x2={tx} y2={ty} stroke={vc} strokeWidth={2} markerEnd="url(#arrowhead)" />
              {v.label && <text x={(ox + tx)/2 + 8} y={(oy + ty)/2 - 8} fill={vc} fontSize={10} fontWeight={600}>{v.label}</text>}
            </g>
          );
        })}
        {label && <text x={0} y={-height/2 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={600}>{label}</text>}
      </g>
    </g>
  );
};

// ═══ PHYSICS TYPES ═══

export const VectorEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 160, color = '#ff6b9d', label, className = '', animationDelay = 0, metadata }) => {
  const mag = metadata?.magnitude || width;
  const angle = (metadata?.angle || 0) * Math.PI / 180;
  const ex = Math.cos(angle) * mag * 0.8;
  const ey = -Math.sin(angle) * mag * 0.8;
  const headLen = 10;
  const ha = Math.atan2(ey, ex);
  const hx1 = ex - headLen * Math.cos(ha - 0.4);
  const hy1 = ey - headLen * Math.sin(ha - 0.4);
  const hx2 = ex - headLen * Math.cos(ha + 0.4);
  const hy2 = ey - headLen * Math.sin(ha + 0.4);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <line x1={0} y1={0} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} />
        <polygon points={`${ex},${ey} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} />
        {label && <text x={ex/2 + 10} y={ey/2 - 10} fill={color} fontSize={11} fontWeight={600}>{label}</text>}
        {metadata?.magnitude && <text x={ex/2 - 10} y={ey/2 + 16} fill={`${color}80`} fontSize={9} fontFamily="'Geist Mono', monospace">|{metadata.magnitude}|</text>}
      </g>
    </g>
  );
};

export const WaveEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 320, height = 120, color = '#00bcd4', label, className = '', animationDelay = 0, metadata }) => {
  const amp = metadata?.amplitude || height * 0.35;
  const freq = metadata?.frequency || 2;
  const steps = 80;
  const dx = width / steps;
  const pathParts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const px = -width/2 + i * dx;
    const py = -amp * Math.sin((i / steps) * freq * 2 * Math.PI);
    pathParts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={6} fill="#0b0d1430" stroke={`${color}20`} strokeWidth={1} />
        <line x1={-width/2} y1={0} x2={width/2} y2={0} stroke="#ffffff15" strokeWidth={1} strokeDasharray="4 3" />
        <path d={pathParts.join(' ')} fill="none" stroke={color} strokeWidth={2.5} className="graph-line-draw" />
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const FreeBodyDiagramEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 220, height = 220, color = '#ffab00', label, className = '', animationDelay = 0, metadata }) => {
  const r = Math.min(width, height) * 0.15;
  const forces: { label: string; magnitude: number; angle: number; color?: string }[] = metadata?.forces || [
    { label: 'F₁', magnitude: 60, angle: 90, color: '#00e5ff' },
    { label: 'F₂', magnitude: 50, angle: 0, color: '#ff6b9d' },
    { label: 'W', magnitude: 55, angle: 270, color: '#ffab00' },
  ];

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1430" stroke={`${color}20`} strokeWidth={1} />
        <circle cx={0} cy={0} r={r} fill={`${color}20`} stroke={color} strokeWidth={2} />
        {forces.map((f, i) => {
          const a = f.angle * Math.PI / 180;
          const startX = Math.cos(a) * r;
          const startY = -Math.sin(a) * r;
          const endX = Math.cos(a) * (r + f.magnitude);
          const endY = -Math.sin(a) * (r + f.magnitude);
          const fc = f.color || color;
          const headLen = 8;
          const ha = Math.atan2(endY - startY, endX - startX);
          return (
            <g key={i}>
              <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={fc} strokeWidth={2.5} />
              <polygon points={`${endX},${endY} ${endX - headLen * Math.cos(ha - 0.4)},${endY - headLen * Math.sin(ha - 0.4)} ${endX - headLen * Math.cos(ha + 0.4)},${endY - headLen * Math.sin(ha + 0.4)}`} fill={fc} />
              <text x={endX + Math.cos(a) * 12} y={endY - Math.sin(a) * 12} textAnchor="middle" fill={fc} fontSize={10} fontWeight={600}>{f.label}</text>
            </g>
          );
        })}
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const ParticleEntity: React.FC<MetadataComponentProps> = ({ x, y, color = '#ff6b9d', label, className = '', animationDelay = 0, metadata }) => {
  const r = 8;
  const trajectory: { x: number; y: number }[] = metadata?.trajectory || [];
  let trajPath = '';
  if (trajectory.length > 1) {
    trajPath = trajectory.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        {trajPath && <path d={trajPath} fill="none" stroke={`${color}40`} strokeWidth={1.5} strokeDasharray="4 3" />}
        <circle cx={0} cy={0} r={r} fill={color} />
        <circle cx={0} cy={0} r={r + 4} fill="none" stroke={`${color}40`} strokeWidth={1} />
        {label && <text x={r + 8} y={4} fill={color} fontSize={10} fontWeight={600}>{label}</text>}
      </g>
    </g>
  );
};

export const CircuitEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 300, height = 200, color = '#ffab00', label, className = '', animationDelay = 0, metadata }) => {
  const components: { type: string; label?: string }[] = metadata?.components || [
    { type: 'battery', label: 'V' }, { type: 'resistor', label: 'R₁' }, { type: 'resistor', label: 'R₂' },
  ];
  const pad = 20;
  const cw = width - pad * 2;
  const ch = height - pad * 2;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1440" stroke={`${color}30`} strokeWidth={1} />
        <rect x={-cw/2} y={-ch/2} width={cw} height={ch} rx={4} fill="none" stroke={color} strokeWidth={2} />
        {components.map((c, i) => {
          const px = -cw/2 + ((i + 0.5) / components.length) * cw;
          const py = -ch/2;
          if (c.type === 'battery') {
            return (
              <g key={i}>
                <line x1={px - 6} y1={py - 8} x2={px - 6} y2={py + 8} stroke={color} strokeWidth={3} />
                <line x1={px + 6} y1={py - 14} x2={px + 6} y2={py + 14} stroke={color} strokeWidth={1.5} />
                {c.label && <text x={px} y={py - 18} textAnchor="middle" fill={color} fontSize={9}>{c.label}</text>}
              </g>
            );
          }
          return (
            <g key={i}>
              <path d={`M${px - 15},${py} l3,-6 6,12 6,-12 6,12 6,-12 3,6`} fill="none" stroke={color} strokeWidth={1.5} />
              {c.label && <text x={px} y={py - 12} textAnchor="middle" fill={color} fontSize={9}>{c.label}</text>}
            </g>
          );
        })}
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const FieldEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 280, height = 280, color = '#b388ff', label, className = '', animationDelay = 0, metadata }) => {
  const gridSize = metadata?.gridSize || 6;
  const arrows: React.ReactNode[] = [];
  const cellW = (width - 40) / gridSize;
  const cellH = (height - 40) / gridSize;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = -width/2 + 20 + (col + 0.5) * cellW;
      const cy = -height/2 + 20 + (row + 0.5) * cellH;
      const angle = metadata?.fieldAngle ? metadata.fieldAngle(col, row) : ((col + row) * 30) * Math.PI / 180;
      const len = cellW * 0.3;
      arrows.push(
        <line key={`${row}-${col}`} x1={cx - Math.cos(angle) * len} y1={cy + Math.sin(angle) * len}
          x2={cx + Math.cos(angle) * len} y2={cy - Math.sin(angle) * len}
          stroke={color} strokeWidth={1.2} opacity={0.7} markerEnd="url(#arrowhead)" />
      );
    }
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1430" stroke={`${color}20`} strokeWidth={1} />
        {arrows}
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

// ═══ GENERAL PURPOSE TYPES ═══

export const TableEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 300, height = 200, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const headers: string[] = metadata?.headers || ['Column A', 'Column B'];
  const rows: string[][] = metadata?.rows || [['val 1', 'val 2'], ['val 3', 'val 4']];
  const rowH = 24;
  const colW = (width - 16) / headers.length;
  const tableH = (rows.length + 1) * rowH;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1460" stroke={color} strokeWidth={1.5} />
        {label && <text x={0} y={-height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>{label}</text>}
        <g transform={`translate(${-width/2 + 8}, ${-height/2 + 26})`}>
          {headers.map((h, i) => (
            <text key={`h${i}`} x={i * colW + colW/2} y={12} textAnchor="middle" fill={color} fontSize={10} fontWeight={600} fontFamily="'Geist Mono', monospace">{h}</text>
          ))}
          <line x1={0} y1={rowH - 2} x2={headers.length * colW} y2={rowH - 2} stroke={`${color}30`} strokeWidth={1} />
          {rows.slice(0, Math.floor((height - 50) / rowH)).map((row, ri) => (
            <g key={`r${ri}`}>
              {row.map((cell, ci) => (
                <text key={`c${ri}-${ci}`} x={ci * colW + colW/2} y={(ri + 1) * rowH + 12} textAnchor="middle" fill="#ffffff90" fontSize={10} fontFamily="'Geist Mono', monospace">{cell}</text>
              ))}
            </g>
          ))}
        </g>
      </g>
    </g>
  );
};

export const HistogramEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 280, height = 220, color = '#00e676', label, className = '', animationDelay = 0, metadata }) => {
  const bins: { label: string; value: number; color?: string }[] = metadata?.bins || [
    { label: 'A', value: 40 }, { label: 'B', value: 70 }, { label: 'C', value: 55 }, { label: 'D', value: 90 }, { label: 'E', value: 30 },
  ];
  const pad = 30;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2 - 10;
  const maxVal = Math.max(...bins.map(b => b.value), 1);
  const barW = chartW / bins.length * 0.7;
  const gap = chartW / bins.length * 0.3;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1440" stroke={`${color}30`} strokeWidth={1} />
        {label && <text x={0} y={-height/2 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={600}>{label}</text>}
        <line x1={-width/2 + pad} y1={height/2 - pad} x2={width/2 - pad} y2={height/2 - pad} stroke="#ffffff30" strokeWidth={1} />
        <line x1={-width/2 + pad} y1={-height/2 + pad + 10} x2={-width/2 + pad} y2={height/2 - pad} stroke="#ffffff30" strokeWidth={1} />
        {bins.map((b, i) => {
          const bx = -width/2 + pad + i * (barW + gap) + gap/2;
          const bh = (b.value / maxVal) * chartH;
          const by = height/2 - pad - bh;
          const bc = b.color || color;
          return (
            <g key={i}>
              <rect x={bx} y={by} width={barW} height={bh} rx={3} fill={`${bc}60`} stroke={bc} strokeWidth={1.5} className="histogram-bar-grow" style={{ animationDelay: `${animationDelay + i * 100}ms` }} />
              <text x={bx + barW/2} y={height/2 - pad + 14} textAnchor="middle" fill="#ffffff80" fontSize={9}>{b.label}</text>
            </g>
          );
        })}
      </g>
    </g>
  );
};

export const PieChartEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 200, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const r = width * 0.35;
  const segments: { label: string; value: number; color?: string }[] = metadata?.segments || [
    { label: 'A', value: 40, color: '#00e5ff' }, { label: 'B', value: 30, color: '#ff6b9d' }, { label: 'C', value: 30, color: '#00e676' },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let currentAngle = -Math.PI / 2;
  const paths = segments.map((s, i) => {
    const angle = (s.value / total) * 2 * Math.PI;
    const startX = Math.cos(currentAngle) * r;
    const startY = Math.sin(currentAngle) * r;
    currentAngle += angle;
    const endX = Math.cos(currentAngle) * r;
    const endY = Math.sin(currentAngle) * r;
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = currentAngle - angle / 2;
    const labelX = Math.cos(midAngle) * (r + 16);
    const labelY = Math.sin(midAngle) * (r + 16);
    return (
      <g key={i}>
        <path d={`M0,0 L${startX},${startY} A${r},${r} 0 ${largeArc},1 ${endX},${endY} Z`}
          fill={`${s.color || color}50`} stroke="#0b0d14" strokeWidth={1.5} />
        <text x={labelX} y={labelY + 3} textAnchor="middle" fill={s.color || color} fontSize={9} fontWeight={600}>{s.label}</text>
      </g>
    );
  });

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        {paths}
        {label && <text x={0} y={r + 30} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const FlowDiagramEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 300, height = 240, color = '#00bcd4', label, className = '', animationDelay = 0, metadata }) => {
  const steps: { label: string; type?: string }[] = metadata?.steps || [
    { label: 'Start' }, { label: 'Process' }, { label: 'Decision', type: 'decision' }, { label: 'End' },
  ];
  const stepH = 30;
  const stepW = width * 0.6;
  const gap = 16;
  const totalH = steps.length * (stepH + gap) - gap;
  const startY = -totalH / 2;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1430" stroke={`${color}20`} strokeWidth={1} />
        {label && <text x={0} y={-height/2 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={600}>{label}</text>}
        {steps.map((s, i) => {
          const sy = startY + i * (stepH + gap);
          const isDiamond = s.type === 'decision';
          return (
            <g key={i}>
              {i > 0 && <line x1={0} y1={sy - gap} x2={0} y2={sy} stroke={color} strokeWidth={1.5} markerEnd="url(#arrowhead)" />}
              {isDiamond ? (
                <polygon points={`0,${sy} ${stepW/3},${sy + stepH/2} 0,${sy + stepH} ${-stepW/3},${sy + stepH/2}`}
                  fill={`${color}15`} stroke={color} strokeWidth={1.5} />
              ) : (
                <rect x={-stepW/2} y={sy} width={stepW} height={stepH} rx={isDiamond ? 0 : 6} fill={`${color}15`} stroke={color} strokeWidth={1.5} />
              )}
              <text x={0} y={sy + stepH/2 + 4} textAnchor="middle" fill={color} fontSize={10} fontWeight={500}>{s.label}</text>
            </g>
          );
        })}
      </g>
    </g>
  );
};

export const VennDiagramEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 260, height = 200, color = '#00e5ff', label, className = '', animationDelay = 0, metadata }) => {
  const sets: { label: string; color?: string }[] = metadata?.sets || [
    { label: 'Set A', color: '#00e5ff' }, { label: 'Set B', color: '#ff6b9d' },
  ];
  const intersection = metadata?.intersection || '';
  const r = Math.min(width, height) * 0.3;
  const overlap = r * 0.6;
  const positions = sets.length === 2
    ? [{ cx: -overlap / 2, cy: 0 }, { cx: overlap / 2, cy: 0 }]
    : sets.length === 3
    ? [{ cx: 0, cy: -overlap * 0.4 }, { cx: -overlap / 2, cy: overlap * 0.3 }, { cx: overlap / 2, cy: overlap * 0.3 }]
    : [{ cx: 0, cy: 0 }];

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={8} fill="#0b0d1420" stroke={`${color}20`} strokeWidth={1} />
        {sets.map((s, i) => {
          const pos = positions[i] || { cx: 0, cy: 0 };
          const sc = s.color || color;
          return (
            <g key={i}>
              <circle cx={pos.cx} cy={pos.cy} r={r} fill={`${sc}15`} stroke={sc} strokeWidth={2} />
              <text x={pos.cx + (pos.cx >= 0 ? r * 0.5 : -r * 0.5)} y={pos.cy - r * 0.2}
                textAnchor="middle" fill={sc} fontSize={10} fontWeight={600}>{s.label}</text>
            </g>
          );
        })}
        {intersection && <text x={0} y={8} textAnchor="middle" fill="#ffffff80" fontSize={9}>{intersection}</text>}
        {label && <text x={0} y={height/2 + 16} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>{label}</text>}
      </g>
    </g>
  );
};

export const AnnotationEntity: React.FC<MetadataComponentProps> = ({ x, y, width = 180, height = 60, color = '#ffab00', label, className = '', animationDelay = 0, metadata }) => {
  const targetX = metadata?.targetX || 0;
  const targetY = metadata?.targetY || 40;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <g className={className} style={ANIM_STYLE(animationDelay)}>
        <line x1={0} y1={height/2} x2={targetX} y2={targetY} stroke={`${color}60`} strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={targetX} cy={targetY} r={3} fill={color} />
        <rect x={-width/2} y={-height/2} width={width} height={height} rx={6} fill="#0b0d1480" stroke={color} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fill={color} fontSize={11} fontWeight={500} fontFamily="'Geist Mono', monospace">{label || 'Note'}</text>
      </g>
    </g>
  );
};
