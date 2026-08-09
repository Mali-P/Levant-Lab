import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SPEECH_PERSPECTIVE_LABELS,
  SPEECH_PERSPECTIVE_MARKERS,
  type AnswerMode,
  type LanguageChoice,
  type PersonGender,
  type StudyMode,
  type ThemeMode,
} from '../types';
import { useSettings } from '../stores/settingsStore';
import { LANGUAGE_LONG_LABEL } from '../utils/languageSelection';
import { speechService, rankVoices, type SpeechVoice } from '../services/speech';
import ScreenHeader from '../components/controls/ScreenHeader';
import Toggle from '../components/controls/Toggle';
import Choice from '../components/controls/Choice';
import Slider from '../components/controls/Slider';

/**
 * How the listener question is put, which is not how it is stored. "Both" is
 * one answer to a person and two entries in `listenerGenders`; keeping the
 * phrasing here rather than in the type stops the stored field from having to
 * carry a word that is really a piece of copy.
 */
type ListenerChoice = PersonGender | 'both';

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

  const perspectives = useSettings((s) => s.perspectives);

  /**
   * The two questions this app is written around: who she is, and who she is
   * speaking to. They now write the fields they are asking about, rather than a
   * perspective list that would later have to be read backwards into a person.
   *
   * Neither answer can empty the list: every combination derives at least one
   * perspective, and an empty set would leave a gendered card with nothing to
   * show and nothing to grade. Nothing here touches progress — identity decides
   * which forms are taught, not what has been learned, so it can be changed at
   * any point without losing a score.
   *
   * Answering either question also settles `identityConfirmed`: the defaults
   * are the app's assumption until she says otherwise, and it is worth knowing
   * which of the two she is looking at.
   */
  const speaker = settings.learnerGender;
  const listeners: ListenerChoice =
    settings.listenerGenders.length > 1 ? 'both' : settings.listenerGenders[0];

  function setIdentity(next: { speaker?: PersonGender; listeners?: ListenerChoice }) {
    const chosen = next.listeners ?? listeners;
    void update({
      learnerGender: next.speaker ?? speaker,
      listenerGenders: chosen === 'both' ? ['male', 'female'] : [chosen],
      identityConfirmed: true,
    });
  }

  /**
   * The override is no longer something this screen can create.
   *
   * A second list of the same four perspectives, sitting under the two
   * questions that derive them, only asked her the same thing twice — and
   * invited her to describe herself as a checklist. The field survives for the
   * one install that can still hold one: a legacy two-speaker list that
   * `identityFromLegacy` preserved rather than guess at. All that is left here
   * is the way out of it.
   */
  const override = settings.practicePerspectiveOverride;

  return (
    <div className="screen">
      <ScreenHeader title="Settings" />

      {/* Ahead of identity, because it is answered first: this decides which
          languages a card is resolved for at all, and identity only decides
          which form each of those takes. */}
      <section className="panel">
        <span className="eyebrow">Languages I'm learning</span>
        <Choice<LanguageChoice>
          // Not "Practice": this governs Review as well, and every other place
          // a card is resolved. It decides which languages exist for her.
          label="Learning"
          value={settings.studyLanguages}
          onChange={(v) => update({ studyLanguages: v })}
          options={[
            { value: 'both', label: 'Both — Hebrew and Levantine Arabic' },
            { value: 'hebrew', label: 'Hebrew only' },
            { value: 'arabic', label: 'Levantine Arabic only' },
          ]}
        />
        <p className="small muted">
          {settings.studyLanguages === 'both'
            ? 'A card is not correct until you have recalled it in both. ' +
              'Everything is asked, spoken and scored twice.'
            : 'Only ' +
              LANGUAGE_LONG_LABEL[
                settings.studyLanguages === 'hebrew' ? 'hebrew' : 'arabic'
              ] +
              ' is asked, spoken and scored. A card is correct when that ' +
              'answer is.'}
        </p>
        {settings.studyLanguages !== 'both' && (
          // Said plainly, because the obvious worry about a switch like this
          // is that it throws the other language away.
          <p className="small muted">
            The other language is hidden, not deleted. Its words and its
            accuracy are kept exactly as they stand, and choosing Both brings
            them straight back.
          </p>
        )}
      </section>

      {/* Not filed under Practice: it decides which words the app teaches at all,
          which is a bigger question than how they are drilled. */}
      <section className="panel">
        <span className="eyebrow">Who are you learning to speak as, and to?</span>
        <p className="small muted">
          Cards lead with the form you would actually say. Practice only asks
          for what you pick here, and changing it later keeps every score.
        </p>

        {/* The one consumer of `identityConfirmed`, and the reason it exists:
            until she answers, these two are what the app assumed, and saying so
            is the difference between asking her a question and presenting her
            with a decision she never made. Either answer settles it. */}
        {!settings.identityConfirmed && (
          <p className="small">
            These are what this app assumed — it is written for a woman
            speaking to anyone. Answer either question to make them yours.
          </p>
        )}

        <Choice<PersonGender>
          label="I am…"
          value={speaker}
          onChange={(v) => setIdentity({ speaker: v })}
          options={[
            { value: 'female', label: '♀  a woman' },
            { value: 'male', label: '♂  a man' },
          ]}
        />
        <Choice<ListenerChoice>
          label="I practise speaking to…"
          value={listeners}
          onChange={(v) => setIdentity({ listeners: v })}
          options={[
            { value: 'both', label: 'both — men and women' },
            { value: 'male', label: '♂  men' },
            { value: 'female', label: '♀  women' },
          ]}
        />

        <p className="small muted">
          {perspectives.length === 1
            ? 'One form only — the one you need. Review can still reveal the ' +
              'others on request.'
            : 'Cards lead with ' +
              SPEECH_PERSPECTIVE_MARKERS[perspectives[0]] +
              ' ' +
              SPEECH_PERSPECTIVE_LABELS[perspectives[0]] +
              '.'}
        </p>

        {/* Never invisible state: an override is a different answer from the
            one the two questions above are showing, so it says so, and the way
            back is next to it rather than buried in the disclosure. */}
        {override && (
          <p className="small">
            You're practising{' '}
            {override.map((p) => SPEECH_PERSPECTIVE_MARKERS[p]).join(' ')} —
            not what the answers above imply.{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => update({ practicePerspectiveOverride: undefined })}
            >
              Use my usual perspectives
            </button>
          </p>
        )}

      </section>

      <section className="panel">
        <span className="eyebrow">Practice</span>
        <Choice<StudyMode>
          label="Default practice mode"
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
          label="Required perfect rounds"
          value={settings.defaultPerfectRunsRequired}
          min={1} max={20} step={1}
          onChange={(v) => update({ defaultPerfectRunsRequired: v })}
        />
        {/* No shuffle toggles here any more. Testing is always drawn at
            random — a stage whose order the learner could fix would be recall
            of the order — and every mastery round reshuffles. The one place
            order is still a choice is the Review tab, which carries its own
            toggle beside the cards it applies to. */}
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
        {/* The retry pile is gone. A missed card is not set aside for the end
            of a pass any more — it is put back into the draw, weighted to
            return sooner, which is the whole difference between practising
            retrieval and working through a queue. */}
        <Toggle label="Brutal reset in hard mode"
          hint="A hard-mode mistake also wipes completed perfect rounds."
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
