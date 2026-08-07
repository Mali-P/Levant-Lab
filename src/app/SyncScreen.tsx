import { useEffect, useState } from 'react';
import type { SyncHealth } from '../services/sync/protocol';
import {
  fetchHealth,
  isConfigured,
  loadSyncState,
  ping,
  readConfig,
  runSync,
  writeConfig,
  type SyncReport,
} from '../services/sync/client';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { useAlphabet } from '../stores/alphabetStore';
import ScreenHeader from '../components/controls/ScreenHeader';

/**
 * Pairing this device with the laptop, and running a sync by hand.
 *
 * Sync never happens on its own. On a phone that is the honest design: a
 * background exchange that half-failed is something you find out about days
 * later, by noticing a card is missing, whereas a button gives an answer while
 * you are still looking at it.
 */
export default function SyncScreen() {
  const initial = readConfig();
  const [url, setUrl] = useState(initial.url);
  const [token, setToken] = useState(initial.token);
  const [deviceName, setDeviceName] = useState(initial.deviceName);

  const [deviceId, setDeviceId] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const loadData = useData((s) => s.load);
  const loadSettings = useSettings((s) => s.load);
  const loadAlphabet = useAlphabet((s) => s.load);

  useEffect(() => {
    void loadSyncState().then((state) => {
      setDeviceId(state.deviceId);
      setLastSyncedAt(state.lastSyncedAt);
    });
  }, []);

  function say(text: string, isFailure = false) {
    setMessage(text);
    setFailed(isFailure);
  }

  function persist() {
    writeConfig({ url, token, deviceName });
  }

  async function check() {
    persist();
    setBusy(true);
    try {
      // Ping first: it needs no token, so a failure here means the address is
      // wrong or the laptop is unreachable, and there is no point blaming the
      // token for that.
      if (!(await ping(url))) {
        say(
          'No sync server answered at that address. Check the laptop is awake, ' +
            'on the same Wi-Fi, and running `npm run server`.',
          true,
        );
        return;
      }
      const state = await fetchHealth({ url, token, deviceName });
      setHealth(state);
      say(`Connected. The server holds ${state.counts.cards} cards.`);
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not reach the server.', true);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    persist();
    setBusy(true);
    try {
      const result = await runSync();
      setReport(result);
      setLastSyncedAt(result.at);

      // The stores hold their own copy of the tables in memory, so without this
      // the screens would keep showing what was there before the sync.
      await Promise.all([loadData(), loadSettings(), loadAlphabet()]);
      setHealth(await fetchHealth({ url, token, deviceName }).catch(() => null));

      say(
        result.pulled + result.removed + result.pushed === 0
          ? 'Already in step — nothing to exchange.'
          : `Sent ${result.pushed}, received ${result.pulled}, removed ${result.removed}.`,
      );
    } catch (error) {
      say(error instanceof Error ? error.message : 'Sync failed.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <ScreenHeader title="Sync" eyebrow="Share this data with your other device" back />

      {message && (
        <div className="panel">
          <p className={'small' + (failed ? ' chip-bad' : '')}>{message}</p>
        </div>
      )}

      <section className="panel">
        <span className="eyebrow">This device</span>
        <label className="field">
          <span>Name it, so the server log makes sense</span>
          <input
            className="input"
            value={deviceName}
            placeholder="Phone"
            onChange={(e) => setDeviceName(e.target.value)}
            onBlur={persist}
          />
        </label>
        <p className="small muted">
          {lastSyncedAt
            ? 'Last synced ' + new Date(lastSyncedAt).toLocaleString() + '.'
            : 'This device has never synced.'}
          {deviceId && <> Device id {deviceId.slice(0, 8)}.</>}
        </p>
      </section>

      <section className="panel">
        <span className="eyebrow">The laptop</span>
        <label className="field">
          <span>Server address</span>
          <input
            className="input"
            value={url}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="http://192.168.1.20:4180"
            onChange={(e) => setUrl(e.target.value)}
            onBlur={persist}
          />
          <span className="small muted">
            The address the server prints when it starts. If you opened this app
            from the laptop itself, the box is already right.
          </span>
        </label>
        <label className="field">
          <span>Sync token</span>
          <input
            className="input"
            type="password"
            value={token}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setToken(e.target.value)}
            onBlur={persist}
          />
          <span className="small muted">
            Printed by the server when it starts. The same token goes on every device.
          </span>
        </label>
        <button className="btn btn-block" onClick={check} disabled={busy || !url}>
          Test the connection
        </button>
      </section>

      <section className="panel">
        <span className="eyebrow">Sync</span>
        <button
          className="btn btn-primary btn-block"
          onClick={sync}
          disabled={busy || !isConfigured()}
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <p className="small muted">
          Both devices send everything they hold and take back whatever is newer.
          Where the same card was edited on both, the later edit wins. A study
          session in progress stays on the device it was started on.
        </p>

        {report && (
          <div className="list">
            <div className="list-item">
              <span className="grow small">Sent to the laptop</span>
              <span className="chip">{report.pushed}</span>
            </div>
            <div className="list-item">
              <span className="grow small">Received</span>
              <span className="chip">{report.pulled}</span>
            </div>
            <div className="list-item">
              <span className="grow small">Deleted here</span>
              <span className="chip">{report.removed}</span>
            </div>
            <div className="list-item">
              <span className="grow small">Kept — this device had newer</span>
              <span className="chip">{report.keptLocal}</span>
            </div>
          </div>
        )}
      </section>

      {health && (
        <section className="panel">
          <span className="eyebrow">On the server</span>
          <div className="list">
            {Object.entries(health.counts).map(([name, count]) => (
              <div className="list-item" key={name}>
                <span className="grow small">{name}</span>
                <span className="chip">{count}</span>
              </div>
            ))}
          </div>
          {health.lastDevice && (
            <p className="small muted">
              Last written by {health.lastDevice.name ?? health.lastDevice.id.slice(0, 8)} on{' '}
              {new Date(health.lastDevice.at).toLocaleString()}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
