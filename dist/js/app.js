import { initLayers } from "../modules/layers.js";
import { createTranslator } from "../modules/translater.js";
import { app } from "../data/data.js";
import { el, group } from "../modules/lib.js";
const translator = createTranslator({
    languages: ["de", "en"],
    filesLocation: "/i18n"
});
async function init() {
    // Initialisiere mit der aktuellen Sprache aus dem app-Objekt
    await translator.load(app.language);
    await initLayers();
    // Event-Listener für den Sprachwechsel (Checkbox)
    const langSwitch = el('#language-switch input');
    if (langSwitch) {
        langSwitch.checked = app.language === "de";
        langSwitch.addEventListener('change', async () => {
            const nextLang = langSwitch.checked ? "de" : "en";
            await translator.load(nextLang);
            group(".lm-swap").forEach((item) => {
                const translations = JSON.parse(item.dataset.translations ? item.dataset.translations : "");
                item.innerText = translations[app.language];
            });
        });
    }
}
init();
