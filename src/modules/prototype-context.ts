import { loadYAML } from "./lib.js";
import { ProjectContext, PrototypeContextLayer, PrototypeProjectContext } from "./types.js";

let prototypeContext: PrototypeProjectContext | null = null;
let normalizedPrototypeContext: ProjectContext | null = null;
const layerIdAliases = new Map<string, string>();

function cloneContext<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function listLegacyLayers(context: ProjectContext): Array<{ id: string; layer: any }> {
	const layers: Array<{ id: string; layer: any }> = [];

	if (context.global?.layers) {
		Object.entries(context.global.layers).forEach(([id, layer]) => {
			layers.push({ id, layer });
		});
	}

	Object.values(context.scenarios ?? {}).forEach((scenario) => {
		Object.entries(scenario.layers ?? {}).forEach(([id, layer]) => {
			layers.push({ id, layer });
		});
		Object.values(scenario.roles ?? {}).forEach((role) => {
			Object.entries(role.layers ?? {}).forEach(([id, layer]) => {
				layers.push({ id, layer });
			});
		});
	});

	return layers;
}

function resolveLegacyLayerId(
	prototypeId: string,
	prototypeLayer: PrototypeContextLayer,
	legacyContext: ProjectContext,
): string {
	const legacyLayers = listLegacyLayers(legacyContext);

	const sameId = legacyLayers.find(({ id }) => id === prototypeId);
	if (sameId) return sameId.id;

	const sameSource = legacyLayers.find(({ layer }) => {
		return (
			layer?.src === prototypeLayer.src &&
			(layer?.src_overlay ?? null) === (prototypeLayer.src_overlay ?? null)
		);
	});
	if (sameSource) return sameSource.id;

	return prototypeId;
}

function collectPrototypeLayers(context: PrototypeProjectContext): Array<[string, PrototypeContextLayer]> {
	const layers: Array<[string, PrototypeContextLayer]> = [];

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

function normalizeLayer(layer: PrototypeContextLayer) {
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

function normalizePrototypeContext(
	legacyContext: ProjectContext,
	prototype: PrototypeProjectContext,
): ProjectContext {
	const normalized = cloneContext(legacyContext);

	Object.entries(prototype.global?.layers ?? {}).forEach(([prototypeId, layer]) => {
		const legacyId = resolveLayerIdAlias(prototypeId);
		normalized.global.layers[legacyId] = normalizeLayer(layer);
	});

	Object.entries(prototype.scenarios ?? {}).forEach(([scenarioId, scenario]) => {
		const existingScenario = normalized.scenarios[scenarioId] ?? {
			layers: {},
			roles: {},
			inactive: scenario.inactive,
		};
		const nextScenario = {
			...existingScenario,
			layers: {} as Record<string, any>,
			roles: { ...existingScenario.roles },
			inactive: scenario.inactive ?? existingScenario.inactive,
		};

		Object.entries(scenario.layers ?? {}).forEach(([prototypeId, layer]) => {
			const legacyId = resolveLayerIdAlias(prototypeId);
			nextScenario.layers[legacyId] = normalizeLayer(layer);
		});

		Object.entries(scenario.roles ?? {}).forEach(([roleId, role]) => {
			const existingRole = nextScenario.roles[roleId] ?? {};
			nextScenario.roles[roleId] = {
				...existingRole,
				exclude_layers: (role.exclude_layers ?? []).map((id) =>
					resolveLayerIdAlias(id),
				),
				layers: {},
			};

			Object.entries(role.layers ?? {}).forEach(([prototypeId, layer]) => {
				const legacyId = resolveLayerIdAlias(prototypeId);
				nextScenario.roles[roleId].layers[legacyId] = normalizeLayer(layer);
			});
		});

		normalized.scenarios[scenarioId] = nextScenario;
	});

	return normalized;
}

export async function initPrototypeContext(
	legacyContext: ProjectContext,
): Promise<void> {
	layerIdAliases.clear();
	prototypeContext = null;
	normalizedPrototypeContext = null;

	try {
		const loaded = await loadYAML<PrototypeProjectContext>(
			"/config/context.prototype.yaml",
		);
		if (!loaded) return;

		prototypeContext = loaded;
		collectPrototypeLayers(loaded).forEach(([prototypeId, layer]) => {
			layerIdAliases.set(
				prototypeId,
				resolveLegacyLayerId(prototypeId, layer, legacyContext),
			);
		});
		normalizedPrototypeContext = normalizePrototypeContext(legacyContext, loaded);
	} catch {
		// Prototype config is optional during migration.
	}
}

export function getPrototypeContext(): PrototypeProjectContext | null {
	return prototypeContext;
}

export function getNormalizedPrototypeContext(): ProjectContext | null {
	return normalizedPrototypeContext;
}

export function resolveLayerIdAlias(id: string): string {
	return layerIdAliases.get(id) ?? id;
}

export function resolveLayerSelectorAlias(selector: string): string {
	if (!selector.startsWith("#layer-")) return selector;
	const layerId = selector.replace(/^#layer-/, "").trim();
	return `#layer-${resolveLayerIdAlias(layerId)}`;
}
