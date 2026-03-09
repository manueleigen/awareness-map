/**
 * Awareness Map - Datenmodell
 * Struktur: Scenarios (3) > Challenges (3 pro Scenario) > Story-Points (n)
 */

export const app = {
  // Global verfügbare Layer (z.B. Hintergrundkarte, generelle Notrufe)
  "global-layers": [
    { "id": "base-map" },
    { "id": "base-map-glow" }
  ],

  "scenarios": [
    {
      "name": "urban-flood",
      "challenges": [
        {
          "name": "fire-brigade-deployment",
          "startTime": "2026-03-08T14:30:00.000Z",
          "endTime": "2026-03-08T22:00:00.000Z",
          "object-layers": [
            { "id": "flood-zone" },
            { "id": "emergency-calls" }
          ],
          "story-points": [
            {
              "name": "mission-intro",
              "type": "info",
              "solution": "" 
            },
            {
              "name": "evacuation-area-selection",
              "type": "area-select",
              "solution": "A1, A5, A9",
              "object-layers": [
                {
                  "id": "emergency-calls",
                  "filter": [
                    {
                      "type": "area",
                      "queries": ["A1", "A3"]
                    }
                  ]
                }
              ]
            },
            {
              "name": "situation-quiz",
              "type": "quiz",
              "solution": "Q1:A, Q2:C"
            }
          ]
        },
        {
          "name": "sandbag-logistics",
          "startTime": "2026-03-09T08:00:00.000Z",
          "endTime": "2026-03-09T15:00:00.000Z",
          "object-layers": [{ "id": "traffic-grid" }],
          "story-points": [
            { "name": "start", "type": "info", "solution": "" }
          ]
        },
        {
          "name": "hospital-evacuation",
          "startTime": "2026-03-09T16:00:00.000Z",
          "endTime": "2026-03-10T04:00:00.000Z",
          "object-layers": [{ "id": "hospitals" }, { "id": "flood-zone" }],
          "story-points": [
            { "name": "identify-at-risk", "type": "point-select", "solution": "click:#hosp_north" }
          ]
        }
      ]
    },
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
  ],

  "layer-collection": {
    "base-map": {
      "id": "base-map",
      "type": "image",
      "file": "media/maps/city_base.jpg"
    },
    "emergency-calls": {
      "id": "emergency-calls",
      "type": "coords",
      "file": "data/layers/calls.json"
    },
    "flood-zone": {
      "id": "flood-zone",
      "type": "animated",
      "file": "media/animations/flood.json"
    },
    "population-density": {
      "id": "population-density",
      "type": "image",
      "file": "media/layers/pop_density.png"
    }
    // ... weitere Layer Definitionen
  }
};
