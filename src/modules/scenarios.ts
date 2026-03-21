import { app } from "./state.js";
import { create, loadYAML } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { t } from "./translater.js";
import { ProjectContext } from "./types.js";
import { updateView } from "./info-box.js";
import { resetLayers } from "./layers.js";

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
