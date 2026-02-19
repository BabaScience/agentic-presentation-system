/* ═══════════════════════════════════════════════════════════════
   SceneGraph — Persistent, mutable stage runtime
   Pure data layer: NO DOM, NO React, NO side effects, NO events,
   NO requestAnimationFrame.
   ═══════════════════════════════════════════════════════════════ */

import type {
  Bounds,
  Vector2,
  ViewportState,
  Parameter,
  SceneElement,
  ParameterBinding,
  BindingHandle,
  ElementHandle,
  SpatialIndex,
  SceneSnapshot,
  Annotation,
} from '@shared/types';
import { SPATIAL_GRID_CELL_SIZE } from '@shared/constants';

// ── Geometry helpers ────────────────────────────────────────

function boundsContainsPoint(bounds: Bounds, point: Vector2): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ── GridSpatialIndex ────────────────────────────────────────

class GridSpatialIndex implements SpatialIndex {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  private storedBounds: Map<string, Bounds> = new Map();

  constructor(cellSize: number = SPATIAL_GRID_CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private getCells(bounds: Bounds): string[] {
    const keys: string[] = [];
    const minCol = Math.floor(bounds.x / this.cellSize);
    const maxCol = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const minRow = Math.floor(bounds.y / this.cellSize);
    const maxRow = Math.floor((bounds.y + bounds.height) / this.cellSize);
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        keys.push(`${col},${row}`);
      }
    }
    return keys;
  }

  insert(id: string, bounds: Bounds): void {
    this.storedBounds.set(id, bounds);
    for (const key of this.getCells(bounds)) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Set();
        this.cells.set(key, cell);
      }
      cell.add(id);
    }
  }

  remove(id: string): void {
    const bounds = this.storedBounds.get(id);
    if (!bounds) return;
    for (const key of this.getCells(bounds)) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.cells.delete(key);
      }
    }
    this.storedBounds.delete(id);
  }

  update(id: string, bounds: Bounds): void {
    this.remove(id);
    this.insert(id, bounds);
  }

  queryPoint(point: Vector2): string[] {
    const key = `${Math.floor(point.x / this.cellSize)},${Math.floor(point.y / this.cellSize)}`;
    const cell = this.cells.get(key);
    if (!cell) return [];
    const results: string[] = [];
    for (const id of cell) {
      const bounds = this.storedBounds.get(id);
      if (bounds && boundsContainsPoint(bounds, point)) {
        results.push(id);
      }
    }
    return results;
  }

  queryRegion(rect: Bounds): string[] {
    const seen = new Set<string>();
    const results: string[] = [];
    for (const key of this.getCells(rect)) {
      const cell = this.cells.get(key);
      if (!cell) continue;
      for (const id of cell) {
        if (seen.has(id)) continue;
        seen.add(id);
        const bounds = this.storedBounds.get(id);
        if (bounds && boundsIntersect(bounds, rect)) {
          results.push(id);
        }
      }
    }
    return results;
  }

  clear(): void {
    this.cells.clear();
    this.storedBounds.clear();
  }
}

// ── SceneGraph ──────────────────────────────────────────────

function computeElementBounds(element: SceneElement): Bounds {
  const props = element.properties;
  const width = typeof props['width'] === 'number' ? props['width'] : 100;
  const height = typeof props['height'] === 'number' ? props['height'] : 100;
  return {
    x: element.position.x,
    y: element.position.y,
    width,
    height,
  };
}

let snapshotCounter = 0;

export class SceneGraph {
  private elements: Map<string, SceneElement> = new Map();
  private dirtyElements: Set<string> = new Set();
  private spatialIndex: GridSpatialIndex = new GridSpatialIndex();
  private viewport: ViewportState = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private parameters: Map<string, Parameter> = new Map();
  private parameterBindings: Map<string, ParameterBinding[]> = new Map();
  private snapshots: Map<string, SceneSnapshot> = new Map();

  // ── Element Lifecycle ───────────────────────────────────

  createElement(config: {
    id: string;
    type: SceneElement['type'];
    position: Vector2;
    properties?: Record<string, unknown>;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
  }): ElementHandle {
    if (this.elements.has(config.id)) {
      throw new Error(`Element "${config.id}" already exists`);
    }
    const element: SceneElement = {
      id: config.id,
      type: config.type,
      position: { ...config.position },
      visible: config.visible ?? true,
      opacity: config.opacity ?? 1,
      zIndex: config.zIndex ?? 0,
      properties: config.properties ? { ...config.properties } : {},
      boundParameters: [],
    };
    this.elements.set(element.id, element);
    this.spatialIndex.insert(element.id, computeElementBounds(element));
    this.dirtyElements.add(element.id);
    return { id: element.id, element };
  }

  updateElement(id: string, changes: Partial<SceneElement>): void {
    const element = this.elements.get(id);
    if (!element) {
      throw new Error(`Element "${id}" not found`);
    }
    Object.assign(element, changes);
    if (changes.position || changes.properties) {
      this.spatialIndex.update(id, computeElementBounds(element));
    }
    this.dirtyElements.add(id);
  }

  destroyElement(id: string): void {
    if (!this.elements.has(id)) {
      throw new Error(`Element "${id}" not found`);
    }
    this.elements.delete(id);
    this.spatialIndex.remove(id);
    this.dirtyElements.delete(id);
    // Remove bindings referencing this element
    for (const [paramName, bindings] of this.parameterBindings) {
      const filtered = bindings.filter((b) => b.elementId !== id);
      if (filtered.length === 0) {
        this.parameterBindings.delete(paramName);
      } else {
        this.parameterBindings.set(paramName, filtered);
      }
    }
  }

  showElement(id: string): void {
    this.updateElement(id, { visible: true, opacity: 1 });
  }

  hideElement(id: string): void {
    this.updateElement(id, { visible: false, opacity: 0 });
  }

  getElementById(id: string): SceneElement | undefined {
    return this.elements.get(id);
  }

  getAllElements(): SceneElement[] {
    return Array.from(this.elements.values());
  }

  // ── Dirty Tracking ──────────────────────────────────────

  getDirtyElements(): Set<string> {
    return new Set(this.dirtyElements);
  }

  clearDirty(): void {
    this.dirtyElements.clear();
  }

  markDirty(id: string): void {
    this.dirtyElements.add(id);
  }

  // ── Viewport ────────────────────────────────────────────

  setViewport(partial: Partial<ViewportState>): void {
    Object.assign(this.viewport, partial);
  }

  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  // ── Reactive Parameters ─────────────────────────────────

  defineParameter(name: string, config: Omit<Parameter, 'name'>): void {
    if (this.parameters.has(name)) {
      throw new Error(`Parameter "${name}" already exists`);
    }
    this.parameters.set(name, { name, ...config });
    this.parameterBindings.set(name, []);
  }

  setParameter(name: string, value: unknown): void {
    const param = this.parameters.get(name);
    if (!param) {
      throw new Error(`Parameter "${name}" not found`);
    }
    param.value = value;
    const bindings = this.parameterBindings.get(name) ?? [];
    for (const binding of bindings) {
      const changes = binding.mapper(value);
      const element = this.elements.get(binding.elementId);
      if (element) {
        Object.assign(element, changes);
        this.dirtyElements.add(binding.elementId);
      }
    }
  }

  getParameter(name: string): Parameter | undefined {
    return this.parameters.get(name);
  }

  bindElementToParameter(
    elementId: string,
    paramName: string,
    mapper: (value: unknown) => Partial<SceneElement>,
  ): BindingHandle {
    if (!this.elements.has(elementId)) {
      throw new Error(`Element "${elementId}" not found`);
    }
    const bindings = this.parameterBindings.get(paramName);
    if (!bindings) {
      throw new Error(`Parameter "${paramName}" not found`);
    }
    const binding: ParameterBinding = { elementId, paramName, mapper };
    bindings.push(binding);

    // Track on the element
    const element = this.elements.get(elementId)!;
    if (!element.boundParameters) element.boundParameters = [];
    if (!element.boundParameters.includes(paramName)) {
      element.boundParameters.push(paramName);
    }

    return {
      elementId,
      paramName,
      unbind: () => {
        const idx = bindings.indexOf(binding);
        if (idx !== -1) bindings.splice(idx, 1);
        if (element.boundParameters) {
          const pIdx = element.boundParameters.indexOf(paramName);
          if (pIdx !== -1) element.boundParameters.splice(pIdx, 1);
        }
      },
    };
  }

  // ── Snapshots ───────────────────────────────────────────

  createSnapshot(name: string, narrationOffset: number = 0): SceneSnapshot {
    const id = `snap_${++snapshotCounter}_${Date.now()}`;
    const snapshot: SceneSnapshot = {
      id,
      checkpointName: name,
      timestamp: Date.now(),
      elements: this.cloneElements(),
      viewport: { ...this.viewport },
      parameters: this.cloneParameters(),
      activeAnnotations: [],
      narrationOffset,
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  restoreSnapshot(id: string): void {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot "${id}" not found`);
    }
    // Clone again so the stored snapshot stays frozen
    this.elements = this.cloneElementsFrom(snapshot.elements);
    this.viewport = { ...snapshot.viewport };
    // Restore parameter values only — keep bindings intact (they contain functions)
    for (const [name, snappedParam] of snapshot.parameters) {
      const current = this.parameters.get(name);
      if (current) {
        current.value = snappedParam.value;
        current.min = snappedParam.min;
        current.max = snappedParam.max;
      }
    }
    // Rebuild spatial index
    this.spatialIndex.clear();
    for (const [elemId, element] of this.elements) {
      this.spatialIndex.insert(elemId, computeElementBounds(element));
    }
    // Mark ALL elements dirty
    this.dirtyElements.clear();
    for (const elemId of this.elements.keys()) {
      this.dirtyElements.add(elemId);
    }
  }

  getSnapshot(id: string): SceneSnapshot | undefined {
    return this.snapshots.get(id);
  }

  listSnapshots(): SceneSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  deleteSnapshot(id: string): void {
    this.snapshots.delete(id);
  }

  // ── Spatial Queries (public wrappers) ───────────────────

  queryPoint(point: Vector2): SceneElement[] {
    const ids = this.spatialIndex.queryPoint(point);
    return ids
      .map((id) => this.elements.get(id))
      .filter((e): e is SceneElement => e !== undefined);
  }

  queryRegion(rect: Bounds): SceneElement[] {
    const ids = this.spatialIndex.queryRegion(rect);
    return ids
      .map((id) => this.elements.get(id))
      .filter((e): e is SceneElement => e !== undefined);
  }

  // ── Private helpers ─────────────────────────────────────

  private cloneElements(): Map<string, SceneElement> {
    const cloned = new Map<string, SceneElement>();
    for (const [id, element] of this.elements) {
      cloned.set(id, structuredClone(element));
    }
    return cloned;
  }

  private cloneElementsFrom(source: Map<string, SceneElement>): Map<string, SceneElement> {
    const cloned = new Map<string, SceneElement>();
    for (const [id, element] of source) {
      cloned.set(id, structuredClone(element));
    }
    return cloned;
  }

  private cloneParameters(): Map<string, Parameter> {
    const cloned = new Map<string, Parameter>();
    for (const [name, param] of this.parameters) {
      cloned.set(name, structuredClone(param));
    }
    return cloned;
  }
}
