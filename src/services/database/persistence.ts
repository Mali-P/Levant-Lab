/**
 * Browsers treat IndexedDB as evictable by default: under storage pressure a
 * background sweep can clear the origin, taking every card and every score
 * with it. Asking for persistent storage opts this origin out of that sweep.
 *
 * An installed PWA is normally granted it silently; a plain browser tab may be
 * refused, and older Safari has no `persist` at all. So this is best-effort by
 * design and the caller carries on regardless — a refusal costs durability,
 * never correctness.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    // Re-asking when already granted would be a no-op, but skipping the call
    // avoids a prompt on the browsers that show one.
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
