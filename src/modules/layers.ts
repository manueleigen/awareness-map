import { app } from '../data/data.js';
import { create, el, loadYAML } from './lib.js';
import { t } from './translater.js';
import { LayerConfig, ProjectContext, ContextLayer } from './types.js';

let layerDefinitions: LayerConfig[] = [];
let context: ProjectContext | null = null;

export async function initLayers(): Promise<void> {
    try {
        const [layerData, ctxWrapper] = await Promise.all([
            loadYAML<{ layers: LayerConfig[] }>('/config/layers.yaml'),
            loadYAML<{ contexts: ProjectContext }>('/config/context.yaml')
        ]);
        
        layerDefinitions = layerData.layers;
        context = ctxWrapper.contexts;
        
        renderLayers();
    } catch (error) {
        console.error("Fehler beim Initialisieren der Layer:", error);
    }
}

export function renderLayers(): void {
    const layerContainer = el('#layers');
    const layerControl = el('#layer-control');
    if (!layerContainer || !layerControl || !context) return;

    layerContainer.innerHTML = '';
    layerControl.innerHTML = '';

    const availableLayers = getAvailableLayers();

    availableLayers.forEach(config => {
        const ctxLayer = getContextLayer(config.id);
        if (ctxLayer || config.always_available) {
            buildLayerUI(config, ctxLayer, layerContainer, layerControl);
        }
    });
}

function getAvailableLayers(): LayerConfig[] {
    if (!context) return [];
    const availableIds = new Set<string>();

    const globalLayers = context.global?.layers || {};
    Object.keys(globalLayers).forEach(id => availableIds.add(id));

    if (app.currentScenario && context.scenarios?.[app.currentScenario]) {
        const scenarioLayers = context.scenarios[app.currentScenario].layers || {};
        Object.keys(scenarioLayers).forEach(id => availableIds.add(id));

        const currentRole = app.currentRole;
        if (currentRole && context.scenarios[app.currentScenario].roles?.[currentRole]) {
            const roleLayers = context.scenarios[app.currentScenario].roles[currentRole].layers || {};
            Object.keys(roleLayers).forEach(id => availableIds.add(id));
        }
    }

    return layerDefinitions.filter(d => availableIds.has(d.id));
}

function getContextLayer(id: string): ContextLayer | null {
    if (!context) return null;
    
    if (app.currentScenario && app.currentRole) {
        const roleLayer = context.scenarios[app.currentScenario]?.roles?.[app.currentRole]?.layers?.[id];
        if (roleLayer) return roleLayer;
    }

    if (app.currentScenario) {
        const scenarioLayer = context.scenarios[app.currentScenario]?.layers?.[id];
        if (scenarioLayer) return scenarioLayer;
    }

    return context.global?.layers?.[id] || null;
}

function buildLayerUI(config: LayerConfig, ctxLayer: ContextLayer | null, parent: HTMLElement, controlParent: HTMLElement): void {
    const isVisible = ctxLayer?.always_visible || app.activeLayers.has(config.id);
    
    const wrapper = create("div");
    wrapper.className = `layer ${isVisible ? '' : 'hidden'}`;
    wrapper.id = `layer-${config.id}`;

    // Pfad-Logik: IMMER aus dem context.yaml nehmen
    const src = ctxLayer?.src;

    if (src) {
        switch(config.type) {
            case 'static-image':
                const img = create("img");
                img.src = src;
                img.onerror = () => console.warn(`Bild fehlt: ${src}`);
                wrapper.append(img);
                break;

            case 'dynamic-image':
                const player = create('dotlottie-wc' as any);
                player.setAttribute('src', src);
                player.setAttribute('autoplay', 'true');
                player.setAttribute('loop', 'true');
                wrapper.append(player);
                break;

            case 'locations':
                const poiContainer = create("div");
                poiContainer.className = "poi-container";
                poiContainer.innerText = `[POI Layer: ${config.id}]`;
                wrapper.append(poiContainer);
                break;
        }
        parent.append(wrapper);
    }

    // Toggle-Schalter
    if (config.toggleable) {
        const toggle = create('div');
        toggle.className = `toggleSwitch ${isVisible ? 'active' : ''}`;
        
        const icon = create('img');
        // Icon ebenfalls aus dem Context nehmen, sonst Fallback
        icon.src = ctxLayer?.icon || '/assets/global/default_icon.svg';
        icon.onerror = () => icon.src = '/assets/global/default_icon.svg';
        toggle.append(icon);

        const label = create('label');
        label.innerText = t(config.title_key);
        toggle.append(label);

        toggle.addEventListener('click', () => {
            const nowActive = !app.activeLayers.has(config.id);
            if (nowActive) app.activeLayers.add(config.id);
            else app.activeLayers.delete(config.id);

            toggle.classList.toggle('active', nowActive);
            wrapper.classList.toggle('hidden', !nowActive);
        });

        controlParent.append(toggle);
    }

    if (isVisible) app.activeLayers.add(config.id);
}
