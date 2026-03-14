import { loadYAML } from '../lib.js';
import { app } from '../state.js';
import { StoryPoint } from './types.js';
import { renderProgress, renderSuccessInterlude, clearQuizAnswers } from './ui.js';
import { renderInfo, renderChoice } from './render-text.js';
import { renderLocation, renderSelection } from './render-map.js';

/** Local storage for the active quiz run. */
let currentStoryPoints: StoryPoint[] = [];
let currentContent: HTMLElement | null = null;
let currentControls: HTMLElement | null = null;
let currentOnFinish: ((status: 'passed' | 'failed') => void) | null = null;

/** 
 * Temporary state shared between steps (e.g., coordinates from a location step 
 * used to filter POIs in a following selection step). 
 */
let lastLocationResult: { x: number; y: number; maxDistance: number } | null = null;

/** Exported getter for spatial filtering in render-map.ts */
export function getLastLocationResult() { return lastLocationResult; }

/**
 * Main engine entry point. Loads the quiz definition and starts at the 'intro' point.
 */
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
    lastLocationResult = null; // Reset shared data for new run
    
    clearQuizAnswers();
    await loadPoint('intro');
}

/**
 * Loads a specific story point by ID and delegates rendering to type-specific modules.
 */
async function loadPoint(id: string): Promise<void> {
    const point = currentStoryPoints.find(p => p.id === id);
    if (!point || !currentContent || !currentControls) return;

    // Handle automatic layer activation for this specific step
    if (point.activeLayerId && !app.activeLayers.has(point.activeLayerId)) {
        app.activeLayers.add(point.activeLayerId);
        
        // Wait for the map to finish re-rendering before proceeding
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

    /**
     * Internal callback for renderers to signal an action/answer.
     */
    const onAction = (isCorrect: boolean, resultData?: any) => {
        // Persist data if this was a location selection
        if (point.type === 'location-quiz' && resultData) {
            lastLocationResult = { ...resultData, maxDistance: point.maxDistance };
        }
        handleAction(point, isCorrect);
    };

    // Delegate to specialized renderers
    if (point.type === 'info') renderInfo(currentContent, currentControls, point, onAction);
    else if (point.type === 'quiz') renderChoice(currentContent, currentControls, point, onAction);
    else if (point.type === 'location-quiz') renderLocation(currentContent, currentControls, point, onAction);
    else if (point.type === 'area-selection-quiz' || point.type === 'point-selection-quiz')
        renderSelection(currentContent, currentControls, point, onAction);
}

/**
 * Decides what happens next after a user action.
 */
function handleAction(point: StoryPoint, isCorrect: boolean): void {
    // 1. Check if the point itself signals the end of the quiz
    if (point.terminalStatus && currentOnFinish) {
        currentOnFinish(point.terminalStatus);
        return;
    }

    // 2. Resolve the next point ID based on correctness
    const nextId = typeof point.next === 'string' 
        ? point.next 
        : (isCorrect ? point.next.right : point.next.wrong);

    // 3. Show optional "Correct!" interlude or load next point immediately
    if (isCorrect && typeof point.next !== 'string' && point.success_screen && currentContent && currentControls) {
        renderSuccessInterlude(currentContent, currentControls, point.success_screen, () => loadPoint(nextId));
    } else {
        loadPoint(nextId);
    }
}
