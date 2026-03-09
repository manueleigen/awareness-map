import { initLayers, renderLayers } from "../modules/layers.js";
import { initTranslator, setLanguage, t } from "../modules/translater.js";
import { Language } from "../modules/types.js";
import { app } from "../data/data.js";
import { el, create } from "../modules/lib.js";

async function init() {
    try {
        console.log("App Initialisierung gestartet...");
        
        // 1. Translator initialisieren
        await initTranslator(app.language as Language).catch(err => {
            console.error("Sprachdateien konnten nicht geladen werden:", err);
        });
        
        // 2. Layer initialisieren
        await initLayers().catch(err => {
            console.error("Layer-Konfiguration konnte nicht geladen werden:", err);
        });

        // 3. UI Listeners setup
        setupGlobalListeners();
        
        // 4. Initialer Render
        updateView();
        
        console.log("App erfolgreich initialisiert.");
    } catch (globalError) {
        console.error("Kritischer Fehler bei der App-Initialisierung:", globalError);
        const appContainer = el('#app');
        if (appContainer) {
            appContainer.innerHTML = `<div style="color: white; padding: 20px;">
                <h2>System-Fehler</h2>
                <p>Die Anwendung konnte nicht korrekt geladen werden. Bitte prüfen Sie die Konfiguration.</p>
            </div>`;
        }
    }
}

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

function updateView(): void {
    const infoBox = el('#info-box');
    if (!infoBox) return;
    
    switch(app.view) {
        case 'home':
            renderHome();
            break;
    }
}

function renderHome(): void {
    const infoBox = el('#info-box');
    if (!infoBox) return;

    let title = el('#app-title');
    if (!title) {
        title = create('h1');
        title.id = 'app-title';
        infoBox.append(title);
    }
    title.innerText = t('home.headline');

    const text = create('p');
    text.innerText = t('home.description');

    const btn = create('button');
    text.innerText = t('home.description');

    

    infoBox.append(text);

}

// Global "Start" for the app
init();
