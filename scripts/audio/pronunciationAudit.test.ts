import { describe, expect, it } from 'vitest';
import { auditPronunciations } from './pronunciationAudit';
import { deckBaseName } from '../../src/features/review/languagePolicy';

const audit = auditPronunciations();

/**
 * A lot by its name, whichever of its three language rungs the job came from.
 * `buildJobs` keeps one job per recording and the rungs share their audio ids,
 * so a lot reaches the audit once, under whichever rung it was reached by.
 */
function deck(name: string) {
  return audit.forms.filter(
    (form) => deckBaseName({ name: form.deckName }) === name,
  );
}

describe('the counting deck', () => {
  const counting = deck('One to ten').filter((f) => f.language === 'arabic');

  it('is a deck this audit can actually see', () => {
    // Guards the whole file: a renamed deck would otherwise make every
    // assertion below vacuously true.
    expect(counting.length).toBeGreaterThan(0);
  });

  // The rule, on the deck the rule was written for. Nothing here may fall
  // through to an engine reading undiacritized spelling.
  it('leaves no form to the engine', () => {
    expect(counting.filter((form) => form.source === 'inferred')).toEqual([]);
  });

  /*
   * Ten numbers, ten Arabic answers.
   *
   * One target each rather than a gender pair, because one is what the deck
   * teaches: counting out loud has a single right word per number. تنتين is
   * real content and keeps its locked pronunciation, but it belongs to the
   * agreement deck below — a learner counting "one, two, three" is never shown
   * it, and no speaker's gender can put it here.
   */
  it('says exactly what each number teaches, once', () => {
    const targets: Record<string, string> = {
      one: 'wāḥad',
      two: 'tnēn',
      three: 'talāte',
      four: 'arbaʿa',
      five: 'khamse',
      six: 'sitte',
      seven: 'sabʿa',
      eight: 'tmānye',
      nine: 'tisʿa',
      ten: 'ʿashara',
    };

    for (const [english, expected] of Object.entries(targets)) {
      const forms = counting.filter((form) => form.english === english);
      expect(forms.map((form) => form.target), english).toEqual([expected]);
    }

    // Ten forms for ten numbers: no second column has crept back in under a
    // different English prompt.
    expect(counting).toHaveLength(10);
  });

  it('hands the engine something other than the bare spelling', () => {
    for (const form of counting) {
      expect(form.spoken, form.key).not.toBe(form.text);
    }
  });
});

/*
 * The forms the counting deck no longer carries, tested where they now live.
 *
 * Nothing was lost in the move: تنتين is still curated, still locked, and still
 * distinct from تنين. What changed is the question it answers — "two girls"
 * rather than "two".
 */
describe('the numbers-with-nouns deck', () => {
  const agreement = deck('Numbers with nouns').filter((f) => f.language === 'arabic');

  it('is a deck this audit can actually see', () => {
    expect(agreement.length).toBeGreaterThan(0);
  });

  it('leaves no form to the engine', () => {
    expect(agreement.filter((form) => form.source === 'inferred')).toEqual([]);
  });

  it('keeps both genders of one and two', () => {
    const targets = (english: string) =>
      agreement
        .filter((form) => form.english === english)
        .sort((a, b) => a.form.localeCompare(b.form))
        .map((form) => form.target);

    // feminine sorts before masculine.
    expect(targets('one (with a noun)')).toEqual(['waḥde', 'wāḥad']);
    expect(targets('two (with a noun)')).toEqual(['tintēn', 'tnēn']);
  });

  it('drops the ة from three upwards', () => {
    const shortForms: Record<string, string> = {
      'three (with a noun)': 'talāt',
      'four (with a noun)': 'arbaʿ',
      'five (with a noun)': 'khams',
      'six (with a noun)': 'sitt',
      'seven (with a noun)': 'sabaʿ',
      'eight (with a noun)': 'tmān',
      'nine (with a noun)': 'tisaʿ',
      'ten (with a noun)': 'ʿashar',
    };

    for (const [english, expected] of Object.entries(shortForms)) {
      const forms = agreement.filter((form) => form.english === english);
      expect(forms.map((form) => form.target), english).toEqual([expected]);
    }
  });

  it('hands the engine something other than the bare spelling', () => {
    for (const form of agreement) {
      expect(form.spoken, form.key).not.toBe(form.text);
    }
  });
});

describe('greetings', () => {
  // The other failure named in the rule: مرحبا read as the textbook marḥaban.
  it('pins marḥaba', () => {
    const hello = audit.forms.filter(
      (form) => form.language === 'arabic' && form.text === 'مرحبا',
    );
    expect(hello.length).toBeGreaterThan(0);
    for (const form of hello) {
      expect(form.source, form.key).not.toBe('inferred');
      expect(form.target, form.key).toBe('marḥaba');
    }
  });
});
