export type Language = 'de' | 'en';

export interface LayerConfig {
  id: string;
  class: string;
  type: 'static-image' | 'dynamic-image' | 'locations';
  title_key?: string;
  description_key?: string;
  toggle: 'available' | 'deactivated' | 'hidden';
  always_available?: boolean;
  available_from?: 'scenario' | 'role';
  interaction: string;
  opacity_control?: boolean;
  playback_control?: boolean;
  icon_mode?: string;
}

export interface ContextLayer {
  src: string;
  icon?: string;
  always_visible: boolean;
}

export interface Role {
  layers: Record<string, ContextLayer>;
}

export interface ScenarioContext {
  layers: Record<string, ContextLayer>;
  roles: Record<string, Role>;
}

export interface ProjectContext {
  global: {
    layers: Record<string, ContextLayer>;
  };
  scenarios: Record<string, ScenarioContext>;
}

export interface AppState {
  language: Language;
  currentScenario: string | null;
  currentRole: string | null;
  activeLayers: Set<string>;
  view: 'home' | 'scenario-select' | 'role-select' | 'map';
  ui: {
    app: HTMLElement | null;
    infoBox: HTMLElement | null;
    infoBoxContent: HTMLElement | null;
    layerControl: HTMLElement | null;
    slider: HTMLElement | null;
    layers: HTMLElement | null;
    escapeBtn: HTMLElement | null;
    languageSwitch: HTMLInputElement | null;
  };
}
