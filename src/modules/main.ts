import { initLayers, renderLayers, resetLayers, context } from "./layers.js";
import { initTranslator, t } from "./translater.js";
import { initScenarios, getQuizPath } from "./scenarios.js";
import { Language } from "./types.js";
import { app } from "./state.js";
import { el, create } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { startQuiz } from "./engine.js";
import { initDualScale } from "./screen-zoom.js";
import { startBackgroundPreload } from "./preloader.js";
import { updateView } from "./info-box.js";

/**
 * Technical Implementation Guide (v2.3): Viewport "Ironclad" Lockdown.
 * Prevents native browser behaviors from interfering with the custom 4K experience.
 */
function lockViewport(): void {
	// Disable right-click context menu
	document.addEventListener("contextmenu", (e) => e.preventDefault());

	// Disable mouse wheel zoom (Ctrl + Scroll)
	document.addEventListener(
		"wheel",
		(e) => {
			if (e.ctrlKey) e.preventDefault();
		},
		{ passive: false },
	);

	// Disable iOS Safari pinch-to-zoom gestures
	document.addEventListener("gesturestart", (e) => e.preventDefault());

	// Ensure user-select is disabled globally
	document.body.style.userSelect = "none";
}

/**
 * Environmental Stability: Stale Pointer Watchdog.
 * Public screens experience sensor drift. If a pointer stays active for > 60s
 * without movement, we force-release it.
 */
function initWatchdog(): void {
	const activePointers = new Map<
		number,
		{ lastMove: number; target: HTMLElement }
	>();

	document.addEventListener(
		"pointerdown",
		(e) => {
			activePointers.set(e.pointerId, {
				lastMove: Date.now(),
				target: e.target as HTMLElement,
			});
		},
		true,
	);

	document.addEventListener(
		"pointermove",
		(e) => {
			if (activePointers.has(e.pointerId)) {
				activePointers.get(e.pointerId)!.lastMove = Date.now();
			}
		},
		true,
	);

	const cleanup = (id: number) => activePointers.delete(id);
	document.addEventListener("pointerup", (e) => cleanup(e.pointerId), true);
	document.addEventListener("pointercancel", (e) => cleanup(e.pointerId), true);

	// Monitor stale pointers every 5 seconds
	setInterval(() => {
		const now = Date.now();
		activePointers.forEach((data, id) => {
			if (now - data.lastMove > 60000) {
				// 60 seconds
				console.warn(
					`[Watchdog] Releasing stale pointer ${id} from`,
					data.target,
				);
				if (
					data.target &&
					typeof data.target.releasePointerCapture === "function"
				) {
					try {
						data.target.releasePointerCapture(id);
					} catch (e) {}
				}
				activePointers.delete(id);
			}
		});
	}, 5000);
}

/**
 * Environmental Stability: Daily Refresh.
 * Perform a full reload every 24 hours at 4:00 AM to clear GPU memory and JS heap.
 */
function initDailyRefresh(): void {
	const checkTime = () => {
		const now = new Date();
		if (now.getHours() === 4 && now.getMinutes() === 0) {
			console.log("[System] Scheduled daily refresh (4:00 AM). Reloading...");
			window.location.reload();
		}
	};
	setInterval(checkTime, 60000); // Check every minute
}

/**
 * Caches DOM references into the global app state for easy access.
 */
export function initUIReferences(): void {
	app.ui.app = el("#app");
	app.ui.infoBox = el("#info-box");
	app.ui.infoBoxContent = el("#info-box-content");
	app.ui.infoBoxControls = el("#info-box-controls");
	app.ui.layerControl = el("#layer-control");
	app.ui.slidersContainer = el("#slider-container");
	app.ui.layers = el("#layers");
	app.ui.poiOverlayPortal = el("#poi-overlay-portal");
	app.ui.escapeBtn = el("#escape-btn");
	app.ui.languageSwitch = el<HTMLInputElement>("#language-switch input");
}

/**
 * Main application initialization sequence.
 */
export async function initApp() {
	try {
		console.log("Initializing application...");

		// Technical Implementation Guide (v2.3) initialization
		lockViewport();
		initWatchdog();
		initDailyRefresh();

		// 0. Cache UI References
		initUIReferences();

		// Global Event Listeners
		document.addEventListener("app-request-view-update", async () => {
			await updateView();
		});

		// 1. Initialize Translator (loads language files)
		await initTranslator(app.language as Language).catch((err) => {
			console.error("Failed to load translation files:", err);
		});

		// 2. Initialize Scenarios (loads scenario metadata)
		await initScenarios();

		// 3. Initialize Layers (loads layer configuration)
		await initLayers().catch((err) => {
			console.error("Failed to load layer configuration:", err);
		});

		// 4. Initialize dynamic scaling for 4K displays
		initDualScale();

		// 5. Perform initial render based on default state
		await updateView();

		// 6. Start background preloading of non-critical assets
		startBackgroundPreload();

		console.log("Application successfully initialized.");
	} catch (globalError) {
		console.error(
			"Critical error during application initialization:",
			globalError,
		);
		const appContainer = app.ui.app;
		if (appContainer) {
			appContainer.innerHTML = `<div style="color: white; padding: 20px;">
                <h2>System Error</h2>
                <p>The application could not be loaded correctly. Please check the configuration.</p>
            </div>`;
		}
	}
}
