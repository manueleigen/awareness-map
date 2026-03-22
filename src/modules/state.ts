import { AppState } from '../modules/types.js';

/**
 * Central State Object
 * Holds the reactive state of the application, including current scenario,
 * active layers, and UI references.
 */
export const app: AppState = {
  context: null,
  language: 'de',
  width: 3840, // 2880, // 
  height: 2160 , // 1620, // 
  currentScenario: null,
  currentRole: null,
  activeLayers: new Set(),
  layerSelectionOrder: [],
  quizStepLayers: new Set(),
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
