export type StoryPointType = 'info' | 'quiz' | 'area-selection-quiz' | 'point-selection-quiz' | 'location-quiz';

export type NextConfig = string | { right: string; wrong: string };

export interface QuizOption {
    label_key: string;
    value: string;
}

export interface BaseStoryPoint {
    id: string;
    type: StoryPointType;
    title_key?: string;
    next: NextConfig;
    activeLayerId?: string;
    activeLayerIds?: string[];
    terminalStatus?: 'passed' | 'failed';
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
    target: string;
    selector?: string;
    solution: { x: number; y: number };
    maxDistance: number;
}

export interface SelectionStoryPoint extends BaseStoryPoint {
    type: 'area-selection-quiz' | 'point-selection-quiz';
    question_key: string;
    target: string;
    selector: string;
    interactionLayerId?: string;
    solution: string[];
    minSelection?: number;
    maxSelection?: number;
}

export type StoryPoint = InfoStoryPoint | QuizStoryPoint | LocationStoryPoint | SelectionStoryPoint;
