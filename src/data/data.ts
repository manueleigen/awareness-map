import { AppState } from '../modules/types.js';

export const app: AppState = {
  language: 'de',
  "global-layers": [
    { "id": "base-map" },
    { "id": "base-map-glow" }
  ],
  "scenarios": [
    {
      "name": "industrial-explosion",
      "challenges": [
        {
          "name": "gas-cloud-tracking",
          "startTime": "2026-04-12T10:15:00.000Z",
          "endTime": "2026-04-12T18:00:00.000Z",
          "object-layers": [{ "id": "wind-vectors" }, { "id": "gas-sensors" }],
          "story-points": []
        },
        {
          "name": "evacuation-radius",
          "startTime": "2026-04-12T11:00:00.000Z",
          "endTime": "2026-04-12T20:00:00.000Z",
          "object-layers": [{ "id": "population-density" }],
          "story-points": []
        },
        {
          "name": "drone-damage-assessment",
          "startTime": "2026-04-12T13:00:00.000Z",
          "endTime": "2026-04-12T16:00:00.000Z",
          "object-layers": [{ "id": "drone-video" }],
          "story-points": []
        }
      ]
    },
    {
      "name": "cyber-attack-grid",
      "challenges": [
        {
          "name": "blackout-area-id",
          "startTime": "2026-05-20T22:00:00.000Z",
          "endTime": "2026-05-21T10:00:00.000Z",
          "object-layers": [{ "id": "power-grid-status" }],
          "story-points": []
        },
        {
          "name": "emergency-power-priority",
          "startTime": "2026-05-21T02:00:00.000Z",
          "endTime": "2026-05-21T08:00:00.000Z",
          "object-layers": [{ "id": "critical-infrastructure" }],
          "story-points": []
        },
        {
          "name": "communication-recovery",
          "startTime": "2026-05-21T06:00:00.000Z",
          "endTime": "2026-05-21T14:00:00.000Z",
          "object-layers": [{ "id": "cell-tower-range" }],
          "story-points": []
        }
      ]
    }
  ]
};
