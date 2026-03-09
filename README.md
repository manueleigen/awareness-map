# Awareness Map – Disaster Management Simulation

An interactive 4K touch-table PWA designed for a 65" museum exhibit. This application simulates a situational awareness center where users collaboratively manage disaster scenarios (e.g., floods, industrial accidents) using a fictional city map.

## Project Goals
The "Awareness Map" exhibit communicates the complexity of creating a "Common Operational Picture" (COP) in emergency management. Users act as planners, overlaying heterogeneous data sources to solve time-critical challenges.

## Key Features
- Offline-First Architecture: 100% functional without internet access via Service Workers.
- Media-Only GIS: High-performance map rendering using image layers, coordinate-based overlays, and vector areas instead of a heavy GIS engine.
- Dynamic Time-Series: Integration of Lottie animations to visualize evolving threats like flood waves or weather fronts.
- Story-Point System: Modular challenge logic consisting of info points, area selections, and interactive quizzes.
- 4K Touch Optimization: UI designed specifically for large-scale touch interactions (65" screen).
- i18n Support: Instant language switching (DE/EN) without state loss.

## Tech Stack
- Frontend: Vanilla JavaScript (ES6+ Modules)
- Styling: CSS3 (optimized for 4K/Touch)
- Persistence: IndexedDB (for state and progress)
- Animations: Lottie (Bodymovin)
- Deployment: Static local HTTP server (Kiosk Mode)

## Project Structure
- /data/: JSON files for scenarios, layers, and i18n.
- /media/: High-res map layers, Lottie animations, and UI assets.
- /modules/: ES6 modules for layer management, UI, and challenge logic.
- app.js: Application entry point and state management.
- service-worker.js: Asset caching and offline logic.

## Scenario Logic
The application follows a hierarchical structure:
1. Scenarios (3): High-level disaster events selectable via the Info-Box.
2. Challenges (3 per Scenario): Specific missions within an event.
3. Story-Points (n): Sequential tasks (Info, Area-Select, Point-Select, Quiz) that drive the narrative.

## Development
### Setup
1. Clone the repository.
2. Run a local static server:
   ```bash
   npx serve .
   ```
3. Open localhost:3000 in a Chromium-based browser (Kiosk Mode recommended).

### Hard Constraints
- Zero External Requests: No CDNs, no external fonts, no external APIs.
- Build-less: Uses native ES modules; no bundling step required for exhibit stability.

---
*Developed as a final project for the JavaScript/ECMA Advanced Course.*
