import { loadYAML } from "./lib.js";
import {
	LayerConfig,
	ProjectContext,
	PrototypeContextLayer,
	PrototypeLayerType,
	PrototypeLayerTypesFile,
} from "./types.js";
import { getPrototypeContext, resolveLayerIdAlias } from "./prototype-context.js";

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
	legacy: LayerConfig | undefined,
): LayerConfig {
	const id = resolveLayerIdAlias(prototypeId);

	return {
		id,
		class: instance.class ?? legacy?.class ?? "",
		type: layerType.type,
		title_key: legacy?.title_key,
		description_key: legacy?.description_key,
		toggle: instance.toggle ?? legacy?.toggle ?? "hidden",
		available_from: instance.available_from ?? legacy?.available_from,
		interaction: layerType.interaction ?? legacy?.interaction ?? "none",
		opacity_control: instance.opacity_control ?? legacy?.opacity_control,
		playback_control: instance.playback_control ?? layerType.playback_control ?? legacy?.playback_control,
		start_time: instance.start_time ?? legacy?.start_time,
		end_time: instance.end_time ?? legacy?.end_time,
		icon_mode: layerType.icon_mode ?? legacy?.icon_mode,
	};
}

export async function initPrototypeLayers(
	legacyLayerDefinitions: LayerConfig[],
): Promise<void> {
	normalizedPrototypeLayers = null;

	const prototypeContext = getPrototypeContext();
	if (!prototypeContext) return;

	try {
		const data = await loadYAML<PrototypeLayerTypesFile>("/config/layers.prototype.yaml");
		if (!data?.layer_types) return;

		const legacyById = new Map(legacyLayerDefinitions.map((layer) => [layer.id, layer]));
		const nextById = new Map<string, LayerConfig>(
			legacyLayerDefinitions.map((layer) => [layer.id, { ...layer }]),
		);

		collectPrototypeLayers(prototypeContext).forEach(([prototypeId, layer]) => {
			const typeConfig = data.layer_types[layer.layer_type];
			if (!typeConfig) return;
			const legacyId = resolveLayerIdAlias(prototypeId);
			const legacy = legacyById.get(legacyId);
			nextById.set(
				legacyId,
				buildPrototypeLayerConfig(prototypeId, layer, typeConfig, legacy),
			);
		});

		normalizedPrototypeLayers = legacyLayerDefinitions.map(
			(layer) => nextById.get(layer.id) ?? layer,
		);
	} catch {
		// Prototype layer config is optional during migration.
	}
}

export function getNormalizedPrototypeLayerDefinitions(): LayerConfig[] | null {
	return normalizedPrototypeLayers;
}
