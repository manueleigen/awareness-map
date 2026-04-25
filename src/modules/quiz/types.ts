export type StoryPointType = 'info' | 'end-screen' | 'quiz' | 'area-selection-quiz' | 'point-selection-quiz' | 'location-quiz';

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
    button?: string;
}

export interface QuizOption {
    value: string;
    text?: {
        de?: string;
        en?: string;
    };
}

export interface BaseStoryPoint {
    id: string;
    type: StoryPointType;
    text?: {
        de?: LocalizedInlineText;
        en?: LocalizedInlineText;
    };
    next?: NextConfig;
    showLayersById?: string[];
    hideLayersById?: string[];
    pulseLayersById?: string[];
    hintLayerOverlaysById?: string[];
    hintLayerOverlayDuration?: number;
    slider_time?: string;
    slider_time_layer?: string;
    slider_time_fixed?: boolean;
}

export interface InfoStoryPoint extends BaseStoryPoint {
    type: 'info';
}

export interface EndScreenStoryPoint extends BaseStoryPoint {
    type: 'end-screen';
    result: 'passed' | 'failed';
    next?: never;
}

export interface QuizStoryPoint extends BaseStoryPoint {
    type: 'quiz';
    next: NextConfig;
    options: QuizOption[];
    solution: string[];
    minAnswers?: number;
    maxAnswers?: number;
}

export interface LocationStoryPoint extends BaseStoryPoint {
    type: 'location-quiz';
    next: NextConfig;
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
    next: NextConfig;
    target: string;
    selector?: string;
    interactionLayerId?: string;
    solution: string[];
    wrong_options?: string[];
    minSelection?: number;
    maxSelection?: number;
}

export type StoryPoint = InfoStoryPoint | EndScreenStoryPoint | QuizStoryPoint | LocationStoryPoint | SelectionStoryPoint;
