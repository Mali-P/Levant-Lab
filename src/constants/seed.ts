import type {
  ArabicDialect,
  GenderedForms,
  LanguageForm,
  SpeechForms,
} from '../types';

export type SeedSide = {
  script: string;
  transliteration: string;
  forms?: GenderedForms;
  speechForms?: SpeechForms;
  notes?: string;
};

export type SeedCard = {
  english: string;
  icon?: string;
  hebrew: SeedSide;
  arabic: SeedSide & { dialect?: ArabicDialect };
};

export type SeedDeck = { name: string; cards: SeedCard[] };

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

type Entry = Word | Speech;

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

function isSpeech(entry: Entry): entry is Speech {
  return !Array.isArray(entry);
}

function side(entry: Entry): SeedSide {
  if (isSpeech(entry)) return speechSide(entry);
  const word = entry;
  if (word.length === 2) return { script: word[0], transliteration: word[1] };
  const [fScript, fTranslit, mScript, mTranslit] = word;
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
  };
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
 * Palestinian Arabic uses one counting form — the same one the masculine column
 * of "One to ten" shows — so the Arabic side carries a single word, and it is
 * the one place the headline is not a feminine form.
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
 * One to a hundred, ten cards at a time. The teens are irregular in both
 * languages and are written out; everything from twenty-one up is built from
 * the units and tens above, which is also how a learner meets them.
 */
const NUMBER_DECKS: SeedDeck[] = [
  {
    name: 'One to ten',
    cards: [
      c('one', ['אחת', 'akhat', 'אחד', 'ekhad'], ['وحدة', 'waḥde', 'واحد', 'wāḥad']),
      c('two', ['שתיים', 'shtayim', 'שניים', 'shnayim'], ['تنتين', 'tintēn', 'تنين', 'tnēn']),
      c('three', ['שלוש', 'shalosh', 'שלושה', 'shlosha'], ['تلات', 'talāt', 'تلاتة', 'talāte']),
      c('four', ['ארבע', 'arba', 'ארבעה', 'arba\'a'], ['أربع', 'arbaʿ', 'أربعة', 'arbaʿa']),
      c('five', ['חמש', 'khamesh', 'חמישה', 'khamisha'], ['خمس', 'khams', 'خمسة', 'khamse']),
      c('six', ['שש', 'shesh', 'שישה', 'shisha'], ['ستّ', 'sitt', 'ستّة', 'sitte']),
      c('seven', ['שבע', 'sheva', 'שבעה', 'shiv\'a'], ['سبع', 'sabaʿ', 'سبعة', 'sabʿa']),
      c('eight', ['שמונה', 'shmone', 'שמונה', 'shmona'], ['تمان', 'tmān', 'تمانية', 'tmānye'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
      c('nine', ['תשע', 'tesha', 'תשעה', 'tish\'a'], ['تسع', 'tisaʿ', 'تسعة', 'tisʿa']),
      c('ten', ['עשר', 'eser', 'עשרה', 'asara'], ['عشر', 'ʿashar', 'عشرة', 'ʿashara']),
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
      c('peace be upon you', ['שלום עליכם', 'shalom ʿalekhem'], ['السلام عليكم', 'as-salāmu ʿalēkum'], { ar: 'A little more formal or religious than مرحبا, and always welcome.' }),
      c('and upon you peace (reply)', ['עליכם שלום', 'ʿalekhem shalom'], ['وعليكم السلام', 'w ʿalēkum as-salām']),
      c('goodbye', ['להתראות', 'lehitra\'ot'], ['مع السلامة', 'maʿ as-salāme'], { ar: 'Said to the person leaving.' }),
      c('bye', ['ביי', 'bay'], ['يلا باي', 'yalla bāy'], { ar: 'Very casual, and extremely common.' }),
      c('see you later', ['נתראה', 'nitra\'e'], toL(['بشوفك بعدين', 'bashūfak baʿdēn'], ['بشوفك بعدين', 'bashūfik baʿdēn']), { ar: 'Written the same either way; only the ending is said differently.' }),
      c('take care', toL(['תשמור על עצמך', 'tishmor ʿal ʿatsmekha'], ['תשמרי על עצמך', 'tishmeri ʿal ʿatsmekh']), toL(['دير بالك', 'dīr bālak'], ['ديري بالك', 'dīri bālik']), { ar: 'Literally "mind yourself" — a warm way to close a conversation.' }),
    ],
  },
  {
    name: 'Times of day',
    cards: [
      c('good morning', ['בוקר טוב', 'boker tov'], ['صباح الخير', 'ṣabāḥ el-khēr']),
      c('good morning (reply)', ['בוקר אור', 'boker or'], ['صباح النور', 'ṣabāḥ en-nūr'], { ar: 'Answering "morning of goodness" with "morning of light".' }),
      c('good morning (warmer reply)', ['בוקר מקסים', 'boker maksim'], ['صباح الورد', 'ṣabāḥ el-ward'], { ar: '"Morning of roses" — friendlier still, and common between friends.' }),
      c('good afternoon', ['צהריים טובים', 'tsohorayim tovim'], ['مسا الخير', 'masa el-khēr'], { ar: 'Palestinian Arabic does not normally use a distinct everyday greeting for "good afternoon"; مسا الخير can cover late afternoon and evening.' }),
      c('good evening', ['ערב טוב', 'erev tov'], ['مسا الخير', 'masa el-khēr'], { ar: 'The spoken مسا, not the written مساء.' }),
      c('good evening (reply)', toL(['ערב טוב גם לך', 'erev tov gam lekha'], ['ערב טוב גם לך', 'erev tov gam lakh']), ['مسا النور', 'masa en-nūr'], { he: 'Hebrew simply returns the greeting; written the same either way, and only לך is said differently.' }),
      c('good night', ['לילה טוב', 'layla tov'], toL(['تصبح على خير', 'tiṣbaḥ ʿala khēr'], ['تصبحي على خير', 'tiṣbaḥi ʿala khēr']), { ar: 'Literally "may you wake to goodness"; said on parting for the night.' }),
      c('good night (reply)', toL(['לילה טוב גם לך', 'layla tov gam lekha'], ['לילה טוב גם לך', 'layla tov gam lakh']), toL(['وإنت من أهل الخير', 'w inte min ahl el-khēr'], ['وإنتِ من أهل الخير', 'w inti min ahl el-khēr']), { ar: 'The set answer to تصبح على خير.' }),
      c('sweet dreams', ['חלומות פז', 'khalomot paz'], ['أحلام سعيدة', 'aḥlām saʿīde']),
      c('have a nice day', ['יום נעים', 'yom naʿim'], toL(['نهارك سعيد', 'nahārak saʿīd'], ['نهارك سعيد', 'nahārik saʿīd'])),
    ],
  },
  {
    name: 'How are you?',
    cards: [
      c('how are you?', toL(['מה שלומך', 'ma shlomkha'], ['מה שלומך', 'ma shlomekh']), toL(['كيفك', 'kīfak'], ['كيفك', 'kīfik']), { he: 'Written the same either way; only the ending is said differently.', ar: 'The one greeting you will hear most; the ending matches the person you ask, never yourself.' }),
      c('how is it going?', ['איך הולך', 'ekh holekh'], ['كيف الأمور', 'kīf el-umūr'], { ar: 'Literally "how are the matters" — asked of anyone.' }),
      c('what\'s new?', ['מה נשמע', 'ma nishmaʿ'], toL(['شو أخبارك', 'shū akhbārak'], ['شو أخبارك', 'shū akhbārik']), { ar: 'Literally "what is your news".' }),
      c('good / fine', ['בסדר', 'beseder'], bySp(['منيحة', 'mnīḥa'], ['منيح', 'mnīḥ']), { ar: 'The one card here where the ending is your own, not theirs: a woman says منيحة to anybody.' }),
      c('thank God (I am well)', ['ברוך השם', 'barukh hashem'], ['الحمد لله', 'el-ḥamdulillah'], { ar: 'The usual answer to كيفك, whether or not the speaker is religious.' }),
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
      c('good luck', ['בהצלחה', 'behatslakha'], ['بالتوفيق', 'bit-tawfīq']),
      c('happy birthday', ['יום הולדת שמח', 'yom huledet sameakh'], ['عيد ميلاد سعيد', 'ʿīd mīlād saʿīd']),
      c('happy holiday', ['חג שמח', 'khag sameakh'], ['عيد مبارك', 'ʿīd mubārak']),
      c('get well soon', ['רפואה שלמה', 'refu\'a shlema'], toL(['سلامتك', 'salāmtak'], ['سلامتك', 'salāmtik']), { ar: 'Literally "your wellbeing"; written the same either way.' }),
      c('God willing', ['בעזרת השם', 'be\'ezrat hashem'], ['إن شاء الله', 'in shāʾ allah'], { ar: 'Said of anything still to come, whether or not the speaker is religious.' }),
      c('may God protect you', toL(['אלוהים ישמור עליך', 'elohim yishmor alekha'], ['אלוהים ישמור עלייך', 'elohim yishmor alayikh']), toL(['الله يحميك', 'allah yiḥmīk'], ['الله يحميكي', 'allah yiḥmīki'])),
      c('welcome back (safe return)', toL(['ברוך השב', 'barukh hashav'], ['ברוכה השבה', 'brukha hashava']), ['الحمد لله عالسلامة', 'el-ḥamdulillah ʿas-salāme'], { he: 'The ending follows the traveller you are greeting.', ar: 'Said to someone home from a journey; the Arabic does not change.' }),
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
      c('Mrs / Mr', ['גברת', 'gveret', 'מר', 'mar'], ['مدام', 'madām', 'سيّد', 'sayyed'], { ar: 'مدام is the everyday address for a married woman; السيّد is the formal written title.' }),
      c('Miss', ['גברת', 'gveret'], ['آنسة', 'ānise'], { he: 'Modern Hebrew uses גברת whether or not a woman is married.' }),
      c('doctor (as a title)', ['ד"ר', 'doktor'], ['دكتورة', 'doktōra', 'دكتور', 'doktōr'], { he: 'Written as an abbreviation and said "doktor" for anyone.' }),
      c('professor', ['פרופסור', 'profesor'], ['بروفيسور', 'brōfēsōr'], { ar: 'أستاذ دكتور is the formal academic version.' }),
      c('teacher / sir', ['מורה', 'mora', 'מורה', 'more'], ['أستاذة', 'ustāze', 'أستاذ', 'ustāz'], { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'أستاذ doubles as a polite "sir" for a man you address by name.' }),
      c('engineer', ['מהנדסת', 'mehandeset', 'מהנדס', 'mehandes'], ['مهندسة', 'muhandise', 'مهندس', 'muhandis'], { ar: 'Used as a title in front of a name, much like "doctor".' }),
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
      c('cat', ['חתולה', 'khatula', 'חתול', 'khatul'], ['قطّة', 'qiṭṭa', 'قطّ', 'qiṭṭ'], { ar: 'بسّة (bisse) is just as common in Palestinian homes.' }),
      c('puppy', ['גור כלבים', 'gur klavim'], ['جرو', 'jarw']),
      c('kitten', ['חתלתול', 'khataltul'], ['قطّة صغيرة', 'quṭṭa zghīre'], { ar: 'Literally "small cat"; spoken Arabic rarely uses a separate word.' }),
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
      c('cow', ['פרה', 'para'], ['بقرة', 'baqara']),
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
      c('monkey', ['קוף', 'kof'], ['قرد', 'qird']),
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
      c('blue', ['כחולה', 'kkhula', 'כחול', 'kakhol'], ['زرقا', 'zarqa', 'أزرق', 'azraq']),
      c('green', ['ירוקה', 'yeruka', 'ירוק', 'yarok'], ['خضرا', 'khaḍra', 'أخضر', 'akhḍar']),
      c('yellow', ['צהובה', 'tsehuba', 'צהוב', 'tsahov'], ['صفرا', 'ṣafra', 'أصفر', 'aṣfar']),
      c('brown', ['חומה', 'khuma', 'חום', 'khum'], ['بنّيّة', 'bunniyye', 'بنّي', 'bunni']),
      c('grey', ['אפורה', 'afora', 'אפור', 'afor'], ['رماديّة', 'ramādiyye', 'رمادي', 'ramādi']),
      c('orange (colour)', ['כתומה', 'ktuma', 'כתום', 'katom'], ['برتقاليّة', 'burtuqāliyye', 'برتقالي', 'burtuqāli']),
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
      c('the colour', ['הצבע', 'hatseva'], ['اللون', 'el-lōn']),
      c('what colour is it?', ['איזה צבע זה', 'eize tseva ze'], ['شو لونه', 'shū lōno']),
      c('light (shade)', ['בהירה', 'behira', 'בהיר', 'bahir'], ['فاتحة', 'fātḥa', 'فاتح', 'fāteḥ'], { ar: 'Said after the colour: أزرق فاتح, "light blue".' }),
      c('dark (shade)', ['כהה', 'keha', 'כהה', 'kehe'], ['غامقة', 'ghāmqa', 'غامق', 'ghāmeq'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
      c('a red car', ['מכונית אדומה', 'mekhonit aduma'], ['سيّارة حمرا', 'sayyāra ḥamra'], { ar: 'سيّارة is a feminine word, so the colour takes its feminine form.' }),
      c('a white shirt', ['חולצה לבנה', 'khultsa levana'], ['قميص أبيض', 'qamīṣ abyaḍ'], { ar: 'قميص is masculine, so the colour follows it.' }),
      c('green tea', ['תה ירוק', 'te yarok'], ['شاي أخضر', 'shāy akhḍar']),
      c('the sky is blue', ['השמיים כחולים', 'hashamayim kkhulim'], ['السما زرقا', 'es-sama zarqa']),
      c('green eyes', ['עיניים ירוקות', 'einayim yerukot'], ['عيون خضر', 'ʿyūn khuḍur']),
      c('my favourite colour', ['הצבע האהוב עליי', 'hatseva ha\'ahuv alay'], ['لوني المفضّل', 'lōni el-mufaḍḍal']),
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
      c('I miss', bySp(['אני מתגעגעת', 'ani mitga\'aga\'at'], ['אני מתגעגע', 'ani mitga\'age\'a']), bySp(['أنا مشتاقة', 'ana mushtāqa'], ['أنا مشتاق', 'ana mushtāq']), { ar: 'One of the few Arabic forms here that follows the speaker: a woman says مشتاقة.' }),
      c('I know', bySp(['אני יודעת', 'ani yoda\'at'], ['אני יודע', 'ani yode\'a']), ['أنا بعرف', 'ana baʿref']),
      c('I love', bySp(['אני אוהבת', 'ani ohevet'], ['אני אוהב', 'ani ohev']), ['أنا بحبّ', 'ana baḥibb'], { ar: 'The same verb covers loving a person and liking a thing.' }),
      c('I can', bySp(['אני יכולה', 'ani yekhola'], ['אני יכול', 'ani yakhol']), ['أنا بقدر', 'ana baqdar']),
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
      c('I miss you', both4(['אני מתגעגעת אליך', 'ani mitga\'aga\'at elekha'], ['אני מתגעגעת אלייך', 'ani mitga\'aga\'at elayikh'], ['אני מתגעגע אלייך', 'ani mitga\'age\'a elayikh'], ['אני מתגעגע אליך', 'ani mitga\'age\'a elekha']), toL(['اشتقتلك', 'ishtaqtillak'], ['اشتقتلك', 'ishtaqtillik']), { he: 'The verb follows you, the ending follows them.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('I feel tired', bySp(['אני מרגישה עייפה', 'ani margisha ayefa'], ['אני מרגיש עייף', 'ani margish ayef']), bySp(['أنا تعبانة', 'ana taʿbāne'], ['أنا تعبان', 'ana taʿbān']), { ar: 'Arabic simply says "I am tired"; the ending is your own.' }),
      c('I have time', ['יש לי זמן', 'yesh li zman'], ['عندي وقت', 'ʿindi waqt']),
      c('I have a question', ['יש לי שאלה', 'yesh li she\'ela'], ['عندي سؤال', 'ʿindi suʾāl']),
      c('do you want tea?', toL(['אתה רוצה תה', 'ata rotse te'], ['את רוצה תה', 'at rotsa te']), toL(['بدَّك شاي', 'biddak shāy'], ['بدِّك شاي', 'biddik shāy'])),
      c('what do you need?', toL(['מה אתה צריך', 'ma ata tsarikh'], ['מה את צריכה', 'ma at tsrikha']), toL(['شو لازمك', 'shū lāzmak'], ['شو لازمك', 'shū lāzmik']), { ar: 'Written the same either way; only the ending is said differently.' }),
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
        ['كيف حالك ماما', 'kīf ḥālek māma'],
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
        ['אני רוצה לעזור לך בבית שלך אמא', 'ani rotsa laʿazor lakh babayit shelakh ima'],
        ['أنا بدي أساعدك بالبيت ماما', 'ana biddi asāʿdek bil-bēt māma'],
        { he: 'רוצה is said rotsa by a woman; לך and שלך take the feminine endings for her mother.', ar: 'أساعدِك is the feminine "help you"; drop بالبيت and it is simply "I want to help you".' },
      ),
      c(
        'do you want?',
        toL(['אתה רוצה', 'ata rotse'], ['את רוצה', 'at rotsa']),
        toL(['بدَّك', 'biddak'], ['بدِّك', 'biddek']),
        { ar: 'Written بدك either way — only the transliteration tells the two endings apart.' },
      ),
      c(
        'may I ask — are you Jewish or Arab?',
        toL(
          ['אפשר לשאול, אתה יהודי או ערבי', 'efshar lish\'ol, ata yehudi o aravi'],
          ['אפשר לשאול, את יהודייה או ערבייה', 'efshar lish\'ol, at yehudiya o araviya'],
        ),
        toL(
          ['لو سمحت، إنت يهودي ولا عربي', 'law samaḥt, inta yahūdi walla ʿarabi'],
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
    ],
  },
];

/**
 * Starter content: twenty-four categories, one ten-card deck each except the
 * greetings and the pronouns, which take three each, and the numbers, which
 * run to a hundred. Words come
 * from the Palestinian Arabic and Hebrew starter table, which lists a feminine
 * and a masculine form for every entry; where the two are identical the card
 * carries a single form.
 *
 * Adding a category here needs no code change anywhere else.
 */
export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Greetings',
    icon: '👋',
    decks: GREETING_DECKS,
  },
  {
    name: 'Counting and numbers',
    icon: '🔢',
    decks: NUMBER_DECKS,
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
          c('coffee', ['קפה', 'kafe'], ['قهوة', 'qahwe']),
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
          c('the bill, please', ['החשבון בבקשה', 'hakheshbon bevakasha'], toL(['الحساب لو سمحت', 'el-ḥsāb law samaḥt'], ['الحساب لو سمحتي', 'el-ḥsāb law samaḥti'])),
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
          c('niece / nephew', ['אחיינית', 'akhyanit', 'אחיין', 'akhyan'], ['بنت الأخت', 'bint el-ukht', 'ابن الأخت', 'ibin el-ukht'], { ar: 'A sister\'s child; a brother\'s is بنت الأخ or ابن الأخ.' }),
          c('mother-in-law / father-in-law', ['חמות', 'khamot', 'חם', 'kham'], ['حماة', 'ḥamā', 'حما', 'ḥama']),
          c('bride / groom', ['כלה', 'kala', 'חתן', 'khatan'], ['عروس', 'ʿarūs', 'عريس', 'ʿarīs']),
          c('twin', ['תאומה', 'te\'oma', 'תאום', 'te\'om'], ['توأم', 'tawʾam'], { ar: 'One word for a twin of either gender.' }),
          c('relatives', ['קרובי משפחה', 'krovei mishpakha'], ['أقارب', 'aqāreb']),
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
          c('heart', ['לב', 'lev'], ['قلب', 'qalb']),
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
    name: 'Daily routine',
    icon: '⏰',
    decks: [
      {
        name: 'Morning to night',
        cards: [
          c('wake up', ['מתעוררת', 'mit\'oreret', 'מתעורר', 'mit\'orer'], ['بتصحى', 'btiṣḥa', 'بيصحى', 'byiṣḥa']),
          c('get up', ['קמה', 'kama', 'קם', 'kam'], ['بتقوم', 'btqūm', 'بيقوم', 'byqūm']),
          c('get dressed', ['מתלבשת', 'mitlabeshet', 'מתלבש', 'mitlabesh'], ['بتلبس تيابها', 'btilbas tyābha', 'بيلبس تيابه', 'byilbas tyābu']),
          c('wash face', ['שוטפת פנים', 'shotefet panim', 'שוטף פנים', 'shotef panim'], ['بتغسل وجهها', 'btighsil wijhha', 'بيغسل وجهه', 'byighsil wijhu']),
          c('brush teeth', ['מצחצחת שיניים', 'metsakhtsakhat shinayim', 'מצחצח שיניים', 'metsakhtseakh shinayim'], ['بتفرّش سنانها', 'btfarresh snānha', 'بيفرّش سنانه', 'byfarresh snānu']),
          c('eat breakfast', ['אוכלת ארוחת בוקר', 'okhelet arukhat boker', 'אוכל ארוחת בוקר', 'okhel arukhat boker'], ['بتفطر', 'btifṭar', 'بيفطر', 'byifṭar']),
          c('go to work', ['הולכת לעבודה', 'holekhet la\'avoda', 'הולך לעבודה', 'holekh la\'avoda'], ['بتروح عالشغل', 'btrūḥ ʿash-shughul', 'بيروح عالشغل', 'byrūḥ ʿash-shughul']),
          c('come home', ['חוזרת הביתה', 'khozeret habayta', 'חוזר הביתה', 'khozer habayta'], ['بترجع عالبيت', 'btirjaʿ ʿal-bēt', 'بيرجع عالبيت', 'byirjaʿ ʿal-bēt']),
          c('take a shower', ['מתקלחת', 'mitkalakhat', 'מתקלח', 'mitkaleakh'], ['بتتحمّم', 'btitḥammam', 'بيتحمّم', 'byitḥammam']),
          c('sleep', ['ישנה', 'yeshena', 'ישן', 'yashen'], ['بتنام', 'btnām', 'بينام', 'bynām']),
        ],
      },
      {
        name: 'Telling the time',
        cards: [
          c('what time is it?', ['מה השעה', 'ma hasha\'a'], ['قدّيش الساعة', 'addēsh es-sāʿa']),
          c('hour', ['שעה', 'sha\'a'], ['ساعة', 'sāʿa'], { ar: 'The same word means a clock or a watch.' }),
          c('minute', ['דקה', 'daka'], ['دقيقة', 'daqīqa']),
          c('half past', ['וחצי', 'vakhetsi'], ['ونصّ', 'w nuṣṣ'], { ar: 'Said after the hour: الساعة تلاتة ونصّ, "half past three".' }),
          c('quarter past', ['ורבע', 'varevaʿ'], ['وربع', 'w rubʿ']),
          c('early', ['מוקדם', 'mukdam'], ['بكّير', 'bakkīr']),
          c('late', ['מאוחר', 'me\'ukhar'], ['متأخّر', 'mitʾakhkhir']),
          c('now', ['עכשיו', 'akhshav'], ['هلّق', 'hallaʾ'], { ar: 'The Levantine word; الآن is written Arabic.' }),
          c('today', ['היום', 'hayom'], ['اليوم', 'el-yōm']),
          c('tomorrow', ['מחר', 'makhar'], ['بكرا', 'bukra']),
        ],
      },
      {
        name: 'Days of the week',
        cards: [
          c('Sunday', ['יום ראשון', 'yom rishon'], ['الأحد', 'el-aḥad'], { he: 'Literally "first day" — the Hebrew week starts here.' }),
          c('Monday', ['יום שני', 'yom sheni'], ['الاتنين', 'et-tnēn']),
          c('Tuesday', ['יום שלישי', 'yom shlishi'], ['التلات', 'et-talāt']),
          c('Wednesday', ['יום רביעי', 'yom revi\'i'], ['الأربعا', 'el-arbaʿa']),
          c('Thursday', ['יום חמישי', 'yom khamishi'], ['الخميس', 'el-khamīs']),
          c('Friday', ['יום שישי', 'yom shishi'], ['الجمعة', 'el-jumʿa']),
          c('Saturday', ['שבת', 'shabat'], ['السبت', 'es-sabt'], { he: 'The one weekday with a name rather than a number.' }),
          c('week', ['שבוע', 'shavua'], ['أسبوع', 'usbūʿ']),
          c('yesterday', ['אתמול', 'etmol'], ['إمبارح', 'imbāriḥ']),
          c('weekend', ['סוף שבוע', 'sof shavua'], ['عطلة الأسبوع', 'ʿuṭlet el-usbūʿ']),
        ],
      },
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    decks: [
      {
        name: 'Things you do',
        cards: [
          c('read', ['קוראת', 'koret', 'קורא', 'kore'], ['بتقرأ', 'btiqra', 'بيقرأ', 'byiqra']),
          c('write', ['כותבת', 'kotevet', 'כותב', 'kotev'], ['بتكتب', 'btiktob', 'بيكتب', 'byiktob']),
          c('listen to music', ['מקשיבה למוזיקה', 'makshiva la-muzika', 'מקשיב למוזיקה', 'makshiv la-muzika'], ['بتسمع موسيقى', 'btismaʿ mūsīqa', 'بيسمع موسيقى', 'byismaʿ mūsīqa']),
          c('watch television', ['רואה טלוויזיה', 'ro\'a televizya', 'רואה טלוויזיה', 'ro\'e televizya'], ['بتحضر تلفزيون', 'btiḥḍar tilfizyōn', 'بيحضر تلفزيون', 'byiḥḍar tilfizyōn'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('exercise', ['מתאמנת', 'mit\'amenet', 'מתאמן', 'mit\'amen'], ['بتتمرّن', 'btitmaran', 'بيتمرّن', 'byitmaran']),
          c('cook', ['מבשלת', 'mevashelet', 'מבשל', 'mevashel'], ['بتطبخ', 'btitbukh', 'بيطبخ', 'byitbukh']),
          c('walk', ['הולכת', 'holekhet', 'הולך', 'holekh'], ['بتمشي', 'btimshi', 'بيمشي', 'byimshi']),
          c('run', ['רצה', 'ratsa', 'רץ', 'rats'], ['بتركض', 'btirkod', 'بيركض', 'byirkod']),
          c('swim', ['שוחה', 'sokha', 'שוחה', 'sokhe'], ['بتسبح', 'btisbaḥ', 'بيسبح', 'byisbaḥ'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('dance', ['רוקדת', 'rokedet', 'רוקד', 'roked'], ['بترقص', 'btirqoṣ', 'بيرقص', 'byirqoṣ']),
        ],
      },
      {
        name: 'Out and about',
        cards: [
          c('travel', ['נוסעת', 'nosa\'at', 'נוסע', 'nose\'a'], ['بتسافر', 'btsāfer', 'بيسافر', 'bysāfer']),
          c('visit', ['מבקרת', 'mevakeret', 'מבקר', 'mevaker'], ['بتزور', 'btzūr', 'بيزور', 'byzūr']),
          c('buy', ['קונה', 'kona', 'קונה', 'kone'], ['بتشتري', 'btishtri', 'بيشتري', 'byishtri'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('meet friends', ['נפגשת עם חברים', 'nifgeshet im khaverim', 'נפגש עם חברים', 'nifgash im khaverim'], ['بتتلاقى مع أصحاب', 'btitlāqa maʿ aṣḥāb', 'بيتلاقى مع أصحاب', 'byitlāqa maʿ aṣḥāb']),
          c('go out', ['יוצאת', 'yotset', 'יוצא', 'yotse'], ['بتطلع', 'btiṭlaʿ', 'بيطلع', 'byiṭlaʿ'], { ar: 'Literally "goes up"; the everyday word for going out.' }),
          c('drive', ['נוהגת', 'noheget', 'נוהג', 'noheg'], ['بتسوق', 'btsūq', 'بيسوق', 'bysūq']),
          c('wait', ['מחכה', 'mekhaka', 'מחכה', 'mekhake'], ['بتستنّى', 'btistanna', 'بيستنّى', 'byistanna'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('pay', ['משלמת', 'meshalemet', 'משלם', 'meshalem'], ['بتدفع', 'btidfaʿ', 'بيدفع', 'byidfaʿ']),
          c('rest', ['נחה', 'nakha', 'נח', 'nakh'], ['بترتاح', 'btirtāḥ', 'بيرتاح', 'byirtāḥ']),
          c('take a photo', ['מצלמת', 'metsalemet', 'מצלם', 'metsalem'], ['بتصوّر', 'btṣawwer', 'بيصوّر', 'byṣawwer']),
        ],
      },
      {
        name: 'Sport and play',
        cards: [
          c('football', ['כדורגל', 'kaduregel'], ['كرة قدم', 'kurat qadam']),
          c('basketball', ['כדורסל', 'kadursal'], ['كرة سلّة', 'kurat salle']),
          c('game', ['משחק', 'miskhak'], ['لعبة', 'liʿbe']),
          c('play', ['משחקת', 'mesakheket', 'משחק', 'mesakhek'], ['بتلعب', 'btilʿab', 'بيلعب', 'byilʿab']),
          c('win', ['מנצחת', 'menatsakhat', 'מנצח', 'menatseakh'], ['بتربح', 'btirbaḥ', 'بيربح', 'byirbaḥ']),
          c('lose', ['מפסידה', 'mafsida', 'מפסיד', 'mafsid'], ['بتخسر', 'btikhsar', 'بيخسر', 'byikhsar']),
          c('team', ['קבוצה', 'kvutsa'], ['فريق', 'farīq']),
          c('ball', ['כדור', 'kadur'], ['طابة', 'ṭābe'], { ar: 'The everyday Palestinian word; كرة is the written one.' }),
          c('swimming pool', ['בריכה', 'brekha'], ['مسبح', 'masbaḥ']),
          c('gym', ['חדר כושר', 'khadar kosher'], ['نادي رياضي', 'nādi riyāḍi']),
        ],
      },
    ],
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
          c('toilet paper', ['נייר טואלט', 'niyar toalet'], ['ورق حمّام', 'waraq ḥammām']),
          c('deodorant', ['דאודורנט', 'deodorant'], ['مزيل عرق', 'mazīl ʿaraq']),
          c('comb', ['מסרק', 'masrek'], ['مشط', 'mishṭ']),
          c('hairbrush', ['מברשת שיער', 'mivreshet se\'ar'], ['فرشاية شعر', 'firshāyet shaʿar']),
          c('razor', ['סכין גילוח', 'sakin giluakh'], ['شفرة حلاقة', 'shafret ḥalāqa']),
        ],
      },
      {
        name: 'Cleaning the house',
        cards: [
          c('clean (verb)', ['מנקה', 'menaka', 'מנקה', 'menake'], ['بتنضّف', 'btnaḍḍef', 'بينضّف', 'bynaḍḍef'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('wash', ['שוטפת', 'shotefet', 'שוטף', 'shotef'], ['بتغسل', 'btighsil', 'بيغسل', 'byighsil']),
          c('sweep', ['מטאטאת', 'metate\'et', 'מטאטא', 'metate'], ['بتكنس', 'btiknos', 'بيكنس', 'byiknos']),
          c('broom', ['מטאטא', 'matate'], ['مكنسة', 'miknase']),
          c('bucket', ['דלי', 'dli'], ['سطل', 'saṭel']),
          c('cloth / rag', ['סמרטוט', 'smartut'], ['خرقة', 'khirqa']),
          c('cleaning products', ['חומרי ניקוי', 'khomrei nikuy'], ['مواد تنظيف', 'mawād tanẓīf']),
          c('rubbish', ['זבל', 'zevel'], ['زبالة', 'zbāle']),
          c('laundry', ['כביסה', 'kvisa'], ['غسيل', 'ghasīl']),
          c('washing machine', ['מכונת כביסה', 'mekhonat kvisa'], ['غسّالة', 'ghassāle']),
        ],
      },
      {
        name: 'Looking after yourself',
        cards: [
          c('get a haircut', ['מסתפרת', 'mistaperet', 'מסתפר', 'mistaper'], ['بتقصّ شعرها', 'btiqoṣṣ shaʿerha', 'بيقصّ شعره', 'byiqoṣṣ shaʿro'], { ar: 'Literally "cuts her hair" and "cuts his hair".' }),
          c('shave', ['מתגלחת', 'mitgalakhat', 'מתגלח', 'mitgaleakh'], ['بتحلق', 'btiḥloq', 'بيحلق', 'byiḥloq']),
          c('cut nails', ['גוזרת ציפורניים', 'gozeret tsiporanayim', 'גוזר ציפורניים', 'gozer tsiporanayim'], ['بتقصّ ضوافرها', 'btiqoṣṣ ḍawāfirha', 'بيقصّ ضوافره', 'byiqoṣṣ ḍawāfro']),
          c('perfume', ['בושם', 'bosem'], ['عطر', 'ʿiṭir']),
          c('cream', ['קרם', 'krem'], ['كريم', 'krēm']),
          c('mirror', ['מראה', 'mar\'a'], ['مراية', 'mrāye'], { ar: 'The spoken Palestinian form of مرآة.' }),
          c('scissors', ['מספריים', 'misparayim'], ['مقصّ', 'maqaṣṣ']),
          c('tissues', ['טישו', 'tishu'], ['محارم', 'maḥārem']),
          c('sunscreen', ['קרם הגנה', 'krem hagana'], ['واقي شمس', 'wāqi shams']),
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
          c('burn', ['כווייה', 'kviya'], ['حرق', 'ḥarq']),
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
          c('call!', toL(['תתקשר', 'titkasher'], ['תתקשרי', 'titkasheri']), toL(['اتّصل', 'ittiṣil'], ['اتّصلي', 'ittiṣli'])),
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
          c('where is the hospital?', ['איפה בית החולים', 'eifo beit hakholim'], ['وين المستشفى', 'wēn el-mustashfa']),
          c('I am lost', ['הלכתי לאיבוד', 'halakhti le\'ibud'], bySp(['أنا ضايعة', 'ana ḍāyʿa'], ['أنا ضايع', 'ana ḍāyeʿ']), { he: 'Literally "I went to lostness"; said the same way by anyone.', ar: 'Here the ending is your own, not theirs.' }),
          c('quickly!', ['מהר', 'maher'], ['بسرعة', 'bi-surʿa']),
          c('be careful', toL(['תיזהר', 'tizaher'], ['תיזהרי', 'tizahari']), toL(['انتبه', 'intibih'], ['انتبهي', 'intibhi'])),
          c('do not worry', toL(['אל תדאג', 'al tid\'ag'], ['אל תדאגי', 'al tid\'agi']), toL(['ما تقلق', 'mā tiqlaq'], ['ما تقلقي', 'mā tiqlaqi'])),
        ],
      },
      {
        name: 'Trouble and safety',
        cards: [
          c('thief', ['גנבת', 'ganevet', 'גנב', 'ganav'], ['حرامية', 'ḥarāmiyye', 'حرامي', 'ḥarāmi']),
          c('theft', ['גניבה', 'gneva'], ['سرقة', 'sirqa']),
          c('safe', ['בטוחה', 'btukha', 'בטוח', 'batuakh'], ['آمنة', 'āmne', 'آمن', 'āmen']),
          c('afraid', bySp(['מפחדת', 'mefakhedet'], ['מפחד', 'mefakhed']), bySp(['خايفة', 'khāyfe'], ['خايف', 'khāyef']), { ar: 'Said of yourself, so the ending is your own.' }),
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
          c('frying pan', ['מחבת', 'makhvat'], ['مقلاية', 'maqlāye']),
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
          c('call (verb)', ['מתקשרת', 'mitkasheret', 'מתקשר', 'mitkasher'], ['بتتّصل', 'btittiṣel', 'بيتّصل', 'byittiṣel']),
          c('answer', ['עונה', 'ona', 'עונה', 'one'], ['بتردّ', 'btrudd', 'بيردّ', 'byrudd'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('message', ['הודעה', 'hoda\'a'], ['رسالة', 'risāle']),
          c('send', ['שולחת', 'sholakhat', 'שולח', 'sholeakh'], ['بتبعت', 'btibʿat', 'بيبعت', 'byibʿat']),
          c('photo', ['תמונה', 'tmuna'], ['صورة', 'ṣūra']),
          c('video', ['וידאו', 'video'], ['فيديو', 'vīdyo']),
          c('phone number', ['מספר טלפון', 'mispar telefon'], ['رقم تلفون', 'raqam tilifōn']),
          c('voice note', ['הודעה קולית', 'hoda\'a kolit'], ['رسالة صوتيّة', 'risāle ṣawtiyye']),
          c('missed call', ['שיחה שלא נענתה', 'sikha shelo ne\'enta'], ['مكالمة فايتة', 'mukālame fāyte']),
          c('hang up', ['מנתקת', 'menateket', 'מנתק', 'menatek'], ['بتسكّر', 'btsakker', 'بيسكّر', 'bysakker'], { ar: 'Literally "closes", which is how ending a call is said.' }),
        ],
      },
      {
        name: 'Power and connection',
        cards: [
          c('battery', ['סוללה', 'solela'], ['بطّاريّة', 'baṭṭāriyye']),
          c('cable', ['כבל', 'kevel'], ['كبل', 'kabl']),
          c('socket', ['שקע', 'sheka'], ['فيشة', 'fīshe']),
          c('electricity', ['חשמל', 'khashmal'], ['كهربا', 'kahraba'], { ar: 'The spoken Palestinian form of كهرباء.' }),
          c('switch on', ['מדליקה', 'madlika', 'מדליק', 'madlik'], ['بتشغّل', 'btshaghghel', 'بيشغّل', 'byshaghghel']),
          c('switch off', ['מכבה', 'mekhaba', 'מכבה', 'mekhabe'], ['بتطفي', 'btiṭfi', 'بيطفي', 'byiṭfi'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('wifi', ['וויפי', 'waifai'], ['واي فاي', 'wāy fāy']),
          c('signal', ['קליטה', 'klita'], ['إرسال', 'irsāl']),
          c('it is not working', ['זה לא עובד', 'ze lo oved'], ['مش شغّال', 'mish shaghghāl']),
          c('charge (verb)', ['מטעינה', 'mat\'ina', 'מטעין', 'mat\'in'], ['بتشحن', 'btishḥan', 'بيشحن', 'byishḥan']),
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
          c('tired', ['עייפה', 'ayefa', 'עייף', 'ayef'], ['تعبانة', 'taʿbāne', 'تعبان', 'taʿbān']),
          c('hungry', ['רעבה', 're\'eva', 'רעב', 'ra\'ev'], ['جوعانة', 'jūʿāne', 'جوعان', 'jūʿān']),
          c('thirsty', ['צמאה', 'tsme\'a', 'צמא', 'tsame'], ['عطشانة', 'ʿaṭshāne', 'عطشان', 'ʿaṭshān']),
          c('happy', ['שמחה', 'smekha', 'שמח', 'sameakh'], ['مبسوطة', 'mabsūṭa', 'مبسوط', 'mabsūṭ']),
          c('sad', ['עצובה', 'atsuva', 'עצוב', 'atsuv'], ['زعلانة', 'zaʿlāne', 'زعلان', 'zaʿlān'], { ar: 'Common spoken form; can also mean upset.' }),
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
          c('strong', ['חזקה', 'khazaka', 'חזק', 'khazak'], ['قويّة', 'qawiyye', 'قوي', 'qawi']),
          c('weak', ['חלשה', 'khalasha', 'חלש', 'khalash'], ['ضعيفة', 'ḍaʿīfe', 'ضعيف', 'ḍaʿīf']),
          c('heavy', ['כבדה', 'kveda', 'כבד', 'kaved'], ['تقيلة', 'tqīle', 'تقيل', 'tqīl'], { ar: 'Written ثقيل; the ث is said as a t in Palestinian speech.' }),
          c('quiet', ['שקטה', 'shketa', 'שקט', 'shaket'], ['هادية', 'hādye', 'هادي', 'hādi']),
        ],
      },
      {
        name: 'Opposites',
        cards: [
          c('hot', ['חמה', 'khama', 'חם', 'kham'], ['سخنة', 'sukhne', 'سخن', 'sukhn']),
          c('cold', ['קרה', 'kara', 'קר', 'kar'], ['باردة', 'bārde', 'بارد', 'bāred']),
          c('new', ['חדשה', 'khadasha', 'חדש', 'khadash'], ['جديدة', 'jdīde', 'جديد', 'jdīd']),
          c('old (a thing)', ['ישנה', 'yeshana', 'ישן', 'yashan'], ['قديمة', 'qadīme', 'قديم', 'qadīm'], { he: 'Of a person, Hebrew uses זקנה / זקן instead.' }),
          c('long', ['ארוכה', 'arukha', 'ארוך', 'arokh'], ['طويلة', 'ṭawīle', 'طويل', 'ṭawīl']),
          c('short', ['קצרה', 'ktsara', 'קצר', 'katsar'], ['قصيرة', 'qaṣīre', 'قصير', 'qaṣīr']),
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
        name: 'Core verbs',
        cards: [
          c('want', ['רוצה', 'rotsa', 'רוצה', 'rotse'], ['بدها', 'biddha', 'بده', 'biddo']),
          c('need', ['צריכה', 'tsrikha', 'צריך', 'tsarikh'], ['بتحتاج', 'btiḥtāj', 'بيحتاج', 'byiḥtāj']),
          c('know', ['יודעת', 'yoda\'at', 'יודע', 'yode\'a'], ['بتعرف', 'btiʿraf', 'بيعرف', 'byiʿraf']),
          c('understand', ['מבינה', 'mevina', 'מבין', 'mevin'], ['بتفهم', 'btifham', 'بيفهم', 'byifham']),
          c('speak', ['מדברת', 'medaberet', 'מדבר', 'medaber'], ['بتحكي', 'btiḥki', 'بيحكي', 'byiḥki']),
          c('learn', ['לומדת', 'lomedet', 'לומד', 'lomed'], ['بتتعلّم', 'btitʿallam', 'بيتعلّم', 'byitʿallam']),
          c('go', ['הולכת', 'holekhet', 'הולך', 'holekh'], ['بتروح', 'btrūḥ', 'بيروح', 'byrūḥ']),
          c('come', ['באה', 'ba\'a', 'בא', 'ba'], ['بتيجي', 'btīji', 'بييجي', 'byīji']),
          c('give', ['נותנת', 'notenet', 'נותן', 'noten'], ['بتعطي', 'btiʿṭi', 'بيعطي', 'byiʿṭi']),
          c('take', ['לוקחת', 'lokakhat', 'לוקח', 'lokeakh'], ['بتاخد', 'btākhod', 'بياخد', 'byākhod']),
        ],
      },
      {
        name: 'More everyday verbs',
        cards: [
          c('see', ['רואה', 'ro\'a', 'רואה', 'ro\'e'], ['بتشوف', 'btshūf', 'بيشوف', 'byshūf'], { he: 'Hebrew spelling is identical; pronunciation differs.' }),
          c('hear', ['שומעת', 'shoma\'at', 'שומע', 'shomea'], ['بتسمع', 'btismaʿ', 'بيسمع', 'byismaʿ']),
          c('say', ['אומרת', 'omeret', 'אומר', 'omer'], ['بتقول', 'btqūl', 'بيقول', 'byqūl']),
          c('ask', ['שואלת', 'sho\'elet', 'שואל', 'sho\'el'], ['بتسأل', 'btisʾal', 'بيسأل', 'byisʾal']),
          c('work', ['עובדת', 'ovedet', 'עובד', 'oved'], ['بتشتغل', 'btishtighel', 'بيشتغل', 'byishtighel']),
          c('help', ['עוזרת', 'ozeret', 'עוזר', 'ozer'], ['بتساعد', 'btsāʿed', 'بيساعد', 'bysāʿed']),
          c('open', ['פותחת', 'potakhat', 'פותח', 'poteakh'], ['بتفتح', 'btiftaḥ', 'بيفتح', 'byiftaḥ']),
          c('close', ['סוגרת', 'sogeret', 'סוגר', 'soger'], ['بتسكّر', 'btsakker', 'بيسكّر', 'bysakker'], { ar: 'The same verb ends a phone call.' }),
          c('sit', ['יושבת', 'yoshevet', 'יושב', 'yoshev'], ['بتقعد', 'btuqʿod', 'بيقعد', 'byuqʿod']),
          c('love', ['אוהבת', 'ohevet', 'אוהב', 'ohev'], ['بتحبّ', 'btḥibb', 'بيحبّ', 'byḥibb']),
        ],
      },
      {
        name: 'In the past',
        cards: [
          c('I went', ['הלכתי', 'halakhti'], ['رحت', 'ruḥt'], { he: 'Past tense in the first person is the same for a woman and a man in both languages, so nothing in this deck splits.' }),
          c('I ate', ['אכלתי', 'akhalti'], ['أكلت', 'akalt']),
          c('I drank', ['שתיתי', 'shatiti'], ['شربت', 'sharibt']),
          c('I said', ['אמרתי', 'amarti'], ['قلت', 'qult']),
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
          c('train', ['רכבת', 'rakevet'], ['قطار', 'qiṭār']),
          c('car', ['אוטו', 'oto'], ['سيارة', 'sayyāra'], { ar: 'Everyday spoken form.' }),
          c('taxi', ['מונית', 'monit'], ['تكسي', 'taksi']),
          c('bicycle', ['אופניים', 'ofanayim'], ['بسكليت', 'baskalēt'], { ar: 'Common Palestinian spoken word.' }),
          c('motorcycle', ['אופנוע', 'ofnoa'], ['دراجة نارية', 'darrāje nāriyye']),
          c('station', ['תחנה', 'takhana'], ['محطّة', 'maḥaṭṭa']),
          c('bus stop', ['תחנת אוטובוס', 'takhanat otobus'], ['محطّة باص', 'maḥaṭṭet bāṣ']),
          c('ticket', ['כרטיס', 'kartis'], ['تذكرة', 'tazkara']),
          c('road', ['כביש', 'kvish'], ['طريق', 'ṭarīq']),
        ],
      },
      {
        name: 'On the road',
        cards: [
          c('driver', ['נהגת', 'nahaget', 'נהג', 'nahag'], ['سائقة', 'sāʾiqa', 'سائق', 'sāʾeq']),
          c('traffic jam', ['פקק תנועה', 'pkak tnua'], ['زحمة', 'zaḥme'], { ar: 'Literally "crowding"; used of traffic and of crowds alike.' }),
          c('traffic light', ['רמזור', 'ramzor'], ['إشارة', 'ishāra']),
          c('petrol', ['דלק', 'delek'], ['بنزين', 'banzīn']),
          c('petrol station', ['תחנת דלק', 'takhanat delek'], ['محطّة بنزين', 'maḥaṭṭet banzīn']),
          c('parking', ['חנייה', 'khanaya'], ['موقف', 'mawqaf']),
          c('bridge', ['גשר', 'gesher'], ['جسر', 'jisr']),
          c('junction', ['צומת', 'tsomet'], ['مفرق', 'mafraq']),
          c('seat belt', ['חגורת בטיחות', 'khagorat betikhut'], ['حزام الأمان', 'ḥzām el-amān']),
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
          c('hotel', ['מלון', 'malon'], ['فندق', 'funduq']),
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
          c('near', ['קרובה', 'krova', 'קרוב', 'karov'], ['قريبة', 'qarībe', 'قريب', 'qarīb']),
          c('far', ['רחוקה', 'rekhoka', 'רחוק', 'rakhok'], ['بعيدة', 'baʿīde', 'بعيد', 'baʿīd']),
          c('up', ['למעלה', 'lema\'la'], ['فوق', 'fōq']),
          c('down', ['למטה', 'lemata'], ['تحت', 'taḥt']),
          c('behind', ['מאחור', 'me\'akhore'], ['ورا', 'wara']),
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
          c('opposite', ['מול', 'mul'], ['مقابل', 'muqābel']),
          c('between', ['בין', 'bein'], ['بين', 'bēn']),
          c('at the corner', ['בפינה', 'bapina'], ['عالزاوية', 'ʿaz-zāwye']),
          c('after the traffic light', ['אחרי הרמזור', 'akharei haramzor'], ['بعد الإشارة', 'baʿd el-ishāra']),
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
          c('park', ['פארק', 'park'], ['حديقة', 'ḥadīqa']),
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
          c('market', ['שוק', 'shuk'], ['سوق', 'sūq']),
          c('price', ['מחיר', 'mekhir'], ['سعر', 'siʿr']),
          c('money', ['כסף', 'kesef'], ['مصاري', 'maṣāri'], { ar: 'Common Palestinian spoken word.' }),
          c('cash', ['מזומן', 'mezuman'], ['كاش', 'kāsh'], { ar: 'Common spoken loanword.' }),
          c('card', ['כרטיס', 'kartis'], ['كرت', 'kart'], { ar: 'Payment or general card.' }),
          c('receipt', ['קבלה', 'kabala'], ['وصل', 'waṣl']),
          c('bag', ['שקית', 'sakit'], ['كيس', 'kīs'], { ar: 'Shopping bag.' }),
          c('size', ['מידה', 'mida'], ['قياس', 'qyās'], { ar: 'Clothing or product size.' }),
        ],
      },
      {
        name: 'Clothes',
        cards: [
          c('shirt', ['חולצה', 'khultsa'], ['قميص', 'qamīṣ']),
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
          c('can I try it on?', ['אפשר למדוד', 'efshar limdod'], ['ممكن أقيسه', 'mumkin aqīso']),
          c('discount', ['הנחה', 'hanakha'], ['خصم', 'khaṣm']),
          c('change (money back)', ['עודף', 'odef'], ['باقي', 'bāqi']),
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
          c('app / application', ['אפליקציה', 'aplikatsya'], ['تطبيق', 'taṭbīq'], { ar: 'Software application.' }),
        ],
      },
      {
        name: 'Jobs and trades',
        cards: [
          c('teacher', ['מורה', 'mora', 'מורה', 'more'], ['معلّمة', 'mʿallme', 'معلّم', 'mʿallem'], { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'معلّم is the schoolteacher; أستاذ is also used as a title.' }),
          c('cook', ['טבחית', 'tabakhit', 'טבח', 'tabakh'], ['طبّاخة', 'ṭabbākha', 'طبّاخ', 'ṭabbākh']),
          c('farmer', ['חקלאית', 'khakla\'it', 'חקלאי', 'khaklai'], ['فلّاحة', 'fallāḥa', 'فلّاح', 'fallāḥ']),
          c('carpenter', ['נגרית', 'nagarit', 'נגר', 'nagar'], ['نجّارة', 'najjāra', 'نجّار', 'najjār']),
          c('builder', ['בנאית', 'bana\'it', 'בנאי', 'banai'], ['بنّاية', 'bannāye', 'بنّا', 'banna']),
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
          c('pen', ['עט', 'et'], ['قلم', 'qalam']),
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
