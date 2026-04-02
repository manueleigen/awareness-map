import { loadYAML } from "./lib.js";
import {
	LayerConfig,
	PrototypeContextLayer,
	PrototypeLayerType,
	PrototypeLayerTypesFile,
} from "./types.js";
import { getPrototypeContext } from "./prototype-context.js";

let normalizedPrototypeLayers: LayerConfig[] | null = null;

function collectPrototypeLayers(context: ReturnType<typeof getPrototypeContext>): Array<[string, PrototypeContextLayer]> {
	const layers: Array<[string, PrototypeContextLayer]> = [];
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

function buildPrototypeLayerConfig(
	prototypeId: string,
	instance: PrototypeContextLayer,
	layerType: PrototypeLayerType,
): LayerConfig {
	return {
		id: prototypeId,
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

export async function initPrototypeLayers(): Promise<void> {
	normalizedPrototypeLayers = null;

	const prototypeContext = getPrototypeContext();
	if (!prototypeContext) return;

	try {
		const data = await loadYAML<PrototypeLayerTypesFile>("/config/layers.prototype.yaml");
		if (!data?.layer_types) return;

		normalizedPrototypeLayers = collectPrototypeLayers(prototypeContext)
			.map(([prototypeId, layer]) => {
			const typeConfig = data.layer_types[layer.layer_type];
			if (!typeConfig) return null;
			return buildPrototypeLayerConfig(prototypeId, layer, typeConfig);
		})
			.filter((layer): layer is LayerConfig => layer !== null);
	} catch {
		// Prototype layer config is optional during migration.
	}
}

export function getNormalizedPrototypeLayerDefinitions(): LayerConfig[] | null {
	return normalizedPrototypeLayers;
}
