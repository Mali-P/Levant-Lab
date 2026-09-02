import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    /*
     * The starter set is three decks to a lot — Hebrew, Palestinian Arabic,
     * both — which is some 4,300 card rows now that Sentence Building and
     * Conversation Flow sit beside the course, and the seeder tests write
     * every one of them through fake-indexeddb. That is a shim over an
     * in-memory store rather than a database, and it is slow enough that a
     * full install runs past the two-second default a hundred times over.
     * Nothing here waits on a network or a timer; the only thing a shorter
     * limit would catch is the size of the course.
     *
     * So it is raised whenever the course grows, and the headroom is now
     * deliberate. At 120s the slowest of these ran at 108s, which meant one
     * level's worth of new content turned four passing tests red without a
     * single line of their behaviour changing — and at 300s the same thing
     * happened again when Tell Me About It took the row count past six
     * thousand and the slowest seeder test to ~300s under a loaded machine.
     */
    testTimeout: 600000,
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
