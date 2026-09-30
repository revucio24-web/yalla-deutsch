import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  answerPractice, completeMission, createTasks, freshProgress, lessonUnlocked, worldUnlocked,
  lessons, loadProgress, practiceQueue, saveProgress, shuffleTokens, starsFor,
  STORAGE_KEY, vocabulary, wordsById, wordVisualKey, worlds,
} from './domain';

describe('authored learning content', () => {
  it('preserves all 30 existing missions and adds one new mission to every district', () => {
    const originalLessonIds = [
      'home-01', 'home-02', 'home-03', 'home-04', 'home-05',
      'market-01', 'market-02', 'market-03', 'market-04', 'market-05',
      'traffic-01', 'traffic-02', 'traffic-03', 'traffic-04', 'traffic-05',
      'work-01', 'work-02', 'work-03', 'work-04', 'work-05',
      'health-01', 'health-02', 'health-03', 'health-04', 'health-05',
      'home-06', 'market-06', 'traffic-06', 'work-06', 'health-06',
    ];

    expect(worlds).toHaveLength(5);
    expect(lessons).toHaveLength(35);
    expect(vocabulary).toHaveLength(210);
    expect(new Set(vocabulary.map((word) => word.id)).size).toBe(210);
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(35);
    expect(lessons.slice(0, 30).map((lesson) => lesson.id)).toEqual(originalLessonIds);
    expect(lessons.slice(30).map((lesson) => lesson.id)).toEqual([
      'home-07', 'market-07', 'traffic-07', 'work-07', 'health-07',
    ]);
    expect(lessons.map((lesson) => lesson.order)).toEqual(Array.from({ length: 35 }, (_, index) => index));
    for (const world of worlds) {
      expect(lessons.filter((lesson) => lesson.world === world.id), world.id).toHaveLength(7);
    }
    for (const lesson of lessons) {
      expect(lesson.wordIds).toHaveLength(6);
      expect(lesson.wordIds.every((id) => vocabulary.some((word) => word.id === id))).toBe(true);
      expect(lesson.blank.sentence).toContain('___');
      expect(lesson.blank.options).toContain(lesson.blank.answer);
      expect(lesson.dialogue.options).toContain(lesson.dialogue.answer);
    }
  });

  it('keeps the added German-Arabic pairs clear and suitable for everyday A1/A2 scenes', () => {
    expect(['home-07-01', 'market-07-02', 'traffic-07-02', 'work-07-01', 'health-07-02'].map((id) => {
      const word = wordsById.get(id);
      return [word?.german, word?.arabic];
    })).toEqual([
      ['Schule', 'مدرسة'], ['Suppe', 'حساء'], ['Radweg', 'مسار الدراجات'],
      ['Feierabend', 'نهاية الدوام'], ['Fußball', 'كرة القدم'],
    ]);
  });

  it('keeps the new fitness adjective in direct dictionary form', () => {
    expect(wordsById.get('health-07-06')).toMatchObject({ german: 'fit', arabic: 'لائق بدنيًا' });
  });

  it('renders five tasks per mission and covers all eight task types', () => {
    const types = new Set(lessons.flatMap((lesson) => createTasks(lesson).map((task) => task.type)));
    expect(types.size).toBe(8);
    for (const lesson of lessons) {
      const tasks = createTasks(lesson);
      expect(tasks).toHaveLength(5);
      for (const task of tasks) {
        expect(task.options).toContainEqual(task.word);
        if (task.type === 'symbol') expect(new Set(task.options.map(wordVisualKey)).size).toBe(task.options.length);
      }
    }
  });

  it('tests five different words per mission', () => {
    for (const lesson of lessons) {
      const tasks = createTasks(lesson);
      expect(new Set(tasks.map((task) => task.word.id)).size, lesson.id).toBe(5);
      for (const task of tasks) {
        if (task.type !== 'symbol') continue;
        expect(task.options.filter((option) => wordVisualKey(option) === wordVisualKey(task.word)), `${lesson.id} ${task.word.id}`).toHaveLength(1);
        const shared = lesson.wordIds.filter((id) => { const word = wordsById.get(id); return word && wordVisualKey(word) === wordVisualKey(task.word); });
        expect(shared[0], `${lesson.id} ${task.word.id} is not the first owner of ${wordVisualKey(task.word)}`).toBe(task.word.id);
      }
    }
  });

  it('keeps the correct blank and dialogue answer out of a fixed slot', () => {
    for (const lesson of lessons) {
      expect(new Set(lesson.blank.options).size).toBe(3);
      expect(new Set(lesson.dialogue.options).size).toBe(3);
    }
    const blankSlots = new Set(lessons.map((lesson) => lesson.blank.options.indexOf(lesson.blank.answer)));
    const dialogueSlots = new Set(lessons.map((lesson) => lesson.dialogue.options.indexOf(lesson.dialogue.answer)));
    expect(blankSlots).toEqual(new Set([0, 1, 2]));
    expect(dialogueSlots).toEqual(new Set([0, 1, 2]));
  });

  it('offers a varied word order for sentence building', () => {
    for (const lesson of lessons) {
      const phrase = lesson.phrase.german.split(' ');
      const orders = new Set<string>();
      for (let seed = 0; seed < 12; seed += 1) {
        const tokens = shuffleTokens(phrase, seed);
        expect([...tokens].sort()).toEqual([...phrase].sort());
        orders.add(tokens.join(' '));
      }
      expect(orders.size).toBeGreaterThan(4);
    }
    const buildTasks = lessons.flatMap((lesson) => createTasks(lesson).filter((task) => task.type === 'build'));
    expect(buildTasks.length).toBeGreaterThan(0);
    for (const task of buildTasks) {
      expect([...task.buildTokens].sort()).toEqual([...task.lesson.phrase.german.split(' ')].sort());
    }
  });
});

describe('progress', () => {
  it('opens missions in order and only awards XP once', () => {
    const start = freshProgress();
    expect(lessonUnlocked(start, lessons[0])).toBe(true);
    expect(lessonUnlocked(start, lessons[1])).toBe(false);
    const done = completeMission(start, lessons[0], 5, 1_000);
    expect(done.xp).toBe(55);
    expect(done.stars[lessons[0].id]).toBe(3);
    expect(lessonUnlocked(done, lessons[1])).toBe(true);
    expect(lessonUnlocked(done, lessons[5])).toBe(false);
    const replay = completeMission(done, lessons[0], 1, 2_000);
    expect(replay.xp).toBe(55);
    expect(replay.stars[lessons[0].id]).toBe(3);
    expect(replay.words[lessons[0].wordIds[0]]).toEqual(done.words[lessons[0].wordIds[0]]);
  });

  it('keeps city gates on the original five-mission path while bonus missions stay in sequence', () => {
    const start = freshProgress();
    expect(worldUnlocked(start, 'home')).toBe(true);
    expect(worldUnlocked(start, 'market')).toBe(false);
    expect(worldUnlocked(start, 'unknown')).toBe(false);
    const afterFiveHomeMissions = { ...start, completed: lessons.slice(0, 5).map((lesson) => lesson.id) };
    expect(worldUnlocked(afterFiveHomeMissions, 'market')).toBe(true);
    expect(lessonUnlocked(afterFiveHomeMissions, lessons[5])).toBe(true);
    expect(lessonUnlocked(afterFiveHomeMissions, lessons[30])).toBe(false);
    const afterOldPath = { ...start, completed: lessons.slice(0, 30).map((lesson) => lesson.id) };
    expect(lessonUnlocked(afterOldPath, lessons[30])).toBe(true);
    expect(lessonUnlocked(afterOldPath, lessons[31])).toBe(false);
  });

  it('never lets replays inflate word mastery or push the review date', () => {
    const lesson = lessons[0];
    const first = completeMission(freshProgress(), lesson, 5, 1_000);
    let replayed = first;
    for (let attempt = 0; attempt < 10; attempt += 1) replayed = completeMission(replayed, lesson, 5, 10_000 + attempt);
    expect(replayed.xp).toBe(first.xp);
    expect(replayed.words).toEqual(first.words);
  });

  it('prioritizes due and low-mastery words for review', () => {
    const lesson = lessons[0];
    let progress = completeMission(freshProgress(), lesson, 3, 0);
    for (const id of lesson.wordIds.slice(1)) progress = answerPractice(progress, id, true, 0);
    const chosen = lesson.wordIds[0];
    const lower = answerPractice(progress, chosen, false, 1_000);
    expect(practiceQueue(lower, 86_402_000)[0].id).toBe(chosen);
    expect(practiceQueue(lower, 300_000_000)[0].id).toBe(chosen);
    expect(practiceQueue(lower, 86_402_000)).toHaveLength(6);
    expect(starsFor(3)).toBe(2);
  });
});

describe('local progress storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips progress and recovers from corrupt data', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const progress = completeMission(freshProgress(), lessons[0], 4);
    saveProgress(progress);
    expect(loadProgress().xp).toBe(progress.xp);
    data.set(STORAGE_KEY, '{broken');
    expect(loadProgress()).toEqual(freshProgress());
  });

  it('sanitizes malformed stored progress instead of crashing', () => {
    const payloads = [
      '{"version":1,"nickname":"a","avatar":"x","xp":0,"completed":[],"stars":null,"words":{},"settings":{}}',
      '{"version":1,"xp":0,"completed":[],"stars":7,"words":{},"settings":{}}',
      '{"version":1,"xp":0,"completed":"all","stars":{},"words":[],"settings":"nope"}',
      '{"version":1,"xp":-5,"completed":["home-01","home-01",5],"stars":{"home-01":99,"home-02":-3},'
        + '"words":{"home-01-01":{"mastery":"x","dueAt":1},"home-01-02":7},"settings":{"sound":"yes","hints":false}}',
    ];
    for (const payload of payloads) {
      const data = new Map<string, string>([[STORAGE_KEY, payload]]);
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      });
      const loaded = loadProgress();
      expect(Number.isFinite(loaded.xp) && loaded.xp >= 0).toBe(true);
      expect(loaded.completed.every((id) => typeof id === 'string')).toBe(true);
      expect(Object.values(loaded.stars).every((value) => Number.isInteger(value) && value >= 0 && value <= 3)).toBe(true);
      for (const entry of Object.values(loaded.words)) {
        expect(Number.isInteger(entry.mastery) && entry.mastery >= 0 && entry.mastery <= 5).toBe(true);
        expect(Number.isFinite(entry.dueAt)).toBe(true);
      }
      for (const value of Object.values(loaded.settings)) expect(typeof value).toBe('boolean');
    }
  });
});
