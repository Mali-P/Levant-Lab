import { WebSpeechService } from './webSpeech';
import type { SpeechService } from './types';

export * from './types';
export { WebSpeechService };

/**
 * Single place to swap in Azure Speech or a pre-recorded audio backend later.
 * Screens depend only on the SpeechService interface.
 */
let active: SpeechService = new WebSpeechService();

export function speechService(): SpeechService {
  return active;
}

export function setSpeechService(service: SpeechService): void {
  active.stop();
  active = service;
}
