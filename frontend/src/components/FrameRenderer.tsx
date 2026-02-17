/* ═══════════════════════════════════════════════════════════════
   Frame Renderer Component

   Renders visual entities from frame-based visual scripts.
   Handles smooth transitions between frames and entity animations.
   Supports:
   - Entity-to-entity connections (arrows draw between entities)
   - Hierarchical nesting (children render inside parent bounds)
   - Rich text (multi-line, code blocks)
   - Entity transitions (morph, highlight, dim)
   - Temporal choreography (appearTime within frames)
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
  /** Current time within the frame for temporal choreography (ms offset from frame start) */
  frameElapsedMs?: number;
}

/** Resolve entity position by label for connection endpoints */
function buildEntityPositionMap(
  entities: VisualEntity[],
  canvasWidth: number,
  canvasHeight: number,
): Map<string, { x: number; y: number; w: number; h: number }> {
  const map = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const e of entities) {
    if (e.label) {
      map.set(e.label, {
        x: (e.position.x / 100) * canvasWidth,
        y: (e.position.y / 100) * canvasHeight,
        w: e.size.width,
        h: e.size.height,
      });
    }
  }
  return map;
}

/** Build parent→children mapping for nesting */
function buildChildrenMap(entities: VisualEntity[]): Map<string, VisualEntity[]> {
  const map = new Map<string, VisualEntity[]>();
  for (const e of entities) {
    if (e.parentEntityId) {
      const children = map.get(e.parentEntityId) || [];
      children.push(e);
      map.set(e.parentEntityId, children);
    }
  }
  return map;
}

export const FrameRenderer = React.memo<FrameRendererProps>(({
  entities,
  exitingEntities = [],
  canvasWidth,
  canvasHeight,
  frameElapsedMs = Infinity,
}) => {
  const posMap = useMemo(() => buildEntityPositionMap(entities, canvasWidth, canvasHeight), [entities, canvasWidth, canvasHeight]);
  const childrenMap = useMemo(() => buildChildrenMap(entities), [entities]);

  // Separate: top-level entities (no parent) vs children (have parent)
  const topLevelEntities = useMemo(() => entities.filter(e => !e.parentEntityId), [entities]);

  // Filter entities by temporal choreography (appearTime via animation.delay as offset)
  const visibleEntities = useMemo(() => {
    if (frameElapsedMs === Infinity) return topLevelEntities;
    return topLevelEntities.filter(e => {
      const appearTime = e.animation?.delay || 0;
      return frameElapsedMs >= appearTime;
    });
  }, [topLevelEntities, frameElapsedMs]);

  return (
    <g className="frame-entities">
      {/* Exiting entities: fade out */}
      {exitingEntities.map(entity => (
        <g key={`exit-${entity.type}-${entity.label}`} className="entity-exiting">
          <EntityRenderer
            entity={entity}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            posMap={posMap}
            childrenMap={childrenMap}
          />
        </g>
      ))}
      {/* Active entities: stable keys enable reconciliation across frames */}
      {visibleEntities.map(entity => (
        <EntityRenderer
          key={`${entity.type}-${entity.label || entity.id}`}
          entity={entity}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          posMap={posMap}
          childrenMap={childrenMap}
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
  posMap: Map<string, { x: number; y: number; w: number; h: number }>;
  childrenMap: Map<string, VisualEntity[]>;
}

const EntityRenderer: React.FC<EntityRendererProps> = ({
  entity,
  canvasWidth,
  canvasHeight,
  posMap,
  childrenMap,
}) => {
  // Convert percentage position to canvas coordinates
  const x = (entity.position.x / 100) * canvasWidth;
  const y = (entity.position.y / 100) * canvasHeight;

  const animClass = entity.animation ? `illus-${entity.animation.type}` : '';
  const highlightClass = entity.highlight === true ? 'entity-highlight' : (entity.highlight === false ? 'entity-dim' : '');
  const combinedClass = [animClass, highlightClass].filter(Boolean).join(' ');
  const animDelay = entity.animation?.delay || 0;
  const animDuration = entity.animation?.duration || 500;
  const color = entity.color || '#00e5ff';

  // Check for entity-to-entity connections (Arrow/DataFlow)
  const isConnector = (entity.type === 'Arrow' || entity.type === 'DataFlow') &&
    entity.sourceEntityId && entity.targetEntityId;

  if (isConnector) {
    const source = posMap.get(entity.sourceEntityId!);
    const target = posMap.get(entity.targetEntityId!);

    if (source && target) {
      // Compute edge points (center-to-center with offset for entity bounds)
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return null;

      const nx = dx / dist;
      const ny = dy / dist;

      // Offset from center by half the entity size
      const x1 = source.x + nx * (source.w / 2);
      const y1 = source.y + ny * (source.h / 2);
      const x2 = target.x - nx * (target.w / 2);
      const y2 = target.y - ny * (target.h / 2);

      if (entity.type === 'DataFlow') {
        return (
          <DataFlow
            x1={x1} y1={y1} x2={x2} y2={y2}
            color={color}
            className={combinedClass}
            animationDelay={animDelay}
          />
        );
      }

      return (
        <Arrow
          x1={x1} y1={y1} x2={x2} y2={y2}
          color={color}
          label={entity.label}
          className={combinedClass}
          animated={entity.animation?.type === 'flow' || entity.animation?.type === 'dashFlow'}
          animationDelay={animDelay}
        />
      );
    }
  }

  // Get children for this entity (nesting)
  const children = entity.label ? childrenMap.get(entity.label) : undefined;

  // Render different entity types
  switch (entity.type) {
    case 'User':
      return (
        <g>
          <User x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Server':
      return (
        <g>
          <Server x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Database':
      return (
        <g>
          <Database x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Container':
      return (
        <g>
          <Container x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Pod':
      return (
        <g>
          <Pod x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Cloud':
      return (
        <g>
          <Cloud x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Device':
      return (
        <Device x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Arrow':
      // Standalone arrow (no from/to)
      return (
        <Arrow
          x1={x - entity.size.width / 2} y1={y}
          x2={x + entity.size.width / 2} y2={y}
          color={color} label={entity.label}
          className={combinedClass}
          animated={entity.animation?.type === 'flow' || entity.animation?.type === 'dashFlow'}
          animationDelay={animDelay}
        />
      );

    case 'DataFlow':
      return (
        <DataFlow
          x1={x - entity.size.width / 2} y1={y}
          x2={x + entity.size.width / 2} y2={y}
          color={color} className={combinedClass} animationDelay={animDelay}
        />
      );

    case 'Process':
    case 'Service':
    case 'Queue':
    case 'Cache':
    case 'LoadBalancer':
      return (
        <g>
          <Box x={x} y={y} size={entity.size.width} color={color}
            label={entity.label || entity.type} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Network':
      return (
        <g className={combinedClass} style={{ animationDelay: `${animDelay}ms`, animationDuration: `${animDuration}ms` }}>
          <line
            x1={x - entity.size.width / 2} y1={y}
            x2={x + entity.size.width / 2} y2={y}
            stroke={color} strokeWidth={3} strokeDasharray="8,4" opacity={0.6}
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
        <g>
          <Concept x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Entity':
      return (
        <g>
          <Entity x={x} y={y} size={entity.size.width} color={color}
            label={entity.textContent ? undefined : entity.label}
            className={combinedClass} animationDelay={animDelay} />
          {entity.textContent && renderMultiLineText(x, y, entity.textContent, color, entity.size.width, entity.codeLanguage)}
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Group':
      return (
        <g>
          <GroupEntity x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Label':
      return (
        <g>
          <LabelEntity x={x} y={y} size={entity.size.width} color={color}
            label={entity.textContent ? entity.textContent.join(' ') : entity.label}
            className={combinedClass} animationDelay={animDelay} />
        </g>
      );

    case 'Comparison':
      return (
        <ComparisonEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Timeline':
      return (
        <TimelineEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Metric':
      return (
        <MetricEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Cycle':
      return (
        <CycleEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Stack':
      return (
        <StackEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Tree':
      return (
        <TreeEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Badge':
      return (
        <BadgeEntity x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Quote':
      return (
        <g>
          <QuoteEntity x={x} y={y} size={entity.size.width} color={color}
            label={entity.textContent ? undefined : entity.label}
            className={combinedClass} animationDelay={animDelay} />
          {entity.textContent && renderMultiLineText(x, y, entity.textContent, color, entity.size.width)}
        </g>
      );

    default:
      // Fallback: render as circle
      return (
        <g className={combinedClass} style={{ animationDelay: `${animDelay}ms`, animationDuration: `${animDuration}ms` }}>
          <circle cx={x} cy={y} r={entity.size.width / 2}
            fill={`${color}20`} stroke={color} strokeWidth={2}
            opacity={entity.highlight ? 1 : 0.8} />
          {entity.label && (
            <text x={x} y={y + 5} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>
              {entity.label}
            </text>
          )}
        </g>
      );
  }
};

/** Render children entities inside a parent's bounds */
function renderChildren(
  children: VisualEntity[],
  parentX: number,
  parentY: number,
  parentSize: { width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  posMap: Map<string, { x: number; y: number; w: number; h: number }>,
  childrenMap: Map<string, VisualEntity[]>,
) {
  // Children positions are interpreted relative to parent center
  // Scale children to fit inside parent bounds (80% of parent area)
  const scale = Math.min(parentSize.width, parentSize.height) / 200;

  return (
    <g>
      {children.map((child, i) => {
        // Position children relative to parent
        const childX = parentX + ((child.position.x - 50) / 100) * parentSize.width * 0.8;
        const childY = parentY + ((child.position.y - 50) / 100) * parentSize.height * 0.8;
        const childScale = Math.max(0.4, scale);
        const color = child.color || '#00e5ff';
        const animClass = child.animation ? `illus-${child.animation.type}` : '';
        const animDelay = child.animation?.delay || 0;

        const childSize = Math.round(child.size.width * childScale);

        // Nested children of this child
        const grandChildren = child.label ? childrenMap.get(child.label) : undefined;

        // Render child based on type (simplified)
        switch (child.type) {
          case 'Container':
            return (
              <g key={`child-${child.type}-${child.label || i}`}>
                <Container x={childX} y={childY} size={childSize} color={color}
                  label={child.label} className={animClass} animationDelay={animDelay} />
                {grandChildren && renderChildren(grandChildren, childX, childY,
                  { width: childSize, height: childSize }, canvasWidth, canvasHeight, posMap, childrenMap)}
              </g>
            );
          case 'Pod':
            return (
              <g key={`child-${child.type}-${child.label || i}`}>
                <Pod x={childX} y={childY} size={childSize} color={color}
                  label={child.label} className={animClass} animationDelay={animDelay} />
              </g>
            );
          case 'Service':
          case 'Process':
            return (
              <g key={`child-${child.type}-${child.label || i}`}>
                <Box x={childX} y={childY} size={childSize} color={color}
                  label={child.label || child.type} className={animClass} animationDelay={animDelay} />
              </g>
            );
          default:
            return (
              <g key={`child-${child.type}-${child.label || i}`} className={animClass}
                style={{ animationDelay: `${animDelay}ms` }}>
                <rect x={childX - childSize / 2} y={childY - childSize * 0.4}
                  width={childSize} height={childSize * 0.8} rx={4}
                  fill={`${color}15`} stroke={color} strokeWidth={1.5} />
                {child.label && (
                  <text x={childX} y={childY + 4} textAnchor="middle" fill={color}
                    fontSize={Math.min(10, childSize / 5)} fontWeight={500}
                    fontFamily="'Geist Mono', monospace">
                    {child.label}
                  </text>
                )}
              </g>
            );
        }
      })}
    </g>
  );
}

/** Render multi-line text inside an entity */
function renderMultiLineText(
  x: number,
  y: number,
  lines: string[],
  color: string,
  containerWidth: number,
  codeLanguage?: string,
) {
  const isCode = !!codeLanguage;
  const fontSize = isCode ? 11 : 12;
  const lineHeight = isCode ? 16 : 18;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  return (
    <g>
      {isCode && (
        <rect
          x={x - containerWidth / 2 + 8}
          y={startY - lineHeight}
          width={containerWidth - 16}
          height={lines.length * lineHeight + lineHeight}
          rx={4}
          fill="rgba(0,0,0,0.3)"
          stroke={`${color}30`}
          strokeWidth={1}
        />
      )}
      {lines.map((line, i) => (
        <text
          key={i}
          x={isCode ? x - containerWidth / 2 + 20 : x}
          y={startY + i * lineHeight}
          textAnchor={isCode ? 'start' : 'middle'}
          fill={color}
          fontSize={fontSize}
          fontWeight={isCode ? 400 : 500}
          fontFamily={isCode ? "'Geist Mono', monospace" : "'DM Sans', sans-serif"}
          opacity={0.9}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
