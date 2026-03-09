# Awareness Map – Disaster Management Simulation

An interactive 4K touch-table PWA designed for a 65" museum exhibit. This application simulates a situational awareness center where users collaboratively manage disaster scenarios (e.g., floods, industrial accidents) using a fictional city map.

## Project Goals
The "Awareness Map" exhibit communicates the complexity of creating a "Common Operational Picture" (COP) in emergency management. Users act as planners, overlaying heterogeneous data sources to solve time-critical challenges.

## Key Features
- **Offline-First Architecture:** 100% functional without internet access via Service Workers.
- **Context-Aware GIS:** High-performance map rendering using image layers and vector overlays, dynamically filtered by scenario and user role.
- **YAML-Driven Configuration:** All content, layer metadata, and asset mappings are managed via readable YAML files.
- **Dynamic Time-Series:** Integration of Lottie animations to visualize evolving threats.
- **4K Touch Optimization:** UI designed specifically for large-scale touch interactions with proportional scaling.
- **i18n Support:** Instant language switching (DE/EN) without state loss or page reload.

## Tech Stack
- **Frontend:** TypeScript (ESNext Modules)
- **Styling:** CSS3 (4K-optimized, proportional scaling via `vw`/`rem`)
- **Config Parsing:** `js-yaml` (loaded via ESM CDN)
- **Animations:** Lottie (via `<dotlottie-wc>`)
- **Persistence:** IndexedDB (for state and progress)

## Project Structure
- **/assets/**: Centralized media assets (images, icons, animations) organized by scenario/role.
- **/config/**: YAML configuration files:
  - `layers.yaml`: Structural definitions of available layers.
  - `context.yaml`: Mapping of assets (src/icon) to specific scenarios and roles.
  - `content.[lang].yaml`: Translated UI strings and scenario content.
- **/src/**: TypeScript source code.
  - `/js/app.ts`: Application entry point and view management.
  - `/modules/`: Logic for layers, translation, and utilities.
- **/dist/**: Compiled JavaScript output (ignored by Git).
- **/css/**: Application styling.

## Development
### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the TypeScript compiler in watch mode:
   ```bash
   npx tsc -w
   ```
4. Run a local static server:
   ```bash
   npx serve .
   ```

### Hard Constraints
- **Zero External Requests:** No CDNs for runtime assets (except for initial library loading if allowed, otherwise vendor locally).
- **Build-to-Dist:** Development happens in `src/`, browsers run code from `dist/`.
- **YAML Source of Truth:** All logical changes to layers or content should happen in `/config`.

---
*Developed as a final project for the JavaScript/ECMA Advanced Course.*
