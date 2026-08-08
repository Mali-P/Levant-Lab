import { auditPronunciations, type AuditedForm } from './audio/pronunciationAudit';

/**
 * Confirms that Levantry, and not the speech engine, decides how its Arabic is
 * pronounced.
 *
 * A curated Arabic form passes when one of three things is true: a recording
 * shipped for it, the card names its own pronunciation, or the Palestinian
 * dictionary knows the word. Anything else means an engine is reading
 * undiacritized Levantine and picking the vowels — which is how `مرحبا` comes
 * back as *marḥaban* and `تنين` with a syllable it does not have.
 *
 * Needs no credentials and no network: the seed content and the committed
 * manifest are all it reads.
 */

/**
 * Decks where an uncovered Arabic form fails the run rather than warning.
 *
 * A list rather than "everything", because everything would be red today and a
 * check that is always red is a check nobody reads. These are the decks whose
 * coverage is complete and must stay complete; a deck joins the list the day it
 * reaches zero uncovered forms, and the list only ever grows.
 *
 * "One to ten" is here first because it is the deck a learner drills hardest
 * and the one where a wrong vowel is most audible — *tnēn* against a
 * reconstructed *tintēna* is the difference between counting and not. "Numbers
 * with nouns" teaches the other forms of those same ten words, and the same
 * dictionary entries already cover it.
 */
const ENFORCED_DECKS: readonly string[] = ['One to ten', 'Numbers with nouns'];

function describe(form: AuditedForm): string {
  return (
    form.key +
    '  ' +
    form.text +
    (form.target ? ' (' + form.target + ')' : '') +
    '  — ' +
    form.categoryName +
    ' › ' +
    form.deckName +
    ' › ' +
    form.english
  );
}

function main(): number {
  const strict = process.argv.includes('--strict');
  const audit = auditPronunciations();

  // A misspelled deck name would enforce nothing and report a clean run, which
  // is the one failure mode this script must not have: it would say the
  // counting deck was safe precisely when nobody was checking it.
  const decks = new Set(audit.forms.map((form) => form.deckName));
  const unknown = ENFORCED_DECKS.filter((deck) => !decks.has(deck));
  if (unknown.length > 0) {
    console.error(
      'ENFORCED_DECKS names decks that do not exist: ' + unknown.join(', '),
    );
    return 1;
  }

  const enforced = new Set(ENFORCED_DECKS);
  const failing = strict
    ? audit.inferred
    : audit.inferred.filter((form) => enforced.has(form.deckName));
  const warning = strict
    ? []
    : audit.inferred.filter((form) => !enforced.has(form.deckName));

  console.log('Curated forms              : ' + audit.forms.length);
  console.log('  from a bundled recording : ' + audit.bySource.clip);
  console.log('  from a card override     : ' + audit.bySource.card);
  console.log('  from the dictionary      : ' + audit.bySource.dictionary);
  console.log('  left to the engine       : ' + audit.bySource.inferred);
  console.log('');
  console.log(
    'Arabic left to the engine  : ' +
      audit.inferred.length +
      ' (' +
      failing.length +
      ' in enforced decks)',
  );

  if (failing.length > 0) {
    console.error('');
    console.error(
      'These curated Arabic forms have no pronunciation Levantry controls.',
    );
    console.error(
      'Give each one a recording, a card `tts` entry, or a dictionary entry in',
    );
    console.error('src/constants/palestinianPronunciation.ts:');
    console.error('');
    for (const form of failing) console.error('  ' + describe(form));
  }

  if (warning.length > 0) {
    // Grouped by deck: the unit the work is actually done in, and the unit a
    // deck is promoted into ENFORCED_DECKS by.
    const byDeck = new Map<string, number>();
    for (const form of warning) {
      byDeck.set(form.deckName, (byDeck.get(form.deckName) ?? 0) + 1);
    }
    console.log('');
    console.log('Not yet enforced — decks still relying on engine inference:');
    for (const [deck, count] of [...byDeck].sort((a, b) => b[1] - a[1])) {
      console.log('  ' + String(count).padStart(4) + '  ' + deck);
    }
    console.log('');
    console.log('Run with --strict to fail on these too.');
  }

  if (failing.length === 0) {
    console.log('');
    console.log(
      strict
        ? "Every curated Arabic form is pronounced on Levantry's terms."
        : "Every enforced deck is pronounced on Levantry's terms.",
    );
  }

  return failing.length > 0 ? 1 : 0;
}

process.exit(main());
