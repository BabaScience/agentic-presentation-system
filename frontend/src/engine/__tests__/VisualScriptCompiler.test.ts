import { describe, it, expect } from 'vitest';
import {
  compileVisualScript,
  compileVisualCommands,
  compilePresentationScene,
  compileStoryboardScene,
  VISUAL_ENTITY_TO_STAGE_ELEMENT,
} from '../VisualScriptCompiler';
import type {
  VisualScript,
  VisualEntity,
  VisualCommand,
  VisualEntityType,
  StageElementType,
  PresentationScene,
  WordTimestamp,
  StoryboardScene,
  Storyboard,
} from '@shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@shared/constants';

// ── Helpers ──────────────────────────────────────────────────

function makeEntity(overrides: Partial<VisualEntity> & { id: string; type: VisualEntityType }): VisualEntity {
  return {
    position: { x: 50, y: 50 },
    size: { width: 100, height: 60 },
    animation: { type: 'fadeIn', duration: 300, delay: 0 },
    ...overrides,
  };
}

function makeScript(frames: VisualScript['frames'], sceneId = 'test-scene'): VisualScript {
  return {
    sceneId,
    frames,
    totalDuration: frames.length > 0 ? frames[frames.length - 1].endTime : 0,
    entities: {},
  };
}

describe('VisualScriptCompiler', () => {
  // ── Test 1: Single-frame → createElement + fadeIn with correct pixel positions ──
  it('single-frame script produces createElement + fadeIn with correct pixel positions', () => {
    const entity = makeEntity({ id: 'server1', type: 'Server', position: { x: 25, y: 50 } });
    const script = makeScript([
      {
        id: 'f1',
        startTime: 0,
        endTime: 3000,
        entities: [entity],
        narrationSegment: 'A server appears',
        description: 'Server intro',
      },
    ]);

    const cmds = compileVisualScript(script, 'scene1');

    // Should have createElement + fadeIn
    const createCmd = cmds.find((c) => c.method === 'createElement');
    expect(createCmd).toBeDefined();
    expect(createCmd!.args['id']).toBe('scene1:server1');
    expect(createCmd!.args['type']).toBe('box'); // Server → box

    const pos = createCmd!.args['position'] as { x: number; y: number };
    expect(pos.x).toBeCloseTo((25 / 100) * CANVAS_WIDTH);
    expect(pos.y).toBeCloseTo((50 / 100) * CANVAS_HEIGHT);

    const fadeCmd = cmds.find((c) => c.method === 'fadeIn');
    expect(fadeCmd).toBeDefined();
    expect(fadeCmd!.timing).toBe('await-previous');
  });

  // ── Test 2: Multi-frame: entity appearing in frame 2 ──────
  it('entity appearing in frame 2 gets createElement at frame 2 startTime', () => {
    const entity1 = makeEntity({ id: 'e1', type: 'Pod' });
    const entity2 = makeEntity({ id: 'e2', type: 'Container' });

    const script = makeScript([
      {
        id: 'f1',
        startTime: 0,
        endTime: 2000,
        entities: [entity1],
        narrationSegment: 'First frame',
        description: '',
      },
      {
        id: 'f2',
        startTime: 2000,
        endTime: 4000,
        entities: [entity1, entity2],
        narrationSegment: 'Second frame',
        description: '',
      },
    ]);

    const cmds = compileVisualScript(script, 's');

    // entity2 createElement should be timed at 2000 (frame 2 startTime)
    const createE2 = cmds.find(
      (c) => c.method === 'createElement' && (c.args['id'] as string).includes('e2'),
    );
    expect(createE2).toBeDefined();
    expect(createE2!.timing).toBe(2000);
  });

  // ── Test 3: Entity movement between frames → moveTo ───────
  it('entity movement between frames produces moveTo command', () => {
    const e1_f1 = makeEntity({ id: 'mover', type: 'Concept', position: { x: 10, y: 10 } });
    const e1_f2 = makeEntity({ id: 'mover', type: 'Concept', position: { x: 80, y: 60 } });

    const script = makeScript([
      {
        id: 'f1',
        startTime: 0,
        endTime: 2000,
        entities: [e1_f1],
        narrationSegment: '',
        description: '',
      },
      {
        id: 'f2',
        startTime: 2000,
        endTime: 4000,
        entities: [e1_f2],
        narrationSegment: '',
        description: '',
      },
    ]);

    const cmds = compileVisualScript(script, 's');

    const moveCmd = cmds.find((c) => c.method === 'moveTo');
    expect(moveCmd).toBeDefined();
    expect(moveCmd!.timing).toBe(2000);

    const targetPos = moveCmd!.args['position'] as { x: number; y: number };
    expect(targetPos.x).toBeCloseTo((80 / 100) * CANVAS_WIDTH);
    expect(targetPos.y).toBeCloseTo((60 / 100) * CANVAS_HEIGHT);
  });

  // ── Test 4: Entity removed between frames → fadeOut + destroyElement ──
  it('entity removed between frames produces fadeOut + destroyElement', () => {
    const e1 = makeEntity({ id: 'ephemeral', type: 'Label' });

    const script = makeScript([
      {
        id: 'f1',
        startTime: 0,
        endTime: 2000,
        entities: [e1],
        narrationSegment: '',
        description: '',
      },
      {
        id: 'f2',
        startTime: 2000,
        endTime: 4000,
        entities: [], // entity removed
        narrationSegment: '',
        description: '',
      },
    ]);

    const cmds = compileVisualScript(script, 's');

    const fadeOutCmd = cmds.find(
      (c) => c.method === 'fadeOut' && (c.args['id'] as string).includes('ephemeral'),
    );
    expect(fadeOutCmd).toBeDefined();
    expect(fadeOutCmd!.timing).toBe(2000);

    const destroyCmd = cmds.find(
      (c) => c.method === 'destroyElement' && (c.args['id'] as string).includes('ephemeral'),
    );
    expect(destroyCmd).toBeDefined();
    expect(destroyCmd!.timing).toBe('await-previous');
  });

  // ── Test 5: Highlight state change → highlight command ────
  it('highlight state change produces highlight command', () => {
    const e1_normal = makeEntity({ id: 'h1', type: 'Pod', highlight: false });
    const e1_highlighted = makeEntity({ id: 'h1', type: 'Pod', highlight: true });

    const script = makeScript([
      {
        id: 'f1',
        startTime: 0,
        endTime: 2000,
        entities: [e1_normal],
        narrationSegment: '',
        description: '',
      },
      {
        id: 'f2',
        startTime: 2000,
        endTime: 4000,
        entities: [e1_highlighted],
        narrationSegment: '',
        description: '',
      },
    ]);

    const cmds = compileVisualScript(script, 's');

    const highlightCmd = cmds.find((c) => c.method === 'highlight');
    expect(highlightCmd).toBeDefined();
    expect(highlightCmd!.timing).toBe(2000);
    expect(highlightCmd!.args['elementId']).toBe('s:h1');
  });

  // ── Test 6: All VisualEntityType values map to valid StageElementType ──
  it('all VisualEntityType values map to valid StageElementType', () => {
    const validStageTypes: StageElementType[] = [
      'box', 'circle', 'arrow', 'text', 'code', 'diagram', 'label', 'connection', 'group',
    ];

    for (const [entityType, stageType] of Object.entries(VISUAL_ENTITY_TO_STAGE_ELEMENT)) {
      expect(
        validStageTypes.includes(stageType),
        `${entityType} maps to "${stageType}" which is not a valid StageElementType`,
      ).toBe(true);
    }
  });

  // ── Test 7: compileVisualCommands: reveal with wordTrigger → SyncMarker ──
  it('compileVisualCommands: reveal with wordTrigger becomes SyncMarker', () => {
    const commands: VisualCommand[] = [
      { type: 'reveal', targetId: 'node1', wordTrigger: 5 },
    ];

    const { agentCommands, syncMarkers } = compileVisualCommands(commands);

    expect(agentCommands.length).toBe(0);
    expect(syncMarkers.length).toBe(1);
    expect(syncMarkers[0].wordIndex).toBe(5);
    expect(syncMarkers[0].command.method).toBe('showElement');
  });

  // ── Test 8: compileVisualCommands: zoom → zoomTo with correct level ──
  it('compileVisualCommands: zoom → zoomTo with correct level', () => {
    const commands: VisualCommand[] = [
      { type: 'zoom', targetId: '', params: { level: 2.5 } },
    ];

    const { agentCommands } = compileVisualCommands(commands);

    expect(agentCommands.length).toBe(1);
    expect(agentCommands[0].method).toBe('zoomTo');
    expect(agentCommands[0].args['level']).toBe(2.5);
  });

  // ── Test 9: compileVisualCommands: connect → drawConnection ──
  it('compileVisualCommands: connect → drawConnection', () => {
    const commands: VisualCommand[] = [
      { type: 'connect', targetId: 'nodeA', params: { toId: 'nodeB' } },
    ];

    const { agentCommands } = compileVisualCommands(commands);

    expect(agentCommands.length).toBe(1);
    expect(agentCommands[0].method).toBe('drawConnection');
    expect(agentCommands[0].args['fromElementId']).toBe('nodeA');
    expect(agentCommands[0].args['toElementId']).toBe('nodeB');
  });

  // ── Test 10: compilePresentationScene produces valid StoryboardScene ──
  it('compilePresentationScene produces valid StoryboardScene with viewport commands', () => {
    const scene: PresentationScene = {
      id: 'scene-1',
      nodeIds: ['n1'],
      edgeIds: [],
      narration: 'Hello world',
      focusNodeId: 'n1',
      viewport: { x: 100, y: 200, zoom: 1.5 },
      visualCommands: [
        { type: 'reveal', targetId: 'n1' },
      ],
      durationEstimate: 10,
    };

    const result = compilePresentationScene(scene);

    expect(result.id).toBe('scene-1');
    expect(result.narration).toBe('Hello world');
    expect(result.estimatedDurationSeconds).toBe(10);
    const vp = result.viewport as { x: number; y: number; zoom: number; rotation?: number };
    expect(vp.x).toBe(100);
    expect(vp.y).toBe(200);
    expect(vp.zoom).toBe(1.5);
    expect(vp.rotation ?? 0).toBe(0);

    // Should start with panTo and zoomTo at t=0
    const panCmd = result.agentCommands.find((c) => c.method === 'panTo');
    expect(panCmd).toBeDefined();
    expect(panCmd!.timing).toBe(0);

    const zoomCmd = result.agentCommands.find((c) => c.method === 'zoomTo');
    expect(zoomCmd).toBeDefined();
    expect(zoomCmd!.timing).toBe(0);

    // Should include the reveal command
    const showCmd = result.agentCommands.find((c) => c.method === 'showElement');
    expect(showCmd).toBeDefined();
  });

  // ── Test 11: compilePresentationScene preserves sync markers ──
  it('compilePresentationScene surfaces syncMarkers from visualCommands', () => {
    const scene: PresentationScene = {
      id: 'scene-sync',
      nodeIds: ['n1'],
      edgeIds: [],
      narration: 'Sync test',
      focusNodeId: 'n1',
      viewport: { x: 0, y: 0, zoom: 1 },
      durationEstimate: 5,
      visualCommands: [
        { type: 'reveal', targetId: 'n1', wordTrigger: 3 },
        { type: 'highlight', targetId: 'n2', wordTrigger: 7 },
        { type: 'zoom', targetId: '', params: { level: 2 } }, // no wordTrigger → agentCommand
      ],
    };

    const result = compilePresentationScene(scene);

    expect(result.syncMarkers).toBeDefined();
    expect(result.syncMarkers!.length).toBe(2);
    expect(result.syncMarkers![0].wordIndex).toBe(3);
    expect(result.syncMarkers![0].command.method).toBe('showElement');
    expect(result.syncMarkers![1].wordIndex).toBe(7);
    expect(result.syncMarkers![1].command.method).toBe('highlight');

    // The zoom command (no wordTrigger) should be in agentCommands, not syncMarkers
    const zoomCmd = result.agentCommands.find((c) => c.method === 'zoomTo');
    expect(zoomCmd).toBeDefined();
  });

  it('compilePresentationScene with interactiveParameters emits bindElementToParameter', () => {
    const scene: PresentationScene = {
      id: 'scene-pod',
      nodeIds: ['pod'],
      edgeIds: [],
      narration: 'Pod demo',
      focusNodeId: 'pod',
      viewport: { x: 200, y: 200, zoom: 1 },
      visualCommands: [],
      durationEstimate: 10000,
      visualScript: makeScript(
        [
          {
            id: 'f1',
            startTime: 0,
            endTime: 3000,
            entities: [makeEntity({ id: 'pod-main', type: 'Pod' })],
            narrationSegment: 'Pod appears',
            description: '',
          },
        ],
        'scene-pod',
      ),
      interactiveParameters: ['pod_count'],
    };

    const result = compilePresentationScene(scene);

    const bindCmds = result.agentCommands.filter((c) => c.method === 'bindElementToParameter');
    expect(bindCmds.length).toBeGreaterThan(0);
    expect(bindCmds[0].args['elementId']).toBe('scene-pod:pod-main');
    expect(bindCmds[0].args['paramName']).toBe('pod_count');
    expect(bindCmds[0].args['mapper']).toBe('itemCount');
    expect(result.interactiveParameters).toEqual(['pod_count']);
  });

  // ── compileStoryboardScene ─────────────────────────────────
  describe('compileStoryboardScene', () => {
    it('createCheckpoint is always first when checkpointName present', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test narration with enough characters.',
        nodeIds: ['n1'],
        checkpointName: 'cp-1',
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 3000,
          entities: [makeEntity({ id: 'e1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      const wordTimestamps: WordTimestamp[] = [
        { word: 'Test', start: 0, end: 100 },
        { word: 'narration', start: 100, end: 300 },
      ];

      const { scene: result } = compileStoryboardScene(
        scene,
        storyboard,
        script,
        wordTimestamps,
        3000,
      );

      const first = result.agentCommands[0];
      expect(first.method).toBe('createCheckpoint');
      expect(first.args['name']).toBe('cp-1');
    });

    it('new entity produces createElement + fadeIn', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 3000,
          entities: [makeEntity({ id: 'pod1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      const { scene: result } = compileStoryboardScene(
        scene,
        storyboard,
        script,
        [],
        3000,
      );

      const create = result.agentCommands.find((c) => c.method === 'createElement');
      expect(create).toBeDefined();
      const fadeIn = result.agentCommands.find((c) => c.method === 'fadeIn');
      expect(fadeIn).toBeDefined();
    });

    it('removed entity produces fadeOut + destroyElement', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const e1 = makeEntity({ id: 'ephemeral', type: 'Label' });
      const script = makeScript([
        { id: 'f1', startTime: 0, endTime: 2000, entities: [e1], narrationSegment: '', description: '' },
        { id: 'f2', startTime: 2000, endTime: 4000, entities: [], narrationSegment: '', description: '' },
      ]);
      const { scene: result } = compileStoryboardScene(scene, storyboard, script, [], 4000);

      const fadeOut = result.agentCommands.find(
        (c) => c.method === 'fadeOut' && (c.args['id'] as string).includes('ephemeral'),
      );
      expect(fadeOut).toBeDefined();
      const destroy = result.agentCommands.find(
        (c) => c.method === 'destroyElement' && (c.args['id'] as string).includes('ephemeral'),
      );
      expect(destroy).toBeDefined();
    });

    it('timing rescale: 50% estimated duration → 50% actual', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 4000,
          entities: [makeEntity({ id: 'e1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      const wordTimestamps: WordTimestamp[] = [
        { word: 'a', start: 0, end: 500 },
        { word: 'b', start: 500, end: 1000 },
      ];
      const { scene: result } = compileStoryboardScene(
        scene,
        storyboard,
        script,
        wordTimestamps,
        2000,
      );
      const create = result.agentCommands.find((c) => c.method === 'createElement');
      expect(create).toBeDefined();
      expect(typeof create!.timing).toBe('number');
      expect(create!.timing).toBeLessThanOrEqual(2000);
    });

    it('Pod + pod_count infers binding', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: ['pod_count'],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [{ name: 'pod_count', type: 'integer', default: 3, label: 'Pods', bindings: [] }],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 3000,
          entities: [makeEntity({ id: 'pod1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      script.entities = { pod1: makeEntity({ id: 'pod1', type: 'Pod' }) };

      const { updatedParameters } = compileStoryboardScene(scene, storyboard, script, [], 3000);

      const podParam = updatedParameters.find((p) => p.name === 'pod_count');
      expect(podParam).toBeDefined();
      expect(podParam!.bindings.length).toBeGreaterThan(0);
      expect((podParam!.bindings[0] as any).elementId).toBe('s1:pod1');
      expect((podParam!.bindings[0] as any).mapper).toBe('itemCount');
    });

    it('syncMarkers sorted by wordIndex', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 3000,
          entities: [makeEntity({ id: 'e1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      const wordTimestamps: WordTimestamp[] = [
        { word: 'one', start: 0, end: 200 },
        { word: 'two', start: 200, end: 400 },
        { word: 'three', start: 400, end: 600 },
      ];
      const { scene: result } = compileStoryboardScene(
        scene,
        storyboard,
        script,
        wordTimestamps,
        3000,
      );
      if (result.syncMarkers && result.syncMarkers.length >= 2) {
        for (let i = 1; i < result.syncMarkers.length; i++) {
          expect(result.syncMarkers[i].wordIndex).toBeGreaterThanOrEqual(result.syncMarkers[i - 1].wordIndex);
        }
      }
    });

    it('does not mutate input', () => {
      const scene: StoryboardScene = {
        id: 's1',
        name: 'Scene 1',
        narration: 'Test.',
        checkpointName: 'cp-s1',
        nodeIds: ['n1'],
        agentCommands: [],
        viewport: { zoom: 1, center: { x: 0, y: 0 } },
        interactiveParameters: [],
        estimatedDurationSeconds: 15,
      };
      const storyboard: Storyboard = {
        id: 'sb1',
        title: 'Test',
        topic: 'Test',
        scenes: [scene],
        parameters: [],
        interactionPoints: [],
      };
      const script = makeScript([
        {
          id: 'f1',
          startTime: 0,
          endTime: 3000,
          entities: [makeEntity({ id: 'e1', type: 'Pod' })],
          narrationSegment: '',
          description: '',
        },
      ]);
      const sceneBefore = { ...scene };
      const storyboardBefore = JSON.parse(JSON.stringify(storyboard));
      compileStoryboardScene(scene, storyboard, script, [], 3000);
      expect(scene.agentCommands).toEqual(sceneBefore.agentCommands);
      expect(storyboard.parameters).toEqual(storyboardBefore.parameters);
    });
  });
});
