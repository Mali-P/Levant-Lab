import { isConfigured, readConfig } from '../../services/sync/client';
import {
  openResponseSchema,
  reviewResponseSchema,
  sayResponseSchema,
  turnResponseSchema,
  type OpenResponse,
  type ReviewResponse,
  type SayResponse,
  type TalkRequest,
  type TalkSetting,
  type TalkTurn,
  type TurnResponse,
} from '../../services/freetalk/protocol';

/**
 * The browser half of `/api/talk`: the same address and bearer token the sync
 * screen configures, because the talk route lives on the same server behind
 * the same lock. Nothing here retries or queues — a conversation turn that
 * failed is simply offered back to the learner to send again.
 */

export type TalkAvailability =
  /** Server reachable and holding a model key. */
  | 'ready'
  /** Server reachable, but Free Conversation is not switched on there. */
  | 'no-key'
  /** No server at the configured address. */
  | 'unreachable'
  /** No sync token entered yet, so nothing authenticated can be asked. */
  | 'unconfigured';

export async function talkAvailability(): Promise<TalkAvailability> {
  if (!isConfigured()) return 'unconfigured';
  try {
    const response = await fetch(readConfig().url + '/api/ping');
    if (!response.ok) return 'unreachable';
    const body = (await response.json()) as { service?: string; talk?: boolean };
    if (body.service !== 'levantry-sync') return 'unreachable';
    return body.talk ? 'ready' : 'no-key';
  } catch {
    return 'unreachable';
  }
}

async function post(request: TalkRequest): Promise<unknown> {
  const config = readConfig();
  let response: Response;
  try {
    response = await fetch(config.url + '/api/talk', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + config.token,
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error(
      `Could not reach ${config.url}. Free Conversation needs the Levantry ` +
        'server — check the address and token under Settings, then Sync.',
    );
  }

  const body = (await response.json().catch(() => undefined)) as
    | { error?: string }
    | undefined;
  if (!response.ok) {
    throw new Error(body?.error ?? `The server answered ${response.status}.`);
  }
  return body;
}

export async function openConversation(
  setting: TalkSetting,
): Promise<OpenResponse> {
  return openResponseSchema.parse(await post({ kind: 'open', setting }));
}

export async function sendTurn(
  setting: TalkSetting,
  history: TalkTurn[],
  message: string,
): Promise<TurnResponse> {
  return turnResponseSchema.parse(
    await post({ kind: 'turn', setting, history, message }),
  );
}

export async function askHowToSay(
  setting: TalkSetting,
  history: TalkTurn[],
  english: string,
  kind: 'say' | 'word',
): Promise<SayResponse> {
  return sayResponseSchema.parse(
    await post({ kind, setting, history, english }),
  );
}

export async function fetchReview(
  setting: TalkSetting,
  history: TalkTurn[],
): Promise<ReviewResponse> {
  return reviewResponseSchema.parse(
    await post({ kind: 'review', setting, history }),
  );
}
