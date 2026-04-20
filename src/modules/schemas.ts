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
	exclude_layers: z.array(z.string()).optional(),
	layers: z.record(z.string(), ContextLayerDefinitionSchema).optional(),
});

export const ContextScenarioDefinitionSchema = z.object({
	layers: z.record(z.string(), ContextLayerDefinitionSchema).optional(),
	roles: z.record(z.string(), ContextRoleDefinitionSchema).optional(),
	active: z.boolean().optional(),
});

export const ProjectContextDefinitionSchema = z.object({
	global: z
		.object({
			layers: z.record(z.string(), ContextLayerDefinitionSchema).optional(),
		})
		.optional(),
	scenarios: z
		.record(z.string(), ContextScenarioDefinitionSchema)
		.optional(),
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
	type: LayerTypeSchema,
	interaction: z.string(),
	playback_control: z.boolean().optional(),
	icon_mode: z.string().optional(),
});

export const LayersYamlSchema = z.object({
	layer_types: z.record(z.string(), LayerTypeDefinitionSchema),
});

// ─── scenario.yaml ────────────────────────────────────────────────────────────

const LocalizedScenarioTextSchema = z.object({
	title: z.string(),
	short_title: z.string().optional(),
	description: z.string().optional(),
});

export const ScenarioRoleDefinitionSchema = z.object({
	text: z
		.record(z.string(), z.object({ title: z.string() }))
		.optional(),
	challenge: z.string().optional(),
});

export const ScenarioDefinitionSchema = z.object({
	id: z.string(),
	active: z.boolean().optional(),
	text: z.record(z.string(), LocalizedScenarioTextSchema).optional(),
	roles: z.record(z.string(), ScenarioRoleDefinitionSchema),
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
		})
		.optional(),
	en: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
			question: z.string().optional(),
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
	activeLayerIds: z.array(z.string()).optional(),
	excludeLayerIds: z.array(z.string()).optional(),
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
});

export const StoryPointSchema = z.discriminatedUnion("type", [
	InfoStoryPointSchema,
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
	}),
	status_translations: StatusTranslationSchema.optional(),
});

export const LocationJsonSchema = z.object({
	layer_id: z.string(),
	locations: z.array(LocationSchema),
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
export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
export type StoryPoint = z.infer<typeof StoryPointSchema>;
export type ChallengeYaml = z.infer<typeof ChallengeYamlSchema>;
export type LocationEntry = z.infer<typeof LocationSchema>;
export type LocationJson = z.infer<typeof LocationJsonSchema>;
