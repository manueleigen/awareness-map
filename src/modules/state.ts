import { AppState } from '../modules/types.js';

export const app: AppState = {
  language: 'de',
  currentScenario: null,
  currentRole: null,
  activeLayers: new Set(),
  view: 'home',
  ui: {
    app: null,
    infoBox: null,
    infoBoxContent: null,
    infoBoxControls: null,
    layerControl: null,
    slidersContainer: null,
    layers: null,
    escapeBtn: null,
    languageSwitch: null,
    poiOverlay: null
  }
};
