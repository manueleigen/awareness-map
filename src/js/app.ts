import { initApp, updateView, resetApp } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { Language } from "../modules/types.js";
import { app } from "../modules/state.js";

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
    }

    if (escapeBtn) {
        escapeBtn.addEventListener('click', () => {
            resetApp();
        });
    }

    
}

// Start the app
initApp().then( setupGlobalListeners );
