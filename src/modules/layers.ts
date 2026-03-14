import { app } from './state.js';
import { create, loadJSON, loadYAML, loadTEXT } from './lib.js';
import { t } from './translater.js';
import { LayerConfig, ContextLayer, ProjectContext } from './types.js';
import { buildSlider, updateThumbPosition, waitForPlayerReady } from './time-slider.js';
import { renderPOILayer } from './poi.js';

/** Local cache for layer definitions and project context. */
let layerDefinitions: LayerConfig[] = [];
let context: ProjectContext | null = null;

/** Map to store created layer DOM elements for reuse. */
const layerElements = new Map<string, HTMLElement>();
/** Map to store slider elements associated with layers. */
const sliderElements = new Map<string, HTMLElement>();

const EYE_VISIBLE = `<svg fill="currentColor" viewBox="0 0 121.025 121.025" xmlns="http://www.w3.org/2000/svg"><g><path d="M1.35,64.212c7.9,9.9,31.4,36.3,59.2,36.3c27.8,0,51.3-26.399,59.2-36.3c1.699-2.2,1.699-5.3,0-7.399c-7.9-9.9-31.4-36.3-59.2-36.3c-27.8-0.1-51.3,26.3-59.2,36.2C-0.45,58.913-0.45,62.012,1.35,64.212z M60.55,36.413c13.3,0,24,10.7,24,24s-10.7,24-24,24c-13.3,0-24-10.7-24-24S47.25,36.413,60.55,36.413z"/><circle cx="60.55" cy="60.413" r="12"/></g></svg>`;
const EYE_HIDDEN = `<svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M234.35254,160.8125a12.00024,12.00024,0,1,1-20.78516,12l-16.2771-28.19189a127.01451,127.01451,0,0,1-29.36694,13.47021l5.18994,29.43164a11.99973,11.99973,0,1,1-23.63476,4.168l-5.053-28.6543a140.4304,140.4304,0,0,1-32.94116-.01074l-5.05176,28.65234a11.99973,11.99973,0,0,1-23.63477-4.168l5.19165-29.44483A127.0154,127.0154,0,0,1,58.665,144.59326L42.28125,172.9707a12.00024,12.00024,0,0,1-20.78516-12l17.85523-30.92578A153.16947,153.16947,0,0,1,22.665,112.416,11.99959,11.99959,0,0,1,41.333,97.334C57.05859,116.79785,84.8584,140,128,140c43.14063,0,70.94043-23.20215,86.666-42.666a11.99959,11.99959,0,1,1,18.668,15.082,153.08978,153.08978,0,0,1-16.72509,17.66406Z"/></svg>`;

/**
 * Initializes the layer system with high performance in mind.
 */
export async function initLayers(): Promise<void> {
    try {
        const [layerData, ctxWrapper] = await Promise.all([
            loadYAML<{ layers: LayerConfig[] }>('/config/layers.yaml'),
            loadYAML<{ contexts: ProjectContext }>('/config/context.yaml')
        ]);
        
        layerDefinitions = layerData?.layers || [];
        context = ctxWrapper?.contexts || null;
        
        // 1. Build immediately visible layers
        await buildInitialLayers();
        
        // 2. Perform initial visibility sync
        await renderLayers();

        // 3. Queue remaining layers for background preloading
        queueBackgroundPreload();
    } catch (error) {
        console.error("Failed to initialize layers:", error);
    }
}

async function buildInitialLayers(): Promise<void> {
    const available = getAvailableLayers();
    for (const config of available) {
        if (!layerElements.has(config.id)) {
            await ensureLayerBuilt(config.id);
        }
    }
}

function queueBackgroundPreload(): void {
    const remaining = layerDefinitions.filter(d => !layerElements.has(d.id));
    
    const preloadNext = () => {
        if (remaining.length === 0) return;
        const next = remaining.shift();
        if (next) {
            const schedule = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 500));
            schedule(() => {
                ensureLayerBuilt(next.id).then(() => preloadNext());
            });
        }
    };
    
    preloadNext();
}

async function ensureLayerBuilt(id: string): Promise<HTMLElement | null> {
    if (layerElements.has(id)) return layerElements.get(id)!;

    const config = layerDefinitions.find(d => d.id === id);
    const ctxLayer = findAnyContextLayer(id);
    if (!config || !ctxLayer || !app.ui.layers) return null;

    const wrapper = create("div");
    wrapper.className = `layer hidden ${config.class || ''} layer-${config.type}`;
    wrapper.id = `layer-${config.id}`;

    const src = ctxLayer?.src;
    if (src) {
        switch(config.type) {
            case 'static-image':
                const img = create("img");
                img.src = src;
                img.onload = () => console.log(`[Image] ${src.split('/').pop()} loaded`);
                img.onerror = () => { console.warn(`Image missing or broken: ${src}`); img.style.display = 'none'; };
                wrapper.append(img);
                break;
            case 'areas':
                const svg = await loadTEXT(src);
                if (svg) {
                    const areaWrapper = create('div')
                    areaWrapper.innerHTML = svg as string;
                    wrapper.querySelectorAll('polygon').forEach(obj => {
                        obj.addEventListener('click', () => obj.classList.toggle('active'));
                    });
                }
                break;

            
            case 'dynamic-image':
                const player = create('dotlottie-wc' as any);
                player.id = `player-${config.id}`;
                player.setAttribute('src', src);
                player.setAttribute('autoplay', 'true');
                player.setAttribute('loop', 'true');
                wrapper.append(player);
                break;
            case 'locations':
                const poiContainer = await renderPOILayer(src, ctxLayer);
                wrapper.append(poiContainer);
                break;
        }
    }

    app.ui.layers.append(wrapper);
    layerElements.set(id, wrapper);
    
    console.log(`[Layer] ${id} ready`);
    
    return wrapper;
}

export async function renderLayers(): Promise<void> {
    const { layerControl, slidersContainer } = app.ui;
    if (!layerControl || !context) return;

    layerControl.innerHTML = '';
    if (slidersContainer) slidersContainer.innerHTML = '';

    syncActiveLayers();
    const availableLayers = getAvailableLayers();

    for (const config of availableLayers) {
        const ctxLayer = getContextLayer(config.id);
        const layerEl = await ensureLayerBuilt(config.id);
        
        if (layerEl) {
            const isActive = app.activeLayers.has(config.id);
            layerEl.classList.toggle('hidden', !isActive);
            await buildControlUI(config, ctxLayer, layerEl, layerControl);
        }
    }

    const availableIds = new Set(availableLayers.map(l => l.id));
    layerElements.forEach((el, id) => {
        if (!availableIds.has(id)) el.classList.add('hidden');
    });
}

async function buildControlUI(config: LayerConfig, ctxLayer: ContextLayer | null, layerEl: HTMLElement, controlParent: HTMLElement): Promise<void> {
    if (config.toggle === 'hidden') return;

    const isVisible = !layerEl.classList.contains('hidden');
    const toggle = create('div');
    toggle.className = `toggleSwitch ${isVisible ? 'active' : ''}`;
    
    const iconWrapper = create('div');
    iconWrapper.className = 'toggle-icon';
    const iconSrc = ctxLayer?.icon || '/assets/icons/default_icon.svg';
    
    try {
        const svgText = await loadTEXT<string>(iconSrc);
        iconWrapper.innerHTML = svgText;
    } catch {
        iconWrapper.innerHTML = ''; 
    }

    const visibilityIndicator = create('span');
    visibilityIndicator.className = 'visibility-indicator';
    visibilityIndicator.innerHTML = isVisible ? EYE_VISIBLE : EYE_HIDDEN;
    iconWrapper.append(visibilityIndicator);
    toggle.append(iconWrapper);

    const label = create('label');
    label.innerText = config.title_key ? t(config.title_key, "Layer") : "Layer";
    toggle.append(label);
    controlParent.append(toggle);

    if (config.playback_control && app.ui.slidersContainer) {
        let sliderUI = sliderElements.get(config.id);
        if (!sliderUI) {
            sliderUI = buildSlider(config, ctxLayer);
            sliderElements.set(config.id, sliderUI);
        }
        sliderUI.classList.toggle('hidden', !isVisible);
        app.ui.slidersContainer.append(sliderUI);
    }

    if (config.toggle === 'available') {
        toggle.addEventListener('click', () => {
            const nowActive = layerEl.classList.contains('hidden');
            if (nowActive) app.activeLayers.add(config.id);
            else app.activeLayers.delete(config.id);

            layerEl.classList.toggle('hidden', !nowActive);
            toggle.classList.toggle('active', nowActive);
            visibilityIndicator.innerHTML = nowActive ? EYE_VISIBLE : EYE_HIDDEN;

            const slider = sliderElements.get(config.id);
            if (slider) slider.classList.toggle('hidden', !nowActive);
        });
    }
}

function syncActiveLayers(): void {
    if (!context) return;
    const process = (map: Record<string, ContextLayer>) => {
        Object.entries(map).forEach(([id, ctx]) => { if (ctx.initially_visible) app.activeLayers.add(id); });
    };
    if (context.global?.layers) process(context.global.layers);
    if (app.currentScenario && app.view !== 'home' && context.scenarios?.[app.currentScenario]) {
        const scenario = context.scenarios[app.currentScenario];
        if (scenario.layers) process(scenario.layers);
        if (app.currentRole && (app.view === 'role-select' || app.view === 'map' || app.view === 'quiz') && scenario.roles?.[app.currentRole]) {
            const role = scenario.roles[app.currentRole];
            if (role.layers) process(role.layers);
        }
    }
}

function getAvailableLayers(): LayerConfig[] {
    if (!context) return [];
    const availableIds = new Set<string>();
    Object.keys(context.global?.layers || {}).forEach(id => availableIds.add(id));
    if (app.currentScenario && app.view !== 'home') {
        Object.keys(context.scenarios[app.currentScenario].layers || {}).forEach(id => availableIds.add(id));
        if (app.currentRole && (app.view === 'role-select' || app.view === 'map' || app.view === 'quiz')) {
            Object.keys(context.scenarios[app.currentScenario].roles[app.currentRole].layers || {}).forEach(id => availableIds.add(id));
        }
    }
    return layerDefinitions.filter(d => availableIds.has(d.id));
}

function findAnyContextLayer(id: string): ContextLayer | null {
    if (!context) return null;
    if (context.global?.layers?.[id]) return context.global.layers[id];
    for (const sId in context.scenarios) {
        if (context.scenarios[sId].layers?.[id]) return context.scenarios[sId].layers[id];
        for (const rId in context.scenarios[sId].roles) {
            if (context.scenarios[sId].roles[rId].layers?.[id]) return context.scenarios[sId].roles[rId].layers[id];
        }
    }
    return null;
}

function getContextLayer(id: string): ContextLayer | null {
    if (!context) return null;
    if (app.currentScenario && app.currentRole) {
        const layer = context.scenarios[app.currentScenario].roles[app.currentRole]?.layers?.[id];
        if (layer) return layer;
    }
    if (app.currentScenario) {
        const layer = context.scenarios[app.currentScenario].layers?.[id];
        if (layer) return layer;
    }
    return context.global?.layers?.[id] || null;
}
