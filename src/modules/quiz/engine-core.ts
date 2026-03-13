import { loadYAML } from '../lib.js';
import { app } from '../state.js';
import { StoryPoint } from './types.js';
import { renderProgress, renderSuccessInterlude, clearQuizAnswers } from './ui.js';
import { renderInfo, renderChoice } from './render-text.js';
import { renderLocation, renderSelection } from './render-map.js';

let currentStoryPoints: StoryPoint[] = [];
let currentContent: HTMLElement | null = null;
let currentControls: HTMLElement | null = null;
let currentOnFinish: ((status: 'passed' | 'failed') => void) | null = null;
let lastLocationResult: { x: number; y: number; maxDistance: number } | null = null;

export function getLastLocationResult() { return lastLocationResult; }

export async function runQuiz(
    path: string,
    content: HTMLElement,
    controls: HTMLElement,
    onFinish: (status: 'passed' | 'failed') => void
): Promise<void> {
    const data = await loadYAML<{ story_points: StoryPoint[] }>(path);
    if (!data) return;
    currentStoryPoints = data.story_points;
    currentContent = content;
    currentControls = controls;
    currentOnFinish = onFinish;
    lastLocationResult = null; // reset for new quiz run
    clearQuizAnswers();
    loadPoint('intro');
}

async function loadPoint(id: string): Promise<void> {
    const point = currentStoryPoints.find(p => p.id === id);
    if (!point || !currentContent || !currentControls) return;

    // Handle Layer Activation
    if (point.activeLayerId && !app.activeLayers.has(point.activeLayerId)) {
        app.activeLayers.add(point.activeLayerId);
        
        // Return a promise that resolves when the map rendering is DONE
        await new Promise<void>((resolve) => {
            const onUpdated = () => {
                document.removeEventListener('app-view-updated', onUpdated);
                resolve();
            };
            document.addEventListener('app-view-updated', onUpdated);
            document.dispatchEvent(new CustomEvent('app-request-view-update'));
        });
    }

    renderProgress(currentContent, point);
    const onAction = (isCorrect: boolean, resultData?: any) => {
        if (point.type === 'location-quiz' && resultData) {
            lastLocationResult = { ...resultData, maxDistance: point.maxDistance };
        }
        handleAction(point, isCorrect);
    };

    if (point.type === 'info') renderInfo(currentContent, currentControls, point, onAction);
    else if (point.type === 'quiz') renderChoice(currentContent, currentControls, point, onAction);
    else if (point.type === 'location-quiz') renderLocation(currentContent, currentControls, point, onAction);
    else if (point.type === 'area-selection-quiz' || point.type === 'point-selection-quiz')
        renderSelection(currentContent, currentControls, point, onAction);
}

function handleAction(point: StoryPoint, isCorrect: boolean): void {
    if (point.terminalStatus && currentOnFinish) {
        currentOnFinish(point.terminalStatus);
        return;
    }
    const nextId = typeof point.next === 'string' ? point.next : (isCorrect ? point.next.right : point.next.wrong);
    if (isCorrect && typeof point.next !== 'string' && point.success_screen && currentContent && currentControls) {
        renderSuccessInterlude(currentContent, currentControls, point.success_screen, () => loadPoint(nextId));
    } else {
        loadPoint(nextId);
    }
}
