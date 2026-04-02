import { app } from "./state.js";
import { loadYAML } from "./lib.js";
import { ProjectContext, PrototypeScenario } from "./types.js";

/** Local cache for project context data. */
let context: ProjectContext | null = null;
/** Prototype scenario metadata loaded from assets/scenarios/<id>/scenario.yaml. */
const prototypeScenarios = new Map<string, PrototypeScenario | null>();
const prototypeChallenges = new Map<string, any | null>();

async function loadPrototypeChallenge(path: string): Promise<any | null> {
	if (prototypeChallenges.has(path)) {
		return prototypeChallenges.get(path) ?? null;
	}

	try {
		const data = await loadYAML<any>(path);
		prototypeChallenges.set(path, data ?? null);
		return data ?? null;
	} catch {
		prototypeChallenges.set(path, null);
		return null;
	}
}

function getPrototypeScenarioPath(scenarioId: string): string {
	return `/assets/scenarios/${scenarioId}/scenario.yaml`;
}

function resolvePrototypeScenario(
	scenarioId: string,
	data: PrototypeScenario,
): PrototypeScenario {
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

export async function loadPrototypeScenario(
	scenarioId: string,
): Promise<PrototypeScenario | null> {
	if (prototypeScenarios.has(scenarioId)) {
		return prototypeScenarios.get(scenarioId) ?? null;
	}

	try {
		const data = await loadYAML<PrototypeScenario>(
			getPrototypeScenarioPath(scenarioId),
		);
		if (!data) {
			prototypeScenarios.set(scenarioId, null);
			return null;
		}

		const resolved = resolvePrototypeScenario(scenarioId, data);
		prototypeScenarios.set(scenarioId, resolved);
		return resolved;
	} catch {
		prototypeScenarios.set(scenarioId, null);
		return null;
	}
}

export function getPrototypeScenario(scenarioId: string): PrototypeScenario | null {
	return prototypeScenarios.get(scenarioId) ?? null;
}

export function getCurrentPrototypeScenario(): PrototypeScenario | null {
	if (!app.currentScenario) return null;
	return getPrototypeScenario(app.currentScenario);
}

export function getCurrentPrototypeRoleTitle(): string | null {
	const scenario = getCurrentPrototypeScenario();
	if (!scenario || !app.currentRole) return null;
	return scenario.roles[app.currentRole]?.text?.[app.language]?.title ?? null;
}

export async function getCurrentPrototypeChallengeIntro(): Promise<{
	title?: string;
	description?: string;
} | null> {
	const scenario = getCurrentPrototypeScenario();
	if (!scenario || !app.currentRole) return null;

	const challengePath = scenario.roles[app.currentRole]?.challenge;
	if (!challengePath) return null;

	const challenge = await loadPrototypeChallenge(challengePath);
	const introPoint = challenge?.story_points?.find(
		(point: any) => point?.id === "intro" && point?.type === "info",
	);
	const text = introPoint?.text?.[app.language];
	if (!text) return null;

	return {
		title: text.title,
		description: text.description,
	};
}

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

	if (context?.scenarios) {
		await Promise.all(
			Object.keys(context.scenarios).map((scenarioId) =>
				loadPrototypeScenario(scenarioId),
			),
		);
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
	if (!app.currentScenario) return null;

	const prototypeScenario = getCurrentPrototypeScenario();
	if (prototypeScenario && app.currentRole) {
		const prototypeRole = prototypeScenario.roles[app.currentRole];
		if (prototypeRole?.challenge) return prototypeRole.challenge;
	}

	if (!context) return null;
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
