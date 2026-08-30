import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    /*
     * The starter set is three decks to a lot — Hebrew, Palestinian Arabic,
     * both — which is some 3,500 card rows, and the seeder tests write every
     * one of them through fake-indexeddb. That is a shim over an in-memory
     * store rather than a database, and it is slow enough that a full install
     * runs past the two-second default several times over. Nothing here is
     * waiting on a network or a timer; the only thing a shorter limit would
     * catch is the size of the course.
     */
    testTimeout: 120000,
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
