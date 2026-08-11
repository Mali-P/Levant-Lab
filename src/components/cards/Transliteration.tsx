import { readTransliteration, type GlossLanguage } from '../../utils/glossary';
import Tip from '../controls/Tip';

export type TransliterationProps = {
  text: string;
  language: GlossLanguage;
  /** Added beside the `translit` class, for surfaces that style their own. */
  className?: string;
  /** Rendered as a block rather than inline, matching the old `div`. */
  block?: boolean;
};

/**
 * A transliteration line whose words can each be asked what they mean.
 *
 * A learner reading "ṣabāḥ il-khēr" can see that the first word is the morning
 * and the second is the goodness, which is half the reason the romanisation is
 * on the card at all: it is the one line where the pieces of a phrase are
 * separable by eye. Words with nothing known about them stay plain text rather
 * than offering an empty tooltip.
 *
 * The hover, the press and the bubble itself all live in `Tip`, which is the
 * same affordance the letter cards use for their notes — one behaviour, so a
 * learner who has learned to press one has learned to press the other.
 */
export default function Transliteration({
  text,
  language,
  className,
  block,
}: TransliterationProps) {
  const segments = readTransliteration(text, language);
  const Tag = block ? 'div' : 'span';

  return (
    <Tag className={'translit' + (className ? ' ' + className : '')}>
      {segments.map((segment, index) =>
        segment.word && segment.gloss ? (
          <Tip key={index} className="translit-word" content={segment.gloss}>
            {segment.text}
          </Tip>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </Tag>
  );
}
