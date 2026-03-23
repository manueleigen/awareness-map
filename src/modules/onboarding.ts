import { app } from "./state.js";
import { sleep, loadJSON } from "./lib.js";
import { showPOIOverlay } from "./poi.js";

const POI_SIZE = 150;
const CRITICAL_SITES_JSON = "/assets/challenges/flood/critical_sites.json";

// Same order as in the JSON
const CRITICAL_SITES_ORDER = [
	"critical_site_1",
	"critical_site_2",
	"critical_site_3",
	"critical_site_6s",
	"critical_site_5",
	"critical_site_4",
];

const EYE_VISIBLE = `<svg fill="currentColor" viewBox="0 0 121.025 121.025" xmlns="http://www.w3.org/2000/svg"><g><path d="M1.35,64.212c7.9,9.9,31.4,36.3,59.2,36.3c27.8,0,51.3-26.399,59.2-36.3c1.699-2.2,1.699-5.3,0-7.399c-7.9-9.9-31.4-36.3-59.2-36.3c-27.8-0.1-51.3,26.3-59.2,36.2C-0.45,58.913-0.45,62.012,1.35,64.212z M60.55,36.413c13.3,0,24,10.7,24,24s-10.7,24-24,24c-13.3,0-24-10.7-24-24S47.25,36.413,60.55,36.413z"/><circle cx="60.55" cy="60.413" r="12"/></g></svg>`;
const EYE_HIDDEN = `<svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M234.35254,160.8125a12.00024,12.00024,0,1,1-20.78516,12l-16.2771-28.19189a127.01451,127.01451,0,0,1-29.36694,13.47021l5.18994,29.43164a11.99973,11.99973,0,1,1-23.63476,4.168l-5.053-28.6543a140.4304,140.4304,0,0,1-32.94116-.01074l-5.05176,28.65234a11.99973,11.99973,0,0,1-23.63477-4.168l5.19165-29.44483A127.0154,127.0154,0,0,1,58.665,144.59326L42.28125,172.9707a12.00024,12.00024,0,0,1-20.78516-12l17.85523-30.92578A153.16947,153.16947,0,0,1,22.665,112.416,11.99959,11.99959,0,0,1,41.333,97.334C57.05859,116.79785,84.8584,140,128,140c43.14063,0,70.94043-23.20215,86.666-42.666a11.99959,11.99959,0,1,1,18.668,15.082,153.08978,153.08978,0,0,1-16.72509,17.66406Z"/></svg>`;

/**
 * Animates the flood simulation slider from `from` to `to` over `durationMs`.
 */
async function animateSlider(
	from: number,
	to: number,
	durationMs: number,
): Promise<void> {
	const range = document.getElementById(
		"slider-flood_simulation",
	) as HTMLInputElement | null;
	if (!range) return;

	return new Promise<void>((resolve) => {
		const startTime = performance.now();

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / durationMs, 1);
			// ease-in-out cubic
			const eased =
				t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			const val = from + (to - from) * eased;
			range.value = String(val);
			range.dispatchEvent(new Event("input"));

			if (t < 1) {
				requestAnimationFrame(tick);
			} else {
				resolve();
			}
		};

		requestAnimationFrame(tick);
	});
}

/**
 * Programmatically shows or hides a layer and syncs the toggle UI.
 */
function setLayerVisible(layerId: string, visible: boolean): void {
	const layerEl = document.getElementById(`layer-${layerId}`);
	const toggleEl = document.getElementById(`toggle-layer-${layerId}`);
	const sliderEl = document.getElementById(`slider-wrapper-${layerId}`);

	if (!layerEl) return;

	layerEl.classList.toggle("hidden", !visible);

	if (visible) {
		app.activeLayers.add(layerId);
	} else {
		app.activeLayers.delete(layerId);
	}

		if (toggleEl) {
			toggleEl.classList.toggle("active", visible);
			const indicator = toggleEl.querySelector(".visibility-indicator");
		if (indicator) {
			indicator.innerHTML = visible ? EYE_VISIBLE : EYE_HIDDEN;
		}
	}

	if (sliderEl) {
		sliderEl.classList.toggle("hidden", !visible);
	}
}

function showHint(modifier: string, src: string): HTMLImageElement {
	const el = document.createElement("img") as HTMLImageElement;
	el.className = `onboarding-hint onboarding-hint--${modifier}`;
	el.src = src;
	document.body.appendChild(el);
	requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("visible")));
	return el;
}

async function hideHint(el: HTMLImageElement): Promise<void> {
	el.classList.remove("visible");
	await sleep(400);
	el.remove();
}

/**
 * Runs the layer-onboarding animation sequence for the flood scenario.
 * Blocks all user interaction for the duration.
 */
export async function runOnboarding(): Promise<void> {
	if (app.currentScenario !== "flood") return;

	// Full-screen transparent blocker: captures all pointer events
	const blocker = document.createElement("div");
	blocker.className = "onboarding-blocker";
	document.body.appendChild(blocker);

	let floodHint: HTMLImageElement | null = null;
	let layerHint: HTMLImageElement | null = null;

	try {
		await sleep(300);

		// ── 1. Flutsimulations-Slider: 0 → 100 → 0 ──────────────────────────
		floodHint = showHint("flood", "/assets/icons/ui/flood-info.svg");
		await animateSlider(0, 100, 1200);
		await sleep(50);
		await animateSlider(100, 0, 1000);
		await hideHint(floodHint);
		floodHint = null;
		await sleep(100);

		// ── 2. Bevölkerungsdichte: einblenden → ausblenden ──────────────────
		layerHint = showHint("layer", "/assets/icons/ui/layer-info.svg");
		await sleep(300);
		setLayerVisible("population_density", true);
		await sleep(1600);
		setLayerVisible("population_density", false);
		await sleep(600);

		// ── 3. Kritische Infrastruktur: einblenden ──────────────────────────
		setLayerVisible("critical_sites", true);
		await sleep(500);

		// ── 4. POI-Overlays der Krit. Infrastruktur aufklappen ──────────────
		const data = await loadJSON<{
			layer_id: string;
			locations: any[];
		}>(CRITICAL_SITES_JSON);

		const poiContainer = document.querySelector(
			"#layer-critical_sites .poi-container",
		) as HTMLDivElement | null;

		if (data?.locations && poiContainer) {
			// Alle Overlays der Reihe nach öffnen (350ms = poi-pop-in Dauer)
			for (const id of CRITICAL_SITES_ORDER) {
				const loc = data.locations.find((l) => l.id === id);
				const marker = document.getElementById(id) as HTMLDivElement | null;
				if (loc && marker) {
					await showPOIOverlay(poiContainer, loc, POI_SIZE, marker);
					await sleep(350);
				}
			}

			await sleep(600);

			// Alle Overlays in derselben Reihenfolge wieder schließen (350ms = poi-pop-out Dauer + Puffer)
			for (const id of CRITICAL_SITES_ORDER) {
				const overlay = poiContainer.querySelector<HTMLElement>(
					`.poi-overlay[data-marker-id="${id}"]`,
				);
				if (overlay) {
					overlay.classList.add("is-closing");
					await sleep(350);
					overlay.remove();
				}
			}
		}

		// ── 5. Kritische Infrastruktur wieder ausblenden ─────────────────────
		await sleep(300);
		setLayerVisible("critical_sites", false);
		await hideHint(layerHint);
		layerHint = null;
	} finally {
		floodHint?.remove();
		layerHint?.remove();
		blocker.remove();
	}
}
