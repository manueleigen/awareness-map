import { t } from "../translater.js";

/**
 * Resets all visual quiz indicators and classes from the DOM.
 */
export function clearQuizAnswers(): void {
	// Remove selection classes (active always added together with quiz-answer)
	document
		.querySelectorAll(".quiz-answer.active")
		.forEach((el) => el.classList.remove("quiz-answer", "active"));
	document
		.querySelectorAll(".quiz-answer")
		.forEach((el) => el.classList.remove("quiz-answer"));
	document
		.querySelectorAll(".quiz-option-btn.selected")
		.forEach((el) => el.classList.remove("selected"));

	// Remove animation effects and reset pointer interaction
	document.querySelectorAll<HTMLElement>(".quiz-pulse").forEach((el) => {
		el.classList.remove("quiz-pulse");
		el.style.pointerEvents = "";
	});
	document
		.querySelectorAll(".quiz-location-pulse")
		.forEach((el) => el.classList.remove("quiz-location-pulse"));

	// Remove disabled state set by spatial filter in renderSelection
	document.querySelectorAll<HTMLElement>(".disabled").forEach((el) => {
		el.classList.remove("disabled");
		el.style.pointerEvents = "";
	});

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


