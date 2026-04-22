# Authoring Guide — Awareness Map

This guide is for content authors: people who create new scenarios, challenges, and POI data without touching TypeScript code. You only need to edit YAML and JSON files.

---

## Table of Contents

1. [Project Structure at a Glance](#1-project-structure-at-a-glance)
2. [Creating a New Scenario](#2-creating-a-new-scenario)
3. [scenario.yaml — Metadata & Roles](#3-scenarioyaml--metadata--roles)
4. [context.yaml — Layers & Visibility](#4-contextyaml--layers--visibility)
5. [Layer Types Reference](#5-layer-types-reference)
6. [challenge.yaml — Story Points & Quiz Logic](#6-challengeyaml--story-points--quiz-logic)
7. [Story Point Types Reference](#7-story-point-types-reference)
8. [Outcome Branching](#8-outcome-branching)
9. [Location JSON Files (POIs)](#9-location-json-files-pois)
10. [SVG Files for Zone Selection](#10-svg-files-for-zone-selection)
11. [Translations & Text Content](#11-translations--text-content)
12. [Validation & Quality Assurance](#12-validation--quality-assurance)
13. [Common Mistakes](#13-common-mistakes)

---

## 1. Project Structure at a Glance

```
assets/
  scenarios/
    global/                        ← shared base layers (city map, buildings, …)
    flood/                         ← one folder per scenario
      scenario.yaml                ← scenario metadata + roles
      flood_simulation.json        ← Lottie animation data
      fire_brigade/
        challenge.yaml             ← quiz steps for this role
        emergency_calls.json       ← POI data
      police/
        challenge.yaml
        evacuation_zones.svg       ← selectable zone layer
      crisis_unit/
        challenge.yaml
        social_media.json

config/
  layers.yaml                      ← technical layer types (rarely edited)
  context.yaml                     ← ALL layer instances, icons, paths, visibility
  content.de.yaml                  ← German UI strings
  content.en.yaml                  ← English UI strings
```

**Rule of thumb:**
- New scenario content → `assets/scenarios/<id>/`
- Layer visibility/icons/labels → `config/context.yaml`
- Challenge quiz flow → `challenge.yaml` inside the role folder
- UI chrome (buttons, titles) → `config/content.de.yaml` / `content.en.yaml`

---

## 2. Creating a New Scenario

### Step 1 — Create the folder
`assets/scenarios/earthquake/`

### Step 2 — Write `scenario.yaml`
Define ID, metadata, and roles. Set `active: true` to make it appear.

### Step 3 — Register layers in `config/context.yaml`
Wire up the assets and visibility rules.

### Step 4 — Write each `challenge.yaml`
Define the story points and quiz questions.

---

## 3. scenario.yaml — Metadata & Roles

```yaml
id: flood            # must match the folder name
active: true         # false = hidden from scenario selection screen

text:
  de:
    title: Der Fluss tritt über die Ufer
    short_title: Flut
    description: |
      **Nach tagelangen Regenfällen …**
  en:
    title: The River Overflows Its Banks
    short_title: Flood

roles:
  fire_brigade:
    text:
      de: { title: Feuerwehr }
      en: { title: Fire Brigade }
    challenge: ./fire_brigade/challenge.yaml
```

---

## 4. context.yaml — Layers & Visibility

See the inline comments in `config/context.yaml` for a full field reference. 

**Important:** Labels are only required if `toggle` is `available` or `deactivated`. Hidden layers do not need labels.

---

## 5. Layer Types Reference

- `static_image`: Plain background/foreground image.
- `locations`: POI markers from JSON.
- `area_overlay`: Selectable zones from SVG.
- `lottie_sequence`: Animated Lottie with slider.
- `pulsing_overlay`: Static base + pulsing top layer.
- `png_sequence` / `svg_sequence`: Frame-based animations.

---

## 6. challenge.yaml — Story Points & Quiz Logic

Challenges consist of `story_points`. The engine steps through them based on the `next` field.

**Common fields:**
- `activeLayerIds`: Layers to show during this step.
- `excludeLayerIds`: Layers to hide.
- `slider_time`: Jump to a specific time (e.g. `"14:00"`).
- `slider_time_fixed`: `true` locks the slider.

---

## 7. Story Point Types Reference

### `info`
A text screen with a "Continue" button. **Must have a `next` destination.**

### `end-screen`
Final step of a challenge. Shows a "Back to Roles" button. **Must NOT have a `next` field.**

### `quiz`
Multiple choice question.

### `location-quiz`
User must place a pin on the map.

### `point-selection-quiz`
User must select specific POI markers.

### `area-selection-quiz`
User must select SVG polygon zones.

---

## 8. Outcome Branching

`next` can be an outcome map:
```yaml
next:
  right: win-screen
  half: half-fail-screen
  wrong: fail-screen
```

---

## 9. Location JSON Files (POIs)

Support for `status_timeline` (automatic icon/text changes over time) and `status_translations` (text overrides per status).

---

## 10. SVG Files for Zone Selection

- `viewBox` must be `0 0 3840 2160`.
- Elements must have a unique `id`.
- Only elements with `fill` or class `st0` are interactive.

---

## 11. Translations & Text Content

In-challenge text lives **inline** in the YAML. UI chrome lives in `config/content.*.yaml`. Markdown is supported in descriptions and questions.

---

## 12. Validation & Quality Assurance

To ensure stability, a **Deep Validator** runs automatically. 

### Running the CLI Validator

```bash
npx tsc && node scripts/validate.mjs
```

**Checks include:**
- Broken links (`next` targets, `activeLayerIds`).
- Missing assets (images, JSONs).
- Translation completeness.
- Dead ends (steps that are not `end-screen` but have no `next`).

---

## 13. Common Mistakes

| Problem | Cause | Fix |
|---|---|---|
| Dead End Error | `info` point has no `next` | Use `end-screen` for the final step. |
| Missing Asset | Typo in file path | Ensure paths start with `/assets/`. |
| Translations not updating | Out of sync YAMLs | Always update `de` and `en` together. |

---
**Project Documentation:**
- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
