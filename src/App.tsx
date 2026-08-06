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
import PronunciationReviewScreen from './app/PronunciationReviewScreen';
import AlphabetsScreen from './app/AlphabetsScreen';
import AlphabetHomeScreen from './app/AlphabetHomeScreen';
import LetterListScreen from './app/LetterListScreen';
import LetterDetailScreen from './app/LetterDetailScreen';
import AlphabetProgressScreen from './app/AlphabetProgressScreen';
import AlphabetPractiseScreen from './app/AlphabetPractiseScreen';
import AlphabetSessionScreen from './app/AlphabetSessionScreen';
import AlphabetWriteScreen from './app/AlphabetWriteScreen';
import { useAlphabet } from './stores/alphabetStore';

const TABS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/categories', icon: '🗂️', label: 'Study' },
  { to: '/alphabets', icon: '🔤', label: 'Letters' },
  { to: '/manage', icon: '✏️', label: 'Cards' },
  { to: '/stats', icon: '📊', label: 'Stats' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
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

  if (status === 'loading') {
    return (
      <div className="app">
        <div className="screen">
          <p className="muted">Opening your card box…</p>
        </div>
      </div>
    );
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
        <Route path="/audio-review" element={<PronunciationReviewScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}>
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
