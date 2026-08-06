import { describe, expect, it } from 'vitest';
import { buildPromptPlan, gradePlan } from './prompts';
import type { Flashcard } from '../../types';

const card: Flashcard = {
  id: 'c1',
  categoryId: 'cat1',
  deckId: 'd1',
  english: 'bread',
  hebrew: { script: 'לחם', transliteration: 'lechem' },
  arabic: { script: 'خبز', transliteration: 'khubez', dialect: 'General Levantine' },
  createdAt: '2026-08-06T10:00:00.000Z',
  updatedAt: '2026-08-06T10:00:00.000Z',
};

describe('prompt directions', () => {
  it('defaults to English asking for both scripts', () => {
    const plan = buildPromptPlan(card, 'en>he+ar');
    expect(plan.promptText).toBe('bread');
    expect(plan.fields.map((f) => f.input)).toEqual(['hebrew', 'arabic']);
    expect(plan.audio).toBeUndefined();
  });

  it('shows Hebrew and asks for English plus Arabic', () => {
    const plan = buildPromptPlan(card, 'he>en+ar');
    expect(plan.promptLanguage).toBe('hebrew');
    expect(plan.promptText).toBe('לחם');
    expect(plan.fields.map((f) => f.input)).toEqual(['english', 'arabic']);
    // Recalling the meaning is what proves the Hebrew link.
    expect(plan.fields[0].scores).toBe('hebrew');
  });

  it('marks audio directions so the card plays instead of showing the word', () => {
    expect(buildPromptPlan(card, 'arAudio>ar+he').audio).toBe('arabic');
    expect(buildPromptPlan(card, 'heAudio>he+ar').audio).toBe('hebrew');
  });
});

describe('grading a plan', () => {
  it('scores each language independently', () => {
    const plan = buildPromptPlan(card, 'en>he+ar');
    expect(gradePlan(plan, card, { hebrew: 'לחם', arabic: 'خبز' })).toEqual({
      hebrew: true,
      arabic: true,
    });
    expect(gradePlan(plan, card, { hebrew: 'לחם', arabic: 'مي' })).toEqual({
      hebrew: true,
      arabic: false,
    });
    expect(gradePlan(plan, card, { hebrew: '', arabic: 'خبز' })).toEqual({
      hebrew: false,
      arabic: true,
    });
  });

  it('accepts English case-insensitively when it is the answer', () => {
    const plan = buildPromptPlan(card, 'he>en+ar');
    expect(gradePlan(plan, card, { hebrew: ' Bread ', arabic: 'خبز' })).toEqual({
      hebrew: true,
      arabic: true,
    });
  });

  it('rejects a blank English answer', () => {
    const plan = buildPromptPlan(card, 'ar>en+he');
    expect(gradePlan(plan, card, { arabic: '', hebrew: 'לחם' }).arabic).toBe(false);
  });
});
