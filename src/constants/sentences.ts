import { c, ofSpeaker, stageDecks, type SeedCategory, type SeedDeck } from './seed';

/**
 * Sentence Building: the words she already has, put together into things she
 * can actually say.
 *
 * A separate body of content from `SEED_CATEGORIES`, and deliberately not a
 * category of it. The course teaches words; this teaches what to do with them,
 * and a learner who never opens it must still be able to finish every Basics
 * lot. Nothing here gates anything there — see `isSentenceCategory` in
 * `features/review/languagePolicy`, which is what keeps the two apart.
 *
 * **A chain is a deck.** Its cards are one sentence grown a piece at a time —
 * "I can", "I can go", "I can go there" — held in that order, because the study
 * ladder deals a deck in its own order and grows the active set one card at a
 * time. The pedagogy and the engine are already the same shape, so no new study
 * code exists for this: the ladder *is* the expansion.
 *
 * **A chain stops when the sentence is finished.** "I need → I need help" is
 * two cards and complete; padding it to five would teach a longer sentence than
 * anybody says. Some chains expand, each step adding a piece; some substitute,
 * each step swapping one piece for another; a few do both. Swapping is how a
 * learner finds out that the pattern outlives the words sitting in it.
 *
 * **Gender.** First person is the speaker's own, so Hebrew uses `ofSpeaker`
 * throughout and the feminine is the headline. Palestinian first person
 * singular carries no gender on the verb — بقدر, بدّي, بحكي are one form — so
 * the Arabic side of those is a single word, never a manufactured pair. Where
 * Palestinian *is* gendered here it is the active participle: رايحة / رايح,
 * تعبانة / تعبان, ساكنة / ساكن, and those are paired like any other.
 *
 * **Vocabulary.** Reused from the starter table wherever it exists, down to the
 * romanisation: bukra, hallaʾ, il-yōm, hnāk, mayye, ʾahwe, musāʿade. A sentence
 * should ask the learner to hold one new construction, not ten new words.
 */

/** How many flawless runs a chain asks for. Lighter than the course: this is a
 *  bridge to speaking, and it gates nothing. */
const CHAIN_RUNS = 5;

/**
 * The final test: batches drawn from every sentence at once, in both languages.
 *
 * Ten at a time out of the whole pool rather than one long pass over it, and a
 * different ten each round — which is the difference between recalling a deck
 * and recalling the language. Ten flawless batches is the real bar; the chains
 * themselves ask for five, so that getting *through* them stays possible.
 */
const FINAL_TEST_RUNS = 10;
const FINAL_TEST_BATCH = 10;

/** Hebrew whose two speaker forms are spelled alike and only sound different. */
const SAID = {
  he: 'Written the same either way; only the ending is said differently.',
};

/** A chain: one sentence, grown or swapped a piece at a time. */
function chain(name: string, cards: SeedDeck['cards']): SeedDeck {
  return { name, cards, perfectRunsRequired: CHAIN_RUNS };
}

/** Shorthand for the speaker-gendered Hebrew every first-person card carries. */
const sp = ofSpeaker;

// --- ability -------------------------------------------------------------

const ABILITY_CHAINS: SeedDeck[] = [
  chain('I can go there tomorrow morning', [
    c('I can',
      sp('אני יכולה', 'ani yekhola', 'אני יכול', 'ani yakhol'),
      ['بقدر', 'baʾdar']),
    c('I can go',
      sp('אני יכולה ללכת', 'ani yekhola lalekhet', 'אני יכול ללכת', 'ani yakhol lalekhet'),
      ['بقدر أروح', 'baʾdar arūḥ']),
    c('I can go there',
      sp('אני יכולה ללכת לשם', 'ani yekhola lalekhet lesham', 'אני יכול ללכת לשם', 'ani yakhol lalekhet lesham'),
      ['بقدر أروح لهناك', 'baʾdar arūḥ la-hnāk']),
    c('I can go there tomorrow',
      sp('אני יכולה ללכת לשם מחר', 'ani yekhola lalekhet lesham makhar', 'אני יכול ללכת לשם מחר', 'ani yakhol lalekhet lesham makhar'),
      ['بقدر أروح لهناك بكرا', 'baʾdar arūḥ la-hnāk bukra']),
    c('I can go there tomorrow morning',
      sp('אני יכולה ללכת לשם מחר בבוקר', 'ani yekhola lalekhet lesham makhar ba-boker', 'אני יכול ללכת לשם מחר בבוקר', 'ani yakhol lalekhet lesham makhar ba-boker'),
      ['بقدر أروح لهناك بكرا الصبح', 'baʾdar arūḥ la-hnāk bukra iṣ-ṣubḥ']),
  ]),
  chain("I can't come today", [
    c("I can't",
      sp('אני לא יכולה', 'ani lo yekhola', 'אני לא יכול', 'ani lo yakhol'),
      ['ما بقدر', 'ma baʾdar']),
    c("I can't come",
      sp('אני לא יכולה לבוא', 'ani lo yekhola lavo', 'אני לא יכול לבוא', 'ani lo yakhol lavo'),
      ['ما بقدر أجي', 'ma baʾdar āji']),
    c("I can't come today",
      sp('אני לא יכולה לבוא היום', 'ani lo yekhola lavo hayom', 'אני לא יכול לבוא היום', 'ani lo yakhol lavo hayom'),
      ['ما بقدر أجي اليوم', 'ma baʾdar āji il-yōm']),
  ]),
  chain('I can do it now', [
    c('I can do it',
      sp('אני יכולה לעשות את זה', "ani yekhola la'asot et ze", 'אני יכול לעשות את זה', "ani yakhol la'asot et ze"),
      ['بقدر أعمله', 'baʾdar aʿmalo']),
    c('I can do it now',
      sp('אני יכולה לעשות את זה עכשיו', "ani yekhola la'asot et ze akhshav", 'אני יכול לעשות את זה עכשיו', "ani yakhol la'asot et ze akhshav"),
      ['بقدر أعمله هلّق', 'baʾdar aʿmalo hallaʾ']),
    c('I can do it tomorrow',
      sp('אני יכולה לעשות את זה מחר', "ani yekhola la'asot et ze makhar", 'אני יכול לעשות את זה מחר', "ani yakhol la'asot et ze makhar"),
      ['بقدر أعمله بكرا', 'baʾdar aʿmalo bukra']),
  ]),
  chain('I can go there on Tuesday', [
    c('I can go on Tuesday',
      sp('אני יכולה ללכת ביום שלישי', 'ani yekhola lalekhet be-yom shlishi', 'אני יכול ללכת ביום שלישי', 'ani yakhol lalekhet be-yom shlishi'),
      ['بقدر أروح يوم الثلاثا', 'baʾdar arūḥ yōm it-talāta']),
    c('I can go there on Tuesday',
      sp('אני יכולה ללכת לשם ביום שלישי', 'ani yekhola lalekhet lesham be-yom shlishi', 'אני יכול ללכת לשם ביום שלישי', 'ani yakhol lalekhet lesham be-yom shlishi'),
      ['بقدر أروح لهناك يوم الثلاثا', 'baʾdar arūḥ la-hnāk yōm it-talāta']),
    c("I can't go there on Tuesday",
      sp('אני לא יכולה ללכת לשם ביום שלישי', 'ani lo yekhola lalekhet lesham be-yom shlishi', 'אני לא יכול ללכת לשם ביום שלישי', 'ani lo yakhol lalekhet lesham be-yom shlishi'),
      ['ما بقدر أروح لهناك يوم الثلاثا', 'ma baʾdar arūḥ la-hnāk yōm it-talāta']),
  ]),
];

// --- wants ---------------------------------------------------------------

const WANT_CHAINS: SeedDeck[] = [
  chain('I want to eat cake now', [
    c('I want',
      sp('אני רוצה', 'ani rotsa', 'אני רוצה', 'ani rotse'),
      ['بدّي', 'biddi'], SAID),
    c('I want to eat',
      sp('אני רוצה לאכול', "ani rotsa le'ekhol", 'אני רוצה לאכול', "ani rotse le'ekhol"),
      ['بدّي آكل', 'biddi ākul'], SAID),
    c('I want to eat cake',
      sp('אני רוצה לאכול עוגה', "ani rotsa le'ekhol uga", 'אני רוצה לאכול עוגה', "ani rotse le'ekhol uga"),
      ['بدّي آكل كيكة', 'biddi ākul kēke'], SAID),
    c('I want to eat cake now',
      sp('אני רוצה לאכול עוגה עכשיו', "ani rotsa le'ekhol uga akhshav", 'אני רוצה לאכול עוגה עכשיו', "ani rotse le'ekhol uga akhshav"),
      ['بدّي آكل كيكة هلّق', 'biddi ākul kēke hallaʾ'], SAID),
  ]),
  chain('I want to go home now', [
    c('I want to go',
      sp('אני רוצה ללכת', 'ani rotsa lalekhet', 'אני רוצה ללכת', 'ani rotse lalekhet'),
      ['بدّي أروح', 'biddi arūḥ'], SAID),
    c('I want to go home',
      sp('אני רוצה ללכת הביתה', 'ani rotsa lalekhet habayta', 'אני רוצה ללכת הביתה', 'ani rotse lalekhet habayta'),
      ['بدّي أروح عالبيت', 'biddi arūḥ ʿal-bēt'],
      { ...SAID, ar: 'عالبيت is عَ الْبيت run together, the way it is actually said.' }),
    c('I want to go home now',
      sp('אני רוצה ללכת הביתה עכשיו', 'ani rotsa lalekhet habayta akhshav', 'אני רוצה ללכת הביתה עכשיו', 'ani rotse lalekhet habayta akhshav'),
      ['بدّي أروح عالبيت هلّق', 'biddi arūḥ ʿal-bēt hallaʾ'], SAID),
  ]),
  chain("I don't want anything", [
    c("I don't want",
      sp('אני לא רוצה', 'ani lo rotsa', 'אני לא רוצה', 'ani lo rotse'),
      ['ما بدّي', 'ma biddi'], SAID),
    c("I don't want to go",
      sp('אני לא רוצה ללכת', 'ani lo rotsa lalekhet', 'אני לא רוצה ללכת', 'ani lo rotse lalekhet'),
      ['ما بدّي أروح', 'ma biddi arūḥ'], SAID),
    c("I don't want anything",
      sp('אני לא רוצה כלום', 'ani lo rotsa klum', 'אני לא רוצה כלום', 'ani lo rotse klum'),
      ['ما بدّي إشي', 'ma biddi ishi'], SAID),
  ]),
  // Nothing is added here: one slot changes and the frame around it holds. That
  // is the whole point of the pattern, and it is worth a chain of its own.
  chain('I want water · swapping what you want', [
    c('I want water',
      sp('אני רוצה מים', 'ani rotsa mayim', 'אני רוצה מים', 'ani rotse mayim'),
      ['بدّي ميّة', 'biddi mayye'], SAID),
    c('I want coffee',
      sp('אני רוצה קפה', 'ani rotsa kafe', 'אני רוצה קפה', 'ani rotse kafe'),
      ['بدّي قهوة', 'biddi ʾahwe'], SAID),
    c('I want to sleep',
      sp('אני רוצה לישון', 'ani rotsa lishon', 'אני רוצה לישון', 'ani rotse lishon'),
      ['بدّي أنام', 'biddi anām'], SAID),
  ]),
];

// --- needs ---------------------------------------------------------------

const NEED_CHAINS: SeedDeck[] = [
  // Two cards, and finished. "I need help" is a whole thought already, and
  // growing it further would teach a longer sentence than anybody says.
  chain('I need help', [
    c('I need',
      sp('אני צריכה', 'ani tsrikha', 'אני צריך', 'ani tsarikh'),
      ['لازمني', 'lāzimni'],
      { ar: 'لازمني is "I need" for a thing. لازم in front of a verb is "I have to …" — the next chain.' }),
    c('I need help',
      sp('אני צריכה עזרה', 'ani tsrikha ezra', 'אני צריך עזרה', 'ani tsarikh ezra'),
      ['لازمني مساعدة', 'lāzimni musāʿade']),
  ]),
  chain('I need water now', [
    c('I need water',
      sp('אני צריכה מים', 'ani tsrikha mayim', 'אני צריך מים', 'ani tsarikh mayim'),
      ['لازمني ميّة', 'lāzimni mayye']),
    c('I need water now',
      sp('אני צריכה מים עכשיו', 'ani tsrikha mayim akhshav', 'אני צריך מים עכשיו', 'ani tsarikh mayim akhshav'),
      ['لازمني ميّة هلّق', 'lāzimni mayye hallaʾ']),
    c('I need a minute',
      sp('אני צריכה רגע', 'ani tsrikha rega', 'אני צריך רגע', 'ani tsarikh rega'),
      ['لازمني دقيقة', 'lāzimni daʾīʾa']),
  ]),
  chain('I need to go home now', [
    c('I need to go',
      sp('אני צריכה ללכת', 'ani tsrikha lalekhet', 'אני צריך ללכת', 'ani tsarikh lalekhet'),
      ['لازم أروح', 'lāzim arūḥ']),
    c('I need to go home',
      sp('אני צריכה ללכת הביתה', 'ani tsrikha lalekhet habayta', 'אני צריך ללכת הביתה', 'ani tsarikh lalekhet habayta'),
      ['لازم أروح عالبيت', 'lāzim arūḥ ʿal-bēt']),
    c('I need to go home now',
      sp('אני צריכה ללכת הביתה עכשיו', 'ani tsrikha lalekhet habayta akhshav', 'אני צריך ללכת הביתה עכשיו', 'ani tsarikh lalekhet habayta akhshav'),
      ['لازم أروح عالبيت هلّق', 'lāzim arūḥ ʿal-bēt hallaʾ']),
  ]),
  chain("I don't need anything", [
    c("I don't need",
      sp('אני לא צריכה', 'ani lo tsrikha', 'אני לא צריך', 'ani lo tsarikh'),
      ['مش لازمني', 'mish lāzimni']),
    c("I don't need help",
      sp('אני לא צריכה עזרה', 'ani lo tsrikha ezra', 'אני לא צריך עזרה', 'ani lo tsarikh ezra'),
      ['مش لازمني مساعدة', 'mish lāzimni musāʿade']),
    c("I don't need anything",
      sp('אני לא צריכה כלום', 'ani lo tsrikha klum', 'אני לא צריך כלום', 'ani lo tsarikh klum'),
      ['مش لازمني إشي', 'mish lāzimni ishi']),
  ]),
];

// --- likes ---------------------------------------------------------------

const LIKE_CHAINS: SeedDeck[] = [
  chain('I like hot coffee', [
    c('I like it',
      sp('אני אוהבת את זה', 'ani ohevet et ze', 'אני אוהב את זה', 'ani ohev et ze'),
      ['بحبّه', 'baḥibbo']),
    c('I like coffee',
      sp('אני אוהבת קפה', 'ani ohevet kafe', 'אני אוהב קפה', 'ani ohev kafe'),
      ['بحبّ القهوة', "baḥibb il-ʾahwe"]),
    c('I like hot coffee',
      sp('אני אוהבת קפה חם', 'ani ohevet kafe kham', 'אני אוהב קפה חם', 'ani ohev kafe kham'),
      ['بحبّ القهوة السخنة', 'baḥibb il-ʾahwe is-sukhne']),
  ]),
  chain("I don't like it cold", [
    c("I don't like it",
      sp('אני לא אוהבת את זה', 'ani lo ohevet et ze', 'אני לא אוהב את זה', 'ani lo ohev et ze'),
      ['ما بحبّه', 'ma baḥibbo']),
    c("I don't like coffee",
      sp('אני לא אוהבת קפה', 'ani lo ohevet kafe', 'אני לא אוהב קפה', 'ani lo ohev kafe'),
      ['ما بحبّ القهوة', "ma baḥibb il-ʾahwe"]),
    c("I don't like it cold",
      sp('אני לא אוהבת את זה קר', 'ani lo ohevet et ze kar', 'אני לא אוהב את זה קר', 'ani lo ohev et ze kar'),
      ['ما بحبّه بارد', 'ma baḥibbo bārid'],
      { ar: 'بارد is a cold thing. A cold *person* is بردان / بردانة — a different word.' }),
  ]),
  chain('I like reading books', [
    c('I like to read',
      sp('אני אוהבת לקרוא', 'ani ohevet likro', 'אני אוהב לקרוא', 'ani ohev likro'),
      ['بحبّ أقرا', "baḥibb aʾra"]),
    c('I like reading books',
      sp('אני אוהבת לקרוא ספרים', 'ani ohevet likro sfarim', 'אני אוהב לקרוא ספרים', 'ani ohev likro sfarim'),
      ['بحبّ أقرا كتب', "baḥibb aʾra kutub"]),
    c('I like reading at home',
      sp('אני אוהבת לקרוא בבית', 'ani ohevet likro ba-bayit', 'אני אוהב לקרוא בבית', 'ani ohev likro ba-bayit'),
      ['بحبّ أقرا بالبيت', "baḥibb aʾra bil-bēt"]),
  ]),
];

// --- what you have -------------------------------------------------------

const HAVE_CHAINS: SeedDeck[] = [
  // No speaker gender in either language: יש לי and عندي are the same from
  // anybody. A chain that needs no pair is written without one.
  chain('I have time', [
    c('I have', ['יש לי', 'yesh li'], ['عندي', 'ʿindi']),
    c('I have water', ['יש לי מים', 'yesh li mayim'], ['عندي ميّة', 'ʿindi mayye']),
    c('I have time', ['יש לי זמן', 'yesh li zman'], ['عندي وقت', 'ʿindi waʾt']),
  ]),
  chain("I don't have time today", [
    c("I don't have", ['אין לי', 'ein li'], ['ما عندي', 'ma ʿindi']),
    c("I don't have time", ['אין לי זמן', 'ein li zman'], ['ما عندي وقت', 'ma ʿindi waʾt']),
    c("I don't have time today",
      ['אין לי זמן היום', 'ein li zman hayom'],
      ['ما عندي وقت اليوم', 'ma ʿindi waʾt il-yōm']),
  ]),
];

// --- how you are ---------------------------------------------------------

const STATE_CHAINS: SeedDeck[] = [
  chain('I am very tired', [
    c('I am tired',
      sp('אני עייפה', 'ani ayefa', 'אני עייף', 'ani ayef'),
      sp('أنا تعبانة', 'ana taʿbāne', 'أنا تعبان', 'ana taʿbān')),
    c('I am hungry',
      sp('אני רעבה', "ani re'eva", 'אני רעב', "ani ra'ev"),
      sp('أنا جوعانة', 'ana jūʿāne', 'أنا جوعان', 'ana jūʿān')),
    c('I am very tired',
      sp('אני מאוד עייפה', "ani me'od ayefa", 'אני מאוד עייף', "ani me'od ayef"),
      sp('أنا تعبانة كتير', 'ana taʿbāne ktīr', 'أنا تعبان كتير', 'ana taʿbān ktīr')),
  ]),
  chain('I am busy today', [
    c('I am ready',
      sp('אני מוכנה', 'ani mukhana', 'אני מוכן', 'ani mukhan'),
      sp('أنا جاهزة', 'ana jāhze', 'أنا جاهز', 'ana jāhiz')),
    c('I am busy',
      sp('אני עסוקה', 'ani asuka', 'אני עסוק', 'ani asuk'),
      sp('أنا مشغولة', 'ana mashghūle', 'أنا مشغول', 'ana mashghūl')),
    c('I am busy today',
      sp('אני עסוקה היום', 'ani asuka hayom', 'אני עסוק היום', 'ani asuk hayom'),
      sp('أنا مشغولة اليوم', 'ana mashghūle il-yōm', 'أنا مشغول اليوم', 'ana mashghūl il-yōm')),
  ]),
  chain('I am at home now', [
    c('I am here', ['אני פה', 'ani po'], ['أنا هون', 'ana hōn']),
    c('I am at home', ['אני בבית', 'ani ba-bayit'], ['أنا بالبيت', 'ana bil-bēt']),
    c('I am at home now',
      ['אני בבית עכשיו', 'ani ba-bayit akhshav'],
      ['أنا بالبيت هلّق', 'ana bil-bēt hallaʾ']),
  ]),
];

// --- talking about your Hebrew and Arabic --------------------------------

const LANGUAGE_CHAINS: SeedDeck[] = [
  chain('I am learning Hebrew and Arabic', [
    c('I am learning',
      sp('אני לומדת', 'ani lomedet', 'אני לומד', 'ani lomed'),
      ['عم أتعلّم', "ʿam atʿallam"]),
    c('I am learning Hebrew',
      sp('אני לומדת עברית', 'ani lomedet ivrit', 'אני לומד עברית', 'ani lomed ivrit'),
      ['عم أتعلّم عبري', "ʿam atʿallam ʿibri"]),
    c('I am learning Arabic',
      sp('אני לומדת ערבית', 'ani lomedet aravit', 'אני לומד ערבית', 'ani lomed aravit'),
      ['عم أتعلّم عربي', "ʿam atʿallam ʿarabi"]),
    c('I am learning Hebrew and Arabic',
      sp('אני לומדת עברית וערבית', 'ani lomedet ivrit ve-aravit', 'אני לומד עברית וערבית', 'ani lomed ivrit ve-aravit'),
      ['عم أتعلّم عبري وعربي', "ʿam atʿallam ʿibri w-ʿarabi"]),
  ]),
  chain('I am learning to speak Hebrew better', [
    c('I am learning to speak',
      sp('אני לומדת לדבר', 'ani lomedet ledaber', 'אני לומד לדבר', 'ani lomed ledaber'),
      ['عم أتعلّم أحكي', "ʿam atʿallam aḥki"]),
    c('I am learning to speak Hebrew',
      sp('אני לומדת לדבר עברית', 'ani lomedet ledaber ivrit', 'אני לומד לדבר עברית', 'ani lomed ledaber ivrit'),
      ['عم أتعلّم أحكي عبري', "ʿam atʿallam aḥki ʿibri"]),
    c('I am learning to speak Arabic',
      sp('אני לומדת לדבר ערבית', 'ani lomedet ledaber aravit', 'אני לומד לדבר ערבית', 'ani lomed ledaber aravit'),
      ['عم أتعلّم أحكي عربي', "ʿam atʿallam aḥki ʿarabi"]),
    c('I am learning to speak Hebrew better',
      sp('אני לומדת לדבר עברית יותר טוב', 'ani lomedet ledaber ivrit yoter tov', 'אני לומד לדבר עברית יותר טוב', 'ani lomed ledaber ivrit yoter tov'),
      ['عم أتعلّم أحكي عبري أحسن', "ʿam atʿallam aḥki ʿibri aḥsan"]),
  ]),
  chain('I am learning to read and understand', [
    c('I am learning to read Hebrew',
      sp('אני לומדת לקרוא עברית', 'ani lomedet likro ivrit', 'אני לומד לקרוא עברית', 'ani lomed likro ivrit'),
      ['عم أتعلّم أقرا عبري', "ʿam atʿallam aʾra ʿibri"]),
    c('I am learning to read Arabic',
      sp('אני לומדת לקרוא ערבית', 'ani lomedet likro aravit', 'אני לומד לקרוא ערבית', 'ani lomed likro aravit'),
      ['عم أتعلّم أقرا عربي', "ʿam atʿallam aʾra ʿarabi"]),
    c('I am learning to understand Hebrew',
      sp('אני לומדת להבין עברית', 'ani lomedet lehavin ivrit', 'אני לומד להבין עברית', 'ani lomed lehavin ivrit'),
      ['عم أتعلّم أفهم عبري', "ʿam atʿallam afham ʿibri"]),
    c('I am learning to understand Arabic',
      sp('אני לומדת להבין ערבית', 'ani lomedet lehavin aravit', 'אני לומד להבין ערבית', 'ani lomed lehavin aravit'),
      ['عم أتعلّم أفهم عربي', "ʿam atʿallam afham ʿarabi"]),
  ]),
  // The frame that outlives its contents: "I am studying + ___". The subjects
  // here are deliberately not the two languages, so the pattern is met as a
  // pattern rather than as four more sentences about Hebrew.
  chain('I am studying · swapping the subject', [
    c('I am studying English',
      sp('אני לומדת אנגלית', 'ani lomedet anglit', 'אני לומד אנגלית', 'ani lomed anglit'),
      ['عم أدرس إنجليزي', "ʿam adrus ingilīzi"],
      { he: 'Hebrew uses one verb for learning and studying alike.' }),
    c('I am studying history',
      sp('אני לומדת היסטוריה', 'ani lomedet historya', 'אני לומד היסטוריה', 'ani lomed historya'),
      ['عم أدرس تاريخ', "ʿam adrus tārīkh"]),
    c('I am studying at home',
      sp('אני לומדת בבית', 'ani lomedet ba-bayit', 'אני לומד בבית', 'ani lomed ba-bayit'),
      ['عم أدرس بالبيت', "ʿam adrus bil-bēt"]),
    c('I am studying today',
      sp('אני לומדת היום', 'ani lomedet hayom', 'אני לומד היום', 'ani lomed hayom'),
      ['عم أدرس اليوم', "ʿam adrus il-yōm"]),
    c('I study every day',
      sp('אני לומדת כל יום', 'ani lomedet kol yom', 'אני לומד כל יום', 'ani lomed kol yom'),
      ['بدرس كل يوم', 'badrus kull yōm'],
      { ar: 'عم marks what is happening now; without it, بدرس is what she does generally.' }),
  ]),
  chain('I want to improve my Arabic', [
    c('I am still learning',
      sp('אני עדיין לומדת', 'ani adayin lomedet', 'אני עדיין לומד', 'ani adayin lomed'),
      ['لسّا عم أتعلّم', "lissa ʿam atʿallam"]),
    c('I started learning not long ago',
      sp('התחלתי ללמוד לא מזמן', 'hitkhalti lilmod lo mizman', 'התחלתי ללמוד לא מזמן', 'hitkhalti lilmod lo mizman'),
      ['صرلي شوي عم أتعلّم', "ṣarli shwayy ʿam atʿallam"],
      { he: 'Hebrew past tense is the same word here for a woman and a man.',
        ar: 'Literally "it has been a little while that I am learning" — how Palestinian says it.' }),
    c('I am trying to improve my Hebrew',
      sp('אני מנסה לשפר את העברית שלי', 'ani menasa leshaper et ha-ivrit sheli', 'אני מנסה לשפר את העברית שלי', 'ani menase leshaper et ha-ivrit sheli'),
      ['عم أحاول أحسّن عبري', "ʿam aḥāwil aḥassin ʿibri"], SAID),
    c('I want to improve my Arabic',
      sp('אני רוצה לשפר את הערבית שלי', 'ani rotsa leshaper et ha-aravit sheli', 'אני רוצה לשפר את הערבית שלי', 'ani rotse leshaper et ha-aravit sheli'),
      ['بدّي أحسّن عربي', "biddi aḥassin ʿarabi"], SAID),
  ]),
  chain('I speak a little', [
    c('a little', ['קצת', 'ktsat'], ['شويّة', 'shwayye']),
    c('I speak a little',
      sp('אני מדברת קצת', 'ani medaberet ktsat', 'אני מדבר קצת', 'ani medaber ktsat'),
      ['بحكي شويّة', 'baḥki shwayye']),
    c('I understand a little',
      sp('אני מבינה קצת', 'ani mevina ktsat', 'אני מבין קצת', 'ani mevin ktsat'),
      ['بفهم شويّة', 'bafham shwayye']),
    c('I read a little',
      sp('אני קוראת קצת', 'ani koret ktsat', 'אני קורא קצת', 'ani kore ktsat'),
      ['بقرا شويّة', "baʾra shwayye"]),
    c('not very well yet',
      ['עדיין לא כל כך טוב', 'adayin lo kol kakh tov'],
      ['لسّا مش كتير منيح', 'lissa mish ktīr mnīḥ']),
  ]),
  chain("I understand, but I don't know how to answer", [
    c('I understand more than I speak',
      sp('אני מבינה יותר ממה שאני מדברת', 'ani mevina yoter mi-ma she-ani medaberet', 'אני מבין יותר ממה שאני מדבר', 'ani mevin yoter mi-ma she-ani medaber'),
      ['بفهم أكتر مما بحكي', 'bafham aktar mimma baḥki']),
    c("I understand, but I don't know how to answer",
      sp('אני מבינה, אבל אני לא יודעת איך לענות', "ani mevina, aval ani lo yoda'at ekh la'anot", 'אני מבין, אבל אני לא יודע איך לענות', "ani mevin, aval ani lo yode'a ekh la'anot"),
      ['بفهم، بس ما بعرف كيف أردّ', 'bafham, bass ma baʿref kīf aridd']),
    c('I know the word, but not the sentence',
      sp('אני יודעת את המילה, אבל לא את המשפט', "ani yoda'at et ha-mila, aval lo et ha-mishpat", 'אני יודע את המילה, אבל לא את המשפט', "ani yode'a et ha-mila, aval lo et ha-mishpat"),
      ['بعرف الكلمة، بس مش الجملة', 'baʿref il-kalme, bass mish ij-jumle']),
    c("I don't know how to say it yet",
      sp('אני עדיין לא יודעת איך להגיד את זה', "ani adayin lo yoda'at ekh lehagid et ze", 'אני עדיין לא יודע איך להגיד את זה', "ani adayin lo yode'a ekh lehagid et ze"),
      ['لسّا ما بعرف كيف بقولها', 'lissa ma baʿref kīf baʾūlha']),
  ]),
];

// --- answering everyday questions ----------------------------------------

const ANSWER_CHAINS: SeedDeck[] = [
  chain('Where are you going?', [
    c('I am going home',
      sp('אני הולכת הביתה', 'ani holekhet habayta', 'אני הולך הביתה', 'ani holekh habayta'),
      sp('رايحة عالبيت', 'rāyḥa ʿal-bēt', 'رايح عالبيت', 'rāyiḥ ʿal-bēt')),
    c('I am going there',
      sp('אני הולכת לשם', 'ani holekhet lesham', 'אני הולך לשם', 'ani holekh lesham'),
      sp('رايحة لهناك', 'rāyḥa la-hnāk', 'رايح لهناك', 'rāyiḥ la-hnāk')),
    c('I am going outside',
      sp('אני יוצאת החוצה', 'ani yotset ha-khutsa', 'אני יוצא החוצה', 'ani yotse ha-khutsa'),
      sp('رايحة عبرّا', 'rāyḥa ʿa-barra', 'رايح عبرّا', 'rāyiḥ ʿa-barra')),
    c('I am going to the shop',
      sp('אני הולכת לחנות', 'ani holekhet la-khanut', 'אני הולך לחנות', 'ani holekh la-khanut'),
      sp('رايحة عالدكّان', 'rāyḥa ʿad-dukkān', 'رايح عالدكّان', 'rāyiḥ ʿad-dukkān')),
    c('I am not going anywhere',
      sp('אני לא הולכת לשום מקום', 'ani lo holekhet le-shum makom', 'אני לא הולך לשום מקום', 'ani lo holekh le-shum makom'),
      sp('مش رايحة ولا مكان', 'mish rāyḥa wala makān', 'مش رايح ولا مكان', 'mish rāyiḥ wala makān')),
  ]),
  chain('When are you going?', [
    c('I am going now',
      sp('אני הולכת עכשיו', 'ani holekhet akhshav', 'אני הולך עכשיו', 'ani holekh akhshav'),
      sp('رايحة هلّق', 'rāyḥa hallaʾ', 'رايح هلّق', 'rāyiḥ hallaʾ')),
    c('I am going later',
      sp('אני הולכת אחר כך', 'ani holekhet akhar kakh', 'אני הולך אחר כך', 'ani holekh akhar kakh'),
      sp('رايحة بعدين', 'rāyḥa baʿdēn', 'رايح بعدين', 'rāyiḥ baʿdēn')),
    c('I am going tomorrow',
      sp('אני הולכת מחר', 'ani holekhet makhar', 'אני הולך מחר', 'ani holekh makhar'),
      sp('رايحة بكرا', 'rāyḥa bukra', 'رايح بكرا', 'rāyiḥ bukra')),
    c('I am going on Tuesday',
      sp('אני הולכת ביום שלישי', 'ani holekhet be-yom shlishi', 'אני הולך ביום שלישי', 'ani holekh be-yom shlishi'),
      sp('رايحة يوم الثلاثا', 'rāyḥa yōm it-talāta', 'رايح يوم الثلاثا', 'rāyiḥ yōm it-talāta')),
    c('I am going tomorrow morning',
      sp('אני הולכת מחר בבוקר', 'ani holekhet makhar ba-boker', 'אני הולך מחר בבוקר', 'ani holekh makhar ba-boker'),
      sp('رايحة بكرا الصبح', 'rāyḥa bukra iṣ-ṣubḥ', 'رايح بكرا الصبح', 'rāyiḥ bukra iṣ-ṣubḥ')),
  ]),
  chain('What are you doing?', [
    c('I am working',
      sp('אני עובדת', 'ani ovedet', 'אני עובד', 'ani oved'),
      ['عم أشتغل', "ʿam ashtighil"]),
    c('I am eating',
      sp('אני אוכלת', 'ani okhelet', 'אני אוכל', 'ani okhel'),
      ['عم آكل', "ʿam ākul"]),
    c('I am reading',
      sp('אני קוראת', 'ani koret', 'אני קורא', 'ani kore'),
      ['عم أقرا', "ʿam aʾra"]),
    c('I am studying',
      sp('אני לומדת', 'ani lomedet', 'אני לומד', 'ani lomed'),
      ['عم أدرس', "ʿam adrus"]),
    c('I am resting',
      sp('אני נחה', 'ani nakha', 'אני נח', 'ani nakh'),
      ['عم أرتاح', "ʿam artāḥ"]),
  ]),
  chain('What do you need?', [
    c('I need to sit down',
      sp('אני צריכה לשבת', 'ani tsrikha lashevet', 'אני צריך לשבת', 'ani tsarikh lashevet'),
      ['لازم أقعد', "lāzim aʾʿud"]),
    c('I need to rest',
      sp('אני צריכה לנוח', 'ani tsrikha lanuakh', 'אני צריך לנוח', 'ani tsarikh lanuakh'),
      ['لازم أرتاح', 'lāzim artāḥ']),
    c('I need to eat something',
      sp('אני צריכה לאכול משהו', "ani tsrikha le'ekhol mashehu", 'אני צריך לאכול משהו', "ani tsarikh le'ekhol mashehu"),
      ['لازم آكل إشي', 'lāzim ākul ishi']),
    c('I need to speak to you',
      sp('אני צריכה לדבר איתך', 'ani tsrikha ledaber itakh', 'אני צריך לדבר איתך', 'ani tsarikh ledaber itakh'),
      ['لازم أحكي معك', 'lāzim aḥki maʿak'],
      { he: 'איתך is itakh to a woman and itkha to a man.',
        ar: 'معك is maʿak to a man and maʿik to a woman.' }),
  ]),
];

// --- saying why ----------------------------------------------------------

const WHY_CHAINS: SeedDeck[] = [
  chain('Because …', [
    c('because', ['כי', 'ki'], ['لأنّه', 'laʾinno']),
    c('because I want to learn',
      sp('כי אני רוצה ללמוד', 'ki ani rotsa lilmod', 'כי אני רוצה ללמוד', 'ki ani rotse lilmod'),
      ['لأنّه بدّي أتعلّم', "laʾinno biddi atʿallam"], SAID),
    c('because I live here',
      sp('כי אני גרה פה', 'ki ani gara po', 'כי אני גר פה', 'ki ani gar po'),
      sp('لأنّه ساكنة هون', 'laʾinno sākne hōn', 'لأنّه ساكن هون', 'laʾinno sākin hōn')),
    c('because I need it',
      sp('כי אני צריכה את זה', 'ki ani tsrikha et ze', 'כי אני צריך את זה', 'ki ani tsarikh et ze'),
      ['لأنّه لازمني', 'laʾinno lāzimni']),
    c('because I like it',
      sp('כי אני אוהבת את זה', 'ki ani ohevet et ze', 'כי אני אוהב את זה', 'ki ani ohev et ze'),
      ['لأنّه بحبّه', 'laʾinno baḥibbo']),
    c('because I want to understand',
      sp('כי אני רוצה להבין', 'ki ani rotsa lehavin', 'כי אני רוצה להבין', 'ki ani rotse lehavin'),
      ['لأنّه بدّي أفهم', 'laʾinno biddi afham'], SAID),
  ]),
];

// --- the groups ----------------------------------------------------------

/** The chains as they are authored: plain both-language decks, in course order. */
const AUTHORED_GROUPS: SeedCategory[] = [
  { name: 'Saying what you can', icon: '💪', decks: ABILITY_CHAINS },
  { name: 'Saying what you want', icon: '⭐', decks: WANT_CHAINS },
  { name: 'Saying what you need', icon: '🙏', decks: NEED_CHAINS },
  { name: 'Saying what you like', icon: '❤️', decks: LIKE_CHAINS },
  { name: 'Saying what you have', icon: '🎒', decks: HAVE_CHAINS },
  { name: 'Saying how you are', icon: '🧍', decks: STATE_CHAINS },
  { name: 'Talking about your Hebrew and Arabic', icon: '📚', decks: LANGUAGE_CHAINS },
  { name: 'Answering everyday questions', icon: '❓', decks: ANSWER_CHAINS },
  { name: 'Saying why', icon: '💡', decks: WHY_CHAINS },
];

/** Every sentence the area teaches, in the order the chains are laid out. */
const EVERY_SENTENCE = AUTHORED_GROUPS.flatMap((group) =>
  group.decks.flatMap((deck) => deck.cards),
);

/**
 * The capstone, and the only place the whole pool is asked at once.
 *
 * `masteryOnly` so it opens straight into shuffled rounds — there is nothing
 * here to introduce, since every card has already been met inside its chain —
 * and `roundSize` so a round is ten drawn from the pool rather than one pass
 * over all of it. A hundred-card pass would be unfinishable; ten out of a
 * hundred, ten times over, is the same claim made in a way a person can hold.
 */
const FINAL_TEST_GROUP: SeedCategory = {
  name: 'Sentences: final test',
  icon: '🏁',
  decks: [
    {
      name: 'Every sentence, ten at a time',
      cards: EVERY_SENTENCE,
      studyLanguages: ['hebrew', 'arabic'],
      masteryOnly: true,
      roundSize: FINAL_TEST_BATCH,
      perfectRunsRequired: FINAL_TEST_RUNS,
    },
  ],
};

/**
 * Sentence Building as it installs: every chain a language ladder.
 *
 * Staged exactly like the course — Hebrew, then Palestinian Arabic, then the
 * two together over the same sentences — so a learner can take one language at
 * a time without ever meeting a sentence she has to absorb twice at once. The
 * final test is `masteryOnly` and passes through unstaged: it is the capstone
 * over both languages, not another rung to climb.
 */
export const SENTENCE_CATEGORIES: SeedCategory[] = [
  ...AUTHORED_GROUPS.map((group) => ({
    ...group,
    decks: stageDecks(group.decks),
  })),
  FINAL_TEST_GROUP,
];

/**
 * The names Sentence Building owns, so the course ladder can leave them out.
 *
 * Name-based, like `CUSTOM_CATEGORY` and `BASICS_CATEGORY_NAME` before it: the
 * category rows on disk carry nothing else that says which area they belong to,
 * and adding a stored field would need a migration on every install to buy what
 * a set of names already answers.
 */
export const SENTENCE_CATEGORY_NAMES: ReadonlySet<string> = new Set(
  SENTENCE_CATEGORIES.map((group) => group.name.toLowerCase()),
);

/** The final test's category, which the area lays out apart from the chains. */
export const SENTENCE_FINAL_TEST_CATEGORY = FINAL_TEST_GROUP.name;
