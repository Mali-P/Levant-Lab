import type { SpeechLanguage } from '../../services/speech';
import type { WordForm } from '../../utils/wordForms';
import { useSettings } from '../../stores/settingsStore';
import { pronunciationLabel, usePronunciation } from '../../hooks/usePronunciation';
import Icon from '../ornament/Icon';

type Props = {
  form: WordForm;
  language: SpeechLanguage;
  /** Overrides the generated accessible name when a screen needs more context. */
  label?: string;
  className?: string;
};

/**
 * Plays the pronunciation of one form of one word.
 *
 * A real <button>, so it is reachable by Tab and fires on Enter and Space with
 * no extra key handling. The speaker glyph is decorative; the accessible name
 * carries the language and the gender, which is the part a screen reader user
 * needs to tell two otherwise identical buttons apart.
 */
export default function SpeakerButton({ form, language, label, className }: Props) {
  const settings = useSettings((s) => s.settings);
  const { play, isPlaying } = usePronunciation(settings);

  const playing = isPlaying(form, language);
  const name = label ?? pronunciationLabel(language, form);

  return (
    <button
      type="button"
      className={
        'btn btn-ghost btn-icon speaker' +
        (playing ? ' playing' : '') +
        (className ? ' ' + className : '')
      }
      onClick={() => void play(form, language)}
      aria-label={name}
      title={name}
      // Announced rather than shown, so the state is never colour-only.
      aria-pressed={playing}
    >
      <Icon name="speaker" />
    </button>
  );
}
