import { AdvancedAudioService } from '../../AdvancedAudioService';
import { DataType } from '../../../../shared/types';

describe('AdvancedAudioService', () => {
  let service: AdvancedAudioService;

  beforeEach(() => {
    service = new AdvancedAudioService();
  });

  describe('generateAudioContext', () => {
    it('should generate comprehensive audio context for a scene', async () => {
      const narration = 'Let me explain this amazing concept';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Server', 'Database'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext).toBeDefined();
      expect(audioContext.backgroundMusic).toBeDefined();
      expect(audioContext.voiceModulation).toBeDefined();
      expect(audioContext.audioEffects).toBeDefined();
      expect(audioContext.spatialAudio).toBeDefined();
    });

    it('should select calm mood for concept narration', async () => {
      const narration = 'A pod is a fundamental concept in Kubernetes';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Pod'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.backgroundMusic.mood).toBe('calm');
    });

    it('should select tense mood for problem narration', async () => {
      const narration =
        'This problem is quite difficult and challenging to solve';
      const dataType = DataType.PROCESS;
      const entityTypes = ['Server'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.backgroundMusic.mood).toBe('tense');
    });

    it('should select triumphant mood for solution narration', async () => {
      const narration = 'The solution works perfectly and solves the issue';
      const dataType = DataType.EXAMPLE;
      const entityTypes = ['Server'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.backgroundMusic.mood).toBe('triumphant');
    });

    it('should select upbeat mood for discovery narration', async () => {
      const narration = "Let's discover this amazing new feature";
      const dataType = DataType.EXAMPLE;
      const entityTypes = ['Container'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.backgroundMusic.mood).toBe('upbeat');
    });
  });

  describe('selectAmbientSoundscape', () => {
    it('should select server room soundscape for servers', async () => {
      const narration = 'This is a server';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Server', 'Instance'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.ambientSoundscape).toBeDefined();
      expect(audioContext.ambientSoundscape?.type).toBe('serverRoom');
    });

    it('should select database soundscape for databases', async () => {
      const narration = 'This is a database';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Database', 'PostgreSQL'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.ambientSoundscape).toBeDefined();
      expect(audioContext.ambientSoundscape?.type).toBe('database');
    });

    it('should select cloud soundscape for cloud entities', async () => {
      const narration = 'This is cloud infrastructure';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Cloud', 'Lambda', 'S3'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.ambientSoundscape).toBeDefined();
      expect(audioContext.ambientSoundscape?.type).toBe('cloudInfra');
    });

    it('should return null for unrecognized entity types', async () => {
      const narration = 'Generic narration';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Unknown'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.ambientSoundscape).toBeNull();
    });
  });

  describe('generateVoiceModulation', () => {
    it('should generate appropriate modulation for concepts', async () => {
      const narration = 'This is a concept';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Box'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.voiceModulation.tone).toBe('explanatory');
      expect(audioContext.voiceModulation.rate).toBe(0.95);
    });

    it('should generate appropriate modulation for definitions', async () => {
      const narration = 'This is a definition';
      const dataType = DataType.DEFINITION;
      const entityTypes = ['Text'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.voiceModulation.tone).toBe('authoritative');
      expect(audioContext.voiceModulation.emphasis).toBe('strong');
    });

    it('should generate appropriate modulation for analogies', async () => {
      const narration = 'This is like...';
      const dataType = DataType.ANALOGY;
      const entityTypes = ['SplitPanel'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      expect(audioContext.voiceModulation.tone).toBe('conversational');
      expect(audioContext.voiceModulation.pitch).toBe(1.1);
    });
  });

  describe('calculateEntityAudioPosition', () => {
    it('should convert percentage position to 3D coordinates', () => {
      const entityPosition = { x: 50, y: 50 };
      const canvasSize = { width: 800, height: 600 };

      const position = service.calculateEntityAudioPosition(
        entityPosition,
        canvasSize,
      );

      expect(position.x).toBe(50);
      expect(position.y).toBe(50);
      expect(position.z).toBe(0);
    });
  });

  describe('generateEntityAudioCue', () => {
    it('should generate audio cue for server start', () => {
      const cue = service.generateEntityAudioCue('Server', 'start');

      expect(cue).toBeDefined();
      expect(cue?.url).toContain('server-startup');
      expect(cue?.spatial).toBe(true);
    });

    it('should generate audio cue for database query', () => {
      const cue = service.generateEntityAudioCue('Database', 'query');

      expect(cue).toBeDefined();
      expect(cue?.url).toContain('db-query');
      expect(cue?.volume).toBeGreaterThan(0);
    });

    it('should generate audio cue for container deployment', () => {
      const cue = service.generateEntityAudioCue('Container', 'deploy');

      expect(cue).toBeDefined();
      expect(cue?.url).toContain('container-deploy');
      expect(cue?.duration).toBeGreaterThan(0);
    });

    it('should return null for unknown entity type', () => {
      const cue = service.generateEntityAudioCue('Unknown', 'action');

      expect(cue).toBeNull();
    });

    it('should return null for unknown action', () => {
      const cue = service.generateEntityAudioCue('Server', 'unknown');

      expect(cue).toBeNull();
    });
  });

  describe('generateSceneTransitionAudio', () => {
    it('should generate transition audio between moods', () => {
      const transition = service.generateSceneTransitionAudio('calm', 'upbeat');

      expect(transition).toBeDefined();
      expect(transition.transitionSound).toContain('calm-to-upbeat');
      expect(transition.crossfadeDuration).toBeGreaterThan(0);
    });

    it('should use generic transition for unknown mood pairs', () => {
      const transition = service.generateSceneTransitionAudio(
        'unknown1',
        'unknown2',
      );

      expect(transition).toBeDefined();
      expect(transition.transitionSound).toContain('generic-crossfade');
    });
  });

  describe('generateCodeExecutionAudio', () => {
    it('should generate audio for code execution', () => {
      const audio = service.generateCodeExecutionAudio('javascript');

      expect(audio).toBeDefined();
      expect(audio.typing).toBeDefined();
      expect(audio.execution).toBeDefined();
      expect(audio.completion).toBeDefined();
      expect(audio.typing.volume).toBeGreaterThan(0);
    });

    it('should include language-specific execution audio', () => {
      const audio = service.generateCodeExecutionAudio('python');

      expect(audio.execution.url).toContain('python-execution');
    });
  });

  describe('applyComplexityBasedEffects', () => {
    it('should apply minimal effects for simple complexity', () => {
      const effects = service.applyComplexityBasedEffects('simple');

      expect(effects.length).toBe(1);
      expect(effects[0].type).toBe('compression');
      expect(effects[0].intensity).toBe(0.5);
    });

    it('should apply balanced effects for moderate complexity', () => {
      const effects = service.applyComplexityBasedEffects('moderate');

      expect(effects.length).toBe(2);
      expect(effects.some((e) => e.type === 'compression')).toBe(true);
      expect(effects.some((e) => e.type === 'reverb')).toBe(true);
    });

    it('should apply rich effects for complex scenes', () => {
      const effects = service.applyComplexityBasedEffects('complex');

      expect(effects.length).toBe(3);
      expect(effects.some((e) => e.type === 'compression')).toBe(true);
      expect(effects.some((e) => e.type === 'reverb')).toBe(true);
      expect(effects.some((e) => e.type === 'filter')).toBe(true);
    });
  });

  describe('generateAudioVisualizationData', () => {
    it('should generate frequency and waveform data', () => {
      const data = service.generateAudioVisualizationData(null);

      expect(data).toBeDefined();
      expect(data.frequencyData).toHaveLength(32);
      expect(data.waveformData).toHaveLength(256);
      expect(data.peakLevel).toBeGreaterThanOrEqual(0);
      expect(data.peakLevel).toBeLessThanOrEqual(100);
      expect(data.averageLevel).toBeGreaterThanOrEqual(0);
      expect(data.averageLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('audio state management', () => {
    it('should track current audio state', async () => {
      const initialState = service.getAudioState();
      expect(initialState.music).toBeNull();
      expect(initialState.ambience).toBeNull();
      expect(initialState.activeEffects).toHaveLength(0);
    });

    it('should update audio context', async () => {
      const narration = 'Test narration';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Server'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );

      service.updateAudioContext(audioContext);

      const state = service.getAudioState();
      expect(state.music).toBeDefined();
      expect(state.ambience).toBeDefined();
      expect(state.activeEffects.length).toBeGreaterThan(0);
    });

    it('should clear all audio', async () => {
      const narration = 'Test narration';
      const dataType = DataType.CONCEPT;
      const entityTypes = ['Server'];

      const audioContext = await service.generateAudioContext(
        narration,
        dataType,
        entityTypes,
      );
      service.updateAudioContext(audioContext);

      service.clearAudio();

      const state = service.getAudioState();
      expect(state.music).toBeNull();
      expect(state.ambience).toBeNull();
      expect(state.activeEffects).toHaveLength(0);
    });
  });
});
