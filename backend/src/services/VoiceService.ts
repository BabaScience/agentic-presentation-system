/* ═══════════════════════════════════════════════════════════════
   Voice Service — Speech-to-Text, Text-to-Speech, VAD,
   Intent Classification on User Speech
   ═══════════════════════════════════════════════════════════════ */

import { VoiceIntent, type VoiceEvent, type WordTimestamp } from '../../shared/types';

// Intent classification patterns
const QUESTION_PATTERNS = [
  /^(what|how|why|when|where|who|which|can you|could you|tell me|explain)/i,
  /\?$/,
  /^(wait|hold on|but|actually)/i,
];

const CONFUSION_PATTERNS = [
  /^(i don'?t (get|understand)|what do you mean|huh|i'?m (confused|lost))/i,
  /^(can you repeat|say that again|go back|too fast)/i,
  /^(wait what|sorry what)/i,
];

const ACKNOWLEDGMENT_PATTERNS = [
  /^(ok|okay|got it|makes sense|i see|right|yeah|yes|sure|understood|mm+|hmm|uh huh|alright|cool)/i,
  /^(that makes sense|i understand|clear|good|great|perfect|nice)/i,
];

const COMMAND_PATTERNS = [
  /^(go back|skip|next|previous|pause|stop|resume|continue|show graph|show me)/i,
  /^(faster|slower|louder|quieter)/i,
];

export class VoiceService {

  // ── Intent Classification on Transcript Text ─────────────
  classifyIntent(text: string): VoiceIntent {
    const trimmed = text.trim().toLowerCase();

    // Check command patterns first (most specific)
    if (COMMAND_PATTERNS.some(p => p.test(trimmed))) {
      return VoiceIntent.COMMAND;
    }

    // Check confusion (before question — "wait what" is confusion, not question)
    if (CONFUSION_PATTERNS.some(p => p.test(trimmed))) {
      return VoiceIntent.CONFUSION;
    }

    // Check acknowledgment
    if (ACKNOWLEDGMENT_PATTERNS.some(p => p.test(trimmed))) {
      return VoiceIntent.ACKNOWLEDGMENT;
    }

    // Check question patterns
    if (QUESTION_PATTERNS.some(p => p.test(trimmed))) {
      return VoiceIntent.QUESTION;
    }

    // Default: if it's short, it's acknowledgment; if long, it's a question
    return trimmed.split(' ').length <= 3 ? VoiceIntent.ACKNOWLEDGMENT : VoiceIntent.QUESTION;
  }

  // ── Parse Voice Event from Transcript ────────────────────
  parseVoiceEvent(transcript: string, confidence: number): VoiceEvent {
    const intent = this.classifyIntent(transcript);
    return {
      type: intent === VoiceIntent.QUESTION ? 'interrupt' :
            intent === VoiceIntent.ACKNOWLEDGMENT ? 'acknowledgment' :
            'transcript',
      intent,
      text: transcript,
      confidence,
      timestamp: Date.now(),
    };
  }

  // ── STT Integration (Deepgram) ──────────────────────────
  async transcribeAudio(audioBuffer: Buffer): Promise<{
    text: string;
    words: WordTimestamp[];
    confidence: number;
  }> {
    if (!process.env.DEEPGRAM_API_KEY) {
      console.warn('[STT] No DEEPGRAM_API_KEY set, skipping transcription');
      return { text: '', words: [], confidence: 0 };
    }

    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        console.error('[STT] Deepgram API error:', response.status, await response.text());
        return { text: '', words: [], confidence: 0 };
      }

      const result = await response.json() as any;
      const alt = result.results?.channels?.[0]?.alternatives?.[0];
      if (!alt) return { text: '', words: [], confidence: 0 };

      return {
        text: alt.transcript || '',
        words: (alt.words || []).map((w: any) => ({
          word: w.word,
          start: w.start * 1000,
          end: w.end * 1000,
        })),
        confidence: alt.confidence || 0,
      };
    } catch (err: any) {
      console.error('[STT] Deepgram error:', err.message);
      return { text: '', words: [], confidence: 0 };
    }
  }

  // ── TTS Integration (ElevenLabs with-timestamps) ─────────
  async synthesizeSpeech(text: string, voiceId?: string): Promise<{
    audioData: Buffer;
    wordTimestamps: WordTimestamp[];
    durationMs: number;
  }> {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn('[TTS] No ELEVENLABS_API_KEY set, returning empty audio');
      return this.fallbackTimestamps(text);
    }

    try {
      const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || 'l30f87tf05uxyknGdDw6';
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('[TTS] ElevenLabs with-timestamps error:', response.status, errText);
        return this.fallbackTimestamps(text);
      }

      const result = await response.json() as {
        audio_base64: string;
        alignment?: {
          characters: string[];
          character_start_times_seconds: number[];
          character_end_times_seconds: number[];
        };
        normalized_alignment?: {
          characters: string[];
          character_start_times_seconds: number[];
          character_end_times_seconds: number[];
        };
      };

      if (!result.audio_base64) {
        console.warn('[TTS] ElevenLabs returned no audio_base64');
        return this.fallbackTimestamps(text);
      }

      const audioData = Buffer.from(result.audio_base64, 'base64');

      // Derive real word timestamps from character alignment
      const alignment = result.alignment || result.normalized_alignment;
      let wordTimestamps: WordTimestamp[];
      let durationMs: number;

      if (alignment && alignment.characters.length > 0) {
        wordTimestamps = this.deriveWordTimestamps(text, alignment);
        durationMs = alignment.character_end_times_seconds[
          alignment.character_end_times_seconds.length - 1
        ] * 1000;
      } else {
        // Alignment missing — estimate uniformly from audio size
        console.warn('[TTS] No alignment data, using uniform estimation');
        const words = text.split(/\s+/);
        const estimatedDurationMs = (audioData.length / (128 * 1000 / 8)) * 1000;
        const avgWordDuration = estimatedDurationMs / Math.max(words.length, 1);
        wordTimestamps = words.map((word, i) => ({
          word,
          start: i * avgWordDuration,
          end: (i + 1) * avgWordDuration,
        }));
        durationMs = estimatedDurationMs;
      }

      console.log(`[TTS] Generated ${audioData.length} bytes with real timestamps (${Math.round(durationMs)}ms, ${wordTimestamps.length} words)`);
      return { audioData, wordTimestamps, durationMs };
    } catch (err: any) {
      console.error('[TTS] ElevenLabs error:', err.message);
      return this.fallbackTimestamps(text);
    }
  }

  // ── Derive word-level timestamps from character alignment ──
  private deriveWordTimestamps(
    text: string,
    alignment: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    },
  ): WordTimestamp[] {
    const words = text.split(/\s+/);
    const timestamps: WordTimestamp[] = [];
    let charIdx = 0;

    for (const word of words) {
      // Skip whitespace/space characters in alignment
      while (
        charIdx < alignment.characters.length &&
        alignment.characters[charIdx].trim() === ''
      ) {
        charIdx++;
      }

      if (charIdx >= alignment.characters.length) break;

      const startTime = alignment.character_start_times_seconds[charIdx] * 1000;

      // Advance through this word's characters
      const lastCharIdx = Math.min(charIdx + word.length - 1, alignment.characters.length - 1);
      const endTime = alignment.character_end_times_seconds[lastCharIdx] * 1000;

      timestamps.push({ word, start: startTime, end: endTime });
      charIdx = lastCharIdx + 1;
    }

    return timestamps;
  }

  private fallbackTimestamps(text: string): { audioData: Buffer; wordTimestamps: WordTimestamp[]; durationMs: number } {
    const words = text.split(/\s+/);
    const avgWordDuration = 300;
    const durationMs = words.length * avgWordDuration;
    const wordTimestamps: WordTimestamp[] = words.map((word, i) => ({
      word,
      start: i * avgWordDuration,
      end: (i + 1) * avgWordDuration,
    }));
    return { audioData: Buffer.alloc(0), wordTimestamps, durationMs };
  }

  // ── Voice Activity Detection Config ──────────────────────
  getVADConfig(): {
    sampleRate: number;
    frameSizeMs: number;
    silenceThresholdMs: number;
    speechThresholdMs: number;
  } {
    return {
      sampleRate: 16000,
      frameSizeMs: 30,
      silenceThresholdMs: 800,   // 800ms silence = end of utterance
      speechThresholdMs: 200,    // 200ms of speech = valid utterance
    };
  }
}
