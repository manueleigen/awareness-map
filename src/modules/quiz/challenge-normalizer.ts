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

function normalizeLocalizedInlineText(
	value: any,
): LocalizedValue<LocalizedInlineText> | undefined {
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
		text: normalizeLocalizedValue<string>(option.text),
	};
}

/**
 * Parses the YAML coordinate notation "{x: NNN, y: NNN}" (string or array-of-one)
 * into the { x, y } object expected by renderLocation.
 */
function parseLocationSolution(raw: any): { x: number; y: number } | undefined {
	if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
	const str: unknown = Array.isArray(raw) ? raw[0] : raw;
	if (typeof str !== "string") return undefined;
	const m = str.match(/x:\s*(-?\d+(?:\.\d+)?)\s*,\s*y:\s*(-?\d+(?:\.\d+)?)/);
	if (!m) return undefined;
	return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

function normalizeStoryPoint(point: any): StoryPoint {
	const normalized: any = {
		...point,
		text: normalizeLocalizedInlineText(point.text),
		options: Array.isArray(point.options)
			? point.options.map(normalizeOption)
			: point.options,
		submit: normalizeLocalizedValue<string>(point.submit),
	};
	if (point.type === "location-quiz") {
		normalized.solution = parseLocationSolution(point.solution);
	}
	return normalized;
}

export function normalizeChallengeDefinition<
	T extends { story_points?: any[] },
>(data: T): { story_points: StoryPoint[] } {
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

export function getStoryPointDescription(point: BaseStoryPoint): string {
	return getStoryPointText(point, "description") ?? "";
}

export function getStoryPointQuestion(point: BaseStoryPoint): string {
	return getStoryPointText(point, "question") ?? "";
}

export function getStoryPointTitle(point: BaseStoryPoint): string | null {
	return getStoryPointText(point, "title");
}

export function getQuizOptionLabel(option: QuizOption): string {
	return option.text?.[app.language] ?? option.value;
}

export function getLocationSubmitLabel(point: LocationStoryPoint): string {
	return point.submit?.[app.language] ?? t("challenges.common.submit");
}

export function getChallengeIntroText(challenge: {
	story_points?: StoryPoint[];
}): {
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
