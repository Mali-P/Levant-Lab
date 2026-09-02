import {
  both4,
  c,
  ofListener,
  ofSpeaker,
  stageDecks,
  type SeedCard,
  type SeedCategory,
  type SeedDeck,
} from './seed';

/**
 * Opinions & Reasons: saying what you think about it, and why.
 *
 * Every level up to here builds the report. She can say "the café was busy",
 * "the food was expensive", "I went there yesterday" — three true facts and not
 * one word about whether she would go back. This level is the difference
 * between describing a thing and having a view about it: I liked it, but I
 * think it was too expensive; I don't think it's worth it, because the food
 * wasn't very good.
 *
 * It is a standalone level like the seven before it — its progress is its own,
 * it gates nothing and nothing gates it (see `isOpinionsCategory` in
 * `features/review/languagePolicy`).
 *
 * **A lesson is a deck, and one line is a card**, exactly as in Tell Me About
 * It. No new study engine. Where a lesson grows one opinion — "I think" → "I
 * think it's good" → "…because it's easy" — the cards are ordered so the growth
 * is what the lesson view draws, reusing `addedPiece` from Sentence Building.
 * Where the point is answering something, the card carries a `cue`.
 *
 * **Three things here are not decks**, because the skill they teach has no line
 * to master:
 *
 *   `OPINION_STRENGTHS` — maybe, probably, I think so, I'm sure, definitely,
 *                         laid out as one scale from a guess to a certainty. The
 *                         "How sure are you" section's first lesson is built out
 *                         of it, so the picture and the practice cannot drift.
 *   `OPINION_BUILDS`    — answer three small questions about one thing, then
 *                         read the three answers back as one whole opinion. The
 *                         spec's "build an opinion", scaffolding included.
 *   `OPINION_STANDS`    — something is asserted or a choice is offered; she
 *                         takes a position and gives a reason for it. Nothing
 *                         here is ever marked wrong — see below.
 *
 * The spec's last stage — an opinion with nobody offering her the words — is
 * deliberately *not* built here. Free Conversation already has a model that can
 * read an answer with no single right form; this level hands over to it rather
 * than growing a second one.
 *
 * **No opinion is ever wrong.** Coffee is better than tea and tea is better
 * than coffee, and this level grades neither. What the decks grade is the
 * language — can she produce the sentence — and what the two unscored exercises
 * record is that she took a position and supported it. That is why `stands` is
 * a count and not a score, and why every position in `OPINION_STANDS` carries
 * its own honest reasons rather than one being the answer.
 *
 * **The gender rule is the mirror of the one below it.** Past & Future turned
 * on the first-person past being genderless in both languages. Here the split
 * runs the other way, and it runs *between* the languages:
 *
 *   Arabic's opinion verbs are genderless. بظنّ، بحبّ، بفضّل، بشوف are 1sg
 *     imperfect — one form whoever is speaking — so the whole spine of the level
 *     is genderless on the Arabic side.
 *   Hebrew's are gendered. חושבת، מעדיפה، אוהבת، מסכימה are present-tense
 *     participles, so every one of them is `ofSpeaker`.
 *   Except that Hebrew also has a genderless frame, and it is the commonest one
 *     spoken: נראה לי, "it seems to me". The level opens on it deliberately —
 *     it lets a learner say what she thinks about a dozen things before she has
 *     to think about agreement at all.
 *   And Arabic's agreement words are participles, so they are gendered after
 *     all: موافقة، متأكّدة، حاسّة. Both languages gender exactly those.
 *
 * A test pins the spine of that: the frames this level opens on carry one form
 * in both languages.
 *
 * **The Arabic is what a Palestinian says when arguing about a café.** Opinion
 * is where a course drifts into MSA fastest — the written language has a whole
 * register for it that nobody speaks — so nothing here is derived from it: "I
 * think" is بظنّ, not أعتقد أنّ; "but" is بس; "I prefer" is بفضّل; "you're
 * right" is معك حقّ; "exactly" is بالظبط; "worth it" is بستاهل; "should" is
 * لازم; "they're the same" is زيّ بعض; "probably" is على الأغلب. There is no
 * في رأيي and no مع ذلك anywhere in this file.
 *
 * **Hebrew is spoken Israeli Hebrew** for the same reason: נראה לי and לא נראה
 * לי rather than לדעתי for every single opinion, כדאי rather than מומלץ, שווה
 * rather than any of the formal ways of saying something is worth the money.
 *
 * **Vocabulary is borrowed, not invented.** The adjectives, places, times and
 * verbs come from Basics, the phrase decks, Past & Future and Tell Me About It;
 * the new words are the opinion frames themselves, the comparatives, and the
 * short list of agreement words the spec asks for by name.
 *
 * Authored 2026-09-02 by Claude; not yet reviewed by a native speaker.
 */

/**
 * A line spoken *to* the learner, whose two forms her own gender picks between.
 *
 * The same deliberate alias every level since Conversation Flow uses. "What do
 * you think?" is shu raʾyik to a woman and shu raʾyak to a man whoever is
 * asking, so the ending follows *her*, and the app's `speaker` agreement is
 * precisely "her own gender".
 */
const askedOfHer = ofSpeaker;

/** Shorthand for the speaker-gendered forms her own lines carry. */
const sp = ofSpeaker;

/** And for the lines whose ending follows the person she is talking to. */
const toThem = ofListener;

/**
 * How many flawless runs a lesson asks for. The same light bar a chain, an
 * exchange, a tense lesson and a telling lesson ask: this is a bridge to
 * speaking, and it gates nothing.
 */
const LESSON_RUNS = 5;

/** The capstone's shape — see `FINAL_TEST_GROUP`. */
const FINAL_TEST_RUNS = 10;
const FINAL_TEST_BATCH = 10;

/** A form whose two halves are spelled alike and only sound different. */
const SAID = {
  same: 'Written the same either way; only the ending is said differently.',
};

/** One lesson: a handful of lines that belong together. */
function lesson(name: string, cards: SeedCard[]): SeedDeck {
  return { name, cards, perfectRunsRequired: LESSON_RUNS };
}

/** Her answer, with the question it answers riding on it as a cue. */
function answer(asked: SeedCard, said: SeedCard): SeedCard {
  return {
    ...said,
    cue: { english: asked.english, hebrew: asked.hebrew, arabic: asked.arabic },
  };
}

// --- the questions this level exists to answer -------------------------------

/*
 * Asked of her over and over, in section after section. Written once here
 * because they are genuinely the same question each time — recycling them is
 * the spec's instruction and also the honest thing: a learner meets "why?" in
 * six contexts and it is one word in both languages every time.
 */

const WHAT_DO_YOU_THINK = c(
  'What do you think?',
  askedOfHer('מה את חושבת?', 'ma at khoshevet', 'מה אתה חושב?', 'ma ata khoshev'),
  askedOfHer('شو رأيك؟', 'shu raʾyik', 'شو رأيك؟', 'shu raʾyak'),
  { ar: SAID.same },
);

const DO_YOU_LIKE_IT = c(
  'Do you like it?',
  askedOfHer(
    'את אוהבת את זה?',
    'at ohevet et ze',
    'אתה אוהב את זה?',
    'ata ohev et ze',
  ),
  askedOfHer('عجبك؟', 'ʿajabik', 'عجبك؟', 'ʿajabak'),
  { ar: SAID.same },
);

const WHY = c('Why?', ['למה?', 'lama'], ['ليش؟', 'lēsh']);

const WHICH_DO_YOU_PREFER = c(
  'Which one do you prefer?',
  askedOfHer('מה את מעדיפה?', "ma at ma'adifa", 'מה אתה מעדיף?', "ma ata ma'adif"),
  askedOfHer(
    'أنهي واحد بتفضّلي؟',
    'anhu wāḥad bitfaḍḍli',
    'أنهي واحد بتفضّل؟',
    'anhu wāḥad bitfaḍḍil',
  ),
);

const DO_YOU_AGREE = c(
  'Do you agree?',
  askedOfHer('את מסכימה?', 'at maskima', 'אתה מסכים?', 'ata maskim'),
  askedOfHer('موافقة؟', 'muwāfʾa', 'موافق؟', 'muwāfiʾ'),
);

const ARE_YOU_SURE = c(
  'Are you sure?',
  askedOfHer('את בטוחה?', 'at betukha', 'אתה בטוח?', 'ata batuakh'),
  askedOfHer('متأكّدة؟', 'mitʾakkde', 'متأكّد؟', 'mitʾakkid'),
);

const IS_IT_WORTH_IT = c(
  'Is it worth it?',
  ['זה שווה את זה?', 'ze shave et ze'],
  ['بستاهل؟', 'bistāhal'],
);

const WOULD_YOU_GO_AGAIN = c(
  'Would you go again?',
  askedOfHer(
    'היית חוזרת לשם?',
    'hayit khozeret le-sham',
    'היית חוזר לשם?',
    'hayita khozer le-sham',
  ),
  askedOfHer(
    'بترجعي كمان مرّة؟',
    'bitirjaʿi kamān marra',
    'بترجع كمان مرّة؟',
    'bitirjaʿ kamān marra',
  ),
);

const WHAT_WOULD_YOU_CHOOSE = c(
  'What would you choose?',
  askedOfHer(
    'מה היית בוחרת?',
    'ma hayit bokheret',
    'מה היית בוחר?',
    'ma hayita bokher',
  ),
  askedOfHer('شو بتختاري؟', 'shu bitikhtāri', 'شو بتختار؟', 'shu bitikhtār'),
);

const WHICH_DO_YOU_WANT = c(
  'Which one do you want?',
  askedOfHer('מה את רוצה?', 'ma at rotsa', 'מה אתה רוצה?', 'ma ata rotse'),
  askedOfHer(
    'أنهي واحد بدّك؟',
    'anhu wāḥad biddik',
    'أنهي واحد بدّك؟',
    'anhu wāḥad biddak',
  ),
  { ar: SAID.same },
);

// --- how sure you are --------------------------------------------------------

/**
 * One rung of the certainty scale: a word, and what saying it commits you to.
 *
 * The spec asks for maybe / probably / I think / I'm sure / definitely to be
 * *contrasted* rather than met one at a time, because their whole meaning is
 * relative — "probably" only means anything against "maybe" on one side and
 * "definitely" on the other. So they are authored as a scale and drawn as one.
 */
export type OpinionStrength = {
  /** 1 is a guess, 5 is a commitment. The scale's only ordering. */
  level: 1 | 2 | 3 | 4 | 5;
  word: SeedCard;
  /** What answering this way actually tells the person asking. */
  means: string;
  /** The same question answered at this strength. */
  example: SeedCard;
};

/**
 * The scale, weakest first, every rung answering one question.
 *
 * The question is the same throughout on purpose — "are you going tomorrow?" —
 * because that is what makes the rungs comparable. Change the question between
 * rungs and the learner is comparing two things at once.
 *
 * `OPINION_STRENGTHS` is the source and the first lesson of "How sure are you"
 * is built out of it, so the picture she reads and the deck she practises can
 * never drift apart — the same arrangement `CONNECTORS` has with Tell Me About
 * It's first lesson, and `TENSE_TRIADS` with the contrast decks.
 */
export const OPINION_STRENGTHS: OpinionStrength[] = [
  {
    level: 1,
    means: 'A real guess. You have not decided, and you might not go.',
    word: c('maybe', ['אולי', 'ulai'], ['يمكن', 'yimkin']),
    example: c(
      'Maybe. I have not decided',
      ['אולי. עוד לא החלטתי', 'ulai. od lo hekhlatti'],
      ['يمكن. لسّا ما قرّرت', 'yimkin. lissa ma ʾarrart'],
    ),
  },
  {
    level: 2,
    means: 'Leaning one way. More likely than not, but do not hold you to it.',
    word: c('probably', ['כנראה', "kanir'e"], ['على الأغلب', 'ʿal-aghlab']),
    example: c(
      'Probably, but I am not sure yet',
      sp(
        'כנראה, אבל אני עוד לא בטוחה',
        "kanir'e, aval ani od lo betukha",
        'כנראה, אבל אני עוד לא בטוח',
        "kanir'e, aval ani od lo batuakh",
      ),
      sp(
        'على الأغلب، بس لسّا مش متأكّدة',
        'ʿal-aghlab, bass lissa mish mitʾakkde',
        'على الأغلب، بس لسّا مش متأكّد',
        'ʿal-aghlab, bass lissa mish mitʾakkid',
      ),
    ),
  },
  {
    level: 3,
    means: 'Your own view, offered as a view. Somebody may argue with it.',
    word: c(
      'I think so',
      ['נראה לי שכן', "nir'e li she-ken"],
      ['بظنّ هيك', 'baẓunn hēk'],
      {
        he: 'Literally "it seems to me that yes". The commonest opinion phrase in spoken Hebrew, and it never changes with gender.',
        ar: 'baẓunn is one form whoever says it — the Arabic opinion verbs do not carry gender.',
      },
    ),
    example: c(
      'I think so, yes',
      ['נראה לי שכן', "nir'e li she-ken"],
      ['بظنّ هيك، آه', 'baẓunn hēk, āh'],
    ),
  },
  {
    level: 4,
    means: 'Settled, as far as you know. Something would have to change.',
    word: c(
      'I am sure',
      sp('אני בטוחה', 'ani betukha', 'אני בטוח', 'ani batuakh'),
      sp('متأكّدة', 'mitʾakkde', 'متأكّد', 'mitʾakkid'),
      {
        he: 'This one does change with gender — it is an adjective about you.',
        ar: 'And so does this one: mitʾakkid is a participle, so it agrees like an adjective.',
      },
    ),
    example: c(
      'Yes, I am sure',
      sp('כן, אני בטוחה', 'ken, ani betukha', 'כן, אני בטוח', 'ken, ani batuakh'),
      sp('آه، متأكّدة', 'āh, mitʾakkde', 'آه، متأكّد', 'āh, mitʾakkid'),
    ),
  },
  {
    level: 5,
    means: 'No room left in it. Use it sparingly or it stops meaning anything.',
    word: c('definitely', ['בהחלט', 'behekhlet'], ['أكيد', 'akīd']),
    example: c(
      'Yes, definitely',
      ['כן, בהחלט', 'ken, behekhlet'],
      ['آه، أكيد', 'āh, akīd'],
    ),
  },
];

/** The headings the scale is drawn under, weakest first. */
export const STRENGTH_STEPS: { level: 1 | 2 | 3 | 4 | 5; heading: string }[] = [
  { level: 1, heading: 'A guess' },
  { level: 2, heading: 'Leaning that way' },
  { level: 3, heading: 'Your view' },
  { level: 4, heading: 'Settled' },
  { level: 5, heading: 'No doubt at all' },
];

/** The one question the whole scale answers, shown above it. */
export const STRENGTH_QUESTION = c(
  'Are you going tomorrow?',
  askedOfHer(
    'את הולכת מחר?',
    'at holekhet makhar',
    'אתה הולך מחר?',
    'ata holekh makhar',
  ),
  askedOfHer('رايحة بكرا؟', 'rāyḥa bukra', 'رايح بكرا؟', 'rāyiḥ bukra'),
);

// --- saying what you think ---------------------------------------------------

const IT_SEEMS_TO_ME: SeedDeck[] = [
  lesson('It seems to me', [
    c('It seems to me', ['נראה לי', "nir'e li"], ['بظنّ', 'baẓunn'], {
      he: 'The everyday "I think". Genderless — a woman and a man say it identically.',
      ar: 'baẓunn is the "I" form of ẓann: one wording for everybody, exactly like baḥibb.',
    }),
    c('I think so', ['נראה לי שכן', "nir'e li she-ken"], ['بظنّ هيك', 'baẓunn hēk']),
    c('I do not think so', ['לא נראה לי', "lo nir'e li"], ['ما بظنّ', 'ma baẓunn'], {
      ar: 'The Arabic negates the thinking, not the thing — exactly as English does.',
    }),
    c(
      'I think',
      sp('אני חושבת', 'ani khoshevet', 'אני חושב', 'ani khoshev'),
      ['بظنّ', 'baẓunn'],
      { he: 'The other Hebrew way, and this one does change with gender.' },
    ),
    c('In my opinion', ['לדעתי', "le-da'ati"], ['برأيي', 'bi-raʾyi']),
    c('For me', ['בשבילי', 'bishvili'], ['بالنسبة إلي', 'bin-nisbe ili']),
  ]),
  lesson('I think it is…', [
    c(
      'I think it is good',
      ['נראה לי שזה טוב', "nir'e li she-ze tov"],
      ['بظنّ إنّه حلو', 'baẓunn inno ḥilu'],
    ),
    c(
      'I think it is bad',
      ['נראה לי שזה לא טוב', "nir'e li she-ze lo tov"],
      ['بظنّ إنّه مش حلو', 'baẓunn inno mish ḥilu'],
    ),
    c(
      'I think it is expensive',
      ['נראה לי שזה יקר', "nir'e li she-ze yakar"],
      ['بظنّ إنّه غالي', 'baẓunn inno ghāli'],
    ),
    c(
      'I think it is too far',
      ['נראה לי שזה רחוק מדי', "nir'e li she-ze rakhok midai"],
      ['بظنّ إنّه بعيد كتير', 'baẓunn inno baʿīd ktīr'],
    ),
    c(
      'I think it is better',
      ['נראה לי שזה יותר טוב', "nir'e li she-ze yoter tov"],
      ['بظنّ إنّه أحسن', 'baẓunn inno aḥsan'],
    ),
    c(
      'I think it is a good idea',
      ['נראה לי רעיון טוב', "nir'e li ra'ayon tov"],
      ['بظنّها فكرة حلوة', 'baẓunnha fikra ḥilwe'],
    ),
  ]),
  lesson('I think somebody is…', [
    c(
      'I think she is right',
      ['נראה לי שהיא צודקת', "nir'e li she-hi tsodeket"],
      ['بظنّ معها حقّ', 'baẓunn maʿha ḥaʾʾ'],
      { ar: 'Literally "with her is right" — that is how both rightness and wrongness are said.' },
    ),
    c(
      'I think he is wrong',
      ['נראה לי שהוא טועה', "nir'e li she-hu to'e"],
      ['بظنّ إنّه غلطان', 'baẓunn inno ghalṭān'],
    ),
    c(
      'I think you are right',
      toThem(
        'נראה לי שאת צודקת',
        "nir'e li she-at tsodeket",
        'נראה לי שאתה צודק',
        "nir'e li she-ata tsodek",
      ),
      toThem('بظنّ معك حقّ', 'baẓunn maʿik ḥaʾʾ', 'بظنّ معك حقّ', 'baẓunn maʿak ḥaʾʾ'),
      { ar: SAID.same },
    ),
    c(
      'I think we should go',
      ['נראה לי שכדאי לנו ללכת', "nir'e li she-kedai lanu lalekhet"],
      ['بظنّ لازم نروح', 'baẓunn lāzim nrūḥ'],
    ),
  ]),
];

const I_DONT_THINK: SeedDeck[] = [
  lesson('I do not think so', [
    c('I do not think so', ['לא נראה לי', "lo nir'e li"], ['ما بظنّ', 'ma baẓunn']),
    c(
      'I do not think it is good',
      ['לא נראה לי שזה טוב', "lo nir'e li she-ze tov"],
      ['ما بظنّه حلو', 'ma baẓunno ḥilu'],
    ),
    c(
      'I do not think it is expensive',
      ['לא נראה לי שזה יקר', "lo nir'e li she-ze yakar"],
      ['ما بظنّه غالي', 'ma baẓunno ghāli'],
    ),
    c(
      'I do not think it is far',
      ['לא נראה לי שזה רחוק', "lo nir'e li she-ze rakhok"],
      ['ما بظنّه بعيد', 'ma baẓunno baʿīd'],
    ),
  ]),
  lesson('Saying no to the whole thing', [
    c(
      'I do not think we need it',
      ['לא נראה לי שצריך את זה', "lo nir'e li she-tsarikh et ze"],
      ['ما بظنّ إنّه لازم', 'ma baẓunn inno lāzim'],
    ),
    c(
      'I do not think that is right',
      ['לא נראה לי שזה נכון', "lo nir'e li she-ze nakhon"],
      ['ما بظنّ إنّه صحّ', 'ma baẓunn inno ṣaḥḥ'],
    ),
    c(
      'I do not think we should go',
      ['לא נראה לי שכדאי לנו ללכת', "lo nir'e li she-kedai lanu lalekhet"],
      ['ما بظنّ لازم نروح', 'ma baẓunn lāzim nrūḥ'],
    ),
    c(
      'I do not think it is a good idea',
      ['לא נראה לי רעיון טוב', "lo nir'e li ra'ayon tov"],
      ['ما بظنّها فكرة حلوة', 'ma baẓunnha fikra ḥilwe'],
    ),
  ]),
];

const LIKING: SeedDeck[] = [
  lesson('Liking and not liking', [
    c(
      'I like it',
      sp('אני אוהבת את זה', 'ani ohevet et ze', 'אני אוהב את זה', 'ani ohev et ze'),
      ['بحبّه', 'baḥibbo'],
      {
        he: 'Present tense, so it carries her gender.',
        ar: 'baḥibb is one wording for everybody, like baẓunn.',
      },
    ),
    c(
      'I do not like it',
      sp(
        'אני לא אוהבת את זה',
        'ani lo ohevet et ze',
        'אני לא אוהב את זה',
        'ani lo ohev et ze',
      ),
      ['ما بحبّه', 'ma baḥibbo'],
    ),
    c(
      'I really like it',
      sp(
        'אני ממש אוהבת את זה',
        'ani mamash ohevet et ze',
        'אני ממש אוהב את זה',
        'ani mamash ohev et ze',
      ),
      ['بحبّه كتير', 'baḥibbo ktīr'],
    ),
    c('I liked it', ['אהבתי את זה', 'ahavti et ze'], ['عجبني', 'ʿajabni'], {
      he: 'Past tense, and genderless — as every first-person past is.',
      ar: 'Literally "it pleased me", which is how Palestinians say they liked something.',
    }),
    c('I did not like it', ['לא אהבתי את זה', 'lo ahavti et ze'], ['ما عجبني', 'ma ʿajabni']),
  ]),
  lesson('Liking one part and not another', [
    c(
      'I like the food',
      sp(
        'אני אוהבת את האוכל',
        'ani ohevet et ha-okhel',
        'אני אוהב את האוכל',
        'ani ohev et ha-okhel',
      ),
      ['بحبّ الأكل', 'baḥibb il-akl'],
    ),
    c(
      'I like the food, but I do not like the place',
      sp(
        'אני אוהבת את האוכל אבל לא את המקום',
        'ani ohevet et ha-okhel aval lo et ha-makom',
        'אני אוהב את האוכל אבל לא את המקום',
        'ani ohev et ha-okhel aval lo et ha-makom',
      ),
      ['بحبّ الأكل بس ما بحبّ المحلّ', 'baḥibb il-akl bass ma baḥibb il-maḥall'],
    ),
    c(
      'I liked it, but I would not go again',
      ['אהבתי את זה אבל לא הייתי חוזרת', 'ahavti et ze aval lo hayiti khozeret'],
      ['عجبني بس ما كنت برجع', 'ʿajabni bass ma kunt barjaʿ'],
    ),
  ]),
];

const WHOSE_OPINION: SeedDeck[] = [
  lesson('In my opinion', [
    c('In my opinion', ['לדעתי', "le-da'ati"], ['برأيي', 'bi-raʾyi']),
    c(
      'For me, it is better',
      ['בשבילי זה יותר טוב', 'bishvili ze yoter tov'],
      ['بالنسبة إلي أحسن', 'bin-nisbe ili aḥsan'],
    ),
    c(
      'I feel that it is too much',
      sp(
        'אני מרגישה שזה יותר מדי',
        'ani margisha she-ze yoter midai',
        'אני מרגיש שזה יותר מדי',
        'ani margish she-ze yoter midai',
      ),
      sp('حاسّة إنّه كتير', 'ḥāsse inno ktīr', 'حاسّ إنّه كتير', 'ḥāsis inno ktīr'),
    ),
    c(
      'The way I see it',
      sp(
        'איך שאני רואה את זה',
        "eikh she-ani ro'a et ze",
        'איך שאני רואה את זה',
        "eikh she-ani ro'e et ze",
      ),
      ['بشوفها هيك', 'bashūfha hēk'],
      { he: SAID.same },
    ),
  ]),
  lesson('Asking somebody else', [
    WHAT_DO_YOU_THINK,
    c(
      'What do you think about this?',
      askedOfHer(
        'מה את חושבת על זה?',
        'ma at khoshevet al ze',
        'מה אתה חושב על זה?',
        'ma ata khoshev al ze',
      ),
      askedOfHer('شو رأيك بهاد؟', 'shu raʾyik bi-hād', 'شو رأيك بهاد؟', 'shu raʾyak bi-hād'),
      { ar: SAID.same },
    ),
    DO_YOU_AGREE,
    c(
      'And you?',
      askedOfHer('ואת?', 've-at', 'ואתה?', 've-ata'),
      askedOfHer('وإنتي؟', 'w-inti', 'وإنت؟', 'w-inta'),
    ),
  ]),
];

// --- and why -----------------------------------------------------------------

const BECAUSE: SeedDeck[] = [
  lesson('The reason after it', [
    c('because it is good', ['כי זה טוב', 'ki ze tov'], ['لأنّه حلو', 'laʾinno ḥilu']),
    c('because it is expensive', ['כי זה יקר', 'ki ze yakar'], ['لأنّه غالي', 'laʾinno ghāli']),
    c('because it is easy', ['כי זה קל', 'ki ze kal'], ['لأنّه سهل', 'laʾinno sahl']),
    c('because it is far', ['כי זה רחוק', 'ki ze rakhok'], ['لأنّه بعيد', 'laʾinno baʿīd']),
    c('because it is useful', ['כי זה מועיל', "ki ze mo'il"], ['لأنّه مفيد', 'laʾinno mufīd']),
  ]),
  lesson('I like it because…', [
    c(
      'I like it because it is easy',
      sp(
        'אני אוהבת את זה כי זה קל',
        'ani ohevet et ze ki ze kal',
        'אני אוהב את זה כי זה קל',
        'ani ohev et ze ki ze kal',
      ),
      ['بحبّه لأنّه سهل', 'baḥibbo laʾinno sahl'],
    ),
    c(
      'I like it because it is beautiful',
      sp(
        'אני אוהבת את זה כי זה יפה',
        'ani ohevet et ze ki ze yafe',
        'אני אוהב את זה כי זה יפה',
        'ani ohev et ze ki ze yafe',
      ),
      ['بحبّه لأنّه حلو كتير', 'baḥibbo laʾinno ḥilu ktīr'],
    ),
    c(
      'I like it because it is quiet',
      sp(
        'אני אוהבת את זה כי זה שקט',
        'ani ohevet et ze ki ze shaket',
        'אני אוהב את זה כי זה שקט',
        'ani ohev et ze ki ze shaket',
      ),
      ['بحبّه لأنّه هادي', 'baḥibbo laʾinno hādi'],
    ),
  ]),
  lesson('I do not like it because…', [
    c(
      'I do not like it because it is expensive',
      sp(
        'אני לא אוהבת את זה כי זה יקר',
        'ani lo ohevet et ze ki ze yakar',
        'אני לא אוהב את זה כי זה יקר',
        'ani lo ohev et ze ki ze yakar',
      ),
      ['ما بحبّه لأنّه غالي', 'ma baḥibbo laʾinno ghāli'],
    ),
    c(
      'I do not like it because it is too loud',
      sp(
        'אני לא אוהבת את זה כי יש שם רעש',
        'ani lo ohevet et ze ki yesh sham raash',
        'אני לא אוהב את זה כי יש שם רעש',
        'ani lo ohev et ze ki yesh sham raash',
      ),
      ['ما بحبّه لأنّ فيه دوشة', 'ma baḥibbo laʾinn fī dōshe'],
    ),
    c(
      'I do not like it because it is too crowded',
      sp(
        'אני לא אוהבת את זה כי זה צפוף מדי',
        'ani lo ohevet et ze ki ze tsafuf midai',
        'אני לא אוהב את זה כי זה צפוף מדי',
        'ani lo ohev et ze ki ze tsafuf midai',
      ),
      ['ما بحبّه لأنّه زحمة كتير', 'ma baḥibbo laʾinno zaḥme ktīr'],
    ),
  ]),
];

const WHY_SECTION: SeedDeck[] = [
  lesson('Answering why', [
    answer(
      WHY,
      c('Because it is cheaper', ['כי זה יותר זול', 'ki ze yoter zol'], ['لأنّه أرخص', 'laʾinno arkhaṣ']),
    ),
    answer(
      WHY,
      c('Because it is closer', ['כי זה יותר קרוב', 'ki ze yoter karov'], ['لأنّه أقرب', 'laʾinno aʾrab']),
    ),
    answer(
      WHY,
      c('Because the food is good', ['כי האוכל טוב', 'ki ha-okhel tov'], ['لأنّ الأكل طيّب', 'laʾinn il-akl ṭayyib']),
    ),
    answer(
      WHY,
      c(
        'Because I am tired',
        sp('כי אני עייפה', 'ki ani ayefa', 'כי אני עייף', 'ki ani ayef'),
        sp('لأنّي تعبانة', 'laʾinni taʿbāne', 'لأنّي تعبان', 'laʾinni taʿbān'),
      ),
    ),
    answer(
      WHY,
      c(
        'Because I have never been there',
        ['כי אף פעם לא הייתי שם', 'ki af paam lo hayiti sham'],
        ['لأنّي عمري ما رحت', 'laʾinni ʿumri ma ruḥt'],
      ),
    ),
  ]),
  lesson('Wanting, with the reason', [
    c(
      'I want to go because I have never been there',
      ['אני רוצה ללכת כי אף פעם לא הייתי שם', 'ani rotsa lalekhet ki af paam lo hayiti sham'],
      ['بدّي أروح لأنّي عمري ما رحت', 'biddi arūḥ laʾinni ʿumri ma ruḥt'],
    ),
    c(
      'I do not want to go because I am tired',
      sp(
        'אני לא רוצה ללכת כי אני עייפה',
        'ani lo rotsa lalekhet ki ani ayefa',
        'אני לא רוצה ללכת כי אני עייף',
        'ani lo rotse lalekhet ki ani ayef',
      ),
      sp(
        'ما بدّي أروح لأنّي تعبانة',
        'ma biddi arūḥ laʾinni taʿbāne',
        'ما بدّي أروح لأنّي تعبان',
        'ma biddi arūḥ laʾinni taʿbān',
      ),
    ),
    c(
      'I agree because you are right',
      both4(
        ['אני מסכימה כי אתה צודק', 'ani maskima ki ata tsodek'],
        ['אני מסכימה כי את צודקת', 'ani maskima ki at tsodeket'],
        ['אני מסכים כי את צודקת', 'ani maskim ki at tsodeket'],
        ['אני מסכים כי אתה צודק', 'ani maskim ki ata tsodek'],
      ),
      both4(
        ['أنا موافقة لأنّ معك حقّ', 'ana muwāfʾa laʾinn maʿak ḥaʾʾ'],
        ['أنا موافقة لأنّ معك حقّ', 'ana muwāfʾa laʾinn maʿik ḥaʾʾ'],
        ['أنا موافق لأنّ معك حقّ', 'ana muwāfiʾ laʾinn maʿik ḥaʾʾ'],
        ['أنا موافق لأنّ معك حقّ', 'ana muwāfiʾ laʾinn maʿak ḥaʾʾ'],
      ),
      {
        he: 'Two people in one sentence: "agree" follows who is speaking, "right" follows who is listening.',
      },
    ),
  ]),
];

const GROWING: SeedDeck[] = [
  lesson('From two words to a whole opinion', [
    c('I think', ['נראה לי', "nir'e li"], ['بظنّ', 'baẓunn']),
    c('I think it is good', ['נראה לי שזה טוב', "nir'e li she-ze tov"], ['بظنّ إنّه حلو', 'baẓunn inno ḥilu']),
    c(
      'I think it is very good',
      ['נראה לי שזה מאוד טוב', "nir'e li she-ze meod tov"],
      ['بظنّ إنّه كتير حلو', 'baẓunn inno ktīr ḥilu'],
    ),
    c(
      'I think it is very good because it is easy',
      ['נראה לי שזה מאוד טוב כי זה קל', "nir'e li she-ze meod tov ki ze kal"],
      ['بظنّ إنّه كتير حلو لأنّه سهل', 'baẓunn inno ktīr ḥilu laʾinno sahl'],
    ),
    c(
      'I think it is very good because it is easy and useful',
      ['נראה לי שזה מאוד טוב כי זה קל ומועיל', "nir'e li she-ze meod tov ki ze kal u-mo'il"],
      ['بظنّ إنّه كتير حلو لأنّه سهل ومفيد', 'baẓunn inno ktīr ḥilu laʾinno sahl w-mufīd'],
    ),
  ]),
  lesson('The same, the other way', [
    c(
      'I do not like it',
      sp('אני לא אוהבת את זה', 'ani lo ohevet et ze', 'אני לא אוהב את זה', 'ani lo ohev et ze'),
      ['ما بحبّه', 'ma baḥibbo'],
    ),
    c(
      'I do not like it because it is expensive',
      sp(
        'אני לא אוהבת את זה כי זה יקר',
        'ani lo ohevet et ze ki ze yakar',
        'אני לא אוהב את זה כי זה יקר',
        'ani lo ohev et ze ki ze yakar',
      ),
      ['ما بحبّه لأنّه غالي', 'ma baḥibbo laʾinno ghāli'],
    ),
    c(
      'I do not like it because it is expensive and too far away',
      sp(
        'אני לא אוהבת את זה כי זה יקר ורחוק מדי',
        'ani lo ohevet et ze ki ze yakar ve-rakhok midai',
        'אני לא אוהב את זה כי זה יקר ורחוק מדי',
        'ani lo ohev et ze ki ze yakar ve-rakhok midai',
      ),
      ['ما بحبّه لأنّه غالي وبعيد كتير', 'ma baḥibbo laʾinno ghāli w-baʿīd ktīr'],
    ),
  ]),
];

// --- choosing between things -------------------------------------------------

const I_PREFER: SeedDeck[] = [
  lesson('I prefer this one', [
    c(
      'I prefer this one',
      sp('אני מעדיפה את זה', "ani ma'adifa et ze", 'אני מעדיף את זה', "ani ma'adif et ze"),
      ['بفضّل هاد', 'bfaḍḍil hād'],
      {
        he: 'Present tense, so it carries her gender.',
        ar: 'bfaḍḍil is one wording for everybody.',
      },
    ),
    c(
      'I prefer that one',
      sp('אני מעדיפה את ההוא', "ani ma'adifa et ha-hu", 'אני מעדיף את ההוא', "ani ma'adif et ha-hu"),
      ['بفضّل هداك', 'bfaḍḍil hadāk'],
    ),
    c(
      'I prefer coffee',
      sp('אני מעדיפה קפה', "ani ma'adifa kafe", 'אני מעדיף קפה', "ani ma'adif kafe"),
      ['بفضّل القهوة', 'bfaḍḍil il-ʾahwe'],
    ),
    c(
      'I prefer tea',
      sp('אני מעדיפה תה', "ani ma'adifa te", 'אני מעדיף תה', "ani ma'adif te"),
      ['بفضّل الشاي', 'bfaḍḍil ish-shāy'],
    ),
    c(
      'I prefer the blue one',
      sp('אני מעדיפה את הכחול', "ani ma'adifa et ha-kakhol", 'אני מעדיף את הכחול', "ani ma'adif et ha-kakhol"),
      ['بفضّل الأزرق', 'bfaḍḍil il-azraʾ'],
    ),
  ]),
  lesson('I prefer doing something', [
    c(
      'I prefer going in the morning',
      sp(
        'אני מעדיפה ללכת בבוקר',
        "ani ma'adifa lalekhet ba-boker",
        'אני מעדיף ללכת בבוקר',
        "ani ma'adif lalekhet ba-boker",
      ),
      ['بفضّل أروح الصبح', 'bfaḍḍil arūḥ iṣ-ṣubḥ'],
    ),
    c(
      'I prefer staying home',
      sp(
        'אני מעדיפה להישאר בבית',
        "ani ma'adifa lehisha'er ba-bayit",
        'אני מעדיף להישאר בבית',
        "ani ma'adif lehisha'er ba-bayit",
      ),
      ['بفضّل أضلّ بالبيت', 'bfaḍḍil aḍall bil-bēt'],
    ),
    c(
      'I prefer Hebrew',
      sp('אני מעדיפה עברית', "ani ma'adifa ivrit", 'אני מעדיף עברית', "ani ma'adif ivrit"),
      ['بفضّل العبري', 'bfaḍḍil il-ʿibri'],
    ),
    c(
      'I prefer Arabic',
      sp('אני מעדיפה ערבית', "ani ma'adifa aravit", 'אני מעדיף ערבית', "ani ma'adif aravit"),
      ['بفضّل العربي', 'bfaḍḍil il-ʿarabi'],
    ),
  ]),
  lesson('I like both, but…', [
    c(
      'I like both',
      sp('אני אוהבת את שניהם', 'ani ohevet et shneihem', 'אני אוהב את שניהם', 'ani ohev et shneihem'),
      ['بحبّ التنين', 'baḥibb it-tnēn'],
    ),
    c(
      'I like both, but I prefer this one',
      sp(
        'אני אוהבת את שניהם אבל מעדיפה את זה',
        "ani ohevet et shneihem aval ma'adifa et ze",
        'אני אוהב את שניהם אבל מעדיף את זה',
        "ani ohev et shneihem aval ma'adif et ze",
      ),
      ['بحبّ التنين، بس بفضّل هاد', 'baḥibb it-tnēn, bass bfaḍḍil hād'],
    ),
    c(
      'I prefer this one because it is smaller',
      sp(
        'אני מעדיפה את זה כי זה יותר קטן',
        "ani ma'adifa et ze ki ze yoter katan",
        'אני מעדיף את זה כי זה יותר קטן',
        "ani ma'adif et ze ki ze yoter katan",
      ),
      ['بفضّل هاد لأنّه أصغر', 'bfaḍḍil hād laʾinno azghar'],
    ),
  ]),
];

const WHICH_ONE: SeedDeck[] = [
  lesson('Which do you want?', [
    answer(
      WHICH_DO_YOU_WANT,
      c('I want this one', ['אני רוצה את זה', 'ani rotsa et ze'], ['بدّي هاد', 'biddi hād']),
    ),
    answer(
      WHICH_DO_YOU_WANT,
      c('I want that one', ['אני רוצה את ההוא', 'ani rotsa et ha-hu'], ['بدّي هداك', 'biddi hadāk']),
    ),
    answer(
      WHICH_DO_YOU_WANT,
      c('Either one is fine', ['שניהם בסדר', 'shneihem beseder'], ['التنين مناح', 'it-tnēn mnāḥ']),
    ),
  ]),
  lesson('Which do you prefer, and why?', [
    answer(
      WHICH_DO_YOU_PREFER,
      c(
        'I prefer that one',
        sp('אני מעדיפה את ההוא', "ani ma'adifa et ha-hu", 'אני מעדיף את ההוא', "ani ma'adif et ha-hu"),
        ['بفضّل هداك', 'bfaḍḍil hadāk'],
      ),
    ),
    answer(
      WHY,
      c('Because it is cheaper', ['כי זה יותר זול', 'ki ze yoter zol'], ['لأنّه أرخص', 'laʾinno arkhaṣ']),
    ),
    answer(
      WHAT_WOULD_YOU_CHOOSE,
      c('I would choose this one', ['הייתי בוחרת את זה', 'hayiti bokheret et ze'], ['كنت بختار هاد', 'kunt bakhtār hād']),
    ),
    answer(
      c('Coffee or tea?', ['קפה או תה?', 'kafe o te'], ['قهوة ولّا شاي؟', 'ʾahwe walla shāy']),
      c(
        'I prefer coffee, because I do not like tea',
        sp(
          'אני מעדיפה קפה כי אני לא אוהבת תה',
          "ani ma'adifa kafe ki ani lo ohevet te",
          'אני מעדיף קפה כי אני לא אוהב תה',
          "ani ma'adif kafe ki ani lo ohev te",
        ),
        ['بفضّل القهوة لأنّي ما بحبّ الشاي', 'bfaḍḍil il-ʾahwe laʾinni ma baḥibb ish-shāy'],
      ),
    ),
  ]),
];

const BETTER_AND_WORSE: SeedDeck[] = [
  lesson('This one is better', [
    c('This is better', ['זה יותר טוב', 'ze yoter tov'], ['هاد أحسن', 'hād aḥsan']),
    c('That is better', ['ההוא יותר טוב', 'ha-hu yoter tov'], ['هداك أحسن', 'hadāk aḥsan']),
    c('This is worse', ['זה יותר גרוע', 'ze yoter garua'], ['هاد أوحش', 'hād awḥash']),
    c(
      'I think this one is better',
      ['נראה לי שזה יותר טוב', "nir'e li she-ze yoter tov"],
      ['بظنّ هاد أحسن', 'baẓunn hād aḥsan'],
    ),
  ]),
  lesson('How much better', [
    c('It is much better', ['זה הרבה יותר טוב', 'ze harbe yoter tov'], ['أحسن بكتير', 'aḥsan bi-ktīr']),
    c('It is a little better', ['זה קצת יותר טוב', 'ze ktsat yoter tov'], ['أحسن شويّ', 'aḥsan shwayy']),
    c('It is almost the same', ['זה כמעט אותו דבר', "ze kim'at oto davar"], ['تقريباً نفس الإشي', 'taʾrīban nafs il-ishi']),
  ]),
  lesson('Cheaper, bigger, easier', [
    c('This one is cheaper', ['זה יותר זול', 'ze yoter zol'], ['هاد أرخص', 'hād arkhaṣ']),
    c('That one is bigger', ['ההוא יותר גדול', 'ha-hu yoter gadol'], ['هداك أكبر', 'hadāk akbar']),
    c(
      'I think that one is easier',
      ['נראה לי שההוא יותר קל', "nir'e li she-ha-hu yoter kal"],
      ['بظنّ هداك أسهل', 'baẓunn hadāk ashal'],
    ),
    c('This one is closer', ['זה יותר קרוב', 'ze yoter karov'], ['هاد أقرب', 'hād aʾrab']),
    c(
      'I think this one is better because it is cheaper',
      ['נראה לי שזה יותר טוב כי זה יותר זול', "nir'e li she-ze yoter tov ki ze yoter zol"],
      ['بظنّ هاد أحسن لأنّه أرخص', 'baẓunn hād aḥsan laʾinno arkhaṣ'],
    ),
  ]),
];

const SAME_AND_DIFFERENT: SeedDeck[] = [
  lesson('They are the same', [
    c('They are the same', ['הם אותו דבר', 'hem oto davar'], ['زيّ بعض', 'zayy baʿḍ'], {
      ar: 'Literally "like each other" — the everyday way of saying two things are the same.',
    }),
    c('It is almost the same', ['זה כמעט אותו דבר', "ze kim'at oto davar"], ['تقريباً نفس الإشي', 'taʾrīban nafs il-ishi']),
    c(
      'I do not see a difference',
      sp('אני לא רואה הבדל', "ani lo ro'a hevdel", 'אני לא רואה הבדל', "ani lo ro'e hevdel"),
      ['ما بشوف فرق', 'ma bashūf farʾ'],
      { he: SAID.same },
    ),
  ]),
  lesson('They are different', [
    c('They are different', ['הם שונים', 'hem shonim'], ['مختلفين', 'mukhtalfīn']),
    c('It is a little different', ['זה קצת שונה', 'ze ktsat shone'], ['مختلف شويّ', 'mukhtalif shwayy']),
    c('This one is different', ['זה שונה', 'ze shone'], ['هاد مختلف', 'hād mukhtalif']),
    c('What is the difference?', ['מה ההבדל?', 'ma ha-hevdel'], ['شو الفرق؟', 'shu il-farʾ']),
  ]),
];

// --- answering somebody else's opinion ---------------------------------------

const AGREEING: SeedDeck[] = [
  lesson('Ways of agreeing', [
    c(
      'I agree',
      sp('אני מסכימה', 'ani maskima', 'אני מסכים', 'ani maskim'),
      sp('أنا موافقة', 'ana muwāfʾa', 'أنا موافق', 'ana muwāfiʾ'),
      { ar: 'A participle, so this one does agree with who is speaking — unlike baẓunn.' },
    ),
    c(
      'Yes, I agree',
      sp('כן, אני מסכימה', 'ken, ani maskima', 'כן, אני מסכים', 'ken, ani maskim'),
      sp('آه، أنا موافقة', 'āh, ana muwāfʾa', 'آه، أنا موافق', 'āh, ana muwāfiʾ'),
    ),
    c('That is true', ['נכון', 'nakhon'], ['صحّ', 'ṣaḥḥ']),
    c('Exactly', ['בדיוק', 'bediyuk'], ['بالظبط', 'biẓ-ẓabṭ']),
    c('Me too', ['גם אני', 'gam ani'], ['وأنا كمان', 'w-ana kamān']),
    c('I think so too', ['גם לי נראה ככה', "gam li nir'e kakha"], ['وأنا بظنّ هيك', 'w-ana baẓunn hēk']),
  ]),
  lesson('You are right', [
    c(
      'You are right',
      toThem('את צודקת', 'at tsodeket', 'אתה צודק', 'ata tsodek'),
      toThem('معك حقّ', 'maʿik ḥaʾʾ', 'معك حقّ', 'maʿak ḥaʾʾ'),
      { ar: SAID.same },
    ),
    c(
      'I feel the same',
      sp('אני מרגישה אותו דבר', 'ani margisha oto davar', 'אני מרגיש אותו דבר', 'ani margish oto davar'),
      sp('حاسّة نفس الإشي', 'ḥāsse nafs il-ishi', 'حاسّ نفس الإشي', 'ḥāsis nafs il-ishi'),
    ),
    c('Right', ['נכון', 'nakhon'], ['تمام', 'tamām']),
  ]),
];

const DISAGREEING: SeedDeck[] = [
  lesson('Disagreeing gently', [
    c(
      'I do not agree',
      sp('אני לא מסכימה', 'ani lo maskima', 'אני לא מסכים', 'ani lo maskim'),
      sp('مش موافقة', 'mish muwāfʾa', 'مش موافق', 'mish muwāfiʾ'),
    ),
    c('I do not think so', ['לא נראה לי', "lo nir'e li"], ['ما بظنّ', 'ma baẓunn']),
    c(
      'I am not sure about that',
      sp('אני לא בטוחה בזה', 'ani lo betukha ba-ze', 'אני לא בטוח בזה', 'ani lo batuakh ba-ze'),
      sp('مش متأكّدة من هيك', 'mish mitʾakkde min hēk', 'مش متأكّد من هيك', 'mish mitʾakkid min hēk'),
    ),
  ]),
  lesson('Saying it another way', [
    c(
      'I see it differently',
      sp('אני רואה את זה אחרת', "ani ro'a et ze akheret", 'אני רואה את זה אחרת', "ani ro'e et ze akheret"),
      ['بشوفها غير شكل', 'bashūfha ghēr shikil'],
      { he: SAID.same },
    ),
    c(
      'I do not think that is right',
      ['לא נראה לי שזה נכון', "lo nir'e li she-ze nakhon"],
      ['ما بظنّ إنّه صحّ', 'ma baẓunn inno ṣaḥḥ'],
    ),
    c(
      'I understand you, but I do not agree',
      both4(
        ['אני מבינה אותך אבל אני לא מסכימה', 'ani mevina otkha aval ani lo maskima'],
        ['אני מבינה אותך אבל אני לא מסכימה', 'ani mevina otakh aval ani lo maskima'],
        ['אני מבין אותך אבל אני לא מסכים', 'ani mevin otakh aval ani lo maskim'],
        ['אני מבין אותך אבל אני לא מסכים', 'ani mevin otkha aval ani lo maskim'],
      ),
      both4(
        ['بفهم عليك، بس مش موافقة', 'bafham ʿalēk, bass mish muwāfʾa'],
        ['بفهم عليكي، بس مش موافقة', 'bafham ʿalēki, bass mish muwāfʾa'],
        ['بفهم عليكي، بس مش موافق', 'bafham ʿalēki, bass mish muwāfiʾ'],
        ['بفهم عليك، بس مش موافق', 'bafham ʿalēk, bass mish muwāfiʾ'],
      ),
      {
        he: 'Both people are in this sentence: the ending on "you" follows who is listening, the ending on "agree" follows who is speaking.',
      },
    ),
    c(
      'I think this one is better',
      ['נראה לי שזה יותר טוב', "nir'e li she-ze yoter tov"],
      ['بظنّ هاد أحسن', 'baẓunn hād aḥsan'],
    ),
  ]),
];

const YES_BUT: SeedDeck[] = [
  lesson('Half agreeing', [
    c('Maybe', ['אולי', 'ulai'], ['يمكن', 'yimkin']),
    c('Maybe, but…', ['אולי, אבל…', 'ulai, aval'], ['يمكن، بس…', 'yimkin, bass']),
    c('Yes, but…', ['כן, אבל…', 'ken, aval'], ['آه، بس…', 'āh, bass']),
    c('That is true, but…', ['נכון, אבל…', 'nakhon, aval'], ['صحّ، بس…', 'ṣaḥḥ, bass']),
    c('A little', ['קצת', 'ktsat'], ['شويّ', 'shwayy']),
  ]),
  lesson('Agreeing, then the catch', [
    c(
      'I agree, but it is expensive',
      sp('אני מסכימה אבל זה יקר', 'ani maskima aval ze yakar', 'אני מסכים אבל זה יקר', 'ani maskim aval ze yakar'),
      sp('أنا موافقة بس غالي', 'ana muwāfʾa bass ghāli', 'أنا موافق بس غالي', 'ana muwāfiʾ bass ghāli'),
    ),
    answer(
      DO_YOU_LIKE_IT,
      c('Yes, but it is too expensive', ['כן, אבל זה יקר מדי', 'ken, aval ze yakar midai'], ['آه، بس غالي كتير', 'āh, bass ghāli ktīr']),
    ),
    c('There is something in that', ['יש בזה משהו', 'yesh ba-ze mashehu'], ['فيها إشي', 'fīha ishi']),
    c('In some ways, yes', ['במובן מסוים, כן', 'be-muvan mesuyam, ken'], ['من ناحية، آه', 'min nāḥye, āh']),
  ]),
];

const HOW_SURE: SeedDeck[] = [
  lesson(
    'Maybe, probably, definitely',
    OPINION_STRENGTHS.map((step) => step.word),
  ),
  lesson('Maybe not', [
    c('Maybe not', ['אולי לא', 'ulai lo'], ['يمكن لأ', 'yimkin laʾ']),
    c('Probably not', ['כנראה שלא', "kanir'e she-lo"], ['على الأغلب لأ', 'ʿal-aghlab laʾ']),
    c(
      'I do not know',
      sp('אני לא יודעת', 'ani lo yodaat', 'אני לא יודע', 'ani lo yodea'),
      ['ما بعرف', 'ma baʿrif'],
      { ar: 'One wording for everybody — a verb, not an adjective.' },
    ),
  ]),
  lesson('I am not sure, but…', [
    c(
      'I am not sure',
      sp('אני לא בטוחה', 'ani lo betukha', 'אני לא בטוח', 'ani lo batuakh'),
      sp('مش متأكّدة', 'mish mitʾakkde', 'مش متأكّد', 'mish mitʾakkid'),
    ),
    c(
      'I am not sure, but I think it is good',
      sp(
        'אני לא בטוחה, אבל נראה לי שזה טוב',
        "ani lo betukha, aval nir'e li she-ze tov",
        'אני לא בטוח, אבל נראה לי שזה טוב',
        "ani lo batuakh, aval nir'e li she-ze tov",
      ),
      sp(
        'مش متأكّدة، بس بظنّ إنّه حلو',
        'mish mitʾakkde, bass baẓunn inno ḥilu',
        'مش متأكّد، بس بظنّ إنّه حلو',
        'mish mitʾakkid, bass baẓunn inno ḥilu',
      ),
    ),
    answer(
      ARE_YOU_SURE,
      c('No, I think maybe', ['לא, נראה לי שאולי', "lo, nir'e li she-ulai"], ['لأ، بظنّ يمكن', 'laʾ, baẓunn yimkin']),
    ),
  ]),
];

// --- advice, recommendations and judgements ----------------------------------

const YOU_SHOULD: SeedDeck[] = [
  lesson('You should, you should not', [
    c(
      'You should go',
      toThem('כדאי לך ללכת', 'kedai lakh lalekhet', 'כדאי לך ללכת', 'kedai lekha lalekhet'),
      toThem('لازم تروحي', 'lāzim trūḥi', 'لازم تروح', 'lāzim trūḥ'),
      { he: 'kedai is "it is worth", and it never changes — only "to you" does.' },
    ),
    c(
      'You should try it',
      toThem('כדאי לך לנסות', 'kedai lakh lenasot', 'כדאי לך לנסות', 'kedai lekha lenasot'),
      toThem('جرّبيه', 'jarrbī', 'جرّبه', 'jarrbo'),
    ),
    c(
      'You should wait',
      toThem('כדאי לך לחכות', 'kedai lakh lekhakot', 'כדאי לך לחכות', 'kedai lekha lekhakot'),
      toThem('لازم تستنّي', 'lāzim tistanni', 'لازم تستنّى', 'lāzim tistanna'),
    ),
    c(
      'You should not go',
      toThem('לא כדאי לך ללכת', 'lo kedai lakh lalekhet', 'לא כדאי לך ללכת', 'lo kedai lekha lalekhet'),
      toThem('ما لازم تروحي', 'ma lāzim trūḥi', 'ما لازم تروح', 'ma lāzim trūḥ'),
    ),
  ]),
  lesson('We should', [
    c('We should leave', ['כדאי לנו ללכת', 'kedai lanu lalekhet'], ['لازم نمشي', 'lāzim nimshi']),
    c(
      'We should not buy it',
      ['לא כדאי לנו לקנות את זה', 'lo kedai lanu liknot et ze'],
      ['ما لازم نشتريه', 'ma lāzim nishtrī'],
    ),
    c(
      'I think we should go tomorrow',
      ['נראה לי שכדאי לנו ללכת מחר', "nir'e li she-kedai lanu lalekhet makhar"],
      ['بظنّ لازم نروح بكرا', 'baẓunn lāzim nrūḥ bukra'],
    ),
    c(
      'I do not think we should go',
      ['לא נראה לי שכדאי לנו ללכת', "lo nir'e li she-kedai lanu lalekhet"],
      ['ما بظنّ لازم نروح', 'ma baẓunn lāzim nrūḥ'],
    ),
  ]),
];

const WORTH_IT: SeedDeck[] = [
  lesson('Worth it or not', [
    c('It is worth it', ['זה שווה את זה', 'ze shave et ze'], ['بستاهل', 'bistāhal']),
    c('It is not worth it', ['זה לא שווה את זה', 'ze lo shave et ze'], ['ما بستاهل', 'ma bistāhal']),
    answer(
      IS_IT_WORTH_IT,
      c('Yes, it is worth it', ['כן, זה שווה', 'ken, ze shave'], ['آه، بستاهل', 'āh, bistāhal']),
    ),
    answer(
      IS_IT_WORTH_IT,
      c(
        'No, it is not worth the money',
        ['לא, זה לא שווה את הכסף', 'lo, ze lo shave et ha-kesef'],
        ['لأ، ما بستاهل المصاري', 'laʾ, ma bistāhal il-maṣāri'],
      ),
    ),
  ]),
  lesson('I recommend it', [
    c(
      'I recommend it',
      sp('אני ממליצה על זה', 'ani mamlitsa al ze', 'אני ממליץ על זה', 'ani mamlits al ze'),
      toThem('بنصحك فيه', 'binṣaḥik fī', 'بنصحك فيه', 'binṣaḥak fī'),
      { ar: 'The Arabic carries who is being advised, the Hebrew who is advising.' },
    ),
    c(
      'I do not recommend it',
      sp('אני לא ממליצה על זה', 'ani lo mamlitsa al ze', 'אני לא ממליץ על זה', 'ani lo mamlits al ze'),
      toThem('ما بنصحك فيه', 'ma binṣaḥik fī', 'ما بنصحك فيه', 'ma binṣaḥak fī'),
    ),
    c(
      'I think you will like it',
      toThem('נראה לי שתאהבי את זה', "nir'e li she-tohavi et ze", 'נראה לי שתאהב את זה', "nir'e li she-tohav et ze"),
      toThem('بظنّ رح يعجبك', 'baẓunn raḥ yiʿjbik', 'بظنّ رح يعجبك', 'baẓunn raḥ yiʿjbak'),
      { ar: SAID.same },
    ),
  ]),
  lesson('Would you go again?', [
    c('I would go there', ['הייתי הולכת לשם', 'hayiti holekhet le-sham'], ['كنت بروح', 'kunt barūḥ']),
    c('I would not go there', ['לא הייתי הולכת לשם', 'lo hayiti holekhet le-sham'], ['ما كنت بروح', 'ma kunt barūḥ']),
    answer(
      WOULD_YOU_GO_AGAIN,
      c('Yes, I would go again', ['כן, הייתי חוזרת', 'ken, hayiti khozeret'], ['آه، كنت برجع', 'āh, kunt barjaʿ']),
    ),
    answer(
      WOULD_YOU_GO_AGAIN,
      c('No, once was enough', ['לא, פעם אחת הספיקה', 'lo, paam akhat hispika'], ['لأ، مرّة كفاية', 'laʾ, marra kifāye']),
    ),
  ]),
];

const GOOD_IDEA: SeedDeck[] = [
  lesson('Good idea, bad idea', [
    c('That is a good idea', ['זה רעיון טוב', "ze ra'ayon tov"], ['فكرة حلوة', 'fikra ḥilwe']),
    c('That is a bad idea', ['זה רעיון גרוע', "ze ra'ayon garua"], ['فكرة مش حلوة', 'fikra mish ḥilwe']),
    c(
      'I like that idea',
      sp('אני אוהבת את הרעיון', "ani ohevet et ha-ra'ayon", 'אני אוהב את הרעיון', "ani ohev et ha-ra'ayon"),
      ['عجبتني الفكرة', 'ʿajabatni il-fikra'],
    ),
    c(
      'I do not like that idea',
      sp('אני לא אוהבת את הרעיון', "ani lo ohevet et ha-ra'ayon", 'אני לא אוהב את הרעיון', "ani lo ohev et ha-ra'ayon"),
      ['ما عجبتني الفكرة', 'ma ʿajabatni il-fikra'],
    ),
  ]),
  lesson('Answering an idea', [
    answer(
      WHAT_DO_YOU_THINK,
      c(
        'I think we should do that',
        ['נראה לי שכדאי לנו לעשות את זה', "nir'e li she-kedai lanu laasot et ze"],
        ['بظنّ لازم نعمل هيك', 'baẓunn lāzim naʿmal hēk'],
      ),
    ),
    answer(
      WHAT_DO_YOU_THINK,
      c(
        'I do not think that is a good idea',
        ['לא נראה לי רעיון טוב', "lo nir'e li ra'ayon tov"],
        ['ما بظنّها فكرة حلوة', 'ma baẓunnha fikra ḥilwe'],
      ),
    ),
    answer(
      WHAT_DO_YOU_THINK,
      c(
        'Maybe. Let me think about it',
        ['אולי. תני לי לחשוב על זה', 'ulai. tni li lakhshov al ze'],
        ['يمكن. خلّيني أفكّر', 'yimkin. khallīni afakkir'],
      ),
    ),
  ]),
];

const EVERYDAY: SeedDeck[] = [
  lesson('Food', [
    c('It is really good', ['זה ממש טעים', 'ze mamash taim'], ['طيّب كتير', 'ṭayyib ktīr']),
    c('It is too sweet', ['זה מתוק מדי', 'ze matok midai'], ['محلّى كتير', 'mḥalla ktīr']),
    c('It is too spicy', ['זה חריף מדי', 'ze kharif midai'], ['حرّاق كتير', 'ḥarrāʾ ktīr']),
    c(
      'I prefer this one',
      sp('אני מעדיפה את זה', "ani ma'adifa et ze", 'אני מעדיף את זה', "ani ma'adif et ze"),
      ['بفضّل هاد', 'bfaḍḍil hād'],
    ),
  ]),
  lesson('Places', [
    c('It is beautiful', ['זה יפה', 'ze yafe'], ['حلو كتير', 'ḥilu ktīr']),
    c('It is too crowded', ['זה צפוף מדי', 'ze tsafuf midai'], ['زحمة كتير', 'zaḥme ktīr']),
    c('It is quiet', ['זה שקט', 'ze shaket'], ['هادي', 'hādi']),
    c('I would go again', ['הייתי חוזרת', 'hayiti khozeret'], ['كنت برجع', 'kunt barjaʿ']),
  ]),
  lesson('Work', [
    c('It is difficult', ['זה קשה', 'ze kashe'], ['صعب', 'ṣaʿb']),
    c('It is tiring', ['זה מעייף', "ze me'ayef"], ['متعب', 'mitʿib']),
    c(
      'I like my work',
      sp(
        'אני אוהבת את העבודה שלי',
        'ani ohevet et ha-avoda sheli',
        'אני אוהב את העבודה שלי',
        'ani ohev et ha-avoda sheli',
      ),
      ['بحبّ شغلي', 'baḥibb shughli'],
    ),
    c(
      'I do not like working at night',
      sp(
        'אני לא אוהבת לעבוד בלילה',
        'ani lo ohevet laavod ba-laila',
        'אני לא אוהב לעבוד בלילה',
        'ani lo ohev laavod ba-laila',
      ),
      ['ما بحبّ أشتغل بالليل', 'ma baḥibb ashtaghil bil-lēl'],
    ),
  ]),
  lesson('Learning a language', [
    c(
      'Hebrew is easier for me to read',
      ['עברית יותר קלה לי לקרוא', 'ivrit yoter kala li likro'],
      ['العبري أسهل عليّ أقرا', 'il-ʿibri ashal ʿalayy aʾra'],
    ),
    c(
      'Arabic is easier for me to hear',
      ['ערבית יותר קלה לי לשמוע', 'aravit yoter kala li lishmoa'],
      ['العربي أسهل عليّ أسمع', 'il-ʿarabi ashal ʿalayy asmaʿ'],
    ),
    c(
      'I think pronunciation is difficult',
      ['נראה לי שההגייה קשה', "nir'e li she-ha-hagaya kasha"],
      ['بظنّ اللفظ صعب', 'baẓunn il-lafẓ ṣaʿb'],
    ),
    c(
      'I prefer learning by listening',
      sp(
        'אני מעדיפה ללמוד באוזן',
        "ani ma'adifa lilmod ba-ozen",
        'אני מעדיף ללמוד באוזן',
        "ani ma'adif lilmod ba-ozen",
      ),
      ['بفضّل أتعلّم بالسمع', 'bfaḍḍil atʿallam bis-samʿ'],
    ),
  ]),
  lesson('Shopping and plans', [
    c('This one is too expensive', ['זה יקר מדי', 'ze yakar midai'], ['هاد غالي كتير', 'hād ghāli ktīr']),
    c(
      'I prefer the smaller one',
      sp('אני מעדיפה את הקטן', "ani ma'adifa et ha-katan", 'אני מעדיף את הקטן', "ani ma'adif et ha-katan"),
      ['بفضّل الأصغر', 'bfaḍḍil il-azghar'],
    ),
    c(
      'I do not think I need it',
      ['לא נראה לי שאני צריכה את זה', "lo nir'e li she-ani tsrikha et ze"],
      ['ما بظنّ إنّي لازمني', 'ma baẓunn inni lāzimni'],
    ),
    c(
      'I do not think tonight is a good idea',
      ['לא נראה לי שהערב זה רעיון טוב', "lo nir'e li she-ha-erev ze ra'ayon tov"],
      ['ما بظنّ الليلة فكرة حلوة', 'ma baẓunn il-lēle fikra ḥilwe'],
    ),
  ]),
];

// --- building one whole opinion out of three answers -------------------------

/** One answer she may pick, and the shape it takes inside the whole opinion. */
export type BuildAnswer = {
  /** The answer on its own, as she would say it to that question. */
  said: SeedCard;
  /** The same answer as a clause of the finished opinion. */
  joined: SeedCard;
};

export type BuildQuestion = { ask: SeedCard; answers: BuildAnswer[] };

export type OpinionBuild = {
  id: string;
  name: string;
  /** What the whole exercise is about, in a line. */
  prompt: string;
  questions: BuildQuestion[];
};

/**
 * Three small questions about one thing, answered separately, then read back as
 * one opinion.
 *
 * This is the spec's scaffolded "build an opinion" — do you like it, why, and
 * is there anything you don't — and the scaffold is the point: the third
 * question is what turns "I like it" into an opinion somebody would believe.
 * Every option is honest and none is right; the joined clauses carry the
 * connectors the run needs, so a different pick produces a genuinely different
 * whole.
 */
export const OPINION_BUILDS: OpinionBuild[] = [
  {
    id: 'cafe',
    name: 'This café',
    prompt: 'Do you like it, why, and what would you change — then all three at once.',
    questions: [
      {
        ask: DO_YOU_LIKE_IT,
        answers: [
          {
            said: c('Yes', ['כן', 'ken'], ['آه', 'āh']),
            joined: c(
              'I like this café',
              sp(
                'אני אוהבת את בית הקפה הזה',
                'ani ohevet et beit ha-kafe ha-ze',
                'אני אוהב את בית הקפה הזה',
                'ani ohev et beit ha-kafe ha-ze',
              ),
              ['بحبّ هالكافيه', 'baḥibb hal-kafēh'],
            ),
          },
          {
            said: c('Not really', ['לא ממש', 'lo mamash'], ['مش كتير', 'mish ktīr']),
            joined: c(
              'I do not really like this café',
              sp(
                'אני לא ממש אוהבת את בית הקפה הזה',
                'ani lo mamash ohevet et beit ha-kafe ha-ze',
                'אני לא ממש אוהב את בית הקפה הזה',
                'ani lo mamash ohev et beit ha-kafe ha-ze',
              ),
              ['ما بحبّ هالكافيه كتير', 'ma baḥibb hal-kafēh ktīr'],
            ),
          },
          {
            said: c('It is fine', ['זה בסדר', 'ze beseder'], ['ماشي الحال', 'māshi il-ḥāl']),
            joined: c(
              'This café is fine',
              ['בית הקפה הזה בסדר', 'beit ha-kafe ha-ze beseder'],
              ['هالكافيه ماشي الحال', 'hal-kafēh māshi il-ḥāl'],
            ),
          },
        ],
      },
      {
        ask: WHY,
        answers: [
          {
            said: c('The coffee is good', ['הקפה טוב', 'ha-kafe tov'], ['القهوة طيّبة', 'il-ʾahwe ṭayybe']),
            joined: c('because the coffee is good', ['כי הקפה טוב', 'ki ha-kafe tov'], ['لأنّ القهوة طيّبة', 'laʾinn il-ʾahwe ṭayybe']),
          },
          {
            said: c('It is quiet', ['זה שקט', 'ze shaket'], ['هادي', 'hādi']),
            joined: c('because it is quiet', ['כי זה שקט', 'ki ze shaket'], ['لأنّه هادي', 'laʾinno hādi']),
          },
          {
            said: c('It is close to my house', ['זה קרוב לבית שלי', 'ze karov la-bayit sheli'], ['قريب من بيتي', 'ʾarīb min bēti']),
            joined: c('because it is close to my house', ['כי זה קרוב לבית שלי', 'ki ze karov la-bayit sheli'], ['لأنّه قريب من بيتي', 'laʾinno ʾarīb min bēti']),
          },
        ],
      },
      {
        ask: c(
          'Is there anything you do not like?',
          askedOfHer(
            'יש משהו שאת לא אוהבת?',
            'yesh mashehu she-at lo ohevet',
            'יש משהו שאתה לא אוהב?',
            'yesh mashehu she-ata lo ohev',
          ),
          askedOfHer('في إشي ما بيعجبك؟', 'fī ishi ma biʿjibik', 'في إشي ما بيعجبك؟', 'fī ishi ma biʿjbak'),
          { ar: SAID.same },
        ),
        answers: [
          {
            said: c('It is expensive', ['זה יקר', 'ze yakar'], ['غالي', 'ghāli']),
            joined: c('but I think it is expensive', ['אבל נראה לי שזה יקר', "aval nir'e li she-ze yakar"], ['بس بظنّ إنّه غالي', 'bass baẓunn inno ghāli']),
          },
          {
            said: c('It is too crowded', ['זה צפוף מדי', 'ze tsafuf midai'], ['زحمة كتير', 'zaḥme ktīr']),
            joined: c('but it is too crowded', ['אבל זה צפוף מדי', 'aval ze tsafuf midai'], ['بس زحمة كتير', 'bass zaḥme ktīr']),
          },
          {
            said: c('No, nothing', ['לא, שום דבר', 'lo, shum davar'], ['لأ، ولا إشي', 'laʾ, wala ishi']),
            joined: c(
              'and there is nothing I would change',
              ['ואין שום דבר שהייתי משנה', 've-ein shum davar she-hayiti meshana'],
              ['وما في إشي بغيّره', 'w-ma fī ishi bghayyro'],
            ),
          },
        ],
      },
    ],
  },
  {
    id: 'city',
    name: 'Living in a city',
    prompt: 'Both sides of it — the good, the reason, and the catch.',
    questions: [
      {
        ask: c(
          'Do you like living in a city?',
          askedOfHer(
            'את אוהבת לגור בעיר?',
            'at ohevet lagur ba-ir',
            'אתה אוהב לגור בעיר?',
            'ata ohev lagur ba-ir',
          ),
          askedOfHer(
            'بتحبّي تسكني بالمدينة؟',
            'bitḥibbi tuskni bil-madīne',
            'بتحبّ تسكن بالمدينة؟',
            'bitḥibb tuskun bil-madīne',
          ),
        ),
        answers: [
          {
            said: c('Yes, a lot', ['כן, מאוד', 'ken, meod'], ['آه، كتير', 'āh, ktīr']),
            joined: c(
              'I like living in a city',
              sp('אני אוהבת לגור בעיר', 'ani ohevet lagur ba-ir', 'אני אוהב לגור בעיר', 'ani ohev lagur ba-ir'),
              ['بحبّ أسكن بالمدينة', 'baḥibb askun bil-madīne'],
            ),
          },
          {
            said: c(
              'I prefer a village',
              sp('אני מעדיפה כפר', "ani ma'adifa kfar", 'אני מעדיף כפר', "ani ma'adif kfar"),
              ['بفضّل الضيعة', 'bfaḍḍil iḍ-ḍēʿa'],
            ),
            joined: c(
              'I prefer living in a village',
              sp('אני מעדיפה לגור בכפר', "ani ma'adifa lagur bi-khfar", 'אני מעדיף לגור בכפר', "ani ma'adif lagur bi-khfar"),
              ['بفضّل أسكن بالضيعة', 'bfaḍḍil askun biḍ-ḍēʿa'],
            ),
          },
        ],
      },
      {
        ask: WHY,
        answers: [
          {
            said: c('There is a lot to do', ['יש הרבה מה לעשות', 'yesh harbe ma laasot'], ['في كتير إشي تعمله', 'fī ktīr ishi tiʿmalo']),
            joined: c('because there is a lot to do', ['כי יש הרבה מה לעשות', 'ki yesh harbe ma laasot'], ['لأنّ في كتير إشي تعمله', 'laʾinn fī ktīr ishi tiʿmalo']),
          },
          {
            said: c('It is quieter', ['זה יותר שקט', 'ze yoter shaket'], ['أهدى', 'ahda']),
            joined: c('because it is quieter', ['כי זה יותר שקט', 'ki ze yoter shaket'], ['لأنّه أهدى', 'laʾinno ahda']),
          },
          {
            said: c('Everything is close', ['הכל קרוב', 'ha-kol karov'], ['كلّ إشي قريب', 'kull ishi ʾarīb']),
            joined: c('because everything is close', ['כי הכל קרוב', 'ki ha-kol karov'], ['لأنّ كلّ إشي قريب', 'laʾinn kull ishi ʾarīb']),
          },
        ],
      },
      {
        ask: c(
          'And the other side of it?',
          ['ומה הצד השני?', 'u-ma ha-tsad ha-sheni'],
          ['وشو الجهة التانية؟', 'w-shu il-jiha it-tānye'],
        ),
        answers: [
          {
            said: c('It is noisy', ['יש הרבה רעש', 'yesh harbe raash'], ['في دوشة', 'fī dōshe']),
            joined: c('but it is noisy', ['אבל יש הרבה רעש', 'aval yesh harbe raash'], ['بس في دوشة', 'bass fī dōshe']),
          },
          {
            said: c('It is expensive', ['זה יקר', 'ze yakar'], ['غالي', 'ghāli']),
            joined: c('but it is expensive', ['אבל זה יקר', 'aval ze yakar'], ['بس غالي', 'bass ghāli']),
          },
          {
            said: c('It is far from everything', ['זה רחוק מהכל', 'ze rakhok me-ha-kol'], ['بعيد عن كلّ إشي', 'baʿīd ʿan kull ishi']),
            joined: c('but it is far from everything', ['אבל זה רחוק מהכל', 'aval ze rakhok me-ha-kol'], ['بس بعيد عن كلّ إشي', 'bass baʿīd ʿan kull ishi']),
          },
        ],
      },
    ],
  },
  {
    id: 'learning',
    name: 'Learning two languages at once',
    prompt: 'Your own opinion about the thing you are doing right now.',
    questions: [
      {
        ask: c(
          'Is it a good idea to learn two languages at once?',
          ['זה רעיון טוב ללמוד שתי שפות ביחד?', "ze ra'ayon tov lilmod shtei safot be-yakhad"],
          ['فكرة حلوة تتعلّم لغتين مع بعض؟', 'fikra ḥilwe titʿallam lughtēn maʿ baʿḍ'],
        ),
        answers: [
          {
            said: c('Yes, I think so', ['נראה לי שכן', "nir'e li she-ken"], ['بظنّ هيك', 'baẓunn hēk']),
            joined: c('I think it is a good idea', ['נראה לי שזה רעיון טוב', "nir'e li she-ze ra'ayon tov"], ['بظنّها فكرة حلوة', 'baẓunnha fikra ḥilwe']),
          },
          {
            said: c('No, I do not think so', ['לא נראה לי', "lo nir'e li"], ['ما بظنّ', 'ma baẓunn']),
            joined: c('I do not think it is a good idea', ['לא נראה לי שזה רעיון טוב', "lo nir'e li she-ze ra'ayon tov"], ['ما بظنّها فكرة حلوة', 'ma baẓunnha fikra ḥilwe']),
          },
          {
            said: c(
              'I am not sure',
              sp('אני לא בטוחה', 'ani lo betukha', 'אני לא בטוח', 'ani lo batuakh'),
              sp('مش متأكّدة', 'mish mitʾakkde', 'مش متأكّد', 'mish mitʾakkid'),
            ),
            joined: c(
              'I am not sure it is a good idea',
              sp(
                'אני לא בטוחה שזה רעיון טוב',
                "ani lo betukha she-ze ra'ayon tov",
                'אני לא בטוח שזה רעיון טוב',
                "ani lo batuakh she-ze ra'ayon tov",
              ),
              sp(
                'مش متأكّدة إنّها فكرة حلوة',
                'mish mitʾakkde innha fikra ḥilwe',
                'مش متأكّد إنّها فكرة حلوة',
                'mish mitʾakkid innha fikra ḥilwe',
              ),
            ),
          },
        ],
      },
      {
        ask: WHY,
        answers: [
          {
            said: c('The words help each other', ['המילים עוזרות אחת לשנייה', 'ha-milim ozrot akhat la-shniya'], ['الكلمات بتساعد بعضها', 'il-kalimāt bitsāʿid baʿḍha']),
            joined: c('because the words help each other', ['כי המילים עוזרות אחת לשנייה', 'ki ha-milim ozrot akhat la-shniya'], ['لأنّ الكلمات بتساعد بعضها', 'laʾinn il-kalimāt bitsāʿid baʿḍha']),
          },
          {
            said: c('It is confusing', ['זה מבלבל', 'ze mevalbel'], ['بيلخبط', 'bilakhbiṭ']),
            joined: c('because it is confusing', ['כי זה מבלבל', 'ki ze mevalbel'], ['لأنّه بيلخبط', 'laʾinno bilakhbiṭ']),
          },
          {
            said: c('There is not enough time', ['אין מספיק זמן', 'ein maspik zman'], ['ما في وقت كفاية', 'ma fī waʾt kifāye']),
            joined: c('because there is not enough time', ['כי אין מספיק זמן', 'ki ein maspik zman'], ['لأنّه ما في وقت كفاية', 'laʾinno ma fī waʾt kifāye']),
          },
        ],
      },
      {
        ask: c(
          'What would you say to somebody starting?',
          askedOfHer(
            'מה היית אומרת למישהו שמתחיל?',
            'ma hayit omeret le-mishehu she-matkhil',
            'מה היית אומר למישהו שמתחיל?',
            'ma hayita omer le-mishehu she-matkhil',
          ),
          askedOfHer(
            'شو بتقولي لحدا لسّا مبتدي؟',
            'shu bitʾūli la-ḥada lissa mubtadi',
            'شو بتقول لحدا لسّا مبتدي؟',
            'shu bitʾūl la-ḥada lissa mubtadi',
          ),
        ),
        answers: [
          {
            said: c(
              'Try it',
              toThem('תנסי', 'tenasi', 'תנסה', 'tenase'),
              toThem('جرّبي', 'jarrbi', 'جرّب', 'jarrib'),
            ),
            joined: c(
              'so I would say try it',
              toThem('אז הייתי אומרת לך לנסות', 'az hayiti omeret lakh lenasot', 'אז הייתי אומרת לך לנסות', 'az hayiti omeret lekha lenasot'),
              toThem('فبقولّك جرّبي', 'fa-baʾullik jarrbi', 'فبقولّك جرّب', 'fa-baʾullak jarrib'),
            ),
          },
          {
            said: c(
              'Start with one',
              toThem('תתחילי עם אחת', 'tatkhili im akhat', 'תתחיל עם אחת', 'tatkhil im akhat'),
              toThem('ابدي بوحدة', 'ibdi bi-waḥde', 'ابدأ بوحدة', 'ibdaʾ bi-waḥde'),
            ),
            joined: c(
              'so I would say start with one',
              toThem(
                'אז הייתי אומרת לך להתחיל עם אחת',
                'az hayiti omeret lakh lehatkhil im akhat',
                'אז הייתי אומרת לך להתחיל עם אחת',
                'az hayiti omeret lekha lehatkhil im akhat',
              ),
              toThem('فبقولّك ابدي بوحدة', 'fa-baʾullik ibdi bi-waḥde', 'فبقولّك ابدأ بوحدة', 'fa-baʾullak ibdaʾ bi-waḥde'),
            ),
          },
        ],
      },
    ],
  },
];

// --- taking a position on something ------------------------------------------

/** One position she may take, and the reasons that honestly support it. */
export type StandPosition = {
  /** Where she lands: agreeing, disagreeing, or somewhere in between. */
  said: SeedCard;
  /** Reasons for *this* position. Any of them; none of them is the answer. */
  reasons: SeedCard[];
};

export type OpinionStand = {
  id: string;
  name: string;
  /**
   * `statement` — somebody asserts something and she answers it.
   * `choice`    — two things are offered and she picks and justifies.
   *
   * The same machinery either way: a prompt, a position, a reason. Kept apart
   * only so the screen can frame it honestly, because "do you agree?" and
   * "which would you choose?" are not the same question.
   */
  kind: 'statement' | 'choice';
  /** What the app says or asks. */
  prompt: SeedCard;
  positions: StandPosition[];
};

/**
 * Statements to answer and choices to justify.
 *
 * The spec's "agree or disagree", "explain your choice" and "compare two
 * things" are one exercise wearing three hats — a prompt, a position, a reason
 * — so they are one structure here rather than three screens doing the same
 * work. Where they genuinely differ is only in how the prompt reads, which is
 * what `kind` carries.
 *
 * **Nothing here has a right answer, and the screen says so.** Every position
 * carries its own reasons, written to be as good as every other position's. A
 * learner who says tea is better has not made a mistake; she has taken a
 * position, which is the entire skill.
 */
export const OPINION_STANDS: OpinionStand[] = [
  {
    id: 'coffee-tea',
    name: 'Coffee or tea?',
    kind: 'choice',
    prompt: c(
      'Which is better, coffee or tea?',
      ['מה יותר טוב, קפה או תה?', 'ma yoter tov, kafe o te'],
      ['أنهي أحسن، قهوة ولّا شاي؟', 'anhu aḥsan, ʾahwe walla shāy'],
    ),
    positions: [
      {
        said: c('Coffee is better', ['קפה יותר טוב', 'kafe yoter tov'], ['القهوة أحسن', 'il-ʾahwe aḥsan']),
        reasons: [
          c('because it wakes me up', ['כי זה מעיר אותי', 'ki ze meir oti'], ['لأنّها بتفيّقني', 'laʾinnha bitfayyiʾni']),
          c(
            'because I do not like tea',
            sp('כי אני לא אוהבת תה', 'ki ani lo ohevet te', 'כי אני לא אוהב תה', 'ki ani lo ohev te'),
            ['لأنّي ما بحبّ الشاي', 'laʾinni ma baḥibb ish-shāy'],
          ),
        ],
      },
      {
        said: c('Tea is better', ['תה יותר טוב', 'te yoter tov'], ['الشاي أحسن', 'ish-shāy aḥsan']),
        reasons: [
          c('because it is lighter', ['כי זה יותר קל', 'ki ze yoter kal'], ['لأنّه أخفّ', 'laʾinno akhaff']),
          c('because I drink it all day', ['כי אני שותה את זה כל היום', 'ki ani shota et ze kol ha-yom'], ['لأنّي بشربه طول اليوم', 'laʾinni bashrabo ṭūl il-yōm']),
        ],
      },
      {
        said: c(
          'I like both',
          sp('אני אוהבת את שניהם', 'ani ohevet et shneihem', 'אני אוהב את שניהם', 'ani ohev et shneihem'),
          ['بحبّ التنين', 'baḥibb it-tnēn'],
        ),
        reasons: [
          c('because each one has its time', ['כי לכל אחד יש את הזמן שלו', 'ki le-khol ekhad yesh et ha-zman shelo'], ['لأنّ كلّ واحد إله وقته', 'laʾinn kull wāḥad ilo waʾto']),
          c(
            'but I prefer coffee in the morning',
            sp(
              'אבל אני מעדיפה קפה בבוקר',
              "aval ani ma'adifa kafe ba-boker",
              'אבל אני מעדיף קפה בבוקר',
              "aval ani ma'adif kafe ba-boker",
            ),
            ['بس بفضّل القهوة الصبح', 'bass bfaḍḍil il-ʾahwe iṣ-ṣubḥ'],
          ),
        ],
      },
    ],
  },
  {
    id: 'expensive-cafe',
    name: 'This café is too expensive',
    kind: 'statement',
    prompt: c(
      'I think this café is too expensive',
      ['נראה לי שבית הקפה הזה יקר מדי', "nir'e li she-beit ha-kafe ha-ze yakar midai"],
      ['بظنّ هالكافيه غالي كتير', 'baẓunn hal-kafēh ghāli ktīr'],
    ),
    positions: [
      {
        said: c(
          'I agree',
          sp('אני מסכימה', 'ani maskima', 'אני מסכים', 'ani maskim'),
          sp('أنا موافقة', 'ana muwāfʾa', 'أنا موافق', 'ana muwāfiʾ'),
        ),
        reasons: [
          c('because it is expensive for a coffee', ['כי זה יקר בשביל קפה', 'ki ze yakar bishvil kafe'], ['لأنّه غالي على فنجان قهوة', 'laʾinno ghāli ʿala finjān ʾahwe']),
          c('because there are cheaper places', ['כי יש מקומות יותר זולים', 'ki yesh mekomot yoter zolim'], ['لأنّ في محلّات أرخص', 'laʾinn fī maḥallāt arkhaṣ']),
        ],
      },
      {
        said: c(
          'I do not agree',
          sp('אני לא מסכימה', 'ani lo maskima', 'אני לא מסכים', 'ani lo maskim'),
          sp('مش موافقة', 'mish muwāfʾa', 'مش موافق', 'mish muwāfiʾ'),
        ),
        reasons: [
          c('because the food is good and there is a lot of it', ['כי האוכל טוב ויש הרבה', 'ki ha-okhel tov ve-yesh harbe'], ['لأنّ الأكل طيّب وكتير', 'laʾinn il-akl ṭayyib w-ktīr']),
          c('because the place is quiet, and that is worth something', ['כי המקום שקט, וזה שווה משהו', 'ki ha-makom shaket, ve-ze shave mashehu'], ['لأنّ المحلّ هادي، وهاد بستاهل', 'laʾinn il-maḥall hādi, w-hād bistāhal']),
        ],
      },
      {
        said: c('Maybe, but…', ['אולי, אבל…', 'ulai, aval'], ['يمكن، بس…', 'yimkin, bass']),
        reasons: [
          c('but I still go there', ['אבל אני עדיין הולכת לשם', 'aval ani adain holekhet le-sham'], ['بس لسّاتني بروح', 'bass lissātni barūḥ']),
          c('but only the coffee is expensive', ['אבל רק הקפה יקר', 'aval rak ha-kafe yakar'], ['بس القهوة بس هي الغالية', 'bass il-ʾahwe bass hiyye il-ghālye']),
        ],
      },
    ],
  },
  {
    id: 'morning-study',
    name: 'Mornings are better for studying',
    kind: 'statement',
    prompt: c(
      'I think mornings are better for studying',
      ['נראה לי שהבוקר יותר טוב ללמוד', "nir'e li she-ha-boker yoter tov lilmod"],
      ['بظنّ الصبح أحسن للدراسة', 'baẓunn iṣ-ṣubḥ aḥsan lid-drāse'],
    ),
    positions: [
      {
        said: c('That is true', ['נכון', 'nakhon'], ['صحّ', 'ṣaḥḥ']),
        reasons: [
          c('because the head is clearer in the morning', ['כי הראש יותר צלול בבוקר', 'ki ha-rosh yoter tsalul ba-boker'], ['لأنّ الراس أصفى الصبح', 'laʾinn ir-rās aṣfa iṣ-ṣubḥ']),
          c('because nobody bothers you then', ['כי אף אחד לא מפריע אז', 'ki af ekhad lo mafria az'], ['لأنّ ما حدا بيزعجك وقتها', 'laʾinn ma ḥada bizʿijak waʾtha']),
        ],
      },
      {
        said: c(
          'I see it differently',
          sp('אני רואה את זה אחרת', "ani ro'a et ze akheret", 'אני רואה את זה אחרת', "ani ro'e et ze akheret"),
          ['بشوفها غير شكل', 'bashūfha ghēr shikil'],
        ),
        reasons: [
          c(
            'because I am tired in the morning',
            sp('כי אני עייפה בבוקר', 'ki ani ayefa ba-boker', 'כי אני עייף בבוקר', 'ki ani ayef ba-boker'),
            sp('لأنّي تعبانة الصبح', 'laʾinni taʿbāne iṣ-ṣubḥ', 'لأنّي تعبان الصبح', 'laʾinni taʿbān iṣ-ṣubḥ'),
          ),
          c('because I have more time at night', ['כי יש לי יותר זמן בלילה', 'ki yesh li yoter zman ba-laila'], ['لأنّ عندي وقت أكتر بالليل', 'laʾinn ʿindi waʾt aktar bil-lēl']),
        ],
      },
      {
        said: c('It depends on the day', ['תלוי ביום', 'talui ba-yom'], ['حسب اليوم', 'ḥasab il-yōm']),
        reasons: [
          c('because I work some mornings', ['כי אני עובדת בחלק מהבקרים', 'ki ani ovedet be-khelek me-ha-bkarim'], ['لأنّي بشتغل بعض الصبحيّات', 'laʾinni bashtaghil baʿḍ iṣ-ṣubḥiyyāt']),
          c(
            'but I agree it is easier when it is quiet',
            sp(
              'אבל אני מסכימה שיותר קל כשיש שקט',
              'aval ani maskima she-yoter kal kshe-yesh sheket',
              'אבל אני מסכים שיותר קל כשיש שקט',
              'aval ani maskim she-yoter kal kshe-yesh sheket',
            ),
            sp(
              'بس موافقة إنّه أسهل لمّا يكون هادي',
              'bass muwāfʾa inno ashal lamma ykūn hādi',
              'بس موافق إنّه أسهل لمّا يكون هادي',
              'bass muwāfiʾ inno ashal lamma ykūn hādi',
            ),
          ),
        ],
      },
    ],
  },
  {
    id: 'beach-or-home',
    name: 'The beach or home?',
    kind: 'choice',
    prompt: c(
      'You can go to the beach or stay home. Which do you choose?',
      askedOfHer(
        'אפשר ללכת לים או להישאר בבית. מה את בוחרת?',
        "efshar lalekhet la-yam o lehisha'er ba-bayit. ma at bokheret",
        'אפשר ללכת לים או להישאר בבית. מה אתה בוחר?',
        "efshar lalekhet la-yam o lehisha'er ba-bayit. ma ata bokher",
      ),
      askedOfHer(
        'فيكي تروحي عالبحر ولّا تضلّي بالبيت. شو بتختاري؟',
        'fīki trūḥi ʿal-baḥar walla tḍalli bil-bēt. shu bitikhtāri',
        'فيك تروح عالبحر ولّا تضلّ بالبيت. شو بتختار؟',
        'fīk trūḥ ʿal-baḥar walla tḍall bil-bēt. shu bitikhtār',
      ),
    ),
    positions: [
      {
        said: c('I want to go to the beach', ['אני רוצה ללכת לים', 'ani rotsa lalekhet la-yam'], ['بدّي أروح عالبحر', 'biddi arūḥ ʿal-baḥar']),
        reasons: [
          c('because the weather is good', ['כי מזג האוויר טוב', 'ki mezeg ha-avir tov'], ['لأنّ الجوّ حلو', 'laʾinn ij-jaww ḥilu']),
          c('because I have not been in a long time', ['כי מזמן לא הייתי', 'ki mi-zman lo hayiti'], ['لأنّي من زمان ما رحت', 'laʾinni min zamān ma ruḥt']),
        ],
      },
      {
        said: c(
          'I would rather stay home',
          sp(
            'אני מעדיפה להישאר בבית',
            "ani ma'adifa lehisha'er ba-bayit",
            'אני מעדיף להישאר בבית',
            "ani ma'adif lehisha'er ba-bayit",
          ),
          ['بفضّل أضلّ بالبيت', 'bfaḍḍil aḍall bil-bēt'],
        ),
        reasons: [
          c(
            'because I am tired',
            sp('כי אני עייפה', 'ki ani ayefa', 'כי אני עייף', 'ki ani ayef'),
            sp('لأنّي تعبانة', 'laʾinni taʿbāne', 'لأنّي تعبان', 'laʾinni taʿbān'),
          ),
          c('because it is too crowded there today', ['כי היום צפוף מדי שם', 'ki ha-yom tsafuf midai sham'], ['لأنّه اليوم زحمة كتير هناك', 'laʾinno il-yōm zaḥme ktīr hnāk']),
        ],
      },
    ],
  },
  {
    id: 'today-tomorrow',
    name: 'Today or tomorrow?',
    kind: 'choice',
    prompt: c(
      'Would you rather go today or tomorrow?',
      askedOfHer(
        'את מעדיפה ללכת היום או מחר?',
        "at ma'adifa lalekhet ha-yom o makhar",
        'אתה מעדיף ללכת היום או מחר?',
        "ata ma'adif lalekhet ha-yom o makhar",
      ),
      askedOfHer(
        'بتفضّلي تروحي اليوم ولّا بكرا؟',
        'bitfaḍḍli trūḥi il-yōm walla bukra',
        'بتفضّل تروح اليوم ولّا بكرا؟',
        'bitfaḍḍil trūḥ il-yōm walla bukra',
      ),
    ),
    positions: [
      {
        said: c('Today', ['היום', 'ha-yom'], ['اليوم', 'il-yōm']),
        reasons: [
          c(
            'because I am free today',
            sp('כי אני פנויה היום', 'ki ani pnuya ha-yom', 'כי אני פנוי היום', 'ki ani panui ha-yom'),
            sp('لأنّي فاضية اليوم', 'laʾinni fāḍye il-yōm', 'لأنّي فاضي اليوم', 'laʾinni fāḍi il-yōm'),
          ),
          c('because I do not want to wait', ['כי אני לא רוצה לחכות', 'ki ani lo rotsa lekhakot'], ['لأنّي ما بدّي أستنّى', 'laʾinni ma biddi astanna']),
        ],
      },
      {
        said: c('Tomorrow', ['מחר', 'makhar'], ['بكرا', 'bukra']),
        reasons: [
          c(
            'because I am busy today',
            sp('כי אני עסוקה היום', 'ki ani asuka ha-yom', 'כי אני עסוק היום', 'ki ani asuk ha-yom'),
            sp('لأنّي مشغولة اليوم', 'laʾinni mashghūle il-yōm', 'لأنّي مشغول اليوم', 'laʾinni mashghūl il-yōm'),
          ),
          c('because tomorrow is quieter', ['כי מחר יותר שקט', 'ki makhar yoter shaket'], ['لأنّ بكرا أهدى', 'laʾinn bukra ahda']),
        ],
      },
    ],
  },
];

/**
 * Everything the level shows her that is not installed as a card.
 *
 * The strength examples, the build fragments and the stand prompts are read and
 * heard exactly as a card is — same romanisation, same hover — so their words
 * have to mean something too. `utils/glossary` sweeps this alongside the
 * installed categories, which is the whole reason it is exported.
 */
export const OPINIONS_LOOSE_LINES: SeedCard[] = [
  STRENGTH_QUESTION,
  ...OPINION_STRENGTHS.map((step) => step.example),
  ...OPINION_BUILDS.flatMap((build) =>
    build.questions.flatMap((question) => [
      question.ask,
      ...question.answers.flatMap((option) => [option.said, option.joined]),
    ]),
  ),
  ...OPINION_STANDS.flatMap((stand) => [
    stand.prompt,
    ...stand.positions.flatMap((position) => [position.said, ...position.reasons]),
  ]),
];

// --- the sections ------------------------------------------------------------

/**
 * The lessons as they are authored: plain both-language decks, in the order the
 * level means them to be met.
 *
 * Five strands, each contiguous. Saying what you think comes first because
 * nothing else here works without a frame to put an opinion in; then the reason
 * that turns it into an argument; then choosing between two things; then
 * answering somebody else's view; then the judgements — advice, recommendation,
 * whether an idea is any good — which are opinions pointed at what to do next.
 */
const AUTHORED_SECTIONS: SeedCategory[] = [
  { name: 'It seems to me', icon: '🤔', decks: IT_SEEMS_TO_ME },
  { name: 'I do not think', icon: '🙅', decks: I_DONT_THINK },
  { name: 'I like it, I do not like it', icon: '❤️', decks: LIKING },
  { name: 'Whose opinion it is', icon: '🗣️', decks: WHOSE_OPINION },
  { name: 'Because', icon: '🎯', decks: BECAUSE },
  { name: 'Why?', icon: '❓', decks: WHY_SECTION },
  { name: 'Growing an opinion', icon: '🌱', decks: GROWING },
  { name: 'I prefer', icon: '⚖️', decks: I_PREFER },
  { name: 'Which one?', icon: '🔀', decks: WHICH_ONE },
  { name: 'Better and worse', icon: '📈', decks: BETTER_AND_WORSE },
  { name: 'The same and different', icon: '🟰', decks: SAME_AND_DIFFERENT },
  { name: 'I agree', icon: '👍', decks: AGREEING },
  { name: 'I do not agree', icon: '👎', decks: DISAGREEING },
  { name: 'Yes, but…', icon: '🤏', decks: YES_BUT },
  { name: 'How sure are you', icon: '🎲', decks: HOW_SURE },
  { name: 'You should', icon: '💡', decks: YOU_SHOULD },
  { name: 'Is it worth it?', icon: '🏷️', decks: WORTH_IT },
  { name: 'A good idea', icon: '✅', decks: GOOD_IDEA },
  { name: 'Everyday opinions', icon: '🏘️', decks: EVERYDAY },
];

/**
 * Every line the level teaches, each English once.
 *
 * Deduplicated for the reason the levels below dedupe: a line is met once
 * inside its own lesson and again as an answer to a question, which inside
 * those lessons are genuinely different cards. In a pool drawn from at random
 * they would be one card dealt twice, and a repeated English would put the
 * official-word count for ever out of a device's reach — so the starter top-up,
 * which repairs only while something is missing, would run on every launch.
 */
const EVERY_LINE = (() => {
  const seen = new Set<string>();
  const pool: SeedCard[] = [];
  for (const section of AUTHORED_SECTIONS) {
    for (const deck of section.decks) {
      for (const card of deck.cards) {
        const key = card.english.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(card);
      }
    }
  }
  return pool;
})();

/**
 * The capstone: ten lines at a time out of everything above, in both languages.
 *
 * Dealt exactly as the final tests before it are, and for the same reason — one
 * flawless pass over two hundred cards is not something a person finishes.
 * `masteryOnly`, because every line has already been met inside its lesson.
 */
const FINAL_TEST_GROUP: SeedCategory = {
  name: 'Opinions and reasons: final test',
  icon: '🏁',
  decks: [
    {
      name: 'Ten lines at a time',
      cards: EVERY_LINE,
      studyLanguages: ['hebrew', 'arabic'],
      masteryOnly: true,
      roundSize: FINAL_TEST_BATCH,
      perfectRunsRequired: FINAL_TEST_RUNS,
    },
  ],
};

/**
 * Opinions & Reasons as it installs: every lesson a language ladder.
 *
 * Staged like the rest of the course — Hebrew, then Palestinian Arabic, then
 * the two together over the same lines. The final test passes through unstaged:
 * it is the capstone over both, not another rung to climb.
 */
export const OPINIONS_CATEGORIES: SeedCategory[] = [
  ...AUTHORED_SECTIONS.map((section) => ({
    ...section,
    decks: stageDecks(section.decks),
  })),
  FINAL_TEST_GROUP,
];

/**
 * The names this level owns, so no other area lays out one of its sections and
 * the Practice ladder never queues one. Name-based like the levels before it: a
 * category row on disk carries nothing else saying which area it belongs to,
 * and adding a stored field would need a migration on every install to buy what
 * a set of names already answers.
 */
export const OPINIONS_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  OPINIONS_CATEGORIES.map((section) => section.name.toLowerCase()),
);

/** The final test's category, which the level lays out apart from the sections. */
export const OPINIONS_FINAL_TEST_CATEGORY = FINAL_TEST_GROUP.name;

/** The section whose first lesson is the certainty scale's practice. */
export const OPINIONS_STRENGTH_CATEGORY = 'How sure are you';

/** That lesson, by name — the deck built out of `OPINION_STRENGTHS`. */
export const OPINIONS_STRENGTH_LESSON = 'Maybe, probably, definitely';

/**
 * Which strand of the skill each section belongs to, for the level's own
 * signposting.
 *
 * Read off the section name rather than stored on the category, for the same
 * reason membership is: nothing on disk carries it, and the authored list above
 * is the only place that knows.
 */
export type OpinionStrand =
  | 'thinking'
  | 'reasons'
  | 'comparing'
  | 'answering'
  | 'judging';

export const OPINION_SECTION_STRANDS: ReadonlyMap<string, OpinionStrand> = new Map<
  string,
  OpinionStrand
>(
  (
    [
      ['It seems to me', 'thinking'],
      ['I do not think', 'thinking'],
      ['I like it, I do not like it', 'thinking'],
      ['Whose opinion it is', 'thinking'],
      ['Because', 'reasons'],
      ['Why?', 'reasons'],
      ['Growing an opinion', 'reasons'],
      ['I prefer', 'comparing'],
      ['Which one?', 'comparing'],
      ['Better and worse', 'comparing'],
      ['The same and different', 'comparing'],
      ['I agree', 'answering'],
      ['I do not agree', 'answering'],
      ['Yes, but…', 'answering'],
      ['How sure are you', 'answering'],
      ['You should', 'judging'],
      ['Is it worth it?', 'judging'],
      ['A good idea', 'judging'],
      ['Everyday opinions', 'judging'],
    ] as [string, OpinionStrand][]
  ).map(([name, strand]) => [name.toLowerCase(), strand]),
);

/**
 * The openings the level hands to Free Conversation for its last stage.
 *
 * The spec's stage seven is an opinion with nobody offering her the words, and
 * Free Conversation already reads those. These are the questions it starts
 * from, so "what do you think about working from home?" arrives as a
 * conversation rather than as a seventh kind of card.
 */
export const OPINION_PROMPTS: string[] = [
  'What do you think about working from home?',
  'Which do you prefer, the city or the village?',
  'Do you think it is better to study in the morning or at night?',
  'What is the best place you have been to, and why?',
  'Would you recommend where you live?',
  'Coffee or tea, and why?',
  'Do you think learning two languages at once is a good idea?',
  'What would you change about your week?',
];
