/**
 * The Levantry sync server.
 *
 * Runs on the laptop. Holds one shared copy of the learner's cards, decks and
 * progress, and serves the built app alongside it so a phone on the same
 * network has a single address to point at.
 *
 * Serving the app from the same origin as the API is the deliberate part.
 * Split across two ports you inherit CORS, and — the moment the app is reached
 * over an HTTPS tunnel — the browser blocks its plain-HTTP calls to the API as
 * mixed content, which is a confusing failure to debug on a phone. One origin
 * has neither problem.
 *
 * Deliberately dependency-free: `node:http` and nothing else. A personal sync
 * endpoint with three routes does not need a framework, and the fewer things
 * that must install cleanly on a Windows laptop before the phone can sync, the
 * better.
 *
 * Run with:  npm run server
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { DEFAULT_STORE_PATH, SyncStore } from './store.ts';
import {
  SYNC_PROTOCOL_VERSION,
  type SyncPushBody,
  type SyncResponse,
} from '../src/services/sync/protocol.ts';

const PORT = Number(process.env.PORT ?? 4180);
const HOST = process.env.HOST ?? '0.0.0.0';
const STORE_PATH = process.env.LEVANTRY_STORE ?? DEFAULT_STORE_PATH;
const TOKEN_PATH = join(resolve(STORE_PATH, '..'), 'token.txt');
const APP_ROOT = resolve(process.env.LEVANTRY_APP_ROOT ?? join(process.cwd(), 'dist'));

/** A single push carries the device's whole dataset, so the cap is generous. */
const MAX_BODY_BYTES = 64 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

/**
 * The shared secret both devices present.
 *
 * Generated on first run and written next to the store rather than baked into
 * a config file, so that starting the server has no setup step: read the line
 * the console prints, type it into the phone once, done. Set
 * `LEVANTRY_SYNC_TOKEN` to pin your own instead.
 */
async function resolveToken(): Promise<string> {
  const fromEnv = process.env.LEVANTRY_SYNC_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  try {
    const existing = (await readFile(TOKEN_PATH, 'utf8')).trim();
    if (existing) return existing;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const generated = randomBytes(32).toString('hex');
  await mkdir(resolve(TOKEN_PATH, '..'), { recursive: true });
  await writeFile(TOKEN_PATH, generated + '\n', 'utf8');
  return generated;
}

/**
 * Compared in constant time so that a wrong token cannot be recovered a
 * character at a time by measuring how long the rejection takes. Cheap to do,
 * and the alternative is a subtly broken lock.
 */
function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearer(request: IncomingMessage): string {
  const header = request.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  response.end(payload);
}

/**
 * The API is reachable from any origin, because the app may legitimately be
 * loaded from a dev server, a preview server or a tunnel host, and pinning an
 * allow-list would break the first time an address changed. The bearer token
 * is what actually guards the data — and because it travels in a header rather
 * than a cookie, a hostile page cannot make the browser attach it for you.
 */
function cors(response: ServerResponse): void {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', 'authorization, content-type');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-max-age', '86400');
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejectPromise(new Error('The pushed payload is larger than the server accepts.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    request.on('error', rejectPromise);
  });
}

/**
 * Serves a file from the built app.
 *
 * Anything that is not a real file falls back to `index.html`, because the app
 * is a single-page router: a phone opening `/study/deck_x` directly must still
 * get the app rather than a 404.
 */
async function serveApp(pathname: string, response: ServerResponse): Promise<void> {
  // `normalize` collapses any `..` before the prefix check, so a crafted path
  // cannot escape the build directory and read the rest of the disk.
  const requested = resolve(join(APP_ROOT, normalize(decodeURIComponent(pathname))));
  const inside = requested === APP_ROOT || requested.startsWith(APP_ROOT + sep);

  let file = inside ? requested : APP_ROOT;
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }

  if (!info?.isFile()) {
    file = join(APP_ROOT, 'index.html');
    info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      json(response, 404, {
        error:
          'The app has not been built yet. Run `npm run build`, then reload — ' +
          'or open the Vite dev server and point it at this address instead.',
      });
      return;
    }
  }

  const isEntry = file.endsWith('index.html');
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': info.size,
    // Hashed asset filenames make long caching safe; the entry document must
    // never be cached or a rebuilt app would keep loading the old bundle.
    'cache-control': isEntry ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(response);
}

async function main(): Promise<void> {
  const store = new SyncStore(STORE_PATH);
  await store.load();
  const token = await resolveToken();

  const server = createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      console.error('[sync] request failed:', error);
      if (!response.headersSent) {
        json(response, 500, { error: error instanceof Error ? error.message : 'Server error.' });
      } else {
        response.end();
      }
    });
  });

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;

    if (!path.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        json(response, 405, { error: 'Only GET is served from the app bundle.' });
        return;
      }
      await serveApp(path, response);
      return;
    }

    cors(response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    // Unauthenticated on purpose: it carries no data, and it lets the app's
    // sync screen tell "I cannot reach the laptop" apart from "wrong token".
    if (path === '/api/ping') {
      json(response, 200, { ok: true, service: 'levantry-sync', protocol: SYNC_PROTOCOL_VERSION });
      return;
    }

    if (!tokenMatches(bearer(request), token)) {
      json(response, 401, {
        error: 'That sync token is not the one this server was started with.',
      });
      return;
    }

    if (path === '/api/health' && request.method === 'GET') {
      json(response, 200, store.health());
      return;
    }

    // A plain dump of everything the server holds. Not part of the sync
    // protocol — it exists so the shared copy can be backed up without
    // reaching for a device.
    if (path === '/api/backup' && request.method === 'GET') {
      json(response, 200, {
        service: 'levantry-sync',
        exportedAt: new Date().toISOString(),
        ...store.snapshot(),
      });
      return;
    }

    if (path === '/api/sync' && request.method === 'POST') {
      let body: SyncPushBody;
      try {
        body = JSON.parse(await readBody(request)) as SyncPushBody;
      } catch (error) {
        json(response, 400, {
          error: error instanceof Error ? error.message : 'Unreadable body.',
        });
        return;
      }

      if (typeof body?.deviceId !== 'string' || body.deviceId === '') {
        json(response, 400, { error: 'Every sync must identify its device.' });
        return;
      }

      const since = Number.isFinite(body.since) ? Math.max(0, Math.trunc(body.since)) : 0;
      const result = await store.sync(since, body.changes ?? {}, {
        id: body.deviceId,
        name: body.deviceName,
      });

      const payload: SyncResponse = { ...result, serverTime: new Date().toISOString() };
      const sent = Object.values(payload.changes).reduce((n, rows) => n + rows.length, 0);
      console.log(
        `[sync] ${body.deviceName ?? body.deviceId}: ` +
          `+${result.accepted} accepted, ${result.rejected} older, ${sent} sent back ` +
          `(seq ${since} -> ${result.seq})`,
      );
      json(response, 200, payload);
      return;
    }

    json(response, 404, { error: `No route for ${request.method} ${path}.` });
  }

  server.listen(PORT, HOST, () => {
    console.log('\n  Levantry sync server\n');
    console.log(`  store   ${STORE_PATH}`);
    console.log(`  app     ${APP_ROOT}`);
    console.log(`  token   ${token}`);
    console.log('\n  Open on this laptop:');
    console.log(`    http://localhost:${PORT}`);

    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal);

    if (addresses.length > 0) {
      console.log('\n  Open on the phone (same Wi-Fi):');
      for (const entry of addresses) console.log(`    http://${entry!.address}:${PORT}`);
    } else {
      console.log('\n  No network address found - is this laptop on Wi-Fi?');
    }
    console.log('\n  Paste the token above into Settings > Sync on each device.\n');
  });
}

void main();
