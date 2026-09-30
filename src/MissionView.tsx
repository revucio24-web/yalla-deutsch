import { useState } from 'react';
import { canSpeak, germanWordText, speakGerman, stopSpeaking } from './audio';
import { createTasks, lessonWords } from './domain';
import WordIllustration from './WordIllustration';
import type { Lesson, Settings, Task, Word } from './domain';

type Props = {
  lesson: Lesson; settings: Settings; showTranslations: boolean;
  onExit: () => void; onFinish: (firstTryCount: number) => void;
};

function AudioButton({ text, enabled }: { text: string; enabled: boolean }) {
  return <button className="audio-btn" type="button" disabled={!enabled || !canSpeak()}
    onClick={() => speakGerman(text, enabled)} aria-label={`Deutsch anhören: ${text}`} title="Deutsch anhören" lang="de">♪</button>;
}

function wordLabel(word: Word) { return germanWordText(word.german, word.article); }

export default function MissionView({ lesson, settings, showTranslations, onExit, onFinish }: Props) {
  const [tasks] = useState(() => createTasks(lesson, Math.floor(Math.random() * 2 ** 31)));
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [madeMistake, setMadeMistake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<{ arabic: string; german: string } | null>(null);
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
    setFeedback({ arabic: 'أحسنت! رائع.', german: 'Richtig – super gemacht!' });
  };
  const miss = () => { setMadeMistake(true); setFeedback({ arabic: 'محاولة جميلة، لنجرّب مرة أخرى!', german: 'Guter Versuch! Probier es noch einmal.' }); };
  const judge = (correct: boolean) => { if (correct) succeed(); else miss(); };
  const advance = () => {
    stopSpeaking();
    if (index === tasks.length - 1) { onFinish(firstTry); return; }
    setIndex(index + 1); setMadeMistake(false); setSolved(false); setFeedback(null);
    setSelectedGerman(null); setMatched([]); setSentenceIndexes([]); setBasket([]);
  };
  const matchArabic = (word: Word) => {
    if (!selectedGerman || matched.includes(word.id) || solved) return;
    if (selectedGerman !== word.id) { miss(); setSelectedGerman(null); return; }
    const next = [...matched, word.id];
    setMatched(next); setSelectedGerman(null); setFeedback({ arabic: 'صحيح', german: 'Richtig.' });
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
      <button className="close-btn" type="button" onClick={() => { stopSpeaking(); onExit(); }} aria-label="Mission verlassen" lang="de">×</button>
      <div className="mission-progress"><div className="mission-progress-copy"><span lang="ar">{lesson.titleAr}</span><span dir="ltr">{index + 1} / {tasks.length}</span></div><div className="progress-track"><span style={{ width: `${(index + 1) / tasks.length * 100}%` }} /></div></div>
      <span className="mission-chapter" dir="ltr" lang="de">{lesson.titleDe}</span>
    </header>
    <div className="mission-layout">
      <aside className="guide-card"><div className="guide-avatar">ن</div><strong>نور</strong><p>كل خطوة تقرّبك من هدفك. خذ وقتك!<br /><span lang="de">Du schaffst das!</span></p><div className="guide-tip"><span>✦</span> {prompt(task.type)}</div></aside>
      <section className="task-card" aria-live="polite">
        <div className="task-meta"><span className="task-number" lang="de">RUNDE {index + 1}</span><span className="task-type" lang="en">{task.type.toUpperCase()}</span></div>
        <h1 lang="ar">{prompt(task.type)}</h1>

        {task.type === 'choice' && <><p className="task-context">ما معنى هذه الكلمة بالألمانية؟</p><div className="stimulus" lang="ar">{task.word.arabic}</div><div className="option-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => { speakGerman(wordLabel(option), settings.sound); judge(option.id === task.word.id); }} className="option" title="Klicken oder Enter: Deutsch anhören" lang="de"><span dir="ltr" lang="de">{wordLabel(option)}</span></button>)}</div></>}

        {task.type === 'symbol' && <><p className="task-context">أي رمز يمثّل هذه الكلمة؟</p><button type="button" className="stimulus speakable-stimulus" lang="de" dir="ltr" disabled={!settings.sound || !canSpeak()} onClick={() => speakGerman(wordLabel(task.word), settings.sound)} aria-label={`${wordLabel(task.word)} anhören`}>{wordLabel(task.word)} <span aria-hidden="true">♪</span></button><div className="option-grid symbol-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => judge(option.id === task.word.id)} className="option symbol-option"><WordIllustration word={option} className="symbol-word-illustration" decorative /><small lang="ar">{showTranslations ? option.arabic : '●'}</small></button>)}</div></>}

        {task.type === 'listen' && <><p className="task-context">استمع إلى الكلمة، ثم اختر ما سمعته.</p><div className="listen-stimulus"><AudioButton text={wordLabel(task.word)} enabled={settings.sound} /><span lang="de">HÖREN</span></div>{(!settings.sound || !canSpeak()) && <p className="audio-note">الصوت غير متاح حالياً. الكلمة: <b dir="ltr" lang="de">{wordLabel(task.word)}</b></p>}<div className="option-grid">{task.options.map((option) => <button key={option.id} disabled={solved} onClick={() => { speakGerman(wordLabel(option), settings.sound); judge(option.id === task.word.id); }} className="option" dir="ltr" lang="de" title="Klicken oder Enter: Deutsch anhören">{wordLabel(option)}</button>)}</div></>}

        {task.type === 'match' && <><p className="task-context">اختر كلمة ألمانية، ثم معناها العربي.</p><div className="match-columns"><div>{task.pairWords.map((word) => <button key={word.id} disabled={matched.includes(word.id) || solved} className={`match-option ${selectedGerman === word.id ? 'selected' : ''} ${matched.includes(word.id) ? 'matched' : ''}`} dir="ltr" lang="de" onClick={() => { speakGerman(wordLabel(word), settings.sound); setSelectedGerman(word.id); }} title="Klicken oder Enter: Deutsch anhören">{wordLabel(word)}</button>)}</div><div>{[...task.pairWords].reverse().map((word) => <button key={word.id} disabled={matched.includes(word.id) || solved} className={`match-option ${matched.includes(word.id) ? 'matched' : ''}`} onClick={() => matchArabic(word)} lang="ar">{word.arabic}</button>)}</div></div></>}

        {task.type === 'build' && <><p className="task-context">{showTranslations ? lesson.phrase.arabic : 'كوّن جملة صحيحة بالألمانية.'}</p><div className="build-answer" dir="ltr" lang="de">{sentenceIndexes.length ? sentenceIndexes.map((position) => <button key={position} type="button" onClick={() => { speakGerman(buildTokens[position], settings.sound); setSentenceIndexes(sentenceIndexes.filter((item) => item !== position)); }} title="Klicken oder Enter: Deutsch anhören">{buildTokens[position]}</button>) : <span>Wörter hier einsetzen …</span>}</div><div className="word-tiles" dir="ltr" lang="de">{buildTokens.map((token, position) => <button key={position} type="button" disabled={sentenceIndexes.includes(position) || solved} onClick={() => { speakGerman(token, settings.sound); setSentenceIndexes([...sentenceIndexes, position]); }} title="Klicken oder Enter: Deutsch anhören">{token}</button>)}</div><button className="small-check" lang="de" disabled={sentenceIndexes.length !== buildTokens.length || solved} onClick={() => judge(sentenceIndexes.map((position) => buildTokens[position]).join(' ') === lesson.phrase.german)}>Überprüfen</button></>}

        {task.type === 'blank' && <><p className="task-context">أي كلمة تكمل الجملة؟</p><button type="button" className="stimulus speakable-stimulus" dir="ltr" lang="de" disabled={!settings.sound || !canSpeak()} onClick={() => speakGerman(lesson.blank.sentence.replace('___', lesson.blank.answer), settings.sound)} aria-label="Deutschen Satz anhören">{lesson.blank.sentence} <span aria-hidden="true">♪</span></button><div className="option-grid">{lesson.blank.options.map((option) => <button key={option} disabled={solved} onClick={() => { speakGerman(option, settings.sound); judge(option === lesson.blank.answer); }} className="option" dir="ltr" lang="de" title="Klicken oder Enter: Deutsch anhören">{option}</button>)}</div></>}

        {task.type === 'dialogue' && <><p className="task-context">استمع إلى السؤال واختر رداً مناسباً.</p><div className="dialogue-prompt"><span className="dialogue-person">👤</span><div><strong dir="ltr" lang="de">{lesson.dialogue.prompt}</strong>{showTranslations && <small lang="ar">{lesson.dialogue.promptAr}</small>}</div><AudioButton text={lesson.dialogue.prompt} enabled={settings.sound} /></div><div className="option-list">{lesson.dialogue.options.map((option) => <button key={option} disabled={solved} onClick={() => { speakGerman(option, settings.sound); judge(option === lesson.dialogue.answer); }} className="option" dir="ltr" lang="de" title="Klicken oder Enter: Deutsch anhören">{option}</button>)}</div></>}

        {task.type === 'basket' && <><p className="task-context">اختر هذه الأشياء الثلاثة:</p><div className="basket-targets">{basketTargets.map((word) => <span key={word.id} lang="ar">{word.arabic}</span>)}</div><div className="basket-grid">{words.map((word) => <button key={word.id} disabled={solved} aria-pressed={basket.includes(word.id)} className={`basket-item ${basket.includes(word.id) ? 'selected' : ''}`} onClick={() => { speakGerman(wordLabel(word), settings.sound); setBasket(basket.includes(word.id) ? basket.filter((id) => id !== word.id) : [...basket, word.id]); }} title="Klicken oder Enter: Deutsch anhören"><WordIllustration word={word} className="basket-word-illustration" decorative /><small dir="ltr" lang="de">{word.german}</small></button>)}</div><button className="small-check" lang="de" disabled={basket.length !== 3 || solved} onClick={() => judge(basketTargets.every((word) => basket.includes(word.id)))}>Warenkorb prüfen</button></>}

        <div className={`task-feedback ${feedback?.arabic.startsWith('أحسنت') ? 'success' : ''}`} role="status">{feedback ? <><span lang="ar">{feedback.arabic}</span> · <span lang="de">{feedback.german}</span></> : ' '}</div>
        {solved && <button className="primary-btn task-next" onClick={advance}><span lang="ar">{index === tasks.length - 1 ? 'النتيجة' : 'التالي'}</span> · <span lang="de">{index === tasks.length - 1 ? 'Ergebnis' : 'Weiter'}</span> <span>←</span></button>}
      </section>
    </div>
  </div>;
}
