import type { AlphabetDisplay, AlphabetScript, LetterAsset } from '../../types/alphabet';

type Props = {
  script: AlphabetScript;
  /** The character a font can render. */
  print?: string;
  /** A drawn form, where one has been supplied. */
  handwritten?: LetterAsset;
  display: AlphabetDisplay;
  /** Accessible name when the glyph is the whole content of a control. */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * One letterform.
 *
 * The rule that shapes this component: a handwritten form is only ever a real
 * drawn asset. Where none exists the printed form is shown with a note, never
 * the printed glyph in an italic or "script" face -- Israeli cursive and
 * everyday Arabic handwriting are different letterforms, not slanted print,
 * and faking them would teach the learner a shape nobody writes.
 */
export default function LetterGlyph({
  script,
  print,
  handwritten,
  display,
  label,
  size = 'md',
}: Props) {
  const showPrint = display !== 'handwritten' || !handwritten;
  const showHandwritten = display !== 'print' && Boolean(handwritten);

  return (
    <span className={'glyph-set glyph-' + size}>
      {showPrint && print && (
        <span
          className={'glyph ' + script}
          lang={script === 'hebrew' ? 'he' : 'ar'}
          dir="rtl"
          aria-label={label}
          role={label ? 'img' : undefined}
        >
          {print}
        </span>
      )}
      {showHandwritten && handwritten && (
        <img className="glyph glyph-hand" src={handwritten.src} alt={handwritten.label} />
      )}
      {display === 'handwritten' && !handwritten && (
        <span className="small muted glyph-note">Handwritten form not available yet</span>
      )}
    </span>
  );
}
