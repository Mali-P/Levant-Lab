import { describe, expect, it } from 'vitest';
import type { Language, ListeningOutcome, Settings } from '../../types';
import {
  LISTENING_ITEMS,
  LISTENING_LEVELS,
  LISTENING_LOOSE_LINES,
} from '../../constants/listening';
import { GLOSSED_CATEGORIES } from '../../utils/glossary';
import {
  HELP_LADDER,
  LEVEL_OPENS_AT,
  bestOutcome,
  heardKey,
  helpExhausted,
  helpReached,
  itemById,
  languageForItem,
  levelHeard,
  levelHeardAcross,
  levelOfItem,
  nextHelp,
  nextItem,
  openLevels,
  outcomeFor,
  outcomeOf,
  playsSlowly,
  recordListening,
  shuffledTiles,
  splitAtGap,
  stageProgress,
  tilesInOrder,
  tilesOf,
  weakestEar,
  type HelpStep,
} from './listening';

const BOTH: Language[] = ['hebrew', 'arabic'];

/** A settings row carrying nothing but the listening record. */
function withHeard(
  heard: Record<string, ListeningOutcome>,
): Pick<Settings, 'listeningStats'> {
  return { listeningStats: { heard } };
}

/** Every item of a level filed at one outcome, in the languages given. */
function levelAt(
  levelId: string,
  outcome: ListeningOutcome,
  languages: Language[] = BOTH,
): Record<string, ListeningOutcome> {
  const level = LISTENING_LEVELS.find((entry) => entry.id === levelId);
  const heard: Record<string, ListeningOutcome> = {};
  for (const item of level?.items ?? []) {
    for (const language of languages) heard[heardKey(item.id, language)] = outcome;
  }
  return heard;
}

/** One side of one heard line, as the exercise will read it. */
function scriptOf(itemIndex: { heard: { line: { hebrew: { script: string }; arabic: { script: string } } }[] }, language: Language): string {
  return language === 'hebrew'
    ? itemIndex.heard[0].line.hebrew.script
    : itemIndex.heard[0].line.arabic.script;
}

describe('the ladder of levels', () => {
  it('runs one to nine, in order, with no gaps', () => {
    expect(LISTENING_LEVELS.map((level) => level.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('speaks carefully only in the first level', () => {
    // The spec is explicit that natural speed is the default from level 2 and
    // that slow is a support tool. A second `clear` level would quietly make
    // careful speech the thing she practises.
    const careful = LISTENING_LEVELS.filter((level) => level.pace === 'clear');
    expect(careful.map((level) => level.rank)).toEqual([1]);
  });

  it('introduces the room only near the end', () => {
    const noisy = LISTENING_LEVELS.filter((level) => level.ambience);
    expect(noisy.every((level) => level.rank >= 8)).toBe(true);
  });

  it('is not a deck category anywhere in the installed course', () => {
    // The instruction the whole design turns on: this stage installs nothing. A
    // category named after one of its levels would mean somebody had started
    // seeding it, which is exactly the drift worth catching early.
    const installed = new Set(
      GLOSSED_CATEGORIES.map((category) => category.name.toLowerCase()),
    );
    for (const level of LISTENING_LEVELS) {
      expect(installed.has(level.name.toLowerCase()), level.name).toBe(false);
    }
    expect(installed.has('native listening')).toBe(false);
  });
});

describe('the exercises themselves', () => {
  it('gives every item an id of its own', () => {
    const ids = LISTENING_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item something to hear, in both languages', () => {
    for (const item of LISTENING_ITEMS) {
      expect(item.heard.length, item.id).toBeGreaterThan(0);
      for (const turn of item.heard) {
        expect(turn.line.hebrew.script, item.id).toBeTruthy();
        expect(turn.line.arabic.script, item.id).toBeTruthy();
      }
    }
  });

  it('offers a real choice wherever the answer is a meaning', () => {
    for (const item of LISTENING_ITEMS) {
      if (item.kind === 'missing' || item.kind === 'boundaries') continue;
      expect(item.options.length, item.id).toBeGreaterThan(1);
      expect(item.correct, item.id).toBeGreaterThanOrEqual(0);
      expect(item.correct, item.id).toBeLessThan(item.options.length);
      expect(new Set(item.options).size, item.id).toBe(item.options.length);
    }
  });

  it('puts two speakers in every exchange and one everywhere else', () => {
    for (const item of LISTENING_ITEMS) {
      if (item.kind === 'exchange') {
        expect(item.heard.length, item.id).toBeGreaterThan(1);
        expect(new Set(item.heard.map((turn) => turn.speaker)).size, item.id).toBe(
          item.heard.length,
        );
      } else {
        expect(item.heard.length, item.id).toBe(1);
      }
    }
  });

  it('cuts every gap out of the line it belongs to', () => {
    // The gap is authored as a word and the blank is cut from the script when it
    // is rendered. A word that is not in the line would silently show the whole
    // sentence instead, which is the exercise quietly not happening.
    for (const item of LISTENING_ITEMS) {
      if (item.kind !== 'missing') continue;
      expect(item.gap, item.id).toBeDefined();
      for (const language of BOTH) {
        const gap = item.gap?.[language];
        const where = item.id + ' ' + language;
        expect(gap, where).toBeDefined();
        expect(splitAtGap(scriptOf(item, language), gap?.word ?? ''), where).toBeDefined();
        expect(gap?.others.length, where).toBeGreaterThan(0);
        expect(gap?.others, where).not.toContain(gap?.word);
      }
    }
  });

  it('gives a boundary exercise enough words to have boundaries', () => {
    for (const item of LISTENING_ITEMS) {
      if (item.kind !== 'boundaries') continue;
      for (const language of BOTH) {
        expect(
          tilesOf(scriptOf(item, language)).length,
          item.id + ' ' + language,
        ).toBeGreaterThan(2);
      }
    }
  });

  it('sweeps every line it shows through the glossary', () => {
    // Not the glossary check itself — that lives in utils/glossary.test — only
    // that nothing authored here is left out of it.
    const swept = new Set(LISTENING_LOOSE_LINES);
    for (const item of LISTENING_ITEMS) {
      for (const turn of item.heard) expect(swept.has(turn.line), item.id).toBe(true);
      for (const variation of item.variations ?? []) {
        expect(swept.has(variation.line), item.id).toBe(true);
      }
    }
  });
});

describe('the hint ladder', () => {
  it('climbs one rung at a time and stops at the top', () => {
    let step: HelpStep = HELP_LADDER[0];
    const walked: string[] = [step];
    for (let i = 0; i < HELP_LADDER.length + 3; i++) {
      const climbed = nextHelp(step);
      if (climbed !== step) walked.push(climbed);
      step = climbed;
    }
    expect(walked).toEqual([...HELP_LADDER]);
    expect(helpExhausted(step)).toBe(true);
  });

  it('plays natural speed twice before it plays slowly', () => {
    // The spec's order, and the reason for it: hearing the same speech twice at
    // speed is how the ear catches it. Dropping to slow audio on the first miss
    // teaches her to wait for slow audio.
    expect(playsSlowly('none')).toBe(false);
    expect(playsSlowly('replayed')).toBe(false);
    expect(playsSlowly('replayedTwice')).toBe(false);
    expect(playsSlowly('slow')).toBe(true);
    expect(playsSlowly('transcript')).toBe(true);
  });

  it('shows a word before the text, and the text before the meaning', () => {
    expect(helpReached('keyword', 'transcript')).toBe(false);
    expect(helpReached('transcript', 'keyword')).toBe(true);
    expect(helpReached('transcript', 'meaning')).toBe(false);
    expect(helpReached('meaning', 'transcript')).toBe(true);
  });
});

describe('what an answer was worth', () => {
  it('counts a right answer with no help as a first listen', () => {
    expect(outcomeFor('none', false)).toBe('first');
  });

  it('counts either replay as a replay', () => {
    expect(outcomeFor('replayed', false)).toBe('replay');
    expect(outcomeFor('replayedTwice', false)).toBe('replay');
  });

  it('counts one word given away as needing the text', () => {
    // A single word is still something written down. Filing it with the slow
    // replay would flatter the record.
    expect(outcomeFor('keyword', false)).toBe('transcript');
    expect(outcomeFor('transcript', false)).toBe('transcript');
    expect(outcomeFor('meaning', false)).toBe('transcript');
  });

  it('counts a miss as a miss however little help was open', () => {
    expect(outcomeFor('none', true)).toBe('wrong');
    expect(outcomeFor('meaning', true)).toBe('wrong');
  });

  it('keeps the better of two outcomes', () => {
    expect(bestOutcome('slow', 'first')).toBe('first');
    expect(bestOutcome('first', 'wrong')).toBe('first');
    expect(bestOutcome(undefined, 'wrong')).toBe('wrong');
  });
});

describe('the record', () => {
  it('files a best per item per language', () => {
    const one = recordListening({}, 'l1-kitchen', 'hebrew', 'slow');
    expect(outcomeOf(one, 'l1-kitchen', 'hebrew')).toBe('slow');
    // The other ear is a separate claim, and is untouched.
    expect(outcomeOf(one, 'l1-kitchen', 'arabic')).toBeUndefined();
  });

  it('never lets a worse day undo a better one', () => {
    const one = recordListening({}, 'l1-kitchen', 'hebrew', 'first');
    const two = recordListening(one, 'l1-kitchen', 'hebrew', 'wrong');
    expect(outcomeOf(two, 'l1-kitchen', 'hebrew')).toBe('first');
  });

  it('counts the worse day anyway', () => {
    // The honest half. A best that never moves would hide a learner who caught
    // it once and has missed it every time since.
    const one = recordListening({}, 'l1-kitchen', 'hebrew', 'first');
    const two = recordListening(one, 'l1-kitchen', 'hebrew', 'wrong');
    expect(two.listeningStats?.attempts).toEqual({ first: 1, wrong: 1 });
  });
});

describe('how much has been heard', () => {
  it('weights a first listen above everything else', () => {
    const level = LISTENING_LEVELS[0];
    const first = levelHeard(level, withHeard(levelAt('l1', 'first')), 'hebrew');
    const text = levelHeard(level, withHeard(levelAt('l1', 'transcript')), 'hebrew');
    expect(first.share).toBe(1);
    expect(text.share).toBeLessThan(first.share);
    expect(first.onFirstListen).toBe(level.items.length);
    expect(text.onFirstListen).toBe(0);
  });

  it('reads nothing as zero rather than dividing by nothing', () => {
    const level = LISTENING_LEVELS[0];
    expect(levelHeard(level, {}, 'hebrew').share).toBe(0);
    expect(levelHeardAcross(level, {}, []).share).toBe(0);
  });

  it('lets the weaker ear decide the gate, never the average', () => {
    const level = LISTENING_LEVELS[0];
    const lopsided = withHeard(levelAt('l1', 'first', ['hebrew']));
    expect(levelHeard(level, lopsided, 'hebrew').share).toBe(1);
    expect(levelHeard(level, lopsided, 'arabic').share).toBe(0);
    // The figure the screens show is honest about what she has done — she really
    // has heard the Hebrew half — but the gate reads the ear she has not
    // trained, and that is nothing.
    expect(levelHeardAcross(level, lopsided, BOTH).share).toBeGreaterThan(0);
    expect(weakestEar(level, lopsided, BOTH)).toBe(0);
  });

  it('counts the stage under the ear each item was given to', () => {
    const half = withHeard(levelAt('l1', 'slow', ['hebrew']));
    // Studying Hebrew alone, every item of level 1 was a Hebrew item.
    expect(stageProgress(half, ['hebrew']).done).toBe(LISTENING_LEVELS[0].items.length);
    // On Both, the same record covers only the items that alternate onto Hebrew.
    // Fewer — but never none, because those items really were heard, and a hub
    // row reading zero for a learner who has listened is the bug this guards.
    const onBoth = stageProgress(half, BOTH);
    expect(onBoth.done).toBeGreaterThan(0);
    expect(onBoth.done).toBeLessThan(LISTENING_LEVELS[0].items.length);
    expect(onBoth.total).toBe(LISTENING_ITEMS.length);
  });
});

describe('which levels are open', () => {
  it('opens the first one to a learner who has never listened', () => {
    const open = openLevels({}, BOTH);
    expect(open.has('l1')).toBe(true);
    expect(open.has('l2')).toBe(false);
  });

  it('keeps the next one shut until the bar is met', () => {
    // Every item of level 1 filed at "needed the text" is a quarter each, well
    // under the bar — she got through them by reading, which is the one thing
    // this stage does not count.
    const read = withHeard(levelAt('l1', 'transcript'));
    expect(levelHeardAcross(LISTENING_LEVELS[0], read, BOTH).share).toBeLessThan(
      LEVEL_OPENS_AT,
    );
    expect(openLevels(read, BOTH).has('l2')).toBe(false);
  });

  it('opens the next one on a level heard with replays', () => {
    const replayed = withHeard(levelAt('l1', 'replay'));
    expect(openLevels(replayed, BOTH).has('l2')).toBe(true);
  });

  it('never opens two levels ahead at once', () => {
    const open = openLevels(withHeard(levelAt('l1', 'first')), BOTH);
    expect(open.has('l2')).toBe(true);
    expect(open.has('l3')).toBe(false);
  });

  it('holds the whole ladder back on the untrained ear', () => {
    const hebrewOnly = withHeard(levelAt('l1', 'first', ['hebrew']));
    expect(openLevels(hebrewOnly, ['hebrew']).has('l2')).toBe(true);
    expect(openLevels(hebrewOnly, BOTH).has('l2')).toBe(false);
  });
});

describe('a learner who catches every single thing', () => {
  /**
   * The ladder played the way the item screen plays it.
   *
   * Every other test in this file builds a record by hand, and a record built
   * by hand can hold outcomes the app is incapable of writing — an item filed
   * under both languages, when `languageForItem` only ever offers it in one.
   * That gap is what let a level be scored against items it never presents, so
   * this walks the whole stage through `languageForItem` and `recordListening`
   * exactly as `ListeningItemScreen` does, and then asks the plain question:
   * having understood everything, has she finished?
   */
  function playPerfectly(languages: Language[]): Pick<Settings, 'listeningStats'> {
    let record: Pick<Settings, 'listeningStats'> = {};
    for (const level of LISTENING_LEVELS) {
      for (const item of level.items) {
        record = recordListening(
          record,
          item.id,
          languageForItem(level, item.id, languages),
          'first',
        );
      }
    }
    return record;
  }

  const STUDYING: Language[][] = [['hebrew'], ['arabic'], BOTH];

  for (const languages of STUDYING) {
    const studying = languages.join(' and ');

    it('opens all nine levels, studying ' + studying, () => {
      const played = playPerfectly(languages);
      expect([...openLevels(played, languages)]).toEqual(
        LISTENING_LEVELS.map((level) => level.id),
      );
    });

    it('finishes the stage on the hub, studying ' + studying, () => {
      const stage = stageProgress(playPerfectly(languages), languages);
      expect(stage.total).toBe(LISTENING_ITEMS.length);
      expect(stage.done).toBe(stage.total);
    });

    it('fills every level bar, studying ' + studying, () => {
      const played = playPerfectly(languages);
      for (const level of LISTENING_LEVELS) {
        const progress = levelHeardAcross(level, played, languages);
        expect(progress.share, level.id).toBe(1);
        expect(progress.onFirstListen, level.id).toBe(level.items.length);
        expect(progress.attempted, level.id).toBe(level.items.length);
      }
    });

    it('counts each ear against what that ear was given, studying ' + studying, () => {
      const played = playPerfectly(languages);
      for (const level of LISTENING_LEVELS) {
        let acrossEars = 0;
        for (const language of languages) {
          const ear = levelHeard(level, played, language, languages);
          // Nothing is asked of her that she cannot be offered, so a perfect
          // run is perfect on every ear rather than on the average of them.
          expect(ear.onFirstListen, level.id + ' ' + language).toBe(ear.total);
          expect(ear.share, level.id + ' ' + language).toBe(1);
          acrossEars += ear.total;
        }
        // And the ears between them account for the level exactly once: no item
        // is offered twice, and none is left with no ear to hear it.
        expect(acrossEars, level.id).toBe(level.items.length);
      }
    });
  }
});

describe('which language an item is heard in', () => {
  it('uses the one language a learner studying one has chosen', () => {
    for (const level of LISTENING_LEVELS) {
      for (const item of level.items) {
        expect(languageForItem(level, item.id, ['arabic'])).toBe('arabic');
      }
    }
  });

  it('alternates rather than mixing, on Both', () => {
    // The spec allows interleaving and forbids mixing inside one utterance.
    // Alternating at the item boundary is what makes the second impossible.
    const level = LISTENING_LEVELS[0];
    const heard = level.items.map((item) => languageForItem(level, item.id, BOTH));
    expect(heard[0]).toBe('hebrew');
    expect(heard[1]).toBe('arabic');
    expect(new Set(heard).size).toBe(2);
  });

  it('gives the same item the same language every visit', () => {
    const level = LISTENING_LEVELS[2];
    const once = level.items.map((item) => languageForItem(level, item.id, BOTH));
    const again = level.items.map((item) => languageForItem(level, item.id, BOTH));
    expect(once).toEqual(again);
  });
});

describe('reading the content', () => {
  it('finds an item, and the level it belongs to', () => {
    const item = LISTENING_ITEMS[0];
    expect(itemById(item.id)).toBe(item);
    expect(levelOfItem(item.id)?.id).toBe('l1');
    expect(itemById('nothing-like-this')).toBeUndefined();
  });

  it('walks to the next item and stops at the end of the level', () => {
    const level = LISTENING_LEVELS[0];
    const last = level.items[level.items.length - 1];
    expect(nextItem(level.items[0].id)?.id).toBe(level.items[1].id);
    expect(nextItem(last.id)).toBeUndefined();
  });
});

describe('the phrase tiles', () => {
  it('accepts only the order it was said in', () => {
    const line = 'shu biddik tiʿmali il-yōm';
    expect(tilesInOrder(tilesOf(line), line)).toBe(true);
    expect(tilesInOrder(['biddik', 'shu', 'tiʿmali', 'il-yōm'], line)).toBe(false);
    expect(tilesInOrder(['shu', 'biddik'], line)).toBe(false);
  });

  it('never hands back the answer already assembled', () => {
    for (const item of LISTENING_ITEMS) {
      if (item.kind !== 'boundaries') continue;
      for (const language of BOTH) {
        const script = scriptOf(item, language);
        expect(tilesInOrder(shuffledTiles(script), script), item.id).toBe(false);
      }
    }
  });

  it('shuffles the same line the same way every time, losing no word', () => {
    const line = 'shu biddik tiʿmali il-yōm';
    expect(shuffledTiles(line)).toEqual(shuffledTiles(line));
    expect([...shuffledTiles(line)].sort()).toEqual([...tilesOf(line)].sort());
  });
});
