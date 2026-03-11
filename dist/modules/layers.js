import { app } from './state.js';
import { create, loadJSON, loadYAML, loadTEXT } from './lib.js';
import { t } from './translater.js';
import { buildSlider, updateThumbPosition, waitForPlayerReady } from './time-slider.js';
let layerDefinitions = [];
let context = null;
export async function initLayers() {
    try {
        const [layerData, ctxWrapper] = await Promise.all([
            loadYAML('/config/layers.yaml'),
            loadYAML('/config/context.yaml')
        ]);
        layerDefinitions = layerData?.layers || [];
        context = ctxWrapper?.contexts || null;
        await renderLayers();
    }
    catch (error) {
        console.error("Fehler beim Initialisieren der Layer:", error);
    }
}
export async function renderLayers() {
    const { layers: layerContainer, layerControl, slidersContainer } = app.ui;
    if (!layerContainer || !layerControl || !context)
        return;
    // Reset UI
    layerContainer.innerHTML = '';
    layerControl.innerHTML = '';
    if (slidersContainer)
        slidersContainer.innerHTML = '';
    // 1. Sync active state based on current context before rendering
    syncActiveLayers();
    const availableLayers = getAvailableLayers();
    for (const config of availableLayers) {
        const ctxLayer = getContextLayer(config.id);
        await buildLayerUI(config, ctxLayer, layerContainer, layerControl);
    }
}
/**
 * Ensures app.activeLayers contains all layers marked as initially_visible
 * in the current context (global + scenario + role) depending on the view.
 */
function syncActiveLayers() {
    if (!context)
        return;
    const processLayerMap = (layerMap) => {
        Object.entries(layerMap).forEach(([id, ctx]) => {
            if (ctx.initially_visible) {
                app.activeLayers.add(id);
            }
        });
    };
    // 1. Global (Always processed)
    if (context.global?.layers)
        processLayerMap(context.global.layers);
    // 2. Scenario (Processed if scenario is active and we're not on home)
    if (app.currentScenario && app.view !== 'home' && context.scenarios?.[app.currentScenario]) {
        const scenario = context.scenarios[app.currentScenario];
        if (scenario.layers)
            processLayerMap(scenario.layers);
        // 3. Role (Processed if role is active and view is role-select or map)
        if (app.currentRole && (app.view === 'role-select' || app.view === 'map') && scenario.roles?.[app.currentRole]) {
            const role = scenario.roles[app.currentRole];
            if (role.layers)
                processLayerMap(role.layers);
        }
    }
}
function getAvailableLayers() {
    if (!context)
        return [];
    const availableIds = new Set();
    // 1. Global Layers
    const globalLayers = context.global?.layers || {};
    Object.keys(globalLayers).forEach(id => availableIds.add(id));
    // 2. Scenario Layers (if a scenario is active)
    if (app.currentScenario && (app.view !== 'home')) {
        const scenarioLayers = context.scenarios?.[app.currentScenario]?.layers || {};
        Object.keys(scenarioLayers).forEach(id => availableIds.add(id));
        // 3. Role/Challenge Layers (if a role is active)
        if (app.currentRole && (app.view === 'role-select' || app.view === 'map')) {
            const roleLayers = context.scenarios[app.currentScenario].roles?.[app.currentRole]?.layers || {};
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
    if (ctxLayer?.initially_visible && !app.activeLayers.has(config.id)) {
        app.activeLayers.add(config.id);
    }
    const isVisible = app.activeLayers.has(config.id);
    const wrapper = create("div");
    // @ts-ignore
    wrapper.className = `layer ${isVisible ? '' : 'hidden'} ${config.class || ''}`;
    wrapper.className += ` layer-${config.type}`;
    wrapper.id = `layer-${config.id}`;
    const src = ctxLayer?.src;
    if (src) {
        switch (config.type) {
            case 'static-image':
                const img = create("img");
                img.src = src;
                img.onerror = () => {
                    console.warn(`Bild fehlt oder fehlerhaft: ${src}`);
                    img.style.display = 'none';
                };
                wrapper.append(img);
                break;
            case 'areas':
                const areaWrapper = create("div");
                const svg = await loadTEXT(src);
                if (svg) {
                    areaWrapper.innerHTML = svg;
                    areaWrapper.querySelectorAll('polygon').forEach(obj => {
                        obj.addEventListener('click', () => obj.classList.toggle('active'));
                    });
                    wrapper.append(areaWrapper);
                }
                break;
            case 'dynamic-image':
                const player = create('dotlottie-wc');
                player.id = `player-${config.id}`;
                player.setAttribute('src', src);
                player.setAttribute('autoplay', 'true');
                player.setAttribute('loop', 'true');
                if (config.playback_control) {
                    waitForPlayerReady(player).then(core => core.pause()).catch(() => { });
                }
                wrapper.append(player);
                break;
            case 'locations':
                const poiContainer = create("div");
                poiContainer.className = "poi-container";
                const data = await loadJSON(src);
                if (data && data.locations) {
                    data.locations.forEach(loc => {
                        const marker = create("div");
                        marker.className = "poi-marker";
                        marker.style.left = `${loc.x}px`;
                        marker.style.top = `${loc.y}px`;
                        marker.title = loc.translations?.name?.[app.language] || "POI";
                        marker.addEventListener('click', () => console.log("POI ausgewählt:", marker.title));
                        poiContainer.append(marker);
                    });
                }
                wrapper.append(poiContainer);
                break;
        }
        parent.append(wrapper);
    }
    if (config.toggle === 'available' || config.toggle === 'deactivated') {
        const toggle = create('div');
        toggle.className = `toggleSwitch ${isVisible ? 'active' : ''}`;
        const icon = create('img');
        const iconSrc = ctxLayer?.icon || '/assets/icons/default_icon.svg';
        icon.src = iconSrc;
        icon.onerror = () => { icon.src = '/assets/icons/default_icon.svg'; };
        toggle.append(icon);
        const label = create('label');
        label.innerText = config.title_key ? t(config.title_key, "Layer") : "Layer";
        toggle.append(label);
        controlParent.append(toggle);
        let sliderUI = null;
        if (config.playback_control && app.ui.slidersContainer) {
            sliderUI = buildSlider(config, ctxLayer);
            sliderUI.classList.toggle('hidden', !isVisible);
            app.ui.slidersContainer.append(sliderUI);
        }
        if (config.toggle === 'available') {
            toggle.addEventListener('click', () => {
                const nowActive = !app.activeLayers.has(config.id);
                if (nowActive)
                    app.activeLayers.add(config.id);
                else
                    app.activeLayers.delete(config.id);
                toggle.classList.toggle('active', nowActive);
                wrapper.classList.toggle('hidden', !nowActive);
                if (sliderUI) {
                    sliderUI.classList.toggle('hidden', !nowActive);
                    if (nowActive) {
                        const range = sliderUI.querySelector('input');
                        const thumbIcon = sliderUI.querySelector('.slider-thumb-icon');
                        if (range && thumbIcon)
                            updateThumbPosition(range, thumbIcon);
                    }
                }
            });
        }
    }
}
