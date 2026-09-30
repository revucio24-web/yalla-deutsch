import worldsJson from './data/worlds.json';
import lessonsJson from './data/lessons.json';
import vocabularyJson from './data/vocabulary.json';
import type { DialogTrainerProgress } from './dialogTrainer';
import { emptyDialogTrainerProgress, sanitizeDialogTrainerProgress } from './dialogTrainer';
import { isWordIllustrationKey, type WordIllustrationKey } from './illustrationKeys';

export type World = { id: string; de: string; ar: string; subtitle: string; icon: string; color: string };
export type Word = { id: string; german: string; arabic: string; article: string | null; icon: string; illustration?: WordIllustrationKey; world: string };
export type Lesson = {
  id: string; world: string; order: number; titleDe: string; titleAr: string; wordIds: string[];
  phrase: { german: string; arabic: string };
  blank: { sentence: string; answer: string; options: string[] };
  dialogue: { prompt: string; promptAr: string; answer: string; options: string[] };
};
export type Settings = { sound: boolean; hints: boolean; reduceMotion: boolean; largeText: boolean };
export type WordProgress = { mastery: number; dueAt: number };
export type Progress = {
  version: 1; nickname: string; avatar: string; xp: number; completed: string[];
  stars: Record<string, number>; words: Record<string, WordProgress>; settings: Settings;
  dialogTrainer: DialogTrainerProgress;
};
export type TaskType = 'choice' | 'symbol' | 'listen' | 'match' | 'build' | 'blank' | 'dialogue' | 'basket';
export type Task = { type: TaskType; word: Word; options: Word[]; pairWords: Word[]; buildTokens: string[]; lesson: Lesson };

export const worlds = worldsJson as World[];
export const lessons = lessonsJson as Lesson[];
export const vocabulary = vocabularyJson as Word[];
export const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
export const STORAGE_KEY = 'yalla-deutsch-progress-v1';

export function wordVisualKey(word: Pick<Word, 'icon' | 'illustration'>): string {
  return isWordIllustrationKey(word.illustration) ? `illustration:${word.illustration}` : `emoji:${word.icon}`;
}

const taskPatterns: TaskType[][] = [
  ['choice', 'listen', 'match', 'build', 'dialogue'],
  ['symbol', 'choice', 'blank', 'basket', 'dialogue'],
  ['listen', 'match', 'build', 'blank', 'dialogue'],
  ['symbol', 'basket', 'choice', 'build', 'dialogue'],
  ['listen', 'choice', 'match', 'blank', 'dialogue'],
];
const repeatDays = [0, 1, 3, 7, 14, 30];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleTokens(tokens: readonly string[], seed: number): string[] {
  const result = [...tokens];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  if (result.length > 1 && result.every((token, index) => token === tokens[index])) {
    result.push(result.shift() as string);
  }
  return result;
}

export function lessonWords(lesson: Lesson): Word[] {
  return lesson.wordIds.map((id) => wordsById.get(id)).filter((word): word is Word => Boolean(word));
}

export function createTasks(lesson: Lesson, seed = lesson.order): Task[] {
  const words = lessonWords(lesson);
  if (!words.length) return [];
  const uniqueSymbols = words.filter((entry, position) => words.findIndex((candidate) => wordVisualKey(candidate) === wordVisualKey(entry)) === position);
  const pattern = taskPatterns[lesson.order % taskPatterns.length];
  const targets = pattern.map((_, index) => words[(index + lesson.order) % words.length]);
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] !== 'symbol' || uniqueSymbols.includes(targets[index])) continue;
    const usedElsewhere = new Set(targets.filter((_, other) => other !== index).map((word) => word.id));
    const alternative = uniqueSymbols.find((entry) => !usedElsewhere.has(entry.id));
    if (alternative) targets[index] = alternative;
  }
  return pattern.map((type, index) => {
    const word = targets[index];
    const pool = type === 'symbol' ? uniqueSymbols : words;
    const options = [word, ...pool.filter((entry) => entry.id !== word.id)].slice(0, 4);
    const shift = (lesson.order + index) % options.length;
    const rotated = [...options.slice(shift), ...options.slice(0, shift)];
    const pairWords = [words[0], words[2], words[4]];
    const buildTokens = type === 'build' ? shuffleTokens(lesson.phrase.german.split(' '), seed + index) : [];
    return { type, word, options: rotated, pairWords, buildTokens, lesson };
  });
}

export function freshProgress(): Progress {
  return {
    version: 1, nickname: '', avatar: '✦', xp: 0, completed: [], stars: {}, words: {},
    settings: { sound: true, hints: true, reduceMotion: false, largeText: false },
    dialogTrainer: emptyDialogTrainerProgress(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readStars(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const stars: Record<string, number> = {};
  for (const [id, score] of Object.entries(value)) {
    if (typeof score === 'number' && Number.isFinite(score)) stars[id] = Math.max(0, Math.min(3, Math.round(score)));
  }
  return stars;
}

function readWords(value: unknown): Record<string, WordProgress> {
  if (!isRecord(value)) return {};
  const words: Record<string, WordProgress> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const mastery = typeof entry.mastery === 'number' && Number.isFinite(entry.mastery)
      ? Math.max(0, Math.min(5, Math.round(entry.mastery)))
      : 0;
    const dueAt = typeof entry.dueAt === 'number' && Number.isFinite(entry.dueAt) ? entry.dueAt : 0;
    words[id] = { mastery, dueAt };
  }
  return words;
}

export function loadProgress(): Progress {
  const base = freshProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1) return base;
    const settings = isRecord(data.settings) ? data.settings : {};
    return {
      version: 1,
      nickname: typeof data.nickname === 'string' ? data.nickname : base.nickname,
      avatar: typeof data.avatar === 'string' ? data.avatar : base.avatar,
      xp: typeof data.xp === 'number' && Number.isFinite(data.xp) ? Math.max(0, Math.round(data.xp)) : 0,
      completed: [...new Set((Array.isArray(data.completed) ? data.completed : []).filter((id): id is string => typeof id === 'string'))],
      stars: readStars(data.stars),
      words: readWords(data.words),
      settings: {
        sound: readBoolean(settings.sound, base.settings.sound),
        hints: readBoolean(settings.hints, base.settings.hints),
        reduceMotion: readBoolean(settings.reduceMotion, base.settings.reduceMotion),
        largeText: readBoolean(settings.largeText, base.settings.largeText),
      },
      dialogTrainer: sanitizeDialogTrainerProgress(data.dialogTrainer),
    };
  } catch {
    return base;
  }
}

export function saveProgress(progress: Progress): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { /* Private browsing may block storage; the current session remains playable. */ }
}

export function lessonUnlocked(progress: Progress, lesson: Lesson): boolean {
  return lesson.order === 0 || progress.completed.includes(lessons[lesson.order - 1].id);
}

const CORE_LESSONS_PER_WORLD = 5;

export function worldUnlocked(progress: Progress, worldId: string): boolean {
  const worldIndex = worlds.findIndex((world) => world.id === worldId);
  if (worldIndex === 0) return true;
  if (worldIndex < 0) return false;
  const gateLesson = lessons[worldIndex * CORE_LESSONS_PER_WORLD - 1];
  return Boolean(gateLesson && progress.completed.includes(gateLesson.id));
}

export function nextLesson(progress: Progress): Lesson | undefined {
  return lessons.find((lesson) => !progress.completed.includes(lesson.id));
}

export function levelForXp(xp: number): number { return Math.floor(Math.max(0, xp) / 100) + 1; }
export function levelPercent(xp: number): number { return Math.max(0, xp % 100); }

export function starsFor(firstTryCount: number): number {
  return firstTryCount === 5 ? 3 : firstTryCount >= 3 ? 2 : 1;
}

export function rewardFor(firstTryCount: number): number {
  return 20 + firstTryCount * 5 + (firstTryCount === 5 ? 10 : 0);
}

export function completeMission(progress: Progress, lesson: Lesson, firstTryCount: number, now = Date.now()): Progress {
  const first = !progress.completed.includes(lesson.id);
  const stars = starsFor(firstTryCount);
  const nextWords = { ...progress.words };
  if (first) {
    for (const id of lesson.wordIds) {
      const mastery = Math.min(5, (nextWords[id]?.mastery ?? 0) + 1);
      nextWords[id] = { mastery, dueAt: now + repeatDays[mastery] * 86_400_000 };
    }
  }
  return {
    ...progress,
    xp: progress.xp + (first ? rewardFor(firstTryCount) : 0),
    completed: first ? [...progress.completed, lesson.id] : progress.completed,
    stars: { ...progress.stars, [lesson.id]: Math.max(progress.stars[lesson.id] ?? 0, stars) },
    words: nextWords,
  };
}

export function practiceQueue(progress: Progress, now = Date.now()): Word[] {
  return vocabulary.filter((word) => Boolean(progress.words[word.id]))
    .sort((a, b) => {
      const pa = progress.words[a.id]; const pb = progress.words[b.id];
      const dueA = pa.dueAt <= now ? 0 : 1; const dueB = pb.dueAt <= now ? 0 : 1;
      return dueA - dueB || pa.mastery - pb.mastery || pa.dueAt - pb.dueAt;
    }).slice(0, 10);
}

export function answerPractice(progress: Progress, id: string, correct: boolean, now = Date.now()): Progress {
  const previous = progress.words[id] ?? { mastery: 0, dueAt: now };
  const mastery = correct ? Math.min(5, previous.mastery + 1) : Math.max(1, previous.mastery - 1);
  return { ...progress, words: { ...progress.words, [id]: { mastery, dueAt: now + repeatDays[mastery] * 86_400_000 } } };
}
