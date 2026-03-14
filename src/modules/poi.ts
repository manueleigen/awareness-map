import { app } from './state.js';
import { create, loadJSON, loadTEXT } from './lib.js';
import { t } from './translater.js';
import { ContextLayer } from './types.js';

export async function renderPOILayer(src: string, ctxLayer: ContextLayer | null): Promise<HTMLElement> {
    const poiSize = 150;
    const poiContainer = create("div");
    poiContainer.className = "poi-container";
    
    const data = await loadJSON<{ locations: any[] }>(src);
    if (data && data.locations) {
        data.locations.forEach((loc, index) => {
            const marker = create("div");
            marker.className = "poi-marker";
            // Ensure each POI has a stable id so quizzes can reference it
            if (!marker.id) {
                const baseId =
                    (typeof loc.id === 'string' && loc.id.trim().length > 0)
                        ? loc.id
                        : `poi-${index + 1}`;
                marker.id = baseId;
            }
            marker.dataset.quizId = marker.id;
            marker.style.left = `${loc.x - (poiSize/2)}px`;
            marker.style.top = `${loc.y - (poiSize/2)}px`;
            marker.style.width = `${poiSize}px`;
            marker.style.height = `${poiSize}px`;
            
            // Add Icon if available in context
            if (ctxLayer?.poi_icon) {
                const iconWrapper = create('div');
                iconWrapper.className = 'poi-icon';
                fetch(ctxLayer.poi_icon)
                    .then(res => res.text())
                    .then(svgText => { iconWrapper.innerHTML = svgText; });
                marker.append(iconWrapper);
            }

            marker.title = loc.translations?.name?.[app.language] || "POI";
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                showPOIOverlay(poiContainer, loc, poiSize, marker);
            });
            poiContainer.append(marker);
        });
    }
    
    return poiContainer;
}

export async function showPOIOverlay(poiContainer:HTMLDivElement, loc: any, poiSize: number, marker: HTMLDivElement):  Promise<void> {

    // Reset/Close any existing overlay
    app.ui.poiOverlay?.remove();

    
    const poiOverlay = create('div')
    poiOverlay.setAttribute ('id', 'poi-overlay');

    // Position at marker coordinates
    poiOverlay.style.left = `${loc.x - (poiSize)}px`;
    poiOverlay.style.top = `${loc.y - (poiSize)}px`;
    poiOverlay.style.borderRadius = `${ poiSize/2 }px`;

    const content = create('div');
    content.className = 'poi-overlay-content';
    content.addEventListener('click', () => {
        hidePOIOverlay();
    });

    const head = create('div');
    head.className = 'poi-overlay-head';

    const icon = marker.cloneNode(true) as HTMLDivElement;
    icon.className = 'poi-overlay-icon';

    const title = create('h3');
    title.innerText = loc.translations?.name?.[app.language] || 'POI';

    const closeBtn = create('button');
    closeBtn.className = 'poi-close-btn';
    const closeBtnIcon = await loadTEXT('assets/icons/ui/esc-btn-icon.svg') as string;

    closeBtn.innerHTML = closeBtnIcon;

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePOIOverlay();
    });

    head.append(icon, title, closeBtn);



    const statusValue = create('p');
    statusValue.className = 'status-text';
    statusValue.innerText = loc.translations?.status?.[app.language] || '-';

    content.append(head, statusValue);

    // Quiz point-selection mode: allow selecting this POI as an answer
    const quizPoiSelectMode = document.documentElement.dataset.quizPoiSelect === '1';
    if (quizPoiSelectMode) {
        const selectBtn = create('button');
        selectBtn.className = 'poi-select-btn';

        const updateLabel = () => {
            const isSelected = marker.classList.contains('quiz-answer');
            selectBtn.innerText = isSelected
                ? t('crises_challange.common.deselect_poi', 'Abwählen')
                : t('crises_challange.common.select_poi', 'Auswählen');
            selectBtn.classList.toggle('active', isSelected);
        };
        updateLabel();

        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            marker.classList.toggle('quiz-answer');
            updateLabel();
            document.dispatchEvent(new CustomEvent('quiz-answer-changed', { detail: { id: marker.id } }));
        });

        // Place at end of overlay (below description)
        content.append(selectBtn);
    }
    poiOverlay.append(content);
    poiContainer.append(poiOverlay);
    app.ui.poiOverlay = poiOverlay;
}

export function hidePOIOverlay(): void {
    if (app.ui.poiOverlay) {
        app.ui.poiOverlay.remove();
        app.ui.poiOverlay.innerHTML = '';
    }
}
