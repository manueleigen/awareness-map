import { AppState } from '../modules/types.js';

export const app: AppState = {
  language: 'de',
  width: 3840,
  height: 2160,
  currentScenario: null,
  currentRole: null,
  activeLayers: new Set(),
  view: 'home',
  challengeResults: {},
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
