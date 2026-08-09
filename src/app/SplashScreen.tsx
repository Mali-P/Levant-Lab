import { LEVANTRY_GLYPH_PATH } from '../components/ornament/Ornament';

/*
 * The opening screen: the Levantry letterform lit inside the border it comes
 * from, held for about a second and a half while the local database opens.
 *
 * The border is traced as a filled ribbon rather than a stroke, so its weight
 * is fixed in the path and does not thin out as the art scales down on a
 * phone. Everything is drawn twice — a blurred copy for the halo, a crisp copy
 * over it — which is how `public/icon.svg` builds its glow, and it means the
 * light never softens the edge of the thing it is coming off.
 */

/**
 * The border of Israel as one even-odd path: the outer walk, then the same
 * walk inset, leaving the ribbon between them. Traced in its own coordinates,
 * which is where the viewBox below comes from.
 */
const ISRAEL_OUTLINE_PATH =
  'M 989 116 L 969 203 L 935 223 L 896 202 L 810 209 L 786 291 L 798 325 L 787 337 L 749 328 L 731 442 L 680 635 L 621 807 L 537 936 L 449 1032 L 533 1271 L 569 1346 L 580 1464 L 615 1494 L 705 1766 L 716 1882 L 783 1859 L 813 1705 L 815 1645 L 854 1597 L 847 1513 L 868 1482 L 853 1430 L 949 1206 L 923 1094 L 962 1043 L 943 958 L 969 851 L 1008 828 L 998 672 L 1016 610 L 1020 440 L 1034 403 L 996 344 L 1046 302 L 1025 260 L 1042 241 L 1049 142 Z M 1007 150 L 1024 159 L 1018 233 L 995 254 L 1016 295 L 964 340 L 1007 406 L 997 427 L 992 607 L 973 672 L 981 737 L 983 814 L 948 835 L 918 960 L 935 1038 L 897 1084 L 924 1203 L 828 1427 L 841 1475 L 823 1505 L 829 1589 L 792 1634 L 789 1703 L 763 1838 L 738 1849 L 729 1762 L 636 1481 L 603 1452 L 592 1338 L 555 1261 L 477 1038 L 554 954 L 644 815 L 698 661 L 754 449 L 770 357 L 795 364 L 827 330 L 811 291 L 828 233 L 890 226 L 933 251 L 989 221 Z';

export type SplashScreenProps = {
  /**
   * The content is ready and the splash is on its way out. It keeps painting
   * for the length of the fade, so whoever renders it must hold it mounted
   * that long — see `App`.
   */
  leaving?: boolean;
};

export default function SplashScreen({ leaving }: SplashScreenProps) {
  return (
    <div
      className={'splash' + (leaving ? ' leaving' : '')}
      /* On the way out it is scenery over a screen a reader has already been
         handed, so it stops announcing and stops being reachable. */
      role={leaving ? undefined : 'status'}
      aria-hidden={leaving || undefined}
    >
      <svg
        className="splash-art"
        viewBox="429 96 640 1806"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Two blurs: a tight one for the border, which is thin and would
              lose itself in a wide bloom, and a broad one for the letterform,
              which is meant to sit in a pool of warm light. */}
          <filter
            id="splash-blur-near"
            x="-40%"
            y="-15%"
            width="180%"
            height="130%"
          >
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter
            id="splash-blur-far"
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <path id="splash-border" d={ISRAEL_OUTLINE_PATH} fillRule="evenodd" />
          <path id="splash-glyph" d={LEVANTRY_GLYPH_PATH} fillRule="evenodd" />
        </defs>

        <use
          href="#splash-border"
          className="splash-border-glow"
          filter="url(#splash-blur-near)"
        />
        <use href="#splash-border" className="splash-border-line" />

        {/*
         * The letterform, set in the widest part of the outline and sized to
         * hang clear of the ribbon rather than to fill the country: at this
         * scale its ink runs x 644–836, y 850–1210, which leaves about 35
         * units to the nearest point of the inner edge — roughly a tenth of
         * the glyph's own width, and enough that the halo has somewhere to
         * fall. Centred on the glyph's ink, not on its 1024 box.
         */}
        <g transform="translate(740 1030) scale(0.66) translate(-492 -466)">
          <use
            href="#splash-glyph"
            className="splash-glyph-glow"
            filter="url(#splash-blur-far)"
          />
          <use href="#splash-glyph" className="splash-glyph-line" />
        </g>
      </svg>

      <p className="splash-name">Levantry</p>
      <span className="visually-hidden">Opening your card box…</span>
    </div>
  );
}
