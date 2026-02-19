import { describe, it, expect } from 'vitest';
import { SceneGraph } from '../SceneGraph';
import {
  CHECKPOINT_RESTORE_MS,
  PARAMETER_PROPAGATION_MS,
} from '@shared/constants';

describe('SceneGraph', () => {
  // ── Test 1: Dirty tracking ──────────────────────────────
  it('marks only updated elements dirty', () => {
    const sg = new SceneGraph();
    // Create 100 elements
    for (let i = 0; i < 100; i++) {
      sg.createElement({
        id: `el_${i}`,
        type: 'box',
        position: { x: i * 10, y: i * 10 },
        properties: { width: 50, height: 50 },
      });
    }
    // Clear dirty from creation
    sg.clearDirty();

    // Update 3 specific elements
    sg.updateElement('el_5', { opacity: 0.5 });
    sg.updateElement('el_42', { opacity: 0.8 });
    sg.updateElement('el_99', { visible: false });

    const dirty = sg.getDirtyElements();
    expect(dirty.size).toBe(3);
    expect(dirty.has('el_5')).toBe(true);
    expect(dirty.has('el_42')).toBe(true);
    expect(dirty.has('el_99')).toBe(true);
  });

  // ── Test 2: Parameter propagation < 16ms ────────────────
  it(`propagates 50 parameter bindings in <${PARAMETER_PROPAGATION_MS}ms`, () => {
    const sg = new SceneGraph();
    sg.defineParameter('count', {
      type: 'integer',
      value: 1,
      default: 1,
    });

    // Create 50 elements and bind them
    for (let i = 0; i < 50; i++) {
      sg.createElement({
        id: `bound_${i}`,
        type: 'box',
        position: { x: i * 20, y: 0 },
        properties: { width: 50, height: 50 },
      });
      sg.bindElementToParameter(`bound_${i}`, 'count', (value) => ({
        opacity: (value as number) / 10,
      }));
    }
    sg.clearDirty();

    const start = performance.now();
    sg.setParameter('count', 5);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(PARAMETER_PROPAGATION_MS);
    expect(sg.getDirtyElements().size).toBe(50);
  });

  // ── Test 3: Snapshot isolation (deep clone) ─────────────
  it('creates isolated snapshots that survive mutation', () => {
    const sg = new SceneGraph();
    sg.createElement({
      id: 'iso_el',
      type: 'text',
      position: { x: 100, y: 200 },
      properties: { width: 80, height: 40, label: 'original' },
    });

    const snapshot = sg.createSnapshot('before_mutation');

    // Mutate after snapshot
    sg.updateElement('iso_el', { position: { x: 999, y: 999 } });
    const element = sg.getElementById('iso_el')!;
    element.properties['label'] = 'mutated';

    // Snapshot elements must be unchanged
    const snappedElement = snapshot.elements.get('iso_el')!;
    expect(snappedElement.position.x).toBe(100);
    expect(snappedElement.position.y).toBe(200);
    expect(snappedElement.properties['label']).toBe('original');
  });

  // ── Test 4: Snapshot restore speed < 100ms ──────────────
  it(`restores snapshot of 200 elements in <${CHECKPOINT_RESTORE_MS}ms`, () => {
    const sg = new SceneGraph();
    for (let i = 0; i < 200; i++) {
      sg.createElement({
        id: `restore_${i}`,
        type: 'box',
        position: { x: i * 5, y: i * 5 },
        properties: { width: 30, height: 30 },
      });
    }
    const snapshot = sg.createSnapshot('big_snapshot');

    // Mutate everything
    for (let i = 0; i < 200; i++) {
      sg.updateElement(`restore_${i}`, { opacity: 0 });
    }
    sg.clearDirty();

    const start = performance.now();
    sg.restoreSnapshot(snapshot.id);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(CHECKPOINT_RESTORE_MS);

    // Verify state was restored
    const el = sg.getElementById('restore_0')!;
    expect(el.opacity).toBe(1);
    expect(sg.getDirtyElements().size).toBe(200);
  });

  // ── Test 5: Spatial index queryPoint ────────────────────
  it('returns correct elements for point queries', () => {
    const sg = new SceneGraph();
    sg.createElement({
      id: 'hit',
      type: 'box',
      position: { x: 50, y: 50 },
      properties: { width: 100, height: 100 },
    });
    sg.createElement({
      id: 'miss',
      type: 'box',
      position: { x: 500, y: 500 },
      properties: { width: 100, height: 100 },
    });

    // Point inside 'hit' bounds (50..150, 50..150)
    const hits = sg.queryPoint({ x: 75, y: 75 });
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('hit');

    // Point inside 'miss' bounds
    const missHits = sg.queryPoint({ x: 550, y: 550 });
    expect(missHits.length).toBe(1);
    expect(missHits[0].id).toBe('miss');

    // Point in empty space
    const empty = sg.queryPoint({ x: 300, y: 300 });
    expect(empty.length).toBe(0);
  });

  // ── Test 6: Parameter unbind ────────────────────────────
  it('stops marking element dirty after unbind', () => {
    const sg = new SceneGraph();
    sg.createElement({
      id: 'unbind_el',
      type: 'circle',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });
    sg.defineParameter('speed', {
      type: 'float',
      value: 1.0,
      default: 1.0,
    });

    const handle = sg.bindElementToParameter('unbind_el', 'speed', (v) => ({
      opacity: (v as number) / 10,
    }));

    // Verify binding works
    sg.clearDirty();
    sg.setParameter('speed', 5.0);
    expect(sg.getDirtyElements().has('unbind_el')).toBe(true);

    // Unbind and verify
    handle.unbind();
    sg.clearDirty();
    sg.setParameter('speed', 8.0);
    expect(sg.getDirtyElements().has('unbind_el')).toBe(false);
  });

  // ── Test 7: Viewport partial update ─────────────────────
  it('applies partial viewport updates without overwriting other fields', () => {
    const sg = new SceneGraph();

    // Default viewport
    expect(sg.getViewport()).toEqual({ x: 0, y: 0, zoom: 1, rotation: 0 });

    // Partial update: only zoom
    sg.setViewport({ zoom: 2.0 });
    const vp = sg.getViewport();
    expect(vp.zoom).toBe(2.0);
    expect(vp.x).toBe(0);
    expect(vp.y).toBe(0);
    expect(vp.rotation).toBe(0);

    // Another partial: position only
    sg.setViewport({ x: 100, y: 200 });
    const vp2 = sg.getViewport();
    expect(vp2.x).toBe(100);
    expect(vp2.y).toBe(200);
    expect(vp2.zoom).toBe(2.0); // still 2.0 from before
    expect(vp2.rotation).toBe(0);
  });

  // ── Test 8: Name-based snapshot restore ──────────────────
  it('restores snapshots by checkpoint name', () => {
    const sg = new SceneGraph();
    sg.createElement({
      id: 'named_el',
      type: 'box',
      position: { x: 10, y: 20 },
      properties: { width: 50, height: 50 },
    });

    sg.createSnapshot('my-checkpoint');

    // Mutate
    sg.updateElement('named_el', { position: { x: 999, y: 999 } });
    expect(sg.getElementById('named_el')!.position.x).toBe(999);

    // Restore by NAME (not by internal ID)
    sg.restoreSnapshot('my-checkpoint');
    const restored = sg.getElementById('named_el')!;
    expect(restored.position.x).toBe(10);
    expect(restored.position.y).toBe(20);
  });

  // ── Test 9: getSnapshot returns null for non-existent ────
  it('returns null for non-existent snapshot', () => {
    const sg = new SceneGraph();
    expect(sg.getSnapshot('does-not-exist')).toBeNull();
  });

  // ── Test 10: getElementById returns null for missing id ──
  it('returns null for non-existent element', () => {
    const sg = new SceneGraph();
    expect(sg.getElementById('ghost')).toBeNull();
  });

  // ── Test 11: deleteSnapshot by name ──────────────────────
  it('deletes snapshot by checkpoint name', () => {
    const sg = new SceneGraph();
    sg.createElement({
      id: 'del_el',
      type: 'box',
      position: { x: 0, y: 0 },
      properties: { width: 50, height: 50 },
    });
    sg.createSnapshot('to-delete');
    expect(sg.getSnapshot('to-delete')).not.toBeNull();

    sg.deleteSnapshot('to-delete');
    expect(sg.getSnapshot('to-delete')).toBeNull();
  });
});
