/** Supported languages for the application. */
export type Language = "de" | "en";

// Types derived from YAML/JSON file schemas live in schemas.ts.
// Re-exported here for backwards-compatible imports across the codebase.
import {
	LocalizedScenarioText,
	ScenarioRoleDefinition,
} from "./schemas.js";

export type {
	ContextLayerDefinition,
	ContextRoleDefinition,
	ContextScenarioDefinition,
	ProjectContextDefinition,
	LayerTypeDefinition,
	LayersYamlFile as LayerTypesFile,
	LocalizedScenarioText,
	ScenarioRoleDefinition,
	ScenarioDefinitionInput,
	StoryPoint,
	ChallengeYaml,
	LocationEntry,
	LocationJson,
	ContentYaml,
} from "./schemas.js";

/** Scenario metadata after normalization. */
export interface ScenarioDefinition {
	id: string;
	active?: boolean;
	text?: Record<string, LocalizedScenarioText>;
	roles: Record<string, ScenarioRoleDefinition>;
}

/** Configuration for a single data layer as defined in layers.yaml. */
export interface LayerConfig {
	id: string;
	class: string;
	type:
		| "static-image"
		| "pulsing-image"
		| "locations"
		| "areas"
		| "lottie-sequence"
		| "png-sequence"
		| "svg-sequence";
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
	src_overlay?: string;
	icon?: string;
	slider_icon?: string;
	poi_icon?: string;
	status_poi_icons?: Record<string, string>;
	initially_visible?: boolean;
	quiz_only?: boolean;
	map_only?: boolean;
	z_index?: number;
	toggle_order?: number;
}

/** A role within a scenario, containing its specific layers and an optional quiz. */
export interface Role {
	layers: Record<string, ContextLayer>;
	quiz?: string;
	exclude_layers?: string[];
	slider_time?: string;
	slider_time_layer?: string;
	slider_time_fixed?: boolean;
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
	completed: boolean;
}

/** The central Application State interface. */
export interface AppState {
	context: ProjectContext | null;
	language: Language;
	/** Native resolution width of the application (3840px). */
	width: number;
	/** Native resolution height of the application (2160px). */
	height: number;
	currentScenario: string | null;
	currentRole: string | null;
	/** Set of IDs for layers currently visible on the map. */
	activeLayers: Set<string>;
	visibleLayerToggles: number;
	/** Set of IDs for layers specifically enabled by a quiz step. */
	quizStepLayers: Set<string>;
	view: "home" | "scenario-select" | "role-select" | "map" | "quiz";
	/** Stores completion status for challenges identified by "scenario_role". */
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
		poiOverlayPortal: HTMLElement | null;
		escapeBtn: HTMLElement | null;
		languageSwitch: HTMLInputElement | null;
		poiOverlay: HTMLElement | null;
	};
}
