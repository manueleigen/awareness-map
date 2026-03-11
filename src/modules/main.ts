import { initLayers, renderLayers } from "./layers.js";
import { initTranslator, t } from "./translater.js";
import { initScenarios, renderScenarioSelection, renderRoleSelection } from "./scenarios.js";
import { Language } from "./types.js";
import { app } from "./state.js";
import { el, create } from "./lib.js";

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

export async function initApp() {
    try {
        console.log("App Initialisierung gestartet...");
        
        // 0. UI References initialisieren
        initUIReferences();
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
        await updateView();
        
        console.log("App erfolgreich initialisiert.");
    } catch (globalError) {
        console.error("Kritischer Fehler bei der App-Initialisierung:", globalError);
        const appContainer = app.ui.app;
        if (appContainer) {
            appContainer.innerHTML = `<div style="color: white; padding: 20px;">
                <h2>System-Fehler</h2>
                <p>Die Anwendung konnte nicht korrekt geladen werden. Bitte prüfen Sie die Konfiguration.</p>
            </div>`;
        }
    }
}

export async function updateView(): Promise<void> {
    const { infoBoxContent, escapeBtn } = app.ui;
    if (!infoBoxContent) return;

    console.log("view", app.view)
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

    // Ensure layers are always synced with the current view
    await renderLayers();
}

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

export function renderMapUI(): void {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls) return;

    infoBoxContent.innerHTML = '';
    infoBoxControls.innerHTML = '';
    
    const title = create('h2');
    title.innerText = t(`roles.${app.currentRole}.title`);
    
    const desc = create('p');
    desc.innerText = t(`roles.${app.currentRole}.short_description`);

    const backBtn = create('button');
    backBtn.innerText = t('navigation.back');
    backBtn.addEventListener('click', async () => {
        app.currentRole = null;
        app.view = 'role-select';
        await updateView();
    });

    infoBoxContent.append(title, desc);
    infoBoxControls.append(backBtn);
}

export async function resetApp(): Promise<void> {
    app.currentScenario = null;
    app.currentRole = null;
    app.activeLayers.clear();
    app.view = 'home';
    await updateView();
}
