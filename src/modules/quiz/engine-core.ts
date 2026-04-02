import { loadYAML, create } from "../lib.js";
import { addPointerClick } from "../interactions.js";
import { app } from "../state.js";
import { resetLayers } from "../layers.js";
import { t } from "../translater.js";
import { renderBlockText, renderInlineText } from "../rich-text.js";
import { StoryPoint, BaseStoryPoint, QuizOutcome } from "./types.js";
import { renderProgress, clearQuizAnswers } from "./ui.js";
import { renderInfo, renderChoice } from "./render-text.js";
import { renderLocation, renderSelection, abortLocationStep, refreshLocationTranslations, abortSelectionStep } from "./render-map.js";
import { animateSliderToTime } from "../time-slider.js";
import { getRoleActiveLayerIds } from "../scenarios.js";
import { resolveLayerIdAlias } from "../prototype-context.js";
import { normalizeChallengeDefinition } from "./challenge-normalizer.js";

/** Local storage for the active quiz run. */
let currentStoryPoints: StoryPoint[] = [];
let currentContent: HTMLElement | null = null;
let currentControls: HTMLElement | null = null;
let currentOnFinish: ((status: "passed" | "failed") => void) | null = null;
let currentPoint: StoryPoint | null = null;
let currentOnAction:
	| ((outcome: boolean | QuizOutcome, resultData?: any) => void)
	| null = null;
/** ID of the last answerable quiz step — used to retry after a fail screen. */
let lastQuizPointId: string | null = null;

/**
 * Temporary state shared between steps (e.g., coordinates from a location step
 * used to filter POIs in a following selection step).
 */
let lastLocationResult: { x: number; y: number; maxDistance: number } | null =
	null;

/**
 * Re-renders the current quiz step with fresh translations.
 * Called when the language changes mid-quiz.
 */
export function refreshCurrentPoint(): void {
	if (!currentPoint || !currentContent || !currentControls || !currentOnAction)
		return;
	renderProgress(currentContent, currentPoint);
	if (currentPoint.type === "info")
		renderInfo(currentContent, currentControls, currentPoint, currentOnAction);
	else if (currentPoint.type === "quiz")
		renderChoice(
			currentContent,
			currentControls,
			currentPoint,
			currentOnAction,
		);
	else if (currentPoint.type === "location-quiz")
		refreshLocationTranslations();
	else if (
		currentPoint.type === "area-selection-quiz" ||
		currentPoint.type === "point-selection-quiz"
	)
		renderSelection(
			currentContent,
			currentControls,
			currentPoint,
			currentOnAction,
		);
}

/** Exported getter for spatial filtering in render-map.ts */
export function getLastLocationResult() {
	return lastLocationResult;
}

/**
 * Main engine entry point. Loads the quiz definition and starts at the 'intro' point.
 */
export async function runQuiz(
	path: string,
	content: HTMLElement,
	controls: HTMLElement,
	onFinish: (status: "passed" | "failed") => void,
): Promise<void> {
	const rawData = await loadYAML<{ story_points: StoryPoint[] }>(path);
	const data = normalizeChallengeDefinition(rawData);
	if (!data) return;

	currentStoryPoints = data.story_points;
	currentContent = content;
	currentControls = controls;
	currentOnFinish = onFinish;
	lastLocationResult = null; // Reset shared data for new run
	lastQuizPointId = null;

	// Ensure all layers are in their base state before starting quiz
	await resetLayers();

	// Activate any layers defined at the role level in context.yaml
	(await getRoleActiveLayerIds()).forEach((id) => app.activeLayers.add(id));

	clearQuizAnswers();
	await loadPoint("intro");
}

/**
 * Loads a specific story point by ID and delegates rendering to type-specific modules.
 */
async function loadPoint(id: string): Promise<void> {
	const point = currentStoryPoints.find((p) => p.id === id);
	if (!point || !currentContent || !currentControls) return;

	// Invalidate stale point/action so refreshCurrentPoint() is a no-op
	// during the view update in step 4 (prevents location-quiz from re-rendering).
	currentPoint = null;
	currentOnAction = null;

	// 1. Cleanup: Remove layers specifically added by the PREVIOUS step
	if (app.quizStepLayers.size > 0) {
		app.quizStepLayers.forEach((layerId) => {
			app.activeLayers.delete(layerId);
			// Release any slider lock from the previous step
			const wrapper = document.getElementById(`slider-wrapper-${layerId}`);
			wrapper?.classList.remove("slider-fixed");
		});
		app.quizStepLayers.clear();
	}

	// 2. Clear visual quiz markers and reset interactive states
	// We don't use full resetLayers() here because it would trigger a redundant
	// renderLayers() call and reset initially_visible layers we might want to keep.
	abortLocationStep(); // removes edge guard + capture listener from any previous location step
	abortSelectionStep();
	clearQuizAnswers();

	// 3. Explicitly deactivate layers that should be hidden for THIS step
	if (point.excludeLayerIds && point.excludeLayerIds.length > 0) {
		point.excludeLayerIds.forEach((layerId) => {
			app.activeLayers.delete(resolveLayerIdAlias(layerId));
		});
	}

	// 4. Handle automatic layer activation for THIS specific step
	const layersToActivate =
		(point.activeLayerIds || (point.activeLayerId ? [point.activeLayerId] : []))
			.map((layerId) => resolveLayerIdAlias(layerId));

	if (layersToActivate.length > 0) {
		layersToActivate.forEach((layerId) => {
			if (!app.activeLayers.has(layerId)) {
				app.activeLayers.add(layerId);
				app.quizStepLayers.add(layerId); // Track so we can remove it later
			}
		});
	}

	// 5. Trigger a single synchronized view update
	await new Promise<void>((resolve) => {
		const onUpdated = () => {
			document.removeEventListener("app-view-updated", onUpdated);
			resolve();
		};
		document.addEventListener("app-view-updated", onUpdated);
		document.dispatchEvent(new CustomEvent("app-request-view-update"));
	});

	// 6. Animate slider to the step's target time (if specified)
	if (point.slider_time) {
		const targetLayers = point.slider_time_layer
			? [resolveLayerIdAlias(point.slider_time_layer)]
			: layersToActivate;
		targetLayers.forEach((layerId) => {
			animateSliderToTime(
				layerId,
				point.slider_time!,
				point.slider_time_fixed ?? false,
			);
		});
	}

	renderProgress(currentContent, point);

	currentPoint = point;

	/**
	 * Internal callback for renderers to signal an action/answer.
	 */
	const onAction = (outcome: boolean | QuizOutcome, resultData?: any) => {
		// Persist data if this was a location selection
		if (point.type === "location-quiz" && resultData) {
			lastLocationResult = { ...resultData, maxDistance: point.maxDistance };
		}
		handleAction(point, outcome);
	};
	currentOnAction = onAction;

	// Delegate to specialized renderers
	if (point.type === "info")
		renderInfo(currentContent, currentControls, point, onAction);
	else if (point.type === "quiz")
		renderChoice(currentContent, currentControls, point, onAction);
	else if (point.type === "location-quiz")
		renderLocation(currentContent, currentControls, point, onAction);
	else if (
		point.type === "area-selection-quiz" ||
		point.type === "point-selection-quiz"
	)
		renderSelection(currentContent, currentControls, point, onAction);
}

/**
 * Decides what happens next after a user action.
 */
function handleAction(point: StoryPoint, outcome: boolean | QuizOutcome): void {
	// 1. Check if the point itself signals the end of the quiz
	if (point.terminalStatus && currentOnFinish) {
		if (point.terminalStatus === "failed") {
			// Go back to the last answerable step instead of ending the quiz
			loadPoint(lastQuizPointId ?? currentStoryPoints[0]?.id ?? "intro");
			return;
		}
		// Cleanup layers from the final step before finishing
		if (app.quizStepLayers.size > 0) {
			app.quizStepLayers.forEach((layerId) => app.activeLayers.delete(layerId));
			app.quizStepLayers.clear();
		}
		currentOnFinish(point.terminalStatus);
		return;
	}

	// 2. Resolve the next point ID based on outcome
	// Track this as the last answerable quiz point (has right/wrong outcomes)
	if (typeof point.next !== "string") {
		lastQuizPointId = point.id;
	}

	let nextId: string;
	if (typeof point.next === "string") {
		nextId = point.next;
	} else {
		// Convert boolean outcome to status if needed (legacy support)
		const status: QuizOutcome =
			typeof outcome === "boolean" ? (outcome ? "right" : "wrong") : outcome;

		const next = point.next as Record<string, string | undefined>;
		if (status === "right") {
			nextId = point.next.right;
		} else if (next[status]) {
			nextId = next[status] as string;
		} else if (status === "half-wrong") {
			nextId = point.next.half ?? point.next.wrong;
		} else {
			nextId = point.next.wrong; // fallback for wrong-neutral, all-neutral, all-wrong
		}
	}

	// 3. Show optional "Correct!" interlude or load next point immediately
	const isCorrect = outcome === true || outcome === "right";

	if (
		isCorrect &&
		typeof point.next !== "string" &&
		point.success_screen &&
		currentContent &&
		currentControls
	) {
		renderSuccessInterlude(
			currentContent,
			currentControls,
			point.success_screen,
			() => loadPoint(nextId),
		);
	} else {
		loadPoint(nextId);
	}
}

/**
 * Renders a brief "Success" screen before proceeding to the next step.
 * Shows a continue button; if duration_ms is set, also auto-advances after that delay.
 */
function renderSuccessInterlude(
	container: HTMLElement,
	controls: HTMLElement,
	success: NonNullable<BaseStoryPoint["success_screen"]>,
	callback: () => void,
): void {
	container.innerHTML = "";
	controls.innerHTML = "";

	const title = create("h2");
	renderInlineText(
		title,
		t(success.title_key || "feedback.success_title", "Success"),
	);
	const desc = create("div");
	renderBlockText(
		desc,
		t(
		success.description_key || "feedback.continue",
		"Continuing...",
		),
	);

	container.append(title, desc);

	let fired = false;
	const proceed = () => {
		if (fired) return;
		fired = true;
		callback();
	};

	const btn = create("button");
	btn.innerText = t("feedback.continue", "Weiter");
	addPointerClick(btn, proceed);
	controls.append(btn);

	if (success.duration_ms) {
		window.setTimeout(proceed, success.duration_ms);
	}
}
