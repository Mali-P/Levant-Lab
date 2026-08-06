type Listener = (key: string | null) => void;

/**
 * One element for the whole app. Reusing it is what makes overlapping
 * playback impossible: a second press retargets the same element, so the
 * first clip cannot keep sounding underneath the second.
 */
let element: HTMLAudioElement | null = null;
let currentKey: string | null = null;
/** Bumped on every play and stop, so a stale `ended` cannot clear a newer clip. */
let generation = 0;

const listeners = new Set<Listener>();

function announce(key: string | null): void {
  currentKey = key;
  for (const listener of listeners) listener(key);
}

function audio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!element) element = new Audio();
  return element;
}

/** The clip key currently sounding, or null. */
export function nowPlaying(): string | null {
  return currentKey;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function stopPronunciation(): void {
  generation++;
  const el = element;
  if (el) {
    el.pause();
    // Rewinding matters: the next press of the same button should replay from
    // the start rather than resume a half-finished word.
    try {
      el.currentTime = 0;
    } catch {
      // Some engines throw before any media is loaded. Nothing to rewind.
    }
  }
  if (currentKey !== null) announce(null);
}

/**
 * Plays one bundled clip, stopping whatever was playing first.
 *
 * Resolves `false` when the file cannot be played at all — missing asset,
 * decode failure, or a browser that blocks playback outside a gesture — which
 * lets the caller fall back to device speech instead of failing silently.
 */
export async function playPronunciation(
  key: string,
  url: string,
): Promise<boolean> {
  const el = audio();
  if (!el) return false;

  stopPronunciation();
  const mine = ++generation;

  el.src = url;
  el.preload = 'auto';

  const settle = () => {
    if (generation === mine) announce(null);
  };
  el.onended = settle;
  el.onerror = settle;

  announce(key);

  try {
    await el.play();
    return true;
  } catch {
    settle();
    return false;
  }
}
