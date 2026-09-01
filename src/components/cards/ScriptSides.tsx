import type { Language, LanguageSide } from '../../types';
import type { SeedCard } from '../../constants/seed';
import { useSettings } from '../../stores/settingsStore';
import { wordForms } from '../../utils/wordForms';
import SpeakerButton from '../controls/SpeakerButton';
import Transliteration from './Transliteration';

/**
 * Both languages of one authored line, rendered straight from the seed.
 *
 * The Real Situations read-through and rehearsal draw the conversation from
 * the authored script rather than from installed cards — a script line is not
 * a thing to master, so it has no row on the device. This renders such a line
 * exactly the way a card's side is rendered everywhere else: every form the
 * learner's own perspectives call for, script, glossed romanisation, and a
 * speaker for each, with switched-off languages simply absent.
 */
export default function ScriptSides({ card }: { card: SeedCard }) {
  return (
    <>
      <ScriptSide side={card.hebrew} language="hebrew" />
      <ScriptSide side={card.arabic} language="arabic" />
    </>
  );
}

function ScriptSide({ side, language }: { side: LanguageSide; language: Language }) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const languages = useSettings((s) => s.languages);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  if (!languages.includes(language)) return null;
  if (!side.script) return null;
  const forms = wordForms(side, perspectives, lead);

  return (
    <div className="stack" style={{ gap: 4 }}>
      {forms.map((form) => (
        <div
          className="row"
          key={form.key}
          style={{ alignItems: 'baseline', gap: 8 }}
        >
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
}
