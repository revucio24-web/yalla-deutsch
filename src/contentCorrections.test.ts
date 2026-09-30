import { describe, expect, it } from 'vitest';
import { completeMission, freshProgress, isAnswerAccepted, lessons, wordsById } from './domain';
import { dialogScenarios } from './dialogTrainer';

function getLesson(id: string) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) throw new Error(`Unbekannte Mission: ${id}`);
  return lesson;
}

describe('Korrigierte Lerninhalte', () => {
  it('macht die sieben erreichbaren Lücken eindeutig, ohne zusätzliche Antworten freizuschalten', () => {
    const cases = [
      ['market-02', 'Die ___ ist rund, rot und hat viele kleine Kerne.', 'Tomate', ['Kartoffel', 'Karotte']],
      ['market-03', 'Das ___ ist ein großer Laib, den ich in Scheiben schneide.', 'Brot', ['Brötchen', 'Kuchen']],
      ['work-05', 'Ich möchte eine ___ zum Projekt stellen.', 'Frage', ['Besprechung', 'Antwort']],
      ['health-02', 'Nach dem Essen tut mir der ___ weh.', 'Bauch', ['Arm', 'Bein']],
      ['market-07', 'Ich möchte eine ___ essen, bitte.', 'Suppe', ['Speisekarte', 'Reis']],
      ['traffic-06', 'Muss ich in Köln in einen anderen Zug ___?', 'umsteigen', ['bezahlen', 'helfen']],
    ] as const;

    for (const [id, sentence, answer, rejected] of cases) {
      const blank = getLesson(id).blank;
      expect(blank.sentence, id).toBe(sentence);
      expect(blank.answer, id).toBe(answer);
      expect(blank.options, id).toContain(answer);
      expect(isAnswerAccepted(answer, answer), `${id}: Schlüssel`).toBe(true);
      for (const option of rejected) {
        expect(blank.options, `${id}: Option ${option}`).toContain(option);
        expect(isAnswerAccepted(option, answer), `${id}: Option ${option}`).toBe(false);
      }
    }

    const nameBlank = getLesson('home-02').blank;
    expect(nameBlank.options).toContain('Name');
    expect(nameBlank.options).toContain('Vorname');
    expect(nameBlank.options).toContain('Nachname');
    expect(nameBlank.acceptedAnswers).toEqual(['Vorname']);
    expect(isAnswerAccepted('Name', nameBlank.answer, nameBlank.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted('Vorname', nameBlank.answer, nameBlank.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted('Nachname', nameBlank.answer, nameBlank.acceptedAnswers)).toBe(false);
  });

  it('hält die sechs derzeit latenten Lücken auch bei späterer Aktivierung eindeutig', () => {
    const cases = [
      ['home-04', 'Der ___ hat eine große Platte. Darauf stehen Lampe und Bücher.', 'Tisch', ['Stuhl', 'Bett']],
      ['market-04', 'Ich trinke ein Glas ___. Das Getränk ist klar und schmeckt nach nichts.', 'Wasser', ['Milch', 'Kaffee']],
      ['traffic-01', 'Ich fahre mit dem ___. Er fährt auf der Straße und hält an Bushaltestellen.', 'Bus', ['Bahn', 'Zug']],
      ['work-04', 'Ich habe einen ___ mit meinem beruflichen Werdegang geschrieben.', 'Lebenslauf', ['Beruf', 'Bewerbung']],
      ['home-07', 'Ich lese ein ___ mit vielen Kapiteln und einer langen Geschichte.', 'Buch', ['Schule', 'Stift']],
    ] as const;

    for (const [id, sentence, answer, rejected] of cases) {
      const blank = getLesson(id).blank;
      expect(blank.sentence, id).toBe(sentence);
      expect(blank.answer, id).toBe(answer);
      expect(blank.options, id).toContain(answer);
      expect(isAnswerAccepted(answer, answer), `${id}: Schlüssel`).toBe(true);
      for (const option of rejected) {
        expect(blank.options, `${id}: Option ${option}`).toContain(option);
        expect(isAnswerAccepted(option, answer), `${id}: Option ${option}`).toBe(false);
      }
    }
    expect(getLesson('home-07').blank.options).not.toContain('Heft');
    expect(isAnswerAccepted('Heft', getLesson('home-07').blank.answer)).toBe(false);

    const headBlank = getLesson('health-01').blank;
    expect(headBlank.sentence).toBe('Ich habe starke Kopfschmerzen. Mein ___ tut weh.');
    expect(headBlank.answer).toBe('Kopf');
    expect(headBlank.options).toEqual(['Kopf', 'Bauch', 'Bein']);
    expect(headBlank.options).not.toContain('Ohr');
    expect(headBlank.options).not.toContain('Auge');
    expect(isAnswerAccepted('Bauch', headBlank.answer)).toBe(false);
    expect(isAnswerAccepted('Bein', headBlank.answer)).toBe(false);
  });

  it('akzeptiert die passende Dialogantwort- und Satzbaualternative ausdrücklich, aber keine anderen Antworten', () => {
    const bakery = getLesson('market-03').dialogue;
    expect(bakery.answer).toBe('Drei Euro.');
    expect(bakery.options).toContain('Das kostet drei Euro.');
    expect(bakery.acceptedAnswers).toEqual(['Das kostet drei Euro.']);
    expect(isAnswerAccepted(bakery.answer, bakery.answer, bakery.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted('Das kostet drei Euro.', bakery.answer, bakery.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted('Gute Nacht.', bakery.answer, bakery.acceptedAnswers)).toBe(false);

    const phrase = getLesson('work-07').phrase;
    const alternateOrder = 'Wir fangen um acht Uhr pünktlich an.';
    expect(phrase.german).toBe('Wir fangen pünktlich um acht Uhr an.');
    expect(phrase.acceptedAnswers).toEqual([alternateOrder]);
    expect([...alternateOrder.split(' ')].sort()).toEqual([...phrase.german.split(' ')].sort());
    expect(isAnswerAccepted(phrase.german, phrase.german, phrase.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted(alternateOrder, phrase.german, phrase.acceptedAnswers)).toBe(true);
    expect(isAnswerAccepted('Wir fangen um acht Uhr an.', phrase.german, phrase.acceptedAnswers)).toBe(false);
  });

  it('korrigiert die Bahn-/Bahnsteig-Karten ohne IDs, Illustration oder Lernfortschritt zu verlieren', () => {
    expect(wordsById.get('traffic-01-02')).toMatchObject({
      id: 'traffic-01-02', german: 'Bahn', arabic: 'سكة الحديد', article: 'die',
    });
    expect(wordsById.get('traffic-01-03')).toMatchObject({
      id: 'traffic-01-03', german: 'Zug', arabic: 'قطار', article: 'der',
    });
    expect(wordsById.get('traffic-02-03')).toMatchObject({
      id: 'traffic-02-03', german: 'Bahnsteig', arabic: 'رصيف المحطة', article: 'der', illustration: 'platform',
    });

    const lesson = getLesson('traffic-01');
    const progress = { ...freshProgress(), words: { 'traffic-01-02': { mastery: 2, dueAt: 100 } } };
    const completed = completeMission(progress, lesson, 1, 100);
    expect(completed.words['traffic-01-02']).toMatchObject({ mastery: 3, dueAt: expect.any(Number) });
    expect(lesson.wordIds.every((id) => completed.words[id] !== undefined)).toBe(true);
  });

  it('zeigt idiomatische deutsche und arabische Beispielsätze statt fehlerhafter Ablenker', () => {
    const cafe = dialogScenarios.find((scenario) => scenario.id === 'cafe');
    const yesterday = cafe?.turns.find((turn) => turn.id === 'pay')?.choices.find((choice) => choice.id === 'later');
    expect(yesterday).toMatchObject({ text: 'Ich war gestern hier.', translationAr: 'كنت هنا أمس.' });
    expect(yesterday?.text).not.toBe('Ich bin gestern hier.');

    expect(getLesson('home-06').dialogue.options).toEqual([
      'Sie kommt heute Abend.', 'Heute regnet es stark.', 'Das Wasser ist kalt.',
    ]);
    expect(getLesson('traffic-07').phrase.arabic).toBe('أركب الدراجة ببطء على مسار الدراجات.');
  });
});
