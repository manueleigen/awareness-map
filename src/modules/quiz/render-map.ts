import { create } from "../lib.js";
import { addPointerClick } from "../interactions.js";
import { t } from "../translater.js";
import { LocationStoryPoint, SelectionStoryPoint, QuizOutcome } from "./types.js";
import { clearQuizAnswers } from "./ui.js";
import { getAppScale } from "../screen-zoom.js";
import { getLastLocationResult } from "./engine-core.js";

/**
 * Renders a step where the user must click a specific coordinate on the map.
 */
export function renderLocation(
	content: HTMLElement,
	controls: HTMLElement,
	point: LocationStoryPoint,
	onAction: (outcome: QuizOutcome, resultData?: any) => void,
): void {
	content.innerHTML = "";
	controls.innerHTML = "";

	if (point.title_key) {
		const title = create("h2");
		title.innerText = t(point.title_key);
		content.append(title);
	}

	const question = create("p");
	question.innerText = t(point.question_key);
	const status = create("p");
	status.className = "quiz-status";
	status.innerText = t(
		"challenges.common.click_to_place",
		"Click to place a point.",
	);
	content.append(question);

	const target = document.querySelector<HTMLElement>(point.target);
	if (target) target.classList.add("quiz-location-pulse");

	let placed: { x: number; y: number } | null = null;
	let marker: HTMLDivElement | null = null;
	let radiusMarker: HTMLDivElement | null = null;

	/** Handles clicks on the map target area. */
	const clickHandler = (e: PointerEvent) => {
		if (!target) return;
		const scale = getAppScale();
		const rect = target.getBoundingClientRect();

		// Map screen coordinates back to native resolution (3840x2160)
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		placed = { x, y };

		// Create or move visual indicators
		if (!marker) {
			marker = create("div");
			marker.className = "quiz-location-marker";
			marker.innerText = "X";
			target.append(marker);

			radiusMarker = create("div");
			radiusMarker.className = "quiz-location-radius";
			target.append(radiusMarker);
		}

		marker.style.left = `${x}px`;
		marker.style.top = `${y}px`;

		if (radiusMarker) {
			radiusMarker.style.left = `${x}px`;
			radiusMarker.style.top = `${y}px`;
			radiusMarker.style.width = `${point.maxDistance * 2}px`;
			radiusMarker.style.height = `${point.maxDistance * 2}px`;
		}

		status.innerText = `(${Math.round(x)}, ${Math.round(y)})`;
	};

	target?.addEventListener("pointerup", clickHandler as any);

	const btn = create("button");
	btn.innerText = t("challenges.common.submit", "Check Answer");
	addPointerClick(btn, () => {
		if (!placed) return;

		// Calculate Euclidean distance to solution center
		const dist = Math.sqrt(
			Math.pow(placed.x - point.solution.x, 2) +
				Math.pow(placed.y - point.solution.y, 2),
		);
		const isCorrect = dist <= point.maxDistance;

		// Show the actual correct solution for feedback
		const solRadius = create("div");
		solRadius.className = "quiz-solution-radius";
		solRadius.style.left = `${point.solution.x}px`;
		solRadius.style.top = `${point.solution.y}px`;
		solRadius.style.width = `${point.maxDistance * 2}px`;
		solRadius.style.height = `${point.maxDistance * 2}px`;
		target?.append(solRadius);

		const solMarker = create("div");
		solMarker.className = "quiz-solution-marker";
		solMarker.innerText = "✓";
		solMarker.style.left = `${point.solution.x}px`;
		solMarker.style.top = `${point.solution.y}px`;
		target?.append(solMarker);

		// Cleanup interaction
		target?.removeEventListener("pointerup", clickHandler as any);
		radiusMarker?.remove();

		onAction(isCorrect ? "right" : "wrong", placed);
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
	content.innerHTML = "";
	controls.innerHTML = "";

	// Enable POI selection mode (activates "Select" buttons in overlays)
	document.documentElement.dataset.quizPoiSelect =
		point.type === "point-selection-quiz" ? "1" : "0";

	if (point.title_key) {
		const title = create("h2");
		title.innerText = t(point.title_key);
		content.append(title);
	}

	const question = create("p");
	question.innerText = t(point.question_key);
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

	const btn = create("button");
	btn.innerText = t("challenges.common.submit", "Check Selection");
	controls.append(btn);

	/** Updates the status text and submit button state. */
	const refreshStatus = () => {
		const count = selectedIds.length;
		status.innerText = t(
			"challenges.common.selected_count",
			`Selected: ${count}`,
		).replace("{count}", `${count}`);

		// Disable submit button if minSelection is not met
		const isMinMet = count >= (point.minSelection ?? 1);
		if (isMinMet) {
			btn.classList.remove("is-inactive");
			(btn as any).disabled = false;
		} else {
			btn.classList.add("is-inactive");
			(btn as any).disabled = true;
		}
	};
	refreshStatus();

	/** 
	 * Delegated Click Handler. 
	 * Instead of attaching to each element, we attach once to the container.
	 * This prevents redundant listeners and ensures correct FIFO behavior.
	 */
	const clickHandler = (e: Event) => {
		const item = (e.target as Element).closest(effectiveSelector) as HTMLElement | null;
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
		target.addEventListener("pointerup", clickHandler as any);
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
	document.addEventListener("quiz-answer-changed", externalHandler);

	addPointerClick(btn, () => {
		if (selectedIds.length < (point.minSelection ?? 1)) return;

		// Cleanup
		if (target) {
			target.removeEventListener("pointerup", clickHandler as any);
			target.querySelectorAll<HTMLElement>(effectiveSelector).forEach((el) => {
				el.classList.remove("quiz-pulse");
			});
		}
		
		document.removeEventListener("quiz-answer-changed", externalHandler);

		// Calculate Status: right, half, or wrong
		let outcome: QuizOutcome = "wrong";
		const numCorrectSelected = selectedIds.filter((id) =>
			point.solution.includes(id),
		).length;

		const isRight =
			selectedIds.length === point.solution.length &&
			numCorrectSelected === point.solution.length;

		if (isRight) {
			outcome = "right";
		} else if (numCorrectSelected > 0) {
			outcome = "half";
		}

		onAction(outcome);
	});
}
