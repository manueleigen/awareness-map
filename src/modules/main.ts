import { initLayers, renderLayers } from "./layers.js";
import { initTranslator, t } from "./translater.js";
import { initScenarios, renderScenarioSelection, renderRoleSelection } from "./scenarios.js";
import { Language } from "./types.js";
import { app } from "../data/data.js";
import { el, create } from "./lib.js";

export async function initApp() {
    try {
        console.log("App Initialisierung gestartet...");
        
        // 1. Translator initialisieren
        await initTranslator(app.language as Language).catch(err => {
            console.error("Sprachdateien konnten nicht geladen werden:", err);
        });
        
        // 2. Scenarios initialisieren
        await initScenarios();

        // 3. Layer initialisieren
        await initLayers().catch(err => {
            console.error("Layer-Konfiguration konnte nicht geladen werden:", err);
        });

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

export function updateView(): void {
    const infoBoxContent = el('#info-box-content');
    const escapeBtn = el('#escape-btn');
    if (!infoBoxContent) return;

    // Toggle escape button visibility: hidden on home, visible otherwise
    if (escapeBtn) {
        if (app.view === 'home') {
            escapeBtn.classList.add('hidden');
        } else {
            escapeBtn.classList.remove('hidden');
        }
    }
    
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
    }
}

export function renderHome(): void {
    const infoBoxContent = el('#info-box-content');
    if (!infoBoxContent) return;

    infoBoxContent.innerHTML = '';

    const title = create('h1');
    title.id = 'app-title';
    title.innerText = t('home.headline');

    const text = create('p');
    text.innerText = t('home.description');

    const btn = create('button');
    btn.innerText = t('navigation.start');
    btn.addEventListener('click', () => {
        app.view = 'scenario-select';
        updateView();
    });

    infoBoxContent.append(title, text, btn);
}

export function renderMapUI(): void {
    const infoBoxContent = el('#info-box-content');
    if (!infoBoxContent) return;

    infoBoxContent.innerHTML = '';

    const title = create('h2');
    title.innerText = t(`roles.${app.currentRole}.title`);

    const desc = create('p');
    desc.innerText = t(`roles.${app.currentRole}.short_description`);

    const backBtn = create('button');
    backBtn.innerText = t('navigation.back');
    backBtn.addEventListener('click', () => {
        app.currentRole = null;
        app.view = 'role-select';
        updateView();
    });

    infoBoxContent.append(title, desc, backBtn);
    renderLayers(); // Ensure layers are updated for the new role/scenario
}

export function resetApp(): void {
    app.currentScenario = null;
    app.currentRole = null;
    app.activeLayers.clear();
    app.view = 'home';
    updateView();
    renderLayers();
}
