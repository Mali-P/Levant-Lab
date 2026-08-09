import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { prepareStarterContent } from './services/database/seed';
import { useData } from './stores/dataStore';
import { useSettings } from './stores/settingsStore';
import { useAppearance } from './hooks/useAppearance';
import DashboardScreen from './app/DashboardScreen';
import CategoriesScreen from './app/CategoriesScreen';
import CategoryScreen from './app/CategoryScreen';
import DeckScreen from './app/DeckScreen';
import MemoriseScreen from './app/MemoriseScreen';
import StudyScreen from './app/StudyScreen';
import ManageScreen from './app/ManageScreen';
import CardEditorScreen from './app/CardEditorScreen';
import StatsScreen from './app/StatsScreen';
import SettingsScreen from './app/SettingsScreen';
import DataScreen from './app/DataScreen';
import SyncScreen from './app/SyncScreen';
import PronunciationReviewScreen from './app/PronunciationReviewScreen';
import AlphabetsScreen from './app/AlphabetsScreen';
import AlphabetHomeScreen from './app/AlphabetHomeScreen';
import LetterListScreen from './app/LetterListScreen';
import LetterDetailScreen from './app/LetterDetailScreen';
import AlphabetProgressScreen from './app/AlphabetProgressScreen';
import AlphabetPractiseScreen from './app/AlphabetPractiseScreen';
import AlphabetSessionScreen from './app/AlphabetSessionScreen';
import AlphabetWriteScreen from './app/AlphabetWriteScreen';
import SplashScreen from './app/SplashScreen';
import { useAlphabet } from './stores/alphabetStore';
import Icon, { type IconName } from './components/ornament/Icon';

/*
 * The destinations, each with its engraved mark: a temple front for home, a
 * scroll for the decks, a codex for the flip-through, carved columns for the
 * figures, and a rosette for the settings. The label stays under every one of
 * them — the icons are a second cue, never the only one.
 *
 * Memorise holds the middle because it is what a learner does most, and does
 * first: meeting the words. The letters moved inside Study, where the rest of
 * the choosing happens — they are optional and gate nothing, so they do not
 * need a permanent seat in the bar.
 */
const TABS: { to: string; icon: IconName; label: string }[] = [
  { to: '/', icon: 'temple', label: 'Home' },
  { to: '/categories', icon: 'scroll', label: 'Study' },
  { to: '/memorise', icon: 'codex', label: 'Memorise' },
  { to: '/stats', icon: 'columns', label: 'Stats' },
  { to: '/settings', icon: 'rosette', label: 'Settings' },
];

/*
 * How long the opening screen is held even when the database opens instantly,
 * and how long its fade-out runs afterwards. The floor is there so the mark is
 * something you see rather than something that flickers; it is a floor and not
 * a delay, because a slow open simply keeps the splash up for longer.
 *
 * It is shown once per load of the page and never between screens. That falls
 * out of where this component sits — mounted above `Routes`, so navigating
 * does not remount it and the state below survives — rather than out of any
 * check, so keep the splash state here. Moved into a route element, or given
 * a changing `key`, it would fire on every move between the study areas.
 */
const SPLASH_HOLD_MS = 1500;
const SPLASH_FADE_MS = 380;

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [held, setHeld] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const settings = useSettings((s) => s.settings);
  const loadSettings = useSettings((s) => s.load);
  const loadData = useData((s) => s.load);
  const loadAlphabet = useAlphabet((s) => s.load);

  useAppearance(settings);

  useEffect(() => {
    (async () => {
      try {
        await prepareStarterContent();
        await Promise.all([loadSettings(), loadData(), loadAlphabet()]);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();
  }, [loadSettings, loadData, loadAlphabet]);

  useEffect(() => {
    const t = setTimeout(() => setHeld(true), SPLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  // The splash is only unmounted once its fade has finished, so the app it
  // uncovers has to be mounted underneath it for that stretch.
  const leaving = held && status === 'ready';
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setSplashGone(true), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  // An error is worth reading straight away — it does not wait out the hold.
  if (status === 'loading' || (!held && status !== 'error')) {
    return <SplashScreen />;
  }

  if (status === 'error') {
    return (
      <div className="app">
        <div className="screen">
          <h1>Could not open the local database</h1>
          <p className="muted">{error}</p>
          <p className="small muted">
            Private browsing can block local storage. Try a normal window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/categories" element={<CategoriesScreen />} />
        <Route path="/category/:categoryId" element={<CategoryScreen />} />
        {/* A deck opens on its mode picker, so Memorise comes before the
            testing modes rather than after a failed run. */}
        <Route path="/deck/:deckId" element={<DeckScreen />} />
        {/* Without a deck, Memorise reads the categories chosen in Study —
            the same screen, dealt from a wider pile. */}
        <Route path="/memorise" element={<MemoriseScreen />} />
        <Route path="/memorise/:deckId" element={<MemoriseScreen />} />
        <Route path="/study/:deckId" element={<StudyScreen />} />
        {/* The alphabets sit beside the decks, never in front of them: nothing
            here gates the vocabulary. */}
        <Route path="/alphabets" element={<AlphabetsScreen />} />
        <Route path="/alphabet/:script" element={<AlphabetHomeScreen />} />
        <Route path="/alphabet/:script/letters" element={<LetterListScreen />} />
        <Route
          path="/alphabet/:script/letter/:letterId"
          element={<LetterDetailScreen />}
        />
        <Route
          path="/alphabet/:script/progress"
          element={<AlphabetProgressScreen />}
        />
        <Route
          path="/alphabet/:script/practise"
          element={<AlphabetPractiseScreen />}
        />
        <Route
          path="/alphabet/:script/practise/:mode/:deckId"
          element={<AlphabetSessionScreen />}
        />
        <Route
          path="/alphabet/:script/write/:deckId"
          element={<AlphabetWriteScreen />}
        />
        <Route path="/manage" element={<ManageScreen />} />
        <Route path="/manage/card/:cardId" element={<CardEditorScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/data" element={<DataScreen />} />
        <Route path="/sync" element={<SyncScreen />} />
        <Route path="/audio-review" element={<PronunciationReviewScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
            <span className="tab-icon" aria-hidden="true">
              <Icon name={tab.icon} />
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {!splashGone && <SplashScreen leaving />}
    </div>
  );
}
