export type DialogChoice = { id: string; text: string; translationAr: string };
export type DialogTurn = {
  id: string;
  prompt: string;
  promptAr: string;
  speaker: string;
  choices: DialogChoice[];
  answerId: string;
};
export type DialogScenario = {
  id: string;
  level: 'A1' | 'A2';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  turns: DialogTurn[];
};
export type DialogAttempt = { attempts: number; bestScore: number; completed: boolean };
export type DialogTrainerProgress = Record<string, DialogAttempt>;

export const dialogScenarios: DialogScenario[] = [
  {
    id: 'cafe', level: 'A1', title: 'Im Café', titleAr: 'في المقهى', icon: '☕',
    description: 'Bestelle einen Tee und bezahle freundlich.',
    descriptionAr: 'اطلب الشاي وادفع بطريقة مهذبة.',
    turns: [
      {
        id: 'drink', speaker: 'Kellnerin', prompt: 'Guten Tag! Was möchten Sie trinken?',
        promptAr: 'مرحباً! ماذا تودّ أن تشرب؟', answerId: 'tea',
        choices: [
          { id: 'tea', text: 'Einen Tee, bitte.', translationAr: 'شايًا من فضلك.' },
          { id: 'name', text: 'Ich heiße Samir.', translationAr: 'اسمي سمير.' },
          { id: 'station', text: 'Wo ist der Bahnhof?', translationAr: 'أين محطة القطار؟' },
        ],
      },
      {
        id: 'sugar', speaker: 'Kellnerin', prompt: 'Möchten Sie Milch und Zucker?',
        promptAr: 'هل تريد الحليب والسكر؟', answerId: 'no-thanks',
        choices: [
          { id: 'no-thanks', text: 'Nein, danke.', translationAr: 'لا، شكراً.' },
          { id: 'bread', text: 'Zwei Brötchen, bitte.', translationAr: 'قطعتان من الخبز، من فضلك.' },
          { id: 'tomorrow', text: 'Morgen fahre ich nach Berlin.', translationAr: 'سأسافر إلى برلين غداً.' },
        ],
      },
      {
        id: 'pay', speaker: 'Kellnerin', prompt: 'Das macht 3 Euro. Bitte schön.',
        promptAr: 'المبلغ 3 يورو. تفضّل.', answerId: 'here-you-are',
        choices: [
          { id: 'here-you-are', text: 'Bitte schön.', translationAr: 'تفضّل.' },
          { id: 'good-morning', text: 'Guten Morgen! Wie geht es Ihnen?', translationAr: 'صباح الخير! كيف حالك؟' },
          { id: 'later', text: 'Ich bin gestern hier.', translationAr: 'أنا هنا أمس.' },
        ],
      },
    ],
  },
  {
    id: 'bakery', level: 'A1', title: 'Beim Bäcker', titleAr: 'في المخبز', icon: '🥨',
    description: 'Kaufe Brötchen und frage nach dem Preis.',
    descriptionAr: 'اشترِ الخبز واسأل عن السعر.',
    turns: [
      {
        id: 'order', speaker: 'Verkäufer', prompt: 'Guten Morgen! Was darf es sein?',
        promptAr: 'صباح الخير! ماذا تريد؟', answerId: 'rolls',
        choices: [
          { id: 'rolls', text: 'Zwei Brötchen, bitte.', translationAr: 'قطعتان من الخبز، من فضلك.' },
          { id: 'weather', text: 'Heute ist das Wetter schön.', translationAr: 'الطقس جميل اليوم.' },
          { id: 'name', text: 'Mein Name ist Lina.', translationAr: 'اسمي لينا.' },
        ],
      },
      {
        id: 'croissant', speaker: 'Verkäufer', prompt: 'Möchten Sie noch ein Croissant?',
        promptAr: 'هل تريد كرواسوناً أيضاً؟', answerId: 'no-croissant',
        choices: [
          { id: 'bus', text: 'Wann fährt der Bus?', translationAr: 'متى تنطلق الحافلة؟' },
          { id: 'no-croissant', text: 'Nein, danke.', translationAr: 'لا، شكراً.' },
          { id: 'family', text: 'Meine Schwester ist zu Hause.', translationAr: 'أختي في المنزل.' },
        ],
      },
      {
        id: 'price', speaker: 'Verkäufer', prompt: 'Das macht 1 Euro 60.',
        promptAr: 'المبلغ يورو وستون سنتاً.', answerId: 'payment',
        choices: [
          { id: 'address', text: 'Ich wohne in der Gartenstraße.', translationAr: 'أسكن في شارع الحديقة.' },
          { id: 'appointment', text: 'Der Termin ist um zehn Uhr.', translationAr: 'الموعد الساعة العاشرة.' },
          { id: 'payment', text: 'Hier, bitte.', translationAr: 'تفضّل.' },
        ],
      },
    ],
  },
  {
    id: 'supermarket', level: 'A2', title: 'Im Supermarkt', titleAr: 'في المتجر', icon: '🛒',
    description: 'Antworte an der Kasse und bezahle mit Karte.',
    descriptionAr: 'أجب عند صندوق الدفع وادفع بالبطاقة.',
    turns: [
      {
        id: 'bag', speaker: 'Kassierer', prompt: 'Brauchen Sie eine Tüte?',
        promptAr: 'هل تحتاج إلى كيس؟', answerId: 'own-bag',
        choices: [
          { id: 'own-bag', text: 'Nein, danke. Ich habe einen Beutel.', translationAr: 'لا، شكراً. لدي حقيبة.' },
          { id: 'bus', text: 'Ich nehme den Bus um acht Uhr.', translationAr: 'سأستقل الحافلة الساعة الثامنة.' },
          { id: 'bread', text: 'Das Brot ist sehr lecker.', translationAr: 'الخبز لذيذ جداً.' },
        ],
      },
      {
        id: 'payment', speaker: 'Kassierer', prompt: 'Das macht 12 Euro 50.',
        promptAr: 'المبلغ 12 يورو و50 سنتاً.', answerId: 'card',
        choices: [
          { id: 'doctor', text: 'Ich brauche einen Termin beim Arzt.', translationAr: 'أحتاج إلى موعد عند الطبيب.' },
          { id: 'card', text: 'Ich zahle mit Karte.', translationAr: 'سأدفع بالبطاقة.' },
          { id: 'train', text: 'Der Zug fährt um halb neun.', translationAr: 'ينطلق القطار الساعة الثامنة والنصف.' },
        ],
      },
      {
        id: 'receipt', speaker: 'Kassierer', prompt: 'Möchten Sie den Kassenbon?',
        promptAr: 'هل تريد الإيصال؟', answerId: 'receipt-yes',
        choices: [
          { id: 'receipt-yes', text: 'Ja, bitte.', translationAr: 'نعم، من فضلك.' },
          { id: 'work', text: 'Ich arbeite am Montag.', translationAr: 'أعمل يوم الاثنين.' },
          { id: 'goodbye', text: 'Wo kann ich hier schlafen?', translationAr: 'أين يمكنني النوم هنا؟' },
        ],
      },
    ],
  },
];

export function emptyDialogTrainerProgress(): DialogTrainerProgress {
  return {};
}

export function sanitizeDialogTrainerProgress(value: unknown): DialogTrainerProgress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyDialogTrainerProgress();
  const source = value as Record<string, unknown>;
  const cleaned: DialogTrainerProgress = {};
  for (const scenario of dialogScenarios) {
    const entry = source[scenario.id];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    const attempts = typeof item.attempts === 'number' && Number.isFinite(item.attempts)
      ? Math.min(1_000_000, Math.max(0, Math.floor(item.attempts))) : 0;
    const bestScore = typeof item.bestScore === 'number' && Number.isFinite(item.bestScore)
      ? Math.min(scenario.turns.length, Math.max(0, Math.floor(item.bestScore))) : 0;
    const completed = item.completed === true;
    if (attempts > 0 || bestScore > 0 || completed) cleaned[scenario.id] = { attempts, bestScore, completed };
  }
  return cleaned;
}

export function recordDialogAttempt(
  progress: DialogTrainerProgress,
  scenarioId: string,
  score: number,
): DialogTrainerProgress {
  const scenario = dialogScenarios.find((item) => item.id === scenarioId);
  if (!scenario) return progress;
  const previous = sanitizeDialogTrainerProgress(progress)[scenarioId] ?? { attempts: 0, bestScore: 0, completed: false };
  const safeScore = Number.isFinite(score) ? Math.min(scenario.turns.length, Math.max(0, Math.floor(score))) : 0;
  return {
    ...progress,
    [scenarioId]: {
      attempts: Math.min(1_000_000, previous.attempts + 1),
      bestScore: Math.max(previous.bestScore, safeScore),
      completed: true,
    },
  };
}
