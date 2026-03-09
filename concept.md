# Projektkonzept: Awareness Map

**Anwendung:** PWA für 4K Touch-Exponat (65" Display)
**Kontext:** Museumsexponat zur Vermittlung von Lagebild-Kompetenz im Katastrophenschutz
**Stack:** TypeScript (ESNext), CSS3, Lottie, YAML

## 1. Vision & Zielsetzung
Die "Awareness Map" simuliert die Arbeitsweise eines modernen Lagezentrums. Ziel ist es, Besuchern die Komplexität eines „Common Operational Picture“ (COP) nahezubringen. In Krisensituationen müssen heterogene Datenströme (Sensoren, soziale Medien, Luftbilder) in Echtzeit korreliert werden. Das Exponat ermöglicht kollaborative Entscheidungsfindung durch Überlagerung informativer Layer.

## 2. Technischer Ansatz: Context-Aware Media GIS
Anstelle einer ressourcenintensiven GIS-Engine nutzt die Applikation ein performantes, medienbasiertes Schichtsystem:
- **Hierarchische Struktur:** Szenarien (z.B. Flut) -> Rollen (z.B. Feuerwehr) -> Kontext-Layer.
- **Konfigurationsgetrieben:** Alle Pfade und Verknüpfungen werden in `config/context.yaml` definiert.
- **Dynamic Overlays:** Lottie-Animationen für Schadstoffwolken oder Flutwellen.
- **Interaktive Vektoren:** JSON-basierte Koordinaten für klickbare Zonen (POIs).

## 3. Systemarchitektur & Module
Die Anwendung folgt einem strikten **Source-to-Distribution** Workflow:
- **`src/js/app.ts`**: Zentraler Einstiegspunkt, View-Management und State.
- **`src/modules/layers.ts`**: Kontextsensitives Rendering der Kartenschichten.
- **`src/modules/translater.ts`**: Internationalisierungs-Modul (DE/EN) auf Basis von YAML.
- **`config/`**: Zentrale YAML-Dateien zur Konfiguration von Inhalten, Layern und Asset-Mappings.

## 4. Inhaltsstruktur (Storytelling)
Die Anwendung folgt einer hierarchischen Struktur:
1.  **Home:** Intro und Auswahl des Szenarios.
2.  **Szenario-Einstieg:** Hintergrundinformationen zum gewählten Katastrophenereignis.
3.  **Rollen-Auswahl:** Entscheidung für eine Perspektive (Feuerwehr, Polizei, Krisenstab).
4.  **Interaktive Karte:** Analyse der Lage durch Ein- und Ausblenden spezifischer Datenebenen.

## 5. UI/UX Design (4K Optimierung)
Das Interface ist für die Bedienung an einem 65-Zoll-Touch-Tisch optimiert:
- **Proportionale Skalierung:** Nutzung von `vw` und `rem` Einheiten für ein konsistentes Design über alle Bildschirmgrößen.
- **Layer-Panel:** Seitliches Kontrollzentrum, das nur die für den aktuellen Kontext relevanten Layer anzeigt.
- **Info-Box:** Modulares Overlay für Storytelling, Instruktionen und Evaluation.

## 6. Harte Constraints (Museums-Betrieb)
- **Offline-Fähigkeit:** Alle Assets werden lokal vorgehalten.
- **Build-to-Dist:** Entwicklung in TypeScript, Ausführung als ESNext-Module aus dem `dist/` Ordner.
- **YAML-Flexibilität:** Inhaltsänderungen und Asset-Täusche erfolgen rein über Konfigurationsdateien ohne Code-Eingriff.
