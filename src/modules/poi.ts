import { app } from './state.js';
import { create, loadJSON, loadTEXT, addPointerClick } from './lib.js';
import { t } from './translater.js';
import { ContextLayer } from './types.js';

/**
 * Renders a layer containing Point of Interest (POI) markers.
 * @param src Path to the JSON file containing location data.
 * @param ctxLayer Context configuration for this layer (icons, etc.).
 */
export async function renderPOILayer(src: string, ctxLayer: ContextLayer | null): Promise<HTMLElement> {
    const poiSize = 150;
    const poiContainer = create("div");
    poiContainer.className = "poi-container layer-locations"; // Added layer-locations class for CSS targeting
    
    const data = await loadJSON<{ locations: any[] }>(src);
    if (data && data.locations) {
        console.log(`[POI] ${src.split('/').pop()} loaded`);
        data.locations.forEach((loc, index) => {
            const marker = create("div");
            marker.className = "poi-marker";
            
            // Assign a stable ID for quiz interactions
            if (!marker.id) {
                const baseId =
                    (typeof loc.id === 'string' && loc.id.trim().length > 0)
                        ? loc.id
                        : `poi-${index + 1}`;
                marker.id = baseId;
            }
            marker.dataset.quizId = marker.id;
            
            // Position the marker (centered on coordinate)
            marker.style.left = `${loc.x - (poiSize/2)}px`;
            marker.style.top = `${loc.y - (poiSize/2)}px`;
            marker.style.width = `${poiSize}px`;
            marker.style.height = `${poiSize}px`;
            
            // Inject SVG icon if configured
            if (ctxLayer?.poi_icon) {
                const iconWrapper = create('div');
                iconWrapper.className = 'poi-icon';
                fetch(ctxLayer.poi_icon)
                    .then(res => res.text())
                    .then(svgText => { iconWrapper.innerHTML = svgText; });
                marker.append(iconWrapper);
            }

            marker.title = loc.translations?.name?.[app.language] || "POI";
            
            // Handle click to open detail overlay
            addPointerClick(marker, (e) => {
                e.stopPropagation(); // Prevent map click listeners from firing
                showPOIOverlay(poiContainer, loc, poiSize, marker);
            });
            
            poiContainer.append(marker);
        });
    }
    
    return poiContainer;
}

/**
 * Displays a detail overlay next to a specific POI marker.
 */
export async function showPOIOverlay(poiContainer: HTMLDivElement, loc: any, poiSize: number, marker: HTMLDivElement): Promise<void> {

    // Close any currently open overlay first
    app.ui.poiOverlay?.remove();

    const poiOverlay = create('div');
    poiOverlay.setAttribute('id', 'poi-overlay');

    // Position overlay relative to the marker
    poiOverlay.style.left = `${loc.x - (poiSize)}px`;
    poiOverlay.style.top = `${loc.y - (poiSize)}px`;
    poiOverlay.style.borderRadius = `${ poiSize/2 }px`;

    const content = create('div');
    content.className = 'poi-overlay-content';
    
    // Prevent clicks inside the content from triggering the global "close" listener
    content.addEventListener('pointerup', (e) => {
        e.stopPropagation();
    });

    // Header section (Icon + Title + Close Button)
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

    addPointerClick(closeBtn, (e) => {
        e.stopPropagation();
        hidePOIOverlay();
    });

    head.append(icon, title, closeBtn);

    // Body section (Status Text)
    const statusValue = create('p');
    statusValue.className = 'status-text';
    statusValue.innerText = loc.translations?.status?.[app.language] || '-';

    content.append(head, statusValue);

    // Inject "Select" button if we are in a quiz selection step
    const quizPoiSelectMode = document.documentElement.dataset.quizPoiSelect === '1';
    if (quizPoiSelectMode) {
        const selectBtn = create('button');
        selectBtn.className = 'poi-select-btn';

        const updateLabel = () => {
            const isSelected = marker.classList.contains('quiz-answer');
            selectBtn.innerText = isSelected
                ? t('crises_challange.common.deselect_poi', 'Deselect')
                : t('crises_challange.common.select_poi', 'Select');
            selectBtn.classList.toggle('active', isSelected);
        };
        updateLabel();

        addPointerClick(selectBtn, (e) => {
            e.stopPropagation();
            marker.classList.toggle('quiz-answer');
            updateLabel();
            // Notify the quiz engine
            document.dispatchEvent(new CustomEvent('quiz-answer-changed', { detail: { id: marker.id } }));
        });

        content.append(selectBtn);
    }
    
    poiOverlay.append(content);
    poiContainer.append(poiOverlay);
    app.ui.poiOverlay = poiOverlay;
}

/**
 * Removes the currently visible POI overlay from the DOM.
 */
export function hidePOIOverlay(): void {
    if (app.ui.poiOverlay) {
        app.ui.poiOverlay.remove();
        app.ui.poiOverlay.innerHTML = '';
        app.ui.poiOverlay = null;
    }
}
