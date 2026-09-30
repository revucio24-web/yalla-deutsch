import { useState } from 'react';
import { canSpeak, speakGerman, stopSpeaking } from './audio';
import { dialogScenarios } from './dialogTrainer';
import type { DialogScenario, DialogTrainerProgress } from './dialogTrainer';
import './dialog-trainer.css';

type Props = {
  hints: boolean;
  sound: boolean;
  progress: DialogTrainerProgress;
  onRecordAttempt: (scenarioId: string, score: number) => void;
};
type Feedback = { correct: boolean; text: string };

function AudioButton({ text, enabled }: { text: string; enabled: boolean }) {
  return <button
    className="dialog-audio-btn"
    type="button"
    disabled={!enabled || !canSpeak()}
    onClick={() => speakGerman(text, enabled)}
    aria-label={`Deutsch anhören: ${text}`}
    title="Deutsch anhören"
    lang="de"
  >♪</button>;
}

export default function DialogTrainer({ hints, sound, progress, onRecordAttempt }: Props) {
  const [view, setView] = useState<'list' | 'play' | 'result'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [earned, setEarned] = useState<number[]>([]);
  const [madeMistake, setMadeMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastScore, setLastScore] = useState(0);
  const scenario = dialogScenarios.find((item) => item.id === activeId) ?? null;
  const turn = scenario?.turns[turnIndex];
  const totalPoints = dialogScenarios.reduce((sum, item) => sum + (progress[item.id]?.bestScore ?? 0), 0);
  const completedCount = dialogScenarios.filter((item) => progress[item.id]?.completed).length;

  const startScenario = (item: DialogScenario) => {
    stopSpeaking();
    setActiveId(item.id);
    setTurnIndex(0);
    setEarned([]);
    setMadeMistake(false);
    setSolved(false);
    setFeedback(null);
    setLastScore(0);
    setView('play');
  };

  const returnToList = () => {
    stopSpeaking();
    setView('list');
    setActiveId(null);
  };

  const answer = (choiceId: string) => {
    if (!scenario || !turn || solved) return;
    const choice = turn.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    speakGerman(choice.text, sound);
    if (choice.id === turn.answerId) {
      if (!madeMistake) setEarned((current) => current.includes(turnIndex) ? current : [...current, turnIndex]);
      setSolved(true);
      setFeedback({ correct: true, text: `ممتاز! ${choice.translationAr}` });
      return;
    }
    const correctChoice = turn.choices.find((item) => item.id === turn.answerId);
    setMadeMistake(true);
    setFeedback({
      correct: false,
      text: correctChoice
        ? `ليس هذا الرد الأنسب. جرّب مرة أخرى. الأنسب: ${correctChoice.text} · ${correctChoice.translationAr}`
        : 'حاول مرة أخرى.',
    });
  };

  const advance = () => {
    if (!scenario) return;
    stopSpeaking();
    if (turnIndex === scenario.turns.length - 1) {
      const score = earned.length;
      setLastScore(score);
      onRecordAttempt(scenario.id, score);
      setView('result');
      return;
    }
    setTurnIndex((index) => index + 1);
    setMadeMistake(false);
    setSolved(false);
    setFeedback(null);
  };

  if (view === 'play' && scenario && turn) {
    const step = turnIndex + 1;
    return <div className="page dialog-page">
      <div className="dialog-page-top">
        <div>
          <span className="eyebrow" lang="de">DIALOGTRAINER · {scenario.level}</span>
          <h1 lang="de">{scenario.title}</h1>
          <p lang="ar">تحدّث خطوةً خطوة. اختر الرد الأنسب للموقف.</p>
        </div>
        <button className="dialog-secondary-btn" type="button" onClick={returnToList}>← <span lang="ar">كل الحوارات</span></button>
      </div>
      <section className="dialog-session-card" aria-label="Dialog üben">
        <div className="dialog-session-head">
          <span className="dialog-step-label" lang="de">SCHRITT {step} / {scenario.turns.length}</span>
          <span className="dialog-session-score" lang="de">✦ {earned.length} Punkte</span>
        </div>
        <div className="dialog-progress-track" role="progressbar" aria-label="Dialogfortschritt" lang="de" aria-valuenow={Math.round(step / scenario.turns.length * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${step / scenario.turns.length * 100}%` }} />
        </div>
        <div className="dialog-conversation">
          <div className="dialog-bubble dialog-bubble--other">
            <span className="dialog-speaker">{scenario.icon} {turn.speaker}</span>
            <div className="dialog-bubble-line">
              <p dir="ltr" lang="de">{turn.prompt}</p>
              <AudioButton text={turn.prompt} enabled={sound} />
            </div>
            {hints && <small lang="ar">{turn.promptAr}</small>}
          </div>
          {solved && <div className="dialog-bubble dialog-bubble--learner">
            <span className="dialog-speaker" lang="ar">أنت</span>
            <p dir="ltr" lang="de">{turn.choices.find((choice) => choice.id === turn.answerId)?.text}</p>
          </div>}
        </div>
        <div className="dialog-answer-heading">
          <div><span className="eyebrow" lang="de">DEINE ANTWORT</span><h2 lang="ar">ماذا تقول؟</h2></div>
          <span lang="ar" className="dialog-hint-label">{hints ? 'الترجمة ظاهرة' : 'فعّل المساعدة من الإعدادات'}</span>
        </div>
        <div className="dialog-choice-list">
          {turn.choices.map((choice) => <div className="dialog-choice-row" key={choice.id}>
            <button
              className={`dialog-choice ${solved && choice.id === turn.answerId ? 'is-correct' : ''}`}
              type="button"
              disabled={solved}
              onClick={() => answer(choice.id)}
            >
              <span className="dialog-choice-copy"><b dir="ltr" lang="de">{choice.text}</b>{hints && <small lang="ar">{choice.translationAr}</small>}</span>
            </button>
            <AudioButton text={choice.text} enabled={sound} />
          </div>)}
        </div>
        <div className={`dialog-feedback ${feedback?.correct ? 'is-correct' : 'is-try-again'}`} role="status" aria-live="polite">
          {feedback?.text ?? ' '}
        </div>
        {solved && <button className="primary-btn dialog-next-btn" type="button" onClick={advance}>
          <span lang="ar">{step === scenario.turns.length ? 'النتيجة' : 'التالي'}</span> · <span lang="de">{step === scenario.turns.length ? 'Ergebnis' : 'Weiter'}</span> <span aria-hidden="true">←</span>
        </button>}
      </section>
      <p className="dialog-offline-note" lang="ar">تُحفظ نقاطك على هذا الجهاز فقط. الحوارات متاحة دون اتصال بالإنترنت.</p>
    </div>;
  }

  if (view === 'result' && scenario) {
    const previous = progress[scenario.id];
    const bestScore = Math.max(previous?.bestScore ?? 0, lastScore);
    return <div className="page dialog-page">
      <div className="dialog-page-top"><div><span className="eyebrow" lang="de">DIALOGTRAINER · {scenario.level}</span><h1 lang="de">{scenario.title}</h1></div>
        <button className="dialog-secondary-btn" type="button" onClick={returnToList}>← <span lang="ar">كل الحوارات</span></button>
      </div>
      <section className="dialog-result-card" aria-live="polite">
        <span className="dialog-result-icon" aria-hidden="true">{lastScore === scenario.turns.length ? '✦' : '↗'}</span>
        <span className="eyebrow" lang="de">{lastScore === scenario.turns.length ? 'SEHR GUT!' : 'DIALOG GESCHAFFT'}</span>
        <h2 lang="ar">{lastScore === scenario.turns.length ? 'أحسنت! حوار رائع.' : 'أكملت الحوار، واصل التدرّب!'}</h2>
        <p dir="ltr" lang="de">Dein Ergebnis: <b>{lastScore} / {scenario.turns.length} Punkte</b></p>
        <div className="dialog-result-stats" lang="de"><span>Bestwert <b>{bestScore}/{scenario.turns.length}</b></span><span>Versuche <b>{(previous?.attempts ?? 0) + 1}</b></span></div>
        <button className="primary-btn" type="button" onClick={() => startScenario(scenario)}>Dialog noch einmal spielen <span aria-hidden="true">↻</span></button>
        <button className="dialog-secondary-btn" type="button" onClick={returnToList}>← <span lang="ar">اختر حواراً آخر</span></button>
      </section>
    </div>;
  }

  return <div className="page dialog-page">
    <div className="page-heading">
      <span className="eyebrow" lang="de">SPRECHEN · A1–A2</span>
      <h1 lang="ar">تدرّب على الحوار</h1>
      <p lang="ar">مواقف يومية قصيرة، مع ردود ألمانية وترجمتها العربية. اختر جواباً واستمع إلى نطقه.</p>
    </div>
    <section className="dialog-overview" aria-label="Dialogtrainer-Fortschritt">
      <div className="dialog-overview-stat"><span aria-hidden="true">✦</span><div><b>{totalPoints}</b><small lang="ar">نقطة محفوظة · <span lang="de">Punkte</span></small></div></div>
      <div className="dialog-overview-stat"><span aria-hidden="true">✓</span><div><b>{completedCount} / {dialogScenarios.length}</b><small lang="ar">حوارات مكتملة · <span lang="de">fertig</span></small></div></div>
      <p lang="ar">حفظ محلي على هذا الجهاز، ويمكنك اللعب دون اتصال.</p>
    </section>
    <div className="dialog-scenario-grid">
      {dialogScenarios.map((item) => {
        const saved = progress[item.id];
        const completed = Boolean(saved?.completed);
        return <article className="dialog-scenario-card" key={item.id}>
          <div className="dialog-scenario-top"><span className="dialog-scenario-icon" aria-hidden="true">{item.icon}</span><span className="dialog-level" lang="de">{item.level}</span></div>
          <h2 dir="ltr" lang="de">{item.title}</h2>
          <h3 lang="ar">{item.titleAr}</h3>
          <p dir="ltr" lang="de">{item.description}</p>
          <p lang="ar">{item.descriptionAr}</p>
          {saved && <div className="dialog-saved-progress">
            <div><span lang="ar">أفضل نتيجة · <span lang="de">Bestwert</span></span><b lang="de">{saved.bestScore} / {item.turns.length}</b></div>
            <div className="dialog-progress-track" role="progressbar" aria-label={`${item.title}: ${saved.bestScore} von ${item.turns.length} Punkten`} lang="de" aria-valuenow={Math.round(saved.bestScore / item.turns.length * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${saved.bestScore / item.turns.length * 100}%` }} /></div>
            <small lang="ar">{saved.attempts} محاولة · <span lang="de">{saved.attempts} {saved.attempts === 1 ? 'Versuch' : 'Versuche'}</span></small>
          </div>}
          <button className="primary-btn dialog-start-btn" type="button" onClick={() => startScenario(item)}>
            <span lang="ar">{completed ? 'العب من جديد' : 'ابدأ الحوار'}</span> · <span lang="de">{completed ? 'Nochmal' : 'Starten'}</span> <span aria-hidden="true">←</span>
          </button>
        </article>;
      })}
    </div>
    <p className="dialog-offline-note" lang="ar">النقاط والتقدم يُحفظان محلياً في التطبيق ولا يحتاجان إلى حساب أو اتصال بخدمة خارجية.</p>
  </div>;
}
