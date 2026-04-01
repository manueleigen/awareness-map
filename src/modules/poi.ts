import { app } from "./state.js";
import { create, loadJSON, loadTEXT } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { renderBlockText, renderInlineText } from "./rich-text.js";
import { t } from "./translater.js";
import { ContextLayer } from "./types.js";

// Per-marker location data and poiSize per container — used by previewPOILayer
const markerLocMap = new WeakMap<HTMLDivElement, any>();
const containerPoiSizeMap = new WeakMap<HTMLDivElement, number>();

// Timer for the 3-second auto-close after layer preview
let previewTimeout: ReturnType<typeof setTimeout> | null = null;
// Incremented on every hidePOIOverlay() call — in-flight previews check this to self-cancel
let previewGeneration = 0;

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
	poiContainer.className = "poi-container layer-locations";

	const data = await loadJSON<{
		layer_id: string;
		locations: any[];
	}>(src);
	if (data && data.locations) {
		console.log(`[POI] ${src.split("/").pop()} loaded`);
		if (data.layer_id) poiContainer.dataset.layerId = data.layer_id;
		containerPoiSizeMap.set(poiContainer, poiSize);

		data.locations.forEach((loc, index) => {
			const marker = create("div");
			marker.className = "poi-marker";
			if (data.layer_id) marker.classList.add(`poi-marker--${data.layer_id}`);

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

			marker.title = loc.translations?.title?.[app.language] || "";

			// Store loc data for use by previewPOILayer
			markerLocMap.set(marker, loc);

			// Handle click to open detail overlay
			addPointerClick(marker, (e) => {
				e.stopPropagation();
				showPOIOverlay(poiContainer, loc, poiSize, marker);
			});

			poiContainer.append(marker);
		});
	}

	return poiContainer;
}

/**
 * Displays a detail overlay next to a specific POI marker.
 * @param skipSingleMode When true, existing overlays are NOT closed first (used during layer preview).
 */
export async function showPOIOverlay(
	poiContainer: HTMLDivElement,
	loc: any,
	poiSize: number,
	marker: HTMLDivElement,
	skipSingleMode = false,
): Promise<void> {
	if (!skipSingleMode) {
		// Cancel any running preview timer — user is interacting manually
		if (previewTimeout !== null) {
			clearTimeout(previewTimeout);
			previewTimeout = null;
		}
		// Single-at-a-time: close all currently open overlays immediately
		closeAllOverlaysNow();
	}

	const poiOverlay = create("div");
	poiOverlay.className = "poi-overlay";
	poiOverlay.dataset.markerId = marker.id;
	if (loc.class) poiOverlay.classList.add(loc.class);

	poiOverlay.style.left = `${loc.x - poiSize}px`;
	poiOverlay.style.top = `${loc.y - poiSize}px`;
	poiOverlay.style.borderRadius = `${poiSize / 2}px`;

	const content = create("div");
	content.className = "poi-overlay-content";
	content.addEventListener("pointerup", (e) => e.stopPropagation());

	// Header section (Close Button + optional Title)
	const head = create("div");
	head.className = "poi-overlay-head";

	const nameText = loc.translations?.name?.[app.language];
	if (nameText) {
		const title = create("h3");
		renderInlineText(title, nameText);
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
		// Während Preview (Timer läuft): alle Cards sofort schließen
		if (previewTimeout !== null) {
			hidePOIOverlay();
		} else {
			closeOverlayWithAnimation(poiOverlay);
		}
	});

	// If the location has an image, add it above the content and move the
	// close button onto the overlay directly so it floats over the image.
	if (loc.image) {
		poiOverlay.classList.add("has-image");
		const imageEl = create("div");
		imageEl.className = "poi-overlay-image";
		const img = document.createElement("img") as HTMLImageElement;
		img.src = loc.image;
		img.alt = "";
		imageEl.append(img);
		poiOverlay.append(imageEl);
		poiOverlay.append(closeBtn); // floats over image
	} else {
		head.append(closeBtn);
	}
	content.append(head);

	// Body section (optional Status Text / Description)
	const statusText = loc.translations?.status?.[app.language];
	if (statusText) {
		const bodyText = create("div");
		bodyText.className = "status-text";
		renderBlockText(bodyText, statusText);
		content.append(bodyText);
	}

	// Show "Select" button only during the active POI-selection quiz step
	// and only for the targeted layer.
	const quizPoiSelectTarget =
		(document.documentElement.dataset.quizPoiSelectTarget ?? "").trim();
	const layerId = poiContainer.dataset.layerId ?? "";
	if (layerId) poiOverlay.classList.add(`poi-overlay--${layerId}`);
	const isInTargetLayer =
		!quizPoiSelectTarget || quizPoiSelectTarget === `#layer-${layerId}`;
	const isActiveSelect =
		document.documentElement.dataset.quizPoiSelect === "1" && isInTargetLayer;

	if (isActiveSelect) {
		const selectBtn = create("button");
		selectBtn.className = "poi-select-btn";

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
			closeOverlayWithAnimation(poiOverlay);
		});

		content.append(selectBtn);
	}

	poiOverlay.append(content);
	// Append to the portal so the overlay renders above all layer stacking contexts
	(app.ui.poiOverlayPortal ?? poiContainer).append(poiOverlay);

	// Pause quiz pulse on this marker while its overlay is open
	marker.classList.add("overlay-open");

	// Track as the active overlay only in single mode
	if (!skipSingleMode) {
		app.ui.poiOverlay = poiOverlay;
	}
}

/**
 * Opens all POI overlays of a layer simultaneously as a brief 3-second preview.
 * Called automatically whenever a POI layer becomes visible.
 */
export async function previewPOILayer(layerEl: HTMLElement): Promise<void> {
	const poiContainer = layerEl.querySelector<HTMLDivElement>(".poi-container");
	if (!poiContainer) return;

	const poiSize = containerPoiSizeMap.get(poiContainer);
	if (poiSize === undefined) return;

	// Cancel any previous preview and claim a new generation token
	if (previewTimeout !== null) {
		clearTimeout(previewTimeout);
		previewTimeout = null;
	}
	const myGeneration = ++previewGeneration;
	closeAllOverlaysNow();

	// Open all markers simultaneously (skip single-at-a-time)
	const markers = Array.from(
		poiContainer.querySelectorAll<HTMLDivElement>(".poi-marker"),
	);
	await Promise.all(
		markers.map((marker) => {
			if (previewGeneration !== myGeneration) return Promise.resolve();
			const loc = markerLocMap.get(marker);
			if (loc) return showPOIOverlay(poiContainer, loc, poiSize, marker, true);
			return Promise.resolve();
		}),
	);

	// Abort if hidePOIOverlay() was called while we were awaiting
	if (previewGeneration !== myGeneration) return;

	// Auto-close with animation after 3 seconds
	previewTimeout = setTimeout(() => {
		document
			.querySelectorAll<HTMLElement>(".poi-overlay")
			.forEach((el) => closeOverlayWithAnimation(el));
		app.ui.poiOverlay = null;
		previewTimeout = null;
	}, 3000);
}

/** Closes a single overlay with the pop-out animation. */
function closeOverlayWithAnimation(overlay: HTMLElement): void {
	if (overlay.classList.contains("is-closing")) return;
	overlay.classList.add("is-closing");
	// Resume pulse on the linked marker once the overlay is gone
	const markerId = overlay.dataset.markerId;
	overlay.addEventListener("animationend", () => {
		overlay.remove();
		if (markerId) document.getElementById(markerId)?.classList.remove("overlay-open");
	}, { once: true });
	if (app.ui.poiOverlay === overlay) app.ui.poiOverlay = null;
}

/** Immediately removes all open overlays without animation. */
function closeAllOverlaysNow(): void {
	document.querySelectorAll<HTMLElement>(".poi-overlay").forEach((el) => {
		const markerId = el.dataset.markerId;
		if (markerId) document.getElementById(markerId)?.classList.remove("overlay-open");
		el.remove();
	});
	app.ui.poiOverlay = null;
}

/**
 * Removes all visible POI overlays from the DOM and cancels any preview timer.
 * Used during view transitions and layer resets.
 */
export function hidePOIOverlay(): void {
	previewGeneration++; // invalidates any in-flight previewPOILayer call
	if (previewTimeout !== null) {
		clearTimeout(previewTimeout);
		previewTimeout = null;
	}
	closeAllOverlaysNow();
}
