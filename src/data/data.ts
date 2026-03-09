import { AppState } from '../modules/types.js';

export const app: AppState = {
  language: 'de',
  currentScenario: null,
  currentRole: null,
  activeLayers: new Set(),
  view: 'home'
};
