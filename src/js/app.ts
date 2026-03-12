import { initApp, updateView, resetApp } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { Language } from "../modules/types.js";
import { app } from "../modules/state.js";

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
 * Blocks touch events on non-interactive areas so that
 * resting hands on the multitouch screen don't interfere.
 * Only whitelisted interactive elements receive touch input.
 */
function setupTouchGuard(): void {
    document.addEventListener('touchstart', (e: TouchEvent) => {
        const target = e.target as Element;
        if (target && !target.closest(INTERACTIVE_SELECTORS)) {
            e.preventDefault();
        }
    }, { passive: false });
}

function setupGlobalListeners(): void {
    const { languageSwitch, escapeBtn } = app.ui;

    if (languageSwitch) {
        languageSwitch.checked = app.language === "de";
        languageSwitch.addEventListener('change', async () => {
            try {
                const nextLang: Language = languageSwitch.checked ? "de" : "en";
                await setLanguage(nextLang);
                await updateView();
            } catch (err) {
                console.error("Fehler beim Sprachwechsel:", err);
            }
        });

        const langContainer = languageSwitch.closest('#language-switch');
        if (langContainer) {
            langContainer.addEventListener('click', (e) => {
                if ((e.target as Element).closest('.switch')) return;
                languageSwitch.checked = !languageSwitch.checked;
                languageSwitch.dispatchEvent(new Event('change'));
            });
        }
    }

    if (escapeBtn) {
        escapeBtn.addEventListener('click', () => {
            resetApp();
        });
    }
}

// Start the app
initApp().then(() => {
    setupTouchGuard();
    setupGlobalListeners();
});
