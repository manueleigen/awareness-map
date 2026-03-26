import lottie from "lottie-web";
import { app } from "./state.js";
import { create, loadJSON, loadYAML, loadTEXT, el } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { t } from "./translater.js";
import { LayerConfig, ContextLayer, ProjectContext } from "./types.js";
import {
	buildSlider,
	updateThumbPosition,
	waitForPlayerReady,
} from "./time-slider.js";
import { renderPOILayer, hidePOIOverlay, previewPOILayer } from "./poi.js";
import { clearQuizAnswers } from "./quiz/ui.js";

/** Local cache for layer definitions and project context. */
export let layerDefinitions: LayerConfig[] = [];
export let context: ProjectContext | null = null;

/** Map to store created layer DOM elements for reuse. */
const layerElements = new Map<string, HTMLElement>();
/** Map to track in-flight builds to prevent duplicate DOM appends during race conditions. */
const buildingLayers = new Map<string, Promise<HTMLElement | null>>();
/** Map to store slider elements associated with layers. */
const sliderElements = new Map<string, HTMLElement>();
/** Tracks which POI layers have already received their initial preview. */
const layerPreviewDone = new Set<string>();

/** Global promise chain to serialize renderLayers calls. */
let lastRenderPromise: Promise<void> = Promise.resolve();

const EYE_VISIBLE = `<svg fill="currentColor" viewBox="0 0 121.025 121.025" xmlns="http://www.w3.org/2000/svg"><g><path d="M1.35,64.212c7.9,9.9,31.4,36.3,59.2,36.3c27.8,0,51.3-26.399,59.2-36.3c1.699-2.2,1.699-5.3,0-7.399c-7.9-9.9-31.4-36.3-59.2-36.3c-27.8-0.1-51.3,26.3-59.2,36.2C-0.45,58.913-0.45,62.012,1.35,64.212z M60.55,36.413c13.3,0,24,10.7,24,24s-10.7,24-24,24c-13.3,0-24-10.7-24-24S47.25,36.413,60.55,36.413z"/><circle cx="60.55" cy="60.413" r="12"/></g></svg>`;
const EYE_HIDDEN = `<svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M234.35254,160.8125a12.00024,12.00024,0,1,1-20.78516,12l-16.2771-28.19189a127.01451,127.01451,0,0,1-29.36694,13.47021l5.18994,29.43164a11.99973,11.99973,0,1,1-23.63476,4.168l-5.053-28.6543a140.4304,140.4304,0,0,1-32.94116-.01074l-5.05176,28.65234a11.99973,11.99973,0,0,1-23.63477-4.168l5.19165-29.44483A127.0154,127.0154,0,0,1,58.665,144.59326L42.28125,172.9707a12.00024,12.00024,0,0,1-20.78516-12l17.85523-30.92578A153.16947,153.16947,0,0,1,22.665,112.416,11.99959,11.99959,0,0,1,41.333,97.334C57.05859,116.79785,84.8584,140,128,140c43.14063,0,70.94043-23.20215,86.666-42.666a11.99959,11.99959,0,1,1,18.668,15.082,153.08978,153.08978,0,0,1-16.72509,17.66406Z"/></svg>`;

/**
 * Initializes the layer system with high performance in mind.
 */
export async function initLayers(): Promise<void> {
	try {
		const [layerData, ctxWrapper] = await Promise.all([
			loadYAML<{ layers: LayerConfig[] }>("/config/layers.yaml"),
			loadYAML<{ contexts: ProjectContext }>("/config/context.yaml"),
		]);

		layerDefinitions = layerData?.layers || [];
		context = ctxWrapper?.contexts || null;
		app.context = context;

		// 0. Perform initial visibility sync for global base state
		syncActiveLayers();

		// 1. Build immediately visible layers
		await buildInitialLayers();

		// 2. Perform initial visibility sync
		await renderLayers();
	} catch (error) {
		console.error("Failed to initialize layers:", error);
	}
}

async function buildInitialLayers(): Promise<void> {
	const available = getAvailableLayers();
	for (const config of available) {
		if (!layerElements.has(config.id)) {
			await ensureLayerBuilt(config.id);
		}
	}
}

export async function ensureLayerBuilt(
	id: string,
): Promise<HTMLElement | null> {
	// 1. Return immediately if already built and cached
	if (layerElements.has(id)) return layerElements.get(id)!;

	// 2. Return the existing promise if currently building (prevents duplicates)
	if (buildingLayers.has(id)) return buildingLayers.get(id)!;

	// 3. Start a new build process
	const buildPromise = (async () => {
		const config = layerDefinitions.find((d) => d.id === id);
		const ctxLayer = findAnyContextLayer(id);
		if (!config || !ctxLayer || !app.ui.layers) return null;

		const wrapper = create("div");
		wrapper.className = `layer ${config.class || ""} layer-${config.type}`;

		// Hide all inactive or deactivated Layer
		if (
			config.available_from !== "global" ||
			ctxLayer.initially_visible === false
		) {
			wrapper.classList.add("hidden");
		}

		if (config.interaction === "none") {
			wrapper.classList.add("no-interaction");
		}

		wrapper.id = `layer-${config.id}`;

		const src = ctxLayer?.src;
		if (src) {
			switch (config.type) {
			case "static-image":
				const img = create("img");
				img.src = src;
				img.onload = () =>
					console.log(`[Image] ${src.split("/").pop()} loaded`);
				img.onerror = () => {
					console.warn(`Image missing or broken: ${src}`);
					img.style.display = "none";
				};
				wrapper.append(img);
				break;
			case "pulsing-image": {
				const baseImg = create("img");
				baseImg.src = src;
				baseImg.onload = () =>
					console.log(`[Image] ${src.split("/").pop()} loaded`);
				baseImg.onerror = () => {
					console.warn(`Image missing or broken: ${src}`);
					baseImg.style.display = "none";
				};
				wrapper.append(baseImg);
				const overlaySrc = ctxLayer?.src_overlay;
				if (overlaySrc) {
					const overlayImg = create("img");
					overlayImg.src = overlaySrc;
					overlayImg.className = "pulsing-overlay";
					overlayImg.onload = () =>
						console.log(`[Image] ${overlaySrc.split("/").pop()} loaded`);
					overlayImg.onerror = () => {
						console.warn(`Image missing or broken: ${overlaySrc}`);
						overlayImg.style.display = "none";
					};
					wrapper.append(overlayImg);
				}
				break;
			}
				case "areas":
					const svg = await loadTEXT(src);
					if (svg) {
						const areaWrapper = create("div");
						areaWrapper.innerHTML = svg as string;
						wrapper.append(areaWrapper);
						areaWrapper.querySelectorAll("polygon, path").forEach((obj) => {
							const style = window.getComputedStyle(obj);
							if (style.fill !== "none" || obj.classList.contains("st0")) {
								obj.classList.add("interactive-area");
							}
						});
					}
					break;

				case "dynamic-image":
					const container = create("div");
					container.id = `player-${config.id}`;
					container.style.width = "100%";
					container.style.height = "100%";
					wrapper.append(container);
					(container as any)._lottieAnim = lottie.loadAnimation({
						container,
						renderer: "svg",
						loop: true,
						autoplay: true,
						path: src,
					});
					break;
				case "locations":
					const poiContainer = await renderPOILayer(src, ctxLayer);
					wrapper.append(poiContainer);
					break;
			}
		}

		const currentIndex = layerDefinitions.findIndex((d) => d.id === id);
		wrapper.style.zIndex = String(currentIndex + 1);

		let inserted = false;
		for (let i = currentIndex + 1; i < layerDefinitions.length; i++) {
			const nextEl = layerElements.get(layerDefinitions[i].id);
			if (nextEl && nextEl.parentElement === app.ui.layers) {
				app.ui.layers.insertBefore(wrapper, nextEl);
				inserted = true;
				break;
			}
		}
		if (!inserted) {
			app.ui.layers.append(wrapper);
		}

		layerElements.set(id, wrapper);
		buildingLayers.delete(id); // Clean up build tracker
		console.log(`[Layer] ${id} ready`);

		return wrapper;
	})();

	buildingLayers.set(id, buildPromise);
	return buildPromise;
}

export async function renderLayers(): Promise<void> {
	const currentRender = (async () => {
		await lastRenderPromise; // Wait for any previous render to finish

		const { layerControl, slidersContainer } = app.ui;
		if (!layerControl || !context) return;

		// Clear sidebar UI before rebuilding
		layerControl.innerHTML = "";
		if (slidersContainer) slidersContainer.innerHTML = "";

		const availableLayers = getAvailableLayers();

		for (const config of availableLayers) {
			const ctxLayer = getContextLayer(config.id);
			const layerEl = await ensureLayerBuilt(config.id);

			if (layerEl) {
				const isActive = app.activeLayers.has(config.id);
				layerEl.classList.toggle("hidden", !isActive);

				// z-index: ctxLayer.z_index wenn gesetzt, sonst Position aus layerDefinitions
				const layerIndex = layerDefinitions.findIndex(
					(d) => d.id === config.id,
				);
				const z =
					ctxLayer?.z_index !== undefined
						? ctxLayer.z_index
						: layerIndex >= 0
							? layerIndex + 1
							: 1;
				layerEl.style.zIndex = String(z);

				await buildControlUI(config, ctxLayer, layerEl, layerControl);
			}
		}

		// Ensure all elements NOT in the current availableLayers are hidden
		const availableIds = new Set(availableLayers.map((l) => l.id));
		layerElements.forEach((el, id) => {
			if (!availableIds.has(id)) el.classList.add("hidden");
		});
	})();

	lastRenderPromise = currentRender;
	return currentRender;
}

async function buildControlUI(
	config: LayerConfig,
	ctxLayer: ContextLayer | null,
	layerEl: HTMLElement,
	controlParent: HTMLElement,
): Promise<void> {
	if (config.toggle === "hidden") return;

	const isVisible = !layerEl.classList.contains("hidden");

	const toggle = create("div");
	toggle.className = `toggleSwitch ${isVisible ? "active" : ""}`;
	toggle.id = `toggle-${layerEl.id}`;

	toggle.style.order = `${100 - (ctxLayer?.toggle_order || 0)}`;

	const iconWrapper = create("div");
	iconWrapper.className = "toggle-icon";
	const iconSrc = ctxLayer?.icon || "/assets/icons/default_icon.svg";

	try {
		const svgText = await loadTEXT<string>(iconSrc);
		iconWrapper.innerHTML = svgText;
	} catch {
		iconWrapper.innerHTML = "";
	}

	const visibilityIndicator = create("span");
	visibilityIndicator.className = "visibility-indicator";
	visibilityIndicator.innerHTML = isVisible ? EYE_VISIBLE : EYE_HIDDEN;
	iconWrapper.append(visibilityIndicator);
	toggle.append(iconWrapper);

	const label = create("label");
	const translatedTitle = ctxLayer?.title?.[app.language];
	label.innerText =
		translatedTitle ||
		(config.title_key ? t(config.title_key, "Layer") : "Layer");
	toggle.append(label);

	controlParent.append(toggle);

	if (config.playback_control && app.ui.slidersContainer) {
		let sliderUI = sliderElements.get(config.id);
		if (!sliderUI) {
			sliderUI = buildSlider(config, ctxLayer);
			sliderElements.set(config.id, sliderUI);
		}
		sliderUI.classList.toggle("hidden", !isVisible);
		app.ui.slidersContainer.append(sliderUI);
	}

	if (config.toggle === "available") {
		addPointerClick(toggle, () => {
			const nowActive = layerEl.classList.contains("hidden");

			// Update active set
			if (nowActive) {
				app.activeLayers.add(config.id);
			} else {
				app.activeLayers.delete(config.id);
			}

			layerEl.classList.toggle("hidden", !nowActive);
			toggle.classList.toggle("active", nowActive);
			visibilityIndicator.innerHTML = nowActive ? EYE_VISIBLE : EYE_HIDDEN;

			const slider = sliderElements.get(config.id);
			if (slider) slider.classList.toggle("hidden", !nowActive);

			// Cancel any running preview when a location layer is hidden
			if (config.type === "locations" && !nowActive) {
				hidePOIOverlay();
			}
		});
	}
}

function syncActiveLayers(): void {
	if (!context) return;
	const process = (map: Record<string, ContextLayer>) => {
		Object.entries(map).forEach(([id, ctx]) => {
			const shouldActivate = ctx.initially_visible && !ctx.quiz_only;
			if (shouldActivate) {
				if (ctx.map_only && app.view !== "map") return;
				app.activeLayers.add(id);
			}
		});
	};
	if (context.global?.layers) process(context.global.layers);
	if (
		app.currentScenario &&
		app.view !== "home" &&
		context.scenarios?.[app.currentScenario]
	) {
		const scenario = context.scenarios[app.currentScenario];
		if (scenario.layers) process(scenario.layers);
		if (
			app.currentRole &&
			(app.view === "role-select" ||
				app.view === "map" ||
				app.view === "quiz") &&
			scenario.roles?.[app.currentRole]
		) {
			const role = scenario.roles[app.currentRole];
			if (role.layers) process(role.layers);
		}
	}
}

function getAvailableLayers(): LayerConfig[] {
	if (!context) return [];
	const availableIds = new Set<string>();
	const excludedIds = new Set<string>();

	const processLayers = (map: Record<string, ContextLayer>) => {
		Object.entries(map).forEach(([id, ctx]) => {
			// Include if: not quiz_only, OR activated by current quiz step, OR in the map-view (challenge intro)
			if (!ctx.quiz_only || app.quizStepLayers.has(id) || app.view === "map") {
				availableIds.add(id);
			}
		});
	};

	if (context.global?.layers) processLayers(context.global.layers);

	if (app.currentScenario && app.view !== "home") {
		const scenario = context.scenarios[app.currentScenario];
		if (scenario.layers) processLayers(scenario.layers);

		if (
			app.currentRole &&
			(app.view === "role-select" || app.view === "map" || app.view === "quiz")
		) {
			const role = scenario.roles[app.currentRole];
			if (role.layers) processLayers(role.layers);
			(role.exclude_layers || []).forEach((id) => excludedIds.add(id));
		}
	}

	// Also ensure any layer explicitly activated by the quiz is considered available,
	// even if it's not in the current role/scenario context (e.g. cross-context layers)
	app.quizStepLayers.forEach((id) => availableIds.add(id));

	return layerDefinitions.filter(
		(d) => availableIds.has(d.id) && !excludedIds.has(d.id),
	);
}

export function findAnyContextLayer(id: string): ContextLayer | null {
	if (!context) return null;
	if (context.global?.layers?.[id]) return context.global.layers[id];
	for (const sId in context.scenarios) {
		if (context.scenarios[sId].layers?.[id])
			return context.scenarios[sId].layers[id];
		for (const rId in context.scenarios[sId].roles) {
			if (context.scenarios[sId].roles[rId].layers?.[id])
				return context.scenarios[sId].roles[rId].layers[id];
		}
	}
	return null;
}

function getContextLayer(id: string): ContextLayer | null {
	if (!context) return null;
	if (app.currentScenario && app.currentRole) {
		const layer =
			context.scenarios[app.currentScenario].roles[app.currentRole]?.layers?.[
				id
			];
		if (layer) return layer;
	}
	if (app.currentScenario) {
		const layer = context.scenarios[app.currentScenario].layers?.[id];
		if (layer) return layer;
	}
	return context.global?.layers?.[id] || null;
}
/**
 * Triggers the 3-second POI preview for all currently active location layers
 * that haven't been previewed yet in this view cycle.
 * Must be called AFTER renderLayers() to avoid being cancelled by hidePOIOverlay().
 */
export function previewActivePOILayers(): void {
	const availableLayers = getAvailableLayers();
	for (const config of availableLayers) {
		if (config.type !== "locations") continue;
		const layerEl = layerElements.get(config.id);
		if (!layerEl || layerEl.classList.contains("hidden")) continue;
		if (!layerPreviewDone.has(config.id)) {
			layerPreviewDone.add(config.id);
			previewPOILayer(layerEl);
		}
	}
}

/**
 * Forcefully re-triggers the POI preview for a specific layer, ignoring layerPreviewDone.
 * Used by the quiz engine after setting quizPoiSelect to "1" so that
 * overlays are rebuilt with the active "Select" button.
 *
 * @param layerSelector CSS selector of the layer element, e.g. "#layer-emergency_calls"
 */
export function rePreviewPOILayer(layerSelector: string): void {
	const layerId = layerSelector.replace(/^#layer-/, "").trim();
	if (!layerId) return;
	const layerEl = layerElements.get(layerId);
	if (!layerEl || layerEl.classList.contains("hidden")) return;
	layerPreviewDone.add(layerId); // prevent double-trigger from previewActivePOILayers
	previewPOILayer(layerEl);
}

/** Resets all slider positions to the start and syncs the lottie frame via input event. */
export function resetSliders(): void {
	// Reset cached slider elements directly — they may not be in the DOM yet
	// (e.g. after navigating to home view where slidersContainer is empty).
	sliderElements.forEach((wrapper) => {
		const range = wrapper.querySelector<HTMLInputElement>(".range-slider");
		if (range) {
			range.value = "0";
			range.dispatchEvent(new Event("input"));
		}
	});
}

/**
 * Clears the layer cache, forcing a complete rebuild of all layer DOM elements
 * upon the next render. Useful for language changes or system resets.
 */
export function clearLayerCache(): void {
	layerElements.forEach((el) => el.remove());
	layerElements.clear();
	sliderElements.clear();
	layerPreviewDone.clear();
}

/**
 * Resets all layers to their initial state defined in context.yaml.
 */
/* Clears active selections and modifications.
 */
export async function resetLayers(): Promise<void> {
	console.log("[Layers] Resetting all layers to initial state...");

	// 1. Clear active layers set
	app.activeLayers.clear();
	app.quizStepLayers.clear();
	layerPreviewDone.clear();

	// 2. Hide all open overlays (Modals)
	hidePOIOverlay();

	// 3. Reset quiz-specific visual states (selection, pulse, markers)
	clearQuizAnswers();

	// 4. Clear other visual modifications in the DOM
	layerElements.forEach((wrapper) => {
		// Remove active states and quiz-related indicators from all children
		wrapper
			.querySelectorAll(".active, .quiz-answer, .quiz-pulse, .disabled")
			.forEach((el) => {
				el.classList.remove("active", "quiz-answer", "quiz-pulse", "disabled");
				(el as HTMLElement).style.pointerEvents = "";
			});
	});

	// 5. Remove crosshair markers added by location/solution steps
	document.querySelectorAll(".quiz-location-crosshair, .quiz-solution-crosshair").forEach((el) => el.remove());

	// 6. Reset POI-selection quiz mode
	document.documentElement.dataset.quizPoiSelect = "0";
	document.documentElement.dataset.quizPoiSelectTarget = "";

	// 7. Release any slider locks from fixed story points or role entry
	document.querySelectorAll<HTMLElement>('.slider-wrapper.slider-fixed').forEach((el) => {
		el.classList.remove('slider-fixed');
	});


	// 6. Re-sync with context (restores initially_visible layers)
	syncActiveLayers();

	// 7. Update the actual visibility and UI
	await renderLayers();
}
