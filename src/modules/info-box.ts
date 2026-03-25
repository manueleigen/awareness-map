import { app } from "./state.js";
import { addPointerClick } from "./interactions.js";
import { startQuiz } from "./engine.js";
import { hidePOIOverlay } from "./poi.js";
import {
	context,
	renderLayers,
	resetLayers,
	resetSliders,
	previewActivePOILayers,
} from "./layers.js";
import { create, sleep } from "./lib.js";
import { t } from "./translater.js";
import { getQuizPath, getRoleSliderConfig } from "./scenarios.js";
import { refreshCurrentPoint } from "./quiz/engine-core.js";
import { abortLocationStep } from "./quiz/render-map.js";
import { animateSliderToTime } from "./time-slider.js";
/**
 * Updates the entire application view based on app.view state.
 * Refreshes both the UI overlays and the map layers.
 */
export async function updateView(): Promise<void> {
	const { infoBoxContent, escapeBtn } = app.ui;
	if (!infoBoxContent) return;

	// Toggle escape button visibility (hidden on home screen)
	if (escapeBtn) {
		if (app.view === "home") {
			escapeBtn.classList.add("hidden");
		} else {
			escapeBtn.classList.remove("hidden");
			// Rename "Escape" button based on context
			const span = escapeBtn.querySelector("span");
			if (span) {
				if (app.view === "role-select") {
					span.innerText = t("navigation.back", "Back");
				} else {
					span.innerText = t("navigation.escape", "Cancel");
				}
			}
		}
	}

	// Technical Implementation Guide (v2.3): State Cleanup.
	// Close any open POI overlays during view or language changes
	// to prevent stale content or detached overlays.
	hidePOIOverlay();

	// Render view-specific UI components
	switch (app.view) {
		case "home":
			renderHome();
			break;
		case "role-select":
			renderRoleSelection();
			break;
		case "map":
			renderMapUI();
			break;
		case "quiz":
			refreshCurrentPoint();
			break;
	}

	// Always sync map layers with the current state/context
	await renderLayers();

	// Notify that the view update is complete (useful for quiz coordination)
	document.dispatchEvent(new CustomEvent("app-view-updated"));
}

/** HOME-SCENARIOS */
export function renderHome(): void {
	const { infoBoxContent, infoBoxControls } = app.ui;
	if (!infoBoxContent || !infoBoxControls) return;

	infoBoxContent.innerHTML = "";
	infoBoxControls.innerHTML = "";

	const title = create("h1");
	title.id = "app-title";
	title.innerHTML = t("home.title");

	const text = create("p");
	text.innerHTML = t("home.description");

	const btnGroup = create("div");
	btnGroup.className = "button-group large-buttons";

	if (context) {
		Object.keys(context.scenarios).forEach((scenarioId) => {
			const scenario = context!.scenarios[scenarioId];
			const btn = create("button");
			const btnTitle =
				t(`scenarios.${scenarioId}.short_title`) ||
				t(`scenarios.${scenarioId}.title`);
			btn.innerText = btnTitle;

			if (scenario.inactive) {
				btn.classList.add("is-inactive");
			} else {
				addPointerClick(btn, async () => {
					app.currentScenario = scenarioId;
					app.view = "role-select";
					await resetLayers();
					await updateView();
				});
			}

			btnGroup.append(btn);
		});
	}

	infoBoxContent.append(title, text);
	infoBoxControls.append(btnGroup);
}

/** HOME-SCENARIOS / ROLES  */

export function renderRoleSelection(): void {
	const { infoBoxContent, infoBoxControls } = app.ui;
	if (!infoBoxContent || !infoBoxControls || !context || !app.currentScenario)
		return;

	const scenarioCTX = context.scenarios[app.currentScenario];

	const scenario = context.scenarios[app.currentScenario];
	if (!scenario) return;

	infoBoxContent.innerHTML = "";
	infoBoxControls.innerHTML = "";

	const title = create("h2");
	title.innerHTML = t(`scenarios.${app.currentScenario}.title`);

	const text = create("p");
	text.innerHTML = t(`scenarios.${app.currentScenario}.description`);

	const btnGroup = create("div");
	btnGroup.className = "button-group large-buttons";

	Object.keys(scenario.roles).forEach((roleId) => {
		const roleCTX = scenarioCTX.roles[roleId];
		const hasQuiz = roleCTX.quiz;
		const btn = create("button");
		btn.classList.add("silent-disabled");

		// Try scenario-specific role title (short version) first, then fallback to challenge title
		const scenarioRoleTitle = t(
			`scenarios.${app.currentScenario}.roles.${roleId}.title`,
			"",
		);
		const fallbackTitle = t(
			`challenges.${app.currentScenario}.${roleId}.title`,
			roleId,
		);

		btn.innerText =
			scenarioRoleTitle &&
			scenarioRoleTitle !==
				`scenarios.${app.currentScenario}.roles.${roleId}.title`
				? scenarioRoleTitle
				: fallbackTitle;

		if (hasQuiz) {
			// Technical Implementation Guide (v2.3): Through-click prevention.
			// Delay listener attachment by 300ms so the same physical touch
			// that opened this view doesn't immediately trigger a role selection.
			setTimeout(async function () {
				await sleep(200);
				btn.classList.remove("silent-disabled");

				addPointerClick(btn, async () => {
					app.currentRole = roleId;
					app.view = "map";
					await resetLayers();
					await updateView();
					previewActivePOILayers();
					const sliderCfg = getRoleSliderConfig();
					if (sliderCfg) {
						const targetLayers = sliderCfg.layer
							? [sliderCfg.layer]
							: Object.keys(
									context?.scenarios[app.currentScenario!]?.layers ?? {},
								);
						targetLayers.forEach((id) =>
							animateSliderToTime(id, sliderCfg.time, sliderCfg.fixed),
						);
					}
				});
			});
		} else {
			btn.classList.add("is-inactive");
		}

		btnGroup.append(btn);
	});

	/* Navigation back to scenario selection - NOT USED FOR NOW
    const backBtn = create('button');
    backBtn.className = 'back-btn';
    backBtn.innerText = t('navigation.back');
    addPointerClick(backBtn, async () => {
        app.currentScenario = null;
        app.view = 'scenario-select';
        await updateView();
    });*/

	infoBoxContent.append(title, text);
	infoBoxControls.append(btnGroup);
}

/** HOME-SCENARIOS / ROLES / DETAIL */
export async function renderMapUI(): Promise<void> {
	const { infoBoxContent, infoBoxControls } = app.ui;
	if (!infoBoxContent || !infoBoxControls) return;

	infoBoxContent.innerHTML = "";
	infoBoxControls.innerHTML = "";

	document.documentElement.dataset.quizPoiSelect = "0";

	const title = create("h2");
	title.innerHTML = t(
		`challenges.${app.currentScenario}.${app.currentRole}.title`,
	);

	const desc = create("p");
	desc.innerHTML = t(
		`challenges.${app.currentScenario}.${app.currentRole}.intro`,
	);

	infoBoxContent.append(title, desc);

	// Check if this challenge was already completed
	const resultId = `${app.currentScenario}_${app.currentRole}`;
	const result = app.challengeResults[resultId];
	const includeLastResult = false;

	if (result && includeLastResult) {
		const statusMsg = create("div");
		statusMsg.className = `challenge-status challenge-${result.status}`;
		statusMsg.innerText =
			result.status === "passed"
				? t("challenges.common.passed_msg", "Challenge completed successfully!")
				: t("challenges.common.failed_msg", "Challenge failed.");
		infoBoxContent.append(statusMsg);
	}

	// Dynamically offer quiz/challenge if available for this context
	const quizPath = getQuizPath();
	if (quizPath) {
		const startQuizBtn = create("button");
		const btnLabelKey = result
			? "challenges.common.start_button" // "challenges.common.retry_button"
			: "challenges.common.start_button";

		startQuizBtn.innerText = t(
			btnLabelKey,
			result ? "Retry" : "Start Challenge",
		);
		startQuizBtn.classList.add("silent-disabled");
		infoBoxControls.append(startQuizBtn);
		await sleep(200);
		startQuizBtn.classList.remove("silent-disabled");
		addPointerClick(startQuizBtn, async () => {
			await startQuiz(quizPath);
		});
	}
}

/**
 * Resets the application state and returns to the home screen.
 */
export async function resetApp(): Promise<void> {
	abortLocationStep();
	app.currentScenario = null;
	app.currentRole = null;
	app.view = "home";

	// Comprehensive layer reset (clears areas, restores initial visibility)
	await resetLayers();
	resetSliders();

	await updateView();
}

/**
 * Returns to the role selection panel.
 */
export async function backToRoles(): Promise<void> {
	abortLocationStep();
	app.currentRole = null;
	app.view = "role-select";

	await resetLayers();
	resetSliders();
	await updateView();
}
