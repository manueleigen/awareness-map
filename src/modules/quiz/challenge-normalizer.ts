import { app } from "../state.js";
import { t } from "../translater.js";
import {
	BaseStoryPoint,
	LocalizedInlineText,
	LocationStoryPoint,
	QuizOption,
	QuizStoryPoint,
	StoryPoint,
} from "./types.js";

type LocalizedValue<T> = { de?: T; en?: T };

function normalizeLocalizedValue<T>(value: any): LocalizedValue<T> | undefined {
	if (!value || typeof value !== "object") return undefined;
	return {
		de: value.de,
		en: value.en,
	};
}

function normalizeLocalizedInlineText(value: any): LocalizedValue<LocalizedInlineText> | undefined {
	if (!value || typeof value !== "object") return undefined;
	return {
		de: value.de
			? {
					title: value.de.title,
					question: value.de.question,
					description: value.de.description,
				}
			: undefined,
		en: value.en
			? {
					title: value.en.title,
					question: value.en.question,
					description: value.en.description,
				}
			: undefined,
	};
}

function normalizeOption(option: any): QuizOption {
	return {
		value: option.value,
		label_key: option.label_key,
		text: normalizeLocalizedValue<string>(option.text),
	};
}

function normalizeStoryPoint(point: any): StoryPoint {
	return {
		...point,
		text: normalizeLocalizedInlineText(point.text),
		options: Array.isArray(point.options)
			? point.options.map(normalizeOption)
			: point.options,
		submit: normalizeLocalizedValue<string>(point.submit),
	};
}

export function normalizeChallengeDefinition<T extends { story_points?: any[] }>(
	data: T,
): { story_points: StoryPoint[] } {
	return {
		story_points: Array.isArray(data.story_points)
			? data.story_points.map(normalizeStoryPoint)
			: [],
	};
}

export function getLocalizedInlineText(
	value?: LocalizedValue<LocalizedInlineText>,
): LocalizedInlineText | null {
	return value?.[app.language] ?? null;
}

export function getStoryPointText(
	point: BaseStoryPoint,
	field: "title" | "question" | "description",
): string | null {
	return getLocalizedInlineText(point.text)?.[field] ?? null;
}

export function getStoryPointDescription(point: BaseStoryPoint & { description_key?: string }): string {
	return getStoryPointText(point, "description") ?? t(point.description_key!, "");
}

export function getStoryPointQuestion(point: BaseStoryPoint & { question_key?: string }): string {
	return getStoryPointText(point, "question") ?? t(point.question_key!, "");
}

export function getStoryPointTitle(point: BaseStoryPoint): string | null {
	return getStoryPointText(point, "title") ?? (point.title_key ? t(point.title_key) : null);
}

export function getQuizOptionLabel(option: QuizOption): string {
	return option.text?.[app.language] ?? (option.label_key ? t(option.label_key) : option.value);
}

export function getLocationSubmitLabel(point: LocationStoryPoint): string {
	return point.submit?.[app.language] ??
		t(point.submit_key ?? "challenges.common.submit", "Check Answer");
}

export function getChallengeIntroText(challenge: { story_points?: StoryPoint[] }): {
	title?: string;
	description?: string;
} | null {
	const introPoint = challenge.story_points?.find(
		(point) => point.id === "intro" && point.type === "info",
	);
	if (!introPoint) return null;

	const title = getStoryPointTitle(introPoint);
	const description = getStoryPointDescription(introPoint);
	if (!title && !description) return null;

	return {
		title: title ?? undefined,
		description: description ?? undefined,
	};
}
