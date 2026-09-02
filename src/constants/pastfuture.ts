import {
  c,
  ofSpeaker,
  stageDecks,
  toL,
  both4,
  type SeedCard,
  type SeedCategory,
  type SeedDeck,
} from './seed';

/**
 * Past & Future: the same things she can already say, moved off the present.
 *
 * Every level before this one lives at the moment of speaking. She can say "I
 * work", "I'm going there", "I'm tired" — and then somebody asks what she did
 * yesterday and the whole conversation stops. This level is that missing axis,
 * and it is a standalone level like the four before it: its progress is its
 * own, it gates nothing, and nothing gates it — see `isPastFutureCategory` in
 * `features/review/languagePolicy`, which is what keeps the areas apart.
 *
 * **A lesson is a deck, and one line is a card.** No new study engine: the
 * ladder deals a deck in its own order and grows the active set, which is
 * exactly how a lesson should be met. Where a lesson genuinely grows one
 * sentence — "I went" → "I went there" → "I went there yesterday" — the cards
 * are ordered so that growth is what the lesson view draws, reusing
 * `addedPiece` from Sentence Building rather than authoring the highlight by
 * hand.
 *
 * **Where a question is the point, the card carries a `cue`.** Answering "what
 * did you do yesterday?" is not the same skill as producing "I worked", and the
 * cue is what makes the difference practisable — the same machinery
 * Conversation Flow introduced, used here for the same reason.
 *
 * **No conjugation tables.** The spec is explicit and so is this file: she
 * meets useful whole sentences first, and the pattern is left to become visible
 * on its own. First person carries the level; the other persons appear only
 * where they arrive naturally in a question or an answer.
 *
 * **Gender, in this level specifically.** Both languages drop gender from the
 * first-person past — halakhti and ruḥt are said by anybody — so a past verb
 * card is a single form in both languages, exactly as the course's own "In the
 * past" deck already has it. What is still gendered is everything hanging off
 * it: a predicate adjective after hayiti / kunt, and every active participle
 * (rāyḥa, nāyme, sākne, ovedet). Those take `ofSpeaker`, because they are hers.
 * A cue is the reverse-looking case and takes `askedOfHer` — see below.
 *
 * **The Arabic is spoken Palestinian, not a paradigm.** Past is the plain
 * suffix conjugation as Palestinians say it (ruḥt, akalt, ijīt, fhimt);
 * negation is ما; future is رح plus the imperfect; intention is بدّي; ongoing
 * past is كنت plus the b-imperfect, or كنت عم plus it where the "at that
 * moment" reading is the point. Nothing here is derived from MSA rules.
 *
 * **Vocabulary is borrowed, not invented.** The past forms match the course's
 * "In the past" deck word for word — ruḥt, akalt, sharibt, ʾult, shuft, simiʿt,
 * nimt, ishtaghalt, ijīt, fhimt — and the time words, places and adjectives
 * come from Basics and the phrase decks: imbāriḥ, bukra, hallaʾ, baʿdēn, hnāk,
 * bil-bēt, iṣ-ṣubḥ, taʿbān, mnīḥ. The new thing being taught is time.
 */

/**
 * A line spoken *to* the learner, whose two forms her own gender picks between.
 *
 * The same helper Conversation Flow authors its cues with, and it needs the
 * same note. "What did you do yesterday?" is shū ʿamalti to a woman and shū
 * ʿamalt to a man, whoever is asking — so the ending follows her, and the
 * app's `speaker` agreement is precisely "her own gender". Using `toL` here
 * would show her the form somebody else would be asked in.
 */
const askedOfHer = ofSpeaker;

/** Shorthand for the speaker-gendered forms her own lines carry. */
const sp = ofSpeaker;

/**
 * How many flawless runs a lesson asks for. The same light bar a sentence
 * chain and an exchange ask: this is a bridge to speaking, and it gates
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

// --- 1. Yesterday and before -------------------------------------------------

const WHEN_IT_HAPPENED: SeedDeck[] = [
  lesson('When it happened', [
    c('yesterday', ['אתמול', 'etmol'], ['إمبارح', 'imbāriḥ']),
    c('yesterday morning', ['אתמול בבוקר', 'etmol ba-boker'], ['إمبارح الصبح', 'imbāriḥ iṣ-ṣubḥ']),
    c('last night', ['אתמול בלילה', 'etmol ba-layla'], ['إمبارح بالليل', 'imbāriḥ bil-lēl']),
    c('the day before yesterday', ['שלשום', 'shilshom'], ['أوّل إمبارح', 'awwal imbāriḥ']),
    c('this morning', ['הבוקר', 'ha-boker'], ['اليوم الصبح', 'il-yōm iṣ-ṣubḥ']),
    c('earlier', ['קודם', 'kodem'], ['قبل شوي', 'ʾabl shwayy']),
    c('last week', ['בשבוע שעבר', 'ba-shavua she-avar'], ['الأسبوع اللي فات', 'il-usbūʿ illi fāt']),
    c('an hour ago', ['לפני שעה', "lifnei sha'a"], ['قبل ساعة', 'ʾabl sāʿa']),
  ]),
  lesson('I worked yesterday', [
    c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt']),
    c('I worked yesterday', ['עבדתי אתמול', 'avadti etmol'], ['اشتغلت إمبارح', 'ishtaghalt imbāriḥ']),
    c('I worked yesterday morning', ['עבדתי אתמול בבוקר', 'avadti etmol ba-boker'], ['اشتغلت إمبارح الصبح', 'ishtaghalt imbāriḥ iṣ-ṣubḥ']),
  ]),
  lesson('I went there yesterday', [
    c('I went', ['הלכתי', 'halakhti'], ['رحت', 'ruḥt'],
      { he: 'The first-person past carries no gender in either language, so this is one word for everybody.' }),
    c('I went there', ['הלכתי לשם', 'halakhti lesham'], ['رحت لهناك', 'ruḥt la-hnāk']),
    c('I went there yesterday', ['הלכתי לשם אתמול', 'halakhti lesham etmol'], ['رحت لهناك إمبارح', 'ruḥt la-hnāk imbāriḥ']),
  ]),
  lesson('Putting the time in', [
    c('I ate earlier', ['אכלתי קודם', 'akhalti kodem'], ['أكلت قبل شوي', 'akalt ʾabl shwayy']),
    c('I saw her last night', ['ראיתי אותה אתמול בלילה', "ra'iti ota etmol ba-layla"], ['شفتها إمبارح بالليل', 'shuftha imbāriḥ bil-lēl']),
    c('I studied this morning', ['למדתי הבוקר', 'lamadti ha-boker'], ['درست اليوم الصبح', 'darast il-yōm iṣ-ṣubḥ']),
    c('I slept late', ['ישנתי עד מאוחר', "yashanti ad me'ukhar"], ['نمت لوقت متأخّر', 'nimt la-waʾt mitʾakhkhir']),
    c('I came home at seven', ['חזרתי הביתה בשבע', 'khazarti habayta be-sheva'], ['رجعت عالبيت الساعة سبعة', 'rjiʿt ʿal-bēt is-sāʿa sabʿa']),
    c('I went there on Monday', ['הלכתי לשם ביום שני', 'halakhti lesham be-yom sheni'], ['رحت لهناك يوم الاتنين', 'ruḥt la-hnāk yōm it-tnēn']),
  ]),
];

// --- 2. What I did -----------------------------------------------------------

const WHAT_I_DID: SeedDeck[] = [
  lesson('The first ten', [
    c('I came', ['באתי', 'bati'], ['إجيت', 'ijīt']),
    c('I ate', ['אכלתי', 'akhalti'], ['أكلت', 'akalt']),
    c('I drank', ['שתיתי', 'shatiti'], ['شربت', 'sharibt']),
    c('I slept', ['ישנתי', 'yashanti'], ['نمت', 'nimt']),
    c('I studied', ['למדתי', 'lamadti'], ['درست', 'darast']),
    c('I read it', ['קראתי את זה', 'karati et ze'], ['قريته', "ʾarēto"]),
    c('I saw', ['ראיתי', "ra'iti"], ['شفت', 'shuft']),
    c('I heard', ['שמעתי', 'shamati'], ['سمعت', 'simiʿt']),
    c('I said it', ['אמרתי את זה', 'amarti et ze'], ['قلته', "ʾulto"]),
    c('I understood', ['הבנתי', 'hevanti'], ['فهمت', 'fhimt']),
  ]),
  lesson('Ten more', [
    c('I spoke', ['דיברתי', 'dibarti'], ['حكيت', 'ḥakēt']),
    c('I asked', ['שאלתי', "sha'alti"], ['سألت', 'saʾalt']),
    c('I learned it', ['למדתי את זה', 'lamadti et ze'], ['تعلّمته', 'tʿallamto']),
    c('I did it', ['עשיתי את זה', 'asiti et ze'], ['عملته', 'ʿamalto']),
    c('I stayed', ['נשארתי', "nish'arti"], ['ضلّيت', 'ḍallēt']),
    c('I waited', ['חיכיתי', 'khikiti'], ['استنّيت', 'stannēt']),
    c('I helped', ['עזרתי', 'azarti'], ['ساعدت', 'sāʿadt']),
    c('I forgot', ['שכחתי', 'shakhakhti'], ['نسيت', 'nsīt']),
    c('I remembered', ['נזכרתי', 'nizkarti'], ['تذكّرت', 'tzakkart']),
    c('I tried', ['ניסיתי', 'nisiti'], ['جرّبت', 'jarrabt']),
  ]),
  lesson('Wanting and needing, yesterday', [
    c('I wanted', ['רציתי', 'ratsiti'], ['كان بدّي', 'kān biddi'],
      { ar: 'Palestinian says "it was my wanting": كان in front of the ordinary بدّي.' }),
    c('I wanted to go', ['רציתי ללכת', 'ratsiti lalekhet'], ['كان بدّي أروح', 'kān biddi arūḥ']),
    c('I needed', sp('הייתי צריכה', 'hayiti tsrikha', 'הייתי צריך', 'hayiti tsarikh'), ['كان لازمني', 'kān lāzimni']),
    c('I knew', ['ידעתי', 'yadati'], ['كنت بعرف', 'kunt baʿref'],
      { ar: 'كنت plus the present بعرف: knowing is a state, so Palestinian frames it as one.' }),
    c('I liked it', ['אהבתי את זה', 'ahavti et ze'], ['عجبني', 'ʿajabni'],
      { ar: 'Literally "it pleased me" — the thing liked is the subject.' }),
  ]),
  lesson('Where I did it', [
    c('I went home', ['הלכתי הביתה', 'halakhti habayta'], ['رحت عالبيت', 'ruḥt ʿal-bēt']),
    c('I went to work', ['הלכתי לעבודה', 'halakhti la-avoda'], ['رحت عالشغل', 'ruḥt ʿash-shughul']),
    c('I stayed home', ['נשארתי בבית', "nish'arti babayit"], ['ضلّيت بالبيت', 'ḍallēt bil-bēt']),
    c('I ate at home', ['אכלתי בבית', 'akhalti babayit'], ['أكلت بالبيت', 'akalt bil-bēt']),
    c('I worked there', ['עבדתי שם', 'avadti sham'], ['اشتغلت هناك', 'ishtaghalt hnāk']),
    c('I studied here', ['למדתי פה', 'lamadti po'], ['درست هون', 'darast hōn']),
    c('I saw him at work', ['ראיתי אותו בעבודה', "ra'iti oto ba-avoda"], ['شفته بالشغل', 'shufto bish-shughul']),
  ]),
  lesson('Who I did it with', [
    c('I saw her', ['ראיתי אותה', "ra'iti ota"], ['شفتها', 'shuftha']),
    c('I saw him', ['ראיתי אותו', "ra'iti oto"], ['شفته', 'shufto']),
    c('I went with her', ['הלכתי איתה', 'halakhti ita'], ['رحت معها', 'ruḥt maʿha']),
    c('I went with him', ['הלכתי איתו', 'halakhti ito'], ['رحت معه', 'ruḥt maʿo']),
    c('I spoke to her', ['דיברתי איתה', 'dibarti ita'], ['حكيت معها', 'ḥakēt maʿha']),
    c('I spoke to him', ['דיברתי איתו', 'dibarti ito'], ['حكيت معه', 'ḥakēt maʿo']),
    c('I helped her', ['עזרתי לה', 'azarti la'], ['ساعدتها', 'sāʿadtha']),
    c('I helped him', ['עזרתי לו', 'azarti lo'], ['ساعدته', 'sāʿadto']),
    c('I went with my friend', ['הלכתי עם החברה שלי', 'halakhti im ha-khavera sheli'], ['رحت مع صاحبتي', 'ruḥt maʿ ṣāḥibti']),
    c('I saw my family', ['ראיתי את המשפחה שלי', "ra'iti et ha-mishpakha sheli"], ['شفت عيلتي', 'shuft ʿēlti']),
  ]),
];

// --- 3. How I was ------------------------------------------------------------

const HOW_I_WAS: SeedDeck[] = [
  lesson('I was …', [
    c('I was tired', sp('הייתי עייפה', 'hayiti ayefa', 'הייתי עייף', 'hayiti ayef'), sp('كنت تعبانة', 'kunt taʿbāne', 'كنت تعبان', 'kunt taʿbān'),
      { he: 'הייתי never changes; the word after it is yours.' }),
    c('I was hungry', sp('הייתי רעבה', "hayiti re'eva", 'הייתי רעב', "hayiti ra'ev"), sp('كنت جوعانة', 'kunt jūʿāne', 'كنت جوعان', 'kunt jūʿān')),
    c('I was sick', sp('הייתי חולה', 'hayiti khola', 'הייתי חולה', 'hayiti khole'), sp('كنت مريضة', 'kunt marīḍa', 'كنت مريض', 'kunt marīḍ'), SAID),
    c('I was busy', sp('הייתי עסוקה', 'hayiti asuka', 'הייתי עסוק', 'hayiti asuk'), sp('كنت مشغولة', 'kunt mashghūle', 'كنت مشغول', 'kunt mashghūl')),
  ]),
  lesson('Where I was', [
    c('I was home', ['הייתי בבית', 'hayiti babayit'], ['كنت بالبيت', 'kunt bil-bēt']),
    c('I was there', ['הייתי שם', 'hayiti sham'], ['كنت هناك', 'kunt hnāk']),
    c('I was at work', ['הייתי בעבודה', 'hayiti ba-avoda'], ['كنت بالشغل', 'kunt bish-shughul']),
    c('I was with her', ['הייתי איתה', 'hayiti ita'], ['كنت معها', 'kunt maʿha']),
  ]),
  lesson('How it was', [
    c('it was good', ['היה טוב', 'haya tov'], ['كان منيح', 'kān mnīḥ']),
    c('it was bad', ['לא היה טוב', 'lo haya tov'], ['ما كان منيح', 'mā kān mnīḥ'],
      { he: 'Spoken Hebrew says "it was not good" far more often than "it was bad".',
        ar: 'The same move in Palestinian: مش منيح, or ما كان منيح in the past.' }),
    c('it was hot', ['היה חם', 'haya kham'], ['كان شوب', 'kān shōb'],
      { ar: 'شوب is the weather word; سخن is a hot thing you touch.' }),
    c('it was cold', ['היה קר', 'haya kar'], ['كان برد', 'kān bard']),
    c('it was nice', ['היה נחמד', 'haya nekhmad'], ['كان حلو', 'kān ḥilu']),
  ]),
];

// --- 4. What I did not do ----------------------------------------------------

const WHAT_I_DID_NOT: SeedDeck[] = [
  lesson('The plain no', [
    c("I didn't go", ['לא הלכתי', 'lo halakhti'], ['ما رحت', 'mā ruḥt'],
      { he: 'One word in front of the past verb, and nothing else changes.',
        ar: 'ما in front of the past verb, and nothing else changes.' }),
    c("I didn't work", ['לא עבדתי', 'lo avadti'], ['ما اشتغلت', 'mā ishtaghalt']),
    c("I didn't eat", ['לא אכלתי', 'lo akhalti'], ['ما أكلت', 'mā akalt']),
    c("I didn't come", ['לא באתי', 'lo bati'], ['ما إجيت', 'mā ijīt']),
    c("I didn't see it", ['לא ראיתי את זה', "lo ra'iti et ze"], ['ما شفته', 'mā shufto']),
  ]),
  lesson('The ones you need most', [
    c("I didn't understand", ['לא הבנתי', 'lo hevanti'], ['ما فهمت', 'mā fhimt']),
    c("I didn't know", ['לא ידעתי', 'lo yadati'], ['ما كنت بعرف', 'mā kunt baʿref']),
    c("I didn't want to", ['לא רציתי', 'lo ratsiti'], ['ما كان بدّي', 'mā kān biddi']),
    c("I didn't have time", ['לא היה לי זמן', 'lo haya li zman'], ['ما كان عندي وقت', 'mā kān ʿindi waʾt']),
    c("I didn't do much", ['לא עשיתי הרבה', 'lo asiti harbe'], ['ما عملت إشي كتير', 'mā ʿamalt ishi ktīr']),
  ]),
  lesson('I was not', [
    c("I wasn't tired", sp('לא הייתי עייפה', 'lo hayiti ayefa', 'לא הייתי עייף', 'lo hayiti ayef'), sp('ما كنت تعبانة', 'mā kunt taʿbāne', 'ما كنت تعبان', 'mā kunt taʿbān')),
    c("I wasn't there", ['לא הייתי שם', 'lo hayiti sham'], ['ما كنت هناك', 'mā kunt hnāk']),
    c("I wasn't at home", ['לא הייתי בבית', 'lo hayiti babayit'], ['ما كنت بالبيت', 'mā kunt bil-bēt']),
  ]),
];

// --- 5. Asking about yesterday -----------------------------------------------

const WHAT_DID_YOU_DO = c(
  'What did you do yesterday?',
  askedOfHer('מה עשית אתמול', 'ma asit etmol', 'מה עשית אתמול', 'ma asita etmol'),
  askedOfHer('شو عملتي إمبارح', 'shū ʿamalti imbāriḥ', 'شو عملت إمبارح', 'shū ʿamalt imbāriḥ'),
  SAID,
);

const WHERE_DID_YOU_GO = c(
  'Where did you go?',
  askedOfHer('לאן הלכת', "le'an halakht", 'לאן הלכת', "le'an halakhta"),
  askedOfHer('وين رحتي', 'wēn ruḥti', 'وين رحت', 'wēn ruḥt'),
  SAID,
);

const DID_YOU_EAT = c(
  'Did you eat?',
  askedOfHer('אכלת', 'akhalt', 'אכלת', 'akhalta'),
  askedOfHer('أكلتي', 'akalti', 'أكلت', 'akalt'),
  SAID,
);

const DID_YOU_UNDERSTAND = c(
  'Did you understand?',
  askedOfHer('הבנת', 'hevant', 'הבנת', 'hevanta'),
  askedOfHer('فهمتي', 'fhimti', 'فهمت', 'fhimt'),
  SAID,
);

const WHO_DID_YOU_SEE = c(
  'Who did you see?',
  askedOfHer('את מי ראית', "et mi ra'it", 'את מי ראית', "et mi ra'ita"),
  askedOfHer('مين شفتي', 'mīn shufti', 'مين شفت', 'mīn shuft'),
  SAID,
);

const ASKING_ABOUT_YESTERDAY: SeedDeck[] = [
  lesson('What did you do yesterday?', [
    answer(WHAT_DID_YOU_DO, c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt'])),
    answer(WHAT_DID_YOU_DO, c('I stayed home', ['נשארתי בבית', "nish'arti babayit"], ['ضلّيت بالبيت', 'ḍallēt bil-bēt'])),
    answer(WHAT_DID_YOU_DO, c('I went out', ['יצאתי', 'yatsati'], ['طلعت', 'ṭliʿt'])),
    answer(WHAT_DID_YOU_DO, c('I studied', ['למדתי', 'lamadti'], ['درست', 'darast'])),
    answer(WHAT_DID_YOU_DO, c("I didn't do much", ['לא עשיתי הרבה', 'lo asiti harbe'], ['ما عملت إشي كتير', 'mā ʿamalt ishi ktīr'])),
  ]),
  lesson('Where did you go?', [
    answer(WHERE_DID_YOU_GO, c('I went home', ['הלכתי הביתה', 'halakhti habayta'], ['رحت عالبيت', 'ruḥt ʿal-bēt'])),
    answer(WHERE_DID_YOU_GO, c('I went to work', ['הלכתי לעבודה', 'halakhti la-avoda'], ['رحت عالشغل', 'ruḥt ʿash-shughul'])),
    answer(WHERE_DID_YOU_GO, c('I went there', ['הלכתי לשם', 'halakhti lesham'], ['رحت لهناك', 'ruḥt la-hnāk'])),
    answer(WHERE_DID_YOU_GO, c("I didn't go anywhere", ['לא הלכתי לשום מקום', 'lo halakhti le-shum makom'], ['ما رحت ع أيّ محلّ', 'mā ruḥt ʿa ayy maḥall'])),
  ]),
  lesson('Did you eat?', [
    answer(DID_YOU_EAT, c('Yes', ['כן', 'ken'], ['أيوة', 'aywa'])),
    answer(DID_YOU_EAT, c('Yes, I ate', ['כן, אכלתי', 'ken, akhalti'], ['أيوة، أكلت', 'aywa, akalt'])),
    answer(DID_YOU_EAT, c('No, not yet', ['עדיין לא', 'adayin lo'], ['لسّا لأ', 'lissa laʾ'])),
    answer(DID_YOU_EAT, c("No, I didn't eat", ['לא, לא אכלתי', 'lo, lo akhalti'], ['لأ، ما أكلت', 'laʾ, mā akalt'])),
  ]),
  lesson('Did you understand?', [
    answer(DID_YOU_UNDERSTAND, c('Yes, I understood', ['כן, הבנתי', 'ken, hevanti'], ['أيوة، فهمت', 'aywa, fhimt'])),
    answer(DID_YOU_UNDERSTAND, c('A little', ['קצת', 'ktsat'], ['شويّة', 'shwayye'])),
    answer(DID_YOU_UNDERSTAND, c('I understood some of it', ['הבנתי חלק', 'hevanti khelek'], ['فهمت جزء منه', 'fhimt juzʾ minno'])),
    answer(DID_YOU_UNDERSTAND, c("I didn't understand", ['לא הבנתי', 'lo hevanti'], ['ما فهمت', 'mā fhimt'])),
  ]),
  lesson('Who did you see?', [
    answer(WHO_DID_YOU_SEE, c('I saw my friend', ['ראיתי את החברה שלי', "ra'iti et ha-khavera sheli"], ['شفت صاحبتي', 'shuft ṣāḥibti'])),
    answer(WHO_DID_YOU_SEE, c('I saw my family', ['ראיתי את המשפחה שלי', "ra'iti et ha-mishpakha sheli"], ['شفت عيلتي', 'shuft ʿēlti'])),
    answer(WHO_DID_YOU_SEE, c('Nobody', ['אף אחד', 'af ekhad'], ['ولا حدا', 'wala ḥada'])),
  ]),
];

// --- 6. What happened? -------------------------------------------------------

const WHAT_HAPPENED = c(
  'What happened?',
  ['מה קרה', 'ma kara'],
  ['شو صار', 'shū ṣār'],
);

const WHAT_HAPPENED_DECKS: SeedDeck[] = [
  lesson('Nothing, or I do not know', [
    answer(WHAT_HAPPENED, c('Nothing happened', ['לא קרה כלום', 'lo kara klum'], ['ما صار إشي', 'mā ṣār ishi'])),
    answer(WHAT_HAPPENED, c("I don't know what happened", sp('אני לא יודעת מה קרה', "ani lo yoda'at ma kara", 'אני לא יודע מה קרה', "ani lo yode'a ma kara"), ['ما بعرف شو صار', 'mā baʿref shū ṣār'])),
    answer(WHAT_HAPPENED, c("I didn't see what happened", ['לא ראיתי מה קרה', "lo ra'iti ma kara"], ['ما شفت شو صار', 'mā shuft shū ṣār'])),
  ]),
  lesson('It happened to me', [
    answer(WHAT_HAPPENED, c('I fell', ['נפלתי', 'nafalti'], ['وقعت', 'wʾiʿt'])),
    answer(WHAT_HAPPENED, c('I forgot', ['שכחתי', 'shakhakhti'], ['نسيت', 'nsīt'])),
    answer(WHAT_HAPPENED, c('I lost it', ['איבדתי את זה', 'ibadti et ze'], ['ضيّعته', 'ḍayyaʿto'])),
    answer(WHAT_HAPPENED, c('I broke it', ['שברתי את זה', 'shavarti et ze'], ['كسّرته', 'kassarto'])),
  ]),
  lesson('I was in the middle of something', [
    answer(WHAT_HAPPENED, c('I was working', sp('הייתי עובדת', 'hayiti ovedet', 'הייתי עובד', 'hayiti oved'), ['كنت بشتغل', 'kunt bashtighel'])),
    answer(WHAT_HAPPENED, c('I was sleeping', sp('הייתי ישנה', 'hayiti yeshena', 'הייתי ישן', 'hayiti yashen'), sp('كنت نايمة', 'kunt nāyme', 'كنت نايم', 'kunt nāyem'))),
    answer(WHAT_HAPPENED, c('I went home', ['הלכתי הביתה', 'halakhti habayta'], ['رحت عالبيت', 'ruḥt ʿal-bēt'])),
  ]),
  lesson('Somebody else did something', [
    answer(WHAT_HAPPENED, c('Someone called me', ['מישהו התקשר אליי', 'mishehu hitkasher elay'], ['حدا اتّصل فيّي', 'ḥada ittaṣal fiyyi'])),
    answer(WHAT_HAPPENED, c('She told me', ['היא אמרה לי', 'hi amra li'], ['هي قالت لي', 'hiyye ʾālat-li'])),
    answer(WHAT_HAPPENED, c('He told me', ['הוא אמר לי', 'hu amar li'], ['هو قال لي', "huwwe ʾāl-li"])),
  ]),
];

// --- 7. What I was doing -----------------------------------------------------

const WHAT_I_WAS_DOING: SeedDeck[] = [
  lesson('In the middle of it', [
    c('I was working', sp('הייתי עובדת', 'hayiti ovedet', 'הייתי עובד', 'hayiti oved'), ['كنت بشتغل', 'kunt bashtighel'],
      { he: 'הייתי plus the ordinary present — the same two words do "I was working" and "I used to work".',
        ar: 'كنت plus the ordinary present بشتغل. Add عم for the "right at that moment" reading.' }),
    c('I was sleeping', sp('הייתי ישנה', 'hayiti yeshena', 'הייתי ישן', 'hayiti yashen'), sp('كنت نايمة', 'kunt nāyme', 'كنت نايم', 'kunt nāyem')),
    c('I was eating', sp('הייתי אוכלת', 'hayiti okhelet', 'הייתי אוכל', 'hayiti okhel'), ['كنت باكل', 'kunt bākul']),
    c('I was studying', sp('הייתי לומדת', 'hayiti lomedet', 'הייתי לומד', 'hayiti lomed'), ['كنت بدرس', 'kunt badrus']),
    c('I was waiting', sp('הייתי מחכה', 'hayiti mekhaka', 'הייתי מחכה', 'hayiti mekhake'), ['كنت بستنّى', 'kunt bastanna'], SAID),
    c('I was going home', sp('הייתי בדרך הביתה', 'hayiti baderekh habayta', 'הייתי בדרך הביתה', 'hayiti baderekh habayta'), sp('كنت رايحة عالبيت', 'kunt rāyḥa ʿal-bēt', 'كنت رايح عالبيت', 'kunt rāyeḥ ʿal-bēt'), SAID),
    c('I was talking to someone', ['דיברתי עם מישהו', 'dibarti im mishehu'], ['كنت بحكي مع حدا', 'kunt baḥki maʿ ḥada']),
  ]),
  lesson('Right at that moment', [
    c('I was working right then', ['הייתי באמצע עבודה', 'hayiti be-emtsa avoda'], ['كنت عم بشتغل', 'kunt ʿam bashtighel'],
      { ar: 'عم is what pins it to that moment rather than to a habit.' }),
    c('I was eating right then', ['הייתי באמצע ארוחה', 'hayiti be-emtsa arukha'], ['كنت عم باكل', 'kunt ʿam bākul']),
  ]),
  lesson('And then something happened', [
    c('I was sleeping when you called',
      both4(
        ['הייתי ישנה כשהתקשרת', 'hayiti yeshena kshe-hitkasharta'],
        ['הייתי ישנה כשהתקשרת', 'hayiti yeshena kshe-hitkashart'],
        ['הייתי ישן כשהתקשרת', 'hayiti yashen kshe-hitkashart'],
        ['הייתי ישן כשהתקשרת', 'hayiti yashen kshe-hitkasharta'],
      ),
      both4(
        ['كنت نايمة لمّا اتّصلت', 'kunt nāyme lamma ittaṣalt'],
        ['كنت نايمة لمّا اتّصلتي', 'kunt nāyme lamma ittaṣalti'],
        ['كنت نايم لمّا اتّصلتي', 'kunt nāyem lamma ittaṣalti'],
        ['كنت نايم لمّا اتّصلت', 'kunt nāyem lamma ittaṣalt'],
      ),
      { he: 'Two people in one sentence: the sleeping is yours, the calling is theirs.' }),
    c('I was working when she came', sp('הייתי עובדת כשהיא באה', "hayiti ovedet kshe-hi ba'a", 'הייתי עובד כשהיא באה', "hayiti oved kshe-hi ba'a"), ['كنت بشتغل لمّا إجت', 'kunt bashtighel lamma ijat']),
    c('I was eating when it happened', sp('הייתי אוכלת כשזה קרה', 'hayiti okhelet kshe-ze kara', 'הייתי אוכל כשזה קרה', 'hayiti okhel kshe-ze kara'), ['كنت باكل لمّا صار', 'kunt bākul lamma ṣār']),
  ]),
];

// --- 8. What I used to do ----------------------------------------------------

const WHAT_I_USED_TO_DO: SeedDeck[] = [
  lesson('That is how it used to be', [
    c('I used to live there', ['גרתי שם', 'garti sham'], sp('كنت ساكنة هناك', 'kunt sākne hnāk', 'كنت ساكن هناك', 'kunt sāken hnāk'),
      { he: 'Neither language has a word for "used to". Hebrew leans on the plain past; the "used to" is in the fact that it is over.',
        ar: 'كنت plus the participle: "I was living there".' }),
    c('I used to work there', ['עבדתי שם פעם', 'avadti sham paam'], ['كنت بشتغل هناك', 'kunt bashtighel hnāk'],
      { he: 'פעם — "once, back then" — is how spoken Hebrew usually carries "used to".' }),
    c('I used to study every day', ['פעם למדתי כל יום', 'paam lamadti kol yom'], ['كنت بدرس كلّ يوم', 'kunt badrus kull yōm']),
    c('I used to go there often', ['פעם הלכתי לשם הרבה', 'paam halakhti lesham harbe'], ['كنت أروح لهناك كتير', 'kunt arūḥ la-hnāk ktīr']),
  ]),
  lesson('Back then', [
    c('I used to speak more Hebrew', ['פעם דיברתי יותר עברית', 'paam dibarti yoter ivrit'], ['كنت بحكي عبري أكتر', 'kunt baḥki ʿibri aktar']),
    c('I used to live in Australia', ['גרתי באוסטרליה', 'garti be-Ostralia'], sp('كنت ساكنة بأستراليا', 'kunt sākne bi-Ostrālya', 'كنت ساكن بأستراليا', 'kunt sāken bi-Ostrālya')),
    c('I used to do that', ['פעם עשיתי את זה', 'paam asiti et ze'], ['كنت أعمل هيك', 'kunt aʿmel hēk']),
    c("I didn't use to like it", ['פעם לא אהבתי את זה', 'paam lo ahavti et ze'], ['ما كان يعجبني', 'mā kān yiʿjibni']),
  ]),
];

// --- 9. Tomorrow and after ---------------------------------------------------

const TOMORROW_AND_AFTER: SeedDeck[] = [
  lesson('When it will be', [
    c('tomorrow', ['מחר', 'makhar'], ['بكرا', 'bukra']),
    c('tomorrow morning', ['מחר בבוקר', 'makhar ba-boker'], ['بكرا الصبح', 'bukra iṣ-ṣubḥ']),
    c('tonight', ['הלילה', 'ha-layla'], ['الليلة', 'il-lēle']),
    c('later', ['אחר כך', 'akhar kakh'], ['بعدين', 'baʿdēn']),
    c('the day after tomorrow', ['מחרתיים', 'makhrotayim'], ['بعد بكرا', 'baʿd bukra']),
    c('next week', ['בשבוע הבא', 'ba-shavua haba'], ['الأسبوع الجاي', 'il-usbūʿ ij-jāy']),
    c('in an hour', ['בעוד שעה', "be-od sha'a"], ['بعد ساعة', 'baʿd sāʿa']),
  ]),
  lesson('The first ten I will do', [
    c("I'll go", ['אלך', 'elekh'], ['رح أروح', 'raḥ arūḥ'],
      { he: 'One word: the Hebrew future is a prefix on the verb, and the first person is the same for everybody.',
        ar: 'رح in front of the ordinary present, minus its b-.' }),
    c("I'll come", ['אבוא', 'avo'], ['رح أجي', 'raḥ āji']),
    c("I'll eat", ['אוכל', 'okhal'], ['رح آكل', 'raḥ ākul']),
    c("I'll drink", ['אשתה', 'eshte'], ['رح أشرب', 'raḥ ashrab']),
    c("I'll work", ['אעבוד', "e'evod"], ['رح أشتغل', 'raḥ ashtighel']),
    c("I'll study", ['אלמד', 'elmad'], ['رح أدرس', 'raḥ adrus']),
    c("I'll sleep", ['אישן', 'ishan'], ['رح أنام', 'raḥ anām']),
    c("I'll read it", ['אקרא את זה', 'ekra et ze'], ['رح أقراه', 'raḥ aʾrāh']),
    c("I'll see", ['אראה', "er'e"], ['رح أشوف', 'raḥ ashūf']),
    c("I'll say it", ['אומר את זה', 'omar et ze'], ['رح أقوله', 'raḥ aʾūlo']),
  ]),
  lesson('Seven more I will do', [
    c("I'll call", ['אתקשר', 'atkasher'], ['رح أتّصل', 'raḥ attaṣil']),
    c("I'll ask", ['אשאל', "esh'al"], ['رح أسأل', 'raḥ asʾal']),
    c("I'll help", ['אעזור', "e'ezor"], ['رح أساعد', 'raḥ asāʿed']),
    c("I'll wait", ['אחכה', 'ekhake'], ['رح أستنّى', 'raḥ astanna']),
    c("I'll try", ['אנסה', 'anase'], ['رح أجرّب', 'raḥ ajarreb']),
    c("I'll do it", ['אעשה את זה', "e'ese et ze"], ['رح أعمله', 'raḥ aʿmalo']),
    c("I'll learn it", ['אלמד את זה', 'elmad et ze'], ['رح أتعلّمه', 'raḥ atʿallamo']),
    c("I'll tell you", toL(['אגיד לך', 'agid lekha'], ['אגיד לך', 'agid lakh']), toL(['رح أقول لك', 'raḥ aʾul-lak'], ['رح أقول لك', 'raḥ aʾul-lik']),
      { he: 'Written the same either way; the ending you say is theirs, not yours.' }),
  ]),
];

// --- 10. What I am going to do -----------------------------------------------

const GOING_TO_DO: SeedDeck[] = [
  lesson('It is already arranged', [
    c("I'm going tomorrow", sp('אני הולכת מחר', 'ani holekhet makhar', 'אני הולך מחר', 'ani holekh makhar'), sp('أنا رايحة بكرا', 'ana rāyḥa bukra', 'أنا رايح بكرا', 'ana rāyeḥ bukra'),
      { he: 'The present tense with a future time word — exactly as English does it, and as normal in speech as אלך.' }),
    c("I'm working tomorrow", sp('אני עובדת מחר', 'ani ovedet makhar', 'אני עובד מחר', 'ani oved makhar'), ['أنا بشتغل بكرا', 'ana bashtighel bukra']),
    c("I'm studying tonight", sp('אני לומדת הלילה', 'ani lomedet ha-layla', 'אני לומד הלילה', 'ani lomed ha-layla'), ['أنا بدرس الليلة', 'ana badrus il-lēle']),
    c("I'm going home later", sp('אני הולכת הביתה אחר כך', 'ani holekhet habayta akhar kakh', 'אני הולך הביתה אחר כך', 'ani holekh habayta akhar kakh'), sp('أنا رايحة عالبيت بعدين', 'ana rāyḥa ʿal-bēt baʿdēn', 'أنا رايح عالبيت بعدين', 'ana rāyeḥ ʿal-bēt baʿdēn')),
    c("I'm going to see my friend", sp('אני הולכת לראות את החברה שלי', "ani holekhet lir'ot et ha-khavera sheli", 'אני הולך לראות את החברה שלי', "ani holekh lir'ot et ha-khavera sheli"), sp('أنا رايحة أشوف صاحبتي', 'ana rāyḥa ashūf ṣāḥibti', 'أنا رايح أشوف صاحبتي', 'ana rāyeḥ ashūf ṣāḥibti')),
  ]),
  lesson('Saying when', [
    c("I'll go tomorrow", ['אלך מחר', 'elekh makhar'], ['رح أروح بكرا', 'raḥ arūḥ bukra']),
    c("I'll come later", ['אבוא אחר כך', 'avo akhar kakh'], ['رح أجي بعدين', 'raḥ āji baʿdēn']),
    c("I'll work tomorrow morning", ['אעבוד מחר בבוקר', "e'evod makhar ba-boker"], ['رح أشتغل بكرا الصبح', 'raḥ ashtighel bukra iṣ-ṣubḥ']),
    c("I'll call tonight", ['אתקשר הלילה', 'atkasher ha-layla'], ['رح أتّصل الليلة', 'raḥ attaṣil il-lēle']),
    c("I'll do it later", ['אעשה את זה אחר כך', "e'ese et ze akhar kakh"], ['رح أعمله بعدين', 'raḥ aʿmalo baʿdēn']),
    c("I'll see her on Tuesday", ['אראה אותה ביום שלישי', "er'e ota be-yom shlishi"], ['رح أشوفها يوم التلاتا', 'raḥ ashūfha yōm it-talāta']),
    c("I'm going there next week", sp('אני נוסעת לשם בשבוע הבא', 'ani nosaat lesham ba-shavua haba', 'אני נוסע לשם בשבוע הבא', 'ani nosea lesham ba-shavua haba'), sp('أنا رايحة لهناك الأسبوع الجاي', 'ana rāyḥa la-hnāk il-usbūʿ ij-jāy', 'أنا رايح لهناك الأسبوع الجاي', 'ana rāyeḥ la-hnāk il-usbūʿ ij-jāy')),
    c("I'll be there at seven", ['אהיה שם בשבע', 'ehye sham be-sheva'], ['رح أكون هناك الساعة سبعة', 'raḥ akūn hnāk is-sāʿa sabʿa']),
  ]),
  lesson('A plan, a decision, a promise, a guess', [
    c("I'm going to work tomorrow", sp('אני הולכת לעבודה מחר', 'ani holekhet la-avoda makhar', 'אני הולך לעבודה מחר', 'ani holekh la-avoda makhar'), sp('أنا رايحة عالشغل بكرا', 'ana rāyḥa ʿash-shughul bukra', 'أنا رايح عالشغل بكرا', 'ana rāyeḥ ʿash-shughul bukra'),
      { he: 'A plan already made: the present tense is what says it is settled.' }),
    c("I'll go later", ['אלך אחר כך', 'elekh akhar kakh'], ['رح أروح بعدين', 'raḥ arūḥ baʿdēn'],
      { he: 'A decision taken as you speak. Both languages reach for the plain future here.' }),
    c("I'll call you", toL(['אתקשר אליך', 'atkasher elekha'], ['אתקשר אלייך', 'atkasher elayikh']), toL(['رح أتّصل فيك', 'raḥ attaṣil fīk'], ['رح أتّصل فيكي', 'raḥ attaṣil fīki']),
      { ar: 'A promise. The ending is the gender of whoever you are promising.' }),
    c('it will be hot tomorrow', ['יהיה חם מחר', 'yihye kham makhar'], ['رح يكون شوب بكرا', 'raḥ ykūn shōb bukra'],
      { he: 'A guess about the world rather than a plan of yours — same future, no "I".' }),
  ]),
];

// --- 11. What I will not do --------------------------------------------------

const WILL_NOT_DO: SeedDeck[] = [
  lesson('No, and that is settled', [
    c("I won't go", ['לא אלך', 'lo elekh'], ['ما رح أروح', 'mā raḥ arūḥ']),
    c("I won't work", ['לא אעבוד', "lo e'evod"], ['ما رح أشتغل', 'mā raḥ ashtighel']),
    c("I won't eat", ['לא אוכל', 'lo okhal'], ['ما رح آكل', 'mā raḥ ākul']),
    c("I won't be there", ['לא אהיה שם', 'lo ehye sham'], ['ما رح أكون هناك', 'mā raḥ akūn hnāk']),
    c("I won't forget", ['לא אשכח', 'lo eshkakh'], ['ما رح أنسى', 'mā raḥ ansa']),
    c("I won't do it", ['לא אעשה את זה', "lo e'ese et ze"], ['ما رح أعمله', 'mā raḥ aʿmalo']),
  ]),
  lesson("Won't and can't are not the same", [
    c("I won't go tomorrow", ['לא אלך מחר', 'lo elekh makhar'], ['ما رح أروح بكرا', 'mā raḥ arūḥ bukra'],
      { he: 'A refusal: you have decided.' }),
    c("I can't go tomorrow", sp('אני לא יכולה ללכת מחר', 'ani lo yekhola lalekhet makhar', 'אני לא יכול ללכת מחר', 'ani lo yakhol lalekhet makhar'), ['ما بقدر أروح بكرا', 'mā baʾdar arūḥ bukra'],
      { he: 'Something is stopping you. Both languages keep the two apart exactly as English does.' }),
    c("I'm not going tomorrow", sp('אני לא הולכת מחר', 'ani lo holekhet makhar', 'אני לא הולך מחר', 'ani lo holekh makhar'), sp('أنا مش رايحة بكرا', 'ana mish rāyḥa bukra', 'أنا مش رايح بكرا', 'ana mish rāyeḥ bukra'),
      { ar: 'مش negates the participle; ما negates a verb.' }),
  ]),
];

// --- 12. Asking about tomorrow -----------------------------------------------

const WHAT_ARE_YOU_DOING_TOMORROW = c(
  'What are you doing tomorrow?',
  askedOfHer('מה את עושה מחר', 'ma at osa makhar', 'מה אתה עושה מחר', 'ma ata ose makhar'),
  askedOfHer('شو رح تعملي بكرا', 'shū raḥ tiʿmali bukra', 'شو رح تعمل بكرا', 'shū raḥ tiʿmal bukra'),
);

const WHERE_ARE_YOU_GOING = c(
  'Where are you going?',
  askedOfHer('לאן את הולכת', "le'an at holekhet", 'לאן אתה הולך', "le'an ata holekh"),
  askedOfHer('وين رايحة', 'wēn rāyḥa', 'وين رايح', 'wēn rāyeḥ'),
);

const ARE_YOU_WORKING_TOMORROW = c(
  'Are you working tomorrow?',
  askedOfHer('את עובדת מחר', 'at ovedet makhar', 'אתה עובד מחר', 'ata oved makhar'),
  askedOfHer('بتشتغلي بكرا', 'bitishtighli bukra', 'بتشتغل بكرا', 'bitishtighel bukra'),
);

const ASKING_ABOUT_TOMORROW: SeedDeck[] = [
  lesson('What are you doing tomorrow?', [
    answer(WHAT_ARE_YOU_DOING_TOMORROW, c("I'm working", sp('אני עובדת', 'ani ovedet', 'אני עובד', 'ani oved'), ['أنا بشتغل', 'ana bashtighel'])),
    answer(WHAT_ARE_YOU_DOING_TOMORROW, c("I don't know yet", sp('עדיין לא יודעת', "adayin lo yoda'at", 'עדיין לא יודע', "adayin lo yode'a"), ['لسّا ما بعرف', 'lissa mā baʿref'])),
    answer(WHAT_ARE_YOU_DOING_TOMORROW, c('Nothing special', ['שום דבר מיוחד', 'shum davar meyukhad'], ['ولا إشي', 'wala ishi'])),
  ]),
  lesson('Where and when are you going?', [
    answer(WHERE_ARE_YOU_GOING, c("I'm going home", sp('אני הולכת הביתה', 'ani holekhet habayta', 'אני הולך הביתה', 'ani holekh habayta'), sp('أنا رايحة عالبيت', 'ana rāyḥa ʿal-bēt', 'أنا رايح عالبيت', 'ana rāyeḥ ʿal-bēt'))),
    answer(
      c('When are you going?',
        askedOfHer('מתי את הולכת', 'matai at holekhet', 'מתי אתה הולך', 'matai ata holekh'),
        askedOfHer('إيمتى رايحة', 'ēmta rāyḥa', 'إيمتى رايح', 'ēmta rāyeḥ')),
      c('Later', ['אחר כך', 'akhar kakh'], ['بعدين', 'baʿdēn']),
    ),
    answer(
      c('Who are you going with?',
        askedOfHer('עם מי את הולכת', 'im mi at holekhet', 'עם מי אתה הולך', 'im mi ata holekh'),
        askedOfHer('مع مين رايحة', 'maʿ mīn rāyḥa', 'مع مين رايح', 'maʿ mīn rāyeḥ')),
      c('With my friend', ['עם החברה שלי', 'im ha-khavera sheli'], ['مع صاحبتي', 'maʿ ṣāḥibti']),
    ),
  ]),
  lesson('Are you working tomorrow?', [
    answer(ARE_YOU_WORKING_TOMORROW, c('Yes, all day', ['כן, כל היום', 'ken, kol ha-yom'], ['أيوة، كلّ اليوم', 'aywa, kull il-yōm'])),
    answer(ARE_YOU_WORKING_TOMORROW, c("No, I'm free", sp('לא, אני פנויה', 'lo, ani pnuya', 'לא, אני פנוי', 'lo, ani panuy'), sp('لأ، أنا فاضية', 'laʾ, ana fāḍye', 'لأ، أنا فاضي', 'laʾ, ana fāḍi'))),
    answer(
      c('Will you be there?',
        askedOfHer('תהיי שם', 'tihyi sham', 'תהיה שם', 'tihye sham'),
        askedOfHer('رح تكوني هناك', 'raḥ tkūni hnāk', 'رح تكون هناك', 'raḥ tkūn hnāk')),
      c("Yes, I'll be there", ['כן, אהיה שם', 'ken, ehye sham'], ['أيوة، رح أكون هناك', 'aywa, raḥ akūn hnāk']),
    ),
    answer(
      c('What will you do later?',
        askedOfHer('מה תעשי אחר כך', 'ma taasi akhar kakh', 'מה תעשה אחר כך', 'ma taase akhar kakh'),
        askedOfHer('شو رح تعملي بعدين', 'shū raḥ tiʿmali baʿdēn', 'شو رح تعمل بعدين', 'shū raḥ tiʿmal baʿdēn')),
      c("I'll rest", ['אנוח', 'anuakh'], ['رح أرتاح', 'raḥ artāḥ']),
    ),
  ]),
];

// --- 13. Fixing a time -------------------------------------------------------

const ARE_YOU_FREE = c(
  'Are you free tomorrow?',
  askedOfHer('את פנויה מחר', 'at pnuya makhar', 'אתה פנוי מחר', 'ata panuy makhar'),
  askedOfHer('فاضية بكرا', 'fāḍye bukra', 'فاضي بكرا', 'fāḍi bukra'),
);

const WHEN_CAN_YOU_COME = c(
  'When can you come?',
  askedOfHer('מתי את יכולה לבוא', 'matai at yekhola lavo', 'מתי אתה יכול לבוא', 'matai ata yakhol lavo'),
  askedOfHer('إيمتى بتقدري تيجي', 'ēmta bitiʾdari tīji', 'إيمتى بتقدر تيجي', 'ēmta bitiʾdar tīji'),
);

const DO_YOU_WANT_TO_GO = c(
  'Do you want to go?',
  askedOfHer('את רוצה ללכת', 'at rotsa lalekhet', 'אתה רוצה ללכת', 'ata rotse lalekhet'),
  askedOfHer('بدّك تروحي', 'biddik trūḥi', 'بدّك تروح', 'biddak trūḥ'),
);

const FIXING_A_TIME: SeedDeck[] = [
  lesson('Are you free tomorrow?', [
    answer(ARE_YOU_FREE, c('Yes, I am free', sp('כן, אני פנויה', 'ken, ani pnuya', 'כן, אני פנוי', 'ken, ani panuy'), sp('أيوة، أنا فاضية', 'aywa, ana fāḍye', 'أيوة، أنا فاضي', 'aywa, ana fāḍi'))),
    answer(ARE_YOU_FREE, c("No, I'm working", sp('לא, אני עובדת', 'lo, ani ovedet', 'לא, אני עובד', 'lo, ani oved'), ['لأ، أنا بشتغل', 'laʾ, ana bashtighel'])),
    answer(ARE_YOU_FREE, c("I'm free in the evening", sp('אני פנויה בערב', 'ani pnuya ba-erev', 'אני פנוי בערב', 'ani panuy ba-erev'), sp('أنا فاضية بالمسا', 'ana fāḍye bil-masa', 'أنا فاضي بالمسا', 'ana fāḍi bil-masa'))),
    answer(ARE_YOU_FREE, c('Maybe', ['אולי', 'ulay'], ['يمكن', 'yimkin'])),
  ]),
  lesson('When can you come?', [
    answer(WHEN_CAN_YOU_COME, c('Tomorrow', ['מחר', 'makhar'], ['بكرا', 'bukra'])),
    answer(WHEN_CAN_YOU_COME, c('Tomorrow morning', ['מחר בבוקר', 'makhar ba-boker'], ['بكرا الصبح', 'bukra iṣ-ṣubḥ'])),
    answer(WHEN_CAN_YOU_COME, c('After work', ['אחרי העבודה', 'akharei ha-avoda'], ['بعد الشغل', 'baʿd ish-shughul'])),
    answer(WHEN_CAN_YOU_COME, c('At seven', ['בשבע', 'be-sheva'], ['الساعة سبعة', 'is-sāʿa sabʿa'])),
  ]),
  lesson('Do you want to go?', [
    answer(DO_YOU_WANT_TO_GO, c("Yes, I'd love to", ['כן, אשמח', 'ken, esmakh'], ['أيوة، بحبّ', 'aywa, baḥibb'])),
    answer(DO_YOU_WANT_TO_GO, c("I can't tomorrow", sp('אני לא יכולה מחר', 'ani lo yekhola makhar', 'אני לא יכול מחר', 'ani lo yakhol makhar'), ['ما بقدر بكرا', 'mā baʾdar bukra'])),
    answer(DO_YOU_WANT_TO_GO, c('Maybe Tuesday', ['אולי ביום שלישי', 'ulay be-yom shlishi'], ['يمكن يوم التلاتا', 'yimkin yōm it-talāta'])),
    answer(DO_YOU_WANT_TO_GO, c("I'll let you know", toL(['אעדכן אותך', 'aadken otkha'], ['אעדכן אותך', 'aadken otakh']), toL(['رح أخبّرك', 'raḥ akhabbrak'], ['رح أخبّرك', 'raḥ akhabbrik']), SAID)),
    answer(DO_YOU_WANT_TO_GO, c("I'll come later", ['אבוא אחר כך', 'avo akhar kakh'], ['رح أجي بعدين', 'raḥ āji baʿdēn'])),
  ]),
];

// --- 14. Before, now and later ----------------------------------------------

/**
 * One idea in its three times, so the change is the only thing that moves.
 *
 * The whole point of the section, and the reason it is authored as a structure
 * rather than as three loose decks: the timeline screen needs the three cards
 * of one verb side by side, and a flat deck cannot say which three belong
 * together. `TENSE_TRIADS` is the source, and the decks below are built out of
 * it — so the drill and the practice can never drift apart.
 *
 * "Want" is deliberately absent. Neither language builds a future of wanting
 * the way English does — Palestinian بدّي already carries the intention, and
 * "I'll want" is not a sentence anybody says — so wanting is taught in its past
 * and present in "What I did" instead of being forced into a shape to match a
 * table. The rule the level follows is that a future form has to be one a
 * native speaker would actually use.
 */
export type TenseTriad = {
  /** The bare verb, as the timeline labels it. */
  idea: string;
  past: SeedCard;
  present: SeedCard;
  future: SeedCard;
};

export const TENSE_TRIADS: TenseTriad[] = [
  {
    idea: 'Go',
    past: c('I went', ['הלכתי', 'halakhti'], ['رحت', 'ruḥt']),
    present: c('I go', sp('אני הולכת', 'ani holekhet', 'אני הולך', 'ani holekh'), ['بروح', 'barūḥ']),
    future: c("I'll go", ['אלך', 'elekh'], ['رح أروح', 'raḥ arūḥ']),
  },
  {
    idea: 'Come',
    past: c('I came', ['באתי', 'bati'], ['إجيت', 'ijīt']),
    present: c('I come', sp('אני באה', "ani ba'a", 'אני בא', 'ani ba'), ['بجي', 'bāji']),
    future: c("I'll come", ['אבוא', 'avo'], ['رح أجي', 'raḥ āji']),
  },
  {
    idea: 'Eat',
    past: c('I ate', ['אכלתי', 'akhalti'], ['أكلت', 'akalt']),
    present: c('I eat', sp('אני אוכלת', 'ani okhelet', 'אני אוכל', 'ani okhel'), ['باكل', 'bākul']),
    future: c("I'll eat", ['אוכל', 'okhal'], ['رح آكل', 'raḥ ākul']),
  },
  {
    idea: 'Work',
    past: c('I worked', ['עבדתי', 'avadti'], ['اشتغلت', 'ishtaghalt']),
    present: c('I work', sp('אני עובדת', 'ani ovedet', 'אני עובד', 'ani oved'), ['بشتغل', 'bashtighel']),
    future: c("I'll work", ['אעבוד', "e'evod"], ['رح أشتغل', 'raḥ ashtighel']),
  },
  {
    idea: 'Study',
    past: c('I studied', ['למדתי', 'lamadti'], ['درست', 'darast']),
    present: c('I study', sp('אני לומדת', 'ani lomedet', 'אני לומד', 'ani lomed'), ['بدرس', 'badrus']),
    future: c("I'll study", ['אלמד', 'elmad'], ['رح أدرس', 'raḥ adrus']),
  },
  {
    idea: 'See',
    past: c('I saw', ['ראיתי', "ra'iti"], ['شفت', 'shuft']),
    present: c('I see', sp('אני רואה', "ani ro'a", 'אני רואה', "ani ro'e"), ['بشوف', 'bashūf']),
    future: c("I'll see", ['אראה', "er'e"], ['رح أشوف', 'raḥ ashūf']),
  },
  {
    idea: 'Say',
    past: c('I said', ['אמרתי', 'amarti'], ['قلت', 'ʾult']),
    present: c('I say', sp('אני אומרת', 'ani omeret', 'אני אומר', 'ani omer'), ['بقول', 'baʾūl']),
    future: c("I'll say", ['אומר', 'omar'], ['رح أقول', 'raḥ aʾūl']),
  },
  {
    idea: 'Sleep',
    past: c('I slept', ['ישנתי', 'yashanti'], ['نمت', 'nimt']),
    present: c('I sleep', sp('אני ישנה', 'ani yeshena', 'אני ישן', 'ani yashen'), ['بنام', 'banām']),
    future: c("I'll sleep", ['אישן', 'ishan'], ['رح أنام', 'raḥ anām']),
  },
  {
    idea: 'Read',
    past: c('I read (yesterday)', ['קראתי', 'karati'], ['قريت', 'ʾarēt'],
      { he: 'English writes "read" twice over; both languages spell the two apart.' }),
    present: c('I read (every day)', sp('אני קוראת', 'ani koret', 'אני קורא', 'ani kore'), ['بقرأ', "baʾra"]),
    future: c("I'll read", ['אקרא', 'ekra'], ['رح أقرا', 'raḥ aʾra']),
  },
  {
    idea: 'Know',
    past: c('I knew', ['ידעתי', 'yadati'], ['كنت بعرف', 'kunt baʿref']),
    present: c('I know', sp('אני יודעת', "ani yoda'at", 'אני יודע', "ani yode'a"), ['بعرف', 'baʿref']),
    future: c("I'll know", ['אדע', 'eda'], ['رح أعرف', 'raḥ aʿraf']),
  },
];

/**
 * The contrast lessons: one deck per band of time, each dealing the same ten
 * ideas.
 *
 * Split that way rather than as ten three-card decks because the skill being
 * drilled is the transformation, and a deck that is all pasts followed by a
 * deck that is all futures is what makes the shape of each one visible. The
 * timeline screen puts the three back beside each other.
 */
const BEFORE_NOW_LATER: SeedDeck[] = [
  lesson('Yesterday I …', TENSE_TRIADS.map((triad) => triad.past)),
  lesson('Today I …', TENSE_TRIADS.map((triad) => triad.present)),
  lesson('Tomorrow I …', TENSE_TRIADS.map((triad) => triad.future)),
  lesson('One day at a time', [
    c('Yesterday I worked', ['אתמול עבדתי', 'etmol avadti'], ['إمبارح اشتغلت', 'imbāriḥ ishtaghalt']),
    c("Today I'm working", sp('היום אני עובדת', 'hayom ani ovedet', 'היום אני עובד', 'hayom ani oved'), ['اليوم بشتغل', 'il-yōm bashtighel']),
    c("Tomorrow I'll work", ['מחר אעבוד', "makhar e'evod"], ['بكرا رح أشتغل', 'bukra raḥ ashtighel']),
    c('Yesterday I went there', ['אתמול הלכתי לשם', 'etmol halakhti lesham'], ['إمبارح رحت لهناك', 'imbāriḥ ruḥt la-hnāk']),
    c("Today I'm going there", sp('היום אני הולכת לשם', 'hayom ani holekhet lesham', 'היום אני הולך לשם', 'hayom ani holekh lesham'), sp('اليوم رايحة لهناك', 'il-yōm rāyḥa la-hnāk', 'اليوم رايح لهناك', 'il-yōm rāyeḥ la-hnāk')),
    c("Tomorrow I'll go there", ['מחר אלך לשם', 'makhar elekh lesham'], ['بكرا رح أروح لهناك', 'bukra raḥ arūḥ la-hnāk']),
  ]),
];

// --- the sections ------------------------------------------------------------

/**
 * The lessons as they are authored: plain both-language decks, in the order the
 * level means them to be met — the whole of the past first, then the whole of
 * the future, then the two set against the present.
 */
const AUTHORED_SECTIONS: SeedCategory[] = [
  { name: 'Yesterday and before', icon: '🕰️', decks: WHEN_IT_HAPPENED },
  { name: 'What I did', icon: '🚶', decks: WHAT_I_DID },
  { name: 'How I was', icon: '😴', decks: HOW_I_WAS },
  { name: 'What I did not do', icon: '🚫', decks: WHAT_I_DID_NOT },
  { name: 'Asking about yesterday', icon: '❔', decks: ASKING_ABOUT_YESTERDAY },
  { name: 'What happened?', icon: '💥', decks: WHAT_HAPPENED_DECKS },
  { name: 'What I was doing', icon: '⏳', decks: WHAT_I_WAS_DOING },
  { name: 'What I used to do', icon: '📿', decks: WHAT_I_USED_TO_DO },
  { name: 'Tomorrow and after', icon: '🌅', decks: TOMORROW_AND_AFTER },
  { name: 'What I am going to do', icon: '🗓️', decks: GOING_TO_DO },
  { name: 'What I will not do', icon: '🛑', decks: WILL_NOT_DO },
  { name: 'Asking about tomorrow', icon: '❓', decks: ASKING_ABOUT_TOMORROW },
  { name: 'Fixing a time', icon: '🤝', decks: FIXING_A_TIME },
  { name: 'Before, now and later', icon: '↔️', decks: BEFORE_NOW_LATER },
];

/**
 * Every line the level teaches, each English once.
 *
 * Deduplicated deliberately: a past form is met once in its own lesson and
 * again as an answer to a question, which inside those lessons are genuinely
 * different cards. In a pool drawn from at random they would be one card dealt
 * twice, and a repeated English would put the official-word count for ever out
 * of a device's reach — so the starter top-up, which repairs only while
 * something is missing, would run on every single launch.
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
 * Dealt exactly as the two final tests before it are, and for the same reason —
 * one flawless pass over two hundred cards is not something a person finishes.
 * `masteryOnly`, because every line has already been met inside its lesson.
 */
const FINAL_TEST_GROUP: SeedCategory = {
  name: 'Past and future: final test',
  icon: '🏁',
  decks: [
    {
      name: 'Every time, ten at a time',
      cards: EVERY_LINE,
      studyLanguages: ['hebrew', 'arabic'],
      masteryOnly: true,
      roundSize: FINAL_TEST_BATCH,
      perfectRunsRequired: FINAL_TEST_RUNS,
    },
  ],
};

/**
 * Past & Future as it installs: every lesson a language ladder.
 *
 * Staged like the rest of the course — Hebrew, then Palestinian Arabic, then
 * the two together over the same lines — so she can take one language at a time
 * rather than absorb a whole tense twice at once. The final test passes through
 * unstaged: it is the capstone over both, not another rung to climb.
 */
export const PAST_FUTURE_CATEGORIES: SeedCategory[] = [
  ...AUTHORED_SECTIONS.map((section) => ({
    ...section,
    decks: stageDecks(section.decks),
  })),
  FINAL_TEST_GROUP,
];

/**
 * The names Past & Future owns, so no other area lays out one of its sections
 * and the Practice ladder never queues one. Name-based like the levels before
 * it: a category row on disk carries nothing else saying which area it belongs
 * to, and adding a stored field would need a migration on every install to buy
 * what a set of names already answers.
 */
export const PAST_FUTURE_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  PAST_FUTURE_CATEGORIES.map((section) => section.name.toLowerCase()),
);

/** The final test's category, which the level lays out apart from the sections. */
export const PAST_FUTURE_FINAL_TEST_CATEGORY = FINAL_TEST_GROUP.name;

/** The contrast section, which the level also offers as a timeline drill. */
export const PAST_FUTURE_CONTRAST_CATEGORY = 'Before, now and later';

/**
 * Which band of time each section teaches, for the level's own signposting.
 *
 * Read off the section name rather than stored on the category, for the same
 * reason membership is: nothing on disk carries it, and the authored list above
 * is the only place that knows.
 */
export type TimeBand = 'past' | 'future' | 'contrast';

export const SECTION_BANDS: ReadonlyMap<string, TimeBand> = new Map<string, TimeBand>(
  (
    [
      ['Yesterday and before', 'past'],
      ['What I did', 'past'],
      ['How I was', 'past'],
      ['What I did not do', 'past'],
      ['Asking about yesterday', 'past'],
      ['What happened?', 'past'],
      ['What I was doing', 'past'],
      ['What I used to do', 'past'],
      ['Tomorrow and after', 'future'],
      ['What I am going to do', 'future'],
      ['What I will not do', 'future'],
      ['Asking about tomorrow', 'future'],
      ['Fixing a time', 'future'],
      ['Before, now and later', 'contrast'],
    ] as [string, TimeBand][]
  ).map(([name, band]) => [name.toLowerCase(), band]),
);
