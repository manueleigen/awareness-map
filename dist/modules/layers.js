import { app } from './state.js';
import { create, loadJSON, loadYAML, loadTEXT } from './lib.js';
import { t } from './translater.js';
let layerDefinitions = [];
let context = null;
export async function initLayers() {
    try {
        const [layerData, ctxWrapper] = await Promise.all([
            loadYAML('/config/layers.yaml'),
            loadYAML('/config/context.yaml')
        ]);
        layerDefinitions = layerData.layers;
        context = ctxWrapper.contexts;
        renderLayers();
    }
    catch (error) {
        console.error("Fehler beim Initialisieren der Layer:", error);
    }
}
export function renderLayers() {
    const { layers: layerContainer, layerControl } = app.ui;
    if (!layerContainer || !layerControl || !context)
        return;
    layerContainer.innerHTML = '';
    layerControl.innerHTML = '';
    const availableLayers = getAvailableLayers();
    availableLayers.forEach(config => {
        const ctxLayer = getContextLayer(config.id);
        buildLayerUI(config, ctxLayer, layerContainer, layerControl);
    });
}
function getAvailableLayers() {
    if (!context)
        return [];
    const availableIds = new Set();
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
function getContextLayer(id) {
    if (!context)
        return null;
    if (app.currentScenario && app.currentRole) {
        const roleLayer = context.scenarios[app.currentScenario]?.roles?.[app.currentRole]?.layers?.[id];
        if (roleLayer)
            return roleLayer;
    }
    if (app.currentScenario) {
        const scenarioLayer = context.scenarios[app.currentScenario]?.layers?.[id];
        if (scenarioLayer)
            return scenarioLayer;
    }
    return context.global?.layers?.[id] || null;
}
async function buildLayerUI(config, ctxLayer, parent, controlParent) {
    const isVisible = ctxLayer?.always_visible || app.activeLayers.has(config.id);
    const wrapper = create("div");
    // @ts-ignore
    wrapper.className = `layer ${isVisible ? '' : 'hidden'} ${config.class ? config.class : ''}`;
    wrapper.className += ` layer-${config.type}`;
    wrapper.id = `layer-${config.id}`;
    const src = ctxLayer?.src;
    if (src) {
        switch (config.type) {
            case 'static-image':
                const img = create("img");
                img.src = src;
                img.onerror = () => console.warn(`Bild fehlt: ${src}`);
                wrapper.append(img);
                break;
            case 'areas':
                const areaWrapper = create("div");
                const svg = await loadTEXT(src);
                areaWrapper.innerHTML = svg;
                const polygons = areaWrapper.querySelectorAll('polygon');
                polygons.forEach(obj => {
                    obj.addEventListener('click', function () {
                        obj.classList.toggle('active');
                    });
                });
                areaWrapper.onerror = () => console.warn(`Bild fehlt: ${src}`);
                wrapper.append(areaWrapper);
                break;
            case 'dynamic-image':
                const player = create('dotlottie-wc');
                player.setAttribute('src', src);
                player.setAttribute('autoplay', 'true');
                player.setAttribute('loop', 'true');
                wrapper.append(player);
                break;
            case 'locations':
                const poiContainer = create("div");
                poiContainer.className = "poi-container";
                // Asynchrones Laden der Standorte
                loadJSON(src).then(data => {
                    data.locations.forEach(loc => {
                        const marker = create("div");
                        marker.className = "poi-marker";
                        marker.style.left = `${loc.x}px`;
                        marker.style.top = `${loc.y}px`;
                        marker.title = loc.translations.name[app.language];
                        // Klick-Event für spätere Detailansicht
                        marker.addEventListener('click', () => {
                            console.log("POI ausgewählt:", loc.translations.name[app.language]);
                        });
                        poiContainer.append(marker);
                    });
                }).catch(err => {
                    console.warn(`Fehler beim Laden der POIs für ${config.id}:`, err);
                });
                wrapper.append(poiContainer);
                break;
        }
        parent.append(wrapper);
    }
    // Toggle-Schalter
    if (config.toggle == 'available' || config.toggle == 'deactivated') {
        const toggle = create('div');
        toggle.className = `toggleSwitch ${isVisible ? 'active' : ''}`;
        const icon = create('img');
        // Icon ebenfalls aus dem Context nehmen, sonst Fallback
        icon.src = ctxLayer?.icon || '/assets/global/default_icon.svg';
        icon.onerror = () => icon.src = '/assets/global/default_icon.svg';
        toggle.append(icon);
        const label = create('label');
        label.innerText = config.title_key ? t(config.title_key, "Layer") : "Layer";
        toggle.append(label);
        if (config.toggle == 'available') {
            toggle.addEventListener('click', () => {
                const nowActive = !app.activeLayers.has(config.id);
                if (nowActive)
                    app.activeLayers.add(config.id);
                else
                    app.activeLayers.delete(config.id);
                toggle.classList.toggle('active', nowActive);
                wrapper.classList.toggle('hidden', !nowActive);
            });
        }
        controlParent.append(toggle);
    }
    if (isVisible)
        app.activeLayers.add(config.id);
}
