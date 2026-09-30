export type SpeechFeedbackKind = 'no-voice' | 'voice-ready' | 'synthesis-error';
export type SpeechFeedback = { kind: SpeechFeedbackKind };
type SpeechFeedbackListener = (feedback: SpeechFeedback) => void;

const VOICE_LOAD_TIMEOUT_MS = 1_500;
const feedbackListeners = new Set<SpeechFeedbackListener>();
let trackedSynthesis: SpeechSynthesis | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesChangedHandler: EventListener | null = null;
let activeRequestId = 0;
let waitingForVoiceRequest: number | null = null;
let voiceLoadTimer: ReturnType<typeof setTimeout> | undefined;
let feedbackSentForRequest: number | null = null;

export const speechFeedbackCopy: Record<SpeechFeedbackKind, { arabic: string; german: string }> = {
  'no-voice': {
    arabic: 'لا تتوفر خدمة تحويل النص إلى كلام أو صوت ألماني. افتح إعدادات الجهاز > تحويل النص إلى كلام، واختر محركاً وثبّت بيانات صوت ألماني، ثم اضغط للاستماع مجدداً.',
    german: 'Die System-Sprachausgabe oder eine deutsche Stimme ist nicht verfügbar. Öffne in den Geräteeinstellungen „Text-in-Sprache“, wähle eine TTS-Engine und installiere deutsche Sprachdaten. Tippe danach erneut auf „Anhören“.',
  },
  'voice-ready': {
    arabic: 'أصبحت الأصوات متاحة الآن. اضغط زر الاستماع مرة أخرى لبدء النطق.',
    german: 'Sprachstimmen sind jetzt bereit. Tippe erneut auf „Anhören“, um die Wiedergabe zu starten.',
  },
  'synthesis-error': {
    arabic: 'تعذّر تشغيل النطق. تحقّق من إعدادات الصوت ومحرك تحويل النص إلى كلام على الجهاز، ثم حاول مرة أخرى.',
    german: 'Die Sprachausgabe ist fehlgeschlagen. Prüfe die Geräte-Lautstärke und die Text-in-Sprache-Einstellungen, dann versuche es erneut.',
  },
};

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function getVoices(synthesis: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    return synthesis.getVoices();
  } catch {
    return [];
  }
}

export function selectGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const germanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('de-') || voice.lang.toLowerCase() === 'de');
  const score = (voice: SpeechSynthesisVoice): number => {
    const language = voice.lang.toLowerCase();
    const localePreference = language === 'de-de' ? 0 : language === 'de-at' ? 1 : language === 'de-ch' ? 2 : 3;
    return localePreference * 2 + (voice.default ? 0 : 1);
  };
  return germanVoices.sort((left, right) => score(left) - score(right))[0];
}

function emitFeedback(kind: SpeechFeedbackKind): void {
  const feedback = { kind };
  feedbackListeners.forEach((listener) => listener(feedback));
}

function clearVoiceLoadTimer(): void {
  if (voiceLoadTimer !== undefined) {
    clearTimeout(voiceLoadTimer);
    voiceLoadTimer = undefined;
  }
}

function refreshVoices(synthesis: SpeechSynthesis): SpeechSynthesisVoice[] {
  const available = getVoices(synthesis);
  if (available.length > 0) cachedVoices = available;
  return available.length > 0 ? available : cachedVoices;
}

function ensureVoiceTracking(synthesis: SpeechSynthesis): SpeechSynthesisVoice[] {
  if (trackedSynthesis !== synthesis) {
    if (trackedSynthesis && voicesChangedHandler) {
      trackedSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
    }
    trackedSynthesis = synthesis;
    cachedVoices = [];
    voicesChangedHandler = () => {
      const voices = refreshVoices(synthesis);
      const waitingRequest = waitingForVoiceRequest;
      if (waitingRequest !== null && waitingRequest === activeRequestId && selectGermanVoice(voices)) {
        waitingForVoiceRequest = null;
        clearVoiceLoadTimer();
        emitFeedback('voice-ready');
      }
    };
    synthesis.addEventListener('voiceschanged', voicesChangedHandler);
  }
  return refreshVoices(synthesis);
}

/** Prewarm the platform voice list and keep it fresh as the browser loads voices. */
export function prewarmSpeechVoices(): void {
  if (!canSpeak()) return;
  ensureVoiceTracking(window.speechSynthesis);
}

export function subscribeSpeechFeedback(listener: SpeechFeedbackListener): () => void {
  feedbackListeners.add(listener);
  return () => feedbackListeners.delete(listener);
}

export function stopSpeaking(): void {
  activeRequestId += 1;
  waitingForVoiceRequest = null;
  clearVoiceLoadTimer();
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function germanWordText(german: string, article?: string | null): string {
  return [article?.trim(), german.trim()].filter(Boolean).join(' ');
}

/**
 * Schedules speech synchronously from the caller's gesture. If voices are still
 * loading, it asks the learner to tap again once ready rather than speaking later
 * outside Android/WebView user activation.
 */
export function speakGerman(text: string, enabled = true): boolean {
  if (!enabled) return false;

  const requestId = ++activeRequestId;
  feedbackSentForRequest = null;
  waitingForVoiceRequest = null;
  clearVoiceLoadTimer();

  if (!canSpeak()) {
    feedbackSentForRequest = requestId;
    emitFeedback('no-voice');
    return false;
  }

  const synthesis = window.speechSynthesis;
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = ensureVoiceTracking(synthesis);
    synthesis.cancel();
  } catch {
    feedbackSentForRequest = requestId;
    emitFeedback('synthesis-error');
    return false;
  }

  const voice = selectGermanVoice(voices);
  if (!voice) {
    waitingForVoiceRequest = requestId;
    voiceLoadTimer = setTimeout(() => {
      voiceLoadTimer = undefined;
      if (waitingForVoiceRequest !== requestId || activeRequestId !== requestId) return;
      waitingForVoiceRequest = null;
      feedbackSentForRequest = requestId;
      emitFeedback('no-voice');
    }, VOICE_LOAD_TIMEOUT_MS);
    return false;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.86;
    utterance.voice = voice;
    utterance.onerror = (event) => {
      if (activeRequestId !== requestId || feedbackSentForRequest === requestId) return;
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      feedbackSentForRequest = requestId;
      emitFeedback('synthesis-error');
    };
    synthesis.speak(utterance);
    return true;
  } catch {
    if (activeRequestId === requestId && feedbackSentForRequest !== requestId) {
      feedbackSentForRequest = requestId;
      emitFeedback('synthesis-error');
    }
    return false;
  }
}
