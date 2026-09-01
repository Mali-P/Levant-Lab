import {
  c,
  ofSpeaker,
  stageDecks,
  toL,
  type SeedCard,
  type SeedCategory,
  type SeedDeck,
} from './seed';

/**
 * Conversation Flow: the exchange around the sentence.
 *
 * Sentence Building taught her to produce "I want to eat cake". It never once
 * told her that somebody asks "what do you want?" first, or that "and you?"
 * comes back at her afterwards. This is that missing half, and it is a
 * standalone level rather than another group of chains: its progress is its
 * own, it gates nothing, and nothing gates it — see `isConversationCategory`
 * in `features/review/languagePolicy`, which is what keeps the areas apart.
 *
 * **An exchange is a deck, and one turn is a card.** The card carries her line;
 * the line she is answering rides on it as a `cue`. The study ladder deals a
 * deck one card at a time and grows the active set — so the first rung asks her
 * only the opening answer, the next asks that and the follow-up, and by the end
 * she is holding the whole exchange. The progressive difficulty this level is
 * meant to teach is the ladder's existing shape, not new machinery.
 *
 * **Nothing here is a dialogue to memorise.** The exchanges are short, and the
 * same handful of moves keep returning under different words: answer, expand,
 * give a reason, hand the question back, say you did not follow. What she
 * should come away with is the move, not the script.
 *
 * **Whose gender sits on which line.** Her own lines are hers, so Hebrew leads
 * feminine through `ofSpeaker`, and Palestinian first person singular stays a
 * single form because it carries no gender. The cues are the interesting case,
 * and are authored with `askedOfHer` below.
 *
 * **Vocabulary is borrowed, not invented.** Almost every word here is already
 * taught by Basics, the phrase decks or Sentence Building, down to the
 * romanisation — bukra, hallaʾ, baʿdēn, shwayye, laʾinno, mā baʿref, mā fhimt.
 * The new thing being taught is interaction, and nobody can practise
 * interaction while also decoding ten unfamiliar words.
 */

/**
 * A line spoken *to* the learner, whose two forms her own gender picks between.
 *
 * This needs saying plainly, because it looks like the wrong helper. Everywhere
 * else in the course `ofSpeaker` means "whoever is talking decides" — but on a
 * cue the one talking is not the learner, and the ending still follows her,
 * because she is the one being addressed. "Where are you going?" is wēn rāyḥa
 * to a woman and wēn rāyiḥ to a man, whoever is asking.
 *
 * The two agreement values the app stores are named for roles in a sentence but
 * are resolved against people in the app: `speaker` means "her own gender" and
 * `listener` means "the gender of whoever she is speaking to". Read that way —
 * the only way the settings can read them — `speaker` is exactly right here,
 * and `listener` would show her the form somebody else would be asked in.
 *
 * Her own lines aimed at the other person still use `toL`, which is that other
 * person's gender and a genuinely different question.
 */
const askedOfHer = ofSpeaker;

/** Shorthand for the speaker-gendered Hebrew her own first-person lines carry. */
const sp = ofSpeaker;

/**
 * How many flawless runs an exchange asks for. The same light bar a sentence
 * chain asks: this is a bridge to talking, and it gates nothing.
 */
const EXCHANGE_RUNS = 5;

/** The capstone's shape — see `FINAL_TEST_GROUP`. */
const FINAL_TEST_RUNS = 10;
const FINAL_TEST_BATCH = 10;

/** Hebrew whose two speaker forms are spelled alike and only sound different. */
const SAID = {
  he: 'Written the same either way; only the ending is said differently.',
};

/** The same on both sides, where neither script marks the difference. */
const SAID_BOTH = {
  he: 'Written the same either way; only the ending is said differently.',
  ar: 'Written the same either way; only the ending is said differently.',
};

/** The Arabic half alone, which is the commoner case of the two. */
const SAID_AR = {
  ar: 'Written the same either way; only the ending is said differently.',
};

/** One exchange: a short run of turns, in the order they are said. */
function exchange(name: string, cards: SeedCard[]): SeedDeck {
  return { name, cards, perfectRunsRequired: EXCHANGE_RUNS };
}

/**
 * One turn: what is said to her, and what she says back.
 *
 * Both halves are ordinary `c()` cards. Only the second is graded — the first
 * becomes the card's cue, which is read and heard but never typed or scored.
 */
function turn(asked: SeedCard, said: SeedCard): SeedCard {
  return {
    ...said,
    cue: { english: asked.english, hebrew: asked.hebrew, arabic: asked.arabic },
  };
}

/*
 * The question words as they arrive on their own, mid-conversation. Written
 * once and handed to `turn` wherever a follow-up is nothing but the word —
 * which is most of the time, and is exactly what this level exists to show.
 */
const WHEN = c('When?', ['מתי', 'matai'], ['إيمتى', 'ēmta']);
const WHY = c('Why?', ['למה', 'lama'], ['ليش', 'lēsh']);
const WHERE = c('Where?', ['איפה', 'eifo'], ['وين', 'wēn']);
const WITH_WHO = c('With who?', ['עם מי', 'im mi'], ['مع مين', 'maʿ mīn']);

/** Asked of her: "do you want coffee?", the question the branching turns share. */
const WANT_COFFEE = c(
  'Do you want coffee?',
  askedOfHer('את רוצה קפה', 'at rotsa kafe', 'אתה רוצה קפה', 'ata rotse kafe'),
  askedOfHer('بدِّك قهوة', "biddik ʾahwe", 'بدَّك قهوة', "biddak ʾahwe"),
);

/** Asked of her: "where are you going?", the level's most reused opening. */
const WHERE_GOING = c(
  'Where are you going?',
  askedOfHer('לאן את הולכת', "le'an at holekhet", 'לאן אתה הולך', "le'an ata holekh"),
  askedOfHer('وين رايحة', 'wēn rāyḥa', 'وين رايح', 'wēn rāyiḥ'),
);

/** Asked of her: "what are you learning?" */
const WHAT_LEARNING = c(
  'What are you learning?',
  askedOfHer('מה את לומדת', 'ma at lomedet', 'מה אתה לומד', 'ma ata lomed'),
  askedOfHer('شو عم تتعلّمي', "shū ʿam titʿallami", 'شو عم تتعلّم', "shū ʿam titʿallam"),
);

/** Asked of her: "do you speak Hebrew?" — one Arabic form for anyone. */
const SPEAK_HEBREW = c(
  'Do you speak Hebrew?',
  askedOfHer('את מדברת עברית', 'at medaberet ivrit', 'אתה מדבר עברית', 'ata medaber ivrit'),
  ['بتحكي عبري', "btiḥki ʿibri"],
  { ar: 'This verb ends the same way to a woman and to a man.' },
);

/** Said to her while she is stuck for the words. */
const TAKE_YOUR_TIME = c(
  'Take your time',
  askedOfHer('קחי את הזמן שלך', 'kkhi et hazman shelakh', 'קח את הזמן שלך', 'kakh et hazman shelkha'),
  askedOfHer('على راحتك', "ʿala rāḥtik", 'على راحتك', "ʿala rāḥtak"),
  SAID_AR,
);

// --- answering the question -------------------------------------------------

const ANSWER_EXCHANGES: SeedDeck[] = [
  exchange('Where, when and why', [
    // The bare answer first, because it is what anybody actually says. The
    // whole sentence arrives in the next exchange, and both are correct.
    turn(WHERE_GOING, c('Home', ['הביתה', 'habayta'], ['عالبيت', "ʿal-bēt"])),
    turn(WHEN, c('Tonight', ['הלילה', 'ha-layla'], ['الليلة', "il-lēle"])),
    turn(
      WHY,
      c(
        'Because I am tired',
        sp('כי אני עייפה', 'ki ani ayefa', 'כי אני עייף', 'ki ani ayef'),
        sp('لأنّه تعبانة', "laʾinno taʿbāne", 'لأنّه تعبان', "laʾinno taʿbān"),
      ),
    ),
  ]),
  exchange('What are you studying?', [
    turn(
      c(
        'What are you doing?',
        askedOfHer('מה את עושה', 'ma at osa', 'מה אתה עושה', 'ma ata ose'),
        askedOfHer('شو عم تعملي', "shū ʿam tiʿmali", 'شو عم تعمل', "shū ʿam tiʿmal"),
      ),
      c(
        'I am studying',
        sp('אני לומדת', 'ani lomedet', 'אני לומד', 'ani lomed'),
        ['عم أدرس', "ʿam adrus"],
      ),
    ),
    turn(
      c(
        'What are you studying?',
        askedOfHer('מה את לומדת', 'ma at lomedet', 'מה אתה לומד', 'ma ata lomed'),
        askedOfHer('شو عم تدرسي', "shū ʿam tidrusi", 'شو عم تدرس', "shū ʿam tidrus"),
      ),
      c(
        'I am studying Hebrew',
        sp('אני לומדת עברית', 'ani lomedet ivrit', 'אני לומד עברית', 'ani lomed ivrit'),
        ['عم أدرس عبري', "ʿam adrus ʿibri"],
      ),
    ),
    turn(
      WHY,
      c(
        'Because I want to speak better',
        sp('כי אני רוצה לדבר יותר טוב', 'ki ani rotsa ledaber yoter tov', 'כי אני רוצה לדבר יותר טוב', 'ki ani rotse ledaber yoter tov'),
        ['لأنّه بدّي أحكي أحسن', "laʾinno biddi aḥki aḥsan"],
        SAID,
      ),
    ),
  ]),
  exchange('Who, and with who', [
    turn(
      c('Who is that?', ['מי זה', 'mi ze'], ['مين هاد', "mīn hād"]),
      // The friend's own gender, which nothing about the learner decides — so
      // both halves stay on the card, unlike every pair around them.
      c(
        'My friend',
        ['החברה שלי', 'ha-khavera sheli', 'החבר שלי', 'ha-khaver sheli'],
        ['صاحبتي', "ṣāḥebti", 'صاحبي', "ṣāḥbi"],
      ),
    ),
    turn(
      WITH_WHO,
      c(
        'With my friend',
        ['עם החברה שלי', 'im ha-khavera sheli', 'עם החבר שלי', 'im ha-khaver sheli'],
        ['مع صاحبتي', "maʿ ṣāḥebti", 'مع صاحبي', "maʿ ṣāḥbi"],
      ),
    ),
    turn(WHERE, c('At home', ['בבית', 'ba-bayit'], ['بالبيت', "bil-bēt"])),
  ]),
  exchange('How much, how many, which one', [
    turn(
      c('How much is this?', ['כמה זה עולה', 'kama ze ole'], ['قدّيش هاد', "addēsh hād"]),
      c('Twenty', ['עשרים', 'esrim'], ['عشرين', "ʿishrīn"]),
    ),
    turn(
      c(
        'How many do you want?',
        askedOfHer('כמה את רוצה', 'kama at rotsa', 'כמה אתה רוצה', 'kama ata rotse'),
        askedOfHer('قدّيش بدِّك', "addēsh biddik", 'قدّيش بدَّك', "addēsh biddak"),
      ),
      c('Two, please', ['שתיים בבקשה', 'shtayim bevakasha'], ['تنين لو سمحت', "tnēn law samaḥt"]),
    ),
    turn(
      c('Which one?', ['איזה', 'eize'], ['أيّ واحد', "ayy wāḥad"]),
      c('This one', ['זה', 'ze'], ['هاد', "hād"]),
    ),
  ]),
];

// --- one answer leads to another ---------------------------------------------

const FOLLOW_UP_EXCHANGES: SeedDeck[] = [
  exchange('Going home, and everything after it', [
    turn(
      WHERE_GOING,
      c(
        'I am going home',
        sp('אני הולכת הביתה', 'ani holekhet habayta', 'אני הולך הביתה', 'ani holekh habayta'),
        sp('رايحة عالبيت', "rāyḥa ʿal-bēt", 'رايح عالبيت', "rāyiḥ ʿal-bēt"),
      ),
    ),
    turn(WHEN, c('Later', ['אחר כך', 'akhar kakh'], ['بعدين', "baʿdēn"])),
    turn(WITH_WHO, c('Alone', ['לבד', 'levad'], ['لحالي', "laḥāli"])),
    turn(
      WHY,
      c(
        'Because I am tired today',
        sp('כי אני עייפה היום', 'ki ani ayefa hayom', 'כי אני עייף היום', 'ki ani ayef hayom'),
        sp('لأنّه تعبانة اليوم', "laʾinno taʿbāne il-yōm", 'لأنّه تعبان اليوم', "laʾinno taʿbān il-yōm"),
      ),
    ),
  ]),
  exchange('One word is enough', [
    turn(
      c(
        'Are you coming tomorrow?',
        askedOfHer('את באה מחר', "at ba'a makhar", 'אתה בא מחר', 'ata ba makhar'),
        askedOfHer('جايّة بكرا', "jāyye bukra", 'جاي بكرا', "jāy bukra"),
      ),
      c('Yes', ['כן', 'ken'], ['آه', 'āh']),
    ),
    turn(WHEN, c('In the morning', ['בבוקר', 'ba-boker'], ['الصبح', "iṣ-ṣubḥ"])),
    turn(WITH_WHO, c('With my sister', ['עם אחותי', 'im akhoti'], ['مع أختي', "maʿ ukhti"])),
    turn(
      c('And after that?', ['ואחר כך', 've-akhar kakh'], ['وبعدين', "w-baʿdēn"]),
      c(
        'I do not know yet',
        sp('עדיין לא יודעת', "adayin lo yoda'at", 'עדיין לא יודע', "adayin lo yode'a"),
        ['لسّا ما بعرف', "lissa mā baʿref"],
      ),
    ),
  ]),
  exchange('What do you want to eat?', [
    turn(
      c(
        'What do you want?',
        askedOfHer('מה את רוצה', 'ma at rotsa', 'מה אתה רוצה', 'ma ata rotse'),
        askedOfHer('شو بدِّك', "shū biddik", 'شو بدَّك', "shū biddak"),
      ),
      c(
        'I want to eat',
        sp('אני רוצה לאכול', "ani rotsa le'ekhol", 'אני רוצה לאכול', "ani rotse le'ekhol"),
        ['بدّي آكل', "biddi ākul"],
        SAID,
      ),
    ),
    turn(
      c(
        'What do you want to eat?',
        askedOfHer('מה את רוצה לאכול', "ma at rotsa le'ekhol", 'מה אתה רוצה לאכול', "ma ata rotse le'ekhol"),
        askedOfHer('شو بدِّك تاكلي', "shū biddik tākli", 'شو بدَّك تاكل', "shū biddak tākul"),
      ),
      c(
        'I want to eat cake',
        sp('אני רוצה לאכול עוגה', "ani rotsa le'ekhol uga", 'אני רוצה לאכול עוגה', "ani rotse le'ekhol uga"),
        ['بدّي آكل كيكة', "biddi ākul kēke"],
        SAID,
      ),
    ),
    turn(
      c(
        'Do you want it now?',
        askedOfHer('את רוצה את זה עכשיו', 'at rotsa et ze akhshav', 'אתה רוצה את זה עכשיו', 'ata rotse et ze akhshav'),
        askedOfHer('بدِّك ياها هلّق', "biddik yāha hallaʾ", 'بدَّك ياها هلّق', "biddak yāha hallaʾ"),
      ),
      c('Yes, please', ['כן, בבקשה', 'ken, bevakasha'], ['آه، لو سمحت', "āh, law samaḥt"]),
    ),
  ]),
];

// --- handing the question back ------------------------------------------------

const ASKING_BACK_EXCHANGES: SeedDeck[] = [
  exchange('And you?', [
    turn(
      c(
        'How are you?',
        askedOfHer('מה שלומך', 'ma shlomekh', 'מה שלומך', 'ma shlomkha'),
        askedOfHer('كيفك', "kīfik", 'كيفك', "kīfak"),
        SAID_BOTH,
      ),
      c('Fine, thanks', ['בסדר, תודה', 'beseder, toda'], ['منيح، شكرا', "mnīḥ, shukran"]),
    ),
    // The whole move, in two words. It is the cheapest way to keep a
    // conversation alive and the first one a learner should own.
    turn(
      c('Nothing new with me', ['אין חדש אצלי', 'ein khadash etsli'], ['ما في جديد عندي', "mā fī jdīd ʿindi"]),
      c('And you?', toL(['ואתה', 've-ata'], ['ואת', 've-at']), toL(['وإنته', 'w-inta'], ['وإنتي', 'w-inti'])),
    ),
    turn(
      c('I am well', ['אני בסדר', 'ani beseder'], ['أنا منيح', "ana mnīḥ"]),
      c(
        'What about you? Are you tired?',
        toL(['ואתה, אתה עייף', 've-ata, ata ayef'], ['ואת, את עייפה', 've-at, at ayefa']),
        toL(['وإنته، تعبان', "w-inta, taʿbān"], ['وإنتي، تعبانة', "w-inti, taʿbāne"]),
      ),
    ),
  ]),
  exchange('Asking the same question back', [
    turn(
      WHERE_GOING,
      c(
        'Home. And where are you going?',
        toL(['הביתה. ולאן אתה הולך', "habayta. ve-le'an ata holekh"], ['הביתה. ולאן את הולכת', "habayta. ve-le'an at holekhet"]),
        toL(['عالبيت. وإنته وين رايح', "ʿal-bēt. w-inta wēn rāyiḥ"], ['عالبيت. وإنتي وين رايحة', "ʿal-bēt. w-inti wēn rāyḥa"]),
      ),
    ),
    turn(
      WANT_COFFEE,
      c(
        'Yes. And what do you want?',
        toL(['כן. ומה אתה רוצה', 'ken. u-ma ata rotse'], ['כן. ומה את רוצה', 'ken. u-ma at rotsa']),
        toL(['آه. وإنته شو بدَّك', "āh. w-inta shū biddak"], ['آه. وإنتي شو بدِّك', "āh. w-inti shū biddik"]),
      ),
    ),
    turn(
      // A cue where the other person describes *themselves* is the one place
      // the listener's own gender picks the wording, so it is `toL` — the same
      // axis her own lines aimed at them use, and not `askedOfHer`.
      c(
        'I am learning Arabic',
        toL(['אני לומד ערבית', 'ani lomed aravit'], ['אני לומדת ערבית', 'ani lomedet aravit']),
        ['أنا بتعلّم عربي', "ana batʿallam ʿarabi"],
      ),
      c(
        'Are you learning too?',
        toL(['גם אתה לומד', 'gam ata lomed'], ['גם את לומדת', 'gam at lomedet']),
        toL(['وإنته كمان عم تتعلّم', "w-inta kamān ʿam titʿallam"], ['وإنتي كمان عم تتعلّمي', "w-inti kamān ʿam titʿallami"]),
      ),
    ),
  ]),
];

// --- saying more than the answer -----------------------------------------------

const ADDING_EXCHANGES: SeedDeck[] = [
  exchange('Answer, then say why', [
    turn(
      WHAT_LEARNING,
      c(
        'I am learning Hebrew',
        sp('אני לומדת עברית', 'ani lomedet ivrit', 'אני לומד עברית', 'ani lomed ivrit'),
        ['عم أتعلّم عبري', "ʿam atʿallam ʿibri"],
      ),
    ),
    // The same answer, one clause longer. That clause is the lesson: an answer
    // that stops flat stops the conversation with it.
    turn(
      WHY,
      c(
        'I am learning Hebrew because I live here',
        sp('אני לומדת עברית כי אני גרה פה', 'ani lomedet ivrit ki ani gara po', 'אני לומד עברית כי אני גר פה', 'ani lomed ivrit ki ani gar po'),
        sp('عم أتعلّم عبري لأنّه ساكنة هون', "ʿam atʿallam ʿibri laʾinno sākne hōn", 'عم أتعلّم عبري لأنّه ساكن هون', "ʿam atʿallam ʿibri laʾinno sākin hōn"),
      ),
    ),
    turn(
      c('And Arabic?', ['וערבית', 've-aravit'], ['والعربي', "w-il-ʿarabi"]),
      c(
        'I am learning Arabic, but I understand only a little',
        sp('אני לומדת ערבית, אבל אני מבינה רק קצת', 'ani lomedet aravit, aval ani mevina rak ktsat', 'אני לומד ערבית, אבל אני מבין רק קצת', 'ani lomed aravit, aval ani mevin rak ktsat'),
        ['عم أتعلّم عربي، بس بفهم شويّة بس', "ʿam atʿallam ʿarabi, bass bafham shwayye bass"],
      ),
    ),
  ]),
  exchange('Adding when and where', [
    turn(
      c(
        'Are you working today?',
        askedOfHer('את עובדת היום', 'at ovedet hayom', 'אתה עובד היום', 'ata oved hayom'),
        askedOfHer('عم تشتغلي اليوم', "ʿam tishtighli il-yōm", 'عم تشتغل اليوم', "ʿam tishtighil il-yōm"),
      ),
      c(
        'Yes, I am working today',
        sp('כן, אני עובדת היום', 'ken, ani ovedet hayom', 'כן, אני עובד היום', 'ken, ani oved hayom'),
        ['آه، عم أشتغل اليوم', "āh, ʿam ashtighil il-yōm"],
      ),
    ),
    turn(
      WHERE,
      c(
        'I am working at home today',
        sp('אני עובדת בבית היום', 'ani ovedet ba-bayit hayom', 'אני עובד בבית היום', 'ani oved ba-bayit hayom'),
        ['عم أشتغل بالبيت اليوم', "ʿam ashtighil bil-bēt il-yōm"],
      ),
    ),
    turn(
      c('And tomorrow?', ['ומחר', 'u-makhar'], ['وبكرا', "w-bukra"]),
      c(
        'Tomorrow I am not working, because I want to rest',
        sp('מחר אני לא עובדת, כי אני רוצה לנוח', 'makhar ani lo ovedet, ki ani rotsa lanuakh', 'מחר אני לא עובד, כי אני רוצה לנוח', 'makhar ani lo oved, ki ani rotse lanuakh'),
        ['بكرا مش عم أشتغل، لأنّه بدّي أرتاح', "bukra mish ʿam ashtighil, laʾinno biddi artāḥ"],
        SAID,
      ),
    ),
  ]),
];

// --- yes, no, and the answers in between ---------------------------------------

const YES_NO_EXCHANGES: SeedDeck[] = [
  /*
   * The branching one. Every card here answers the very same question, and all
   * four are right — which is the point, and why they sit inside one exchange
   * rather than being scattered where the pattern would be invisible. A learner
   * drilled on one reply per prompt comes away believing conversations have
   * correct answers.
   */
  exchange('Do you want coffee? · every honest answer', [
    turn(WANT_COFFEE, c('Yes, please', ['כן, בבקשה', 'ken, bevakasha'], ['آه، لو سمحت', "āh, law samaḥt"])),
    turn(WANT_COFFEE, c('No, thank you', ['לא, תודה', 'lo, toda'], ['لأ، شكرا', "laʾ, shukran"])),
    turn(
      WANT_COFFEE,
      c(
        'I want tea',
        sp('אני רוצה תה', 'ani rotsa te', 'אני רוצה תה', 'ani rotse te'),
        ['بدّي شاي', "biddi shāy"],
        SAID,
      ),
    ),
    turn(
      WANT_COFFEE,
      c('Not now. Maybe later', ['לא עכשיו. אולי אחר כך', 'lo akhshav. ulay akhar kakh'], ['مش هلّق. يمكن بعدين', "mish hallaʾ. yimkin baʿdēn"]),
    ),
  ]),
  exchange('Coffee, and the questions after it', [
    turn(WANT_COFFEE, c('Yes, please. Thank you', ['כן, בבקשה. תודה', 'ken, bevakasha. toda'], ['آه، لو سمحت. شكرا', "āh, law samaḥt. shukran"])),
    turn(
      c('With milk?', ['עם חלב', 'im khalav'], ['مع حليب', "maʿ ḥalīb"]),
      c('Yes, with milk', ['כן, עם חלב', 'ken, im khalav'], ['آه، مع حليب', "āh, maʿ ḥalīb"]),
    ),
    turn(
      c('Sugar?', ['סוכר', 'sukar'], ['سكّر', "sukkar"]),
      c('No, thank you. Without sugar', ['לא, תודה. בלי סוכר', 'lo, toda. bli sukar'], ['لأ، شكرا. بلا سكّر', "laʾ, shukran. bala sukkar"]),
    ),
  ]),
  exchange('Agreeing and disagreeing', [
    turn(
      c('It is cold today', ['קר היום', 'kar hayom'], ['بارد اليوم', "bārid il-yōm"]),
      c(
        'Yes, you are right',
        toL(['כן, אתה צודק', 'ken, ata tsodek'], ['כן, את צודקת', 'ken, at tsodeket']),
        toL(['آه، معك حق', "āh, maʿak ḥaʾʾ"], ['آه، معك حق', "āh, maʿik ḥaʾʾ"]),
        SAID_AR,
      ),
    ),
    turn(
      c('Hebrew is difficult', ['עברית קשה', 'ivrit kasha'], ['العبري صعب', "il-ʿibri ṣaʿb"]),
      c(
        'I do not think so',
        sp('אני לא חושבת ככה', 'ani lo khoshevet kakha', 'אני לא חושב ככה', 'ani lo khoshev kakha'),
        ['ما بظنّ هيك', "mā baẓunn hēk"],
      ),
    ),
    turn(
      c('So it is easy?', ['אז זה קל', 'az ze kal'], ['يعني سهل', "yaʿni sahl"]),
      c(
        'Not easy, but not difficult',
        ['לא קל, אבל לא קשה', 'lo kal, aval lo kasha'],
        ['مش سهل، بس مش صعب', "mish sahl, bass mish ṣaʿb"],
      ),
    ),
  ]),
];

// --- the answers people really give ---------------------------------------------

const SHORT_ANSWER_EXCHANGES: SeedDeck[] = [
  /*
   * Not every reply is a sentence. A learner taught only "I am going tomorrow
   * morning" cannot say the single word anybody would actually have said, and
   * hears her own answer come out twice the length of the question.
   */
  exchange('When? · the short answers', [
    turn(
      c(
        'When are you going?',
        askedOfHer('מתי את הולכת', 'matai at holekhet', 'מתי אתה הולך', 'matai ata holekh'),
        askedOfHer('إيمتى رايحة', "ēmta rāyḥa", 'إيمتى رايح', "ēmta rāyiḥ"),
      ),
      c('Now', ['עכשיו', 'akhshav'], ['هلّق', "hallaʾ"]),
    ),
    turn(WHEN, c('Tomorrow', ['מחר', 'makhar'], ['بكرا', "bukra"])),
    turn(WHEN, c('Tomorrow morning', ['מחר בבוקר', 'makhar ba-boker'], ['بكرا الصبح', "bukra iṣ-ṣubḥ"])),
    turn(WHEN, c('On Tuesday', ['ביום שלישי', 'be-yom shlishi'], ['يوم الثلاثا', "yōm it-talāta"])),
  ]),
  exchange('Do you speak Hebrew? · the short answers', [
    turn(SPEAK_HEBREW, c('A little', ['קצת', 'ktsat'], ['شويّة', "shwayye"])),
    turn(
      SPEAK_HEBREW,
      c(
        'I am learning',
        sp('אני לומדת', 'ani lomedet', 'אני לומד', 'ani lomed'),
        ['عم أتعلّم', "ʿam atʿallam"],
      ),
    ),
    turn(SPEAK_HEBREW, c('Not very well', ['לא כל כך טוב', 'lo kol kakh tov'], ['مش كتير منيح', "mish ktīr mnīḥ"])),
    turn(SPEAK_HEBREW, c('Not yet', ['עדיין לא', 'adayin lo'], ['لسّا', "lissa"], { ar: 'لسّا on its own already means "not yet".' })),
  ]),
  exchange('Are you hungry? · the short answers', [
    turn(
      c(
        'Are you hungry?',
        askedOfHer('את רעבה', "at re'eva", 'אתה רעב', "ata ra'ev"),
        askedOfHer('جوعانة', "jūʿāne", 'جوعان', "jūʿān"),
      ),
      c('A little, yes', ['קצת, כן', 'ktsat, ken'], ['شويّة، آه', "shwayye, āh"]),
    ),
    turn(
      c(
        'Do you want to eat now?',
        askedOfHer('את רוצה לאכול עכשיו', "at rotsa le'ekhol akhshav", 'אתה רוצה לאכול עכשיו', "ata rotse le'ekhol akhshav"),
        askedOfHer('بدِّك تاكلي هلّق', "biddik tākli hallaʾ", 'بدَّك تاكل هلّق', "biddak tākul hallaʾ"),
      ),
      c('Later, thank you', ['אחר כך, תודה', 'akhar kakh, toda'], ['بعدين، شكرا', "baʿdēn, shukran"]),
    ),
    turn(
      c(
        'Are you sure?',
        askedOfHer('את בטוחה', 'at btukha', 'אתה בטוח', "ata batuakh"),
        askedOfHer('متأكّدة', "mitʾakkde", 'متأكّد', "mitʾakkid"),
      ),
      c(
        'I am not sure',
        sp('אני לא בטוחה', 'ani lo btukha', 'אני לא בטוח', "ani lo batuakh"),
        sp('مش متأكّدة', "mish mitʾakkde", 'مش متأكّد', "mish mitʾakkid"),
      ),
    ),
  ]),
];

// --- when it goes wrong ----------------------------------------------------------

/*
 * Conversation repair, which is the part of this level that matters most.
 *
 * A learner with fifty words and these phrases can hold a conversation. A
 * learner with a thousand words and none of them stops dead the first time
 * somebody speaks at normal speed. Not understanding is the ordinary condition
 * of speaking a new language, so it is taught here as a move to make rather
 * than as a failure to apologise for — every exchange in this group ends with
 * her still in the conversation.
 */
const REPAIR_EXCHANGES: SeedDeck[] = [
  exchange('I did not understand', [
    turn(
      c('Are you coming with us on Saturday?', ['אתם באים איתנו בשבת', "atem ba'im itanu be-shabat"], ['جايّين معنا يوم السبت', "jāyyīn maʿna yōm is-sabt"]),
      c('I did not understand', ['לא הבנתי', 'lo hevanti'], ['ما فهمت', "mā fhimt"]),
    ),
    turn(
      c('I said: are you coming on Saturday?', ['אמרתי: אתם באים בשבת', "amarti: atem ba'im be-shabat"], ['قلت: جايّين يوم السبت', "ʾult: jāyyīn yōm is-sabt"]),
      c(
        'Can you say it again?',
        toL(['תגיד שוב בבקשה', 'tagid shuv bevakasha'], ['תגידי שוב בבקשה', 'tagidi shuv bevakasha']),
        toL(['عيدها لو سمحت', "ʿīdha law samaḥt"], ['عيديها لو سمحتي', "ʿīdīha law samaḥti"]),
      ),
    ),
    turn(
      c('Are you coming on Saturday?', ['אתם באים בשבת', "atem ba'im be-shabat"], ['جايّين يوم السبت', "jāyyīn yōm is-sabt"]),
      c('More slowly, please', ['לאט יותר בבקשה', "le'at yoter bevakasha"], ['شوي شوي لو سمحت', "shwayy shwayy law samaḥt"]),
    ),
    turn(
      c('Are you coming on Saturday?', ['אתם באים בשבת', "atem ba'im be-shabat"], ['جايّين يوم السبت', "jāyyīn yōm is-sabt"]),
      c(
        'Now I understand. Yes',
        sp('עכשיו אני מבינה. כן', 'akhshav ani mevina. ken', 'עכשיו אני מבין. כן', 'akhshav ani mevin. ken'),
        ['هلّق بفهم. آه', "hallaʾ bafham. āh"],
      ),
    ),
  ]),
  exchange('What does that mean?', [
    turn(
      c('It is crowded there', ['שם צפוף', 'sham tsafuf'], ['هناك زحمة', "hnāk zaḥme"]),
      c('What does that mean?', ['מה זה אומר', 'ma ze omer'], ['شو معناها', "shū maʿnāha"]),
    ),
    turn(
      c('It means there are a lot of people', ['זה אומר שיש הרבה אנשים', 'ze omer she-yesh harbe anashim'], ['يعني في ناس كتير', "yaʿni fī nās ktīr"]),
      c('What is this word?', ['מה המילה הזאת', 'ma hamila hazot'], ['شو هاي الكلمة', "shū hayy il-kalme"]),
    ),
    turn(
      c('Crowded', ['צפוף', 'tsafuf'], ['زحمة', "zaḥme"]),
      c('How do you write it?', ['איך כותבים את זה', 'ekh kotvim et ze'], ['كيف بتنكتب', "kīf btinkatib"]),
    ),
  ]),
  exchange('I understand, but I cannot answer yet', [
    turn(
      c(
        'Why do you want to go there?',
        askedOfHer('למה את רוצה ללכת לשם', 'lama at rotsa lalekhet lesham', 'למה אתה רוצה ללכת לשם', 'lama ata rotse lalekhet lesham'),
        askedOfHer('ليش بدِّك تروحي لهناك', "lēsh biddik trūḥi la-hnāk", 'ليش بدَّك تروح لهناك', "lēsh biddak trūḥ la-hnāk"),
      ),
      c(
        'I understand, but I do not know how to answer',
        sp('אני מבינה, אבל אני לא יודעת איך לענות', "ani mevina, aval ani lo yoda'at ekh la'anot", 'אני מבין, אבל אני לא יודע איך לענות', "ani mevin, aval ani lo yode'a ekh la'anot"),
        ['بفهم، بس ما بعرف كيف أردّ', "bafham, bass mā baʿref kīf aridd"],
      ),
    ),
    turn(
      TAKE_YOUR_TIME,
      c(
        'One moment. Let me think',
        toL(['רגע. תן לי לחשוב', 'rega. ten li lakhshov'], ['רגע. תני לי לחשוב', 'rega. tni li lakhshov']),
        ['لحظة. خلّيني أفكّر', "laḥẓa. khallīni afakkir"],
      ),
    ),
    turn(
      TAKE_YOUR_TIME,
      c(
        'I know the word, but not the sentence',
        sp('אני יודעת את המילה, אבל לא את המשפט', "ani yoda'at et ha-mila, aval lo et ha-mishpat", 'אני יודע את המילה, אבל לא את המשפט', "ani yode'a et ha-mila, aval lo et ha-mishpat"),
        ['بعرف الكلمة، بس مش الجملة', "baʿref il-kalme, bass mish ij-jumle"],
      ),
    ),
  ]),
  exchange('Do you mean this one?', [
    turn(
      c(
        'Bring me the small one',
        askedOfHer('תביאי לי את הקטן', "tavi'i li et hakatan", 'תביא לי את הקטן', 'tavi li et hakatan'),
        askedOfHer('جيبي لي الصغير', "jībi li iz-zghīr", 'جيب لي الصغير', "jīb li iz-zghīr"),
      ),
      c('This one?', ['זה', 'ze'], ['هاد', "hād"]),
    ),
    turn(
      c('No, the other one', ['לא, השני', 'lo, hasheni'], ['لأ، التاني', "laʾ, it-tāni"]),
      c(
        'Do you mean this one?',
        toL(['לזה אתה מתכוון', 'la-ze ata mitkaven'], ['לזה את מתכוונת', 'la-ze at mitkavenet']),
        toL(['قصدك هاد', "ʾaṣdak hād"], ['قصدك هاد', "ʾaṣdik hād"]),
        SAID_AR,
      ),
    ),
    turn(
      c('Yes, that one', ['כן, זה', 'ken, ze'], ['آه، هاد', "āh, hād"]),
      c('Yes, that is what I mean', ['כן, לזה התכוונתי', 'ken, la-ze hitkavanti'], ['آه، هاد قصدي', "āh, hād ʾaṣdi"]),
    ),
    turn(
      c(
        'Do you want the big one?',
        askedOfHer('את רוצה את הגדול', 'at rotsa et hagadol', 'אתה רוצה את הגדול', 'ata rotse et hagadol'),
        askedOfHer('بدِّك الكبير', "biddik il-kbīr", 'بدَّك الكبير', "biddak il-kbīr"),
      ),
      c('No, that is not what I mean', ['לא, לא לזה התכוונתי', 'lo, lo la-ze hitkavanti'], ['لأ، مش هاد قصدي', "laʾ, mish hād ʾaṣdi"]),
    ),
  ]),
  exchange('I forgot, and I do not remember', [
    turn(
      c('What is the word for that?', ['מה המילה לזה', 'ma hamila laze'], ['شو الكلمة لهاد', "shū il-kalme la-hād"]),
      c('I forgot the word', ['שכחתי את המילה', 'shakhakhti et hamila'], ['نسيت الكلمة', "nsīt il-kalme"]),
    ),
    turn(
      c('And her name?', ['ואיך קוראים לה', "ve-ekh kor'im la"], ['وشو اسمها', "w-shū isimha"]),
      c(
        'I do not remember',
        sp('אני לא זוכרת', 'ani lo zokheret', 'אני לא זוכר', 'ani lo zokher'),
        ['ما بتذكّر', "mā batzakkar"],
      ),
    ),
    turn(
      c('Never mind', ['לא נורא', 'lo nora'], askedOfHer('ولا يهمّك', "wala yhimmik", 'ولا يهمّك', "wala yhimmak"), SAID_AR),
      c(
        'I do not know how to say it yet',
        sp('אני עדיין לא יודעת איך להגיד את זה', "ani adayin lo yoda'at ekh lehagid et ze", 'אני עדיין לא יודע איך להגיד את זה', "ani adayin lo yode'a ekh lehagid et ze"),
        ['لسّا ما بعرف كيف بقولها', "lissa mā baʿref kīf baʾūlha"],
      ),
    ),
  ]),
];

// --- talking about your Hebrew and Arabic -----------------------------------------

const LANGUAGE_EXCHANGES: SeedDeck[] = [
  exchange('Can you speak it? Can you read it?', [
    turn(
      WHAT_LEARNING,
      c(
        'I am learning both',
        sp('אני לומדת את שתיהן', 'ani lomedet et shtehen', 'אני לומד את שתיהן', 'ani lomed et shtehen'),
        ['عم أتعلّم التنتين', "ʿam atʿallam it-tintēn"],
      ),
    ),
    turn(
      c(
        'Can you speak it?',
        askedOfHer('את מדברת', 'at medaberet', 'אתה מדבר', 'ata medaber'),
        ['بتحكي', "btiḥki"],
        { ar: 'This verb ends the same way to a woman and to a man.' },
      ),
      c(
        'A little. I am learning',
        sp('קצת. אני לומדת', 'ktsat. ani lomedet', 'קצת. אני לומד', 'ktsat. ani lomed'),
        ['شويّة. عم أتعلّم', "shwayye. ʿam atʿallam"],
      ),
    ),
    turn(
      c(
        'Can you read it?',
        askedOfHer('את יודעת לקרוא', "at yoda'at likro", 'אתה יודע לקרוא', "ata yode'a likro"),
        askedOfHer('بتعرفي تقري', "btiʿrafi tiʾri", 'بتعرف تقرا', "btiʿraf tiʾra"),
      ),
      c('Yes, a little', ['כן, קצת', 'ken, ktsat'], ['آه، شويّة', "āh, shwayye"]),
    ),
    turn(
      c(
        'Do you understand it?',
        askedOfHer('את מבינה', 'at mevina', 'אתה מבין', 'ata mevin'),
        askedOfHer('فاهمة', "fāhme", 'فاهم', "fāhem"),
      ),
      c(
        'I understand more than I speak',
        sp('אני מבינה יותר ממה שאני מדברת', 'ani mevina yoter mi-ma she-ani medaberet', 'אני מבין יותר ממה שאני מדבר', 'ani mevin yoter mi-ma she-ani medaber'),
        ['بفهم أكتر مما بحكي', "bafham aktar mimma baḥki"],
      ),
    ),
  ]),
  exchange('Why are you learning Arabic?', [
    turn(
      c(
        'Why are you learning Arabic?',
        askedOfHer('למה את לומדת ערבית', 'lama at lomedet aravit', 'למה אתה לומד ערבית', 'lama ata lomed aravit'),
        askedOfHer('ليش عم تتعلّمي عربي', "lēsh ʿam titʿallami ʿarabi", 'ليش عم تتعلّم عربي', "lēsh ʿam titʿallam ʿarabi"),
      ),
      c(
        'Because I want to understand it',
        sp('כי אני רוצה להבין', 'ki ani rotsa lehavin', 'כי אני רוצה להבין', 'ki ani rotse lehavin'),
        ['لأنّه بدّي أفهم', "laʾinno biddi afham"],
        SAID,
      ),
    ),
    turn(
      c(
        'Do you speak Arabic?',
        askedOfHer('את מדברת ערבית', 'at medaberet aravit', 'אתה מדבר ערבית', 'ata medaber aravit'),
        ['بتحكي عربي', "btiḥki ʿarabi"],
        { ar: 'This verb ends the same way to a woman and to a man.' },
      ),
      c('Not very well yet', ['עדיין לא כל כך טוב', 'adayin lo kol kakh tov'], ['لسّا مش كتير منيح', "lissa mish ktīr mnīḥ"]),
    ),
    turn(
      c(
        'Are you studying it?',
        askedOfHer('את לומדת את זה', 'at lomedet et ze', 'אתה לומד את זה', 'ata lomed et ze'),
        askedOfHer('عم تدرسيها', "ʿam tidrusīha", 'عم تدرسها', "ʿam tidrusha"),
      ),
      c(
        'Yes, I am studying Palestinian Arabic',
        sp('כן, אני לומדת ערבית פלסטינית', 'ken, ani lomedet aravit falastinit', 'כן, אני לומד ערבית פלסטינית', 'ken, ani lomed aravit falastinit'),
        ['آه، عم أدرس عربي فلسطيني', "āh, ʿam adrus ʿarabi falasṭīni"],
      ),
    ),
  ]),
  exchange('Practising with somebody', [
    turn(
      c(
        'Do you want to practise with me?',
        askedOfHer('את רוצה לתרגל איתי', 'at rotsa letargel iti', 'אתה רוצה לתרגל איתי', 'ata rotse letargel iti'),
        askedOfHer('بدِّك تتمرّني معي', "biddik titmarrani maʿi", 'بدَّك تتمرّن معي', "biddak titmarran maʿi"),
      ),
      c(
        'Yes, I want to practise',
        sp('כן, אני רוצה לתרגל', 'ken, ani rotsa letargel', 'כן, אני רוצה לתרגל', 'ken, ani rotse letargel'),
        ['آه، بدّي أتمرّن', "āh, biddi atmarran"],
        SAID,
      ),
    ),
    turn(
      c(
        'Speak, and I will correct you',
        askedOfHer('דברי, ואני אתקן אותך', 'dabri, va-ani ataken otakh', 'דבר, ואני אתקן אותך', 'daber, va-ani ataken otkha'),
        askedOfHer('احكي، وأنا بصحّحلك', "iḥki, w-ana baṣaḥḥiḥlik", 'احكي، وأنا بصحّحلك', "iḥki, w-ana baṣaḥḥiḥlak"),
        SAID_AR,
      ),
      c(
        'Please correct me',
        toL(['תתקן אותי בבקשה', 'tetaken oti bevakasha'], ['תתקני אותי בבקשה', 'tetakni oti bevakasha']),
        toL(['صحّحلي لو سمحت', "ṣaḥḥiḥli law samaḥt"], ['صحّحيلي لو سمحتي', "ṣaḥḥiḥīli law samaḥti"]),
      ),
    ),
    turn(
      c('Was that right?', ['זה היה נכון', 'ze haya nakhon'], ['هيك صح', "hēk ṣaḥḥ"]),
      c(
        'I am still learning, but I am improving',
        sp('אני עדיין לומדת, אבל אני משתפרת', 'ani adayin lomedet, aval ani mishtaperet', 'אני עדיין לומד, אבל אני משתפר', 'ani adayin lomed, aval ani mishtaper'),
        ['لسّا عم أتعلّم، بس عم أتحسّن', "lissa ʿam atʿallam, bass ʿam atḥassan"],
      ),
    ),
  ]),
];

// --- the groups --------------------------------------------------------------------

/** The exchanges as they are authored: plain both-language decks, in order. */
const AUTHORED_GROUPS: SeedCategory[] = [
  { name: 'Answering the question', icon: '❓', decks: ANSWER_EXCHANGES },
  { name: 'One answer leads to another', icon: '🔗', decks: FOLLOW_UP_EXCHANGES },
  { name: 'Asking back', icon: '🔄', decks: ASKING_BACK_EXCHANGES },
  { name: 'Saying more than the answer', icon: '➕', decks: ADDING_EXCHANGES },
  { name: 'Yes, no and in between', icon: '⚖️', decks: YES_NO_EXCHANGES },
  { name: 'The answers people really give', icon: '💬', decks: SHORT_ANSWER_EXCHANGES },
  { name: 'When it goes wrong', icon: '🛟', decks: REPAIR_EXCHANGES },
  // Not "Talking about your Hebrew and Arabic": Sentence Building already owns
  // that name, and the areas are told apart by name alone — two categories
  // called the same thing would be installed as one, holding both levels'
  // decks and appearing under both levels' screens.
  { name: 'Talking about learning the language', icon: '🗣️', decks: LANGUAGE_EXCHANGES },
];

/**
 * Every turn the level teaches, each English once.
 *
 * Deduplicated deliberately, because the same reply is given to more than one
 * question on purpose — "Yes, please" answers the coffee and the cake alike,
 * and the branching exchange puts one question four different ways. Inside
 * their exchanges those are genuinely different cards. In a pool drawn from at
 * random they would be one card dealt twice, and a repeated English would put
 * the official-word count for ever out of a device's reach, so the starter
 * top-up — which repairs only while something is missing — would run on every
 * single launch.
 */
const EVERY_TURN = (() => {
  const seen = new Set<string>();
  const pool: SeedCard[] = [];
  for (const group of AUTHORED_GROUPS) {
    for (const deck of group.decks) {
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
 * The capstone: ten turns at a time out of everything above, in both languages.
 *
 * Dealt exactly the way Sentence Building's final test is, and for the same
 * reason — one flawless pass over a hundred cards is not something a person
 * finishes, and ten out of a hundred ten times over is the same claim in a
 * shape she can hold. `masteryOnly`, because every turn has already been met
 * inside its own exchange and there is nothing here left to introduce.
 */
const FINAL_TEST_GROUP: SeedCategory = {
  name: 'Conversation: final test',
  icon: '🏁',
  decks: [
    {
      name: 'Every exchange, ten at a time',
      cards: EVERY_TURN,
      studyLanguages: ['hebrew', 'arabic'],
      masteryOnly: true,
      roundSize: FINAL_TEST_BATCH,
      perfectRunsRequired: FINAL_TEST_RUNS,
    },
  ],
};

/**
 * Conversation Flow as it installs: every exchange a language ladder.
 *
 * Staged like the rest of the course — Hebrew, then Palestinian Arabic, then
 * the two together over the same turns — so she can take one language at a time
 * rather than absorb an exchange twice at once. The final test passes through
 * unstaged: it is the capstone over both, not another rung to climb.
 */
export const CONVERSATION_CATEGORIES: SeedCategory[] = [
  ...AUTHORED_GROUPS.map((group) => ({
    ...group,
    decks: stageDecks(group.decks),
  })),
  FINAL_TEST_GROUP,
];

/**
 * The names Conversation Flow owns, so neither the course ladder nor Sentence
 * Building lays out a category belonging to this level.
 *
 * Name-based, like `SENTENCE_CATEGORY_NAMES` before it: a category row on disk
 * carries nothing else saying which area it belongs to, and adding a stored
 * field would need a migration on every install to buy what a set of names
 * already answers.
 */
export const CONVERSATION_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  CONVERSATION_CATEGORIES.map((group) => group.name.toLowerCase()),
);

/** The final test's category, which the level lays out apart from the groups. */
export const CONVERSATION_FINAL_TEST_CATEGORY = FINAL_TEST_GROUP.name;
