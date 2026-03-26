import { app } from "./state.js";
import { loadYAML } from "./lib.js";
import { ProjectContext } from "./types.js";

/** Local cache for project context data. */
let context: ProjectContext | null = null;

/**
 * Loads the project context (scenarios and roles) from YAML.
 */
export async function initScenarios(): Promise<void> {
	const ctxWrapper = await loadYAML<{ contexts: ProjectContext }>(
		"/config/context.yaml",
	);
	if (ctxWrapper) {
		context = ctxWrapper.contexts;
	}
}

/**
 * Returns slider time config for the current role (if defined in context.yaml).
 */
export function getRoleSliderConfig(): { time: string; layer?: string; fixed: boolean } | null {
	if (!context || !app.currentScenario || !app.currentRole) return null;
	const role = context.scenarios[app.currentScenario]?.roles?.[app.currentRole];
	if (!role?.slider_time) return null;
	return {
		time: role.slider_time,
		layer: role.slider_time_layer,
		fixed: role.slider_time_fixed ?? false,
	};
}

/**
 * Returns layer IDs to activate at the start of the challenge (from context.yaml).
 */
export function getRoleActiveLayerIds(): string[] {
	if (!context || !app.currentScenario || !app.currentRole) return [];
	const role = context.scenarios[app.currentScenario]?.roles?.[app.currentRole];
	return role?.activeLayerIds ?? [];
}

/**
 * Returns the file path for the quiz associated with the current scenario/role.
 */
export function getQuizPath(): string | null {
	if (!context || !app.currentScenario) return null;
	const scenario = context.scenarios[app.currentScenario];
	if (!scenario) return null;

	// Check if role-specific quiz exists
	if (app.currentRole) {
		const role = scenario.roles[app.currentRole];
		if (role?.quiz) return role.quiz;
	}

	// Fallback to scenario-level quiz
	return scenario.quiz || null;
}
