import { app } from "./state.js";
import { loadYAML } from "./lib.js";
import {
	Language,
	LocalizedScenarioText,
	ProjectContextDefinition,
	ScenarioDefinition,
} from "./types.js";
import { getChallengeIntroText, normalizeChallengeDefinition } from "./quiz/challenge-normalizer.js";

/** Scenario metadata loaded from assets/scenarios/<id>/scenario.yaml. */
const loadedScenarios = new Map<string, ScenarioDefinition | null>();
const loadedChallenges = new Map<string, any | null>();

async function loadChallengeDefinition(path: string): Promise<any | null> {
	if (loadedChallenges.has(path)) {
		return loadedChallenges.get(path) ?? null;
	}

	try {
		const data = await loadYAML<any>(path);
		const normalized = data ? normalizeChallengeDefinition(data) : null;
		loadedChallenges.set(path, normalized);
		return normalized;
	} catch {
		loadedChallenges.set(path, null);
		return null;
	}
}

async function getCurrentChallengeDefinition(): Promise<any | null> {
	const scenario = getCurrentScenarioDefinition();
	if (!scenario || !app.currentRole) return null;
	const challengePath = scenario.roles[app.currentRole]?.challenge;
	if (!challengePath) return null;
	return loadChallengeDefinition(challengePath);
}

function getScenarioPath(scenarioId: string): string {
	return `/assets/scenarios/${scenarioId}/scenario.yaml`;
}

function resolveScenarioDefinition(
	scenarioId: string,
	data: ScenarioDefinition,
): ScenarioDefinition {
	const roles = Object.fromEntries(
		Object.entries(data.roles ?? {}).map(([roleId, role]) => {
			const challengePath = role.challenge?.startsWith("./")
				? `/assets/scenarios/${scenarioId}/${role.challenge.slice(2)}`
				: role.challenge;
			return [
				roleId,
				{
					...role,
					challenge: challengePath,
				},
			];
		}),
	);

	return {
		...data,
		id: data.id || scenarioId,
		roles,
	};
}

export async function loadScenarioDefinition(
	scenarioId: string,
): Promise<ScenarioDefinition | null> {
	if (loadedScenarios.has(scenarioId)) {
		return loadedScenarios.get(scenarioId) ?? null;
	}

	try {
		const data = await loadYAML<ScenarioDefinition>(
			getScenarioPath(scenarioId),
		);
		if (!data) {
			loadedScenarios.set(scenarioId, null);
			return null;
		}

		const resolved = resolveScenarioDefinition(scenarioId, data);
		loadedScenarios.set(scenarioId, resolved);
		return resolved;
	} catch {
		loadedScenarios.set(scenarioId, null);
		return null;
	}
}

export function getScenarioDefinition(scenarioId: string): ScenarioDefinition | null {
	return loadedScenarios.get(scenarioId) ?? null;
}

export function getCurrentScenarioDefinition(): ScenarioDefinition | null {
	if (!app.currentScenario) return null;
	return getScenarioDefinition(app.currentScenario);
}

export function getScenarioText(
	scenarioId: string,
): LocalizedScenarioText | null {
	const scenario = getScenarioDefinition(scenarioId);
	if (!scenario) return null;
	return scenario.text?.[app.language] ?? null;
}

export function getCurrentScenarioText(): LocalizedScenarioText | null {
	if (!app.currentScenario) return null;
	return getScenarioText(app.currentScenario);
}

export function getCurrentRoleTitle(): string | null {
	const scenario = getCurrentScenarioDefinition();
	if (!scenario || !app.currentRole) return null;
	return scenario.roles[app.currentRole]?.text?.[app.language]?.title ?? null;
}

export async function getCurrentChallengeIntro(): Promise<{
	title?: string;
	description?: string;
} | null> {
	const challenge = await getCurrentChallengeDefinition();
	return challenge ? getChallengeIntroText(challenge) : null;
}

/**
 * Loads the project context (scenarios and roles) from YAML.
 */
export async function initScenarios(): Promise<void> {
	const contextDefinition = await loadYAML<ProjectContextDefinition>(
		"/config/context.yaml",
	).catch(() => null);

	const scenarioIds = new Set<string>();
	Object.keys(contextDefinition?.scenarios ?? {}).forEach((scenarioId) =>
		scenarioIds.add(scenarioId),
	);

	await Promise.all(
		Array.from(scenarioIds).map((scenarioId) => loadScenarioDefinition(scenarioId)),
	);
}

/**
 * Returns slider time config for the current role.
 */
export async function getRoleSliderConfig(): Promise<{ time: string; layer?: string; fixed: boolean } | null> {
	const challenge = await getCurrentChallengeDefinition();
	const intro = challenge?.story_points?.find(
		(point: any) => point?.id === "intro" && point?.type === "info",
	);
	if (intro?.slider_time) {
		return {
			time: intro.slider_time,
			layer: intro.slider_time_layer,
			fixed: intro.slider_time_fixed ?? false,
		};
	}
	return null;
}

/**
 * Returns layer IDs to activate at the start of the challenge.
 */
export async function getRoleActiveLayerIds(): Promise<string[]> {
	const challenge = await getCurrentChallengeDefinition();
	const intro = challenge?.story_points?.find(
		(point: any) => point?.id === "intro" && point?.type === "info",
	);
	if (intro?.activeLayerIds?.length) {
		return intro.activeLayerIds;
	}
	return [];
}

/**
 * Returns the file path for the challenge associated with the current scenario/role.
 */
export function getQuizPath(): string | null {
	if (!app.currentScenario) return null;

	const scenario = getCurrentScenarioDefinition();
	if (scenario && app.currentRole) {
		const role = scenario.roles[app.currentRole];
		if (role?.challenge) return role.challenge;
	}
	return null;
}
