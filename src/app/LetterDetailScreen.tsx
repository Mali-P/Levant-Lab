import { Link, Navigate, useParams } from 'react-router-dom';
import type {
  AlphabetScript,
  ArabicFormName,
  ArabicLetter,
  HebrewLetter,
} from '../types/alphabet';
import { findLetter, isHebrewLetter, lettersFor } from '../data/alphabets';
import { useSettings } from '../stores/settingsStore';
import ScreenHeader from '../components/controls/ScreenHeader';
import LetterGlyph from '../components/alphabet/LetterGlyph';
import LetterSpeaker from '../components/alphabet/LetterSpeaker';
import Icon from '../components/ornament/Icon';
import { StrokeGuide } from '../components/alphabet/TracingCanvas';
import { strokeSequenceOf } from '../features/alphabet/forms';

/** Isolated last, so the row reads the way a learner meets the shapes. */
const ARABIC_FORM_ORDER: Array<{ key: ArabicFormName; label: string }> = [
  { key: 'initial', label: 'Initial' },
  { key: 'medial', label: 'Medial' },
  { key: 'final', label: 'Final' },
  { key: 'isolated', label: 'Isolated' },
];

export default function LetterDetailScreen() {
  const { script, letterId } = useParams<{ script: string; letterId: string }>();
  const settings = useSettings((s) => s.settings);

  if (script !== 'hebrew' && script !== 'arabic') {
    return <Navigate to="/alphabets" replace />;
  }
  const alphabet: AlphabetScript = script;
  const letter = letterId ? findLetter(alphabet, letterId) : undefined;
  if (!letter) {
    return <Navigate to={'/alphabet/' + alphabet + '/letters'} replace />;
  }

  // Handwritten first where it exists: it is the form a learner will actually
  // write. Print is what they can follow until one has been drawn.
  const strokeSequence =
    strokeSequenceOf(letter, 'handwritten') ?? strokeSequenceOf(letter, 'print');

  const similar = (letter.similarTo ?? [])
    .map((id) => findLetter(alphabet, id))
    .filter((entry): entry is HebrewLetter | ArabicLetter => Boolean(entry));

  return (
    <div className="screen">
      <ScreenHeader
        title={letter.nameEnglish}
        eyebrow={'Letter ' + letter.order + ' of ' + lettersFor(alphabet).length}
        back
      />

      <div className="panel letter-hero">
        <LetterGlyph
          script={alphabet}
          print={isHebrewLetter(letter) ? letter.printForm : letter.forms.isolated}
          handwritten={
            isHebrewLetter(letter)
              ? letter.handwrittenForm
              : letter.handwrittenForms?.isolated
          }
          display={settings.alphabetDisplay}
          size="lg"
        />
        <div className="letter-hero-meta">
          <div className={'script-lg ' + alphabet} dir="rtl">
            {isHebrewLetter(letter) ? letter.nameHebrew : letter.nameArabic}
          </div>
          {settings.showAlphabetTransliteration && (
            <div className="translit">{letter.transliteration}</div>
          )}
          <p className="small">{letter.commonSound}</p>
        </div>
        <LetterSpeaker
          script={alphabet}
          entryKind="letter"
          entryId={letter.id}
          clipKind="name"
          fallbackText={letter.nameSpokenText}
          label={'Play the name of ' + letter.nameEnglish}
        />
      </div>

      {!isHebrewLetter(letter) && letter.levantineNote && (
        <div className="panel">
          <strong className="small">In Levantine speech</strong>
          <p className="small muted">{letter.levantineNote}</p>
        </div>
      )}

      {isHebrewLetter(letter) && letter.finalForm && (
        <div className="panel">
          <strong className="small">Final form</strong>
          <div className="hebrew script-lg" dir="rtl">
            {letter.printForm} / {letter.finalForm}
          </div>
          <p className="small muted">
            The same letter with the same sound, written this way only at the
            end of a word.
          </p>
        </div>
      )}

      {isHebrewLetter(letter) &&
        settings.showPronunciationMarks &&
        letter.soundVariants && (
          <div className="panel">
            <strong className="small">More than one sound</strong>
            {letter.soundVariants.map((variant) => (
              <div key={variant.form} className="panel-row">
                <span className="hebrew script-lg" dir="rtl">
                  {variant.form}
                </span>
                <span className="grow">
                  <strong className="small">{variant.sound}</strong>
                  {variant.note && <div className="small muted">{variant.note}</div>}
                </span>
                <span className="translit">{variant.transliteration}</span>
              </div>
            ))}
          </div>
        )}

      {!isHebrewLetter(letter) && (
        <div className="panel">
          <strong className="small">How it changes shape</strong>
          {/* One RTL container per shape, isolated from its English label, so
              the bidi algorithm cannot reorder the row. */}
          <div className="form-row">
            {ARABIC_FORM_ORDER.filter(({ key }) => letter.forms[key]).map(
              ({ key, label }) => (
                <div key={key} className="form-cell">
                  <span className="glyph arabic" dir="rtl" lang="ar">
                    {letter.forms[key]}
                  </span>
                  <span className="small muted english">{label}</span>
                  {letter.handwrittenForms?.[key] && (
                    <img
                      className="glyph glyph-hand"
                      src={letter.handwrittenForms[key]!.src}
                      alt={letter.handwrittenForms[key]!.label}
                    />
                  )}
                </div>
              ),
            )}
          </div>
          <p className="small muted">
            {letter.connectsToNext
              ? 'Joins to the letter after it.'
              : 'Does not join to the letter after it. The pen lifts, and the next letter starts from its own initial shape.'}
          </p>
        </div>
      )}

      {letter.soundSpokenText && (
        <div className="panel panel-row">
          <span className="grow">
            <strong className="small">Its sound</strong>
            <div className="small muted">
              Heard on its own, without the letter name
            </div>
          </span>
          <LetterSpeaker
            script={alphabet}
            entryKind="letter"
            entryId={letter.id}
            clipKind="sound"
            fallbackText={letter.soundSpokenText}
            label={'Play the sound of ' + letter.nameEnglish}
          />
        </div>
      )}

      {letter.exampleWord && (
        <div className="panel panel-row">
          <span className="grow">
            <span className={'script-lg ' + alphabet} dir="rtl">
              {letter.exampleWord.script}
            </span>
            <div className="small muted english">
              {letter.exampleWord.english}
              {letter.exampleWord.transliteration
                ? ' · ' + letter.exampleWord.transliteration
                : ''}
            </div>
          </span>
          <LetterSpeaker
            script={alphabet}
            entryKind="letter"
            entryId={letter.id}
            clipKind="example"
            fallbackText={
              letter.exampleWord.pronunciationText ?? letter.exampleWord.script
            }
            label={'Play the example word ' + letter.exampleWord.english}
          />
        </div>
      )}

      {settings.showStrokeOrder && (
        <div className="panel">
          <strong className="small">Stroke order</strong>
          {strokeSequence ? (
            <>
              <StrokeGuide sequence={strokeSequence} />
              <ol className="small muted stroke-hints">
                {strokeSequence.strokes.map((stroke, index) => (
                  <li key={index}>{stroke.hint ?? 'Follow the line from the dot.'}</li>
                ))}
              </ol>
            </>
          ) : (
            <p className="small muted">
              No stroke sequence has been drawn for this letter yet. Printed and
              handwritten strokes are taught separately, and neither is guessed
              from the other.
            </p>
          )}
        </div>
      )}

      {similar.length > 0 && (
        <div className="panel">
          <strong className="small">Easy to confuse with</strong>
          <div className="list">
            {similar.map((other) => (
              <Link
                key={other.id}
                className="list-item"
                to={'/alphabet/' + alphabet + '/letter/' + other.id}
              >
                <span className={'glyph ' + alphabet} dir="rtl">
                  {isHebrewLetter(other) ? other.printForm : other.forms.isolated}
                </span>
                <span className="grow">
                  <strong>{other.nameEnglish}</strong>
                  <div className="small muted">{other.commonSound}</div>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="list">
        <Link
          className="list-item"
          to={
            '/alphabet/' +
            alphabet +
            '/practise/recognise/' +
            encodeURIComponent('letter:' + letter.id)
          }
        >
          <span className="icon" aria-hidden="true">
            &#127919;
          </span>
          <span className="grow">
            <strong>Practise this letter</strong>
            <div className="small muted">Recognise it, hear it, pick it out</div>
          </span>
          <Icon name="forward" className="chevron" />
        </Link>
        <Link
          className="list-item"
          to={
            '/alphabet/' +
            alphabet +
            '/write/' +
            encodeURIComponent('letter:' + letter.id)
          }
        >
          <span className="icon" aria-hidden="true">
            &#9997;&#65039;
          </span>
          <span className="grow">
            <strong>Write this letter</strong>
            <div className="small muted">Trace it, then write it from memory</div>
          </span>
          <Icon name="forward" className="chevron" />
        </Link>
      </div>
    </div>
  );
}
