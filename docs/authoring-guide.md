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
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Project Structure at a Glance

```
assets/
  scenarios/
    global/                        ← shared base layers (city map, buildings, …)
    flood/                         ← one folder per scenario
      scenario.yaml                ← scenario metadata + roles
      flood-image.jpg
      flood_simulation.json        ← Lottie animation data
      fire_brigade/
        challenge.yaml             ← quiz steps for this role
        emergency_calls.json       ← POI data
      police/
        challenge.yaml
        evacuation_zones.svg       ← selectable zone layer
        social_media.json
      crisis_unit/
        challenge.yaml
        social_media.json
        drone_unten.webp
        drone_oben.webp

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

**File responsibilities at a glance:**

| File | Question it answers |
|---|---|
| `config/layers.yaml` | What rendering behaviors exist? (rarely edited) |
| `config/context.yaml` | Which layer instances exist, what are their labels, icons, and asset paths? |
| `scenario.yaml` | What is this scenario and which roles does it offer? |
| `challenge.yaml` | How does this challenge flow, and what text does it show? |

---

## 2. Creating a New Scenario

### Step 1 — Create the folder

```
assets/scenarios/earthquake/
  scenario.yaml
  fire_brigade/
    challenge.yaml
    response_units.json
```

### Step 2 — Write `scenario.yaml`

See [Section 3](#3-scenarioyaml--metadata--roles).

### Step 3 — Register layers in `config/context.yaml`

Under `scenarios.earthquake.layers` and `scenarios.earthquake.roles.<role>.layers`.  
See [Section 4](#4-contextyaml--layers--visibility).

### Step 4 — Write each `challenge.yaml`

See [Section 6](#6-challengeyaml--story-points--quiz-logic).

### Step 5 — Activate the scenario

Set `active: true` in `scenario.yaml`.

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

      Im Krisenfall haben verschiedene Akteure unterschiedliche Aufgaben.
      **Wessen Rolle möchtest du übernehmen?**
  en:
    title: The River Overflows Its Banks
    short_title: Flood
    description: |
      **After days of heavy rainfall …**

roles:
  fire_brigade:
    text:
      de:
        title: Feuerwehr
      en:
        title: Fire Brigade
    challenge: ./fire_brigade/challenge.yaml   # relative path from this file

  police:
    text:
      de:
        title: Polizei
      en:
        title: Police
    challenge: ./police/challenge.yaml

  crisis_unit:
    text:
      de:
        title: Krisenstab
      en:
        title: Crisis Unit
    challenge: ./crisis_unit/challenge.yaml
```

**Field reference:**

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must match folder name exactly |
| `active` | no | Defaults to `false` |
| `text.<lang>.title` | yes | Shown on the scenario-select screen |
| `text.<lang>.short_title` | no | Optional shorter label |
| `text.<lang>.description` | no | Markdown supported |
| `roles.<id>.text.<lang>.title` | yes | Shown on the role-select screen |
| `roles.<id>.challenge` | yes | Path to the challenge YAML for this role |

---

## 4. context.yaml — Layers & Visibility

This file wires every layer to its asset, label, icon, and availability rules. It has three levels:

```yaml
global:
  layers:
    <layer-id>: { … }            # available in all scenarios

scenarios:
  <scenario-id>:
    layers:
      <layer-id>: { … }          # available when this scenario is active
    roles:
      <role-id>:
        exclude_layers: []       # layer-ids to hide for this role
        layers:
          <layer-id>: { … }      # available only for this role
```

### Layer entry fields

```yaml
my_layer_id:
  layer_type: locations          # must match a key in layers.yaml
  available_from: role           # "global" | "scenario" | "role"
  toggle: available              # "available" | "deactivated" | "hidden" | "none"
  label:
    de: "Notrufe"
    en: "Emergency Calls"
  src: /assets/scenarios/flood/fire_brigade/emergency_calls.json
  icon: /assets/icons/emergency_calls.svg          # toggle button icon
  poi_icon: /assets/icons/marker_emergency_call.svg # marker icon on the map
  slider_icon: /assets/icons/flood-slider.svg      # icon next to the time slider
  src_overlay: /assets/…/drone_oben.webp           # pulsing-image only
  status_poi_icons:                                 # optional per-status marker icons
    warning: /assets/icons/marker_warning.svg
    critical: /assets/icons/marker_critical.svg
  initially_visible: true        # shown immediately when view opens
  quiz_only: false               # true = only visible during a quiz step
  map_only: false                # true = hidden in the info/role-select panels
  z_index: 100                   # render order (higher = in front)
  toggle_order: 4                # position in the toggle panel (lower = first)
  opacity_control: false         # show opacity slider (for lottie/image layers)
  playback_control: true         # show play/pause button
  start_time: "08:00"            # timeline start label
  end_time: "18:00"              # timeline end label
  class: ""                      # extra CSS class on the layer wrapper
```

**`toggle` values explained:**

| Value | Meaning |
|---|---|
| `available` | Shown in the layer panel; user can toggle on/off |
| `deactivated` | Shown in panel but grayed out (not interactive) |
| `hidden` | Not shown in panel; layer exists but is invisible to the user |
| `none` | No toggle button at all |

**`available_from` values:**

| Value | When the layer appears |
|---|---|
| `global` | Always, regardless of scenario/role |
| `scenario` | Only when the matching scenario is selected |
| `role` | Only when the matching role within the scenario is selected |

---

## 5. Layer Types Reference

These are the values for `layer_type` in `context.yaml`. They map to entries in `config/layers.yaml`.

### `static_image`
A plain image rendered over the map. No interaction.

```yaml
base_layer_river:
  layer_type: static_image
  src: /assets/scenarios/global/base-layer_river.webp
  available_from: global
  toggle: hidden
  initially_visible: true
  z_index: 10
```

### `locations`
A layer of interactive POI markers. Each marker opens an info overlay.  
Backed by a [Location JSON file](#9-location-json-files-pois).

```yaml
flood_fire_brigade_emergency_calls:
  layer_type: locations
  src: /assets/scenarios/flood/fire_brigade/emergency_calls.json
  icon: /assets/icons/emergency_calls.svg
  poi_icon: /assets/icons/marker_emergency_call.svg
  available_from: role
  toggle: available
  initially_visible: true
  z_index: 100
  toggle_order: 4
  label:
    de: "Aktuelle\nNotrufe"
    en: "Emergency\nCalls"
```

### `area_overlay`
An SVG file with selectable polygon zones. Used with `area-selection-quiz` story points.  
See [Section 10](#10-svg-files-for-zone-selection) for SVG requirements.

```yaml
flood_police_evacuation_zones:
  layer_type: area_overlay
  src: /assets/scenarios/flood/police/evacuation_zones.svg
  available_from: role
  toggle: available
  quiz_only: true
  initially_visible: false
  z_index: 77
```

### `lottie_sequence`
An animated Lottie JSON file with a time slider.

```yaml
flood_simulation:
  layer_type: lottie_sequence
  src: /assets/scenarios/flood/flood_simulation.json
  available_from: scenario
  toggle: available
  initially_visible: true
  playback_control: true
  start_time: "08:00"
  end_time: "18:00"
  z_index: 78
  slider_icon: /assets/icons/flood-slider.svg
```

### `pulsing_overlay`
A two-image layer: a static base image plus a pulsing overlay image (CSS animation).  
Used for things like drone feeds or attention markers.

```yaml
flood_crisis_unit_drone_feed:
  layer_type: pulsing_overlay
  src: /assets/scenarios/flood/crisis_unit/drone_unten.webp      # base
  src_overlay: /assets/scenarios/flood/crisis_unit/drone_oben.webp  # pulsing top layer
  available_from: role
  toggle: hidden
  quiz_only: true
  initially_visible: false
  z_index: 80
```

### `png_sequence`
A frame-by-frame PNG animation driven by a manifest JSON file with a time slider.

```yaml
my_png_layer:
  layer_type: png_sequence
  src: /assets/scenarios/flood/my_animation/manifest.json
  playback_control: true
  start_time: "08:00"
  end_time: "18:00"
```

**manifest.json format:**
```json
{ "frames": [
  "/assets/scenarios/flood/my_animation/frame_0000.png",
  "/assets/scenarios/flood/my_animation/frame_0001.png"
]}
```

### `svg_sequence`
Like `png_sequence` but with SVG frames. Same manifest format with `.svg` paths.

---

## 6. challenge.yaml — Story Points & Quiz Logic

Each role has one `challenge.yaml`. It contains an ordered list of `story_points`. The engine navigates between them using the `next` field.

```yaml
story_points:
  - id: intro
    type: info
    text:
      de:
        title: "Titel des Intro-Screens"
        description: |
          Markdown-Text mit **Fettdruck** und Listen.
      en:
        title: "Intro Screen Title"
        description: |
          Markdown text with **bold** and lists.
    next: challenge_step_1

  - id: challenge_step_1
    type: quiz
    text:
      de:
        title: "Frage an die Nutzer*innen"
        question: "Welche Option ist richtig?"
      en:
        title: "Question for the users"
        question: "Which option is correct?"
    options:
      - value: option_a
        text:
          de: "Option A"
          en: "Option A"
      - value: option_b
        text:
          de: "Option B"
          en: "Option B"
    solution: [option_a]
    next:
      right: result_right
      wrong: result_wrong

  - id: result_right
    type: info
    text:
      de:
        title: "Richtig!"
        description: "Gut gemacht."
      en:
        title: "Correct!"
        description: "Well done."

  - id: result_wrong
    type: info
    text:
      de:
        title: "Leider falsch."
        description: "Versuch es nochmal."
      en:
        title: "Not quite right."
        description: "Try again."
    next: challenge_step_1   # send back to retry
```

### Common fields for all story points

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique identifier; used by `next` to navigate |
| `type` | yes | See [Section 7](#7-story-point-types-reference) |
| `next` | no | Next step id, or an outcome map (see [Section 8](#8-outcome-branching)) |
| `activeLayerIds` | no | Layer IDs to activate when this step opens |
| `excludeLayerIds` | no | Layer IDs to hide when this step opens |
| `slider_time` | no | Time to jump the timeline slider to, e.g. `"14:00"` |
| `slider_time_layer` | no | Which layer's slider to control, e.g. `flood_simulation` |
| `slider_time_fixed` | no | `true` = lock the slider so users can't move it |

---

## 7. Story Point Types Reference

### `info`
A text screen with a continue button. No interaction required.

```yaml
- id: intro
  type: info
  text:
    de:
      title: "Titel"
      description: "Beschreibung mit **Markdown**."
    en:
      title: "Title"
      description: "Description with **Markdown**."
  next: next_step_id
```

---

### `quiz`
A multiple-choice question. Users pick from a list of options.

```yaml
- id: my_quiz
  type: quiz
  text:
    de:
      title: "Frage"
      question: "Welche zwei Optionen sind korrekt?"
    en:
      title: "Question"
      question: "Which two options are correct?"
  options:
    - value: opt_a
      text: { de: "Option A", en: "Option A" }
    - value: opt_b
      text: { de: "Option B", en: "Option B" }
    - value: opt_c
      text: { de: "Option C", en: "Option C" }
  solution: [opt_a, opt_b]     # correct answers
  next:
    right: result_right
    wrong: result_wrong
    half: result_half
```

---

### `location-quiz`
The user places a pin on the map to select a location. Used for tasks like "where should the drone fly?".

```yaml
- id: drone_target
  type: location-quiz
  text:
    de:
      title: "Wo soll die Drohne fliegen?"
      question: "Tippe auf die Karte um den Zielort zu markieren."
    en:
      title: "Where should the drone fly?"
      question: "Tap the map to mark the target location."
  target: "#layer-flood_crisis_unit_drone_feed"   # CSS selector of the relevant layer
  initial_position: { x: 1920, y: 1080 }          # starting position of the pin
  solution: ["area-5", "area-6"]                  # accepted area IDs (from SVG)
  maxDistance: 200                                  # pixel tolerance
  submit:
    de: "Bestätigen"
    en: "Confirm"
  next:
    right: result_right
    wrong: result_wrong
```

---

### `point-selection-quiz`
The user taps POI markers on the map to select them (e.g. "pick the two highest-priority emergency calls").

```yaml
- id: select_calls
  type: point-selection-quiz
  target: "#layer-flood_fire_brigade_emergency_calls"  # CSS selector of the locations layer
  activeLayerIds: [flood_fire_brigade_emergency_calls]
  solution: ["flood_emergency_call_01", "flood_emergency_call_02"]
  wrong_options: ["flood_emergency_call_05"]   # options that count as wrong (rest = neutral)
  minSelection: 2
  maxSelection: 2
  text:
    de:
      title: "Einsatzkräfte entsenden"
      question: "Wähle genau zwei Notrufe aus."
    en:
      title: "Dispatch Responders"
      question: "Select exactly two emergency calls."
  next:
    right: result_right
    wrong: result_wrong
    half: result_half
```

**How scoring works:**
- `solution` = correct choices (count toward `right`)
- `wrong_options` = clearly wrong choices (count toward `wrong`)
- everything else = neutral (neither right nor wrong)

---

### `area-selection-quiz`
The user taps polygon zones in an SVG layer (e.g. "select the evacuation zones").

```yaml
- id: select_zones
  type: area-selection-quiz
  target: "#layer-flood_police_evacuation_zones"  # CSS selector of the area layer
  activeLayerIds: [flood_police_evacuation_zones]
  solution: ["area-8", "area-9"]          # correct zone IDs (must match SVG polygon ids)
  wrong_options: ["area-1", "area-2"]     # zones that count as wrong
  minSelection: 2
  maxSelection: 3
  text:
    de:
      title: "Evakuierungszonen festlegen"
      question: "Welche Bereiche sollen evakuiert werden?"
    en:
      title: "Define Evacuation Zones"
      question: "Which areas should be evacuated?"
  next:
    right: result_right
    wrong: result_wrong
```

For SVG requirements, see [Section 10](#10-svg-files-for-zone-selection).

---

## 8. Outcome Branching

The `next` field can be a plain string (always go to that step) or an **outcome map**:

```yaml
next:
  right: result_right          # user got everything correct
  half: result_half            # user got some correct
  wrong: result_wrong          # user got nothing correct

  # Optional fine-grained outcomes (fall back to the broader key if missing):
  half-wrong: result_half_wrong     # fallback: half
  wrong-neutral: result_wrong       # fallback: wrong
  all-neutral: result_wrong         # fallback: wrong
  all-wrong: result_very_wrong      # fallback: wrong
```

**Fallback chain:** If a specific key is missing, the engine uses the next broader category:  
`half-wrong → half → wrong`

If no `next` is specified, the quiz ends and the user returns to the map.

---

## 9. Location JSON Files (POIs)

Each `locations` layer points to a JSON file like this:

```json
{
  "layer_id": "emergency_calls",
  "locations": [
    {
      "id": "flood_emergency_call_01",
      "x": 1232,
      "y": 755,
      "class": "left-opening",
      "status": "warning",
      "status_timeline": [
        { "time": "10:00", "status": "normal" },
        { "time": "14:00", "status": "warning" },
        { "time": "16:00", "status": "critical" }
      ],
      "translations": {
        "title": { "de": "Notruf Musterstraße", "en": "Emergency Call Sample St." },
        "description": {
          "de": "Beschreibung des Ortes.",
          "en": "Description of the location."
        }
      },
      "status_translations": {
        "warning": {
          "title": { "de": "Erhöhte Gefahr", "en": "Elevated Risk" },
          "description": { "de": "Wasser steigt.", "en": "Water rising." }
        },
        "critical": {
          "title": { "de": "Kritisch", "en": "Critical" },
          "description": { "de": "Sofort evakuieren.", "en": "Evacuate immediately." }
        }
      }
    }
  ]
}
```

**Field reference:**

| Field | Required | Notes |
|---|---|---|
| `layer_id` | yes | Must match the layer ID in `context.yaml` |
| `id` | yes | Unique within the file; used in `solution` arrays |
| `x`, `y` | yes | Pixel coordinates on the 3840×2160 canvas |
| `class` | no | `"left-opening"` flips the info overlay to the left |
| `status` | no | Initial status value (string); drives icon and text selection |
| `status_timeline` | no | Array of `{ time, status }` — status changes as the time slider moves |
| `translations.title` | no | Marker popup title per language |
| `translations.description` | no | Marker popup body per language |
| `status_translations` | no | Per-status overrides for title/description; merged on top of `translations` |

**Coordinates:** The map canvas is 3840×2160px. `x=0, y=0` is the top-left corner.

---

## 10. SVG Files for Zone Selection

For `area_overlay` layers and `area-selection-quiz` story points, the engine reads polygon IDs directly from the SVG.

### Requirements

1. **Canvas size:** The SVG `viewBox` must be `0 0 3840 2160`.
2. **Polygon IDs:** Every selectable zone must have a unique `id` attribute. These IDs are what you put in `solution` and `wrong_options` in the challenge YAML.
3. **Selectable elements:** Only `<polygon>` and `<path>` elements that either have a non-`none` `fill` attribute or the CSS class `st0` are made interactive by the engine.
4. **Labels:** The SVG can optionally contain non-interactive elements (text, labels). These should have `pointer-events: none` set so they don't interfere.
5. **Zone group format:** Each zone should be wrapped in a `<g>` with an optional CSS class for opacity/styling.

### Minimal example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3840 2160">
  <defs>
    <style>
      .zone { fill: #fce3e3; }
      .label { pointer-events: none; }
    </style>
  </defs>

  <!-- Selectable zone: id must match solution/wrong_options in challenge.yaml -->
  <g>
    <polygon id="area-1" class="zone"
      points="100,100 500,100 500,400 100,400" />
  </g>

  <g>
    <polygon id="area-2" class="zone"
      points="600,100 1000,100 1000,400 600,400" />
  </g>

  <!-- Optional non-interactive label -->
  <text class="label" x="250" y="260">Zone 1</text>
</svg>
```

### Tips

- Export from Illustrator or Inkscape at 3840×2160.
- Name your artboard/page to match the canvas size to avoid offset issues.
- In Illustrator: use the layer name or the element name in the Layers panel to set the `id`.
- Keep zone IDs stable — changing them breaks existing challenge YAMLs.
- Include a reference image (`Overview_Zone_IDs.jpg`) next to the SVG so authors can look up zone IDs without opening the SVG file.

---

## 11. Translations & Text Content

In-challenge text (titles, descriptions, questions) lives **inline** in `challenge.yaml` — no separate translation files needed.

UI chrome (navigation buttons, common feedback phrases) lives in:
- `config/content.de.yaml`
- `config/content.en.yaml`

If you add a new scenario-level string that needs to appear outside the quiz (e.g. a hint on the map screen), add it to both content files.

Markdown is supported in `description` and `question` fields:
- `**bold**`
- `- list item`
- Line breaks require a blank line between paragraphs.

---

## 12. Common Mistakes

| Problem | Cause | Fix |
|---|---|---|
| Layer not appearing | `initially_visible: false` and `quiz_only: true` | Remove `quiz_only` or activate via `activeLayerIds` in a story point |
| Quiz step skipped | `next` points to a non-existent ID | Double-check the `id` of the target step |
| Zone not selectable | SVG polygon has `fill="none"` and no `st0` class | Add a fill color or the class `st0` |
| Wrong POI icon showing | `status_poi_icons` key doesn't match the `status` value in JSON | Align the status string in both places |
| Time slider doesn't animate | `slider_time_layer` set to a layer with no slider | Only `lottie_sequence`, `png_sequence`, and `svg_sequence` layers have sliders |
| Translations not updating mid-quiz | `content.de.yaml` / `content.en.yaml` out of sync | Always edit both files together |

---
**Project Documentation:**
- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
