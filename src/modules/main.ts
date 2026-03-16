import { initLayers, renderLayers, resetLayers } from "./layers.js";
import { initTranslator, t } from "./translater.js";
import { initScenarios, renderScenarioSelection, renderRoleSelection, getQuizPath } from "./scenarios.js";
import { Language } from "./types.js";
import { app } from "./state.js";
import { el, create } from "./lib.js";
import { addPointerClick } from './interactions.js';
import { startQuiz } from "./engine.js";
import { initDualScale } from './screen-zoom.js';
import { hidePOIOverlay } from './poi.js';
import { startBackgroundPreload } from './preloader.js';

/**
 * Technical Implementation Guide (v2.3): Viewport "Ironclad" Lockdown.
 * Prevents native browser behaviors from interfering with the custom 4K experience.
 */
function lockViewport(): void {
    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Disable mouse wheel zoom (Ctrl + Scroll)
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) e.preventDefault();
    }, { passive: false });

    // Disable iOS Safari pinch-to-zoom gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // Ensure user-select is disabled globally
    document.body.style.userSelect = 'none';
}

/**
 * Environmental Stability: Stale Pointer Watchdog.
 * Public screens experience sensor drift. If a pointer stays active for > 60s
 * without movement, we force-release it.
 */
function initWatchdog(): void {
    const activePointers = new Map<number, { lastMove: number, target: HTMLElement }>();
    
    document.addEventListener('pointerdown', (e) => {
        activePointers.set(e.pointerId, { lastMove: Date.now(), target: e.target as HTMLElement });
    }, true);

    document.addEventListener('pointermove', (e) => {
        if (activePointers.has(e.pointerId)) {
            activePointers.get(e.pointerId)!.lastMove = Date.now();
        }
    }, true);

    const cleanup = (id: number) => activePointers.delete(id);
    document.addEventListener('pointerup', (e) => cleanup(e.pointerId), true);
    document.addEventListener('pointercancel', (e) => cleanup(e.pointerId), true);

    // Monitor stale pointers every 5 seconds
    setInterval(() => {
        const now = Date.now();
        activePointers.forEach((data, id) => {
            if (now - data.lastMove > 60000) { // 60 seconds
                console.warn(`[Watchdog] Releasing stale pointer ${id} from`, data.target);
                if (data.target && typeof data.target.releasePointerCapture === 'function') {
                    try { data.target.releasePointerCapture(id); } catch(e) {}
                }
                activePointers.delete(id);
            }
        });
    }, 5000);
}

/**
 * Environmental Stability: Daily Refresh.
 * Perform a full reload every 24 hours at 4:00 AM to clear GPU memory and JS heap.
 */
function initDailyRefresh(): void {
    const checkTime = () => {
        const now = new Date();
        if (now.getHours() === 4 && now.getMinutes() === 0) {
            console.log("[System] Scheduled daily refresh (4:00 AM). Reloading...");
            window.location.reload();
        }
    };
    setInterval(checkTime, 60000); // Check every minute
}

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
        
        // Technical Implementation Guide (v2.3) initialization
        lockViewport();
        initWatchdog();
        initDailyRefresh();

        // 0. Cache UI References
        initUIReferences();

        // Global Event Listeners
        document.addEventListener('app-request-view-update', async () => {
            await updateView();
        });

        // Global Click-to-close POI Overlay logic
        // Technical Implementation Guide (v2.3): Standardize on Pointer API
        document.addEventListener('pointerup', (e) => {
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

        // 6. Start background preloading of non-critical assets
        startBackgroundPreload();
        
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
    addPointerClick(btn, async () => {
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
        
        addPointerClick(startQuizBtn, async () => {
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
    app.view = 'home';
    
    // Comprehensive layer reset (clears areas, restores initial visibility)
    await resetLayers();
    
    await updateView();
}
