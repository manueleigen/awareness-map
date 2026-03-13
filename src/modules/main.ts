import { initLayers, renderLayers } from "./layers.js";
import { initTranslator, t } from "./translater.js";
import { initScenarios, renderScenarioSelection, renderRoleSelection, getQuizPath } from "./scenarios.js";
import { Language } from "./types.js";
import { app } from "./state.js";
import { el, create } from "./lib.js";
import { startQuiz } from "./engine.js";
import { initDualScale } from './screen-zoom.js';
import { hidePOIOverlay } from './poi.js';

/**
 * Caches DOM references into the global app state for easy access.
 */
export function initUIReferences(): void {
    app.ui.app = el('#app');
    app.ui.infoBox = el('#info-box');
    app.ui.infoBoxContent = el('#info-box-content');
    app.ui.infoBoxControls = el('#info-box-controls');
    app.ui.layerControl = el('#layer-control');
    app.ui.slidersContainer = el('#slider-container');
    app.ui.layers = el('#layers');
    app.ui.escapeBtn = el('#escape-btn');
    app.ui.languageSwitch = el<HTMLInputElement>('#language-switch input');
}

/**
 * Main application initialization sequence.
 */
export async function initApp() {
    try {
        console.log("Initializing application...");
        
        // 0. Cache UI References
        initUIReferences();

        // Global Event Listeners
        document.addEventListener('app-request-view-update', async () => {
            await updateView();
        });

        // Global Click-to-close POI Overlay logic
        document.addEventListener('click', (e) => {
            if (app.ui.poiOverlay && !app.ui.poiOverlay.contains(e.target as Node)) {
                hidePOIOverlay();
            }
        });

        // 1. Initialize Translator (loads language files)
        await initTranslator(app.language as Language).catch(err => {
            console.error("Failed to load translation files:", err);
        });
        
        // 2. Initialize Scenarios (loads scenario metadata)
        await initScenarios();

        // 3. Initialize Layers (loads layer configuration)
        await initLayers().catch(err => {
            console.error("Failed to load layer configuration:", err);
        });

        // 4. Initialize dynamic scaling for 4K displays
        initDualScale();

        // 5. Perform initial render based on default state
        await updateView();
        
        console.log("Application successfully initialized.");
    } catch (globalError) {
        console.error("Critical error during application initialization:", globalError);
        const appContainer = app.ui.app;
        if (appContainer) {
            appContainer.innerHTML = `<div style="color: white; padding: 20px;">
                <h2>System Error</h2>
                <p>The application could not be loaded correctly. Please check the configuration.</p>
            </div>`;
        }
    }
}

/**
 * Updates the entire application view based on app.view state.
 * Refreshes both the UI overlays and the map layers.
 */
export async function updateView(): Promise<void> {
    const { infoBoxContent, escapeBtn } = app.ui;
    if (!infoBoxContent) return;

    // Toggle escape button visibility (hidden on home screen)
    if (escapeBtn) {
        if (app.view === 'home') {
            escapeBtn.classList.add('hidden');
        } else {
            escapeBtn.classList.remove('hidden');
        }
    }
    
    // Render view-specific UI components
    switch(app.view) {
        case 'home':
            renderHome();
            break;
        case 'scenario-select':
            renderScenarioSelection();
            break;
        case 'role-select':
            renderRoleSelection();
            break;
        case 'map':
            renderMapUI();
            break;
        case 'quiz':
            // Quiz UI is managed internally by the QuizEngine
            break;
    }

    // Always sync map layers with the current state/context
    await renderLayers();

    // Notify that the view update is complete (useful for quiz coordination)
    document.dispatchEvent(new CustomEvent('app-view-updated'));
}

/** Renders the landing/home screen. */
export function renderHome(): void {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls) return;

    infoBoxContent.innerHTML = '';
    infoBoxControls.innerHTML = '';

    const title = create('h1');
    title.id = 'app-title';
    title.innerText = t('home.headline');

    const text = create('p');
    text.innerText = t('home.description');

    const btn = create('button');
    btn.innerText = t('navigation.start');
    btn.addEventListener('click', async () => {
        app.view = 'scenario-select';
        await updateView();
    });

    infoBoxContent.append(title, text);
    infoBoxControls.append(btn);
}

/** Renders the UI for the main map view, including active role info and challenges. */
export function renderMapUI(): void {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls) return;

    infoBoxContent.innerHTML = '';
    infoBoxControls.innerHTML = '';
    
    const title = create('h2');
    title.innerText = t(`roles.${app.currentRole}.title`);
    
    const desc = create('p');
    desc.innerText = t(`roles.${app.currentRole}.short_description`);

    infoBoxContent.append(title, desc);

    // Check if this challenge was already completed
    const resultId = `${app.currentScenario}_${app.currentRole}`;
    const result = app.challengeResults[resultId];

    if (result) {
        const statusMsg = create('div');
        statusMsg.className = `challenge-status challenge-${result.status}`;
        statusMsg.innerText = result.status === 'passed' 
            ? t('challenges.common.passed_msg', 'Challenge completed successfully!')
            : t('challenges.common.failed_msg', 'Challenge failed.');
        infoBoxContent.append(statusMsg);
    }

    // Dynamically offer quiz/challenge if available for this context
    const quizPath = getQuizPath();
    if (quizPath) {
        const startQuizBtn = create('button');
        const btnLabelKey = result 
            ? 'challenges.common.retry_button' 
            : 'challenges.flood.crisis_staff.start_button';
        
        startQuizBtn.innerText = t(btnLabelKey, result ? 'Retry' : 'Start Challenge');
        
        startQuizBtn.addEventListener('click', async () => {
            await startQuiz(quizPath);
        });
        infoBoxControls.append(startQuizBtn);
    }
}

/**
 * Resets the application state and returns to the home screen.
 */
export async function resetApp(): Promise<void> {
    app.currentScenario = null;
    app.currentRole = null;
    app.activeLayers.clear();
    app.view = 'home';
    await updateView();
}
