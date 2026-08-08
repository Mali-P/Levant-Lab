import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The deployment guard hooks live in .claude/ and the audio generator in
    // scripts/, rather than src/, but they are project code with project
    // tests and run in the same suite.
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      '.claude/hooks/**/*.test.mjs',
    ],
  },
});
