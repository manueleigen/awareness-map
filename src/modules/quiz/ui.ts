import { create } from "../lib.js";
import { t } from "../translater.js";
import { StoryPoint, BaseStoryPoint } from "./types.js";

/**
 * Resets all visual quiz indicators and classes from the DOM.
 */
export function clearQuizAnswers(): void {
	// Remove selection classes
	document
		.querySelectorAll(".quiz-answer")
		.forEach((el) => el.classList.remove("quiz-answer"));
	document
		.querySelectorAll(".quiz-option-btn.selected")
		.forEach((el) => el.classList.remove("selected"));

	// Remove animation effects
	document
		.querySelectorAll(".quiz-pulse")
		.forEach((el) => el.classList.remove("quiz-pulse"));
	document
		.querySelectorAll(".quiz-location-pulse")
		.forEach((el) => el.classList.remove("quiz-location-pulse"));

	// Remove temporary markers, areas and crosshairs
	document
		.querySelectorAll(".quiz-location-marker")
		.forEach((el) => el.remove());
	document
		.querySelectorAll(".quiz-location-radius")
		.forEach((el) => el.remove());
	document
		.querySelectorAll(".quiz-solution-radius")
		.forEach((el) => el.remove());
	document
		.querySelectorAll(".quiz-location-crosshair")
		.forEach((el) => el.remove());
}

/**
 * Renders a horizontal progress bar indicating the current quiz step.
 */
export function renderProgress(
	container: HTMLElement,
	point: StoryPoint,
): void {
	if (!point.step || !point.total_steps) return;

	container.querySelector(".quiz-progress")?.remove();
	const wrapper = create("div");
	wrapper.className = "quiz-progress";

	const barOuter = create("div");
	barOuter.className = "quiz-progress-bar-outer";
	const barInner = create("div");
	barInner.className = "quiz-progress-bar-inner";

	// Calculate width percentage
	const ratio = Math.max(0, Math.min(1, point.step / point.total_steps));
	barInner.style.width = `${ratio * 100}%`;
	barOuter.append(barInner);

	const label = create("div");
	label.className = "quiz-progress-label";
	label.innerText = `${point.step} / ${point.total_steps}`;

	wrapper.append(barOuter, label);
	container.prepend(wrapper);
}
