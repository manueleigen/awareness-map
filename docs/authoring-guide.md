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
    global/                        ← shared base layers visible in every scenario
    flood/                         ← one folder per scenario (id must match folder name)
      scenario.yaml                ← scenario metadata + roles
      flood_simulation.json        ← Lottie/SVG animation data
      fire_brigade/
        challenge.yaml             ← quiz steps for this role
        emergency_calls.json       ← POI marker data
        response_units.json        ← another POI layer for this role
      police/
        challenge.yaml
        evacuation_zones.svg       ← selectable zone overlay
      crisis_unit/
        challenge.yaml
        social_media.json

config/
  layers.yaml                      ← technical layer type definitions (rarely edited)
  context.yaml                     ← ALL layer instances: icons, file paths, visibility
  content.de.yaml                  ← German UI strings (buttons, home screen, …)
  content.en.yaml                  ← English UI strings
```

**Rule of thumb:**
- New scenario content (images, JSON, SVG, animations) → `assets/scenarios/<id>/`
- Which layers exist and how they look/toggle → `config/context.yaml`
- The quiz flow and questions → `challenge.yaml` inside each role folder
- Button labels, home screen text, error messages → `config/content.*.yaml`

The `global/` folder holds layers that are always present regardless of which scenario is loaded — the city map base layers, the population density overlay, and critical infrastructure markers all live there.

---

## 2. Creating a New Scenario

### Step 1 — Create the folder

```
assets/scenarios/earthquake/
```

The folder name becomes the scenario ID everywhere in the system.

### Step 2 — Write `scenario.yaml`

Declare the ID, display text, and which roles exist. Each role points to its own `challenge.yaml`. Set `active: true` to make the scenario appear on the selection screen (useful for keeping work-in-progress hidden).

### Step 3 — Register layers in `config/context.yaml`

Add an entry under `scenarios: earthquake:`. Every asset the scenario uses (images, JSONs, SVGs, animations) must have a corresponding layer block here with its `src` path, icon, and visibility settings. See sections 4 and 5 for the full field reference.

### Step 4 — Write each `challenge.yaml`

One file per role. Define the sequence of story points — intro text, quiz steps, and outcome screens. The engine walks through them in order, branching at quiz steps based on the player's answers.

---

## 3. scenario.yaml — Metadata & Roles

```yaml
id: flood            # must match the folder name exactly
active: true         # false = hidden from scenario selection screen

text:
  de:
    title: Der Fluss tritt über die Ufer
    short_title: Flut
    description: |
      **Nach tagelangen Regenfällen** hat der Pegel kritische Werte erreicht.
  en:
    title: The River Overflows Its Banks
    short_title: Flood
    description: |
      **After days of heavy rainfall**, water levels have reached critical values.

roles:
  - id: fire_brigade
    text:
      de:
        title: Feuerwehr
      en:
        title: Fire Brigade
    challenge: ./fire_brigade/challenge.yaml
  - id: police
    text:
      de:
        title: Polizei
      en:
        title: Police
    challenge: ./police/challenge.yaml
  - id: crisis_unit
    text:
      de:
        title: Krisenstab
      en:
        title: Crisis Unit
    challenge: ./crisis_unit/challenge.yaml
```

**Field notes:**
- `id` is used as the key for everything in `context.yaml`, so a typo here breaks all layer visibility.
- `short_title` appears in compact UI elements. Keep it under ~8 characters.
- `description` supports Markdown (`**bold**`, line breaks via blank lines).
- Each role `id` (e.g. `fire_brigade`) must have a matching entry in `config/context.yaml` under `scenarios: flood: roles:`.

---

## 4. context.yaml — Layers & Visibility

`context.yaml` has two top-level sections: `global` (layers always present) and `scenarios` (layers belonging to a specific scenario or role). Every layer that the app renders must be declared here.

### Full example — a `locations` layer

```yaml
scenarios:
  flood:
    roles:
      fire_brigade:
        layers:
          flood_fire_brigade_emergency_calls:   # unique layer ID used everywhere
            layer_type: locations
            available_from: role                # when does this layer become available?
            toggle: available                   # user can toggle it on/off
            label:
              de: "Aktuelle\nNotrufe"
              en: "Emergency\nCalls"
            initially_visible: true             # shown by default when activated
            z_index: 100                        # higher = closer to front
            toggle_order: 4                     # position in the sidebar button list
            src: /assets/scenarios/flood/fire_brigade/emergency_calls.json
            icon: /assets/icons/emergency_calls.svg      # sidebar toggle button icon
            poi_icon: /assets/icons/marker_emergency_call.svg  # marker icon on map
```

### Key fields

| Field | Values | Description |
|---|---|---|
| `layer_type` | See §5 | Which rendering engine to use. |
| `available_from` | `global`, `scenario`, `role` | When the layer first becomes available. `role` layers only appear after a role is selected. |
| `toggle` | `available`, `deactivated`, `hidden` | `available` → user can toggle; `deactivated` → visible but greyed out; `hidden` → no toggle button shown. |
| `label` | `de` / `en` | Required when `toggle` is `available` or `deactivated`. Shown on the sidebar button. Use `\n` for line breaks. |
| `initially_visible` | `true` / `false` | Whether the layer is on when first activated. |
| `z_index` | integer | Stacking order. Higher numbers render in front. |
| `toggle_order` | integer | Sort order in the sidebar toggle list. |
| `src` | path string | File path to the asset. Always start with `/assets/`. |
| `icon` | path string | SVG shown on the sidebar toggle button. |
| `quiz_only` | `true` | Layer only appears during a specific quiz step (not toggleable freely). |

---

## 5. Layer Types Reference

### `static_image`

A plain image (WebP, PNG) placed at full canvas size. Used for base maps, overlays, and density visualizations.

```yaml
population_density:
  layer_type: static_image
  available_from: global
  toggle: available
  opacity_control: true        # adds a slider so users can fade the layer
  initially_visible: false
  z_index: 74
  src: /assets/scenarios/global/density.webp
  icon: /assets/icons/population_density.svg
```

### `locations`

Renders interactive POI markers from a JSON file. Each marker can be tapped to open an info overlay. See §9 for the JSON file format.

```yaml
critical_sites:
  layer_type: locations
  available_from: global
  toggle: available
  initially_visible: false
  z_index: 110
  src: /assets/scenarios/global/critical_sites.json
  icon: /assets/icons/critical_sites.svg
  poi_icon: /assets/icons/marker_poi.svg    # SVG icon rendered inside each marker
```

### `area_overlay`

Renders an SVG file as a set of selectable, clickable polygon zones. Used for evacuation zone selection quizzes. See §10 for SVG requirements.

```yaml
flood_police_evacuation_zones:
  layer_type: area_overlay
  available_from: role
  toggle: available
  quiz_only: true              # only active during the quiz step
  initially_visible: false
  z_index: 77
  src: /assets/scenarios/flood/police/evacuation_zones.svg
  icon: /assets/icons/evacuation_zones.svg
```

### `svg_sequence` / `png_sequence`

Frame-based animation tied to the time slider. The slider moves through the frames as the user drags it. `svg_sequence` uses a `manifest.json`; `png_sequence` uses a folder of numbered images.

```yaml
flood_simulation:
  layer_type: svg_sequence
  available_from: scenario
  toggle: available
  start_time: "08:00"          # slider start value
  end_time: "18:00"            # slider end value
  initially_visible: true
  z_index: 78
  src: /assets/scenarios/flood/flood_sim_svg/manifest.json
  icon: /assets/icons/flood.svg
  slider_icon: /assets/icons/flood-slider.svg   # icon shown on the slider handle
```

### `lottie_sequence`

Like `svg_sequence` but uses a Lottie JSON animation instead of image frames. Field usage is the same.

### `pulsing_overlay`

A two-part layer: a static base image plus a second image that pulses (opacity animation). Used for drone feed effects.

```yaml
flood_crisis_unit_drone_feed:
  layer_type: pulsing_overlay
  available_from: role
  toggle: hidden
  quiz_only: true
  initially_visible: false
  z_index: 80
  src: /assets/scenarios/flood/crisis_unit/drone_unten.webp
  src_overlay: /assets/scenarios/flood/crisis_unit/drone_oben.webp
```

---

## 6. challenge.yaml — Story Points & Quiz Logic

A challenge is a list of `story_points`. The engine starts at the first point and steps forward via the `next` field. At quiz steps it evaluates the player's answer and follows the matching outcome branch.

### Top-level structure

```yaml
story_points:
  - id: intro
    type: info
    # ...
  - id: challenge_core
    type: point-selection-quiz
    # ...
  - id: win-screen
    type: end-screen
    result: passed
    # ...
```

### Fields shared by all story point types

| Field | Description |
|---|---|
| `id` | Unique ID within the challenge. Used as `next` target. |
| `type` | The story point type (see §7). |
| `showLayersById` | List of layer IDs to activate when entering this step. Removed automatically when leaving the step. |
| `hideLayersById` | List of layer IDs to force-hide when entering this step. |
| `pulseLayersById` | List of POI layer IDs whose markers should pulse while this step is active. Non-POI layers are ignored. |
| `hintLayerOverlaysById` | List of POI layer IDs whose overlays are shown briefly as a hint when the step loads. |
| `hintLayerOverlayDuration` | How long (in ms) the hint overlays stay visible. Default: `3000`. |
| `slider_time` | Animate the time slider to this value on entry (e.g. `"14:00"`). |
| `slider_time_layer` | Which layer's slider to animate (e.g. `flood_simulation`). Required if `slider_time` is set and there are multiple animated layers. |
| `slider_time_fixed` | `true` locks the slider so the user cannot drag it during this step. |
| `text` | Display text — always an object with `de` and `en` sub-keys. Each locale supports `title`, `description`, `question`, and `button` (optional custom label for the continue button on `info` steps). |
| `next` | ID of the next step (string), or an outcome map (see §8). |

---

## 7. Story Point Types Reference

### `info`

A text screen with a single continue button. Used for introductions, explanations between quiz steps, and informational screens that reveal a result.

**Must have a `next` field** (to an `end-screen` or the next quiz step).

The engine starts at the **first story point** in the list — role selection leads directly here with no intermediate screen. The continue button label defaults to "Weiter" / "Next", but can be overridden per-locale via `text.de.button` / `text.en.button`.

```yaml
- id: intro
  type: info
  showLayersById: [flood_crisis_unit_social_media]
  slider_time: "11:30"
  slider_time_layer: flood_simulation
  text:
    de:
      title: "Entscheiden unter Unsicherheit"
      description: |
        **Es ist 11:30 Uhr.** Auf Social Media kursieren Gerüchte
        über einen möglichen Bruch des Hochwasserschutzes.

        Prüfe die Informationen und **überlege, ob du sofort handeln
        oder zunächst weitere Informationen sammeln möchtest.**
      button: Herausforderung starten   # optional — overrides default "Weiter"
    en:
      title: "Decision-Making Under Uncertainty"
      description: |
        **It is 11:30 AM.** Rumors are spreading on social media
        about a possible breach in the flood protection system.

        Assess the information and **consider whether to act
        immediately or gather additional information first.**
      button: Start Challenge
  next: challenge_core
```

---

### `end-screen`

The final step of a challenge. **Must NOT have a `next` field.** Requires `result`:

```yaml
result: passed   # → "Back to start" button → navigates to home screen
result: failed   # → "Try Again" button → engine reloads the last quiz step
```

On `result: failed`, the engine tracks the last answerable quiz step (`lastQuizPointId`) and redirects the player there instead of exiting the challenge. This means you can have many outcome screens without the player losing their progress.

```yaml
- id: win-screen
  type: end-screen
  result: passed
  showLayersById: [flood_fire_brigade_emergency_calls]
  text:
    de:
      title: Challenge gelöst!
      description: |
        Du hast die beiden kritischsten Notrufe priorisiert
        und damit die meisten Menschen gerettet.

        **Gut gemacht!**
    en:
      title: Challenge Solved!
      description: |
        You prioritized the two most critical emergency calls
        and saved the greatest number of people.

        **Well done!**

- id: half-fail-screen
  type: end-screen
  result: failed
  text:
    de:
      title: Teilweise richtig
      description: |
        Du hast einen der beiden kritischen Notrufe richtig
        priorisiert, aber der andere ist nicht so dringend.

        **Achte darauf, welche Bereiche bald überflutet werden!**
    en:
      title: Partly Correct
      description: |
        You correctly prioritized one of the two critical calls,
        but the other is not as urgent as you think.

        **Pay attention to which areas will be flooded soon!**
```

---

### `quiz`

A multiple-choice question with text answers. The player selects one or more options and submits.

```yaml
- id: challenge_core
  type: quiz
  showLayersById: [flood_crisis_unit_social_media]
  slider_time: "11:30"
  slider_time_layer: flood_simulation
  options:
    - value: a
      text:
        de: Informationen teilen
        en: Share Information
    - value: b
      text:
        de: Drohne entsenden
        en: Deploy Drone
  solution: ["b"]               # correct answer(s) — must match option values
  text:
    de:
      title: Wie reagierst du?
      question: "**Möchtest du die aktuelle Informationslage sofort teilen
                  oder zunächst eine Drohne entsenden?**"
    en:
      title: How do you respond?
      question: "**Would you share the information immediately,
                  or deploy a drone first?**"
  next:
    right: coord-selection
    wrong: fail-screen-1
```

For multi-select quizzes, list multiple values in `solution` and set `maxAnswers` to restrict how many the player can pick:

```yaml
solution: ["a", "c"]
maxAnswers: 2
minAnswers: 1
```

By default the answer buttons are arranged **side by side** (columns). Use `optionsLayout: rows` to stack them **vertically** instead — useful when option texts are longer:

```yaml
optionsLayout: rows   # optional; default: columns
```

---

### `coordinates-quiz`

The player places a marker on the map by tapping. The answer is correct if the final position lands within `maxDistance` pixels of the solution coordinates.

**Active interaction mode — Tap-to-fly:** Tap anywhere on the map and the marker glides to that position. The handler uses `addPointerClick` for multi-touch-table robustness (500 ms double-fire guard).

**Optional `icon` field:** Path to an SVG used as the marker icon. Defaults to `assets/icons/crosshair.svg` if omitted.

> **Drag-to-place** (implemented, currently disabled via `DRAG_ENABLED = false` in `render-map.ts`): Press and hold the marker for 80 ms, then drag it to the target with spring-lag follow. Set the flag to `true` to re-enable.

```yaml
- id: coord-selection
  type: coordinates-quiz
  target: "#layers"             # CSS selector of the tappable surface
  icon: assets/icons/drone.svg  # optional — defaults to assets/icons/crosshair.svg
  initial_position:
    x: 500                      # starting position of the marker
    y: 500
  solution: ["{x: 2414, y: 757}"]   # correct target on the 3840×2160 canvas
  maxDistance: 400              # tolerance radius in canvas pixels
  submit:
    de: Einsatzort prüfen
    en: Check Deployment Area
  text:
    de:
      title: Einsatzort der Drohne wählen
      question: |
        **Prüfe die Social-Media-Posts**, um einzuschätzen,
        wo ein Bruch besonders wahrscheinlich ist.

        **Tippe einen Ort auf der Karte an.**
    en:
      title: Select the Drone Deployment Area
      question: |
        **Review the social media posts** to assess
        where a breach is most likely.

        **Then tap a location on the map.**
  next:
    right: drone-win-screen
    wrong: fail-screen-2
```

---

### `point-selection-quiz`

The player taps one or more POI markers on the map. Correct answers are defined by ID.

```yaml
- id: challenge_core
  type: point-selection-quiz
  target: "#layer-flood_fire_brigade_emergency_calls"  # layer containing the markers
  showLayersById: [flood_fire_brigade_emergency_calls]
  slider_time: "14:00"
  slider_time_layer: flood_simulation
  slider_time_fixed: false
  solution: ["flood_emergency_call_01", "flood_emergency_call_02"]
  wrong_options: ["flood_emergency_call_03"]   # actively wrong — not just neutral
  minSelection: 2
  maxSelection: 2
  text:
    de:
      title: Einsatzkräfte entsenden
      question: |
        **Es ist 14:00 Uhr. Wähle genau zwei Notrufe aus.**

        Berücksichtige:
        - wie viele Menschen betroffen sind
        - wie schnell die Orte überflutet werden
        - ob die Rettungswagen sicher ankommen können
    en:
      title: Dispatch Emergency Responders
      question: |
        **It is 2:00 PM. Select exactly two emergency calls.**

        Take into account:
        - how many people are affected
        - how quickly the locations will be flooded
        - whether ambulances can still reach them safely
  next:
    right: win-screen
    half: half-fail-screen
    half-wrong: half-wrong-screen
    wrong-neutral: fail-screen-wrong-neutral
    all-wrong: fail-screen-1
```

The `wrong_options` field distinguishes between wrong markers (actively bad choices) and neutral ones (not part of the solution but not dangerous either). This enables fine-grained outcome branching — see §8.

---

### `area-selection-quiz`

The player taps polygon zones in an SVG overlay. Works like `point-selection-quiz` but targets SVG shapes instead of POI markers.

```yaml
- id: challenge_core
  type: area-selection-quiz
  target: "#layer-flood_police_evacuation_zones"
  showLayersById: [flood_police_evacuation_zones]
  solution: ["area-19", "area-20", "area-21"]
  wrong_options: []
  minSelection: 3
  maxSelection: 3
  text:
    de:
      title: Evakuierungszonen wählen
      question: |
        **Es ist 13:30 Uhr. Wähle drei Zonen auf der Karte aus.**

        Berücksichtige: Bevölkerungsdichte, Überflutungszeit,
        wichtige Infrastruktur.
    en:
      title: Select Evacuation Zones
      question: |
        **It is 1:30 PM. Select three zones on the map.**

        Consider: population density, flood timing,
        critical infrastructure.
  next:
    right: win-screen
    half: half-fail-screen
    wrong-neutral: fail-screen-all-neutral
    all-wrong: fail-screen-all-neutral
```

The zone IDs in `solution` must match the `id` attributes of the `<path>` or `<polygon>` elements in the SVG file.

---

## 8. Outcome Branching

When a quiz step has multiple possible outcomes, `next` is a map instead of a string. The engine compares the player's selection against `solution` and `wrong_options`, then follows the matching key.

### Full outcome key reference

| Key | Triggered when… |
|---|---|
| `right` | All correct answers selected, nothing wrong or neutral. |
| `half` | Some correct answers, but also some neutral answers. |
| `wrong` | Catch-all fallback if no more specific key matches. |
| `half-wrong` | Some correct answers, but also at least one `wrong_option`. Falls back to `half`. |
| `wrong-neutral` | At least one `wrong_option` selected, no correct answers. Falls back to `wrong`. |
| `all-neutral` | Only neutral answers selected (not in solution or wrong_options). Falls back to `wrong`. |
| `all-wrong` | Only `wrong_options` selected. Falls back to `wrong`. |

Fallback chain: `half-wrong` → `half` → `wrong`; `wrong-neutral` / `all-neutral` / `all-wrong` → `wrong`.

You only need to define the keys that matter for your scenario. The engine falls back up the chain automatically.

### Example with all relevant keys

```yaml
next:
  right: win-screen
  half: half-fail-screen          # one right, one neutral
  half-wrong: half-wrong-screen   # one right, one actively wrong
  wrong-neutral: fail-screen-mixed
  all-neutral: fail-screen-neutral
  all-wrong: fail-screen-wrong
```

### Simple two-branch example (right/wrong only)

```yaml
next:
  right: drone-win-screen
  wrong: fail-screen-2
```

### Single next step (no branching)

For `info` steps or steps that always proceed regardless of outcome:

```yaml
next: challenge_core
```

---

## 9. Location JSON Files (POIs)

POI files live next to their `challenge.yaml` and are referenced from `config/context.yaml` via the `src` field of a `locations` layer.

### 9.1 Basic structure

```json
{
  "layer_id": "emergency_calls",
  "locations": [
    {
      "id": "flood_emergency_call_01",
      "x": 1230,
      "y": 1085,
      "translations": {
        "title": { "de": "Verkehrsunfall", "en": "Traffic Accident" },
        "description": {
          "de": "Mehrere verletzte Personen nach einem Verkehrsunfall.",
          "en": "Several people injured in a traffic accident."
        }
      }
    },
    {
      "id": "flood_emergency_call_02",
      "x": 1920,
      "y": 1320,
      "translations": {
        "title": { "de": "Stromausfall im Altenheim", "en": "Power Outage at Senior Center" },
        "description": {
          "de": "Mehrere Personen sind auf Beatmungsgeräte angewiesen.",
          "en": "Several people are relying on ventilators."
        }
      }
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `layer_id` | yes | Must match the layer key in `context.yaml`. |
| `id` | yes | Unique across all POI files. Referenced in quiz `solution` arrays. |
| `x` / `y` | yes | Pixel coordinates on the 3840×2160 canvas. |
| `translations` | yes | `title` and `description`, each with `de` and `en`. |
| `status` | no | Initial status value (e.g. `available`, `active`, `unavailable`). |
| `status_timeline` | no | Array of `{ time, status }` entries — see §9.2. |
| `status_translations` | no | Text overrides per status value — see §9.3. |

---

### 9.2 Status timeline (automatic changes over time)

Add a `status_timeline` array to make a POI's icon and text change as the user moves the time slider. The engine picks the **last entry whose `time` ≤ current slider time**.

```json
{
  "id": "response_unit_01",
  "x": 820, "y": 380,
  "status": "available",
  "status_timeline": [
    { "time": "10:00", "status": "active" },
    { "time": "13:30", "status": "unavailable" }
  ],
  "translations": {
    "title": { "de": "Station Nord", "en": "Station North" },
    "description": { "de": "Fahrzeuge verfügbar.", "en": "Vehicles available." }
  }
}
```

- At slider time `< 10:00` → status is `available` (the initial value)
- At `10:00–13:29` → status switches to `active`
- At `≥ 13:30` → status switches to `unavailable`

The current status is applied as a CSS class `poi-status--<value>` on the marker element (useful for custom styling). If `status_poi_icons` are defined on the layer (see §9.4), the icon also swaps automatically.

---

### 9.3 Status translations (text overrides per status)

Use `status_translations` to override the title or description shown in the info overlay when a specific status is active. Fields not listed fall back to the base `translations`.

```json
{
  "translations": {
    "title": { "de": "Station Nord", "en": "Station North" },
    "description": { "de": "Fahrzeuge verfügbar.", "en": "Vehicles available." }
  },
  "status_translations": {
    "active": {
      "description": {
        "de": "Im Einsatz seit 10:00 Uhr.",
        "en": "Deployed since 10:00."
      }
    },
    "unavailable": {
      "title": { "de": "Station Nord — Gesperrt", "en": "Station North — Blocked" },
      "description": {
        "de": "Bereich ab 13:30 Uhr durch Hochwasser unzugänglich.",
        "en": "Area inaccessible due to flooding from 13:30."
      }
    }
  }
}
```

In the `active` entry above, only `description` is overridden — the title stays "Station Nord / Station North" from the base `translations`. In the `unavailable` entry, both fields are overridden.

If a POI overlay is open when the slider crosses a status threshold, the overlay updates **live** without closing.

---

### 9.4 Per-status icons

The default POI icon for the entire layer is set in `context.yaml` via `poi_icon`. To swap the icon when a POI reaches a specific status, add `status_poi_icons` to the layer definition:

```yaml
# config/context.yaml
flood_fire_brigade_response_units:
  layer_type: locations
  src: /assets/scenarios/flood/fire_brigade/response_units.json
  poi_icon: /assets/icons/marker_available.svg
  status_poi_icons:
    active:      /assets/icons/marker_active.svg
    unavailable: /assets/icons/marker_blocked.svg
```

Resolution order:
1. `status_poi_icons[currentStatus]` — status-specific icon (if defined)
2. `poi_icon` — layer default
3. No icon rendered

The `icon` field on the layer (distinct from `poi_icon`) is the **toggle button** icon shown in the sidebar — it does not change with status.

---

## 10. SVG Files for Zone Selection

SVG zone files are used by `area_overlay` layers and `area-selection-quiz` story points. The SVG defines the clickable polygon regions on the map.

### Requirements

- `viewBox` must be exactly `0 0 3840 2160` — coordinates must match the canvas pixel space.
- Every interactive element must have a unique `id` attribute. These IDs are what you put in the `solution` array.
- Only elements with a `fill` attribute or the class `st0` are treated as interactive. Other elements (labels, decorative shapes) are ignored.

### Example SVG structure

```xml
<svg viewBox="0 0 3840 2160" xmlns="http://www.w3.org/2000/svg">
  <polygon id="area-19" class="st0" points="800,400 1200,400 1200,800 800,800"/>
  <polygon id="area-20" class="st0" points="1200,400 1600,400 1600,800 1200,800"/>
  <polygon id="area-21" class="st0" points="800,800 1200,800 1200,1200 800,1200"/>
  <!-- area-19, area-20, area-21 are the correct solution -->
  <polygon id="area-05" class="st0" points="400,400 800,400 800,800 400,800"/>
  <!-- area-05 is selectable but not part of the solution -->
</svg>
```

When a zone is tapped, the engine adds a `selected` class and a pulsing animation. The IDs must match exactly what you put in the `solution` field of the challenge YAML.

---

## 11. Translations & Text Content

The app has two translation layers:

**1. UI chrome** — button labels, home screen text, navigation strings — lives in `config/content.de.yaml` and `config/content.en.yaml`. Always update both files together.

```yaml
# config/content.de.yaml
challenges:
  common:
    start_button: Herausforderung starten
    try_again: Nochmal versuchen
    submit: Antwort prüfen
    selected_count: "Ausgewählt: {count}"
```

> **Adding a new content key:** The structure of content files is defined by `ContentYamlSchema` in `src/modules/schemas.ts`. To add a new key, add it to the schema first, then add the corresponding value to both `content.de.yaml` and `content.en.yaml`. The validator will catch missing keys between the two language files.

**2. Challenge content** — titles, questions, descriptions — lives inline in `challenge.yaml` under each story point's `text` block:

```yaml
text:
  de:
    title: Evakuierungszonen planen
    description: |
      **Es ist 13:30 Uhr.** Überflutungen bedrohen dicht besiedelte Gebiete.

      Identifiziere Gebiete, die bald überschwemmt werden.
  en:
    title: Plan Evacuation Zones
    description: |
      **It is 1:30 PM.** Floodwaters are threatening densely populated areas.

      Identify areas that will soon be flooded.
```

**Markdown support:** `**bold**`, `*italic*`, `\n` (in YAML block scalars, blank lines create paragraph breaks). Markdown works in `description` and `question` fields — not in `title`.

**Quiz option text** also uses the inline `text: { de: ..., en: ... }` pattern:

```yaml
options:
  - value: a
    text:
      de: Informationen sofort teilen
      en: Share information immediately
  - value: b
    text:
      de: Drohne entsenden
      en: Deploy a drone
```

**POI translations** live inside the JSON file (see §9.1). They are not in the YAML files.

---

## 12. Validation & Quality Assurance

The project uses three validation layers: live IDE feedback while you type, a runtime Zod check when files are loaded, and a CLI deep validator for cross-file integrity.

### IDE Validation

Every YAML file in this project has a `# yaml-language-server: $schema=...` comment on its first line. Any editor with `yaml-language-server` support reads this and shows live red underlines for:

- Unknown or extra keys (e.g. a typo like `layor_type` instead of `layer_type`)
- Wrong value types (e.g. a string where a boolean is expected)
- Missing required fields

**VS Code:** Install the **YAML extension** (`redhat.vscode-yaml`) — VS Code will prompt you automatically when you open the project (via `.vscode/extensions.json`).

**JetBrains IDEs (WebStorm, IntelliJ):** YAML + JSON Schema support is built in — no plugin needed. The inline directive is picked up automatically.

**Neovim / other editors:** Configure `yaml-language-server` via your LSP setup — the inline directive is read automatically.

Schemas are generated from `src/modules/schemas.ts` and live in `schemas/`. They regenerate automatically whenever `schemas.ts` is saved during `npm run dev`. To regenerate manually:

```bash
npm run generate-schemas
```

### Running the CLI Validator

```bash
npx tsc && node scripts/validate.mjs
```

The TypeScript compile step (`npx tsc`) catches YAML schema violations. The validator script checks relational integrity and asset existence.

### What the validator checks

- **Broken `next` links**: every `next` target must exist as a story point `id` in the same challenge.
- **Broken layer ID lists**: every ID in `showLayersById`, `hideLayersById`, `pulseLayersById`, and `hintLayerOverlaysById` must exist in `context.yaml`.
- **Missing assets**: every `src` path (images, JSONs, SVGs) must resolve to an actual file.
- **Translation completeness**: all interactive layers with `toggle: available` must have both `de` and `en` labels.
- **Dead ends**: `info` and quiz steps with no `next` field (only `end-screen` is allowed to omit it).
- **Missing `result` on `end-screen`**: every `end-screen` must declare `result: passed` or `result: failed`.
- **Role/context mismatch**: roles declared in `scenario.yaml` but missing from `config/context.yaml`.

### In-app validation

`preloader.ts` runs the same checks in the background after the app starts. Errors always appear in the browser console as `[Validation]` messages.

The on-screen error panel is opt-in. Set `validator_overlay: true` in `config/context.yaml` to show it:

```yaml
global:
  validator_overlay: true   # ← shows red error panel in the browser
  layers:
    ...
```

Set it to `false` or omit it for production — the overlay will stay hidden while console errors remain available.

---

## 13. Common Mistakes

| Problem | Cause | Fix |
|---|---|---|
| Layer never appears | Layer ID in `showLayersById` doesn't exist in `context.yaml` | Check spelling — IDs are case-sensitive. |
| Dead End Error on load | `info` point has no `next` field | Only `end-screen` can omit `next`. Add `next: <id>`. |
| Missing Asset error | Typo in `src` path | Paths are case-sensitive and must start with `/assets/`. |
| Translations not updating on language switch | `de` / `en` YAMLs out of sync | Always update `content.de.yaml` and `content.en.yaml` together. |
| Quiz solution never matches | POI id in `solution` doesn't match the `id` in the JSON | Copy the `id` directly from the JSON file. |
| SVG zones not selectable | Elements lack `id` attribute or `fill` / `st0` class | Every interactive polygon needs a unique `id` and a fill. |
| Retry after fail goes to wrong step | Multiple quiz steps — engine redirects to the last one | Place your quiz `id` after the `intro`; keep the structure linear. |
| Scenario not shown on selection screen | `active: false` in `scenario.yaml` | Change to `active: true`. |
| Role button appears greyed out | Role key in `scenario.yaml` has no matching entry in `context.yaml` | Add the role under `scenarios: <id>: roles:` in `context.yaml`. |

---
**Project Documentation:**
- **[README.md](../README.md):** Installation and quick start.
- **[concept.md](./concept.md):** Vision, storytelling, and UI/UX goals.
- **[authoring-guide.md](./authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[developer-guide.md](./developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
