# Awareness Map - 4K Museum Exhibit

This interactive PWA is designed for a 65" 4K touch-table, simulating a disaster management situational awareness center. Users collaboratively manage scenarios like floods and industrial accidents on a fictional city map.

## Quick Start
1. **Install dependencies:** `npm install`
2. **start SASS compiler:** `npm run sass:watch`
3. **Start TypeScript compiler:** `npx tsc -w`

## Option A: Kiosk-Browser
4. **Run command:** `kiosk-browser -f -s /path/to/folder index.html` 
https://github.com/IMAGINARY/kiosk-browser/releases/tag/v0.19.0-alpha.1
-f : fullscreen; -s : serve; -d : developer-tools 

## Option B: NPX Server
4. **Run local server:** `npx serve .` (or any static server)
5. **Access:** Open `http://localhost:3000/` in a Chromium-based browser (optimized for 3840x2160).

## Project Structure
- **/assets/layers/**: Core map assets (SVG, PNG, JSON).
- **/assets/icons/**: UI and marker icons.
- **/config/**: YAML files for layers, context mappings, and translations.
- **/css/**: 4K-optimized stylesheets using `vw` and `rem` units.
- **/src/modules/**: TypeScript source code (Logic, State, Rendering).
- **/src/modules/dotlottie/**: Local Lottie Web Component libraries.

## Key Technical Concepts
- **Offline Reliability:** All libraries and assets are bundled locally.
- **Context-Driven:** Visibility and availability of layers are controlled via `config/context.yaml` using the `initially_visible` flag.
- **Performance:** Time-sliders are optimized with `requestAnimationFrame` to ensure 60fps on 4K displays.

---
**Project Documentation:**
- **Readme:** Overview, installation, and project structure.
- **Context:** Technical architecture, state management, and module logic.
- **Concept:** Vision, storytelling, and UI/UX design goals.
- **Todo:** Current status, milestones, and upcoming tasks.
