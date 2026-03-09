export type Language = 'de' | 'en';

export interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export interface Layer {
  id: string;
  type: 'color' | 'image' | 'layergroup' | 'lottie';
  toggle: 'true' | 'false' | 'hidden';
  translations: {
    name: { [key in Language]: string };
  };
  icon?: string;
  background?: string;
  file?: string;
  layers?: Layer[];
  subLayer?: boolean;
  css?: string;
}

export interface StoryPoint {
  type: 'info' | 'areaselect' | 'pointselect' | 'quiz';
  content: string;
  // Weitere spezifische Felder je nach Typ können hier ergänzt werden
}

export interface Challenge {
  name: string;
  startTime: string;
  endTime: string;
  'object-layers': { id: string }[];
  'story-points': StoryPoint[];
}

export interface Scenario {
  name: string;
  challenges: Challenge[];
}

export interface AppState {
  language: Language;
  'global-layers': { id: string }[];
  scenarios: Scenario[];
}
