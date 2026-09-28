import { useState } from 'react';
import { canSpeak, speakGerman, stopSpeaking } from './audio';
import { createTasks, lessonWords } from './domain';
import type { Lesson, Settings, Task, Word } from './domain';

type Props = {
  lesson: Lesson; settings: Settings; showTranslations: boolean;
  onExit: () => void; onFinish: (firstTryCount: number) => void;
};

function AudioButton({ text, enabled }: { text: string; enabled: boolean }) {
  return <button className="audio-btn" type="button" disabled={!enabled || !canSpeak()}
    onClick={() => speakGerman(text, enabled)} aria-label={`Deutsch anhören: ${text}`} title="Deutsch anhören">♪</button>;
}

function wordLabel(word: Word) { return `${word.article ? `${word.article} ` : ''}${word.german}`; }

export default function MissionView({ lesson, settings, showTranslations, onExit, onFinish }: Props) {
  const [tasks] = useState(() => createTasks(lesson, Math.floor(Math.random() * 2 ** 31)));
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [madeMistake, setMadeMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedGerman, setSelectedGerman] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [sentenceIndexes, setSentenceIndexes] = useState<number[]>([]);
  const [basket, setBasket] = useState<string[]>([]);
  const task = tasks[index];
  const words = lessonWords(lesson);
  const buildTokens = task.buildTokens;

  const succeed = () => {
    if (solved) return;
    if (!madeMistake) setFirstTry((count) => count + 1);
    setSolved(true);
    setFeedback('أحسنت! Richtig.');
  };
  const miss = () => { setMadeMistake(true); setFeedback('حاول مرة أخرى · Versuch es noch einmal.'); };
  const judge = (correct: boolean) => { if (correct) succeed(); else miss(); };
  const advance = () => {
    stopSpeaking();
    if (index === tasks.length - 1) { onFinish(firstTry); return; }
    setIndex(index + 1); setMadeMistake(false); setSolved(false); setFeedback('');
    setSelectedGerman(null); setMatched([]); setSentenceIndexes([]); setBasket([]);
  };
  const matchArabic = (word: Word) => {
    if (!selectedGerman || matched.includes(word.id) || solved) return;
    if (selectedGerman !== word.id) { miss(); setSelectedGerman(null); return; }
    const next = [...matched, word.id];
    setMatched(next); setSelectedGerman(null); setFeedback('صحيح · Richtig.');
    if (next.length === task.pairWords.length) succeed();
  };

  const prompt = (type: Task['type']) => ({
    choice: 'اختر الكلمة الألمانية الصحيحة', symbol: 'اختر الرمز المناسب',
    listen: 'استمع ثم اختر الكلمة', match: 'صل الكلمات بمعانيها',
    build: 'رتّب الكلمات لتكوين جملة', blank: 'أكمل الجملة',
    dialogue: 'اختر الرد المناسب', basket: 'ضع المطلوب في السلة',
  })[type];
  const basketTargets = words.slice(0, 3);

  return <div className="mission-shell">
    <header className="mission-header">
      <button className="close-btn" type="button" onClick={() => { stopSpeaking(); onExit(); }} aria-label="Mission verlassen">×</button>
      <div className="mission-progress"><div className="mission-progress-copy"><span>{lesson.titleAr}</span><span dir="ltr">{index + 1} / {tasks.length}</span></div><div className="progress-track"><span style={{ width: `${(index + 1) / tasks.length * 100}%` }} /></div></div>
      <span className="mission-chapter" dir="ltr">{lesson.titleDe}</span>
    </header>
    <div className="mission-layout">
      <aside className="guide-card"><div className="guide-avatar">ن</div><strong>نور</strong><p>كل خطوة تقرّبك من هدفك. خذ وقتك!</p><div className="guide-tip"><span>✦</span> {prompt(task.type)}</div></aside>
      <section className="task-card" aria-live="polite">
        <div className="task-meta"><span className="task-number">AUFGABE {index + 1}</span><span className="task-type">{task.type.toUpperCase()}</span></div>
        <h1>{prompt(task.type)}</h1>

        {task.type === 'choice' && <><p className="task-context">ما معنى هذه الكلمة بالألمانية؟</p><div className="stimulus" lang="ar">{task.word.arabic}</div><div className="option-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => judge(option.id === task.word.id)} className="option"><span dir="ltr">{wordLabel(option)}</span></button>)}</div></>}

        {task.type === 'symbol' && <><p className="task-context">أي رمز يمثّل هذه الكلمة؟</p><div className="stimulus" lang="de" dir="ltr">{wordLabel(task.word)}</div><div className="option-grid symbol-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => judge(option.id === task.word.id)} className="option symbol-option"><span aria-hidden="true">{option.icon}</span><small lang="ar">{showTranslations ? option.arabic : '●'}</small></button>)}</div></>}

        {task.type === 'listen' && <><p className="task-context">استمع إلى الكلمة، ثم اختر ما سمعته.</p><div className="listen-stimulus"><AudioButton text={wordLabel(task.word)} enabled={settings.sound} /><span>HÖREN</span></div>{(!settings.sound || !canSpeak()) && <p className="audio-note">الصوت غير متاح حالياً. الكلمة: <b dir="ltr">{wordLabel(task.word)}</b></p>}<div className="option-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => judge(option.id === task.word.id)} className="option" dir="ltr">{wordLabel(option)}</button>)}</div></>}

        {task.type === 'match' && <><p className="task-context">اختر كلمة ألمانية، ثم معناها العربي.</p><div className="match-columns"><div>{task.pairWords.map((word) => <button key={word.id} disabled={matched.includes(word.id) || solved} className={`match-option ${selectedGerman === word.id ? 'selected' : ''} ${matched.includes(word.id) ? 'matched' : ''}`} dir="ltr" onClick={() => setSelectedGerman(word.id)}>{wordLabel(word)}</button>)}</div><div>{[...task.pairWords].reverse().map((word) => <button key={word.id} disabled={matched.includes(word.id) || solved} className={`match-option ${matched.includes(word.id) ? 'matched' : ''}`} onClick={() => matchArabic(word)} lang="ar">{word.arabic}</button>)}</div></div></>}

        {task.type === 'build' && <><p className="task-context">{showTranslations ? lesson.phrase.arabic : 'كوّن جملة صحيحة بالألمانية.'}</p><div className="build-answer" dir="ltr">{sentenceIndexes.length ? sentenceIndexes.map((position) => <button key={position} type="button" onClick={() => setSentenceIndexes(sentenceIndexes.filter((item) => item !== position))}>{buildTokens[position]}</button>) : <span>Wörter hier einsetzen …</span>}</div><div className="word-tiles" dir="ltr">{buildTokens.map((token, position) => <button key={position} type="button" disabled={sentenceIndexes.includes(position) || solved} onClick={() => setSentenceIndexes([...sentenceIndexes, position])}>{token}</button>)}</div><button className="small-check" disabled={sentenceIndexes.length !== buildTokens.length || solved} onClick={() => judge(sentenceIndexes.map((position) => buildTokens[position]).join(' ') === lesson.phrase.german)}>Überprüfen</button></>}

        {task.type === 'blank' && <><p className="task-context">أي كلمة تكمل الجملة؟</p><div className="stimulus" dir="ltr" lang="de">{lesson.blank.sentence}</div><div className="option-grid">{lesson.blank.options.map((option) => <button key={option} disabled={solved} onClick={() => judge(option === lesson.blank.answer)} className="option" dir="ltr">{option}</button>)}</div></>}

        {task.type === 'dialogue' && <><p className="task-context">استمع إلى السؤال واختر رداً مناسباً.</p><div className="dialogue-prompt"><span className="dialogue-person">👤</span><div><strong dir="ltr" lang="de">{lesson.dialogue.prompt}</strong>{showTranslations && <small lang="ar">{lesson.dialogue.promptAr}</small>}</div><AudioButton text={lesson.dialogue.prompt} enabled={settings.sound} /></div><div className="option-list">{lesson.dialogue.options.map((option) => <button key={option} disabled={solved} onClick={() => judge(option === lesson.dialogue.answer)} className="option" dir="ltr">{option}</button>)}</div></>}

        {task.type === 'basket' && <><p className="task-context">اختر هذه الأشياء الثلاثة:</p><div className="basket-targets">{basketTargets.map((word) => <span key={word.id} lang="ar">{word.arabic}</span>)}</div><div className="basket-grid">{words.map((word) => <button key={word.id} disabled={solved} aria-pressed={basket.includes(word.id)} className={`basket-item ${basket.includes(word.id) ? 'selected' : ''}`} onClick={() => setBasket(basket.includes(word.id) ? basket.filter((id) => id !== word.id) : [...basket, word.id])}><span>{word.icon}</span><small dir="ltr">{word.german}</small></button>)}</div><button className="small-check" disabled={basket.length !== 3 || solved} onClick={() => judge(basketTargets.every((word) => basket.includes(word.id)))}>Warenkorb prüfen</button></>}

        <div className={`task-feedback ${feedback.startsWith('أحسنت') ? 'success' : ''}`} role="status">{feedback || ' '}</div>
        {solved && <button className="primary-btn task-next" onClick={advance}>{index === tasks.length - 1 ? 'النتيجة · Ergebnis' : 'التالي · Weiter'} <span>←</span></button>}
      </section>
    </div>
  </div>;
}
