export type Language = 'de' | 'en';

export interface LayerConfig {
  id: string;
  class: string;
  type: 'static-image' | 'dynamic-image' | 'locations' | 'areas';
  title_key?: string;
  description_key?: string;
  toggle: 'available' | 'deactivated' | 'hidden';
  available_from?: 'scenario' | 'role';
  interaction: string;
  opacity_control?: boolean;
  playback_control?: boolean;
  start_time?: string;
  end_time?: string;
  icon_mode?: string;
}

export interface ContextLayer {
  src: string;
  icon?: string;
  slider_icon?: string;
  poi_icon?: string;
  initially_visible?: boolean;
}

export interface Role {
  layers: Record<string, ContextLayer>;
  quiz?: string;
}

export interface ScenarioContext {
  layers: Record<string, ContextLayer>;
  roles: Record<string, Role>;
  quiz?: string;
}

export interface ProjectContext {
  global: {
    layers: Record<string, ContextLayer>;
  };
  scenarios: Record<string, ScenarioContext>;
}

export interface ChallengeResult {
  scenarioId: string;
  roleId: string;
  status: 'passed' | 'failed';
  score?: number;
}

export interface AppState {
  language: Language;
  width: number,
  height: number,
  currentScenario: string | null;
  currentRole: string | null;
  activeLayers: Set<string>;
  view: 'home' | 'scenario-select' | 'role-select' | 'map' | 'quiz';
  challengeResults: Record<string, ChallengeResult>;
  ui: {
    app: HTMLElement | null;
    infoBox: HTMLElement | null;
    infoBoxContent: HTMLElement | null;
    infoBoxControls: HTMLElement | null;
    layerControl: HTMLElement | null;
    slidersContainer: HTMLElement | null;
    layers: HTMLElement | null;
    escapeBtn: HTMLElement | null;
    languageSwitch: HTMLInputElement | null;
    poiOverlay: HTMLElement | null;
  };
}
