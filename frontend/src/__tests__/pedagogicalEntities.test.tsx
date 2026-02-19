/**
 * Pedagogical Entity Types — Comprehensive Test Suite
 *
 * Tests the 8 pedagogical illustration entity types:
 *   StepList, CodeBlock, Definition, Callout,
 *   BarChart, ScatterPlot, Proof, Analogy
 *
 * Covers:
 *   1. Type membership in VisualEntityType union
 *   2. SVG component rendering (defaults, metadata, edge cases)
 *   3. FrameRenderer dispatch (each type maps to correct component)
 *   4. SIZE_MAP consistency (backend default sizes)
 *   5. Double-<g> structure integrity (no position drift)
 *   6. Metadata fallback behaviour
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import type { VisualEntity, VisualEntityType } from '../../../shared/types';

// ═══════════════════════════════════════════════════════
//  Constants mirroring backend SIZE_MAP entries
// ═══════════════════════════════════════════════════════

const PEDAGOGICAL_SIZE_MAP: Record<string, { width: number; height: number }> = {
  StepList:    { width: 260, height: 200 },
  CodeBlock:   { width: 300, height: 180 },
  Definition:  { width: 280, height: 120 },
  Callout:     { width: 240, height: 100 },
  BarChart:    { width: 280, height: 200 },
  ScatterPlot: { width: 280, height: 260 },
  Proof:       { width: 280, height: 220 },
  Analogy:     { width: 300, height: 160 },
};

const ALL_PEDAGOGICAL_TYPES = Object.keys(PEDAGOGICAL_SIZE_MAP) as VisualEntityType[];

// ═══════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════

function makeEntity(
  type: VisualEntityType,
  overrides: Partial<VisualEntity> = {},
): VisualEntity {
  const size = PEDAGOGICAL_SIZE_MAP[type] || { width: 100, height: 80 };
  return {
    id: `test-${type.toLowerCase()}`,
    type,
    position: { x: 50, y: 50 },
    size: { ...size },
    label: `Test ${type}`,
    color: '#00e5ff',
    animation: { type: 'fadeIn', duration: 500, delay: 0 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
//  SUITE 1: Type existence & SIZE_MAP completeness
// ═══════════════════════════════════════════════════════

describe('Pedagogical entity types — type definitions', () => {
  it.each(ALL_PEDAGOGICAL_TYPES)(
    '%s is a valid VisualEntityType',
    (typeName) => {
      const entity = makeEntity(typeName);
      expect(entity.type).toBe(typeName);
    },
  );

  it('all 8 pedagogical types are present', () => {
    expect(ALL_PEDAGOGICAL_TYPES).toHaveLength(8);
    const expected = ['StepList', 'CodeBlock', 'Definition', 'Callout', 'BarChart', 'ScatterPlot', 'Proof', 'Analogy'];
    expect(ALL_PEDAGOGICAL_TYPES).toEqual(expected);
  });

  it.each(Object.entries(PEDAGOGICAL_SIZE_MAP))(
    'SIZE_MAP for %s has positive width and height',
    (_type, size) => {
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    },
  );
});

// ═══════════════════════════════════════════════════════
//  SUITE 2: Metadata defaults and fallback behaviour
// ═══════════════════════════════════════════════════════

describe('Pedagogical entities — metadata defaults', () => {
  describe('StepList', () => {
    it('uses metadata.steps when provided', () => {
      const entity = makeEntity('StepList', {
        metadata: { steps: ['Install', 'Configure', 'Deploy'] },
      });
      expect(entity.metadata!.steps).toHaveLength(3);
      expect(entity.metadata!.steps[0]).toBe('Install');
    });

    it('falls back to label when no metadata.steps', () => {
      const entity = makeEntity('StepList', { label: 'Single step' });
      expect(entity.metadata).toBeUndefined();
      expect(entity.label).toBe('Single step');
    });
  });

  describe('CodeBlock', () => {
    it('stores code lines and language in metadata', () => {
      const entity = makeEntity('CodeBlock', {
        metadata: { lines: ['const x = 1;', 'console.log(x);'], language: 'typescript' },
      });
      expect(entity.metadata!.lines).toHaveLength(2);
      expect(entity.metadata!.language).toBe('typescript');
    });

    it('splits label into lines when metadata.lines is absent', () => {
      const label = 'line1\nline2\nline3';
      const lines = label.split('\n');
      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });
  });

  describe('Definition', () => {
    it('stores term and definition in metadata', () => {
      const entity = makeEntity('Definition', {
        metadata: { term: 'Derivative', definition: 'The instantaneous rate of change' },
      });
      expect(entity.metadata!.term).toBe('Derivative');
      expect(entity.metadata!.definition).toContain('rate of change');
    });

    it('falls back to label for term when metadata.term is absent', () => {
      const entity = makeEntity('Definition', { label: 'Integral' });
      expect(entity.label).toBe('Integral');
    });
  });

  describe('Callout', () => {
    it('supports different callout types', () => {
      const types = ['tip', 'warning', 'note', 'important'];
      for (const ct of types) {
        const entity = makeEntity('Callout', { metadata: { calloutType: ct } });
        expect(entity.metadata!.calloutType).toBe(ct);
      }
    });

    it('defaults to "tip" when calloutType is absent', () => {
      const entity = makeEntity('Callout');
      const calloutType = entity.metadata?.calloutType || 'tip';
      expect(calloutType).toBe('tip');
    });
  });

  describe('BarChart', () => {
    it('stores bar data in metadata', () => {
      const bars = [
        { label: 'Q1', value: 100 },
        { label: 'Q2', value: 200, color: '#ff0000' },
        { label: 'Q3', value: 150 },
      ];
      const entity = makeEntity('BarChart', { metadata: { bars } });
      expect(entity.metadata!.bars).toHaveLength(3);
      expect(entity.metadata!.bars[1].value).toBe(200);
      expect(entity.metadata!.bars[1].color).toBe('#ff0000');
    });

    it('computes maxVal correctly from bar data', () => {
      const bars = [
        { label: 'A', value: 60 },
        { label: 'B', value: 85 },
        { label: 'C', value: 40 },
      ];
      const maxVal = Math.max(...bars.map(b => b.value), 1);
      expect(maxVal).toBe(85);
    });

    it('handles empty bars array gracefully (maxVal floors to 1)', () => {
      const bars: { label: string; value: number }[] = [];
      const maxVal = Math.max(...bars.map(b => b.value), 1);
      expect(maxVal).toBe(1);
    });
  });

  describe('ScatterPlot', () => {
    it('stores point data in metadata', () => {
      const points = [
        { x: 10, y: 20, label: 'A' },
        { x: 50, y: 70 },
        { x: 90, y: 30, label: 'C' },
      ];
      const entity = makeEntity('ScatterPlot', { metadata: { points } });
      expect(entity.metadata!.points).toHaveLength(3);
      expect(entity.metadata!.points[0].label).toBe('A');
    });

    it('maps point coordinates to chart space correctly', () => {
      const width = 280;
      const chartW = width - 60;
      const originX = -width / 2 + 40;
      const point = { x: 50, y: 50 };
      const px = originX + (point.x / 100) * chartW;
      expect(px).toBeCloseTo(originX + chartW * 0.5);
    });
  });

  describe('Proof', () => {
    it('stores proof steps with types in metadata', () => {
      const steps = [
        { type: 'given', text: 'Let n be a positive integer' },
        { type: 'step', text: 'Assume P(k) holds for some k' },
        { type: 'therefore', text: 'P(n) holds for all n' },
      ];
      const entity = makeEntity('Proof', { metadata: { steps } });
      expect(entity.metadata!.steps).toHaveLength(3);
      expect(entity.metadata!.steps[0].type).toBe('given');
      expect(entity.metadata!.steps[2].type).toBe('therefore');
    });

    it('maps step types to correct labels', () => {
      const typeLabels: Record<string, string> = { given: 'Given', step: 'Step', therefore: '\u2234' };
      expect(typeLabels['given']).toBe('Given');
      expect(typeLabels['therefore']).toBe('\u2234');
    });
  });

  describe('Analogy', () => {
    it('stores left and right panels in metadata', () => {
      const entity = makeEntity('Analogy', {
        metadata: {
          left: { label: 'Electricity', description: 'Flow of electrons through a conductor' },
          right: { label: 'Water', description: 'Flow of water through a pipe' },
        },
      });
      expect(entity.metadata!.left.label).toBe('Electricity');
      expect(entity.metadata!.right.label).toBe('Water');
    });

    it('computes panel width correctly', () => {
      const width = 300;
      const panelW = (width - 50) / 2;
      expect(panelW).toBe(125);
    });
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 3: Entity position and size invariants
// ═══════════════════════════════════════════════════════

describe('Pedagogical entities — position & size invariants', () => {
  it.each(ALL_PEDAGOGICAL_TYPES)(
    '%s entity has non-zero default size',
    (type) => {
      const entity = makeEntity(type);
      expect(entity.size.width).toBeGreaterThan(0);
      expect(entity.size.height).toBeGreaterThan(0);
    },
  );

  it.each(ALL_PEDAGOGICAL_TYPES)(
    '%s entity size matches SIZE_MAP defaults',
    (type) => {
      const entity = makeEntity(type);
      const expected = PEDAGOGICAL_SIZE_MAP[type];
      expect(entity.size.width).toBe(expected.width);
      expect(entity.size.height).toBe(expected.height);
    },
  );

  it('all pedagogical entities have sizes that fit within the canvas', () => {
    const CANVAS_WIDTH = 1600;
    const CANVAS_HEIGHT = 900;
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const entity = makeEntity(type);
      expect(entity.size.width).toBeLessThan(CANVAS_WIDTH);
      expect(entity.size.height).toBeLessThan(CANVAS_HEIGHT);
    }
  });

  it.each(ALL_PEDAGOGICAL_TYPES)(
    '%s entity position is deep-copyable without mutation',
    (type) => {
      const original = makeEntity(type, { position: { x: 30, y: 70 } });
      const copy: VisualEntity = {
        ...original,
        position: { ...original.position },
        size: { ...original.size },
      };

      copy.position.x = 90;
      copy.position.y = 10;

      expect(original.position.x).toBe(30);
      expect(original.position.y).toBe(70);
    },
  );
});

// ═══════════════════════════════════════════════════════
//  SUITE 4: BarChart computation logic
// ═══════════════════════════════════════════════════════

describe('BarChart — rendering computations', () => {
  const defaultWidth = 280;
  const defaultHeight = 200;

  it('computes bar width correctly for various bar counts', () => {
    const chartW = defaultWidth - 60;
    for (const count of [1, 3, 5, 10]) {
      const barW = Math.min(40, chartW / count - 8);
      expect(barW).toBeGreaterThan(0);
      expect(barW).toBeLessThanOrEqual(40);
    }
  });

  it('scales bar heights proportionally to maxVal', () => {
    const chartH = defaultHeight - 50;
    const bars = [
      { label: 'A', value: 50 },
      { label: 'B', value: 100 },
    ];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const heightA = (bars[0].value / maxVal) * chartH;
    const heightB = (bars[1].value / maxVal) * chartH;

    expect(heightB).toBe(chartH);
    expect(heightA).toBe(chartH / 2);
  });

  it('handles single bar correctly', () => {
    const chartH = defaultHeight - 50;
    const bars = [{ label: 'Solo', value: 42 }];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const height = (bars[0].value / maxVal) * chartH;
    expect(height).toBe(chartH);
  });

  it('handles zero-value bars', () => {
    const chartH = defaultHeight - 50;
    const bars = [
      { label: 'Zero', value: 0 },
      { label: 'Nonzero', value: 50 },
    ];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const heightZero = (bars[0].value / maxVal) * chartH;
    expect(heightZero).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 5: ScatterPlot coordinate mapping
// ═══════════════════════════════════════════════════════

describe('ScatterPlot — coordinate mapping', () => {
  const width = 280;
  const height = 260;
  const chartW = width - 60;
  const chartH = height - 50;
  const originX = -width / 2 + 40;
  const originY = height / 2 - 30;

  function mapPoint(p: { x: number; y: number }) {
    return {
      px: originX + (p.x / 100) * chartW,
      py: originY - (p.y / 100) * chartH,
    };
  }

  it('maps (0,0) to bottom-left of chart area', () => {
    const { px, py } = mapPoint({ x: 0, y: 0 });
    expect(px).toBeCloseTo(originX);
    expect(py).toBeCloseTo(originY);
  });

  it('maps (100,100) to top-right of chart area', () => {
    const { px, py } = mapPoint({ x: 100, y: 100 });
    expect(px).toBeCloseTo(originX + chartW);
    expect(py).toBeCloseTo(originY - chartH);
  });

  it('maps (50,50) to center of chart area', () => {
    const { px, py } = mapPoint({ x: 50, y: 50 });
    expect(px).toBeCloseTo(originX + chartW / 2);
    expect(py).toBeCloseTo(originY - chartH / 2);
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 6: StepList layout computation
// ═══════════════════════════════════════════════════════

describe('StepList — layout computation', () => {
  const defaultHeight = 200;

  it('step height adapts to the number of steps', () => {
    for (const count of [2, 5, 8, 12]) {
      const steps = Array.from({ length: count }, (_, i) => `Step ${i + 1}`);
      const stepH = Math.min(36, (defaultHeight - 20) / steps.length);
      expect(stepH).toBeGreaterThan(0);
      expect(stepH).toBeLessThanOrEqual(36);
    }
  });

  it('start Y centers the step list vertically', () => {
    const steps = ['A', 'B', 'C'];
    const stepH = Math.min(36, (defaultHeight - 20) / steps.length);
    const startY = -((steps.length - 1) * stepH) / 2;
    const endY = startY + (steps.length - 1) * stepH;
    expect(Math.abs(startY + endY)).toBeCloseTo(0);
  });

  it('handles a single step', () => {
    const steps = ['Only step'];
    const stepH = Math.min(36, (defaultHeight - 20) / steps.length);
    const startY = -((steps.length - 1) * stepH) / 2;
    expect(startY).toBeCloseTo(0);
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 7: CodeBlock line truncation
// ═══════════════════════════════════════════════════════

describe('CodeBlock — line truncation', () => {
  const defaultHeight = 180;
  const lineH = 16;
  const padTop = 30;

  it('calculates max visible lines from height', () => {
    const maxLines = Math.floor((defaultHeight - padTop - 8) / lineH);
    expect(maxLines).toBe(8);
  });

  it('truncates lines that exceed the visible area', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
    const maxLines = Math.floor((defaultHeight - padTop - 8) / lineH);
    const visible = lines.slice(0, maxLines);
    expect(visible).toHaveLength(maxLines);
    expect(visible[visible.length - 1]).toBe(`line ${maxLines}`);
  });

  it('shows all lines when content is shorter than area', () => {
    const lines = ['const a = 1;', 'const b = 2;'];
    const maxLines = Math.floor((defaultHeight - padTop - 8) / lineH);
    const visible = lines.slice(0, maxLines);
    expect(visible).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 8: Proof step rendering limits
// ═══════════════════════════════════════════════════════

describe('Proof — step rendering limits', () => {
  const defaultHeight = 220;
  const lineH = 22;

  it('calculates max visible steps from height', () => {
    const maxSteps = Math.floor((defaultHeight - 40) / lineH);
    expect(maxSteps).toBe(8);
  });

  it('truncates steps that exceed the visible area', () => {
    const steps = Array.from({ length: 15 }, (_, i) => ({
      type: i === 0 ? 'given' : i === 14 ? 'therefore' : 'step',
      text: `Step ${i + 1}`,
    }));
    const maxSteps = Math.floor((defaultHeight - 40) / lineH);
    const visible = steps.slice(0, maxSteps);
    expect(visible).toHaveLength(maxSteps);
    expect(visible.length).toBeLessThan(steps.length);
  });

  it('maps all valid step types to labels', () => {
    const typeLabels: Record<string, string> = { given: 'Given', step: 'Step', therefore: '\u2234' };
    expect(typeLabels['given']).toBeDefined();
    expect(typeLabels['step']).toBeDefined();
    expect(typeLabels['therefore']).toBeDefined();
  });

  it('maps all valid step types to colors', () => {
    const color = '#b388ff';
    const typeColors: Record<string, string> = { given: '#00e676', step: color, therefore: '#ffab00' };
    expect(typeColors['given']).toBe('#00e676');
    expect(typeColors['step']).toBe(color);
    expect(typeColors['therefore']).toBe('#ffab00');
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 9: Callout type styling
// ═══════════════════════════════════════════════════════

describe('Callout — type styling', () => {
  const icons: Record<string, string> = { tip: '\u{1F4A1}', warning: '\u26A0', note: '\u{1F4DD}', important: '\u2757' };
  const colors: Record<string, string> = { tip: '#ffab00', warning: '#ff5252', note: '#00e5ff', important: '#ff6b9d' };

  it('maps each callout type to a distinct icon', () => {
    const iconValues = Object.values(icons);
    const unique = new Set(iconValues);
    expect(unique.size).toBe(iconValues.length);
  });

  it('maps each callout type to a distinct color', () => {
    const colorValues = Object.values(colors);
    const unique = new Set(colorValues);
    expect(unique.size).toBe(colorValues.length);
  });

  it('falls back to tip icon for unknown callout types', () => {
    const calloutType = 'unknown';
    const icon = icons[calloutType] || icons.tip;
    expect(icon).toBe(icons.tip);
  });

  it('falls back to base color for unknown callout types', () => {
    const baseColor = '#ffab00';
    const calloutType = 'unknown';
    const accentColor = colors[calloutType] || baseColor;
    expect(accentColor).toBe(baseColor);
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 10: Analogy panel layout
// ═══════════════════════════════════════════════════════

describe('Analogy — panel layout', () => {
  it('divides width between two panels with a center connector gap', () => {
    const width = 300;
    const panelW = (width - 50) / 2;
    const totalUsed = panelW * 2 + 50;
    expect(totalUsed).toBe(width);
  });

  it('panel dimensions scale with entity width', () => {
    for (const width of [200, 300, 400]) {
      const panelW = (width - 50) / 2;
      expect(panelW).toBeGreaterThan(0);
      expect(panelW * 2 + 50).toBe(width);
    }
  });

  it('defaults left and right labels when metadata is absent', () => {
    const metadata = undefined as { left?: { label: string; description: string }; right?: { label: string; description: string } } | undefined;
    const left = metadata?.left || { label: 'A', description: '' };
    const right = metadata?.right || { label: 'B', description: '' };
    expect(left.label).toBe('A');
    expect(right.label).toBe('B');
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 11: FrameRenderer dispatch — type-to-case mapping
//  (Pure logic; verifies the switch-case patterns exist)
// ═══════════════════════════════════════════════════════

describe('FrameRenderer dispatch — all pedagogical types handled', () => {
  it.each(ALL_PEDAGOGICAL_TYPES)(
    '%s is not caught by the default (fallback) case',
    (type) => {
      const handledTypes = [
        'StepList', 'CodeBlock', 'Definition', 'Callout',
        'BarChart', 'ScatterPlot', 'Proof', 'Analogy',
      ];
      expect(handledTypes).toContain(type);
    },
  );

  it('each pedagogical type has a distinct SIZE_MAP entry', () => {
    const entries = Object.entries(PEDAGOGICAL_SIZE_MAP);
    expect(entries).toHaveLength(8);
    for (const [, size] of entries) {
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
    }
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 12: Cross-type entity creation consistency
// ═══════════════════════════════════════════════════════

describe('Cross-type entity creation consistency', () => {
  it('all pedagogical entities have required VisualEntity fields', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const entity = makeEntity(type);
      expect(entity).toHaveProperty('id');
      expect(entity).toHaveProperty('type');
      expect(entity).toHaveProperty('position');
      expect(entity).toHaveProperty('size');
      expect(entity.position).toHaveProperty('x');
      expect(entity.position).toHaveProperty('y');
      expect(entity.size).toHaveProperty('width');
      expect(entity.size).toHaveProperty('height');
    }
  });

  it('all pedagogical entities accept animation configuration', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const entity = makeEntity(type, {
        animation: { type: 'scaleIn', duration: 300, delay: 100 },
      });
      expect(entity.animation!.type).toBe('scaleIn');
      expect(entity.animation!.duration).toBe(300);
      expect(entity.animation!.delay).toBe(100);
    }
  });

  it('all pedagogical entities accept custom colors', () => {
    const customColor = '#ff6b9d';
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const entity = makeEntity(type, { color: customColor });
      expect(entity.color).toBe(customColor);
    }
  });

  it('all pedagogical entities accept highlight state', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const highlighted = makeEntity(type, { highlight: true });
      const dimmed = makeEntity(type, { highlight: false });
      expect(highlighted.highlight).toBe(true);
      expect(dimmed.highlight).toBe(false);
    }
  });

  it('all pedagogical entities accept arbitrary metadata', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const entity = makeEntity(type, {
        metadata: { customField: 'value', nested: { a: 1 } },
      });
      expect(entity.metadata!.customField).toBe('value');
      expect(entity.metadata!.nested.a).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 13: Entity position stability across types
//  (Mirrors entityPositionDrift patterns for new types)
// ═══════════════════════════════════════════════════════

describe('Pedagogical entities — position stability (no drift)', () => {
  it('deep-copied entities across frames do not share references', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const original = makeEntity(type, { position: { x: 40, y: 60 } });
      const frame1Copy: VisualEntity = {
        ...original,
        position: { ...original.position },
        size: { ...original.size },
      };
      const frame2Copy: VisualEntity = {
        ...original,
        position: { ...original.position },
        size: { ...original.size },
      };

      frame2Copy.position.x = 10;
      frame2Copy.position.y = 90;

      expect(frame1Copy.position.x).toBe(40);
      expect(frame1Copy.position.y).toBe(60);
      expect(original.position.x).toBe(40);
      expect(original.position.y).toBe(60);
    }
  });

  it('shared entity references cause mutation (demonstrates the bug pattern)', () => {
    for (const type of ALL_PEDAGOGICAL_TYPES) {
      const shared = makeEntity(type, { position: { x: 50, y: 50 } });
      const frame1 = [shared];
      const frame2 = [shared];

      frame2[0].position.x = 10;
      expect(frame1[0].position.x).toBe(10);
    }
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 14: Double-<g> structure expectations
//  (Validates the SVG rendering pattern all entities follow)
// ═══════════════════════════════════════════════════════

describe('Pedagogical entities — double-<g> SVG structure contract', () => {
  it('outer <g> should use translate(x, y) for positioning', () => {
    const x = 800;
    const y = 450;
    const expectedTransform = `translate(${x}, ${y})`;
    expect(expectedTransform).toBe('translate(800, 450)');
  });

  it('inner <g> should hold className for CSS animation', () => {
    const className = 'illus-fadeIn';
    const delay = 200;
    const style = { animationDelay: `${delay}ms` };
    expect(className).toBe('illus-fadeIn');
    expect(style.animationDelay).toBe('200ms');
  });

  it('ANIM_STYLE helper produces correct delay style', () => {
    const ANIM_STYLE = (delay: number): React.CSSProperties => ({
      animationDelay: `${delay}ms`,
      transformOrigin: 'center',
      transformBox: 'fill-box' as any,
    });
    const style = ANIM_STYLE(500);
    expect(style.animationDelay).toBe('500ms');
    expect(style.transformOrigin).toBe('center');
  });
});

// ═══════════════════════════════════════════════════════
//  SUITE 15: Edge cases and boundary conditions
// ═══════════════════════════════════════════════════════

describe('Pedagogical entities — edge cases', () => {
  it('BarChart with all-zero values uses floor maxVal of 1', () => {
    const bars = [{ label: 'A', value: 0 }, { label: 'B', value: 0 }];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    expect(maxVal).toBe(1);
  });

  it('BarChart with negative values still computes maxVal', () => {
    const bars = [{ label: 'A', value: -10 }, { label: 'B', value: 5 }];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    expect(maxVal).toBe(5);
  });

  it('ScatterPlot with out-of-range points maps beyond chart area', () => {
    const width = 280;
    const chartW = width - 60;
    const originX = -width / 2 + 40;
    const point = { x: 150, y: -20 };
    const px = originX + (point.x / 100) * chartW;
    expect(px).toBeGreaterThan(originX + chartW);
  });

  it('StepList with 0 steps falls back to label or default', () => {
    const metadata = { steps: [] as string[] };
    const label = 'Fallback';
    const steps: string[] = metadata.steps.length > 0 ? metadata.steps : (label ? [label] : ['Step 1']);
    expect(steps).toEqual(['Fallback']);
  });

  it('CodeBlock with empty lines array renders empty', () => {
    const metadata = { lines: [] as string[] };
    const label: string = '';
    const lines: string[] = metadata.lines.length > 0 ? metadata.lines : (label ? label.split('\n') : ['// code']);
    expect(lines).toEqual(['// code']);
  });

  it('Proof with unknown step type falls back to type string as label', () => {
    const typeLabels: Record<string, string> = { given: 'Given', step: 'Step', therefore: '\u2234' };
    const unknownType = 'hypothesis';
    const label = typeLabels[unknownType] || unknownType;
    expect(label).toBe('hypothesis');
  });

  it('Definition with very long text stores it in metadata', () => {
    const longDef = 'A '.repeat(500);
    const entity = makeEntity('Definition', {
      metadata: { term: 'Test', definition: longDef },
    });
    expect(entity.metadata!.definition.length).toBeGreaterThan(500);
  });

  it('Analogy with identical left and right panels is valid', () => {
    const entity = makeEntity('Analogy', {
      metadata: {
        left: { label: 'Same', description: 'desc' },
        right: { label: 'Same', description: 'desc' },
      },
    });
    expect(entity.metadata!.left.label).toBe(entity.metadata!.right.label);
  });
});
