/**
 * Pronunciation fixes for the speech generator, keyed by manifest clip key
 * (`he/<audioId>_<form>` or `ar/<audioId>_<form>`).
 *
 * The value replaces the text sent to Google or Azure — it never replaces what
 * the learner reads. Colloquial Arabic written without diacritics is the usual
 * reason: a voice may guess the wrong vowels, and adding harakat here fixes
 * the recording while the card keeps its natural Levantine spelling.
 *
 * This is the place for corrections coming back from a Palestinian or
 * Jordanian reviewer. Change the visible card wording only when the visible
 * wording is itself wrong, and never rewrite it towards Modern Standard
 * Arabic.
 *
 * Example:
 *
 *   'ar/greetings__hello-and-goodbye__hello_neutral': 'مَرْحَبا',
 *   'he/counting-and-numbers__one-to-ten__two_feminine': 'שְׁתַּיִם',
 */
export const PRONUNCIATION_OVERRIDES: Record<string, string> = {};

/** The override for a clip, if a reviewer has recorded one. */
export function pronunciationOverride(clipKey: string): string | undefined {
  const value = PRONUNCIATION_OVERRIDES[clipKey];
  return value && value.trim() ? value.trim() : undefined;
}
