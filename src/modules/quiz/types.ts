export type StoryPointType = 'info' | 'quiz' | 'area-selection-quiz' | 'point-selection-quiz' | 'location-quiz';

export type QuizOutcome = "right" | "wrong" | "half" | "half-wrong" | "wrong-neutral" | "all-neutral" | "all-wrong";

export type NextConfig =
	| string
	| {
		right: string;
		wrong: string;
		half?: string;
		"half-wrong"?: string;
		"wrong-neutral"?: string;
		"all-neutral"?: string;
		"all-wrong"?: string;
	};

export interface LocalizedInlineText {
    title?: string;
    question?: string;
    description?: string;
}

export interface QuizOption {
    label_key?: string;
    value: string;
    text?: {
        de?: string;
        en?: string;
    };
}

export interface BaseStoryPoint {
    id: string;
    type: StoryPointType;
    title_key?: string;
    text?: {
        de?: LocalizedInlineText;
        en?: LocalizedInlineText;
    };
    next: NextConfig;
    activeLayerId?: string;
    activeLayerIds?: string[];
    excludeLayerIds?: string[];
    terminalStatus?: 'passed' | 'failed';
    success_screen?: {
        title_key?: string;
        description_key?: string;
        duration_ms?: number;
    };
    step?: number;
    total_steps?: number;
    slider_time?: string;
    slider_time_layer?: string;
    slider_time_fixed?: boolean;
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
    question_key?: string;
    submit_key?: string;
    submit?: {
        de?: string;
        en?: string;
    };
    target: string;
    selector?: string;
    solution: { x: number; y: number };
    maxDistance: number;
    initial_position?: { x: number; y: number };
}

export interface SelectionStoryPoint extends BaseStoryPoint {
    type: 'area-selection-quiz' | 'point-selection-quiz';
    question_key?: string;
    target: string;
    selector?: string;
    interactionLayerId?: string;
    solution: string[];
    wrong_options?: string[];
    minSelection?: number;
    maxSelection?: number;
}

export type StoryPoint = InfoStoryPoint | QuizStoryPoint | LocationStoryPoint | SelectionStoryPoint;
