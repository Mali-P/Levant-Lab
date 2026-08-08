import { z } from 'zod';

const acceptedAnswer = z.object({
  value: z.string(),
  label: z.string().optional(),
  dialect: z.string().optional(),
});

/**
 * The pronunciation a form is locked to. Travels in a backup because a
 * learner's correction to a guess is hers, and restoring her cards without it
 * would hand her back the guess.
 */
const ttsPronunciation = z.object({
  text: z.string(),
  target: z.string().optional(),
  source: z.enum(['curated', 'dictionary', 'user']),
  locked: z.boolean().optional(),
});

const genderedForm = z.object({
  script: z.string(),
  transliteration: z.string().optional(),
  pronunciationText: z.string().optional(),
  tts: ttsPronunciation.optional(),
  audioPath: z.string().optional(),
});

const languageSide = z.object({
  script: z.string(),
  transliteration: z.string().optional(),
  pronunciationText: z.string().optional(),
  tts: ttsPronunciation.optional(),
  forms: z
    .object({ feminine: genderedForm, masculine: genderedForm })
    .optional(),
  audioPath: z.string().optional(),
  gender: z.string().optional(),
  plural: z.string().optional(),
  notes: z.string().optional(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
  accepted: z.array(acceptedAnswer).optional(),
  audioUrl: z.string().optional(),
});

export const dialectSchema = z.enum([
  'Palestinian',
  'Jordanian',
  'Lebanese',
  'Syrian',
  'General Levantine',
]);

export const flashcardSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  deckId: z.string(),
  english: z.string(),
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  audioId: z.string().optional(),
  hebrew: languageSide,
  arabic: languageSide.extend({ dialect: dialectSchema.optional() }),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const deckSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  // Optional: backups taken before decks were ordered carry no position, and
  // the startup merge renumbers whatever it finds.
  order: z.number().optional(),
  perfectRunsRequired: z.number(),
  promptDirections: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Progress, sessions and settings are accepted loosely on import: a backup
 * from an older build must still restore its cards rather than being refused
 * outright. Card and deck shape is what gets strict validation.
 */
export const backupSchema = z.object({
  format: z.literal('levantine-flashcards-backup'),
  version: z.number(),
  exportedAt: z.string(),
  categories: z.array(categorySchema),
  decks: z.array(deckSchema),
  cards: z.array(flashcardSchema),
  cardProgress: z.array(z.record(z.unknown())).optional().default([]),
  deckProgress: z.array(z.record(z.unknown())).optional().default([]),
  sessions: z.array(z.record(z.unknown())).optional().default([]),
  settings: z.record(z.unknown()).optional(),
});

export type ParsedBackup = z.infer<typeof backupSchema>;
