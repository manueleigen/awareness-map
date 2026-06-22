# Awareness Map - 4K Museum Exhibit

This interactive PWA is designed for a 65" 4K touch-table, simulating a disaster management situational awareness center. Users collaboratively manage scenarios like floods and industrial accidents on a fictional city map.

## Quick Start
1. **Install dependencies:** `npm install`
2. **Generate YAML schemas:** `npm run generate-schemas`
3. **Start dev watchers:** `npm run dev` (TypeScript + SASS + schema watch in parallel)

## Option A: Kiosk-Browser
4. **Run command:** `kiosk-browser -f -s /path/to/folder index.html` 
https://github.com/IMAGINARY/kiosk-browser/releases/tag/v0.19.0-alpha.1
-f : fullscreen; -s : serve; -d : developer-tools 

## Option B: NPX Server
4. **Run local server:** `npx serve .` (or any static server)
5. **Access:** Open `http://localhost:3000/` in a Chromium-based browser (optimized for 3840x2160).

## Project Structure
- **/assets/scenarios/**: Per-scenario assets, YAML configs, and location JSON.
- **/assets/icons/**: SVG icons for markers and layer toggles.
- **/config/**: Global YAML files (`layers.yaml`, `context.yaml`, `content.*.yaml`).
- **/css/**: 4K-optimized stylesheets using `vw` and `rem` units.
- **/src/modules/**: TypeScript source code.
- **/schemas/**: Generated JSON Schemas for YAML validation (do not edit manually — run `npm run generate-schemas`).
- **/scripts/**: Build utilities (`generate-schemas.mjs`, `validate.mjs`).
- **/docs/**: Project documentation (see below).

## Credits
- **Manuel Eigen**: Programming, design
- **Aenias Fritsch**: UX/UI, design, concept
- **Andrea Heilrath**: Project lead, concept, content, academic development
- **Eric Londaits**: Exhibit concept

## Funding and Project Context
This exhibit is part of the [sicher oder?](https://www.sicher-oder.de) exhibition.

Funded by the Federal Ministry of Research, Technology and Space (BMFTR) and its security research program SifoLIFE. Exhibition concept by IMAGINARY gGmbH as part of the SifoLIFE subproject BeLIFE.

## License
Copyright (c) 2026 Awareness Map contributors. Licensed under the MIT License (see [LICENSE](./LICENSE)).

Some assets and third-party materials are distributed under different licenses or attribution requirements. See [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).

---
**Project Documentation:**
- **[docs/concept.md](./docs/concept.md):** Vision, storytelling, and UI/UX goals.
- **[docs/authoring-guide.md](./docs/authoring-guide.md):** How to create scenarios, challenges, and POI content.
- **[docs/developer-guide.md](./docs/developer-guide.md):** Module map, layer system, quiz engine, and extension guides.
