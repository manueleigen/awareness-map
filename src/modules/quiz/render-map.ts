import { create, loadTEXT } from "../lib.js";
import { addDelayedPointerClick, addPointerClick } from "../interactions.js";
import { t } from "../translater.js";
import { renderBlockText, renderInlineText } from "../rich-text.js";
import {
	LocationStoryPoint,
	SelectionStoryPoint,
	QuizOutcome,
} from "./types.js";
import { clearQuizAnswers } from "./ui.js";
import { getAppScale } from "../screen-zoom.js";
import { getLastLocationResult } from "./engine-core.js";
import {
	getLocationSubmitLabel,
	getStoryPointQuestion,
	getStoryPointTitle,
} from "./challenge-normalizer.js";
import { updatePoiSelectLabel } from "../poi.js";

// ── Drone speed ───────────────────────────────────────────────────────────────
// Adjust this value to change how fast the drone flies (native pixels / second).
const DRONE_SPEED_PX_PER_SEC = 350;
const DRONE_MIN_DURATION_MS = 600; // minimum travel time for very short moves

// ── Drag interaction ──────────────────────────────────────────────────────────
// Set to true to re-enable drag-to-place (feature complete, disabled for now)
const DRAG_ENABLED = false;
const DRAG_LAG_FACTOR = 0.12; // spring follow speed (0=frozen, 1=instant)
const DRAG_START_HOLD_MS = 80; // min hold time before drag activates (ghost-touch guard)

// ── Location-step cleanup ─────────────────────────────────────────────────────
// Held across calls so any entry point (new step, language switch, …) can clean up.
let locationStepAbort: AbortController | null = null;
let selectionStepAbort: AbortController | null = null;
let locationDroneEl: HTMLDivElement | null = null;
let locationCrosshairEl: HTMLDivElement | null = null;

// ── Location-step text refs — updated in-place on language change ─────────────
let locationCurrentPoint: LocationStoryPoint | null = null;
let locationPlaced: { x: number; y: number } | null = null;
let locationTitleEl: HTMLHeadingElement | null = null;
let locationQuestionEl: HTMLElement | null = null;
let locationStatusEl: HTMLElement | null = null;
let locationSubmitBtnEl: HTMLButtonElement | null = null;

// ── Drag state ────────────────────────────────────────────────────────────────
let dragActive = false;
let dragPointerId: number | null = null;
let dragTargetX = 0;
let dragTargetY = 0;
let dragCurrentX = 0;
let dragCurrentY = 0;
let dragRafId: number | null = null;
let dragShieldEl: HTMLDivElement | null = null;

/**
 * Removes event listeners added by the active selection step.
 * Safe to call even if no selection step is active.
 */
export function abortSelectionStep(): void {
	selectionStepAbort?.abort();
	selectionStepAbort = null;
	// Reset all interactive layers
	document.querySelectorAll(".is-interactive").forEach((el) => {
		el.classList.remove("is-interactive");
		(el as HTMLElement).style.pointerEvents = "";
	});
}

/**
 * Hides the edge guard, removes the drone marker, and clears the capture listener.
 * Safe to call even if no location step is active.
 */
export function abortLocationStep(): void {
	locationStepAbort?.abort();
	locationStepAbort = null;
	locationDroneEl?.remove();
	locationDroneEl = null;
	locationCrosshairEl?.remove();
	locationCrosshairEl = null;
	locationCurrentPoint = null;
	locationPlaced = null;
	locationTitleEl = null;
	locationQuestionEl = null;
	locationStatusEl = null;
	locationSubmitBtnEl = null;
	document.getElementById("edge-guard")?.classList.add("hidden");
	// Drag cleanup
	dragActive = false;
	dragPointerId = null;
	if (dragRafId !== null) {
		cancelAnimationFrame(dragRafId);
		dragRafId = null;
	}
	dragShieldEl?.remove();
	dragShieldEl = null;
	document.body.classList.remove("drone-drag-active");
}

/**
 * Updates only the translatable text in the active location step.
 * Called on language change instead of re-rendering the full step (which would reset the drone).
 */
export function refreshLocationTranslations(): void {
	if (!locationCurrentPoint) return;
	if (locationTitleEl) {
		const titleText = getStoryPointTitle(locationCurrentPoint);
		if (titleText) {
			renderInlineText(locationTitleEl, titleText);
		}
	}
	if (locationQuestionEl)
		renderBlockText(
			locationQuestionEl,
			getStoryPointQuestion(locationCurrentPoint),
		);
	// Only update status if no coordinates have been locationPlaced yet
	if (locationStatusEl && !locationPlaced)
		locationStatusEl.innerText = t("challenges.common.click_to_place");
	if (locationSubmitBtnEl)
		locationSubmitBtnEl.innerText =
			getLocationSubmitLabel(locationCurrentPoint);
}

/**
 * Renders a step where the user must click a specific coordinate on the map.
 */
export function renderLocation(
	content: HTMLElement,
	controls: HTMLElement,
	point: LocationStoryPoint,
	onAction: (outcome: QuizOutcome, resultData?: any) => void,
): void {
	// Clean up any previous location step (listener + edge guard)
	abortLocationStep();

	content.innerHTML = "";
	controls.innerHTML = "";

	locationCurrentPoint = point;
	locationPlaced = null;

	const titleText = getStoryPointTitle(point);
	if (titleText) {
		const title = create("h2");
		renderInlineText(title, titleText);
		locationTitleEl = title;
		content.append(title);
	}

	const question = create("div");
	renderBlockText(question, getStoryPointQuestion(point));
	locationQuestionEl = question;
	const status = create("p");
	status.className = "quiz-status";
	status.innerText = t("challenges.common.click_to_place");
	locationStatusEl = status;
	content.append(question);

	const target = document.querySelector<HTMLElement>(point.target);
	if (target) target.classList.add("quiz-location-pulse");

	let marker: HTMLDivElement | null = null;
	let radiusMarker: HTMLDivElement | null = null;

	const iconPath = point.icon ?? "assets/icons/crosshair.svg";
	const iconSlug = iconPath.split("/").pop()!.replace(".svg", "");
	const isDrone = iconSlug === "drone";
	const iconClass = `marker-icon--${iconSlug}`;

	// Inject edge guard and set up AbortController for the capture listener
	document.getElementById("edge-guard")?.classList.remove("hidden");
	locationStepAbort = new AbortController();
	const { signal } = locationStepAbort;

	// RAF spring-follow loop — runs every frame while dragActive is true
	const tickDrag = () => {
		dragCurrentX += (dragTargetX - dragCurrentX) * DRAG_LAG_FACTOR;
		dragCurrentY += (dragTargetY - dragCurrentY) * DRAG_LAG_FACTOR;
		if (marker) {
			marker.style.left = `${dragCurrentX}px`;
			marker.style.top = `${dragCurrentY}px`;
		}
		if (radiusMarker) {
			radiusMarker.style.left = `${dragCurrentX}px`;
			radiusMarker.style.top = `${dragCurrentY}px`;
		}
		if (dragActive) dragRafId = requestAnimationFrame(tickDrag);
	};

	/** Places the marker at the given native-resolution coordinates.
	 *  Drone: flies from current position with speed-based transition.
	 *  Others: jumps to position and pops in. */
	const placeMarkerAt = (x: number, y: number) => {
		locationPlaced = { x, y };

		if (!marker) {
			marker = create("div");
			marker.className = `quiz-location-marker ${iconClass}`;
			// Drone starts at 0,0 and flies to target; others start at target directly.
			marker.style.left = isDrone ? "0px" : `${x}px`;
			marker.style.top = isDrone ? "0px" : `${y}px`;
			target!.append(marker);
			locationDroneEl = marker; // track for cleanup in abortLocationStep()

			loadTEXT<string>(iconPath)
				.then((svgText) => {
					if (marker) marker.innerHTML = svgText;
				})
				.catch(() => {});

			radiusMarker = create("div");
			radiusMarker.className = "quiz-location-radius";
			radiusMarker.style.width = `${point.maxDistance * 2}px`;
			radiusMarker.style.height = `${point.maxDistance * 2}px`;
			radiusMarker.style.left = isDrone ? "0px" : `${x}px`;
			radiusMarker.style.top = isDrone ? "0px" : `${y}px`;
			target!.append(radiusMarker);

			if (isDrone) {
				// Commit the 0,0 position to the browser before animating
				void marker.offsetWidth;

				if (DRAG_ENABLED) {
					// Enable touch events so the drone can be grabbed and dragged
					marker.style.pointerEvents = "auto";

					// ── Drag handlers (ghost-touch guard: hold ≥ DRAG_START_HOLD_MS) ───────
					let dragStartTimer: ReturnType<typeof setTimeout> | null = null;

					marker.addEventListener(
						"pointerdown",
						(e: PointerEvent) => {
							if (dragPointerId !== null) return; // another pointer already active
							e.preventDefault();
							e.stopPropagation();
							dragPointerId = e.pointerId;
							try {
								marker!.setPointerCapture(e.pointerId);
							} catch (_) {}
							const scale = getAppScale();
							const rect = target!.getBoundingClientRect();
							dragTargetX = (e.clientX - rect.left) / scale;
							dragTargetY = (e.clientY - rect.top) / scale;
							// Ghost-touch guard: activate drag only after minimum hold time
							dragStartTimer = setTimeout(() => {
								dragActive = true;
								marker!.classList.add("is-dragging");
								document.body.classList.add("drone-drag-active");
								dragShieldEl = create("div");
								dragShieldEl.className = "drone-drag-shield";
								document.body.appendChild(dragShieldEl);
								// Spring starts from current visual position
								dragCurrentX = parseFloat(marker!.style.left) || dragTargetX;
								dragCurrentY = parseFloat(marker!.style.top) || dragTargetY;
								dragRafId = requestAnimationFrame(tickDrag);
							}, DRAG_START_HOLD_MS);
						},
						{ signal },
					);

					marker.addEventListener(
						"pointermove",
						(e: PointerEvent) => {
							if (e.pointerId !== dragPointerId || !dragActive) return;
							const scale = getAppScale();
							const rect = target!.getBoundingClientRect();
							dragTargetX = (e.clientX - rect.left) / scale;
							dragTargetY = (e.clientY - rect.top) / scale;
						},
						{ signal },
					);

					const finalizeDrag = (e: PointerEvent) => {
						if (e.pointerId !== dragPointerId) return;
						if (dragStartTimer) {
							clearTimeout(dragStartTimer);
							dragStartTimer = null;
						}
						dragPointerId = null;
						// Always stop propagation: a touch on the drone (even a ghost-touch
						// shorter than DRAG_START_HOLD_MS) must not trigger tap-to-fly.
						e.stopPropagation();
						if (!dragActive) return; // released before threshold — no-op (ghost-touch blocked)
						if (dragRafId !== null) {
							cancelAnimationFrame(dragRafId);
							dragRafId = null;
						}
						dragActive = false;
						marker!.classList.remove("is-dragging");
						document.body.classList.remove("drone-drag-active");
						dragShieldEl?.remove();
						dragShieldEl = null;
						locationPlaced = { x: dragCurrentX, y: dragCurrentY };
						status.innerText = `(${Math.round(dragCurrentX)}, ${Math.round(dragCurrentY)})`;
						const dur = `${DRONE_MIN_DURATION_MS}ms`;
						marker!.style.transitionDuration = `${dur}, ${dur}`;
						if (radiusMarker)
							radiusMarker.style.transitionDuration = `${dur}, ${dur}`;
					};
					marker.addEventListener("pointerup", finalizeDrag, { signal });
					marker.addEventListener("pointercancel", finalizeDrag, { signal });
				} // DRAG_ENABLED
			}
		}

		if (!isDrone) {
			// Jump to position and pop in (re-trigger animation on each tap)
			marker.style.left = `${x}px`;
			marker.style.top = `${y}px`;
			if (radiusMarker) {
				radiusMarker.style.left = `${x}px`;
				radiusMarker.style.top = `${y}px`;
			}
			marker.classList.remove("is-popping");
			void marker.offsetWidth;
			marker.classList.add("is-popping");
			if (radiusMarker) {
				radiusMarker.classList.remove("is-popping");
				void radiusMarker.offsetWidth;
				radiusMarker.classList.add("is-popping");
			}
			status.innerText = `(${Math.round(x)}, ${Math.round(y)})`;
			return;
		}

		// Drone: fly to position with speed-based transition
		const currX = parseFloat(marker.style.left) || 0;
		const currY = parseFloat(marker.style.top) || 0;
		const dist = Math.sqrt((x - currX) ** 2 + (y - currY) ** 2);
		const durationMs = Math.max(
			DRONE_MIN_DURATION_MS,
			Math.round((dist / DRONE_SPEED_PX_PER_SEC) * 1000),
		);
		const dur = `${durationMs}ms`;
		marker.style.transitionDuration = `${dur}, ${dur}`;
		if (radiusMarker) radiusMarker.style.transitionDuration = `${dur}, ${dur}`;

		marker.style.left = `${x}px`;
		marker.style.top = `${y}px`;
		if (radiusMarker) {
			radiusMarker.style.left = `${x}px`;
			radiusMarker.style.top = `${y}px`;
		}
		status.innerText = `(${Math.round(x)}, ${Math.round(y)})`;
	};

	// POI tap (capture phase): poi.ts calls stopPropagation in its click callback, so we
	// must intercept in the capture phase — before that fires — to place the marker at
	// the POI position (offset left so the marker icon stays visible).
	let lastPOIPlaceTime = 0;
	if (target) {
		target.addEventListener("click", (e: MouseEvent) => {
			if (dragActive) return;
			if (!(e.target as Element).closest(".poi-marker")) return;
			const now = Date.now();
			if (now - lastPOIPlaceTime < 500) return;
			lastPOIPlaceTime = now;

			const scale = getAppScale();
			const rect = target.getBoundingClientRect();
			const rawX = (e.clientX - rect.left) / scale;
			const rawY = (e.clientY - rect.top) / scale;

			if (!locationCrosshairEl) {
				locationCrosshairEl = create("div");
				locationCrosshairEl.className = "quiz-location-crosshair";
				target.append(locationCrosshairEl);
			}
			locationCrosshairEl.style.left = `${rawX - 200}px`;
			locationCrosshairEl.style.top = `${rawY}px`;
			placeMarkerAt(rawX - 200, rawY);
		}, { capture: true, signal });
	}

	// Tap-to-fly: uses addPointerClick for multi-touch-table robustness (500ms
	// double-fire guard). POI taps are handled above via capture listener.
	if (target) {
		addPointerClick(
			target,
			(e) => {
				if (dragActive) return;
				if ((e.target as Element).closest(".poi-overlay")) return;
				if ((e.target as Element).closest(".poi-marker")) return;

				const scale = getAppScale();
				const rect = target.getBoundingClientRect();
				const rawX = (e.clientX - rect.left) / scale;
				const rawY = (e.clientY - rect.top) / scale;

				if (!locationCrosshairEl) {
					locationCrosshairEl = create("div");
					locationCrosshairEl.className = "quiz-location-crosshair";
					target.append(locationCrosshairEl);
				}
				locationCrosshairEl.style.left = `${rawX}px`;
				locationCrosshairEl.style.top = `${rawY}px`;
				placeMarkerAt(rawX, rawY);
			},
			{ signal, capture: false },
		);
	}

	// Place drone at the configured initial position (flies in from top-left)
	if (point.initial_position) {
		placeMarkerAt(point.initial_position.x, point.initial_position.y);
	}

	const btn = create("button");
	btn.innerText = getLocationSubmitLabel(point);
	locationSubmitBtnEl = btn;
	addDelayedPointerClick(btn, () => {
		if (!locationPlaced) return;

		// Calculate Euclidean distance to solution center
		const dist = Math.sqrt(
			Math.pow(locationPlaced.x - point.solution.x, 2) +
				Math.pow(locationPlaced.y - point.solution.y, 2),
		);
		const isCorrect = dist <= point.maxDistance;

		// Show the correct solution area
		const solRadius = create("div");
		solRadius.className = "quiz-solution-radius";
		solRadius.style.left = `${point.solution.x}px`;
		solRadius.style.top = `${point.solution.y}px`;
		solRadius.style.width = `${point.maxDistance * 2}px`;
		solRadius.style.height = `${point.maxDistance * 2}px`;
		target?.append(solRadius);

		const solCrosshair = create("div");
		solCrosshair.className = "quiz-location-crosshair quiz-solution-crosshair";
		solCrosshair.style.left = `${point.solution.x}px`;
		solCrosshair.style.top = `${point.solution.y}px`;
		target?.append(solCrosshair);

		// Cleanup: abort listener + remove edge guard
		abortLocationStep();
		radiusMarker?.remove();

		onAction(isCorrect ? "correct" : "wrong", locationPlaced);
	});
	controls.append(btn);
}

/**
 * Renders a step where the user must select one or more existing POI markers.
 * Supports spatial filtering based on previous steps.
 */
export function renderSelection(
	content: HTMLElement,
	controls: HTMLElement,
	point: SelectionStoryPoint,
	onAction: (outcome: QuizOutcome) => void,
): void {
	// Safety: clean up any location or selection step that may still be active
	abortLocationStep();
	abortSelectionStep();

	content.innerHTML = "";
	controls.innerHTML = "";

	// Enable POI selection mode (activates "Select" buttons in overlays)
	document.documentElement.dataset.quizPoiSelect =
		point.type === "point-selection-quiz" ? "1" : "0";
	document.documentElement.dataset.quizPoiSelectTarget =
		point.type === "point-selection-quiz" ? (point.target?.trim() ?? "") : "";

	const titleText = getStoryPointTitle(point);
	if (titleText) {
		const title = create("h2");
		renderInlineText(title, titleText);
		content.append(title);
	}

	const question = create("div");
	renderBlockText(question, getStoryPointQuestion(point));
	const status = create("p");
	status.className = "quiz-status";
	content.append(question, status);

	const target = document.querySelector<HTMLElement>(point.target);
	if (!target) {
		console.error(`[Quiz] Target container not found: ${point.target}`);
	}
	clearQuizAnswers();

	// Intelligent Default Selector Logic
	const effectiveSelector =
		point.selector ||
		(point.type === "area-selection-quiz"
			? "polygon, path, .interactive-area"
			: ".poi-marker");

	// Track selection order for FIFO logic
	const selectedIds: string[] = [];

	// SPATIAL FILTER: Check if there's a previous reconnaissance area to restrict selection
	const spatialFilter = getLastLocationResult();

	selectionStepAbort = new AbortController();
	const { signal } = selectionStepAbort;

	const btn = create("button");
	btn.innerText = t("challenges.common.submit");
	controls.append(btn);

	const selectionTarget = point.maxSelection ?? point.solution.length;

	/** Updates the status text and submit button state. */
	const refreshStatus = () => {
		const count = selectedIds.length;
		status.innerHTML = t("challenges.common.selected_count").replace(
			"{count}",
			`<span class="quiz-count">${count} / ${selectionTarget}</span>`,
		);

		// Disable submit button if minSelection is not met
		const isMinMet = count >= (point.minSelection ?? 1);
		if (isMinMet) {
			btn.classList.remove("disabled");
		} else {
			btn.classList.add("disabled");
		}
	};
	refreshStatus();

	/**
	 * Delegated Click Handler.
	 * Instead of attaching to each element, we attach once to the container.
	 * This prevents redundant listeners and ensures correct FIFO behavior.
	 */
	const clickHandler = (e: Event) => {
		const item = (e.target as Element).closest(
			effectiveSelector,
		) as HTMLElement | null;
		if (!item || !target?.contains(item) || item.classList.contains("disabled"))
			return;

		const id = item.id;
		const index = selectedIds.indexOf(id);

		if (index !== -1) {
			// Deselect
			selectedIds.splice(index, 1);
			item.classList.remove("quiz-answer", "active");
		} else {
			// Select with FIFO logic
			if (point.maxSelection && selectedIds.length >= point.maxSelection) {
				const oldestId = selectedIds.shift();
				if (oldestId) {
					const oldestEl = target.querySelector(`#${oldestId}`);
					oldestEl?.classList.remove("quiz-answer", "active");
				}
			}
			selectedIds.push(id);
			item.classList.add("quiz-answer", "active");
		}
		refreshStatus();
	};

	// 1. Initial State: Pulse and enable interaction
	if (target) {
		target.classList.add("is-interactive");
		target.style.pointerEvents = "auto";

		// Ensure the SVG container itself is interactable
		target.querySelectorAll("svg, .area-wrapper").forEach((el) => {
			(el as HTMLElement).style.pointerEvents = "auto";
		});

		target.querySelectorAll<HTMLElement>(effectiveSelector).forEach((el) => {
			let isEnabled = true;
			if (point.type === "point-selection-quiz" && spatialFilter) {
				const poiX = parseFloat(el.style.left) + parseFloat(el.style.width) / 2;
				const poiY = parseFloat(el.style.top) + parseFloat(el.style.height) / 2;
				const dist = Math.sqrt(
					Math.pow(poiX - spatialFilter.x, 2) +
						Math.pow(poiY - spatialFilter.y, 2),
				);
				isEnabled = dist <= spatialFilter.maxDistance;
			}

			if (isEnabled) {
				el.classList.add("quiz-pulse");
				el.classList.remove("disabled");
				el.style.pointerEvents = "auto";
			} else {
				el.classList.add("disabled");
				el.style.pointerEvents = "none";
			}
		});

		// Add single listener to container for delegation
		target.addEventListener("pointerup", clickHandler as any, { signal });
	}

	// Listen for selection changes from POI detail overlays (still needed for POIs)
	const externalHandler = (e: any) => {
		const { id, isSelected } = e.detail || {};
		if (!id) return;

		const index = selectedIds.indexOf(id);
		if (isSelected && index === -1) {
			// External selection (FIFO)
			if (point.maxSelection && selectedIds.length >= point.maxSelection) {
				const oldestId = selectedIds.shift();
				if (oldestId) {
					const oldestEl = target?.querySelector(`#${oldestId}`);
					oldestEl?.classList.remove("quiz-answer", "active");

					const selectBtn = document.querySelector(
						`.poi-overlay[data-marker-id="${oldestId}"] .poi-select-btn`,
					) as HTMLElement;
					if (selectBtn) {
						updatePoiSelectLabel(selectBtn, false);
					}
				}
			}
			selectedIds.push(id);
			const targetEl = target?.querySelector(`#${id}`);
			targetEl?.classList.add("quiz-answer", "active");
		} else if (!isSelected && index !== -1) {
			selectedIds.splice(index, 1);
			const targetEl = target?.querySelector(`#${id}`);
			targetEl?.classList.remove("quiz-answer", "active");
		}
		refreshStatus();
	};
	document.addEventListener("quiz-answer-changed", externalHandler, { signal });

	addDelayedPointerClick(btn, () => {
		if (selectedIds.length < (point.minSelection ?? 1)) return;

		abortSelectionStep();

		if (target) {
			target.querySelectorAll<HTMLElement>(effectiveSelector).forEach((el) => {
				el.classList.remove("quiz-pulse");
			});
		}

		// Calculate Status: correct, partly-correct, partly-critical, weak-fail, all-noncritical-fail, all-critical-fail
		let outcome: QuizOutcome = "wrong";
		const numCorrect = selectedIds.filter((id) =>
			point.solution.includes(id),
		).length;
		const numWrong = selectedIds.filter((id) =>
			(point.wrong_options ?? []).includes(id),
		).length;
		const allCorrect =
			numCorrect === point.solution.length &&
			selectedIds.length === point.solution.length;

		if (allCorrect) {
			outcome = "correct";
		} else if (numCorrect > 0 && numWrong === 0) {
			outcome = "partly-correct";
		} else if (numCorrect > 0 && numWrong > 0) {
			outcome = "partly-critical";
		} else if (numWrong > 0 && numWrong < selectedIds.length) {
			outcome = "weak-fail";
		} else if (numWrong === 0) {
			outcome = "all-noncritical-fail";
		} else {
			outcome = "all-critical-fail";
		}

		onAction(outcome);
	});
}
