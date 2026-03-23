import { app } from "./state.js";
import { create, loadJSON, loadTEXT } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { t } from "./translater.js";
import { ContextLayer } from "./types.js";
import { c } from "./dotlottie/decorate-C0oFmnNg.js";

/**
 * Renders a layer containing Point of Interest (POI) markers.
 * @param src Path to the JSON file containing location data.
 * @param ctxLayer Context configuration for this layer (icons, etc.).
 */
export async function renderPOILayer(
	src: string,
	ctxLayer: ContextLayer | null,
): Promise<HTMLElement> {
	const poiSize = 150;
	const poiContainer = create("div");
	poiContainer.className = "poi-container layer-locations"; // Added layer-locations class for CSS targeting

	const data = await loadJSON<{
		layer_id: string;
		locations: any[];
	}>(src);
	if (data && data.locations) {
		console.log(`[POI] ${src.split("/").pop()} loaded`);
		if (data.layer_id) poiContainer.dataset.layerId = data.layer_id;
		data.locations.forEach((loc, index) => {
			const marker = create("div");
			marker.className = "poi-marker";

			// Assign a stable ID for quiz interactions
			if (!marker.id) {
				const baseId =
					typeof loc.id === "string" && loc.id.trim().length > 0
						? loc.id
						: `poi-${index + 1}`;
				marker.id = baseId;
			}
			marker.dataset.quizId = marker.id;

			// Position the marker (centered on coordinate)
			marker.style.left = `${loc.x}px`;
			marker.style.top = `${loc.y - poiSize / 2 + 22}px`;

			marker.style.width = `${poiSize}px`;
			marker.style.height = `${poiSize}px`;

			// Inject SVG icon if configured
			if (ctxLayer?.poi_icon) {
				const iconWrapper = create("div");
				iconWrapper.className = "poi-icon";
				loadTEXT<string>(ctxLayer.poi_icon)
					.then((svgText) => {
						iconWrapper.innerHTML = svgText;
					})
					.catch(() => {});
				marker.append(iconWrapper);
			}

			// Technical Implementation Guide (v2.3): Centralized YAML-Driven Translations
			const layerId = data?.layer_id || "";
			const poiId = marker.id;

			marker.title = loc.translations?.title?.[app.language] || "";
			// Handle click to open detail overlay
			addPointerClick(marker, (e) => {
				e.stopPropagation(); // Prevent map click listeners from firing
				showPOIOverlay(poiContainer, loc, poiSize, marker);
			});

			poiContainer.append(marker);
		});
	}

	return poiContainer;
}

/**
 * Displays a detail overlay next to a specific POI marker.
 */
export async function showPOIOverlay(
	poiContainer: HTMLDivElement,
	loc: any,
	poiSize: number,
	marker: HTMLDivElement,
): Promise<void> {
	// Toggle: wenn diese Card bereits offen ist, schließen und abbrechen
	const existing = poiContainer.querySelector<HTMLElement>(
		`.poi-overlay[data-marker-id="${marker.id}"]`,
	);
	if (existing) {
		if (existing.classList.contains("is-closing")) {
			// Bereits am Schließen: sofort entfernen und neu öffnen
			existing.remove();
		} else {
			existing.classList.add("is-closing");
			existing.addEventListener("animationend", () => existing.remove(), { once: true });
			return;
		}
	}

	const poiOverlay = create("div");
	poiOverlay.className = "poi-overlay";
	poiOverlay.dataset.markerId = marker.id;
	if (loc.class) {
		poiOverlay.classList.add(loc.class);

		// Position overlay relative to the marker
	} else {
	}
	poiOverlay.style.left = `${loc.x - poiSize}px`;

	poiOverlay.style.top = `${loc.y - poiSize}px`;
	poiOverlay.style.borderRadius = `${poiSize / 2}px`;

	const content = create("div");
	content.className = "poi-overlay-content";

	// Prevent clicks inside the content from triggering the global "close" listener
	content.addEventListener("pointerup", (e) => {
		e.stopPropagation();
	});

	// Header section (Close Button + optional Title)
	const head = create("div");
	head.className = "poi-overlay-head";

	const nameText = loc.translations?.name?.[app.language];
	if (nameText) {
		const title = create("h3");
		title.innerText = nameText;
		head.append(title);
	}

	const closeBtn = create("button");
	closeBtn.className = "poi-close-btn";
	const closeBtnIcon = (await loadTEXT(
		"assets/icons/ui/esc-btn-icon.svg",
	)) as string;
	closeBtn.innerHTML = closeBtnIcon;

	addPointerClick(closeBtn, (e) => {
		e.stopPropagation();
		poiOverlay.classList.add("is-closing");
		poiOverlay.addEventListener("animationend", () => poiOverlay.remove(), { once: true });
	});

	head.append(closeBtn);
	content.append(head);

	// Body section (optional Status Text / Description)
	const statusText = loc.translations?.status?.[app.language];
	if (statusText) {
		const bodyText = create("p");
		bodyText.className = "status-text";
		bodyText.innerText = statusText;
		content.append(bodyText);
	}

	// Inject "Select" button depending on quiz state:
	// "1"        → active, only for the targeted layer
	// "inactive" → grayed out (is-inactive), for all layers
	const quizPoiSelectValue =
		document.documentElement.dataset.quizPoiSelect ?? "0";
	const quizPoiSelectTarget =
		(document.documentElement.dataset.quizPoiSelectTarget ?? "").trim();
	const layerId = poiContainer.dataset.layerId ?? "";
	const isInTargetLayer =
		!quizPoiSelectTarget ||
		quizPoiSelectTarget === `#layer-${layerId}`;
	const isActiveSelect = quizPoiSelectValue === "1" && isInTargetLayer;
	const isInactiveSelect = quizPoiSelectValue === "inactive" && isInTargetLayer;

	if (isActiveSelect || isInactiveSelect) {
		const selectBtn = create("button");
		selectBtn.className = "poi-select-btn";

		if (isInactiveSelect) {
			selectBtn.classList.add("is-inactive");
			selectBtn.innerText = t("challenges.common.select_poi", "Select");
		} else {
			const updateLabel = () => {
				const isSelected = marker.classList.contains("quiz-answer");
				selectBtn.innerText = isSelected
					? t("challenges.common.deselect_poi", "Deselect")
					: t("challenges.common.select_poi", "Select");
				selectBtn.classList.toggle("active", isSelected);
			};
			updateLabel();

			addPointerClick(selectBtn, (e) => {
				e.stopPropagation();
				marker.classList.toggle("quiz-answer");
				selectBtn.classList.toggle("active");
				const isSelected = marker.classList.contains("quiz-answer");
				document.dispatchEvent(
					new CustomEvent("quiz-answer-changed", {
						detail: { id: marker.id, isSelected },
					}),
				);
			});
		}

		content.append(selectBtn);
	}

	poiOverlay.append(content);
	poiContainer.append(poiOverlay);
}

/**
 * Removes all visible POI overlays from the DOM.
 */
export function hidePOIOverlay(): void {
	document.querySelectorAll<HTMLElement>(".poi-overlay").forEach((el) => {
		el.classList.add("is-closing");
		el.addEventListener("animationend", () => el.remove(), { once: true });
	});
	app.ui.poiOverlay = null;
}
