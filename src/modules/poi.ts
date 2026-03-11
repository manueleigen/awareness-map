import { app } from './state.js';
import { create, loadJSON } from './lib.js';
import { t } from './translater.js';
import { ContextLayer } from './types.js';

export async function renderPOILayer(src: string, ctxLayer: ContextLayer | null): Promise<HTMLElement> {
    const poiSize = 150;
    const poiContainer = create("div");
    poiContainer.className = "poi-container";
    
    const data = await loadJSON<{ locations: any[] }>(src);
    if (data && data.locations) {
        data.locations.forEach(loc => {
            const marker = create("div");
            marker.className = "poi-marker";
            marker.style.left = `${loc.x - (poiSize/2)}px`;
            marker.style.top = `${loc.y - (poiSize/2)}px`;
            marker.style.width = `${poiSize}px`;
            marker.style.height = `${poiSize}px`;
            
            // Add Icon if available in context
            if (ctxLayer?.poi_icon) {
                const iconImg = create('img');
                iconImg.src = ctxLayer.poi_icon;
                iconImg.className = 'poi-icon';
                iconImg.style.width = `100%`;
                iconImg.style.height = `100%`;
                marker.append(iconImg);
            }

            marker.title = loc.translations?.name?.[app.language] || "POI";
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                showPOIOverlay(loc, poiSize, marker);
            });
            poiContainer.append(marker);
        });
    }
    
    return poiContainer;
}

export function showPOIOverlay(loc: any, poiSize: number, marker: HTMLDivElement): void {
    const { poiOverlay } = app.ui;
    if (!poiOverlay) return;

    // Reset/Close any existing overlay
    poiOverlay.innerHTML = '';
    poiOverlay.classList.remove('hidden');

    // Position at marker coordinates
    poiOverlay.style.left = `${loc.x - (poiSize)}px`;
    poiOverlay.style.top = `${loc.y - (poiSize)}px`;
    poiOverlay.style.borderRadius = `${ poiSize/2 }px`;

    const content = create('div');
    content.className = 'poi-overlay-content';

    const head = create('div');
    head.className = 'poi-overlay-head';

    const icon = marker.cloneNode(true) as HTMLDivElement;
    icon.className = 'poi-overlay-icon';

    const title = create('h3');
    title.innerText = loc.translations?.name?.[app.language] || 'POI';

    const closeBtn = create('button');
    closeBtn.className = 'poi-close-btn';
    closeBtn.innerText = ' ';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePOIOverlay();
    });

    head.append(icon, title, closeBtn);



    const statusValue = create('p');
    statusValue.className = 'status-text';
    statusValue.innerText = loc.translations?.status?.[app.language] || '-';

    content.append(head, statusValue);
    poiOverlay.append(content);
}

export function hidePOIOverlay(): void {
    if (app.ui.poiOverlay) {
        app.ui.poiOverlay.classList.add('hidden');
        app.ui.poiOverlay.innerHTML = '';
    }
}
