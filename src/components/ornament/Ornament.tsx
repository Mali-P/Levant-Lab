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
 * The letterform on its own, exactly as `public/icon.svg` traces it: a jīm,
 * even-odd filled, drawn inside the icon's 1024 box. Its ink spans roughly
 * x 347–637 and y 194–738, so anything placing it by hand centres on
 * (492, 466) rather than on the box.
 *
 * Exported because the splash draws the same letterform at a size where the
 * hexagons of `LevantryMark` would be one frame too many.
 */
export const LEVANTRY_GLYPH_PATH =
  'M 503 378 L 497 378 L 496 377 L 495 378 L 500 384 L 506 396 L 508 406 L 509 407 L 509 410 L 510 411 L 511 425 L 512 426 L 512 440 L 513 441 L 514 504 L 515 505 L 515 507 L 509 513 L 508 513 L 496 526 L 488 537 L 482 549 L 482 551 L 480 555 L 480 558 L 479 559 L 479 563 L 478 564 L 478 585 L 479 586 L 479 591 L 480 592 L 481 599 L 484 607 L 487 587 L 488 586 L 489 579 L 491 576 L 492 571 L 500 556 L 506 548 L 515 539 L 517 541 L 517 574 L 518 575 L 517 576 L 518 577 L 518 645 L 517 646 L 517 651 L 516 652 L 515 659 L 508 672 L 495 684 L 485 689 L 483 689 L 476 692 L 472 692 L 471 693 L 450 693 L 449 692 L 441 691 L 440 690 L 432 688 L 424 684 L 411 675 L 397 660 L 391 651 L 384 637 L 384 635 L 380 625 L 379 618 L 378 617 L 377 607 L 376 606 L 376 597 L 375 596 L 376 575 L 377 574 L 377 570 L 378 569 L 379 561 L 380 560 L 383 549 L 396 525 L 406 513 L 406 512 L 428 490 L 429 490 L 432 486 L 421 488 L 406 495 L 387 509 L 375 522 L 366 535 L 359 549 L 359 551 L 355 559 L 355 562 L 352 569 L 351 577 L 350 578 L 350 582 L 349 583 L 348 599 L 347 600 L 347 615 L 348 616 L 349 635 L 350 636 L 350 640 L 351 641 L 351 645 L 352 646 L 353 653 L 354 654 L 358 668 L 365 683 L 377 701 L 393 717 L 401 723 L 416 731 L 421 732 L 424 734 L 435 736 L 436 737 L 443 737 L 444 738 L 468 738 L 469 737 L 479 736 L 480 735 L 491 732 L 509 722 L 523 709 L 531 697 L 536 686 L 536 684 L 539 677 L 540 670 L 541 669 L 541 665 L 542 664 L 543 648 L 544 647 L 544 619 L 545 618 L 545 514 L 546 513 L 545 511 L 545 503 L 546 502 L 546 425 L 545 424 L 545 417 L 544 416 L 544 413 L 543 412 L 542 407 L 539 401 L 527 388 L 516 382 L 514 382 L 511 380 L 504 379 Z M 435 194 L 432 199 L 432 201 L 428 208 L 428 210 L 424 217 L 424 219 L 415 238 L 421 241 L 423 241 L 444 252 L 454 263 L 454 266 L 455 267 L 455 275 L 454 276 L 454 284 L 453 285 L 453 292 L 452 293 L 452 300 L 451 301 L 451 328 L 452 329 L 452 337 L 453 338 L 453 347 L 454 348 L 577 349 L 578 350 L 582 350 L 585 352 L 587 352 L 593 356 L 602 368 L 603 374 L 604 375 L 604 389 L 603 390 L 603 395 L 602 396 L 600 404 L 593 418 L 591 420 L 589 425 L 583 434 L 580 437 L 576 444 L 572 448 L 570 452 L 563 460 L 557 469 L 552 474 L 549 479 L 549 483 L 550 484 L 550 514 L 551 514 L 571 491 L 571 490 L 575 486 L 575 485 L 579 481 L 579 480 L 600 454 L 608 441 L 611 438 L 612 435 L 619 425 L 622 418 L 624 416 L 624 414 L 630 403 L 630 401 L 634 391 L 635 383 L 636 382 L 636 377 L 637 376 L 637 357 L 636 356 L 636 350 L 635 349 L 635 346 L 634 345 L 633 340 L 626 327 L 618 318 L 608 311 L 593 305 L 590 305 L 585 303 L 579 303 L 578 302 L 498 302 L 497 301 L 495 302 L 494 301 L 479 301 L 478 300 L 478 295 L 479 294 L 480 283 L 481 282 L 481 278 L 482 277 L 482 273 L 483 272 L 483 268 L 484 267 L 484 263 L 485 262 L 486 248 L 487 247 L 487 240 L 486 239 L 486 235 L 485 234 L 484 228 L 480 221 L 470 212 Z';

/**
 * The Levantry mark: a jīm held inside a double hexagon.
 *
 * The letterform is the app icon's path untouched — same offset, same even-odd
 * fill — because that is the part anyone actually recognises. The hexagons are
 * this component's own: `public/icon.svg` dropped its frames, which a favicon
 * has no room for, and keeps only the glyph. Here they are stroked rather than
 * drawn as a filled ring so the weight survives the 44px this falls to on a
 * 320px screen.
 */
export function LevantryMark({ className }: { className?: string }) {
  return (
    <svg
      className={'brand-mark' + (className ? ' ' + className : '')}
      viewBox="0 0 1024 1024"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/*
       * Both frames are the icon's hexagons pushed out 12% from the shared
       * centre, stroke weight held. The glyph's upper shoulder cleared the
       * inner edge by about 20 units, which at header size is a single pixel
       * and reads as a clip; the wider frames give it room without touching
       * the letterform.
       */}
      <g stroke="currentColor" strokeWidth="26" strokeLinejoin="round">
        <path d="M512 56 838 246v463L512 898 186 709V246z" />
        <path d="M512 115 792 278v398L512 839 232 676V278z" />
      </g>
      <g
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        transform="translate(34 6)"
      >
        <path d={LEVANTRY_GLYPH_PATH} />
      </g>
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
