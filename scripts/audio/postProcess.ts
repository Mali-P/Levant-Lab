import { spawn, spawnSync } from 'node:child_process';
import type { AudioConfig } from './config';

let available: boolean | null = null;

/** Whether ffmpeg is on PATH. Checked once per run. */
export function hasFfmpeg(): boolean {
  if (available === null) {
    const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    available = !probe.error && probe.status === 0;
  }
  return available;
}

/**
 * Trims the dead air either side of a word and pulls every clip to the same
 * loudness, so a Google Hebrew recording and an Azure Arabic one sit at the
 * same level and the learner is not reaching for the volume between them.
 *
 * Silence is trimmed with a gentle threshold and only at the very ends: an
 * aggressive gate would clip the release of a final consonant. Speed is never
 * touched.
 */
export function normalise(input: Buffer, config: AudioConfig): Promise<Buffer> {
  const trim =
    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05:detection=peak';
  const filters = [
    trim,
    'areverse',
    trim,
    'areverse',
    'loudnorm=I=' + config.loudnessLufs + ':TP=-1.5:LRA=11',
  ].join(',');

  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-af', filters,
    '-ac', '1',
    '-ar', String(config.sampleRateHz),
    '-codec:a', 'libmp3lame',
    '-b:a', config.bitrateKbps + 'k',
    '-f', 'mp3',
    'pipe:1',
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];

    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk) => errors.push(chunk));
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      const output = Buffer.concat(chunks);
      if (code !== 0 || output.length === 0) {
        reject(
          new Error(
            'ffmpeg exited with ' + code + ': ' + Buffer.concat(errors).toString().slice(0, 300),
          ),
        );
        return;
      }
      resolve(output);
    });

    ffmpeg.stdin.on('error', () => {
      // ffmpeg can close the pipe early on malformed input; the close handler
      // reports the real reason.
    });
    ffmpeg.stdin.end(input);
  });
}
