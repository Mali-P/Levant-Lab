import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SPEECH_PERSPECTIVES,
  SPEECH_PERSPECTIVE_MARKERS,
  SPEECH_PERSPECTIVE_SHORT,
  type AnswerMode,
  type SpeechPerspective,
  type StudyMode,
  type ThemeMode,
} from '../types';
import { useSettings } from '../stores/settingsStore';
import { speechService, rankVoices, type SpeechVoice } from '../services/speech';
import ScreenHeader from '../components/controls/ScreenHeader';
import Toggle from '../components/controls/Toggle';
import Choice from '../components/controls/Choice';
import Slider from '../components/controls/Slider';

export default function SettingsScreen() {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const [voices, setVoices] = useState<SpeechVoice[]>([]);

  useEffect(() => {
    speechService().getAvailableVoices().then(setVoices);
  }, []);

  const hebrewVoices = rankVoices(voices, 'hebrew');
  const arabicVoices = rankVoices(voices, 'arabic');

  const voiceOptions = (list: SpeechVoice[]) => [
    { value: '', label: list.length ? 'Best available' : 'No voice installed' },
    ...list.map((v) => ({ value: v.id, label: v.name + ' (' + v.lang + ')' })),
  ];

  const perspectives = settings.speechPerspectives;

  /**
   * Turns one perspective on or off, keeping canonical female-first order.
   *
   * The last one cannot be turned off: an empty set would leave every gendered
   * card with nothing to show and nothing to grade. Nothing here touches
   * progress — the setting only decides which forms are taught, so it can be
   * widened or narrowed at any point without losing a score.
   */
  function togglePerspective(perspective: SpeechPerspective) {
    const on = perspectives.includes(perspective);
    if (on && perspectives.length === 1) return;
    const next = SPEECH_PERSPECTIVES.filter((p) =>
      p === perspective ? !on : perspectives.includes(p),
    );
    void update({ speechPerspectives: next });
  }

  return (
    <div className="screen">
      <ScreenHeader title="Settings" />

      {/* First on the screen, not filed under Study: it decides which words
          the app teaches at all, which is a bigger question than how they are
          drilled. */}
      <section className="panel">
        <span className="eyebrow">Who are you learning to speak as, and to?</span>
        <p className="small muted">
          Cards lead with the form you would actually say. Female-speaker forms
          come first throughout. Practice only asks for what you pick here, and
          changing it later keeps every score.
        </p>

        {SPEECH_PERSPECTIVES.map((perspective, index) => {
          const on = perspectives.includes(perspective);
          const primary = on && perspectives[0] === perspective;
          return (
            <Toggle
              key={perspective}
              label={
                SPEECH_PERSPECTIVE_MARKERS[perspective] +
                '  ' +
                SPEECH_PERSPECTIVE_SHORT[perspective] +
                (primary ? '  · primary' : '')
              }
              hint={
                index === 0 && !on
                  ? 'The form most learners here need most often.'
                  : undefined
              }
              checked={on}
              onChange={() => togglePerspective(perspective)}
            />
          );
        })}

        {perspectives.length === 1 && (
          <p className="small muted">
            One mode selected. Cards show a single form — the one you need —
            and Memorise can still reveal the others on request.
          </p>
        )}
      </section>

      <section className="panel">
        <span className="eyebrow">Study</span>
        <Choice<StudyMode>
          label="Default study mode"
          value={settings.defaultMode}
          onChange={(v) => update({ defaultMode: v })}
          options={[
            { value: 'normal', label: 'Normal — retry pile' },
            { value: 'hard', label: 'Hard — restart on any mistake' },
            { value: 'brutal', label: 'Brutal — mistakes wipe run progress' },
          ]}
        />
        <Choice<AnswerMode>
          label="Default answer method"
          value={settings.defaultAnswerMode}
          onChange={(v) => update({ defaultAnswerMode: v })}
          options={[
            { value: 'self', label: 'Self-assessment' },
            { value: 'typed', label: 'Typed answers' },
          ]}
        />
        <Slider
          label="Default deck size"
          value={settings.defaultDeckSize}
          min={5} max={40} step={1}
          onChange={(v) => update({ defaultDeckSize: v })}
        />
        <Slider
          label="Required perfect runs"
          value={settings.defaultPerfectRunsRequired}
          min={1} max={20} step={1}
          onChange={(v) => update({ defaultPerfectRunsRequired: v })}
        />
        <Toggle label="Shuffle cards" checked={settings.shuffleCards}
          onChange={(v) => update({ shuffleCards: v })} />
        <Toggle label="Shuffle after a failed run" checked={settings.shuffleAfterFailure}
          onChange={(v) => update({ shuffleAfterFailure: v })} />
        <Toggle label="Show transliteration" checked={settings.showTransliteration}
          onChange={(v) => update({ showTransliteration: v })} />
        <Toggle label="Show hints" checked={settings.showHints}
          onChange={(v) => update({ showHints: v })} />
        <Toggle label="Require typing" hint="Overrides self-assessment on every deck."
          checked={settings.requireTyping} onChange={(v) => update({ requireTyping: v })} />
        <Toggle label="Ignore diacritics"
          hint="Hebrew niqqud and Arabic vowel marks are not required."
          checked={settings.ignoreDiacritics} onChange={(v) => update({ ignoreDiacritics: v })} />
        <Toggle label="Accept alternate answers"
          hint="Honour the extra spellings configured on each card."
          checked={settings.acceptAlternateAnswers}
          onChange={(v) => update({ acceptAlternateAnswers: v })} />
        <Toggle label="Forgive Arabic letter variants"
          hint="Treat hamza carriers and ta marbuta as interchangeable."
          checked={settings.lenientArabicLetters}
          onChange={(v) => update({ lenientArabicLetters: v })} />
        <Toggle label="Mastery decays over time" checked={settings.enableMasteryDecay}
          onChange={(v) => update({ enableMasteryDecay: v })} />
        <Toggle label="Start the retry pile automatically" checked={settings.autoStartRetryPile}
          onChange={(v) => update({ autoStartRetryPile: v })} />
        <Toggle label="Brutal reset in hard mode"
          hint="A hard-mode mistake also wipes completed perfect runs."
          checked={settings.brutalResetOnHardFailure}
          onChange={(v) => update({ brutalResetOnHardFailure: v })} />
      </section>

      <section className="panel">
        <span className="eyebrow">Audio</span>
        <Choice
          label="Hebrew voice"
          hint={hebrewVoices.length ? undefined : 'No he-IL voice is installed on this device.'}
          value={settings.hebrewVoiceUri ?? ''}
          onChange={(v) => update({ hebrewVoiceUri: v || undefined })}
          options={voiceOptions(hebrewVoices)}
        />
        <Choice
          label="Arabic voice"
          hint={
            arabicVoices.length
              ? 'Levantine locales are preferred where the device has them.'
              : 'No Arabic voice is installed on this device.'
          }
          value={settings.arabicVoiceUri ?? ''}
          onChange={(v) => update({ arabicVoiceUri: v || undefined })}
          options={voiceOptions(arabicVoices)}
        />
        <Slider label="Speech speed" value={settings.speechRate} min={0.5} max={1.5} step={0.05}
          format={(v) => v.toFixed(2) + 'x'} onChange={(v) => update({ speechRate: v })} />
        <Slider label="Repeat count" value={settings.repeatCount} min={1} max={3} step={1}
          onChange={(v) => update({ repeatCount: v })} />
        <Toggle label="Auto-play Hebrew on reveal" checked={settings.autoPlayHebrew}
          onChange={(v) => update({ autoPlayHebrew: v })} />
        <Toggle label="Auto-play Arabic on reveal" checked={settings.autoPlayArabic}
          onChange={(v) => update({ autoPlayArabic: v })} />
        <Toggle label="Use card pronunciation text"
          hint="Speak the stored pronunciation field instead of the written word."
          checked={settings.useCardPronunciationText}
          onChange={(v) => update({ useCardPronunciationText: v })} />
        <Toggle label="Sound effects" checked={settings.soundEffects}
          onChange={(v) => update({ soundEffects: v })} />
        <Toggle label="Haptics" checked={settings.haptics}
          onChange={(v) => update({ haptics: v })} />
      </section>

      <section className="panel">
        <span className="eyebrow">Appearance</span>
        <Choice<ThemeMode>
          label="Theme"
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'system', label: 'Match the system' },
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
        <Toggle label="High contrast" checked={settings.highContrast}
          onChange={(v) => update({ highContrast: v })} />
        <Toggle label="Reduced motion"
          hint="Disables card dragging, tilting and flip animations."
          checked={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
        <Slider label="Text size" value={settings.fontScale} min={0.85} max={1.5} step={0.05}
          format={(v) => Math.round(v * 100) + '%'} onChange={(v) => update({ fontScale: v })} />
        <Slider label="Card animation intensity" value={settings.cardAnimationIntensity}
          min={0} max={1.5} step={0.1} format={(v) => Math.round(v * 100) + '%'}
          onChange={(v) => update({ cardAnimationIntensity: v })} />
      </section>

      <Link className="btn btn-block" to="/manage">Cards and decks</Link>

      <Link className="btn btn-block" to="/data">Backup, import and export</Link>

      <p className="small muted">
        Everything stays on this device. No accounts, no analytics, no uploads.
      </p>
    </div>
  );
}
