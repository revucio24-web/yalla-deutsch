import { useEffect, useState } from 'react';
import { prewarmSpeechVoices, speechFeedbackCopy, subscribeSpeechFeedback } from './audio';
import type { SpeechFeedbackKind } from './audio';

export default function SpeechFeedback() {
  const [kind, setKind] = useState<SpeechFeedbackKind | null>(null);

  useEffect(() => {
    prewarmSpeechVoices();
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeSpeechFeedback((feedback) => {
      if (dismissTimer !== undefined) clearTimeout(dismissTimer);
      setKind(feedback.kind);
      dismissTimer = setTimeout(() => {
        dismissTimer = undefined;
        setKind(null);
      }, 12_000);
    });
    return () => {
      unsubscribe();
      if (dismissTimer !== undefined) clearTimeout(dismissTimer);
    };
  }, []);

  if (!kind) return null;
  const copy = speechFeedbackCopy[kind];
  return <div className="audio-feedback-toast" role="status" aria-live="polite" aria-atomic="true">
    <p lang="ar" dir="rtl">{copy.arabic}</p>
    <p lang="de" dir="ltr">{copy.german}</p>
  </div>;
}
