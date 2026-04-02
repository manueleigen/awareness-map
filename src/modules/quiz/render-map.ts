import { create, loadTEXT } from "../lib.js";
import { addDelayedPointerClick } from "../interactions.js";
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
import { app } from "../state.js";

// ── Drone speed ───────────────────────────────────────────────────────────────
// Adjust this value to change how fast the drone flies (native pixels / second).
const DRONE_SPEED_PX_PER_SEC = 350;
const DRONE_MIN_DURATION_MS  = 600; // minimum travel time for very short moves

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

function getPointText(
	point: LocationStoryPoint | SelectionStoryPoint,
	field: "title" | "question",
): string | null {
	return point.text?.[app.language]?.[field] ?? null;
}

function getSubmitText(point: LocationStoryPoint): string {
	return point.submit?.[app.language] ??
		t(point.submit_key ?? "challenges.common.submit", "Check Answer");
}

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
}

/**
 * Updates only the translatable text in the active location step.
 * Called on language change instead of re-rendering the full step (which would reset the drone).
 */
export function refreshLocationTranslations(): void {
	if (!locationCurrentPoint) return;
	if (locationTitleEl) {
		const titleText = getPointText(locationCurrentPoint, "title");
		if (titleText || locationCurrentPoint.title_key) {
			renderInlineText(
				locationTitleEl,
				titleText ?? t(locationCurrentPoint.title_key!),
			);
		}
	}
	if (locationQuestionEl)
		renderBlockText(
			locationQuestionEl,
			getPointText(locationCurrentPoint, "question") ??
				t(locationCurrentPoint.question_key!),
		);
	// Only update status if no coordinates have been locationPlaced yet
	if (locationStatusEl && !locationPlaced)
		locationStatusEl.innerText = t(
			"challenges.common.click_to_place",
			"Click to place a point.",
		);
	if (locationSubmitBtnEl)
		locationSubmitBtnEl.innerText = getSubmitText(locationCurrentPoint);
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

	const titleText = getPointText(point, "title");
	if (titleText || point.title_key) {
		const title = create("h2");
		renderInlineText(title, titleText ?? t(point.title_key!));
		locationTitleEl = title;
		content.append(title);
	}

	const question = create("div");
	renderBlockText(
		question,
		getPointText(point, "question") ?? t(point.question_key!),
	);
	locationQuestionEl = question;
	const status = create("p");
	status.className = "quiz-status";
	status.innerText = t(
		"challenges.common.click_to_place",
		"Click to place a point.",
	);
	locationStatusEl = status;
	content.append(question);

	const target = document.querySelector<HTMLElement>(point.target);
	if (target) target.classList.add("quiz-location-pulse");

	let marker: HTMLDivElement | null = null;
	let radiusMarker: HTMLDivElement | null = null;

	// Inject edge guard and set up AbortController for the capture listener
	document.getElementById("edge-guard")?.classList.remove("hidden");
	locationStepAbort = new AbortController();
	const { signal } = locationStepAbort;

	/** Places or moves the drone to the given native-resolution coordinates. */
	const placeMarkerAt = (x: number, y: number) => {
		locationPlaced = { x, y };

		if (!marker) {
			marker = create("div");
			marker.className = "quiz-location-marker";
			// Start at top-left — CSS transition will fly it to the first target position
			marker.style.left = "0px";
			marker.style.top = "0px";
			target!.append(marker);
			locationDroneEl = marker; // track for cleanup in abortLocationStep()

			loadTEXT<string>("assets/icons/drone.svg")
				.then((svgText) => { if (marker) marker.innerHTML = svgText; })
				.catch(() => {});

			radiusMarker = create("div");
			radiusMarker.className = "quiz-location-radius";
			radiusMarker.style.width = `${point.maxDistance * 2}px`;
			radiusMarker.style.height = `${point.maxDistance * 2}px`;
			radiusMarker.style.left = "0px";
			radiusMarker.style.top = "0px";
			target!.append(radiusMarker);

			// Commit the 0,0 position to the browser before animating
			void marker.offsetWidth;
		}

		// Calculate travel duration based on distance and configured speed
		const currX = parseFloat(marker.style.left) || 0;
		const currY = parseFloat(marker.style.top)  || 0;
		const dist  = Math.sqrt((x - currX) ** 2 + (y - currY) ** 2);
		const durationMs = Math.max(
			DRONE_MIN_DURATION_MS,
			Math.round((dist / DRONE_SPEED_PX_PER_SEC) * 1000),
		);
		const dur = `${durationMs}ms`;
		marker.style.transitionDuration = `${dur}, ${dur}`;
		if (radiusMarker) radiusMarker.style.transitionDuration = `${dur}, ${dur}`;

		marker.style.left = `${x}px`;
		marker.style.top  = `${y}px`;

		if (radiusMarker) {
			radiusMarker.style.left = `${x}px`;
			radiusMarker.style.top  = `${y}px`;
		}

		status.innerText = `(${Math.round(x)}, ${Math.round(y)})`;
	};

	/**
	 * Unified pointer handler — runs in capture phase so it intercepts
	 * clicks on POI markers (which call stopPropagation in bubble phase).
	 */
	const clickHandler = (e: PointerEvent) => {
		if (!target) return;

		// Clicks inside an open POI overlay should not move the drone
		if ((e.target as Element).closest(".poi-overlay")) return;

		const scale = getAppScale();
		const rect  = target.getBoundingClientRect();

		const rawX = (e.clientX - rect.left) / scale;
		const rawY = (e.clientY - rect.top)  / scale;

		// Place or move the crosshair at the exact tap position
		if (!locationCrosshairEl) {
			locationCrosshairEl = create("div");
			locationCrosshairEl.className = "quiz-location-crosshair";
			target.append(locationCrosshairEl);
		}
		locationCrosshairEl.style.left = `${rawX}px`;
		locationCrosshairEl.style.top  = `${rawY}px`;

		// If the tap landed on a POI marker, prevent the overlay from opening
		// and nudge the drone to the left so it isn't hidden under the icon.
		const isPOI = !!(e.target as Element).closest(".poi-marker");
		if (isPOI) e.stopPropagation();

		placeMarkerAt(isPOI ? rawX - 200 : rawX, rawY);
	};

	// AbortController signal auto-removes this listener when the step ends
	target?.addEventListener("pointerup", clickHandler, { capture: true, signal });

	// Place drone at the configured initial position (flies in from top-left)
	if (point.initial_position) {
		placeMarkerAt(point.initial_position.x, point.initial_position.y);
	}

	const btn = create("button");
	btn.innerText = getSubmitText(point);
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
		solRadius.style.top  = `${point.solution.y}px`;
		solRadius.style.width  = `${point.maxDistance * 2}px`;
		solRadius.style.height = `${point.maxDistance * 2}px`;
		target?.append(solRadius);

		const solCrosshair = create("div");
		solCrosshair.className = "quiz-location-crosshair quiz-solution-crosshair";
		solCrosshair.style.left = `${point.solution.x}px`;
		solCrosshair.style.top  = `${point.solution.y}px`;
		target?.append(solCrosshair);

		// Cleanup: abort listener + remove edge guard
		abortLocationStep();
		radiusMarker?.remove();

		onAction(isCorrect ? "right" : "wrong", locationPlaced);
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

	const titleText = getPointText(point, "title");
	if (titleText || point.title_key) {
		const title = create("h2");
		renderInlineText(title, titleText ?? t(point.title_key!));
		content.append(title);
	}

	const question = create("div");
	renderBlockText(
		question,
		getPointText(point, "question") ?? t(point.question_key!),
	);
	const status = create("p");
	status.className = "quiz-status";
	content.append(question, status);

	const target = document.querySelector<HTMLElement>(point.target);
	clearQuizAnswers();

	// Intelligent Default Selector Logic
	const effectiveSelector =
		point.selector ||
		(point.type === "area-selection-quiz" ? "polygon, path" : ".poi-marker");

	// Track selection order for FIFO logic
	const selectedIds: string[] = [];

	// SPATIAL FILTER: Check if there's a previous reconnaissance area to restrict selection
	const spatialFilter = getLastLocationResult();

	selectionStepAbort = new AbortController();
	const { signal } = selectionStepAbort;

	const btn = create("button");
	btn.innerText = t("challenges.common.submit", "Check Selection");
	controls.append(btn);

	const selectionTarget = point.maxSelection ?? point.solution.length;

	/** Updates the status text and submit button state. */
	const refreshStatus = () => {
		const count = selectedIds.length;
		status.innerHTML = t(
			"challenges.common.selected_count",
			`Selected: {count}`,
		).replace(
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

		// Calculate Status: right, half, half-wrong, wrong-neutral, all-neutral, all-wrong
		let outcome: QuizOutcome = "wrong";
		const numCorrect = selectedIds.filter((id) => point.solution.includes(id)).length;
		const numWrong = selectedIds.filter((id) => (point.wrong_options ?? []).includes(id)).length;
		const allCorrect = numCorrect === point.solution.length && selectedIds.length === point.solution.length;

		if (allCorrect) {
			outcome = "right";
		} else if (numCorrect > 0 && numWrong === 0) {
			outcome = "half";
		} else if (numCorrect > 0 && numWrong > 0) {
			outcome = "half-wrong";
		} else if (numWrong > 0 && numWrong < selectedIds.length) {
			outcome = "wrong-neutral";
		} else if (numWrong === 0) {
			outcome = "all-neutral";
		} else {
			outcome = "all-wrong";
		}

		onAction(outcome);
	});
}
