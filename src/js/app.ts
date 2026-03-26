import { initApp } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { Language } from "../modules/types.js";
import { app } from "../modules/state.js";
import { addPointerClick } from "../modules/interactions.js";
import { clearLayerCache, resetLayers } from "../modules/layers.js";
import { hidePOIOverlay } from "../modules/poi.js";
import { resetApp, updateView } from "../modules/info-box.js";

/**
 * List of CSS selectors for elements that should remain interactive.
 * All other areas will have events blocked to prevent accidental input.
 * Technical Implementation Guide (v2.3): The "Void" (Dead Zones).
 */
const INTERACTIVE_SELECTORS = [
	"button",
	"input",
	"label",
	"a",
	".switch",
	"#language-switch-touch-area",
	"#escape-btn",
	".poi-marker",
	".poi-overlay-content",
	".poi-close-btn",
	".toggleSwitch",
	".slider-wrapper",
	".slider-container",
	".range-slider",
	".slider-thumb-icon",
	"polygon",
	"path",
	".interactive-area",
	"#layers",
	'[id^="layer-"]',
].join(",");

/**
 * Technical Implementation Guide (v2.3): Interaction Protection: The "Void".
 * Blocks pointer events on non-interactive areas.
 */
function setupPointerGuard(): void {
	const block = (e: PointerEvent) => {
		const target = e.target as Element;
		if (target && !target.closest(INTERACTIVE_SELECTORS)) {
			// Check if we are in the capture phase to block it early
			e.stopPropagation();
		}
	};

	// Using capture phase to protect logic from accidental leaning
	// We only block down/up to prevent accidental clicks.
	// Move is allowed to pass through for global watchdog tracking.
	document.addEventListener("pointerdown", block, true);
	document.addEventListener("pointerup", block, true);
}

/**
 * Initializes global UI listeners like the language switch and escape button.
 * Standardized on Pointer API using addPointerClick booster.
 */
function setupGlobalListeners(): void {
	const { languageSwitch, escapeBtn } = app.ui;
	// Handle language toggle (DE/EN)
	if (languageSwitch) {
		languageSwitch.checked = app.language === "de";
		languageSwitch.addEventListener("change", async () => {
			try {
				const nextLang: Language = languageSwitch.checked ? "de" : "en";
				await setLanguage(nextLang);

				// Remove Translated POIOverlay
				hidePOIOverlay();

				await updateView();
			} catch (err) {
				console.error("Error during language switch:", err);
			}
		});

		// Handle the language toggle area click
		const languageClickArea = document.querySelector(
			"#language-switch-touch-area",
		);

		if (languageClickArea) {
			addPointerClick(languageClickArea as HTMLElement, () => {
				languageSwitch.checked = !languageSwitch.checked;
				languageSwitch.dispatchEvent(new Event("change"));
			});
		}
	}

	// Reset the application to the home screen
	if (escapeBtn) {
		addPointerClick(escapeBtn as HTMLElement, () => {
			resetApp();
		});
	}
}

/**
 * Main Entry Point: Initialize the application modules and setup global listeners.
 */
initApp().then(() => {
	setupPointerGuard();
	setupGlobalListeners();
});
