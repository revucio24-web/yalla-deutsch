export const wordIllustrationKeys = [
  'room',
  'table',
  'chair',
  'wardrobe',
  'lamp',
  'bread-roll',
  'flour',
  'bottle',
  'cash-register',
  'platform',
  'intersection',
  'ticket-machine',
  'departure',
  'arrival',
  'path',
  'corner',
  'delay',
  'driver',
  'transfer',
  'profession',
  'interview',
  'head',
  'abdomen',
  'back',
  'pharmacy',
  'pain',
  'cough',
  'medicine',
  'tablet',
  'visitor',
  'gram',
  'pay',
  'destination',
  'reserve',
  'reschedule',
  'allergy',
  'healthy',
] as const;

export type WordIllustrationKey = (typeof wordIllustrationKeys)[number];

const wordIllustrationKeySet: ReadonlySet<string> = new Set(wordIllustrationKeys);

export function isWordIllustrationKey(value: unknown): value is WordIllustrationKey {
  return typeof value === 'string' && wordIllustrationKeySet.has(value);
}
