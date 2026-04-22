import { ZodError } from "zod";
import {
	ProjectContextDefinitionSchema,
	LayersYamlSchema,
	ScenarioDefinitionSchema,
	ChallengeYamlSchema,
	LocationJsonSchema,
	type ProjectContextDefinition,
	type ChallengeYaml,
	type ScenarioDefinition,
} from "./schemas.js";
import type { ValidationError } from "./error-overlay.js";

// ─── Structural validation (Zod) ──────────────────────────────────────────────

function zodErrors(file: string, error: ZodError): ValidationError[] {
	return error.issues.map((issue) => ({
		file,
		path: issue.path.join("."),
		message: issue.message,
	}));
}

export function validateContextYaml(
	file: string,
	data: unknown,
): ValidationError[] {
	const result = ProjectContextDefinitionSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateLayersYaml(
	file: string,
	data: unknown,
): ValidationError[] {
	const result = LayersYamlSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateScenarioYaml(
	file: string,
	data: unknown,
): ValidationError[] {
	const result = ScenarioDefinitionSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateChallengeYaml(
	file: string,
	data: unknown,
): ValidationError[] {
	const result = ChallengeYamlSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateLocationJson(
	file: string,
	data: unknown,
): ValidationError[] {
	const result = LocationJsonSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

// ─── Relational validation (business logic) ───────────────────────────────────

/** All layer IDs declared in context.yaml, collected once for cross-checks. */
function collectLayerIds(context: ProjectContextDefinition): Set<string> {
	const ids = new Set<string>();
	const addLayers = (layers: Record<string, unknown> = {}) =>
		Object.keys(layers).forEach((id) => ids.add(id));

	addLayers(context.global?.layers);
	Object.values(context.scenarios ?? {}).forEach((scenario) => {
		addLayers(scenario.layers);
		Object.values(scenario.roles ?? {}).forEach((role) => addLayers(role.layers));
	});
	return ids;
}

export function validateChallengeRelations(
	file: string,
	challenge: ChallengeYaml,
	knownLayerIds: Set<string>,
): ValidationError[] {
	const errors: ValidationError[] = [];
	const pointIds = new Set(challenge.story_points.map((p) => p.id));

	for (const point of challenge.story_points) {
		const at = `story_points[${point.id}]`;

		// slider_time_layer must reference a real layer
		if (point.slider_time_layer && !knownLayerIds.has(point.slider_time_layer)) {
			errors.push({
				file,
				path: `${at}.slider_time_layer`,
				message: `Layer "${point.slider_time_layer}" is not defined in context.yaml`,
			});
		}

		// activeLayerIds must reference real layers
		for (const layerId of point.activeLayerIds ?? []) {
			if (!knownLayerIds.has(layerId)) {
				errors.push({
					file,
					path: `${at}.activeLayerIds`,
					message: `Layer "${layerId}" is not defined in context.yaml`,
				});
			}
		}

		// next strings must reference existing point IDs
		if (typeof point.next === "string") {
			if (!pointIds.has(point.next)) {
				errors.push({
					file,
					path: `${at}.next`,
					message: `References unknown story point "${point.next}"`,
				});
			}
		} else if (point.next && typeof point.next === "object") {
			for (const [outcome, targetId] of Object.entries(point.next)) {
				if (targetId && !pointIds.has(targetId)) {
					errors.push({
						file,
						path: `${at}.next.${outcome}`,
						message: `References unknown story point "${targetId}"`,
					});
				}
			}
		}

		// solution IDs must not overlap with wrong_options (selection quiz types only)
		if (point.type === "area-selection-quiz" || point.type === "point-selection-quiz") {
			const overlap = point.solution.filter((id) =>
				point.wrong_options.includes(id),
			);
			if (overlap.length > 0) {
				errors.push({
					file,
					path: `${at}.wrong_options`,
					message: `IDs appear in both solution and wrong_options: ${overlap.join(", ")}`,
				});
			}
		}
	}

	return errors;
}

export function validateScenarioRelations(
	file: string,
	scenario: ScenarioDefinition,
	_knownLayerIds: Set<string>,
): ValidationError[] {
	const errors: ValidationError[] = [];

	const roles = scenario.roles;
	if (!roles || typeof roles !== "object" || Array.isArray(roles)) return errors;

	for (const [roleId, role] of Object.entries(roles)) {
		if (!role.challenge) {
			errors.push({
				file,
				path: `roles.${roleId}`,
				message: `Role "${roleId}" has no challenge path`,
			});
		}
	}

	return errors;
}

export function validateContextRelations(
	file: string,
	context: ProjectContextDefinition,
): ValidationError[] {
	const errors: ValidationError[] = [];
	const layerIds = collectLayerIds(context);

	for (const [scenarioId, scenario] of Object.entries(context.scenarios ?? {})) {
		for (const [roleId, role] of Object.entries(scenario.roles ?? {})) {
			for (const excludedId of role.exclude_layers ?? []) {
				if (!layerIds.has(excludedId)) {
					errors.push({
						file,
						path: `scenarios.${scenarioId}.roles.${roleId}.exclude_layers`,
						message: `exclude_layers references unknown layer "${excludedId}"`,
					});
				}
			}
		}
	}

	return errors;
}

export function validateScenarioContextRoles(
	file: string,
	scenario: ScenarioDefinition,
	contextRoleIds: Set<string>,
): ValidationError[] {
	const errors: ValidationError[] = [];
	for (const roleId of Object.keys(scenario.roles ?? {})) {
		if (!contextRoleIds.has(roleId)) {
			errors.push({
				file,
				path: `roles.${roleId}`,
				message: `Role "${roleId}" is defined in scenario.yaml but missing from context.yaml — layers for this role will not load`,
			});
		}
	}
	return errors;
}

export { collectLayerIds };
