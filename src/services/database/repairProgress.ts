import { LANGUAGES, type CardProgress, type LanguageProgress } from '../../types';
import { attempts, computeMasteryScore } from '../../features/review/mastery';
import { askableLanguages, hasSideFor } from '../../features/study/prompts';
import { db } from './db';

const CLEARED: LanguageProgress = {
  correct: 0,
  incorrect: 0,
  currentStreak: 0,
  longestStreak: 0,
};

/**
 * Clears the marks left against a half a card never had.
 *
 * Until the grading fix, a card with an empty Hebrew side was asked for Hebrew
 * anyway and could not possibly answer: the check wanted a non-empty match
 * against a non-empty expected value, and there was none to be had. Every
 * appearance of that card wrote another wrong answer to a question that was
 * never really put, which is how a word comes to read "Hebrew 0%" after a dozen
 * honest reviews, sits at the top of the weakest list, and can never be
 * mastered — mastery is capped by the weakest language, and that one was pinned
 * at nought by arithmetic rather than by anything the learner did.
 *
 * The fix stops any more being written. This clears the ones already there,
 * because they are not a record of her studying: they are a record of the app
 * asking an unanswerable question.
 *
 * Deliberately narrow. A side is only ever reset where the card carries nothing
 * in that language at all, so every count against a half that does exist —
 * right or wrong — is left exactly as it stands, along with `bothCorrectCount`,
 * the consecutive count, deck progress, perfect runs and session history. Fill
 * the missing Hebrew in later and the card starts from nothing in Hebrew, which
 * is the truth of it: it has never been asked.
 *
 * Idempotent, and writes nothing on a device with no such rows.
 */
export async function clearUnaskableProgress(): Promise<number> {
  const progress = await db.cardProgress.toArray();
  if (!progress.length) return 0;

  const cards = await db.cards.toArray();
  const byId = new Map(cards.map((card) => [card.id, card]));
  const now = new Date().toISOString();

  const repaired: CardProgress[] = [];
  for (const row of progress) {
    const card = byId.get(row.cardId);
    // A row whose card is gone is somebody else's business — the duplicate
    // merge owns those, and guessing at one here could throw away the progress
    // of a card about to be restored under its own id.
    if (!card) continue;

    const unaskable = LANGUAGES.filter(
      (language) => !hasSideFor(card, language) && attempts(row[language]) > 0,
    );
    if (!unaskable.length) continue;

    const next: CardProgress = { ...row, updatedAt: now };
    for (const language of unaskable) next[language] = { ...CLEARED };

    // Rescored over what the card can actually be asked in, so a word carrying
    // only Arabic is judged on its Arabic instead of being held at nought by a
    // Hebrew half that was never there. A card with neither side has nothing to
    // score and keeps the floor.
    const on = askableLanguages(card);
    next.masteryScore = on.length ? computeMasteryScore(next, on) : 0;

    repaired.push(next);
  }

  if (repaired.length) await db.cardProgress.bulkPut(repaired);
  return repaired.length;
}
