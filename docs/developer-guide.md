# Developer Guide — Awareness Map

This is an open-source interactive exhibit built for 65-inch 4K touch tables. It simulates a disaster management operations center where visitors collaboratively manage crisis scenarios. This guide explains how the project is structured and how to extend it.

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

| Layer | Technology |
|---|---|
| Language | TypeScript (target: ESNext, module: ESM) |
| Styles | SCSS → CSS (direct `<link>` in HTML) |
| Config | `js-yaml` + `zod` (runtime validation) |
| Build | `tsc --watch` only; no bundler |

---

## 2. Project Structure

- `src/modules/`: Main logic.
- `src/modules/quiz/`: Specialized quiz engine.
- `config/`: Global YAML settings.
- `assets/scenarios/`: Content (YAML, JSON, Media).
- `scripts/validate.mjs`: CLI validation tool.

---

## 3. Module Map

### `schemas.ts`
Zod schemas for all input files. Re-exports derived TypeScript types.

### `layers.ts`
The core rendering engine. Manages DOM building and visibility syncing.

### `poi.ts`
POI marker rendering, status handling, and info overlays.

### `quiz/engine-core.ts`
Navigation between `story_points` (`info`, `quiz`, `location-quiz`, `point-selection-quiz`, `area-selection-quiz`, `end-screen`).

### `preloader.ts`
Background asset loading and deep validation trigger.

---

## 4. Application State

Managed via the `app` singleton in `state.ts`. Includes `activeLayers`, `quizStepLayers`, and `challengeResults`.

---

## 5. Deep Validation System

To maintain stability, the project uses a tiered validation system.

### Components
1. **`schemas.ts`**: Defines structural requirements (Zod).
2. **`validation.ts`**: Relational checks (e.g., "does this layer ID exist?").
3. **`validator-i18n.ts`**: Translation completeness.
4. **`scripts/validate.mjs`**: CLI tool that also checks physical **asset existence**.

### Integration
- **CLI**: Run `node scripts/validate.mjs` to verify before committing.
- **In-App**: `preloader.ts` runs validation when idle and shows a developer overlay on error.

---

## 6. Data Flow: YAML → App

1. `context.yaml` → `context-loader.ts` → `ProjectContext`
2. `scenario.yaml` → `scenarios.ts` → `ScenarioDefinition`
3. `challenge.yaml` → `engine-core.ts` → `StoryPoint[]`

---

## 7. The Layer System

Layers are built once (`ensureLayerBuilt`) and then toggled via `syncActiveLayers`. User choices (`app.activeLayers`) are merged with quiz requirements (`app.quizStepLayers`).

---

## 8. The Quiz / Challenge Engine

Supports branching logic via the `next` field. 
- **`info` points**: Progress on button click.
- **`end-screen` points**: Terminal step. `result: passed` → clears quiz state and calls `onFinish`. `result: failed` → engine redirects to `lastQuizPointId` (the last step with a branching `next` map) so the user retries without leaving the challenge.
- **Outcome Logic**: Scores correct/wrong choices and selects the next point based on performance.

---

## 9. i18n System

Translations are merged from multiple sources:
- `content.*.yaml` (UI chrome)
- Inline in `challenge.yaml` (Quiz)
- `translations` / `status_translations` in JSON (POIs)

---

## 12. Build & Dev Setup

```bash
npm install
npm run dev     # runs build:watch and sass:watch
node scripts/validate.mjs
```

---

## 13. 4K Performance Notes

- Optimized for 3840x2160 using `vw` and `rem`.
- `requestAnimationFrame` for all UI updates.
- Layer cache to prevent redundant DOM operations.
- Offline-first: all dependencies are local.

---
**Project Documentation:**
- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
