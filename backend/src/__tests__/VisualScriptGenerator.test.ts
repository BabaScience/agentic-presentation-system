/* ═══════════════════════════════════════════════════════════════
   Tests for VisualScriptGenerator — entity creation, fallback path,
   position mapping, segment-to-frame conversion
   ═══════════════════════════════════════════════════════════════ */

import { VisualScriptGenerator } from '../services/VisualScriptGenerator';
import { DataType } from '../../shared/types';

// Access private methods via cast
const gen = new (VisualScriptGenerator as any)();

describe('createEntity', () => {
  it('should create entity with all attributes', () => {
    const entity = gen.createEntity(
      'Server',
      'API Server',
      { x: 50, y: 35 },
      '#00e5ff',
      1.2,
      { type: 'scaleIn', delay: 200 },
    );
    expect(entity.type).toBe('Server');
    expect(entity.label).toBe('API Server');
    expect(entity.position).toEqual({ x: 50, y: 35 });
    expect(entity.color).toBe('#00e5ff');
    expect(entity.animation.type).toBe('scaleIn');
    expect(entity.animation.delay).toBe(200);
    expect(entity.animation.duration).toBe(500);
    // Size should be scaled by 1.2
    expect(entity.size.width).toBe(Math.round(120 * 1.2));
    expect(entity.size.height).toBe(Math.round(100 * 1.2));
    expect(entity.id).toMatch(/^entity-/);
  });

  it('should clamp position to canvas bounds (5-95)', () => {
    const entity = gen.createEntity('User', 'U', { x: -10, y: 200 });
    expect(entity.position.x).toBe(5);
    expect(entity.position.y).toBe(95);
  });

  it('should clamp size scale to 0.3-2.0', () => {
    const small = gen.createEntity('User', 'U', { x: 50, y: 50 }, undefined, 0.1);
    expect(small.size.width).toBe(Math.round(80 * 0.3));

    const large = gen.createEntity('User', 'U', { x: 50, y: 50 }, undefined, 5.0);
    expect(large.size.width).toBe(Math.round(80 * 2.0));
  });

  it('should default animation to fadeIn with delay 0', () => {
    const entity = gen.createEntity('Server', 'S', { x: 50, y: 50 });
    expect(entity.animation.type).toBe('fadeIn');
    expect(entity.animation.delay).toBe(0);
  });

  it('should reject invalid animation types and default to fadeIn', () => {
    const entity = gen.createEntity(
      'Server', 'S', { x: 50, y: 50 },
      undefined, undefined, { type: 'invalidAnim', delay: 100 },
    );
    expect(entity.animation.type).toBe('fadeIn');
  });

  it('should accept all valid animation types', () => {
    const validTypes = ['fadeIn', 'slideIn', 'scaleIn', 'pulse', 'flow', 'dashFlow', 'none'];
    for (const animType of validTypes) {
      const entity = gen.createEntity(
        'Server', 'S', { x: 50, y: 50 },
        undefined, undefined, { type: animType, delay: 0 },
      );
      expect(entity.animation.type).toBe(animType);
    }
  });

  it('should set connection fields from extra', () => {
    const entity = gen.createEntity(
      'Arrow', 'request', { x: 50, y: 50 },
      '#ffffff40', 0.8, { type: 'flow', delay: 400 },
      { from: 'User', to: 'API Server' },
    );
    expect(entity.sourceEntityId).toBe('User');
    expect(entity.targetEntityId).toBe('API Server');
  });

  it('should set parentEntityId from extra', () => {
    const entity = gen.createEntity(
      'Container', 'nginx', { x: 50, y: 50 },
      undefined, undefined, undefined,
      { parent: 'Pod' },
    );
    expect(entity.parentEntityId).toBe('Pod');
  });

  it('should set textContent and codeLanguage from extra', () => {
    const entity = gen.createEntity(
      'Label', 'Code', { x: 50, y: 50 },
      undefined, undefined, undefined,
      { textContent: ['line 1', 'line 2'], codeLanguage: 'python' },
    );
    expect(entity.textContent).toEqual(['line 1', 'line 2']);
    expect(entity.codeLanguage).toBe('python');
  });

  it('should use default size for unknown type', () => {
    const entity = gen.createEntity('UnknownType' as any, 'X', { x: 50, y: 50 });
    expect(entity.size.width).toBe(100);
    expect(entity.size.height).toBe(80);
  });
});

describe('getPositionCoordinates', () => {
  it('should return base position for known keywords', () => {
    const left = gen.getPositionCoordinates('left', 0, 0);
    expect(left.x).toBeCloseTo(17.5, 0); // 20 + (0*5 - 2.5)
    expect(left.y).toBeCloseTo(48.5, 0); // 50 + (0*3 - 1.5)

    const center = gen.getPositionCoordinates('center', 0, 0);
    expect(center.x).toBeCloseTo(47.5, 0);

    const right = gen.getPositionCoordinates('right', 0, 0);
    expect(right.x).toBeCloseTo(77.5, 0);
  });

  it('should add entity index offset', () => {
    const pos0 = gen.getPositionCoordinates('center', 0, 0);
    const pos1 = gen.getPositionCoordinates('center', 0, 1);
    const pos2 = gen.getPositionCoordinates('center', 0, 2);
    // Each entity index adds 5 to x
    expect(pos1.x - pos0.x).toBeCloseTo(5, 0);
    expect(pos2.x - pos1.x).toBeCloseTo(5, 0);
  });

  it('should add segment index offset', () => {
    const seg0 = gen.getPositionCoordinates('center', 0, 0);
    const seg1 = gen.getPositionCoordinates('center', 1, 0);
    // Each segment index adds 3 to y
    expect(seg1.y - seg0.y).toBeCloseTo(3, 0);
  });

  it('should clamp to 10-90 bounds', () => {
    const pos = gen.getPositionCoordinates('right', 0, 10);
    expect(pos.x).toBeLessThanOrEqual(90);
    expect(pos.x).toBeGreaterThanOrEqual(10);
  });

  it('should default to center for unknown keyword', () => {
    const pos = gen.getPositionCoordinates('unknown', 0, 0);
    expect(pos.x).toBeCloseTo(47.5, 0);
    expect(pos.y).toBeCloseTo(48.5, 0);
  });
});

describe('inferEntitiesFromText', () => {
  it('should detect User from text', () => {
    const entities = gen.inferEntitiesFromText('The user sends a request', DataType.CONCEPT, 0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('User');
  });

  it('should detect Server from text', () => {
    const entities = gen.inferEntitiesFromText('The API server processes it', DataType.CONCEPT, 0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('Server');
  });

  it('should detect Database from text', () => {
    const entities = gen.inferEntitiesFromText('Data is stored in the database', DataType.CONCEPT, 0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('Database');
  });

  it('should detect multiple entities', () => {
    const entities = gen.inferEntitiesFromText(
      'The user sends a request to the server which queries the database',
      DataType.CONCEPT, 0,
    );
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('User');
    expect(types).toContain('Server');
    expect(types).toContain('Database');
  });

  it('should add Arrow when action words + existing entities', () => {
    const entities = gen.inferEntitiesFromText(
      'The user sends a request',
      DataType.CONCEPT, 0,
    );
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('Arrow');
  });

  it('should detect Cloud entity', () => {
    const entities = gen.inferEntitiesFromText('Deploy to AWS cloud', DataType.CONCEPT, 0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('Cloud');
  });

  it('should detect Pod entity', () => {
    const entities = gen.inferEntitiesFromText('Kubernetes pod manages containers', DataType.CONCEPT, 0);
    const types = entities.map((e: any) => e.type);
    expect(types).toContain('Pod');
  });

  it('should assign colors to pattern-matched entities', () => {
    const entities = gen.inferEntitiesFromText('The user clicks', DataType.CONCEPT, 0);
    const userEntity = entities.find((e: any) => e.type === 'User');
    expect(userEntity?.color).toBe('#ffffff');
  });

  it('should fall back to data type default when no patterns match', () => {
    const entities = gen.inferEntitiesFromText('abstract concepts', DataType.ANALOGY, 0);
    expect(entities.length).toBe(1);
    expect(entities[0].type).toBe('Comparison');
    expect(entities[0].color).toBe('#ffab00');
  });
});

describe('getDefaultEntityForDataType', () => {
  it('should return Process for PROCESS data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.PROCESS, 0);
    expect(entity.type).toBe('Process');
    expect(entity.color).toBe('#00bcd4');
  });

  it('should return Concept for CONCEPT data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.CONCEPT, 0);
    expect(entity.type).toBe('Concept');
    expect(entity.color).toBe('#00e5ff');
  });

  it('should return Comparison for ANALOGY data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.ANALOGY, 0);
    expect(entity.type).toBe('Comparison');
    expect(entity.color).toBe('#ffab00');
  });

  it('should return Quote for DEFINITION data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.DEFINITION, 0);
    expect(entity.type).toBe('Quote');
    expect(entity.color).toBe('#b388ff');
  });

  it('should return Comparison for COUNTERPOINT data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.COUNTERPOINT, 0);
    expect(entity.type).toBe('Comparison');
    expect(entity.color).toBe('#ff6b9d');
  });

  it('should return Badge for RESOURCE data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.RESOURCE, 0);
    expect(entity.type).toBe('Badge');
    expect(entity.color).toBe('#4caf50');
  });

  it('should return Entity for EXAMPLE data type', () => {
    const entity = gen.getDefaultEntityForDataType(DataType.EXAMPLE, 0);
    expect(entity.type).toBe('Entity');
    expect(entity.color).toBe('#00e676');
  });

  it('should cycle x positions based on index', () => {
    const e0 = gen.getDefaultEntityForDataType(DataType.PROCESS, 0);
    const e1 = gen.getDefaultEntityForDataType(DataType.PROCESS, 1);
    const e2 = gen.getDefaultEntityForDataType(DataType.PROCESS, 2);
    const e3 = gen.getDefaultEntityForDataType(DataType.PROCESS, 3);
    expect(e0.position.x).toBe(30);
    expect(e1.position.x).toBe(50);
    expect(e2.position.x).toBe(70);
    expect(e3.position.x).toBe(30); // wraps
  });

  it('should stagger animation delay based on index', () => {
    const e0 = gen.getDefaultEntityForDataType(DataType.PROCESS, 0);
    const e2 = gen.getDefaultEntityForDataType(DataType.PROCESS, 2);
    expect(e0.animation.delay).toBe(0);
    expect(e2.animation.delay).toBe(400);
  });
});

describe('generateFallbackSegments', () => {
  it('should create segments from narration text', () => {
    const narration = Array(30).fill('word').join(' '); // 30 words
    const segments = gen.generateFallbackSegments(narration, DataType.CONCEPT, 10000);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments.length).toBeLessThanOrEqual(4);
  });

  it('should cover full duration', () => {
    const narration = Array(30).fill('word').join(' ');
    const segments = gen.generateFallbackSegments(narration, DataType.CONCEPT, 10000);
    expect(segments[0].startTime).toBe(0);
    expect(segments[segments.length - 1].endTime).toBeCloseTo(10000, -1);
  });

  it('should include entities in each segment', () => {
    const narration = 'The user connects to the server and queries the database';
    const segments = gen.generateFallbackSegments(narration, DataType.CONCEPT, 5000);
    for (const seg of segments) {
      expect(seg.entities.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should cap at 4 segments', () => {
    const narration = Array(100).fill('word').join(' ');
    const segments = gen.generateFallbackSegments(narration, DataType.CONCEPT, 30000);
    expect(segments.length).toBeLessThanOrEqual(4);
  });

  it('should create single segment for short text', () => {
    const narration = 'Hello world';
    const segments = gen.generateFallbackSegments(narration, DataType.CONCEPT, 3000);
    expect(segments.length).toBe(1);
    expect(segments[0].startTime).toBe(0);
    expect(segments[0].endTime).toBe(3000);
  });
});

describe('segmentsToFrames', () => {
  it('should convert segments to frames', () => {
    const segments = [
      {
        text: 'First segment',
        startTime: 0,
        endTime: 3000,
        entities: [
          { type: 'Server', label: 'API', position: { x: 50, y: 50 }, color: '#00e5ff' },
        ],
        description: 'First',
      },
      {
        text: 'Second segment',
        startTime: 3000,
        endTime: 6000,
        entities: [
          { type: 'Database', label: 'DB', position: { x: 70, y: 50 } },
        ],
        description: 'Second',
      },
    ];

    const frames = gen.segmentsToFrames(segments, 6000);
    expect(frames.length).toBe(2);
    expect(frames[0].startTime).toBe(0);
    expect(frames[0].endTime).toBe(3000);
    expect(frames[0].entities.length).toBe(1);
    expect(frames[0].entities[0].type).toBe('Server');
    expect(frames[0].entities[0].color).toBe('#00e5ff');
    expect(frames[1].entities[0].type).toBe('Database');
  });

  it('should reuse entities with the same type+label across frames', () => {
    const segments = [
      {
        text: 'First',
        startTime: 0,
        endTime: 3000,
        entities: [{ type: 'Server', label: 'API', position: { x: 50, y: 50 } }],
        description: '',
      },
      {
        text: 'Second',
        startTime: 3000,
        endTime: 6000,
        entities: [{ type: 'Server', label: 'API', position: { x: 70, y: 50 } }],
        description: '',
      },
    ];

    const frames = gen.segmentsToFrames(segments, 6000);
    // Same entity should be reused (same id)
    expect(frames[0].entities[0].id).toBe(frames[1].entities[0].id);
  });

  it('should pass through connection fields', () => {
    const segments = [
      {
        text: 'Connection',
        startTime: 0,
        endTime: 3000,
        entities: [
          { type: 'Server', label: 'API', position: { x: 30, y: 50 } },
          { type: 'Database', label: 'DB', position: { x: 70, y: 50 } },
          { type: 'Arrow', label: 'query', position: { x: 50, y: 50 }, from: 'API', to: 'DB' },
        ],
        description: '',
      },
    ];

    const frames = gen.segmentsToFrames(segments, 3000);
    const arrow = frames[0].entities.find((e: any) => e.type === 'Arrow');
    expect(arrow.sourceEntityId).toBe('API');
    expect(arrow.targetEntityId).toBe('DB');
  });

  it('should generate unique frame IDs', () => {
    const segments = [
      { text: 'A', startTime: 0, endTime: 1000, entities: [], description: '' },
      { text: 'B', startTime: 1000, endTime: 2000, entities: [], description: '' },
    ];
    const frames = gen.segmentsToFrames(segments, 2000);
    expect(frames[0].id).not.toBe(frames[1].id);
    expect(frames[0].id).toMatch(/^frame-/);
  });
});

describe('getLayoutInstructions', () => {
  it('should return instructions for known patterns', () => {
    const patterns = ['flow-lr', 'flow-tb', 'hierarchical', 'circular', 'central-radial', 'comparison', 'layered', 'timeline'];
    for (const pattern of patterns) {
      const instructions = gen.getLayoutInstructions(pattern);
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(20);
    }
  });

  it('should return fallback for unknown pattern', () => {
    const instructions = gen.getLayoutInstructions('unknown-pattern');
    expect(instructions).toContain('unknown-pattern');
  });
});

describe('repairTruncatedJSON', () => {
  it('should recover complete segments from truncated JSON', () => {
    const truncated = `[
      {"text": "first", "timeRangePercent": [0, 33], "entities": [], "description": "A"},
      {"text": "second", "timeRangePercent": [33, 66], "entities": [], "description": "B"},
      {"text": "third is trun`;
    const result = gen.repairTruncatedJSON(truncated);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('first');
    expect(result[1].text).toBe('second');
  });

  it('should recover segments with nested objects (entities)', () => {
    const truncated = `[
      {"text": "seg1", "entities": [{"type": "Server", "label": "API", "position": {"x": 50, "y": 35}}], "description": "ok"},
      {"text": "seg2", "entities": [{"type": "Data`;
    const result = gen.repairTruncatedJSON(truncated);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('seg1');
    expect(result[0].entities[0].type).toBe('Server');
  });

  it('should return empty array if no complete segment found', () => {
    const truncated = `[{"text": "trun`;
    const result = gen.repairTruncatedJSON(truncated);
    expect(result).toEqual([]);
  });

  it('should handle already-valid JSON', () => {
    const valid = `[{"text": "ok", "entities": [], "description": "d"}]`;
    const result = gen.repairTruncatedJSON(valid);
    expect(result.length).toBe(1);
  });

  it('should handle strings containing braces', () => {
    const truncated = `[
      {"text": "this has { braces } in text", "entities": [], "description": "ok"},
      {"text": "incomp`;
    const result = gen.repairTruncatedJSON(truncated);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('this has { braces } in text');
  });
});
