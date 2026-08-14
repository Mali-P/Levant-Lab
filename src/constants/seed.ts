import type {
  ArabicDialect,
  FormAgreement,
  GenderedForms,
  Language,
  LanguageForm,
  SpeechForms,
} from '../types';

export type SeedSide = {
  script: string;
  transliteration: string;
  forms?: GenderedForms;
  /** Whose gender picks between the halves of `forms`. Absent means the word's own. */
  agreement?: FormAgreement;
  speechForms?: SpeechForms;
  notes?: string;
};

export type SeedCard = {
  english: string;
  icon?: string;
  hebrew: SeedSide;
  arabic: SeedSide & { dialect?: ArabicDialect };
};

export type SeedDeck = {
  name: string;
  cards: SeedCard[];
  studyLanguages?: Language[];
  masteryOnly?: boolean;
};

export type SeedCategory = {
  name: string;
  icon: string;
  decks: SeedDeck[];
};

const PAL: ArabicDialect = 'Palestinian';

/**
 * A word as written in the starter table: either one form used by and for
 * everyone, or a feminine/masculine pair.
 *
 * `[script, transliteration]` — one shared form.
 * `[fScript, fTranslit, mScript, mTranslit]` — feminine first, masculine second.
 */
type Word = [string, string] | [string, string, string, string];

/** One wording: `[script, transliteration]`. */
type W = [string, string];

/**
 * How a phrase changes with who is in the conversation.
 *
 * This is the speaker/listener axis, kept strictly apart from the `Word` pair
 * above, which is *word* gender — the gender of a noun or of the thing an
 * adjective describes. A card can carry one, the other, or neither.
 *
 * Three shapes, because these are the three the languages actually make:
 *
 * `listener` — only who is being addressed matters. كيفَك to a man, كيفِك to a
 *   woman, said identically by a woman or a man. Most greetings and questions.
 * `speaker`  — only who is talking matters. A woman says أنا تعبانة whoever
 *   she is talking to. Most "I am ..." statements.
 * `both`     — the two combine, so all four perspectives differ. Hebrew
 *   אני מתגעגעת אלייך carries the speaker in the verb and the listener in the
 *   suffix at once.
 *
 * A phrase that changes for neither is written as a plain `Word` and gets no
 * variants at all — the point is never to manufacture four versions of
 * something people say one way.
 */
type Speech =
  | { by: 'listener'; toMale: W; toFemale: W }
  | { by: 'speaker'; female: W; male: W }
  | { by: 'both'; f2m: W; f2f: W; m2f: W; m2m: W };

/**
 * A word pair whose gender belongs to somebody in the conversation rather than
 * to the word.
 *
 * The pair itself is written exactly as an ordinary `Word`; all this adds is
 * the answer to "which of these two is the one to say", which is what lets the
 * From / To settings narrow the card to one form. Kept out of `Speech` on
 * purpose: those four perspectives exist because the *wording* differs per
 * perspective, whereas this is two wordings and a rule for choosing.
 */
type AgreeingWord = { pair: [string, string, string, string]; by: 'speaker' | 'listener' };

type Entry = Word | Speech | AgreeingWord;

/**
 * A pair the speaker's own gender picks between — "I'm tired", "I'm hungry".
 * A woman says the feminine one to anybody.
 */
function ofSpeaker(
  fScript: string,
  fTranslit: string,
  mScript: string,
  mTranslit: string,
): AgreeingWord {
  return { pair: [fScript, fTranslit, mScript, mTranslit], by: 'speaker' };
}

/**
 * A pair the listener's gender picks between — an imperative, or anything said
 * about the person being addressed.
 */
function ofListener(
  fScript: string,
  fTranslit: string,
  mScript: string,
  mTranslit: string,
): AgreeingWord {
  return { pair: [fScript, fTranslit, mScript, mTranslit], by: 'listener' };
}

function form([script, transliteration]: W): LanguageForm {
  return { script, transliteration };
}

/**
 * Builds the four perspectives from one of the three shapes.
 *
 * Perspectives that repeat another word for word are stored as a pointer
 * rather than a copy, so the content never asserts a distinction the language
 * does not make and the two share a single recording.
 *
 * The headline is always ♀→♂ — a woman speaking to a man. That is the default
 * this app teaches, so anything reading only `script` gets the form she is
 * most likely to need rather than a masculine-speaker default she would have
 * to convert in her head.
 */
function speechSide(spec: Speech): SeedSide {
  if (spec.by === 'listener') {
    const speechForms: SpeechForms = {
      femaleToMale: form(spec.toMale),
      femaleToFemale: form(spec.toFemale),
      // The speaker's own gender does not touch these, so the male-speaker
      // perspectives are the very same two wordings.
      maleToFemale: { sameAs: 'femaleToFemale' },
      maleToMale: { sameAs: 'femaleToMale' },
    };
    return { script: spec.toMale[0], transliteration: spec.toMale[1], speechForms };
  }

  if (spec.by === 'speaker') {
    const speechForms: SpeechForms = {
      femaleToMale: form(spec.female),
      // Who is listening does not touch these.
      femaleToFemale: { sameAs: 'femaleToMale' },
      maleToFemale: form(spec.male),
      maleToMale: { sameAs: 'maleToFemale' },
    };
    return { script: spec.female[0], transliteration: spec.female[1], speechForms };
  }

  return {
    script: spec.f2m[0],
    transliteration: spec.f2m[1],
    speechForms: {
      femaleToMale: form(spec.f2m),
      femaleToFemale: form(spec.f2f),
      maleToFemale: form(spec.m2f),
      maleToMale: form(spec.m2m),
    },
  };
}

function isAgreeing(entry: Entry): entry is AgreeingWord {
  return !Array.isArray(entry) && 'pair' in entry;
}

function isSpeech(entry: Entry): entry is Speech {
  return !Array.isArray(entry) && !isAgreeing(entry);
}

/** The pair, with whatever rule was given for choosing between its halves. */
function pairSide(
  [fScript, fTranslit, mScript, mTranslit]: [string, string, string, string],
  agreement?: FormAgreement,
): SeedSide {
  return {
    // The feminine form is the headline: this app is written for a woman, so
    // the word she says — or is described by — is the one shown first, and
    // anything that reads only `script` still gets a complete, correct word.
    script: fScript,
    transliteration: fTranslit,
    forms: {
      feminine: { script: fScript, transliteration: fTranslit },
      masculine: { script: mScript, transliteration: mTranslit },
    },
    ...(agreement ? { agreement } : {}),
  };
}

function side(entry: Entry): SeedSide {
  if (isAgreeing(entry)) return pairSide(entry.pair, entry.by);
  if (isSpeech(entry)) return speechSide(entry);
  const word = entry;
  if (word.length === 2) return { script: word[0], transliteration: word[1] };
  return pairSide(word);
}

/**
 * One starter card. Each language is independently either a single form, a
 * feminine/masculine word pair, or a set of speaker/listener variants — a
 * distinction can exist in Hebrew and not in Arabic, or the reverse.
 */
function c(
  english: string,
  hebrew: Entry,
  arabic: Entry,
  notes?: { he?: string; ar?: string },
): SeedCard {
  return {
    english,
    hebrew: { ...side(hebrew), notes: notes?.he },
    arabic: { ...side(arabic), dialect: PAL, notes: notes?.ar },
  };
}

/** Only the listener's gender changes the wording. */
function toL(toMale: W, toFemale: W): Speech {
  return { by: 'listener', toMale, toFemale };
}

/** Only the speaker's own gender changes the wording. */
function bySp(female: W, male: W): Speech {
  return { by: 'speaker', female, male };
}

/** Both matter, so all four perspectives differ. Female-speaker pair first. */
function both4(f2m: W, f2f: W, m2f: W, m2m: W): Speech {
  return { by: 'both', f2m, f2f, m2f, m2m };
}

/** A word that is written and said the same way whoever is speaking. */
type SharedWord = [string, string];
/** A word with a feminine and a masculine form, feminine first. */
type PairedWord = [string, string, string, string];

/**
 * The nine units as they are said inside a compound such as "twenty-three".
 *
 * Hebrew keeps its feminine/masculine pair inside a compound. Spoken
 * Palestinian Arabic uses one counting form — the same one "One to ten" teaches
 * — so the Arabic side carries a single word, and the two decks agree word for
 * word.
 */
const COMPOUND_UNITS: {
  english: string;
  hebrew: PairedWord;
  arabic: SharedWord;
  notes?: { he?: string; ar?: string };
}[] = [
  { english: 'one', hebrew: ['אחת', 'akhat', 'אחד', 'ekhad'], arabic: ['واحد', 'wāḥad'] },
  { english: 'two', hebrew: ['שתיים', 'shtayim', 'שניים', 'shnayim'], arabic: ['تنين', 'tnēn'] },
  { english: 'three', hebrew: ['שלוש', 'shalosh', 'שלושה', 'shlosha'], arabic: ['تلاتة', 'talāte'] },
  { english: 'four', hebrew: ['ארבע', 'arba', 'ארבעה', 'arba\'a'], arabic: ['أربعة', 'arbaʿa'] },
  { english: 'five', hebrew: ['חמש', 'khamesh', 'חמישה', 'khamisha'], arabic: ['خمسة', 'khamse'] },
  { english: 'six', hebrew: ['שש', 'shesh', 'שישה', 'shisha'], arabic: ['ستّة', 'sitte'] },
  { english: 'seven', hebrew: ['שבע', 'sheva', 'שבעה', 'shiv\'a'], arabic: ['سبعة', 'sabʿa'] },
  {
    english: 'eight',
    hebrew: ['שמונה', 'shmone', 'שמונה', 'shmona'],
    arabic: ['تمانية', 'tmānye'],
    notes: { he: 'Hebrew spelling is identical; pronunciation differs.' },
  },
  { english: 'nine', hebrew: ['תשע', 'tesha', 'תשעה', 'tish\'a'], arabic: ['تسعة', 'tisʿa'] },
];

/** The round tens, twenty through one hundred. Neither language genders these. */
const TENS: { english: string; hebrew: SharedWord; arabic: SharedWord }[] = [
  { english: 'twenty', hebrew: ['עשרים', 'esrim'], arabic: ['عشرين', 'ʿishrīn'] },
  { english: 'thirty', hebrew: ['שלושים', 'shloshim'], arabic: ['تلاتين', 'tlātīn'] },
  { english: 'forty', hebrew: ['ארבעים', 'arba\'im'], arabic: ['أربعين', 'arbaʿīn'] },
  { english: 'fifty', hebrew: ['חמישים', 'khamishim'], arabic: ['خمسين', 'khamsīn'] },
  { english: 'sixty', hebrew: ['שישים', 'shishim'], arabic: ['ستّين', 'sittīn'] },
  { english: 'seventy', hebrew: ['שבעים', 'shiv\'im'], arabic: ['سبعين', 'sabʿīn'] },
  { english: 'eighty', hebrew: ['שמונים', 'shmonim'], arabic: ['تمانين', 'tmānīn'] },
  { english: 'ninety', hebrew: ['תשעים', 'tish\'im'], arabic: ['تسعين', 'tisʿīn'] },
  { english: 'one hundred', hebrew: ['מאה', 'me\'a'], arabic: ['ميّة', 'miyye'] },
];

type Ten = (typeof TENS)[number];
type Unit = (typeof COMPOUND_UNITS)[number];

/**
 * "twenty-three" and its two spoken shapes: Hebrew puts the ten first and joins
 * it with ו, Palestinian Arabic puts the unit first and joins it with و.
 */
function compound(ten: Ten, unit: Unit): SeedCard {
  const [tenScript, tenTranslit] = ten.hebrew;
  const [fScript, fTranslit, mScript, mTranslit] = unit.hebrew;

  return c(
    ten.english + '-' + unit.english,
    [
      tenScript + ' ו' + fScript,
      tenTranslit + ' ve-' + fTranslit,
      tenScript + ' ו' + mScript,
      tenTranslit + ' ve-' + mTranslit,
    ],
    [unit.arabic[0] + ' و' + ten.arabic[0], unit.arabic[1] + ' w-' + ten.arabic[1]],
    unit.notes,
  );
}

/** "Twenty-one to thirty": the nine compounds, then the ten that closes them. */
function tensDeck(index: number): SeedDeck {
  const ten = TENS[index];
  const next = TENS[index + 1];
  const name = ten.english[0].toUpperCase() + ten.english.slice(1);

  return {
    name: name + '-one to ' + next.english,
    cards: [
      ...COMPOUND_UNITS.map((unit) => compound(ten, unit)),
      c(next.english, next.hebrew, next.arabic),
    ],
  };
}

/**
 * The other forms of one to ten: the ones a number takes in front of a noun.
 *
 * This is where the second Arabic column went, and it is a grammar deck rather
 * than a second counting deck. Two different things live here, both of them
 * about the noun and neither about who is speaking:
 *
 *   one and two agree with the noun's gender — كتاب واحد, but بنت وحدة; تنين
 *     وِلاد, but تنتين بنات.
 *   three to ten drop the ة in front of a noun — تلات كتب, never تلاتة كتب,
 *     even though تلاتة is what you say when you are counting.
 *
 * A learner meets these after she can count, which is why the deck sits at the
 * end of the category rather than beside "One to ten".
 */
const NUMBERS_WITH_NOUNS: SeedDeck = {
  name: 'Numbers with nouns',
  cards: [
    c(
      'one (with a noun)',
      ['אחת', 'akhat', 'אחד', 'ekhad'],
      ['وحدة', 'waḥde', 'واحد', 'wāḥad'],
      {
        ar: 'واحد and وحدة follow the noun and match its gender: كتاب واحد, بنت وحدة.',
        he: 'The number follows the noun here too: ספר אחד, ילדה אחת.',
      },
    ),
    c(
      'two (with a noun)',
      ['שתי', 'shtei', 'שני', 'shnei'],
      ['تنتين', 'tintēn', 'تنين', 'tnēn'],
      {
        ar: 'Matches the gender of what is being counted: تنين ولاد, تنتين بنات.',
        he: 'Before a noun Hebrew uses שתי / שני, not שתיים / שניים.',
      },
    ),
    c('three (with a noun)', ['שלוש', 'shalosh', 'שלושה', 'shlosha'], ['تلات', 'talāt'], {
      ar: 'From three up the ة drops in front of a noun: تلات كتب, not تلاتة كتب.',
    }),
    c('four (with a noun)', ['ארבע', 'arba', 'ארבעה', 'arba\'a'], ['أربع', 'arbaʿ']),
    c('five (with a noun)', ['חמש', 'khamesh', 'חמישה', 'khamisha'], ['خمس', 'khams']),
    c('six (with a noun)', ['שש', 'shesh', 'שישה', 'shisha'], ['ستّ', 'sitt']),
    c('seven (with a noun)', ['שבע', 'sheva', 'שבעה', 'shiv\'a'], ['سبع', 'sabaʿ']),
    c('eight (with a noun)', ['שמונה', 'shmone', 'שמונה', 'shmona'], ['تمان', 'tmān'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
    c('nine (with a noun)', ['תשע', 'tesha', 'תשעה', 'tish\'a'], ['تسع', 'tisaʿ']),
    c('ten (with a noun)', ['עשר', 'eser', 'עשרה', 'asara'], ['عشر', 'ʿashar']),
  ],
};

/**
 * Counting out loud: one answer per number in each language, and it is the
 * isolated counting form.
 *
 * Spoken Palestinian has more than one word for several of these — تنتين beside
 * تنين for "two", تلات beside تلاتة for "three" — but in every case the second
 * word belongs to counting *things*, not to counting. Teaching both here would
 * ask a learner saying "one, two, three" to pick between two answers where the
 * language gives her one, so the second form lives in "Numbers with nouns"
 * above, in the grammar that calls for it.
 *
 * Hebrew is now the same shape, and used not to be. Counting aloud in Hebrew is
 * not a choice between columns: the citation form is the feminine one — akhat,
 * shtayim, shalosh — and שניים, שלושה and the rest are what you say in front of
 * a masculine noun. So the pair here was word gender being asked before there
 * was a noun to agree with, and on the card it could only read as *her* form
 * beside a man's — the ♀/♂ contrast borrowing symbols from an identity setting
 * that has no say over a number. Nothing is lost: every masculine form dropped
 * here is taught by "Numbers with nouns" above, in the grammar that picks
 * between them.
 *
 * The teens and the compounds keep their pairs. They are the same word gender,
 * but no deck teaches their with-a-noun forms, so narrowing them would delete
 * content rather than move it.
 *
 * After ten it is decks of ten all the way to a hundred: the teens are
 * irregular in both languages and are written out, and everything from
 * twenty-one up is built from the units and tens above, which is also how a
 * learner meets them.
 */
const NUMBER_DECKS: SeedDeck[] = [
  {
    name: 'One to ten',
    cards: [
      c('one', ['אחת', 'akhat'], ['واحد', 'wāḥad']),
      c('two', ['שתיים', 'shtayim'], ['تنين', 'tnēn']),
      c('three', ['שלוש', 'shalosh'], ['تلاتة', 'talāte']),
      c('four', ['ארבע', 'arba'], ['أربعة', 'arbaʿa']),
      c('five', ['חמש', 'khamesh'], ['خمسة', 'khamse']),
      c('six', ['שש', 'shesh'], ['ستّة', 'sitte']),
      c('seven', ['שבע', 'sheva'], ['سبعة', 'sabʿa']),
      c('eight', ['שמונה', 'shmone'], ['تمانية', 'tmānye']),
      c('nine', ['תשע', 'tesha'], ['تسعة', 'tisʿa']),
      c('ten', ['עשר', 'eser'], ['عشرة', 'ʿashara']),
    ],
  },
  {
    name: 'Eleven to twenty',
    cards: [
      c('eleven', ['אחת עשרה', 'akhat-esre', 'אחד עשר', 'akhad-asar'], ['إحداعش', 'iḥdaʿsh'], { ar: 'From eleven up, spoken Palestinian Arabic uses one form for everyone.' }),
      c('twelve', ['שתים עשרה', 'shtem-esre', 'שנים עשר', 'shneim-asar'], ['اتناعش', 'itnaʿsh']),
      c('thirteen', ['שלוש עשרה', 'shlosh-esre', 'שלושה עשר', 'shlosha-asar'], ['تلتّعش', 'tlattaʿsh']),
      c('fourteen', ['ארבע עשרה', 'arba-esre', 'ארבעה עשר', 'arba\'a-asar'], ['أربعتاعش', 'arbaʿtaʿsh']),
      c('fifteen', ['חמש עשרה', 'khamesh-esre', 'חמישה עשר', 'khamisha-asar'], ['خمستاعش', 'khamastaʿsh']),
      c('sixteen', ['שש עשרה', 'shesh-esre', 'שישה עשר', 'shisha-asar'], ['ستّاعش', 'sittaʿsh']),
      c('seventeen', ['שבע עשרה', 'shva-esre', 'שבעה עשר', 'shiv\'a-asar'], ['سبعتاعش', 'sabaʿtaʿsh']),
      c('eighteen', ['שמונה עשרה', 'shmone-esre', 'שמונה עשר', 'shmona-asar'], ['تمنتاعش', 'tmantaʿsh']),
      c('nineteen', ['תשע עשרה', 'tsha-esre', 'תשעה עשר', 'tish\'a-asar'], ['تسعتاعش', 'tisaʿtaʿsh']),
      c('twenty', ['עשרים', 'esrim'], ['عشرين', 'ʿishrīn']),
    ],
  },
  // Twenty-one to thirty, thirty-one to forty, and so on up to one hundred.
  ...TENS.slice(0, -1).map((_, index) => tensDeck(index)),
  NUMBERS_WITH_NOUNS,
];

/**
 * Everyday spoken greetings, in the shapes people actually say them: مرحبا
 * rather than the textbook مرحباً, أهلا rather than أهلاً.
 *
 * Greetings are where the speaker/listener axis earns its keep. Almost every
 * card here changes its ending to match the person being addressed, so the
 * variants are written as `toL` — the wording a woman uses to a man leads,
 * because that is the perspective this app defaults to. A man says these
 * exactly as a woman does, so his two perspectives point at hers rather than
 * repeating them.
 *
 * "Good / fine" is the exception: there the ending is the speaker's own, so it
 * is written as `bySp` and the woman's form leads.
 *
 * Several Arabic pairs are written identically because the ـك ending goes
 * unvowelled in everyday writing; only the transliteration tells كيفِك from
 * كيفَك, which is exactly why both are shown rather than one.
 */
const GREETING_DECKS: SeedDeck[] = [
  {
    name: 'Hello and goodbye',
    cards: [
      c('hello', ['שלום', 'shalom'], ['مرحبا', 'marḥaba'], { ar: 'The everyday spoken form; the written مرحباً is textbook Arabic.' }),
      c('hello (warm reply)', ['שלום שלום', 'shalom shalom'], ['مرحبتين', 'marḥabtēn'], { ar: 'Literally "two hellos" — a common reply to مرحبا, though مرحبا or أهلا can come back just as well.' }),
      c('hi / hey', ['אהלן', 'ahalan'], ['أهلا', 'ahlan'], { he: 'Borrowed straight from Arabic and just as casual in Hebrew.' }),
      c('welcome', toL(['ברוך הבא', 'barukh haba'], ['ברוכה הבאה', 'brukha haba\'a']), ['أهلا وسهلا', 'ahlan w sahlan'], { he: 'The ending follows the guest you are welcoming.', ar: 'Said to a guest arriving; the Arabic form does not change.' }),
      c('peace be upon you', ['שלום עליכם', 'shalom alekhem'], ['السلام عليكم', 'as-salāmu ʿalēkum'], { ar: 'A little more formal or religious than مرحبا, and always welcome.' }),
      c('and upon you peace (reply)', ['עליכם שלום', 'alekhem shalom'], ['وعليكم السلام', 'w ʿalēkum as-salām']),
      c('goodbye', ['להתראות', 'lehitra\'ot'], ['مع السلامة', 'maʿ as-salāme'], { ar: 'Said to the person leaving.' }),
      c('bye', ['ביי', 'bay'], ['يلا باي', 'yalla bāy'], { ar: 'Very casual, and extremely common.' }),
      c('see you later', ['נתראה', 'nitra\'e'], toL(['بشوفك بعدين', 'bashūfak baʿdēn'], ['بشوفك بعدين', 'bashūfik baʿdēn']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('take care', toL(['תשמור על עצמך', 'tishmor al atsmekha'], ['תשמרי על עצמך', 'tishmeri al atsmekh']), toL(['دير بالك', 'dīr bālak'], ['ديري بالك', 'dīri bālik']), { ar: 'Literally "mind yourself" — a warm way to close a conversation.' }),
    ],
  },
  {
    name: 'Times of day',
    cards: [
      c('good morning', ['בוקר טוב', 'boker tov'], ['صباح الخير', 'ṣabāḥ il-khēr']),
      c('good morning (reply)', ['בוקר אור', 'boker or'], ['صباح النور', 'ṣabāḥ in-nūr'], { ar: 'Answering "morning of goodness" with "morning of light".' }),
      c('good morning (warmer reply)', ['בוקר מקסים', 'boker maksim'], ['صباح الورد', 'ṣabāḥ il-ward'], { ar: '"Morning of roses" — friendlier still, and common between friends.' }),
      c('good afternoon', ['צהריים טובים', 'tsohorayim tovim'], ['مسا الخير', 'masa il-khēr'], { ar: 'Palestinian Arabic does not normally use a distinct everyday greeting for "good afternoon"; مسا الخير can cover late afternoon and evening.' }),
      c('good evening', ['ערב טוב', 'erev tov'], ['مسا الخير', 'masa il-khēr'], { ar: 'The spoken مسا, not the written مساء.' }),
      c('good evening (reply)', toL(['ערב טוב גם לך', 'erev tov gam lekha'], ['ערב טוב גם לך', 'erev tov gam lakh']), ['مسا النور', 'masa in-nūr'], { he: 'Hebrew simply returns the greeting; written the same either way, and only לך is said differently.' }),
      c('good night', ['לילה טוב', 'layla tov'], toL(['تصبح على خير', 'tiṣbaḥ ʿala khēr'], ['تصبحي على خير', 'tiṣbaḥi ʿala khēr']), { ar: 'Literally "may you wake to goodness"; said on parting for the night.' }),
      c('good night (reply)', toL(['לילה טוב גם לך', 'layla tov gam lekha'], ['לילה טוב גם לך', 'layla tov gam lakh']), toL(['وإنت من أهل الخير', 'w inte min ahl il-khēr'], ['وإنتِ من أهل الخير', 'w inti min ahl il-khēr']), { ar: 'The set answer to تصبح على خير.' }),
      c('sweet dreams', ['חלומות פז', 'khalomot paz'], ['أحلام سعيدة', 'aḥlām saʿīde']),
      c('have a nice day', ['יום נעים', 'yom na\'im'], toL(['نهارك سعيد', 'nahārak saʿīd'], ['نهارك سعيد', 'nahārik saʿīd'])),
    ],
  },
  {
    name: 'How are you?',
    cards: [
      c('how are you?', toL(['מה שלומך', 'ma shlomkha'], ['מה שלומך', 'ma shlomekh']), toL(['كيفك', 'kīfak'], ['كيفك', 'kīfik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'The one greeting you will hear most; the ending matches the person you ask, never yourself.' }),
      c('how is it going?', ['איך הולך', 'ekh holekh'], ['كيف الأمور', 'kīf il-umūr'], { ar: 'Literally "how are the matters" — asked of anyone.' }),
      c('what\'s new?', ['מה נשמע', 'ma nishma'], toL(['شو أخبارك', 'shū akhbārak'], ['شو أخبارك', 'shū akhbārik']), { ar: 'Literally "what is your news".' }),
      c('good / fine', ['בסדר', 'beseder'], bySp(['منيحة', 'mnīḥa'], ['منيح', 'mnīḥ']), { ar: 'The one card here where the ending is your own, not theirs: a woman says منيحة to anybody.' }),
      c('thank God (I am well)', ['ברוך השם', 'barukh hashem'], ['الحمد لله', 'il-ḥamdulillah'], { ar: 'The usual answer to كيفك, whether or not the speaker is religious.' }),
      c('and you?', toL(['ואתה', 've\'ata'], ['ואת', 've\'at']), toL(['وإنت', 'w inte'], ['وإنتِ', 'w inti'])),
      c('thank you', ['תודה', 'toda'], ['شكرا', 'shukran']),
      c('you\'re welcome', ['בבקשה', 'bevakasha'], toL(['ولا يهمّك', 'wala yhimmak'], ['ولا يهمّك', 'wala yhimmik']), { ar: 'Literally "don\'t worry about it"; عفوا is the more formal option.' }),
      c('please', ['בבקשה', 'bevakasha'], toL(['من فضلك', 'min faḍlak'], ['من فضلك', 'min faḍlik'])),
      c('excuse me / sorry', ['סליחה', 'slikha'], toL(['لو سمحت', 'law samaḥt'], ['لو سمحتي', 'law samaḥti']), { ar: 'Getting someone\'s attention; آسف is the apology.' }),
    ],
  },
  {
    name: 'Meeting someone new',
    cards: [
      c('what is your name?', toL(['איך קוראים לך', 'ekh kor\'im lekha'], ['איך קוראים לך', 'ekh kor\'im lakh']), toL(['شو اسمك', 'shū ismak'], ['شو اسمك', 'shū ismik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('my name is...', ['קוראים לי', 'kor\'im li'], ['اسمي', 'ismi'], { he: 'Literally "they call me", which is how the introduction is normally made.' }),
      c('nice to meet you', ['נעים מאוד', 'na\'im me\'od'], ['تشرّفنا', 'tsharrafna'], { ar: 'Literally "we are honoured"; one form whoever is speaking.' }),
      c('where are you from?', toL(['מאיפה אתה', 'me\'eifo ata'], ['מאיפה את', 'me\'eifo at']), toL(['من وين إنت', 'min wēn inte'], ['من وين إنتِ', 'min wēn inti'])),
      c('I am from...', ['אני מ', 'ani mi'], ['أنا من', 'ana min']),
      c('how old are you?', toL(['בן כמה אתה', 'ben kama ata'], ['בת כמה את', 'bat kama at']), toL(['قدّيش عمرك', 'addēsh ʿumrak'], ['قدّيش عمرك', 'addēsh ʿumrik']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('do you speak Arabic?', toL(['אתה מדבר ערבית', 'ata medaber aravit'], ['את מדברת ערבית', 'at medaberet aravit']), ['بتحكي عربي', 'btiḥki ʿarabi'], { ar: 'The Arabic verb ends the same way whoever is asked.' }),
      c('I do not understand', bySp(['אני לא מבינה', 'ani lo mevina'], ['אני לא מבין', 'ani lo mevin']), bySp(['أنا مش فاهمة', 'ana mish fāhme'], ['أنا مش فاهم', 'ana mish fāhem']), { he: 'The ending is your own here, not theirs.', ar: 'The ending is your own here, not theirs.' }),
      c('can you repeat that?', toL(['תוכל לחזור', 'tukhal lakhzor'], ['תוכלי לחזור', 'tukhli lakhzor']), toL(['ممكن تعيد', 'mumkin tʿīd'], ['ممكن تعيدي', 'mumkin tʿīdi'])),
      c('speak slowly, please', toL(['דבר לאט בבקשה', 'daber le\'at bevakasha'], ['דברי לאט בבקשה', 'dabri le\'at bevakasha']), ['احكي شوي شوي', 'iḥki shwayy shwayy'], { ar: 'Literally "speak little by little"; the verb ends the same way for anyone.' }),
    ],
  },
  {
    name: 'Wishes and blessings',
    cards: [
      c('congratulations', ['מזל טוב', 'mazal tov'], ['مبروك', 'mabrūk']),
      c('God bless you (reply)', toL(['תבורך', 'tevorakh'], ['תבורכי', 'tevorkhi']), toL(['الله يبارك فيك', 'allah ybārik fīk'], ['الله يبارك فيكي', 'allah ybārik fīki']), { ar: 'The set answer to مبروك.' }),
      c('good luck', ['בהצלחה', 'behatslakha'], ['بالتوفيق', 'bit-tawfīʾ']),
      c('happy birthday', ['יום הולדת שמח', 'yom huledet sameakh'], ['عيد ميلاد سعيد', 'ʿīd mīlād saʿīd']),
      c('happy holiday', ['חג שמח', 'khag sameakh'], ['عيد مبارك', 'ʿīd mubārak']),
      c('get well soon', ['רפואה שלמה', 'refu\'a shlema'], toL(['سلامتك', 'salāmtak'], ['سلامتك', 'salāmtik']), { ar: 'Literally "your wellbeing"; written the same either way.' }),
      c('God willing', ['בעזרת השם', 'be\'ezrat hashem'], ['إن شاء الله', 'in shāʾ allah'], { ar: 'Said of anything still to come, whether or not the speaker is religious.' }),
      c('may God protect you', toL(['אלוהים ישמור עליך', 'elohim yishmor alekha'], ['אלוהים ישמור עלייך', 'elohim yishmor alayikh']), toL(['الله يحميك', 'allah yiḥmīk'], ['الله يحميكي', 'allah yiḥmīki'])),
      c('welcome back (safe return)', toL(['ברוך השב', 'barukh hashav'], ['ברוכה השבה', 'brukha hashava']), ['الحمد لله عالسلامة', 'il-ḥamdulillah ʿas-salāme'], { he: 'The ending follows the traveller you are greeting.', ar: 'Said to someone home from a journey; the Arabic does not change.' }),
      c('enjoy your meal', ['בתיאבון', 'beteavon'], ['صحتين', 'ṣaḥtēn'], { ar: 'Literally "two healths"; said to anyone eating.' }),
    ],
  },
];

/**
 * The words that stand in for a name, and the ways of saying a thing is yours.
 *
 * The pair is the person spoken to, or the owner in the case of "hers / his".
 * Spoken Palestinian Arabic collapses the plurals to one form each, so إنتو and
 * هُمّ carry no pair while Hebrew still splits them. Where a pair exists the
 * feminine form is the headline.
 *
 * These sit before the titles and apart from them. A learner needs "I", "you"
 * and "my" in the first week and needs مهندس in front of a name much later, so
 * the two are separate categories rather than one deck ladder — neither waits
 * on the other to unlock.
 */
const PRONOUN_DECKS: SeedDeck[] = [
  {
    name: 'Personal pronouns',
    cards: [
      c('I', ['אני', 'ani'], ['أنا', 'ana'], { ar: 'One word, whoever is speaking.' }),
      c('you (one person)', toL(['אתה', 'ata'], ['את', 'at']), toL(['إنت', 'inte'], ['إنتِ', 'inti'])),
      c('she', ['היא', 'hi'], ['هيّ', 'hiyye']),
      c('he', ['הוא', 'hu'], ['هوّ', 'huwwe']),
      c('we', ['אנחנו', 'anakhnu'], ['إحنا', 'iḥna']),
      c('you (more than one)', ['אתן', 'aten', 'אתם', 'atem'], ['إنتو', 'intu'], { ar: 'Spoken Palestinian Arabic uses one plural for a group of any gender.' }),
      c('they', ['הן', 'hen', 'הם', 'hem'], ['هُمّ', 'humme'], { ar: 'Again one form; Hebrew keeps a feminine and a masculine plural.' }),
      c('my', ['שלי', 'sheli'], ['تبعي', 'tabaʿi'], { ar: 'Possession is usually a suffix — بيتي "my house" — and تبعي is the form that stands on its own.' }),
      c('your', toL(['שלך', 'shelkha'], ['שלך', 'shelakh']), toL(['تبعك', 'tabaʿak'], ['تبعك', 'tabaʿik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      // The pair here is the owner — a third person — so it stays a word-form
      // pair rather than becoming a speaker/listener variant.
      c('hers / his', ['שלה', 'shela', 'שלו', 'shelo'], ['تبعها', 'tabaʿha', 'تبعه', 'tabaʿo'], { ar: 'Here the ending follows the owner, not the person spoken to.' }),
    ],
  },
  {
    name: 'Saying it is mine',
    cards: [
      c('my house', ['הבית שלי', 'habayit sheli'], ['بيتي', 'bēti'], { ar: 'Possession is a suffix on the noun: بيت plus ـي.' }),
      c('your house', toL(['הבית שלך', 'habayit shelkha'], ['הבית שלך', 'habayit shelakh']), toL(['بيتك', 'bētak'], ['بيتك', 'bētik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('her house / his house', ['הבית שלה', 'habayit shela', 'הבית שלו', 'habayit shelo'], ['بيتها', 'bētha', 'بيته', 'bēto'], { ar: 'Here the ending follows the owner.' }),
      c('our house', ['הבית שלנו', 'habayit shelanu'], ['بيتنا', 'bētna']),
      c('your house (more than one)', ['הבית שלכן', 'habayit shelakhen', 'הבית שלכם', 'habayit shelakhem'], ['بيتكم', 'bētkom'], { ar: 'Spoken Palestinian Arabic uses one plural ending for a group of any gender.' }),
      c('their house', ['הבית שלהן', 'habayit shelahen', 'הבית שלהם', 'habayit shelahem'], ['بيتهم', 'bēthom']),
      c('my name', ['השם שלי', 'hashem sheli'], ['اسمي', 'ismi']),
      c('my mother', ['אמא שלי', 'ima sheli'], ['أمّي', 'immi']),
      c('with me', ['איתי', 'iti'], ['معي', 'maʿi']),
      c('I have', ['יש לי', 'yesh li'], ['عندي', 'ʿindi'], { he: 'Literally "there is to me"; Hebrew has no verb for "have".' }),
    ],
  },
  {
    name: 'This, that and which',
    cards: [
      c('this', ['זאת', 'zot', 'זה', 'ze'], ['هاي', 'hayy', 'هاد', 'hād'], { ar: 'The gender here is the thing pointed at, not a person.' }),
      c('these', ['אלה', 'ele'], ['هدول', 'hadōl'], { ar: 'One form for any group.' }),
      c('that one (over there)', ['ההיא', 'hahi', 'ההוא', 'hahu'], ['هديك', 'hadīk', 'هداك', 'hadāk']),
      c('who?', ['מי', 'mi'], ['مين', 'mīn']),
      c('what?', ['מה', 'ma'], ['شو', 'shū'], { ar: 'The Levantine question word; ماذا is written Arabic.' }),
      c('where?', ['איפה', 'eifo'], ['وين', 'wēn']),
      c('when?', ['מתי', 'matai'], ['إيمتى', 'ēmta']),
      c('why?', ['למה', 'lama'], ['ليش', 'lēsh']),
      c('how?', ['איך', 'ekh'], ['كيف', 'kīf']),
      c('how much?', ['כמה', 'kama'], ['قدّيش', 'addēsh']),
    ],
  },
];

/**
 * How people are addressed once you know how to talk to them at all.
 *
 * The titles come in feminine/masculine pairs where the language marks one, and
 * the gender is the person being addressed. Arabic uses several of these —
 * دكتور, مهندس, أستاذ — in front of a first name where English would reach for
 * "Mr". A category of its own, met after the pronouns.
 */
const TITLE_DECKS: SeedDeck[] = [
  {
    name: 'Titles and forms of address',
    cards: [
      // A title you put in front of somebody's name follows that somebody, so
      // these answer to "I practise speaking to…" and show the one she would
      // actually use. The royalty and the president further down do not: those
      // are people talked about, and their gender is the word's own.
      c('Mrs / Mr', ofListener('גברת', 'gveret', 'מר', 'mar'), ofListener('مدام', 'madām', 'سيّد', 'sayyed'), { ar: 'مدام is the everyday address for a married woman; السيّد is the formal written title.' }),
      c('Miss', ['גברת', 'gveret'], ['آنسة', 'ānise'], { he: 'Modern Hebrew uses גברת whether or not a woman is married.' }),
      c('doctor (as a title)', ['ד"ר', 'doktor'], ofListener('دكتورة', 'doktōra', 'دكتور', 'doktōr'), { he: 'Written as an abbreviation and said "doktor" for anyone.' }),
      c('professor', ['פרופסור', 'profesor'], ['بروفيسور', 'brōfēsōr'], { ar: 'أستاذ دكتور is the formal academic version.' }),
      c('teacher / sir', ofListener('מורה', 'mora', 'מורה', 'more'), ofListener('أستاذة', 'ustāze', 'أستاذ', 'ustāz'), { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'أستاذ doubles as a polite "sir" for a man you address by name.' }),
      c('engineer', ofListener('מהנדסת', 'mehandeset', 'מהנדס', 'mehandes'), ofListener('مهندسة', 'muhandise', 'مهندس', 'muhandis'), { ar: 'Used as a title in front of a name, much like "doctor".' }),
      c('madam / sir (polite address)', toL(['אדוני', 'adoni'], ['גברתי', 'gvirti']), toL(['حضرتك', 'ḥaḍirtak'], ['حضرتك', 'ḥaḍirtik']), { ar: 'Literally "your presence"; the ending follows the person spoken to and goes unvowelled in everyday writing.' }),
      c('queen / king', ['מלכה', 'malka', 'מלך', 'melekh'], ['ملكة', 'malake', 'ملك', 'malik']),
      c('princess / prince', ['נסיכה', 'nesikha', 'נסיך', 'nasikh'], ['أميرة', 'amīre', 'أمير', 'amīr']),
      c('president', ['נשיאה', 'nesi\'a', 'נשיא', 'nasi'], ['رئيسة', 'raʾīse', 'رئيس', 'raʾīs']),
    ],
  },
];

/**
 * Animals, met in the order a learner actually needs them: the ones in the
 * house first, then the ones down the road, then the ones in a picture book.
 *
 * These are nouns rather than words said about a speaker, so none of them
 * carries a feminine/masculine pair — an Arabic noun has its own fixed gender,
 * which is a property of the word and not of whoever says it.
 */
const ANIMAL_DECKS: SeedDeck[] = [
  {
    name: 'Pets',
    cards: [
      // An animal noun has a feminine and a masculine word of its own, so the
      // pair here is the creature — nothing to do with who is speaking.
      c('dog', ['כלבה', 'kalba', 'כלב', 'kelev'], ['كلبة', 'kalbe', 'كلب', 'kalb']),
      c('cat', ['חתולה', 'khatula', 'חתול', 'khatul'], ['قطّة', 'ʾiṭṭa', 'قطّ', 'ʾiṭṭ'], { ar: 'بسّة (bisse) is just as common in Palestinian homes.' }),
      c('puppy', ['גור כלבים', 'gur klavim'], ['جرو', 'jarw']),
      c('kitten', ['חתלתול', 'khataltul'], ['قطّة صغيرة', 'ʾuṭṭa zghīre'], { ar: 'Literally "small cat"; spoken Arabic rarely uses a separate word.' }),
      c('bird', ['ציפור', 'tsipor'], ['عصفورة', 'ʿaṣfūra', 'عصفور', 'ʿaṣfūr'], { he: 'ציפור is a feminine word in Hebrew whatever the bird.' }),
      c('fish', ['דג', 'dag'], ['سمكة', 'samake'], { ar: 'One fish; سمك is fish in general.' }),
      c('rabbit', ['ארנבת', 'arnevet', 'ארנב', 'arnav'], ['أرنبة', 'arnabe', 'أرنب', 'arnab']),
      c('turtle', ['צב', 'tsav'], ['سلحفاة', 'sulaḥfa']),
      c('parrot', ['תוכי', 'tuki'], ['ببغا', 'babaghā'], { ar: 'The spoken form; ببغاء is the written one.' }),
      c('hamster', ['אוגר', 'oger'], ['هامستر', 'hāmster'], { ar: 'A borrowed word, said as it is in English.' }),
    ],
  },
  {
    name: 'Farm animals',
    cards: [
      c('cow', ['פרה', 'para'], ['بقرة', 'baʾara']),
      c('sheep', ['כבש', 'keves'], ['خروف', 'kharūf']),
      c('goat', ['עז', 'ez'], ['عنزة', 'ʿanze']),
      c('hen', ['תרנגולת', 'tarnegolet'], ['دجاجة', 'djāje'], { ar: 'The live bird; جاج on a menu is chicken to eat.' }),
      c('rooster', ['תרנגול', 'tarnegol'], ['ديك', 'dīk']),
      c('donkey', ['חמור', 'khamor'], ['حمارة', 'ḥmāra', 'حمار', 'ḥmār'], { he: 'Hebrew has אתון for a jenny, but it is a separate word rather than a paired form.' }),
      c('horse', ['סוסה', 'susa', 'סוס', 'sus'], ['حصان', 'ḥṣān'], { ar: 'A mare is فرس — its own word, not a form of حصان.' }),
      c('duck', ['ברווז', 'barvaz'], ['بطّة', 'baṭṭa']),
      c('camel', ['גמל', 'gamal'], ['جمل', 'jamal']),
      c('pigeon', ['יונה', 'yona'], ['حمامة', 'ḥamāme'], { he: 'The same word covers a dove.' }),
    ],
  },
  {
    name: 'Wild animals',
    cards: [
      c('lion', ['לביאה', 'levi\'a', 'אריה', 'arye'], ['لبوة', 'labwe', 'أسد', 'asad']),
      c('wolf', ['זאבה', 'ze\'eva', 'זאב', 'ze\'ev'], ['ذيبة', 'dībe', 'ذيب', 'dīb'], { ar: 'Said dīb in Palestinian Arabic; ذئب is the written spelling.' }),
      c('fox', ['שועלה', 'shu\'ala', 'שועל', 'shu\'al'], ['ثعلبة', 'taʿlabe', 'ثعلب', 'taʿlab'], { ar: 'The ث is said as a t in most Palestinian speech.' }),
      c('bear', ['דובה', 'duba', 'דוב', 'dov'], ['دبّة', 'dubbe', 'دبّ', 'dubb']),
      c('snake', ['נחש', 'nakhash'], ['حيّة', 'ḥayye'], { ar: 'The everyday word; ثعبان is the more formal one.' }),
      c('monkey', ['קוף', 'kof'], ['قرد', 'ʾird']),
      c('elephant', ['פילה', 'pila', 'פיל', 'pil'], ['فيلة', 'fīle', 'فيل', 'fīl']),
      c('gazelle', ['צבייה', 'tsviya', 'צבי', 'tsvi'], ['غزالة', 'ghazāle', 'غزال', 'ghazāl']),
      c('giraffe', ['ג\'ירפה', 'jirafa'], ['زرافة', 'zarāfe']),
      c('mouse', ['עכברה', 'akhbara', 'עכבר', 'akhbar'], ['فارة', 'fāra', 'فار', 'fār']),
    ],
  },
];

/**
 * Colour, from the ten a learner needs first to the shades heard in a shop.
 *
 * The pair on a colour is the thing described, never the speaker: a red car is
 * حمرا because سيّارة is a feminine word. The first deck was taught inside
 * "Adjectives" until this category existed, and it keeps that name so a device
 * already holding it moves the deck across rather than meeting it twice.
 */
const COLOUR_DECKS: SeedDeck[] = [
  {
    name: 'Colours',
    cards: [
      c('white', ['לבנה', 'levana', 'לבן', 'lavan'], ['بيضا', 'bēḍa', 'أبيض', 'abyaḍ'], { ar: 'The gender throughout this deck is the thing described, not a person.' }),
      c('black', ['שחורה', 'shkhora', 'שחור', 'shakhor'], ['سودا', 'sōda', 'أسود', 'aswad']),
      c('red', ['אדומה', 'aduma', 'אדום', 'adom'], ['حمرا', 'ḥamra', 'أحمر', 'aḥmar']),
      c('blue', ['כחולה', 'kkhula', 'כחול', 'kakhol'], ['زرقا', 'zarʾa', 'أزرق', 'azraʾ']),
      c('green', ['ירוקה', 'yeruka', 'ירוק', 'yarok'], ['خضرا', 'khaḍra', 'أخضر', 'akhḍar']),
      c('yellow', ['צהובה', 'tsehuba', 'צהוב', 'tsahov'], ['صفرا', 'ṣafra', 'أصفر', 'aṣfar']),
      c('brown', ['חומה', 'khuma', 'חום', 'khum'], ['بنّيّة', 'bunniyye', 'بنّي', 'bunni']),
      c('grey', ['אפורה', 'afora', 'אפור', 'afor'], ['رماديّة', 'ramādiyye', 'رمادي', 'ramādi']),
      c('orange (colour)', ['כתומה', 'ktuma', 'כתום', 'katom'], ['برتقاليّة', 'burtuʾāliyye', 'برتقالي', 'burtuʾāli']),
      c('pink', ['ורודה', 'vruda', 'ורוד', 'varod'], ['زهريّة', 'zahriyye', 'زهري', 'zahri']),
    ],
  },
  {
    name: 'More colours',
    cards: [
      c('purple', ['סגולה', 'sgula', 'סגול', 'sagol'], ['بنفسجيّة', 'banafsajiyye', 'بنفسجي', 'banafsaji']),
      c('gold', ['זהובה', 'zehuba', 'זהוב', 'zahov'], ['دهبيّة', 'dahabiyye', 'دهبي', 'dahabi'], { ar: 'Written ذهبي; the ذ is said as a d in Palestinian speech.' }),
      c('silver', ['כסופה', 'ksufa', 'כסוף', 'kasuf'], ['فضّيّة', 'faḍḍiyye', 'فضّي', 'faḍḍi']),
      c('beige', ['בז\'', 'bezh'], ['بيج', 'bēj'], { ar: 'A borrowed word that does not change.' }),
      c('turquoise', ['טורקיז', 'turkiz'], ['فيروزيّة', 'fērōziyye', 'فيروزي', 'fērōzi'], { he: 'The Hebrew word does not change.' }),
      c('navy blue', ['כחולה כהה', 'kkhula keha', 'כחול כהה', 'kakhol kehe'], ['كحليّة', 'kuḥliyye', 'كحلي', 'kuḥli']),
      c('light blue', ['תכלת', 'tkhelet'], ['سماويّة', 'samāwiyye', 'سماوي', 'samāwi'], { he: 'A colour of its own in Hebrew, not "light blue".', ar: 'Literally "sky-coloured".' }),
      c('maroon', ['בורדו', 'bordo'], ['عنّابيّة', 'ʿunnābiyye', 'عنّابي', 'ʿunnābi'], { ar: 'Named after the عنّاب, the jujube fruit; very common in Palestinian speech.' }),
      c('olive green', ['ירוקה זית', 'yeruka zayit', 'ירוק זית', 'yarok zayit'], ['زيتيّة', 'zētiyye', 'زيتي', 'zēti']),
      c('colourful', ['צבעונית', 'tsiv\'onit', 'צבעוני', 'tsiv\'oni'], ['ملوّنة', 'mlawwane', 'ملوّن', 'mlawwan']),
    ],
  },
  {
    name: 'Colours in use',
    cards: [
      c('the colour', ['הצבע', 'hatseva'], ['اللون', 'il-lōn']),
      c('what colour is it?', ['איזה צבע זה', 'eize tseva ze'], ['شو لونه', 'shū lōno']),
      c('light (shade)', ['בהירה', 'behira', 'בהיר', 'bahir'], ['فاتحة', 'fātḥa', 'فاتح', 'fāteḥ'], { ar: 'Said after the colour: أزرق فاتح, "light blue".' }),
      c('dark (shade)', ['כהה', 'keha', 'כהה', 'kehe'], ['غامقة', 'ghāmʾa', 'غامق', 'ghāmeʾ'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
      c('a red car', ['מכונית אדומה', 'mekhonit aduma'], ['سيّارة حمرا', 'sayyāra ḥamra'], { ar: 'سيّارة is a feminine word, so the colour takes its feminine form.' }),
      c('a white shirt', ['חולצה לבנה', 'khultsa levana'], ['قميص أبيض', 'ʾamīṣ abyaḍ'], { ar: 'قميص is masculine, so the colour follows it.' }),
      c('green tea', ['תה ירוק', 'te yarok'], ['شاي أخضر', 'shāy akhḍar']),
      c('the sky is blue', ['השמיים כחולים', 'hashamayim kkhulim'], ['السما زرقا', 'is-sama zarʾa']),
      c('green eyes', ['עיניים ירוקות', 'einayim yerukot'], ['عيون خضر', 'ʿyūn khuḍur']),
      c('my favourite colour', ['הצבע האהוב עליי', 'hatseva ha\'ahuv alay'], ['لوني المفضّل', 'lōni il-mufaḍḍal']),
    ],
  },
];

/**
 * Wanting, needing and feeling — the sentence frames a learner leans on before
 * she has many words to put in them.
 *
 * The first deck is the learner speaking, so its pair is her own gender and the
 * feminine form is the one she says. The second deck moves through the other
 * people: there the pair is whoever is being spoken to, or whoever is doing the
 * wanting. Palestinian Arabic carries all of this on بدّ plus an ending —
 * بدّي, بدّك, بدّه — and بدّي itself does not change for a woman or a man.
 */
const WANT_DECKS: SeedDeck[] = [
  {
    name: 'I want and I need',
    cards: [
      c('I want', bySp(['אני רוצה', 'ani rotsa'], ['אני רוצה', 'ani rotse']), ['أنا بدّي', 'ana biddi'], { he: 'Written the same either way; only the ending is said differently.', ar: 'بدّي is said the same by a woman or a man.' }),
      c('I need', bySp(['אני צריכה', 'ani tsrikha'], ['אני צריך', 'ani tsarikh']), ['أنا لازمني', 'ana lāzimni'], { ar: 'Literally "it is necessary for me".' }),
      c('I have', ['יש לי', 'yesh li'], ['عندي', 'ʿindi'], { he: 'Literally "there is to me"; Hebrew has no verb for "have".' }),
      c('I see', bySp(['אני רואה', 'ani ro\'a'], ['אני רואה', 'ani ro\'e']), ['أنا بشوف', 'ana bashūf'], { he: 'Written the same either way; only the ending is said differently.' }),
      c('I feel', bySp(['אני מרגישה', 'ani margisha'], ['אני מרגיש', 'ani margish']), ['أنا بحسّ', 'ana baḥiss']),
      c('I miss', bySp(['אני מתגעגעת', 'ani mitga\'aga\'at'], ['אני מתגעגע', 'ani mitga\'age\'a']), bySp(['أنا مشتاقة', 'ana mushtāʾa'], ['أنا مشتاق', 'ana mushtāʾ']), { ar: 'One of the few Arabic forms here that follows the speaker: a woman says مشتاقة.' }),
      c('I know', bySp(['אני יודעת', 'ani yoda\'at'], ['אני יודע', 'ani yode\'a']), ['أنا بعرف', 'ana baʿref']),
      c('I love', bySp(['אני אוהבת', 'ani ohevet'], ['אני אוהב', 'ani ohev']), ['أنا بحبّ', 'ana baḥibb'], { ar: 'The same verb covers loving a person and liking a thing.' }),
      c('I can', bySp(['אני יכולה', 'ani yekhola'], ['אני יכול', 'ani yakhol']), ['أنا بقدر', 'ana baʾdar']),
      c('I don\'t want', bySp(['אני לא רוצה', 'ani lo rotsa'], ['אני לא רוצה', 'ani lo rotse']), ['أنا ما بدّي', 'ana ma biddi'], { he: 'Written the same either way; only the ending is said differently.', ar: 'ما is the everyday spoken negative in front of بدّي.' }),
    ],
  },
  {
    name: 'You, he and she',
    cards: [
      c('you want', toL(['אתה רוצה', 'ata rotse'], ['את רוצה', 'at rotsa']), toL(['بدَّك', 'biddak'], ['بدِّك', 'biddik']), { ar: 'Written بدك either way — only the transliteration tells the two endings apart.' }),
      c('he wants', ['הוא רוצה', 'hu rotse'], ['هوّ بدّه', 'huwwe biddo']),
      c('she wants', ['היא רוצה', 'hi rotsa'], ['هيّ بدّها', 'hiyye bidha']),
      c('we want', ['אנחנו רוצות', 'anakhnu rotsot', 'אנחנו רוצים', 'anakhnu rotsim'], ['إحنا بدّنا', 'iḥna bidna'], { he: 'Hebrew splits the plural; a group with any man in it takes רוצים.' }),
      c('they want', ['הן רוצות', 'hen rotsot', 'הם רוצים', 'hem rotsim'], ['هُمّ بدّهم', 'humme bidhom'], { ar: 'One plural form for a group of any gender.' }),
      c('you need', toL(['אתה צריך', 'ata tsarikh'], ['את צריכה', 'at tsrikha']), toL(['لازمك', 'lāzmak'], ['لازمك', 'lāzmik']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('he needs', ['הוא צריך', 'hu tsarikh'], ['لازمه', 'lāzmo']),
      c('she needs', ['היא צריכה', 'hi tsrikha'], ['لازمها', 'lāzimha']),
      c('she has / he has', ['יש לה', 'yesh la', 'יש לו', 'yesh lo'], ['عندها', 'ʿindha', 'عنده', 'ʿindo'], { ar: 'Here the ending follows the owner, not the person spoken to.' }),
      c('what do you want?', toL(['מה אתה רוצה', 'ma ata rotse'], ['מה את רוצה', 'ma at rotsa']), toL(['شو بدَّك', 'shū biddak'], ['شو بدِّك', 'shū biddik'])),
    ],
  },
  {
    name: 'Saying what you want',
    cards: [
      c('I want water', bySp(['אני רוצה מים', 'ani rotsa mayim'], ['אני רוצה מים', 'ani rotse mayim']), ['بدّي ميّة', 'biddi mayye'], { he: 'Written the same either way; only the ending is said differently.', ar: 'أنا can be left off — بدّي already says who wants.' }),
      c('I need help', bySp(['אני צריכה עזרה', 'ani tsrikha ezra'], ['אני צריך עזרה', 'ani tsarikh ezra']), ['لازمني مساعدة', 'lāzimni musāʿade']),
      c('I want to eat', bySp(['אני רוצה לאכול', 'ani rotsa le\'ekhol'], ['אני רוצה לאכול', 'ani rotse le\'ekhol']), ['بدّي آكل', 'biddi ākol'], { he: 'Written the same either way; only the ending is said differently.' }),
      c('I want to go home', bySp(['אני רוצה ללכת הביתה', 'ani rotsa lalekhet habayta'], ['אני רוצה ללכת הביתה', 'ani rotse lalekhet habayta']), ['بدّي أروح عالبيت', 'biddi arūḥ ʿal-bēt'], { he: 'Written the same either way; only the ending is said differently.', ar: 'عالبيت is عَ الْبيت run together, the way it is actually said.' }),
      // The one card in the deck where both halves of the conversation show up
      // in the same Hebrew sentence: the verb is the speaker's, the suffix on
      // אלי- is the listener's, so all four perspectives really do differ.
      c('I miss you', both4(['אני מתגעגעת אליך', 'ani mitga\'aga\'at elekha'], ['אני מתגעגעת אלייך', 'ani mitga\'aga\'at elayikh'], ['אני מתגעגע אלייך', 'ani mitga\'age\'a elayikh'], ['אני מתגעגע אליך', 'ani mitga\'age\'a elekha']), toL(['اشتقتلك', 'ishtaʾtillak'], ['اشتقتلك', 'ishtaʾtillik']), { he: 'The verb follows you, the ending follows them.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('I feel tired', bySp(['אני מרגישה עייפה', 'ani margisha ayefa'], ['אני מרגיש עייף', 'ani margish ayef']), bySp(['أنا تعبانة', 'ana taʿbāne'], ['أنا تعبان', 'ana taʿbān']), { ar: 'Arabic simply says "I am tired"; the ending is your own.' }),
      c('I have time', ['יש לי זמן', 'yesh li zman'], ['عندي وقت', 'ʿindi waʾt']),
      c('I have a question', ['יש לי שאלה', 'yesh li she\'ela'], ['عندي سؤال', 'ʿindi suʾāl']),
      c('do you want tea?', toL(['אתה רוצה תה', 'ata rotse te'], ['את רוצה תה', 'at rotsa te']), toL(['بدَّك شاي', 'biddak shāy'], ['بدِّك شاي', 'biddik shāy'])),
      c('what do you need?', toL(['מה אתה צריך', 'ma ata tsarikh'], ['מה את צריכה', 'ma at tsrikha']), toL(['شو لازمك', 'shū lāzmak'], ['شو لازمك', 'shū lāzmik']), { ar: 'Written the same either way; only the ending is said differently.' }),
    ],
  },
];

/**
 * Whole phrases, grouped by the moment a learner reaches for them.
 *
 * The word decks teach one thing at a time; these are what she actually says
 * out loud, and they are drawn from the phrase curriculum in
 * `docs/sentence-curriculum.md` — its tier 1 and tier 2, the ones that let a
 * conversation start and then keep going.
 *
 * Every deck here is written under the rule that curriculum insists on: a
 * phrase said *to* somebody is not therefore listener-varying. "Where should we
 * meet?" is asked of a person and worded identically whoever that person is, so
 * it carries no variants at all. Only wordings that really change get `toL`,
 * `bySp` or `both4`, and each language is decided on its own — Hebrew splits a
 * present-tense verb where Palestinian Arabic often does not, and the Hebrew
 * past tense splits for nobody.
 *
 * These are content, not frames: "I want to practise" is a whole card, and the
 * machinery that would make it `I want ___` is the plan in
 * `docs/sentence-structures-plan.md`, still unbuilt.
 */
const PHRASE_DECKS: SeedDeck[] = [
  {
    name: 'Please and thank you',
    cards: [
      c('thank you very much', ['תודה רבה', 'toda raba'], ['شكرا كتير', 'shukran ktīr']),
      c('I am sorry', bySp(['אני מצטערת', 'ani mitsta\'eret'], ['אני מצטער', 'ani mitsta\'er']), bySp(['أنا آسفة', 'ana āsfe'], ['أنا آسف', 'ana āsef']), { he: 'The apology is your own, so the ending follows you and not the person you are apologising to.', ar: 'Same here — a woman says آسفة to anybody.' }),
      c('no problem', ['אין בעיה', 'ein be\'aya'], ['ما في مشكلة', 'mā fī mushkile']),
      c('never mind', ['לא נורא', 'lo nora'], ['معلش', 'maʿlesh'], { ar: 'Covers "never mind", "it\'s fine" and "sorry about that" all at once.' }),
      c('of course', ['בטח', 'betakh'], ['أكيد', 'akīd']),
      c('with pleasure', ['בשמחה', 'besimkha'], ['من عيوني', 'min ʿyūni'], { ar: 'Literally "from my eyes" — warmer than a plain yes, and very common.' }),
      c('do not worry', toL(['אל תדאג', 'al tid\'ag'], ['אל תדאגי', 'al tid\'agi']), toL(['ما تقلق', 'mā tiʾlaʾ'], ['ما تقلقي', 'mā tiʾlaʾi'])),
      c('thank you for your help', ['תודה על העזרה', 'toda al ha\'ezra'], ['شكرا عالمساعدة', 'shukran ʿal-musāʿade'], { ar: 'عالمساعدة is عَ المساعدة run together, the way it is said.' }),
      c('go ahead / help yourself', ['בבקשה', 'bevakasha'], toL(['تفضّل', 'tfaḍḍal'], ['تفضّلي', 'tfaḍḍali']), { ar: 'Offering a seat, a plate, or a turn to speak.' }),
      c('it does not matter', ['לא משנה', 'lo meshane'], ['مش مهم', 'mish muhimm']),
    ],
  },
  {
    name: 'Yes, no and maybe',
    cards: [
      c('yes', ['כן', 'ken'], ['آه', 'āh'], { ar: 'The everyday spoken yes; نعم belongs to formal Arabic.' }),
      c('no', ['לא', 'lo'], ['لأ', 'laʾ']),
      c('maybe', ['אולי', 'ulay'], ['يمكن', 'yimkin']),
      c('I do not know', bySp(['אני לא יודעת', 'ani lo yoda\'at'], ['אני לא יודע', 'ani lo yode\'a']), ['ما بعرف', 'mā baʿref'], { ar: 'One form whoever is speaking.' }),
      c('I think so', bySp(['אני חושבת שכן', 'ani khoshevet sheken'], ['אני חושב שכן', 'ani khoshev sheken']), ['بظنّ هيك', 'baẓunn hēk']),
      c('really?', ['באמת', 'be\'emet'], ['والله', 'walla'], { ar: 'Literally "by God", and used all day long as plain "really?".' }),
      c('exactly', ['בדיוק', 'bediyuk'], ['بالظبط', 'biẓ-ẓabṭ']),
      c('that is true', ['נכון', 'nakhon'], ['صحيح', 'ṣaḥīḥ']),
      c('just a second', ['רגע', 'rega'], ['لحظة', 'laḥẓa']),
      c('I understand', bySp(['אני מבינה', 'ani mevina'], ['אני מבין', 'ani mevin']), bySp(['أنا فاهمة', 'ana fāhme'], ['أنا فاهم', 'ana fāhem'])),
    ],
  },
  {
    name: 'When you do not understand',
    cards: [
      c('what does this mean?', ['מה זה אומר', 'ma ze omer'], ['شو معناها', 'shū maʿnāha']),
      c('I did not understand', ['לא הבנתי', 'lo hevanti'], ['ما فهمت', 'mā fhimt'], { he: 'The past tense is the same whoever is speaking — a relief after the present.', ar: 'One form here too.' }),
      c('say it again, please', toL(['תגיד שוב בבקשה', 'tagid shuv bevakasha'], ['תגידי שוב בבקשה', 'tagidi shuv bevakasha']), toL(['عيدها لو سمحت', 'ʿīdha law samaḥt'], ['عيديها لو سمحتي', 'ʿīdīha law samaḥti'])),
      c('a little slower, please', ['אפשר לאט יותר בבקשה', 'efshar le\'at yoter bevakasha'], toL(['شوي شوي لو سمحت', 'shwayy shwayy law samaḥt'], ['شوي شوي لو سمحتي', 'shwayy shwayy law samaḥti']), { he: 'efshar keeps it a request rather than an order, and is said the same to anyone.' }),
      c('I did not hear you', toL(['לא שמעתי אותך', 'lo shamati otkha'], ['לא שמעתי אותך', 'lo shamati otakh']), toL(['ما سمعتك', 'mā smiʿtak'], ['ما سمعتك', 'mā smiʿtik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('what did you say?', toL(['מה אמרת', 'ma amarta'], ['מה אמרת', 'ma amart']), toL(['شو قلت', 'shū ʾult'], ['شو قلتي', 'shū ʾulti']), { he: 'Written the same either way; only the ending is said differently.' }),
      c('can you write it down?', ['אפשר לכתוב את זה', 'efshar likhtov et ze'], toL(['ممكن تكتبها', 'mumkin tiktibha'], ['ممكن تكتبيها', 'mumkin tiktibīha'])),
      c('is that right?', ['זה נכון', 'ze nakhon'], ['هيك صح', 'hēk ṣaḥḥ']),
      c('did I say it correctly?', ['אמרתי נכון', 'amarti nakhon'], ['قلتها صح', 'ʾultha ṣaḥḥ'], { he: 'Past tense again, so one form for everyone.' }),
      c('what is this called?', ['איך קוראים לזה', 'ekh kor\'im laze'], ['شو اسمه هاد', 'shū ismo hād']),
    ],
  },
  {
    name: 'Asking how to say it',
    cards: [
      c('how do you say this in Hebrew?', ['איך אומרים את זה בעברית', 'ekh omrim et ze be\'ivrit'], ['كيف بنحكي هاد بالعبري', 'kīf bniḥki hād bil-ʿibri'], { he: 'omrim is "one says" — impersonal, so the question is put the same way to anyone.', ar: 'Literally "how do we say this", which is how it is normally asked.' }),
      c('how do you say this in Arabic?', ['איך אומרים את זה בערבית', 'ekh omrim et ze be\'aravit'], ['كيف بنحكي هاد بالعربي', 'kīf bniḥki hād bil-ʿarabi']),
      c('what is this word?', ['מה המילה הזאת', 'ma hamila hazot'], ['شو هاي الكلمة', 'shū hayy il-kalme']),
      c('this word is new to me', ['המילה הזאת חדשה לי', 'hamila hazot khadasha li'], ['هاي الكلمة جديدة عليّ', 'hayy il-kalme jdīde ʿalayy']),
      c('how do you spell it?', ['איך כותבים את זה', 'ekh kotvim et ze'], ['كيف بتنكتب', 'kīf btinkatib']),
      c('how do you pronounce it?', ['איך מבטאים את זה', 'ekh mevat\'im et ze'], toL(['كيف بتلفظها', 'kīf btilfiẓha'], ['كيف بتلفظيها', 'kīf btilfiẓīha']), { ar: 'Asked as "how do you say it", which is how it comes out; the ending follows the person you ask.' }),
      c('can you give me an example?', toL(['תיתן לי דוגמה', 'titen li dugma'], ['תתני לי דוגמה', 'titni li dugma']), ['ممكن تعطيني مثال', 'mumkin taʿṭīni mithāl'], { ar: 'The Arabic verb ends the same way whoever is asked.' }),
      c('what is that in English?', ['מה זה באנגלית', 'ma ze be\'anglit'], ['شو هاد بالإنجليزي', 'shū hād bil-inglīzi']),
      c('I forgot the word', ['שכחתי את המילה', 'shakhakhti et hamila'], ['نسيت الكلمة', 'nsīt il-kalme']),
      c('please correct me', toL(['תתקן אותי בבקשה', 'tetaken oti bevakasha'], ['תתקני אותי בבקשה', 'tetakni oti bevakasha']), toL(['صحّحلي لو سمحت', 'ṣaḥḥiḥli law samaḥt'], ['صحّحيلي لو سمحتي', 'ṣaḥḥiḥīli law samaḥti'])),
    ],
  },
  {
    name: 'Learning the language',
    cards: [
      c('I am learning Hebrew', bySp(['אני לומדת עברית', 'ani lomedet ivrit'], ['אני לומד עברית', 'ani lomed ivrit']), ['أنا بتعلّم عبري', 'ana batʿallam ʿibri'], { ar: 'The Arabic verb is the same whoever is speaking.' }),
      c('I am learning Arabic', bySp(['אני לומדת ערבית', 'ani lomedet aravit'], ['אני לומד ערבית', 'ani lomed aravit']), ['أنا بتعلّم عربي', 'ana batʿallam ʿarabi']),
      c('I am still learning', bySp(['אני עדיין לומדת', 'ani adayin lomedet'], ['אני עדיין לומד', 'ani adayin lomed']), ['لسّه بتعلّم', 'lissa batʿallam']),
      c('I speak a little Arabic', bySp(['אני מדברת קצת ערבית', 'ani medaberet ktsat aravit'], ['אני מדבר קצת ערבית', 'ani medaber ktsat aravit']), ['بحكي شوية عربي', 'baḥki shwayyet ʿarabi']),
      c('I want to practise', bySp(['אני רוצה לתרגל', 'ani rotsa letargel'], ['אני רוצה לתרגל', 'ani rotse letargel']), ['بدّي أتمرّن', 'biddi atmarran'], { he: 'Written the same either way; only the ending is said differently.' }),
      c('can I practise with you?', toL(['אפשר לתרגל איתך', 'efshar letargel itkha'], ['אפשר לתרגל איתך', 'efshar letargel itakh']), toL(['ممكن أتمرّن معك', 'mumkin atmarran maʿak'], ['ممكن أتمرّن معك', 'mumkin atmarran maʿik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('my Hebrew is not good yet', ['העברית שלי עוד לא טובה', 'ha\'ivrit sheli od lo tova'], ['عبريتي لسّه مش منيحة', 'ʿibriti lissa mish mnīḥa']),
      c('I need more practice', bySp(['אני צריכה עוד תרגול', 'ani tsrikha od tirgul'], ['אני צריך עוד תרגול', 'ani tsarikh od tirgul']), ['لازمني تمرين أكتر', 'lāzimni tamrīn aktar']),
      c('Arabic is difficult', ['ערבית קשה', 'aravit kasha'], ['العربي صعب', 'il-ʿarabi ṣaʿb']),
      c('I am getting better', bySp(['אני משתפרת', 'ani mishtaperet'], ['אני משתפר', 'ani mishtaper']), ['عم بتحسّن', 'ʿam batḥassan']),
    ],
  },
  {
    name: 'How I feel',
    cards: [
      // The whole deck is the speaker's own: a woman says the feminine form to
      // anybody, and the person listening never touches it.
      c('I am happy', bySp(['אני שמחה', 'ani smekha'], ['אני שמח', 'ani sameakh']), bySp(['أنا مبسوطة', 'ana mabsūṭa'], ['أنا مبسوط', 'ana mabsūṭ'])),
      c('I am sad', bySp(['אני עצובה', 'ani atsuva'], ['אני עצוב', 'ani atsuv']), bySp(['أنا زعلانة', 'ana zaʿlāne'], ['أنا زعلان', 'ana zaʿlān'])),
      c('I am tired', bySp(['אני עייפה', 'ani ayefa'], ['אני עייף', 'ani ayef']), bySp(['أنا تعبانة', 'ana taʿbāne'], ['أنا تعبان', 'ana taʿbān'])),
      c('I am hungry', bySp(['אני רעבה', 'ani re\'eva'], ['אני רעב', 'ani ra\'ev']), bySp(['أنا جوعانة', 'ana jūʿāne'], ['أنا جوعان', 'ana jūʿān'])),
      c('I am thirsty', bySp(['אני צמאה', 'ani tsme\'a'], ['אני צמא', 'ani tsame']), bySp(['أنا عطشانة', 'ana ʿaṭshāne'], ['أنا عطشان', 'ana ʿaṭshān'])),
      c('I am cold', ['קר לי', 'kar li'], bySp(['أنا بردانة', 'ana bardāne'], ['أنا بردان', 'ana bardān']), { he: 'Literally "it is cold to me", so the Hebrew does not change at all.' }),
      c('I am worried', bySp(['אני מודאגת', 'ani mud\'eget'], ['אני מודאג', 'ani mud\'ag']), bySp(['أنا قلقانة', 'ana ʾalʾāne'], ['أنا قلقان', 'ana ʾalʾān'])),
      c('I am nervous', bySp(['אני לחוצה', 'ani lekhutsa'], ['אני לחוץ', 'ani lakhuts']), bySp(['أنا متوترة', 'ana mitwattre'], ['أنا متوتر', 'ana mitwattir'])),
      c('I am bored', bySp(['אני משועממת', 'ani meshu\'ememet'], ['אני משועמם', 'ani meshu\'amam']), bySp(['أنا زهقانة', 'ana zahʾāne'], ['أنا زهقان', 'ana zahʾān'])),
      c('I feel better', bySp(['אני מרגישה יותר טוב', 'ani margisha yoter tov'], ['אני מרגיש יותר טוב', 'ani margish yoter tov']), ['صرت أحسن', 'ṣirt aḥsan'], { ar: 'Literally "I became better"; the past tense does not change for a woman or a man.' }),
    ],
  },
  {
    name: 'Small talk',
    cards: [
      c('what are you doing today?', toL(['מה אתה עושה היום', 'ma ata ose hayom'], ['מה את עושה היום', 'ma at osa hayom']), toL(['شو عم تعمل اليوم', 'shū ʿam tiʿmal il-yōm'], ['شو عم تعملي اليوم', 'shū ʿam tiʿmali il-yōm'])),
      c('how was your day?', toL(['איך היה היום שלך', 'ekh haya hayom shelkha'], ['איך היה היום שלך', 'ekh haya hayom shelakh']), toL(['كيف كان يومك', 'kīf kān yōmak'], ['كيف كان يومك', 'kīf kān yōmik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('are you busy?', toL(['אתה עסוק', 'ata asuk'], ['את עסוקה', 'at asuka']), toL(['إنت مشغول', 'inte mashghūl'], ['إنتِ مشغولة', 'inti mashghūle'])),
      c('what do you like to do?', toL(['מה אתה אוהב לעשות', 'ma ata ohev la\'asot'], ['מה את אוהבת לעשות', 'ma at ohevet la\'asot']), toL(['شو بتحبّ تعمل', 'shū btiḥibb tiʿmal'], ['شو بتحبّي تعملي', 'shū btiḥibbi tiʿmali'])),
      c('do you have children?', toL(['יש לך ילדים', 'yesh lekha yeladim'], ['יש לך ילדים', 'yesh lakh yeladim']), toL(['عندك ولاد', 'ʿindak wlād'], ['عندك ولاد', 'ʿindik wlād']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('where do you live?', toL(['איפה אתה גר', 'eifo ata gar'], ['איפה את גרה', 'eifo at gara']), toL(['وين ساكن', 'wēn sāken'], ['وين ساكنة', 'wēn sākne'])),
      c('I live nearby', bySp(['אני גרה קרוב', 'ani gara karov'], ['אני גר קרוב', 'ani gar karov']), bySp(['أنا ساكنة قريب', 'ana sākne ʾarīb'], ['أنا ساكن قريب', 'ana sāken ʾarīb']), { he: 'Here the ending is your own, not theirs.', ar: 'Here the ending is your own, not theirs.' }),
      c('do you like music?', toL(['אתה אוהב מוזיקה', 'ata ohev muzika'], ['את אוהבת מוזיקה', 'at ohevet muzika']), toL(['بتحبّ الموسيقى', 'btiḥibb il-mūsīʾa'], ['بتحبّي الموسيقى', 'btiḥibbi il-mūsīʾa'])),
      c('what food do you like?', toL(['איזה אוכל אתה אוהב', 'eize okhel ata ohev'], ['איזה אוכל את אוהבת', 'eize okhel at ohevet']), toL(['شو الأكل اللي بتحبّه', 'shū il-akel elli btiḥibbo'], ['شو الأكل اللي بتحبّيه', 'shū il-akel elli btiḥibbīh'])),
      c('it was nice talking to you', toL(['היה נעים לדבר איתך', 'haya na\'im ledaber itkha'], ['היה נעים לדבר איתך', 'haya na\'im ledaber itakh']), toL(['كان حلو نحكي معك', 'kān ḥilu niḥki maʿak'], ['كان حلو نحكي معك', 'kān ḥilu niḥki maʿik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
    ],
  },
  {
    name: 'Making plans',
    cards: [
      c('are you free tomorrow?', toL(['אתה פנוי מחר', 'ata panuy makhar'], ['את פנויה מחר', 'at pnuya makhar']), toL(['فاضي بكرا', 'fāḍi bukra'], ['فاضية بكرا', 'fāḍye bukra'])),
      c('do you want to meet?', toL(['אתה רוצה להיפגש', 'ata rotse lehipagesh'], ['את רוצה להיפגש', 'at rotsa lehipagesh']), toL(['بدَّك نتقابل', 'biddak nitʾābal'], ['بدِّك نتقابل', 'biddik nitʾābal'])),
      c('where should we meet?', ['איפה ניפגש', 'eifo nipagesh'], ['وين نتقابل', 'wēn nitʾābal'], { he: 'Asked of a person and worded the same whoever that person is.' }),
      c('what time?', ['באיזו שעה', 'be\'eizo sha\'a'], ['أيّ ساعة', 'ayy sāʿa']),
      c('let us meet at five', ['ניפגש בחמש', 'nipagesh bekhamesh'], ['نتقابل الساعة خمسة', 'nitʾābal is-sāʿa khamse']),
      c('let us go', ['יאללה נלך', 'yalla nelekh'], ['يلا نروح', 'yalla nrūḥ'], { he: 'yalla is Arabic, and just as much a Hebrew word now.' }),
      c('I cannot today', bySp(['אני לא יכולה היום', 'ani lo yekhola hayom'], ['אני לא יכול היום', 'ani lo yakhol hayom']), ['ما بقدر اليوم', 'mā baʾdar il-yōm'], { ar: 'One form whoever is speaking.' }),
      c('maybe tomorrow', ['אולי מחר', 'ulay makhar'], ['يمكن بكرا', 'yimkin bukra']),
      c('I will let you know', toL(['אני אעדכן אותך', 'ani a\'adken otkha'], ['אני אעדכן אותך', 'ani a\'adken otakh']), toL(['بخبّرك', 'bkhabbrak'], ['بخبّرك', 'bkhabbrik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('call me later', toL(['תתקשר אליי אחר כך', 'titkasher elai akhar kakh'], ['תתקשרי אליי אחר כך', 'titkashri elai akhar kakh']), toL(['اتصل فيّي بعدين', 'ittiṣil fiyyi baʿdēn'], ['اتصلي فيّي بعدين', 'ittiṣli fiyyi baʿdēn'])),
    ],
  },
  {
    name: 'Kind words',
    cards: [
      // The Hebrew here is the clearest case in the starter set of both halves
      // of the conversation showing up in one sentence: the verb is yours, the
      // ending is theirs, so all four perspectives really do differ.
      c('I love you', both4(['אני אוהבת אותך', 'ani ohevet otkha'], ['אני אוהבת אותך', 'ani ohevet otakh'], ['אני אוהב אותך', 'ani ohev otakh'], ['אני אוהב אותך', 'ani ohev otkha']), toL(['بحبّك', 'bḥibbak'], ['بحبّك', 'bḥibbik']), { he: 'Written the same either way; the verb follows you and the ending follows them.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('you are sweet', toL(['אתה מתוק', 'ata matok'], ['את מתוקה', 'at metuka']), toL(['إنت حلو', 'inte ḥilu'], ['إنتِ حلوة', 'inti ḥilwe'])),
      c('thank you for everything', ['תודה על הכול', 'toda al hakol'], ['شكرا على كلّ إشي', 'shukran ʿala kull ishi']),
      c('I am proud of you', both4(['אני גאה בך', 'ani ge\'a bekha'], ['אני גאה בך', 'ani ge\'a bakh'], ['אני גאה בך', 'ani ge\'e bakh'], ['אני גאה בך', 'ani ge\'e bekha']), both4(['أنا فخورة فيك', 'ana fakhūra fīk'], ['أنا فخورة فيكي', 'ana fakhūra fīki'], ['أنا فخور فيكي', 'ana fakhūr fīki'], ['أنا فخور فيك', 'ana fakhūr fīk']), { he: 'Hebrew writes גאה the same for a woman and a man; only the vowel differs.' }),
      c('I am here for you', toL(['אני כאן בשבילך', 'ani kan bishvilkha'], ['אני כאן בשבילך', 'ani kan bishvilekh']), toL(['أنا هون إلك', 'ana hōn ilak'], ['أنا هون إلك', 'ana hōn ilik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('I am thinking of you', both4(['אני חושבת עליך', 'ani khoshevet alekha'], ['אני חושבת עלייך', 'ani khoshevet alayikh'], ['אני חושב עלייך', 'ani khoshev alayikh'], ['אני חושב עליך', 'ani khoshev alekha']), toL(['عم بفكّر فيك', 'ʿam bafakkir fīk'], ['عم بفكّر فيكي', 'ʿam bafakkir fīki'])),
      c('sleep well', toL(['תישן טוב', 'tishan tov'], ['תישני טוב', 'tishni tov']), toL(['نام منيح', 'nām mnīḥ'], ['نامي منيح', 'nāmi mnīḥ'])),
      c('do not be sad', toL(['אל תהיה עצוב', 'al tihye atsuv'], ['אל תהיי עצובה', 'al tihyi atsuva']), toL(['ما تزعل', 'mā tizʿal'], ['ما تزعلي', 'mā tizʿali'])),
      c('everything will be okay', ['הכול יהיה בסדר', 'hakol yihye beseder'], ['كلّ إشي رح يكون تمام', 'kull ishi raḥ ykūn tamām']),
      c('you are not alone', toL(['אתה לא לבד', 'ata lo levad'], ['את לא לבד', 'at lo levad']), toL(['إنت مش لحالك', 'inte mish laḥālak'], ['إنتِ مش لحالك', 'inti mish laḥālik'])),
    ],
  },
  {
    name: 'Looking after someone',
    cards: [
      // Nearly every line is spoken *to* the person being cared for, which is
      // where a wrong listener form lands hardest.
      c('how are you feeling?', toL(['איך אתה מרגיש', 'ekh ata margish'], ['איך את מרגישה', 'ekh at margisha']), toL(['كيف حاسس حالك', 'kīf ḥāses ḥālak'], ['كيف حاسّة حالك', 'kīf ḥāsse ḥālik']), { ar: 'The fuller, explicit way to ask, and the one worth learning first; كيف حاسس is said just as readily on its own.' }),
      c('are you in pain?', toL(['כואב לך', 'ko\'ev lekha'], ['כואב לך', 'ko\'ev lakh']), toL(['بيوجعك إشي', 'biyūjaʿak ishi'], ['بيوجعك إشي', 'biyūjaʿik ishi']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('do you need anything?', toL(['אתה צריך משהו', 'ata tsarikh mashehu'], ['את צריכה משהו', 'at tsrikha mashehu']), toL(['لازمك إشي', 'lāzmak ishi'], ['لازمك إشي', 'lāzmik ishi']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('let me help you', toL(['תן לי לעזור לך', 'ten li la\'azor lekha'], ['תני לי לעזור לך', 'tni li la\'azor lakh']), toL(['خلّيني أساعدك', 'khallīni asāʿdak'], ['خلّيني أساعدك', 'khallīni asāʿdik']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('are you comfortable?', toL(['נוח לך', 'noakh lekha'], ['נוח לך', 'noakh lakh']), toL(['مرتاح', 'mirtāḥ'], ['مرتاحة', 'mirtāḥa']), { he: 'Written the same either way; only the ending is said differently.' }),
      c('do you want water?', toL(['אתה רוצה מים', 'ata rotse mayim'], ['את רוצה מים', 'at rotsa mayim']), toL(['بدَّك ميّة', 'biddak mayye'], ['بدِّك ميّة', 'biddik mayye'])),
      c('careful', ['זהירות', 'zehirut'], toL(['دير بالك', 'dīr bālak'], ['ديري بالك', 'dīri bālik']), { he: 'A single word, called out to anyone.' }),
      c('take your time', toL(['קח את הזמן', 'kakh et hazman'], ['קחי את הזמן', 'kekhi et hazman']), toL(['خد وقتك', 'khud waʾtak'], ['خدي وقتك', 'khudi waʾtik'])),
      c('tell me if it hurts', toL(['תגיד לי אם כואב', 'tagid li im ko\'ev'], ['תגידי לי אם כואב', 'tagidi li im ko\'ev']), toL(['قلّي إذا بيوجع', 'ʾilli iza biyūjaʿ'], ['قوليلي إذا بيوجع', 'ʾūlīli iza biyūjaʿ'])),
      c('I will be right back', bySp(['אני כבר חוזרת', 'ani kvar khozeret'], ['אני כבר חוזר', 'ani kvar khozer']), ['برجع حالا', 'barjaʿ ḥālan'], { ar: 'One form whoever is speaking.' }),
    ],
  },
];

/**
 * The learner's own category.
 *
 * Unlike every other starter category this one is a starting point rather than
 * a finished set: sentences added from inside the app land in "My sentences"
 * beside these, and nothing else in the codebase treats them as strays. The
 * nine below were written out by hand before the app had anywhere to put them
 * — whole sentences aimed at one particular person, which is the shape the
 * word-per-card starter set cannot hold.
 *
 * Where a sentence is spoken to a woman — mother — only her form is given;
 * where anyone could be addressed, the usual feminine/masculine pair is there.
 */
export const CUSTOM_CATEGORY = 'Custom';
export const CUSTOM_DECK = 'My sentences';

const CUSTOM_DECKS: SeedDeck[] = [
  {
    name: CUSTOM_DECK,
    cards: [
      c('hi', ['שלום', 'shalom'], ['مرحبا', 'marḥaba']),
      c(
        'how are you, mom?',
        ['מה שלומך אמא', 'ma shlomekh ima'],
        ['كيف حالك ماما', 'kīf ḥālik māma'],
        { ar: 'The ـك ending is the feminine حالِك; كيفك is the shorter everyday version of the same question.' },
      ),
      c(
        'my name is Mali',
        ['קוראים לי מאלי', 'kor\'im li Mali'],
        ['اسمي مالي', 'ismi Mali'],
        { he: 'Literally "they call me Mali", which is how the introduction is normally made.' },
      ),
      c(
        'I want to help you at your home, mom',
        // Said by her, to her mother: a woman speaking to a woman throughout.
        // The verb was masculine here until the perspectives went in, which is
        // exactly the mistake this axis exists to stop.
        bySp(
          ['אני רוצה לעזור לך בבית שלך אמא', 'ani rotsa la\'azor lakh babayit shelakh ima'],
          ['אני רוצה לעזור לך בבית שלך אמא', 'ani rotse la\'azor lakh babayit shelakh ima'],
        ),
        ['أنا بدي أساعدك بالبيت ماما', 'ana biddi asāʿdik bil-bēt māma'],
        { he: 'רוצה is the speaker\'s own — rotsa from a woman, rotse from a man — and is written the same either way. לך and שלך stay feminine because the person addressed is always her mother.', ar: 'بدي does not change for a woman or a man; أساعدِك is the feminine "help you", said to her mother. Drop بالبيت and it is simply "I want to help you".' },
      ),
      c(
        'do you want?',
        toL(['אתה רוצה', 'ata rotse'], ['את רוצה', 'at rotsa']),
        toL(['بدَّك', 'biddak'], ['بدِّك', 'biddik']),
        { ar: 'Written بدك either way — only the transliteration tells the two endings apart.' },
      ),
      c(
        'may I ask — are you Jewish or Arab?',
        toL(
          ['אפשר לשאול, אתה יהודי או ערבי', 'efshar lish\'ol, ata yehudi o aravi'],
          ['אפשר לשאול, את יהודייה או ערבייה', 'efshar lish\'ol, at yehudiya o araviya'],
        ),
        toL(
          ['لو سمحت، إنت يهودي ولا عربي', 'law samaḥt, inte yahūdi walla ʿarabi'],
          ['لو سمحتي، إنتِ يهودية ولا عربية', 'law samaḥti, inti yahūdiyye walla ʿarabiyye'],
        ),
        {
          he: 'אפשר לשאול ("may I ask") is what keeps this polite; the bare את יהודייה או ערבייה is blunt. The opener says nothing about who is asking, so it reads the same whoever you are.',
          ar: 'لو سمحتي is the feminine "excuse me", said to a woman; لو سمحت to a man. ولا is the spoken "or" inside a question — أم belongs to written Arabic.',
        },
      ),
      c(
        'do you speak Hebrew?',
        toL(['אתה מדבר עברית', 'ata medaber ivrit'], ['את מדברת עברית', 'at medaberet ivrit']),
        ['بتحكي عبري', 'btiḥki ʿibri'],
        {
          ar: 'بتحكي is said the same way to a woman or to a man — verbs whose stem already ends in -i keep one form. عبري is the everyday name of the language; العبرية is the formal one.',
        },
      ),
      c(
        'do you speak Arabic?',
        toL(['אתה מדבר ערבית', 'ata medaber aravit'], ['את מדברת ערבית', 'at medaberet aravit']),
        ['بتحكي عربي', 'btiḥki ʿarabi'],
        { ar: 'One form of بتحكي whether you are asking a woman or a man.' },
      ),
      c(
        'do you speak English?',
        toL(['אתה מדבר אנגלית', 'ata medaber anglit'], ['את מדברת אנגלית', 'at medaberet anglit']),
        ['بتحكي إنجليزي', 'btiḥki inglīzi'],
        { ar: 'إنجليزي is the spoken form; انكليزي is what you hear further north.' },
      ),
      c(
        'look what I found',
        toL(['תראה מה מצאתי', 'tir\'e ma matsati'], ['תראי מה מצאתי', 'tir\'i ma matsati']),
        toL(['شوف شو لقيت', 'shūf shū laʾēt'], ['شوفي شو لقيت', 'shūfi shū laʾēt']),
        { he: 'תראה is said to a man; תראי to a woman. מצאתי is "I found" whoever is speaking.', ar: 'شوف is said to a man; شوفي to a woman. لقيت is "I found" whoever is speaking.' },
      ),
      c(
        'I missed you',
        toL(['התגעגעתי אליך', 'hitgaʿgaʿti elekha'], ['התגעגעתי אלייך', 'hitgaʿgaʿti elayikh']),
        toL(['اشتقتلك', 'ishtaʾtilak'], ['اشتقتلك', 'ishtaʾtilek']),
        { ar: 'Written the same either way; only the ending is said differently.' },
      ),
    ],
  },
];

/**
 * Starter content: twenty-five categories, one ten-card deck each except the
 * greetings and the pronouns, which take three each, the phrases, which take
 * ten, and the numbers, which run to a hundred. Words come
 * from the Palestinian Arabic and Hebrew starter table, which lists a feminine
 * and a masculine form for every entry; where the two are identical the card
 * carries a single form.
 *
 * Adding a category here needs no code change anywhere else.
 */
/**
 * The one category whose decks are held in an order worth being asked for.
 *
 * "What comes after six" is a real question; "what comes after thank you" is
 * not. Only the numbers are a sequence the learner has to be able to recite, so
 * only they get the ordering drill — see `features/ordering`.
 */
export const SEQUENCED_CATEGORY = 'Counting and numbers';

const BASICS_OF_BASICS_DECKS: SeedDeck[] = [
  {
    name: 'Directions',
    cards: [
      c('up / above', ['למעלה', 'lema\'la'], ['فوق', 'fo\'']),
      c('down / below', ['למטה', 'lemata'], ['تحت', 'taht']),
      c('left', ['שמאל', 'smol'], ['شمال', 'shmaal']),
      c('right', ['ימין', 'yamin'], ['يمين', 'yameen']),
    ],
  },
  {
    name: 'Question words',
    cards: [
      c('who', ['מי', 'mi'], ['مين', 'mīn']),
      c('what', ['מה', 'ma'], ['شو', 'shū']),
      c('when', ['מתי', 'matai'], ['إيمتى', 'ēmta']),
      c('where', ['איפה', 'eifo'], ['وين', 'wēn']),
      c('why', ['למה', 'lama'], ['ليش', 'lēsh']),
      c('how', ['איך', 'eikh'], ['كيف', 'kīf']),
    ],
  },
  {
    name: 'Basic pronouns',
    cards: [
      c('I', ['אני', 'ani'], ['أنا', 'ana']),
      c('you', ofListener('את', 'at', 'אתה', 'ata'), ofListener('إنتِ', 'inti', 'إنتَ', 'inta')),
      c('he', ['הוא', 'hu'], ['هو', 'huwwe']),
      c('she', ['היא', 'hi'], ['هي', 'hiyye']),
      c('we', ['אנחנו', 'anakhnu'], ['إحنا', 'iḥna']),
      c('they', ['הם', 'hem'], ['هم', 'humme']),
    ],
  },
  {
    name: 'Can',
    cards: [
      c('I can', ofSpeaker('אני יכולה', 'ani yekhola', 'אני יכול', 'ani yakhol'), ['بقدر', 'baʾdar']),
      c('I can\'t', ofSpeaker('אני לא יכולה', 'ani lo yekhola', 'אני לא יכול', 'ani lo yakhol'), ['ما بقدر', 'ma baʾdar']),
      c('you can', ofListener('את יכולה', 'at yekhola', 'אתה יכול', 'ata yakhol'), ofListener('بتقدري', 'btiʾdari', 'بتقدر', 'btiʾdar')),
      c('you can\'t', ofListener('את לא יכולה', 'at lo yekhola', 'אתה לא יכול', 'ata lo yakhol'), ofListener('ما بتقدري', 'ma btiʾdari', 'ما بتقدر', 'ma btiʾdar')),
    ],
  },
  {
    name: 'Want',
    cards: [
      c('I want', ofSpeaker('אני רוצה', 'ani rotsa', 'אני רוצה', 'ani rotse'), ['بدي', 'biddi'], { he: 'Written the same either way; only the ending is said differently.' }),
      c('I don\'t want', ofSpeaker('אני לא רוצה', 'ani lo rotsa', 'אני לא רוצה', 'ani lo rotse'), ['ما بدي', 'ma biddi'], { he: 'Written the same either way; only the ending is said differently.' }),
      c('you want', ofListener('את רוצה', 'at rotsa', 'אתה רוצה', 'ata rotse'), ofListener('بدك', 'biddik', 'بدك', 'biddak'), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('you don\'t want', ofListener('את לא רוצה', 'at lo rotsa', 'אתה לא רוצה', 'ata lo rotse'), ofListener('ما بدك', 'ma biddik', 'ما بدك', 'ma biddak'), { ar: 'Written the same either way; only the ending is said differently.' }),
    ],
  },
  {
    name: 'Need',
    cards: [
      c('I need', ofSpeaker('אני צריכה', 'ani tsrikha', 'אני צריך', 'ani tsarikh'), ['لازم أ...', 'lāzim a...']),
      c('I don\'t need', ofSpeaker('אני לא צריכה', 'ani lo tsrikha', 'אני לא צריך', 'ani lo tsarikh'), ['مش لازم أ...', 'mish lāzim a...']),
      c('you need', ofListener('את צריכה', 'at tsrikha', 'אתה צריך', 'ata tsarikh'), ['لازم تـ...', 'lāzim ti...']),
      c('you don\'t need', ofListener('את לא צריכה', 'at lo tsrikha', 'אתה לא צריך', 'ata lo tsarikh'), ['مش لازم تـ...', 'mish lāzim ti...']),
    ],
  },
  {
    name: 'Like',
    cards: [
      c('I like', ofSpeaker('אני אוהבת', 'ani ohevet', 'אני אוהב', 'ani ohev'), ['بحب', 'baḥibb']),
      c('I don\'t like', ofSpeaker('אני לא אוהבת', 'ani lo ohevet', 'אני לא אוהב', 'ani lo ohev'), ['ما بحب', 'ma baḥibb']),
      c('you like', ofListener('את אוהבת', 'at ohevet', 'אתה אוהב', 'ata ohev'), ofListener('بتحبي', 'btiḥibbi', 'بتحب', 'btiḥibb')),
      c('you don\'t like', ofListener('את לא אוהבת', 'at lo ohevet', 'אתה לא אוהב', 'ata lo ohev'), ofListener('ما بتحبي', 'ma btiḥibbi', 'ما بتحب', 'ma btiḥibb')),
    ],
  },
  {
    name: 'Have',
    cards: [
      c('I have', ['יש לי', 'yesh li'], ['عندي', 'ʿindi']),
      c('I don\'t have', ['אין לי', 'ein li'], ['ما عندي', 'ma ʿindi']),
      c('you have', toL(['יש לך', 'yesh lekha'], ['יש לך', 'yesh lakh']), toL(['عندك', 'ʿindak'], ['عندك', 'ʿindik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('you don\'t have', toL(['אין לך', 'ein lekha'], ['אין לך', 'ein lakh']), toL(['ما عندك', 'ma ʿindak'], ['ما عندك', 'ma ʿindik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
    ],
  },
  {
    name: 'This / that',
    cards: [
      c('this', ['זה', 'ze'], ['هاد', 'hād']),
      c('that', ['ההוא', 'hahu'], ['هداك', 'hadāk']),
      c('here', ['פה', 'po'], ['هون', 'hōn']),
      c('there', ['שם', 'sham'], ['هناك', 'hnāk']),
    ],
  },
  {
    name: 'Basic answers',
    cards: [
      c('yes', ['כן', 'ken'], ['آه', 'āh']),
      c('no', ['לא', 'lo'], ['لأ', 'laʾ']),
      c('maybe', ['אולי', 'ulai'], ['يمكن', 'yimkin']),
    ],
  },
  {
    name: 'Colours',
    cards: [
      c('red', ['אדומה', 'aduma', 'אדום', 'adom'], ['حمرا', 'ḥamra', 'أحمر', 'aḥmar']),
      c('orange', ['כתומה', 'ktuma', 'כתום', 'katom'], ['برتقالية', 'burtuʾāliyye', 'برتقالي', 'burtuʾāli']),
      c('yellow', ['צהובה', 'tsehuba', 'צהוב', 'tsahov'], ['صفرا', 'ṣafra', 'أصفر', 'aṣfar']),
      c('green', ['ירוקה', 'yeruka', 'ירוק', 'yarok'], ['خضرا', 'khaḍra', 'أخضر', 'akhḍar']),
      c('blue', ['כחולה', 'kkhula', 'כחול', 'kakhol'], ['زرقا', 'zarʾa', 'أزرق', 'azraʾ']),
      c('purple', ['סגולה', 'sgula', 'סגול', 'sagol'], ['بنفسجية', 'banafsajiyye', 'بنفسجي', 'banafsaji']),
      c('pink', ['ורודה', 'vruda', 'ורוד', 'varod'], ['زهري', 'zahri']),
    ],
  },
  {
    name: 'Time of day',
    cards: [
      c('day', ['יום', 'yom'], ['نهار', 'nhār']),
      c('night', ['לילה', 'layla'], ['ليل', 'lēl']),
      c('morning', ['בוקר', 'boker'], ['صبح', 'ṣubḥ']),
      c('afternoon', ['אחר הצהריים', 'akhar hatsahorayim'], ['بعد الظهر', 'baʿd iḍ-ḍuhur']),
      c('evening', ['ערב', 'erev'], ['مسا', 'masa']),
    ],
  },
  {
    name: 'Basic contrasts',
    cards: [
      c('big', ['גדולה', 'gdola', 'גדול', 'gadol'], ['كبيرة', 'kbīre', 'كبير', 'kbīr']),
      c('small', ['קטנה', 'ktana', 'קטן', 'katan'], ['صغيرة', 'zghīre', 'صغير', 'zghīr']),
      c('hot', ['חמה', 'khama', 'חם', 'kham'], ['سخنة', 'sukhne', 'سخن', 'sukhn']),
      c('cold', ['קרה', 'kara', 'קר', 'kar'], ['بردانة', 'bardāne', 'بردان', 'bardān']),
      c('good', ['טובה', 'tova', 'טוב', 'tov'], ['منيحة', 'mnīḥa', 'منيح', 'mnīḥ']),
      c('bad', ['רעה', 'ra\'a', 'רע', 'ra'], ['عاطلة', 'ʿāṭle', 'عاطل', 'ʿāṭel']),
      c('wet', ['רטובה', 'rtuva', 'רטוב', 'ratuv'], ['مبلولة', 'mablūle', 'مبلول', 'mablūl']),
      c('dry', ['יבשה', 'yevesha', 'יבש', 'yavesh'], ['ناشفة', 'nāshfe', 'ناشف', 'nāshif']),
      c('clean', ['נקייה', 'nekiya', 'נקי', 'naki'], ['نضيفة', 'nḍīfe', 'نضيف', 'nḍīf']),
      c('dirty', ['מלוכלכת', 'melukhlekhet', 'מלוכלך', 'melukhlakh'], ['وسخة', 'waskha', 'وسخ', 'wisikh']),
    ],
  },
  {
    name: 'Basic quantity',
    cards: [
      c('one', ['אחת', 'akhat'], ['واحد', 'wāḥad']),
      c('two', ['שתיים', 'shtayim'], ['تنين', 'tnēn']),
      c('three', ['שלוש', 'shalosh'], ['تلاتة', 'talāte']),
      c('more', ['עוד', 'od'], ['كمان', 'kamān']),
      c('none', ['אין', 'ein'], ['ولا إشي', 'wala ishi']),
    ],
  },
  {
    name: 'Basic movement',
    cards: [
      c('come', ofListener('בואי', 'bo\'i', 'בוא', 'bo'), ofListener('تعالي', 'taʿāli', 'تعال', 'taʿāl')),
      c('go', ofListener('לכי', 'lekhi', 'לך', 'lekh'), ofListener('روحي', 'rūḥi', 'روح', 'rūḥ')),
      c('stop', ofListener('תעצרי', 'ta\'atsri', 'תעצור', 'ta\'atsor'), ofListener('وقفي', 'waʾʾfi', 'وقّف', 'waʾʾif')),
      c('wait', ofListener('חכי', 'khaki', 'חכה', 'khake'), ofListener('استني', 'istanni', 'استنى', 'istanna')),
    ],
  },
  {
    name: 'Basic physical states / needs',
    cards: [
      c('hungry', ofSpeaker('רעבה', 're\'eva', 'רעב', 'ra\'ev'), ofSpeaker('جوعانة', 'jūʿāne', 'جوعان', 'jūʿān')),
      c('thirsty', ofSpeaker('צמאה', 'tsme\'a', 'צמא', 'tsame'), ofSpeaker('عطشانة', 'ʿaṭshāne', 'عطشان', 'ʿaṭshān')),
      c('tired', ofSpeaker('עייפה', 'ayefa', 'עייף', 'ayef'), ofSpeaker('تعبانة', 'taʿbāne', 'تعبان', 'taʿbān')),
      c('sleepy', ofSpeaker('ישנונית', 'yeshnunit', 'ישנוני', 'yeshnuni'), ofSpeaker('نعسانة', 'naʿsāne', 'نعسان', 'naʿsān')),
    ],
  },
];

function basicsStageDecks(decks: SeedDeck[]): SeedDeck[] {
  const stages: SeedDeck[] = [];
  for (const deck of decks) {
    stages.push({
      name: deck.name + ' — Hebrew',
      cards: deck.cards,
      studyLanguages: ['hebrew'],
    });
    stages.push({
      name: deck.name + ' — Palestinian Arabic',
      cards: deck.cards,
      studyLanguages: ['arabic'],
    });
  }

  const allCards = decks.flatMap((deck) => deck.cards);
  stages.push({
    name: 'Hebrew Basics Master Test',
    cards: allCards,
    studyLanguages: ['hebrew'],
    masteryOnly: true,
  });
  stages.push({
    name: 'Palestinian Arabic Basics Master Test',
    cards: allCards,
    studyLanguages: ['arabic'],
    masteryOnly: true,
  });
  return stages;
}

const BASICS_OF_BASICS_STAGES = basicsStageDecks(BASICS_OF_BASICS_DECKS);

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Basics of Basics',
    icon: '🔰',
    decks: BASICS_OF_BASICS_STAGES,
  },
  {
    name: SEQUENCED_CATEGORY,
    icon: '🔢',
    decks: NUMBER_DECKS,
  },
  {
    name: 'Greetings',
    icon: '👋',
    decks: GREETING_DECKS,
  },
  {
    name: 'Phrases',
    icon: '💬',
    decks: PHRASE_DECKS,
  },
  {
    name: 'Care and hygiene',
    icon: '🧼',
    decks: [
      {
        name: 'Bathroom shelf',
        cards: [
          c('soap', ['סבון', 'sabon'], ['صابون', 'ṣābūn']),
          c('shampoo', ['שמפו', 'shampoo'], ['شامبو', 'shāmbū']),
          c('toothbrush', ['מברשת שיניים', 'mivreshet shinayim'], ['فرشاية سنان', 'firshāyet snān']),
          c('toothpaste', ['משחת שיניים', 'mishkhat shinayim'], ['معجون سنان', 'maʿjūn snān']),
          c('towel', ['מגבת', 'magevet'], ['منشفة', 'manshafe']),
          c('toilet paper', ['נייר טואלט', 'niyar toalet'], ['ورق حمّام', 'waraʾ ḥammām']),
          c('deodorant', ['דאודורנט', 'deodorant'], ['مزيل عرق', 'mazīl ʿaraʾ']),
          c('comb', ['מסרק', 'masrek'], ['مشط', 'mishṭ']),
          c('hairbrush', ['מברשת שיער', 'mivreshet se\'ar'], ['فرشاية شعر', 'firshāyet shaʿar']),
          c('razor', ['סכין גילוח', 'sakin giluakh'], ['شفرة حلاقة', 'shafret ḥalāʾa']),
        ],
      },
      {
        name: 'Cleaning the house',
        cards: [
          // Housework you are doing, not housework being described.
          c('I clean', ofSpeaker('מנקה', 'menaka', 'מנקה', 'menake'), ['بنضّف', 'bnaḍḍef'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I wash', ofSpeaker('שוטפת', 'shotefet', 'שוטף', 'shotef'), ['بغسل', 'baghsil']),
          c('I sweep', ofSpeaker('מטאטאת', 'metate\'et', 'מטאטא', 'metate'), ['بكنس', 'baknos']),
          c('broom', ['מטאטא', 'matate'], ['مكنسة', 'miknase']),
          c('bucket', ['דלי', 'dli'], ['سطل', 'saṭel']),
          c('cloth / rag', ['סמרטוט', 'smartut'], ['خرقة', 'khirʾa']),
          c('cleaning products', ['חומרי ניקוי', 'khomrei nikuy'], ['مواد تنظيف', 'mawād tanẓīf']),
          c('rubbish', ['זבל', 'zevel'], ['زبالة', 'zbāle']),
          c('laundry', ['כביסה', 'kvisa'], ['غسيل', 'ghasīl']),
          c('washing machine', ['מכונת כביסה', 'mekhonat kvisa'], ['غسّالة', 'ghassāle']),
        ],
      },
      {
        name: 'Looking after yourself',
        cards: [
          // These carried the plainest evidence of the old mistake: the Arabic
          // said "cuts *her* hair" under an English prompt that said only
          // "get a haircut". In the first person the possessive is your own.
          c('I get a haircut', ofSpeaker('מסתפרת', 'mistaperet', 'מסתפר', 'mistaper'), ['بقصّ شعري', 'baʾuṣṣ shaʿri'], { ar: 'Literally "I cut my hair", which is how it is said.' }),
          c('I shave', ofSpeaker('מתגלחת', 'mitgalakhat', 'מתגלח', 'mitgaleakh'), ['بحلق', 'baḥloʾ']),
          c('I cut my nails', ofSpeaker('גוזרת ציפורניים', 'gozeret tsiporanayim', 'גוזר ציפורניים', 'gozer tsiporanayim'), ['بقصّ ضوافري', 'baʾuṣṣ ḍawāfri']),
          c('perfume', ['בושם', 'bosem'], ['عطر', 'ʿiṭir']),
          c('cream', ['קרם', 'krem'], ['كريم', 'krēm']),
          c('mirror', ['מראה', 'mar\'a'], ['مراية', 'mrāye'], { ar: 'The spoken Palestinian form of مرآة.' }),
          c('scissors', ['מספריים', 'misparayim'], ['مقصّ', 'maʾaṣṣ']),
          c('tissues', ['טישו', 'tishu'], ['محارم', 'maḥārem']),
          c('sunscreen', ['קרם הגנה', 'krem hagana'], ['واقي شمس', 'wāʾi shams']),
          c('clean (describing something)', ['נקייה', 'nekiya', 'נקי', 'naki'], ['نضيفة', 'nḍīfe', 'نضيف', 'nḍīf'], { ar: 'The gender here is the thing described.' }),
        ],
      },
    ],
  },
  {
    name: 'Medical',
    icon: '🩺',
    decks: [
      {
        name: 'At the clinic',
        cards: [
          c('doctor', ['רופאה', 'rof\'a', 'רופא', 'rofe'], ['دكتورة', 'doktōra', 'دكتور', 'doktōr']),
          c('nurse', ['אחות', 'akhot', 'אח', 'akh'], ['ممرّضة', 'mumarriḍa', 'ممرّض', 'mumarriḍ']),
          c('hospital', ['בית חולים', 'beit kholim'], ['مستشفى', 'mustashfa']),
          c('clinic', ['מרפאה', 'mirpa\'a'], ['عيادة', 'ʿiyāde']),
          c('pharmacy', ['בית מרקחת', 'beit mirkakhat'], ['صيدلية', 'ṣēdaliyye']),
          c('medicine', ['תרופה', 'trufa'], ['دوا', 'dawa'], { ar: 'Spoken Palestinian Arabic.' }),
          c('pain', ['כאב', 'ke\'ev'], ['وجع', 'wajaʿ']),
          c('fever', ['חום', 'khom'], ['حرارة', 'ḥarāra']),
          c('blood', ['דם', 'dam'], ['دمّ', 'damm']),
          c('appointment', ['תור', 'tor'], ['موعد', 'mawʿed'], { ar: 'Medical or general appointment.' }),
        ],
      },
      {
        name: 'Saying what hurts',
        cards: [
          c('I am ill', bySp(['אני חולה', 'ani khola'], ['אני חולה', 'ani khole']), bySp(['أنا مريضة', 'ana marīḍa'], ['أنا مريض', 'ana marīḍ']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Here the ending is your own, not theirs.' }),
          c('my head hurts', ['כואב לי הראש', 'ko\'ev li harosh'], ['راسي بيوجعني', 'rāsi byūjaʿni']),
          c('my stomach hurts', ['כואבת לי הבטן', 'ko\'evet li habeten'], ['بطني بتوجعني', 'baṭni btūjaʿni']),
          c('I have a fever', ['יש לי חום', 'yesh li khom'], ['عندي حرارة', 'ʿindi ḥarāra']),
          c('I have a cough', ['יש לי שיעול', 'yesh li shi\'ul'], ['عندي كحّة', 'ʿindi kaḥḥa']),
          c('I feel dizzy', ['יש לי סחרחורת', 'yesh li skharkhoret'], ['راسي بيلفّ', 'rāsi byliff'], { ar: 'Literally "my head is spinning".' }),
          c('where does it hurt?', ['איפה כואב', 'eifo ko\'ev'], toL(['وين بيوجعك', 'wēn byūjaʿak'], ['وين بيوجعك', 'wēn byūjaʿik']), { ar: 'Written the same either way; only the ending is said differently.' }),
          c('since when?', ['מתי זה התחיל', 'matai ze hitkhil'], ['من إيمتى', 'min ēmta']),
          c('I need a doctor', bySp(['אני צריכה רופא', 'ani tsrikha rofe'], ['אני צריך רופא', 'ani tsarikh rofe']), ['بدي دكتور', 'biddi doktōr'], { ar: 'One word for "I want / I need", whoever is speaking.' }),
          c('it hurts a lot', ['כואב מאוד', 'ko\'ev me\'od'], ['بيوجع كتير', 'byūjaʿ ktīr']),
        ],
      },
      {
        name: 'Illness and treatment',
        cards: [
          c('a cold', ['הצטננות', 'hitstanenut'], ['رشح', 'rashḥ']),
          c('flu', ['שפעת', 'shapa\'at'], ['إنفلونزا', 'influwanza']),
          c('headache', ['כאב ראש', 'ke\'ev rosh'], ['وجع راس', 'wajaʿ rās']),
          c('wound', ['פצע', 'petsa'], ['جرح', 'jurḥ']),
          c('burn', ['כווייה', 'kviya'], ['حرق', 'ḥarʾ']),
          c('pill', ['כדור', 'kadur'], ['حبّة', 'ḥabbe'], { he: 'The same Hebrew word as "ball".' }),
          c('injection', ['זריקה', 'zrika'], ['إبرة', 'ibre'], { ar: 'Literally "needle".' }),
          c('prescription', ['מרשם', 'mirsham'], ['وصفة', 'waṣfe']),
          c('X-ray', ['צילום', 'tsilum'], ['أشعّة', 'ashiʿʿa']),
          c('rest (what the doctor orders)', ['מנוחה', 'menukha'], ['راحة', 'rāḥa']),
        ],
      },
    ],
  },
  {
    name: 'Emergency',
    icon: '🚨',
    decks: [
      {
        name: 'Urgent help',
        cards: [
          c('help', ['עזרה', 'ezra'], ['مساعدة', 'musāʿade']),
          c('police', ['משטרה', 'mishtara'], ['شرطة', 'shurṭa']),
          c('ambulance', ['אמבולנס', 'ambulans'], ['إسعاف', 'isʿāf']),
          c('fire', ['אש', 'esh'], ['نار', 'nār']),
          c('danger', ['סכנה', 'sakana'], ['خطر', 'khaṭar']),
          c('emergency', ['חירום', 'kheirum'], ['طوارئ', 'ṭawāreʾ']),
          c('accident', ['תאונה', 'te\'una'], ['حادث', 'ḥādeth']),
          c('lost', ['אבודה', 'avuda', 'אבוד', 'avud'], ['ضايعة', 'ḍāyʿa', 'ضايع', 'ḍāyeʿ']),
          // Commands are aimed at somebody, so the ending is always theirs.
          c('stop!', toL(['עצור', 'atsor'], ['עצרי', 'itsri']), toL(['وقّف', 'waʾʾef'], ['وقّفي', 'waʾʾfi'])),
          c('call!', toL(['תתקשר', 'titkasher'], ['תתקשרי', 'titkashri']), toL(['اتّصل', 'ittiṣil'], ['اتّصلي', 'ittiṣli'])),
        ],
      },
      {
        name: 'Calling for help',
        cards: [
          c('help me!', toL(['תעזור לי', 'ta\'azor li'], ['תעזרי לי', 'ta\'azri li']), toL(['ساعدني', 'sāʿidni'], ['ساعديني', 'sāʿdīni']), { ar: 'The ending follows the person being asked.' }),
          c('call the police', toL(['תתקשר למשטרה', 'titkasher lamishtara'], ['תתקשרי למשטרה', 'titkasheri lamishtara']), toL(['اتّصل بالشرطة', 'ittiṣil bish-shurṭa'], ['اتّصلي بالشرطة', 'ittiṣli bish-shurṭa'])),
          c('I need help', bySp(['אני צריכה עזרה', 'ani tsrikha ezra'], ['אני צריך עזרה', 'ani tsarikh ezra']), ['بدي مساعدة', 'biddi musāʿade'], { ar: 'One word for "I want / I need", whoever is speaking.' }),
          c('there is a fire', ['יש שריפה', 'yesh srefa'], ['في حريقة', 'fī ḥarīʾa']),
          c('someone is hurt', ['מישהו נפגע', 'mishehu nifga'], ['في حدا انصاب', 'fī ḥada inṣāb']),
          c('where is the hospital?', ['איפה בית החולים', 'eifo beit hakholim'], ['وين المستشفى', 'wēn il-mustashfa']),
          c('I am lost', ['הלכתי לאיבוד', 'halakhti le\'ibud'], bySp(['أنا ضايعة', 'ana ḍāyʿa'], ['أنا ضايع', 'ana ḍāyeʿ']), { he: 'Literally "I went to lostness"; said the same way by anyone.', ar: 'Here the ending is your own, not theirs.' }),
          c('quickly!', ['מהר', 'maher'], ['بسرعة', 'bi-surʿa']),
          c('be careful', toL(['תיזהר', 'tizaher'], ['תיזהרי', 'tizahari']), toL(['دير بالك', 'dīr bālak'], ['ديري بالك', 'dīri bālik'])),
          c('do not worry', toL(['אל תדאג', 'al tid\'ag'], ['אל תדאגי', 'al tid\'agi']), toL(['ما تقلق', 'mā tiʾlaʾ'], ['ما تقلقي', 'mā tiʾlaʾi'])),
        ],
      },
      {
        name: 'Trouble and safety',
        cards: [
          c('thief', ['גנבת', 'ganevet', 'גנב', 'ganav'], ['حرامية', 'ḥarāmiyye', 'حرامي', 'ḥarāmi']),
          c('theft', ['גניבה', 'gneva'], ['سرقة', 'sirʾa']),
          c('safe', ['בטוחה', 'btukha', 'בטוח', 'batuakh'], ['آمنة', 'āmne', 'آمن', 'āmen']),
          // A bare adjective, taught beside "safe" and "lost": the gender is
          // whoever is afraid, which may be a third person, so it is a word
          // pair. Written as a speaker perspective it would have hidden خايف
          // from a learner studying only the female-speaker views.
          c('afraid', ['מפחדת', 'mefakhedet', 'מפחד', 'mefakhed'], ['خايفة', 'khāyfe', 'خايف', 'khāyef'], { ar: 'The gender is the person described, not whoever is speaking.' }),
          c('problem', ['בעיה', 'be\'aya'], ['مشكلة', 'mushkile']),
          c('no problem', ['אין בעיה', 'ein be\'aya'], ['ما في مشكلة', 'mā fī mushkile']),
          c('keys', ['מפתחות', 'maftekhot'], ['مفاتيح', 'mafātīḥ']),
          c('identity card', ['תעודת זהות', 'te\'udat zehut'], ['هويّة', 'hawiyye']),
          c('passport', ['דרכון', 'darkon'], ['جواز سفر', 'jawāz safar']),
          c('wait here', toL(['חכה כאן', 'khake kan'], ['חכי כאן', 'khaki kan']), toL(['استنّى هون', 'istanna hōn'], ['استنّي هون', 'istanni hōn'])),
        ],
      },
    ],
  },
  {
    name: 'Household',
    icon: '🏠',
    decks: [
      {
        name: 'Around the house',
        cards: [
          c('house', ['בית', 'bayit'], ['بيت', 'bēt']),
          c('room', ['חדר', 'kheder'], ['غرفة', 'ghurfe']),
          c('kitchen', ['מטבח', 'mitbakh'], ['مطبخ', 'maṭbakh']),
          c('bathroom', ['חדר אמבטיה', 'khadar ambatya'], ['حمّام', 'ḥammām']),
          c('bedroom', ['חדר שינה', 'khadar shena'], ['غرفة نوم', 'ghurfet nōm']),
          c('door', ['דלת', 'delet'], ['باب', 'bāb']),
          c('window', ['חלון', 'khalon'], ['شباك', 'shubbāk']),
          c('table', ['שולחן', 'shulkhan'], ['طاولة', 'ṭāwle']),
          c('chair', ['כיסא', 'kise'], ['كرسي', 'kursi']),
          c('bed', ['מיטה', 'mita'], ['تخت', 'takht'], { ar: 'Palestinian spoken form.' }),
        ],
      },
      {
        name: 'In the kitchen',
        cards: [
          c('fridge', ['מקרר', 'mekarer'], ['برّاد', 'barrād'], { ar: 'The Levantine word; ثلّاجة belongs elsewhere.' }),
          c('oven', ['תנור', 'tanur'], ['فرن', 'furn']),
          c('stove', ['כיריים', 'kirayim'], ['غاز', 'ghāz'], { ar: 'Everyone calls it "the gas", الغاز.' }),
          c('pot', ['סיר', 'sir'], ['طنجرة', 'ṭanjara']),
          c('frying pan', ['מחבת', 'makhvat'], ['مقلاية', 'maʾlāye']),
          c('sink', ['כיור', 'kiyor'], ['مجلى', 'majla']),
          c('tap', ['ברז', 'berez'], ['حنفيّة', 'ḥanafiyye']),
          c('cupboard', ['ארון', 'aron'], ['خزانة', 'khazāne']),
          c('kettle', ['קומקום', 'kumkum'], ['غلّاية', 'ghallāye']),
          c('tray', ['מגש', 'magash'], ['صينيّة', 'ṣīniyye'], { ar: 'The tray coffee is carried in on.' }),
        ],
      },
      {
        name: 'Furniture and comfort',
        cards: [
          c('sofa', ['ספה', 'sapa'], ['كنباية', 'kanabāye']),
          c('carpet', ['שטיח', 'shatiakh'], ['سجّادة', 'sijjāde']),
          c('curtain', ['וילון', 'vilon'], ['برداية', 'birdāye']),
          c('pillow', ['כרית', 'karit'], ['مخدّة', 'mkhadde']),
          c('blanket', ['שמיכה', 'smikha'], ['بطّانيّة', 'baṭṭāniyye']),
          c('sheet', ['סדין', 'sadin'], ['شرشف', 'sharshaf']),
          c('wardrobe', ['ארון בגדים', 'aron bgadim'], ['خزانة تياب', 'khazānet tyāb']),
          c('shelf', ['מדף', 'madaf'], ['رفّ', 'raff']),
          c('lamp', ['מנורה', 'menora'], ['لمبة', 'lamba']),
          c('balcony', ['מרפסת', 'mirpeset'], ['بلكونة', 'balakōne']),
        ],
      },
    ],
  },
  {
    name: 'Daily routine',
    icon: '⏰',
    decks: [
      {
        // Ten things you say *to* somebody as they get through a day, so every
        // card here is a real imperative and the pair is the person addressed.
        // It used to hold third-person conjugations — بتصحى is "she wakes up"
        // — under bare English prompts, which taught a learner to say "she
        // washes her face" whenever she meant "wash your face".
        name: 'Morning to night',
        cards: [
          c('Wake up', ofListener('תתעוררי', 'titor\'ri', 'תתעורר', 'titorer'), ofListener('اصحي', 'iṣḥi', 'اصحى', 'iṣḥa')),
          c('Get up', ofListener('קומי', 'kumi', 'קום', 'kum'), ofListener('قومي', 'ʾūmi', 'قوم', 'ʾūm')),
          c('Get dressed', ofListener('תתלבשי', 'titlabshi', 'תתלבש', 'titlabesh'), ofListener('البسي تيابك', 'ilbasi tyābik', 'البس تيابك', 'ilbas tyābak'), { ar: 'The ending of تيابك follows the person you are speaking to.' }),
          c('Wash your face', ofListener('תשטפי פנים', 'tishtefi panim', 'תשטוף פנים', 'tishtof panim'), ofListener('اغسلي وجهك', 'ighsili wijhik', 'اغسل وجهك', 'ighsil wijhak')),
          c('Brush your teeth', ofListener('תצחצחי שיניים', 'tetsakhtsekhi shinayim', 'תצחצח שיניים', 'tetsakhtseakh shinayim'), ofListener('فرّشي سنانك', 'farrshi snānik', 'فرّش سنانك', 'farresh snānak')),
          c('Eat breakfast', ofListener('תאכלי ארוחת בוקר', 'tokhli arukhat boker', 'תאכל ארוחת בוקר', 'tokhal arukhat boker'), ofListener('افطري', 'ifṭari', 'افطر', 'ifṭar'), { ar: 'One word: فطور is breakfast, and افطر is to eat it.' }),
          c('Go to work', ofListener('לכי לעבודה', 'lekhi la\'avoda', 'לך לעבודה', 'lekh la\'avoda'), ofListener('روحي عالشغل', 'rūḥi ʿash-shughul', 'روح عالشغل', 'rūḥ ʿash-shughul')),
          c('Come home', ofListener('תחזרי הביתה', 'takhzeri habayta', 'תחזור הביתה', 'takhzor habayta'), ofListener('ارجعي عالبيت', 'irjaʿi ʿal-bēt', 'ارجع عالبيت', 'irjaʿ ʿal-bēt')),
          c('Take a shower', ofListener('תתקלחי', 'titkalkhi', 'תתקלח', 'titkaleakh'), ofListener('تحمّمي', 'tḥammami', 'تحمّم', 'tḥammam')),
          c('Go to sleep', ofListener('לכי לישון', 'lekhi lishon', 'לך לישון', 'lekh lishon'), ofListener('نامي', 'nāmi', 'نام', 'nām')),
        ],
      },
      {
        name: 'Telling the time',
        cards: [
          c('what time is it?', ['מה השעה', 'ma hasha\'a'], ['قدّيش الساعة', 'addēsh is-sāʿa']),
          c('hour', ['שעה', 'sha\'a'], ['ساعة', 'sāʿa'], { ar: 'The same word means a clock or a watch.' }),
          c('minute', ['דקה', 'daka'], ['دقيقة', 'daʾīʾa']),
          c('half past', ['וחצי', 'vakhetsi'], ['ونصّ', 'w nuṣṣ'], { ar: 'Said after the hour: الساعة تلاتة ونصّ, "half past three".' }),
          c('quarter past', ['ורבע', 'vareva'], ['وربع', 'w rubʿ']),
          c('early', ['מוקדם', 'mukdam'], ['بكّير', 'bakkīr']),
          c('late', ['מאוחר', 'me\'ukhar'], ['متأخّر', 'mitʾakhkhir']),
          c('now', ['עכשיו', 'akhshav'], ['هلّق', 'hallaʾ'], { ar: 'The Levantine word; الآن is written Arabic.' }),
          c('today', ['היום', 'hayom'], ['اليوم', 'il-yōm']),
          c('tomorrow', ['מחר', 'makhar'], ['بكرا', 'bukra']),
        ],
      },
      {
        name: 'Days of the week',
        cards: [
          c('Sunday', ['יום ראשון', 'yom rishon'], ['الأحد', 'il-aḥad'], { he: 'Literally "first day" — the Hebrew week starts here.' }),
          c('Monday', ['יום שני', 'yom sheni'], ['الاتنين', 'it-tnēn']),
          c('Tuesday', ['יום שלישי', 'yom shlishi'], ['التلات', 'it-talāt']),
          c('Wednesday', ['יום רביעי', 'yom revi\'i'], ['الأربعا', 'il-arbaʿa']),
          c('Thursday', ['יום חמישי', 'yom khamishi'], ['الخميس', 'il-khamīs']),
          c('Friday', ['יום שישי', 'yom shishi'], ['الجمعة', 'il-jumʿa']),
          c('Saturday', ['שבת', 'shabat'], ['السبت', 'is-sabt'], { he: 'The one weekday with a name rather than a number.' }),
          c('week', ['שבוע', 'shavua'], ['أسبوع', 'usbūʿ']),
          c('yesterday', ['אתמול', 'etmol'], ['إمبارح', 'imbāriḥ']),
          c('weekend', ['סוף שבוע', 'sof shavua'], ['عطلة الأسبوع', 'ʿuṭlet il-usbūʿ']),
        ],
      },
    ],
  },
  {
    name: 'Food and drink',
    icon: '🍎',
    decks: [
      {
        name: 'Kitchen basics',
        cards: [
          c('water', ['מים', 'mayim'], ['ميّة', 'mayye']),
          c('bread', ['לחם', 'lekhem'], ['خبز', 'khubiz']),
          c('milk', ['חלב', 'khalav'], ['حليب', 'ḥalīb']),
          c('coffee', ['קפה', 'kafe'], ['قهوة', 'ʾahwe']),
          c('tea', ['תה', 'te'], ['شاي', 'shāy']),
          c('rice', ['אורז', 'orez'], ['رزّ', 'ruzz']),
          c('meat', ['בשר', 'basar'], ['لحمة', 'laḥme']),
          c('chicken', ['עוף', 'of'], ['جاج', 'jāj']),
          c('fruit', ['פרי', 'pri'], ['فواكه', 'fawākeh']),
          c('vegetables', ['ירקות', 'yerakot'], ['خضار', 'khuḍār']),
        ],
      },
      {
        name: 'Fruit and vegetables',
        cards: [
          c('apple', ['תפוח', 'tapuakh'], ['تفاح', 'tuffāḥ']),
          c('banana', ['בננה', 'banana'], ['موز', 'mōz']),
          c('grapes', ['ענבים', 'anavim'], ['عنب', 'ʿinab']),
          c('orange', ['תפוז', 'tapuz'], ['برتقان', 'burtuʾān'], { ar: 'Palestinian spoken form.' }),
          c('watermelon', ['אבטיח', 'avatiakh'], ['بطّيخ', 'baṭṭīkh']),
          c('olives', ['זיתים', 'zeitim'], ['زيتون', 'zētūn']),
          c('tomato', ['עגבנייה', 'agvaniya'], ['بندورة', 'bandōra'], { ar: 'The Levantine word; طماطم belongs further south and west.' }),
          c('cucumber', ['מלפפון', 'melafefon'], ['خيار', 'khyār']),
          c('onion', ['בצל', 'batsal'], ['بصل', 'baṣal']),
          c('potato', ['תפוח אדמה', 'tapuakh adama'], ['بطاطا', 'baṭāṭa']),
        ],
      },
      {
        name: 'Eating out',
        cards: [
          c('restaurant', ['מסעדה', 'mis\'ada'], ['مطعم', 'maṭʿam']),
          c('menu', ['תפריט', 'tafrit'], ['منيو', 'menyu'], { ar: 'The everyday spoken word; قائمة الطعام is the written one.' }),
          c('waitress / waiter', ['מלצרית', 'meltsarit', 'מלצר', 'meltsar'], ['نادلة', 'nādle', 'نادل', 'nādel']),
          c('I would like...', bySp(['אני רוצה', 'ani rotsa'], ['אני רוצה', 'ani rotse']), ['بدي', 'biddi'], { he: 'Written the same either way; only the ending is said differently.', ar: 'One word whoever is ordering.' }),
          c('plate', ['צלחת', 'tsalakhat'], ['صحن', 'ṣaḥn']),
          c('glass', ['כוס', 'kos'], ['كاسة', 'kāse']),
          c('fork', ['מזלג', 'mazleg'], ['شوكة', 'shōke']),
          c('knife', ['סכין', 'sakin'], ['سكّينة', 'sikkīne']),
          c('spoon', ['כף', 'kaf'], ['معلقة', 'maʿlaʾa'], { ar: 'The spoken Palestinian form of ملعقة.' }),
          c('the bill, please', ['החשבון בבקשה', 'hakheshbon bevakasha'], toL(['الحساب لو سمحت', 'il-ḥsāb law samaḥt'], ['الحساب لو سمحتي', 'il-ḥsāb law samaḥti'])),
        ],
      },
    ],
  },
  {
    name: 'Family',
    icon: '👪',
    decks: [
      {
        name: 'Close family',
        cards: [
          c('mother / father', ['אמא', 'ima', 'אבא', 'aba'], ['أمّ', 'imm', 'أبو', 'abu']),
          c('sister / brother', ['אחות', 'akhot', 'אח', 'akh'], ['أخت', 'ukht', 'أخو', 'akhu']),
          c('daughter / son', ['בת', 'bat', 'בן', 'ben'], ['بنت', 'bint', 'ابن', 'ibin']),
          c('grandmother / grandfather', ['סבתא', 'savta', 'סבא', 'saba'], ['ستّ', 'sitt', 'سيد', 'sīd'], { ar: 'Common Palestinian family terms.' }),
          c('paternal aunt / uncle', ['דודה', 'doda', 'דוד', 'dod'], ['عمّة', 'ʿamme', 'عمّ', 'ʿamm'], { ar: 'Arabic distinguishes the father\'s and mother\'s sides.' }),
          c('maternal aunt / uncle', ['דודה', 'doda', 'דוד', 'dod'], ['خالة', 'khāle', 'خال', 'khāl'], { ar: 'Arabic distinguishes the father\'s and mother\'s sides.' }),
          c('wife / husband', ['אישה', 'isha', 'בעל', 'ba\'al'], ['مَرَة', 'mara', 'جوز', 'jōz'], { ar: 'Everyday spoken forms.' }),
          c('female cousin / male cousin', ['בת דודה', 'bat doda', 'בן דוד', 'ben dod'], ['بنت عمّ', 'bint ʿamm', 'ابن عمّ', 'ibin ʿamm'], { ar: 'Arabic example is a paternal uncle\'s child.' }),
          c('granddaughter / grandson', ['נכדה', 'nekhda', 'נכד', 'nekhed'], ['حفيدة', 'ḥafīde', 'حفيد', 'ḥafīd']),
          c('female partner / male partner', ['בת זוג', 'bat zug', 'בן זוג', 'ben zug'], ['شريكة', 'sharīke', 'شريك', 'sharīk'], { ar: 'Romantic or life partner.' }),
        ],
      },
      {
        name: 'Relatives and neighbours',
        cards: [
          c('niece / nephew', ['אחיינית', 'akhyanit', 'אחיין', 'akhyan'], ['بنت الأخت', 'bint il-ukht', 'ابن الأخت', 'ibin il-ukht'], { ar: 'A sister\'s child; a brother\'s is بنت الأخ or ابن الأخ.' }),
          c('mother-in-law / father-in-law', ['חמות', 'khamot', 'חם', 'kham'], ['حماة', 'ḥamā', 'حما', 'ḥama']),
          c('bride / groom', ['כלה', 'kala', 'חתן', 'khatan'], ['عروس', 'ʿarūs', 'عريس', 'ʿarīs']),
          c('twin', ['תאומה', 'te\'oma', 'תאום', 'te\'om'], ['توأم', 'tawʾam'], { ar: 'One word for a twin of either gender.' }),
          c('relatives', ['קרובי משפחה', 'krovei mishpakha'], ['أقارب', 'aʾāreb']),
          c('family', ['משפחה', 'mishpakha'], ['عيلة', 'ʿēle'], { ar: 'The everyday spoken word; عائلة is the written one.' }),
          c('neighbour', ['שכנה', 'shkhena', 'שכן', 'shakhen'], ['جارة', 'jāra', 'جار', 'jār']),
          c('friend', ['חברה', 'khavera', 'חבר', 'khaver'], ['صاحبة', 'ṣāḥbe', 'صاحب', 'ṣāḥeb'], { ar: 'The everyday word for a friend; صديقة is a shade more formal.' }),
          c('guest', ['אורחת', 'orakhat', 'אורח', 'oreakh'], ['ضيفة', 'ḍēfe', 'ضيف', 'ḍēf']),
          c('girl / boy', ['ילדה', 'yalda', 'ילד', 'yeled'], ['بنت', 'bint', 'ولد', 'walad']),
        ],
      },
      {
        name: 'Talking about family',
        cards: [
          c('I have a sister', ['יש לי אחות', 'yesh li akhot'], ['عندي أخت', 'ʿindi ukht'], { he: 'Literally "there is to me a sister", which is how Hebrew says it.' }),
          c('how many brothers do you have?', toL(['כמה אחים יש לך', 'kama akhim yesh lekha'], ['כמה אחים יש לך', 'kama akhim yesh lakh']), toL(['كم أخ عندك', 'kam akh ʿindak'], ['كم أخ عندك', 'kam akh ʿindik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
          c('are you married?', toL(['אתה נשוי', 'ata nasui'], ['את נשואה', 'at nesu\'a']), toL(['إنت متجوّز', 'inte mitjawwez'], ['إنتِ متجوّزة', 'inti mitjawwze'])),
          c('I am married', bySp(['אני נשואה', 'ani nesu\'a'], ['אני נשוי', 'ani nasui']), bySp(['أنا متجوّزة', 'ana mitjawwze'], ['أنا متجوّز', 'ana mitjawwez']), { ar: 'Here the ending is your own, not theirs.' }),
          c('I am not married', bySp(['אני לא נשואה', 'ani lo nesu\'a'], ['אני לא נשוי', 'ani lo nasui']), bySp(['أنا مش متجوّزة', 'ana mish mitjawwze'], ['أنا مش متجوّز', 'ana mish mitjawwez']), { ar: 'How it is normally said; عزباء belongs to the written language.' }),
          c('do you have children?', toL(['יש לך ילדים', 'yesh lekha yeladim'], ['יש לך ילדים', 'yesh lakh yeladim']), toL(['عندك ولاد', 'ʿindak wlād'], ['عندك ولاد', 'ʿindik wlād']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
          c('my family is big', ['המשפחה שלי גדולה', 'hamishpakha sheli gdola'], ['عيلتي كبيرة', 'ʿēlti kbīre']),
          c('she is my sister', ['היא אחותי', 'hi akhoti'], ['هيّ أختي', 'hiyye ukhti']),
          c('he is my brother', ['הוא אחי', 'hu akhi'], ['هوّ أخوي', 'huwwe akhūy']),
          c('we are one family', ['אנחנו משפחה אחת', 'anakhnu mishpakha akhat'], ['إحنا عيلة وحدة', 'iḥna ʿēle waḥde']),
        ],
      },
    ],
  },
  {
    name: 'Pronouns',
    icon: '🫵',
    decks: PRONOUN_DECKS,
  },
  {
    name: 'Titles',
    icon: '🎩',
    decks: TITLE_DECKS,
  },
  {
    name: 'Body parts',
    icon: '🫀',
    decks: [
      {
        name: 'Head to toe',
        cards: [
          c('head', ['ראש', 'rosh'], ['راس', 'rās']),
          c('hair', ['שיער', 'se\'ar'], ['شعر', 'shaʿar']),
          c('eye', ['עין', 'ayin'], ['عين', 'ʿēn']),
          c('ear', ['אוזן', 'ozen'], ['دان', 'dān'], { ar: 'Palestinian spoken form.' }),
          c('nose', ['אף', 'af'], ['منخار', 'minkhār'], { ar: 'Palestinian spoken form.' }),
          c('mouth', ['פה', 'pe'], ['تمّ', 'timm'], { ar: 'Palestinian spoken form.' }),
          c('hand', ['יד', 'yad'], ['إيد', 'īd']),
          c('arm', ['זרוע', 'zroa'], ['دراع', 'drāʿ']),
          c('leg', ['רגל', 'regel'], ['رِجِل', 'rijil'], { ar: 'In everyday Palestinian Arabic, the same word can mean leg or foot.' }),
          c('foot', ['כף רגל', 'kaf regel'], ['رِجِل', 'rijil'], { ar: 'Everyday Palestinian Arabic commonly uses the same word as \'leg\'.' }),
        ],
      },
      {
        name: 'Face and hands',
        cards: [
          c('face', ['פנים', 'panim'], ['وجه', 'wijh']),
          c('forehead', ['מצח', 'metsakh'], ['جبين', 'jbīn']),
          c('eyebrow', ['גבה', 'gaba'], ['حاجب', 'ḥājeb']),
          c('eyelash', ['ריס', 'ris'], ['رمش', 'rimsh']),
          c('cheek', ['לחי', 'lekhi'], ['خدّ', 'khadd']),
          c('lip', ['שפה', 'safa'], ['شفّة', 'shiffe']),
          c('tooth', ['שן', 'shen'], ['سنّ', 'sinn']),
          c('tongue', ['לשון', 'lashon'], ['لسان', 'lsān']),
          c('finger', ['אצבע', 'etsba'], ['إصبع', 'iṣbaʿ']),
          c('thumb', ['אגודל', 'agudal'], ['إبهام', 'ibhām']),
        ],
      },
      {
        name: 'Inside the body',
        cards: [
          c('heart', ['לב', 'lev'], ['قلب', 'ʾalb']),
          c('brain', ['מוח', 'moakh'], ['دماغ', 'dmāgh']),
          c('lung', ['ריאה', 're\'a'], ['رئة', 'riʾa']),
          c('stomach', ['בטן', 'beten'], ['بطن', 'baṭn']),
          c('bone', ['עצם', 'etsem'], ['عضم', 'ʿaḍm'], { ar: 'The spoken Palestinian pronunciation of عظم.' }),
          c('skin', ['עור', 'or'], ['جلد', 'jild']),
          c('muscle', ['שריר', 'shrir'], ['عضلة', 'ʿaḍale']),
          c('nerve', ['עצב', 'atsav'], ['عصب', 'ʿaṣab']),
          c('liver', ['כבד', 'kaved'], ['كبد', 'kibd']),
          c('kidney', ['כליה', 'kilya'], ['كلية', 'kilye']),
        ],
      },
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    decks: [
      {
        // The deck is called "Things you do", so it says them the way you would
        // — in the first person. Hebrew splits by who is speaking; the Arabic
        // "I" form does not split at all.
        name: 'Things you do',
        cards: [
          c('I read', ofSpeaker('קוראת', 'koret', 'קורא', 'kore'), ['بقرأ', 'baʾra']),
          c('I write', ofSpeaker('כותבת', 'kotevet', 'כותב', 'kotev'), ['بكتب', 'baktob']),
          c('I listen to music', ofSpeaker('מקשיבה למוזיקה', 'makshiva la-muzika', 'מקשיב למוזיקה', 'makshiv la-muzika'), ['بسمع موسيقى', 'basmaʿ mūsīʾa']),
          c('I watch television', ofSpeaker('רואה טלוויזיה', 'ro\'a televizya', 'רואה טלוויזיה', 'ro\'e televizya'), ['بحضر تلفزيون', 'baḥḍar tilfizyōn'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I exercise', ofSpeaker('מתאמנת', 'mit\'amenet', 'מתאמן', 'mit\'amen'), ['بتمرّن', 'batmarran']),
          c('I cook', ofSpeaker('מבשלת', 'mevashelet', 'מבשל', 'mevashel'), ['بطبخ', 'baṭbukh']),
          c('I walk', ofSpeaker('הולכת', 'holekhet', 'הולך', 'holekh'), ['بمشي', 'bamshi']),
          c('I run', ofSpeaker('רצה', 'ratsa', 'רץ', 'rats'), ['بركض', 'barkoḍ']),
          c('I swim', ofSpeaker('שוחה', 'sokha', 'שוחה', 'sokhe'), ['بسبح', 'basbaḥ'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I dance', ofSpeaker('רוקדת', 'rokedet', 'רוקד', 'roked'), ['برقص', 'barʾoṣ']),
        ],
      },
      {
        // Your own outings, so first person like the deck before it. "Wait"
        // is a command often enough to deserve a card of its own one day, but
        // among travelling, paying and resting it is something you do.
        name: 'Out and about',
        cards: [
          c('I travel', ofSpeaker('נוסעת', 'nosa\'at', 'נוסע', 'nose\'a'), ['بسافر', 'bsāfer']),
          c('I visit', ofSpeaker('מבקרת', 'mevakeret', 'מבקר', 'mevaker'), ['بزور', 'bazūr']),
          c('I buy', ofSpeaker('קונה', 'kona', 'קונה', 'kone'), ['بشتري', 'bashtri'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I meet friends', ofSpeaker('נפגשת עם חברים', 'nifgeshet im khaverim', 'נפגש עם חברים', 'nifgash im khaverim'), ['بتلاقى مع أصحاب', 'batlāʾa maʿ aṣḥāb']),
          c('I go out', ofSpeaker('יוצאת', 'yotset', 'יוצא', 'yotse'), ['بطلع', 'baṭlaʿ'], { ar: 'Literally "I go up"; the everyday word for going out.' }),
          c('I drive', ofSpeaker('נוהגת', 'noheget', 'נוהג', 'noheg'), ['بسوق', 'basūʾ']),
          c('I wait', ofSpeaker('מחכה', 'mekhaka', 'מחכה', 'mekhake'), ['بستنّى', 'bastanna'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I pay', ofSpeaker('משלמת', 'meshalemet', 'משלם', 'meshalem'), ['بدفع', 'badfaʿ']),
          c('I rest', ofSpeaker('נחה', 'nakha', 'נח', 'nakh'), ['برتاح', 'bartāḥ']),
          c('I take a photo', ofSpeaker('מצלמת', 'metsalemet', 'מצלם', 'metsalem'), ['بصوّر', 'bṣawwer']),
        ],
      },
      {
        name: 'Sport and play',
        cards: [
          c('football', ['כדורגל', 'kaduregel'], ['كرة قدم', 'kurat ʾadam']),
          c('basketball', ['כדורסל', 'kadursal'], ['كرة سلّة', 'kurat salle']),
          c('game', ['משחק', 'miskhak'], ['لعبة', 'liʿbe']),
          // The three verbs among the equipment, said about yourself.
          c('I play', ofSpeaker('משחקת', 'mesakheket', 'משחק', 'mesakhek'), ['بلعب', 'balʿab']),
          c('I win', ofSpeaker('מנצחת', 'menatsakhat', 'מנצח', 'menatseakh'), ['بربح', 'barbaḥ']),
          c('I lose', ofSpeaker('מפסידה', 'mafsida', 'מפסיד', 'mafsid'), ['بخسر', 'bakhsar']),
          c('team', ['קבוצה', 'kvutsa'], ['فريق', 'farīʾ']),
          c('ball', ['כדור', 'kadur'], ['طابة', 'ṭābe'], { ar: 'The everyday Palestinian word; كرة is the written one.' }),
          c('swimming pool', ['בריכה', 'brekha'], ['مسبح', 'masbaḥ']),
          c('gym', ['חדר כושר', 'khadar kosher'], ['نادي رياضي', 'nādi riyāḍi']),
        ],
      },
    ],
  },
  {
    name: 'Electronics',
    icon: '🔌',
    decks: [
      {
        name: 'Devices',
        cards: [
          c('phone', ['טלפון', 'telefon'], ['تلفون', 'tilifōn']),
          c('computer', ['מחשב', 'makhshev'], ['كمبيوتر', 'kompyūter']),
          c('laptop', ['מחשב נייד', 'makhshev nayad'], ['لابتوب', 'lābtōb']),
          c('tablet', ['טאבלט', 'tablet'], ['تابلت', 'tāblet']),
          c('television', ['טלוויזיה', 'televizya'], ['تلفزيون', 'tilifizyōn']),
          c('charger', ['מטען', 'mat\'en'], ['شاحن', 'shāḥen']),
          c('headphones', ['אוזניות', 'ozniyot'], ['سماعات', 'sammāʿāt']),
          c('camera', ['מצלמה', 'matslema'], ['كاميرا', 'kāmēra']),
          c('keyboard', ['מקלדת', 'mikledet'], ['كيبورد', 'kībōrd'], { ar: 'Common spoken loanword.' }),
          c('screen', ['מסך', 'masakh'], ['شاشة', 'shāshe']),
        ],
      },
      {
        name: 'Using a phone',
        cards: [
          c('I call', ofSpeaker('מתקשרת', 'mitkasheret', 'מתקשר', 'mitkasher'), ['بتّصل', 'battiṣel']),
          c('I answer', ofSpeaker('עונה', 'ona', 'עונה', 'one'), ['بردّ', 'barudd'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('message', ['הודעה', 'hoda\'a'], ['رسالة', 'risāle']),
          c('I send', ofSpeaker('שולחת', 'sholakhat', 'שולח', 'sholeakh'), ['ببعت', 'babʿat']),
          c('photo', ['תמונה', 'tmuna'], ['صورة', 'ṣūra']),
          c('video', ['וידאו', 'video'], ['فيديو', 'vīdyo']),
          c('phone number', ['מספר טלפון', 'mispar telefon'], ['رقم تلفون', 'raʾam tilifōn']),
          c('voice note', ['הודעה קולית', 'hoda\'a kolit'], ['رسالة صوتيّة', 'risāle ṣawtiyye']),
          c('missed call', ['שיחה שלא נענתה', 'sikha shelo ne\'enta'], ['مكالمة فايتة', 'mukālame fāyte']),
          c('I hang up', ofSpeaker('מנתקת', 'menateket', 'מנתק', 'menatek'), ['بسكّر', 'bsakker'], { ar: 'Literally "I close", which is how ending a call is said.' }),
        ],
      },
      {
        name: 'Power and connection',
        cards: [
          c('battery', ['סוללה', 'solela'], ['بطّاريّة', 'baṭṭāriyye']),
          c('cable', ['כבל', 'kevel'], ['كبل', 'kabl']),
          c('socket', ['שקע', 'sheka'], ['فيشة', 'fīshe']),
          c('electricity', ['חשמל', 'khashmal'], ['كهربا', 'kahraba'], { ar: 'The spoken Palestinian form of كهرباء.' }),
          c('I switch on', ofSpeaker('מדליקה', 'madlika', 'מדליק', 'madlik'), ['بشغّل', 'bshaghghel']),
          c('I switch off', ofSpeaker('מכבה', 'mekhaba', 'מכבה', 'mekhabe'), ['بطفي', 'baṭfi'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('wifi', ['וויפי', 'waifai'], ['واي فاي', 'wāy fāy']),
          c('signal', ['קליטה', 'klita'], ['إرسال', 'irsāl']),
          c('it is not working', ['זה לא עובד', 'ze lo oved'], ['مش شغّال', 'mish shaghghāl']),
          c('I charge it', ofSpeaker('מטעינה', 'mat\'ina', 'מטעין', 'mat\'in'), ['بشحن', 'bashḥan']),
        ],
      },
    ],
  },
  {
    name: 'Adjectives',
    icon: '🎨',
    decks: [
      {
        name: 'Everyday descriptions',
        cards: [
          c('good', ['טובה', 'tova', 'טוב', 'tov'], ['منيحة', 'mnīḥa', 'منيح', 'mnīḥ']),
          c('bad', ['רעה', 'ra\'a', 'רע', 'ra'], ['مش منيحة', 'mish mnīḥa', 'مش منيح', 'mish mnīḥ'], { ar: 'Natural spoken Palestinian phrasing: \'not good\'.' }),
          c('big', ['גדולה', 'gdola', 'גדול', 'gadol'], ['كبيرة', 'kbīre', 'كبير', 'kbīr']),
          c('small', ['קטנה', 'ktana', 'קטן', 'katan'], ['صغيرة', 'zghīre', 'صغير', 'zghīr']),
          c('beautiful', ['יפה', 'yafa', 'יפה', 'yafe'], ['حلوة', 'ḥilwe', 'حلو', 'ḥilu'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          // The states below are ones a person is only ever in themselves.
          // Unlike the words above — a big house, a beautiful morning — these
          // are said about the speaker, so her own answer to "I am…" picks the
          // form and the other stops competing for her attention.
          c('tired', ofSpeaker('עייפה', 'ayefa', 'עייף', 'ayef'), ofSpeaker('تعبانة', 'taʿbāne', 'تعبان', 'taʿbān')),
          c('hungry', ofSpeaker('רעבה', 're\'eva', 'רעב', 'ra\'ev'), ofSpeaker('جوعانة', 'jūʿāne', 'جوعان', 'jūʿān')),
          c('thirsty', ofSpeaker('צמאה', 'tsme\'a', 'צמא', 'tsame'), ofSpeaker('عطشانة', 'ʿaṭshāne', 'عطشان', 'ʿaṭshān')),
          c('happy', ofSpeaker('שמחה', 'smekha', 'שמח', 'sameakh'), ofSpeaker('مبسوطة', 'mabsūṭa', 'مبسوط', 'mabsūṭ')),
          c('sad', ofSpeaker('עצובה', 'atsuva', 'עצוב', 'atsuv'), ofSpeaker('زعلانة', 'zaʿlāne', 'زعلان', 'zaʿlān'), { ar: 'Common spoken form; can also mean upset.' }),
        ],
      },
      {
        // The colours were taught here until they grew into a category of their
        // own; an install that still holds them has the deck moved across
        // rather than duplicated. See `RESHAPED_CATEGORIES`.
        name: 'More descriptions',
        cards: [
          c('clean', ['נקייה', 'nekiya', 'נקי', 'naki'], ['نضيفة', 'nḍīfe', 'نضيف', 'nḍīf']),
          c('dirty', ['מלוכלכת', 'melukhlekhet', 'מלוכלך', 'melukhlakh'], ['وسخة', 'wiskhe', 'وسخ', 'wisikh']),
          c('expensive', ['יקרה', 'yekara', 'יקר', 'yakar'], ['غالية', 'ghālye', 'غالي', 'ghāli']),
          c('cheap', ['זולה', 'zola', 'זול', 'zol'], ['رخيصة', 'rkhīṣa', 'رخيص', 'rkhīṣ']),
          c('fast', ['מהירה', 'mehira', 'מהיר', 'mahir'], ['سريعة', 'sarīʿa', 'سريع', 'sarīʿ']),
          c('slow', ['איטית', 'itit', 'איטי', 'iti'], ['بطيئة', 'baṭīʾa', 'بطيء', 'baṭīʾ']),
          c('strong', ['חזקה', 'khazaka', 'חזק', 'khazak'], ['قويّة', 'ʾawiyye', 'قوي', 'ʾawi']),
          c('weak', ['חלשה', 'khalasha', 'חלש', 'khalash'], ['ضعيفة', 'ḍaʿīfe', 'ضعيف', 'ḍaʿīf']),
          c('heavy', ['כבדה', 'kveda', 'כבד', 'kaved'], ['تقيلة', 'tʾīle', 'تقيل', 'tʾīl'], { ar: 'Written ثقيل; the ث is said as a t in Palestinian speech.' }),
          c('quiet', ['שקטה', 'shketa', 'שקט', 'shaket'], ['هادية', 'hādye', 'هادي', 'hādi']),
        ],
      },
      {
        name: 'Opposites',
        cards: [
          c('hot', ['חמה', 'khama', 'חם', 'kham'], ['سخنة', 'sukhne', 'سخن', 'sukhn']),
          c('cold', ['קרה', 'kara', 'קר', 'kar'], ['باردة', 'bārde', 'بارد', 'bāred']),
          c('new', ['חדשה', 'khadasha', 'חדש', 'khadash'], ['جديدة', 'jdīde', 'جديد', 'jdīd']),
          c('old (a thing)', ['ישנה', 'yeshana', 'ישן', 'yashan'], ['قديمة', 'ʾadīme', 'قديم', 'ʾadīm'], { he: 'Of a person, Hebrew uses זקנה / זקן instead.' }),
          c('long', ['ארוכה', 'arukha', 'ארוך', 'arokh'], ['طويلة', 'ṭawīle', 'طويل', 'ṭawīl']),
          c('short', ['קצרה', 'ktsara', 'קצר', 'katsar'], ['قصيرة', 'ʾaṣīre', 'قصير', 'ʾaṣīr']),
          c('easy', ['קלה', 'kala', 'קל', 'kal'], ['سهلة', 'sahle', 'سهل', 'sahl']),
          c('difficult', ['קשה', 'kasha', 'קשה', 'kashe'], ['صعبة', 'ṣaʿbe', 'صعب', 'ṣaʿb'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('full', ['מלאה', 'mele\'a', 'מלא', 'male'], ['مليانة', 'malyāne', 'مليان', 'malyān']),
          c('empty', ['ריקה', 'reka', 'ריק', 'rek'], ['فاضية', 'fāḍye', 'فاضي', 'fāḍi']),
        ],
      },
    ],
  },
  {
    name: 'Colours',
    icon: '🌈',
    decks: COLOUR_DECKS,
  },
  {
    name: 'Verbs',
    icon: '🏃',
    decks: [
      {
        // The ten verbs a learner reaches for about herself, so each is taught
        // in the first person. Hebrew still splits — a woman says רוצה, a man
        // רוצה said differently — while Palestinian Arabic's "I" form is one
        // word for everybody, so the Arabic side carries no pair to choose
        // from and none is invented for it.
        name: 'Core verbs',
        cards: [
          c('I want', ofSpeaker('רוצה', 'rotsa', 'רוצה', 'rotse'), ['بدي', 'biddi'], { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'One word, whoever is speaking.' }),
          c('I need', ofSpeaker('צריכה', 'tsrikha', 'צריך', 'tsarikh'), ['بحتاج', 'baḥtāj'], { ar: 'بدي does the work of "I need" just as often in speech.' }),
          c('I know', ofSpeaker('יודעת', 'yoda\'at', 'יודע', 'yode\'a'), ['بعرف', 'baʿref']),
          c('I understand', ofSpeaker('מבינה', 'mevina', 'מבין', 'mevin'), ['بفهم', 'bafham']),
          c('I speak', ofSpeaker('מדברת', 'medaberet', 'מדבר', 'medaber'), ['بحكي', 'baḥki']),
          c('I learn', ofSpeaker('לומדת', 'lomedet', 'לומד', 'lomed'), ['بتعلّم', 'batʿallam']),
          c('I go', ofSpeaker('הולכת', 'holekhet', 'הולך', 'holekh'), ['بروح', 'barūḥ']),
          c('I come', ofSpeaker('באה', 'ba\'a', 'בא', 'ba'), ['بجي', 'bāji']),
          c('I give', ofSpeaker('נותנת', 'notenet', 'נותן', 'noten'), ['بعطي', 'baʿṭi']),
          c('I take', ofSpeaker('לוקחת', 'lokakhat', 'לוקח', 'lokeakh'), ['باخد', 'bākhod']),
        ],
      },
      {
        // First person throughout, on the same footing as "Core verbs".
        name: 'More everyday verbs',
        cards: [
          c('I see', ofSpeaker('רואה', 'ro\'a', 'רואה', 'ro\'e'), ['بشوف', 'bashūf'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('I hear', ofSpeaker('שומעת', 'shoma\'at', 'שומע', 'shomea'), ['بسمع', 'basmaʿ']),
          c('I say', ofSpeaker('אומרת', 'omeret', 'אומר', 'omer'), ['بقول', 'baʾūl']),
          c('I ask', ofSpeaker('שואלת', 'sho\'elet', 'שואל', 'sho\'el'), ['بسأل', 'basʾal']),
          c('I work', ofSpeaker('עובדת', 'ovedet', 'עובד', 'oved'), ['بشتغل', 'bashtighel']),
          c('I help', ofSpeaker('עוזרת', 'ozeret', 'עוזר', 'ozer'), ['بساعد', 'bsāʿed']),
          c('I open', ofSpeaker('פותחת', 'potakhat', 'פותח', 'poteakh'), ['بفتح', 'baftaḥ']),
          c('I close', ofSpeaker('סוגרת', 'sogeret', 'סוגר', 'soger'), ['بسكّر', 'bsakker'], { ar: 'The same verb ends a phone call.' }),
          c('I sit', ofSpeaker('יושבת', 'yoshevet', 'יושב', 'yoshev'), ['بقعد', 'baʾʿod']),
          c('I love', ofSpeaker('אוהבת', 'ohevet', 'אוהב', 'ohev'), ['بحبّ', 'baḥibb']),
        ],
      },
      {
        name: 'In the past',
        cards: [
          c('I went', ['הלכתי', 'halakhti'], ['رحت', 'ruḥt'], { he: 'Past tense in the first person is the same for a woman and a man in both languages, so nothing in this deck splits.' }),
          c('I ate', ['אכלתי', 'akhalti'], ['أكلت', 'akalt']),
          c('I drank', ['שתיתי', 'shatiti'], ['شربت', 'sharibt']),
          c('I said', ['אמרתי', 'amarti'], ['قلت', 'ʾult']),
          c('I saw', ['ראיתי', 'ra\'iti'], ['شفت', 'shuft']),
          c('I heard', ['שמעתי', 'shamati'], ['سمعت', 'simiʿt']),
          c('I slept', ['ישנתי', 'yashanti'], ['نمت', 'nimt']),
          c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt']),
          c('I came', ['באתי', 'bati'], ['إجيت', 'ijīt']),
          c('I understood', ['הבנתי', 'hevanti'], ['فهمت', 'fhimt']),
        ],
      },
    ],
  },
  {
    name: 'Transport',
    icon: '🚌',
    decks: [
      {
        name: 'Getting around',
        cards: [
          c('bus', ['אוטובוס', 'otobus'], ['باص', 'bāṣ']),
          c('train', ['רכבת', 'rakevet'], ['قطار', 'ʾiṭār']),
          c('car', ['אוטו', 'oto'], ['سيارة', 'sayyāra'], { ar: 'Everyday spoken form.' }),
          c('taxi', ['מונית', 'monit'], ['تكسي', 'taksi']),
          c('bicycle', ['אופניים', 'ofanayim'], ['بسكليت', 'baskalēt'], { ar: 'Common Palestinian spoken word.' }),
          c('motorcycle', ['אופנוע', 'ofnoa'], ['دراجة نارية', 'darrāje nāriyye']),
          c('station', ['תחנה', 'takhana'], ['محطّة', 'maḥaṭṭa']),
          c('bus stop', ['תחנת אוטובוס', 'takhanat otobus'], ['محطّة باص', 'maḥaṭṭet bāṣ']),
          c('ticket', ['כרטיס', 'kartis'], ['تذكرة', 'tazkara']),
          c('road', ['כביש', 'kvish'], ['طريق', 'ṭarīʾ']),
        ],
      },
      {
        name: 'On the road',
        cards: [
          c('driver', ['נהגת', 'nahaget', 'נהג', 'nahag'], ['سائقة', 'sāʾiʾa', 'سائق', 'sāʾeʾ']),
          c('traffic jam', ['פקק תנועה', 'pkak tnua'], ['زحمة', 'zaḥme'], { ar: 'Literally "crowding"; used of traffic and of crowds alike.' }),
          c('traffic light', ['רמזור', 'ramzor'], ['إشارة', 'ishāra']),
          c('petrol', ['דלק', 'delek'], ['بنزين', 'banzīn']),
          c('petrol station', ['תחנת דלק', 'takhanat delek'], ['محطّة بنزين', 'maḥaṭṭet banzīn']),
          c('parking', ['חנייה', 'khanaya'], ['موقف', 'mawʾaf']),
          c('bridge', ['גשר', 'gesher'], ['جسر', 'jisr']),
          c('junction', ['צומת', 'tsomet'], ['مفرق', 'mafraʾ']),
          c('seat belt', ['חגורת בטיחות', 'khagorat betikhut'], ['حزام الأمان', 'ḥzām il-amān']),
          c('wheel', ['גלגל', 'galgal'], ['دولاب', 'dūlāb'], { ar: 'The everyday Palestinian word for a car wheel or tyre.' }),
        ],
      },
      {
        name: 'Travel and journeys',
        cards: [
          c('airport', ['שדה תעופה', 'sde te\'ufa'], ['مطار', 'maṭār']),
          c('aeroplane', ['מטוס', 'matos'], ['طيّارة', 'ṭayyāra']),
          c('luggage', ['מזוודות', 'mizvadot'], ['شنط', 'shunaṭ']),
          c('journey', ['נסיעה', 'nesi\'a'], ['سفرة', 'safra']),
          c('hotel', ['מלון', 'malon'], ['فندق', 'funduʾ']),
          c('border', ['גבול', 'gvul'], ['حدود', 'ḥudūd']),
          c('visa', ['ויזה', 'viza'], ['فيزا', 'vīza']),
          c('map', ['מפה', 'mapa'], ['خريطة', 'kharīṭa']),
          c('arrival', ['הגעה', 'haga\'a'], ['وصول', 'wuṣūl']),
          c('departure', ['יציאה', 'yetsi\'a'], ['مغادرة', 'mughādara']),
        ],
      },
    ],
  },
  {
    name: 'Directions',
    icon: '🧭',
    decks: [
      {
        name: 'Finding the way',
        cards: [
          c('right', ['ימינה', 'yamina'], ['يمين', 'yamīn']),
          c('left', ['שמאלה', 'smola'], ['شمال', 'shimāl']),
          c('straight', ['ישר', 'yashar'], ['دغري', 'dughri'], { ar: 'Common Levantine direction word.' }),
          c('here', ['פה', 'po'], ['هون', 'hōn']),
          c('there', ['שם', 'sham'], ['هنيك', 'hnīk'], { ar: 'Spoken Palestinian form.' }),
          c('near', ['קרובה', 'krova', 'קרוב', 'karov'], ['قريبة', 'ʾarībe', 'قريب', 'ʾarīb']),
          c('far', ['רחוקה', 'rekhoka', 'רחוק', 'rakhok'], ['بعيدة', 'baʿīde', 'بعيد', 'baʿīd']),
          c('up', ['למעלה', 'lema\'la'], ['فوق', 'fōʾ']),
          c('down', ['למטה', 'lemata'], ['تحت', 'taḥt']),
          c('behind', ['מאחור', 'me\'akhore'], ['ورا', 'wara']),
        ],
      },
      {
        // The bearings "Finding the way" leaves out. Left, right, up and down
        // are taught there and are deliberately not repeated here.
        name: 'Which way',
        cards: [
          c('forward', ['קדימה', 'kadima'], ['قدّام', 'ʾuddām']),
          c('backwards', ['אחורה', 'akhora'], ['ورا', 'wara']),
          c('sideways', ['הצידה', 'hatsida'], ['عجنب', 'ʿa-janab']),
          c('north', ['צפון', 'tsafon'], ['شمال', 'shamāl'], {
            ar: 'The same word as "left". Only the sentence tells them apart.',
          }),
          c('south', ['דרום', 'darom'], ['جنوب', 'janūb']),
          c('east', ['מזרח', 'mizrakh'], ['شرق', 'sharʾ']),
          c('west', ['מערב', 'ma\'arav'], ['غرب', 'gharb']),
          c('in the middle', ['באמצע', 'ba\'emtsa'], ['بالنص', 'bin-nuṣṣ']),
          c('at the edge', ['בקצה', 'baktse'], ['عالطرف', 'ʿaṭ-ṭaraf']),
          c('the other way', ['לכיוון השני', 'lakivun hasheni'], ['عالجهة التانية', 'ʿal-jiha it-tānye']),
        ],
      },
      {
        name: 'Asking the way',
        cards: [
          c('how do I get there?', ['איך מגיעים לשם', 'ekh magi\'im lesham'], ['كيف بوصل لهنيك', 'kīf bōṣal la-hnīk']),
          c('is it far from here?', ['זה רחוק מכאן', 'ze rakhok mikan'], ['بعيد عن هون', 'baʿīd ʿan hōn']),
          c('turn right', toL(['פנה ימינה', 'pne yamina'], ['פני ימינה', 'pni yamina']), toL(['لفّ عاليمين', 'liff ʿal-yamīn'], ['لفّي عاليمين', 'liffi ʿal-yamīn'])),
          c('turn left', toL(['פנה שמאלה', 'pne smola'], ['פני שמאלה', 'pni smola']), toL(['لفّ عالشمال', 'liff ʿash-shimāl'], ['لفّي عالشمال', 'liffi ʿash-shimāl'])),
          c('go straight', toL(['סע ישר', 'sa yashar'], ['סעי ישר', 'si\'i yashar']), ['امشي دغري', 'imshi dughri'], { ar: 'The Arabic ends the same way whoever is being told.' }),
          c('next to', ['ליד', 'leyad'], ['جنب', 'janb']),
          c('opposite', ['מול', 'mul'], ['مقابل', 'muʾābel']),
          c('between', ['בין', 'bein'], ['بين', 'bēn']),
          c('at the corner', ['בפינה', 'bapina'], ['عالزاوية', 'ʿaz-zāwye']),
          c('after the traffic light', ['אחרי הרמזור', 'akharei haramzor'], ['بعد الإشارة', 'baʿd il-ishāra']),
        ],
      },
      {
        name: 'Places in town',
        cards: [
          c('street', ['רחוב', 'rekhov'], ['شارع', 'shāreʿ']),
          c('square', ['כיכר', 'kikar'], ['ميدان', 'mīdān']),
          c('mosque', ['מסגד', 'misgad'], ['جامع', 'jāmeʿ']),
          c('church', ['כנסייה', 'knesiya'], ['كنيسة', 'kanīse']),
          c('synagogue', ['בית כנסת', 'beit knesset'], ['كنيس', 'kanīs']),
          c('school', ['בית ספר', 'beit sefer'], ['مدرسة', 'madrase']),
          c('university', ['אוניברסיטה', 'universita'], ['جامعة', 'jāmʿa']),
          c('bank', ['בנק', 'bank'], ['بنك', 'bank']),
          c('post office', ['דואר', 'do\'ar'], ['بريد', 'barīd']),
          c('park', ['פארק', 'park'], ['حديقة', 'ḥadīʾa']),
        ],
      },

      // --- telling somebody where to put themselves ---------------------------
      //
      // Ten decks of commands, and every pair in them is the *listener's*
      // gender: these are things said to the person in front of you, so the
      // From / To settings narrow each card to the one form she needs rather
      // than showing both and leaving her to guess.
      //
      // Where Palestinian or Hebrew says a command one way to anybody it is
      // written as a single word, never split into two to match the other
      // language. Where the English collapses — "stand up" and "get up",
      // "hold still" and "don't move" — one card carries it, because the
      // languages make no distinction there either.
      {
        name: 'Sit, stand and lie',
        cards: [
          c('sit down', ofListener('תשבי', 'teshvi', 'תשב', 'teshev'), ofListener('اقعدي', 'uʾʿudi', 'اقعد', 'uʾʿud')),
          c('sit up straight', ofListener('תשבי זקופה', 'teshvi zkufa', 'תשב זקוף', 'teshev zakuf'), ofListener('اقعدي عدل', 'uʾʿudi ʿadl', 'اقعد عدل', 'uʾʿud ʿadl'), {
            he: 'Bare "sit" covers sitting down and sitting up; this says upright.',
          }),
          c('stand up', ofListener('תקומי', 'takumi', 'תקום', 'takum'), ofListener('قومي', 'ʾūmi', 'قوم', 'ʾūm'), {
            he: 'Also "get up" — one command in both languages.',
          }),
          c('lie down', ofListener('תשכבי', 'tishkevi', 'תשכב', 'tishkav'), ofListener('تمددي', 'tmaddadi', 'تمدد', 'tmaddad'), {
            ar: 'Not نامي, which tells her to go to sleep.',
          }),
          c('turn around', ofListener('תסתובבי', 'tistovevi', 'תסתובב', 'tistovev'), ofListener('لفّي', 'liffi', 'لفّ', 'liff')),
          c('move up', ofListener('תעלי למעלה', 'ta\'ali lema\'la', 'תעלה למעלה', 'ta\'ale lema\'la'), ofListener('تحرّكي لفوق', 'tḥarraki la-fōʾ', 'تحرّك لفوق', 'tḥarrak la-fōʾ')),
          c('move down', ofListener('תרדי למטה', 'terdi lemata', 'תרד למטה', 'tered lemata'), ofListener('تحرّكي لتحت', 'tḥarraki la-taḥt', 'تحرّك لتحت', 'tḥarrak la-taḥt')),
          c('move left', ofListener('תזוזי שמאלה', 'tazuzi smola', 'תזוז שמאלה', 'tazuz smola'), ofListener('تحرّكي عالشمال', 'tḥarraki ʿash-shimāl', 'تحرّك عالشمال', 'tḥarrak ʿash-shimāl')),
          c('move right', ofListener('תזוזי ימינה', 'tazuzi yamina', 'תזוז ימינה', 'tazuz yamina'), ofListener('تحرّكي عاليمين', 'tḥarraki ʿal-yamīn', 'تحرّك عاليمين', 'tḥarrak ʿal-yamīn')),
          c('move forward', ofListener('תתקדמי', 'titkadmi', 'תתקדם', 'titkadem'), ofListener('تحرّكي لقدّام', 'tḥarraki la-ʾuddām', 'تحرّك لقدّام', 'tḥarrak la-ʾuddām')),
        ],
      },
      {
        name: 'Going and stepping',
        cards: [
          c('move back', ofListener('תזוזי אחורה', 'tazuzi akhora', 'תזוז אחורה', 'tazuz akhora'), ofListener('تحرّكي لورا', 'tḥarraki la-wara', 'تحرّك لورا', 'tḥarrak la-wara')),
          c('go forward', ofListener('תלכי קדימה', 'telkhi kadima', 'תלך קדימה', 'telekh kadima'), ofListener('روحي لقدّام', 'rūḥi la-ʾuddām', 'روح لقدّام', 'rūḥ la-ʾuddām')),
          c('go back', ofListener('תלכי אחורה', 'telkhi akhora', 'תלך אחורה', 'telekh akhora'), ofListener('روحي لورا', 'rūḥi la-wara', 'روح لورا', 'rūḥ la-wara')),
          c('go left', ofListener('תלכי שמאלה', 'telkhi smola', 'תלך שמאלה', 'telekh smola'), ofListener('روحي عالشمال', 'rūḥi ʿash-shimāl', 'روح عالشمال', 'rūḥ ʿash-shimāl')),
          c('go right', ofListener('תלכי ימינה', 'telkhi yamina', 'תלך ימינה', 'telekh yamina'), ofListener('روحي عاليمين', 'rūḥi ʿal-yamīn', 'روح عاليمين', 'rūḥ ʿal-yamīn')),
          c('come forward', ofListener('תבואי קדימה', 'tavo\'i kadima', 'תבוא קדימה', 'tavo kadima'), ofListener('تعالي لقدّام', 'taʿāli la-ʾuddām', 'تعال لقدّام', 'taʿāl la-ʾuddām')),
          c('step forward', ofListener('תעשי צעד קדימה', 'ta\'asi tsa\'ad kadima', 'תעשה צעד קדימה', 'ta\'ase tsa\'ad kadima'), ofListener('خدي خطوة لقدّام', 'khudi khuṭwe la-ʾuddām', 'خد خطوة لقدّام', 'khud khuṭwe la-ʾuddām')),
          c('step back', ofListener('תעשי צעד אחורה', 'ta\'asi tsa\'ad akhora', 'תעשה צעד אחורה', 'ta\'ase tsa\'ad akhora'), ofListener('خدي خطوة لورا', 'khudi khuṭwe la-wara', 'خد خطوة لورا', 'khud khuṭwe la-wara')),
          c('take a step', ofListener('תעשי צעד', 'ta\'asi tsa\'ad', 'תעשה צעד', 'ta\'ase tsa\'ad'), ofListener('خدي خطوة', 'khudi khuṭwe', 'خد خطوة', 'khud khuṭwe')),
          c('take another step', ofListener('תעשי עוד צעד', 'ta\'asi od tsa\'ad', 'תעשה עוד צעד', 'ta\'ase od tsa\'ad'), ofListener('خدي كمان خطوة', 'khudi kamān khuṭwe', 'خد كمان خطوة', 'khud kamān khuṭwe')),
        ],
      },
      {
        name: 'Come here and stay there',
        cards: [
          c('come here', ofListener('בואי לפה', 'bo\'i lepo', 'בוא לפה', 'bo lepo'), ofListener('تعالي هون', 'taʿāli hōn', 'تعال هون', 'taʿāl hōn')),
          c('go there', ofListener('תלכי לשם', 'telkhi lesham', 'תלך לשם', 'telekh lesham'), ofListener('روحي هناك', 'rūḥi hnāk', 'روح هناك', 'rūḥ hnāk')),
          c('stay here', ofListener('תישארי פה', 'tisha\'ari po', 'תישאר פה', 'tisha\'er po'), ofListener('ضلّي هون', 'ḍalli hōn', 'ضلّ هون', 'ḍall hōn')),
          c('stay there', ofListener('תישארי שם', 'tisha\'ari sham', 'תישאר שם', 'tisha\'er sham'), ofListener('ضلّي هناك', 'ḍalli hnāk', 'ضلّ هناك', 'ḍall hnāk')),
          c('come closer', ofListener('תתקרבי', 'titkarvi', 'תתקרב', 'titkarev'), ofListener('قرّبي', 'ʾarrbi', 'قرّب', 'ʾarrib')),
          c('move closer', ofListener('תתקרבי קצת', 'titkarvi ktsat', 'תתקרב קצת', 'titkarev ktsat'), ofListener('قرّبي شوي', 'ʾarrbi shway', 'قرّب شوي', 'ʾarrib shway')),
          c('move away', ofListener('תתרחקי', 'titrakhaki', 'תתרחק', 'titrakhak'), ofListener('ابعدي', 'ibʿadi', 'ابعد', 'ibʿad')),
          c('move over', ofListener('תזוזי קצת', 'tazuzi ktsat', 'תזוז קצת', 'tazuz ktsat'), ofListener('زيحي شوي', 'zīḥi shway', 'زيح شوي', 'zīḥ shway')),
          c('move aside', ofListener('תזוזי הצידה', 'tazuzi hatsida', 'תזוז הצידה', 'tazuz hatsida'), ofListener('زيحي عجنب', 'zīḥi ʿa-janab', 'زيح عجنب', 'zīḥ ʿa-janab')),
          c('follow me', ofListener('בואי אחריי', 'bo\'i akharay', 'בוא אחריי', 'bo akharay'), ['امشي وراي', 'imshi warāy'], {
            ar: 'Said the same way to a woman and to a man.',
          }),
        ],
      },
      {
        name: 'Stop, wait and walk',
        cards: [
          c('stop', ofListener('תעצרי', 'ta\'atsri', 'תעצור', 'ta\'atsor'), ofListener('وقّفي', 'waʾʾfi', 'وقّف', 'waʾʾif')),
          c('wait', ofListener('תחכי', 'tekhaki', 'תחכה', 'tekhake'), ofListener('استني', 'istanni', 'استنى', 'istanna')),
          c('walk', ofListener('תלכי', 'telkhi', 'תלך', 'telekh'), ['امشي', 'imshi'], {
            ar: 'One form for everybody.',
          }),
          c('walk slowly', ofListener('תלכי לאט', 'telkhi le\'at', 'תלך לאט', 'telekh le\'at'), ['امشي شوي شوي', 'imshi shway shway']),
          c('walk carefully', ofListener('תלכי בזהירות', 'telkhi bizhirut', 'תלך בזהירות', 'telekh bizhirut'), ofListener('امشي وديري بالك', 'imshi w-dīri bālik', 'امشي ودير بالك', 'imshi w-dīr bālak')),
          c('be careful', ofListener('תיזהרי', 'tizahari', 'תיזהר', 'tizaher'), ofListener('ديري بالك', 'dīri bālik', 'دير بالك', 'dīr bālak')),
          c('keep going', ofListener('תמשיכי', 'tamshikhi', 'תמשיך', 'tamshikh'), ofListener('كمّلي', 'kammli', 'كمّل', 'kammil')),
          c('keep walking', ofListener('תמשיכי ללכת', 'tamshikhi lalekhet', 'תמשיך ללכת', 'tamshikh lalekhet'), ofListener('كمّلي مشي', 'kammli mashi', 'كمّل مشي', 'kammil mashi')),
          c('back up', ofListener('תחזרי אחורה', 'takhzeri akhora', 'תחזור אחורה', 'takhzor akhora'), ofListener('ارجعي لورا', 'irjaʿi la-wara', 'ارجع لورا', 'irjaʿ la-wara')),
          c('come with me', ofListener('בואי איתי', 'bo\'i iti', 'בוא איתי', 'bo iti'), ofListener('تعالي معي', 'taʿāli maʿi', 'تعال معي', 'taʿāl maʿi')),
        ],
      },
      {
        name: 'Holding and letting go',
        cards: [
          c('hold on', ofListener('תחזיקי', 'takhziki', 'תחזיק', 'takhzik'), ofListener('امسكي', 'imsiki', 'امسك', 'imsik')),
          c('hold still', ofListener('אל תזוזי', 'al tazuzi', 'אל תזוז', 'al tazuz'), ofListener('ما تتحركي', 'ma titḥarraki', 'ما تتحرك', 'ma titḥarrak'), {
            he: 'Also "don\'t move" — the same command in both languages.',
          }),
          c('hold this', ofListener('תחזיקי את זה', 'takhziki et ze', 'תחזיק את זה', 'takhzik et ze'), ofListener('امسكي هاد', 'imsiki hād', 'امسك هاد', 'imsik hād'), {
            ar: 'هاد — "this" — rather than an object ending, which would have to pick a gender for the thing.',
          }),
          c('grab this', ofListener('תתפסי את זה', 'titafsi et ze', 'תתפוס את זה', 'titpos et ze'), ofListener('امسكي هاد منيح', 'imsiki hād mnīḥ', 'امسك هاد منيح', 'imsik hād mnīḥ')),
          c('let go', ofListener('תשחררי', 'teshakhreri', 'תשחרר', 'teshakhrer'), ofListener('اتركي', 'itruki', 'اترك', 'itruk')),
          c('give me your hand', ofListener('תני לי את היד', 'tni li et hayad', 'תן לי את היד', 'ten li et hayad'), ofListener('أعطيني إيدك', 'aʿṭīni īdik', 'أعطيني إيدك', 'aʿṭīni īdak'), {
            ar: 'Arabic spelling is identical; the ending is pronounced differently.',
          }),
          c('hold my hand', ofListener('תחזיקי לי את היד', 'takhziki li et hayad', 'תחזיק לי את היד', 'takhzik li et hayad'), ofListener('امسكي إيدي', 'imsiki īdi', 'امسك إيدي', 'imsik īdi')),
          c('push', ofListener('תדחפי', 'tidkhafi', 'תדחוף', 'tidkhof'), ofListener('ادفعي', 'idfaʿi', 'ادفع', 'idfaʿ')),
          c('pull', ofListener('תמשכי', 'timshekhi', 'תמשוך', 'timshokh'), ofListener('اسحبي', 'isḥabi', 'اسحب', 'isḥab')),
          c('pick it up', ofListener('תרימי את זה', 'tarimi et ze', 'תרים את זה', 'tarim et ze'), ofListener('شيلي هاد', 'shīli hād', 'شيل هاد', 'shīl hād'), {
            he: 'Also "lift it" — Hebrew raises and picks up with one verb.',
          }),
        ],
      },
      {
        name: 'Bending and leaning',
        cards: [
          c('bend down', ofListener('תתכופפי', 'titkofefi', 'תתכופף', 'titkofef'), ['انحني لتحت', 'inḥani la-taḥt'], {
            ar: 'انحني is said to a woman and to a man alike.',
          }),
          c('bend forward', ofListener('תתכופפי קדימה', 'titkofefi kadima', 'תתכופף קדימה', 'titkofef kadima'), ['انحني لقدّام', 'inḥani la-ʾuddām']),
          c('lean back', ofListener('תישעני אחורה', 'tisha\'ani akhora', 'תישען אחורה', 'tisha\'en akhora'), ofListener('ميلي لورا', 'mīli la-wara', 'ميل لورا', 'mīl la-wara')),
          c('lean forward', ofListener('תישעני קדימה', 'tisha\'ani kadima', 'תישען קדימה', 'tisha\'en kadima'), ofListener('ميلي لقدّام', 'mīli la-ʾuddām', 'ميل لقدّام', 'mīl la-ʾuddām')),
          c('straighten up', ofListener('תתיישרי', 'tityashri', 'תתיישר', 'tityasher'), ofListener('عدّلي حالك', 'ʿaddli ḥālik', 'عدّل حالك', 'ʿaddil ḥālak')),
          c('sit back', ofListener('תשבי יותר אחורה', 'teshvi yoter akhora', 'תשב יותר אחורה', 'teshev yoter akhora'), ofListener('اقعدي لورا', 'uʾʿudi la-wara', 'اقعد لورا', 'uʾʿud la-wara')),
          c('sit forward', ofListener('תשבי יותר קדימה', 'teshvi yoter kadima', 'תשב יותר קדימה', 'teshev yoter kadima'), ofListener('اقعدي لقدّام', 'uʾʿudi la-ʾuddām', 'اقعد لقدّام', 'uʾʿud la-ʾuddām')),
          c('scoot forward', ofListener('תזוזי קצת קדימה', 'tazuzi ktsat kadima', 'תזוז קצת קדימה', 'tazuz ktsat kadima'), ofListener('زيحي شوي لقدّام', 'zīḥi shway la-ʾuddām', 'زيح شوي لقدّام', 'zīḥ shway la-ʾuddām')),
          c('scoot back', ofListener('תזוזי קצת אחורה', 'tazuzi ktsat akhora', 'תזוז קצת אחורה', 'tazuz ktsat akhora'), ofListener('زيحي شوي لورا', 'zīḥi shway la-wara', 'زيح شوي لورا', 'zīḥ shway la-wara')),
          c('move to the edge', ofListener('תזוזי לקצה', 'tazuzi lakatse', 'תזוז לקצה', 'tazuz lakatse'), ofListener('زيحي عالطرف', 'zīḥi ʿaṭ-ṭaraf', 'زيح عالطرف', 'zīḥ ʿaṭ-ṭaraf')),
        ],
      },
      {
        name: 'Head and looking',
        cards: [
          c('lift your head', ofListener('תרימי את הראש', 'tarimi et harosh', 'תרים את הראש', 'tarim et harosh'), ofListener('ارفعي راسك', 'irfaʿi rāsik', 'ارفع راسك', 'irfaʿ rāsak')),
          c('lower your head', ofListener('תורידי את הראש', 'toridi et harosh', 'תוריד את הראש', 'torid et harosh'), ofListener('نزّلي راسك', 'nazzli rāsik', 'نزّل راسك', 'nazzil rāsak')),
          c('look up', ofListener('תסתכלי למעלה', 'tistakli lema\'la', 'תסתכל למעלה', 'tistakel lema\'la'), ofListener('شوفي لفوق', 'shūfi la-fōʾ', 'شوف لفوق', 'shūf la-fōʾ')),
          c('look down', ofListener('תסתכלי למטה', 'tistakli lemata', 'תסתכל למטה', 'tistakel lemata'), ofListener('شوفي لتحت', 'shūfi la-taḥt', 'شوف لتحت', 'shūf la-taḥt')),
          c('look left', ofListener('תסתכלי שמאלה', 'tistakli smola', 'תסתכל שמאלה', 'tistakel smola'), ofListener('شوفي عالشمال', 'shūfi ʿash-shimāl', 'شوف عالشمال', 'shūf ʿash-shimāl')),
          c('look right', ofListener('תסתכלי ימינה', 'tistakli yamina', 'תסתכל ימינה', 'tistakel yamina'), ofListener('شوفي عاليمين', 'shūfi ʿal-yamīn', 'شوف عاليمين', 'shūf ʿal-yamīn')),
          c('raise your arm', ofListener('תרימי את היד', 'tarimi et hayad', 'תרים את היד', 'tarim et hayad'), ofListener('ارفعي إيدك', 'irfaʿi īdik', 'ارفع إيدك', 'irfaʿ īdak')),
          c('lower your arm', ofListener('תורידי את היד', 'toridi et hayad', 'תוריד את היד', 'torid et hayad'), ofListener('نزّلي إيدك', 'nazzli īdik', 'نزّل إيدك', 'nazzil īdak')),
          c('lift your leg', ofListener('תרימי את הרגל', 'tarimi et haregel', 'תרים את הרגל', 'tarim et haregel'), ofListener('ارفعي إجرك', 'irfaʿi ijrik', 'ارفع إجرك', 'irfaʿ ijrak')),
          c('lower your leg', ofListener('תורידי את הרגל', 'toridi et haregel', 'תוריד את הרגל', 'torid et haregel'), ofListener('نزّلي إجرك', 'nazzli ijrik', 'نزّل إجرك', 'nazzil ijrak')),
        ],
      },
      {
        name: 'In bed',
        cards: [
          c('turn onto your side', ofListener('תסתובבי על הצד', 'tistovevi al hatsad', 'תסתובב על הצד', 'tistovev al hatsad'), ofListener('لفّي عجنبك', 'liffi ʿa-janbik', 'لفّ عجنبك', 'liff ʿa-janbak')),
          c('turn onto your back', ofListener('תסתובבי על הגב', 'tistovevi al hagav', 'תסתובב על הגב', 'tistovev al hagav'), ofListener('لفّي عظهرك', 'liffi ʿa-ẓahrik', 'لفّ عظهرك', 'liff ʿa-ẓahrak')),
          c('turn onto your stomach', ofListener('תסתובבי על הבטן', 'tistovevi al habeten', 'תסתובב על הבטן', 'tistovev al habeten'), ofListener('لفّي عبطنك', 'liffi ʿa-baṭnik', 'لفّ عبطنك', 'liff ʿa-baṭnak')),
          c('roll over', ofListener('תתהפכי לצד השני', 'tithapkhi latsad hasheni', 'תתהפך לצד השני', 'tithapekh latsad hasheni'), ofListener('اقلبي عالجهة التانية', 'iʾlibi ʿal-jiha it-tānye', 'اقلب عالجهة التانية', 'iʾlib ʿal-jiha it-tānye')),
          c('lift yourself up', ofListener('תתרוממי', 'titromemi', 'תתרומם', 'titromem'), ofListener('ارفعي حالك', 'irfaʿi ḥālik', 'ارفع حالك', 'irfaʿ ḥālak')),
          c('lower yourself down', ofListener('תורידי את עצמך למטה', 'toridi et atsmekh lemata', 'תוריד את עצמך למטה', 'torid et atsmekha lemata'), ofListener('نزّلي حالك', 'nazzli ḥālik', 'نزّل حالك', 'nazzil ḥālak')),
          c('put your head on the pillow', ofListener('שימי את הראש על הכרית', 'simi et harosh al hakarit', 'שים את הראש על הכרית', 'sim et harosh al hakarit'), ofListener('حطي راسك عالمخدة', 'ḥuṭṭi rāsik ʿal-mkhadde', 'حط راسك عالمخدة', 'ḥuṭṭ rāsak ʿal-mkhadde')),
          c('put your hand here', ofListener('שימי את היד פה', 'simi et hayad po', 'שים את היד פה', 'sim et hayad po'), ofListener('حطي إيدك هون', 'ḥuṭṭi īdik hōn', 'حط إيدك هون', 'ḥuṭṭ īdak hōn')),
          c('put your foot down', ofListener('שימי את הרגל למטה', 'simi et haregel lemata', 'שים את הרגל למטה', 'sim et haregel lemata'), ofListener('حطي إجرك لتحت', 'ḥuṭṭi ijrik la-taḥt', 'حط إجرك لتحت', 'ḥuṭṭ ijrak la-taḥt')),
          c('put your feet here', ofListener('שימי את הרגליים פה', 'simi et haraglayim po', 'שים את הרגליים פה', 'sim et haraglayim po'), ofListener('حطي رجليكي هون', 'ḥuṭṭi rijlēki hōn', 'حط رجليك هون', 'ḥuṭṭ rijlēk hōn')),
        ],
      },
      {
        name: 'Moving things',
        cards: [
          c('lower it', ofListener('תורידי את זה', 'toridi et ze', 'תוריד את זה', 'torid et ze'), ofListener('نزّلي هاد', 'nazzli hād', 'نزّل هاد', 'nazzil hād')),
          c('put it down', ofListener('תניחי את זה', 'tanikhi et ze', 'תניח את זה', 'taniakh et ze'), ofListener('حطي هاد', 'ḥuṭṭi hād', 'حط هاد', 'ḥuṭṭ hād')),
          c('put it here', ofListener('שימי את זה פה', 'simi et ze po', 'שים את זה פה', 'sim et ze po'), ofListener('حطي هاد هون', 'ḥuṭṭi hād hōn', 'حط هاد هون', 'ḥuṭṭ hād hōn')),
          c('bring it here', ofListener('תביאי את זה לפה', 'tavi\'i et ze lepo', 'תביא את זה לפה', 'tavi et ze lepo'), ofListener('جيبي هاد هون', 'jībi hād hōn', 'جيب هاد هون', 'jīb hād hōn')),
          c('take it there', ofListener('קחי את זה לשם', 'kkhi et ze lesham', 'קח את זה לשם', 'kakh et ze lesham'), ofListener('خدي هاد لهناك', 'khudi hād la-hnāk', 'خد هاد لهناك', 'khud hād la-hnāk')),
          c('open it', ofListener('תפתחי את זה', 'tiftekhi et ze', 'תפתח את זה', 'tiftakh et ze'), ofListener('افتحي هاد', 'iftaḥi hād', 'افتح هاد', 'iftaḥ hād')),
          c('close it', ofListener('תסגרי את זה', 'tisgeri et ze', 'תסגור את זה', 'tisgor et ze'), ofListener('سكّري هاد', 'sakkri hād', 'سكّر هاد', 'sakkir hād')),
          c('move your chair', ofListener('תזיזי את הכיסא שלך', 'tazizi et hakise shelakh', 'תזיז את הכיסא שלך', 'taziz et hakise shelkha'), ofListener('حرّكي كرسيك', 'ḥarrki kursīki', 'حرّك كرسيك', 'ḥarrik kursīk')),
          c('move the chair', ofListener('תזיזי את הכיסא', 'tazizi et hakise', 'תזיז את הכיסא', 'taziz et hakise'), ofListener('حرّكي الكرسي', 'ḥarrki il-kursi', 'حرّك الكرسي', 'ḥarrik il-kursi')),
          c('give me that', ofListener('תני לי את זה', 'tni li et ze', 'תן לי את זה', 'ten li et ze'), ['أعطيني هاد', 'aʿṭīni hād']),
        ],
      },
      {
        name: 'Slowly and gently',
        cards: [
          c('relax', ofListener('תירגעי', 'tirga\'i', 'תירגע', 'tiraga'), ofListener('ارتاحي', 'irtāḥi', 'ارتاح', 'irtāḥ')),
          c('take your time', ofListener('קחי את הזמן', 'kkhi et hazman', 'קח את הזמן', 'kakh et hazman'), ofListener('خدي راحتك', 'khudi rāḥtik', 'خد راحتك', 'khud rāḥtak')),
          c('slowly', ['לאט', 'le\'at'], ['شوي شوي', 'shway shway']),
          c('a little more', ['עוד קצת', 'od ktsat'], ['كمان شوي', 'kamān shway']),
          c('a little less', ['קצת פחות', 'ktsat pakhot'], ['أقل شوي', 'ʾaʾall shway']),
          c('not so far', ['לא כל כך רחוק', 'lo kol kakh rakhok'], ['مش بعيد كتير', 'mish baʿīd ktīr']),
          c('that\'s enough', ['זה מספיק', 'ze maspik'], ['هيك بكفي', 'hēk bikaffi']),
          c('like this', ['ככה', 'kakha'], ['هيك', 'hēk']),
          c('this way', ['לכיוון הזה', 'lakivun haze'], ['من هون', 'min hōn']),
          c('that way', ['לכיוון ההוא', 'lakivun hahu'], ['من هنيك', 'min hnīk']),
        ],
      },
    ],
  },
  {
    name: 'Shopping',
    icon: '🛒',
    decks: [
      {
        name: 'At the shop',
        cards: [
          c('shop / store', ['חנות', 'khanut'], ['محلّ', 'maḥall']),
          c('supermarket', ['סופרמרקט', 'supermarket'], ['سوبرماركت', 'sūbarmārket']),
          c('market', ['שוק', 'shuk'], ['سوق', 'sūʾ']),
          c('price', ['מחיר', 'mekhir'], ['سعر', 'siʿr']),
          c('money', ['כסף', 'kesef'], ['مصاري', 'maṣāri'], { ar: 'Common Palestinian spoken word.' }),
          c('cash', ['מזומן', 'mezuman'], ['كاش', 'kāsh'], { ar: 'Common spoken loanword.' }),
          c('card', ['כרטיס', 'kartis'], ['كرت', 'kart'], { ar: 'Payment or general card.' }),
          c('receipt', ['קבלה', 'kabala'], ['وصل', 'waṣl']),
          c('bag', ['שקית', 'sakit'], ['كيس', 'kīs'], { ar: 'Shopping bag.' }),
          c('size', ['מידה', 'mida'], ['قياس', 'ʾyās'], { ar: 'Clothing or product size.' }),
        ],
      },
      {
        name: 'Clothes',
        cards: [
          c('shirt', ['חולצה', 'khultsa'], ['قميص', 'ʾamīṣ']),
          c('trousers', ['מכנסיים', 'mikhnasayim'], ['بنطلون', 'banṭalōn']),
          c('dress', ['שמלה', 'simla'], ['فستان', 'fustān']),
          c('skirt', ['חצאית', 'khatsa\'it'], ['تنّورة', 'tannūra']),
          c('jacket', ['מעיל', 'me\'il'], ['جاكيت', 'jākēt']),
          c('shoes', ['נעליים', 'na\'alayim'], ['كندرة', 'kundara'], { ar: 'One كندرة is a shoe or a pair, depending on how it is said.' }),
          c('socks', ['גרביים', 'garbayim'], ['كلسات', 'kalsāt']),
          c('scarf', ['צעיף', 'tsa\'if'], ['شال', 'shāl']),
          c('headscarf', ['מטפחת', 'mitpakhat'], ['حجاب', 'ḥijāb']),
          c('belt', ['חגורה', 'khagora'], ['حزام', 'ḥzām']),
        ],
      },
      {
        name: 'Buying and paying',
        cards: [
          c('how much is this?', ['כמה זה עולה', 'kama ze ole'], ['قدّيش هاد', 'addēsh hād']),
          c('it is expensive', ['זה יקר', 'ze yakar'], ['هاد غالي', 'hād ghāli']),
          c('it is cheap', ['זה זול', 'ze zol'], ['هاد رخيص', 'hād rakhīṣ']),
          c('do you have...?', toL(['יש לך', 'yesh lekha'], ['יש לך', 'yesh lakh']), toL(['عندك', 'ʿindak'], ['عندك', 'ʿindik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'Written the same either way; only the ending is said differently.' }),
          c('I want this', bySp(['אני רוצה את זה', 'ani rotsa et ze'], ['אני רוצה את זה', 'ani rotse et ze']), ['بدي هاد', 'biddi hād'], { he: 'Written the same either way; only the ending is said differently.', ar: 'One word for "I want", whoever is speaking.' }),
          c('can I try it on?', ['אפשר למדוד', 'efshar limdod'], ['ممكن أقيسه', 'mumkin aʾīso']),
          c('discount', ['הנחה', 'hanakha'], ['خصم', 'khaṣm']),
          c('change (money back)', ['עודף', 'odef'], ['باقي', 'bāʾi']),
          c('open (a shop)', ['פתוחה', 'ptukha', 'פתוח', 'patuakh'], ['مفتوحة', 'maftūḥa', 'مفتوح', 'maftūḥ'], { ar: 'The gender is the thing described — a shop, a door.' }),
          c('closed', ['סגורה', 'sgura', 'סגור', 'sagur'], ['مسكّرة', 'msakkara', 'مسكّر', 'msakkar']),
        ],
      },
    ],
  },
  {
    name: 'Work and technology',
    icon: '💻',
    decks: [
      {
        name: 'Office and online',
        cards: [
          c('work / job', ['עבודה', 'avoda'], ['شغل', 'shughul']),
          c('office', ['משרד', 'misrad'], ['مكتب', 'maktab']),
          c('company', ['חברה', 'khevra'], ['شركة', 'shirke']),
          c('manager', ['מנהלת', 'menahelet', 'מנהל', 'menahel'], ['مديرة', 'mudīre', 'مدير', 'mudīr']),
          c('employee', ['עובדת', 'ovedet', 'עובד', 'oved'], ['موظّفة', 'muwaẓẓafe', 'موظّف', 'muwaẓẓaf']),
          c('email', ['דוא"ל', 'do\'al'], ['إيميل', 'īmēl']),
          c('internet', ['אינטרנט', 'internet'], ['إنترنت', 'internet']),
          c('password', ['סיסמה', 'sisma'], ['كلمة سرّ', 'kilmet sirr']),
          c('file', ['קובץ', 'kovets'], ['ملفّ', 'malaf'], { ar: 'Digital or paper file.' }),
          c('app / application', ['אפליקציה', 'aplikatsya'], ['تطبيق', 'taṭbīʾ'], { ar: 'Software application.' }),
        ],
      },
      {
        name: 'Jobs and trades',
        cards: [
          c('teacher', ['מורה', 'mora', 'מורה', 'more'], ['معلّمة', 'mʿallme', 'معلّم', 'mʿallem'], { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'معلّم is the schoolteacher; أستاذ is also used as a title.' }),
          c('cook', ['טבחית', 'tabakhit', 'טבח', 'tabakh'], ['طبّاخة', 'ṭabbākha', 'طبّاخ', 'ṭabbākh']),
          c('farmer', ['חקלאית', 'khakla\'it', 'חקלאי', 'khaklai'], ['فلّاحة', 'fallāḥa', 'فلّاح', 'fallāḥ']),
          c('carpenter', ['נגרית', 'nagarit', 'נגר', 'nagar'], ['نجّارة', 'najjāra', 'نجّار', 'najjār']),
          c('builder', ['בנאית', 'bana\'it', 'בנאי', 'banai'], ['بنّا', 'banna'], { ar: 'One form: بنّاية is a building, not a woman who builds, and Palestinian Arabic has no everyday feminine of بنّا.' }),
          c('shopkeeper', ['חנוונית', 'khanvanit', 'חנווני', 'khanvani'], ['صاحبة محلّ', 'ṣāḥbet maḥall', 'صاحب محلّ', 'ṣāḥeb maḥall']),
          c('lawyer', ['עורכת דין', 'orekhet din', 'עורך דין', 'orekh din'], ['محامية', 'muḥāmye', 'محامي', 'muḥāmi']),
          c('journalist', ['עיתונאית', 'itona\'it', 'עיתונאי', 'itonai'], ['صحفيّة', 'ṣuḥufiyye', 'صحفي', 'ṣuḥufi']),
          c('student', ['סטודנטית', 'studentit', 'סטודנט', 'student'], ['طالبة', 'ṭālbe', 'طالب', 'ṭāleb']),
          c('cleaner', ['מנקה', 'menaka', 'מנקה', 'menake'], ['عاملة نظافة', 'ʿāmlet naẓāfe', 'عامل نظافة', 'ʿāmel naẓāfe'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
        ],
      },
      {
        name: 'Studying',
        cards: [
          c('lesson', ['שיעור', 'shi\'ur'], ['درس', 'dars']),
          c('homework', ['שיעורי בית', 'shi\'urei bayit'], ['وظيفة', 'waẓīfe'], { ar: 'The same word also means a job or a post.' }),
          c('exam', ['מבחן', 'mivkhan'], ['امتحان', 'imtiḥān']),
          c('book', ['ספר', 'sefer'], ['كتاب', 'ktāb']),
          c('notebook', ['מחברת', 'makhberet'], ['دفتر', 'daftar']),
          c('pen', ['עט', 'et'], ['قلم', 'ʾalam']),
          c('word', ['מילה', 'mila'], ['كلمة', 'kilme']),
          c('sentence', ['משפט', 'mishpat'], ['جملة', 'jumle']),
          c('question', ['שאלה', 'she\'ela'], ['سؤال', 'suʾāl']),
          c('answer', ['תשובה', 'tshuva'], ['جواب', 'jawāb']),
        ],
      },
    ],
  },
  {
    name: 'Animals',
    icon: '🐾',
    decks: ANIMAL_DECKS,
  },
  {
    name: 'Wants and feelings',
    icon: '💭',
    decks: WANT_DECKS,
  },
  // Last, so the learner's own sentences sit at the end of the ladder rather
  // than in front of the words the starter set teaches first.
  {
    name: CUSTOM_CATEGORY,
    icon: '✍️',
    decks: CUSTOM_DECKS,
  },
];
