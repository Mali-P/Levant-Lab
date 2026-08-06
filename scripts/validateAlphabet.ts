import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from './audio/config';
import {
  ARABIC_EXTRA_CHARACTERS,
  ARABIC_LETTERS,
  HEBREW_LETTERS,
  lettersFor,
  similarGroupsFor,
  vowelsFor,
} from '../src/data/alphabets';
import { allAlphabetClipSpecs } from '../src/services/audio/alphabetPaths';
import { ALPHABET_CLIPS } from '../src/generated/alphabetAudioManifest';
import type { AlphabetScript, ArabicLetter } from '../src/types/alphabet';

/**
 * Structural checks over the alphabet content.
 *
 * Needs no credentials and no network, so it belongs in CI beside
 * `validate-audio`. Anything that would put a wrong or blank letter in front
 * of a learner fails the run; a recording that has simply not been generated
 * yet is only a warning, because the app falls back to device speech and a
 * contributor without Google or Azure keys must still be able to work.
 *
 * Pass `--require-audio` for the release check, where a missing clip is fatal.
 */

const problems: string[] = [];
const warnings: string[] = [];

function fail(message: string): void {
  problems.push(message);
}

function warn(message: string): void {
  warnings.push(message);
}

/** The five Hebrew letters that take a different shape at the end of a word. */
const HEBREW_FINAL_CHARACTERS = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);

function checkUniqueIds(script: AlphabetScript): void {
  const seen = new Set<string>();
  const add = (kind: string, id: string) => {
    const key = kind + ':' + id;
    if (seen.has(key)) fail(script + ': duplicate id -- ' + kind + ' ' + id);
    else seen.add(key);
  };

  for (const letter of lettersFor(script)) add('letter', letter.id);
  for (const vowel of vowelsFor(script)) add('vowel', vowel.id);
  if (script === 'arabic') {
    for (const extra of ARABIC_EXTRA_CHARACTERS) add('char', extra.id);
  }
}

function checkOrdering(script: AlphabetScript): void {
  const orders = lettersFor(script).map((letter) => letter.order);
  const expected = orders.map((_, index) => index + 1);
  if (orders.join(',') !== expected.join(',')) {
    fail(
      script +
        ': letters are not numbered 1..' +
        orders.length +
        ' in order (got ' +
        orders.join(',') +
        ')',
    );
  }
}

function checkHebrew(): void {
  if (HEBREW_LETTERS.length !== 22) {
    fail('hebrew: expected 22 letters, found ' + HEBREW_LETTERS.length);
  }

  const finals = HEBREW_LETTERS.filter((letter) => letter.finalForm);
  if (finals.length !== 5) {
    fail('hebrew: expected 5 letters with a final form, found ' + finals.length);
  }

  for (const letter of HEBREW_LETTERS) {
    if (!letter.nameEnglish.trim() || !letter.nameHebrew.trim()) {
      fail('hebrew ' + letter.id + ': missing a name');
    }
    if (!letter.printForm.trim()) {
      fail('hebrew ' + letter.id + ': missing a printed form');
    }
    if (!letter.nameSpokenText.trim()) {
      fail('hebrew ' + letter.id + ': nothing for the generator to say');
    }
    if (letter.finalForm && !HEBREW_FINAL_CHARACTERS.has(letter.finalForm)) {
      // A final form that is not one of the five is almost always a copy of
      // the base letter, which would teach a shape that does not exist.
      fail(
        'hebrew ' +
          letter.id +
          ': final form is not one of the five final characters',
      );
    }
    if (!letter.exampleWord) {
      warn('hebrew ' + letter.id + ': no example word');
    }
  }

  const claimed = HEBREW_LETTERS.map((letter) => letter.finalForm).filter(
    Boolean,
  );
  if (new Set(claimed).size !== claimed.length) {
    fail('hebrew: two letters claim the same final form');
  }
}

function checkArabic(): void {
  if (ARABIC_LETTERS.length !== 28) {
    fail('arabic: expected 28 letters, found ' + ARABIC_LETTERS.length);
  }

  const expectedNonConnecting = new Set([
    'alif',
    'dal',
    'dhal',
    'ra',
    'zay',
    'waw',
  ]);

  for (const letter of ARABIC_LETTERS) {
    if (!letter.nameEnglish.trim() || !letter.nameArabic.trim()) {
      fail('arabic ' + letter.id + ': missing a name');
    }
    if (!letter.forms.isolated.trim()) {
      fail('arabic ' + letter.id + ': missing an isolated form');
    }
    if (!letter.nameSpokenText.trim()) {
      fail('arabic ' + letter.id + ': nothing for the generator to say');
    }
    if (!letter.connectsFromPrevious) {
      fail(
        'arabic ' +
          letter.id +
          ': every one of the 28 letters joins to the letter before it',
      );
    }

    const shouldBreak = expectedNonConnecting.has(letter.id);
    if (letter.connectsToNext === shouldBreak) {
      fail(
        'arabic ' +
          letter.id +
          ': connectsToNext should be ' +
          String(!shouldBreak),
      );
    }

    checkArabicForms(letter, shouldBreak);
    if (!letter.exampleWord) warn('arabic ' + letter.id + ': no example word');
  }
}

/**
 * A letter that joins forwards needs all four shapes; one that breaks the join
 * has no initial or medial shape at all. Inventing the missing two is the
 * classic way an alphabet app teaches a form that never occurs.
 */
function checkArabicForms(letter: ArabicLetter, breaksJoin: boolean): void {
  const { initial, medial, final } = letter.forms;

  if (breaksJoin) {
    if (initial || medial) {
      fail(
        'arabic ' +
          letter.id +
          ': breaks the join, so it cannot have an initial or medial form',
      );
    }
    if (!final) {
      fail('arabic ' + letter.id + ': missing its joined final form');
    }
    return;
  }

  for (const [name, value] of [
    ['initial', initial],
    ['medial', medial],
    ['final', final],
  ] as const) {
    if (!value) fail('arabic ' + letter.id + ': missing its ' + name + ' form');
  }
}

function checkSimilarGroups(script: AlphabetScript): void {
  const ids = new Set(lettersFor(script).map((letter) => letter.id));

  for (const group of similarGroupsFor(script)) {
    if (group.script !== script) {
      fail(group.id + ': group is filed under the wrong script');
    }
    if (group.letterIds.length < 2) {
      fail(group.id + ': a similar-letter group needs at least two letters');
    }
    for (const id of group.letterIds) {
      if (!ids.has(id)) fail(group.id + ': unknown letter id ' + id);
    }
  }

  for (const letter of lettersFor(script)) {
    for (const id of letter.similarTo ?? []) {
      if (!ids.has(id)) {
        fail(script + ' ' + letter.id + ': similarTo points at unknown ' + id);
      }
      if (id === letter.id) {
        fail(script + ' ' + letter.id + ': similarTo points at itself');
      }
    }
  }
}

function checkVowels(script: AlphabetScript): void {
  for (const vowel of vowelsFor(script)) {
    if (vowel.script !== script) {
      fail('vowel ' + vowel.id + ': filed under the wrong script');
    }
    if (!vowel.symbol.trim() || !vowel.attachedExample.trim()) {
      fail(
        'vowel ' + vowel.id + ': needs both a bare symbol and an attached example',
      );
    }
    if (!vowel.nameSpokenText.trim()) {
      fail('vowel ' + vowel.id + ': nothing for the generator to say');
    }
  }
}

/**
 * Every declared handwriting or stroke asset must be a file that exists. A
 * path pointing at nothing is worse than an absent asset: the letter screen
 * would show a broken image where a learner expects a letterform.
 */
function checkAssets(script: AlphabetScript, outputRoot: string): void {
  const letters = lettersFor(script);
  const declared: Array<{ owner: string; src: string }> = [];

  for (const letter of letters) {
    if ('printForm' in letter) {
      if (letter.handwrittenForm) {
        declared.push({ owner: letter.id, src: letter.handwrittenForm.src });
      }
      if (letter.finalHandwrittenForm) {
        declared.push({
          owner: letter.id + ' (final)',
          src: letter.finalHandwrittenForm.src,
        });
      }
    } else {
      for (const [form, asset] of Object.entries(letter.handwrittenForms ?? {})) {
        declared.push({ owner: letter.id + ' (' + form + ')', src: asset.src });
      }
    }
  }

  for (const asset of declared) {
    const file = resolve(outputRoot, asset.src);
    if (!existsSync(file)) {
      fail(script + ' ' + asset.owner + ': asset is missing -- ' + asset.src);
    } else if (statSync(file).size === 0) {
      fail(script + ' ' + asset.owner + ': asset file is empty -- ' + asset.src);
    }
  }

  const withHandwriting = letters.filter((letter) =>
    'printForm' in letter
      ? Boolean(letter.handwrittenForm)
      : Object.keys(letter.handwrittenForms ?? {}).length > 0,
  ).length;
  if (withHandwriting < letters.length) {
    warn(
      script +
        ': ' +
        (letters.length - withHandwriting) +
        ' of ' +
        letters.length +
        ' letters have no handwritten asset, so that view stays hidden for them',
    );
  }

  const withStrokes = letters.filter(
    (letter) => Object.keys(letter.strokeOrder ?? {}).length > 0,
  ).length;
  if (withStrokes < letters.length) {
    warn(
      script +
        ': ' +
        (letters.length - withStrokes) +
        ' letters have no stroke-order sequence',
    );
  }
}

function checkAudio(outputRoot: string, requireAudio: boolean): void {
  const specs = allAlphabetClipSpecs();
  const missing: string[] = [];

  for (const clip of specs) {
    if (!clip.spoken) {
      fail(clip.key + ': nothing for the generator to say');
      continue;
    }
    const record = ALPHABET_CLIPS[clip.key];
    if (!record) {
      missing.push(clip.key + '  (' + clip.label + ')');
      continue;
    }
    if (record.path !== clip.path) {
      fail(
        clip.key + ': manifest says ' + record.path + ', expected ' + clip.path,
      );
    }
    const file = resolve(outputRoot, record.path);
    if (!existsSync(file)) {
      fail(clip.key + ': audio file is missing -- ' + record.path);
    } else if (statSync(file).size === 0) {
      fail(clip.key + ': audio file is empty -- ' + record.path);
    }
  }

  // An entry with no matching spec is an orphan: usually a letter that was
  // renamed, leaving a clip nothing will ever play.
  const expected = new Set(specs.map((clip) => clip.key));
  for (const key of Object.keys(ALPHABET_CLIPS)) {
    if (!expected.has(key)) fail('orphaned manifest entry: ' + key);
  }

  for (const line of missing) {
    if (requireAudio) fail('no clip recorded for ' + line);
  }
  if (!requireAudio && missing.length > 0) {
    warn(
      missing.length +
        ' clip(s) have not been generated yet; those letters fall back to device speech',
    );
  }

  console.log('Clips the content expects : ' + specs.length);
  console.log('Clips in the manifest     : ' + Object.keys(ALPHABET_CLIPS).length);
}

function main(): number {
  const requireAudio = process.argv.includes('--require-audio');
  const { outputRoot } = loadConfig();

  for (const script of ['hebrew', 'arabic'] as const) {
    checkUniqueIds(script);
    checkOrdering(script);
    checkSimilarGroups(script);
    checkVowels(script);
    checkAssets(script, outputRoot);
  }
  checkHebrew();
  checkArabic();
  checkAudio(outputRoot, requireAudio);

  console.log('Hebrew letters            : ' + HEBREW_LETTERS.length);
  console.log('Arabic letters            : ' + ARABIC_LETTERS.length);
  console.log('Extra Arabic characters   : ' + ARABIC_EXTRA_CHARACTERS.length);
  console.log('Problems                  : ' + problems.length);
  console.log('Warnings                  : ' + warnings.length);

  for (const line of problems) console.error('  problem: ' + line);
  for (const line of warnings) console.warn('  warning: ' + line);

  if (problems.length === 0) {
    console.log('');
    console.log('Alphabet content is structurally sound.');
  }
  return problems.length > 0 ? 1 : 0;
}

process.exit(main());
