import { c, ofSpeaker, type SeedCard } from './seed';
import type { Language } from '../types';

/**
 * Native Listening: understanding the language when nobody is being careful.
 *
 * Every level up to here has been about production. Sentence Building gets a
 * whole thought out; Conversation Flow gets it into an exchange; Past & Future
 * moves it off today; Opinions & Reasons puts a view on it. All of them hand
 * the learner a written line and ask her to say it, and all of them hear it
 * back in the one form she was taught.
 *
 * Nobody speaks like that. The sentence she has drilled twenty times arrives
 * with the pronoun dropped, two words run into one, a *yaʿni* in the middle and
 * a kettle going in the background — and she does not recognise a word of it.
 * That gap is not a vocabulary gap and no deck closes it. This level is the
 * only place in Levantry where the exercise is **hearing**, and it is graded on
 * hearing alone.
 *
 * **It is not a deck, and deliberately so.** Every level below installs
 * categories and cards, and a card is a thing to master — one right form,
 * mastered by producing it. That model cannot express the only claim this level
 * makes, which is *how much help did she need to understand it*. So nothing
 * here is installed. The content is authored, the lines are read and heard
 * exactly as a card's are, and the record rides the settings row beside
 * `situationRehearsals` and `freeTalkStats` — see `ListeningStats` in `types`.
 *
 * That also keeps the promise the spec makes twice: this is not another
 * vocabulary deck, and it does not turn up as a category inside Keywords.
 *
 * **Audio first.** A `ListeningItem` is a thing heard and a question about it.
 * The script, the romanisation and the English are all withheld until she has
 * answered or asked for them — see `HELP_LADDER` in `features/listening`, which
 * is the spec's hint ladder written as a state machine. The transcript is the
 * fifth rung of six, and no wrong answer skips ahead to it.
 *
 * **The languages never mix inside one utterance.** A line carries both, the
 * way every authored line in this app does, but a *run* plays one language per
 * item: Hebrew throughout, Arabic throughout, or — on Both — alternating item
 * by item. There is no code-switched content here, and the interleaving is at
 * the item boundary precisely so there cannot be.
 *
 * **What is heard is fixed, except when it is aimed at her.** A recording is
 * one utterance: a woman saying ana taʿbāne said it that way, and rendering it
 * two ways would be a claim about the speaker the audio cannot keep. So a
 * speaker's own lines carry a single form, and only the lines *addressed to the
 * learner* are gendered — those follow her, because wēnik to a woman is wēnak
 * to a man whoever is asking. That is the same `saidToHer` idiom Conversation
 * Flow and Opinions & Reasons use.
 *
 * **The Arabic is Palestinian conversational Arabic**, and this level is where
 * that matters most, because the whole point is what a mouth actually does:
 * rāyḥa not ذاهبة, biddik not هل تريدين, shu not ماذا, hallaʾ not الآن, lissa
 * not ما زال, ʾahwe with the glottal stop Palestinian gives ق. The shortened
 * forms in `variations` are the informal ones people say — never invented
 * slurring, and never MSA leaking back in.
 *
 * **Vocabulary is borrowed, not taught.** Nearly every word here is already on
 * a card somewhere below. What is new is the *shape* — the dropped pronoun, the
 * run-together preposition, the filler — and, in level 7 only, a handful of
 * words she is meant to fail to know and infer anyway.
 *
 * Authored 2026-09-02 by Claude; not yet reviewed by a native speaker. The
 * Palestinian side in particular wants a native pass before it is trusted —
 * see `NATIVE_REVIEW_PENDING`, which is what puts the warning on the screen.
 */

/**
 * A line spoken *to* the learner, whose ending her own gender picks.
 *
 * The same alias every level since Conversation Flow uses, for the same reason:
 * the app's `speaker` agreement is precisely "her own gender", and a question
 * put to her agrees with her whoever is asking.
 */
const saidToHer = ofSpeaker;

/**
 * Standing warning carried onto the level's landing screen.
 *
 * A fact about the content rather than about the interface, so it lives here:
 * it should stop being displayed by deleting it once the Arabic has had a
 * native pass, not by editing a component.
 */
export const NATIVE_REVIEW_PENDING = true;

// --- what an exercise is -----------------------------------------------------

/**
 * The seven shapes an exercise takes — the spec's nine exercises, minus the two
 * that are not shapes at all.
 *
 * "Natural-speed listening" is not a kind: it is `pace` on the level, because
 * every kind can be played fast or slowly and the ladder turns the speed up
 * once rather than duplicating seven exercises. "Background context" is not a
 * kind either, for the same reason — it is `ambience`, and it rides the level.
 */
export type ListeningKind =
  /** Familiar language, spoken normally. Pick the closest meaning. */
  | 'recognise'
  /** The same thing, said a way she was never taught. */
  | 'reworded'
  /** One fact out of a couple of sentences — where, when, who, what happened. */
  | 'keyfact'
  /** The transcript with one word gone, chosen from words that blur into it. */
  | 'missing'
  /** Rebuild the phrase from its words: where one ends and the next starts. */
  | 'boundaries'
  /** Two people, two turns, and a question about what was meant. */
  | 'exchange'
  /** Something a person really says, and the natural thing to say back. */
  | 'reply';

/** Who is speaking, where more than one person is. */
export type ListeningSpeaker = 'A' | 'B';

/** One utterance, and whose it is. */
export type HeardTurn = {
  speaker?: ListeningSpeaker;
  line: SeedCard;
};

/**
 * Another natural way of saying the same thing, explained after she answers.
 *
 * The spec's "native speech variations": a full form, a shortened conversational
 * form, the one actually heard. Shown only in the review, because showing it any
 * earlier would be handing over the answer.
 */
export type ListeningVariation = {
  /** "The form you were taught", "without the filler". */
  what: string;
  line: SeedCard;
  note: string;
};

/**
 * The word taken out of a transcript, and the words offered beside it.
 *
 * Per language, because the exercise is about *this* language's sounds: the
 * distractors are the words that blur into the right one in connected speech,
 * and Hebrew's and Arabic's are nothing like each other.
 *
 * `word` has to appear in that language's `script` exactly as written, so the
 * blank is cut out of the line rather than authored a second time. A test pins
 * that, which is what stops the gap and the line drifting apart.
 */
export type ListeningGap = {
  word: string;
  /** Near-misses. Never nonsense: the point is words that genuinely blur. */
  others: string[];
};

export type ListeningItem = {
  id: string;
  kind: ListeningKind;
  /** What she hears, in order. One turn for everything but an exchange. */
  heard: HeardTurn[];
  /** The question, in English. Never "translate this". */
  ask: string;
  /** The answers offered, in English. Empty on `missing` and `boundaries`, whose answers are words. */
  options: string[];
  /** Index into `options`. */
  correct: number;
  /** For `missing` only: the blank, in each language. */
  gap?: Record<Language, ListeningGap>;
  /**
   * The one word the hint ladder gives away before the transcript.
   *
   * Authored rather than taken off the front of the line, because the useful
   * word is the one that unlocks the meaning — maṭbakh, not ana.
   */
  keyword?: { english: string; hebrew: string; arabic: string };
  /** What she needed to have heard, said plainly, in the review. */
  because?: string;
  variations?: ListeningVariation[];
};

/**
 * How the audio is played by default.
 *
 * `clear` is the careful pronunciation every other level uses. `natural` is
 * ordinary speed, and from level 2 on it is the default — the spec is explicit
 * that slow is a support tool and never the version she meets first.
 */
export type ListeningPace = 'clear' | 'natural';

/**
 * The room the recording is in.
 *
 * Synthesised rather than recorded — see `services/audio/ambience`. Mild by
 * construction: the objective is that she stops needing a studio, not that the
 * exercise gets artificially hard.
 */
export type AmbienceName = 'room' | 'cafe' | 'street';

export type ListeningLevel = {
  id: string;
  /** 1 to 9, and its place in the ladder. */
  rank: number;
  name: string;
  claim: string;
  pace: ListeningPace;
  ambience?: AmbienceName;
  items: ListeningItem[];
};

// --- level 1: one short familiar sentence, clearly spoken ---------------------

const L1: ListeningItem[] = [
  {
    id: 'l1-kitchen',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I'm going to the kitchen to get water.",
          ['אני הולכת למטבח להביא מים', 'ani holekhet la-mitbakh lehavi mayim'],
          ['رايحة عالمطبخ أجيب ميّة', 'rāyḥa ʿal-maṭbakh ajīb mayye'],
        ),
      },
    ],
    ask: 'Which is closest to what she said?',
    options: [
      "I'm going to the kitchen to get water.",
      "I'm going outside.",
      "I don't want water.",
      'Where is the kitchen?',
    ],
    correct: 0,
    keyword: { english: 'kitchen', hebrew: 'מטבח', arabic: 'مطبخ' },
    because: 'Two words carry it: the kitchen, and water.',
  },
  {
    id: 'l1-tired',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I'm very tired today.",
          ['אני עייפה מאוד היום', 'ani ayefa meod ha-yom'],
          ['أنا تعبانة كتير اليوم', 'ana taʿbāne ktīr il-yōm'],
        ),
      },
    ],
    ask: 'Which is closest to what she said?',
    options: [
      "I'm very tired today.",
      "I'm not working today.",
      'Today was good.',
      'I slept a lot today.',
    ],
    correct: 0,
    keyword: { english: 'tired', hebrew: 'עייפה', arabic: 'تعبانة' },
  },
  {
    id: 'l1-coffee-hot',
    kind: 'recognise',
    heard: [
      {
        line: c(
          'The coffee is very hot.',
          ['הקפה חם מאוד', 'ha-kafe kham meod'],
          ['القهوة سخنة كتير', 'il-ʾahwe sukhne ktīr'],
        ),
      },
    ],
    ask: 'What is she saying about the coffee?',
    options: [
      'It is very hot.',
      'It is very good.',
      'It is expensive.',
      'There is none left.',
    ],
    correct: 0,
    keyword: { english: 'hot', hebrew: 'חם', arabic: 'سخنة' },
  },
  {
    id: 'l1-at-home',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I'm at home now.",
          ['אני בבית עכשיו', 'ani ba-bayit akhshav'],
          ['أنا بالبيت هلّق', 'ana bil-bēt hallaʾ'],
        ),
      },
    ],
    ask: 'Where is she?',
    options: ['At home.', 'At work.', 'On the way.', 'At a friend’s.'],
    correct: 0,
    keyword: { english: 'home', hebrew: 'בית', arabic: 'بيت' },
  },
  {
    id: 'l1-work-tomorrow',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "Tomorrow I'm going to work.",
          ['מחר אני הולכת לעבודה', 'makhar ani holekhet la-avoda'],
          ['بكرا رايحة عالشغل', 'bukra rāyḥa ʿash-shughul'],
        ),
      },
    ],
    ask: 'When is she going to work?',
    options: ['Tomorrow.', 'Today.', 'Now.', 'Next week.'],
    correct: 0,
    keyword: { english: 'tomorrow', hebrew: 'מחר', arabic: 'بكرا' },
    because:
      'The time word comes first in both languages — catch it and the rest can wait.',
  },
];

// --- level 2: the same kind of sentence, at ordinary speed --------------------

const L2: ListeningItem[] = [
  {
    id: 'l2-busy',
    kind: 'recognise',
    heard: [
      {
        line: c(
          'I have a lot of work today.',
          ['יש לי הרבה עבודה היום', 'yesh li harbe avoda ha-yom'],
          ['عندي شغل كتير اليوم', 'ʿindi shughul ktīr il-yōm'],
        ),
      },
    ],
    ask: 'Which is closest to what she said?',
    options: [
      'I have a lot of work today.',
      'I finished work today.',
      'I like my work.',
      'I have no work today.',
    ],
    correct: 0,
    keyword: { english: 'work', hebrew: 'עבודה', arabic: 'شغل' },
  },
  {
    id: 'l2-no-sugar',
    kind: 'recognise',
    heard: [
      {
        line: c(
          'I want coffee without sugar.',
          ['אני רוצה קפה בלי סוכר', 'ani rotsa kafe bli sukar'],
          ['بدّي قهوة بلا سكّر', 'biddi ʾahwe bala sukkar'],
        ),
      },
    ],
    ask: 'What does she want?',
    options: [
      'Coffee with no sugar.',
      'Coffee with sugar.',
      'Tea with sugar.',
      'Nothing, thank you.',
    ],
    correct: 0,
    keyword: { english: 'without', hebrew: 'בלי', arabic: 'بلا' },
    because:
      'One small word decides it. Miss bli or bala and you hear the opposite order.',
  },
  {
    id: 'l2-lives-near',
    kind: 'recognise',
    heard: [
      {
        line: c(
          'My friend lives nearby.',
          ['החברה שלי גרה קרוב', 'ha-khavera sheli gara karov'],
          ['صاحبتي ساكنة قريب', 'ṣāḥibti sākne ʾarīb'],
        ),
      },
    ],
    ask: 'What did she say about her friend?',
    options: [
      'She lives nearby.',
      'She is coming over.',
      'She lives far away.',
      'She moved away.',
    ],
    correct: 0,
    keyword: { english: 'nearby', hebrew: 'קרוב', arabic: 'قريب' },
  },
  {
    id: 'l2-ate-nothing',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I haven't eaten anything today.",
          ['לא אכלתי כלום היום', 'lo akhalti klum ha-yom'],
          ['ما أكلت إشي اليوم', 'ma akalt ishi il-yōm'],
        ),
      },
    ],
    ask: 'Which is closest to what she said?',
    options: [
      'She has not eaten today.',
      'She ate a lot today.',
      'She is not hungry.',
      'She is eating now.',
    ],
    correct: 0,
    keyword: { english: 'not', hebrew: 'לא', arabic: 'ما' },
    because:
      'The negative is one syllable at natural speed, and it is the whole sentence.',
  },
  {
    id: 'l2-later',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I'm coming later.",
          ['אני באה אחר כך', "ani ba'a akhar kakh"],
          ['جايّة بعدين', 'jāyye baʿdēn'],
        ),
      },
    ],
    ask: 'When is she coming?',
    options: ['Later.', 'Now.', 'Tomorrow.', 'She is not coming.'],
    correct: 0,
    keyword: { english: 'later', hebrew: 'אחר כך', arabic: 'بعدين' },
  },
];

// --- level 3: the same meaning, wording she was never taught ------------------

const L3: ListeningItem[] = [
  {
    id: 'l3-coffee-offer',
    kind: 'reworded',
    heard: [
      {
        line: c(
          'Want some coffee?',
          saidToHer('רוצה קפה?', 'rotsa kafe', 'רוצה קפה?', 'rotse kafe'),
          saidToHer('بتحبّي قهوة؟', 'bitḥibbi ʾahwe', 'بتحبّ قهوة؟', 'bitḥibb ʾahwe'),
        ),
      },
    ],
    ask: 'What is being asked?',
    options: [
      'Whether you want coffee.',
      'Whether the coffee is good.',
      'Where the coffee is.',
      'Whether you made coffee.',
    ],
    correct: 0,
    because:
      'The taught line is "do you want coffee?" — biddik ʾahwe. This is the same offer with a different verb and no pronoun at all.',
    variations: [
      {
        what: 'The form you were taught',
        line: c(
          'Do you want coffee?',
          saidToHer('את רוצה קפה?', 'at rotsa kafe', 'אתה רוצה קפה?', 'ata rotse kafe'),
          saidToHer('بدِّك قهوة؟', 'biddik ʾahwe', 'بدَّك قهوة؟', 'biddak ʾahwe'),
        ),
        note: 'The one on the card. Perfectly natural, and not the only way.',
      },
    ],
  },
  {
    id: 'l3-how-are-you',
    kind: 'reworded',
    heard: [
      {
        line: c(
          "What's new?",
          ['מה נשמע?', 'ma nishma'],
          ['شو الأخبار؟', 'shu il-akhbār'],
        ),
      },
    ],
    ask: 'What is being asked?',
    options: [
      'How you are.',
      'What the news is on television.',
      'What you are doing.',
      'Where you have been.',
    ],
    correct: 0,
    because:
      'Literally "what is heard" and "what is the news" — but both are simply "how are you", and neither is the line you drilled.',
    variations: [
      {
        what: 'The form you were taught',
        line: c(
          'How are you?',
          saidToHer('מה שלומך?', 'ma shlomekh', 'מה שלומך?', 'ma shlomkha'),
          saidToHer('كيفِك؟', 'kīfik', 'كيفَك؟', 'kīfak'),
        ),
        note: 'Written the same in Hebrew either way; only the ending is said differently.',
      },
    ],
  },
  {
    id: 'l3-no-idea',
    kind: 'reworded',
    heard: [
      {
        line: c(
          'I have no idea.',
          ['אין לי מושג', 'ein li musag'],
          ['ما عندي فكرة', 'ma ʿindi fikra'],
        ),
      },
    ],
    ask: 'What is she saying?',
    options: [
      'She does not know.',
      'She does not agree.',
      'She does not mind.',
      'She does not want to.',
    ],
    correct: 0,
    because:
      'Not the "I don\'t know" you learned — the same answer built out of the word for "idea".',
    variations: [
      {
        what: 'The form you were taught',
        line: c(
          "I don't know.",
          ['אני לא יודעת', 'ani lo yodaat'],
          ['ما بعرف', 'ma baʿref'],
        ),
        note: 'Both are ordinary. This one is flatter; the one above is a shrug.',
      },
    ],
  },
  {
    id: 'l3-heading-home',
    kind: 'reworded',
    heard: [
      {
        line: c(
          "I'm heading back home.",
          ['אני חוזרת הביתה', 'ani khozeret ha-bayta'],
          ['راجعة عالبيت', 'rājʿa ʿal-bēt'],
        ),
      },
    ],
    ask: 'Where is she going?',
    options: ['Home.', 'To work.', 'To a friend.', 'Out.'],
    correct: 0,
    because:
      'You learned "I\'m going home". This is "I\'m going back", which is what somebody leaving actually says.',
  },
  {
    id: 'l3-how-much',
    kind: 'reworded',
    heard: [
      {
        line: c('How much?', ['כמה זה?', 'kama ze'], ['قدّيش؟', 'ʾaddēsh']),
      },
    ],
    ask: 'What is being asked?',
    options: ['The price.', 'The number of people.', 'The time.', 'The distance.'],
    correct: 0,
    because:
      'The taught line is "how much does it cost?". In a shop nobody says the rest of it.',
  },
];

// --- level 4: two connected sentences, one fact wanted -----------------------

const L4: ListeningItem[] = [
  {
    id: 'l4-early-night',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'I was at work all day. I am going to sleep early.',
          [
            'הייתי בעבודה כל היום. אני הולכת לישון מוקדם',
            'hayiti ba-avoda kol ha-yom. ani holekhet lishon mukdam',
          ],
          [
            'كنت بالشغل كل اليوم. رايحة أنام بكّير',
            'kunt bish-shughul kull il-yōm. rāyḥa anām bakkīr',
          ],
        ),
      },
    ],
    ask: 'Why is she going to sleep early?',
    options: [
      'She was at work all day.',
      'She has to get up early.',
      'She is not feeling well.',
      'There is nothing to do.',
    ],
    correct: 0,
    keyword: { english: 'all day', hebrew: 'כל היום', arabic: 'كل اليوم' },
    because: 'The reason is in the first sentence, and nothing joins them but the pause.',
  },
  {
    id: 'l4-was-ill',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          "I didn't go yesterday. I was ill.",
          ['לא הלכתי אתמול. הייתי חולה', 'lo halakhti etmol. hayiti khola'],
          ['ما رحت مبارح. كنت مريضة', 'ma ruḥt mbāriḥ. kunt marīḍa'],
        ),
      },
    ],
    ask: 'What happened?',
    options: [
      'She stayed away because she was ill.',
      'She went, and got ill there.',
      'She went late.',
      'She is going tomorrow instead.',
    ],
    correct: 0,
    keyword: { english: 'yesterday', hebrew: 'אתמול', arabic: 'مبارح' },
  },
  {
    id: 'l4-no-bread',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'I need to go to the shop. We have no bread.',
          [
            'אני צריכה ללכת לחנות. אין לנו לחם',
            'ani tsrikha lalekhet la-khanut. ein lanu lekhem',
          ],
          ['لازم أروح عالدكّان. ما عنّا خبز', 'lāzim arūḥ ʿad-dukkān. ma ʿinna khubuz'],
        ),
      },
    ],
    ask: 'What does she need?',
    options: ['Bread.', 'Water.', 'Coffee.', 'Money.'],
    correct: 0,
    keyword: { english: 'bread', hebrew: 'לחם', arabic: 'خبز' },
  },
  {
    id: 'l4-friend-sea',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'My friend is coming tomorrow. We are going to the sea.',
          [
            'החברה שלי באה מחר. אנחנו הולכות לים',
            "ha-khavera sheli ba'a makhar. anakhnu holkhot la-yam",
          ],
          ['صاحبتي جايّة بكرا. رايحين عالبحر', 'ṣāḥibti jāyye bukra. rāyḥīn ʿal-baḥar'],
        ),
      },
    ],
    ask: 'When is her friend coming?',
    options: ['Tomorrow.', 'Today.', 'Next week.', 'She already came.'],
    correct: 0,
    because:
      'Two facts and only one was asked for. You do not have to hold the sea to answer this.',
  },
  {
    id: 'l4-cafe-verdict',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'The coffee here is good, but it is expensive.',
          ['הקפה כאן טוב, אבל יקר', 'ha-kafe kan tov, aval yakar'],
          ['القهوة هون منيحة، بس غالية', 'il-ʾahwe hōn mnīḥa, bass ghālye'],
        ),
      },
    ],
    ask: 'What does she think of the place?',
    options: [
      'Good coffee, too dear.',
      'Bad coffee, cheap.',
      'She likes everything about it.',
      'She has not been there.',
    ],
    correct: 0,
    keyword: { english: 'but', hebrew: 'אבל', arabic: 'بس' },
    because:
      'The whole verdict hangs on one word. bass turns the sentence around, and it is over in a syllable.',
  },
];

// --- level 5: two people, a couple of turns ----------------------------------

const L5: ListeningItem[] = [
  {
    id: 'l5-coming-today',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Are you coming today?',
          saidToHer('את באה היום?', "at ba'a ha-yom", 'אתה בא היום?', 'ata ba ha-yom'),
          saidToHer('جايّة اليوم؟', 'jāyye il-yōm', 'جاي اليوم؟', 'jāy il-yōm'),
        ),
      },
      {
        speaker: 'B',
        line: c(
          "Maybe later. I'm still at work.",
          ['אולי אחר כך. אני עוד בעבודה', 'ulay akhar kakh. ani od ba-avoda'],
          ['يمكن بعدين. لسّا بالشغل', 'yimkin baʿdēn. lissa bish-shughul'],
        ),
      },
    ],
    ask: 'Is B coming now?',
    options: [
      'No — she is still at work.',
      'Yes, she is on her way.',
      'No, and she is not coming at all.',
      'She did not say.',
    ],
    correct: 0,
    keyword: { english: 'still', hebrew: 'עוד', arabic: 'لسّا' },
  },
  {
    id: 'l5-where-are-you',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          "Where are you? I've been waiting ages.",
          saidToHer(
            'איפה את? מחכה לך המון זמן',
            'eifo at? mekhake lakh hamon zman',
            'איפה אתה? מחכה לך המון זמן',
            'eifo ata? mekhake lekha hamon zman',
          ),
          saidToHer(
            'وينِك؟ بستنّاكي من زمان',
            'wēnik? bastannāki min zamān',
            'وينَك؟ بستنّاك من زمان',
            'wēnak? bastannāk min zamān',
          ),
        ),
      },
      {
        speaker: 'B',
        line: c(
          "I'm coming now, two minutes.",
          ['אני באה עכשיו, שתי דקות', "ani ba'a akhshav, shtei dakot"],
          ['جايّة هلّق، دقيقتين', 'jāyye hallaʾ, daʾīʾtēn'],
        ),
      },
    ],
    ask: 'How does A sound?',
    options: [
      'Impatient — she has been waiting.',
      'Angry, and ending the conversation.',
      'Unbothered either way.',
      'Confused about where to go.',
    ],
    correct: 0,
    because: 'min zamān is the whole tone of it: "for ages".',
  },
  {
    id: 'l5-not-hungry',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Shall we eat something?',
          saidToHer('נאכל משהו?', 'nokhal mashehu', 'נאכל משהו?', 'nokhal mashehu'),
          saidToHer('ناكل إشي؟', 'nākul ishi', 'ناكل إشي؟', 'nākul ishi'),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'Not now, I ate before I came.',
          ['לא עכשיו, אכלתי לפני שבאתי', 'lo akhshav, akhalti lifnei she-bati'],
          ['مش هلّق، أكلت قبل ما إجيت', 'mish hallaʾ, akalt ʾabl ma ijīt'],
        ),
      },
    ],
    ask: 'Is B agreeing or refusing?',
    options: [
      'Refusing, politely — she has already eaten.',
      'Agreeing.',
      'Refusing because she dislikes the food.',
      'Asking to eat later instead.',
    ],
    correct: 0,
    keyword: { english: 'not', hebrew: 'לא', arabic: 'مش' },
  },
  {
    id: 'l5-reply-waiting',
    kind: 'reply',
    heard: [
      {
        line: c(
          "Where are you? I've been waiting ages.",
          saidToHer(
            'איפה את? מחכה לך המון זמן',
            'eifo at? mekhake lakh hamon zman',
            'איפה אתה? מחכה לך המון זמן',
            'eifo ata? mekhake lekha hamon zman',
          ),
          saidToHer(
            'وينِك؟ بستنّاكي من زمان',
            'wēnik? bastannāki min zamān',
            'وينَك؟ بستنّاك من زمان',
            'wēnak? bastannāk min zamān',
          ),
        ),
      },
    ],
    ask: 'What would you say back?',
    options: ["I'm coming now.", 'I like coffee.', 'It is blue.', 'Yesterday morning.'],
    correct: 0,
  },
  {
    id: 'l5-reply-thanks',
    kind: 'reply',
    heard: [
      {
        line: c(
          'Here you are — the coffee.',
          saidToHer('בבקשה, הקפה', 'bevakasha, ha-kafe', 'בבקשה, הקפה', 'bevakasha, ha-kafe'),
          saidToHer('تفضّلي، القهوة', 'tfaḍḍali, il-ʾahwe', 'تفضّل، القهوة', 'tfaḍḍal, il-ʾahwe'),
        ),
      },
    ],
    ask: 'What would you say back?',
    options: ['Thank you.', 'Where do you live?', 'I am going tomorrow.', 'It is far.'],
    correct: 0,
  },
];

// --- level 6: fillers, contractions, words run together ----------------------

const L6: ListeningItem[] = [
  {
    id: 'l6-missing-to',
    kind: 'missing',
    heard: [
      {
        line: c(
          "I'm going to the shop now.",
          ['אני הולכת לחנות עכשיו', 'ani holekhet la-khanut akhshav'],
          ['رايحة عالدكّان هلّق', 'rāyḥa ʿad-dukkān hallaʾ'],
        ),
      },
    ],
    ask: 'Which word was in the gap?',
    options: [],
    correct: 0,
    gap: {
      hebrew: { word: 'לחנות', others: ['לעבודה', 'הביתה', 'לים'] },
      arabic: { word: 'عالدكّان', others: ['عالشغل', 'عالبيت', 'عالبحر'] },
    },
    because:
      'The preposition welds itself onto the noun — la-khanut, ʿad-dukkān — so the two words arrive as one and there is no gap to hear.',
  },
  {
    id: 'l6-missing-not',
    kind: 'missing',
    heard: [
      {
        line: c(
          "I'm not going today.",
          ['אני לא הולכת היום', 'ani lo holekhet ha-yom'],
          ['أنا مش رايحة اليوم', 'ana mish rāyḥa il-yōm'],
        ),
      },
    ],
    ask: 'Which word was in the gap?',
    options: [],
    correct: 0,
    gap: {
      hebrew: { word: 'לא', others: ['כן', 'עוד', 'כבר'] },
      arabic: { word: 'مش', others: ['ما', 'لسّا', 'بعد'] },
    },
    because:
      'One syllable, unstressed, and it reverses the sentence. This is the word connected speech hides best.',
  },
  {
    id: 'l6-missing-still',
    kind: 'missing',
    heard: [
      {
        line: c(
          "I'm still learning.",
          ['אני עוד לומדת', 'ani od lomedet'],
          ['لسّا بتعلّم', 'lissa batʿallam'],
        ),
      },
    ],
    ask: 'Which word was in the gap?',
    options: [],
    correct: 0,
    gap: {
      hebrew: { word: 'עוד', others: ['לא', 'כבר', 'תמיד'] },
      arabic: { word: 'لسّا', others: ['مش', 'كمان', 'بعد'] },
    },
  },
  {
    id: 'l6-boundaries-today',
    kind: 'boundaries',
    heard: [
      {
        line: c(
          'What do you want to do today?',
          saidToHer(
            'מה את רוצה לעשות היום?',
            'ma at rotsa laasot ha-yom',
            'מה אתה רוצה לעשות היום?',
            'ma ata rotse laasot ha-yom',
          ),
          saidToHer(
            'شو بدِّك تعملي اليوم؟',
            'shu biddik tiʿmali il-yōm',
            'شو بدَّك تعمل اليوم؟',
            'shu biddak tiʿmal il-yōm',
          ),
        ),
      },
    ],
    ask: 'Put the words back in the order you heard them.',
    options: [],
    correct: 0,
    because:
      'Four words, no pause anywhere in them. Finding the joins is the exercise; the grammar you already have.',
  },
  {
    id: 'l6-boundaries-yaani',
    kind: 'boundaries',
    heard: [
      {
        line: c(
          'I mean, I do not know exactly.',
          ['זאת אומרת, אני לא יודעת בדיוק', 'zot omeret, ani lo yodaat bediyuk'],
          ['يعني، ما بعرف بالظبط', 'yaʿni, ma baʿref biẓ-ẓabṭ'],
        ),
      },
    ],
    ask: 'Put the words back in the order you heard them.',
    options: [],
    correct: 0,
    because:
      'yaʿni and zot omeret are fillers. They carry no meaning worth catching — but they take up room, and a learner who tries to translate them loses the sentence behind them.',
    variations: [
      {
        what: 'Without the filler',
        line: c(
          "I don't know exactly.",
          ['אני לא יודעת בדיוק', 'ani lo yodaat bediyuk'],
          ['ما بعرف بالظبط', 'ma baʿref biẓ-ẓabṭ'],
        ),
        note: 'The same sentence. Everything the filler added was time to think.',
      },
    ],
  },
];

// --- level 7: a word you do not know, and the sentence around it -------------

const L7: ListeningItem[] = [
  {
    id: 'l7-key-lost',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          "I can't find the key. I have been looking for an hour.",
          [
            'אני לא מוצאת את המפתח. אני מחפשת שעה',
            'ani lo motset et ha-mafteakh. ani mekhapeset shaa',
          ],
          ['مش لاقية المفتاح. صرلي ساعة بدوّر', 'mish lāʾye il-muftāḥ. ṣarli sāʿa bdawwir'],
        ),
      },
    ],
    ask: 'What is the problem?',
    options: [
      'She has lost something and has been looking a long time.',
      'She is late for something.',
      'She has locked herself out on purpose.',
      'She cannot open the door because it is broken.',
    ],
    correct: 0,
    because:
      'You may not know bdawwir or mekhapeset. "An hour" plus "not finding" is enough — which is the whole skill this level teaches.',
  },
  {
    id: 'l7-queue',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'The queue was very long, so I left.',
          ['התור היה ארוך מאוד, אז הלכתי', 'ha-tor haya arokh meod, az halakhti'],
          ['الطابور كان طويل كتير، فرحت', 'iṭ-ṭābūr kān ṭawīl ktīr, fa-ruḥt'],
        ),
      },
    ],
    ask: 'What did she do?',
    options: [
      'She gave up and left.',
      'She waited to the end.',
      'She came back later.',
      'She complained to somebody.',
    ],
    correct: 0,
    because: 'ṭābūr may be new. "Very long" and "so I went" carry it without the noun.',
  },
  {
    id: 'l7-recommend',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'Try the place next to the bank — it is excellent.',
          saidToHer(
            'תנסי את המקום ליד הבנק, הוא מצוין',
            'tenasi et ha-makom leyad ha-bank, hu metsuyan',
            'תנסה את המקום ליד הבנק, הוא מצוין',
            'tenase et ha-makom leyad ha-bank, hu metsuyan',
          ),
          saidToHer(
            'جرّبي المحلّ اللي جنب البنك، ممتاز',
            'jarribi il-maḥall illi janb il-bank, mumtāz',
            'جرّب المحلّ اللي جنب البنك، ممتاز',
            'jarrib il-maḥall illi janb il-bank, mumtāz',
          ),
        ),
      },
    ],
    ask: 'What is she being told?',
    options: [
      'To try a particular place, which is good.',
      'That the bank is closed.',
      'That the place next to the bank is bad.',
      'To meet somebody at the bank.',
    ],
    correct: 0,
    keyword: { english: 'next to', hebrew: 'ליד', arabic: 'جنب' },
  },
  {
    id: 'l7-delayed',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'The bus is late again. I will be there in half an hour.',
          [
            'האוטובוס מאחר שוב. אני אהיה שם בעוד חצי שעה',
            'ha-otobus meakher shuv. ani ehiye sham beod khatsi shaa',
          ],
          [
            'الباص متأخّر كمان مرّة. بكون هناك بعد نصّ ساعة',
            'il-bāṣ mitʾakhkhir kamān marra. bakūn hunāk baʿd nuṣṣ sāʿa',
          ],
        ),
      },
    ],
    ask: 'When will she arrive?',
    options: [
      'In about half an hour.',
      'In an hour.',
      'She is already there.',
      'She is not coming.',
    ],
    correct: 0,
    keyword: { english: 'half an hour', hebrew: 'חצי שעה', arabic: 'نصّ ساعة' },
  },
  {
    id: 'l7-crowded',
    kind: 'keyfact',
    heard: [
      {
        line: c(
          'It was so crowded that we did not stay.',
          ['היה כל כך צפוף שלא נשארנו', 'haya kol kakh tsafuf she-lo nisharnu'],
          ['كان زحمة كتير، فما ضلّينا', 'kān zaḥme ktīr, fa-ma ḍallēna'],
        ),
      },
    ],
    ask: 'Why did they leave?',
    options: [
      'It was too crowded.',
      'It was closing.',
      'It was too expensive.',
      'They were not hungry.',
    ],
    correct: 0,
    because:
      'zaḥme is the word to guess. Everything either side of it — "very", "so we didn\'t stay" — tells you which way to guess.',
  },
];

// --- level 8: the same speech, in a room ------------------------------------

const L8: ListeningItem[] = [
  {
    id: 'l8-order',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'What would you like?',
          saidToHer('מה תרצי?', 'ma tirtsi', 'מה תרצה?', 'ma tirtse'),
          saidToHer('شو بتحبّي؟', 'shu bitḥibbi', 'شو بتحبّ؟', 'shu bitḥibb'),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'A coffee, please, and water.',
          ['קפה בבקשה, ומים', 'kafe bevakasha, u-mayim'],
          ['قهوة لو سمحت، وميّة', 'ʾahwe law samaḥt, w-mayye'],
        ),
      },
    ],
    ask: 'What did B order?',
    options: ['Coffee and water.', 'Coffee only.', 'Tea and water.', 'Nothing yet.'],
    correct: 0,
    because: 'Two items joined by one letter. In a noisy room the "and" is the hard part.',
  },
  {
    id: 'l8-meet-outside',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Shall we meet outside?',
          saidToHer('ניפגש בחוץ?', 'nipagesh ba-khuts', 'ניפגש בחוץ?', 'nipagesh ba-khuts'),
          saidToHer('نتلاقى برّا؟', 'nitlāʾa barra', 'نتلاقى برّا؟', 'nitlāʾa barra'),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'Better inside — it is cold today.',
          ['עדיף בפנים, קר היום', 'adif bifnim, kar ha-yom'],
          ['أحسن جوّا، الجوّ بارد اليوم', 'aḥsan juwwa, ij-jaww bārid il-yōm'],
        ),
      },
    ],
    ask: 'Where will they meet?',
    options: ['Inside.', 'Outside.', 'They did not decide.', 'At home.'],
    correct: 0,
    keyword: { english: 'inside', hebrew: 'בפנים', arabic: 'جوّا' },
  },
  {
    id: 'l8-call-later',
    kind: 'recognise',
    heard: [
      {
        line: c(
          "I'll call you later, I can't hear a thing.",
          saidToHer(
            'אתקשר אלייך אחר כך, אני לא שומעת כלום',
            'etkasher elayikh akhar kakh, ani lo shomaat klum',
            'אתקשר אליך אחר כך, אני לא שומעת כלום',
            'etkasher elekha akhar kakh, ani lo shomaat klum',
          ),
          saidToHer(
            'بحكيكي بعدين، ما بسمع إشي',
            'baḥkīki baʿdēn, ma basmaʿ ishi',
            'بحكيك بعدين، ما بسمع إشي',
            'baḥkīk baʿdēn, ma basmaʿ ishi',
          ),
        ),
      },
    ],
    ask: 'Why is she ending the call?',
    options: [
      'She cannot hear anything.',
      'She is busy at work.',
      'She has to leave.',
      'Her phone is dying.',
    ],
    correct: 0,
    because: 'The noise is the point of the exercise and the subject of the sentence at once.',
  },
  {
    id: 'l8-say-again',
    kind: 'reply',
    heard: [
      {
        line: c(
          'Sorry — what did you say?',
          saidToHer('סליחה, מה אמרת?', 'slikha, ma amart', 'סליחה, מה אמרת?', 'slikha, ma amarta'),
          saidToHer('عفواً، شو قلتي؟', 'ʿafwan, shu ʾulti', 'عفواً، شو قلت؟', 'ʿafwan, shu ʾult'),
        ),
      },
    ],
    ask: 'What would you say back?',
    options: [
      'I said I am coming later.',
      'Yes, thank you very much.',
      'It is on the table.',
      'She lives near here.',
    ],
    correct: 0,
  },
  {
    id: 'l8-which-bus',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Which bus goes to the centre?',
          saidToHer(
            'איזה אוטובוס נוסע למרכז?',
            'eize otobus nosea la-merkaz',
            'איזה אוטובוס נוסע למרכז?',
            'eize otobus nosea la-merkaz',
          ),
          saidToHer(
            'أيّ باص بيروح عالمركز؟',
            'ayy bāṣ birūḥ ʿal-markaz',
            'أيّ باص بيروح عالمركز؟',
            'ayy bāṣ birūḥ ʿal-markaz',
          ),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'This one, but the next one is faster.',
          ['זה, אבל הבא יותר מהר', 'ze, aval ha-ba yoter maher'],
          ['هاد، بس اللي بعده أسرع', 'hād, bass illi baʿdo asraʿ'],
        ),
      },
    ],
    ask: 'What is B suggesting?',
    options: [
      'Wait for the next one — it is quicker.',
      'Take this one, it is the only one.',
      'Neither goes to the centre.',
      'Walk instead.',
    ],
    correct: 0,
    keyword: { english: 'faster', hebrew: 'יותר מהר', arabic: 'أسرع' },
  },
];

// --- level 9: longer, and what was meant rather than what was said -----------

const L9: ListeningItem[] = [
  {
    id: 'l9-put-off',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Are we still on for tomorrow?',
          saidToHer('נשאר לנו מחר?', 'nishar lanu makhar', 'נשאר לנו מחר?', 'nishar lanu makhar'),
          saidToHer(
            'ضلّينا على بكرا؟',
            'ḍallēna ʿala bukra',
            'ضلّينا على بكرا؟',
            'ḍallēna ʿala bukra',
          ),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'I mean, I have a lot on tomorrow. Maybe the day after?',
          [
            'זאת אומרת, יש לי הרבה מחר. אולי מחרתיים?',
            'zot omeret, yesh li harbe makhar. ulay makhrotayim',
          ],
          ['يعني، عندي كتير بكرا. يمكن بعد بكرا؟', 'yaʿni, ʿindi ktīr bukra. yimkin baʿd bukra'],
        ),
      },
    ],
    ask: 'What does B actually mean?',
    options: [
      'She is putting it off without saying no.',
      'She is confirming tomorrow.',
      'She is refusing outright.',
      'She has forgotten the arrangement.',
    ],
    correct: 0,
    because:
      'Nothing here is a refusal. The filler, the excuse and the counter-offer together are one, and it is not yes.',
  },
  {
    id: 'l9-directions',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Excuse me, where is the station?',
          saidToHer(
            'סליחה, איפה התחנה?',
            'slikha, eifo ha-takhana',
            'סליחה, איפה התחנה?',
            'slikha, eifo ha-takhana',
          ),
          saidToHer(
            'لو سمحتي، وين المحطّة؟',
            'law samaḥti, wēn il-maḥaṭṭa',
            'لو سمحت، وين المحطّة؟',
            'law samaḥt, wēn il-maḥaṭṭa',
          ),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'Straight on, then left after the traffic light. Five minutes.',
          [
            'ישר, ואז שמאלה אחרי הרמזור. חמש דקות',
            'yashar, ve-az smola akharei ha-ramzor. khamesh dakot',
          ],
          [
            'دغري، وبعدين على الشمال بعد الإشارة. خمس دقايق',
            'dughri, w-baʿdēn ʿash-shimāl baʿd il-ishāra. khams daʾāyiʾ',
          ],
        ),
      },
    ],
    ask: 'Which way after the traffic light?',
    options: ['Left.', 'Right.', 'Straight on.', 'Back the way you came.'],
    correct: 0,
    keyword: { english: 'left', hebrew: 'שמאלה', arabic: 'الشمال' },
    because:
      'Three instructions, and only one was asked for. Hold the one you need and let the rest go.',
  },
  {
    id: 'l9-not-sure',
    kind: 'exchange',
    heard: [
      {
        speaker: 'A',
        line: c(
          'Did you like the place?',
          saidToHer('אהבת את המקום?', 'ahavt et ha-makom', 'אהבת את המקום?', 'ahavta et ha-makom'),
          saidToHer('عجبِك المحلّ؟', 'ʿajabik il-maḥall', 'عجبَك المحلّ؟', 'ʿajabak il-maḥall'),
        ),
      },
      {
        speaker: 'B',
        line: c(
          'The food was good. The service, less so.',
          ['האוכל היה טוב. השירות פחות', 'ha-okhel haya tov. ha-sherut pakhot'],
          ['الأكل كان منيح. الخدمة أقلّ', 'il-akl kān mnīḥ. il-khidme aʾall'],
        ),
      },
    ],
    ask: 'How does B feel about the place overall?',
    options: [
      'Mixed — good food, poor service.',
      'She loved it.',
      'She hated it.',
      'She never went.',
    ],
    correct: 0,
    because: 'Nobody said "but". The second sentence does the work of one on its own.',
  },
  {
    id: 'l9-reply-sorry',
    kind: 'reply',
    heard: [
      {
        line: c(
          "I'm sorry, I forgot completely.",
          ['אני מצטערת, שכחתי לגמרי', 'ani mitstaeret, shakhakhti legamrei'],
          ['آسفة، نسيت بالمرّة', 'āsfe, nsīt bil-marra'],
        ),
      },
    ],
    ask: 'What would you say back?',
    options: [
      'Never mind, it happens.',
      'Yes, at eight o’clock.',
      'I want coffee.',
      'It is next to the bank.',
    ],
    correct: 0,
  },
  {
    id: 'l9-reply-invite',
    kind: 'reply',
    heard: [
      {
        line: c(
          'Come round to ours on Friday, we are all there.',
          saidToHer(
            'בואי אלינו ביום שישי, כולנו שם',
            'boi elenu be-yom shishi, kulanu sham',
            'בוא אלינו ביום שישי, כולנו שם',
            'bo elenu be-yom shishi, kulanu sham',
          ),
          saidToHer(
            'تعالي عنّا يوم الجمعة، كلّنا هناك',
            'taʿāli ʿinna yōm ij-jumʿa, kullna hunāk',
            'تعال عنّا يوم الجمعة، كلّنا هناك',
            'taʿāl ʿinna yōm ij-jumʿa, kullna hunāk',
          ),
        ),
      },
    ],
    ask: 'What would you say back?',
    options: [
      'Thanks — I would love to.',
      'How much does it cost?',
      'No, the coffee is cold.',
      'I do not know where he lives.',
    ],
    correct: 0,
  },
];

// --- the ladder --------------------------------------------------------------

/**
 * The nine levels, in the order they open.
 *
 * The progression is the spec's, and each step changes exactly one thing: the
 * speed, then the wording, then the length, then the number of speakers, then
 * how much of the speech is swallowed, then how much of the vocabulary is
 * missing, then the room — and finally all of it at once, with intent to read
 * rather than words to catch.
 *
 * Level 1 is the only one played `clear`. Everything above it is at ordinary
 * speed, because the spec says the slow version is a support tool and must
 * never be the version she meets first. Slow replay stays one press away on
 * every card in every level.
 */
export const LISTENING_LEVELS: ListeningLevel[] = [
  {
    id: 'l1',
    rank: 1,
    name: 'One sentence, clearly',
    claim: 'Language you know, said carefully',
    pace: 'clear',
    items: L1,
  },
  {
    id: 'l2',
    rank: 2,
    name: 'One sentence, at speed',
    claim: 'The same sentences, said the way people say them',
    pace: 'natural',
    items: L2,
  },
  {
    id: 'l3',
    rank: 3,
    name: 'Said another way',
    claim: 'Words you know, in a shape you were never taught',
    pace: 'natural',
    items: L3,
  },
  {
    id: 'l4',
    rank: 4,
    name: 'Two sentences',
    claim: 'One fact out of two — where, when, why',
    pace: 'natural',
    items: L4,
  },
  {
    id: 'l5',
    rank: 5,
    name: 'Two people',
    claim: 'A short exchange, and what it came to',
    pace: 'natural',
    items: L5,
  },
  {
    id: 'l6',
    rank: 6,
    name: 'Run together',
    claim: 'Fillers, contractions, and words with no gap between them',
    pace: 'natural',
    items: L6,
  },
  {
    id: 'l7',
    rank: 7,
    name: 'A word you do not know',
    claim: 'Understanding the sentence anyway',
    pace: 'natural',
    items: L7,
  },
  {
    id: 'l8',
    rank: 8,
    name: 'In a room',
    claim: 'The same speech with something going on behind it',
    pace: 'natural',
    ambience: 'cafe',
    items: L8,
  },
  {
    id: 'l9',
    rank: 9,
    name: 'What they meant',
    claim: 'Longer, and the answer is not in any one word',
    pace: 'natural',
    ambience: 'room',
    items: L9,
  },
];

/** Every item in the ladder, flattened, for lookups by id. */
export const LISTENING_ITEMS: ListeningItem[] = LISTENING_LEVELS.flatMap(
  (level) => level.items,
);

/**
 * Every authored line this level shows, for the glossary sweep.
 *
 * Nothing here is installed — see the file header — but all of it is read with
 * the same hoverable romanisation a card has, so every word in it still has to
 * mean something. Variations included: they are shown in the review and read
 * exactly like the line they explain.
 */
export const LISTENING_LOOSE_LINES: SeedCard[] = LISTENING_ITEMS.flatMap((item) => [
  ...item.heard.map((turn) => turn.line),
  ...(item.variations ?? []).map((variation) => variation.line),
]);
