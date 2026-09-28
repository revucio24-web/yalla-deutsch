import { afterEach, describe, expect, it, vi } from 'vitest';
import { germanWordText, speakGerman } from './audio';

describe('German pronunciation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds natural German text with an optional article', () => {
    expect(germanWordText('Haus', 'das')).toBe('das Haus');
    expect(germanWordText('Hallo')).toBe('Hallo');
  });

  it('uses an available German device voice', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const germanVoice = { lang: 'de-DE' } as SpeechSynthesisVoice;
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel,
        speak,
        getVoices: () => [{ lang: 'en-US' }, germanVoice],
      },
    });
    class Utterance {
      text: string;
      lang = '';
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      constructor(text: string) { this.text = text; }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);

    expect(speakGerman('das Haus')).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledOnce();
    const spoken = speak.mock.calls[0][0] as Utterance;
    expect(spoken.text).toBe('das Haus');
    expect(spoken.lang).toBe('de-DE');
    expect(spoken.voice).toBe(germanVoice);
  });
});
