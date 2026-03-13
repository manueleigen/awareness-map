import { create } from './lib.js';
import { t } from './translater.js';
import { app } from './state.js';
import { loadYAML } from './lib.js';

type StoryPointType = 'info' | 'quiz' | 'area-selection-quiz' | 'point-selection-quiz' | 'location-quiz';

type NextConfig = string | { right: string; wrong: string };

export interface QuizOption {
    label_key: string;
    value: string;
}

export interface BaseStoryPoint {
    id: string;
    type: StoryPointType;
    title_key?: string;
    next: NextConfig;
    success_screen?: {
        title_key?: string;
        description_key?: string;
        duration_ms?: number;
    };
    step?: number;
    total_steps?: number;
}

export interface InfoStoryPoint extends BaseStoryPoint {
    type: 'info';
    description_key: string;
    continue_button_key: string;
}

export interface QuizStoryPoint extends BaseStoryPoint {
    type: 'quiz';
    question_key: string;
    options: QuizOption[];
    solution: string[];
    minAnswers?: number;
    maxAnswers?: number;
}

export interface LocationStoryPoint extends BaseStoryPoint {
    type: 'location-quiz';
    question_key: string;
    /**
     * Wrapper element that receives click events.
     * Use a CSS selector like "#layers" or "#layer-someId".
     */
    target: string;
    /**
     * Optional selector for the clickable element inside the target (event delegation).
     * If omitted, clicks on the target itself are used.
     */
    selector?: string;
    /**
     * Target coordinate within the target's coordinate space (px).
     */
    solution: { x: number; y: number };
    maxDistance: number;
}

export interface SelectionStoryPoint extends BaseStoryPoint {
    type: 'area-selection-quiz' | 'point-selection-quiz';
    question_key: string;
    /**
     * Wrapper element that contains selectable items.
     * Use a CSS selector like "#layer-critical_places".
     */
    target: string;
    /**
     * Selector for selectable items inside the target.
     * - point-selection-quiz: something like ".poi-marker" or ".selectable"
     * - area-selection-quiz: something like "svg polygon"
     */
    selector: string;
    interactionLayerId?: string;
    solution: string[];
    minSelection?: number;
    maxSelection?: number;
}

export type StoryPoint =
    | InfoStoryPoint
    | QuizStoryPoint
    | LocationStoryPoint
    | SelectionStoryPoint;

export interface QuizEngineConfig {
    storyPoints: StoryPoint[];
    startId: string;
    contentContainer: HTMLElement;
    controlsContainer: HTMLElement;
}

type ActionHandler = (isCorrect: boolean) => void;

interface Renderer {
    render(point: StoryPoint): void;
}

class InfoRenderer implements Renderer {
    constructor(
        private contentContainer: HTMLElement,
        private controlsContainer: HTMLElement,
        private onAction: ActionHandler
    ) {}

    render(point: InfoStoryPoint): void {
        this.contentContainer.innerHTML = '';
        this.controlsContainer.innerHTML = '';

        if (point.title_key) {
            const title = create('h2');
            title.innerText = t(point.title_key);
            this.contentContainer.append(title);
        }

        const desc = create('p');
        desc.innerText = t(point.description_key);

        const btn = create('button');
        btn.innerText = t(point.continue_button_key, t('feedback.continue', 'Weiter'));
        btn.addEventListener('click', () => this.onAction(true));

        this.contentContainer.append(desc);
        this.controlsContainer.append(btn);
    }
}

class QuizRenderer implements Renderer {
    constructor(
        private contentContainer: HTMLElement,
        private controlsContainer: HTMLElement,
        private onAction: ActionHandler
    ) {}

    render(point: QuizStoryPoint): void {
        this.contentContainer.innerHTML = '';
        this.controlsContainer.innerHTML = '';

        if (point.title_key) {
            const title = create('h2');
            title.innerText = t(point.title_key);
            this.contentContainer.append(title);
        }

        const question = create('p');
        question.innerText = t(point.question_key);
        this.contentContainer.append(question);

        const optionsWrapper = create('div');
        optionsWrapper.className = 'quiz-options';

        const selected = new Set<string>();

        point.options.forEach(opt => {
            const btn = create('button');
            btn.className = 'quiz-option-btn';
            btn.innerText = t(opt.label_key);

            btn.addEventListener('click', () => {
                const isMulti = (point.maxAnswers ?? point.solution.length) > 1;
                if (!isMulti) {
                    // single choice
                    selected.clear();
                    Array.from(optionsWrapper.querySelectorAll('.quiz-option-btn')).forEach(el => {
                        el.classList.remove('selected');
                    });
                    btn.classList.add('selected');
                    selected.add(opt.value);
                } else {
                    if (selected.has(opt.value)) {
                        selected.delete(opt.value);
                        btn.classList.remove('selected');
                    } else {
                        if (!point.maxAnswers || selected.size < point.maxAnswers) {
                            selected.add(opt.value);
                            btn.classList.add('selected');
                        }
                    }
                }
            });

            optionsWrapper.append(btn);
        });

        this.contentContainer.append(optionsWrapper);

        const submit = create('button');
        submit.innerText = t('crises_challange.common.submit', 'Antwort prüfen');
        submit.addEventListener('click', () => {
            const min = point.minAnswers ?? 1;
            if (selected.size < min) {
                // Simple inline validation – do not advance
                submit.disabled = true;
                setTimeout(() => { submit.disabled = false; }, 600);
                return;
            }

            const selArr = Array.from(selected).sort();
            const solutionArr = [...point.solution].sort();
            const isCorrect = selArr.length === solutionArr.length &&
                selArr.every((v, i) => v === solutionArr[i]);

            this.onAction(isCorrect);
        });

        this.controlsContainer.append(submit);
    }
}

/**
 * Simple placeholder renderers for spatial quizzes.
 * These currently provide text-based stand-ins until real map interactions are wired.
 */
class SelectionRenderer implements Renderer {
    constructor(
        private contentContainer: HTMLElement,
        private controlsContainer: HTMLElement,
        private onAction: ActionHandler
    ) {}

    render(point: SelectionStoryPoint): void {
        this.contentContainer.innerHTML = '';
        this.controlsContainer.innerHTML = '';

        // Enable POI overlay "select" button only for point-selection quizzes
        document.documentElement.dataset.quizPoiSelect = point.type === 'point-selection-quiz' ? '1' : '0';

        if (point.title_key) {
            const title = create('h2');
            title.innerText = t(point.title_key);
            this.contentContainer.append(title);
        }

        const question = create('p');
        question.innerText = t(point.question_key);

        const hint = create('p');
        hint.className = 'quiz-hint';
        hint.innerText = t('crises_challange.common.selection_hint');

        const status = create('p');
        status.className = 'quiz-status';
        status.innerText = t('crises_challange.common.nothing_selected', '');

        this.contentContainer.append(question, hint, status);

        const target = document.querySelector<HTMLElement>(point.target);
        if (!target) {
            console.error(`Quiz target not found for ${point.id}: ${point.target}`);
            status.innerText = t(
                'crises_challange.common.target_missing',
                `Zielbereich nicht gefunden: ${point.target}`
            );
        }

        // Clear old selections globally before the step begins
        clearQuizAnswers();

        // Highlight all selectable items with a pulse to indicate interactivity
        if (point.type === 'point-selection-quiz' && target) {
            target.querySelectorAll(point.selector).forEach(el => {
                el.classList.add('quiz-pulse');
            });
        }

        const getSelectedIds = (): string[] => {
            if (!target) return [];
            const getValue = (el: HTMLElement): string => {
                return (
                    el.id ||
                    el.dataset.quizId ||
                    el.getAttribute('title') ||
                    ''
                );
            };
            return Array.from(target.querySelectorAll<HTMLElement>(`${point.selector}.quiz-answer`))
                .map(getValue)
                .filter(v => v.trim().length > 0);
        };

        const refreshStatus = () => {
            const selectedCount = getSelectedIds().length;
            status.innerText = t(
                'crises_challange.common.selected_count',
                `Ausgewählt: ${selectedCount}`
            ).replace('{count}', `${selectedCount}`);
        };
        refreshStatus();

        const clickHandler = (e: Event) => {
            if (!target) return;
            const rawEl = e.target as Element | null;
            const item = rawEl?.closest(point.selector) as HTMLElement | null;
            if (!item || !target.contains(item)) return;

            const id = item.id;
            if (!id) {
                console.warn('Selectable item has no id:', item);
                return;
            }

            const currentlySelected = getSelectedIds();
            const isSelected = item.classList.contains('quiz-answer');

            // enforce maxSelection (if defined) only when adding
            if (!isSelected && point.maxSelection && currentlySelected.length >= point.maxSelection) return;

            item.classList.toggle('quiz-answer');
            refreshStatus();
        };

        const externalChangeHandler = () => refreshStatus();
        document.addEventListener('quiz-answer-changed', externalChangeHandler as EventListener);

        // bind once per render; renderer is recreated per engine, but render is called many times
        // so ensure we remove the old handler by replacing the target node listener set.
        if (target) {
            // Remove any previous handler stored on element
            const key = '__quizSelectionHandler';
            const prev = (target as any)[key] as ((e: Event) => void) | undefined;
            if (prev) target.removeEventListener('click', prev);
            (target as any)[key] = clickHandler;
            target.addEventListener('click', clickHandler);
        }

        const btn = create('button');
        btn.innerText = t('crises_challange.common.submit', 'Antwort prüfen');
        btn.addEventListener('click', () => {
            const min = point.minSelection ?? 1;
            const selectedIds = getSelectedIds();
            if (selectedIds.length < min) {
                btn.disabled = true;
                setTimeout(() => { btn.disabled = false; }, 600);
                return;
            }

            const selArr = [...selectedIds].sort();
            const solutionArr = [...point.solution].sort();
            const isCorrect = selArr.length === solutionArr.length &&
                selArr.every((v, i) => v === solutionArr[i]);

            // cleanup handler
            if (target) {
                const key = '__quizSelectionHandler';
                const prev = (target as any)[key] as ((e: Event) => void) | undefined;
                if (prev) target.removeEventListener('click', prev);
                (target as any)[key] = undefined;
            }

            document.removeEventListener('quiz-answer-changed', externalChangeHandler as EventListener);

            this.onAction(isCorrect);
        });

        this.controlsContainer.append(btn);
    }
}

class LocationRenderer implements Renderer {
    constructor(
        private contentContainer: HTMLElement,
        private controlsContainer: HTMLElement,
        private onAction: ActionHandler
    ) {}

    render(point: LocationStoryPoint): void {
        this.contentContainer.innerHTML = '';
        this.controlsContainer.innerHTML = '';

        if (point.title_key) {
            const title = create('h2');
            title.innerText = t(point.title_key);
            this.contentContainer.append(title);
        }

        const question = create('p');
        question.innerText = t(point.question_key);

        const hint = create('p');
        hint.className = 'quiz-hint';
        hint.innerText = t('crises_challange.common.location_hint');

        const status = create('p');
        status.className = 'quiz-status';
        status.innerText = t('crises_challange.common.click_to_place', 'Klicke, um einen Punkt zu setzen.');

        this.contentContainer.append(question, hint, status);

        const target = document.querySelector<HTMLElement>(point.target);
        if (!target) {
            console.error(`Quiz target not found for ${point.id}: ${point.target}`);
            status.innerText = t(
                'crises_challange.common.target_missing',
                `Zielbereich nicht gefunden: ${point.target}`
            );
        }

        // Pulse the clickable area to hint interaction
        if (target) {
            target.classList.add('quiz-location-pulse');
        }

        let placed: { x: number; y: number } | null = null;
        let marker: HTMLDivElement | null = null;

        const ensureMarker = () => {
            if (!target) return null;
            if (!marker) {
                marker = create('div');
                marker.className = 'quiz-location-marker';
                marker.style.position = 'absolute';
                marker.style.width = '24px';
                marker.style.height = '24px';
                marker.style.borderRadius = '4px';
                marker.style.background = 'transparent';
                marker.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.9)';
                marker.style.color = '#FFFFFF';
                marker.style.display = 'flex';
                marker.style.alignItems = 'center';
                marker.style.justifyContent = 'center';
                marker.style.fontSize = '20px';
                marker.style.fontWeight = '800';
                marker.innerText = 'X';
                marker.style.pointerEvents = 'none';

                const style = window.getComputedStyle(target);
                if (style.position === 'static') target.style.position = 'relative';
                target.append(marker);
            }
            return marker;
        };

        const clickHandler = (e: MouseEvent) => {
            if (!target) return;
            const baseEl = point.selector
                ? (e.target as Element | null)?.closest(point.selector)
                : target;
            if (!baseEl || !(baseEl instanceof HTMLElement) || !target.contains(baseEl)) return;

            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            placed = { x, y };

            const m = ensureMarker();
            if (m) {
                m.style.left = `${x - 7}px`;
                m.style.top = `${y - 7}px`;
            }

            status.innerText = t(
                'crises_challange.common.location_selected',
                `Punkt gesetzt (${Math.round(x)}, ${Math.round(y)})`
            )
                .replace('{x}', `${Math.round(x)}`)
                .replace('{y}', `${Math.round(y)}`);
        };

        if (target) {
            const key = '__quizLocationHandler';
            const prev = (target as any)[key] as ((e: MouseEvent) => void) | undefined;
            if (prev) target.removeEventListener('click', prev);
            (target as any)[key] = clickHandler;
            target.addEventListener('click', clickHandler);
        }

        const btn = create('button');
        btn.innerText = t('crises_challange.common.submit', 'Antwort prüfen');
        btn.addEventListener('click', () => {
            if (!placed) {
                btn.disabled = true;
                setTimeout(() => { btn.disabled = false; }, 600);
                return;
            }

            const dx = placed.x - point.solution.x;
            const dy = placed.y - point.solution.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const isCorrect = dist <= point.maxDistance;

            if (target) {
                const key = '__quizLocationHandler';
                const prev = (target as any)[key] as ((e: MouseEvent) => void) | undefined;
                if (prev) target.removeEventListener('click', prev);
                (target as any)[key] = undefined;
            }

            if (marker) marker.remove();
            marker = null;

            this.onAction(isCorrect);
        });

        this.controlsContainer.append(btn);
    }
}

export class QuizEngine {
    private currentPoint: StoryPoint | null = null;
    private renderers: Record<StoryPointType, Renderer>;

    constructor(private config: QuizEngineConfig) {
        this.renderers = {
            'info': new InfoRenderer(
                config.contentContainer,
                config.controlsContainer,
                (res) => this.handleAction(res)
            ),
            'quiz': new QuizRenderer(
                config.contentContainer,
                config.controlsContainer,
                (res) => this.handleAction(res)
            ),
            'area-selection-quiz': new SelectionRenderer(
                config.contentContainer,
                config.controlsContainer,
                (res) => this.handleAction(res)
            ),
            'point-selection-quiz': new SelectionRenderer(
                config.contentContainer,
                config.controlsContainer,
                (res) => this.handleAction(res)
            ),
            'location-quiz': new LocationRenderer(
                config.contentContainer,
                config.controlsContainer,
                (res) => this.handleAction(res)
            )
        };
    }

    start(): void {
        // reset any stale selections from previous runs
        clearQuizAnswers();
        // default: POI selection disabled until point-selection step
        document.documentElement.dataset.quizPoiSelect = '0';
        this.loadStoryPoint(this.config.startId);
    }

    private loadStoryPoint(id: string): void {
        const point = this.config.storyPoints.find(p => p.id === id) || null;
        this.currentPoint = point;

        if (!point) {
            console.error(`Quiz story point ${id} not found.`);
            return;
        }

        const renderer = this.renderers[point.type];
        if (!renderer) {
            console.error(`No quiz renderer for type ${point.type}`);
            return;
        }

        renderer.render(point as any);
        this.renderProgress(point);
    }

    private handleAction(isCorrect: boolean): void {
        if (!this.currentPoint) return;

        const next = this.currentPoint.next;
        const nextId = typeof next === 'string'
            ? next
            : (isCorrect ? next.right : next.wrong);

        // show optional intermediate success screen before continuing
        if (isCorrect && typeof next !== 'string' && this.currentPoint.success_screen) {
            this.renderSuccessInterlude(this.currentPoint.success_screen, nextId);
            return;
        }

        this.loadStoryPoint(nextId);
    }

    private renderSuccessInterlude(
        success: NonNullable<BaseStoryPoint['success_screen']>,
        nextId: string
    ): void {
        const titleKey = success.title_key ?? 'crises_challange.success_interlude.title';
        const descKey = success.description_key ?? 'crises_challange.success_interlude.description';
        const duration = success.duration_ms ?? 900;

        // simple in-between screen (no buttons)
        this.config.contentContainer.innerHTML = '';
        this.config.controlsContainer.innerHTML = '';

        const title = create('h2');
        title.innerText = t(titleKey, t('feedback.success_title', 'Erfolg'));
        const desc = create('p');
        desc.innerText = t(descKey, t('feedback.continue', 'Weiter'));

        this.config.contentContainer.append(title, desc);

        window.setTimeout(() => {
            this.loadStoryPoint(nextId);
        }, duration);
    }

    private renderProgress(point: StoryPoint): void {
        if (!point.step || !point.total_steps) return;

        const existing = this.config.contentContainer.querySelector<HTMLElement>('.quiz-progress');
        if (existing) existing.remove();

        const wrapper = create('div');
        wrapper.className = 'quiz-progress';

        const barOuter = create('div');
        barOuter.className = 'quiz-progress-bar-outer';

        const barInner = create('div');
        barInner.className = 'quiz-progress-bar-inner';

        const ratio = Math.max(0, Math.min(1, point.step / point.total_steps));
        barInner.style.width = `${ratio * 100}%`;

        barOuter.append(barInner);

        const label = create('div');
        label.className = 'quiz-progress-label';
        label.innerText = `${point.step} / ${point.total_steps}`;

        wrapper.append(barOuter, label);


        this.config.contentContainer.prepend(wrapper);
    }
}

function clearQuizAnswers(): void {
    // Clear any selection artifacts across the app
    document.querySelectorAll('.quiz-answer').forEach(el => el.classList.remove('quiz-answer'));
    document.querySelectorAll('.quiz-option-btn.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.quiz-pulse').forEach(el => el.classList.remove('quiz-pulse'));
    document.querySelectorAll('.quiz-location-pulse').forEach(el => el.classList.remove('quiz-location-pulse'));
    document.querySelectorAll('.quiz-location-marker').forEach(el => el.remove());
}

/**
 * Convenience bootstrapper for the "crises_challange" quiz.
 * Assumes we are already in the correct scenario/role context.
 */
export async function startCrisesChallangeQuiz(): Promise<void> {
    const { infoBoxContent, infoBoxControls } = app.ui;
    if (!infoBoxContent || !infoBoxControls) return;

    const storyPoints = await loadCrisesChallangeStoryPoints();
    const engine = new QuizEngine({
        storyPoints,
        startId: 'intro',
        contentContainer: infoBoxContent,
        controlsContainer: infoBoxControls
    });

    engine.start();
}
async function loadCrisesChallangeStoryPoints(): Promise<StoryPoint[]> {
    
    const data = await loadYAML<{ story_points: StoryPoint[] }>(
        '/config/quizes/crises-challange/story-points.yaml'
    );
    return data?.story_points || [];
}

