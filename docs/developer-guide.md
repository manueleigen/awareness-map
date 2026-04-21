# Developer Guide — Awareness Map

This is an open-source interactive exhibit built for 65-inch 4K touch tables. It simulates a disaster management operations center where visitors collaboratively manage crisis scenarios. This guide explains how the project is structured and how to extend it.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Module Map](#3-module-map)
4. [Application State](#4-application-state)
5. [Data Flow: YAML → App](#5-data-flow-yaml--app)
6. [The Layer System](#6-the-layer-system)
7. [The Quiz / Challenge Engine](#7-the-quiz--challenge-engine)
8. [i18n System](#8-i18n-system)
9. [How to Add a New Layer Type](#9-how-to-add-a-new-layer-type)
10. [How to Add a New Story Point Type](#10-how-to-add-a-new-story-point-type)
11. [Build & Dev Setup](#11-build--dev-setup)
12. [4K Performance Notes](#12-4k-performance-notes)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (target: ESNext, module: ESM) |
| Styles | SCSS → CSS (no build bundler; direct `<link>` in HTML) |
| Lottie | `lottie-web` (local, no CDN) |
| Web Components | `@lottiefiles/dotlottie-wc` (local) |
| Config parsing | `js-yaml` + `zod` (runtime validation) |
| Build | `tsc --watch` only; no Webpack/Vite/Rollup |
| Server | Any static file server (e.g. `npx serve .`) |

There is **no framework** (no React, Vue, Angular). All DOM manipulation is direct TypeScript. This is intentional for performance and offline reliability.

**Rendering engine:** Instead of a mapping library (e.g. Leaflet), all layers are rendered as absolutely positioned DOM/SVG elements on a fixed 3840×2160 pixel canvas. This enables native Lottie integration and advanced CSS blending (`mix-blend-mode`). Coordinates (`x`, `y`) in location JSON files are pixel values relative to the top-left of this canvas.

---

## 2. Project Structure

```
/
├── index.html                   ← Entry point
├── src/
│   ├── main.ts                  ← Bootstraps the app; loaded by index.html
│   └── modules/                 ← All TypeScript modules
│       ├── state.ts             ← Central app state (singleton)
│       ├── types.ts             ← TypeScript interfaces + re-exports
│       ├── schemas.ts           ← Zod schemas (YAML/JSON validation)
│       ├── app.ts               ← Top-level event listeners
│       ├── main.ts              ← View routing & UI updates
│       ├── layers.ts            ← Layer rendering engine
│       ├── layer-loader.ts      ← Loads + normalizes layers.yaml
│       ├── context-loader.ts    ← Loads + normalizes context.yaml
│       ├── poi.ts               ← POI marker rendering & overlays
│       ├── time-slider.ts       ← Timeline slider UI + Lottie seek
│       ├── engine.ts            ← Public entry point for starting quizzes
│       ├── scenarios.ts         ← Loads scenario.yaml + challenge.yaml
│       ├── info-box.ts          ← Info/role-select panel rendering
│       ├── translater.ts        ← i18n (loads content.*.yaml)
│       ├── preloader.ts         ← Background asset preloading
│       ├── interactions.ts      ← Shared pointer/touch helpers
│       ├── rich-text.ts         ← Markdown → HTML renderer
│       ├── lib.ts               ← Resilient loaders (JSON, YAML, TEXT)
│       ├── validation.ts        ← Runtime schema validation helpers
│       ├── error-overlay.ts     ← Dev-mode error display
│       └── screen-zoom.ts       ← 4K viewport scaling
│       └── quiz/
│           ├── engine-core.ts   ← Quiz step navigation + outcome logic
│           ├── render-text.ts   ← Renders info/quiz text panels
│           ├── render-map.ts    ← Renders map-interaction quiz steps
│           ├── ui.ts            ← Quiz UI helpers (answer clearing, etc.)
│           ├── challenge-normalizer.ts ← Normalizes challenge.yaml data
│           └── types.ts         ← Quiz-specific internal types
├── config/
│   ├── layers.yaml              ← Layer type definitions
│   ├── context.yaml             ← Layer instances, paths, visibility
│   ├── content.de.yaml          ← German UI strings
│   └── content.en.yaml          ← English UI strings
├── assets/
│   ├── scenarios/               ← Per-scenario assets + YAML
│   └── icons/                   ← SVG icons
├── css/                         ← SCSS source files
└── docs/                        ← This documentation
```

---

## 3. Module Map

### `state.ts`
Exports the single `app` object. All modules import from here.  
Never construct a second instance. Treat it as a read/write global.

### `types.ts`
Central TypeScript interfaces. YAML-derived types are defined in `schemas.ts` (via Zod inference) and re-exported from `types.ts` for backwards compatibility.

### `schemas.ts`
Zod schemas for all YAML and JSON input files. Provides:
- Runtime validation (run via `validation.ts`)
- TypeScript types via `z.infer<>`

### `layers.ts`
The core rendering engine. Responsibilities:
- Builds DOM elements for each layer type on demand
- Manages the `layerElements` cache (prevents duplicate DOM nodes)
- Serializes concurrent `renderLayers()` calls via `lastRenderPromise`
- Calls `syncActiveLayers()` which reads `app.activeLayers` and applies `hidden` classes

### `context-loader.ts`
Loads `config/context.yaml`, validates it, and normalizes it into the `ProjectContext` shape that the rest of the app uses.

### `layer-loader.ts`
Loads `config/layers.yaml` and expands each layer entry into a full `LayerConfig`.

### `poi.ts`
Renders location JSON files as marker layers. Handles:
- Marker DOM creation and positioning
- POI overlay (info popup) open/close
- `applyMarkerStatus()`: updates marker icons and overlay text based on `status`
- `updateMarkersForTime()`: drives live status changes as the time slider moves

### `time-slider.ts`
Manages the playback slider for animated layers (`lottie-sequence`, `png-sequence`, `svg-sequence`). Uses `requestAnimationFrame` for smooth 60fps scrubbing.  
`animateSliderToTime()` provides a programmatic tween to a target time.

### `engine.ts`
Thin public entry point. `startQuiz(path)` switches `app.view` to `"quiz"`, delegates to `quiz/engine-core.ts`, then resets layers when the quiz ends.

### `scenarios.ts`
Loads `scenario.yaml` and `challenge.yaml` on demand, cached per path. Exposes helpers like `getRoleSliderConfig()` and `getRoleActiveLayerIds()`.

### `info-box.ts`
Renders the left-side info panel for all views:
- `home`, `scenario-select`, `role-select` → static text + navigation
- `map` → layer control summary
- `quiz` → delegates to `quiz/render-text.ts` and `quiz/render-map.ts`

### `quiz/engine-core.ts`
Core quiz navigation. Key responsibilities:
- Loads challenge YAML
- Steps through `story_points` array
- Calculates quiz outcomes (`right / half / wrong / …`)
- Applies `activeLayerIds` / `excludeLayerIds` for each step
- Handles `terminalStatus: failed` → retry navigation
- Exports `refreshCurrentPoint()` for mid-quiz language switches

### `lib.ts`
Three resilient loaders — all return `null` on failure instead of throwing:
- `loadJSON(url)` → parsed object
- `loadYAML(url)` → parsed object
- `loadTEXT(url)` → raw string

---

## 4. Application State

`state.ts` exports one singleton:

```typescript
const app: AppState = {
  language: "de",
  width: 3840,
  height: 2160,
  currentScenario: null,          // e.g. "flood"
  currentRole: null,              // e.g. "fire_brigade"
  activeLayers: new Set(),        // IDs of layers currently shown on the map
  quizStepLayers: new Set(),      // IDs activated by the current quiz step
  view: "home",                   // "home" | "scenario-select" | "role-select" | "map" | "quiz"
  challengeResults: {},           // { "flood_fire_brigade": { completed: true, … } }
  context: null,                  // normalized ProjectContext from context.yaml
  ui: { … }                       // cached DOM element references
}
```

**View lifecycle:**

```
home → scenario-select → role-select → map ↔ quiz
                                         ↑
                                    (escape button)
```

View changes fire a `CustomEvent("app-request-view-update")` that `main.ts` listens to.

**Layer visibility** is driven by two sets:
- `app.activeLayers` — persistent user-toggleable layers
- `app.quizStepLayers` — transient layers active only for a quiz step

`syncActiveLayers()` in `layers.ts` computes the union and applies `hidden` classes.

---

## 5. Data Flow: YAML → App

```
config/layers.yaml
  └─ layer-loader.ts → LayerConfig[]
                            │
config/context.yaml         │
  └─ context-loader.ts → ProjectContext
                            │
                     layers.ts
                       │  │
               renders │  │ reads visibility from app.activeLayers
                       ▼  ▼
                   DOM layer elements

assets/scenarios/<id>/scenario.yaml
  └─ scenarios.ts → ScenarioDefinition (cached)
       │
       └── roles.<id>.challenge → challenge.yaml
             └─ challenge-normalizer.ts → StoryPoint[]
                   │
             quiz/engine-core.ts → steps through quiz flow
```

YAML files are loaded lazily and cached. No YAML file is fetched twice.

---

## 6. The Layer System

### Layer lifecycle

1. **Definition** — `layers.yaml` defines the type and interaction mode.
2. **Instance** — `context.yaml` gives the layer an ID, asset path, label, and availability.
3. **Build** — `ensureLayerBuilt(id)` creates the DOM element once and caches it in `layerElements`.
4. **Render** — `renderLayers()` calls `syncActiveLayers()` to show/hide layers based on `app.activeLayers`.

### Layer DOM structure

Each layer is a `<div id="layer-<id>" class="layer layer-<type>">`.  
Inside that wrapper, content varies by type:
- `static-image` → `<img>`
- `pulsing-image` → `<img>` + `<img class="pulsing-overlay">`
- `areas` → `<div class="area-wrapper">` containing inlined SVG
- `lottie-sequence` → `<div id="player-<id>">` (Lottie target)
- `png-sequence` / `svg-sequence` → `<div class="sequence-player">` with `<img class="sequence-frame">`
- `locations` → `<div>` containing marker elements from `renderPOILayer()`

### `syncActiveLayers()`

Called after every state change that might affect visibility. Iterates all registered `layerDefinitions`, checks whether the layer should be visible given the current `app.activeLayers` + `app.quizStepLayers`, and toggles the `hidden` CSS class.

---

## 7. The Quiz / Challenge Engine

### Entry point

```typescript
// engine.ts
startQuiz("/assets/scenarios/flood/fire_brigade/challenge.yaml");
```

This sets `app.view = "quiz"` and calls `runQuiz()` in `quiz/engine-core.ts`.

### Step rendering

`loadPoint(storyPoint)` dispatches to the correct renderer:

| Story point type | Renderer |
|---|---|
| `info` | `quiz/render-text.ts` |
| `quiz` | `quiz/render-text.ts` |
| `location-quiz` | `quiz/render-map.ts` |
| `point-selection-quiz` | `quiz/render-map.ts` |
| `area-selection-quiz` | `quiz/render-map.ts` |

### Outcome calculation

`calculateOutcome(type, solution, wrongOptions, selected)` in `engine-core.ts`:

1. Count correct selections (those in `solution`)
2. Count wrong selections (those in `wrong_options`)
3. Count neutral selections (everything else)
4. Map to: `right`, `half`, `wrong`, `half-wrong`, `wrong-neutral`, `all-neutral`, `all-wrong`

The engine then resolves `next[outcome]` with a fallback chain toward broader keys.

### Layer management during quiz

When a step opens:
1. Layers in `activeLayerIds` are added to `app.quizStepLayers`
2. Layers in `excludeLayerIds` are added to a temporary exclude set
3. `renderLayers()` is called

When moving to the next step:
1. `app.quizStepLayers` is cleared
2. The next step's layers are applied

When the quiz ends:
1. `resetLayers()` restores the default visibility state for the current scenario+role
2. `resetSliders()` clears any `slider-fixed` locks

---

## 8. i18n System

Languages: `"de"` (German) and `"en"` (English). The active language is `app.language`.

Content sources:
- **UI strings** → `config/content.de.yaml` / `content.en.yaml`, loaded by `translater.ts`
- **Challenge text** → inline in `challenge.yaml` under `text.de` / `text.en`
- **POI text** → `translations.title/description` in location JSON files

Language switching dispatches `app-request-view-update`, which causes `main.ts` to re-render the current view. For the quiz view, `refreshCurrentPoint()` in `engine-core.ts` re-renders the active step without resetting progress.

To add a new language:
1. Create `config/content.<lang>.yaml`
2. Add the lang code to the `Language` type in `types.ts`
3. Add a language switch option to the HTML/SCSS

---

## 9. How to Add a New Layer Type

**Step 1 — Register the type in `config/layers.yaml`**

```yaml
layer_types:
  my_new_type:
    type: my-new-type         # runtime key used in code
    interaction: none         # or: "timeline", "inspect-area", "inspect-location"
    playback_control: false
```

**Step 2 — Update the Zod schema in `schemas.ts`**

```typescript
// In ContextLayerTypeSchema:
z.enum([
  "static_image",
  "locations",
  // …
  "my_new_type",    // ← add here
])
```

**Step 3 — Add the runtime type to `types.ts`**

```typescript
// In LayerConfig.type:
type:
  | "static-image"
  | …
  | "my-new-type";    // ← add here
```

**Step 4 — Add a build case in `layers.ts`**

Inside `ensureLayerBuilt()`, in the `switch (config.type)` block:

```typescript
case "my-new-type": {
  const content = create("div");
  content.className = "my-new-type-content";
  // … build DOM from ctxLayer.src
  wrapper.append(content);
  break;
}
```

**Step 5 — Add CSS** in the appropriate SCSS file (e.g. `css/_layers.scss`).

**Step 6 — Add instances in `context.yaml`** using `layer_type: my_new_type`.

---

## 10. How to Add a New Story Point Type

**Step 1 — Add the Zod schema in `schemas.ts`**

```typescript
const MyNewStoryPointSchema = z.object({
  ...storyPointBase,
  type: z.literal("my-new-type"),
  text: StoryPointTextSchema,
  // … type-specific fields
  next: z.union([z.string(), QuizOutcomeMapSchema]).optional(),
}).strict();

// Add to the discriminated union:
export const StoryPointSchema = z.discriminatedUnion("type", [
  InfoStoryPointSchema,
  // …
  MyNewStoryPointSchema,   // ← add here
]);
```

**Step 2 — Update `quiz/types.ts`** if internal quiz types need updating.

**Step 3 — Decide which renderer handles it**

- Text-based (shows in the info box sidebar) → `quiz/render-text.ts`
- Map-based (requires user interaction on the map) → `quiz/render-map.ts`

**Step 4 — Add the renderer function**

In the appropriate render file, create:

```typescript
export function renderMyNewType(
  point: Extract<StoryPoint, { type: "my-new-type" }>,
  container: HTMLElement,
  controls: HTMLElement,
  onNext: (nextId?: string) => void
): void {
  // … build UI, wire interaction, call onNext() when done
}
```

**Step 5 — Dispatch to it in `quiz/engine-core.ts`**

In `loadPoint()`:

```typescript
switch (point.type) {
  case "info": …
  case "quiz": …
  case "my-new-type":
    renderMyNewType(point, contentEl, controlsEl, handleNext);
    break;
}
```

**Step 6 — Implement outcome scoring** in `calculateOutcome()` if the new type has correctness evaluation.

---

## 11. Build & Dev Setup

```bash
npm install          # install dependencies (js-yaml, zod, lottie-web, …)
npm run sass:watch   # compile SCSS → CSS in watch mode
npx tsc -w           # compile TypeScript in watch mode
npx serve .          # serve the project on http://localhost:3000
```

Open in a **Chromium-based browser** at 3840×2160 or use browser dev tools to set a custom viewport.

For a kiosk deployment on the actual touch table:

```bash
kiosk-browser -f -s /path/to/folder index.html
# -f: fullscreen, -s: serve directory, -d: devtools
```

TypeScript errors show in the terminal. Runtime validation errors from Zod show in the browser console and (in dev builds) via `error-overlay.ts`.

---

## 12. 4K Performance Notes

The app is designed to run smoothly at 3840×2160 on lower-powered kiosk hardware.

- **No bundler:** Files are loaded directly. This avoids bundler overhead and keeps hot-reload trivial during development.
- **`requestAnimationFrame` for sliders:** `time-slider.ts` never forces layout in a `setInterval`. All scrubbing goes through `rAF`.
- **Layer build cache:** `buildingLayers` (a `Map<id, Promise>`) prevents the same layer from being built twice in parallel. `layerElements` caches the finished DOM node forever.
- **Serialized renders:** `lastRenderPromise` chains all `renderLayers()` calls so concurrent visibility updates don't race.
- **`vw` / `rem` units:** All SCSS uses viewport-relative units. Never use `px` for layout-critical dimensions.
- **Offline first:** All libraries (`lottie-web`, `dotlottie-wc`, `js-yaml`, `zod`) are in `node_modules` and served locally. No CDN links anywhere.
- **Asset fallbacks:** `lib.ts` loaders return `null` on network error. Every consumer checks for `null` before using the result. The app never crashes on a missing asset.

---
**Project Documentation:**
- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
