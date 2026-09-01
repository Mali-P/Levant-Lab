import { LANGUAGES, type Flashcard, type Language } from '../../types';
import { useSettings } from '../../stores/settingsStore';
import { sentenceCase } from '../../utils/textCase';
import { wordForms } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from './Transliteration';

/**
 * The line somebody said to her, shown above the card that answers it.
 *
 * Only Conversation Flow cards carry one, so on every other card this renders
 * nothing at all and the face stays exactly the face it has always been.
 *
 * Three things it deliberately is not. It is not hidden behind the reveal: a
 * question she cannot see is not a question she can answer, and understanding
 * what was said is the whole skill being taught. It is not a field — nothing
 * here is typed or graded, because she is scored on her own half of the
 * exchange alone. And it is not styled like an answer: smaller, set back and
 * labelled, so a glance tells the two halves apart.
 */
export default function CardCue({
  card,
  languages,
}: {
  card: Flashcard;
  /** The languages this run is studying. Absent means both. */
  languages?: readonly Language[];
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  const cue = card.cue;
  if (!cue) return null;

  const shown = languages ?? LANGUAGES;

  return (
    <aside className="card-cue">
      <div className="card-cue-label">They said</div>
      <p className="card-cue-english">{sentenceCase(cue.english)}</p>

      {shown.map((language) => {
        const side = language === 'hebrew' ? cue.hebrew : cue.arabic;
        if (!side.script) return null;

        return (
          <div className="card-cue-line" key={language}>
            {wordForms(side, perspectives, lead).map((form) => (
              <div className="card-cue-form" key={form.key}>
                {form.marker && (
                  <span className="form-marker" aria-label={form.label}>
                    {form.marker}
                  </span>
                )}
                <span className="grow">
                  <span className={language}>{form.script}</span>
                  {showTransliteration && form.transliteration && (
                    <Transliteration
                      block
                      text={form.transliteration}
                      language={language}
                    />
                  )}
                </span>
                <SpeakerButton form={form} language={language} />
              </div>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
