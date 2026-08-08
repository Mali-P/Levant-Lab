import { describe, expect, it } from 'vitest';
import {
  geminiAudioPart,
  geminiPrompt,
  pcmSampleRate,
  retryDelayMs,
  TtsError,
  wavFromPcm,
} from './providers';

describe('geminiPrompt', () => {
  const style = 'Say it in Palestinian Arabic. Read only the words themselves:';

  it('keeps the word last so nothing trails it to be read aloud', () => {
    expect(geminiPrompt(style, 'تنين', 'tnēn').endsWith('تنين')).toBe(true);
  });

  // The whole reason the romanisation is sent: undiacritized تنين leaves the
  // vowels open, and the model was closing them with a syllable that is not
  // there — "tantina" for tnēn.
  it('constrains the vowels to the romanisation the deck already knows', () => {
    const prompt = geminiPrompt(style, 'تنين', 'tnēn');
    expect(prompt).toContain('"tnēn"');
    expect(prompt).toContain('add no vowel or syllable');
  });

  it('leaves exactly one colon between the direction and the word', () => {
    expect(geminiPrompt(style, 'تنين', 'tnēn')).toContain('word.:\n\nتنين');
    expect(geminiPrompt(style, 'تنين')).toBe(
      'Say it in Palestinian Arabic. Read only the words themselves:\n\nتنين',
    );
  });

  it('adds no guidance when the deck has no romanisation to give', () => {
    for (const missing of [undefined, '', '   ']) {
      expect(geminiPrompt(style, 'تنين', missing)).not.toContain('romanisation');
    }
  });
});

describe('retryDelayMs', () => {
  // Google says when the per-minute window reopens; guessing means either
  // hammering the quota or idling past it.
  it('waits as long as the 429 body asks, plus slack for the boundary', () => {
    expect(retryDelayMs('{"retryDelay": "49s"}', 0)).toBe(50_000);
    expect(retryDelayMs('{"retryDelay":"49.501396553s"}', 0)).toBeCloseTo(50_501.4, 0);
  });

  it('backs off exponentially when the body carries no hint', () => {
    expect(retryDelayMs('{}', 0)).toBe(5000);
    expect(retryDelayMs('{}', 1)).toBe(10_000);
    expect(retryDelayMs('{}', 2)).toBe(20_000);
  });

  // A bad or hostile retryDelay must not park the run for an hour.
  it('never waits longer than the ceiling', () => {
    expect(retryDelayMs('{"retryDelay": "3600s"}', 0)).toBe(90_000);
    expect(retryDelayMs('{}', 99)).toBe(90_000);
  });
});

describe('pcmSampleRate', () => {
  it('reads the rate Gemini declares', () => {
    expect(pcmSampleRate('audio/L16;codec=pcm;rate=24000')).toBe(24000);
    expect(pcmSampleRate('audio/L16;codec=pcm;rate=16000')).toBe(16000);
  });

  // A wrong rate does not fail, it detunes: the clip plays at the wrong pitch
  // and speed. So an unreadable header falls back to Gemini's documented rate
  // rather than to something arbitrary.
  it('falls back to 24 kHz when the header names no usable rate', () => {
    expect(pcmSampleRate('audio/L16;codec=pcm')).toBe(24000);
    expect(pcmSampleRate('audio/L16;rate=abc')).toBe(24000);
    expect(pcmSampleRate('')).toBe(24000);
  });
});

describe('wavFromPcm', () => {
  const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  it('describes the samples so nothing downstream has to be told the format', () => {
    const wav = wavFromPcm(pcm, 24000);

    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(wav.subarray(36, 40).toString('ascii')).toBe('data');
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(28)).toBe(48000); // byte rate, 16-bit mono
    expect(wav.readUInt16LE(32)).toBe(2); // block align
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
  });

  it('states both lengths and keeps every sample', () => {
    const wav = wavFromPcm(pcm, 24000);

    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length);
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.subarray(44)).toEqual(pcm);
  });
});

describe('geminiAudioPart', () => {
  it('finds the audio however many parts precede it', () => {
    const audio = geminiAudioPart({
      candidates: [
        {
          content: {
            parts: [
              { text: '' },
              { inlineData: { mimeType: 'audio/L16;rate=24000', data: 'AQID' } },
            ],
          },
        },
      ],
    });

    expect(audio).toEqual({ mimeType: 'audio/L16;rate=24000', data: 'AQID' });
  });

  // Each no-audio case says what actually came back. "No audio" on its own
  // leaves whoever reads the report with nothing to act on.
  it('reports a safety block by its reason', () => {
    expect(() =>
      geminiAudioPart({ candidates: [{}], promptFeedback: { blockReason: 'SAFETY' } }),
    ).toThrow(/blocked the request: SAFETY/);
  });

  it('quotes the model when it answers in words instead of speech', () => {
    expect(() =>
      geminiAudioPart({
        candidates: [{ content: { parts: [{ text: 'I cannot say that.' }] } }],
      }),
    ).toThrow(/answered in text instead of audio: I cannot say that\./);
  });

  it('names the finish reason when there is nothing else to go on', () => {
    expect(() => geminiAudioPart({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toThrow(
      /no audio \(finishReason: MAX_TOKENS\)/,
    );
    expect(() => geminiAudioPart({})).toThrow(TtsError);
  });
});
