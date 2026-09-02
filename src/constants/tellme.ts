import {
  c,
  ofSpeaker,
  stageDecks,
  type SeedCard,
  type SeedCategory,
  type SeedDeck,
} from './seed';

/**
 * Tell Me About It: more than one sentence at a time.
 *
 * Every level up to here ends at the full stop. She can say "I went to work",
 * "I saw my friend", "I was tired" — and then somebody says *tell me about
 * your day* and she produces one of those three and stops, because nothing has
 * ever taught her what goes *between* two sentences. This level is that
 * between: the joining words, the order events are told in, and the handful of
 * shapes that turn a list of facts into a piece of speech.
 *
 * It is a standalone level like the six before it — its progress is its own,
 * it gates nothing and nothing gates it (see `isTellMeCategory` in
 * `features/review/languagePolicy`).
 *
 * **A lesson is a deck, and one line is a card**, exactly as in Past & Future.
 * No new study engine. Where a lesson grows one sentence — "I fell" → "I was
 * walking home and I fell" → "… so I sat down" — the cards are ordered so the
 * growth is what the lesson view draws, reusing `addedPiece` from Sentence
 * Building rather than authoring the highlight by hand. Where the point is
 * answering something, the card carries a `cue`.
 *
 * **Three things here are not decks**, because the skill they teach is not a
 * line to master:
 *
 *   `CONNECTORS`    — the joining words with the job each one does, drawn as a
 *                     map. The first lesson of section one is built out of it,
 *                     so the picture and the practice cannot drift.
 *   `STORY_BUILDS`  — answer four questions, then read the four answers back as
 *                     one connected piece. The spec's "build from questions".
 *   `SHORT_STORIES` — a few sentences heard as one run, with plain comprehension
 *                     questions after. Narrative listening, kept short.
 *
 * The last stage of the spec's ladder — an unscripted "tell me about
 * yesterday" — is deliberately *not* built here. Free Conversation already has
 * a model that can grade an answer with no single right form; this level hands
 * over to it rather than growing a second one.
 *
 * **The Arabic is what a Palestinian says when telling you what happened.**
 * Narrative is where a course drifts into MSA fastest, so nothing here is
 * derived from written Arabic: "but" is بس, not لكن; "so" is فـ and عشان هيك,
 * not لذلك; "then" is بعدين; "first" is أوّل شي; "in the end" is بالآخر;
 * "before/after I did something" is قبل ما / بعد ما. The fillers are the ones
 * actually heard — يعني, طيّب, المهم, بصراحة, خلص.
 *
 * **Hebrew is spoken Modern Hebrew** for the same reason: אז for "so", כי for
 * "because" (not מכיוון ש), אחר כך and בסוף for the sequence, כש־ and
 * לפני ש / אחרי ש for the time clauses.
 *
 * **Gender.** The first-person past stays genderless in both languages, as the
 * previous level established. What is gendered is what hangs off it — the
 * adjective after הייתי / كنت, the participles (גרה, עובדת, ساكنة, ماشية) and
 * the present-tense verbs — and all of those take `ofSpeaker`, because they
 * are hers. A cue takes `askedOfHer`, for the reason set out below.
 *
 * **Vocabulary is borrowed, not invented.** The verbs, places, times and
 * adjectives come from Basics, the phrase decks and Past & Future; the new
 * words are the connectors themselves and the short list of description words
 * the spec asks for by name.
 *
 * Authored 2026-09-01 by Claude; not yet reviewed by a native speaker.
 */

/**
 * A line spoken *to* the learner, whose two forms her own gender picks between.
 *
 * The same deliberate alias every level since Conversation Flow uses. "What did
 * you do?" is shū ʿamalti to a woman and shū ʿamalt to a man whoever is asking,
 * so the ending follows *her*, and the app's `speaker` agreement is precisely
 * "her own gender".
 */
const askedOfHer = ofSpeaker;

/** Shorthand for the speaker-gendered forms her own lines carry. */
const sp = ofSpeaker;

/**
 * How many flawless runs a lesson asks for. The same light bar a chain, an
 * exchange and a tense lesson ask: this is a bridge to speaking, and it gates
 * nothing.
 */
const LESSON_RUNS = 5;

/** The capstone's shape — see `FINAL_TEST_GROUP`. */
const FINAL_TEST_RUNS = 10;
const FINAL_TEST_BATCH = 10;

/** Hebrew whose two forms are spelled alike and only sound different. */
const SAID = {
  he: 'Written the same either way; only the ending is said differently.',
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

// --- the joining words -------------------------------------------------------

/**
 * What a connector is *for*, said as a job rather than as a part of speech.
 *
 * The spec is explicit that these are taught by meaning and not by grammar
 * label, so this is the only classification the level makes: adds, contrasts,
 * gives the reason, gives the result, puts things in order, fixes them in time,
 * says how often.
 */
export type ConnectorRole =
  | 'add'
  | 'contrast'
  | 'reason'
  | 'result'
  | 'sequence'
  | 'time'
  | 'often';

export type Connector = {
  role: ConnectorRole;
  /** The word itself, which is also the card the first lesson teaches. */
  word: SeedCard;
  /** What it does to the two things it sits between, in plain English. */
  does: string;
  /** One sentence it is doing that job inside. */
  example: SeedCard;
};

/**
 * The joining words, and one sentence apiece.
 *
 * `CONNECTORS` is the source and the first lesson of "And, but, also" is built
 * out of it, so the map the learner reads and the deck she practises can never
 * drift apart — the same arrangement `TENSE_TRIADS` has with the contrast
 * decks one level down.
 *
 * "Because of that" is absent on purpose: in both languages it is the very
 * phrase already listed as "that's why" (בגלל זה, عشان هيك), and listing one
 * wording twice under two English headings teaches a distinction neither
 * language makes.
 */
export const CONNECTORS: Connector[] = [
  {
    role: 'add',
    does: 'Puts a second thing beside the first.',
    word: c('and', ['ו־', 've-'], ['و', 'w-'], {
      he: 'Written onto the front of the next word: ve-akhalti, "and I ate".',
      ar: 'Written onto the front of the next word too: w-akalt, "and I ate".',
    }),
    example: c(
      'I worked and I studied',
      ['עבדתי ולמדתי', 'avadti ve-lamadti'],
      ['اشتغلت ودرست', 'ishtaghalt w-darast'],
    ),
  },
  {
    role: 'add',
    does: 'Says the second thing is true as well.',
    word: c('also', ['גם', 'gam'], ['كمان', 'kamān']),
    example: c(
      'I ate there too',
      ['גם אכלתי שם', 'gam akhalti sham'],
      ['كمان أكلت هناك', 'kamān akalt hnāk'],
    ),
  },
  {
    role: 'contrast',
    does: 'Warns that the second thing cuts against the first.',
    word: c('but', ['אבל', 'aval'], ['بس', 'bass'], {
      ar: 'The spoken word. لكن is written Arabic and sounds stiff out loud.',
    }),
    example: c(
      'I went, but I did not stay long',
      ['הלכתי אבל לא נשארתי הרבה זמן', "halakhti aval lo nish'arti harbe zman"],
      ['رحت بس ما ضلّيت كتير', 'ruḥt bass ma ḍallēt ktīr'],
    ),
  },
  {
    role: 'reason',
    does: 'The second thing is the reason for the first.',
    word: c('because', ['כי', 'ki'], ['لأنّ', 'laʾinn'], {
      ar: 'Never said bare: the person is stuck on the end — laʾinni "because I", laʾinno "because it".',
    }),
    example: c(
      'I went home because I was tired',
      sp(
        'הלכתי הביתה כי הייתי עייפה',
        'halakhti ha-bayta ki hayiti ayefa',
        'הלכתי הביתה כי הייתי עייף',
        'halakhti ha-bayta ki hayiti ayef',
      ),
      sp(
        'رحت عالبيت لأني كنت تعبانة',
        'ruḥt ʿal-bēt laʾinni kunt taʿbāne',
        'رحت عالبيت لأني كنت تعبان',
        'ruḥt ʿal-bēt laʾinni kunt taʿbān',
      ),
    ),
  },
  {
    role: 'result',
    does: 'The second thing is what the first one led to.',
    word: c('so', ['אז', 'az'], ['فـ', 'fa-'], {
      ar: 'Written onto the front of the next word: fa-ruḥt, "so I went".',
    }),
    example: c(
      'I was tired, so I went home',
      sp(
        'הייתי עייפה אז הלכתי הביתה',
        'hayiti ayefa az halakhti ha-bayta',
        'הייתי עייף אז הלכתי הביתה',
        'hayiti ayef az halakhti ha-bayta',
      ),
      sp(
        'كنت تعبانة فرحت عالبيت',
        'kunt taʿbāne fa-ruḥt ʿal-bēt',
        'كنت تعبان فرحت عالبيت',
        'kunt taʿbān fa-ruḥt ʿal-bēt',
      ),
    ),
  },
  {
    role: 'result',
    does: 'Points back at something already said and names it as the cause.',
    word: c("that's why", ['בגלל זה', 'biglal ze'], ['عشان هيك', 'ʿashān hēk']),
    example: c(
      'It was far. That is why I did not go',
      ['זה היה רחוק. בגלל זה לא הלכתי', 'ze haya rakhok. biglal ze lo halakhti'],
      ['كان بعيد. عشان هيك ما رحت', 'kān baʿīd. ʿashān hēk ma ruḥt'],
    ),
  },
  {
    role: 'sequence',
    does: 'Marks the first thing in the order.',
    word: c('first', ['קודם', 'kodem'], ['أوّل شي', 'awwal shi']),
    example: c(
      'First I went to work',
      ['קודם הלכתי לעבודה', 'kodem halakhti la-avoda'],
      ['أوّل شي رحت عالشغل', 'awwal shi ruḥt ʿash-shughul'],
    ),
  },
  {
    role: 'sequence',
    does: 'The next thing, straight after.',
    word: c('then', ['אחר כך', 'akhar kakh'], ['بعدين', 'baʿdēn']),
    example: c(
      'Then I went home',
      ['אחר כך הלכתי הביתה', 'akhar kakh halakhti ha-bayta'],
      ['بعدين رحت عالبيت', 'baʿdēn ruḥt ʿal-bēt'],
    ),
  },
  {
    role: 'sequence',
    does: 'The same as "then", with the last thing pointed back at.',
    word: c('after that', ['אחרי זה', 'akharei ze'], ['بعد هيك', 'baʿd hēk']),
    example: c(
      'After that we ate',
      ['אחרי זה אכלנו', 'akharei ze akhalnu'],
      ['بعد هيك أكلنا', 'baʿd hēk akalna'],
    ),
  },
  {
    role: 'sequence',
    does: 'Further on, with a gap in between.',
    word: c('later', ['יותר מאוחר', "yoter me'ukhar"], ['بعد شوي', 'baʿd shwayy']),
    example: c(
      'Later I went home',
      ['יותר מאוחר הלכתי הביתה', "yoter me'ukhar halakhti ha-bayta"],
      ['بعد شوي رحت عالبيت', 'baʿd shwayy ruḥt ʿal-bēt'],
    ),
  },
  {
    role: 'sequence',
    does: 'The last thing, and the sign the story is ending.',
    word: c('in the end', ['בסוף', 'ba-sof'], ['بالآخر', 'bil-ākhir']),
    example: c(
      'In the end I slept early',
      ['בסוף הלכתי לישון מוקדם', 'ba-sof halakhti lishon mukdam'],
      ['بالآخر نمت بكّير', 'bil-ākhir nimt bakkīr'],
    ),
  },
  {
    role: 'time',
    does: 'Puts the second thing earlier than the first.',
    word: c('before', ['לפני', 'lifnei'], ['قبل', 'ʾabl']),
    example: c(
      'Before work I drank coffee',
      ['לפני העבודה שתיתי קפה', 'lifnei ha-avoda shatiti kafe'],
      ['قبل الشغل شربت قهوة', 'ʾabl ish-shughul sharibt ʾahwe'],
    ),
  },
  {
    role: 'time',
    does: 'Puts the second thing later than the first.',
    word: c('after', ['אחרי', 'akharei'], ['بعد', 'baʿd']),
    example: c(
      'After work I went home',
      ['אחרי העבודה הלכתי הביתה', 'akharei ha-avoda halakhti ha-bayta'],
      ['بعد الشغل رحت عالبيت', 'baʿd ish-shughul ruḥt ʿal-bēt'],
    ),
  },
  {
    role: 'time',
    does: 'Sets the moment one thing happened at.',
    word: c('when', ['כש־', 'kshe-'], ['لمّا', 'lamma'], {
      he: 'Written onto the front of the next word: kshe-siyamti, "when I finished".',
    }),
    example: c(
      'When I finished, I went home',
      ['כשסיימתי הלכתי הביתה', 'kshe-siyamti halakhti ha-bayta'],
      ['لمّا خلّصت رحت عالبيت', 'lamma khallaṣt ruḥt ʿal-bēt'],
    ),
  },
  {
    role: 'time',
    does: 'Two things going on at the same time.',
    word: c('while', ['בזמן ש־', 'bizman she-'], ['وقت ما', 'waʾt ma']),
    example: c(
      'While I was working, she called',
      ['בזמן שעבדתי היא התקשרה', 'bizman she-avadti hi hitkashra'],
      ['وقت ما كنت بشتغل هي اتّصلت', 'waʾt ma kunt bashtighel hiyye ittaṣalat'],
    ),
  },
  {
    role: 'often',
    does: 'True some of the time, not all of it.',
    word: c('sometimes', ['לפעמים', "lif'amim"], ['مرّات', 'marrāt']),
    example: c(
      'Sometimes I work at home',
      sp(
        'לפעמים אני עובדת בבית',
        "lif'amim ani ovedet ba-bayit",
        'לפעמים אני עובד בבית',
        "lif'amim ani oved ba-bayit",
      ),
      ['مرّات بشتغل بالبيت', 'marrāt bashtighel bil-bēt'],
    ),
  },
  {
    role: 'often',
    does: 'What normally happens.',
    word: c('usually', ['בדרך כלל', 'be-derekh klal'], ['بالعادة', 'bil-ʿāde']),
    example: c(
      'I usually get up early',
      sp(
        'בדרך כלל אני קמה מוקדם',
        'be-derekh klal ani kama mukdam',
        'בדרך כלל אני קם מוקדם',
        'be-derekh klal ani kam mukdam',
      ),
      ['بالعادة بقوم بكّير', 'bil-ʿāde baʾūm bakkīr'],
    ),
  },
];

/** What each role is called on the map, and what it is for. */
export const CONNECTOR_ROLES: {
  role: ConnectorRole;
  heading: string;
  blurb: string;
}[] = [
  { role: 'add', heading: 'Add information', blurb: 'Two things that sit happily side by side.' },
  { role: 'contrast', heading: 'Contrast', blurb: 'The second thing cuts against the first.' },
  { role: 'reason', heading: 'Reason', blurb: 'Why the first thing happened.' },
  { role: 'result', heading: 'Result', blurb: 'What the first thing led to.' },
  { role: 'sequence', heading: 'Order', blurb: 'Which came first, and what came after it.' },
  { role: 'time', heading: 'Time', blurb: 'Where one thing sits against another on the clock.' },
  { role: 'often', heading: 'How often', blurb: 'Whether this is always, usually or now and then.' },
];

// --- 1. And, but, also -------------------------------------------------------

const AND_BUT_ALSO: SeedDeck[] = [
  lesson(
    'The joining words',
    CONNECTORS.map((connector) => connector.word),
  ),
  lesson('Two things at once', [
    c('I worked and I studied', ['עבדתי ולמדתי', 'avadti ve-lamadti'], ['اشتغلت ودرست', 'ishtaghalt w-darast']),
    c('I ate and drank coffee', ['אכלתי ושתיתי קפה', 'akhalti ve-shatiti kafe'], ['أكلت وشربت قهوة', 'akalt w-sharibt ʾahwe']),
    c('I went home and slept', ['הלכתי הביתה וישנתי', 'halakhti ha-bayta ve-yashanti'], ['رحت عالبيت ونمت', 'ruḥt ʿal-bēt w-nimt']),
    c('I saw my friend and we talked', ['ראיתי את החברה שלי ודיברנו', "ra'iti et ha-khavera sheli ve-dibarnu"], ['شفت صاحبتي وحكينا', 'shuft ṣāḥibti w-ḥakēna']),
    c(
      'I was at home and I was tired',
      sp('הייתי בבית והייתי עייפה', 'hayiti ba-bayit ve-hayiti ayefa', 'הייתי בבית והייתי עייף', 'hayiti ba-bayit ve-hayiti ayef'),
      sp('كنت بالبيت وكنت تعبانة', 'kunt bil-bēt w-kunt taʿbāne', 'كنت بالبيت وكنت تعبان', 'kunt bil-bēt w-kunt taʿbān'),
    ),
  ]),
  lesson('The other way round', [
    c(
      'I wanted to go, but I was tired',
      sp('רציתי ללכת אבל הייתי עייפה', 'ratsiti lalekhet aval hayiti ayefa', 'רציתי ללכת אבל הייתי עייף', 'ratsiti lalekhet aval hayiti ayef'),
      sp('كان بدّي أروح بس كنت تعبانة', 'kān biddi arūḥ bass kunt taʿbāne', 'كان بدّي أروح بس كنت تعبان', 'kān biddi arūḥ bass kunt taʿbān'),
    ),
    c(
      'I like it, but it is expensive',
      sp('אני אוהבת את זה אבל זה יקר', 'ani ohevet et ze aval ze yakar', 'אני אוהב את זה אבל זה יקר', 'ani ohev et ze aval ze yakar'),
      ['بحبّه بس غالي', 'baḥibbo bass ghāli'],
    ),
    c('It was good, but it was far', ['היה טוב אבל היה רחוק', 'haya tov aval haya rakhok'], ['كان منيح بس كان بعيد', 'kān mnīḥ bass kān baʿīd']),
    c('I went, but I did not stay long', ['הלכתי אבל לא נשארתי הרבה זמן', "halakhti aval lo nish'arti harbe zman"], ['رحت بس ما ضلّيت كتير', 'ruḥt bass ma ḍallēt ktīr']),
    c(
      'I am tired, but I am fine',
      sp('אני עייפה אבל אני בסדר', 'ani ayefa aval ani beseder', 'אני עייף אבל אני בסדר', 'ani ayef aval ani beseder'),
      sp('أنا تعبانة بس أنا منيحة', 'ana taʿbāne bass ana mnīḥa', 'أنا تعبان بس أنا منيح', 'ana taʿbān bass ana mnīḥ'),
    ),
  ]),
  lesson('That as well', [
    c('I also ate', ['גם אכלתי', 'gam akhalti'], ['كمان أكلت', 'kamān akalt']),
    c('I went there too', ['גם הלכתי לשם', 'gam halakhti lesham'], ['كمان رحت لهناك', 'kamān ruḥt la-hnāk']),
    c('She works there too', ['גם היא עובדת שם', 'gam hi ovedet sham'], ['هي كمان بتشتغل هناك', 'hiyye kamān btishtighel hnāk']),
    c(
      'I like it too',
      sp('גם אני אוהבת את זה', 'gam ani ohevet et ze', 'גם אני אוהב את זה', 'gam ani ohev et ze'),
      ['كمان بحبّه', 'kamān baḥibbo'],
    ),
  ]),
];

// --- 2. Because and so -------------------------------------------------------

const BECAUSE_AND_SO: SeedDeck[] = [
  lesson('Why it happened', [
    c('I did not come because I was working', ['לא באתי כי עבדתי', 'lo bati ki avadti'], ['ما إجيت لأني كنت بشتغل', 'ma ijīt laʾinni kunt bashtighel']),
    c(
      'I am learning Arabic because I want to understand',
      sp('אני לומדת ערבית כי אני רוצה להבין', 'ani lomedet aravit ki ani rotsa lehavin', 'אני לומד ערבית כי אני רוצה להבין', 'ani lomed aravit ki ani rotse lehavin'),
      ['بتعلّم عربي لأني بدّي أفهم', 'batʿallam ʿarabi laʾinni biddi afham'],
    ),
    c(
      'I like it because it is close to the sea',
      sp('אני אוהבת את זה כי זה קרוב לים', 'ani ohevet et ze ki ze karov la-yam', 'אני אוהב את זה כי זה קרוב לים', 'ani ohev et ze ki ze karov la-yam'),
      ['بحبّه لأنّه قريب عالبحر', 'baḥibbo laʾinno ʾarīb ʿal-baḥr'],
    ),
    c(
      'I stayed at home because it was raining',
      ['נשארתי בבית כי ירד גשם', "nish'arti ba-bayit ki yarad geshem"],
      ['ضلّيت بالبيت لأنّها كانت بتشتّي', 'ḍallēt bil-bēt laʾinnha kānat btishatti'],
    ),
  ]),
  lesson('What came of it', [
    c('It was late, so I left', ['היה מאוחר אז הלכתי', "haya me'ukhar az halakhti"], ['كان متأخّر فرحت', 'kān mitʾakhkhir fa-ruḥt']),
    c('It was expensive, so I did not buy it', ['היה יקר אז לא קניתי את זה', 'haya yakar az lo kaniti et ze'], ['كان غالي فما اشتريته', 'kān ghāli fa-ma ishtarēto']),
    c(
      'I did not sleep, so I am tired now',
      sp('לא ישנתי אז אני עייפה עכשיו', 'lo yashanti az ani ayefa akhshav', 'לא ישנתי אז אני עייף עכשיו', 'lo yashanti az ani ayef akhshav'),
      sp('ما نمت فأنا تعبانة هلّق', 'ma nimt fa-ana taʿbāne hallaʾ', 'ما نمت فأنا تعبان هلّق', 'ma nimt fa-ana taʿbān hallaʾ'),
    ),
    c(
      'It was busy, so I stayed late',
      ['היה עמוס אז נשארתי עד מאוחר', "haya amus az nish'arti ad me'ukhar"],
      ['كان في ضغط فضلّيت لوقت متأخّر', 'kān fī ḍaghṭ fa-ḍallēt la-waʾt mitʾakhkhir'],
    ),
  ]),
  lesson('The same thing, said the other way', [
    c(
      'I did not sleep well. That is why I am tired',
      sp('לא ישנתי טוב. בגלל זה אני עייפה', 'lo yashanti tov. biglal ze ani ayefa', 'לא ישנתי טוב. בגלל זה אני עייף', 'lo yashanti tov. biglal ze ani ayef'),
      sp('ما نمت منيح. عشان هيك أنا تعبانة', 'ma nimt mnīḥ. ʿashān hēk ana taʿbāne', 'ما نمت منيح. عشان هيك أنا تعبان', 'ma nimt mnīḥ. ʿashān hēk ana taʿbān'),
    ),
    c(
      'I was hungry. That is why I ate',
      sp('הייתי רעבה. בגלל זה אכלתי', "hayiti re'eva. biglal ze akhalti", 'הייתי רעב. בגלל זה אכלתי', "hayiti ra'ev. biglal ze akhalti"),
      sp('كنت جوعانة. عشان هيك أكلت', 'kunt jūʿāne. ʿashān hēk akalt', 'كنت جوعان. عشان هيك أكلت', 'kunt jūʿān. ʿashān hēk akalt'),
    ),
    c(
      'It was far. That is why I did not go',
      ['זה היה רחוק. בגלל זה לא הלכתי', 'ze haya rakhok. biglal ze lo halakhti'],
      ['كان بعيد. عشان هيك ما رحت', 'kān baʿīd. ʿashān hēk ma ruḥt'],
    ),
  ]),
];

// --- 3. First, then, finally -------------------------------------------------

const IN_ORDER: SeedDeck[] = [
  lesson('One after another', [
    c('First I went to work', ['קודם הלכתי לעבודה', 'kodem halakhti la-avoda'], ['أوّل شي رحت عالشغل', 'awwal shi ruḥt ʿash-shughul']),
    c('Then I met my friend', ['אחר כך נפגשתי עם החברה שלי', 'akhar kakh nifgashti im ha-khavera sheli'], ['بعدين تلاقيت مع صاحبتي', 'baʿdēn tlāʾēt maʿ ṣāḥibti']),
    c('After that we ate', ['אחרי זה אכלנו', 'akharei ze akhalnu'], ['بعد هيك أكلنا', 'baʿd hēk akalna']),
    c('Later I went home', ['יותר מאוחר הלכתי הביתה', "yoter me'ukhar halakhti ha-bayta"], ['بعد شوي رحت عالبيت', 'baʿd shwayy ruḥt ʿal-bēt']),
    c('In the end I slept early', ['בסוף הלכתי לישון מוקדם', 'ba-sof halakhti lishon mukdam'], ['بالآخر نمت بكّير', 'bil-ākhir nimt bakkīr']),
  ]),
  lesson('A day growing longer', [
    c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt']),
    c('First I worked', ['קודם עבדתי', 'kodem avadti'], ['أوّل شي اشتغلت', 'awwal shi ishtaghalt']),
    c(
      'First I worked, then I went home',
      ['קודם עבדתי, אחר כך הלכתי הביתה', 'kodem avadti, akhar kakh halakhti ha-bayta'],
      ['أوّل شي اشتغلت، بعدين رحت عالبيت', 'awwal shi ishtaghalt, baʿdēn ruḥt ʿal-bēt'],
    ),
    c(
      'First I worked, then I went home and ate',
      ['קודם עבדתי, אחר כך הלכתי הביתה ואכלתי', 'kodem avadti, akhar kakh halakhti ha-bayta ve-akhalti'],
      ['أوّل شي اشتغلت، بعدين رحت عالبيت وأكلت', 'awwal shi ishtaghalt, baʿdēn ruḥt ʿal-bēt w-akalt'],
    ),
    c(
      'First I worked, then I went home and ate. In the end I slept early',
      [
        'קודם עבדתי, אחר כך הלכתי הביתה ואכלתי. בסוף הלכתי לישון מוקדם',
        'kodem avadti, akhar kakh halakhti ha-bayta ve-akhalti. ba-sof halakhti lishon mukdam',
      ],
      [
        'أوّل شي اشتغلت، بعدين رحت عالبيت وأكلت. بالآخر نمت بكّير',
        'awwal shi ishtaghalt, baʿdēn ruḥt ʿal-bēt w-akalt. bil-ākhir nimt bakkīr',
      ],
    ),
  ]),
  lesson('Putting three things in order', [
    c('I got up, then I drank coffee', ['קמתי, אחר כך שתיתי קפה', 'kamti, akhar kakh shatiti kafe'], ['قمت، بعدين شربت قهوة', 'ʾumt, baʿdēn sharibt ʾahwe']),
    c('I ate, then I went out', ['אכלתי, אחר כך יצאתי', 'akhalti, akhar kakh yatsati'], ['أكلت، بعدين طلعت', 'akalt, baʿdēn ṭliʿt']),
    c('We talked, and after that we ate', ['דיברנו, ואחרי זה אכלנו', 'dibarnu, ve-akharei ze akhalnu'], ['حكينا، وبعد هيك أكلنا', 'ḥakēna, w-baʿd hēk akalna']),
    c('In the end everything was fine', ['בסוף הכול היה בסדר', 'ba-sof ha-kol haya beseder'], ['بالآخر كل إشي كان منيح', 'bil-ākhir kull ishi kān mnīḥ']),
  ]),
];

// --- 4. Before, after, when --------------------------------------------------

const BEFORE_AND_AFTER: SeedDeck[] = [
  lesson('Before something, after something', [
    c('before work', ['לפני העבודה', 'lifnei ha-avoda'], ['قبل الشغل', 'ʾabl ish-shughul']),
    c('after work', ['אחרי העבודה', 'akharei ha-avoda'], ['بعد الشغل', 'baʿd ish-shughul']),
    c('before dinner', ['לפני ארוחת הערב', 'lifnei arukhat ha-erev'], ['قبل العشا', 'ʾabl il-ʿasha']),
    c('after dinner', ['אחרי ארוחת הערב', 'akharei arukhat ha-erev'], ['بعد العشا', 'baʿd il-ʿasha']),
    c('After work I went home', ['אחרי העבודה הלכתי הביתה', 'akharei ha-avoda halakhti ha-bayta'], ['بعد الشغل رحت عالبيت', 'baʿd ish-shughul ruḥt ʿal-bēt']),
    c('Before work I drank coffee', ['לפני העבודה שתיתי קפה', 'lifnei ha-avoda shatiti kafe'], ['قبل الشغل شربت قهوة', 'ʾabl ish-shughul sharibt ʾahwe']),
  ]),
  lesson('Before I did it, after I did it', [
    c('before I went', ['לפני שהלכתי', 'lifnei she-halakhti'], ['قبل ما رحت', 'ʾabl ma ruḥt']),
    c('after I ate', ['אחרי שאכלתי', 'akharei she-akhalti'], ['بعد ما أكلت', 'baʿd ma akalt']),
    c('before I slept', ['לפני שישנתי', 'lifnei she-yashanti'], ['قبل ما نمت', 'ʾabl ma nimt']),
    c('after I finished', ['אחרי שסיימתי', 'akharei she-siyamti'], ['بعد ما خلّصت', 'baʿd ma khallaṣt']),
    c('Before I went home, I bought food', ['לפני שהלכתי הביתה קניתי אוכל', 'lifnei she-halakhti ha-bayta kaniti okhel'], ['قبل ما رحت عالبيت اشتريت أكل', 'ʾabl ma ruḥt ʿal-bēt ishtarēt akl']),
    c('After I ate, I went to sleep', ['אחרי שאכלתי הלכתי לישון', 'akharei she-akhalti halakhti lishon'], ['بعد ما أكلت رحت نمت', 'baʿd ma akalt ruḥt nimt']),
  ]),
  lesson('At the moment it happened', [
    c('when I got home', ['כשהגעתי הביתה', 'kshe-higati ha-bayta'], ['لمّا وصلت عالبيت', 'lamma wṣilt ʿal-bēt']),
    c('When I got home, I ate', ['כשהגעתי הביתה אכלתי', 'kshe-higati ha-bayta akhalti'], ['لمّا وصلت عالبيت أكلت', 'lamma wṣilt ʿal-bēt akalt']),
    c('When I finished, I went home', ['כשסיימתי הלכתי הביתה', 'kshe-siyamti halakhti ha-bayta'], ['لمّا خلّصت رحت عالبيت', 'lamma khallaṣt ruḥt ʿal-bēt']),
    c('while I was working', ['בזמן שעבדתי', 'bizman she-avadti'], ['وقت ما كنت بشتغل', 'waʾt ma kunt bashtighel']),
    c('While I was working, she called', ['בזמן שעבדתי היא התקשרה', 'bizman she-avadti hi hitkashra'], ['وقت ما كنت بشتغل هي اتّصلت', 'waʾt ma kunt bashtighel hiyye ittaṣalat']),
  ]),
];

// --- 5. Tell me about your day -----------------------------------------------

const HOW_WAS_YOUR_DAY = c(
  'How was your day?',
  askedOfHer('איך היה היום שלך?', 'eikh haya ha-yom shelakh', 'איך היה היום שלך?', 'eikh haya ha-yom shelkha'),
  askedOfHer('كيف كان يومك؟', 'kīf kān yōmik', 'كيف كان يومك؟', 'kīf kān yōmak'),
  { he: SAID.he },
);

const WHAT_DID_YOU_DO_TODAY = c(
  'What did you do today?',
  askedOfHer('מה עשית היום?', 'ma asit ha-yom', 'מה עשית היום?', 'ma asita ha-yom'),
  askedOfHer('شو عملتي اليوم؟', 'shū ʿamalti il-yōm', 'شو عملت اليوم؟', 'shū ʿamalt il-yōm'),
  { he: SAID.he },
);

const YOUR_DAY: SeedDeck[] = [
  lesson('How was it?', [
    answer(HOW_WAS_YOUR_DAY, c('It was good', ['היה טוב', 'haya tov'], ['كان منيح', 'kān mnīḥ'])),
    answer(HOW_WAS_YOUR_DAY, c('It was a long day', ['היה יום ארוך', 'haya yom arokh'], ['كان يوم طويل', 'kān yōm ṭawīl'])),
    answer(HOW_WAS_YOUR_DAY, c('It was fine, I worked', ['היה בסדר, עבדתי', 'haya beseder, avadti'], ['كان منيح، اشتغلت', 'kān mnīḥ, ishtaghalt'])),
    answer(HOW_WAS_YOUR_DAY, c('It was a bit hard', ['היה קצת קשה', 'haya ktsat kashe'], ['كان شوي صعب', 'kān shwayy ṣaʿb'])),
    answer(HOW_WAS_YOUR_DAY, c('Nothing special', ['שום דבר מיוחד', 'shum davar meyukhad'], ['ولا إشي مميّز', 'wala ishi mmayyaz'])),
  ]),
  lesson('More than one sentence', [
    answer(WHAT_DID_YOU_DO_TODAY, c('I worked in the morning', ['עבדתי בבוקר', 'avadti ba-boker'], ['اشتغلت الصبح', 'ishtaghalt iṣ-ṣubḥ'])),
    answer(
      WHAT_DID_YOU_DO_TODAY,
      c(
        'I worked in the morning. Then I went home',
        ['עבדתי בבוקר. אחר כך הלכתי הביתה', 'avadti ba-boker. akhar kakh halakhti ha-bayta'],
        ['اشتغلت الصبح. بعدين رحت عالبيت', 'ishtaghalt iṣ-ṣubḥ. baʿdēn ruḥt ʿal-bēt'],
      ),
    ),
    answer(
      WHAT_DID_YOU_DO_TODAY,
      c(
        'I worked in the morning. Then I went home. I ate and watched television',
        [
          'עבדתי בבוקר. אחר כך הלכתי הביתה. אכלתי וראיתי טלוויזיה',
          "avadti ba-boker. akhar kakh halakhti ha-bayta. akhalti ve-ra'iti televizya",
        ],
        [
          'اشتغلت الصبح. بعدين رحت عالبيت. أكلت وتفرّجت على التلفزيون',
          'ishtaghalt iṣ-ṣubḥ. baʿdēn ruḥt ʿal-bēt. akalt w-tfarrajt ʿala it-tilifizyōn',
        ],
      ),
    ),
  ]),
  lesson('A day told properly', [
    c(
      'I worked in the morning, then I went home because I was tired',
      sp(
        'עבדתי בבוקר, אחר כך הלכתי הביתה כי הייתי עייפה',
        'avadti ba-boker, akhar kakh halakhti ha-bayta ki hayiti ayefa',
        'עבדתי בבוקר, אחר כך הלכתי הביתה כי הייתי עייף',
        'avadti ba-boker, akhar kakh halakhti ha-bayta ki hayiti ayef',
      ),
      sp(
        'اشتغلت الصبح، بعدين رحت عالبيت لأني كنت تعبانة',
        'ishtaghalt iṣ-ṣubḥ, baʿdēn ruḥt ʿal-bēt laʾinni kunt taʿbāne',
        'اشتغلت الصبح، بعدين رحت عالبيت لأني كنت تعبان',
        'ishtaghalt iṣ-ṣubḥ, baʿdēn ruḥt ʿal-bēt laʾinni kunt taʿbān',
      ),
    ),
    c(
      'After dinner I watched television and went to sleep early',
      [
        'אחרי ארוחת הערב ראיתי טלוויזיה והלכתי לישון מוקדם',
        "akharei arukhat ha-erev ra'iti televizya ve-halakhti lishon mukdam",
      ],
      [
        'بعد العشا تفرّجت على التلفزيون ونمت بكّير',
        'baʿd il-ʿasha tfarrajt ʿala it-tilifizyōn w-nimt bakkīr',
      ],
    ),
    c(
      'Today was quiet. I stayed at home and did not do much',
      ['היום היה שקט. נשארתי בבית ולא עשיתי הרבה', "ha-yom haya shaket. nish'arti ba-bayit ve-lo asiti harbe"],
      ['اليوم كان هادي. ضلّيت بالبيت وما عملت كتير', 'il-yōm kān hādi. ḍallēt bil-bēt w-ma ʿamalt ktīr'],
    ),
    c(
      'Usually I work in the morning, but today I worked all day',
      sp(
        'בדרך כלל אני עובדת בבוקר, אבל היום עבדתי כל היום',
        'be-derekh klal ani ovedet ba-boker, aval ha-yom avadti kol ha-yom',
        'בדרך כלל אני עובד בבוקר, אבל היום עבדתי כל היום',
        'be-derekh klal ani oved ba-boker, aval ha-yom avadti kol ha-yom',
      ),
      ['بالعادة بشتغل الصبح، بس اليوم اشتغلت طول اليوم', 'bil-ʿāde bashtighel iṣ-ṣubḥ, bass il-yōm ishtaghalt ṭūl il-yōm'],
    ),
  ]),
];

// --- 6. What happened? -------------------------------------------------------

const WHAT_HAPPENED_ASK = c('What happened?', ['מה קרה?', 'ma kara'], ['شو صار؟', 'shū ṣār']);

const WHAT_HAPPENED: SeedDeck[] = [
  lesson('Saying what happened', [
    answer(WHAT_HAPPENED_ASK, c('I fell', ['נפלתי', 'nafalti'], ['وقعت', 'wʾiʿt'])),
    answer(WHAT_HAPPENED_ASK, c('I missed the bus', ['פספסתי את האוטובוס', 'fisfasti et ha-otobus'], ['فاتني الباص', 'fātni il-bāṣ'])),
    answer(WHAT_HAPPENED_ASK, c('I lost my phone', ['איבדתי את הטלפון שלי', 'ibadti et ha-telefon sheli'], ['ضيّعت تلفوني', 'ḍayyaʿt talafōni'])),
    answer(WHAT_HAPPENED_ASK, c('My leg hurt', ['כאבה לי הרגל', "ka'ava li ha-regel"], ['وجعتني رجلي', 'wijʿatni ijri'])),
    answer(WHAT_HAPPENED_ASK, c('Nothing happened', ['לא קרה כלום', 'lo kara klum'], ['ما صار إشي', 'ma ṣār ishi'])),
  ]),
  lesson('Enough for somebody to understand', [
    c('I fell', ['נפלתי', 'nafalti'], ['وقعت', 'wʾiʿt']),
    c(
      'I was walking home and I fell',
      ['הלכתי הביתה ונפלתי', 'halakhti ha-bayta ve-nafalti'],
      sp('كنت ماشية عالبيت ووقعت', 'kunt māshye ʿal-bēt w-wʾiʿt', 'كنت ماشي عالبيت ووقعت', 'kunt māshi ʿal-bēt w-wʾiʿt'),
    ),
    c(
      'I was walking home and I fell. My leg hurt',
      ['הלכתי הביתה ונפלתי. כאבה לי הרגל', "halakhti ha-bayta ve-nafalti. ka'ava li ha-regel"],
      sp(
        'كنت ماشية عالبيت ووقعت. وجعتني رجلي',
        'kunt māshye ʿal-bēt w-wʾiʿt. wijʿatni ijri',
        'كنت ماشي عالبيت ووقعت. وجعتني رجلي',
        'kunt māshi ʿal-bēt w-wʾiʿt. wijʿatni ijri',
      ),
    ),
    c(
      'I was walking home and I fell. My leg hurt, so I sat down',
      ['הלכתי הביתה ונפלתי. כאבה לי הרגל אז התיישבתי', "halakhti ha-bayta ve-nafalti. ka'ava li ha-regel az hityashavti"],
      sp(
        'كنت ماشية عالبيت ووقعت. وجعتني رجلي فقعدت',
        'kunt māshye ʿal-bēt w-wʾiʿt. wijʿatni ijri fa-ʾʿadt',
        'كنت ماشي عالبيت ووقعت. وجعتني رجلي فقعدت',
        'kunt māshi ʿal-bēt w-wʾiʿt. wijʿatni ijri fa-ʾʿadt',
      ),
    ),
    c(
      'I was walking home and I fell. My leg hurt, so I sat down and called my friend',
      [
        'הלכתי הביתה ונפלתי. כאבה לי הרגל אז התיישבתי והתקשרתי לחברה שלי',
        "halakhti ha-bayta ve-nafalti. ka'ava li ha-regel az hityashavti ve-hitkasharti la-khavera sheli",
      ],
      sp(
        'كنت ماشية عالبيت ووقعت. وجعتني رجلي فقعدت واتّصلت بصاحبتي',
        'kunt māshye ʿal-bēt w-wʾiʿt. wijʿatni ijri fa-ʾʿadt w-ittaṣalt bi-ṣāḥibti',
        'كنت ماشي عالبيت ووقعت. وجعتني رجلي فقعدت واتّصلت بصاحبتي',
        'kunt māshi ʿal-bēt w-wʾiʿt. wijʿatni ijri fa-ʾʿadt w-ittaṣalt bi-ṣāḥibti',
      ),
    ),
  ]),
];

// --- 7. And then what? -------------------------------------------------------

const AND_THEN_ASK = c('And then what?', ['ומה אחר כך?', 'u-ma akhar kakh'], ['وشو صار بعدين؟', 'w-shū ṣār baʿdēn']);
const AND_AFTER_ASK = c('And after that?', ['ואחרי זה?', 've-akharei ze'], ['وبعد هيك؟', 'w-baʿd hēk']);

const AND_THEN_WHAT: SeedDeck[] = [
  lesson('Carrying it on', [
    answer(WHAT_HAPPENED_ASK, c('I missed the bus', ['פספסתי את האוטובוס', 'fisfasti et ha-otobus'], ['فاتني الباص', 'fātni il-bāṣ'])),
    answer(AND_THEN_ASK, c('I called a taxi', ['הזמנתי מונית', 'hizmanti monit'], ['طلبت تكسي', 'ṭalabt taksi'])),
    answer(AND_AFTER_ASK, c('I went home', ['הלכתי הביתה', 'halakhti ha-bayta'], ['رحت عالبيت', 'ruḥt ʿal-bēt'])),
    answer(AND_THEN_ASK, c('I ate and slept', ['אכלתי וישנתי', 'akhalti ve-yashanti'], ['أكلت ونمت', 'akalt w-nimt'])),
    answer(AND_AFTER_ASK, c('That was it', ['וזהו', 've-zehu'], ['وخلص', 'w-khalaṣ'])),
  ]),
  lesson('The same story in one go', [
    c(
      'I missed the bus, so I called a taxi',
      ['פספסתי את האוטובוס אז הזמנתי מונית', 'fisfasti et ha-otobus az hizmanti monit'],
      ['فاتني الباص فطلبت تكسي', 'fātni il-bāṣ fa-ṭalabt taksi'],
    ),
    c(
      'I missed the bus, so I called a taxi. Then I went home',
      ['פספסתי את האוטובוס אז הזמנתי מונית. אחר כך הלכתי הביתה', 'fisfasti et ha-otobus az hizmanti monit. akhar kakh halakhti ha-bayta'],
      ['فاتني الباص فطلبت تكسي. بعدين رحت عالبيت', 'fātni il-bāṣ fa-ṭalabt taksi. baʿdēn ruḥt ʿal-bēt'],
    ),
    c(
      'I missed the bus, so I called a taxi. Then I went home and that was it',
      [
        'פספסתי את האוטובוס אז הזמנתי מונית. אחר כך הלכתי הביתה וזהו',
        'fisfasti et ha-otobus az hizmanti monit. akhar kakh halakhti ha-bayta ve-zehu',
      ],
      [
        'فاتني الباص فطلبت تكسي. بعدين رحت عالبيت وخلص',
        'fātni il-bāṣ fa-ṭalabt taksi. baʿdēn ruḥt ʿal-bēt w-khalaṣ',
      ],
    ),
  ]),
];

// --- 8. Adding one more thing ------------------------------------------------

const WHERE_WERE_YOU = c(
  'Where were you?',
  askedOfHer('איפה היית?', 'eifo hayit', 'איפה היית?', 'eifo hayita'),
  askedOfHer('وين كنتي؟', 'wēn kunti', 'وين كنت؟', 'wēn kunt'),
  { he: SAID.he },
);

const WHO_WITH = c(
  'Who were you with?',
  askedOfHer('עם מי היית?', 'im mi hayit', 'עם מי היית?', 'im mi hayita'),
  askedOfHer('مع مين كنتي؟', 'maʿ mīn kunti', 'مع مين كنت؟', 'maʿ mīn kunt'),
  { he: SAID.he },
);

const HOW_WAS_IT = c('How was it?', ['איך היה?', 'eikh haya'], ['كيف كان؟', 'kīf kān']);
const WHY_ASK = c('Why?', ['למה?', 'lama'], ['ليش؟', 'lēsh']);

const ADDING_DETAIL: SeedDeck[] = [
  lesson('Where, when, who with, why', [
    c('I went out', ['יצאתי', 'yatsati'], ['طلعت', 'ṭliʿt']),
    c('I went to a café', ['הלכתי לבית קפה', 'halakhti le-veit kafe'], ['رحت عالكافيه', 'ruḥt ʿal-kafēh']),
    c('I went to a café yesterday', ['הלכתי לבית קפה אתמול', 'halakhti le-veit kafe etmol'], ['رحت عالكافيه إمبارح', 'ruḥt ʿal-kafēh imbāriḥ']),
    c(
      'I went to a café with my friend yesterday',
      ['הלכתי לבית קפה עם החברה שלי אתמול', 'halakhti le-veit kafe im ha-khavera sheli etmol'],
      ['رحت عالكافيه مع صاحبتي إمبارح', 'ruḥt ʿal-kafēh maʿ ṣāḥibti imbāriḥ'],
    ),
    c(
      'I went to a café with my friend yesterday because we wanted coffee',
      ['הלכתי לבית קפה עם החברה שלי אתמול כי רצינו קפה', 'halakhti le-veit kafe im ha-khavera sheli etmol ki ratsinu kafe'],
      ['رحت عالكافيه مع صاحبتي إمبارح لأنّه كان بدنا قهوة', 'ruḥt ʿal-kafēh maʿ ṣāḥibti imbāriḥ laʾinno kān bidna ʾahwe'],
    ),
  ]),
  lesson('Answering the six questions', [
    answer(WHERE_WERE_YOU, c('At work', ['בעבודה', 'ba-avoda'], ['بالشغل', 'bish-shughul'])),
    answer(WHO_WITH, c('With my friend', ['עם החברה שלי', 'im ha-khavera sheli'], ['مع صاحبتي', 'maʿ ṣāḥibti'])),
    answer(c('When was it?', ['מתי זה היה?', 'matai ze haya'], ['إيمتى كان؟', 'ēmta kān']), c('Yesterday evening', ['אתמול בערב', 'etmol ba-erev'], ['إمبارح بالمسا', 'imbāriḥ bil-masa'])),
    answer(WHY_ASK, c('Because we wanted to see each other', ['כי רצינו להיפגש', 'ki ratsinu lehipagesh'], ['لأنّه كان بدنا نتلاقى', 'laʾinno kān bidna nitlāʾa'])),
    answer(HOW_WAS_IT, c('It was really nice', ['היה ממש נחמד', 'haya mamash nekhmad'], ['كان كتير حلو', 'kān ktīr ḥilu'])),
  ]),
  lesson('One more detail each time', [
    c('I worked yesterday', ['עבדתי אתמול', 'avadti etmol'], ['اشتغلت إمبارح', 'ishtaghalt imbāriḥ']),
    c('I worked at home yesterday', ['עבדתי בבית אתמול', 'avadti ba-bayit etmol'], ['اشتغلت بالبيت إمبارح', 'ishtaghalt bil-bēt imbāriḥ']),
    c(
      'I worked at home yesterday and I was tired',
      sp('עבדתי בבית אתמול והייתי עייפה', 'avadti ba-bayit etmol ve-hayiti ayefa', 'עבדתי בבית אתמול והייתי עייף', 'avadti ba-bayit etmol ve-hayiti ayef'),
      sp('اشتغلت بالبيت إمبارح وكنت تعبانة', 'ishtaghalt bil-bēt imbāriḥ w-kunt taʿbāne', 'اشتغلت بالبيت إمبارح وكنت تعبان', 'ishtaghalt bil-bēt imbāriḥ w-kunt taʿbān'),
    ),
    c(
      'I worked at home yesterday and I was tired, but it was a good day',
      sp(
        'עבדתי בבית אתמול והייתי עייפה, אבל היה יום טוב',
        'avadti ba-bayit etmol ve-hayiti ayefa, aval haya yom tov',
        'עבדתי בבית אתמול והייתי עייף, אבל היה יום טוב',
        'avadti ba-bayit etmol ve-hayiti ayef, aval haya yom tov',
      ),
      sp(
        'اشتغلت بالبيت إمبارح وكنت تعبانة، بس كان يوم منيح',
        'ishtaghalt bil-bēt imbāriḥ w-kunt taʿbāne, bass kān yōm mnīḥ',
        'اشتغلت بالبيت إمبارح وكنت تعبان، بس كان يوم منيح',
        'ishtaghalt bil-bēt imbāriḥ w-kunt taʿbān, bass kān yōm mnīḥ',
      ),
    ),
  ]),
];

// --- 9. Tell me about a person -----------------------------------------------

const TELL_ME_ABOUT_HER = c(
  'Tell me about your friend',
  askedOfHer('ספרי לי על החברה שלך', 'sapri li al ha-khavera shelakh', 'ספר לי על החברה שלך', 'saper li al ha-khavera shelkha'),
  askedOfHer('احكيلي عن صاحبتك', 'iḥkīli ʿan ṣāḥibtik', 'احكيلي عن صاحبتك', 'iḥkīli ʿan ṣāḥibtak'),
);

const WHAT_IS_SHE_LIKE = c('What is she like?', ['איך היא?', 'eikh hi'], ['كيف هي؟', 'kīf hiyye']);

const ABOUT_A_PERSON: SeedDeck[] = [
  lesson('What she is like', [
    answer(WHAT_IS_SHE_LIKE, c('She is nice', ['היא נחמדה', 'hi nekhmada'], ['هي لطيفة', 'hiyye laṭīfe'])),
    answer(WHAT_IS_SHE_LIKE, c('She is very nice and funny', ['היא מאוד נחמדה ומצחיקה', "hi me'od nekhmada u-matskhika"], ['هي كتير لطيفة ومضحكة', 'hiyye ktīr laṭīfe w-muḍḥike'])),
    answer(WHAT_IS_SHE_LIKE, c('She is quiet', ['היא שקטה', 'hi shketa'], ['هي هادية', 'hiyye hādye'])),
    answer(WHAT_IS_SHE_LIKE, c('He is a good person', ['הוא בן אדם טוב', 'hu ben adam tov'], ['هو زلمة منيح', 'huwwe zalame mnīḥ'])),
  ]),
  lesson('Where she lives, what she does', [
    c('She lives nearby', ['היא גרה קרוב', 'hi gara karov'], ['هي ساكنة قريب', 'hiyye sākne ʾarīb']),
    c('She works at a school', ['היא עובדת בבית ספר', 'hi ovedet be-veit sefer'], ['هي بتشتغل بمدرسة', 'hiyye btishtighel bi-madrase']),
    c('We met at work', ['נפגשנו בעבודה', 'nifgashnu ba-avoda'], ['تلاقينا بالشغل', 'tlāʾēna bish-shughul']),
    c(
      'I have known her a long time',
      sp('אני מכירה אותה הרבה זמן', 'ani makira ota harbe zman', 'אני מכיר אותה הרבה זמן', 'ani makir ota harbe zman'),
      ['بعرفها من زمان', 'baʿrifha min zamān'],
    ),
  ]),
  lesson('All of it at once', [
    answer(
      TELL_ME_ABOUT_HER,
      c(
        'She is very nice and funny. She lives nearby and works at a school',
        [
          'היא מאוד נחמדה ומצחיקה. היא גרה קרוב ועובדת בבית ספר',
          "hi me'od nekhmada u-matskhika. hi gara karov ve-ovedet be-veit sefer",
        ],
        [
          'هي كتير لطيفة ومضحكة. ساكنة قريب وبتشتغل بمدرسة',
          'hiyye ktīr laṭīfe w-muḍḥike. sākne ʾarīb w-btishtighel bi-madrase',
        ],
      ),
    ),
    answer(
      TELL_ME_ABOUT_HER,
      c(
        'We met at work and I have known her a long time',
        sp(
          'נפגשנו בעבודה ואני מכירה אותה הרבה זמן',
          'nifgashnu ba-avoda ve-ani makira ota harbe zman',
          'נפגשנו בעבודה ואני מכיר אותה הרבה זמן',
          'nifgashnu ba-avoda ve-ani makir ota harbe zman',
        ),
        ['تلاقينا بالشغل وبعرفها من زمان', 'tlāʾēna bish-shughul w-baʿrifha min zamān'],
      ),
    ),
  ]),
];

// --- 10. Tell me about a place -----------------------------------------------

const WHAT_IS_IT_LIKE = c('What is it like?', ['איך זה?', 'eikh ze'], ['كيف هو؟', 'kīf huwwe']);

const ABOUT_A_PLACE: SeedDeck[] = [
  lesson('What the place is like', [
    answer(WHAT_IS_IT_LIKE, c('It is big', ['זה גדול', 'ze gadol'], ['هو كبير', 'huwwe kbīr'])),
    answer(WHAT_IS_IT_LIKE, c('It is small and quiet', ['זה קטן ושקט', 'ze katan ve-shaket'], ['هو صغير وهادي', 'huwwe zghīr w-hādi'])),
    answer(WHAT_IS_IT_LIKE, c('There are a lot of people there', ['יש שם הרבה אנשים', 'yesh sham harbe anashim'], ['فيه كتير ناس', 'fī ktīr nās'])),
    answer(WHAT_IS_IT_LIKE, c('It is far from here', ['זה רחוק מפה', 'ze rakhok mi-po'], ['هو بعيد من هون', 'huwwe baʿīd min hōn'])),
    answer(WHAT_IS_IT_LIKE, c('It is close to the sea', ['זה קרוב לים', 'ze karov la-yam'], ['هو قريب عالبحر', 'huwwe ʾarīb ʿal-baḥr'])),
  ]),
  lesson('Where I live', [
    c(
      'I live in a small town',
      sp('אני גרה בעיר קטנה', 'ani gara be-ir ktana', 'אני גר בעיר קטנה', 'ani gar be-ir ktana'),
      sp('أنا ساكنة ببلد صغير', 'ana sākne bi-balad zghīr', 'أنا ساكن ببلد صغير', 'ana sāken bi-balad zghīr'),
    ),
    c(
      'It is quiet, but there are a lot of cafés',
      ['זה שקט אבל יש הרבה בתי קפה', 'ze shaket aval yesh harbe batei kafe'],
      ['هادي بس فيه كتير كافيهات', 'hādi bass fī ktīr kafēhāt'],
    ),
    c(
      'I live in a small town. It is quiet, but there are a lot of cafés. I like it because it is close to the sea',
      sp(
        'אני גרה בעיר קטנה. זה שקט אבל יש הרבה בתי קפה. אני אוהבת את זה כי זה קרוב לים',
        'ani gara be-ir ktana. ze shaket aval yesh harbe batei kafe. ani ohevet et ze ki ze karov la-yam',
        'אני גר בעיר קטנה. זה שקט אבל יש הרבה בתי קפה. אני אוהב את זה כי זה קרוב לים',
        'ani gar be-ir ktana. ze shaket aval yesh harbe batei kafe. ani ohev et ze ki ze karov la-yam',
      ),
      sp(
        'أنا ساكنة ببلد صغير. هادي بس فيه كتير كافيهات. بحبّه لأنّه قريب عالبحر',
        'ana sākne bi-balad zghīr. hādi bass fī ktīr kafēhāt. baḥibbo laʾinno ʾarīb ʿal-baḥr',
        'أنا ساكن ببلد صغير. هادي بس فيه كتير كافيهات. بحبّه لأنّه قريب عالبحر',
        'ana sāken bi-balad zghīr. hādi bass fī ktīr kafēhāt. baḥibbo laʾinno ʾarīb ʿal-baḥr',
      ),
    ),
  ]),
];

// --- 11. Tell me about a thing -----------------------------------------------

const ABOUT_A_THING: SeedDeck[] = [
  lesson('What it looks like', [
    c('It is small and black', ['זה קטן ושחור', 'ze katan ve-shakhor'], ['هو صغير وأسود', 'huwwe zghīr w-aswad']),
    c('It is old, but it still works', ['זה ישן אבל זה עדיין עובד', 'ze yashan aval ze adayin oved'], ['هو قديم بس لسّه بيشتغل', 'huwwe ʾadīm bass lissa bishtighel']),
    c('It is the red one on the table', ['זה האדום על השולחן', 'ze ha-adom al ha-shulkhan'], ['هو الأحمر اللي عالطاولة', 'huwwe il-aḥmar illi ʿaṭ-ṭāwle']),
    c('It is new and it is not expensive', ['זה חדש וזה לא יקר', 'ze khadash ve-ze lo yakar'], ['هو جديد ومش غالي', 'huwwe jdīd w-mish ghāli']),
  ]),
];

// --- 12. Tell me how it was --------------------------------------------------

const HOW_IS_THE_FOOD = c('How is the food?', ['איך האוכל?', 'eikh ha-okhel'], ['كيف الأكل؟', 'kīf il-akl']);

const HOW_IT_WAS: SeedDeck[] = [
  lesson('How it was', [
    answer(HOW_WAS_IT, c('It was fun', ['היה כיף', 'haya keif'], ['كان حلو', 'kān ḥilu'])),
    answer(HOW_WAS_IT, c('It was difficult', ['היה קשה', 'haya kashe'], ['كان صعب', 'kān ṣaʿb'])),
    answer(HOW_WAS_IT, c('It was easy', ['היה קל', 'haya kal'], ['كان سهل', 'kān sahl'])),
    answer(HOW_WAS_IT, c('It was interesting', ['היה מעניין', "haya me'anyen"], ['كان ممتع', 'kān mumteʿ'])),
    answer(HOW_WAS_IT, c('I liked it', ['אהבתי את זה', 'ahavti et ze'], ['عجبني', 'ʿajabni'])),
    answer(HOW_WAS_IT, c('I did not like it', ['לא אהבתי את זה', 'lo ahavti et ze'], ['ما عجبني', 'ma ʿajabni'])),
  ]),
  lesson('It got easier', [
    c('It was difficult at first', ['היה קשה בהתחלה', 'haya kashe ba-hatkhala'], ['كان صعب بالبداية', 'kān ṣaʿb bil-bidāye']),
    c(
      'It was difficult at first, but then it got easier',
      ['היה קשה בהתחלה אבל אחר כך זה נהיה קל יותר', 'haya kashe ba-hatkhala aval akhar kakh ze nihya kal yoter'],
      ['كان صعب بالبداية بس بعدين صار أسهل', 'kān ṣaʿb bil-bidāye bass baʿdēn ṣār ashal'],
    ),
    c(
      'I liked it because everyone was friendly',
      ['אהבתי את זה כי כולם היו נחמדים', 'ahavti et ze ki kulam hayu nekhmadim'],
      ['عجبني لأنّ الكل كانوا لطاف', 'ʿajabni laʾinn il-kull kānu lṭāf'],
    ),
  ]),
  lesson('How the food was', [
    answer(HOW_IS_THE_FOOD, c('It is very sweet', ['זה מאוד מתוק', "ze me'od matok"], ['هو كتير حلو', 'huwwe ktīr ḥilu'])),
    answer(HOW_IS_THE_FOOD, c('It is too salty', ['זה מלוח מדי', 'ze maluakh miday'], ['مالح كتير', 'māleḥ ktīr'])),
    answer(HOW_IS_THE_FOOD, c('It is spicy', ['זה חריף', 'ze kharif'], ['حرّاق', 'ḥarrāʾ'])),
    answer(
      HOW_IS_THE_FOOD,
      c(
        'It is very sweet, but I like it',
        sp('זה מאוד מתוק אבל אני אוהבת את זה', "ze me'od matok aval ani ohevet et ze", 'זה מאוד מתוק אבל אני אוהב את זה', "ze me'od matok aval ani ohev et ze"),
        ['كتير حلو بس بحبّه', 'ktīr ḥilu bass baḥibbo'],
      ),
    ),
    answer(
      HOW_IS_THE_FOOD,
      c('I liked it because it was fresh', ['אהבתי את זה כי זה היה טרי', 'ahavti et ze ki ze haya tari'], ['عجبني لأنّه كان طازة', 'ʿajabni laʾinno kān ṭāza']),
    ),
  ]),
];

// --- 13. When you do not know the word ---------------------------------------

const AROUND_THE_WORD: SeedDeck[] = [
  lesson('Saying it another way', [
    c(
      'I do not know how you say it',
      sp('אני לא יודעת איך אומרים את זה', "ani lo yoda'at eikh omrim et ze", 'אני לא יודע איך אומרים את זה', "ani lo yode'a eikh omrim et ze"),
      ['ما بعرف كيف بيقولوها', 'ma baʿref kīf biʾūluha'],
    ),
    c(
      'I do not know what it is called',
      sp('אני לא יודעת איך קוראים לזה', "ani lo yoda'at eikh kor'im le-ze", 'אני לא יודע איך קוראים לזה', "ani lo yode'a eikh kor'im le-ze"),
      ['ما بعرف شو اسمه', 'ma baʿref shū ismo'],
    ),
    c('It is something for the kitchen', ['זה משהו למטבח', 'ze mashehu la-mitbakh'], ['هاي إشي للمطبخ', 'hāy ishi lal-maṭbakh']),
    c('It is like a chair', ['זה כמו כיסא', 'ze kmo kise'], ['زي كرسي', 'zayy kursi']),
    c('It is the thing over there', ['זה הדבר ההוא שם', 'ze ha-davar ha-hu sham'], ['هو الإشي اللي هناك', 'huwwe il-ishi illi hnāk']),
    c('How do you say that?', ['איך אומרים את זה?', 'eikh omrim et ze'], ['كيف بتقولوا هاد؟', 'kīf bitʾūlu hād']),
  ]),
  lesson('Keeping going anyway', [
    c('I forgot the word', ['שכחתי את המילה', 'shakhakhti et ha-mila'], ['نسيت الكلمة', 'nsīt il-kilme']),
    c('Wait, how do I say this', ['רגע, איך אומרים את זה', 'rega, eikh omrim et ze'], ['لحظة، كيف بقول هاد', 'laḥẓa, kīf baʾūl hād']),
    c('More or less', ['פחות או יותר', 'pakhot o yoter'], ['تقريباً', 'taʾrīban']),
    c(
      'Do you understand me?',
      askedOfHer('את מבינה אותי?', 'at mevina oti', 'אתה מבין אותי?', 'ata mevin oti'),
      askedOfHer('فهمتي عليّ؟', 'fhimti ʿalayy', 'فهمت عليّ؟', 'fhimt ʿalayy'),
      { he: 'The gender here is yours: this is the question somebody asks you.' },
    ),
  ]),
];

// --- 14. Longer and shorter --------------------------------------------------

const LONGER_AND_SHORTER: SeedDeck[] = [
  lesson('The short version', [
    c('In short', ['בקיצור', 'bekitsur'], ['بالمختصر', 'bil-mukhtaṣar']),
    c('In short, it was good', ['בקיצור, היה טוב', 'bekitsur, haya tov'], ['بالمختصر، كان منيح', 'bil-mukhtaṣar, kān mnīḥ']),
    c(
      'I went for coffee with my friend, then went home',
      [
        'הלכתי לשתות קפה עם החברה שלי ואחר כך הלכתי הביתה',
        'halakhti lishtot kafe im ha-khavera sheli ve-akhar kakh halakhti ha-bayta',
      ],
      [
        'رحت أشرب قهوة مع صاحبتي وبعدين رحت عالبيت',
        'ruḥt ashrab ʾahwe maʿ ṣāḥibti w-baʿdēn ruḥt ʿal-bēt',
      ],
    ),
    c('That is it, more or less', ['זהו, פחות או יותר', 'zehu, pakhot o yoter'], ['هاد هو، تقريباً', 'hād huwwe, taʾrīban']),
  ]),
];

// --- 15. The little words ----------------------------------------------------

const LITTLE_WORDS: SeedDeck[] = [
  lesson('The small words', [
    c('I mean', ['כאילו', "ke'ilu"], ['يعني', 'yaʿni'], {
      ar: 'The commonest word in spoken Palestinian for filling a gap while you think.',
    }),
    c('actually', ['בעצם', "be'etsem"], ['بالحقيقة', 'bil-ḥaʾīʾa']),
    c('honestly', ['האמת', 'ha-emet'], ['بصراحة', 'bi-ṣarāḥa']),
    c('anyway', ['בכל אופן', 'be-khol ofen'], ['المهم', 'il-muhimm'], {
      ar: 'Literally "the important thing" — used exactly where English says "anyway".',
    }),
    c('right', ['טוב', 'tov'], ['طيّب', 'ṭayyeb']),
    c(
      'you know',
      askedOfHer('את יודעת', "at yoda'at", 'אתה יודע', "ata yode'a"),
      askedOfHer('بتعرفي', 'btaʿrafi', 'بتعرف', 'btaʿref'),
      { he: 'Addressed to you, so the ending is yours.' },
    ),
    c('and that is it', ['וזהו', 've-zehu'], ['وخلص', 'w-khalaṣ']),
  ]),
  lesson('Using them in a story', [
    c('Anyway, in the end I went home', ['בכל אופן, בסוף הלכתי הביתה', 'be-khol ofen, ba-sof halakhti ha-bayta'], ['المهم، بالآخر رحت عالبيت', 'il-muhimm, bil-ākhir ruḥt ʿal-bēt']),
    c('Honestly, it was a bit hard', ['האמת, היה קצת קשה', 'ha-emet, haya ktsat kashe'], ['بصراحة، كان شوي صعب', 'bi-ṣarāḥa, kān shwayy ṣaʿb']),
    c('I mean, it was fine', ['כאילו, היה בסדר', "ke'ilu, haya beseder"], ['يعني، كان منيح', 'yaʿni, kān mnīḥ']),
    c('Okay, so I went there', ['טוב, אז הלכתי לשם', 'tov, az halakhti lesham'], ['طيّب، رحت لهناك', 'ṭayyeb, ruḥt la-hnāk']),
  ]),
];

// --- building from questions -------------------------------------------------

/**
 * One answer she may give, in two shapes.
 *
 * `said` is the answer on its own, the way anybody answers a single question —
 * "At work." `joined` is the same answer as it reads once the four answers are
 * one piece of speech: a whole clause, carrying whatever connector it needs to
 * follow the one before it. Two shapes rather than one because that difference
 * *is* the skill — a learner who only ever meets "At work" has no way to reach
 * "I was at work and I saw my friend."
 */
export type BuildAnswer = {
  said: SeedCard;
  joined: SeedCard;
};

export type BuildQuestion = {
  ask: SeedCard;
  answers: BuildAnswer[];
};

export type StoryBuild = {
  id: string;
  name: string;
  /** The prompt the whole thing is an answer to. */
  prompt: string;
  questions: BuildQuestion[];
};

/**
 * Answer four small questions, then read the four answers back as one thing.
 *
 * Every `joined` fragment is written so that it follows *any* choice made
 * before it, which is what makes the exercise honest: there is no single
 * correct story, only her own four answers, and every combination has to come
 * out as something a person would say.
 */
export const STORY_BUILDS: StoryBuild[] = [
  {
    id: 'day',
    name: 'Tell me about your day',
    prompt: 'Four questions about today. Then all four answers, said as one.',
    questions: [
      {
        ask: WHERE_WERE_YOU,
        answers: [
          {
            said: c('At work', ['בעבודה', 'ba-avoda'], ['بالشغل', 'bish-shughul']),
            joined: c('I was at work', ['הייתי בעבודה', 'hayiti ba-avoda'], ['كنت بالشغل', 'kunt bish-shughul']),
          },
          {
            said: c('At home', ['בבית', 'ba-bayit'], ['بالبيت', 'bil-bēt']),
            joined: c('I was at home', ['הייתי בבית', 'hayiti ba-bayit'], ['كنت بالبيت', 'kunt bil-bēt']),
          },
          {
            said: c('In town', ['בעיר', 'ba-ir'], ['بالبلد', 'bil-balad']),
            joined: c('I was in town', ['הייתי בעיר', 'hayiti ba-ir'], ['كنت بالبلد', 'kunt bil-balad']),
          },
        ],
      },
      {
        ask: WHAT_DID_YOU_DO_TODAY,
        answers: [
          {
            said: c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt']),
            joined: c('I worked all day', ['עבדתי כל היום', 'avadti kol ha-yom'], ['اشتغلت طول اليوم', 'ishtaghalt ṭūl il-yōm']),
          },
          {
            said: c('I saw my friend', ['ראיתי את החברה שלי', "ra'iti et ha-khavera sheli"], ['شفت صاحبتي', 'shuft ṣāḥibti']),
            joined: c('and I saw my friend', ['וראיתי את החברה שלי', "ve-ra'iti et ha-khavera sheli"], ['وشفت صاحبتي', 'w-shuft ṣāḥibti']),
          },
          {
            said: c('I studied', ['למדתי', 'lamadti'], ['درست', 'darast']),
            joined: c('and I studied a bit', ['ולמדתי קצת', 've-lamadti ktsat'], ['ودرست شوي', 'w-darast shwayy']),
          },
        ],
      },
      {
        ask: HOW_WAS_IT,
        answers: [
          {
            said: c('Good', ['טוב', 'tov'], ['منيح', 'mnīḥ']),
            joined: c('It was good', ['היה טוב', 'haya tov'], ['كان منيح', 'kān mnīḥ']),
          },
          {
            said: c('A bit hard', ['קצת קשה', 'ktsat kashe'], ['شوي صعب', 'shwayy ṣaʿb']),
            joined: c('It was a bit hard', ['היה קצת קשה', 'haya ktsat kashe'], ['كان شوي صعب', 'kān shwayy ṣaʿb']),
          },
          {
            said: c('Long', ['ארוך', 'arokh'], ['طويل', 'ṭawīl']),
            joined: c('It was a long day', ['היה יום ארוך', 'haya yom arokh'], ['كان يوم طويل', 'kān yōm ṭawīl']),
          },
        ],
      },
      {
        ask: AND_AFTER_ASK,
        answers: [
          {
            said: c('I went home', ['הלכתי הביתה', 'halakhti ha-bayta'], ['رحت عالبيت', 'ruḥt ʿal-bēt']),
            joined: c('so I went home', ['אז הלכתי הביתה', 'az halakhti ha-bayta'], ['فرحت عالبيت', 'fa-ruḥt ʿal-bēt']),
          },
          {
            said: c('I ate and slept', ['אכלתי וישנתי', 'akhalti ve-yashanti'], ['أكلت ونمت', 'akalt w-nimt']),
            joined: c('Then I ate and slept', ['אחר כך אכלתי וישנתי', 'akhar kakh akhalti ve-yashanti'], ['بعدين أكلت ونمت', 'baʿdēn akalt w-nimt']),
          },
          {
            said: c('I stayed there', ['נשארתי שם', "nish'arti sham"], ['ضلّيت هناك', 'ḍallēt hnāk']),
            joined: c('and I stayed there', ['ונשארתי שם', "ve-nish'arti sham"], ['وضلّيت هناك', 'w-ḍallēt hnāk']),
          },
        ],
      },
    ],
  },
  {
    id: 'home',
    name: 'Tell me where you live',
    prompt: 'The same four steps, turned on a place instead of a day.',
    questions: [
      {
        ask: c(
          'Where do you live?',
          askedOfHer('איפה את גרה?', 'eifo at gara', 'איפה אתה גר?', 'eifo ata gar'),
          askedOfHer('وين ساكنة؟', 'wēn sākne', 'وين ساكن؟', 'wēn sāken'),
        ),
        answers: [
          {
            said: c('In Haifa', ['בחיפה', 'be-khaifa'], ['بحيفا', 'bi-ḥayfa']),
            joined: c(
              'I live in Haifa',
              sp('אני גרה בחיפה', 'ani gara be-khaifa', 'אני גר בחיפה', 'ani gar be-khaifa'),
              sp('أنا ساكنة بحيفا', 'ana sākne bi-ḥayfa', 'أنا ساكن بحيفا', 'ana sāken bi-ḥayfa'),
            ),
          },
          {
            said: c('Near the sea', ['קרוב לים', 'karov la-yam'], ['قريب عالبحر', 'ʾarīb ʿal-baḥr']),
            joined: c(
              'I live near the sea',
              sp('אני גרה קרוב לים', 'ani gara karov la-yam', 'אני גר קרוב לים', 'ani gar karov la-yam'),
              sp('أنا ساكنة قريب عالبحر', 'ana sākne ʾarīb ʿal-baḥr', 'أنا ساكن قريب عالبحر', 'ana sāken ʾarīb ʿal-baḥr'),
            ),
          },
          {
            said: c('In a small town', ['בעיר קטנה', 'be-ir ktana'], ['ببلد صغير', 'bi-balad zghīr']),
            joined: c(
              'I live in a small town',
              sp('אני גרה בעיר קטנה', 'ani gara be-ir ktana', 'אני גר בעיר קטנה', 'ani gar be-ir ktana'),
              sp('أنا ساكنة ببلد صغير', 'ana sākne bi-balad zghīr', 'أنا ساكن ببلد صغير', 'ana sāken bi-balad zghīr'),
            ),
          },
        ],
      },
      {
        ask: c('Is it big or small?', ['זה גדול או קטן?', 'ze gadol o katan'], ['كبير ولا صغير؟', 'kbīr walla zghīr']),
        answers: [
          {
            said: c('Big', ['גדול', 'gadol'], ['كبير', 'kbīr']),
            joined: c('It is a big place', ['זה מקום גדול', 'ze makom gadol'], ['هو محل كبير', 'huwwe maḥall kbīr']),
          },
          {
            said: c('Small', ['קטן', 'katan'], ['صغير', 'zghīr']),
            joined: c('It is a small place', ['זה מקום קטן', 'ze makom katan'], ['هو محل صغير', 'huwwe maḥall zghīr']),
          },
          {
            said: c('Not big and not small', ['לא גדול ולא קטן', 'lo gadol ve-lo katan'], ['لا كبير ولا صغير', 'la kbīr wala zghīr']),
            joined: c('It is not big and not small', ['זה לא גדול ולא קטן', 'ze lo gadol ve-lo katan'], ['هو لا كبير ولا صغير', 'huwwe la kbīr wala zghīr']),
          },
        ],
      },
      {
        ask: c(
          'Do you like it?',
          askedOfHer('את אוהבת את זה?', 'at ohevet et ze', 'אתה אוהב את זה?', 'ata ohev et ze'),
          askedOfHer('بتحبّيه؟', 'bitḥibbī', 'بتحبّه؟', 'bitḥibbo'),
        ),
        answers: [
          {
            said: c('Yes, a lot', ['כן, מאוד', "ken, me'od"], ['آه كتير', 'āh ktīr']),
            joined: c(
              'and I like it a lot',
              sp('ואני מאוד אוהבת את זה', "ve-ani me'od ohevet et ze", 'ואני מאוד אוהב את זה', "ve-ani me'od ohev et ze"),
              ['وبحبّه كتير', 'w-baḥibbo ktīr'],
            ),
          },
          {
            said: c('Yes, it is fine', ['כן, זה בסדר', 'ken, ze beseder'], ['آه، منيح', 'āh, mnīḥ']),
            joined: c('and it is fine', ['וזה בסדר', 've-ze beseder'], ['وهو منيح', 'w-huwwe mnīḥ']),
          },
          {
            said: c('Not so much', ['לא כל כך', 'lo kol kakh'], ['مش كتير', 'mish ktīr']),
            joined: c(
              'but I do not like it so much',
              sp('אבל אני לא כל כך אוהבת את זה', 'aval ani lo kol kakh ohevet et ze', 'אבל אני לא כל כך אוהב את זה', 'aval ani lo kol kakh ohev et ze'),
              ['بس ما بحبّه كتير', 'bass ma baḥibbo ktīr'],
            ),
          },
        ],
      },
      {
        ask: WHY_ASK,
        answers: [
          {
            said: c('Because it is beautiful', ['כי זה יפה', 'ki ze yafe'], ['لأنّه حلو', 'laʾinno ḥilu']),
            joined: c('because it is beautiful', ['כי זה יפה', 'ki ze yafe'], ['لأنّه حلو', 'laʾinno ḥilu']),
          },
          {
            said: c('Because it is quiet', ['כי זה שקט', 'ki ze shaket'], ['لأنّه هادي', 'laʾinno hādi']),
            joined: c('because it is quiet', ['כי זה שקט', 'ki ze shaket'], ['لأنّه هادي', 'laʾinno hādi']),
          },
          {
            said: c('Because everyone is here', ['כי כולם פה', 'ki kulam po'], ['لأنّ الكل هون', 'laʾinn il-kull hōn']),
            joined: c('because everyone is here', ['כי כולם פה', 'ki kulam po'], ['لأنّ الكل هون', 'laʾinn il-kull hōn']),
          },
        ],
      },
    ],
  },
  {
    id: 'happened',
    name: 'Tell me what happened',
    prompt: 'Where, who with, what happened, how it felt — then the whole story.',
    questions: [
      {
        ask: WHERE_WERE_YOU,
        answers: [
          {
            said: c('In the street', ['ברחוב', 'ba-rekhov'], ['بالشارع', 'bish-shāreʿ']),
            joined: c('I was in the street', ['הייתי ברחוב', 'hayiti ba-rekhov'], ['كنت بالشارع', 'kunt bish-shāreʿ']),
          },
          {
            said: c('At work', ['בעבודה', 'ba-avoda'], ['بالشغل', 'bish-shughul']),
            joined: c('I was at work', ['הייתי בעבודה', 'hayiti ba-avoda'], ['كنت بالشغل', 'kunt bish-shughul']),
          },
          {
            said: c('At home', ['בבית', 'ba-bayit'], ['بالبيت', 'bil-bēt']),
            joined: c('I was at home', ['הייתי בבית', 'hayiti ba-bayit'], ['كنت بالبيت', 'kunt bil-bēt']),
          },
        ],
      },
      {
        ask: WHO_WITH,
        answers: [
          {
            said: c('Alone', ['לבד', 'levad'], ['لحالي', 'la-ḥāli']),
            joined: c('I was on my own', ['הייתי לבד', 'hayiti levad'], ['كنت لحالي', 'kunt la-ḥāli']),
          },
          {
            said: c('With my friend', ['עם החברה שלי', 'im ha-khavera sheli'], ['مع صاحبتي', 'maʿ ṣāḥibti']),
            joined: c('and my friend was with me', ['והחברה שלי הייתה איתי', 've-ha-khavera sheli hayta iti'], ['وصاحبتي كانت معي', 'w-ṣāḥibti kānat maʿi']),
          },
          {
            said: c('With my family', ['עם המשפחה שלי', 'im ha-mishpakha sheli'], ['مع عيلتي', 'maʿ ʿēlti']),
            joined: c('and my family was with me', ['והמשפחה שלי הייתה איתי', 've-ha-mishpakha sheli hayta iti'], ['وعيلتي كانت معي', 'w-ʿēlti kānat maʿi']),
          },
        ],
      },
      {
        ask: WHAT_HAPPENED_ASK,
        answers: [
          {
            said: c('I fell', ['נפלתי', 'nafalti'], ['وقعت', 'wʾiʿt']),
            joined: c('and I fell', ['ונפלתי', 've-nafalti'], ['ووقعت', 'w-wʾiʿt']),
          },
          {
            said: c('I missed the bus', ['פספסתי את האוטובוס', 'fisfasti et ha-otobus'], ['فاتني الباص', 'fātni il-bāṣ']),
            joined: c('and I missed the bus', ['ופספסתי את האוטובוס', 've-fisfasti et ha-otobus'], ['وفاتني الباص', 'w-fātni il-bāṣ']),
          },
          {
            said: c('I forgot my phone', ['שכחתי את הטלפון שלי', 'shakhakhti et ha-telefon sheli'], ['نسيت تلفوني', 'nsīt talafōni']),
            joined: c('and I forgot my phone', ['ושכחתי את הטלפון שלי', 've-shakhakhti et ha-telefon sheli'], ['ونسيت تلفوني', 'w-nsīt talafōni']),
          },
        ],
      },
      {
        ask: c(
          'How did you feel?',
          askedOfHer('איך הרגשת?', 'eikh hirgashat', 'איך הרגשת?', 'eikh hirgashta'),
          askedOfHer('كيف حسّيتي؟', 'kīf ḥassēti', 'كيف حسّيت؟', 'kīf ḥassēt'),
          { he: SAID.he },
        ),
        answers: [
          {
            said: c('I was tired', sp('הייתי עייפה', 'hayiti ayefa', 'הייתי עייף', 'hayiti ayef'), sp('كنت تعبانة', 'kunt taʿbāne', 'كنت تعبان', 'kunt taʿbān')),
            joined: c(
              'so I was tired',
              sp('אז הייתי עייפה', 'az hayiti ayefa', 'אז הייתי עייף', 'az hayiti ayef'),
              sp('فكنت تعبانة', 'fa-kunt taʿbāne', 'فكنت تعبان', 'fa-kunt taʿbān'),
            ),
          },
          {
            said: c('It was not nice', ['זה לא היה נעים', "ze lo haya na'im"], ['ما كان حلو', 'ma kān ḥilu']),
            joined: c('and it was not nice', ['וזה לא היה נעים', "ve-ze lo haya na'im"], ['وما كان حلو', 'w-ma kān ḥilu']),
          },
          {
            said: c('In the end it was fine', ['בסוף היה בסדר', 'ba-sof haya beseder'], ['بالآخر كان منيح', 'bil-ākhir kān mnīḥ']),
            joined: c('but in the end it was fine', ['אבל בסוף היה בסדר', 'aval ba-sof haya beseder'], ['بس بالآخر كان منيح', 'bass bil-ākhir kān mnīḥ']),
          },
        ],
      },
    ],
  },
];

// --- short stories to listen to ----------------------------------------------

/** One plain question about a story, with the choices it is answered from. */
export type StoryQuestion = {
  ask: string;
  options: string[];
  /** Index into `options`. */
  correct: number;
};

export type ShortStory = {
  id: string;
  name: string;
  /** The story, one sentence a line, in the order it is told. */
  lines: SeedCard[];
  questions: StoryQuestion[];
};

/**
 * Very short stories, built entirely out of language the level has taught.
 *
 * Narrative listening rather than a listening level: three sentences, heard as
 * one run, then asked about in English. The point is that the connectors do
 * their work *in the ear* — that "so" and "then" and "because" are what let
 * somebody follow a story they are only hearing once.
 */
export const SHORT_STORIES: ShortStory[] = [
  {
    id: 'workday',
    name: 'A day at work',
    lines: [
      c('Yesterday I worked until five', ['אתמול עבדתי עד חמש', 'etmol avadti ad khamesh'], ['إمبارح اشتغلت لحدّ الخمسة', 'imbāriḥ ishtaghalt la-ḥadd il-khamse']),
      c('Then I went home and ate', ['אחר כך הלכתי הביתה ואכלתי', 'akhar kakh halakhti ha-bayta ve-akhalti'], ['بعدين رحت عالبيت وأكلت', 'baʿdēn ruḥt ʿal-bēt w-akalt']),
      c(
        'I was tired, so I went to sleep early',
        sp('הייתי עייפה אז הלכתי לישון מוקדם', 'hayiti ayefa az halakhti lishon mukdam', 'הייתי עייף אז הלכתי לישון מוקדם', 'hayiti ayef az halakhti lishon mukdam'),
        sp('كنت تعبانة فنمت بكّير', 'kunt taʿbāne fa-nimt bakkīr', 'كنت تعبان فنمت بكّير', 'kunt taʿbān fa-nimt bakkīr'),
      ),
    ],
    questions: [
      { ask: 'Where was she?', options: ['At work', 'At a café', 'At school'], correct: 0 },
      { ask: 'What time did she finish?', options: ['Three', 'Five', 'Seven'], correct: 1 },
      { ask: 'What did she do after work?', options: ['She went out', 'She went home and ate', 'She kept working'], correct: 1 },
      { ask: 'Why did she sleep early?', options: ['Because she was tired', 'Because it was cold', 'Because she was hungry'], correct: 0 },
    ],
  },
  {
    id: 'bus',
    name: 'The bus',
    lines: [
      c('I went out in the morning', ['יצאתי בבוקר', 'yatsati ba-boker'], ['طلعت الصبح', 'ṭliʿt iṣ-ṣubḥ']),
      c(
        'I missed the bus, so I called a taxi',
        ['פספסתי את האוטובוס אז הזמנתי מונית', 'fisfasti et ha-otobus az hizmanti monit'],
        ['فاتني الباص فطلبت تكسي', 'fātni il-bāṣ fa-ṭalabt taksi'],
      ),
      c(
        'I got to work late, but it was fine',
        ['הגעתי לעבודה באיחור אבל היה בסדר', 'higati la-avoda be-ikhur aval haya beseder'],
        sp(
          'وصلت عالشغل متأخّرة بس كان منيح',
          'wṣilt ʿash-shughul mitʾakhkhira bass kān mnīḥ',
          'وصلت عالشغل متأخّر بس كان منيح',
          'wṣilt ʿash-shughul mitʾakhkhir bass kān mnīḥ',
        ),
      ),
    ],
    questions: [
      { ask: 'When did she go out?', options: ['In the morning', 'In the evening', 'At night'], correct: 0 },
      { ask: 'What did she do after she missed the bus?', options: ['She walked', 'She called a taxi', 'She went home'], correct: 1 },
      { ask: 'How was it in the end?', options: ['It was fine', 'It was terrible', 'She never got there'], correct: 0 },
    ],
  },
  {
    id: 'cafe',
    name: 'Coffee with a friend',
    lines: [
      c(
        'On Friday I went to a café with my friend',
        ['ביום שישי הלכתי לבית קפה עם החברה שלי', 'be-yom shishi halakhti le-veit kafe im ha-khavera sheli'],
        ['يوم الجمعة رحت عالكافيه مع صاحبتي', 'yōm il-jumʿa ruḥt ʿal-kafēh maʿ ṣāḥibti'],
      ),
      c('We drank coffee and talked a lot', ['שתינו קפה ודיברנו הרבה', 'shatinu kafe ve-dibarnu harbe'], ['شربنا قهوة وحكينا كتير', 'sharibna ʾahwe w-ḥakēna ktīr']),
      c(
        'It was expensive, but I liked it because the place was quiet',
        ['היה יקר אבל אהבתי את זה כי המקום היה שקט', 'haya yakar aval ahavti et ze ki ha-makom haya shaket'],
        ['كان غالي بس عجبني لأنّ المحل كان هادي', 'kān ghāli bass ʿajabni laʾinn il-maḥall kān hādi'],
      ),
    ],
    questions: [
      { ask: 'When did she go?', options: ['On Friday', 'On Monday', 'Yesterday'], correct: 0 },
      { ask: 'Who was she with?', options: ['Her family', 'Her friend', 'Nobody'], correct: 1 },
      { ask: 'What was the problem?', options: ['It was far', 'It was noisy', 'It was expensive'], correct: 2 },
      { ask: 'Why did she like it anyway?', options: ['The place was quiet', 'The coffee was cheap', 'It was close'], correct: 0 },
    ],
  },
];

/**
 * Everything the level shows her that is not installed as a card.
 *
 * The build fragments, the story lines and the connector examples are read and
 * heard exactly as a card is — same romanisation, same hover — so their words
 * have to mean something too. `utils/glossary` sweeps this alongside the
 * installed categories, which is the whole reason it is exported.
 */
export const TELL_ME_LOOSE_LINES: SeedCard[] = [
  ...STORY_BUILDS.flatMap((build) =>
    build.questions.flatMap((question) => [
      question.ask,
      ...question.answers.flatMap((option) => [option.said, option.joined]),
    ]),
  ),
  ...SHORT_STORIES.flatMap((story) => story.lines),
  ...CONNECTORS.map((connector) => connector.example),
];

// --- the sections ------------------------------------------------------------

/**
 * The lessons as they are authored: plain both-language decks, in the order the
 * level means them to be met.
 *
 * Four strands, each contiguous. The joining words first, because nothing else
 * here works without them; then telling what happened; then describing a
 * person, a place, a thing, an experience; then the three sections that keep
 * her talking when the language runs out.
 */
const AUTHORED_SECTIONS: SeedCategory[] = [
  { name: 'And, but, also', icon: '🔗', decks: AND_BUT_ALSO },
  { name: 'Because and so', icon: '🎯', decks: BECAUSE_AND_SO },
  { name: 'First, then, finally', icon: '🪜', decks: IN_ORDER },
  { name: 'Before, after, when', icon: '⏳', decks: BEFORE_AND_AFTER },
  { name: 'Tell me about your day', icon: '☀️', decks: YOUR_DAY },
  { name: 'Telling what happened', icon: '❗', decks: WHAT_HAPPENED },
  { name: 'And then what?', icon: '➡️', decks: AND_THEN_WHAT },
  { name: 'Adding one more thing', icon: '➕', decks: ADDING_DETAIL },
  { name: 'Tell me about a person', icon: '🧑', decks: ABOUT_A_PERSON },
  { name: 'Tell me about a place', icon: '🏘️', decks: ABOUT_A_PLACE },
  { name: 'Tell me about a thing', icon: '📦', decks: ABOUT_A_THING },
  { name: 'Tell me how it was', icon: '⭐', decks: HOW_IT_WAS },
  { name: 'When you do not know the word', icon: '🤔', decks: AROUND_THE_WORD },
  { name: 'Longer and shorter', icon: '✂️', decks: LONGER_AND_SHORTER },
  { name: 'The little words', icon: '🧵', decks: LITTLE_WORDS },
];

/**
 * Every line the level teaches, each English once.
 *
 * Deduplicated for the reason the level below it dedupes: a line is met once
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
  name: 'Tell me about it: final test',
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
 * Tell Me About It as it installs: every lesson a language ladder.
 *
 * Staged like the rest of the course — Hebrew, then Palestinian Arabic, then
 * the two together over the same lines. The final test passes through unstaged:
 * it is the capstone over both, not another rung to climb.
 */
export const TELL_ME_CATEGORIES: SeedCategory[] = [
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
export const TELL_ME_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  TELL_ME_CATEGORIES.map((section) => section.name.toLowerCase()),
);

/** The final test's category, which the level lays out apart from the sections. */
export const TELL_ME_FINAL_TEST_CATEGORY = FINAL_TEST_GROUP.name;

/** The section whose first lesson is the connector map's practice. */
export const TELL_ME_CONNECTOR_CATEGORY = 'And, but, also';

/** That lesson, by name — the deck built out of `CONNECTORS`. */
export const TELL_ME_CONNECTOR_LESSON = 'The joining words';

/**
 * Which strand of the skill each section belongs to, for the level's own
 * signposting.
 *
 * Read off the section name rather than stored on the category, for the same
 * reason membership is: nothing on disk carries it, and the authored list above
 * is the only place that knows.
 */
export type Strand = 'joining' | 'telling' | 'describing' | 'keeping-going';

export const SECTION_STRANDS: ReadonlyMap<string, Strand> = new Map<string, Strand>(
  (
    [
      ['And, but, also', 'joining'],
      ['Because and so', 'joining'],
      ['First, then, finally', 'joining'],
      ['Before, after, when', 'joining'],
      ['Tell me about your day', 'telling'],
      ['Telling what happened', 'telling'],
      ['And then what?', 'telling'],
      ['Adding one more thing', 'telling'],
      ['Tell me about a person', 'describing'],
      ['Tell me about a place', 'describing'],
      ['Tell me about a thing', 'describing'],
      ['Tell me how it was', 'describing'],
      ['When you do not know the word', 'keeping-going'],
      ['Longer and shorter', 'keeping-going'],
      ['The little words', 'keeping-going'],
    ] as [string, Strand][]
  ).map(([name, strand]) => [name.toLowerCase(), strand]),
);

/**
 * The prompts the level hands to Free Conversation for its last stage.
 *
 * Stage six of the spec's ladder is an unscripted answer, and Free Conversation
 * already grades those. These are the openings it starts from, so "tell me
 * about yesterday" arrives as a conversation rather than as a seventh kind of
 * card.
 */
export const TELL_ME_PROMPTS: string[] = [
  'Tell me about your day',
  'Tell me about yesterday',
  'Tell me about your work',
  'Tell me about where you live',
  'Tell me about your friend',
  'Tell me what happened',
  'Tell me about your weekend',
  'Tell me about a place you visited',
];
