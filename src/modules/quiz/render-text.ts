import { create } from "../lib.js";
import { addPointerClick } from "../interactions.js";
import { t } from "../translater.js";
import { InfoStoryPoint, QuizStoryPoint } from "./types.js";
import { backToRoles } from "../info-box.js";

/**
 * Renders a simple information screen with a continue button.
 */
export function renderInfo(
	content: HTMLElement,
	controls: HTMLElement,
	point: InfoStoryPoint,
	onAction: (isCorrect: boolean) => void,
): void {
	content.innerHTML = "";
	controls.innerHTML = "";

	document.documentElement.dataset.quizPoiSelect = "0";

	if (point.title_key) {
		const title = create("h2");
		title.innerText = t(point.title_key);
		content.append(title);
	}

	const desc = create("p");
	desc.innerText = t(point.description_key);
	content.append(desc);

	// In terminal steps, we show different buttons based on status:
	// - "Win": Only "Back to Roles"
	// - "Fail": Only the retry button (default continue button)
	// - regular info steps: standard "Continue" button.
	if (point.terminalStatus === "passed") {
		const backBtn = create("button");
		backBtn.innerText = t("challenges.common.back_to_challenges", "Back to Roles");
		addPointerClick(backBtn, async () => {
			await backToRoles();
		});
		controls.append(backBtn);
	} else {
		// This covers both terminalStatus === "failed" (retry) 
		// and regular info steps (continue).
		const btn = create("button");
		btn.innerText = t(
			point.continue_button_key,
			t("feedback.continue", "Continue"),
		);
		addPointerClick(btn, () => onAction(true));
		controls.append(btn);
	}
}

/**
 * Renders a multiple-choice question step.
 * Supports single and multiple correct answers.
 */
export function renderChoice(
	content: HTMLElement,
	controls: HTMLElement,
	point: QuizStoryPoint,
	onAction: (isCorrect: boolean) => void,
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
	content.append(question);

	const optionsWrapper = create("div");
	optionsWrapper.className = "quiz-options";
	const selected = new Set<string>();

	// Build option buttons
	point.options.forEach((opt) => {
		const btn = create("button");
		btn.className = "quiz-option-btn";
		btn.innerText = t(opt.label_key);

		addPointerClick(btn, () => {
			const isMulti = (point.maxAnswers ?? point.solution.length) > 1;

			// Single selection mode logic
			if (!isMulti) {
				selected.clear();
				optionsWrapper
					.querySelectorAll(".quiz-option-btn")
					.forEach((el) => el.classList.remove("selected"));
			}

			// Toggle selection
			if (selected.has(opt.value)) {
				selected.delete(opt.value);
				btn.classList.remove("selected");
			} else if (!point.maxAnswers || selected.size < point.maxAnswers) {
				selected.add(opt.value);
				btn.classList.add("selected");
			}
		});
		optionsWrapper.append(btn);
	});

	content.append(optionsWrapper);

	const submit = create("button");
	submit.innerText = t("challenges.common.submit", "Check Answer");
	addPointerClick(submit, () => {
		// Enforce minimum required answers
		if (selected.size < (point.minAnswers ?? 1)) return;

		// Compare selected set with solution set
		const isCorrect =
			selected.size === point.solution.length &&
			Array.from(selected).every((v) => point.solution.includes(v));

		onAction(isCorrect);
	});
	controls.append(submit);
}
