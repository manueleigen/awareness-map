import { loadYAML } from "./lib.js";
import { ProjectContext, PrototypeContextLayer, PrototypeProjectContext } from "./types.js";

let prototypeContext: PrototypeProjectContext | null = null;
let normalizedPrototypeContext: ProjectContext | null = null;

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

function normalizePrototypeContext(prototype: PrototypeProjectContext): ProjectContext {
	return {
		global: {
			layers: Object.fromEntries(
				Object.entries(prototype.global?.layers ?? {}).map(([id, layer]) => [
					id,
					normalizeLayer(layer),
				]),
			),
		},
		scenarios: Object.fromEntries(
			Object.entries(prototype.scenarios ?? {}).map(([scenarioId, scenario]) => [
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

export async function initPrototypeContext(): Promise<void> {
	prototypeContext = null;
	normalizedPrototypeContext = null;

	try {
		const loaded = await loadYAML<PrototypeProjectContext>(
			"/config/context.prototype.yaml",
		);
		if (!loaded) return;

		prototypeContext = loaded;
		normalizedPrototypeContext = normalizePrototypeContext(loaded);
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
