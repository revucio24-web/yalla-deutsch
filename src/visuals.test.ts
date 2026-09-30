import { describe, expect, it } from 'vitest';
import { dialogScenarios } from './dialogTrainer';
import { createTasks, lessons, vocabulary, wordVisualKey, wordsById } from './domain';
import { isWordIllustrationKey, wordIllustrationKeys } from './illustrationKeys';

const correctedIllustrations: Record<string, string> = {
  'home-03-03': 'room',
  'home-04-01': 'table',
  'home-04-02': 'chair',
  'home-04-05': 'wardrobe',
  'home-04-06': 'lamp',
  'home-06-05': 'visitor',
  'market-03-02': 'bread-roll',
  'market-03-05': 'flour',
  'market-04-06': 'bottle',
  'market-05-02': 'cash-register',
  'market-06-03': 'gram',
  'market-06-06': 'pay',
  'traffic-02-03': 'platform',
  'traffic-02-05': 'intersection',
  'traffic-03-03': 'ticket-machine',
  'traffic-03-05': 'departure',
  'traffic-03-06': 'arrival',
  'traffic-04-02': 'path',
  'traffic-04-04': 'corner',
  'traffic-05-04': 'driver',
  'traffic-05-05': 'delay',
  'traffic-05-06': 'transfer',
  'traffic-06-01': 'destination',
  'traffic-06-05': 'reserve',
  'work-04-01': 'profession',
  'work-04-05': 'interview',
  'work-06-04': 'reschedule',
  'health-01-01': 'head',
  'health-02-03': 'abdomen',
  'health-02-04': 'back',
  'health-03-06': 'pharmacy',
  'health-04-01': 'pain',
  'health-04-03': 'cough',
  'health-05-01': 'medicine',
  'health-05-02': 'tablet',
  'health-06-03': 'allergy',
  'health-06-04': 'healthy',
};

describe('word illustrations', () => {
  it('keeps every authored illustration annotation backed by the renderer registry', () => {
    for (const word of vocabulary) {
      if (word.illustration) expect(isWordIllustrationKey(word.illustration), word.id).toBe(true);
    }
    expect(wordIllustrationKeys).toHaveLength(37);
  });

  it('keeps each corrected German-Arabic pair on its dedicated local artwork', () => {
    expect(Object.keys(correctedIllustrations)).toHaveLength(37);
    for (const [id, expectedKey] of Object.entries(correctedIllustrations)) {
      const word = wordsById.get(id);
      expect(word, `missing vocabulary pair ${id}`).toBeDefined();
      expect(word?.illustration, `${id} artwork`).toBe(expectedKey);
      expect(wordIllustrationKeys, `${id} renderer`).toContain(expectedKey);
      expect(wordVisualKey(word!), `${id} visual key`).toBe(`illustration:${expectedKey}`);
    }
    expect(wordsById.get('traffic-03-03')?.arabic).toBe('آلة التذاكر');
    expect(new Set(Object.values(correctedIllustrations)).size).toBe(37);
  });

  it('never presents duplicate visual choices in a symbol mission', () => {
    for (const lesson of lessons) {
      for (const task of createTasks(lesson).filter((entry) => entry.type === 'symbol')) {
        const visualKeys = task.options.map(wordVisualKey);
        expect(new Set(visualKeys).size, lesson.id).toBe(task.options.length);
        expect(task.options.some((option) => option.id === task.word.id), lesson.id).toBe(true);
      }
    }
    expect(vocabulary.every((word) => word.icon || word.illustration)).toBe(true);
  });

  it('keeps dialogue cards matched to their real-life setting', () => {
    expect(dialogScenarios.map(({ id, icon }) => [id, icon])).toEqual([
      ['cafe', '☕'],
      ['bakery', '🥨'],
      ['supermarket', '🛒'],
    ]);
  });
});
