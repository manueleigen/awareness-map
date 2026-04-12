import { loadYAML } from "./lib.js";
import {
	ContextLayerDefinition,
	LayerConfig,
	LayerTypeDefinition,
	LayerTypesFile,
} from "./types.js";
import { getLoadedContext } from "./context-loader.js";

let normalizedLayerDefinitions: LayerConfig[] | null = null;

function collectContextLayers(context: ReturnType<typeof getLoadedContext>): Array<[string, ContextLayerDefinition]> {
	const layers: Array<[string, ContextLayerDefinition]> = [];
	if (!context) return layers;

	Object.entries(context.global?.layers ?? {}).forEach(([id, layer]) => {
		layers.push([id, layer]);
	});

	Object.values(context.scenarios ?? {}).forEach((scenario) => {
		Object.entries(scenario.layers ?? {}).forEach(([id, layer]) => {
			layers.push([id, layer]);
		});
		Object.values(scenario.roles ?? {}).forEach((role) => {
			Object.entries(role.layers ?? {}).forEach(([id, layer]) => {
				layers.push([id, layer]);
			});
		});
	});

	return layers;
}

function buildLayerConfig(
	layerId: string,
	instance: ContextLayerDefinition,
	layerType: LayerTypeDefinition,
): LayerConfig {
	return {
		id: layerId,
		class: instance.class ?? "",
		type: layerType.type,
		toggle: instance.toggle ?? "hidden",
		available_from: instance.available_from,
		interaction: layerType.interaction ?? "none",
		opacity_control: instance.opacity_control,
		playback_control: instance.playback_control ?? layerType.playback_control,
		start_time: instance.start_time,
		end_time: instance.end_time,
		icon_mode: layerType.icon_mode,
	};
}

export async function initLayerLoader(): Promise<void> {
	normalizedLayerDefinitions = null;

	const loadedContext = getLoadedContext();
	if (!loadedContext) return;

	try {
		const data = await loadYAML<LayerTypesFile>("/config/layers.yaml");
		if (!data?.layer_types) return;

		normalizedLayerDefinitions = collectContextLayers(loadedContext)
			.map(([layerId, layer]) => {
			const typeConfig = data.layer_types[layer.layer_type];
			if (!typeConfig) return null;
			return buildLayerConfig(layerId, layer, typeConfig);
		})
			.filter((layer): layer is LayerConfig => layer !== null);
	} catch {
		// Layer config is optional during startup.
	}
}

export function getNormalizedLayerDefinitions(): LayerConfig[] | null {
	return normalizedLayerDefinitions;
}
