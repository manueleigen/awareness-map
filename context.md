# Project Context: Awareness Map

This document describes the technical implementation and architecture.

## 1. Custom Map Engine (Media-GIS)
Instead of using Leaflet, this project uses a custom-built engine to maximize 4K performance and creative flexibility.
- **Decision:** Pure DOM/SVG rendering allows for native Lottie integration and advanced CSS blending (`mix-blend-mode`).
- **Coordinates:** Uses a pixel-based system (x/y) relative to the 3840x2160px canvas.

## 2. Core Modules
- **`app.ts`**: Entry point. Manages high-level global listeners.
- **`main.ts`**: Handles view routing and UI updates.
- **`layers.ts`**: Core rendering engine. Handles dynamic layer creation and context-aware visibility syncing.
- **`poi.ts`**: Handles point-of-interest (POI) rendering, markers, and local overlays.
- **`time-slider.ts`**: Optimized playback controller for Lottie layers. Uses `requestAnimationFrame` for performance.
- **`translater.ts`**: Handles i18n using YAML files.
- **`lib.ts`**: Resilient loader utility (JSON, YAML, TEXT) with error fallbacks.

## 3. Configuration-Driven Logic
The application behavior is defined in `/config`:
- **`layers.yaml`**: Defines layer interaction types (timeline, inspection, etc.).
- **`context.yaml`**: Maps assets to specific scenario/role contexts and defines `initially_visible` states.
- **`content.[lang].yaml`**: All UI strings and scenario narratives.

## 4. State Management
The global `app` state (`src/modules/state.ts`) tracks:
- **Session:** Active scenario, role, and current view state (`home`, `scenario-select`, etc.).
- **Visibility:** A `Set` of active layer IDs, synced automatically via `renderLayers()`.
- **UI:** Global references to DOM containers (e.g., `slidersContainer`).

---
**Project Documentation:**
- **Readme:** Overview, installation, and project structure.
- **Context:** Technical architecture, state management, and module logic.
- **Concept:** Vision, storytelling, and UI/UX design goals.
- **Todo:** Current status, milestones, and upcoming tasks.
