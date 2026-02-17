/* ═══════════════════════════════════════════════════════════════
   Scene Composition Service

   Intelligent layout algorithms for optimal entity positioning.
   Implements force-directed, hierarchical, circular, and flow
   layouts. Applies composition rules (rule of thirds, golden
   ratio) and calculates aesthetic scores.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import {
  type SceneLayout,
  type LayoutEntity,
  type LayoutConstraint,
  type CompositionRule,
  type VisualEntity,
  clampEntityPosition,
} from '../../shared/types';

/**
 * Golden Ratio constant
 */
const GOLDEN_RATIO = 1.618;
const PHI = (1 + Math.sqrt(5)) / 2;

export class SceneCompositionService {
  /**
   * Generate optimal layout for entities
   */
  generateLayout(
    entities: VisualEntity[],
    layoutType: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'flow',
    constraints?: LayoutConstraint[],
  ): SceneLayout {
    const layoutEntities = entities.map((e) => ({
      id: e.id,
      position: e.position,
      size: e.size,
      fixed: false,
      weight: 1.0,
    }));

    let computedLayout: LayoutEntity[];

    switch (layoutType) {
      case 'force-directed':
        computedLayout = this.forceDirectedLayout(layoutEntities, constraints);
        break;
      case 'hierarchical':
        computedLayout = this.hierarchicalLayout(layoutEntities, constraints);
        break;
      case 'circular':
        computedLayout = this.circularLayout(layoutEntities);
        break;
      case 'grid':
        computedLayout = this.gridLayout(layoutEntities);
        break;
      case 'flow':
        computedLayout = this.flowLayout(layoutEntities, constraints);
        break;
      default:
        computedLayout = layoutEntities;
    }

    // Calculate aesthetic score
    const aestheticScore = this.calculateAestheticScore(computedLayout);

    return {
      type: layoutType,
      entities: computedLayout,
      constraints,
      aestheticScore,
    };
  }

  /**
   * Force-directed layout (natural spacing)
   */
  private forceDirectedLayout(
    entities: LayoutEntity[],
    constraints?: LayoutConstraint[],
  ): LayoutEntity[] {
    const iterations = 50;
    const repulsionStrength = 500;
    const attractionStrength = 0.1;
    const damping = 0.95;

    // Initialize velocities
    const velocities = entities.map(() => ({ x: 0, y: 0 }));

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate forces
      const forces = entities.map(() => ({ x: 0, y: 0 }));

      // Repulsion between all entities
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const dx = entities[j].position.x - entities[i].position.x;
          const dy = entities[j].position.y - entities[i].position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.1;

          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          forces[i].x -= fx;
          forces[i].y -= fy;
          forces[j].x += fx;
          forces[j].y += fy;
        }
      }

      // Attraction to center
      for (let i = 0; i < entities.length; i++) {
        const dx = 50 - entities[i].position.x;
        const dy = 50 - entities[i].position.y;

        forces[i].x += dx * attractionStrength;
        forces[i].y += dy * attractionStrength;
      }

      // Apply forces
      for (let i = 0; i < entities.length; i++) {
        if (!entities[i].fixed) {
          velocities[i].x = (velocities[i].x + forces[i].x) * damping;
          velocities[i].y = (velocities[i].y + forces[i].y) * damping;

          entities[i].position.x += velocities[i].x;
          entities[i].position.y += velocities[i].y;

          // Constrain to canvas
          entities[i].position.x = Math.max(10, Math.min(90, entities[i].position.x));
          entities[i].position.y = Math.max(10, Math.min(90, entities[i].position.y));
        }
      }
    }

    return entities;
  }

  /**
   * Hierarchical layout (tree structure)
   */
  private hierarchicalLayout(
    entities: LayoutEntity[],
    constraints?: LayoutConstraint[],
  ): LayoutEntity[] {
    // Simple top-down hierarchical layout
    const levels = this.assignLevels(entities, constraints);
    const maxLevel = Math.max(...levels);

    entities.forEach((entity, index) => {
      const level = levels[index];
      const entitiesAtLevel = levels.filter((l) => l === level).length;
      const indexAtLevel = levels.slice(0, index).filter((l) => l === level).length;

      // Position vertically by level
      entity.position.y = 20 + (level / maxLevel) * 60;

      // Position horizontally by index at level
      const spacing = 80 / (entitiesAtLevel + 1);
      entity.position.x = 10 + spacing * (indexAtLevel + 1);
    });

    return entities;
  }

  /**
   * Circular layout
   */
  private circularLayout(entities: LayoutEntity[]): LayoutEntity[] {
    const centerX = 50;
    const centerY = 50;
    const radius = 35;

    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI;
      entity.position.x = centerX + radius * Math.cos(angle);
      entity.position.y = centerY + radius * Math.sin(angle);
      // Size-aware clamp to keep entity within canvas
      entity.position = clampEntityPosition(entity.position, entity.size.width, entity.size.height);
    });

    return entities;
  }

  /**
   * Grid layout
   */
  private gridLayout(entities: LayoutEntity[]): LayoutEntity[] {
    const cols = Math.ceil(Math.sqrt(entities.length));
    const rows = Math.ceil(entities.length / cols);

    const cellWidth = 80 / cols;
    const cellHeight = 80 / rows;

    entities.forEach((entity, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      entity.position.x = 10 + col * cellWidth + cellWidth / 2;
      entity.position.y = 10 + row * cellHeight + cellHeight / 2;
    });

    return entities;
  }

  /**
   * Flow layout (left to right process flow)
   */
  private flowLayout(entities: LayoutEntity[], constraints?: LayoutConstraint[]): LayoutEntity[] {
    // Determine ordering from constraints
    const ordered = this.orderEntitiesForFlow(entities, constraints);

    ordered.forEach((entity, index) => {
      const progress = index / (ordered.length - 1 || 1);
      entity.position.x = 15 + progress * 70;
      entity.position.y = 50;
    });

    return ordered;
  }

  /**
   * Apply composition rules to improve aesthetics
   */
  applyCompositionRules(layout: SceneLayout): SceneLayout {
    const rules: CompositionRule[] = [
      {
        name: 'Rule of Thirds',
        enabled: true,
        weight: 1.0,
        evaluate: this.evaluateRuleOfThirds.bind(this),
      },
      {
        name: 'Golden Ratio',
        enabled: true,
        weight: 0.8,
        evaluate: this.evaluateGoldenRatio.bind(this),
      },
      {
        name: 'Balance',
        enabled: true,
        weight: 1.0,
        evaluate: this.evaluateBalance.bind(this),
      },
      {
        name: 'Spacing',
        enabled: true,
        weight: 0.9,
        evaluate: this.evaluateSpacing.bind(this),
      },
      {
        name: 'Alignment',
        enabled: true,
        weight: 0.7,
        evaluate: this.evaluateAlignment.bind(this),
      },
    ];

    // Apply each rule and adjust positions
    for (const rule of rules) {
      if (rule.enabled) {
        const score = rule.evaluate(layout);
        if (score < 0.7) {
          // Apply adjustments to improve score
          this.applyRuleAdjustments(layout, rule);
        }
      }
    }

    // Recalculate aesthetic score
    layout.aestheticScore = this.calculateAestheticScore(layout.entities);

    return layout;
  }

  /**
   * Calculate overall aesthetic score (0-1)
   */
  private calculateAestheticScore(entities: LayoutEntity[]): number {
    const ruleOfThirdsScore = this.evaluateRuleOfThirds({ entities, type: 'grid' });
    const balanceScore = this.evaluateBalance({ entities, type: 'grid' });
    const spacingScore = this.evaluateSpacing({ entities, type: 'grid' });
    const alignmentScore = this.evaluateAlignment({ entities, type: 'grid' });

    return (
      ruleOfThirdsScore * 0.3 +
      balanceScore * 0.3 +
      spacingScore * 0.25 +
      alignmentScore * 0.15
    );
  }

  /**
   * Evaluate Rule of Thirds compliance
   */
  private evaluateRuleOfThirds(layout: SceneLayout): number {
    const powerPoints = [
      { x: 33.33, y: 33.33 },
      { x: 66.67, y: 33.33 },
      { x: 33.33, y: 66.67 },
      { x: 66.67, y: 66.67 },
    ];

    let totalDistance = 0;
    let count = 0;

    layout.entities.forEach((entity) => {
      const closestPowerPoint = powerPoints.reduce((closest, point) => {
        const dx = entity.position.x - point.x;
        const dy = entity.position.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < closest.distance ? { point, distance } : closest;
      }, { point: powerPoints[0], distance: Infinity });

      totalDistance += closestPowerPoint.distance;
      count++;
    });

    const averageDistance = totalDistance / count;
    return Math.max(0, 1 - averageDistance / 50);
  }

  /**
   * Evaluate Golden Ratio compliance
   */
  private evaluateGoldenRatio(layout: SceneLayout): number {
    // Check if key elements are positioned according to golden ratio
    const goldenPoints = [
      { x: 100 / PHI, y: 50 },
      { x: 50, y: 100 / PHI },
    ];

    let totalScore = 0;
    let count = 0;

    layout.entities.slice(0, 2).forEach((entity, index) => {
      if (index < goldenPoints.length) {
        const dx = entity.position.x - goldenPoints[index].x;
        const dy = entity.position.y - goldenPoints[index].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalScore += Math.max(0, 1 - distance / 40);
        count++;
      }
    });

    return count > 0 ? totalScore / count : 0.5;
  }

  /**
   * Evaluate visual balance
   */
  private evaluateBalance(layout: SceneLayout): number {
    // Calculate center of mass
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;

    layout.entities.forEach((entity) => {
      const weight = entity.weight || 1;
      totalX += entity.position.x * weight;
      totalY += entity.position.y * weight;
      totalWeight += weight;
    });

    const centerX = totalX / totalWeight;
    const centerY = totalY / totalWeight;

    // Distance from canvas center
    const dx = centerX - 50;
    const dy = centerY - 50;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return Math.max(0, 1 - distance / 30);
  }

  /**
   * Evaluate spacing between entities
   */
  private evaluateSpacing(layout: SceneLayout): number {
    if (layout.entities.length < 2) return 1;

    const minDistance = 10; // Minimum acceptable distance
    const idealDistance = 20;

    let totalScore = 0;
    let count = 0;

    for (let i = 0; i < layout.entities.length; i++) {
      for (let j = i + 1; j < layout.entities.length; j++) {
        const dx = layout.entities[i].position.x - layout.entities[j].position.x;
        const dy = layout.entities[i].position.y - layout.entities[j].position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          totalScore += 0; // Too close
        } else if (distance < idealDistance) {
          totalScore += distance / idealDistance;
        } else {
          totalScore += 1; // Good spacing
        }
        count++;
      }
    }

    return totalScore / count;
  }

  /**
   * Evaluate alignment
   */
  private evaluateAlignment(layout: SceneLayout): number {
    if (layout.entities.length < 2) return 1;

    const alignmentThreshold = 5; // pixels

    let alignedCount = 0;
    let total = 0;

    for (let i = 0; i < layout.entities.length; i++) {
      for (let j = i + 1; j < layout.entities.length; j++) {
        const xDiff = Math.abs(layout.entities[i].position.x - layout.entities[j].position.x);
        const yDiff = Math.abs(layout.entities[i].position.y - layout.entities[j].position.y);

        if (xDiff < alignmentThreshold || yDiff < alignmentThreshold) {
          alignedCount++;
        }
        total++;
      }
    }

    return total > 0 ? alignedCount / total : 0.5;
  }

  /**
   * Apply rule-specific adjustments
   */
  private applyRuleAdjustments(layout: SceneLayout, rule: CompositionRule): void {
    // Apply gentle nudges based on rule
    switch (rule.name) {
      case 'Balance':
        this.adjustForBalance(layout.entities);
        break;
      case 'Spacing':
        this.adjustForSpacing(layout.entities);
        break;
      case 'Alignment':
        this.adjustForAlignment(layout.entities);
        break;
    }
  }

  /**
   * Adjust entities for better balance
   */
  private adjustForBalance(entities: LayoutEntity[]): void {
    // Calculate center of mass
    let totalX = 0;
    let totalY = 0;

    entities.forEach((entity) => {
      totalX += entity.position.x;
      totalY += entity.position.y;
    });

    const centerX = totalX / entities.length;
    const centerY = totalY / entities.length;

    // Shift all entities slightly toward canvas center
    const shiftFactor = 0.1;
    entities.forEach((entity) => {
      if (!entity.fixed) {
        entity.position.x += (50 - centerX) * shiftFactor;
        entity.position.y += (50 - centerY) * shiftFactor;
        entity.position = clampEntityPosition(entity.position, entity.size.width, entity.size.height);
      }
    });
  }

  /**
   * Adjust entities for better spacing
   */
  private adjustForSpacing(entities: LayoutEntity[]): void {
    const minDistance = 12;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const dx = entities[j].position.x - entities[i].position.x;
        const dy = entities[j].position.y - entities[i].position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const angle = Math.atan2(dy, dx);

          if (!entities[i].fixed) {
            entities[i].position.x -= Math.cos(angle) * overlap * 0.5;
            entities[i].position.y -= Math.sin(angle) * overlap * 0.5;
            entities[i].position = clampEntityPosition(entities[i].position, entities[i].size.width, entities[i].size.height);
          }
          if (!entities[j].fixed) {
            entities[j].position.x += Math.cos(angle) * overlap * 0.5;
            entities[j].position.y += Math.sin(angle) * overlap * 0.5;
            entities[j].position = clampEntityPosition(entities[j].position, entities[j].size.width, entities[j].size.height);
          }
        }
      }
    }
  }

  /**
   * Adjust entities for better alignment
   */
  private adjustForAlignment(entities: LayoutEntity[]): void {
    const alignmentThreshold = 5;
    const snapStrength = 0.3;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const xDiff = entities[j].position.x - entities[i].position.x;
        const yDiff = entities[j].position.y - entities[i].position.y;

        // Snap to horizontal alignment
        if (Math.abs(yDiff) < alignmentThreshold) {
          const averageY = (entities[i].position.y + entities[j].position.y) / 2;
          if (!entities[i].fixed) {
            entities[i].position.y += (averageY - entities[i].position.y) * snapStrength;
          }
          if (!entities[j].fixed) {
            entities[j].position.y += (averageY - entities[j].position.y) * snapStrength;
          }
        }

        // Snap to vertical alignment
        if (Math.abs(xDiff) < alignmentThreshold) {
          const averageX = (entities[i].position.x + entities[j].position.x) / 2;
          if (!entities[i].fixed) {
            entities[i].position.x += (averageX - entities[i].position.x) * snapStrength;
          }
          if (!entities[j].fixed) {
            entities[j].position.x += (averageX - entities[j].position.x) * snapStrength;
          }
        }
      }
    }
  }

  /**
   * Helper methods
   */

  private assignLevels(entities: LayoutEntity[], constraints?: LayoutConstraint[]): number[] {
    // Simple level assignment (for hierarchical layout)
    const levels = entities.map(() => 0);

    // If ordering constraints exist, use them
    const orderingConstraint = constraints?.find((c) => c.type === 'ordering');
    if (orderingConstraint) {
      orderingConstraint.entities.forEach((entityId, index) => {
        const entityIndex = entities.findIndex((e) => e.id === entityId);
        if (entityIndex !== -1) {
          levels[entityIndex] = index;
        }
      });
    }

    return levels;
  }

  private orderEntitiesForFlow(
    entities: LayoutEntity[],
    constraints?: LayoutConstraint[],
  ): LayoutEntity[] {
    const orderingConstraint = constraints?.find((c) => c.type === 'ordering');

    if (orderingConstraint) {
      const ordered: LayoutEntity[] = [];
      orderingConstraint.entities.forEach((entityId) => {
        const entity = entities.find((e) => e.id === entityId);
        if (entity) ordered.push(entity);
      });

      // Add any remaining entities
      entities.forEach((entity) => {
        if (!ordered.includes(entity)) {
          ordered.push(entity);
        }
      });

      return ordered;
    }

    return entities;
  }
}
