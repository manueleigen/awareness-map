import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const LocalizedTextSchema = z
	.object({ de: z.string(), en: z.string() })
	.partial();

// ─── context.yaml ─────────────────────────────────────────────────────────────

const ContextLayerTypeSchema = z.enum([
	"static_image",
	"locations",
	"area_overlay",
	"lottie_sequence",
	"pulsing_overlay",
	"png_sequence",
	"svg_sequence",
]);

export const ContextLayerDefinitionSchema = z.object({
	id: z.string(),
	layer_type: ContextLayerTypeSchema,
	available_from: z.enum(["scenario", "role", "global"]).optional(),
	toggle: z.enum(["available", "deactivated", "hidden", "none"]).optional(),
	label: z.record(z.string(), z.string()).optional(),
	class: z.string().optional(),
	opacity_control: z.boolean().optional(),
	playback_control: z.boolean().optional(),
	start_time: z.string().optional(),
	end_time: z.string().optional(),
	src: z.string(),
	src_overlay: z.string().optional(),
	icon: z.string().optional(),
	slider_icon: z.string().optional(),
	poi_icon: z.string().optional(),
	status_poi_icons: z.record(z.string(), z.string()).optional(),
	initially_visible: z.boolean().optional(),
	quiz_only: z.boolean().optional(),
	map_only: z.boolean().optional(),
	z_index: z.number().optional(),
	toggle_order: z.number().optional(),
});

export const ContextRoleDefinitionSchema = z.object({
	id: z.string(),
	exclude_layers: z.array(z.string()).optional(),
	layers: z.array(ContextLayerDefinitionSchema).optional(),
});

export const ContextScenarioDefinitionSchema = z.object({
	id: z.string(),
	active: z.boolean().optional(),
	layers: z.array(ContextLayerDefinitionSchema).optional(),
	roles: z.array(ContextRoleDefinitionSchema).optional(),
});

export const ProjectContextDefinitionSchema = z.object({
	global: z
		.object({
			validator_overlay: z.boolean().optional(),
			layers: z.array(ContextLayerDefinitionSchema).optional(),
		})
		.optional(),
	scenarios: z.array(ContextScenarioDefinitionSchema).optional(),
});

// ─── layers.yaml ──────────────────────────────────────────────────────────────

const LayerTypeSchema = z.enum([
	"static-image",
	"pulsing-image",
	"lottie-sequence",
	"locations",
	"areas",
	"png-sequence",
	"svg-sequence",
]);

export const LayerTypeDefinitionSchema = z.object({
	id: z.string(),
	type: LayerTypeSchema,
	interaction: z.string(),
	playback_control: z.boolean().optional(),
	icon_mode: z.string().optional(),
});

export const LayersYamlSchema = z.object({
	layer_types: z.array(LayerTypeDefinitionSchema),
});

// ─── scenario.yaml ────────────────────────────────────────────────────────────

const LocalizedScenarioTextSchema = z.object({
	title: z.string(),
	short_title: z.string().optional(),
	description: z.string().optional(),
});

export const ScenarioRoleDefinitionSchema = z.object({
	id: z.string(),
	text: z
		.record(z.string(), z.object({ title: z.string() }))
		.optional(),
	challenge: z.string().optional(),
});

export const ScenarioDefinitionSchema = z.object({
	id: z.string(),
	active: z.boolean().optional(),
	text: z.record(z.string(), LocalizedScenarioTextSchema).optional(),
	roles: z.array(ScenarioRoleDefinitionSchema),
});

// ─── challenge.yaml ───────────────────────────────────────────────────────────

const QuizOutcomeMapSchema = z.object({
	right: z.string().optional(),
	half: z.string().optional(),
	"half-wrong": z.string().optional(),
	"wrong-neutral": z.string().optional(),
	"all-neutral": z.string().optional(),
	"all-wrong": z.string().optional(),
	wrong: z.string().optional(),
});

const StoryPointTextSchema = z.object({
	de: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
			question: z.string().optional(),
			button: z.string().optional(),
		})
		.optional(),
	en: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
			question: z.string().optional(),
			button: z.string().optional(),
		})
		.optional(),
});

const QuizOptionSchema = z.object({
	value: z.string(),
	text: z.record(z.string(), z.string()),
});

// Fields shared across all story point types
const storyPointBase = {
	id: z.string(),
	showLayersById: z.array(z.string()).optional(),
	hideLayersById: z.array(z.string()).optional(),
	pulseLayersById: z.array(z.string()).optional(),
	hintLayerOverlaysById: z.array(z.string()).optional(),
	hintLayerOverlayDuration: z.number().optional(),
	slider_time: z.string().optional(),
	slider_time_layer: z.string().optional(),
	slider_time_fixed: z.boolean().optional(),
};

const InfoStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("info"),
	text: StoryPointTextSchema.optional(),

	next: z.union([z.string(), QuizOutcomeMapSchema]).optional(),
}).strict();

const EndScreenStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("end-screen"),
	text: StoryPointTextSchema.optional(),
	result: z.enum(["passed", "failed"]),
}).strict();

const QuizStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("quiz"),
	text: StoryPointTextSchema,
	options: z.array(QuizOptionSchema),
	solution: z.array(z.string()),
	next: z.union([z.string(), QuizOutcomeMapSchema]).optional(),
}).strict();

const LocationQuizStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("location-quiz"),
	text: StoryPointTextSchema,
	target: z.string(),
	initial_position: z.object({ x: z.number(), y: z.number() }).optional(),
	solution: z.array(z.string()),
	maxDistance: z.number(),
	submit: z.record(z.string(), z.string()).optional(),
	next: QuizOutcomeMapSchema.optional(),
}).strict();

const AreaSelectionQuizStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("area-selection-quiz"),
	text: StoryPointTextSchema,
	target: z.string(),
	solution: z.array(z.string()),
	wrong_options: z.array(z.string()),
	minSelection: z.number(),
	maxSelection: z.number(),
	next: QuizOutcomeMapSchema.optional(),
}).strict();

const PointSelectionQuizStoryPointSchema = z.object({
	...storyPointBase,
	type: z.literal("point-selection-quiz"),
	text: StoryPointTextSchema,
	target: z.string(),
	solution: z.array(z.string()),
	wrong_options: z.array(z.string()),
	minSelection: z.number(),
	maxSelection: z.number(),
	next: QuizOutcomeMapSchema.optional(),
}).strict();

export const StoryPointSchema = z.discriminatedUnion("type", [
	InfoStoryPointSchema,
	EndScreenStoryPointSchema,
	QuizStoryPointSchema,
	LocationQuizStoryPointSchema,
	AreaSelectionQuizStoryPointSchema,
	PointSelectionQuizStoryPointSchema,
]);

export const ChallengeYamlSchema = z.object({
	story_points: z.array(StoryPointSchema),
});

// ─── location JSON files ──────────────────────────────────────────────────────

const StatusTranslationSchema = z.record(
	z.string(),
	z.object({
		title: LocalizedTextSchema.optional(),
		description: LocalizedTextSchema.optional(),
	}),
);

const StatusTimelineEntrySchema = z.object({
	time: z.string(),
	status: z.string(),
});

export const LocationSchema = z.object({
	id: z.string(),
	x: z.number(),
	y: z.number(),
	class: z.string().optional(),
	status: z.string().optional(),
	status_timeline: z.array(StatusTimelineEntrySchema).optional(),
	translations: z.object({
		title: LocalizedTextSchema.optional(),
		description: LocalizedTextSchema.optional(),
	}).optional(),
	status_translations: StatusTranslationSchema.optional(),
});

export const LocationJsonSchema = z.object({
	layer_id: z.string(),
	locations: z.array(LocationSchema),
});

// ─── content.yaml ─────────────────────────────────────────────────────────────

export const ContentYamlSchema = z.object({
	navigation: z.object({
		languages: z.record(z.string(), z.string()),
		escape: z.string(),
		back: z.string(),
		next: z.string(),
	}),
	home: z.object({
		title: z.string(),
		description: z.string(),
	}),
	challenges: z.object({
		common: z.object({
			passed_msg: z.string(),
			start_button: z.string(),
			back_to_start: z.string(),
			try_again: z.string(),
			submit: z.string(),
			selected_count: z.string(),
			click_to_place: z.string(),
			select_poi: z.string(),
			deselect_poi: z.string(),
		}),
	}),
});

// ─── Derived TypeScript types (single source of truth) ───────────────────────

export type ContextLayerDefinition = z.infer<typeof ContextLayerDefinitionSchema>;
export type ContextRoleDefinition = z.infer<typeof ContextRoleDefinitionSchema>;
export type ContextScenarioDefinition = z.infer<typeof ContextScenarioDefinitionSchema>;
export type ProjectContextDefinition = z.infer<typeof ProjectContextDefinitionSchema>;
export type LayerTypeDefinition = z.infer<typeof LayerTypeDefinitionSchema>;
export type LayersYamlFile = z.infer<typeof LayersYamlSchema>;
export type LocalizedScenarioText = z.infer<typeof LocalizedScenarioTextSchema>;
export type ScenarioRoleDefinition = z.infer<typeof ScenarioRoleDefinitionSchema>;
export type ScenarioDefinitionInput = z.infer<typeof ScenarioDefinitionSchema>;
export type StoryPoint = z.infer<typeof StoryPointSchema>;
export type ChallengeYaml = z.infer<typeof ChallengeYamlSchema>;
export type LocationEntry = z.infer<typeof LocationSchema>;
export type LocationJson = z.infer<typeof LocationJsonSchema>;
export type ContentYaml = z.infer<typeof ContentYamlSchema>;
