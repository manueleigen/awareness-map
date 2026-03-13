import { create, el } from '../lib.js';
import { t } from '../translater.js';
import { LocationStoryPoint, SelectionStoryPoint } from './types.js';
import { clearQuizAnswers } from './ui.js';
import { getAppScale } from '../screen-zoom.js';
import { getLastLocationResult } from './engine-core.js';

export function renderLocation(
    content: HTMLElement,
    controls: HTMLElement,
    point: LocationStoryPoint,
    onAction: (isCorrect: boolean, resultData?: any) => void
): void {
    content.innerHTML = '';
    controls.innerHTML = '';

    const title = point.title_key ? create('h2') : null;
    if (title) { title.innerText = t(point.title_key!); content.append(title); }

    const question = create('p');
    question.innerText = t(point.question_key);
    const status = create('p');
    status.className = 'quiz-status';
    status.innerText = t('crises_challange.common.click_to_place', 'Klicke, um einen Punkt zu setzen.');
    content.append(question, status);

    const target = el<HTMLElement>(point.target);
    if (target) target.classList.add('quiz-location-pulse');

    let placed: { x: number; y: number } | null = null;
    let marker: HTMLDivElement | null = null;
    let radiusMarker: HTMLDivElement | null = null;

    const clickHandler = (e: MouseEvent) => {
        if (!target) return;
        const scale = getAppScale();
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        placed = { x, y };

        if (!marker) {
            marker = create('div');
            marker.className = 'quiz-location-marker';
            marker.innerText = 'X';
            target.append(marker);
            radiusMarker = create('div');
            radiusMarker.className = 'quiz-location-radius';
            target.append(radiusMarker);
        }
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        if (radiusMarker) {
            radiusMarker.style.left = `${x}px`;
            radiusMarker.style.top = `${y}px`;
            radiusMarker.style.width = `${point.maxDistance * 2}px`;
            radiusMarker.style.height = `${point.maxDistance * 2}px`;
        }
        status.innerText = t('crises_challange.common.location_selected', 'Punkt gesetzt') + ` (${Math.round(x)}, ${Math.round(y)})`;
    };

    target?.addEventListener('click', clickHandler);

    const btn = create('button');
    btn.innerText = t('crises_challange.common.submit', 'Antwort prüfen');
    btn.addEventListener('click', () => {
        if (!placed) return;
        const dist = Math.sqrt(Math.pow(placed.x - point.solution.x, 2) + Math.pow(placed.y - point.solution.y, 2));
        const isCorrect = dist <= point.maxDistance;
        const solMarker = create('div');
        solMarker.className = 'quiz-solution-marker';
        solMarker.innerText = '✓';
        solMarker.style.left = `${point.solution.x}px`;
        solMarker.style.top = `${point.solution.y}px`;
        
        const solRadius = create('div');
        solRadius.className = 'quiz-solution-radius';
        solRadius.style.left = `${point.solution.x}px`;
        solRadius.style.top = `${point.solution.y}px`;
        solRadius.style.width = `${point.maxDistance * 2}px`;
        solRadius.style.height = `${point.maxDistance * 2}px`;

        target?.append(solRadius, solMarker);
        target?.removeEventListener('click', clickHandler);
        radiusMarker?.remove();
        onAction(isCorrect, placed);
    });
    controls.append(btn);
}

export function renderSelection(
    content: HTMLElement,
    controls: HTMLElement,
    point: SelectionStoryPoint,
    onAction: (isCorrect: boolean) => void
): void {
    content.innerHTML = '';
    controls.innerHTML = '';
    document.documentElement.dataset.quizPoiSelect = point.type === 'point-selection-quiz' ? '1' : '0';

    if (point.title_key) {
        const title = create('h2'); title.innerText = t(point.title_key); content.append(title);
    }

    const question = create('p'); question.innerText = t(point.question_key);
    const status = create('p'); status.className = 'quiz-status';
    content.append(question, status);

    const target = el<HTMLElement>(point.target);
    clearQuizAnswers();
    const spatialFilter = getLastLocationResult();

    if (target && point.type === 'point-selection-quiz') {
        target.querySelectorAll<HTMLElement>(point.selector).forEach(el => {
            let isEnabled = true;
            if (spatialFilter) {
                // Get the POI center coordinates directly from its style (set in poi.ts)
                const poiX = parseFloat(el.style.left) + parseFloat(el.style.width) / 2;
                const poiY = parseFloat(el.style.top) + parseFloat(el.style.height) / 2;
                
                const dist = Math.sqrt(Math.pow(poiX - spatialFilter.x, 2) + Math.pow(poiY - spatialFilter.y, 2));
                isEnabled = dist <= spatialFilter.maxDistance;
            }

            if (isEnabled) {
                el.classList.add('quiz-pulse');
                el.classList.remove('disabled');
                el.style.pointerEvents = 'auto'; // Re-enable if it was disabled
            } else {
                el.classList.add('disabled');
                el.style.pointerEvents = 'none'; // Lock interaction
            }
        });
    }

    const refreshStatus = () => {
        const count = target?.querySelectorAll(`${point.selector}.quiz-answer`).length || 0;
        status.innerText = t('crises_challange.common.selected_count', `Ausgewählt: ${count}`).replace('{count}', `${count}`);
    };
    refreshStatus();

    const clickHandler = (e: Event) => {
        const item = (e.target as Element | null)?.closest(point.selector) as HTMLElement | null;
        if (!item || !target?.contains(item) || item.classList.contains('disabled')) return;
        const isSelected = item.classList.contains('quiz-answer');
        if (!isSelected && point.maxSelection && target?.querySelectorAll(`${point.selector}.quiz-answer`).length! >= point.maxSelection) return;
        item.classList.toggle('quiz-answer');
        refreshStatus();
    };

    const externalHandler = () => refreshStatus();
    document.addEventListener('quiz-answer-changed', externalHandler);
    target?.addEventListener('click', clickHandler);

    const btn = create('button');
    btn.innerText = t('crises_challange.common.submit', 'Antwort prüfen');
    btn.addEventListener('click', () => {
        const selected = Array.from(target?.querySelectorAll(`${point.selector}.quiz-answer`) || []).map(el => el.id);
        if (selected.length < (point.minSelection ?? 1)) return;
        target?.removeEventListener('click', clickHandler);
        document.removeEventListener('quiz-answer-changed', externalHandler);
        onAction(selected.length === point.solution.length && selected.every(id => point.solution.includes(id)));
    });
    controls.append(btn);
}
