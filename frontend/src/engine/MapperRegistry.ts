/* ═══════════════════════════════════════════════════════════════
   MapperRegistry — String-keyed lookup for serialized parameter mappers
   Maps ParameterBindingSpec.mapper keys to actual mapper functions.
   Pure module: NO DOM, NO React.
   ═══════════════════════════════════════════════════════════════ */

import type { SceneElement } from '@shared/types';

export type MapperFn = (value: unknown) => Partial<SceneElement>;

const registry = new Map<string, MapperFn>();

export function registerMapper(name: string, fn: MapperFn): void {
  registry.set(name, fn);
}

export function getMapper(name: string): MapperFn {
  const fn = registry.get(name);
  if (!fn) {
    throw new Error(`Mapper "${name}" not found in registry`);
  }
  return fn;
}

export function hasMapper(name: string): boolean {
  return registry.has(name);
}

// ── Built-in mappers ──────────────────────────────────────────

registerMapper('opacity-linear', (value) => ({
  opacity: Math.max(0, Math.min(1, Number(value))),
}));

registerMapper('opacity-from-ratio', (value) => ({
  opacity: Math.max(0, Math.min(1, Number(value) / 10)),
}));

registerMapper('visibility-threshold', (value) => ({
  visible: Number(value) > 0,
}));

registerMapper('scale-linear', (value) => ({
  properties: { scale: Number(value) },
}));

registerMapper('position-x-linear', (value) => ({
  position: { x: Number(value), y: 0 },
}));

registerMapper('position-y-linear', (value) => ({
  position: { x: 0, y: Number(value) },
}));

registerMapper('zindex-from-value', (value) => ({
  zIndex: Math.round(Number(value)),
}));

registerMapper('noop', () => ({}));
