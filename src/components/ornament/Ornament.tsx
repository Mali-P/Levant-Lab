import type { IconName } from './Icon';

/**
 * Ornament: the decorative half of the stone system.
 *
 * Everything here is `aria-hidden`. None of it carries information, none of
 * it is the only cue for anything, and none of it is placed where text can
 * run into it — a divider is a divider, not a heading, and a motif in an
 * empty state sits above the sentence that actually explains the state.
 *
 * The vocabulary is drawn from Levantine material culture — pottery banding,
 * diamonds and triangles, rosettes, olive branches, pomegranates — and used
 * sparingly. A card gets at most one.
 */

/* -------------------------------------------------------------- divider -- */

export type EngravedDividerProps = {
  /**
   * `card` tunes the stroke for the ivory card face, which is paler than a
   * panel and needs a warmer line to register at all.
   */
  tone?: 'panel' | 'card';
  /** Half the vertical room, for a card face that is short on it. */
  tight?: boolean;
  className?: string;
};

/**
 * A section divider taken from a pottery band: a ruled line broken by a
 * diamond between two flanking triangles.
 */
export function EngravedDivider({
  tone = 'panel',
  tight,
  className,
}: EngravedDividerProps) {
  return (
    <svg
      className={
        'engraved-divider' +
        (tone === 'card' ? ' on-card' : '') +
        (tight ? ' tight' : '') +
        (className ? ' ' + className : '')
      }
      viewBox="0 0 200 12"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6h78M120 6h78" />
        <path d="M100 1.5 105.5 6 100 10.5 94.5 6z" />
        <path d="M86 3.5 90.5 6 86 8.5zM114 3.5 109.5 6 114 8.5z" />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- motif -- */

export type MotifName = 'rosette' | 'olive' | 'pomegranate' | 'amphora' | 'band';

const MOTIFS: Record<MotifName, JSX.Element> = {
  // A carved rosette: eight petals around a drilled centre.
  rosette: (
    <>
      <circle cx="32" cy="32" r="26" />
      <circle cx="32" cy="32" r="9" />
      <circle cx="32" cy="32" r="3" />
      <path d="M32 6v17M32 41v17M6 32h17M41 32h23M13.6 13.6 25.6 25.6M38.4 38.4 50.4 50.4M50.4 13.6 38.4 25.6M25.6 38.4 13.6 50.4" />
    </>
  ),
  // An olive sprig: a stem with three leaves and two fruit.
  olive: (
    <>
      <path d="M8 54C18 36 32 22 56 12" />
      <path d="M20 42c-2-5 1-10 8-11.5.5 6-2.5 10-8 11.5zM33 29c-1-5 2.5-9.5 9.5-10-.5 6-3.5 9.5-9.5 10zM27 52c-4.5-3-5-8.5-1-12.5 3 5 3.5 9.5 1 12.5z" />
      <circle cx="41" cy="43" r="4" />
      <circle cx="52" cy="30" r="3.4" />
    </>
  ),
  // A pomegranate: the crown, the body, and its seeds.
  pomegranate: (
    <>
      <path d="M32 18c12 0 20 9 20 19s-9 19-20 19-20-9-20-19 8-19 20-19z" />
      <path d="M32 18V8M26 10l6 6 6-6" />
      <path d="M24 34h.01M32 42h.01M40 34h.01M28 46h.01M36 46h.01" />
    </>
  ),
  // A storage amphora, two-handled.
  amphora: (
    <>
      <path d="M24 8h16M26 8v6c-5 3.5-8 9-8 15.5C18 39 24.5 46 32 46s14-7 14-16.5c0-6.5-3-12-8-15.5V8" />
      <path d="M26 46v7h12v-7" />
      <path d="M17.5 22C13 23 11.5 26.5 13.5 30M46.5 22c4.5 1 6 4.5 4 8" />
      <path d="M22 53h20" />
    </>
  ),
  // A running band of diamonds, for a wide separator.
  band: (
    <>
      <path d="M2 32h60" />
      <path d="M14 22 24 32 14 42 4 32zM32 24l8 8-8 8-8-8zM50 22l10 10-10 10-10-10z" />
    </>
  ),
};

export type LevantMotifProps = {
  name: MotifName;
  size?: number;
  className?: string;
};

/**
 * A single decorative motif, sized in pixels rather than ems so an empty
 * state's ornament does not grow with the user's font-scale setting and
 * start crowding the sentence beneath it.
 */
export function LevantMotif({ name, size = 64, className }: LevantMotifProps) {
  return (
    <svg
      className={'levant-motif' + (className ? ' ' + className : '')}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {MOTIFS[name]}
    </svg>
  );
}

/* ---------------------------------------------------------------- brand -- */

/**
 * The Levantry mark: a carved rosette held inside a chiselled tablet.
 * Geometric rather than pictorial, so it stays legible at the 34px it drops
 * to on a 320px screen.
 */
export function LevantryMark({ className }: { className?: string }) {
  return (
    <svg
      className={'brand-mark' + (className ? ' ' + className : '')}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 12.5 24 3l18 9.5v23L24 45 6 35.5z" />
      <circle cx="24" cy="24" r="8.5" />
      <circle cx="24" cy="24" r="2.6" />
      <path d="M24 12v4M24 32v4M12 24h4M32 24h4" />
      <path d="m16.6 16.6 2.8 2.8M28.6 28.6l2.8 2.8M31.4 16.6l-2.8 2.8M19.4 28.6l-2.8 2.8" />
    </svg>
  );
}

/**
 * The wordmark: the app's name in the editorial serif, with the two languages
 * it teaches named beneath it in their own scripts.
 *
 * The two script runs are each isolated so the bidi algorithm cannot reorder
 * them around the separator, and they use the same native faces as the
 * learning content — no antiqued or distressed face is applied to either.
 */
export function Wordmark() {
  return (
    <div className="brand">
      <LevantryMark />
      <div className="brand-text">
        <h1 className="brand-name">Levantry</h1>
        <p className="brand-langs">
          <span className="brand-he" lang="he" dir="rtl">
            עברית
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span className="brand-ar" lang="ar" dir="rtl">
            العربية الشامية
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- category marks -- */

/**
 * The engraved mark for each starter category.
 *
 * Keyed by the category's display name rather than by its id, because ids are
 * generated per install — the seed does not ship stable ones. A category the
 * learner created, renamed or imported simply falls through to `undefined`,
 * and the screens then fall back to whatever emoji is stored on the record.
 * Nothing here writes to `category.icon`, so no existing library is rewritten
 * by the restyle.
 */
const CATEGORY_MARKS: Record<string, IconName> = {
  Greetings: 'olive',
  'Counting and numbers': 'tally',
  'Food and drink': 'amphora',
  Family: 'family',
  // Pronouns take the pomegranate and titles keep the rosette: two categories
  // now, and two marks, so the tiles never read as one split in half.
  Pronouns: 'pomegranate',
  Titles: 'rosette',
  'Body parts': 'figure',
  'Daily routine': 'sunrise',
  Activities: 'runner',
  'Care and hygiene': 'ewer',
  Medical: 'mortar',
  Emergency: 'beacon',
  Household: 'temple',
  Electronics: 'bolt',
  Adjectives: 'diamonds',
  Verbs: 'motion',
  Transport: 'wheel',
  Directions: 'compass',
  Shopping: 'basket',
  'Work and technology': 'stylus',
  // The learner's own sentences: a scroll, for the writing they add themselves.
  Custom: 'scroll',
};

export function categoryIcon(name: string): IconName | undefined {
  return CATEGORY_MARKS[name];
}
