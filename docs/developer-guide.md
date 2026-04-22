# Developer Guide — Awareness Map

This is an open-source interactive exhibit built for 65-inch 4K touch tables. It simulates a disaster management operations center where visitors collaboratively manage crisis scenarios. This guide explains how the project is structured, how the core systems work, and how to extend them.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Module Map](#3-module-map)
4. [Application State](#4-application-state)
5. [Deep Validation System](#5-deep-validation-system)
6. [Data Flow: YAML → App](#6-data-flow-yaml--app)
7. [The Layer System](#7-the-layer-system)
8. [The Quiz / Challenge Engine](#8-the-quiz--challenge-engine)
9. [i18n System](#9-i18n-system)
10. [How to Add a New Layer Type](#10-how-to-add-a-new-layer-type)
11. [How to Add a New Story Point Type](#11-how-to-add-a-new-story-point-type)
12. [Build & Dev Setup](#12-build--dev-setup)
13. [4K Performance Notes](#13-4k-performance-notes)

---

## 1. Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Language | TypeScript (target: ESNext, module: ESM) |
| Styles   | SCSS → CSS (direct `<link>` in HTML)     |
| Config   | `js-yaml` + `zod` (runtime validation)   |
| Build    | `tsc --watch` only; no bundler           |

There is intentionally no framework (no React, no Vue). All DOM manipulation is done with a thin `create()` helper. The lack of a bundler means every `.ts` file compiles to a `.js` file at the same path — imports must include the `.js` extension even when importing TypeScript sources.

---

## 2. Project Structure

```
src/
  main.ts                  ← entry point: DOM wiring, event dispatch
  modules/
    state.ts               ← app singleton
    types.ts               ← TypeScript interfaces (AppState, LayerConfig, …)
    schemas.ts             ← Zod schemas for all YAML/JSON files
    layers.ts              ← layer DOM builder and visibility engine
    poi.ts                 ← POI marker rendering and info overlays
    info-box.ts            ← view router: home / role-select / map / quiz
    scenarios.ts           ← scenario + role helpers
    translater.ts          ← t() i18n function
    context-loader.ts      ← parses config/context.yaml
    layer-loader.ts        ← parses config/layers.yaml
    validation.ts          ← relational validation rules
    validator-i18n.ts      ← translation completeness checks
    time-slider.ts         ← slider UI and animateSliderToTime()
    interactions.ts        ← addPointerClick / addDelayedPointerClick
    rich-text.ts           ← Markdown → DOM renderer
    lib.ts                 ← create(), loadJSON(), loadTEXT(), loadYAML()
    preloader.ts           ← background asset loading + dev validation overlay
    quiz/
      engine-core.ts       ← story point navigator and handleAction()
      render-text.ts       ← renders info / end-screen / quiz steps
      render-map.ts        ← renders location-quiz / selection steps
      types.ts             ← StoryPoint, QuizOutcome, NextConfig types
      schemas.ts           ← Zod schemas for challenge.yaml
      challenge-normalizer.ts  ← normalizes legacy YAML shapes
      ui.ts                ← quiz answer state helpers

config/
  layers.yaml              ← technical layer type definitions
  context.yaml             ← all layer instances, paths, icons
  content.de.yaml / content.en.yaml

assets/scenarios/          ← content files (YAML, JSON, SVG, images)
scripts/
  validate.mjs             ← CLI deep validator
```

---

## 3. Module Map

### `state.ts`

The `app` singleton holds all mutable runtime state. It is imported directly by every module that needs to read or write state — there is no reactive wrapper or store. The canonical shape is `AppState` in `types.ts`.

```ts
export const app: AppState = {
	context: null,
	language: "de",
	width: 3840,
	height: 2160,
	currentScenario: null,
	currentRole: null,
	activeLayers: new Set(),
	quizStepLayers: new Set(),
	view: "home",
	challengeResults: {},
	ui: {
		/* DOM element refs */
	},
};
```

### `layers.ts`

The core rendering engine. Responsible for:

- Building layer DOM elements once (`ensureLayerBuilt`) and caching them in `layerElements`.
- Syncing visibility via `renderLayers()` — toggles the `hidden` class and rebuilds the sidebar toggle buttons.
- Determining which layers are available for the current view/scenario/role via `getAvailableLayers()`.
- Providing `resetLayers()` (full reset to `context.yaml` defaults) and `clearLayerCache()` (force rebuild, used on language switch).

Render calls are serialized via a `lastRenderPromise` chain to prevent race conditions during rapid step transitions.

### `poi.ts`

Renders `locations`-type layer content. Builds `div.poi-marker` elements, wires tap handlers to show info overlays, handles `status_timeline` changes via `updateMarkersForTime()`, and live-updates open overlays via `updateOverlayText()`.

### `quiz/engine-core.ts`

Navigates between story points. Entry point is `runQuiz(path, content, controls, onFinish)`. Internally:

- `loadPoint(id)` — cleans up previous step state, activates new layers, fires `app-request-view-update`, then delegates rendering to `render-text.ts` or `render-map.ts`.
- `handleAction(point, outcome)` — resolves the next step ID from `point.next`, tracks `lastQuizPointId` for retry-on-fail, and calls `loadPoint` again.

### `info-box.ts`

The view router. `updateView()` switches the info panel content based on `app.view`:

- `"home"` → `renderHome()`: scenario selection buttons
- `"role-select"` → `renderRoleSelection()`: role buttons for the current scenario
- `"map"` → `renderMapUI()`: challenge intro text + start button
- `"quiz"` → `refreshCurrentPoint()`: re-renders the current quiz step (used on language change)

Also exports `resetApp()` (clears all state, returns to home) and `backToRoles()` (returns to role selection).

### `preloader.ts`

Runs in the background after init. Loads all referenced assets and runs the deep validator. On errors, shows a developer overlay so authoring mistakes surface immediately during content work.

### `translater.ts`

Exports `t(key, fallback?)`. Looks up a dot-path in the currently loaded `content.*.yaml` object. Called throughout the codebase for all UI strings.

### `rich-text.ts`

Converts a Markdown string to DOM nodes. `renderBlockText(el, md)` handles paragraphs, bold, and italic. `renderInlineText(el, md)` handles inline formatting for headings.

---

## 4. Application State

All state lives in the `app` singleton (`state.ts`). It is not reactive — modules must explicitly call `updateView()` or `renderLayers()` after mutating state.

### Key fields

| Field             | Type                                         | Description                                                                                              |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `view`            | `"home" \| "role-select" \| "map" \| "quiz"` | Current screen. Changing it and calling `updateView()` transitions the UI.                               |
| `currentScenario` | `string \| null`                             | ID of the selected scenario (e.g. `"flood"`).                                                            |
| `currentRole`     | `string \| null`                             | ID of the selected role (e.g. `"fire_brigade"`).                                                         |
| `activeLayers`    | `Set<string>`                                | Layer IDs currently visible on the map. Modified by user toggles and quiz steps.                         |
| `quizStepLayers`  | `Set<string>`                                | Subset of `activeLayers` that were added by the current quiz step. Cleared on step transition.           |
| `context`         | `ProjectContext \| null`                     | Parsed `context.yaml` — the source of truth for all layer definitions.                                   |
| `language`        | `"de" \| "en"`                               | Current UI language. Changing it and calling `clearLayerCache()` + `updateView()` re-renders everything. |
| `ui`              | object                                       | Cached DOM element references, populated once during `main.ts` init.                                     |

### View transition example

```ts
// Navigate from home to role selection
app.currentScenario = "flood";
app.currentRole = null;
app.view = "role-select";
await resetLayers();
await updateView();
```

### Layer activation rules

`activeLayers` is the merged result of:

1. Layers with `initially_visible: true` and `quiz_only: false` in `context.yaml` — set by `syncActiveLayers()` on each reset.
2. Layers added by the current quiz step (`activeLayerIds` in the story point) — tracked in `quizStepLayers`.
3. User toggle actions — add/remove individual IDs directly.

`quizStepLayers` is a subset of `activeLayers`. On step transition, `loadPoint()` removes all IDs in `quizStepLayers` from `activeLayers` before adding the new step's layers.

---

## 5. Deep Validation System

To maintain stability, the project uses a tiered validation system. Authoring errors are caught at multiple levels before they can crash the exhibit.

### Tier 1 — Schema validation (`schemas.ts` + Zod)

Every YAML and JSON file has a corresponding Zod schema. Files are parsed and validated at load time. Structural violations (wrong field types, missing required fields) produce a Zod error and abort loading.

```ts
// schemas.ts — example: end-screen requires result
const EndScreenStoryPointSchema = z.object({
	id: z.string(),
	type: z.literal("end-screen"),
	result: z.enum(["passed", "failed"]), // required, enforced at load time
	next: z.never().optional(),
	// ...
});
```

### Tier 2 — Relational validation (`validation.ts`)

Checks cross-file consistency after parsing. Examples:

- Every `next` target ID must exist as a story point in the same challenge.
- Every `activeLayerIds` entry must exist as a layer key in `context.yaml`.
- Every role ID in `scenario.yaml` must have a corresponding entry in `context.yaml`.
- POI locations with a `status` must have a matching icon in `status_poi_icons` (warning only).

```ts
// Broken next-link example — caught by validateChallengeRelations()
{
    id: "step-1",
    next: "step-typo"   // "step-typo" does not exist → validation error
}
```

### Tier 3 — i18n validation (`validator-i18n.ts`)

Checks translation completeness. Labels are only required when `toggle` is `available` or `deactivated` (hidden layers have no sidebar button and therefore need no label). Both `de` and `en` must be present.

### Tier 4 — Asset existence (`scripts/validate.mjs`)

The CLI script loads all config files and then checks that every `src` path resolves to an actual file on disk. This is the only tier that can verify physical file presence.

```bash
node scripts/validate.mjs
# → [ERROR] config/context.yaml: Layer "flood_fire_brigade_emergency_calls"
#           src "/assets/.../emergency_calls.json" not found
```

### In-app integration

`preloader.ts` runs tiers 1–3 in the background after the app initialises. If any errors are found, a red developer overlay appears on screen listing them. This surfaces authoring mistakes immediately during content work without requiring a terminal.

---

## 6. Data Flow: YAML → App

```
config/context.yaml
    → context-loader.ts → initContextLoader() → getNormalizedContext()
    → layers.ts: context variable (ProjectContext)

config/layers.yaml
    → layer-loader.ts → initLayerLoader() → getNormalizedLayerDefinitions()
    → layers.ts: layerDefinitions[] (LayerConfig[])

assets/scenarios/<id>/scenario.yaml
    → scenarios.ts → getScenarioDefinition() / getCurrentScenarioText()

assets/scenarios/<id>/<role>/challenge.yaml
    → engine-core.ts: runQuiz() → loadYAML() → normalizeChallengeDefinition()
    → StoryPoint[] stored in currentStoryPoints

config/content.*.yaml
    → translater.ts → loaded on language init/switch → accessed via t()
```

The `context.yaml` and `layers.yaml` are loaded once at startup by `initLayers()`. Scenario and challenge YAMLs are loaded on demand when a scenario/role is selected or a challenge starts.

---

## 7. The Layer System

### Build once, toggle many times

Every layer is built into a DOM element exactly once. `ensureLayerBuilt(id)` checks the `layerElements` cache first — if the element exists, it returns it immediately. If a build is already in progress (concurrent call), it returns the same `Promise` from `buildingLayers` to prevent duplicate DOM nodes. Only on first access does it actually construct the element and append it to `app.ui.layers`.

```ts
// simplified ensureLayerBuilt logic
if (layerElements.has(id)) return layerElements.get(id)!;
if (buildingLayers.has(id)) return buildingLayers.get(id)!;

const buildPromise = (async () => {
	// ... build DOM element for this layer type ...
	layerElements.set(id, wrapper);
	buildingLayers.delete(id);
	return wrapper;
})();

buildingLayers.set(id, buildPromise);
return buildPromise;
```

### Visibility is a CSS class

Layers are never removed from the DOM. They are shown or hidden by toggling the `hidden` class. `renderLayers()` computes which layers are available, calls `ensureLayerBuilt` for each, and sets `hidden` based on whether the layer ID is in `app.activeLayers`.

```ts
const isActive = app.activeLayers.has(config.id);
layerEl.classList.toggle("hidden", !isActive);
```

### Serialized rendering

`renderLayers()` is called from multiple places (view transitions, quiz steps, language switch). To prevent interleaving, each call chains onto `lastRenderPromise`:

```ts
const currentRender = (async () => {
	await lastRenderPromise; // wait for previous render
	// ... do work ...
})();
lastRenderPromise = currentRender;
return currentRender;
```

### Layer availability rules

`getAvailableLayers()` returns the set of layers that should exist in the DOM for the current state:

- Always includes `global` layers.
- Adds `scenario` layers when `app.currentScenario` is set and `app.view !== "home"`.
- Adds `role` layers when `app.currentRole` is set.
- Applies `exclude_layers` from the current role to suppress cross-role layers (e.g. the police evacuation zone is excluded when playing as fire brigade).
- `quiz_only` layers are only included when explicitly activated via `app.quizStepLayers`.

---

## 8. The Quiz / Challenge Engine

### Entry and exit

`runQuiz(path, content, controls, onFinish)` is the public entry point. It loads and normalises the challenge YAML, resets layers, activates any role-level layers defined in `context.yaml`, and calls `loadPoint("intro")` (or the step after intro if the intro is already displayed in the map view).

When a `passed` end-screen is reached, `handleAction` calls `onFinish("passed")`, which is wired in `engine.ts` to call `backToRoles()`. The passed end-screen button instead calls `resetApp()` directly, navigating to the home screen.

### Step lifecycle (`loadPoint`)

Each call to `loadPoint(id)`:

1. **Cleans up**: removes layers in `quizStepLayers` from `activeLayers`, releases slider locks, calls `abortLocationStep()` / `abortSelectionStep()`.
2. **Applies exclusions**: removes any `excludeLayerIds` from `activeLayers`.
3. **Activates new layers**: adds `activeLayerIds` to both `activeLayers` and `quizStepLayers`.
4. **Syncs the view**: fires `app-request-view-update` and waits for the `app-view-updated` event.
5. **Animates the slider**: calls `animateSliderToTime()` if `slider_time` is set.
6. **Delegates rendering**: calls the appropriate renderer based on `point.type`.

### Outcome resolution (`handleAction`)

After a user action, `handleAction` resolves the next step:

```ts
function handleAction(point: StoryPoint, outcome: boolean | QuizOutcome): void {
	// End-screen: retry on fail, exit on pass
	if (point.type === "end-screen") {
		if (point.result === "failed" && lastQuizPointId) {
			loadPoint(lastQuizPointId); // retry
			return;
		}
		currentOnFinish("passed");
		return;
	}

	// Track last branching step for retry
	if (typeof point.next !== "string") {
		lastQuizPointId = point.id;
	}

	// Resolve outcome → next ID with fallback chain
	const nextId = resolveNextId(point.next, outcome);
	loadPoint(nextId);
}
```

Outcome fallback chain:

- `half-wrong` → falls back to `half` → falls back to `wrong`
- `wrong-neutral` / `all-neutral` / `all-wrong` → fall back to `wrong`

### Language change mid-quiz

When the language is switched during a quiz, `updateView()` calls `refreshCurrentPoint()`. This re-renders the current step from `currentPoint` and `currentOnAction` (module-level variables) without re-running the step logic — no layer changes, no slider animations.

### Renderer modules

| Module           | Handles                                                        |
| ---------------- | -------------------------------------------------------------- |
| `render-text.ts` | `info`, `end-screen`, `quiz` (multiple choice)                 |
| `render-map.ts`  | `location-quiz`, `point-selection-quiz`, `area-selection-quiz` |

Both modules receive `(content, controls, point, onAction)` and call `onAction(outcome)` when the user submits an answer.

---

## 9. i18n System

Translations come from three sources, merged at runtime:

### 1. UI chrome — `config/content.*.yaml`

Loaded by `translater.ts` on startup and on language switch. Accessed anywhere via:

```ts
import { t } from "./translater.js";

button.innerText = t("challenges.common.start_button");
// with fallback:
button.innerText = t("challenges.common.submit");
```

The key is a dot-separated path into the YAML structure. If the key is missing, the fallback string is returned (or the key itself if no fallback is provided).

### 2. Challenge content — inline in `challenge.yaml`

Story point `text` objects carry `de` and `en` sub-objects. The engine reads the currently active language from `app.language` at render time via helpers in `challenge-normalizer.ts`:

```ts
// challenge-normalizer.ts
export function getStoryPointTitle(point: BaseStoryPoint): string {
	return point.text?.[app.language]?.title ?? "";
}
```

This means inline text is always up-to-date — switching language while the quiz is active and calling `refreshCurrentPoint()` re-renders with the correct language immediately.

### 3. POI content — `translations` / `status_translations` in JSON

POI info overlays read text from the JSON file loaded by `renderPOILayer`. The overlay builder reads `app.language` at the time the overlay is opened. Status overrides use the same language key. See the [Authoring Guide §9](./authoring-guide.md#9-location-json-files-pois) for the JSON structure.

---

## 10. How to Add a New Layer Type

### Step 1 — Declare the type in `config/layers.yaml`

```yaml
my_new_type:
  class: layer-my-new-type
  type: my-new-type # internal type key used in layers.ts switch
  toggle: available
  interaction: none
  playback_control: false
```

### Step 2 — Add a build case in `layers.ts`

Inside `ensureLayerBuilt`, add a branch in the `switch (config.type)` block:

```ts
case "my-new-type": {
    const el = create("div");
    el.className = "my-new-type-content";
    // Load your asset, wire event listeners, etc.
    if (src) {
        const data = await loadJSON(src);
        // ... populate el from data ...
    }
    wrapper.append(el);
    break;
}
```

### Step 3 — Add a Zod schema for any new `context.yaml` fields

If the new layer type introduces new optional fields in `context.yaml`, add them to the `ContextLayerDefinitionSchema` in `schemas.ts`.

### Step 4 — Add to the TypeScript type

If `ContextLayer` in `types.ts` needs new fields, add them as optional properties.

### Step 5 — Validate asset paths

If the new type uses a `src` field, `scripts/validate.mjs` will automatically check that the file exists (it validates all `src` fields generically).

---

## 11. How to Add a New Story Point Type

### Step 1 — Add the type to `quiz/types.ts`

```ts
export type StoryPointType =
    | 'info' | 'end-screen' | 'quiz'
    | 'location-quiz' | 'point-selection-quiz' | 'area-selection-quiz'
    | 'my-new-type';    // ← add here

export interface MyNewStoryPoint extends BaseStoryPoint {
    type: 'my-new-type';
    next: NextConfig;
    myCustomField: string;
}

export type StoryPoint = InfoStoryPoint | EndScreenStoryPoint | ... | MyNewStoryPoint;
```

### Step 2 — Add a Zod schema in `quiz/schemas.ts`

Mirror the TypeScript interface as a Zod schema and add it to the `StoryPointSchema` union.

### Step 3 — Add a renderer

Create a render function (in `render-text.ts` or `render-map.ts`, or a new file):

```ts
export function renderMyNewType(
    content: HTMLElement,
    controls: HTMLElement,
    point: MyNewStoryPoint,
    onAction: (outcome: boolean | QuizOutcome) => void,
): void {
    content.innerHTML = "";
    controls.innerHTML = "";
    // Build UI...
    // When user submits:
    addDelayedPointerClick(submitBtn, () => {
        const isCorrect = /* ... evaluate answer ... */;
        onAction(isCorrect);
    });
}
```

### Step 4 — Wire it in `engine-core.ts`

Add a branch in `loadPoint` and in `refreshCurrentPoint`:

```ts
// in loadPoint:
else if (point.type === "my-new-type")
    renderMyNewType(currentContent, currentControls, point, onAction);

// in refreshCurrentPoint:
else if (point.type === "my-new-type")
    renderMyNewType(currentContent, currentControls, currentPoint, currentOnAction);
```

---

## 12. Build & Dev Setup

```bash
npm install
npm run dev     # runs tsc --watch and sass --watch in parallel
```

Open `index.html` directly in a browser (no dev server needed — all imports are ESM relative paths).

```bash
# Type-check only
npx tsc --noEmit

# Full validation (type check + asset integrity)
npx tsc && node scripts/validate.mjs
```

The TypeScript config targets ESNext with module resolution `node`. Output files are placed alongside source files (no `dist/` folder). The browser loads `src/main.js` directly.

---

## 13. 4K Performance Notes

The app is designed for a 3840×2160 pixel canvas on a 65-inch touch table. Performance choices that follow from this:

- **No bundler, no framework**: reduces JS parse time and eliminates hydration overhead. The DOM is built imperatively.
- **Layer cache**: `layerElements` prevents redundant DOM creation. A layer built once stays in memory; only its `hidden` class changes.
- **Serialized render queue**: `lastRenderPromise` ensures `renderLayers()` calls don't interleave, preventing flicker during rapid quiz step transitions.
- **`requestAnimationFrame` for slider updates**: time slider and Lottie frame sync use `rAF` to stay in sync with the display refresh rate.
- **WebP for all raster images**: all static images use WebP format for smaller file sizes and faster decode.
- **SVG icons loaded as inline text**: POI icons are injected as inline SVG strings (via `loadTEXT`) rather than `<img>` tags to allow CSS colour theming and avoid additional HTTP requests.
- **Offline-first**: all dependencies (Lottie, js-yaml, zod) are bundled locally under `node_modules` and referenced via import maps in `index.html`. No CDN calls.

---

**Project Documentation:**

- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
