# Projektkonzept: Awareness Map

**Anwendung:** PWA für 4K Touch-Exponat (65" Display)
**Kontext:** Museumsexponat zur Vermittlung von Lagebild-Kompetenz im Katastrophenschutz
**Stack:** Vanilla JavaScript (ES6+), CSS3, Lottie, IndexedDB

## 1. Vision & Zielsetzung
Die "Awareness Map" simuliert die Arbeitsweise eines modernen Lagezentrums. Ziel ist es, Besuchern die Komplexität eines „Common Operational Picture“ (COP) nahezubringen. In Krisensituationen müssen heterogene Datenströme (Sensoren, soziale Medien, Luftbilder) in Echtzeit korreliert werden. Das Exponat ermöglicht kollaborative Entscheidungsfindung durch Überlagerung informativer Layer.

## 2. Technischer Ansatz: Media-only GIS
Anstelle einer ressourcenintensiven GIS-Engine (wie OpenLayers oder Leaflet) nutzt die Applikation ein performantes, medienbasiertes Schichtsystem:
- **Statische Layer:** Hochauflösende Rastergrafiken (PNG/SVG) für Basiskarten und Infrastruktur.
- **Dynamische Overlays:** Lottie-Animationen (Vektor-Web-Animationen) zur Darstellung zeitkritischer Verläufe (z.B. Schadstoffwolken, Flutwellen).
- **Interaktive Vektoren:** JSON-basierte Koordinaten für klickbare Zonen und Point-of-Interests (POIs).

## 3. Systemarchitektur & Module
Die Anwendung ist strikt modular aufgebaut, um Wartbarkeit und Stabilität im Kiosk-Modus zu gewährleisten:

- **`app.js`**: Zentraler Einstiegspunkt und State-Management.
- **`layers.js`**: Engine zum dynamischen Laden, Rendern und Toggeln von Kartenschichten basierend auf JSON-Konfigurationen.
- **`translater.js`**: Internationalisierungs-Modul (DE/EN) mit Hot-Reload-Fähigkeit ohne State-Verlust.
- **`lib.js`**: Utility-Bibliothek für DOM-Manipulation und asynchrones Daten-Fetching.
- **`data/`**: Zentrales Datenmodell (`data.js`) und externe Konfigurationen für Layer und Szenarien.

## 4. Inhaltsstruktur (Szenario-Logik)
Die Anwendung folgt einer hierarchischen Storytelling-Struktur:
1.  **Szenarien (Scenarios):** Große Ereignisse (aktuell implementiert: *Industrial Explosion*, *Cyber Attack*).
2.  **Herausforderungen (Challenges):** Spezifische Missionen innerhalb eines Szenarios (z.B. "Gas-Cloud Tracking" oder "Blackout Area Identification").
3.  **Story-Points:** Sequenzielle Schritte innerhalb einer Challenge (Info -> Interaktion -> Evaluation).

## 5. UI/UX Design (4K Optimierung)
Das Interface ist für die Bedienung an einem 65-Zoll-Touch-Tisch optimiert:
- **Zentrale Karte:** Große Touch-Targets und intuitive Gestensteuerung.
- **Layer-Panel:** Seitliches Kontrollzentrum zum Filtern der Informationsdichte.
- **Info-Box:** Modulares Overlay für Storytelling, Instruktionen und Quizzes.
- **Globaler Sprach-Switch:** Sofortige Umschaltung zwischen Deutsch und Englisch.

## 6. Harte Constraints (Museums-Betrieb)
- **100% Offline-Fähig:** Alle Assets (Schriften, Icons, Lottie-Files) liegen lokal vor. Einsatz von Service-Workern für stabiles Caching.
- **Build-less:** Verwendung nativer ES-Module für maximale Transparenz und Debugging-Fähigkeit direkt am Exponat.
- **Persistenz:** Nutzung der IndexedDB zur Speicherung von Interaktionszuständen im Dauerbetrieb.
