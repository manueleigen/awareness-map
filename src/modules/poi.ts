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

export function showPOIOverlay(poiContainer:HTMLDivElement, loc: any, poiSize: number, marker: HTMLDivElement): void {

    // Reset/Close any existing overlay
    app.ui.poiOverlay?.remove();
    console.log(app.ui.poiOverlay)

    
    const poiOverlay = create('div')
    poiOverlay.setAttribute ('id', 'poi-overlay');

    // Position at marker coordinates
    poiOverlay.style.left = `${loc.x - (poiSize)}px`;
    poiOverlay.style.top = `${loc.y - (poiSize)}px`;
    poiOverlay.style.borderRadius = `${ poiSize/2 }px`;

    const content = create('div');
    content.className = 'poi-overlay-content';
    content.style.cursor = 'pointer';
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
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22.1881 22.18815"><path d="M11.0941,0c-2.19424,0-4.33916.65065-6.16357,1.86965C3.10612,3.08875,1.68417,4.82135.84449,6.84855.00481,8.87575-.21489,11.10635.21317,13.25835c.42807,2.1521,1.48468,4.1289,3.03621,5.6804,1.55153,1.5515,3.5283,2.6081,5.68034,3.0362,2.15208.4281,4.38268.2084,6.40988-.6313,2.0271-.8397,3.7598-2.2617,4.9788-4.0861,1.2191-1.8244,1.8697-3.9693,1.8697-6.1635-.0031-2.9414-1.173-5.7614-3.2528-7.8412C16.8554,1.17297,14.0354.00313,11.0941,0ZM11.0941,19.41455c-1.64569,0-3.25438-.4879-4.62269-1.4022-1.3683-.9143-2.43477-2.2138-3.06453-3.7342-.62976-1.5203-.79453-3.1933-.47348-4.8074.32105-1.614,1.1135-3.0966,2.27715-4.2602,1.16365-1.1637,2.64623-1.9561,4.26025-2.2772,1.614-.321,3.287-.1562,4.8074.4735,1.5204.6298,2.8199,1.6963,3.7341,3.0646.9143,1.3683,1.4023,2.977,1.4023,4.6226-.0024,2.206-.8798,4.321-2.4397,5.8809-1.5599,1.5598-3.6748,2.4372-5.8808,2.4396Z"/><path d="M14.8485,7.33985c-.1287-.1288-.2816-.231-.4498-.3007-.1683-.0697-.3486-.1056-.5307-.1056s-.3624.0359-.5306.1056c-.1683.0697-.3211.1719-.4499.3007l-1.793,1.793-1.79303-1.793c-.26029-.2588-.6126-.4039-.97968-.4034-.36709.0005-.71899.1466-.97856.4061-.25957.2596-.40562.6115-.40613.9786-.00051.3671.14456.7194.4034.9797l1.79303,1.793-1.79303,1.793c-.12934.1287-.23204.2816-.3022.4499-.07016.1684-.1064.349-.10666.5314-.00025.1824.03549.3631.10518.5317.06969.1686.17196.3218.30095.4507.12899.129.28216.2313.45074.301s.34926.1054.53168.1052c.18242-.0003.36299-.0365.53138-.1067.16838-.0702.32127-.1728.4499-.3022l1.79303-1.793,1.793,1.793c.2603.2589.6126.4039.9797.4034s.719-.1465.9786-.4061c.2595-.2596.4056-.6115.4061-.9786.0005-.3671-.1446-.7194-.4034-.9797l-1.793-1.793,1.793-1.793c.1288-.1288.231-.2816.3007-.4498.0697-.1683.1056-.3486.1056-.5307s-.0359-.3624-.1056-.5307c-.0697-.1682-.1719-.321-.3007-.4498Z"/></svg>';
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
