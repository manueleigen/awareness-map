import { app } from './state.js';
import { create, loadJSON, loadYAML, loadTEXT } from './lib.js';
import { t } from './translater.js';
import { LayerConfig, ContextLayer, ProjectContext } from './types.js';
import { buildSlider, updateThumbPosition, waitForPlayerReady } from './time-slider.js';
import { renderPOILayer } from './poi.js';

let layerDefinitions: LayerConfig[] = [];
let context: ProjectContext | null = null;

const EYE_VISIBLE = `<svg fill="currentColor" viewBox="0 0 121.025 121.025" xmlns="http://www.w3.org/2000/svg"><g><path d="M1.35,64.212c7.9,9.9,31.4,36.3,59.2,36.3c27.8,0,51.3-26.399,59.2-36.3c1.699-2.2,1.699-5.3,0-7.399c-7.9-9.9-31.4-36.3-59.2-36.3c-27.8-0.1-51.3,26.3-59.2,36.2C-0.45,58.913-0.45,62.012,1.35,64.212z M60.55,36.413c13.3,0,24,10.7,24,24s-10.7,24-24,24c-13.3,0-24-10.7-24-24S47.25,36.413,60.55,36.413z"/><circle cx="60.55" cy="60.413" r="12"/></g></svg>`;
const EYE_HIDDEN = `<svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M234.35254,160.8125a12.00024,12.00024,0,1,1-20.78516,12l-16.2771-28.19189a127.01451,127.01451,0,0,1-29.36694,13.47021l5.18994,29.43164a11.99973,11.99973,0,1,1-23.63476,4.168l-5.053-28.6543a140.4304,140.4304,0,0,1-32.94116-.01074l-5.05176,28.65234a11.99973,11.99973,0,0,1-23.63477-4.168l5.19165-29.44483A127.0154,127.0154,0,0,1,58.665,144.59326L42.28125,172.9707a12.00024,12.00024,0,0,1-20.78516-12l17.85523-30.92578A153.16947,153.16947,0,0,1,22.665,112.416,11.99959,11.99959,0,0,1,41.333,97.334C57.05859,116.79785,84.8584,140,128,140c43.14063,0,70.94043-23.20215,86.666-42.666a11.99959,11.99959,0,1,1,18.668,15.082,153.08978,153.08978,0,0,1-16.72509,17.66406Z"/></svg>`;

export async function initLayers(): Promise<void> {
    try {
        const [layerData, ctxWrapper] = await Promise.all([
            loadYAML<{ layers: LayerConfig[] }>('/config/layers.yaml'),
            loadYAML<{ contexts: ProjectContext }>('/config/context.yaml')
        ]);
        
        layerDefinitions = layerData?.layers || [];
        context = ctxWrapper?.contexts || null;
        
        await renderLayers();
    } catch (error) {
        console.error("Fehler beim Initialisieren der Layer:", error);
    }
}

export async function renderLayers(): Promise<void> {
    const { layers: layerContainer, layerControl, slidersContainer } = app.ui;
    if (!layerContainer || !layerControl || !context) return;

    // Reset UI
    layerContainer.innerHTML = '';
    layerControl.innerHTML = '';
    if (slidersContainer) slidersContainer.innerHTML = '';

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
function syncActiveLayers(): void {
    if (!context) return;

    const processLayerMap = (layerMap: Record<string, ContextLayer>) => {
        Object.entries(layerMap).forEach(([id, ctx]) => {
            if (ctx.initially_visible) {
                app.activeLayers.add(id);
            }
        });
    };

    // 1. Global (Always processed)
    if (context.global?.layers) processLayerMap(context.global.layers);

    // 2. Scenario (Processed if scenario is active and we're not on home)
    if (app.currentScenario && app.view !== 'home' && context.scenarios?.[app.currentScenario]) {
        const scenario = context.scenarios[app.currentScenario];
        if (scenario.layers) processLayerMap(scenario.layers);

        // 3. Role (Processed if role is active and view is role-select or map)
        if (app.currentRole && (app.view === 'role-select' || app.view === 'map') && scenario.roles?.[app.currentRole]) {
            const role = scenario.roles[app.currentRole];
            if (role.layers) processLayerMap(role.layers);
        }
    }
}

function getAvailableLayers(): LayerConfig[] {
    if (!context) return [];
    const availableIds = new Set<string>();

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

async function buildLayerUI(config: LayerConfig, ctxLayer: ContextLayer | null, parent: HTMLElement, controlParent: HTMLElement): Promise<void> {
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
        switch(config.type) {
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
                    areaWrapper.innerHTML = svg as string;
                    areaWrapper.querySelectorAll('polygon, path.st0').forEach(obj => {
                        obj.addEventListener('click', () => {
                            obj.classList.toggle('active');
                            const g = obj.closest('g');
                            if (g?.parentElement && obj.classList.contains('active')) {
                                g.parentElement.appendChild(g);
                            }
                        });
                    });
                    wrapper.append(areaWrapper);
                }
                break;

            case 'dynamic-image':
                const player = create('dotlottie-wc' as any);
                player.id = `player-${config.id}`;
                player.setAttribute('src', src);
                player.setAttribute('autoplay', 'true');
                player.setAttribute('loop', 'true');

                if (config.playback_control) {
                    waitForPlayerReady(player).then(core => core.pause()).catch(() => {});
                }
                wrapper.append(player);
                break;

            case 'locations':
                const poiContainer = await renderPOILayer(src, ctxLayer);
                wrapper.append(poiContainer);
                break;
        }        
        parent.append(wrapper);
    }

    if (config.toggle === 'available' || config.toggle === 'deactivated') {
        const toggle = create('div');
        toggle.className = `toggleSwitch ${isVisible ? 'active' : ''}`;
        
        const iconWrapper = create('div');
        iconWrapper.className = 'toggle-icon';
        const iconSrc = ctxLayer?.icon || '/assets/icons/default_icon.svg';
        try {
            const svgText = await loadTEXT<string>(iconSrc);
            iconWrapper.innerHTML = svgText;
        } catch {
            const fallbackSvg = await loadTEXT<string>('/assets/icons/default_icon.svg').catch(() => '');
            iconWrapper.innerHTML = fallbackSvg;
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

        let sliderUI: HTMLElement | null = null;

        
        if (config.playback_control && app.ui.slidersContainer) {
            sliderUI = buildSlider(config, ctxLayer);
            sliderUI.classList.toggle('hidden', !isVisible);
            app.ui.slidersContainer.append(sliderUI);
        }

        if(config.toggle === 'available'){
            toggle.addEventListener('click', () => {
                const nowActive = !app.activeLayers.has(config.id);
                if (nowActive) app.activeLayers.add(config.id);
                else app.activeLayers.delete(config.id);

                toggle.classList.toggle('active', nowActive);
                visibilityIndicator.innerHTML = nowActive ? EYE_VISIBLE : EYE_HIDDEN;
                wrapper.classList.toggle('hidden', !nowActive);
                if (sliderUI) {
                    sliderUI.classList.toggle('hidden', !nowActive);
                    if (nowActive) {
                        const range = sliderUI.querySelector('input') as HTMLInputElement;
                        const thumbIcon = sliderUI.querySelector('.slider-thumb-icon') as HTMLElement;
                        if (range && thumbIcon) updateThumbPosition(range, thumbIcon);
                    }
                }
            });
        }
    }
}
