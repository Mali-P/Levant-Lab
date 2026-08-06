import { Link, Navigate, useParams } from 'react-router-dom';
import type { AlphabetDisplay, AlphabetScript } from '../types/alphabet';
import {
  ARABIC_EXTRA_CHARACTERS,
  ARABIC_NON_CONNECTING_IDS,
  HEBREW_FINAL_FORM_LETTERS,
  SCRIPT_LABEL,
  isHebrewLetter,
  lettersFor,
  similarGroupsFor,
  vowelsFor,
} from '../data/alphabets';
import { useSettings } from '../stores/settingsStore';
import ScreenHeader from '../components/controls/ScreenHeader';
import LetterGlyph from '../components/alphabet/LetterGlyph';
import LetterSpeaker from '../components/alphabet/LetterSpeaker';

const DISPLAY_OPTIONS: Array<{ value: AlphabetDisplay; label: string }> = [
  { value: 'print', label: 'Typed' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'both', label: 'Both' },
];

/**
 * Everything one script teaches, in teaching order: the letters first, then
 * the marks and characters that are not letters. The sections stay apart so a
 * learner never ends up counting the vowel marks as part of the alphabet.
 */
export default function LetterListScreen() {
  const { script } = useParams<{ script: string }>();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  if (script !== 'hebrew' && script !== 'arabic') {
    return <Navigate to="/alphabets" replace />;
  }
  const alphabet: AlphabetScript = script;
  const letters = lettersFor(alphabet);

  return (
    <div className="screen">
      <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="Learn" back />

      <div className="panel">
        <div className="panel-row">
          <span id="display-label">Show</span>
          <div className="segmented" role="group" aria-labelledby="display-label">
            {DISPLAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  'btn btn-ghost' +
                  (settings.alphabetDisplay === option.value ? ' selected' : '')
                }
                aria-pressed={settings.alphabetDisplay === option.value}
                onClick={() => void update({ alphabetDisplay: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-row">
          <label htmlFor="translit-toggle">Show transliteration</label>
          <input
            id="translit-toggle"
            type="checkbox"
            checked={settings.showAlphabetTransliteration}
            onChange={(event) =>
              void update({ showAlphabetTransliteration: event.target.checked })
            }
          />
        </div>
        <div className="panel-row">
          <label htmlFor="marks-toggle">Show pronunciation marks</label>
          <input
            id="marks-toggle"
            type="checkbox"
            checked={settings.showPronunciationMarks}
            onChange={(event) =>
              void update({ showPronunciationMarks: event.target.checked })
            }
          />
        </div>
      </div>

      <h2 className="section-title">Letters</h2>
      <div className="letter-grid">
        {letters.map((letter) => (
          <Link
            key={letter.id}
            className="letter-tile"
            to={'/alphabet/' + alphabet + '/letter/' + letter.id}
          >
            <LetterGlyph
              script={alphabet}
              print={
                isHebrewLetter(letter) ? letter.printForm : letter.forms.isolated
              }
              handwritten={
                isHebrewLetter(letter)
                  ? letter.handwrittenForm
                  : letter.handwrittenForms?.isolated
              }
              display={settings.alphabetDisplay}
              size="lg"
            />
            <span className="letter-tile-name">{letter.nameEnglish}</span>
            {settings.showAlphabetTransliteration && (
              <span className="translit">{letter.transliteration}</span>
            )}
          </Link>
        ))}
      </div>

      {alphabet === 'hebrew' && (
        <section>
          <h2 className="section-title">Final forms</h2>
          <p className="small muted">
            Five letters change shape at the end of a word. They are the same
            letters with the same sound, not five extra ones.
          </p>
          <div className="list">
            {HEBREW_FINAL_FORM_LETTERS.map((letter) => (
              <Link
                key={letter.id}
                className="list-item"
                to={'/alphabet/hebrew/letter/' + letter.id}
              >
                <span className="hebrew script-lg" dir="rtl">
                  {letter.printForm} / {letter.finalForm}
                </span>
                <span className="grow">
                  <strong>{letter.nameEnglish}</strong>
                  <div className="small muted">
                    Written {letter.finalForm} at the end of a word
                  </div>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {alphabet === 'arabic' && (
        <section>
          <h2 className="section-title">Letters that break the join</h2>
          <p className="small muted">
            Arabic is not simply cursive. After one of these six the pen lifts,
            and the next letter starts from its own initial shape.
          </p>
          <div className="letter-grid">
            {letters
              .filter((letter) => ARABIC_NON_CONNECTING_IDS.includes(letter.id))
              .map((letter) => (
                <Link
                  key={letter.id}
                  className="letter-tile"
                  to={'/alphabet/arabic/letter/' + letter.id}
                >
                  <span className="glyph arabic" dir="rtl" lang="ar">
                    {isHebrewLetter(letter) ? '' : letter.forms.isolated}
                  </span>
                  <span className="letter-tile-name">{letter.nameEnglish}</span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {alphabet === 'arabic' && (
        <section>
          <h2 className="section-title">Other characters you will meet</h2>
          <p className="small muted">
            Not letters of the alphabet, but everywhere in real writing.
          </p>
          <div className="list">
            {ARABIC_EXTRA_CHARACTERS.map((extra) => (
              <div key={extra.id} className="list-item">
                <span className="glyph arabic" dir="rtl" lang="ar">
                  {extra.character}
                </span>
                <span className="grow">
                  <strong>{extra.nameEnglish}</strong>
                  <div className="small muted">{extra.role}</div>
                </span>
                <LetterSpeaker
                  script="arabic"
                  entryKind="char"
                  entryId={extra.id}
                  clipKind="name"
                  fallbackText={extra.nameSpokenText}
                  label={'Play the name of ' + extra.nameEnglish}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Vowel marks</h2>
        <p className="small muted">
          {alphabet === 'hebrew'
            ? 'Everyday modern Hebrew is written without these marks. They are taught here so you can read them where they do appear.'
            : 'Ordinary Arabic writing leaves the short vowels out. Learn them here, then expect to read without them.'}
        </p>
        <div className="list">
          {vowelsFor(alphabet).map((vowel) => (
            <div key={vowel.id} className="list-item">
              <span className={'glyph ' + alphabet} dir="rtl">
                {vowel.symbol}
              </span>
              <span className="grow">
                <strong>{vowel.nameEnglish}</strong>
                <div className="small muted">{vowel.sound}</div>
                <div className="small muted">
                  <span className={alphabet} dir="rtl">
                    {vowel.attachedExample}
                  </span>{' '}
                  <span className="translit">{vowel.attachedTransliteration}</span>
                </div>
              </span>
              <LetterSpeaker
                script={alphabet}
                entryKind="vowel"
                entryId={vowel.id}
                clipKind="name"
                fallbackText={vowel.nameSpokenText}
                label={'Play the name of ' + vowel.nameEnglish}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Letters that look alike</h2>
        <div className="list">
          {similarGroupsFor(alphabet).map((group) => (
            <div key={group.id} className="list-item">
              <span className={'script-lg ' + alphabet} dir="rtl">
                {group.letterIds
                  .map((id) => {
                    const letter = letters.find((l) => l.id === id);
                    if (!letter) return '';
                    return isHebrewLetter(letter)
                      ? letter.printForm
                      : letter.forms.isolated;
                  })
                  .join(' ')}
              </span>
              <span className="grow">
                <div className="small muted">{group.difference}</div>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
