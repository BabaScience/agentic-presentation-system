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
import { type VisualEntity, type VisualEntityType, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../shared/types';
import {
  Server, Database, Container, Pod, Cloud, User, Device, Arrow, DataFlow, Box,
  Concept, Entity, GroupEntity, LabelEntity, ComparisonEntity, TimelineEntity,
  MetricEntity, CycleEntity, StackEntity, TreeEntity, BadgeEntity, QuoteEntity,
  LoadBalancerShape, QueueShape, CacheShape, ServiceShape, ProcessShape,
  FirewallShape, APIGatewayShape, LambdaShape, SubnetShape, VolumeShape,
  RegistryShape, MonitorShape, PipelineShape, DecisionShape, ClusterShape,
  // Math & Science types
  EquationEntity, ExpressionEntity, MatrixEntity, Graph2DEntity, NumberLineEntity, CoordinateSystemEntity,
  // Physics types
  VectorEntity, WaveEntity, FreeBodyDiagramEntity, ParticleEntity, CircuitEntity, FieldEntity,
  // General purpose types
  TableEntity, HistogramEntity, PieChartEntity, FlowDiagramEntity, VennDiagramEntity, AnnotationEntity,
  // Pedagogical types
  StepListEntity, CodeBlockEntity, DefinitionEntity, CalloutEntity,
  BarChartEntity, ScatterPlotEntity, ProofEntity, AnalogyEntity,
} from './svg/SVGLibrary';

interface FrameRendererProps {
  entities: VisualEntity[];
  exitingEntities?: VisualEntity[];
  canvasWidth: number;
  canvasHeight: number;
  /** Current time within the frame for temporal choreography (ms offset from frame start) */
  frameElapsedMs?: number;
}

type PosEntry = { x: number; y: number; w: number; h: number };

/** Resolve entity position by label for connection endpoints */
function buildEntityPositionMap(
  entities: VisualEntity[],
  canvasWidth: number,
  canvasHeight: number,
): Map<string, PosEntry> {
  const map = new Map<string, PosEntry>();
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

/**
 * Fuzzy lookup: exact -> case-insensitive -> substring containment.
 * Prevents silent arrow failures when Claude's from/to labels don't match exactly.
 */
function fuzzyLookup(posMap: Map<string, PosEntry>, label: string): PosEntry | undefined {
  const exact = posMap.get(label);
  if (exact) return exact;

  const lower = label.toLowerCase();
  for (const [key, val] of posMap) {
    if (key.toLowerCase() === lower) return val;
  }
  for (const [key, val] of posMap) {
    const kl = key.toLowerCase();
    if (kl.includes(lower) || lower.includes(kl)) return val;
  }
  return undefined;
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
  // Convert percentage position to canvas coordinates (with defense-in-depth clamping)
  // Guard against NaN — default to center if position is corrupted
  const px = isNaN(entity.position.x) ? 50 : entity.position.x;
  const py = isNaN(entity.position.y) ? 50 : entity.position.y;
  const halfWPct = (entity.size.width / 2) / canvasWidth * 100;
  const halfHPct = (entity.size.height / 2) / canvasHeight * 100;
  const clampedPctX = Math.max(halfWPct + 1, Math.min(100 - halfWPct - 1, px));
  const clampedPctY = Math.max(halfHPct + 1, Math.min(100 - halfHPct - 1, py));
  const x = (clampedPctX / 100) * canvasWidth;
  const y = (clampedPctY / 100) * canvasHeight;

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
    const source = fuzzyLookup(posMap, entity.sourceEntityId!);
    const target = fuzzyLookup(posMap, entity.targetEntityId!);

    if (source && target) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return null;

      const nx = dx / dist;
      const ny = dy / dist;

      const pad = 8;
      const x1 = Math.max(pad, Math.min(canvasWidth - pad, source.x + nx * (source.w / 2)));
      const y1 = Math.max(pad, Math.min(canvasHeight - pad, source.y + ny * (source.h / 2)));
      const x2 = Math.max(pad, Math.min(canvasWidth - pad, target.x - nx * (target.w / 2)));
      const y2 = Math.max(pad, Math.min(canvasHeight - pad, target.y - ny * (target.h / 2)));

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

    // Broken link: from/to specified but could not resolve one or both endpoints
    return (
      <g className={combinedClass} style={{ animationDelay: `${animDelay}ms`, transformOrigin: 'center', transformBox: 'fill-box' as any }}>
        <line
          x1={x - entity.size.width / 2} y1={y}
          x2={x + entity.size.width / 2} y2={y}
          stroke={color} strokeWidth={2} strokeDasharray="6,4" opacity={0.35}
        />
        {entity.label && (
          <text x={x} y={y - 8} textAnchor="middle" fill={color} fontSize={10} opacity={0.5}>
            {entity.label}
          </text>
        )}
      </g>
    );
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
      return (
        <g>
          <ProcessShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Service':
      return (
        <g>
          <ServiceShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Queue':
      return (
        <g>
          <QueueShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Cache':
      return (
        <g>
          <CacheShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'LoadBalancer':
      return (
        <g>
          <LoadBalancerShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Firewall':
      return (
        <g>
          <FirewallShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'APIGateway':
      return (
        <g>
          <APIGatewayShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Lambda':
      return (
        <LambdaShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Subnet':
      return (
        <g>
          <SubnetShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Volume':
      return (
        <VolumeShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Registry':
      return (
        <RegistryShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Monitor':
      return (
        <MonitorShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Pipeline':
      return (
        <PipelineShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Decision':
      return (
        <DecisionShape x={x} y={y} size={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} />
      );

    case 'Cluster':
      return (
        <g>
          <ClusterShape x={x} y={y} size={entity.size.width} color={color}
            label={entity.label} className={combinedClass} animationDelay={animDelay} />
          {children && renderChildren(children, x, y, entity.size, canvasWidth, canvasHeight, posMap, childrenMap)}
        </g>
      );

    case 'Network':
      return (
        <g transform={`translate(${x}, ${y})`}>
          <g className={combinedClass} style={{ animationDelay: `${animDelay}ms`, animationDuration: `${animDuration}ms`, transformOrigin: 'center', transformBox: 'fill-box' as any }}>
            <line
              x1={-entity.size.width / 2} y1={0}
              x2={entity.size.width / 2} y2={0}
              stroke={color} strokeWidth={3} strokeDasharray="8,4" opacity={0.6}
            />
            {entity.label && (
              <text x={0} y={-15} textAnchor="middle" fill={color} fontSize={11} fontWeight={500}>
                {entity.label}
              </text>
            )}
          </g>
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

    // ═══ Math & Science Types ═══
    case 'Equation':
      return (
        <EquationEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Expression':
      return (
        <ExpressionEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Matrix':
      return (
        <MatrixEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Graph2D':
      return (
        <Graph2DEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'NumberLine':
      return (
        <NumberLineEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'CoordinateSystem':
      return (
        <CoordinateSystemEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    // ═══ Physics Types ═══
    case 'Vector':
      return (
        <VectorEntity x={x} y={y} width={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Wave':
      return (
        <WaveEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'FreeBodyDiagram':
      return (
        <FreeBodyDiagramEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Particle':
      return (
        <ParticleEntity x={x} y={y} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Circuit':
      return (
        <CircuitEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Field':
      return (
        <FieldEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    // ═══ General Purpose Types ═══
    case 'Table':
      return (
        <TableEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Histogram':
      return (
        <HistogramEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'PieChart':
      return (
        <PieChartEntity x={x} y={y} width={entity.size.width} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'FlowDiagram':
      return (
        <FlowDiagramEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'VennDiagram':
      return (
        <VennDiagramEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Annotation':
      return (
        <AnnotationEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    // ═══ Pedagogical Types ═══
    case 'StepList':
      return (
        <StepListEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'CodeBlock':
      return (
        <CodeBlockEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Definition':
      return (
        <DefinitionEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Callout':
      return (
        <CalloutEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'BarChart':
      return (
        <BarChartEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'ScatterPlot':
      return (
        <ScatterPlotEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Proof':
      return (
        <ProofEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    case 'Analogy':
      return (
        <AnalogyEntity x={x} y={y} width={entity.size.width} height={entity.size.height} color={color}
          label={entity.label} className={combinedClass} animationDelay={animDelay} metadata={entity.metadata} />
      );

    default:
      // Fallback: render as circle
      return (
        <g transform={`translate(${x}, ${y})`}>
          <g className={combinedClass} style={{ animationDelay: `${animDelay}ms`, animationDuration: `${animDuration}ms`, transformOrigin: 'center', transformBox: 'fill-box' as any }}>
            <circle cx={0} cy={0} r={entity.size.width / 2}
              fill={`${color}20`} stroke={color} strokeWidth={2}
              opacity={entity.highlight ? 1 : 0.8} />
            {entity.label && (
              <text x={0} y={5} textAnchor="middle" fill={color} fontSize={12} fontWeight={500}>
                {entity.label}
              </text>
            )}
          </g>
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
            return (
              <g key={`child-${child.type}-${child.label || i}`}>
                <ServiceShape x={childX} y={childY} size={childSize} color={color}
                  label={child.label} className={animClass} animationDelay={animDelay} />
              </g>
            );
          case 'Process':
            return (
              <g key={`child-${child.type}-${child.label || i}`}>
                <ProcessShape x={childX} y={childY} size={childSize} color={color}
                  label={child.label} className={animClass} animationDelay={animDelay} />
              </g>
            );
          default:
            return (
              <g key={`child-${child.type}-${child.label || i}`} transform={`translate(${childX}, ${childY})`}>
                <g className={animClass}
                  style={{ animationDelay: `${animDelay}ms`, transformOrigin: 'center', transformBox: 'fill-box' as any }}>
                  <rect x={-childSize / 2} y={-childSize * 0.4}
                    width={childSize} height={childSize * 0.8} rx={4}
                    fill={`${color}15`} stroke={color} strokeWidth={1.5} />
                  {child.label && (
                    <text x={0} y={4} textAnchor="middle" fill={color}
                      fontSize={Math.min(10, childSize / 5)} fontWeight={500}
                      fontFamily="'Geist Mono', monospace">
                      {child.label}
                    </text>
                  )}
                </g>
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
