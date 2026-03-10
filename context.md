# Project Context: Awareness Map

This document describes the technical implementation and architecture.

## 1. Custom Map Engine (Media-GIS)
Instead of using Leaflet, this project uses a custom-built engine to maximize 4K performance and creative flexibility.
- **Decision:** Pure DOM/SVG rendering allows for native Lottie integration and advanced CSS blending (`mix-blend-mode`).
- **Coordinates:** Uses a pixel-based system (x/y) relative to the 3840x2160px canvas.

## 2. Core Modules
- **`app.ts`**: Entry point. Manages the high-level `AppState` and view routing (Home -> Scenario -> Role -> Map).
- **`layers.ts`**: The engine's heart. It filters and renders layers (SVG images, Lottie animations, and JSON POIs) based on the `context.yaml` configuration.
- **`translater.ts`**: Handles i18n by loading YAML files and providing the `t()` helper for UI strings.
- **`lib.ts`**: Utility library for DOM manipulation and asynchronous YAML/JSON loading.

## 3. Configuration-Driven Logic
The application behavior is defined in `/config`:
- **`layers.yaml`**: Defines global layer types and their default interaction behaviors.
- **`context.yaml`**: Maps specific assets (src/icon) to scenarios and roles.
- **`content.[lang].yaml`**: Contains all UI text and scenario-specific narratives.

## 4. State Management
The global `app` state (`src/data/data.ts`) tracks:
- **Language:** Currently selected UI language.
- **Session Context:** Active scenario and user role.
- **Layer State:** Set of currently visible layers.
- **View Navigation:** Current screen displayed to the user.

---
**Project Documentation:**
- **Readme:** Overview, installation, and project structure.
- **Context:** Technical architecture, state management, and module logic.
- **Concept:** Vision, storytelling, and UI/UX design goals.
- **Todo:** Current status, milestones, and upcoming tasks.
