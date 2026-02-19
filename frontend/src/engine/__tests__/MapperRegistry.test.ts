import { describe, it, expect } from 'vitest';
import { getMapper, hasMapper, registerMapper } from '../MapperRegistry';

describe('MapperRegistry', () => {
  // ── Test 1: opacity-linear clamps to [0, 1] ────────────────
  it('opacity-linear clamps value to [0, 1]', () => {
    const mapper = getMapper('opacity-linear');

    expect(mapper(0.5)).toEqual({ opacity: 0.5 });
    expect(mapper(0)).toEqual({ opacity: 0 });
    expect(mapper(1)).toEqual({ opacity: 1 });
    // Clamp above 1
    expect(mapper(5)).toEqual({ opacity: 1 });
    // Clamp below 0
    expect(mapper(-3)).toEqual({ opacity: 0 });
  });

  // ── Test 2: visibility-threshold returns visible for positive ──
  it('visibility-threshold returns visible: true for positive values', () => {
    const mapper = getMapper('visibility-threshold');

    expect(mapper(1)).toEqual({ visible: true });
    expect(mapper(0.5)).toEqual({ visible: true });
    expect(mapper(0)).toEqual({ visible: false });
    expect(mapper(-1)).toEqual({ visible: false });
  });

  // ── Test 3: getMapper throws for unknown name ──────────────
  it('getMapper throws for unknown mapper name', () => {
    expect(() => getMapper('nonexistent-mapper')).toThrowError(
      'Mapper "nonexistent-mapper" not found in registry',
    );
  });

  // ── Test 4: registerMapper allows custom mappers ───────────
  it('registerMapper allows custom mappers', () => {
    registerMapper('custom-test', (value) => ({
      opacity: Number(value) * 2,
    }));

    expect(hasMapper('custom-test')).toBe(true);

    const mapper = getMapper('custom-test');
    expect(mapper(0.25)).toEqual({ opacity: 0.5 });
  });

  // ── Test 5: noop mapper returns empty object ───────────────
  it('noop mapper returns empty object', () => {
    const mapper = getMapper('noop');

    expect(mapper(42)).toEqual({});
    expect(mapper('anything')).toEqual({});
    expect(mapper(null)).toEqual({});
  });
});
