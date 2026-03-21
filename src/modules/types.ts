/** Supported languages for the application. */
export type Language = "de" | "en";

/** Configuration for a single data layer as defined in layers.yaml. */
export interface LayerConfig {
	id: string;
	class: string;
	type: "static-image" | "dynamic-image" | "locations" | "areas";
	title_key?: string;
	description_key?: string;
	toggle: "available" | "deactivated" | "hidden" | "none";
	available_from?: "scenario" | "role" | "global";
	interaction: "none" | "all" | "timeline" | "areas" | "locations" | string;
	opacity_control?: boolean;
	playback_control?: boolean;
	start_time?: string;
	end_time?: string;
	icon_mode?: string;
}

/** Specific layer data within a context (global, scenario, or role). */
export interface ContextLayer {
	title: {
		de: string;
		en: string;
	};
	src: string;
	icon?: string;
	slider_icon?: string;
	poi_icon?: string;
	initially_visible?: boolean;
	z_index?: number;
}

/** A role within a scenario, containing its specific layers and an optional quiz. */
export interface Role {
	layers: Record<string, ContextLayer>;
	quiz?: string;
	exclude_layers?: string[];
}

/** A scenario context containing global layers and a set of roles. */
export interface ScenarioContext {
	layers: Record<string, ContextLayer>;
	roles: Record<string, Role>;
	quiz?: string;
}

/** The root structure for context.yaml. */
export interface ProjectContext {
	global: {
		layers: Record<string, ContextLayer>;
	};
	scenarios: Record<string, ScenarioContext>;
}

/** Stores the outcome of a completed challenge. */
export interface ChallengeResult {
	scenarioId: string;
	roleId: string;
	status: "passed" | "failed";
	score?: number;
}

/** The central Application State interface. */
export interface AppState {
	language: Language;
	/** Native resolution width of the application (3840px). */
	width: number;
	/** Native resolution height of the application (2160px). */
	height: number;
	currentScenario: string | null;
	currentRole: string | null;
	/** Set of IDs for layers currently visible on the map. */
	activeLayers: Set<string>;
	view: "home" | "scenario-select" | "role-select" | "map" | "quiz";
	/** Stores passed/failed status for challenges identified by "scenario_role". */
	challengeResults: Record<string, ChallengeResult>;
	/** Cached DOM references for UI manipulation. */
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
