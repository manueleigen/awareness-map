import { loadYAML } from "./lib.js";
import { ContextLayerDefinition, ProjectContext, ProjectContextDefinition } from "./types.js";

let loadedContext: ProjectContextDefinition | null = null;
let normalizedContext: ProjectContext | null = null;

function normalizeLayer(layer: ContextLayerDefinition) {
	return {
		title: {
			de: layer.label?.de ?? "",
			en: layer.label?.en ?? "",
		},
		src: layer.src,
		src_overlay: layer.src_overlay,
		icon: layer.icon,
		slider_icon: layer.slider_icon,
		poi_icon: layer.poi_icon,
		initially_visible: layer.initially_visible,
		quiz_only: layer.quiz_only,
		map_only: layer.map_only,
		z_index: layer.z_index,
		toggle_order: layer.toggle_order,
	};
}

function normalizeContext(definition: ProjectContextDefinition): ProjectContext {
	return {
		global: {
			layers: Object.fromEntries(
				Object.entries(definition.global?.layers ?? {}).map(([id, layer]) => [
					id,
					normalizeLayer(layer),
				]),
			),
		},
		scenarios: Object.fromEntries(
			Object.entries(definition.scenarios ?? {}).map(([scenarioId, scenario]) => [
				scenarioId,
				{
					layers: Object.fromEntries(
						Object.entries(scenario.layers ?? {}).map(([id, layer]) => [
							id,
							normalizeLayer(layer),
						]),
					),
					roles: Object.fromEntries(
						Object.entries(scenario.roles ?? {}).map(([roleId, role]) => [
							roleId,
							{
								exclude_layers: role.exclude_layers ?? [],
								layers: Object.fromEntries(
									Object.entries(role.layers ?? {}).map(([id, layer]) => [
										id,
										normalizeLayer(layer),
									]),
								),
							},
						]),
					),
					inactive: scenario.inactive,
				},
			]),
		),
	};
}

export async function initContextLoader(): Promise<void> {
	loadedContext = null;
	normalizedContext = null;

	try {
		const loaded = await loadYAML<ProjectContextDefinition>(
			"/config/context.yaml",
		);
		if (!loaded) return;

		loadedContext = loaded;
		normalizedContext = normalizeContext(loaded);
	} catch {
		// Context config is optional during startup.
	}
}

export function getLoadedContext(): ProjectContextDefinition | null {
	return loadedContext;
}

export function getNormalizedContext(): ProjectContext | null {
	return normalizedContext;
}
