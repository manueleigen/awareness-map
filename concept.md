# Concept: Awareness Map

This document outlines the vision and user experience goals for the museum exhibit.

## 1. Vision
The Awareness Map simulates the workflow of a modern emergency operations center. It teaches visitors how to create a "Common Operational Picture" (COP) by correlating heterogeneous data streams (sensors, social media, aerial imagery) in real-time.

## 2. Storytelling & User Flow
The application follows a hierarchical narrative structure:
1. **Home:** Introduction to the exhibit and scenario selection.
2. **Scenario Entry:** Background information on the specific disaster (e.g., Flood).
3. **Role Selection:** Users choose a perspective (Fire Brigade, Police, or Crisis Staff).
4. **Interactive Map:** Situational analysis through layer toggling and data inspection.

## 3. UI/UX Design (4K Optimization)
The interface is purpose-built for a 65-inch touch table:
- **Proportional Scaling:** Uses `vw` and `rem` units to ensure consistent layout across large displays.
- **Context-Aware Controls:** The layer panel only displays tools relevant to the selected scenario and role.
- **Collaborative Interaction:** Large UI elements allow multiple users to interact with the map simultaneously.

## 4. Museum Constraints
- **Offline Reliability:** All assets are stored locally for 100% uptime without internet.
- **High Visual Impact:** Uses Lottie animations and SVG filters to create a "living" map that attracts visitors.
- **Ease of Content Updates:** Non-developers can update stories or swap assets via YAML configuration files.

---
**Project Documentation:**
- **Readme:** Overview, installation, and project structure.
- **Context:** Technical architecture, state management, and module logic.
- **Concept:** Vision, storytelling, and UI/UX design goals.
- **Todo:** Current status, milestones, and upcoming tasks.
