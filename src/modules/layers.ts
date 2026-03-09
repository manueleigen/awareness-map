import { app } from '../data/data.js';
import { create, el, loadJSON } from './lib.js';
import { Layer } from './types.js';

const layers: { [key: string]: Layer } = {};

export async function initLayers(): Promise<void> {
    await buildBaseLayers();
}

export async function buildBaseLayers(): Promise<void> {
    const layerContainer = el('#layers');
    if (!layerContainer) return;

    for (const obj of app['global-layers']) {
        const currentLayer = await loadLayer(obj.id);
        if (currentLayer) {
            buildLayer(currentLayer, layerContainer);
        }
    }
}

function t(obj: Layer, string: 'name'): string {
    return obj.translations[string][app.language];
}

async function loadLayer(id: string): Promise<Layer> {
    const data = await loadJSON<Layer>(`data/layers/${id}.json`);
    layers[data.id] = data;
    return data;
}

function buildLayer(layer: Layer, parent: HTMLElement): void {
    // Build Layer toggle
    if (!layer.subLayer) {
        const toggleSwitch = create('div');
        toggleSwitch.classList.add('toggleSwitch');

        const toggleIcon = create('img');
        toggleIcon.src = layer.icon ? layer.icon : "images/layer-icons/location.svg";
        toggleSwitch.append(toggleIcon);

        const toggleBtn = create('label');
        toggleBtn.innerText = t(layer, 'name');
        toggleBtn.dataset.translations = JSON.stringify(layer.translations.name)
        toggleBtn.className = "lm-swap"
        console.log(layer)
        toggleSwitch.append(toggleBtn);

        const layerControl = el('#layer-control');
        if (layerControl) {
            switch (layer.toggle) {
                case "false":
                    toggleSwitch.classList.add('deactivated');
                    break;
                case "hidden":
                    toggleSwitch.classList.add('hidden');
                    break;
                case "true":
                    toggleSwitch.addEventListener('click', () => handletoggle(toggleSwitch, layer.id));
                    break;
            }
            layerControl.append(toggleSwitch);
        }
    }

    const wrapper = create("div");
    wrapper.className = "layer";
    wrapper.id = layer.id;

    // Build Layer Object
    let layerElement: HTMLElement | undefined;
    
    switch (layer.type) {
        case "color":
            layerElement = create("div");
            if (layer.background) layerElement.style.backgroundColor = layer.background;
            break;
        case "image":
            const img = create("img");
            if (layer.file) img.src = layer.file;
            layerElement = img;
            break;
        case "layergroup":
            layerElement = create("div");
            if (layer.layers) {
                layer.layers.forEach((subLayer) => {
                    buildLayer({ ...subLayer, subLayer: true }, wrapper);
                });
            }
            break;
        case "lottie":
            layerElement = create("div");
            layerElement.innerText = "Lottie Placeholder";
            break;
        default:
            layerElement = create("div");
            layerElement.innerText = "Type-Mismatch";
            break;
    }

    if (layer.css) {
        wrapper.setAttribute('style', layer.css);
    }

    if (layerElement) {
        layerElement.classList.add('layer-content');
        wrapper.append(layerElement);
    }

    wrapper.classList.add(`layer-${layer.type}`);
    parent.append(wrapper);
}

function handletoggle(toggleBtn: HTMLElement, layerId: string): void {
    toggleBtn.classList.toggle("active");
    const layer = document.getElementById(layerId);
    if (layer) {
        layer.classList.toggle("hidden");
    }
}
