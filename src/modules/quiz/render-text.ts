import { create } from "../lib.js";
import { addPointerClick, addDelayedPointerClick } from "../interactions.js";
import { t } from "../translater.js";
import { renderBlockText, renderInlineText } from "../rich-text.js";
import {
	InfoStoryPoint,
	QuizStoryPoint,
	EndScreenStoryPoint,
} from "./types.js";
import {
	getQuizOptionLabel,
	getStoryPointButtonText,
	getStoryPointDescription,
	getStoryPointQuestion,
	getStoryPointTitle,
} from "./challenge-normalizer.js";
import { resetApp } from "../info-box.js";

/**
 * Renders a simple information screen with a continue button.
 */
export function renderInfo(
	content: HTMLElement,
	controls: HTMLElement,
	point: InfoStoryPoint | EndScreenStoryPoint,
	onAction: (isCorrect: boolean) => void,
): void {
	content.innerHTML = "";
	controls.innerHTML = "";

	document.documentElement.dataset.quizPoiSelect = "0";

	const titleText = getStoryPointTitle(point);
	if (titleText) {
		const title = create("h2");
		renderInlineText(title, titleText);
		content.append(title);
	}

	const desc = create("div");
	renderBlockText(desc, getStoryPointDescription(point));
	content.append(desc);

	// In terminal steps (no next point), we show "Back to Roles" (passed) or
	// "Try Again" (failed — engine-core will redirect to the last quiz point).
	if (!point.next) {
		const backBtn = create("button");
		const isFailed = (point as EndScreenStoryPoint).result === "failed";
		backBtn.innerText = isFailed
			? t("challenges.common.try_again")
			: t("challenges.common.back_to_start");
		addDelayedPointerClick(
			backBtn,
			isFailed ? () => onAction(true) : () => resetApp(),
		);
		controls.append(backBtn);
	} else {
		const btn = create("button");
		btn.innerText = getStoryPointButtonText(point) ?? t("navigation.next");
		addDelayedPointerClick(btn, () => onAction(true));
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

	const titleText = getStoryPointTitle(point);
	if (titleText) {
		const title = create("h2");
		renderInlineText(title, titleText);
		content.append(title);
	}

	const question = create("div");
	renderBlockText(question, getStoryPointQuestion(point));
	content.append(question);

	const optionsWrapper = create("div");
	optionsWrapper.className = point.optionsLayout === "rows"
		? "quiz-options quiz-options--rows"
		: "quiz-options";
	const selected = new Set<string>();

	// Build option buttons
	point.options.forEach((opt) => {
		const btn = create("button");
		btn.className = "quiz-option-btn";
		btn.innerText = getQuizOptionLabel(opt);

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
	submit.innerText = t("challenges.common.submit");
	addDelayedPointerClick(submit, () => {
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
