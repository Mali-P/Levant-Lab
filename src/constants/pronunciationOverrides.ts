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
export const PRONUNCIATION_OVERRIDES: Record<string, string> = {
  // "three", counting form. The dictionary's تَلاتِة came back as *talātitin*:
  // the voice read the tā marbūṭa as a full t and hung a case ending off it,
  // which is the Modern Standard reading of a word this deck teaches in pause.
  // Writing the final letter as a hā leaves no tā to inflect, so the word ends
  // where the romanisation does. This clip only — تلاتة inside a longer phrase
  // is a different recording and is not known to be wrong.
  'ar/counting-and-numbers__one-to-ten__three_neutral': 'تَلاتِه',

  // Medical deck Arabic. These were coming back with formal case endings such
  // as -un/-atun at the end. The visible cards stay in natural everyday
  // spelling; the clips get pause-form spelling/diacritics so the recording
  // stops where the transliteration stops.
  'ar/medical__at-the-clinic__nurse_feminine': 'ممرّضه',
  'ar/medical__at-the-clinic__nurse_masculine': 'مُمَرِّضْ',
  'ar/medical__at-the-clinic__clinic_neutral': 'عِيادِه',
  'ar/medical__at-the-clinic__pharmacy_neutral': 'صَيْدَلِيِّه',
  'ar/medical__at-the-clinic__fever_neutral': 'حَرارَه',
  'ar/medical__at-the-clinic__appointment_neutral': 'مَوْعِدْ',
};

/** The override for a clip, if a reviewer has recorded one. */
export function pronunciationOverride(clipKey: string): string | undefined {
  const value = PRONUNCIATION_OVERRIDES[clipKey];
  return value && value.trim() ? value.trim() : undefined;
}
