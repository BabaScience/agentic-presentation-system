/* ═══════════════════════════════════════════════════════════════
   Frame Renderer Component

   Renders visual entities from frame-based visual scripts.
   Handles smooth transitions between frames and entity animations.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import type { VisualEntity, VisualEntityType } from '../../../shared/types';
import {
  Server, Database, Container, Pod, Cloud, User, Device, Arrow, DataFlow, Box,
  Concept, Entity, GroupEntity, LabelEntity, ComparisonEntity, TimelineEntity,
  MetricEntity, CycleEntity, StackEntity, TreeEntity, BadgeEntity, QuoteEntity,
} from './svg/SVGLibrary';

interface FrameRendererProps {
  entities: VisualEntity[];
  exitingEntities?: VisualEntity[];
  canvasWidth: number;
  canvasHeight: number;
}

export const FrameRenderer = React.memo<FrameRendererProps>(({ entities, exitingEntities = [], canvasWidth, canvasHeight }) => {
  return (
    <g className="frame-entities">
      {/* Exiting entities: fade out */}
      {exitingEntities.map(entity => (
        <g key={`exit-${entity.type}-${entity.label}`} className="entity-exiting">
          <EntityRenderer entity={entity} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
        </g>
      ))}
      {/* Active entities: stable keys enable reconciliation across frames */}
      {entities.map(entity => (
        <EntityRenderer
          key={`${entity.type}-${entity.label || entity.id}`}
          entity={entity}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}
    </g>
  );
});

FrameRenderer.displayName = 'FrameRenderer';

interface EntityRendererProps {
  entity: VisualEntity;
  canvasWidth: number;
  canvasHeight: number;
}

const EntityRenderer: React.FC<EntityRendererProps> = ({ entity, canvasWidth, canvasHeight }) => {
  // Convert percentage position to canvas coordinates
  const x = (entity.position.x / 100) * canvasWidth;
  const y = (entity.position.y / 100) * canvasHeight;

  const animClass = entity.animation ? `illus-${entity.animation.type}` : '';
  const animDelay = entity.animation?.delay || 0;
  const color = entity.color || '#00e5ff';

  // Render different entity types
  switch (entity.type) {
    case 'User':
      return (
        <User
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Server':
      return (
        <Server
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Database':
      return (
        <Database
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Container':
      return (
        <Container
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Pod':
      return (
        <Pod
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Cloud':
      return (
        <Cloud
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Device':
      return (
        <Device
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Arrow':
      // For arrows, use size.width as length
      return (
        <Arrow
          x1={x - entity.size.width / 2}
          y1={y}
          x2={x + entity.size.width / 2}
          y2={y}
          color={color}
          label={entity.label}
          className={animClass}
          animated={entity.animation?.type === 'flow'}
          animationDelay={animDelay}
        />
      );

    case 'DataFlow':
      return (
        <DataFlow
          x1={x - entity.size.width / 2}
          y1={y}
          x2={x + entity.size.width / 2}
          y2={y}
          color={color}
          className={animClass}
          animationDelay={animDelay}
        />
      );

    case 'Process':
    case 'Service':
    case 'Queue':
    case 'Cache':
    case 'LoadBalancer':
      // Use generic box for these types
      return (
        <Box
          x={x}
          y={y}
          size={entity.size.width}
          color={color}
          label={entity.label || entity.type}
          className={animClass}
        />
      );

    case 'Network':
      // Render as a horizontal line
      return (
        <g className={animClass} style={{ animationDelay: `${animDelay}ms` }}>
          <line
            x1={x - entity.size.width / 2}
            y1={y}
            x2={x + entity.size.width / 2}
            y2={y}
            stroke={color}
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.6}
          />
          {entity.label && (
            <text x={x} y={y - 15} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>
              {entity.label}
            </text>
          )}
        </g>
      );

    case 'Concept':
      return (
        <Concept
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Entity':
      return (
        <Entity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Group':
      return (
        <GroupEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Label':
      return (
        <LabelEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Comparison':
      return (
        <ComparisonEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Timeline':
      return (
        <TimelineEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Metric':
      return (
        <MetricEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Cycle':
      return (
        <CycleEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Stack':
      return (
        <StackEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Tree':
      return (
        <TreeEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Badge':
      return (
        <BadgeEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    case 'Quote':
      return (
        <QuoteEntity
          x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={animClass} animationDelay={animDelay}
        />
      );

    default:
      // Fallback: render as circle
      return (
        <g className={animClass} style={{ animationDelay: `${animDelay}ms` }}>
          <circle
            cx={x}
            cy={y}
            r={entity.size.width / 2}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={2}
            opacity={entity.highlight ? 1 : 0.8}
          />
          {entity.label && (
            <text x={x} y={y + 5} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>
              {entity.label}
            </text>
          )}
        </g>
      );
  }
};
