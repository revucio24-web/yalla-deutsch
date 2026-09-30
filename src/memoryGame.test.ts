import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MemoryGame from './MemoryGame';
import { vocabulary } from './domain';
import {
  createMemoryRound, hideMismatchedCards, initialMemoryGameState,
  isMemoryMatch, isMemoryRoundComplete, revealMemoryCard,
} from './memoryGame';

const sampleWords = vocabulary.slice(0, 6);

describe('word-pair game', () => {
  it('creates a deterministic round with six German-Arabic pairs and no missing faces', () => {
    const first = createMemoryRound(vocabulary, 41);
    const again = createMemoryRound(vocabulary, 41);
    expect(first.words).toHaveLength(6);
    expect(first.cards).toHaveLength(12);
    expect(first.cards).toEqual(again.cards);
    for (const word of first.words) {
      const pair = first.cards.filter((card) => card.pairId === word.id);
      expect(pair.map((card) => card.face).sort()).toEqual(['ar', 'de']);
      expect(pair.find((card) => card.face === 'de')?.label).toContain(word.german);
      expect(pair.find((card) => card.face === 'ar')?.label).toBe(word.arabic);
    }
  });

  it('keeps visible German and Arabic labels unique when the source contains duplicate pairs or translations', () => {
    const ambiguousWords = [
      { ...sampleWords[0], id: 'water-a', german: 'Wasser', arabic: 'ماء', article: 'das' },
      { ...sampleWords[0], id: 'water-b', german: 'Wasser', arabic: 'ماء', article: 'das' },
      { ...sampleWords[0], id: 'clock', german: 'Uhr', arabic: 'ساعة', article: 'die' },
      { ...sampleWords[0], id: 'hour', german: 'Stunde', arabic: 'ساعة', article: 'die' },
      { ...sampleWords[0], id: 'pay-a', german: 'bezahlen', arabic: 'يدفع', article: null },
      { ...sampleWords[0], id: 'pay-b', german: 'zahlen', arabic: 'يدفع', article: null },
      { ...sampleWords[0], id: 'book', german: 'Buch', arabic: 'كتاب', article: 'das' },
      { ...sampleWords[0], id: 'table', german: 'Tisch', arabic: 'طاولة', article: 'der' },
      { ...sampleWords[0], id: 'house', german: 'Haus', arabic: 'بيت', article: 'das' },
      { ...sampleWords[0], id: 'plate', german: 'Teller', arabic: 'طبق', article: 'der' },
    ];

    for (let seed = 0; seed < 64; seed += 1) {
      const round = createMemoryRound(ambiguousWords, seed);
      expect(round.words).toHaveLength(6);
      for (const face of ['de', 'ar'] as const) {
        const labels = round.cards.filter((card) => card.face === face).map((card) => card.label.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase());
        expect(new Set(labels).size).toBe(6);
      }
    }
  });

  it('requires one German and one Arabic card for a match', () => {
    const round = createMemoryRound(sampleWords, 2);
    const pair = round.cards.filter((card) => card.pairId === round.words[0].id);
    const germanCards = round.cards.filter((card) => card.face === 'de');
    expect(isMemoryMatch(pair[0], pair[1])).toBe(true);
    expect(isMemoryMatch(pair[0], pair[0])).toBe(false);
    expect(isMemoryMatch(germanCards[0], germanCards[1])).toBe(false);
  });

  it('counts complete turns once, keeps a mismatch visible until the learner clears it, and ignores matched cards', () => {
    const round = createMemoryRound(sampleWords, 7);
    const firstPairId = round.words[0].id;
    const otherPairId = round.words[1].id;
    const firstGerman = round.cards.find((card) => card.pairId === firstPairId && card.face === 'de')!;
    const firstArabic = round.cards.find((card) => card.pairId === firstPairId && card.face === 'ar')!;
    const otherArabic = round.cards.find((card) => card.pairId === otherPairId && card.face === 'ar')!;

    const oneOpen = revealMemoryCard(initialMemoryGameState(), firstGerman.id, round.cards);
    expect(oneOpen.moves).toBe(0);
    expect(revealMemoryCard(oneOpen, firstGerman.id, round.cards)).toBe(oneOpen);

    const miss = revealMemoryCard(oneOpen, otherArabic.id, round.cards);
    expect(miss.lastResult).toBe('miss');
    expect(miss.moves).toBe(1);
    expect(miss.openCardIds).toHaveLength(2);
    expect(revealMemoryCard(miss, firstArabic.id, round.cards)).toBe(miss);

    const readyAgain = hideMismatchedCards(miss);
    expect(readyAgain.openCardIds).toEqual([]);
    expect(readyAgain.moves).toBe(1);
    expect(readyAgain.lastResult).toBe('idle');

    const matched = revealMemoryCard(revealMemoryCard(readyAgain, firstGerman.id, round.cards), firstArabic.id, round.cards);
    expect(matched.lastResult).toBe('match');
    expect(matched.matchedPairIds).toEqual([firstPairId]);
    expect(matched.openCardIds).toEqual([]);
    expect(matched.moves).toBe(2);
    expect(revealMemoryCard(matched, firstGerman.id, round.cards)).toBe(matched);
    expect(isMemoryRoundComplete(matched, round.words.length)).toBe(false);
  });

  it('finishes only after every pair is found', () => {
    const round = createMemoryRound(sampleWords, 99);
    let state = initialMemoryGameState();
    expect(isMemoryRoundComplete(state, round.words.length)).toBe(false);
    for (const word of round.words) {
      const german = round.cards.find((card) => card.pairId === word.id && card.face === 'de')!;
      const arabic = round.cards.find((card) => card.pairId === word.id && card.face === 'ar')!;
      state = revealMemoryCard(state, german.id, round.cards);
      state = revealMemoryCard(state, arabic.id, round.cards);
    }
    expect(state.moves).toBe(6);
    expect(isMemoryRoundComplete(state, round.words.length)).toBe(true);
  });

  it('renders large native buttons with keyboard semantics and separate German/Arabic language tags', () => {
    const markup = renderToStaticMarkup(createElement(MemoryGame, {
      words: sampleWords,
      onPairFound: () => undefined,
      seed: 17,
    }));
    expect((markup.match(/class="memory-card /g) ?? []).length).toBe(12);
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('lang="de"');
    expect(markup).toContain('lang="ar"');
    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain('role="group" aria-label="لعبة الأزواج"');
  });
});
