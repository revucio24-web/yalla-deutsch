import type { Word } from './domain';

export type MemoryFace = 'de' | 'ar';
export type MemoryCard = {
  id: string;
  pairId: string;
  face: MemoryFace;
  label: string;
};
export type MemoryRound = { words: Word[]; cards: MemoryCard[] };
export type MemoryGameState = {
  openCardIds: string[];
  matchedPairIds: string[];
  moves: number;
  lastResult: 'idle' | 'match' | 'miss';
};

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

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function normalizeMemoryLabel(label: string): string {
  return label.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function createMemoryRound(words: readonly Word[], seed: number): MemoryRound {
  const chosenWords: Word[] = [];
  const germanLabels = new Set<string>();
  const arabicLabels = new Set<string>();
  for (const word of shuffle(words, seed)) {
    const germanLabel = normalizeMemoryLabel(word.article ? `${word.article} ${word.german}` : word.german);
    const arabicLabel = normalizeMemoryLabel(word.arabic);
    if (!germanLabel || !arabicLabel || germanLabels.has(germanLabel) || arabicLabels.has(arabicLabel)) continue;
    chosenWords.push(word);
    germanLabels.add(germanLabel);
    arabicLabels.add(arabicLabel);
    if (chosenWords.length === 6) break;
  }
  const cards = chosenWords.flatMap((word): MemoryCard[] => [
    {
      id: `${word.id}-de`,
      pairId: word.id,
      face: 'de',
      label: word.article ? `${word.article} ${word.german}` : word.german,
    },
    { id: `${word.id}-ar`, pairId: word.id, face: 'ar', label: word.arabic },
  ]);
  return { words: chosenWords, cards: shuffle(cards, seed ^ 0x9e3779b9) };
}

export function initialMemoryGameState(): MemoryGameState {
  return { openCardIds: [], matchedPairIds: [], moves: 0, lastResult: 'idle' };
}

export function isMemoryMatch(first: MemoryCard | undefined, second: MemoryCard | undefined): boolean {
  return Boolean(first && second && first.id !== second.id && first.pairId === second.pairId && first.face !== second.face);
}

export function revealMemoryCard(state: MemoryGameState, cardId: string, cards: readonly MemoryCard[]): MemoryGameState {
  const card = cards.find((item) => item.id === cardId);
  if (!card || state.matchedPairIds.includes(card.pairId)
    || state.openCardIds.includes(cardId) || state.openCardIds.length >= 2) return state;

  const openCardIds = [...state.openCardIds, cardId];
  if (openCardIds.length < 2) return { ...state, openCardIds, lastResult: 'idle' };

  const [firstId, secondId] = openCardIds;
  const first = cards.find((item) => item.id === firstId);
  const second = cards.find((item) => item.id === secondId);
  const moves = state.moves + 1;
  if (isMemoryMatch(first, second)) {
    return {
      openCardIds: [],
      matchedPairIds: [...state.matchedPairIds, card.pairId],
      moves,
      lastResult: 'match',
    };
  }
  return { ...state, openCardIds, moves, lastResult: 'miss' };
}

export function hideMismatchedCards(state: MemoryGameState): MemoryGameState {
  if (state.lastResult !== 'miss') return state;
  return { ...state, openCardIds: [], lastResult: 'idle' };
}

export function isMemoryRoundComplete(state: MemoryGameState, pairCount: number): boolean {
  return pairCount > 0 && state.matchedPairIds.length === pairCount;
}
