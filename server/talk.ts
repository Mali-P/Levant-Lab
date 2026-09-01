/**
 * The Free Conversation brain: one function per request, no state.
 *
 * Everything the model must know arrives in the request — the setting, the
 * whole transcript so far, and what is being asked of it — so this module is
 * a pure translation layer: request in, prompt out, model JSON back, schema
 * check, response out. The server around it stays the dependency-light sync
 * server it always was; this is the one route that reaches the outside world.
 *
 * The model's output is never trusted as-is. `output_config.format` pins the
 * shape at the API level, and the shared zod schema from
 * `src/services/freetalk/protocol.ts` re-checks it before anything is sent to
 * the phone, so the client's own parse of the same schema cannot be surprised.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  openResponseSchema,
  reviewResponseSchema,
  sayResponseSchema,
  turnResponseSchema,
  type TalkRequest,
  type TalkResponse,
  type TalkSetting,
  type TalkTurn,
} from '../src/services/freetalk/protocol.ts';

const MODEL = process.env.LEVANTRY_TALK_MODEL ?? 'claude-opus-5';

export function talkConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// --- output shapes, as the API enforces them ---------------------------------

/** One target-language line: script, romanisation, meaning. */
const LINE = {
  type: 'object',
  properties: {
    script: { type: 'string' },
    transliteration: { type: 'string' },
    english: { type: 'string' },
  },
  required: ['script', 'transliteration', 'english'],
  additionalProperties: false,
} as const;

const OPEN_SCHEMA = {
  type: 'object',
  properties: {
    reply: LINE,
    starters: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'starters'],
  additionalProperties: false,
} as const;

const TURN_SCHEMA = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['natural', 'improvable', 'unclear'] },
    correction: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: { natural: LINE, why: { type: 'string' } },
          required: ['natural', 'why'],
          additionalProperties: false,
        },
      ],
    },
    help: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: {
            problem: { type: 'string' },
            starters: { type: 'array', items: { type: 'string' } },
          },
          required: ['problem', 'starters'],
          additionalProperties: false,
        },
      ],
    },
    reply: { anyOf: [{ type: 'null' }, LINE] },
    starters: { type: 'array', items: { type: 'string' } },
    closed: { type: 'boolean' },
  },
  required: ['outcome', 'correction', 'help', 'reply', 'starters', 'closed'],
  additionalProperties: false,
} as const;

const HALF = {
  type: 'object',
  properties: {
    script: { type: 'string' },
    transliteration: { type: 'string' },
  },
  required: ['script', 'transliteration'],
  additionalProperties: false,
} as const;

const SAY_SCHEMA = {
  type: 'object',
  properties: { english: { type: 'string' }, hebrew: HALF, arabic: HALF },
  required: ['english', 'hebrew', 'arabic'],
  additionalProperties: false,
} as const;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    communication: { type: 'string' },
    strong: { type: 'array', items: { type: 'string' } },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          you: { type: 'string' },
          natural: LINE,
          why: { type: 'string' },
        },
        required: ['you', 'natural', 'why'],
        additionalProperties: false,
      },
    },
    newLanguage: { type: 'array', items: LINE },
  },
  required: ['communication', 'strong', 'corrections', 'newLanguage'],
  additionalProperties: false,
} as const;

// --- the standing rules ------------------------------------------------------

/**
 * The part of the prompt that never changes, cache-controlled so a whole
 * conversation pays for it once. Language standards live here because they are
 * the rules most worth repeating verbatim on every single request: the model
 * must never drift into Modern Standard Arabic, and its romanisation must read
 * like the course's own.
 */
const BASE_PROMPT = `You are the conversation partner inside Levantry, a Hebrew and Palestinian Arabic learning app. The learner has finished scripted levels (single words, sentence building, fixed dialogues, branching scenarios) and this level, Free Conversation, is the first with no script: she says whatever she actually wants to say, and you keep a real conversation going.

LANGUAGE STANDARDS — these are absolute:
- Arabic means spoken PALESTINIAN LEVANTINE ARABIC, exactly as spoken in everyday urban Palestinian conversation. NEVER Modern Standard Arabic and never another dialect. Everyday spoken forms only: بدّي not أريد, مش not ليس, في not يوجد, هلّق/هلأ not الآن, بروح not أذهب, kīf not kayfa. Negation with ما/مش. The b- prefix on present-tense verbs. If a word would only appear in news or writing, it is the wrong word.
- Hebrew means normal spoken Modern Hebrew — the register of friends talking, not biblical or literary Hebrew.
- Arabic romanisation follows the course style: long vowels as ā ē ī ō ū, ʿ for ʿayn (baʿref, ʿarabi), ʾ for hamza and for qāf pronounced as a glottal stop (ʾahwe, baʾdar), kh gh sh, and definite article as il- (il-kalme, il-yōm). Examples in course style: wēn rāyḥa, baḥki shwayyet ʿarabi, lissa, zghīr.
- Hebrew transliteration follows the course style: kh for ח and soft כ, ts for צ, ' for א/ע where it matters (lehitra'ot), e.g. ani rotsa, ma nishma, eifo at gara.
- Every gendered form must be correct on THREE separate axes: (1) lines addressed TO the learner agree with the learner's gender; (2) your own first-person lines agree with your persona's gender; (3) word gender stays the word's own. Never show a masculine form to a female learner in a line addressed to her, or vice versa.

CONVERSATION QUALITY:
- Sound like a person, not an exercise. Keep your turns short: one or two short sentences, at most one question.
- React to what she actually said, the way a real person would. Never ask a meaningless follow-up just to continue the exercise ("what colour is the water?"). If she says "I want water", real replies are "cold?", "I'll get you some", not vocabulary drills.
- Remember the conversation. Never re-ask what she already told you; refer back to it naturally instead.
- Stay mostly within everyday vocabulary a learner at roughly A2 level would know. Let occasional natural gaps appear — they are teachable moments — but do not steer into grammar she cannot have met.
- If she closes the conversation (goodbye, I have to go, see you), close warmly and set closed=true. Do not drag it on.

GRADING HER TURNS — three outcomes only:
- natural: correct and natural. correction=null. Do not interrupt with praise; just answer her.
- improvable: the meaning is clear but grammar, word choice, agreement or naturalness is off. Fill correction with the natural version and ONE short reason, then answer her meaning anyway — communication first. Ignore trivial spelling/vowel-mark slips entirely; do not correct every small thing.
- unclear: you genuinely cannot tell what she meant, or the error changes the meaning. reply=null, fill help: name the problematic part simply, and give 2-3 sentence starters or known words she can rebuild with. The conversation waits for her repair.
- She may answer in Hebrew/Arabic script OR in romanisation, or mix — both are fully valid; grade the language, not the writing system. At levels 1-2 she may patch a missing word with English inside a target-language sentence: treat the sentence as improvable at worst, and put the missing word's target form in the correction.

REPLY FIELDS:
- reply.script is your line in the target language's script, reply.transliteration in course romanisation, reply.english a plain translation.
- starters: at level 1 always give 3-5 short response ideas/sentence starters in the target language (romanisation) for your latest line; at level 2 only when she seems stuck (after an unclear turn); at levels 3-5 always [].
- Speak ONLY the target language of this conversation in reply.script — never mix the other language in.`;

// --- per-request framing -----------------------------------------------------

const MODE_FRAMES: Record<TalkSetting['mode'], string> = {
  guided:
    'Mode: Guided Conversation — the easiest mode. Stay gently on the given topic, ask simple concrete questions, and be generous with help.',
  topic:
    'Mode: Topic Conversation — hold a natural conversation around the given topic, letting it develop from her answers rather than a script.',
  roleplay:
    'Mode: Roleplay — you ARE the named character; stay in that persona throughout. There is no fixed dialogue path: react to whatever she says.',
  questions:
    'Mode: Question Practice — ask ordinary everyday questions (name, home, work, plans, likes, yesterday, tomorrow). Build each next question out of her answer wherever possible — follow the thread, never fire unrelated questions.',
  surprise:
    'Mode: Surprise — she does not know the topic. Open with a normal everyday remark or question a friend might lead with, and move naturally between related subjects. Higher difficulty: keep it real, not exotic.',
};

const LEVEL_FRAMES: Record<number, string> = {
  1: 'Level 1 (heavily guided): simplest possible language, short sentences, always give starters, corrections gentle and always shown, English patches welcome.',
  2: 'Level 2 (guided): simple language, starters only when she is stuck, corrections concise.',
  3: 'Level 3 (independent): everyday language, no starters, correct only what genuinely matters.',
  4: 'Level 4 (natural): natural phrasing and pace, no starters, corrections sparing — save most feedback for the review.',
  5: 'Level 5 (unpredictable): fully natural conversation, drift between subjects as real ones do, minimal interruption.',
};

const LENGTH_FRAMES: Record<TalkSetting['length'], string> = {
  quick:
    'Aim for a short exchange: after roughly 3-5 of her turns, steer to a natural close (closed=true when it lands).',
  normal:
    'Aim for a middling exchange: after roughly 6-10 of her turns, steer to a natural close.',
  long: 'Open-ended: keep going until she closes it. Never pad — end when the conversation genuinely ends.',
};

function settingBlock(setting: TalkSetting): string {
  const languageName =
    setting.language === 'hebrew' ? 'Hebrew' : 'Palestinian Arabic';
  const lines = [
    `Target language of this conversation: ${languageName}.`,
    `The learner is a ${setting.learnerGender === 'female' ? 'woman' : 'man'}; your persona is a ${setting.partnerGender === 'female' ? 'woman' : 'man'}. Apply the gender axes accordingly.`,
    MODE_FRAMES[setting.mode],
    setting.topic ? `Topic / role: ${setting.topic}` : '',
    LEVEL_FRAMES[setting.level] ?? LEVEL_FRAMES[3],
    LENGTH_FRAMES[setting.length],
  ];
  if (setting.strugglePhrases?.length) {
    lines.push(
      'She has recently needed help saying: ' +
        setting.strugglePhrases.map((phrase) => `"${phrase}"`).join(', ') +
        '. Where it fits naturally, shape the conversation so those structures get another outing in a NEW context — never repeat the original sentence back as a quiz.',
    );
  }
  return lines.filter(Boolean).join('\n');
}

function transcript(history: TalkTurn[]): string {
  if (history.length === 0) return '(The conversation has not started.)';
  return history
    .map(
      (turn) =>
        (turn.speaker === 'partner' ? 'You' : 'Learner') + ': ' + turn.text,
    )
    .join('\n');
}

type OutputSchema = Record<string, unknown>;

function task(request: TalkRequest): { text: string; schema: OutputSchema } {
  switch (request.kind) {
    case 'open':
      return {
        text: 'Open the conversation: say your first line to the learner now.',
        schema: OPEN_SCHEMA as OutputSchema,
      };
    case 'turn':
      return {
        text:
          'The learner answers:\n' +
          request.message +
          '\n\nGrade it (natural / improvable / unclear) and continue the conversation.',
        schema: TURN_SCHEMA as OutputSchema,
      };
    case 'say':
    case 'word':
      return {
        text:
          `The learner pressed "${request.kind === 'say' ? "I don't know how to say this" : 'I need a word'}" and typed, in English:\n` +
          request.english +
          '\n\nTeach the natural everyday way to say it in BOTH Hebrew and Palestinian Arabic, from her mouth (her gender speaking, addressed to your persona where relevant). Keep it as one natural sentence or word, not a lesson. english is the polished English of what she meant.',
        schema: SAY_SCHEMA as OutputSchema,
      };
    case 'review':
      return {
        text: 'The conversation is over. Write the end-of-conversation review: communication (did she say what she meant — warm, honest, two sentences at most), strong (up to 3 of her own sentences that worked, exactly as she wrote them), corrections (ONLY the most useful few, never every slip), newLanguage (phrases that came up that were new to her, if any). Empty arrays are fine.',
        schema: REVIEW_SCHEMA as OutputSchema,
      };
  }
}

// --- the call ----------------------------------------------------------------

const PARSERS = {
  open: openResponseSchema,
  turn: turnResponseSchema,
  say: sayResponseSchema,
  word: sayResponseSchema,
  review: reviewResponseSchema,
} as const;

export class TalkError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Ten minutes of history is plenty; a runaway payload is a bug, not a chat. */
const MAX_HISTORY_TURNS = 120;

export async function talk(request: TalkRequest): Promise<TalkResponse> {
  if (!talkConfigured()) {
    throw new TalkError(
      503,
      'Free Conversation is not switched on: the server has no ANTHROPIC_API_KEY.',
    );
  }

  const history = 'history' in request ? request.history : [];
  if (history.length > MAX_HISTORY_TURNS) {
    throw new TalkError(400, 'That conversation history is implausibly long.');
  }

  const { text, schema } = task(request);
  const user =
    'Conversation so far:\n' + transcript(history) + '\n\n---\n' + text;

  let response: Anthropic.Message;
  try {
    response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: [
        {
          type: 'text',
          text: BASE_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: settingBlock(request.setting),
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new TalkError(503, 'The ANTHROPIC_API_KEY on the server is not valid.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new TalkError(429, 'The model is rate-limited just now — give it a moment and try again.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new TalkError(502, `The model call failed: ${error.message}`);
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new TalkError(502, 'The model declined that turn. Rephrase and try again.');
  }

  const block = response.content.find(
    (entry): entry is Anthropic.TextBlock => entry.type === 'text',
  );
  if (!block) {
    throw new TalkError(502, 'The model returned no usable answer.');
  }

  const parsed = PARSERS[request.kind].safeParse(JSON.parse(block.text));
  if (!parsed.success) {
    throw new TalkError(502, 'The model answered in a shape the app does not accept.');
  }
  return parsed.data;
}
