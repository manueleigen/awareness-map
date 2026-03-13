import { initApp, updateView, resetApp } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { Language } from "../modules/types.js";
import { app } from "../modules/state.js";

/**
 * List of CSS selectors for elements that should remain interactive.
 * All other areas will have touch events blocked to prevent accidental input.
 */
const INTERACTIVE_SELECTORS = [
    'button',
    'input',
    'label',
    'a',
    '#language-switch',
    '#escape-btn',
    '.poi-marker',
    '.poi-overlay-content',
    '.poi-close-btn',
    '.toggleSwitch',
    '.slider-wrapper',
    'polygon',
].join(',');

/**
 * Blocks touch events on non-interactive areas.
 * This is crucial for large touch-tables to prevent resting hands 
 * from interfering with the application.
 */
function setupTouchGuard(): void {
    document.addEventListener('touchstart', (e: TouchEvent) => {
        const target = e.target as Element;
        // If the touch target is not an interactive element, prevent the default behavior
        if (target && !target.closest(INTERACTIVE_SELECTORS)) {
            e.preventDefault();
        }
    }, { passive: false });
}

/**
 * Initializes global UI listeners like the language switch and escape button.
 */
function setupGlobalListeners(): void {
    const { languageSwitch, escapeBtn } = app.ui;

    // Handle language toggle (DE/EN)
    if (languageSwitch) {
        languageSwitch.checked = app.language === "de";
        languageSwitch.addEventListener('change', async () => {
            try {
                const nextLang: Language = languageSwitch.checked ? "de" : "en";
                await setLanguage(nextLang);
                await updateView();
            } catch (err) {
                console.error("Error during language switch:", err);
            }
        });

        // Allow clicking the container to toggle the switch
        const langContainer = languageSwitch.closest('#language-switch');
        if (langContainer) {
            langContainer.addEventListener('click', (e) => {
                if ((e.target as Element).closest('.switch')) return;
                languageSwitch.checked = !languageSwitch.checked;
                languageSwitch.dispatchEvent(new Event('change'));
            });
        }
    }

    // Reset the application to the home screen
    if (escapeBtn) {
        escapeBtn.addEventListener('click', () => {
            resetApp();
        });
    }
}

/**
 * Main Entry Point: Initialize the application modules and setup global listeners.
 */
initApp().then(() => {
    setupTouchGuard();
    setupGlobalListeners();
});
