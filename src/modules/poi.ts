import { app } from "./state.js";
import { create, loadJSON, loadTEXT } from "./lib.js";
import { addPointerClick } from "./interactions.js";
import { renderBlockText, renderInlineText } from "./rich-text.js";
import { t } from "./translater.js";
import { ContextLayer } from "./types.js";

// Per-marker location data and poiSize per container — used by previewPOILayer
const markerLocMap = new WeakMap<HTMLDivElement, any>();
const containerPoiSizeMap = new WeakMap<HTMLDivElement, number>();

function parseTimeH(t: string): number {
	const [h, m] = t.split(":").map(Number);
	return h + (m || 0) / 60;
}

function updateOverlayText(
	overlay: HTMLElement,
	loc: any,
	status: string,
): void {
	const lang = app.language;
	const statusTrans = status ? loc.status_translations?.[status] : undefined;

	const titleEl = overlay.querySelector<HTMLElement>(".poi-overlay-head h3");
	const titleText =
		statusTrans?.title?.[lang] ?? loc.translations?.title?.[lang];
	if (titleEl && titleText) {
		titleEl.innerHTML = "";
		renderInlineText(titleEl, titleText);
	}

	const descEl = overlay.querySelector<HTMLElement>(".poi-description");
	const descText =
		statusTrans?.description?.[lang] ?? loc.translations?.description?.[lang];
	if (descEl && descText) {
		descEl.innerHTML = "";
		renderBlockText(descEl, descText);
	}
}

function applyMarkerStatus(
	marker: HTMLElement,
	status: string,
	statusPOIIcons: Record<string, string>,
	defaultIcon: string,
	loc?: any,
): void {
	if (marker.dataset.currentStatus === status) return;
	marker.dataset.currentStatus = status;
	Array.from(marker.classList)
		.filter((c) => c.startsWith("poi-status--"))
		.forEach((c) => marker.classList.remove(c));
	if (status) marker.classList.add(`poi-status--${status}`);
	const iconWrapper = marker.querySelector<HTMLElement>(".poi-icon");
	if (iconWrapper) {
		const iconSrc = (status && statusPOIIcons[status]) || defaultIcon;
		if (iconSrc)
			loadTEXT<string>(iconSrc)
				.then((s) => {
					iconWrapper.innerHTML = s;
				})
				.catch(() => {});
	}
	if (loc) {
		const openOverlay = document.querySelector<HTMLElement>(
			`.poi-overlay[data-marker-id="${marker.id}"]`,
		);
		if (openOverlay) updateOverlayText(openOverlay, loc, status);
	}
}

function updateMarkersForTime(
	container: HTMLElement,
	timeStr: string,
	statusPOIIcons: Record<string, string>,
	defaultIcon: string,
): void {
	const currentH = parseTimeH(timeStr);
	container.querySelectorAll<HTMLElement>(".poi-marker").forEach((marker) => {
		const raw = marker.dataset.statusTimeline;
		if (!raw) return;
		const timeline: Array<{ time: string; status: string }> = JSON.parse(raw);
		let status = marker.dataset.initialStatus || "";
		for (const entry of timeline) {
			if (parseTimeH(entry.time) <= currentH) status = entry.status;
		}
		const loc = markerLocMap.get(marker as HTMLDivElement);
		applyMarkerStatus(marker, status, statusPOIIcons, defaultIcon, loc);
	});
}

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
	runtimeLayerId?: string,
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
		const effectiveLayerId = runtimeLayerId || data.layer_id;
		if (effectiveLayerId) poiContainer.dataset.layerId = effectiveLayerId;
		containerPoiSizeMap.set(poiContainer, poiSize);

		const statusPOIIcons: Record<string, string> =
			ctxLayer?.status_poi_icons || {};
		const defaultIcon = ctxLayer?.poi_icon || "";
		let hasTimeline = false;

		data.locations.forEach((loc, index) => {
			const marker = create("div");
			marker.className = "poi-marker";
			if (effectiveLayerId) {
				marker.classList.add(`poi-marker--${effectiveLayerId}`);
			}

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

			// Initial status (optional)
			const initialStatus: string = loc.status || "";
			if (initialStatus) marker.classList.add(`poi-status--${initialStatus}`);
			marker.dataset.currentStatus = initialStatus;

			// Status timeline (optional)
			if (
				Array.isArray(loc.status_timeline) &&
				loc.status_timeline.length > 0
			) {
				marker.dataset.statusTimeline = JSON.stringify(loc.status_timeline);
				marker.dataset.initialStatus = initialStatus;
				hasTimeline = true;
			}

			// Inject SVG icon — use status-specific icon if available, else default
			const initialIconSrc =
				(initialStatus && statusPOIIcons[initialStatus]) || defaultIcon;
			if (initialIconSrc) {
				const iconWrapper = create("div");
				iconWrapper.className = "poi-icon";
				const iconClass =
					initialIconSrc
						.split("/")
						.pop()
						?.replace(/\.svg$/i, "")
						.replace(/_/g, "-") || "";
				if (iconClass) {
					iconWrapper.classList.add(iconClass);
					marker.dataset.poiIconClass = iconClass;
				}
				loadTEXT<string>(initialIconSrc)
					.then((s) => {
						iconWrapper.innerHTML = s;
					})
					.catch(() => {});
				marker.append(iconWrapper);
			}

			// Store loc data for use by previewPOILayer
			markerLocMap.set(marker, loc);

			// Handle click to open detail overlay — only if translations are available
			const hasTranslations =
				(!!loc.translations && Object.keys(loc.translations).length > 0) ||
				(!!loc.status_translations &&
					Object.keys(loc.status_translations).length > 0);
			if (hasTranslations) {
				addPointerClick(marker, (e) => {
					e.stopPropagation();
					showPOIOverlay(poiContainer, loc, poiSize, marker);
				});
			} else {
				marker.classList.add("no-overlay");
				addPointerClick(marker, (e) => {
					e.stopPropagation();
					const quizPoiSelectTarget = (
						document.documentElement.dataset.quizPoiSelectTarget ?? ""
					).trim();
					const layerId = poiContainer.dataset.layerId ?? "";
					const isInTargetLayer =
						!quizPoiSelectTarget || quizPoiSelectTarget === `#layer-${layerId}`;
					if (
						document.documentElement.dataset.quizPoiSelect !== "1" ||
						!isInTargetLayer
					)
						return;
					marker.classList.toggle("quiz-answer");
					document.dispatchEvent(
						new CustomEvent("quiz-answer-changed", {
							detail: {
								id: marker.id,
								isSelected: marker.classList.contains("quiz-answer"),
							},
						}),
					);
				});
			}

			poiContainer.append(marker);
		});

		// Register time listener only when at least one marker has a timeline
		if (hasTimeline) {
			const onSliderTime = (e: Event) => {
				if (!poiContainer.isConnected) {
					document.removeEventListener("slidertime", onSliderTime);
					return;
				}
				updateMarkersForTime(
					poiContainer,
					(e as CustomEvent<{ time: string }>).detail.time,
					statusPOIIcons,
					defaultIcon,
				);
			};
			document.addEventListener("slidertime", onSliderTime);
		}
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
	// Toggle: If an overlay for this marker is already open, close it and return.
	const existingOverlay = document.querySelector(
		`.poi-overlay[data-marker-id="${marker.id}"]`,
	) as HTMLElement;
	if (existingOverlay) {
		if (!skipSingleMode) {
			closeOverlayWithAnimation(existingOverlay);
		}
		return;
	}

	if (!skipSingleMode) {
		// Cancel any running preview timer — user is interacting manually
		if (previewTimeout !== null) {
			clearTimeout(previewTimeout);
			previewTimeout = null;
		}
		// Target layer (point-selection-quiz): fully independent — never close its overlays,
		// and opening one there never closes anything else.
		// Non-target layers: single-overlay among themselves, but never touch target-layer overlays.
		const quizTarget = (
			document.documentElement.dataset.quizPoiSelectTarget ?? ""
		).trim();
		const thisLayerId = poiContainer.dataset.layerId ?? "";
		const isSelectionTarget =
			document.documentElement.dataset.quizPoiSelect === "1" &&
			(!quizTarget || quizTarget === `#layer-${thisLayerId}`);
		if (!isSelectionTarget) {
			const excludeLayerId = quizTarget
				? quizTarget.replace(/^#layer-/, "")
				: "";
			closeNonTargetOverlaysNow(excludeLayerId);
		}
	}

	const poiOverlay = create("div");
	poiOverlay.className = "poi-overlay";
	poiOverlay.dataset.markerId = marker.id;
	const iconClass = marker.dataset.poiIconClass;
	if (iconClass) poiOverlay.classList.add(iconClass);
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

	const currentStatus = marker.dataset.currentStatus || "";
	const statusTrans = currentStatus
		? loc.status_translations?.[currentStatus]
		: undefined;

	const titleText =
		statusTrans?.title?.[app.language] ??
		loc.translations?.title?.[app.language];
	if (titleText) {
		const title = create("h3");
		renderInlineText(title, titleText);
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
	const descriptionText =
		statusTrans?.description?.[app.language] ??
		loc.translations?.description?.[app.language];
	if (descriptionText) {
		const bodyText = create("div");
		bodyText.className = "poi-description";
		renderBlockText(bodyText, descriptionText);
		content.append(bodyText);
	}

	// Show "Select" button only during the active POI-selection quiz step
	// and only for the targeted layer.
	const quizPoiSelectTarget = (
		document.documentElement.dataset.quizPoiSelectTarget ?? ""
	).trim();
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
				? t("challenges.common.deselect_poi")
				: t("challenges.common.select_poi");
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
export async function previewPOILayer(
	layerEl: HTMLElement,
	duration = 3000,
): Promise<void> {
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
			if (
				loc &&
				((!!loc.translations && Object.keys(loc.translations).length > 0) ||
					(!!loc.status_translations &&
						Object.keys(loc.status_translations).length > 0))
			)
				return showPOIOverlay(poiContainer, loc, poiSize, marker, true);
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
	}, duration);
}

/** Closes a single overlay with the pop-out animation. */
function closeOverlayWithAnimation(overlay: HTMLElement): void {
	if (overlay.classList.contains("is-closing")) return;
	overlay.classList.add("is-closing");
	// Resume pulse on the linked marker once the overlay is gone
	const markerId = overlay.dataset.markerId;
	overlay.addEventListener(
		"animationend",
		() => {
			overlay.remove();
			if (markerId)
				document.getElementById(markerId)?.classList.remove("overlay-open");
		},
		{ once: true },
	);
	if (app.ui.poiOverlay === overlay) app.ui.poiOverlay = null;
}

/** Immediately removes all open overlays without animation, optionally skipping one layer. */
function closeNonTargetOverlaysNow(excludeLayerId: string): void {
	document.querySelectorAll<HTMLElement>(".poi-overlay").forEach((el) => {
		if (
			excludeLayerId &&
			el.classList.contains(`poi-overlay--${excludeLayerId}`)
		)
			return;
		const markerId = el.dataset.markerId;
		if (markerId)
			document.getElementById(markerId)?.classList.remove("overlay-open");
		el.remove();
	});
	app.ui.poiOverlay = null;
}

/** Immediately removes all open overlays without animation. */
function closeAllOverlaysNow(): void {
	document.querySelectorAll<HTMLElement>(".poi-overlay").forEach((el) => {
		const markerId = el.dataset.markerId;
		if (markerId)
			document.getElementById(markerId)?.classList.remove("overlay-open");
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
