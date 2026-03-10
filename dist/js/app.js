import { initApp, updateView, resetApp } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { renderLayers } from "../modules/layers.js";
import { app } from "../data/data.js";
import { el } from "../modules/lib.js";
function setupGlobalListeners() {
    const langSwitch = el('#language-switch input');
    if (langSwitch) {
        langSwitch.checked = app.language === "de";
        langSwitch.addEventListener('change', async () => {
            try {
                const nextLang = langSwitch.checked ? "de" : "en";
                await setLanguage(nextLang);
                renderLayers();
                updateView();
            }
            catch (err) {
                console.error("Fehler beim Sprachwechsel:", err);
            }
        });
    }
    const escapeBtn = el('#escape-btn');
    if (escapeBtn) {
        escapeBtn.addEventListener('click', () => {
            resetApp();
        });
    }
}
// Start the app
initApp().then(setupGlobalListeners);
