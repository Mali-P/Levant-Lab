/**
 * A short run of capitals is a word that is spelled rather than shouted, so it
 * keeps them: "TV", "GP", "ID". Anything longer is a word that was typed with
 * caps lock on — "BATHROOM" — and is set back down.
 */
const ACRONYM = /^\p{Lu}{1,3}$/u;

/**
 * English as a sentence: one capital at the front and none of the shouting.
 *
 * Two jobs, because card content arrives from two directions. A word entered as
 * "towel" needs its capital; a word entered as "TOWEL" needs its others taken
 * away first, or capitalising the first letter changes nothing at all. Only
 * wholly upper-case text is lowered, so "Dead Sea" and anything already written
 * as a sentence come through exactly as they were typed.
 */
export function sentenceCase(text: string) {
  const words = text.split(/\s+/).filter(Boolean);

  const shouted =
    /\p{Lu}/u.test(text) &&
    !/\p{Ll}/u.test(text) &&
    // Not if any word of it is a standalone acronym: "TOWEL" comes down, "BBC"
    // and "ID card" stay as they are.
    words.every((word) => !ACRONYM.test(word));

  const base = shouted ? text.toLocaleLowerCase() : text;

  return base.replace(/^(\s*)(\p{L})/u, (_match, leading, first: string) =>
    leading + first.toLocaleUpperCase(),
  );
}
