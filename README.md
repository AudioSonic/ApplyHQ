# ApplyHQ

ApplyHQ ist eine browserbasierte Anwendung zur Organisation des persönlichen Bewerbungsprozesses. Sie bündelt Bewerbungen, Suchprofile, externe Stellensuche, Stellenanalyse, Profil-Matching, KI-gestützte Anschreiben und lokalen PDF-Export.

[Screenshot vom Dashboard]

## Entwicklungsstand

| Bereich | Status |
| --- | --- |
| Bewerbungs-CRUD, Suche, Filter und Sortierung | Implementiert |
| Suchprofile und externe Stellensuche | Implementiert |
| Lokale Speicherung und Migration bestehender Daten | Implementiert |
| Bewerberprofil sowie Profil-Import/-Export | Implementiert |
| KI-Stellenanalyse, Matching, Anschreiben, Review und Revision | Implementiert; Worker und Secret erforderlich |
| Lokaler PDF-Export mit eingebetteten Fonts | Implementiert |
| Menüpunkt „Dokumente“ | Teilweise implementiert; derzeit deaktiviert |
| Geräteübergreifende Synchronisierung | Nicht implementiert |
| Offline-Betrieb | Nicht implementiert beziehungsweise nicht nachweisbar |

ApplyHQ ist ein persönliches Lern- und Portfolio-Projekt, kein vollständiges SaaS-Produkt mit Accounts, Cloud-Synchronisierung oder zentraler Datenbank.

## Zentrale Abläufe

```text
Suchprofil → Stellensuche → Stellenanzeige → Bewerbung → Stellenanalyse
→ Profil-Matching → Anschreiben → Review/Revision → PDF-Export
```

Bewerbungen können auch manuell angelegt werden. Die KI-Schritte sind optional.

## Tatsächlich implementierte Funktionen

### Bewerbungsverwaltung

- Bewerbungen anlegen, bearbeiten und löschen
- Unternehmens-, Positions-, Orts-, Status-, Kontakt- und Adressdaten
- Suche, Filterung, Sortierung und zentrale Formularvalidierung
- Migration älterer Bewerbungsdaten
- JSON-Import und JSON-Export

Die wichtigsten Dateien sind `js/applications.js`, `js/applicationModel.js`, `js/applicationCards.js`, `js/applicationModal.js` und `js/storage.js`.

### Suchprofile und Stellensuche

Suchprofile unterstützen Suchbegriffe, Position, Standort, Radius, Remote, Beschäftigungsart und Aktiv/Inaktiv-Status. `js/searchJobs.js` bewertet und normalisiert Ergebnisse. `worker/src/index.js` ruft Daten der Bundesagentur für Arbeit und von Arbeitnow ab, reichert BA-Ergebnisse an und liefert eine normalisierte Struktur.

### Bewerberprofil

Das versionierte Profilmodell umfasst persönliche Angaben, Kenntnisse, Berufserfahrung, Ausbildung, Projekte und weitere Bewerbungsinformationen. Es wird lokal gespeichert und kann separat als JSON importiert beziehungsweise exportiert werden. Relevante Dateien: `js/profileModel.js`, `js/profileRepository.js`, `js/profile.js`.

### KI-Pipeline

Der Cloudflare Worker stellt folgende Endpunkte bereit:

- `POST /api/ai/job-analysis`
- `POST /api/ai/profile-matching`
- `POST /api/ai/cover-letter`
- `POST /api/ai/cover-letter-review`
- `POST /api/ai/cover-letter-revision`

Die Ergebnisse werden anhand strukturierter JSON-Schemas beziehungsweise expliziter Modellvalidierungen geprüft. Frontend-Services senden für den jeweiligen Schritt nur notwendige Daten und filtern unter anderem private Kontaktdaten und Notizen aus KI-Requests heraus. KI-Ergebnisse bleiben Vorschläge und müssen fachlich geprüft werden.

### PDF-Export

`js/coverLetterPdf.js` erzeugt Anschreiben lokal im Browser. `pdf-lib`, `fontkit` und die mitgelieferten Carlito-Schriften ermöglichen DIN-A4-Seiten, mehrere Seiten, deutsche Sonderzeichen und eingebettete TrueType-Fonts. Der PDF-Export benötigt keinen KI-Aufruf.

## Technologiestack

- HTML5, CSS3 und JavaScript ohne Frontend-Framework
- DOM-basierte UI mit klassischen Skripten und global geladenen Abhängigkeiten
- `localStorage`, JSON-Import/-Export und Datenmigrationen
- Cloudflare Worker und REST-Integrationen
- Bundesagentur für Arbeit, Arbeitnow und OpenAI Responses API
- `pdf-lib`, `@pdf-lib/fontkit` und `pdfjs-dist`
- Node.js Test Runner

Es gibt keinen Bundler, kein TypeScript und keinen separaten Build-Schritt für das Frontend.

## Architektur und Datenfluss

```text
index.html
  ↓
js/ + css/  (UI, Modelle, Services, lokale Persistenz)
  ├─ localStorage: Bewerbungen, Suchprofile, Profil
  ├─ Cloudflare Worker
  │    ├─ Bundesagentur für Arbeit
  │    ├─ Arbeitnow
  │    └─ OpenAI API
  └─ pdf-lib/fontkit: PDF-Erzeugung im Browser
```

Wichtige Verantwortlichkeiten:

- `js/app.js`: Navigation und UI-Zustand
- `js/dashboard.js`, `js/dashboardPanels.js`: Dashboard
- `js/applications.js`, `js/applicationModel.js`: Bewerbungsdaten und CRUD
- `js/applicationCards.js`: Darstellung, Suche, Filter und Sortierung
- `js/storage.js`: Bewerbungs-Persistenz und Migration
- `js/profileModel.js`, `js/profileRepository.js`: Profilmodell und Repository
- `js/*Model.js` und `js/*Service.js`: KI-Modelle und Services
- `worker/src/index.js`: CORS, Request-Validierung, Providerzugriff, Rate-Limit und KI-Integration

## Datenhaltung und Grenzen

Bewerbungs-, Suchprofil- und Profildaten werden grundsätzlich lokal im Browser gespeichert. Es gibt keine Benutzerkonten, keine zentrale Datenbank und keine vollständige geräteübergreifende Synchronisierung. `localStorage` ist browsergebunden, begrenzt und keine verschlüsselte Datenbank.

Bewerbungsdaten können personenbezogene Informationen enthalten. Vor einer Nutzung mit echten Daten sollten Zugriff, Backups, Löschung und die Weitergabe ausgewählter Daten an externe KI-Dienste bewusst geprüft werden.

## Installation und lokaler Start

Voraussetzung ist Node.js mit npm. Abhängigkeiten werden mit folgendem Befehl installiert:

```bash
npm install
```

Das Frontend besteht aus statischen Dateien und hat keinen Build-Schritt. Es sollte über einen lokalen HTTP-Server geöffnet werden, nicht zwingend über `file://`.

Die Worker-URL steht in `js/config.js`:

```js
window.APPLYHQ_JOB_SEARCH_API_URL = "https://example-worker.example.workers.dev";
```

Diese URL ist öffentliche Konfiguration und kein Secret.

## Worker-Konfiguration und Secrets

Der Worker liegt unter `worker/`. Lokale Entwicklung:

```bash
cd worker
npx wrangler dev
```

Secrets dürfen nicht in versionierte Dateien eingetragen werden. Sie werden über Wrangler gesetzt:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put BA_API_KEY
```

`OPENAI_MODEL` und `ALLOWED_ORIGIN` werden in `worker/wrangler.toml` konfiguriert. Die Worker-URL und erlaubten Origins müssen zur tatsächlichen Frontend-URL passen. Die öffentliche Erreichbarkeit des Workers ist keine vollständige Authentifizierung; Rate Limits, Kostenkontrolle und Datenschutz müssen vor einer Produktivnutzung geprüft werden.

## Tests

```bash
npm test
```

Die Tests unter `tests/` decken unter anderem Bewerbungsmodell und Persistenz, Profilmodell, Suchauswertung, Stellenanalyse, Matching, Anschreiben, Review, Revision, PDF-/Unicode-Verarbeitung und Worker-Validierung ab. Es handelt sich überwiegend um isolierte Node-Tests. Browser- und End-to-End-Tests sind nicht vorhanden.

## PWA-Status

`manifest.webmanifest`, Theme-Farben und App-Icons sind vorhanden. Im aktuellen Code gibt es jedoch keinen Service Worker und keine Registrierung über `navigator.serviceWorker.register(...)`. Daher wird keine Offline-Funktion behauptet.

## Einschränkungen und geplante Bereiche

### Teilweise implementiert

- Der Menüpunkt „Dokumente“ ist in `index.html` vorhanden, aber deaktiviert.
- Bewerbungs- und Profilimport/-export sind getrennte Datenpfade; ein gemeinsames Backup aller Bereiche ist nicht vorhanden.
- Die Anwendung verwendet global geladene Skripte statt ES-Module oder eines Bundlers.

### Nicht implementiert beziehungsweise geplant

- Benutzerkonten und Authentifizierung
- Cloud-Synchronisierung und zentrale Datenbank
- vollständige Dokumentenverwaltung
- Service Worker und Offline-Betrieb
- Browser- und End-to-End-Testinfrastruktur

## Projektstruktur

```text
index.html                 Frontend-Einstiegspunkt
css/                       Styles
js/                        UI, Modelle, Services und Persistenz
assets/                    Icons, Fonts und Browser-Vendor-Dateien
worker/src/index.js        Cloudflare Worker
worker/wrangler.toml       Worker-Konfiguration
tests/                     Node-basierte Tests
data/                      Projekt-/Beispieldaten
```

## KI-Unterstützung im Entwicklungsprozess

Das Frontend entstand größtenteils ohne KI-Unterstützung. Beim Backend und insbesondere bei der Integration der KI-Endpunkte wurde intensiv mit OpenAI Codex zusammengearbeitet, um Request-Flüsse, Validierung, Structured Outputs, Datenminimierung und Regressionstests sauber zu integrieren.

Anforderungen und Workflows wurden definiert, Architekturentscheidungen getroffen, Vorschläge geprüft, Tests ergänzt beziehungsweise ausgewertet und Fehler iterativ analysiert. Die Dokumentation behauptet daher nicht, dass sämtliche Implementierungen vollständig manuell entstanden sind, sondern beschreibt KI als Entwicklungswerkzeug innerhalb eines überprüften Entwicklungsprozesses.

## Portfolio-Kontext

ApplyHQ zeigt praktische Arbeit mit einer realen Fachdomaine, Frontend- und DOM-Entwicklung, Datenmodellen und Migrationen, lokaler Persistenz, REST-APIs, Cloudflare Worker, Secret-Verwaltung, strukturierter KI-Ausgabe, PDF-Erzeugung, Unicode-Verarbeitung und automatisierten Tests.
