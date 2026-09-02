import type { Language, ListeningOutcome, ListeningStats, Settings } from '../../types';
import {
  LISTENING_ITEMS,
  LISTENING_LEVELS,
  type ListeningItem,
  type ListeningLevel,
} from '../../constants/listening';

/**
 * The pure half of Native Listening: the hint ladder, what an answer was worth,
 * how much of a level has been heard, and which level is open.
 *
 * All of it is a function of the settings row and the authored content, and
 * none of it touches a deck. That is not an accident of implementation — see
 * `constants/listening` for why this level installs nothing — and it means the
 * whole of the level's state can be reasoned about here, in one file, with no
 * database open.
 */

// --- the hint ladder ---------------------------------------------------------

/**
 * How much help is on the table, in the order the spec puts it.
 *
 * Six rungs, and she climbs them one press at a time. The two replays before the
 * slow one are deliberate and are not a duplicate: hearing the same speech twice
 * at speed is how the ear actually catches it, and dropping to slow audio on the
 * first miss teaches her to wait for slow audio.
 *
 * The transcript is the fifth rung, not the second. A wrong answer never jumps
 * ahead to it — the spec is explicit that she gets another go at listening
 * first, and `outcomeFor` below is what keeps that honest: answering does not
 * move this ladder at all, only asking does.
 */
export const HELP_LADDER = [
  'none',
  'replayed',
  'replayedTwice',
  'slow',
  'keyword',
  'transcript',
  'meaning',
] as const;

export type HelpStep = (typeof HELP_LADDER)[number];

/** The next rung, or the same one at the top. Nothing here can skip a step. */
export function nextHelp(step: HelpStep): HelpStep {
  const at = HELP_LADDER.indexOf(step);
  return HELP_LADDER[Math.min(at + 1, HELP_LADDER.length - 1)];
}

/** Whether the ladder has run out, so the screen can stop offering more. */
export function helpExhausted(step: HelpStep): boolean {
  return step === HELP_LADDER[HELP_LADDER.length - 1];
}

/** Whether this rung, or any below it, has been reached. */
export function helpReached(step: HelpStep, rung: HelpStep): boolean {
  return HELP_LADDER.indexOf(step) >= HELP_LADDER.indexOf(rung);
}

/** What the button offering the next rung should say. */
export const HELP_LABELS: Record<HelpStep, string> = {
  none: 'Play it again',
  replayed: 'Play it again',
  replayedTwice: 'Slow replay',
  slow: 'Show me one word',
  keyword: 'Show the transcript',
  transcript: 'Show the meaning',
  meaning: 'That is all the help there is',
};

/**
 * Whether the audio should be played slowly at this rung.
 *
 * From `slow` upward, because a learner who has climbed past it is still
 * entitled to the slow version on every later press — walking back up to natural
 * speed to reach the transcript would be a punishment for asking.
 */
export function playsSlowly(step: HelpStep): boolean {
  return helpReached(step, 'slow');
}

// --- what one answer was worth ----------------------------------------------

/**
 * The outcome of an attempt: the help she had open when she got it right, or
 * `wrong` if she ever missed it on this visit.
 *
 * `missed` and not "this answer is wrong": once an item has been answered
 * wrongly, nothing later in the same visit earns it back. That is the honest
 * reading — she did not understand it — and it is why the record is a best over
 * time rather than a best within one sitting. Coming back tomorrow and catching
 * it first time is what improves it, which is exactly the behaviour to reward.
 */
export function outcomeFor(step: HelpStep, missed: boolean): ListeningOutcome {
  if (missed) return 'wrong';
  switch (step) {
    case 'none':
      return 'first';
    case 'replayed':
    case 'replayedTwice':
      return 'replay';
    case 'slow':
      return 'slow';
    // A single word given away is still text given away. Filing it with the
    // transcript rather than with the slow replay is the reading that does not
    // flatter: she needed to be shown something written.
    default:
      return 'transcript';
  }
}

/** Best first. The order the record compares against. */
export const OUTCOME_ORDER: readonly ListeningOutcome[] = [
  'first',
  'replay',
  'slow',
  'transcript',
  'wrong',
];

export const OUTCOME_LABELS: Record<ListeningOutcome, string> = {
  first: 'First listen',
  replay: 'After a replay',
  slow: 'Needed it slowed down',
  transcript: 'Needed the text',
  wrong: 'Not yet',
};

/**
 * What one outcome is worth towards the level being "heard".
 *
 * First-listen carries the greatest weight because it is the only outcome that
 * is evidence of the skill this level teaches. The rest taper rather than
 * dropping to nothing: needing a replay is genuinely most of the way there, and
 * a scale that scored it zero would tell a learner who is nearly there that she
 * has done nothing.
 *
 * Needing the text scores a quarter and not zero, and that is a deliberate
 * floor rather than generosity — reading it is how she finds out what she
 * missed. What scores nothing is an item she has never got through at all.
 */
export const OUTCOME_VALUE: Record<ListeningOutcome, number> = {
  first: 1,
  replay: 0.75,
  slow: 0.5,
  transcript: 0.25,
  wrong: 0,
};

/** The better of two outcomes, for keeping a best. */
export function bestOutcome(
  left: ListeningOutcome | undefined,
  right: ListeningOutcome,
): ListeningOutcome {
  if (!left) return right;
  return OUTCOME_ORDER.indexOf(left) <= OUTCOME_ORDER.indexOf(right) ? left : right;
}

// --- the record --------------------------------------------------------------

export const EMPTY_LISTENING_STATS: Required<ListeningStats> = {
  heard: {},
  attempts: {},
};

export function listeningStats(
  settings: Pick<Settings, 'listeningStats'>,
): Required<ListeningStats> {
  return {
    heard: settings.listeningStats?.heard ?? {},
    attempts: settings.listeningStats?.attempts ?? {},
  };
}

/**
 * How one item is filed, per language.
 *
 * The language is in the key rather than in a second map because the two ears
 * are genuinely separate claims about the same sentence, and a shape that made
 * one of them optional would eventually be read as "she has heard it" when only
 * half of it was true.
 */
export function heardKey(itemId: string, language: Language): string {
  return itemId + ':' + language;
}

/** What she has managed on this item in this language, if anything. */
export function outcomeOf(
  settings: Pick<Settings, 'listeningStats'>,
  itemId: string,
  language: Language,
): ListeningOutcome | undefined {
  return listeningStats(settings).heard[heardKey(itemId, language)];
}

/**
 * The patch one finished attempt writes onto the settings row.
 *
 * Two things at once, and they are not the same thing: `heard` keeps her best
 * ever on this item, and `attempts` counts what actually happened — including an
 * attempt that was worse than a previous one and changed no best at all. Only
 * the second can answer "is first-listen comprehension becoming normal", which
 * is the question this level exists to answer.
 */
export function recordListening(
  settings: Pick<Settings, 'listeningStats'>,
  itemId: string,
  language: Language,
  outcome: ListeningOutcome,
): Pick<Settings, 'listeningStats'> {
  const current = listeningStats(settings);
  const key = heardKey(itemId, language);

  return {
    listeningStats: {
      heard: { ...current.heard, [key]: bestOutcome(current.heard[key], outcome) },
      attempts: {
        ...current.attempts,
        [outcome]: (current.attempts[outcome] ?? 0) + 1,
      },
    },
  };
}

// --- how far she has got -----------------------------------------------------

export type LevelProgress = {
  /** Items with any outcome at all, in this language. */
  attempted: number;
  /** Items caught on the first listen. The headline number. */
  onFirstListen: number;
  total: number;
  /** 0 to 1, weighted by `OUTCOME_VALUE`. */
  share: number;
};

/**
 * The items of a level this ear is ever given.
 *
 * On one language, all of them. On Both, the share `languageForItem` alternates
 * onto this language — and that is the only honest denominator for a per-ear
 * count, because the other items are never offered in this language and so can
 * never be heard in it. Measuring one ear against every item in the level is
 * what made the ladder unclearable: a learner on Both who caught every single
 * thing put to her still scored half, and half is below the bar.
 */
export function itemsForEar(
  level: ListeningLevel,
  language: Language,
  languages: readonly Language[],
): ListeningItem[] {
  return level.items.filter(
    (item) => languageForItem(level, item.id, languages) === language,
  );
}

/**
 * How much of one level has been heard, in one language.
 *
 * `languages` is the whole set she is studying, because that is what decides
 * how the level's items were split between her ears. It defaults to this
 * language alone, which is the same thing for a learner studying one.
 *
 * A level with nothing in it for this ear answers zero across the board rather
 * than dividing by nothing — the same answer a learner who has not started
 * gets, and the correct one either way.
 */
export function levelHeard(
  level: ListeningLevel,
  settings: Pick<Settings, 'listeningStats'>,
  language: Language,
  languages: readonly Language[] = [language],
): LevelProgress {
  const heard = listeningStats(settings).heard;
  const mine = itemsForEar(level, language, languages);
  let attempted = 0;
  let onFirstListen = 0;
  let value = 0;

  for (const item of mine) {
    const outcome = heard[heardKey(item.id, language)];
    if (!outcome) continue;
    attempted++;
    if (outcome === 'first') onFirstListen++;
    value += OUTCOME_VALUE[outcome];
  }

  const total = mine.length;
  return {
    attempted,
    onFirstListen,
    total,
    share: total === 0 ? 0 : value / total,
  };
}

/**
 * The level as a whole, counted once per item.
 *
 * Every item is heard in exactly one language — that is what the interleaving
 * in `languageForItem` means — so the honest whole-level figure reads each item
 * under the ear it was actually given to. This is the number the screens show,
 * and it reaches 1 for a learner who caught everything, whether she is studying
 * one language or both.
 *
 * It is deliberately *not* what opens the next level. A figure blended over
 * both ears can hide an untrained one, so the gate reads `weakestEar` instead.
 */
export function levelHeardAcross(
  level: ListeningLevel,
  settings: Pick<Settings, 'listeningStats'>,
  languages: readonly Language[],
): LevelProgress {
  const heard = listeningStats(settings).heard;
  let attempted = 0;
  let onFirstListen = 0;
  let value = 0;

  if (languages.length > 0) {
    for (const item of level.items) {
      const outcome =
        heard[heardKey(item.id, languageForItem(level, item.id, languages))];
      if (!outcome) continue;
      attempted++;
      if (outcome === 'first') onFirstListen++;
      value += OUTCOME_VALUE[outcome];
    }
  }

  const total = level.items.length;
  return {
    attempted,
    onFirstListen,
    total,
    share: total === 0 ? 0 : value / total,
  };
}

/**
 * The share standing on her weakest ear — what the gate reads.
 *
 * The weakest language decides it, not the average. On Both, an ear that has
 * not been trained is the thing standing between her and understanding a
 * conversation, and averaging it away with the other one would open level 9 to
 * somebody who cannot follow half of what she hears.
 *
 * Each ear is measured against the items it was actually given, so a learner
 * who catches everything put to her clears the bar on both. An ear this level
 * never speaks to cannot hold the gate shut — a level with fewer items than she
 * has languages would otherwise lock the ladder on silence.
 */
export function weakestEar(
  level: ListeningLevel,
  settings: Pick<Settings, 'listeningStats'>,
  languages: readonly Language[],
): number {
  if (languages.length === 0) return 0;
  const ears = languages
    .map((language) => levelHeard(level, settings, language, languages))
    .filter((ear) => ear.total > 0);
  if (ears.length === 0) return level.items.length === 0 ? 1 : 0;
  return Math.min(...ears.map((ear) => ear.share));
}

/**
 * How much of a level has to be heard before the next one opens.
 *
 * Two thirds, weighted — so a learner who has got through every item with a
 * replay or two passes, and one who has needed the transcript for most of them
 * does not.
 *
 * This is the one area in the app that gates, and it is the opposite of the rule
 * every other level follows, for a reason the spec gives directly: elsewhere the
 * order is advice about what to study next and the content is no harder out of
 * order, whereas here the audio genuinely does get harder, and level 9 met on
 * day one is dispiriting rather than instructive. "Do not unlock everything at
 * once" is the instruction, and this is it.
 */
export const LEVEL_OPENS_AT = 2 / 3;

/**
 * Which levels are open.
 *
 * Level 1 always. After that, each opens on the one below it reaching the bar —
 * and, once open, stays open whatever happens to the record afterwards, because
 * nothing in this app takes back something a learner already had.
 */
export function openLevels(
  settings: Pick<Settings, 'listeningStats'>,
  languages: readonly Language[],
): Set<string> {
  const open = new Set<string>();
  let previousCleared = true;

  for (const level of LISTENING_LEVELS) {
    if (!previousCleared) break;
    open.add(level.id);
    previousCleared = weakestEar(level, settings, languages) >= LEVEL_OPENS_AT;
  }

  return open;
}

/** The level immediately below a locked one — what she has to get through first. */
export function levelBelow(level: ListeningLevel): ListeningLevel | undefined {
  const at = LISTENING_LEVELS.findIndex((entry) => entry.id === level.id);
  return at > 0 ? LISTENING_LEVELS[at - 1] : undefined;
}

/**
 * The whole stage, counted in items she has got through, for the Levels hub.
 *
 * One count per item, read under the ear that item was given to. On Both the
 * items alternate between the two ears, so asking every language to hold an
 * outcome for every item would be asking for something the level never offers —
 * and the hub row would sit at nothing for a learner who had heard the lot.
 *
 * Deliberately the plainest count the level can report. The hub is a list of
 * eight rows with room for one number apiece; the weighting, the per-language
 * split and the first-listen share all belong on this level's own screen, where
 * there is space to say what they mean.
 */
export function stageProgress(
  settings: Pick<Settings, 'listeningStats'>,
  languages: readonly Language[],
): { done: number; total: number } {
  const total = LISTENING_ITEMS.length;
  if (languages.length === 0) return { done: 0, total };

  let done = 0;
  for (const level of LISTENING_LEVELS) {
    for (const item of level.items) {
      const language = languageForItem(level, item.id, languages);
      if (outcomeOf(settings, item.id, language) !== undefined) done++;
    }
  }
  return { done, total };
}

/** Every attempt ever, by outcome, for the mastery breakdown. */
export function attemptTally(
  settings: Pick<Settings, 'listeningStats'>,
): { outcome: ListeningOutcome; count: number }[] {
  const attempts = listeningStats(settings).attempts;
  return OUTCOME_ORDER.map((outcome) => ({
    outcome,
    count: attempts[outcome] ?? 0,
  }));
}

// --- reading the content -----------------------------------------------------

export function levelById(id: string): ListeningLevel | undefined {
  return LISTENING_LEVELS.find((level) => level.id === id);
}

export function itemById(id: string): ListeningItem | undefined {
  return LISTENING_ITEMS.find((item) => item.id === id);
}

/** The level an item belongs to, for the back link and the walk to the next one. */
export function levelOfItem(itemId: string): ListeningLevel | undefined {
  return LISTENING_LEVELS.find((level) =>
    level.items.some((item) => item.id === itemId),
  );
}

/** The next item in the same level, or nothing at the end of it. */
export function nextItem(itemId: string): ListeningItem | undefined {
  const level = levelOfItem(itemId);
  if (!level) return undefined;
  const at = level.items.findIndex((item) => item.id === itemId);
  return at === -1 ? undefined : level.items[at + 1];
}

/**
 * Which language one item is heard in.
 *
 * On one language, that language throughout. On Both, alternating by position —
 * which is the spec's interleaving, and it is done at the item boundary
 * precisely so no single utterance can ever be half Hebrew and half Arabic.
 *
 * Positional rather than random, so a learner returning to an item gets the
 * language she last heard it in and the record for the other ear is never
 * filled in by luck.
 */
export function languageForItem(
  level: ListeningLevel,
  itemId: string,
  languages: readonly Language[],
): Language {
  if (languages.length === 0) return 'hebrew';
  if (languages.length === 1) return languages[0];
  const at = level.items.findIndex((item) => item.id === itemId);
  return languages[Math.max(0, at) % languages.length];
}

/**
 * The line's script with the gapped word cut out of it.
 *
 * Returned as the pieces either side rather than as one string with a marker in
 * it, so the screen can put a real blank between them and nothing has to parse
 * a sentinel back out of learner-facing text.
 *
 * A gap whose word is not in the line answers `undefined`, and the line is then
 * shown whole — a worse exercise, but never a broken one. The content test is
 * what stops that ever reaching a learner.
 */
export function splitAtGap(
  script: string,
  word: string,
): { before: string; after: string } | undefined {
  const at = script.indexOf(word);
  if (at === -1) return undefined;
  return { before: script.slice(0, at), after: script.slice(at + word.length) };
}

/**
 * The words of a line, for the phrase-boundary tiles.
 *
 * Split on whitespace only. Punctuation stays welded to its word on purpose:
 * the exercise is hearing where one word stops and the next starts, and a
 * question mark is not a word she has to place.
 */
export function tilesOf(script: string): string[] {
  return script.split(/\s+/).filter(Boolean);
}

/**
 * Whether the tiles have been laid out in the order they were said.
 *
 * Compared as a sequence rather than as a set, which is the whole exercise: the
 * same words in another order is precisely the wrong answer.
 */
export function tilesInOrder(chosen: readonly string[], script: string): boolean {
  const want = tilesOf(script);
  return chosen.length === want.length && chosen.every((tile, at) => tile === want[at]);
}

/**
 * A stable shuffle of the tiles, seeded by the line itself.
 *
 * Seeded rather than random so the tiles do not rearrange themselves under her
 * while she is working — a re-render is not a new exercise — and so a failed
 * attempt can be tried again against the same board. Any order but the right one
 * will do; where the seed happens to produce the right one it is rotated,
 * because handing her the answer already assembled is not an exercise at all.
 */
export function shuffledTiles(script: string): string[] {
  const tiles = tilesOf(script);
  if (tiles.length < 2) return tiles;

  // A small deterministic hash of the line, so the same line always shuffles the
  // same way and two different lines almost never do.
  let seed = 1;
  for (const character of script) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  }
  if (seed <= 0) seed = 1;

  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  const out = [...tiles];
  for (let at = out.length - 1; at > 0; at--) {
    const swap = Math.floor(random() * (at + 1));
    [out[at], out[swap]] = [out[swap], out[at]];
  }

  if (out.every((tile, at) => tile === tiles[at])) out.push(out.shift() as string);
  return out;
}
