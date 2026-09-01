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
 * Real Situations: getting through an actual interaction.
 *
 * Conversation Flow taught the moves — answer, expand, hand the question back,
 * say you did not follow. This level puts those moves inside a place: a café
 * counter, a bus, somebody's front room. The learner is no longer practising
 * "the concept of answering a question"; she is practising *how do I get
 * through ordering a coffee*, and a scenario is finished when the interaction
 * is, not when a deck says so.
 *
 * **A scenario is a category, and its own progress.** Each scenario's turns are
 * dealt as one or two small staged decks — Hebrew, then Palestinian Arabic,
 * then both — exactly the way an exchange is, so all of the existing study
 * machinery (grading, gendered forms, the ladder growing her share of the
 * conversation) applies unchanged. What is genuinely new is the **script**: a
 * controlled branching read of the same turns, played by the rehearsal screen,
 * where her answer decides what is said next. Choosing "I want tea" leads to
 * tea, not to a pretence that she asked for coffee.
 *
 * **Vocabulary is borrowed on purpose.** Nearly every line reuses words the
 * course has already taught, down to the romanisation — the new skill is using
 * known language under context, and nobody can do that while decoding ten
 * unfamiliar words. Where a scenario genuinely needs a new word (the bill, a
 * bus stop, twice a day) it introduces only that word.
 *
 * Authored 2026-09-01 by Claude; not yet reviewed by a native speaker.
 */

/**
 * A line spoken *to* the learner, whose two forms her own gender picks between.
 *
 * The same deliberate alias Conversation Flow uses, for the same reason: the
 * app's two agreement values are named for sentence roles but resolved against
 * people — `speaker` is her own gender, `listener` is whoever she talks to. A
 * cue is addressed to her, so its endings follow *her*, whoever says it.
 */
const askedOfHer = ofSpeaker;

/** Shorthand for the speaker-gendered forms her own first-person lines carry. */
const sp = ofSpeaker;

/**
 * How many flawless runs a scenario deck asks for. The same light bar an
 * exchange asks: this level is a bridge to the street, and it gates nothing.
 */
const SITUATION_RUNS = 5;

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

/** One scenario deck: a short run of turns, in the order they are said. */
function part(name: string, cards: SeedCard[]): SeedDeck {
  return { name, cards, perfectRunsRequired: SITUATION_RUNS };
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

/**
 * One reply the rehearsal offers at a node, and where choosing it leads.
 *
 * `next` names the node the conversation moves to; absent means the node that
 * follows in the script, and `'end'` means the interaction is done. Several
 * choices on one node are the branching promise kept: different answers create
 * different conversations, and every one of them is right.
 */
export type SituationChoice = {
  card: SeedCard;
  next?: string;
};

/**
 * One beat of the rehearsal: their line, and every honest way she may answer.
 *
 * `them` is built with `c()` like everything else — it is a line, not a card
 * to master — and its gendered forms follow the same rules a cue's do.
 */
export type SituationNode = {
  id: string;
  them: SeedCard;
  choices: SituationChoice[];
};

/**
 * One real situation: the place, the goal, the decks that teach its lines,
 * and the branching script the rehearsal plays.
 *
 * `parts` are authored unstaged; the installer stages them into the three
 * language rungs. Every reply reachable in `script` also lives in a part, so
 * nothing can be asked for in rehearsal that the decks never taught.
 */
export type Situation = {
  name: string;
  icon: string;
  /** Where she is and who is talking to her, set before anything is said. */
  scene: string;
  /** What getting through it means — the thing she will have accomplished. */
  goal: string;
  parts: SeedDeck[];
  script: SituationNode[];
};

/** A node of the script, with plain cards read as single straight-on choices. */
function node(
  id: string,
  them: SeedCard,
  ...choices: (SeedCard | SituationChoice)[]
): SituationNode {
  return {
    id,
    them,
    choices: choices.map((choice) =>
      'card' in choice ? (choice as SituationChoice) : { card: choice as SeedCard },
    ),
  };
}

/*
 * Lines that repeat across scenarios, written once. Reused wording is a
 * feature: hearing the very same "anything else?" at the café, the shop and
 * the restaurant is what makes it recognisable on the street.
 */

const HELLO = c('Hello', ['שלום', 'shalom'], ['مرحبا', 'marḥaba']);
const THANK_YOU = c('Thank you', ['תודה', 'toda'], ['شكرا', 'shukran']);
const THANKS_A_LOT = c('Thank you very much', ['תודה רבה', 'toda raba'], ['شكرا كتير', 'shukran ktīr']);
const GOODBYE = c('Goodbye', ['להתראות', "lehitra'ot"], ['مع السلامة', "maʿ as-salāme"]);
const YES_PLEASE = c('Yes, please', ['כן, בבקשה', 'ken, bevakasha'], ['آه، لو سمحت', "āh, law samaḥt"]);
const THATS_ALL = c('That is all, thank you', ['זה הכל, תודה', 'ze hakol, toda'], ['بس هيك، شكرا', "bass hēk, shukran"]);
const HOW_MUCH_IS_THIS = c('How much is this?', ['כמה זה עולה', 'kama ze ole'], ['قدّيش هاد', "addēsh hād"]);

/** Asked of her at a counter, in a shop, at a table — the same words each time. */
const ANYTHING_ELSE = c(
  'Anything else?',
  ['עוד משהו', 'od mashehu'],
  askedOfHer('بدِّك إشي تاني', "biddik ishi tāni", 'بدَّك إشي تاني', "biddak ishi tāni"),
);

// --- Meeting someone ---------------------------------------------------------

const MEETING = (() => {
  const HELLO_HOW_ARE_YOU = c(
    'Hello. How are you?',
    ['שלום. מה שלומך', 'shalom. ma shlomkha'],
    toL(['مرحبا. كيفك', "marḥaba. kīfak"], ['مرحبا. كيفك', "marḥaba. kīfik"]),
    SAID_BOTH,
  );
  const WHATS_YOUR_NAME = c(
    'What is your name?',
    askedOfHer('איך קוראים לך', "ekh kor'im lakh", 'איך קוראים לך', "ekh kor'im lekha"),
    askedOfHer('شو اسمك', "shū ismik", 'شو اسمك', "shū ismak"),
    SAID_BOTH,
  );
  const MY_NAME = c(
    'My name is Dana',
    ['קוראים לי דנה', "kor'im li dana"],
    ['اسمي دانا', 'ismi dāna'],
    { he: 'Put your own name where Dana stands.', ar: 'Put your own name where Dana stands.' },
  );
  const WHERE_FROM = c(
    'Where are you from?',
    askedOfHer('מאיפה את', "me'eifo at", 'מאיפה אתה', "me'eifo ata"),
    askedOfHer('من وين إنتِ', "min wēn inti", 'من وين إنت', "min wēn inte"),
  );
  const IM_FROM = c(
    'I am from England',
    ['אני מאנגליה', 'ani me-anglia'],
    ['أنا من إنجلترا', 'ana min ingiltera'],
    { he: 'Put your own country where England stands.', ar: 'Put your own country where England stands.' },
  );
  const LIVE_HERE = c(
    'Do you live here?',
    askedOfHer('את גרה פה', 'at gara po', 'אתה גר פה', 'ata gar po'),
    askedOfHer('ساكنة هون', "sākne hōn", 'ساكن هون', "sākin hōn"),
  );
  const YES_LIVE_HERE = c(
    'Yes, I live here',
    sp('כן, אני גרה פה', 'ken, ani gara po', 'כן, אני גר פה', 'ken, ani gar po'),
    sp('آه، ساكنة هون', "āh, sākne hōn", 'آه، ساكن هون', "āh, sākin hōn"),
  );
  const HOW_LONG_HERE = c(
    'How long have you lived here?',
    askedOfHer('כמה זמן את גרה פה', 'kama zman at gara po', 'כמה זמן אתה גר פה', 'kama zman ata gar po'),
    askedOfHer('قدّيش صرلك ساكنة هون', "addēsh ṣarlik sākne hōn", 'قدّيش صرلك ساكن هون', "addēsh ṣarlak sākin hōn"),
  );
  const TWO_YEARS = c('Two years', ['שנתיים', 'shnatayim'], ['سنتين', 'sintēn']);
  const SPEAK_HEBREW = c(
    'Do you speak Hebrew?',
    askedOfHer('את מדברת עברית', 'at medaberet ivrit', 'אתה מדבר עברית', 'ata medaber ivrit'),
    ['بتحكي عبري', "btiḥki ʿibri"],
    { ar: 'This verb ends the same way to a woman and to a man.' },
  );
  const A_LITTLE_LEARNING = c(
    'A little. I am learning',
    sp('קצת. אני לומדת', 'ktsat. ani lomedet', 'קצת. אני לומד', 'ktsat. ani lomed'),
    ['شويّة. عم أتعلّم', "shwayye. ʿam atʿallam"],
  );
  const SPEAK_ARABIC = c(
    'Do you speak Arabic?',
    askedOfHer('את מדברת ערבית', 'at medaberet aravit', 'אתה מדבר ערבית', 'ata medaber aravit'),
    ['بتحكي عربي', "btiḥki ʿarabi"],
    { ar: 'This verb ends the same way to a woman and to a man.' },
  );
  const STILL_LEARNING_TOO = c(
    'A little, and I am still learning',
    sp('קצת, ואני עדיין לומדת', 'ktsat, ve-ani adayin lomedet', 'קצת, ואני עדיין לומד', 'ktsat, ve-ani adayin lomed'),
    ['شويّة، ولسّا عم أتعلّم', "shwayye, w-lissa ʿam atʿallam"],
  );
  const NICE_TO_MEET = c('Nice to meet you', ['נעים מאוד', "na'im me'od"], ['تشرّفنا', 'tsharrafna'], {
    ar: 'Literally "we are honoured"; one form whoever is speaking.',
  });
  const NICE_TO_MEET_TOO = c(
    'Nice to meet you too',
    ['נעים מאוד גם לי', "na'im me'od gam li"],
    ['وأنا تشرّفت', 'w-ana tsharraft'],
    { ar: 'The past tense does not change for a woman or a man.' },
  );

  const situation: Situation = {
    name: 'Meeting someone',
    icon: '🤝',
    scene: 'Somebody friendly has just said hello, and wants to know who you are.',
    goal: 'Introduce yourself — your name, where you are from, and that you are learning.',
    parts: [
      part('Who you are', [
        turn(HELLO, HELLO_HOW_ARE_YOU),
        turn(WHATS_YOUR_NAME, MY_NAME),
        turn(WHERE_FROM, IM_FROM),
        turn(LIVE_HERE, YES_LIVE_HERE),
        turn(HOW_LONG_HERE, TWO_YEARS),
      ]),
      part('The languages between you', [
        turn(SPEAK_HEBREW, A_LITTLE_LEARNING),
        turn(SPEAK_ARABIC, STILL_LEARNING_TOO),
        turn(NICE_TO_MEET, NICE_TO_MEET_TOO),
      ]),
    ],
    script: [
      node('hello', HELLO, HELLO_HOW_ARE_YOU),
      node('name', WHATS_YOUR_NAME, MY_NAME),
      node('from', WHERE_FROM, IM_FROM),
      node('live', LIVE_HERE, YES_LIVE_HERE),
      node('howLong', HOW_LONG_HERE, TWO_YEARS),
      node('hebrew', SPEAK_HEBREW, A_LITTLE_LEARNING),
      node('arabic', SPEAK_ARABIC, STILL_LEARNING_TOO),
      node('meet', NICE_TO_MEET, { card: NICE_TO_MEET_TOO, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At the café -------------------------------------------------------------

const CAFE = (() => {
  const WELCOME = c(
    'Welcome',
    askedOfHer('ברוכה הבאה', "brukha haba'a", 'ברוך הבא', 'barukh haba'),
    ['أهلا وسهلا', 'ahlan w sahlan'],
    { ar: 'Said to a guest arriving; the Arabic form does not change.' },
  );
  const WHAT_WOULD_YOU_LIKE = c(
    'What would you like?',
    askedOfHer('מה תרצי', 'ma tirtsi', 'מה תרצה', 'ma tirtse'),
    askedOfHer('شو بتحبّي', "shū bitḥibbi", 'شو بتحبّ', "shū bitḥibb"),
  );
  const COFFEE_PLEASE = c(
    'I want coffee, please',
    sp('אני רוצה קפה, בבקשה', 'ani rotsa kafe, bevakasha', 'אני רוצה קפה, בבקשה', 'ani rotse kafe, bevakasha'),
    ['بدّي قهوة، لو سمحت', "biddi ʾahwe, law samaḥt"],
    SAID,
  );
  const TEA_PLEASE = c(
    'I want tea, please',
    sp('אני רוצה תה, בבקשה', 'ani rotsa te, bevakasha', 'אני רוצה תה, בבקשה', 'ani rotse te, bevakasha'),
    ['بدّي شاي، لو سمحت', "biddi shāy, law samaḥt"],
    SAID,
  );
  const WITH_MILK = c('With milk?', ['עם חלב', 'im khalav'], ['مع حليب', "maʿ ḥalīb"]);
  const YES_WITH_MILK = c('Yes, with milk', ['כן, עם חלב', 'ken, im khalav'], ['آه، مع حليب', "āh, maʿ ḥalīb"]);
  const SUGAR = c('Sugar?', ['סוכר', 'sukar'], ['سكّر', "sukkar"]);
  const NO_SUGAR = c(
    'No, thank you. Without sugar',
    ['לא, תודה. בלי סוכר', 'lo, toda. bli sukar'],
    ['لأ، شكرا. بلا سكّر', "laʾ, shukran. bala sukkar"],
  );
  const HOT_OR_COLD = c('Hot or cold?', ['חם או קר', 'kham o kar'], ['سخن ولا بارد', "sukhn walla bāred"], {
    ar: 'ولا is the spoken "or" inside a question.',
  });
  const HOT = c('Hot, please', ['חם, בבקשה', 'kham, bevakasha'], ['سخن، لو سمحت', "sukhn, law samaḥt"]);
  const HOW_MUCH_BILL = c('How much is it?', ['כמה זה עולה', 'kama ze ole'], ['قدّيش الحساب', "addēsh il-ḥsāb"], {
    ar: 'Literally "how much is the bill".',
  });
  const TWENTY_SHEKELS = c('Twenty shekels', ['עשרים שקל', 'esrim shekel'], ['عشرين شيكل', "ʿishrīn shēkel"]);
  const HERE_YOU_ARE = c(
    'Here you are. Thank you',
    ['בבקשה. תודה', 'bevakasha. toda'],
    toL(['تفضّل. شكرا', "tfaḍḍal. shukran"], ['تفضّلي. شكرا', "tfaḍḍali. shukran"]),
  );

  const situation: Situation = {
    name: 'At the café',
    icon: '☕',
    scene: 'You are at the counter of a small café, and the person behind it is ready for you.',
    goal: 'Order a drink the way you actually take it, pay, and leave with it.',
    parts: [
      part('Ordering the drink', [
        turn(WELCOME, HELLO),
        turn(WHAT_WOULD_YOU_LIKE, COFFEE_PLEASE),
        // The other honest answer to the same question — the fork the
        // rehearsal actually takes when she asks for tea instead.
        turn(WHAT_WOULD_YOU_LIKE, TEA_PLEASE),
        turn(WITH_MILK, YES_WITH_MILK),
        turn(SUGAR, NO_SUGAR),
        turn(HOT_OR_COLD, HOT),
      ]),
      part('Paying and going', [
        turn(ANYTHING_ELSE, THATS_ALL),
        turn(ANYTHING_ELSE, HOW_MUCH_BILL),
        turn(TWENTY_SHEKELS, HERE_YOU_ARE),
        turn(THANK_YOU, GOODBYE),
      ]),
    ],
    script: [
      node('welcome', WELCOME, HELLO),
      // The fork: coffee walks through milk; tea skips straight to sugar,
      // because nobody who asked for tea should be offered milk for a coffee
      // she never ordered.
      node(
        'order',
        WHAT_WOULD_YOU_LIKE,
        { card: COFFEE_PLEASE, next: 'milk' },
        { card: TEA_PLEASE, next: 'sugar' },
      ),
      node('milk', WITH_MILK, { card: YES_WITH_MILK, next: 'sugar' }),
      node('sugar', SUGAR, NO_SUGAR),
      node('temperature', HOT_OR_COLD, HOT),
      node(
        'else',
        ANYTHING_ELSE,
        { card: THATS_ALL, next: 'price' },
        { card: HOW_MUCH_BILL, next: 'price' },
      ),
      node('price', TWENTY_SHEKELS, { card: HERE_YOU_ARE, next: 'bye' }),
      node('bye', THANK_YOU, { card: GOODBYE, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At the restaurant -------------------------------------------------------

const RESTAURANT = (() => {
  const READY_TO_ORDER = c(
    'Are you ready to order?',
    askedOfHer('את מוכנה להזמין', 'at mukhana lehazmin', 'אתה מוכן להזמין', 'ata mukhan lehazmin'),
    askedOfHer('جاهزة تطلبي', "jāhze tuṭlubi", 'جاهز تطلب', "jāhez tuṭlub"),
  );
  const ONE_MOMENT = c('One moment, please', ['רגע, בבקשה', 'rega, bevakasha'], ['لحظة، لو سمحت', "laḥẓa, law samaḥt"]);
  const WHAT_DO_YOU_WANT = c(
    'What do you want?',
    askedOfHer('מה את רוצה', 'ma at rotsa', 'מה אתה רוצה', 'ma ata rotse'),
    askedOfHer('شو بدِّك', "shū biddik", 'شو بدَّك', "shū biddak"),
  );
  const I_WANT_THIS = c(
    'I want this',
    sp('אני רוצה את זה', 'ani rotsa et ze', 'אני רוצה את זה', 'ani rotse et ze'),
    ['بدّي هاد', "biddi hād"],
    SAID,
  );
  const VERY_TASTY = c('This is very tasty', ['זה טעים מאוד', "ze ta'im me'od"], ['هاد زاكي كتير', "hād zāki ktīr"]);
  const WHAT_IS_THIS = c('What is this?', ['מה זה', 'ma ze'], ['شو هاد', "shū hād"]);
  const MEAT_WITH_RICE = c('It is meat with rice', ['זה בשר עם אורז', 'ze basar im orez'], ['هاد لحمة مع رز', "hād laḥme maʿ ruzz"]);
  const DONT_EAT_MEAT = c(
    'I do not eat meat',
    sp('אני לא אוכלת בשר', 'ani lo okhelet basar', 'אני לא אוכל בשר', 'ani lo okhel basar'),
    ['ما باكل لحمة', "mā bākul laḥme"],
  );
  const WITHOUT_MEAT = c(
    'There is also food without meat',
    ['יש גם אוכל בלי בשר', 'yesh gam okhel bli basar'],
    ['في كمان أكل بلا لحمة', "fī kamān akl bala laḥme"],
  );
  const I_LIKE_THIS = c(
    'Good. I like this',
    sp('טוב. אני אוהבת את זה', 'tov. ani ohevet et ze', 'טוב. אני אוהב את זה', 'tov. ani ohev et ze'),
    ['منيح. بحبّ هاد', "mnīḥ. baḥibb hād"],
  );
  const SOMETHING_TO_DRINK = c(
    'Do you want something to drink?',
    askedOfHer('את רוצה משהו לשתות', 'at rotsa mashehu lishtot', 'אתה רוצה משהו לשתות', 'ata rotse mashehu lishtot'),
    askedOfHer('بدِّك تشربي إشي', "biddik tishrabi ishi", 'بدَّك تشرب إشي', "biddak tishrab ishi"),
  );
  const WATER_PLEASE = c(
    'Can I have water, please?',
    ['אפשר מים, בבקשה', 'efshar mayim, bevakasha'],
    ['ممكن ميّة، لو سمحت', "mumkin mayye, law samaḥt"],
  );
  const WAS_IT_TASTY = c('Was the food good?', ['האוכל היה טעים', "ha-okhel haya ta'im"], ['كان الأكل زاكي', "kān il-akl zāki"]);
  const TASTY_BILL_PLEASE = c(
    'Yes, very tasty. The bill, please',
    ['כן, טעים מאוד. החשבון בבקשה', "ken, ta'im me'od. hakheshbon bevakasha"],
    toL(['آه، زاكي كتير. الحساب لو سمحت', "āh, zāki ktīr. il-ḥsāb law samaḥt"], ['آه، زاكي كتير. الحساب لو سمحتي', "āh, zāki ktīr. il-ḥsāb law samaḥti"]),
  );
  const HERE_IS_BILL = c(
    'Here you are',
    ['בבקשה', 'bevakasha'],
    askedOfHer('تفضّلي', "tfaḍḍali", 'تفضّل', "tfaḍḍal"),
  );
  const THANKS_GOODBYE = c(
    'Thank you. Goodbye',
    ['תודה. להתראות', "toda. lehitra'ot"],
    ['شكرا. مع السلامة', "shukran. maʿ as-salāme"],
  );

  const situation: Situation = {
    name: 'At the restaurant',
    icon: '🍽️',
    scene: 'You are at a table, the menu is open, and the waiter has come over.',
    goal: 'Order food you can actually eat, ask what things are, and get the bill.',
    parts: [
      part('Choosing the food', [
        turn(READY_TO_ORDER, ONE_MOMENT),
        turn(WHAT_DO_YOU_WANT, I_WANT_THIS),
        turn(VERY_TASTY, WHAT_IS_THIS),
        turn(MEAT_WITH_RICE, DONT_EAT_MEAT),
        turn(WITHOUT_MEAT, I_LIKE_THIS),
      ]),
      part('The water and the bill', [
        turn(SOMETHING_TO_DRINK, WATER_PLEASE),
        turn(ANYTHING_ELSE, THATS_ALL),
        turn(WAS_IT_TASTY, TASTY_BILL_PLEASE),
        turn(HERE_IS_BILL, THANKS_GOODBYE),
      ]),
    ],
    script: [
      node('ready', READY_TO_ORDER, ONE_MOMENT),
      node('want', WHAT_DO_YOU_WANT, I_WANT_THIS),
      node('tasty', VERY_TASTY, WHAT_IS_THIS),
      // The fork that matters at a table: what she says next depends on
      // whether she eats what the dish turns out to be.
      node(
        'meat',
        MEAT_WITH_RICE,
        { card: DONT_EAT_MEAT, next: 'noMeat' },
        { card: I_LIKE_THIS, next: 'drink' },
      ),
      node('noMeat', WITHOUT_MEAT, { card: I_LIKE_THIS, next: 'drink' }),
      node('drink', SOMETHING_TO_DRINK, WATER_PLEASE),
      node('else', ANYTHING_ELSE, THATS_ALL),
      node('bill', WAS_IT_TASTY, TASTY_BILL_PLEASE),
      node('pay', HERE_IS_BILL, { card: THANKS_GOODBYE, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At someone's house ------------------------------------------------------

const HOUSE = (() => {
  const COME_IN = c(
    'Come in',
    askedOfHer('היכנסי', 'hikansi', 'היכנס', 'hikanes'),
    askedOfHer('فوتي', "fūti", 'فوت', "fūt"),
  );
  const SIT_DOWN = c(
    'Sit down',
    askedOfHer('שבי', 'shvi', 'שב', 'shev'),
    askedOfHer('اقعدي', "uʾʿudi", 'اقعد', "uʾʿud"),
  );
  const DRINK_SOMETHING = c(
    'Do you want something to drink?',
    askedOfHer('את רוצה משהו לשתות', 'at rotsa mashehu lishtot', 'אתה רוצה משהו לשתות', 'ata rotse mashehu lishtot'),
    askedOfHer('بدِّك تشربي إشي', "biddik tishrabi ishi", 'بدَّك تشرب إشي', "biddak tishrab ishi"),
  );
  const COFFEE_OR_TEA = c('Coffee or tea?', ['קפה או תה', 'kafe o te'], ['قهوة ولا شاي', "ʾahwe walla shāy"], {
    ar: 'ولا is the spoken "or" inside a question.',
  });
  const COFFEE_THANKS = c('Coffee, thank you', ['קפה, תודה', 'kafe, toda'], ['قهوة، شكرا', "ʾahwe, shukran"]);
  const TEA_THANKS = c('Tea, thank you', ['תה, תודה', 'te, toda'], ['شاي، شكرا', "shāy, shukran"]);
  const ARE_YOU_HUNGRY = c(
    'Are you hungry?',
    askedOfHer('את רעבה', "at re'eva", 'אתה רעב', "ata ra'ev"),
    askedOfHer('جوعانة', "jūʿāne", 'جوعان', "jūʿān"),
  );
  const NOT_HUNGRY = c(
    'No, thank you. I am not hungry',
    sp('לא, תודה. אני לא רעבה', "lo, toda. ani lo re'eva", 'לא, תודה. אני לא רעב', "lo, toda. ani lo ra'ev"),
    sp('لأ، شكرا. مش جوعانة', "laʾ, shukran. mish jūʿāne", 'لأ، شكرا. مش جوعان', "laʾ, shukran. mish jūʿān"),
  );
  const A_LITTLE_HUNGRY = c('Yes, a little', ['כן, קצת', 'ken, ktsat'], ['آه، شويّة', "āh, shwayye"]);
  const COMFORTABLE = c(
    'Are you comfortable?',
    askedOfHer('נוח לך', 'noakh lakh', 'נוח לך', 'noakh lekha'),
    askedOfHer('مرتاحة', "mirtāḥa", 'مرتاح', "mirtāḥ"),
    SAID,
  );
  const YES_THANK_YOU = c('Yes, thank you', ['כן, תודה', 'ken, toda'], ['آه، شكرا', "āh, shukran"]);
  const ANYTHING_ELSE_HOME = c(
    'Do you want anything else?',
    askedOfHer('את רוצה עוד משהו', 'at rotsa od mashehu', 'אתה רוצה עוד משהו', 'ata rotse od mashehu'),
    askedOfHer('بدِّك إشي تاني', "biddik ishi tāni", 'بدَّك إشي تاني', "biddak ishi tāni"),
  );
  const IM_FINE = c(
    'No, I am fine, thank you',
    ['לא, אני בסדר, תודה', 'lo, ani beseder, toda'],
    sp('لأ، أنا منيحة، شكرا', "laʾ, ana mnīḥa, shukran", 'لأ، أنا منيح، شكرا', "laʾ, ana mnīḥ, shukran"),
  );

  const situation: Situation = {
    name: "At someone's house",
    icon: '🏡',
    scene: 'You have been invited over. The door opens, and you are waved inside.',
    goal: 'Be a guest: accept what you want, decline what you do not, and thank them.',
    parts: [
      part('Being welcomed in', [
        turn(COME_IN, THANK_YOU),
        turn(SIT_DOWN, THANKS_A_LOT),
        turn(DRINK_SOMETHING, YES_PLEASE),
        turn(COFFEE_OR_TEA, COFFEE_THANKS),
        turn(COFFEE_OR_TEA, TEA_THANKS),
      ]),
      part('A good guest', [
        turn(ARE_YOU_HUNGRY, NOT_HUNGRY),
        turn(ARE_YOU_HUNGRY, A_LITTLE_HUNGRY),
        turn(COMFORTABLE, YES_THANK_YOU),
        turn(ANYTHING_ELSE_HOME, IM_FINE),
      ]),
    ],
    script: [
      node('door', COME_IN, THANK_YOU),
      node('sit', SIT_DOWN, THANKS_A_LOT),
      node('drink', DRINK_SOMETHING, YES_PLEASE),
      node('which', COFFEE_OR_TEA, COFFEE_THANKS, TEA_THANKS),
      // Hungry or not, both answers are welcome in this house — the
      // conversation simply moves on to whether she is comfortable.
      node(
        'hungry',
        ARE_YOU_HUNGRY,
        { card: NOT_HUNGRY, next: 'comfy' },
        { card: A_LITTLE_HUNGRY, next: 'comfy' },
      ),
      node('comfy', COMFORTABLE, YES_THANK_YOU),
      node('else', ANYTHING_ELSE_HOME, { card: IM_FINE, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At the shop -------------------------------------------------------------

const SHOP = (() => {
  const CAN_I_HELP = c(
    'Can I help you?',
    askedOfHer('אפשר לעזור לך', "efshar la'azor lakh", 'אפשר לעזור לך', "efshar la'azor lekha"),
    askedOfHer('بدِّك مساعدة', "biddik musāʿade", 'بدَّك مساعدة', "biddak musāʿade"),
    SAID,
  );
  const WANT_THIS_ONE = c(
    'I want this one, please',
    sp('אני רוצה את זה, בבקשה', 'ani rotsa et ze, bevakasha', 'אני רוצה את זה, בבקשה', 'ani rotse et ze, bevakasha'),
    ['بدّي هاد، لو سمحت', "biddi hād, law samaḥt"],
    SAID,
  );
  const THIS_ONE = c('This one?', ['זה', 'ze'], ['هاد', "hād"]);
  const ANOTHER_COLOUR = c(
    'Do you have this in another colour?',
    toL(['יש לך את זה בצבע אחר', 'yesh lekha et ze be-tseva akher'], ['יש לך את זה בצבע אחר', 'yesh lakh et ze be-tseva akher']),
    toL(['في عندك هاد بلون تاني', "fī ʿindak hād b-lōn tāni"], ['في عندك هاد بلون تاني', "fī ʿindik hād b-lōn tāni"]),
    SAID_BOTH,
  );
  const YES_THERE_IS = c('Yes, there is', ['כן, יש', 'ken, yesh'], ['آه، في', "āh, fī"]);
  const BIGGER_ONE = c(
    'A bigger one, please',
    ['יותר גדול, בבקשה', 'yoter gadol, bevakasha'],
    ['أكبر، لو سمحت', "akbar, law samaḥt"],
  );
  const IS_THIS_GOOD = c('Is this good?', ['זה טוב', 'ze tov'], ['هاد منيح', "hād mnīḥ"]);
  const I_LIKE_THIS_ONE = c(
    'Yes, I like this one',
    sp('כן, אני אוהבת את זה', 'ken, ani ohevet et ze', 'כן, אני אוהב את זה', 'ken, ani ohev et ze'),
    ['آه، بحبّ هاد', "āh, baḥibb hād"],
  );
  const DO_YOU_WANT_IT = c(
    'Do you want it?',
    askedOfHer('את רוצה אותו', 'at rotsa oto', 'אתה רוצה אותו', 'ata rotse oto'),
    askedOfHer('بدِّك ياه', "biddik yāh", 'بدَّك ياه', "biddak yāh"),
  );
  const FIFTY_SHEKELS = c('Fifty shekels', ['חמישים שקל', 'khamishim shekel'], ['خمسين شيكل', "khamsīn shēkel"]);
  const TOO_EXPENSIVE = c(
    'That is too expensive',
    ['זה יקר מדי', 'ze yakar miday'],
    ['هاد غالي كتير', "hād ghāli ktīr"],
  );
  const FOR_YOU_FORTY = c(
    'For you, forty',
    askedOfHer('בשבילך, ארבעים', "bishvilekh, arba'im", 'בשבילך, ארבעים', "bishvilkha, arba'im"),
    askedOfHer('عشانك، أربعين', "ʿashānik, arbʿīn", 'عشانك، أربعين', "ʿashānak, arbʿīn"),
    SAID_BOTH,
  );
  const ILL_TAKE_IT = c(
    'Good. I will take it',
    ['טוב. אני אקח את זה', 'tov. ani ekakh et ze'],
    ['منيح. باخده', "mnīḥ. bākhdo"],
  );
  const DONT_NEED_IT = c(
    'I do not need it, thank you',
    sp('אני לא צריכה את זה, תודה', 'ani lo tsrikha et ze, toda', 'אני לא צריך את זה, תודה', 'ani lo tsarikh et ze, toda'),
    ['مش لازمني، شكرا', "mish lāzimni, shukran"],
  );

  const situation: Situation = {
    name: 'At the shop',
    icon: '🛍️',
    scene: 'Something in the shop has caught your eye, and the shopkeeper has noticed you.',
    goal: 'Ask about the thing, argue the price, and buy it — or walk away politely.',
    parts: [
      part('Finding the right one', [
        turn(CAN_I_HELP, WANT_THIS_ONE),
        turn(THIS_ONE, ANOTHER_COLOUR),
        turn(YES_THERE_IS, BIGGER_ONE),
        turn(IS_THIS_GOOD, I_LIKE_THIS_ONE),
      ]),
      part('The price', [
        turn(DO_YOU_WANT_IT, HOW_MUCH_IS_THIS),
        turn(FIFTY_SHEKELS, TOO_EXPENSIVE),
        turn(FOR_YOU_FORTY, ILL_TAKE_IT),
        turn(FOR_YOU_FORTY, DONT_NEED_IT),
      ]),
    ],
    script: [
      node('help', CAN_I_HELP, WANT_THIS_ONE),
      node('which', THIS_ONE, ANOTHER_COLOUR),
      node('colour', YES_THERE_IS, BIGGER_ONE),
      node('good', IS_THIS_GOOD, I_LIKE_THIS_ONE),
      node('wantIt', DO_YOU_WANT_IT, HOW_MUCH_IS_THIS),
      node('price', FIFTY_SHEKELS, TOO_EXPENSIVE),
      // Haggling done, the choice is honestly hers: take it, or leave it and
      // still part on good terms. Both ways out end the interaction well.
      node(
        'offer',
        FOR_YOU_FORTY,
        { card: ILL_TAKE_IT, next: 'end' },
        { card: DONT_NEED_IT, next: 'end' },
      ),
    ],
  };
  return situation;
})();

// --- Asking for directions ---------------------------------------------------

const DIRECTIONS = (() => {
  const YES_CAN_HELP = c('Yes?', ['כן', 'ken'], ['نعم', "naʿam"], {
    ar: 'Said when answering somebody who has called you.',
  });
  const EXCUSE_ME_STATION = c(
    'Excuse me. Where is the station?',
    ['סליחה, איפה התחנה', 'slikha, eifo hatakhana'],
    toL(['لو سمحت، وين المحطّة', "law samaḥt, wēn il-maḥaṭṭa"], ['لو سمحتي، وين المحطّة', "law samaḥti, wēn il-maḥaṭṭa"]),
  );
  const NOT_FAR = c('It is not far', ['היא לא רחוקה', 'hi lo rekhoka'], ['مش بعيدة', "mish baʿīde"], {
    he: 'About the station, so the word is feminine.',
    ar: 'About the station, so the word is feminine.',
  });
  const LEFT_OR_RIGHT = c(
    'Left or right?',
    ['שמאלה או ימינה', 'smola o yamina'],
    ['عالشمال ولا عاليمين', "ʿash-shimāl walla ʿal-yamīn"],
  );
  const STRAIGHT_THEN_LEFT = c(
    'Go straight, then left',
    askedOfHer('לכי ישר, ואז שמאלה', 'lekhi yashar, ve-az smola', 'לך ישר, ואז שמאלה', 'lekh yashar, ve-az smola'),
    ['امشي دغري، وبعدين عالشمال', "imshi dughri, w-baʿdēn ʿash-shimāl"],
    { ar: 'The Arabic ends the same way whoever is being told.' },
  );
  const IS_IT_FAR = c('Is it far?', ['היא רחוקה', 'hi rekhoka'], ['بعيدة', "baʿīde"], {
    he: 'About the station, so the word is feminine.',
    ar: 'About the station, so the word is feminine.',
  });
  const NO_ITS_CLOSE = c('No, it is close', ['לא, היא קרובה', 'lo, hi krova'], ['لأ، قريبة', "laʾ, ʾarībe"]);
  const HOW_LONG_WALK = c('How long on foot?', ['כמה זמן ברגל', 'kama zman ba-regel'], ['قدّيش مشي', "addēsh mashi"]);
  const FIVE_MINUTES = c('Five minutes', ['חמש דקות', 'khamesh dakot'], ['خمس دقايق', "khams daʾāyiʾ"]);

  const situation: Situation = {
    name: 'Asking for directions',
    icon: '🧭',
    scene: 'You are somewhere unfamiliar and need the station. You stop a passer-by.',
    goal: 'Find out where the station is, which way to walk, and how far it is.',
    parts: [
      part('Finding the station', [
        turn(YES_CAN_HELP, EXCUSE_ME_STATION),
        turn(NOT_FAR, LEFT_OR_RIGHT),
        turn(STRAIGHT_THEN_LEFT, IS_IT_FAR),
        turn(NO_ITS_CLOSE, HOW_LONG_WALK),
        turn(FIVE_MINUTES, THANKS_A_LOT),
      ]),
    ],
    script: [
      node('stop', YES_CAN_HELP, EXCUSE_ME_STATION),
      node('near', NOT_FAR, LEFT_OR_RIGHT),
      node('way', STRAIGHT_THEN_LEFT, IS_IT_FAR),
      node('close', NO_ITS_CLOSE, HOW_LONG_WALK),
      node('time', FIVE_MINUTES, { card: THANKS_A_LOT, next: 'end' }),
    ],
  };
  return situation;
})();

// --- Taking a taxi -----------------------------------------------------------

const TAXI = (() => {
  const WHERE_TO = c('Where to?', ['לאן', "le'an"], ['على وين', "ʿala wēn"]);
  const GO_HERE = c(
    'I want to go here, please',
    sp('אני רוצה לנסוע לפה, בבקשה', "ani rotsa linso'a lepo, bevakasha", 'אני רוצה לנסוע לפה, בבקשה', "ani rotse linso'a lepo, bevakasha"),
    ['بدّي أروح لهون، لو سمحت', "biddi arūḥ la-hōn, law samaḥt"],
    { he: 'Written the same either way; only the ending is said differently.', ar: 'Said while showing the driver the address.' },
  );
  const NO_PROBLEM = c('No problem', ['אין בעיה', "ein ba'aya"], ['مش مشكلة', "mish mushkile"]);
  const LEFT_HERE = c(
    'Left here, please',
    ['שמאלה פה, בבקשה', 'smola po, bevakasha'],
    ['عالشمال هون، لو سمحت', "ʿash-shimāl hōn, law samaḥt"],
  );
  const OKAY = c('Okay', ['בסדר', 'beseder'], ['طيّب', "ṭayyib"]);
  const STOP_HERE = c(
    'Can you stop here?',
    toL(['תעצור פה בבקשה', "ta'atsor po bevakasha"], ['תעצרי פה בבקשה', "ta'atsri po bevakasha"]),
    toL(['وقّف هون لو سمحت', "waʾʾif hōn law samaḥt"], ['وقّفي هون لو سمحتي', "waʾʾfi hōn law samaḥti"]),
  );
  const WE_ARE_HERE = c('We are here', ['הגענו', 'higanu'], ['وصلنا', "wṣilna"]);
  const HOW_MUCH_RIDE = c('How much is it?', ['כמה זה עולה', 'kama ze ole'], ['قدّيش الحساب', "addēsh il-ḥsāb"], {
    ar: 'Literally "how much is the bill".',
  });
  const THIRTY_SHEKELS = c('Thirty shekels', ['שלושים שקל', 'shloshim shekel'], ['تلاتين شيكل', "talātīn shēkel"]);
  const PAY_BY_CARD = c(
    'Can I pay by card?',
    ['אפשר לשלם בכרטיס', 'efshar leshalem be-kartis'],
    ['ممكن أدفع بالكرت', "mumkin adfaʿ bil-kart"],
  );
  const YES_OF_COURSE = c('Yes, of course', ['כן, בטח', 'ken, betakh'], ['آه، أكيد', "āh, akīd"]);

  const situation: Situation = {
    name: 'Taking a taxi',
    icon: '🚕',
    scene: 'You have flagged down a taxi and opened the door.',
    goal: 'Get where you are going, steer the driver at the end, and pay.',
    parts: [
      part('The ride', [
        turn(WHERE_TO, GO_HERE),
        turn(NO_PROBLEM, LEFT_HERE),
        turn(OKAY, STOP_HERE),
      ]),
      part('Paying the driver', [
        turn(WE_ARE_HERE, HOW_MUCH_RIDE),
        turn(THIRTY_SHEKELS, PAY_BY_CARD),
        turn(YES_OF_COURSE, THANKS_A_LOT),
      ]),
    ],
    script: [
      node('whereTo', WHERE_TO, GO_HERE),
      node('going', NO_PROBLEM, LEFT_HERE),
      node('nearly', OKAY, STOP_HERE),
      node('arrived', WE_ARE_HERE, HOW_MUCH_RIDE),
      node('price', THIRTY_SHEKELS, PAY_BY_CARD),
      node('card', YES_OF_COURSE, { card: THANKS_A_LOT, next: 'end' }),
    ],
  };
  return situation;
})();

// --- Catching the bus --------------------------------------------------------

const BUS = (() => {
  const BUS_IS_LATE = c(
    'The bus is late today',
    ['האוטובוס מאחר היום', "ha-otobus me'akher hayom"],
    ['الباص متأخّر اليوم', "il-bāṣ mitʾakhkhir il-yōm"],
  );
  const WHEN_COME = c('When does it come?', ['מתי הוא מגיע', 'matai hu magia'], ['إيمتى بيجي', "ēmta bīji"]);
  const TEN_MINUTES = c(
    'In ten minutes',
    ['בעוד עשר דקות', "be'od eser dakot"],
    ['بعد عشر دقايق', "baʿd ʿashar daʾāyiʾ"],
  );
  const GOOD_THANKS = c('Good, thank you', ['טוב, תודה', 'tov, toda'], ['منيح، شكرا', "mnīḥ, shukran"]);
  const WHERE_TO_BUS = c('Where to?', ['לאן', "le'an"], ['على وين', "ʿala wēn"]);
  const GO_TO_TOWN = c(
    'Does this bus go to town?',
    ['האוטובוס הזה נוסע למרכז', "ha-otobus haze nose'a la-merkaz"],
    ['هاد الباص بيروح عالبلد', "hād il-bāṣ birūḥ ʿal-balad"],
  );
  const YES_IT_GOES = c('Yes, it goes there', ['כן, הוא נוסע לשם', "ken, hu nose'a lesham"], ['آه، بيروح', "āh, birūḥ"]);
  const HOW_MANY_STOPS = c('How many stops?', ['כמה תחנות', 'kama takhanot'], ['كم محطّة', "kam maḥaṭṭa"]);
  const FOUR_STOPS = c('Four stops', ['ארבע תחנות', 'arba takhanot'], ['أربع محطّات', "arbaʿ maḥaṭṭāt"]);
  const WHERE_GET_OFF = c(
    'Where do I get off?',
    sp('איפה אני יורדת', 'eifo ani yoredet', 'איפה אני יורד', 'eifo ani yored'),
    ['وين بنزل', "wēn banzil"],
  );
  const ILL_TELL_YOU = c(
    'I will tell you',
    askedOfHer('אני אגיד לך', 'ani agid lakh', 'אני אגיד לך', 'ani agid lekha'),
    askedOfHer('بقلّك', "baʾillik", 'بقلّك', "baʾillak"),
    SAID_BOTH,
  );
  const THIS_IS_YOUR_STOP = c(
    'This is your stop',
    askedOfHer('זאת התחנה שלך', 'zot hatakhana shelakh', 'זאת התחנה שלך', 'zot hatakhana shelkha'),
    askedOfHer('هاي محطّتك', "hayy maḥaṭṭtik", 'هاي محطّتك', "hayy maḥaṭṭtak"),
    SAID_BOTH,
  );
  const GETTING_OFF = c(
    'Thank you. I am getting off here',
    sp('תודה. אני יורדת פה', 'toda. ani yoredet po', 'תודה. אני יורד פה', 'toda. ani yored po'),
    ['شكرا. بنزل هون', "shukran. banzil hōn"],
  );

  const situation: Situation = {
    name: 'Catching the bus',
    icon: '🚌',
    scene: 'You are waiting at the stop, not entirely sure this is the right bus.',
    goal: 'Check the bus goes your way, find out where to get off, and get off there.',
    parts: [
      part('At the stop', [
        turn(BUS_IS_LATE, WHEN_COME),
        turn(TEN_MINUTES, GOOD_THANKS),
      ]),
      part('On the bus', [
        turn(WHERE_TO_BUS, GO_TO_TOWN),
        turn(YES_IT_GOES, HOW_MANY_STOPS),
        turn(FOUR_STOPS, WHERE_GET_OFF),
        turn(ILL_TELL_YOU, THANK_YOU),
        turn(THIS_IS_YOUR_STOP, GETTING_OFF),
      ]),
    ],
    script: [
      node('late', BUS_IS_LATE, WHEN_COME),
      node('soon', TEN_MINUTES, GOOD_THANKS),
      node('board', WHERE_TO_BUS, GO_TO_TOWN),
      node('goes', YES_IT_GOES, HOW_MANY_STOPS),
      node('stops', FOUR_STOPS, WHERE_GET_OFF),
      node('tell', ILL_TELL_YOU, THANK_YOU),
      node('off', THIS_IS_YOUR_STOP, { card: GETTING_OFF, next: 'end' }),
    ],
  };
  return situation;
})();

// --- Making a plan -----------------------------------------------------------

const PLANS = (() => {
  const DOING_TOMORROW = c(
    'What are you doing tomorrow?',
    askedOfHer('מה את עושה מחר', 'ma at osa makhar', 'מה אתה עושה מחר', 'ma ata ose makhar'),
    askedOfHer('شو رح تعملي بكرا', "shū raḥ tiʿmali bukra", 'شو رح تعمل بكرا', "shū raḥ tiʿmal bukra"),
  );
  const WORKING_TOMORROW = c(
    'Tomorrow I am working',
    sp('מחר אני עובדת', 'makhar ani ovedet', 'מחר אני עובד', 'makhar ani oved'),
    ['بكرا بشتغل', "bukra bashtighil"],
  );
  const FREE_EVENING = c(
    'Are you free in the evening?',
    askedOfHer('את פנויה בערב', 'at pnuya ba-erev', 'אתה פנוי בערב', 'ata panuy ba-erev'),
    askedOfHer('فاضية المسا', "fāḍye il-masa", 'فاضي المسا', "fāḍi il-masa"),
  );
  const YES_FREE = c(
    'Yes, I am free in the evening',
    sp('כן, אני פנויה בערב', 'ken, ani pnuya ba-erev', 'כן, אני פנוי בערב', 'ken, ani panuy ba-erev'),
    sp('آه، فاضية المسا', "āh, fāḍye il-masa", 'آه، فاضي المسا', "āh, fāḍi il-masa"),
  );
  const NO_BUSY = c(
    'No, I am busy',
    sp('לא, אני עסוקה', 'lo, ani asuka', 'לא, אני עסוק', 'lo, ani asuk'),
    sp('لأ، أنا مشغولة', "laʾ, ana mashghūle", 'لأ، أنا مشغول', "laʾ, ana mashghūl"),
  );
  const AND_SATURDAY = c('And on Saturday?', ['ובשבת', 'uv-shabat'], ['ويوم السبت', "w-yōm is-sabt"]);
  const SATURDAY_GOOD = c('Saturday is good', ['שבת זה טוב', 'shabat ze tov'], ['يوم السبت منيح', "yōm is-sabt mnīḥ"]);
  const GO_SOMEWHERE = c(
    'Do you want to go somewhere?',
    askedOfHer('את רוצה לצאת', 'at rotsa latset', 'אתה רוצה לצאת', 'ata rotse latset'),
    askedOfHer('بدِّك نطلع', "biddik niṭlaʿ", 'بدَّك نطلع', "biddak niṭlaʿ"),
  );
  const YES_WHERE = c('Yes. Where?', ['כן. לאן', "ken. le'an"], ['آه. على وين', "āh. ʿala wēn"]);
  const TO_THE_SEA = c('To the sea', ['לים', 'la-yam'], ['عالبحر', "ʿal-baḥr"]);
  const WHAT_TIME = c('What time?', ['באיזו שעה', "be-eizo sha'a"], ['أيّ ساعة', "ayy sāʿa"]);
  const AT_SEVEN = c('At seven', ['בשבע', 'be-sheva'], ['الساعة سبعة', "is-sāʿa sabʿa"]);
  const CAN_AT_SEVEN = c(
    'I can go at seven',
    sp('אני יכולה בשבע', 'ani yekhola be-sheva', 'אני יכול בשבע', 'ani yakhol be-sheva'),
    ['بقدر الساعة سبعة', "baʾdar is-sāʿa sabʿa"],
  );
  const CANT_THEN = c(
    'I cannot go then. Maybe later',
    sp('אני לא יכולה אז. אולי אחר כך', 'ani lo yekhola az. ulay akhar kakh', 'אני לא יכול אז. אולי אחר כך', 'ani lo yakhol az. ulay akhar kakh'),
    ['ما بقدر وقتها. يمكن بعدين', "mā baʾdar waʾitha. yimkin baʿdēn"],
  );
  const AT_EIGHT = c('At eight?', ['בשמונה', 'bi-shmone'], ['الساعة تمانية', "is-sāʿa tamānye"]);
  const EIGHT_GOOD = c('Eight is good', ['שמונה זה טוב', 'shmone ze tov'], ['التمانية منيح', "it-tamānye mnīḥ"]);
  const SEE_YOU = c(
    'Great. See you tomorrow',
    ['מעולה. נתראה מחר', "me'ule. nitra'e makhar"],
    askedOfHer('ممتاز. منشوفك بكرا', "mumtāz. minshūfik bukra", 'ممتاز. منشوفك بكرا', "mumtāz. minshūfak bukra"),
    SAID_AR,
  );
  const SEE_YOU_TOMORROW = c(
    'See you tomorrow',
    ['נתראה מחר', "nitra'e makhar"],
    toL(['منشوفك بكرا', "minshūfak bukra"], ['منشوفك بكرا', "minshūfik bukra"]),
    SAID_AR,
  );

  const situation: Situation = {
    name: 'Making a plan',
    icon: '📅',
    scene: 'A friend wants to see you, and is trying to find a time that works.',
    goal: 'Agree on a plan: where you are going, on what day, and at what time.',
    parts: [
      part('Finding a free time', [
        turn(DOING_TOMORROW, WORKING_TOMORROW),
        turn(FREE_EVENING, YES_FREE),
        turn(FREE_EVENING, NO_BUSY),
        turn(AND_SATURDAY, SATURDAY_GOOD),
      ]),
      part('Where and when', [
        turn(GO_SOMEWHERE, YES_WHERE),
        turn(TO_THE_SEA, WHAT_TIME),
        turn(AT_SEVEN, CAN_AT_SEVEN),
        turn(AT_SEVEN, CANT_THEN),
        turn(AT_EIGHT, EIGHT_GOOD),
        turn(SEE_YOU, SEE_YOU_TOMORROW),
      ]),
    ],
    script: [
      node('tomorrow', DOING_TOMORROW, WORKING_TOMORROW),
      // The first fork: free tonight, or busy — and busy does not end the
      // plan, it moves it to Saturday. Saying no is part of planning.
      node(
        'free',
        FREE_EVENING,
        { card: YES_FREE, next: 'out' },
        { card: NO_BUSY, next: 'saturday' },
      ),
      node('saturday', AND_SATURDAY, { card: SATURDAY_GOOD, next: 'out' }),
      node('out', GO_SOMEWHERE, YES_WHERE),
      node('where', TO_THE_SEA, WHAT_TIME),
      // The second fork: seven works, or it does not — and the friend simply
      // offers eight instead.
      node(
        'seven',
        AT_SEVEN,
        { card: CAN_AT_SEVEN, next: 'settled' },
        { card: CANT_THEN, next: 'eight' },
      ),
      node('eight', AT_EIGHT, { card: EIGHT_GOOD, next: 'settled' }),
      node('settled', SEE_YOU, { card: SEE_YOU_TOMORROW, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At work -----------------------------------------------------------------

const WORK = (() => {
  const CAN_YOU_HELP = c(
    'Can you help me?',
    askedOfHer('את יכולה לעזור לי', "at yekhola la'azor li", 'אתה יכול לעזור לי', "ata yakhol la'azor li"),
    askedOfHer('بتقدري تساعديني', "btiʾdari tsāʿidīni", 'بتقدر تساعدني', "btiʾdar tsāʿidni"),
  );
  const YES_OF_COURSE = c('Yes, of course', ['כן, בטח', 'ken, betakh'], ['آه، أكيد', "āh, akīd"]);
  const CAN_YOU_DO_THIS = c(
    'Can you do this?',
    askedOfHer('את יכולה לעשות את זה', "at yekhola la'asot et ze", 'אתה יכול לעשות את זה', "ata yakhol la'asot et ze"),
    askedOfHer('بتقدري تعملي هاد', "btiʾdari tiʿmali hād", 'بتقدر تعمل هاد', "btiʾdar tiʿmal hād"),
  );
  const I_CAN = c('I can', sp('אני יכולה', 'ani yekhola', 'אני יכול', 'ani yakhol'), ['بقدر', "baʾdar"]);
  const IS_THIS_RIGHT = c('Is this right?', ['זה נכון', 'ze nakhon'], ['هيك صح', "hēk ṣaḥḥ"]);
  const NOT_SURE = c(
    'One moment. I am not sure',
    sp('רגע. אני לא בטוחה', 'rega. ani lo btukha', 'רגע. אני לא בטוח', 'rega. ani lo batuakh'),
    sp('لحظة. مش متأكّدة', "laḥẓa. mish mitʾakkde", 'لحظة. مش متأكّد', "laḥẓa. mish mitʾakkid"),
  );
  const WHAT_DO_YOU_NEED = c(
    'What do you need?',
    askedOfHer('מה את צריכה', 'ma at tsrikha', 'מה אתה צריך', 'ma ata tsarikh'),
    askedOfHer('شو لازمك', "shū lāzmik", 'شو لازمك', "shū lāzmak"),
    SAID_AR,
  );
  const I_NEED_HELP = c(
    'I need help',
    sp('אני צריכה עזרה', 'ani tsrikha ezra', 'אני צריך עזרה', 'ani tsarikh ezra'),
    ['لازمني مساعدة', "lāzimni musāʿade"],
  );
  const WAIT_A_MINUTE = c(
    'Wait a minute',
    askedOfHer('חכי רגע', 'khaki rega', 'חכה רגע', 'khake rega'),
    askedOfHer('استني دقيقة', "istanni daʾīʾa", 'استنى دقيقة', "istanna daʾīʾa"),
  );
  const DO_IT_LATER = c(
    'No problem. I will do it later',
    ['אין בעיה. אני אעשה את זה אחר כך', "ein ba'aya. ani e'ese et ze akhar kakh"],
    ['مش مشكلة. بعملها بعدين', "mish mushkile. baʿmilha baʿdēn"],
  );
  const IS_IT_FINISHED = c(
    'Is it finished?',
    askedOfHer('סיימת', 'siyamt', 'סיימת', 'siyamta'),
    askedOfHer('خلّصتي', "khallaṣti", 'خلّصت', "khallaṣt"),
    SAID,
  );
  const FINISHING_NOW = c(
    'Not yet. I am finishing now',
    sp('עדיין לא. אני מסיימת עכשיו', 'adayin lo. ani mesayemet akhshav', 'עדיין לא. אני מסיים עכשיו', 'adayin lo. ani mesayem akhshav'),
    ['لسّا. عم أخلّص هلّق', "lissa. ʿam akhalliṣ hallaʾ"],
  );

  const situation: Situation = {
    name: 'At work',
    icon: '🧰',
    scene: 'A colleague has come over with something in hand, and needs you.',
    goal: 'Say what you can do, what you need, and when it will be done.',
    parts: [
      part('Being asked', [
        turn(CAN_YOU_HELP, YES_OF_COURSE),
        turn(CAN_YOU_DO_THIS, I_CAN),
        turn(IS_THIS_RIGHT, NOT_SURE),
      ]),
      part('Asking back', [
        turn(WHAT_DO_YOU_NEED, I_NEED_HELP),
        turn(WAIT_A_MINUTE, DO_IT_LATER),
        turn(IS_IT_FINISHED, FINISHING_NOW),
      ]),
    ],
    script: [
      node('help', CAN_YOU_HELP, YES_OF_COURSE),
      node('doThis', CAN_YOU_DO_THIS, I_CAN),
      node('right', IS_THIS_RIGHT, NOT_SURE),
      node('need', WHAT_DO_YOU_NEED, I_NEED_HELP),
      node('wait', WAIT_A_MINUTE, DO_IT_LATER),
      node('finished', IS_IT_FINISHED, { card: FINISHING_NOW, next: 'end' }),
    ],
  };
  return situation;
})();

// --- Saying you are learning -------------------------------------------------

const LEARNING = (() => {
  const YOU_SPEAK_HEBREW = c(
    'You speak Hebrew!',
    askedOfHer('את מדברת עברית', 'at medaberet ivrit', 'אתה מדבר עברית', 'ata medaber ivrit'),
    ['بتحكي عبري', "btiḥki ʿibri"],
    { ar: 'This verb ends the same way to a woman and to a man.' },
  );
  const A_LITTLE_LEARNING = c(
    'A little. I am learning',
    sp('קצת. אני לומדת', 'ktsat. ani lomedet', 'קצת. אני לומד', 'ktsat. ani lomed'),
    ['شويّة. عم أتعلّم', "shwayye. ʿam atʿallam"],
  );
  const ARABIC_TOO = c(
    'Do you speak Arabic too?',
    askedOfHer('את מדברת גם ערבית', 'at medaberet gam aravit', 'אתה מדבר גם ערבית', 'ata medaber gam aravit'),
    ['بتحكي عربي كمان', "btiḥki ʿarabi kamān"],
    { ar: 'This verb ends the same way to a woman and to a man.' },
  );
  const LEARNING_PALESTINIAN = c(
    'I am learning Palestinian Arabic',
    sp('אני לומדת ערבית פלסטינית', 'ani lomedet aravit falastinit', 'אני לומד ערבית פלסטינית', 'ani lomed aravit falastinit'),
    ['عم أتعلّم عربي فلسطيني', "ʿam atʿallam ʿarabi falasṭīni"],
  );
  const CAN_YOU_READ = c(
    'Can you read it?',
    askedOfHer('את יודעת לקרוא', "at yoda'at likro", 'אתה יודע לקרוא', "ata yode'a likro"),
    askedOfHer('بتعرفي تقري', "btiʿrafi tiʾri", 'بتعرف تقرا', "btiʿraf tiʾra"),
  );
  const UNDERSTAND_MORE = c(
    'A little. I understand more than I speak',
    sp('קצת. אני מבינה יותר ממה שאני מדברת', 'ktsat. ani mevina yoter mi-ma she-ani medaberet', 'קצת. אני מבין יותר ממה שאני מדבר', 'ktsat. ani mevin yoter mi-ma she-ani medaber'),
    ['شويّة. بفهم أكتر مما بحكي', "shwayye. bafham aktar mimma baḥki"],
  );
  const FAST_SENTENCE = c(
    'Tomorrow we are all going to the market in the old city',
    ['מחר כולנו הולכים לשוק בעיר העתיקה', 'makhar kulanu holkhim la-shuk ba-ir ha-atika'],
    ['بكرا كلنا رايحين عالسوق بالبلد القديمة', "bukra kullna rāyḥīn ʿas-sūʾ bil-balad il-ʾadīme"],
  );
  const MORE_SLOWLY = c(
    'More slowly, please',
    ['לאט יותר בבקשה', "le'at yoter bevakasha"],
    ['شوي شوي لو سمحت', "shwayy shwayy law samaḥt"],
  );
  const WHAT_DOES_IT_MEAN = c('What does that mean?', ['מה זה אומר', 'ma ze omer'], ['شو معناها', "shū maʿnāha"]);
  const MEANS_MARKET = c('It means the market', ['זה אומר השוק', 'ze omer ha-shuk'], ['يعني السوق', "yaʿni is-sūʾ"]);
  const NOW_I_UNDERSTAND = c(
    'Now I understand. Thank you',
    sp('עכשיו אני מבינה. תודה', 'akhshav ani mevina. toda', 'עכשיו אני מבין. תודה', 'akhshav ani mevin. toda'),
    ['هلّق بفهم. شكرا', "hallaʾ bafham. shukran"],
  );
  const YOUR_ARABIC_GOOD = c(
    'Your Arabic is good!',
    askedOfHer('הערבית שלך טובה', 'ha-aravit shelakh tova', 'הערבית שלך טובה', 'ha-aravit shelkha tova'),
    askedOfHer('عربيّك منيح', "ʿarabiyyik mnīḥ", 'عربيّك منيح', "ʿarabiyyak mnīḥ"),
    SAID_BOTH,
  );
  const STILL_IMPROVING = c(
    'Thank you. I am still learning, but I am improving',
    sp('תודה. אני עדיין לומדת, אבל אני משתפרת', 'toda. ani adayin lomedet, aval ani mishtaperet', 'תודה. אני עדיין לומד, אבל אני משתפר', 'toda. ani adayin lomed, aval ani mishtaper'),
    ['شكرا. لسّا عم أتعلّم، بس عم أتحسّن', "shukran. lissa ʿam atʿallam, bass ʿam atḥassan"],
  );

  const situation: Situation = {
    name: 'Saying you are learning',
    icon: '🗣️',
    scene: 'Somebody has noticed you understand them, and is delighted about it.',
    goal: 'Explain what you are learning, and slow the conversation down when you need to.',
    parts: [
      part('What you are learning', [
        turn(YOU_SPEAK_HEBREW, A_LITTLE_LEARNING),
        turn(ARABIC_TOO, LEARNING_PALESTINIAN),
        turn(CAN_YOU_READ, UNDERSTAND_MORE),
      ]),
      part('Slowing them down', [
        turn(FAST_SENTENCE, MORE_SLOWLY),
        turn(FAST_SENTENCE, WHAT_DOES_IT_MEAN),
        turn(MEANS_MARKET, NOW_I_UNDERSTAND),
        turn(YOUR_ARABIC_GOOD, STILL_IMPROVING),
      ]),
    ],
    script: [
      node('noticed', YOU_SPEAK_HEBREW, A_LITTLE_LEARNING),
      node('arabicToo', ARABIC_TOO, LEARNING_PALESTINIAN),
      node('read', CAN_YOU_READ, UNDERSTAND_MORE),
      // The fork every learner actually faces: a sentence arrives too fast.
      // Asking them to slow down, or asking what a word means, are both moves
      // that keep her in the conversation — which is the lesson.
      node(
        'fast',
        FAST_SENTENCE,
        { card: MORE_SLOWLY, next: 'meaning' },
        { card: WHAT_DOES_IT_MEAN, next: 'meaning' },
      ),
      node('meaning', MEANS_MARKET, NOW_I_UNDERSTAND),
      node('praise', YOUR_ARABIC_GOOD, { card: STILL_IMPROVING, next: 'end' }),
    ],
  };
  return situation;
})();

// --- At the doctor -----------------------------------------------------------

const DOCTOR = (() => {
  const HOW_FEELING = c(
    'How are you feeling?',
    askedOfHer('איך את מרגישה', 'ekh at margisha', 'איך אתה מרגיש', 'ekh ata margish'),
    askedOfHer('كيف حاسّة حالك', "kīf ḥāsse ḥālik", 'كيف حاسس حالك', "kīf ḥāsis ḥālak"),
  );
  const DONT_FEEL_WELL = c(
    'I do not feel well',
    sp('אני לא מרגישה טוב', 'ani lo margisha tov', 'אני לא מרגיש טוב', 'ani lo margish tov'),
    sp('مش حاسّة حالي منيح', "mish ḥāsse ḥāli mnīḥ", 'مش حاسس حالي منيح', "mish ḥāsis ḥāli mnīḥ"),
  );
  const WHERE_HURT = c(
    'Where does it hurt?',
    ['איפה כואב', "eifo ko'ev"],
    askedOfHer('وين بيوجعك', "wēn byūjaʿik", 'وين بيوجعك', "wēn byūjaʿak"),
    SAID_AR,
  );
  const HEAD_HURTS = c('My head hurts', ['כואב לי הראש', "ko'ev li harosh"], ['راسي بيوجعني', "rāsi byūjaʿni"]);
  const SINCE_WHEN = c('Since when?', ['ממתי', 'mi-matai'], ['من إيمتى', "min ēmta"]);
  const SINCE_YESTERDAY = c('Since yesterday', ['מאתמול', 'me-etmol'], ['من مبارح', "min mbāriḥ"]);
  const STOMACH_TOO = c(
    'Does your stomach hurt too?',
    ['גם הבטן כואבת', "gam habeten ko'evet"],
    askedOfHer('بطنك كمان بتوجعك', "baṭnik kamān btūjaʿik", 'بطنك كمان بتوجعك', "baṭnak kamān btūjaʿak"),
    SAID_AR,
  );
  const ONLY_HEAD = c('No, only my head', ['לא, רק הראש', 'lo, rak harosh'], ['لأ، بس راسي', "laʾ, bass rāsi"]);
  const NEED_MEDICINE = c(
    'You need medicine',
    askedOfHer('את צריכה תרופה', 'at tsrikha trufa', 'אתה צריך תרופה', 'ata tsarikh trufa'),
    askedOfHer('لازمك دوا', "lāzmik dawa", 'لازمك دوا', "lāzmak dawa"),
    SAID_AR,
  );
  const HOW_OFTEN = c(
    'How often?',
    ['כמה פעמים ביום', "kama pe'amim be-yom"],
    ['كم مرّة باليوم', "kam marra bil-yōm"],
    { he: 'Literally "how many times a day".', ar: 'Literally "how many times a day".' },
  );
  const TWICE_A_DAY = c('Twice a day', ['פעמיים ביום', "pa'amayim be-yom"], ['مرّتين باليوم', "marrtēn bil-yōm"]);
  const BEFORE_OR_AFTER = c(
    'Before food or after food?',
    ['לפני האוכל או אחרי האוכל', 'lifney ha-okhel o akharey ha-okhel'],
    ['قبل الأكل ولا بعد الأكل', "ʾabl il-akl walla baʿd il-akl"],
  );
  const AFTER_FOOD = c('After food', ['אחרי האוכל', 'akharey ha-okhel'], ['بعد الأكل', "baʿd il-akl"]);
  const MORNING_OR_EVENING = c(
    'Morning or evening?',
    ['בבוקר או בערב', 'ba-boker o ba-erev'],
    ['الصبح ولا المسا', "iṣ-ṣubḥ walla il-masa"],
  );
  const MORNING_AND_EVENING = c(
    'Morning and evening',
    ['בבוקר ובערב', 'ba-boker u-va-erev'],
    ['الصبح والمسا', "iṣ-ṣubḥ w-il-masa"],
  );
  const I_UNDERSTAND_THANKS = c(
    'I understand. Thank you',
    ['הבנתי. תודה', 'hevanti. toda'],
    ['فهمت. شكرا', "fhimt. shukran"],
  );

  const situation: Situation = {
    name: 'At the doctor',
    icon: '💊',
    scene: 'You are not feeling right, and the doctor has called you in.',
    goal: 'Say what hurts and since when, and understand how to take the medicine.',
    parts: [
      part('Saying what hurts', [
        turn(HOW_FEELING, DONT_FEEL_WELL),
        turn(WHERE_HURT, HEAD_HURTS),
        turn(SINCE_WHEN, SINCE_YESTERDAY),
        turn(STOMACH_TOO, ONLY_HEAD),
        turn(NEED_MEDICINE, HOW_OFTEN),
      ]),
      part('Taking the medicine', [
        turn(TWICE_A_DAY, BEFORE_OR_AFTER),
        turn(AFTER_FOOD, MORNING_OR_EVENING),
        turn(MORNING_AND_EVENING, I_UNDERSTAND_THANKS),
      ]),
    ],
    script: [
      node('feeling', HOW_FEELING, DONT_FEEL_WELL),
      node('where', WHERE_HURT, HEAD_HURTS),
      node('since', SINCE_WHEN, SINCE_YESTERDAY),
      node('stomach', STOMACH_TOO, ONLY_HEAD),
      node('medicine', NEED_MEDICINE, HOW_OFTEN),
      node('often', TWICE_A_DAY, BEFORE_OR_AFTER),
      node('food', AFTER_FOOD, MORNING_OR_EVENING),
      node('when', MORNING_AND_EVENING, { card: I_UNDERSTAND_THANKS, next: 'end' }),
    ],
  };
  return situation;
})();

// --- Helping someone ---------------------------------------------------------

/*
 * The one scenario where the roles reverse: the other person is the one
 * struggling, and most of her lines are the caring questions and gentle
 * instructions. Their lines about themselves follow *their* gender (`toL` on a
 * cue, exactly like "I am learning Arabic" in Conversation Flow), and her
 * instructions to them do too — this is the caregiving language the Directions
 * decks teach, put to its real use.
 */
const HELPING = (() => {
  const NOT_WELL = c(
    'I do not feel well',
    toL(['אני לא מרגיש טוב', 'ani lo margish tov'], ['אני לא מרגישה טוב', 'ani lo margisha tov']),
    toL(['مش حاسس حالي منيح', "mish ḥāsis ḥāli mnīḥ"], ['مش حاسّة حالي منيح', "mish ḥāsse ḥāli mnīḥ"]),
  );
  const WHATS_WRONG = c(
    'What is wrong?',
    ['מה קרה', 'ma kara'],
    toL(['شو مالك', "shū mālak"], ['شو مالك', "shū mālik"]),
    SAID_AR,
  );
  const IT_HURTS = c('It hurts', ['כואב לי', "ko'ev li"], ['بيوجعني', "byūjaʿni"]);
  const WHERE_DOES_IT_HURT = c(
    'Where does it hurt?',
    ['איפה כואב', "eifo ko'ev"],
    toL(['وين بيوجعك', "wēn byūjaʿak"], ['وين بيوجعك', "wēn byūjaʿik"]),
    SAID_AR,
  );
  const MY_HEAD = c('My head hurts', ['כואב לי הראש', "ko'ev li harosh"], ['راسي بيوجعني', "rāsi byūjaʿni"]);
  const WANT_TO_SIT = c(
    'Do you want to sit down?',
    toL(['אתה רוצה לשבת', 'ata rotse lashevet'], ['את רוצה לשבת', 'at rotsa lashevet']),
    toL(['بدَّك تقعد', "biddak tuʾʿud"], ['بدِّك تقعدي', "biddik tuʾʿudi"]),
  );
  const YES = c('Yes', ['כן', 'ken'], ['آه', 'āh']);
  const ILL_HELP_YOU = c(
    'Wait, I will help you',
    toL(['חכה, אני אעזור לך', "khake, ani e'ezor lekha"], ['חכי, אני אעזור לך', "khaki, ani e'ezor lakh"]),
    toL(['استنى، بساعدك', "istanna, basāʿdak"], ['استني، بساعدك', "istanni, basāʿdik"]),
  );
  const WANT_TO_SIT_THEM = c(
    'I want to sit down',
    toL(['אני רוצה לשבת', 'ani rotse lashevet'], ['אני רוצה לשבת', 'ani rotsa lashevet']),
    ['بدّي أقعد', "biddi aʾʿud"],
    { he: 'Written the same either way; only the ending is said differently.', ar: 'One form whoever is speaking.' },
  );
  const SIT_SLOWLY = c(
    'Sit down slowly',
    toL(['שב לאט', "shev le'at"], ['שבי לאט', "shvi le'at"]),
    toL(['اقعد شوي شوي', "uʾʿud shway shway"], ['اقعدي شوي شوي', "uʾʿudi shway shway"]),
  );
  const THANK_YOU_THEM = c('Thank you', ['תודה', 'toda'], ['شكرا', 'shukran']);
  const ARE_YOU_COMFORTABLE = c(
    'Are you comfortable?',
    toL(['נוח לך', 'noakh lekha'], ['נוח לך', 'noakh lakh']),
    toL(['مرتاح', "mirtāḥ"], ['مرتاحة', "mirtāḥa"]),
    SAID,
  );
  const MUCH_BETTER = c('Yes, much better', ['כן, הרבה יותר טוב', 'ken, harbe yoter tov'], ['آه، أحسن بكتير', "āh, aḥsan b-ktīr"]);
  const WANT_WATER = c(
    'Do you want water?',
    toL(['אתה רוצה מים', 'ata rotse mayim'], ['את רוצה מים', 'at rotsa mayim']),
    toL(['بدَّك ميّة', "biddak mayye"], ['بدِّك ميّة', "biddik mayye"]),
  );
  const YES_PLEASE_THEM = c('Yes, please', ['כן, בבקשה', 'ken, bevakasha'], ['آه، لو سمحت', "āh, law samaḥt"]);
  const CALL_SOMEONE = c(
    'Do you want me to call someone?',
    toL(['אתה רוצה שאתקשר למישהו', 'ata rotse she-etkasher le-mishehu'], ['את רוצה שאתקשר למישהו', 'at rotsa she-etkasher le-mishehu']),
    toL(['بدَّك أتّصل بحدا', "biddak attaṣil b-ḥada"], ['بدِّك أتّصل بحدا', "biddik attaṣil b-ḥada"]),
  );
  const NO_IM_FINE = c(
    'No, I am fine',
    ['לא, אני בסדר', 'lo, ani beseder'],
    toL(['لأ، أنا منيح', "laʾ, ana mnīḥ"], ['لأ، أنا منيحة', "laʾ, ana mnīḥa"]),
  );
  const REST_A_LITTLE = c(
    'Good. Rest a little',
    toL(['טוב. תנוח קצת', 'tov. tanuakh ktsat'], ['טוב. תנוחי קצת', 'tov. tanukhi ktsat']),
    toL(['منيح. ارتاح شوي', "mnīḥ. irtāḥ shwayy"], ['منيح. ارتاحي شوي', "mnīḥ. irtāḥi shwayy"]),
  );

  const situation: Situation = {
    name: 'Helping someone',
    icon: '🤲',
    scene: 'Somebody near you does not feel well, and you are the one there to help.',
    goal: 'Find out what is wrong, help them sit down safely, and check they are okay.',
    parts: [
      part('Finding out what is wrong', [
        turn(NOT_WELL, WHATS_WRONG),
        turn(IT_HURTS, WHERE_DOES_IT_HURT),
        turn(MY_HEAD, WANT_TO_SIT),
        turn(YES, ILL_HELP_YOU),
      ]),
      part('Helping them settle', [
        turn(WANT_TO_SIT_THEM, SIT_SLOWLY),
        turn(THANK_YOU_THEM, ARE_YOU_COMFORTABLE),
        turn(MUCH_BETTER, WANT_WATER),
        turn(YES_PLEASE_THEM, CALL_SOMEONE),
        turn(NO_IM_FINE, REST_A_LITTLE),
      ]),
    ],
    script: [
      node('notWell', NOT_WELL, WHATS_WRONG),
      node('hurts', IT_HURTS, WHERE_DOES_IT_HURT),
      node('head', MY_HEAD, WANT_TO_SIT),
      node('yes', YES, ILL_HELP_YOU),
      node('sitting', WANT_TO_SIT_THEM, SIT_SLOWLY),
      node('thanks', THANK_YOU_THEM, ARE_YOU_COMFORTABLE),
      node('better', MUCH_BETTER, WANT_WATER),
      node('water', YES_PLEASE_THEM, CALL_SOMEONE),
      node('fine', NO_IM_FINE, { card: REST_A_LITTLE, next: 'end' }),
    ],
  };
  return situation;
})();

// --- the level ---------------------------------------------------------------

/**
 * Every situation, in the order the level lists them — roughly the order life
 * asks for them. No scenario waits on another: there is no learning dependency
 * between ordering a coffee and catching a bus, so there is no gate.
 */
export const SITUATIONS: Situation[] = [
  MEETING,
  CAFE,
  RESTAURANT,
  HOUSE,
  SHOP,
  DIRECTIONS,
  TAXI,
  BUS,
  PLANS,
  WORK,
  LEARNING,
  DOCTOR,
  HELPING,
];

/**
 * Real Situations as it installs: each scenario a category, each of its parts
 * a language ladder — Hebrew, then Palestinian Arabic, then both, exactly the
 * staging every exchange gets.
 */
export const SITUATION_CATEGORIES: SeedCategory[] = SITUATIONS.map((situation) => ({
  name: situation.name,
  icon: situation.icon,
  decks: stageDecks(situation.parts),
}));

/**
 * The names Real Situations owns, so no other area lays out a scenario and the
 * Practice ladder never queues one. Name-based like the levels before it: a
 * category row on disk carries nothing else saying which area it belongs to.
 */
export const SITUATION_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  SITUATION_CATEGORIES.map((group) => group.name.toLowerCase()),
);

/**
 * The repair moves every rehearsal offers under the other person's line,
 * whatever the scenario. Not installed as cards — Conversation Flow already
 * teaches all three — but spoken and shown in full, because they are the
 * learner's real tools: not understanding is a move to make, never a failure
 * state, and choosing one keeps the conversation exactly where it stood.
 */
export const REPAIR_MOVES = {
  again: c(
    'Can you say it again?',
    toL(['תגיד שוב בבקשה', 'tagid shuv bevakasha'], ['תגידי שוב בבקשה', 'tagidi shuv bevakasha']),
    toL(['عيدها لو سمحت', "ʿīdha law samaḥt"], ['عيديها لو سمحتي', "ʿīdīha law samaḥti"]),
  ),
  slower: c(
    'More slowly, please',
    ['לאט יותר בבקשה', "le'at yoter bevakasha"],
    ['شوي شوي لو سمحت', "shwayy shwayy law samaḥt"],
  ),
  meaning: c('What does that mean?', ['מה זה אומר', 'ma ze omer'], ['شو معناها', "shū maʿnāha"]),
} as const;
