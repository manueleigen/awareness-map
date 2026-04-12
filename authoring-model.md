# Scenario Authoring Model

This document defines the current model for self-contained scenarios.

## Goals

- Keep engine behavior separate from scenario content.
- Reduce the number of files authors must understand.
- Keep challenge logic and challenge text together.
- Avoid defining one global layer entry per scenario-specific layer instance.

## Target Split

### Global Engine Config

Use two global config files with distinct responsibilities:

- `config/layers.yaml`
  Technical layer behavior only.
  Example: `locations`, `areas`, `dynamic-image`, timeline playback, opacity support.
- `config/context.yaml`
  It contains concrete layer instances and all instance-specific configuration.
  This is the place for:
  - labels
  - `toggle`
  - `available_from`
  - ordering
  - icons
  - asset paths
  - per-scenario / per-role availability

Global UI strings such as navigation and generic feedback can stay in the current app content files until a later cleanup.

### Scenario Authoring

Each scenario lives in its own folder:

```text
assets/scenarios/<scenario-id>/
  scenario.yaml
  <challenge-id>/
    challenge.yaml
```

`scenario.yaml` owns:

- scenario metadata
- scenario title and description
- role titles
- role-to-challenge mapping

`<challenge-id>/challenge.yaml` owns:

- challenge intro text
- challenge title
- story-point structure
- all quiz text for all languages
- answer labels
- result screens

This keeps each challenge readable in one place.

## `config/layers.yaml` Scope

`layers.yaml` should contain reusable technical behavior, not scenario wiring.

The current codebase supports exactly these five base layer types:

- `static-image`
  Plain image layer without built-in playback or POI behavior.
- `locations`
  POI/marker layer backed by location JSON.
- `areas`
  SVG area layer with selectable polygons or paths.
- `dynamic-image`
  Timeline-based animated layer with slider/playback support.
- `pulsing-image`
  Static image layer with an optional pulsing overlay image.

These are the real runtime layer families today. New scenario-specific layers should
reuse one of these types instead of introducing new global layer definitions unless
the rendering behavior itself is genuinely different.

Example:

```yaml
layer_types:
  static_image:
    type: static-image
    interaction: none

  locations:
    type: locations
    interaction: inspect-location
    icon_mode: per-location

  area_overlay:
    type: areas
    interaction: inspect-area

  timeline_animation:
    type: dynamic-image
    interaction: timeline
    playback_control: true

  pulsing_overlay:
    type: pulsing-image
    interaction: inspect-area
```

This avoids duplicated layer types for things that follow the same mechanics.
For example, `flood_police_social_media` and `flood_crisis_unit_social_media` should both use the same `locations` type.

Recommended scope for `layers.yaml`:

- `type`
- `interaction`
- `playback_control`
- `icon_mode`

Keep instance-specific fields out of `layers.yaml` and in `context.yaml`, for example:

- `label`
- `src`, `src_overlay`
- `icon`, `slider_icon`, `poi_icon`
- `class`
- `opacity_control`
- `start_time`, `end_time`
- `toggle`, `available_from`
- `initially_visible`, `quiz_only`, `map_only`
- `z_index`, `toggle_order`

## `config/context.yaml` Scope

`context.yaml` should contain the concrete layer configuration used by the app.
Its structure should stay close to the current `context.yaml`: first `global`, then `scenarios`, then `roles`.

Example:

```yaml
global:
  layers:
    base_layer_river:
      layer_type: static_image
      available_from: global
      toggle: hidden
      initially_visible: true
      z_index: 10
      src: /assets/scenarios/global/base-layer_river.webp

    critical_sites:
      layer_type: locations
      available_from: global
      toggle: available
      label:
        de: "Kritische\nInfrastruktur"
        en: "Critical\nInfrastructure"
      initially_visible: false
      z_index: 110
      toggle_order: 1
      src: /assets/scenarios/global/critical_sites.json
      icon: /assets/icons/critical_sites.svg
      poi_icon: /assets/icons/marker_poi.svg

scenarios:
  flood:
    layers:
      flood_simulation:
        layer_type: timeline_animation
        available_from: scenario
        toggle: available
        label:
          de: "Flut\nSimulation"
          en: "Flood\nSimulation"
        start_time: "08:00"
        end_time: "18:00"
        initially_visible: true
        z_index: 78
        toggle_order: 3
        src: /assets/scenarios/flood/flood_simulation.json
        icon: /assets/icons/flood.svg
        slider_icon: /assets/icons/flood-slider.svg

    roles:
      fire_brigade:
        exclude_layers: [flood_police_evacuation_zones]
        layers:
          flood_fire_brigade_emergency_calls:
            layer_type: locations
            label:
              de: "Aktuelle\nNotrufe"
              en: "Emergency\nCalls"
            toggle: available
            available_from: role
            src: /assets/scenarios/flood/fire_brigade/emergency_calls.json
            icon: /assets/icons/emergency_calls.svg
            poi_icon: /assets/icons/marker_emergency_call.svg
            initially_visible: true
            z_index: 100
            toggle_order: 4

      police:
        layers:
          flood_police_evacuation_zones:
            layer_type: area_overlay
            available_from: role
            toggle: available
            quiz_only: true
            label:
              de: "Evakuierungs\nzonen"
              en: "Evacuation\nZones"
            initially_visible: false
            z_index: 77
            toggle_order: 5
            src: /assets/scenarios/flood/police/evacuation_zones.svg
            icon: /assets/icons/evacuation_zones.svg

      crisis_unit:
        exclude_layers: [flood_police_evacuation_zones]
        layers:
          flood_crisis_unit_social_media:
            layer_type: locations
            label:
              de: Social Media
              en: Social Media
            toggle: available
            available_from: role
            src: /assets/scenarios/flood/crisis_unit/social_media.json
            icon: /assets/icons/social_media.svg
            poi_icon: /assets/icons/marker_social_media.svg
            initially_visible: true
            z_index: 180
            toggle_order: 4

          flood_crisis_unit_drone_feed:
            layer_type: pulsing_overlay
            available_from: role
            toggle: hidden
            quiz_only: true
            initially_visible: false
            z_index: 80
            toggle_order: 5
            src: /assets/scenarios/flood/crisis_unit/drone_unten.webp
            src_overlay: /assets/scenarios/flood/crisis_unit/drone_oben.webp
```

Why an earlier draft had two sections:

- one section for abstract layer entries
- one section for contextual placement

That separation was useful for thinking through responsibilities, but it is too indirect for authors.
Keeping the structure closer to `context.yaml` is clearer, as long as each layer entry now also carries:

- `layer_type`
- `label`
- `toggle`
- `available_from`

So the recommendation is:

- keep `layers.yaml` separate
- but make `context.yaml` structurally close to `context.yaml`

## `scenario.yaml` Schema

`scenario.yaml` stays intentionally small:

```yaml
id: flood
inactive: false

text:
  de:
    title: Der Fluss tritt über die Ufer
    short_title: Flut
    description: |
      **Nach tagelangen Regenfällen steigt der Wasserpegel weiter an.**

      Die Lage verändert sich schnell, und die Flutsimulation zeigt, dass in den nächsten Stunden mehrere Teile der Stadt überflutet werden.

      Im Krisenfall haben verschiedene Akteure unterschiedliche Aufgaben und Informationen. **Wessen Rolle möchtest du übernehmen?**
    role_selection_label: Wähle deine Rolle
  en:
    title: The River Overflows Its Banks
    short_title: Flood
    description: |
      **After days of heavy rainfall, the water level continues to rise.**

      The situation is changing rapidly, and the flood simulation shows that several parts of the city will be inundated over the next few hours.

      In a crisis, different actors have different responsibilities and access to different information. **Which role would you like to take on?**
    role_selection_label: Select your role

roles:
  fire_brigade:
    text:
      de:
        title: Feuerwehr
      en:
        title: Fire Brigade
    challenge: ./fire_brigade/challenge.yaml

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

All concrete layer wiring stays out of `scenario.yaml`.

## Quiz Schema

Each challenge owns one `challenge.yaml`.
The quiz keeps branching logic, challenge intro, and language-specific challenge text together.

Example:

```yaml
story_points:
  - id: intro
    type: info
    slider_time: "14:00"
    continue_button_key: challenges.common.start_button
    text:
      de:
        title: "Feuerwehr: Notrufe priorisieren"
        description: |
          **Es ist 14:00 Uhr**, das Wasser steigt unaufhaltsam.

          Zahlreiche Notrufe gehen ein, doch die Ressourcen der Feuerwehr sind begrenzt: **Du kannst nur zwei Notrufe bearbeiten.**

          Bedenke, wie viele Menschen betroffen sind, wie schnell die Orte überflutet werden, und ob die Einsatzkräfte sie noch erreichen können, ohne selbst von der Flut erfasst zu werden.
      en:
        title: "Prioritize Emergency Calls"
        description: |
          **It is 2:00 PM**, and the water is rising relentlessly.

          Numerous emergency calls are coming in, but the fire department's resources are limited: **You can only respond to two emergency calls.**

          Consider how many people are affected, how quickly the locations will be flooded, and whether emergency responders can still reach them without being overtaken by the flood themselves.
    next: challenge_core

  - id: challenge_core
    type: point-selection-quiz
    target: "#layer-flood_fire_brigade_emergency_calls"
    activeLayerIds: [flood_fire_brigade_emergency_calls]
    slider_time: "14:00"
    slider_time_layer: flood_simulation
    slider_time_fixed: false
    solution: ["flood_emergency_call_01", "flood_emergency_call_02"]
    wrong_options: ["flood_emergency_call_03"]
    minSelection: 2
    maxSelection: 2
    step: 1
    total_steps: 2
    text:
      de:
        title: Einsatzkräfte entsenden
        question: |
          **Es ist 14:00 Uhr. Wähle genau zwei Notrufe aus.**

          Berücksichtige:

          - wie viele Menschen betroffen sind
          - wie schnell die Orte überflutet werden
          - ob die Rettungswagen sie noch sicher erreichen können
      en:
        title: Dispatch Emergency Responders
        question: |
          **It is 2:00 PM. Select exactly two emergency calls.**

          Take into account:

          - how many people are affected
          - how quickly the locations will be flooded
          - whether ambulances can still reach them safely
```

## Available Story Point Types

The current runtime already supports these story-point types:

- `info`
  Simple information screen with a continue button or restart/back action.
- `quiz`
  Choice-based question with predefined answer options.
- `location-quiz`
  Free placement on the map, for example selecting a drone target point.
- `point-selection-quiz`
  Selection of POIs or markers on the map.
- `area-selection-quiz`
  Selection of polygons or zones on the map.

Commonly used fields across story points:

- `id`
  Stable step identifier. `next` references point to these ids.
- `type`
  One of the supported story-point types above.
- `next`
  Either a single next step id or an outcome map such as `right`, `wrong`, `half`, `all-neutral`.
- `step`
  Current visible step number in the challenge flow.
- `total_steps`
  Total visible step count for the challenge flow.
- `activeLayerIds`
  Layers that should become active for this step.
- `excludeLayerIds`
  Layers that should be hidden for this step.
- `slider_time`
  Time to set on the timeline slider when the step opens.
- `slider_time_layer`
  Layer whose slider should be controlled.
- `slider_time_fixed`
  Whether the time slider should be locked for this step.
- `terminalStatus`
  Marks the step as `passed` or `failed`.

Type-specific fields:

- `info`
  Uses `text.<lang>.title`, `text.<lang>.description`, and usually `continue_button_key`.
- `quiz`
  Uses `text.<lang>.title`, `text.<lang>.question`, `options`, `solution`, `minAnswers`, `maxAnswers`.
- `location-quiz`
  Uses `target`, `initial_position`, `solution`, `maxDistance`, optional `submit` text.
- `point-selection-quiz`
  Uses `target`, `solution`, optional `wrong_options`, `minSelection`, `maxSelection`.
- `area-selection-quiz`
  Uses `target`, `solution`, `minSelection`, `maxSelection`.

Current authoring direction:

- keep story-point ids stable and human-readable
- keep challenge text inline in `challenge.yaml`
- prefer existing runtime field names such as `minSelection`, `activeLayerIds`, `maxDistance`
- only introduce new field names when there is a clear structural reason

## Why This Split Helps Authors

The confusing part in the current model is the cross-file jump between:

- layer behavior
- layer availability
- scenario metadata
- challenge logic
- challenge text

The target split makes that clearer:

- `layers.yaml`
  "What kind of layer behavior exists?"
- `context.yaml`
  "Which layer instances exist, what are their labels, and where/how are they configured?"
- `scenario.yaml`
  "What is this scenario and which roles does it offer?"
- `challenge.yaml`
  "How does this challenge work, and what text does it show?"

## Migration Strategy

Recommended order:

1. Introduce `config/layers.yaml` for technical layer behavior.
2. Introduce `config/context.yaml` for complete layer-instance configuration.
3. Introduce a loader for `assets/scenarios/<id>/scenario.yaml`.
4. Teach the challenge loader to read inline multilingual text from `challenge.yaml`.
5. Migrate one scenario (`flood`) completely.
6. Remove legacy config and content entries once the new path is proven.

## Current Structure

Files for the current model live at:

- `assets/scenarios/flood/`
- `config/layers.yaml`
- `config/context.yaml`
