import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  germanWordText,
  prewarmSpeechVoices,
  selectGermanVoice,
  speakGerman,
  speechFeedbackCopy,
  stopSpeaking,
  subscribeSpeechFeedback,
} from './audio';
import type { SpeechFeedbackKind } from './audio';

class TestUtterance {
  text: string;
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) { this.text = text; }
}

function voice(lang: string, isDefault = false): SpeechSynthesisVoice {
  return { lang, default: isDefault, name: `${lang} voice` } as SpeechSynthesisVoice;
}

function mockSpeech(voices: SpeechSynthesisVoice[] = []) {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const speak = vi.fn<(utterance: SpeechSynthesisUtterance) => void>();
  const cancel = vi.fn();
  const synthesis = {
    getVoices: vi.fn(() => voices),
    speak,
    cancel,
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
  } as unknown as SpeechSynthesis;
  vi.stubGlobal('window', { speechSynthesis: synthesis });
  vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance);
  return {
    synthesis,
    speak,
    cancel,
    setVoices(next: SpeechSynthesisVoice[]) { voices = next; },
    fireVoicesChanged() {
      const listener = listeners.get('voiceschanged');
      if (typeof listener === 'function') listener(new Event('voiceschanged'));
      else listener?.handleEvent(new Event('voiceschanged'));
    },
  };
}

function collectFeedback() {
  const kinds: SpeechFeedbackKind[] = [];
  const unsubscribe = subscribeSpeechFeedback(({ kind }) => kinds.push(kind));
  return { kinds, unsubscribe };
}

afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('German pronunciation', () => {
  it('keeps the existing German text helper behavior', () => {
    expect(germanWordText('Haus', 'das')).toBe('das Haus');
    expect(germanWordText('Hallo')).toBe('Hallo');
    expect(germanWordText('  bitte  ', '  ')).toBe('bitte');
  });

  it('speaks synchronously with the preferred available German voice', () => {
    const germanVoice = voice('de-DE');
    const mock = mockSpeech([voice('en-US'), germanVoice]);

    expect(speakGerman('das Haus')).toBe(true);
    expect(mock.cancel).toHaveBeenCalledOnce();
    expect(mock.speak).toHaveBeenCalledOnce();
    const spoken = mock.speak.mock.calls[0]?.[0] as unknown as TestUtterance;
    expect(spoken.text).toBe('das Haus');
    expect(spoken.lang).toBe('de-DE');
    expect(spoken.rate).toBe(0.86);
    expect(spoken.voice).toBe(germanVoice);
  });

  it('prefers de-DE, then the closest German regional variant', () => {
    const swiss = voice('de-CH', true);
    const austria = voice('de-AT');
    const germany = voice('de-DE');
    expect(selectGermanVoice([swiss, austria, germany])).toBe(germany);
    expect(selectGermanVoice([swiss, austria])).toBe(austria);
  });

  it('prewarms voices and waits for voiceschanged without speaking outside the tap', () => {
    vi.useFakeTimers();
    const mock = mockSpeech();
    const feedback = collectFeedback();
    prewarmSpeechVoices();
    expect(mock.synthesis.addEventListener).toHaveBeenCalledOnce();
    expect(speakGerman('Guten Tag')).toBe(false);
    expect(mock.speak).not.toHaveBeenCalled();

    const germanVoice = voice('de-DE');
    mock.setVoices([germanVoice]);
    mock.fireVoicesChanged();
    expect(feedback.kinds).toEqual(['voice-ready']);
    vi.advanceTimersByTime(2_000);
    expect(mock.speak).not.toHaveBeenCalled();

    expect(speakGerman('Guten Tag')).toBe(true);
    expect(mock.speak).toHaveBeenCalledOnce();
    feedback.unsubscribe();
  });

  it('reports missing voices after a bounded timeout, and cancels that timer on stop', () => {
    vi.useFakeTimers();
    const mock = mockSpeech();
    const feedback = collectFeedback();
    expect(speakGerman('Hallo')).toBe(false);
    expect(mock.speak).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_499);
    expect(feedback.kinds).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(feedback.kinds).toEqual(['no-voice']);
    expect(speechFeedbackCopy['no-voice'].german).toContain('Sprachdaten');
    expect(speechFeedbackCopy['no-voice'].arabic).toContain('بيانات صوت ألماني');

    expect(speakGerman('Noch einmal')).toBe(false);
    stopSpeaking();
    vi.advanceTimersByTime(2_000);
    expect(feedback.kinds).toEqual(['no-voice']);
    feedback.unsubscribe();
  });

  it('reports a synthesis utterance error once, but ignores expected cancellation events', () => {
    const mock = mockSpeech([voice('de-DE')]);
    const feedback = collectFeedback();
    expect(speakGerman('Hallo')).toBe(true);
    const utterance = mock.speak.mock.calls[0]?.[0] as unknown as TestUtterance;
    utterance.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    utterance.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    expect(feedback.kinds).toEqual(['synthesis-error']);
    expect(speechFeedbackCopy['synthesis-error'].german).toContain('fehlgeschlagen');
    feedback.unsubscribe();
  });

  it('prevents duplicate queued speech on repeated taps and ignores stale cancellation/errors', () => {
    const mock = mockSpeech([voice('de-DE')]);
    const feedback = collectFeedback();
    expect(speakGerman('Eins')).toBe(true);
    const first = mock.speak.mock.calls[0]?.[0] as unknown as TestUtterance;
    expect(speakGerman('Zwei')).toBe(true);
    const second = mock.speak.mock.calls[1]?.[0] as unknown as TestUtterance;
    expect(mock.cancel).toHaveBeenCalledTimes(2);
    expect(mock.speak).toHaveBeenCalledTimes(2);

    first.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent);
    first.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    expect(feedback.kinds).toEqual([]);
    second.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    expect(feedback.kinds).toEqual(['synthesis-error']);
    feedback.unsubscribe();
  });

  it('preserves the enabled flag and reports unsupported speech instead of claiming playback', () => {
    const mock = mockSpeech([voice('de-DE')]);
    const feedback = collectFeedback();
    expect(speakGerman('Hallo', false)).toBe(false);
    expect(mock.speak).not.toHaveBeenCalled();

    vi.stubGlobal('window', {});
    expect(speakGerman('Hallo')).toBe(false);
    expect(feedback.kinds).toEqual(['no-voice']);
    feedback.unsubscribe();
  });
});
