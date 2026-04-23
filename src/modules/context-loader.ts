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
		status_poi_icons: layer.status_poi_icons,
		initially_visible: layer.initially_visible,
		quiz_only: layer.quiz_only,
		map_only: layer.map_only,
		z_index: layer.z_index,
		toggle_order: layer.toggle_order,
	};
}

function normalizeContext(definition: ProjectContextDefinition): ProjectContext {
	const normalizeLayers = (layers: ContextLayerDefinition[] | undefined) =>
		Object.fromEntries((layers ?? []).map((layer) => [layer.id, normalizeLayer(layer)]));

	return {
		global: {
			layers: normalizeLayers(definition.global?.layers),
		},
		scenarios: Object.fromEntries(
			(definition.scenarios ?? []).map((scenario) => [
				scenario.id,
				{
					layers: normalizeLayers(scenario.layers),
					roles: Object.fromEntries(
						(scenario.roles ?? []).map((role) => [
							role.id,
							{
								exclude_layers: role.exclude_layers ?? [],
								layers: normalizeLayers(role.layers),
							},
						]),
					),
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
