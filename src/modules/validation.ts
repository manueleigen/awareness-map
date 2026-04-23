import { ZodError } from "zod";
import {
	ProjectContextDefinitionSchema,
	LayersYamlSchema,
	ScenarioDefinitionSchema,
	ChallengeYamlSchema,
	LocationJsonSchema,
	type ProjectContextDefinition,
	type ChallengeYaml,
	type ScenarioDefinitionInput,
} from "./schemas.js";
import type { ScenarioDefinition } from "./types.js";
import type { ValidationError } from "./error-overlay.js";

// ─── Structural validation (Zod) ──────────────────────────────────────────────

function zodErrors(file: string, error: ZodError): ValidationError[] {
	return error.issues.map((issue) => ({
		file,
		path: issue.path.join("."),
		message: issue.message,
	}));
}

export function validateContextYaml(file: string, data: unknown): ValidationError[] {
	const result = ProjectContextDefinitionSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateLayersYaml(file: string, data: unknown): ValidationError[] {
	const result = LayersYamlSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateScenarioYaml(file: string, data: unknown): ValidationError[] {
	const result = ScenarioDefinitionSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

export function validateChallengeYaml(file: string, data: unknown): ValidationError[] {
	const result = ChallengeYamlSchema.safeParse(data);
	return result.success ? [] : zodErrors(file, result.error);
}

// ─── Relational validation (business logic) ───────────────────────────────────

/** All layer IDs and their definitions declared in context.yaml. */
export function collectLayerMap(context: ProjectContextDefinition): Map<string, any> {
	const layers = new Map<string, any>();
	const addLayers = (l: any[] | undefined) => {
		if (l) l.forEach((def) => layers.set(def.id, def));
	};

	addLayers(context.global?.layers);
	(context.scenarios ?? []).forEach((scenario) => {
		addLayers(scenario.layers);
		(scenario.roles ?? []).forEach((role) => addLayers(role.layers));
	});
	return layers;
}

export function validateChallengeRelations(
	file: string,
	challenge: ChallengeYaml,
	knownLayers: Map<string, any>,
): ValidationError[] {
	const errors: ValidationError[] = [];
	const pointIds = new Set(challenge.story_points.map((p) => p.id));
	const knownLayerIds = new Set(knownLayers.keys());

	for (const point of challenge.story_points) {
		const at = `story_points[${point.id}]`;

		// 1. Layer existence
		if (point.slider_time_layer && !knownLayerIds.has(point.slider_time_layer)) {
			errors.push({
				file,
				path: `${at}.slider_time_layer`,
				message: `Layer "${point.slider_time_layer}" is not defined in context.yaml`,
			});
		}
		for (const layerId of point.activeLayerIds ?? []) {
			if (!knownLayerIds.has(layerId)) {
				errors.push({
					file,
					path: `${at}.activeLayerIds`,
					message: `Layer "${layerId}" is not defined in context.yaml`,
				});
			}
		}

		// 2. Quiz Flow Integrity (Dead ends)
		if (point.type !== "end-screen" && !point.next) {
			errors.push({
				file,
				path: at,
				message: `Story point of type "${point.type}" is not terminal but has no "next" destination`,
			});
		}

		// 3. Timeline Consistency
		if (point.slider_time && point.slider_time_layer) {
			const layer = knownLayers.get(point.slider_time_layer);
			if (layer && layer.start_time && layer.end_time) {
				const parse = (t: string) => parseInt(t.replace(":", ""), 10);
				const current = parse(point.slider_time);
				const start = parse(layer.start_time);
				const end = parse(layer.end_time);
				if (current < start || current > end) {
					errors.push({
						file,
						path: `${at}.slider_time`,
						message: `Time "${point.slider_time}" is outside layer bounds (${layer.start_time} - ${layer.end_time})`,
					});
				}
			}
		}

		// 4. Next strings must reference existing point IDs
		const pointWithNext = point as any;
		if (typeof pointWithNext.next === "string") {
			if (!pointIds.has(pointWithNext.next)) {
				errors.push({
					file,
					path: `${at}.next`,
					message: `References unknown story point "${pointWithNext.next}"`,
				});
			}
		} else if (pointWithNext.next && typeof pointWithNext.next === "object") {
			for (const [outcome, targetId] of Object.entries(pointWithNext.next as Record<string, string>)) {
				if (targetId && !pointIds.has(targetId)) {
					errors.push({
						file,
						path: `${at}.next.${outcome}`,
						message: `References unknown story point "${targetId}"`,
					});
				}
			}
		}

		// 5. Solution IDs must not overlap with wrong_options
		if (point.type === "area-selection-quiz" || point.type === "point-selection-quiz") {
			const overlap = point.solution.filter((id) =>
				point.wrong_options?.includes(id),
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
	scenario: ScenarioDefinitionInput,
	_scenarioId: string,
	_context: ProjectContextDefinition,
): ValidationError[] {
	const errors: ValidationError[] = [];

	const roles = scenario.roles;
	if (!roles || !Array.isArray(roles)) return errors;

	roles.forEach((role) => {
		if (!role.challenge) {
			errors.push({
				file,
				path: `roles.${role.id}`,
				message: `Role "${role.id}" has no challenge path`,
			});
		}
	});

	return errors;
}

export function validateContextRelations(
	file: string,
	context: ProjectContextDefinition,
): ValidationError[] {
	const errors: ValidationError[] = [];
	const layerMap = collectLayerMap(context);
	const layerIds = new Set(layerMap.keys());

	// 1. Z-Index Conflicts (only for layers from active scenarios or global)
	const zIndices = new Map<number, string>();
	const checkLayer = (id: string, def: any) => {
		if (def.z_index !== undefined) {
			if (zIndices.has(def.z_index)) {
				errors.push({
					file,
					path: `layers.${id}.z_index`,
					message: `Z-Index ${def.z_index} conflict with layer "${zIndices.get(def.z_index)}"`,
				});
			} else {
				zIndices.set(def.z_index, id);
			}
		}
	};

	if (context.global?.layers) {
		context.global.layers.forEach((def) => checkLayer(def.id, def));
	}

	(context.scenarios ?? []).forEach((scenario) => {
		if (scenario.active === false) return;
		if (scenario.layers) {
			scenario.layers.forEach((def) => checkLayer(def.id, def));
		}
		(scenario.roles ?? []).forEach((role) => {
			if (role.layers) {
				role.layers.forEach((def) => checkLayer(def.id, def));
			}
			for (const excludedId of role.exclude_layers ?? []) {
				if (!layerIds.has(excludedId)) {
					errors.push({
						file,
						path: `scenarios.${scenario.id}.roles.${role.id}.exclude_layers`,
						message: `exclude_layers references unknown layer "${excludedId}"`,
					});
				}
			}
		});
	});

	return errors;
}

export function validateLocationJson(
	file: string,
	data: any,
	layerDef?: any,
): ValidationError[] {
	const result = LocationJsonSchema.safeParse(data);
	const errors: ValidationError[] = result.success ? [] : zodErrors(file, result.error);

	if (Array.isArray(data)) {
		data.forEach((loc, idx) => {
			const path = `[${idx}]`;
			// 1. Status POI Icon Check
			if (loc.status && layerDef?.status_poi_icons) {
				if (!layerDef.status_poi_icons[loc.status]) {
					errors.push({
						file,
						path: `${path}.status`,
						message: `Status "${loc.status}" has no corresponding icon in layer definition`,
					});
				}
			}

			// 2. Status Translation Check
			if (loc.status && loc.status_translations) {
				if (!loc.status_translations[loc.status]) {
					errors.push({
						file,
						path: `${path}.status_translations`,
						message: `Current status "${loc.status}" is missing from status_translations`,
					});
				}
			}
		});
	}

	return errors;
}

export { collectLayerMap as collectLayerIds };
