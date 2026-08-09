import { Link } from 'react-router-dom';
import {
  ALPHABET_SCRIPTS,
  LETTER_PAIRS,
  SCRIPT_LABEL,
  alphabetCounts,
} from '../data/alphabets';
import { PAIR_DECK_SIZE } from '../features/alphabet/pairDecks';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';

const SCRIPT_ICON = { hebrew: 'א', arabic: 'ع' } as const;

const pairCount = LETTER_PAIRS.length;

/**
 * The alphabets live beside the vocabulary categories rather than in front of
 * them: a learner may study the letters first, but nothing here gates the
 * decks, so somebody who already reads Hebrew never has to pass through it.
 */
export default function AlphabetsScreen() {
  return (
    <div className="screen">
      <ScreenHeader title="Alphabets" eyebrow="Learn to read the letters" />

      <div className="list">
        {/* Both leads, because it is the only entry here that is a course
            rather than a reference: ten paired sounds at a time, the first
            deck open and the rest waiting on it. A learner who wants one
            script alone still has it, one row down. */}
        <Link className="list-item" to="/alphabet/both">
          <span className="icon script-icon both" aria-hidden="true">
            א<span className="script-icon-join">ع</span>
          </span>
          <span className="grow">
            <strong>Both Alphabets</strong>
            <div className="small muted">
              {pairCount} paired sounds · decks of {PAIR_DECK_SIZE} · Hebrew and
              Arabic together
            </div>
          </span>
          <Icon name="forward" className="chevron" />
        </Link>

        {ALPHABET_SCRIPTS.map((script) => {
          const counts = alphabetCounts(script);
          const extras = [
            counts.letters + ' letters',
            counts.vowels + ' vowel marks',
            counts.finalForms > 0 ? counts.finalForms + ' final forms' : '',
            counts.extras > 0 ? counts.extras + ' extra characters' : '',
          ].filter(Boolean);

          return (
            <Link key={script} className="list-item" to={'/alphabet/' + script}>
              <span className={'icon script-icon ' + script} aria-hidden="true">
                {SCRIPT_ICON[script]}
              </span>
              <span className="grow">
                <strong>{SCRIPT_LABEL[script]}</strong>
                <div className="small muted">{extras.join(' \u00b7 ')}</div>
              </span>
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>

      <p className="small muted">
        The alphabets are optional. You can start the vocabulary decks without
        finishing them, and come back whenever a letter trips you up.
      </p>
    </div>
  );
}
