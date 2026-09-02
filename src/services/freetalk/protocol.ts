import { z } from 'zod';

/**
 * The wire between the app and the server's `/api/talk` route — the one part
 * of Free Conversation that both sides must agree on, shared the same way
 * `sync/protocol.ts` is.
 *
 * Free Conversation is the first level with no authored script: the learner
 * says what she actually wants to say, and a model on the server answers,
 * corrects and reviews. Everything the model needs to stay inside the app's
 * rules — dialect, romanisation, her gender and her partner's, how much help
 * the level allows — travels in `TalkSetting`, so the server holds no session
 * state at all. The conversation itself is resent whole on every request,
 * exactly as the Messages API underneath works.
 *
 * Every response shape is a zod schema rather than a bare type, because both
 * ends face untrusted JSON: the server faces the model's output, the client
 * faces whatever the network returned. One schema, parsed at both borders.
 */

export const TALK_PROTOCOL_VERSION = 1;

export type TalkLanguage = 'hebrew' | 'arabic';

/**
 * The five ways in. They differ only in how the opening is framed and how much
 * the partner steers — the conversation machinery underneath is one machine.
 */
export type TalkMode = 'guided' | 'topic' | 'roleplay' | 'questions' | 'surprise';

/** 1 (heavily guided) to 5 (unpredictable). Decides help, not grading. */
export type TalkLevel = 1 | 2 | 3 | 4 | 5;

export type TalkLength = 'quick' | 'normal' | 'long';

/** One thing said, by either side, in the order said. */
export type TalkTurn = {
  speaker: 'partner' | 'learner';
  /** The learner's turns are exactly what she typed; the partner's are script. */
  text: string;
};

/**
 * Everything about this conversation that never changes mid-run. Assembled by
 * the client from settings, sent with every request.
 */
export type TalkSetting = {
  language: TalkLanguage;
  mode: TalkMode;
  /** Topic or roleplay name; absent for surprise, optional for questions. */
  topic?: string;
  level: TalkLevel;
  length: TalkLength;
  /** The learner's own gender: lines said TO her must agree with it. */
  learnerGender: 'female' | 'male';
  /** The persona speaking to her, so its own first-person lines agree too. */
  partnerGender: 'female' | 'male';
  /**
   * Structures she has repeatedly needed help with, so the conversation can
   * quietly make room to practise them. Phrasing opportunities, never quizzes.
   */
  strugglePhrases?: string[];
  /**
   * Whether Past & Future is far enough along that the partner may talk about
   * yesterday and tomorrow freely.
   *
   * A conversation is only useful while it stays roughly inside what she can
   * answer, and before this level every scripted thing she has met sits in the
   * present. Absent or false, the partner keeps to it; true, and "what did you
   * do yesterday?" becomes fair game.
   */
  tensesUnlocked?: boolean;
  /**
   * Whether Tell Me About It is far enough along that the partner may ask the
   * open questions — "tell me about your day", "what happened then?".
   *
   * Before that level every scripted answer she has met is one sentence long,
   * and a question that wants four is a question she can only fail. Absent or
   * false, the partner asks what a single sentence answers; true, and it starts
   * expecting — and leaving room for — a connected answer.
   */
  narrativeUnlocked?: boolean;
  /**
   * Whether Opinions & Reasons is far enough along that the partner may ask
   * what she thinks — and offer a mild opinion of its own for her to answer.
   *
   * Before that level every scripted thing she has met reports a fact, and
   * "which do you think is better, and why?" is a question she can only fail.
   * Absent or false, the partner keeps to what happened and what is; true, and
   * it starts asking why, which do you prefer, would you recommend it — and
   * saying "I think mornings are better for studying" so she has something to
   * disagree with.
   */
  opinionsUnlocked?: boolean;
};

export type TalkRequest =
  /** Start: the partner speaks first. */
  | { kind: 'open'; setting: TalkSetting }
  /** The learner answered; grade it and carry on. */
  | { kind: 'turn'; setting: TalkSetting; history: TalkTurn[]; message: string }
  /** "I don't know how to say this" — teach the sentence, both languages. */
  | { kind: 'say'; setting: TalkSetting; history: TalkTurn[]; english: string }
  /** "I need a word" — same shape, single word or short phrase. */
  | { kind: 'word'; setting: TalkSetting; history: TalkTurn[]; english: string }
  /** The conversation is over; look back over the whole of it. */
  | { kind: 'review'; setting: TalkSetting; history: TalkTurn[] };

/** One line in the target language, always carried with its two crutches. */
export const talkLineSchema = z.object({
  script: z.string(),
  transliteration: z.string(),
  english: z.string(),
});
export type TalkLine = z.infer<typeof talkLineSchema>;

/**
 * How the learner's answer landed. Deliberately three-valued rather than a
 * mark out of ten: Free Conversation grades whether she communicated, and the
 * flashcard mastery machinery is left entirely alone.
 */
export const talkOutcomeSchema = z.enum(['natural', 'improvable', 'unclear']);
export type TalkOutcome = z.infer<typeof talkOutcomeSchema>;

export const openResponseSchema = z.object({
  /** The partner's opening line. */
  reply: talkLineSchema,
  /** Response ideas / sentence starters. Populated at low levels only. */
  starters: z.array(z.string()),
});
export type OpenResponse = z.infer<typeof openResponseSchema>;

export const turnResponseSchema = z.object({
  outcome: talkOutcomeSchema,
  /**
   * The natural version of what she said, only where hers wasn't. Null for a
   * natural answer — being interrupted with praise-corrections is noise.
   */
  correction: z.object({ natural: talkLineSchema, why: z.string() }).nullable(),
  /**
   * Repair help when the meaning did not land: what went wrong, and pieces to
   * rebuild with. Null in the two outcomes where the conversation just moves.
   */
  help: z
    .object({ problem: z.string(), starters: z.array(z.string()) })
    .nullable(),
  /**
   * The partner's next line. Null when the meaning was unclear — the partner
   * waits for the repaired answer rather than talking past her.
   */
  reply: talkLineSchema.nullable(),
  /** Response ideas for `reply`, low levels only. */
  starters: z.array(z.string()),
  /** She said goodbye and the partner is closing too. */
  closed: z.boolean(),
});
export type TurnResponse = z.infer<typeof turnResponseSchema>;

/** A taught phrase carries both languages, so it can become an ordinary card. */
export const sayResponseSchema = z.object({
  english: z.string(),
  hebrew: z.object({ script: z.string(), transliteration: z.string() }),
  arabic: z.object({ script: z.string(), transliteration: z.string() }),
});
export type SayResponse = z.infer<typeof sayResponseSchema>;

export const reviewResponseSchema = z.object({
  /** Did she say what she meant? Written to her, a sentence or two. */
  communication: z.string(),
  /** A few of her own sentences that landed, as she said them. */
  strong: z.array(z.string()),
  /** The corrections worth keeping — the most important, never every slip. */
  corrections: z.array(
    z.object({ you: z.string(), natural: talkLineSchema, why: z.string() }),
  ),
  /** Language that was new to her this conversation. */
  newLanguage: z.array(talkLineSchema),
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export type TalkResponse =
  | OpenResponse
  | TurnResponse
  | SayResponse
  | ReviewResponse;
