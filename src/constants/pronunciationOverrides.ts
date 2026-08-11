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
 *   'he/counting-and-numbers__one-to-ten__two_neutral': 'שְׁתַּיִם',
 */
export const PRONUNCIATION_OVERRIDES: Record<string, string> = {
  // "three", counting form. The dictionary's تَلاتِة came back as *talātitin*:
  // the voice read the tā marbūṭa as a full t and hung a case ending off it,
  // which is the Modern Standard reading of a word this deck teaches in pause.
  // Writing the final letter as a hā leaves no tā to inflect, so the word ends
  // where the romanisation does. This clip only — تلاتة inside a longer phrase
  // is a different recording and is not known to be wrong.
  'ar/counting-and-numbers__one-to-ten__three_neutral': 'تَلاتِه',

  // The rest of "One to ten", for the reason "three" was fixed for. The
  // dictionary's ttsText carries the vowels but still ends in a letter Modern
  // Standard can inflect, so the voice hung a case ending off every one of
  // them: واحَد came back as *wāḥadon* and the ة-final numbers as *-aton*.
  // Palestinian counts in pause form and has no case endings at all, so the
  // final ة becomes a هـ and the final consonants take a sukūn. The dictionary
  // entries are deliberately left alone — inside "Numbers with nouns" the same
  // words are construct forms where that ة is read, and that is a different
  // recording.
  'ar/counting-and-numbers__one-to-ten__one_neutral': 'واحَدْ',
  'ar/counting-and-numbers__one-to-ten__two_neutral': 'تْنِينْ',
  'ar/counting-and-numbers__one-to-ten__four_neutral': 'أَرْبَعَه',
  'ar/counting-and-numbers__one-to-ten__five_neutral': 'خَمْسِه',
  'ar/counting-and-numbers__one-to-ten__six_neutral': 'سِتِّه',
  'ar/counting-and-numbers__one-to-ten__seven_neutral': 'سَبْعَه',
  'ar/counting-and-numbers__one-to-ten__eight_neutral': 'تْمانْيِه',
  'ar/counting-and-numbers__one-to-ten__nine_neutral': 'تِسْعَه',
  'ar/counting-and-numbers__one-to-ten__ten_neutral': 'عَشَرَه',

  // "Bathroom shelf". Nothing in this deck is in the Palestinian dictionary,
  // so the voice was reading bare undiacritized Levantine and hanging a case
  // ending off whatever the phrase ended in — صابون as *ṣābūnun*, مشط as
  // *mishṭun*, منشفة as *manshafaton*. Vowels pinned to the romanisation the
  // card teaches, and every phrase closed with a sukūn or a pause-form هـ.
  //
  // فرشاية and شفرة are written with a ت because they are the first half of a
  // construct here — *firshāyet shaʿar*, *shafret ḥalāʾa* — and a tā marbūṭa
  // in that position is what the voice was reading as a full feminine ending.
  'ar/care-and-hygiene__bathroom-shelf__soap_neutral': 'صابونْ',
  'ar/care-and-hygiene__bathroom-shelf__shampoo_neutral': 'شامْبو',
  'ar/care-and-hygiene__bathroom-shelf__toothbrush_neutral': 'فِرْشايِت سْنانْ',
  'ar/care-and-hygiene__bathroom-shelf__toothpaste_neutral': 'مَعْجون سْنانْ',
  'ar/care-and-hygiene__bathroom-shelf__towel_neutral': 'مَنْشَفِه',
  'ar/care-and-hygiene__bathroom-shelf__toilet-paper_neutral': 'وَرَق حَمّامْ',
  'ar/care-and-hygiene__bathroom-shelf__deodorant_neutral': 'مَزيل عَرَقْ',
  'ar/care-and-hygiene__bathroom-shelf__comb_neutral': 'مِشْطْ',
  'ar/care-and-hygiene__bathroom-shelf__hairbrush_neutral': 'فِرْشايِت شَعَرْ',
  'ar/care-and-hygiene__bathroom-shelf__razor_neutral': 'شَفْرِت حِلاقَه',

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
