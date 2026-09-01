import type {
  TalkLength,
  TalkLevel,
  TalkMode,
} from '../services/freetalk/protocol';

/**
 * The fixed furniture of Free Conversation: the five doors in, the topics and
 * roleplays offered behind two of them, and the names of the level's help
 * levers. No sentences live here — this level's content is generated in the
 * conversation itself, which is the whole point of it.
 */

export type FreeTalkMode = {
  id: TalkMode;
  name: string;
  claim: string;
  /** Whether the learner picks a topic or role before starting. */
  picks?: 'topic' | 'roleplay';
};

export const FREETALK_MODES: FreeTalkMode[] = [
  {
    id: 'guided',
    name: 'Guided Conversation',
    claim: 'A topic, an opening question, and help on hand',
    picks: 'topic',
  },
  {
    id: 'topic',
    name: 'Topic Conversation',
    claim: 'Pick a subject and talk it through',
    picks: 'topic',
  },
  {
    id: 'roleplay',
    name: 'Roleplay',
    claim: 'A person and a place, no script',
    picks: 'roleplay',
  },
  {
    id: 'questions',
    name: 'Question Practice',
    claim: 'Ordinary questions, answered off the cuff',
  },
  {
    id: 'surprise',
    name: 'Surprise Conversation',
    claim: 'You find out what it is about by being in it',
  },
];

export const FREETALK_TOPICS: string[] = [
  'My day',
  'Work',
  'Home',
  'Food',
  'Family',
  'Friends',
  'Learning languages',
  'Where I live',
  'What I like',
  "What I don't like",
  'Plans',
  'Travel',
  'Weather',
  'Shopping',
  'Books',
  'Films',
  'Hobbies',
  'Morning routine',
  'Evening routine',
  'What I did yesterday',
  "What I'm doing tomorrow",
];

export const FREETALK_ROLEPLAYS: string[] = [
  'A new neighbour',
  'A friend',
  'Someone at work',
  'Someone you just met',
  'A café worker',
  'A shop worker',
  'A taxi driver',
  'Someone asking for directions',
  'Someone at a bus stop',
  "A friend's family member",
  'A colleague',
  'Someone asking about your Hebrew',
  'Someone asking about your Arabic',
  'A person making small talk',
  'Someone making plans with you',
];

export const FREETALK_LEVELS: { id: TalkLevel; name: string; claim: string }[] =
  [
    { id: 1, name: 'Heavily guided', claim: 'Starters, help and gentle fixes' },
    { id: 2, name: 'Guided', claim: 'Hints and words when you ask' },
    { id: 3, name: 'Independent', claim: 'Just the topic; help stays available' },
    { id: 4, name: 'Natural', claim: 'No starters, fewer interruptions' },
    { id: 5, name: 'Unpredictable', claim: 'You do not choose the subject' },
  ];

export const FREETALK_LENGTHS: {
  id: TalkLength;
  name: string;
  claim: string;
}[] = [
  { id: 'quick', name: 'Quick', claim: 'Around 3–5 exchanges' },
  { id: 'normal', name: 'Normal', claim: 'Around 6–10 exchanges' },
  { id: 'long', name: 'Long', claim: 'Until you choose to stop' },
];

/**
 * Where "I don't know how to say this" phrases are kept for later review: an
 * ordinary category with one ordinary deck, created on first save. Found by
 * name, like every area's categories are, so it survives reinstalls and syncs
 * like anything else the learner made.
 */
export const WANTED_CATEGORY_NAME = 'Things I Wanted to Say';
export const WANTED_CATEGORY_ICON = '\u{1F4AC}';
export const WANTED_DECK_NAME = 'Things I Wanted to Say';

/** How many recent saved phrases are offered back as structures to re-practise. */
export const STRUGGLE_PHRASE_LIMIT = 5;
