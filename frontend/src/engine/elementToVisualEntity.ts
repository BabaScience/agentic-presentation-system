/* ═══════════════════════════════════════════════════════════════
   elementToVisualEntity — Pure adapter: SceneElement → VisualEntity
   Converts engine elements (pixel coordinates, typed properties)
   into the VisualEntity shape that FrameRenderer understands.
   Engine owns all motion — CSS animations are disabled here.
   ═══════════════════════════════════════════════════════════════ */

import type { SceneElement, VisualEntity, VisualEntityType } from '@shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@shared/constants';

export function elementToVisualEntity(element: SceneElement): VisualEntity {
  const props = element.properties;

  // Strip sceneId: prefix — VisualScriptCompiler uses "sceneId:entityId" format.
  const colonIdx = element.id.indexOf(':');
  const entityId = colonIdx !== -1 ? element.id.slice(colonIdx + 1) : element.id;

  // visualEntityType is stored by VisualScriptCompiler (e.g. 'Pod', 'Server')
  const type = (props['visualEntityType'] as VisualEntityType) ?? 'Entity';

  // Convert pixel position to percentage for FrameRenderer
  const position = {
    x: (element.position.x / CANVAS_WIDTH) * 100,
    y: (element.position.y / CANVAS_HEIGHT) * 100,
  };

  const width = typeof props['width'] === 'number' ? props['width'] : 100;
  const height = typeof props['height'] === 'number' ? props['height'] : 100;

  const itemCount = typeof props['itemCount'] === 'number' ? props['itemCount'] : undefined;
  return {
    id: entityId,
    type,
    position,
    size: { width, height },
    label: typeof props['label'] === 'string' ? props['label'] : undefined,
    color: typeof props['color'] === 'string' ? props['color'] : undefined,
    textContent: Array.isArray(props['textContent'])
      ? (props['textContent'] as string[])
      : undefined,
    codeLanguage:
      typeof props['codeLanguage'] === 'string' ? props['codeLanguage'] : undefined,
    sourceEntityId:
      typeof props['sourceEntityId'] === 'string' ? props['sourceEntityId'] : undefined,
    targetEntityId:
      typeof props['targetEntityId'] === 'string' ? props['targetEntityId'] : undefined,
    // Engine owns all motion — set animation to 'none' so FrameRenderer
    // does not apply CSS entry animations. Spring/linear transitions are
    // driven by the engine tick loop, not CSS.
    animation: { type: 'none', duration: 0, delay: 0 },
    // Parameter-driven properties for reactive controls (e.g. pod_count → itemCount)
    ...(itemCount != null && { metadata: { itemCount } }),
  };
}

export function elementsToVisualEntities(map: Map<string, SceneElement>): VisualEntity[] {
  const entities: VisualEntity[] = [];
  for (const element of map.values()) {
    if (!element.visible) continue; // Engine hides elements via visible flag
    entities.push(elementToVisualEntity(element));
  }
  return entities;
}
