import { useEffect, useMemo, useState } from 'react';
import {
  createMemoryRound, hideMismatchedCards, initialMemoryGameState,
  isMemoryRoundComplete, revealMemoryCard, scheduleMismatchedCardsAutoClose,
} from './memoryGame';
import type { MemoryRound } from './memoryGame';
import type { Word } from './domain';

type Props = { words: readonly Word[]; onPairFound: (wordId: string) => void; seed?: number };

export default function MemoryGame({ words, onPairFound, seed }: Props) {
  const [roundSeed, setRoundSeed] = useState(() => seed ?? Date.now());
  const round = useMemo(() => createMemoryRound(words, roundSeed), [words, roundSeed]);
  return <MemoryRoundView
    key={roundSeed}
    round={round}
    onPairFound={onPairFound}
    onNewRound={() => setRoundSeed((current) => current + 0x9e3779b9)}
  />;
}

function MemoryRoundView({ round, onPairFound, onNewRound }: {
  round: MemoryRound; onPairFound: (wordId: string) => void; onNewRound: () => void;
}) {
  const [game, setGame] = useState(initialMemoryGameState);
  useEffect(() => scheduleMismatchedCardsAutoClose(game, () => {
    setGame((current) => current === game ? hideMismatchedCards(current) : current);
  }), [game]);
  const completed = isMemoryRoundComplete(game, round.words.length);
  const openCards = new Set(game.openCardIds);
  const matchedPairs = new Set(game.matchedPairIds);

  const reveal = (cardId: string) => {
    if (completed) return;
    const next = revealMemoryCard(game, cardId, round.cards);
    if (next === game) return;
    const newPair = next.matchedPairIds.find((pairId) => !game.matchedPairIds.includes(pairId));
    if (newPair) onPairFound(newPair);
    setGame(next);
  };

  const status = completed
    ? <><span lang="ar" dir="rtl">أحسنت! وجدت كل الأزواج في {game.moves} محاولات.</span><br /><span lang="de" dir="ltr">Super! Du hast alle Paare in {game.moves} Zügen gefunden.</span></>
    : game.lastResult === 'match'
      ? <><span lang="ar" dir="rtl">رائع! وجدت زوجاً. بقي {round.words.length - game.matchedPairIds.length}.</span><br /><span lang="de" dir="ltr">Gut gefunden! Noch {round.words.length - game.matchedPairIds.length} Paare.</span></>
      : game.lastResult === 'miss'
        ? <><span lang="ar" dir="rtl">ليستا زوجاً. حاول مرة أخرى!</span><br /><span lang="de" dir="ltr">Das ist kein Paar. Versuch es noch einmal!</span></>
        : <><span lang="ar" dir="rtl">اقلب بطاقتين وابحث عن الكلمة وترجمتها.</span><br /><span lang="de" dir="ltr">Finde das deutsche Wort mit seiner arabischen Übersetzung.</span></>;

  return <section className="page memory-game-page">
    <div className="page-heading">
      <span className="eyebrow" lang="de" dir="ltr">KLEINES WORTSPIEL · A1–A2</span>
      <h1 lang="ar" dir="rtl">لعبة الأزواج</h1>
      <p lang="de" dir="ltr">Drehe zwei Karten um und finde passende Wörter.</p>
    </div>
    <div className="memory-game-panel">
      <div className="memory-game-intro">
        <div>
          <span className="eyebrow" lang="de" dir="ltr">MERKEN · FINDEN · LERNEN</span>
          <h2 lang="de" dir="ltr">Wort-Paare</h2>
          <p lang="ar" dir="rtl">كل زوج صحيح يساعدك على تذكّر الكلمة الألمانية ومعناها.</p>
        </div>
        <div className="memory-game-stats" aria-label="Spielstand">
          <div><span lang="ar" dir="rtl">الأزواج</span><small lang="de" dir="ltr">Paare</small><b dir="ltr">{game.matchedPairIds.length} / {round.words.length}</b></div>
          <div><span lang="ar" dir="rtl">المحاولات</span><small lang="de" dir="ltr">Züge</small><b dir="ltr">{game.moves}</b></div>
        </div>
      </div>

      <p className="memory-feedback" role="status" aria-live="polite">{status}</p>
      {round.cards.length ? <div className="memory-board" role="group" aria-label="لعبة الأزواج">
        {round.cards.map((card, index) => {
          const matched = matchedPairs.has(card.pairId);
          const selected = openCards.has(card.id);
          const revealed = matched || selected;
          const language = card.face === 'de' ? 'de' : 'ar';
          const matchedLabel = card.face === 'de' ? 'Paar gefunden' : 'تم العثور على الزوج';
          return <button
            key={card.id}
            type="button"
            className={`memory-card ${revealed ? 'is-open' : ''} ${matched ? 'is-matched' : ''}`}
            aria-label={revealed ? `${card.label}${matched ? ` · ${matchedLabel}` : ''}` : `بطاقة مخفية ${index + 1}`}
            aria-pressed={revealed}
            disabled={matched}
            dir={card.face === 'de' ? 'ltr' : 'rtl'}
            lang={revealed ? language : 'ar'}
            onClick={() => reveal(card.id)}
          >
            {revealed
              ? <span className="memory-card-label" lang={language}>{card.label}</span>
              : <span className="memory-card-back" aria-hidden="true">✦</span>}
          </button>;
        })}
      </div> : <p lang="ar" dir="rtl">لا توجد كلمات في هذه الجولة بعد.</p>}

      <div className="memory-game-actions">
        <button type="button" className="primary-btn" onClick={onNewRound}>
          <span lang="ar" dir="rtl">جولة جديدة</span> · <span lang="de" dir="ltr">Neue Runde</span> <span aria-hidden="true">↻</span>
        </button>
      </div>
    </div>
  </section>;
}
