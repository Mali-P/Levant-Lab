import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import type { AlphabetScript } from '../types/alphabet';
import { SCRIPT_LABEL } from '../data/alphabets';
import { buildLetterDecks, deckLetters } from '../features/alphabet/decks';
import Icon from '../components/ornament/Icon';
import {
  MODE_DESCRIPTION,
  MODE_LABEL,
  lettersForMode,
  type PracticeMode,
} from '../features/alphabet/questions';
import { useAlphabet } from '../stores/alphabetStore';
import ScreenHeader from '../components/controls/ScreenHeader';

/**
 * Pick a way to practise, then a set of letters.
 *
 * Modes come first because the mode decides which decks are worth offering:
 * there is no point listing every deck under "Read handwriting" when no
 * handwritten asset has been drawn yet. A mode with nothing behind it says so
 * plainly rather than leading to an empty session.
 */

const MODES: PracticeMode[] = [
  // Cards lead: naming a letter you are looking at, with nothing to rule out,
  // is where a learner starts, and it is the mode the ordering drill draws on.
  'cards',
  'recognise',
  'recall',
  'listen',
  'contextual',
  'handwritten',
  'write',
];

export default function AlphabetPractiseScreen() {
  const { script } = useParams<{ script: string }>();
  const [params, setParams] = useSearchParams();
  const rows = useAlphabet((s) => s.progress);

  if (script !== 'hebrew' && script !== 'arabic') {
    return <Navigate to="/alphabets" replace />;
  }
  const alphabet: AlphabetScript = script;

  const requested = params.get('mode') as PracticeMode | null;
  const mode: PracticeMode =
    requested && MODES.includes(requested) ? requested : 'recognise';

  const progress = Object.fromEntries(
    Object.values(rows)
      .filter((row) => row.script === alphabet)
      .map((row) => [row.letterId, row]),
  );

  // Hebrew has no joined shapes, so the mode is not offered rather than
  // offered and then found to be empty.
  const modes = MODES.filter(
    (entry) => entry !== 'contextual' || alphabet === 'arabic',
  );

  const decks = buildLetterDecks(alphabet, progress)
    .map((deck) => ({
      deck,
      available: lettersForMode(deckLetters(deck), mode).length,
    }))
    .filter((entry) => entry.available > 0);

  // Two modes are screens of their own rather than runs of questions, so they
  // are routed straight to those screens instead of through the session.
  const routeFor = (deckId: string) => {
    if (mode === 'write') {
      return '/alphabet/' + alphabet + '/write/' + encodeURIComponent(deckId);
    }
    if (mode === 'cards') {
      return '/alphabet/' + alphabet + '/cards/' + encodeURIComponent(deckId);
    }
    return (
      '/alphabet/' + alphabet + '/practise/' + mode + '/' + encodeURIComponent(deckId)
    );
  };

  return (
    <div className="screen">
      <ScreenHeader title={SCRIPT_LABEL[alphabet]} eyebrow="Practise" back />

      <div className="panel">
        <span id="mode-label" className="small">
          How to practise
        </span>
        <div className="mode-grid" role="group" aria-labelledby="mode-label">
          {modes.map((entry) => (
            <button
              key={entry}
              type="button"
              className={'btn btn-ghost' + (entry === mode ? ' selected' : '')}
              aria-pressed={entry === mode}
              onClick={() => setParams({ mode: entry }, { replace: true })}
            >
              {MODE_LABEL[entry]}
            </button>
          ))}
        </div>
        <p className="small muted">{MODE_DESCRIPTION[mode]}</p>
      </div>

      {decks.length === 0 ? (
        <div className="empty">
          <p>
            {mode === 'handwritten'
              ? 'No handwritten letterforms have been drawn for this alphabet yet. Israeli cursive and everyday Arabic handwriting are different letterforms from print, not slanted versions of it, so there is nothing to read here until real ones are added.'
              : 'No letters are available for this mode yet.'}
          </p>
          <Link className="btn btn-primary" to={'/alphabet/' + alphabet + '/letters'}>
            Back to the letters
          </Link>
        </div>
      ) : (
        <div className="list">
          {decks.map(({ deck, available }) => (
            <Link key={deck.id} className="list-item" to={routeFor(deck.id)}>
              <span className="grow">
                <strong>{deck.title}</strong>
                <div className="small muted">{deck.description}</div>
              </span>
              <span className="chip">{available}</span>
              <Icon name="forward" className="chevron" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
