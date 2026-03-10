import { initApp, updateView } from "../modules/main.js";
import { setLanguage } from "../modules/translater.js";
import { renderLayers } from "../modules/layers.js";
import { Language } from "../modules/types.js";
import { app } from "../data/data.js";
import { el } from "../modules/lib.js";

function setupGlobalListeners(): void {
    const langSwitch = el<HTMLInputElement>('#language-switch input');
    if (langSwitch) {
        langSwitch.checked = app.language === "de";
        langSwitch.addEventListener('change', async () => {
            try {
                const nextLang: Language = langSwitch.checked ? "de" : "en";
                await setLanguage(nextLang);
                renderLayers();
                updateView();
            } catch (err) {
                console.error("Fehler beim Sprachwechsel:", err);
            }
        });
    }
}

// Start the app
initApp().then( setupGlobalListeners );
