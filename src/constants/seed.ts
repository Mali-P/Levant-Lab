import type { ArabicDialect, GenderedForms } from '../types';

export type SeedSide = {
  script: string;
  transliteration: string;
  forms?: GenderedForms;
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

function side(word: Word): SeedSide {
  if (word.length === 2) return { script: word[0], transliteration: word[1] };
  const [fScript, fTranslit, mScript, mTranslit] = word;
  return {
    // The feminine form is the headline: this app is written for a woman, so
    // the word she says — or is spoken to with — is the one shown first, and
    // anything that reads only `script` still gets a complete, correct word.
    script: fScript,
    transliteration: fTranslit,
    forms: {
      feminine: { script: fScript, transliteration: fTranslit },
      masculine: { script: mScript, transliteration: mTranslit },
    },
  };
}

/** One starter card. Hebrew and Arabic are each a shared form or an F/M pair. */
function c(
  english: string,
  hebrew: Word,
  arabic: Word,
  notes?: { he?: string; ar?: string },
): SeedCard {
  return {
    english,
    hebrew: { ...side(hebrew), notes: notes?.he },
    arabic: { ...side(arabic), dialect: PAL, notes: notes?.ar },
  };
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
 * Where a card carries a feminine/masculine pair, the gender is the person
 * being *spoken to*, not the speaker — a greeting changes its ending to match
 * whoever it is aimed at — except "good / fine", where the ending is the
 * speaker's own. The feminine form is the headline, as everywhere else in the
 * starter set.
 *
 * Several pairs are written identically because the ـك ending goes unvowelled
 * in everyday writing, so only the transliteration tells كيفِك from كيفَك.
 */
const GREETING_DECKS: SeedDeck[] = [
  {
    name: 'Hello and goodbye',
    cards: [
      c('hello', ['שלום', 'shalom'], ['مرحبا', 'marḥaba'], { ar: 'The everyday spoken form; the written مرحباً is textbook Arabic.' }),
      c('hello (warm reply)', ['שלום שלום', 'shalom shalom'], ['مرحبتين', 'marḥabtēn'], { ar: 'Literally "two hellos" — a common reply to مرحبا, though مرحبا or أهلا can come back just as well.' }),
      c('hi / hey', ['אהלן', 'ahalan'], ['أهلا', 'ahlan'], { he: 'Borrowed straight from Arabic and just as casual in Hebrew.' }),
      c('welcome', ['ברוכה הבאה', 'brukha haba\'a', 'ברוך הבא', 'barukh haba'], ['أهلا وسهلا', 'ahlan w sahlan'], { ar: 'Said to a guest arriving; the Arabic form does not change.' }),
      c('peace be upon you', ['שלום עליכם', 'shalom ʿalekhem'], ['السلام عليكم', 'as-salāmu ʿalēkum'], { ar: 'A little more formal or religious than مرحبا, and always welcome.' }),
      c('and upon you peace (reply)', ['עליכם שלום', 'ʿalekhem shalom'], ['وعليكم السلام', 'w ʿalēkum as-salām']),
      c('goodbye', ['להתראות', 'lehitra\'ot'], ['مع السلامة', 'maʿ as-salāme'], { ar: 'Said to the person leaving.' }),
      c('bye', ['ביי', 'bay'], ['يلا باي', 'yalla bāy'], { ar: 'Very casual, and extremely common.' }),
      c('see you later', ['נתראה', 'nitra\'e'], ['بشوفك بعدين', 'bashūfik baʿdēn', 'بشوفك بعدين', 'bashūfak baʿdēn'], { ar: 'The ending follows whoever you are speaking to.' }),
      c('take care', ['תשמרי על עצמך', 'tishmeri ʿal ʿatsmekh', 'תשמור על עצמך', 'tishmor ʿal ʿatsmekha'], ['ديري بالك', 'dīri bālik', 'دير بالك', 'dīr bālak'], { ar: 'Literally "mind yourself" — a warm way to close a conversation.' }),
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
      c('good evening (reply)', ['ערב טוב גם לך', 'erev tov gam lakh'], ['مسا النور', 'masa en-nūr'], { he: 'Hebrew simply returns the greeting.' }),
      c('good night', ['לילה טוב', 'layla tov'], ['تصبحي على خير', 'tiṣbaḥi ʿala khēr', 'تصبح على خير', 'tiṣbaḥ ʿala khēr'], { ar: 'Literally "may you wake to goodness"; said on parting for the night.' }),
      c('good night (reply)', ['לילה טוב גם לך', 'layla tov gam lakh'], ['وإنتِ من أهل الخير', 'w inti min ahl el-khēr', 'وإنت من أهل الخير', 'w inte min ahl el-khēr'], { ar: 'The set answer to تصبح على خير.' }),
      c('sweet dreams', ['חלומות פז', 'khalomot paz'], ['أحلام سعيدة', 'aḥlām saʿīde']),
      c('have a nice day', ['יום נעים', 'yom naʿim'], ['نهارك سعيد', 'nahārik saʿīd', 'نهارك سعيد', 'nahārak saʿīd']),
    ],
  },
  {
    name: 'How are you?',
    cards: [
      c('how are you?', ['מה שלומך', 'ma shlomekh', 'מה שלומך', 'ma shlomkha'], ['كيفك', 'kīfik', 'كيفك', 'kīfak'], { ar: 'The one greeting you will hear most; the ending matches the person you ask.' }),
      c('how is it going?', ['איך הולך', 'ekh holekh'], ['كيف الأمور', 'kīf el-umūr'], { ar: 'Literally "how are the matters" — asked of anyone.' }),
      c('what\'s new?', ['מה נשמע', 'ma nishmaʿ'], ['شو أخبارك', 'shū akhbārik', 'شو أخبارك', 'shū akhbārak'], { ar: 'Literally "what is your news".' }),
      c('good / fine', ['בסדר', 'beseder'], ['منيحة', 'mnīḥa', 'منيح', 'mnīḥ'], { ar: 'Here the ending follows the speaker: a woman says منيحة.' }),
      c('thank God (I am well)', ['ברוך השם', 'barukh hashem'], ['الحمد لله', 'el-ḥamdulillah'], { ar: 'The usual answer to كيفك, whether or not the speaker is religious.' }),
      c('and you?', ['ואת', 've\'at', 'ואתה', 've\'ata'], ['وإنتِ', 'w inti', 'وإنت', 'w inte']),
      c('thank you', ['תודה', 'toda'], ['شكرا', 'shukran']),
      c('you\'re welcome', ['בבקשה', 'bevakasha'], ['ولا يهمّك', 'wala yhimmik', 'ولا يهمّك', 'wala yhimmak'], { ar: 'Literally "don\'t worry about it"; عفوا is the more formal option.' }),
      c('please', ['בבקשה', 'bevakasha'], ['من فضلك', 'min faḍlik', 'من فضلك', 'min faḍlak']),
      c('excuse me / sorry', ['סליחה', 'slikha'], ['لو سمحتي', 'law samaḥti', 'لو سمحت', 'law samaḥt'], { ar: 'Getting someone\'s attention; آسف is the apology.' }),
    ],
  },
];

/**
 * How people are addressed, and the words that stand in for their names.
 *
 * The titles come in feminine/masculine pairs where the language marks one, and
 * the gender is the person being addressed. Arabic uses several of these — دكتور,
 * مهندس, أستاذ — in front of a first name where English would reach for "Mr".
 *
 * In the pronoun deck the pair is again the person spoken to, or the owner in
 * the case of "hers / his". Spoken Palestinian Arabic collapses the plurals to
 * one form each, so إنتو and هُمّ carry no pair while Hebrew still splits them.
 * Where a pair exists the feminine form is the headline.
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
      c('madam / sir (polite address)', ['גברתי', 'gvirti', 'אדוני', 'adoni'], ['حضرتك', 'ḥaḍirtik', 'حضرتك', 'ḥaḍirtak'], { ar: 'Literally "your presence"; the ending follows the person spoken to and goes unvowelled in everyday writing.' }),
      c('queen / king', ['מלכה', 'malka', 'מלך', 'melekh'], ['ملكة', 'malake', 'ملك', 'malik']),
      c('princess / prince', ['נסיכה', 'nesikha', 'נסיך', 'nasikh'], ['أميرة', 'amīre', 'أمير', 'amīr']),
      c('president', ['נשיאה', 'nesi\'a', 'נשיא', 'nasi'], ['رئيسة', 'raʾīse', 'رئيس', 'raʾīs']),
    ],
  },
  {
    name: 'Personal pronouns',
    cards: [
      c('I', ['אני', 'ani'], ['أنا', 'ana'], { ar: 'One word, whoever is speaking.' }),
      c('you (one person)', ['את', 'at', 'אתה', 'ata'], ['إنتِ', 'inti', 'إنت', 'inte']),
      c('she', ['היא', 'hi'], ['هيّ', 'hiyye']),
      c('he', ['הוא', 'hu'], ['هوّ', 'huwwe']),
      c('we', ['אנחנו', 'anakhnu'], ['إحنا', 'iḥna']),
      c('you (more than one)', ['אתן', 'aten', 'אתם', 'atem'], ['إنتو', 'intu'], { ar: 'Spoken Palestinian Arabic uses one plural for a group of any gender.' }),
      c('they', ['הן', 'hen', 'הם', 'hem'], ['هُمّ', 'humme'], { ar: 'Again one form; Hebrew keeps a feminine and a masculine plural.' }),
      c('my', ['שלי', 'sheli'], ['تبعي', 'tabaʿi'], { ar: 'Possession is usually a suffix — بيتي "my house" — and تبعي is the form that stands on its own.' }),
      c('your', ['שלך', 'shelakh', 'שלך', 'shelkha'], ['تبعك', 'tabaʿik', 'تبعك', 'tabaʿak'], { he: 'Hebrew spelling is identical; pronunciation differs.', ar: 'Written the same either way; only the ending is said differently.' }),
      c('hers / his', ['שלה', 'shela', 'שלו', 'shelo'], ['تبعها', 'tabaʿha', 'تبعه', 'tabaʿo'], { ar: 'Here the ending follows the owner, not the person spoken to.' }),
    ],
  },
];

/**
 * The learner's own category.
 *
 * Unlike every other starter category this one is a starting point rather than
 * a finished set: sentences added from inside the app land in "My sentences"
 * beside these, and nothing else in the codebase treats them as strays. The
 * five below were written out by hand before the app had anywhere to put them
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
        ['אני רוצה לעזור לך בבית שלך אמא', 'ani rotse laʿazor lakh babayit shelakh ima'],
        ['أنا بدي أساعدك بالبيت ماما', 'ana biddi asāʿdek bil-bēt māma'],
        { ar: 'أساعدِك is the feminine "help you"; drop بالبيت and it is simply "I want to help you".' },
      ),
      c(
        'do you want?',
        ['את רוצה', 'at rotsa', 'אתה רוצה', 'ata rotse'],
        ['بدِّك', 'biddek', 'بدَّك', 'biddak'],
        { ar: 'Written بدك either way — only the transliteration tells the two endings apart.' },
      ),
    ],
  },
];

/**
 * Starter content: twenty categories, one ten-card deck each except the
 * greetings, which take three, the titles and pronouns, which take two, and the
 * numbers, which run to a hundred. Words come
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
    ],
  },
  {
    name: 'Titles and pronouns',
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
          c('stop!', ['עצרי', 'itsri', 'עצור', 'atsor'], ['وقّفي', 'waʾʾfi', 'وقّف', 'waʾʾef']),
          c('call!', ['תתקשרי', 'titkasheri', 'תתקשר', 'titkasher'], ['اتّصلي', 'ittiṣli', 'اتّصل', 'ittiṣil']),
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
    ],
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
    ],
  },
  // Last, so the learner's own sentences sit at the end of the ladder rather
  // than in front of the words the starter set teaches first.
  {
    name: CUSTOM_CATEGORY,
    icon: '✍️',
    decks: CUSTOM_DECKS,
  },
];
