/* ═══════════════════════════════════════════════════════════════
   Advanced Audio Service

   Enhances the audio experience with adaptive background music,
   3D spatial audio, voice modulation, ambient soundscapes, and
   audio effects. Creates immersive, context-aware audio.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import {
  type AudioContext,
  type SpatialAudioConfig,
  type VoiceModulation,
  type AmbientSoundscape,
  type AudioEffect,
  type BackgroundMusic,
  DataType,
} from '../../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Audio profile library
 */
const BACKGROUND_MUSIC_LIBRARY = {
  calm: {
    url: '/audio/music/calm-ambient.mp3',
    volume: 0.2,
    fadeInMs: 2000,
    fadeOutMs: 3000,
    description: 'Calm ambient music for concept explanations',
  },
  upbeat: {
    url: '/audio/music/upbeat-discovery.mp3',
    volume: 0.3,
    fadeInMs: 1500,
    fadeOutMs: 2000,
    description: 'Upbeat music for exciting discoveries',
  },
  tense: {
    url: '/audio/music/tense-problem.mp3',
    volume: 0.25,
    fadeInMs: 1000,
    fadeOutMs: 2500,
    description: 'Tense music for problem scenarios',
  },
  triumphant: {
    url: '/audio/music/triumphant-solution.mp3',
    volume: 0.35,
    fadeInMs: 1000,
    fadeOutMs: 2000,
    description: 'Triumphant music for solutions',
  },
  neutral: {
    url: '/audio/music/neutral-background.mp3',
    volume: 0.15,
    fadeInMs: 2000,
    fadeOutMs: 2000,
    description: 'Neutral background for general content',
  },
};

const AMBIENT_SOUNDS = {
  serverRoom: {
    layers: [
      { url: '/audio/ambient/server-fans.mp3', volume: 0.3, loop: true },
      { url: '/audio/ambient/disk-activity.mp3', volume: 0.15, loop: true },
      { url: '/audio/ambient/rack-hum.mp3', volume: 0.1, loop: true },
    ],
    description: 'Server room ambient sounds',
  },
  networkTraffic: {
    layers: [
      { url: '/audio/ambient/network-flow.mp3', volume: 0.25, loop: true },
      { url: '/audio/ambient/packet-bursts.mp3', volume: 0.2, loop: false },
    ],
    description: 'Network traffic sounds',
  },
  database: {
    layers: [
      { url: '/audio/ambient/db-queries.mp3', volume: 0.2, loop: true },
      { url: '/audio/ambient/disk-seeks.mp3', volume: 0.15, loop: true },
    ],
    description: 'Database operation sounds',
  },
  coding: {
    layers: [
      { url: '/audio/ambient/keyboard-typing.mp3', volume: 0.25, loop: true },
      { url: '/audio/ambient/compilation.mp3', volume: 0.15, loop: false },
    ],
    description: 'Coding environment sounds',
  },
  cloudInfra: {
    layers: [
      { url: '/audio/ambient/cloud-processing.mp3', volume: 0.2, loop: true },
      { url: '/audio/ambient/api-calls.mp3', volume: 0.15, loop: false },
    ],
    description: 'Cloud infrastructure sounds',
  },
};

export class AdvancedAudioService {
  private currentMusic: BackgroundMusic | null = null;
  private currentAmbience: AmbientSoundscape | null = null;
  private activeEffects: Map<string, AudioEffect> = new Map();

  /**
   * Generate comprehensive audio context for a scene
   */
  async generateAudioContext(
    narration: string,
    dataType: DataType,
    entityTypes: string[],
  ): Promise<AudioContext> {
    // Analyze mood for background music
    const mood = await this.analyzeMood(narration, dataType);

    // Select background music
    const backgroundMusic = this.selectBackgroundMusic(mood);

    // Determine ambient soundscape
    const ambientSoundscape = this.selectAmbientSoundscape(entityTypes);

    // Generate voice modulation if needed
    const voiceModulation = this.generateVoiceModulation(dataType);

    // Select appropriate audio effects
    const audioEffects = this.selectAudioEffects(dataType, mood);

    return {
      backgroundMusic,
      ambientSoundscape,
      voiceModulation,
      audioEffects,
      spatialAudio: this.generateSpatialAudioConfig(entityTypes.length),
    };
  }

  /**
   * Analyze narration to determine mood
   */
  private async analyzeMood(
    narration: string,
    dataType: DataType,
  ): Promise<'calm' | 'upbeat' | 'tense' | 'triumphant' | 'neutral'> {
    // Quick heuristic-based analysis (can be enhanced with Claude)
    const lowerNarration = narration.toLowerCase();

    // Solution/success indicators (check first - higher priority)
    if (
      lowerNarration.includes('solution') ||
      lowerNarration.includes('solved') ||
      lowerNarration.includes('success') ||
      lowerNarration.includes('works')
    ) {
      return 'triumphant';
    }

    // Problem/challenge indicators
    if (
      lowerNarration.includes('problem') ||
      lowerNarration.includes('issue') ||
      lowerNarration.includes('challenge') ||
      lowerNarration.includes('difficult')
    ) {
      return 'tense';
    }

    // Exciting discovery indicators
    if (
      lowerNarration.includes('amazing') ||
      lowerNarration.includes('incredible') ||
      lowerNarration.includes('discover') ||
      lowerNarration.includes('let\'s see')
    ) {
      return 'upbeat';
    }

    // Default to calm for concepts and definitions
    if (dataType === DataType.CONCEPT || dataType === DataType.DEFINITION) {
      return 'calm';
    }

    return 'neutral';
  }

  /**
   * Select background music based on mood
   */
  private selectBackgroundMusic(
    mood: 'calm' | 'upbeat' | 'tense' | 'triumphant' | 'neutral',
  ): BackgroundMusic {
    const profile = BACKGROUND_MUSIC_LIBRARY[mood];

    return {
      id: uuid(),
      url: profile.url,
      volume: profile.volume,
      fadeIn: profile.fadeInMs,
      fadeOut: profile.fadeOutMs,
      loop: true,
      mood,
    };
  }

  /**
   * Select ambient soundscape based on entity types
   */
  private selectAmbientSoundscape(entityTypes: string[]): AmbientSoundscape | null {
    // Analyze entity types to determine context
    const hasServer = entityTypes.some((t) =>
      ['Server', 'Instance', 'VM'].includes(t),
    );
    const hasDatabase = entityTypes.some((t) =>
      ['Database', 'PostgreSQL', 'MongoDB', 'Redis'].includes(t),
    );
    const hasNetwork = entityTypes.some((t) =>
      ['Network', 'LoadBalancer', 'Gateway'].includes(t),
    );
    const hasContainer = entityTypes.some((t) =>
      ['Container', 'Pod', 'Deployment'].includes(t),
    );
    const hasCloud = entityTypes.some((t) =>
      ['Cloud', 'S3', 'Lambda', 'Function'].includes(t),
    );

    // Select primary soundscape
    let soundscapeKey: keyof typeof AMBIENT_SOUNDS | null = null;

    if (hasCloud) soundscapeKey = 'cloudInfra';
    else if (hasDatabase) soundscapeKey = 'database';
    else if (hasNetwork) soundscapeKey = 'networkTraffic';
    else if (hasServer || hasContainer) soundscapeKey = 'serverRoom';

    if (!soundscapeKey) return null;

    const soundscape = AMBIENT_SOUNDS[soundscapeKey];

    return {
      id: uuid(),
      type: soundscapeKey,
      layers: soundscape.layers.map((layer) => ({
        url: layer.url,
        volume: layer.volume,
        loop: layer.loop,
      })),
      spatialPositioning: true,
    };
  }

  /**
   * Generate voice modulation for different data types
   */
  private generateVoiceModulation(dataType: DataType): VoiceModulation {
    const modulations: Record<DataType, VoiceModulation> = {
      [DataType.CONCEPT]: {
        pitch: 1.0,
        rate: 0.95,
        emphasis: 'moderate',
        tone: 'explanatory',
      },
      [DataType.DEFINITION]: {
        pitch: 1.0,
        rate: 0.9,
        emphasis: 'strong',
        tone: 'authoritative',
      },
      [DataType.EXAMPLE]: {
        pitch: 1.05,
        rate: 1.0,
        emphasis: 'light',
        tone: 'demonstrative',
      },
      [DataType.ANALOGY]: {
        pitch: 1.1,
        rate: 1.05,
        emphasis: 'moderate',
        tone: 'conversational',
      },
      [DataType.PROCESS]: {
        pitch: 1.0,
        rate: 1.0,
        emphasis: 'strong',
        tone: 'instructional',
      },
      [DataType.RELATIONSHIP]: {
        pitch: 0.95,
        rate: 0.95,
        emphasis: 'moderate',
        tone: 'analytical',
      },
      [DataType.RESOURCE]: {
        pitch: 1.0,
        rate: 1.0,
        emphasis: 'light',
        tone: 'informative',
      },
      [DataType.COUNTERPOINT]: {
        pitch: 0.95,
        rate: 0.9,
        emphasis: 'strong',
        tone: 'cautionary',
      },
    };

    return modulations[dataType];
  }

  /**
   * Select audio effects based on context
   */
  private selectAudioEffects(
    dataType: DataType,
    mood: string,
  ): AudioEffect[] {
    const effects: AudioEffect[] = [];

    // Add reverb for large concepts
    if (
      dataType === DataType.CONCEPT &&
      (mood === 'calm' || mood === 'triumphant')
    ) {
      effects.push({
        type: 'reverb',
        intensity: 0.3,
        decay: 2.0,
        predelay: 20,
      });
    }

    // Add echo for repetition/emphasis
    if (dataType === DataType.DEFINITION || dataType === DataType.COUNTERPOINT) {
      effects.push({
        type: 'echo',
        intensity: 0.2,
        delay: 150,
        feedback: 0.3,
      });
    }

    // Add compression for clarity
    effects.push({
      type: 'compression',
      intensity: 0.6,
      threshold: -20,
      ratio: 4,
      attack: 5,
      release: 50,
    });

    return effects;
  }

  /**
   * Generate spatial audio configuration
   */
  private generateSpatialAudioConfig(entityCount: number): SpatialAudioConfig {
    return {
      enabled: true,
      mode: '3d',
      listenerPosition: { x: 50, y: 50, z: 100 },
      distanceModel: 'inverse',
      rolloffFactor: 1.0,
      maxDistance: 200,
      refDistance: 50,
    };
  }

  /**
   * Calculate 3D position for entity audio
   */
  calculateEntityAudioPosition(
    entityPosition: { x: number; y: number },
    canvasSize: { width: number; height: number },
  ): { x: number; y: number; z: number } {
    // Convert percentage-based position to 3D coordinates
    // x, y are in percentage (0-100), z represents depth
    return {
      x: entityPosition.x,
      y: entityPosition.y,
      z: 0, // Entities on the same plane
    };
  }

  /**
   * Generate audio cue for entity action
   */
  generateEntityAudioCue(
    entityType: string,
    action: string,
  ): {
    url: string;
    volume: number;
    duration: number;
    spatial: boolean;
  } | null {
    const cues: Record<
      string,
      Record<string, { url: string; volume: number; duration: number }>
    > = {
      Server: {
        start: { url: '/audio/cues/server-startup.mp3', volume: 0.4, duration: 1500 },
        stop: { url: '/audio/cues/server-shutdown.mp3', volume: 0.3, duration: 1000 },
        process: { url: '/audio/cues/server-processing.mp3', volume: 0.3, duration: 800 },
      },
      Database: {
        query: { url: '/audio/cues/db-query.mp3', volume: 0.35, duration: 500 },
        write: { url: '/audio/cues/db-write.mp3', volume: 0.3, duration: 400 },
        read: { url: '/audio/cues/db-read.mp3', volume: 0.3, duration: 300 },
      },
      Container: {
        deploy: { url: '/audio/cues/container-deploy.mp3', volume: 0.4, duration: 1000 },
        scale: { url: '/audio/cues/container-scale.mp3', volume: 0.35, duration: 800 },
        terminate: {
          url: '/audio/cues/container-terminate.mp3',
          volume: 0.3,
          duration: 600,
        },
      },
      Network: {
        send: { url: '/audio/cues/network-send.mp3', volume: 0.3, duration: 200 },
        receive: { url: '/audio/cues/network-receive.mp3', volume: 0.3, duration: 200 },
        error: { url: '/audio/cues/network-error.mp3', volume: 0.4, duration: 500 },
      },
    };

    const entityCues = cues[entityType];
    if (!entityCues) return null;

    const cue = entityCues[action];
    if (!cue) return null;

    return {
      ...cue,
      spatial: true,
    };
  }

  /**
   * Generate transition audio for scene changes
   */
  generateSceneTransitionAudio(
    fromMood: string,
    toMood: string,
  ): {
    transitionSound: string;
    crossfadeDuration: number;
  } {
    const transitions: Record<
      string,
      { url: string; duration: number }
    > = {
      'calm-upbeat': { url: '/audio/transitions/calm-to-upbeat.mp3', duration: 2000 },
      'upbeat-tense': { url: '/audio/transitions/upbeat-to-tense.mp3', duration: 1500 },
      'tense-triumphant': {
        url: '/audio/transitions/tense-to-triumphant.mp3',
        duration: 2500,
      },
      'triumphant-calm': {
        url: '/audio/transitions/triumphant-to-calm.mp3',
        duration: 3000,
      },
    };

    const key = `${fromMood}-${toMood}`;
    const transition = transitions[key] || {
      url: '/audio/transitions/generic-crossfade.mp3',
      duration: 2000,
    };

    return {
      transitionSound: transition.url,
      crossfadeDuration: transition.duration,
    };
  }

  /**
   * Generate audio for code execution (typing, compilation)
   */
  generateCodeExecutionAudio(language: string): {
    typing: { url: string; volume: number };
    execution: { url: string; volume: number };
    completion: { url: string; volume: number };
  } {
    return {
      typing: {
        url: '/audio/code/keyboard-typing.mp3',
        volume: 0.25,
      },
      execution: {
        url: `/audio/code/${language.toLowerCase()}-execution.mp3`,
        volume: 0.3,
      },
      completion: {
        url: '/audio/code/execution-complete.mp3',
        volume: 0.35,
      },
    };
  }

  /**
   * Apply dynamic audio effects based on complexity
   */
  applyComplexityBasedEffects(
    complexity: 'simple' | 'moderate' | 'complex',
  ): AudioEffect[] {
    const effects: AudioEffect[] = [];

    switch (complexity) {
      case 'simple':
        // Minimal effects for clarity
        effects.push({
          type: 'compression',
          intensity: 0.5,
          threshold: -18,
          ratio: 3,
        });
        break;

      case 'moderate':
        // Balanced effects
        effects.push(
          {
            type: 'compression',
            intensity: 0.6,
            threshold: -20,
            ratio: 4,
          },
          {
            type: 'reverb',
            intensity: 0.2,
            decay: 1.5,
          },
        );
        break;

      case 'complex':
        // Rich effects for immersion
        effects.push(
          {
            type: 'compression',
            intensity: 0.7,
            threshold: -22,
            ratio: 6,
          },
          {
            type: 'reverb',
            intensity: 0.35,
            decay: 2.5,
          },
          {
            type: 'filter',
            intensity: 0.3,
            filterType: 'lowpass',
            frequency: 5000,
          },
        );
        break;
    }

    return effects;
  }

  /**
   * Generate audio visualization data (frequency spectrum)
   */
  generateAudioVisualizationData(audioBuffer: any): {
    frequencyData: number[];
    waveformData: number[];
    peakLevel: number;
    averageLevel: number;
  } {
    // Placeholder implementation
    // In real implementation, this would analyze the audio buffer
    const frequencyBins = 32;
    const waveformSamples = 256;

    return {
      frequencyData: Array.from({ length: frequencyBins }, () =>
        Math.random() * 100,
      ),
      waveformData: Array.from({ length: waveformSamples }, () =>
        Math.random() * 2 - 1,
      ),
      peakLevel: Math.random() * 100,
      averageLevel: Math.random() * 60,
    };
  }

  /**
   * Get current audio state
   */
  getAudioState(): {
    music: BackgroundMusic | null;
    ambience: AmbientSoundscape | null;
    activeEffects: AudioEffect[];
  } {
    return {
      music: this.currentMusic,
      ambience: this.currentAmbience,
      activeEffects: Array.from(this.activeEffects.values()),
    };
  }

  /**
   * Update audio context (for transitions)
   */
  updateAudioContext(context: AudioContext): void {
    this.currentMusic = context.backgroundMusic;
    this.currentAmbience = context.ambientSoundscape;

    // Update active effects
    this.activeEffects.clear();
    context.audioEffects.forEach((effect) => {
      this.activeEffects.set(`${effect.type}-${uuid().slice(0, 8)}`, effect);
    });
  }

  /**
   * Clear all audio
   */
  clearAudio(): void {
    this.currentMusic = null;
    this.currentAmbience = null;
    this.activeEffects.clear();
  }
}
