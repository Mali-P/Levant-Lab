import { Link } from 'react-router-dom';
import { ALPHABET_SCRIPTS, SCRIPT_LABEL, alphabetCounts } from '../data/alphabets';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';

const SCRIPT_ICON = { hebrew: 'א', arabic: 'ع' } as const;

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
