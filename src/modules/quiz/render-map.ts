import { create } from "../lib.js";
import { addPointerClick } from "../interactions.js";
import { t } from "../translater.js";
import { LocationStoryPoint, SelectionStoryPoint } from "./types.js";
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
	onAction: (isCorrect: boolean, resultData?: any) => void,
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

		onAction(isCorrect, placed);
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
	onAction: (isCorrect: boolean) => void,
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

	// SPATIAL FILTER: Check if there's a previous reconnaissance area to restrict selection
	const spatialFilter = getLastLocationResult();

	if (target && point.type === "point-selection-quiz") {
		target.querySelectorAll<HTMLElement>(point.selector).forEach((el) => {
			let isEnabled = true;
			if (spatialFilter) {
				// Get POI coordinates from styles (native resolution)
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
				el.style.pointerEvents = "none"; // Lock non-reachable POIs
			}
		});
	} else if (target && point.type === "area-selection-quiz") {
		// For area selection, we just enable the specified selector (e.g., "polygon")
		target.querySelectorAll<HTMLElement>(point.selector).forEach((el) => {
			el.classList.add("quiz-pulse");
			el.classList.remove("disabled");
			el.style.pointerEvents = "auto";
		});
	}

	/** Updates the status text with current selection count. */
	const refreshStatus = () => {
		const count =
			target?.querySelectorAll(`${point.selector}.quiz-answer`).length || 0;
		status.innerText = t(
			"challenges.common.selected_count",
			`Selected: ${count}`,
		).replace("{count}", `${count}`);
	};
	refreshStatus();

	/** Handles clicks on POI markers. */
	const clickHandler = (e: Event) => {
		const item = (e.target as Element | null)?.closest(
			point.selector,
		) as HTMLElement | null;
		if (!item || !target?.contains(item) || item.classList.contains("disabled"))
			return;

		const isSelected = item.classList.contains("quiz-answer");
		if (
			!isSelected &&
			point.maxSelection &&
			target?.querySelectorAll(`${point.selector}.quiz-answer`).length! >=
				point.maxSelection
		)
			return;

		item.classList.toggle("quiz-answer");
		refreshStatus();
	};

	// Listen for selection changes from POI detail overlays
	const externalHandler = () => refreshStatus();
	document.addEventListener("quiz-answer-changed", externalHandler);
	target?.addEventListener("pointerup", clickHandler as any);

	const btn = create("button");
	btn.innerText = t("challenges.common.submit", "Check Selection");
	addPointerClick(btn, () => {
		const selected = Array.from(
			target?.querySelectorAll(`${point.selector}.quiz-answer`) || [],
		).map((el) => el.id);
		if (selected.length < (point.minSelection ?? 1)) return;

		target?.removeEventListener("pointerup", clickHandler as any);
		document.removeEventListener("quiz-answer-changed", externalHandler);

		// Check if all correct IDs are selected and no wrong ones
		const isCorrect =
			selected.length === point.solution.length &&
			selected.every((id) => point.solution.includes(id));
		onAction(isCorrect);
	});
	controls.append(btn);
}
