import { VoiceService } from '../../VoiceService';
import { VoiceIntent } from '../../../../shared/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('VoiceService', () => {
  let voice: VoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    voice = new VoiceService();
  });

  // ── Pure Function Tests (no mocking needed) ──────────────

  describe('classifyIntent()', () => {
    it('classifies questions with question words', () => {
      expect(voice.classifyIntent('What is Kubernetes?')).toBe(VoiceIntent.QUESTION);
      expect(voice.classifyIntent('How does this work?')).toBe(VoiceIntent.QUESTION);
      expect(voice.classifyIntent('Why is that important?')).toBe(VoiceIntent.QUESTION);
      expect(voice.classifyIntent('Can you explain more?')).toBe(VoiceIntent.QUESTION);
    });

    it('classifies questions ending with ?', () => {
      expect(voice.classifyIntent('So this connects to the database?')).toBe(VoiceIntent.QUESTION);
    });

    it('classifies acknowledgments', () => {
      expect(voice.classifyIntent('OK')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('Got it')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('Makes sense')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('I see')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('Yeah')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('hmm')).toBe(VoiceIntent.ACKNOWLEDGMENT);
    });

    it('classifies confusion signals', () => {
      expect(voice.classifyIntent("I don't understand")).toBe(VoiceIntent.CONFUSION);
      expect(voice.classifyIntent("I'm confused")).toBe(VoiceIntent.CONFUSION);
      expect(voice.classifyIntent('Can you repeat that')).toBe(VoiceIntent.CONFUSION);
      expect(voice.classifyIntent('Wait what')).toBe(VoiceIntent.CONFUSION);
      expect(voice.classifyIntent('too fast')).toBe(VoiceIntent.CONFUSION);
    });

    it('classifies commands', () => {
      expect(voice.classifyIntent('Go back')).toBe(VoiceIntent.COMMAND);
      expect(voice.classifyIntent('Skip')).toBe(VoiceIntent.COMMAND);
      expect(voice.classifyIntent('Pause')).toBe(VoiceIntent.COMMAND);
      expect(voice.classifyIntent('Show graph')).toBe(VoiceIntent.COMMAND);
      expect(voice.classifyIntent('faster')).toBe(VoiceIntent.COMMAND);
    });

    it('defaults short unknown text to acknowledgment', () => {
      expect(voice.classifyIntent('uh')).toBe(VoiceIntent.ACKNOWLEDGMENT);
      expect(voice.classifyIntent('sure thing')).toBe(VoiceIntent.ACKNOWLEDGMENT);
    });

    it('defaults long unknown text to question', () => {
      expect(voice.classifyIntent('I was thinking about how this relates to distributed systems and microservices')).toBe(VoiceIntent.QUESTION);
    });
  });

  describe('parseVoiceEvent()', () => {
    it('creates interrupt event for questions', () => {
      const event = voice.parseVoiceEvent('What is a pod?', 0.95);
      expect(event.type).toBe('interrupt');
      expect(event.intent).toBe(VoiceIntent.QUESTION);
      expect(event.text).toBe('What is a pod?');
      expect(event.confidence).toBe(0.95);
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('creates acknowledgment event for acknowledgments', () => {
      const event = voice.parseVoiceEvent('Got it', 0.9);
      expect(event.type).toBe('acknowledgment');
      expect(event.intent).toBe(VoiceIntent.ACKNOWLEDGMENT);
    });

    it('creates transcript event for confusion and commands', () => {
      const event = voice.parseVoiceEvent("I don't understand", 0.85);
      expect(event.type).toBe('transcript');
      expect(event.intent).toBe(VoiceIntent.CONFUSION);
    });
  });

  describe('getVADConfig()', () => {
    it('returns valid VAD configuration', () => {
      const config = voice.getVADConfig();
      expect(config.sampleRate).toBe(16000);
      expect(config.frameSizeMs).toBe(30);
      expect(config.silenceThresholdMs).toBe(800);
      expect(config.speechThresholdMs).toBe(200);
    });
  });

  // ── Mock Tests (fetch-dependent) ─────────────────────────

  describe('transcribeAudio()', () => {
    const audioBuffer = Buffer.from('fake-audio-data');

    it('returns empty result when DEEPGRAM_API_KEY is not set', async () => {
      const saved = process.env.DEEPGRAM_API_KEY;
      delete process.env.DEEPGRAM_API_KEY;

      const result = await voice.transcribeAudio(audioBuffer);

      expect(result.text).toBe('');
      expect(result.words).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();

      if (saved) process.env.DEEPGRAM_API_KEY = saved;
    });

    it('transcribes audio and returns word timestamps', async () => {
      process.env.DEEPGRAM_API_KEY = 'test-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: {
            channels: [{
              alternatives: [{
                transcript: 'Hello world',
                words: [
                  { word: 'Hello', start: 0.0, end: 0.5 },
                  { word: 'world', start: 0.6, end: 1.0 },
                ],
                confidence: 0.97,
              }],
            }],
          },
        }),
      });

      const result = await voice.transcribeAudio(audioBuffer);

      expect(result.text).toBe('Hello world');
      expect(result.words).toHaveLength(2);
      expect(result.words[0]).toEqual({ word: 'Hello', start: 0, end: 500 });
      expect(result.words[1]).toEqual({ word: 'world', start: 600, end: 1000 });
      expect(result.confidence).toBe(0.97);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.deepgram.com'),
        expect.objectContaining({ method: 'POST' }),
      );

      delete process.env.DEEPGRAM_API_KEY;
    });

    it('returns empty result on API error', async () => {
      process.env.DEEPGRAM_API_KEY = 'test-key';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await voice.transcribeAudio(audioBuffer);

      expect(result.text).toBe('');
      expect(result.words).toEqual([]);

      delete process.env.DEEPGRAM_API_KEY;
    });

    it('returns empty result on fetch exception', async () => {
      process.env.DEEPGRAM_API_KEY = 'test-key';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await voice.transcribeAudio(audioBuffer);

      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);

      delete process.env.DEEPGRAM_API_KEY;
    });
  });

  describe('synthesizeSpeech()', () => {
    it('returns fallback timestamps when ELEVENLABS_API_KEY is not set', async () => {
      const saved = process.env.ELEVENLABS_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;

      const result = await voice.synthesizeSpeech('Hello world');

      expect(result.audioData.length).toBe(0);
      expect(result.wordTimestamps).toHaveLength(2);
      expect(result.wordTimestamps[0].word).toBe('Hello');
      expect(result.wordTimestamps[1].word).toBe('world');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(mockFetch).not.toHaveBeenCalled();

      if (saved) process.env.ELEVENLABS_API_KEY = saved;
    });

    it('synthesizes speech with character alignment timestamps', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      const audioBase64 = Buffer.from('fake-mp3-data').toString('base64');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_base64: audioBase64,
          alignment: {
            characters: ['H', 'i', ' ', 'y', 'o', 'u'],
            character_start_times_seconds: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5],
            character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
          },
        }),
      });

      const result = await voice.synthesizeSpeech('Hi you');

      expect(result.audioData.length).toBeGreaterThan(0);
      expect(result.wordTimestamps).toHaveLength(2);
      expect(result.wordTimestamps[0].word).toBe('Hi');
      expect(result.wordTimestamps[0].start).toBe(0);
      expect(result.wordTimestamps[1].word).toBe('you');
      expect(result.durationMs).toBe(600);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.elevenlabs.io'),
        expect.objectContaining({ method: 'POST' }),
      );

      delete process.env.ELEVENLABS_API_KEY;
    });

    it('returns fallback on API error', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      });

      const result = await voice.synthesizeSpeech('Hello world');

      expect(result.audioData.length).toBe(0);
      expect(result.wordTimestamps).toHaveLength(2);

      delete process.env.ELEVENLABS_API_KEY;
    });

    it('returns fallback on fetch exception', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      mockFetch.mockRejectedValueOnce(new Error('DNS failure'));

      const result = await voice.synthesizeSpeech('Hello world');

      expect(result.audioData.length).toBe(0);
      expect(result.wordTimestamps).toHaveLength(2);

      delete process.env.ELEVENLABS_API_KEY;
    });
  });
});
