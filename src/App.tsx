import { useEffect, useMemo, useState } from 'react';
import MissionView from './MissionView';
import { canSpeak, germanWordText, speakGerman, stopSpeaking } from './audio';
import {
  answerPractice, completeMission, freshProgress, lessonUnlocked, levelForXp,
  levelPercent, lessons, loadProgress, nextLesson, practiceQueue, rewardFor,
  saveProgress, vocabulary, worlds,
} from './domain';
import type { Lesson, Progress, Word, World } from './domain';

type Screen = 'home' | 'city' | 'missions' | 'words' | 'progress' | 'profile' | 'settings' | 'welcome' | 'mission' | 'result' | 'review';
const avatars = ['🧑', '👩', '👨', '🧕', '👩‍🎓', '🧑‍🎓'];
const navigation: { id: Screen; ar: string; de: string; icon: string }[] = [
  { id: 'home', ar: 'الرئيسية', de: 'Start', icon: '⌂' },
  { id: 'city', ar: 'المدينة', de: 'Stadt', icon: '▦' },
  { id: 'missions', ar: 'المهام', de: 'Missionen', icon: '◈' },
  { id: 'words', ar: 'الكلمات', de: 'Wörter', icon: '▤' },
  { id: 'progress', ar: 'تقدمي', de: 'Fortschritt', icon: '↗' },
  { id: 'profile', ar: 'الملف', de: 'Profil', icon: '◉' },
  { id: 'settings', ar: 'الإعدادات', de: 'Einstellungen', icon: '⚙' },
];

function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function CityScene({ progress, onWorld, compact = false }: { progress: Progress; onWorld: (world: World) => void; compact?: boolean }) {
  return <div className={`city-scene ${compact ? 'city-scene--compact' : ''}`} aria-label="Interaktive Stadtkarte">
    <div className="scene-sun" /><div className="scene-cloud scene-cloud--one" /><div className="scene-cloud scene-cloud--two" />
    <div className="city-hill city-hill--back" /><div className="city-hill city-hill--front" />
    <div className="city-path" /><div className="scene-tree tree-one">♣</div><div className="scene-tree tree-two">♣</div><div className="scene-tree tree-three">♣</div>
    {worlds.map((world, index) => {
      const worldLessons = lessons.filter((lesson) => lesson.world === world.id);
      const done = worldLessons.filter((lesson) => progress.completed.includes(lesson.id)).length;
      const unlocked = index === 0 || progress.completed.includes(lessons[index * 5 - 1].id);
      return <button key={world.id} type="button" className={`city-building city-building--${index} ${unlocked ? 'is-open' : 'is-locked'}`} onClick={() => onWorld(world)} aria-label={`${world.de}: ${unlocked ? `${done} von ${worldLessons.length} Missionen` : 'noch gesperrt'}`}>
        <span className="building-roof" /><span className="building-body"><i className="building-window" /><i className="building-window" /><i className="building-door" /></span>
        <span className="building-label"><b>{world.icon}</b><span>{world.de}</span>{unlocked && !compact && <small>{done}/{worldLessons.length}</small>}</span>
      </button>;
    })}
  </div>;
}

function ReviewView({ queue, sound, onAnswer, onExit }: { queue: Word[]; sound: boolean; onAnswer: (word: Word, correct: boolean) => void; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string } | null>(null);
  const word = queue[index];
  if (!word) return <div className="center-stage"><div className="finish-panel"><span className="finish-symbol">✦</span><h1>ممتاز! انتهت المراجعة</h1><p>Du hast deine Wiederholung abgeschlossen.</p><button className="primary-btn" onClick={onExit}>العودة إلى الكلمات</button></div></div>;
  const pool = vocabulary.filter((entry) => entry.world === word.world && entry.id !== word.id).slice(index % 3, index % 3 + 3);
  const options = [word, ...pool].sort((a, b) => (a.id.charCodeAt(a.id.length - 1) + index) % 4 - (b.id.charCodeAt(b.id.length - 1) + index) % 4);
  return <div className="center-stage"><div className="review-panel"><button className="plain-close" onClick={onExit}>× <span>إنهاء</span></button><div className="review-progress">مراجعة {index + 1} / {queue.length}</div><ProgressBar value={(index + 1) / queue.length * 100} label="Fortschritt der Wiederholung" /><span className="eyebrow">تذكّر الكلمة</span><h1 lang="ar">{word.arabic}</h1><p>ما الكلمة الألمانية المناسبة؟</p><div className="option-grid">{options.map((entry) => <button key={entry.id} className="option" disabled={Boolean(feedback)} onClick={() => { speakGerman(germanWordText(entry.german, entry.article), sound); const correct = entry.id === word.id; onAnswer(word, correct); setFeedback({ correct, answer: germanWordText(word.german, word.article) }); }} dir="ltr" title="Klicken oder Enter: Deutsch anhören">{entry.article} {entry.german}</button>)}</div>{feedback && <><p className={`review-feedback ${feedback.correct ? 'success' : ''}`} role="status">{feedback.correct ? 'صحيح!' : `الإجابة الصحيحة: ${feedback.answer}`}</p><button className="primary-btn" onClick={() => { setIndex(index + 1); setFeedback(null); }}>التالي ←</button></>}</div></div>;
}

function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedWorld, setSelectedWorld] = useState('home');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [result, setResult] = useState<{ lesson: Lesson; stars: number; xp: number; first: boolean } | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]);
  const [wordSearch, setWordSearch] = useState('');
  const [resetPending, setResetPending] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<Word[]>([]);

  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', progress.settings.reduceMotion);
    document.documentElement.classList.toggle('large-text', progress.settings.largeText);
  }, [progress.settings.reduceMotion, progress.settings.largeText]);

  const next = nextLesson(progress);
  const level = levelForXp(progress.xp);
  const stars = Object.values(progress.stars).reduce((sum, value) => sum + value, 0);
  const learned = useMemo(() => vocabulary.filter((word) => progress.words[word.id]), [progress.words]);
  const foundWords = learned.filter((word) => `${word.german} ${word.arabic}`.toLocaleLowerCase().includes(wordSearch.toLocaleLowerCase()));
  const selectedWorldData = worlds.find((world) => world.id === selectedWorld) ?? worlds[0];
  const selectedLessons = lessons.filter((lesson) => lesson.world === selectedWorldData.id);
  const dueCount = learned.filter((word) => progress.words[word.id].dueAt <= Date.now()).length;

  const navigate = (destination: Screen) => { stopSpeaking(); setScreen(destination); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const openWorld = (world: World) => { setSelectedWorld(world.id); navigate('city'); };
  const startLesson = (lesson: Lesson) => {
    if (!lessonUnlocked(progress, lesson)) return;
    setActiveLesson(lesson);
    if (!progress.nickname) { navigate('welcome'); return; }
    navigate('mission');
  };
  const finishLesson = (firstTryCount: number) => {
    if (!activeLesson) return;
    const first = !progress.completed.includes(activeLesson.id);
    const starCount = firstTryCount === 5 ? 3 : firstTryCount >= 3 ? 2 : 1;
    setProgress((current) => completeMission(current, activeLesson, firstTryCount));
    setResult({ lesson: activeLesson, stars: starCount, xp: first ? rewardFor(firstTryCount) : 0, first });
    navigate('result');
  };
  const startReview = () => { const queue = practiceQueue(progress); if (queue.length) { setReviewQueue(queue); navigate('review'); } };
  const updateSetting = (key: keyof Progress['settings']) => setProgress((current) => ({ ...current, settings: { ...current.settings, [key]: !current.settings[key] } }));

  if (screen === 'mission' && activeLesson) return <MissionView key={activeLesson.id} lesson={activeLesson} settings={progress.settings} showTranslations={progress.settings.hints && progress.xp < 500} onExit={() => navigate('city')} onFinish={finishLesson} />;
  if (screen === 'review') return <ReviewView queue={reviewQueue} sound={progress.settings.sound} onAnswer={(word, correct) => setProgress((current) => answerPractice(current, word.id, correct))} onExit={() => navigate('words')} />;
  if (screen === 'welcome') return <div className="center-stage"><div className="welcome-panel"><div className="welcome-mark">ي</div><span className="eyebrow">Willkommen · أهلاً بك</span><h1>هيا نتعلم الألمانية!</h1><p>ابدأ رحلتك باسم مستعار وصورة رمزية. لا تحتاج إلى حساب.</p><label htmlFor="nickname">ما اسمك؟ <span>Dein Name</span></label><input id="nickname" value={nickname} maxLength={20} onChange={(event) => setNickname(event.target.value)} placeholder="مثلاً: سارة" autoFocus /><span className="field-heading">اختر صورتك</span><div className="avatar-options">{avatars.map((item) => <button key={item} className={avatar === item ? 'selected' : ''} aria-pressed={avatar === item} onClick={() => setAvatar(item)}>{item}</button>)}</div><button className="primary-btn" disabled={!nickname.trim()} onClick={() => { setProgress((current) => ({ ...current, nickname: nickname.trim(), avatar })); navigate('mission'); }}>ابدأ المهمة ←</button><button className="quiet-btn" onClick={() => navigate('home')}>العودة إلى البداية</button></div></div>;
  if (screen === 'result' && result) return <div className="center-stage"><div className="finish-panel"><span className="finish-symbol">✦</span><span className="eyebrow">MISSION GESCHAFFT</span><h1>أحسنت يا {progress.nickname}!</h1><p>أكملت مهمة <b dir="ltr">{result.lesson.titleDe}</b></p><div className="result-stars" aria-label={`${result.stars} von 3 Sternen`}>{[1, 2, 3].map((value) => <span key={value} className={value <= result.stars ? 'earned' : ''}>★</span>)}</div><div className="reward-strip"><span>⚡ {result.first ? `+${result.xp} XP` : 'Wiederholt'}</span><span>✦ {result.stars} Sterne</span></div><button className="primary-btn" onClick={() => next ? startLesson(next) : navigate('city')}>{next ? 'المهمة التالية' : 'عرض المدينة'} ←</button><button className="quiet-btn" onClick={() => navigate('city')}>العودة إلى المدينة</button></div></div>;

  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={() => navigate('home')} aria-label="Yalla Deutsch Start"><span className="brand-symbol">ي</span><span className="brand-copy"><b>Yalla Deutsch</b><small>Deutsch im echten Leben</small></span></button><div className="side-section">DEIN WEG · رحلتك</div><nav aria-label="Hauptnavigation">{navigation.map((item) => <button key={item.id} className={`nav-item ${screen === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.ar}<small>{item.de}</small></span></button>)}</nav><div className="sidebar-note"><span>✦</span><p>خطوة صغيرة كل يوم.<br /><b>Ein Schritt jeden Tag.</b></p></div><div className="sidebar-footer">A1–A2 · Schritt für Schritt</div></aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-logo" onClick={() => navigate('home')}><span>ي</span> Yalla Deutsch</button><div className="topbar-right"><span className="header-stage">A1–A2 · Alltag</span><button className="top-pill" onClick={() => navigate('progress')}>✦ <b>{stars}</b></button><button className="top-pill xp-pill" onClick={() => navigate('progress')}>⚡ <b>{progress.xp} XP</b></button><button className="avatar-pill" onClick={() => navigate('profile')} aria-label="Profil öffnen">{progress.avatar}</button></div></header>

      {screen === 'home' && <div className="page"><div className="welcome-line"><span className="eyebrow">DEIN DEUTSCH-ABENTEUER</span><span>اليوم بداية جديدة ✦</span></div><section className="hero"><div className="hero-copy"><span className="hero-chip">✦ Willkommen in deiner Stadt</span><h1>Deutsch lernen.<br /><em>Im echten Leben.</em></h1><p lang="ar">تعلّم الألمانية خطوة بخطوة، من خلال مواقف تحتاجها كل يوم.</p><button className="primary-btn" onClick={() => next ? startLesson(next) : navigate('city')}>{next ? 'تابع التعلّم' : 'استكشف المدينة'} <span>←</span></button><div className="hero-meta"><span>◉ 5 Stadtbereiche</span><span>◈ 30 Missionen</span><span>▤ 180 Wörter</span></div></div><div className="hero-visual"><div className="hero-glow" /><div className="hero-tower tower-one"><i /><i /><i /></div><div className="hero-tower tower-two"><i /><i /></div><div className="hero-tower tower-three"><i /><i /><i /></div><div className="hero-road" /><div className="hero-person">✦</div><div className="floating-word floating-one" dir="ltr">Hallo!</div><div className="floating-word floating-two" lang="ar">مرحباً</div></div></section><div className="home-grid"><section className="next-card"><div className="card-heading"><span className="eyebrow">DEINE NÄCHSTE MISSION</span><span className="card-icon">◈</span></div><h2 dir="ltr">{next?.titleDe ?? 'Alles geschafft!'}</h2><p>{next?.titleAr ?? 'أكملت جميع المهام، أحسنت!'}</p><div className="next-meta"><span>⏱ 3–5 Min.</span><span>{next ? worlds.find((world) => world.id === next.world)?.de : 'A1'}</span></div><button className="text-action" onClick={() => next ? startLesson(next) : navigate('city')}>ابدأ الآن <span>←</span></button></section><section className="level-card"><div className="card-heading"><span className="eyebrow">DEIN FORTSCHRITT</span><span className="level-badge">{level}</span></div><h2>Level {level}</h2><p>كل كلمة جديدة تفتح لك باباً.</p><ProgressBar value={levelPercent(progress.xp)} label="Level-Fortschritt" /><div className="level-caption"><span>{progress.xp} XP</span><span>{level * 100} XP</span></div><div className="mini-stats"><div><b>{progress.completed.length}</b><small>Missionen</small></div><div><b>{learned.length}</b><small>Wörter</small></div><div><b>{stars}</b><small>Sterne</small></div></div></section></div><div className="section-title"><div><span className="eyebrow">DEINE STADT WARTET</span><h2>اختر مكاناً، وابدأ رحلة جديدة</h2></div><button onClick={() => navigate('city')}>المدينة كاملة ←</button></div><div className="world-strip">{worlds.map((world, index) => { const open = index === 0 || progress.completed.includes(lessons[index * 5 - 1].id); return <button key={world.id} className={`world-tile ${open ? '' : 'locked'}`} onClick={() => openWorld(world)} style={{ '--accent': world.color } as React.CSSProperties}><span>{world.icon}</span><strong>{world.de}</strong><small>{world.ar}</small><i>{open ? '←' : '🔒'}</i></button>; })}</div></div>}

      {screen === 'city' && <div className="page"><div className="page-heading"><span className="eyebrow">DEINE LERNSTADT</span><h1>مدينة تتعلّم معك</h1><p>كل مهمة تفتح لك طريقاً جديداً في الحياة اليومية.</p></div><CityScene progress={progress} onWorld={openWorld} /><div className="city-detail"><div className="city-detail-title"><span className="world-emblem" style={{ background: selectedWorldData.color }}>{selectedWorldData.icon}</span><div><span className="eyebrow">STADTTEIL {worlds.indexOf(selectedWorldData) + 1} / 5</span><h2 dir="ltr">{selectedWorldData.de}</h2><p>{selectedWorldData.ar} · {selectedWorldData.subtitle}</p></div></div><div className="lesson-list">{selectedLessons.map((lesson, index) => { const unlocked = lessonUnlocked(progress, lesson); const done = progress.completed.includes(lesson.id); return <button key={lesson.id} disabled={!unlocked} className={`lesson-row ${done ? 'done' : ''}`} onClick={() => startLesson(lesson)}><span className="lesson-step">{done ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="lesson-copy"><b dir="ltr">{lesson.titleDe}</b><small>{lesson.titleAr}</small></span><span className="lesson-tail">{done ? '★'.repeat(progress.stars[lesson.id] ?? 0) : unlocked ? '←' : '🔒'}</span></button>; })}</div></div></div>}

      {screen === 'missions' && <div className="page"><div className="page-heading"><span className="eyebrow">30 KLEINE SCHRITTE</span><h1>المهام</h1><p>خمسة أحياء، ست مهام في كل حي. ابدأ من حيث توقفت.</p></div><div className="mission-groups">{worlds.map((world) => <section className="mission-group" key={world.id}><div className="mission-group-head"><span className="world-emblem" style={{ background: world.color }}>{world.icon}</span><div><h2 dir="ltr">{world.de}</h2><small>{world.ar}</small></div><span>{lessons.filter((lesson) => lesson.world === world.id && progress.completed.includes(lesson.id)).length}/{lessons.filter((lesson) => lesson.world === world.id).length}</span></div>{lessons.filter((lesson) => lesson.world === world.id).map((lesson) => { const open = lessonUnlocked(progress, lesson); const done = progress.completed.includes(lesson.id); return <button key={lesson.id} className="mission-row" disabled={!open} onClick={() => startLesson(lesson)}><span className={`mission-dot ${done ? 'done' : ''}`}>{done ? '✓' : open ? '○' : '·'}</span><span><b dir="ltr">{lesson.titleDe}</b><small>{lesson.titleAr}</small></span><i>{done ? '★'.repeat(progress.stars[lesson.id] ?? 0) : open ? '←' : '🔒'}</i></button>; })}</section>)}</div></div>}

      {screen === 'words' && <div className="page"><div className="page-heading"><span className="eyebrow">DEINE WORTSAMMLUNG</span><h1>كلماتي</h1><p>كل كلمة تتعلمها تبقى هنا للمراجعة.</p></div><div className="collection-banner"><div><span className="eyebrow">WIEDERHOLEN</span><h2>{dueCount ? `${dueCount} كلمات جاهزة للمراجعة` : 'تدرّب على كلماتك'}</h2><p>الكلمات الأصعب تظهر أولاً. التكرار يساعدك على التذكر.</p></div><button className="primary-btn" disabled={!learned.length} onClick={startReview}>ابدأ المراجعة ←</button></div><div className="collection-tools"><span>{learned.length} / {vocabulary.length} Wörter entdeckt</span><input aria-label="Wörter suchen" value={wordSearch} onChange={(event) => setWordSearch(event.target.value)} placeholder="ابحث عن كلمة · Wort suchen" /></div>{foundWords.length ? <div className="word-grid">{foundWords.map((word) => <article className="word-card" key={word.id}><span className="word-icon" aria-hidden="true">{word.icon}</span><div><button type="button" className="word-pronunciation" disabled={!progress.settings.sound || !canSpeak()} onClick={() => speakGerman(germanWordText(word.german, word.article), progress.settings.sound)} aria-label={`${germanWordText(word.german, word.article)} anhören`} title="Klicken oder Enter: Deutsch anhören" dir="ltr" lang="de">{word.article && <small>{word.article} </small>}{word.german} <span aria-hidden="true">♪</span></button><span lang="ar">{word.arabic}</span></div><div className="mastery-dots" aria-label={`Mastery ${progress.words[word.id].mastery} von 5`}>{[1, 2, 3, 4, 5].map((value) => <i key={value} className={value <= progress.words[word.id].mastery ? 'filled' : ''} />)}</div></article>)}</div> : <div className="empty-state"><span>✦</span><h2>{learned.length ? 'لا توجد نتائج' : 'ستظهر كلماتك هنا'}</h2><p>{learned.length ? 'جرّب كلمة أخرى.' : 'ابدأ مهمتك الأولى واجمع كلمات جديدة.'}</p><button className="primary-btn" onClick={() => next ? startLesson(next) : navigate('missions')}>ابدأ التعلّم ←</button></div>}</div>}

      {screen === 'progress' && <div className="page"><div className="page-heading"><span className="eyebrow">DEIN WEG</span><h1>تقدّمي</h1><p>انظر إلى ما أنجزته، وخطّط لخطوتك التالية.</p></div><div className="stats-grid"><div><span>⚡</span><b>{progress.xp}</b><small>XP gesammelt</small></div><div><span>★</span><b>{stars}</b><small>Sterne</small></div><div><span>◈</span><b>{progress.completed.length}</b><small>Missionen</small></div><div><span>▤</span><b>{learned.length}</b><small>Wörter</small></div></div><section className="progress-panel"><div className="progress-panel-head"><div><span className="eyebrow">LEVEL {level}</span><h2>خطوة بخطوة</h2></div><strong>{levelPercent(progress.xp)}%</strong></div><ProgressBar value={levelPercent(progress.xp)} label="Fortschritt zum nächsten Level" /><p>{100 - levelPercent(progress.xp)} XP bis zum nächsten Level.</p></section><div className="section-title"><div><span className="eyebrow">STADTBEREICHE</span><h2>رحلتك عبر المدينة</h2></div></div><div className="district-progress">{worlds.map((world) => { const done = lessons.filter((lesson) => lesson.world === world.id && progress.completed.includes(lesson.id)).length; return <div key={world.id}><span className="district-icon" style={{ color: world.color }}>{world.icon}</span><div><b dir="ltr">{world.de}</b><small>{world.ar}</small><ProgressBar value={done * 20} label={`${world.de}: ${done} von 5`} /></div><strong>{done}/5</strong></div>; })}</div><div className="hint-stage"><b>مساعدة اللغة · Sprachhilfe</b><p>{progress.xp < 500 ? 'الترجمة العربية تساعدك الآن. مع تقدمك، تظهر الألمانية أكثر.' : 'لقد تقدمت! الترجمة المباشرة أقل، ويمكنك تفعيل المساعدة في الإعدادات.'}</p></div></div>}

      {screen === 'profile' && <div className="page"><div className="page-heading"><span className="eyebrow">DEIN PROFIL</span><h1>ملفي الشخصي</h1><p>غيّر الاسم والصورة في أي وقت.</p></div><div className="profile-panel"><div className="profile-icon">{progress.avatar}</div><div><span className="eyebrow">DEUTSCH-ENTDECKER</span><h2>{progress.nickname || 'ضيف · Gast'}</h2><p>Level {level} · {progress.completed.length} Missionen geschafft</p></div></div><div className="edit-panel"><h2>تعديل الملف · Profil bearbeiten</h2><label htmlFor="profile-name">الاسم المستعار</label><input id="profile-name" value={nickname || progress.nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} /><span className="field-heading">الصورة الرمزية</span><div className="avatar-options">{avatars.map((item) => <button key={item} className={(avatar === item && nickname || progress.avatar === item && !nickname) ? 'selected' : ''} onClick={() => setAvatar(item)} aria-label={`Avatar ${item}`}>{item}</button>)}</div><button className="primary-btn" disabled={!(nickname || progress.nickname).trim()} onClick={() => { setProgress((current) => ({ ...current, nickname: (nickname || current.nickname).trim(), avatar })); setNickname(''); }}>حفظ التغييرات</button></div><button className="settings-link" onClick={() => navigate('settings')}>⚙ الإعدادات · Einstellungen ←</button></div>}

      {screen === 'settings' && <div className="page"><div className="page-heading"><span className="eyebrow">DEINE APP</span><h1>الإعدادات</h1><p>اضبط طريقة التعلّم كما تناسبك.</p></div><div className="settings-panel">{([
        ['sound', 'الصوت الألماني', 'Deutsch anhören'], ['hints', 'المساعدة العربية', 'Arabische Hinweise'],
        ['reduceMotion', 'تقليل الحركة', 'Animationen reduzieren'], ['largeText', 'تكبير الخط', 'Größere Schrift'],
      ] as const).map(([key, ar, de]) => <label key={key} className="setting-row"><span><b>{ar}</b><small>{de}</small></span><input type="checkbox" checked={progress.settings[key]} onChange={() => updateSetting(key)} /></label>)}</div><p className="settings-note">يستخدم الصوت الألماني صوت الجهاز إن كان متاحاً. لا تُرسل بياناتك إلى خادمنا.</p><div className="reset-panel"><h2>إعادة ضبط التقدّم</h2><p>سيُحذف الاسم والنجوم والكلمات المحفوظة على هذا الجهاز.</p>{resetPending ? <div className="reset-actions"><button onClick={() => setResetPending(false)}>إلغاء</button><button className="danger-btn" onClick={() => { setProgress(freshProgress()); setResetPending(false); navigate('home'); }}>تأكيد الحذف</button></div> : <button className="danger-outline" onClick={() => setResetPending(true)}>حذف التقدّم</button>}</div></div>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile Hauptnavigation">{navigation.filter((item) => ['home', 'city', 'missions', 'words', 'profile'].includes(item.id)).map((item) => <button key={item.id} onClick={() => navigate(item.id)} className={screen === item.id ? 'active' : ''}><span>{item.icon}</span><small>{item.ar}</small></button>)}</nav>
  </div>;
}

export default App;
