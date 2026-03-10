# Awareness Map - 4K Museum Exhibit

This interactive PWA is designed for a 65" 4K touch-table, simulating a disaster management situational awareness center. Users collaboratively manage scenarios like floods and industrial accidents on a fictional city map.

## Quick Start
1. **Install dependencies:** `npm install`
2. **Start TypeScript compiler:** `npx tsc -w`
3. **Run local server:** `npx serve .` (or any static server)
4. **Access:** Open `index.html` in a Chromium-based browser (optimized for 3840x2160).

## Project Structure
- **/assets/**: Media assets (SVG, Lottie, JSON) organized by scenario.
- **/config/**: YAML files for layers, context mappings, and translations.
- **/css/**: 4K-optimized stylesheets using `vw` and `rem` units.
- **/src/**: TypeScript source code (Logic, State, Rendering).
- **/dist/**: Compiled JavaScript output for production.

---
**Project Documentation:**
- **Readme:** Overview, installation, and project structure.
- **Context:** Technical architecture, state management, and module logic.
- **Concept:** Vision, storytelling, and UI/UX design goals.
- **Todo:** Current status, milestones, and upcoming tasks.
