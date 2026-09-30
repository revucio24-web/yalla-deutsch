import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshProgress, loadProgress, saveProgress, STORAGE_KEY } from './domain';
import {
  dialogScenarios, recordDialogAttempt, sanitizeDialogTrainerProgress,
} from './dialogTrainer';

describe('Dialogtrainer-Inhalte', () => {
  it('bietet drei vollständige Alltagssituationen mit verständlichen Antwortoptionen', () => {
    expect(dialogScenarios.map((scenario) => scenario.id)).toEqual(['cafe', 'bakery', 'supermarket']);
    for (const scenario of dialogScenarios) {
      expect(scenario.turns).toHaveLength(3);
      for (const turn of scenario.turns) {
        expect(turn.prompt).toBeTruthy();
        expect(turn.promptAr).toBeTruthy();
        expect(turn.choices).toHaveLength(3);
        expect(turn.choices.map((choice) => choice.id)).toContain(turn.answerId);
        for (const choice of turn.choices) {
          expect(choice.text).toBeTruthy();
          expect(choice.translationAr).toBeTruthy();
        }
      }
    }
  });
});

describe('Dialogtrainer-Fortschritt', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('zählt Versuche und bewahrt den persönlichen Bestwert', () => {
    const first = recordDialogAttempt({}, 'cafe', 2);
    expect(first.cafe).toEqual({ attempts: 1, bestScore: 2, completed: true });
    const replay = recordDialogAttempt(first, 'cafe', 1);
    expect(replay.cafe).toEqual({ attempts: 2, bestScore: 2, completed: true });
    expect(recordDialogAttempt(replay, 'cafe', 3).cafe.bestScore).toBe(3);
    expect(recordDialogAttempt(replay, 'unknown', 3)).toBe(replay);
  });

  it('begrenzt beschädigte oder fremde gespeicherte Werte', () => {
    expect(sanitizeDialogTrainerProgress({
      cafe: { attempts: -4, bestScore: 99, completed: true },
      bakery: { attempts: 'many', bestScore: 2.8, completed: false },
      unknown: { attempts: 100, bestScore: 100, completed: true },
    })).toEqual({
      cafe: { attempts: 0, bestScore: 3, completed: true },
      bakery: { attempts: 0, bestScore: 2, completed: false },
    });
    expect(sanitizeDialogTrainerProgress('{broken')).toEqual({});
  });

  it('speichert Dialogpunkte zusammen mit dem vorhandenen Lernstand lokal', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    const initial = freshProgress();
    const progress = {
      ...initial,
      dialogTrainer: recordDialogAttempt(initial.dialogTrainer, 'bakery', 3),
    };
    saveProgress(progress);
    expect(JSON.parse(store.get(STORAGE_KEY) ?? '{}').dialogTrainer.bakery.bestScore).toBe(3);
    expect(loadProgress().dialogTrainer).toEqual(progress.dialogTrainer);
    expect(freshProgress().dialogTrainer).toEqual({});
  });
});
