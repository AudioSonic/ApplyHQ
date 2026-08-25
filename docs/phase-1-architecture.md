# ApplyHQ – Phase 1: Bestandsaufnahme und Architektur

Stand: 2026-08-25  
Scope: ausschließlich Analyse und Planung; keine KI-Implementierung.

## 1. Zusammenfassung

ApplyHQ ist aktuell eine statische, clientseitige Progressive Web App ohne Build-System und ohne allgemeines Backend. Die UI wird zur Laufzeit aus JavaScript erzeugt. Bewerbungen und Suchprofile werden als JSON in `localStorage` gespeichert. Der Cloudflare Worker unter `worker/` ist eine klar abgegrenzte Backend-Komponente für die externe Jobsuche, nicht für Benutzerdaten oder KI.

Die bestehende Struktur ist für einen lokalen Prototypen geeignet. Für KI-Anschreiben sollten die vorhandenen Bewerbungsdaten wiederverwendet, aber um ein strukturiertes, getrenntes Bewerberprofil und einen gespeicherten Pipeline-Zustand ergänzt werden. API-Aufrufe zu einem KI-Anbieter dürfen ausschließlich über einen Server-/Worker-Endpunkt erfolgen.

## 2. Aktuelle Architektur

### Frontend

- `index.html` ist der einzige HTML-Einstiegspunkt.
- `css/` enthält globale, komponentenbezogene und featurebezogene Stylesheets.
- `js/` enthält lose gekoppelte ES6-Skripte ohne Module, Bundler oder TypeScript.
- Die Skripte werden per `<script>`-Reihenfolge geladen; Funktionen und Zustände liegen überwiegend im globalen Scope.
- Navigation ist eine sehr einfache Action-basierte SPA-Navigation: `js/app.js` bindet `data-action`, lädt Dashboard oder Einstellungen und rendert in `#app`.
- Es gibt keine echte Routing-Library und aktuell keine vollständig implementierten Seiten für Bewerbungen, Dokumente oder Profil.

### Persistenz

- Bewerbungen: `localStorage`-Key `applications`, Verwaltung in `js/applications.js` und `js/storage.js`.
- Suchprofile: `localStorage`-Key `searchProfiles`, Verwaltung in `js/searchProfileCards.js`.
- Import/Export betrifft derzeit ausschließlich das Bewerbungsarray (`js/dataManagement.js`); es gibt keine Schema-Version und keine gemeinsame Migration.
- Alle Daten bleiben lokal im Browser; es existiert keine Benutzerverwaltung, Synchronisation oder zentrale Datenbank.

### Backend/Integrationen

- `worker/src/index.js` stellt per POST einen Job-Suchdienst bereit.
- Er ruft Bundesagentur für Arbeit und Arbeitnow auf, normalisiert deren Antworten und reichert BA-Stellen mit Details an.
- `worker/wrangler.toml` konfiguriert Cloudflare Worker und erlaubte Origins.
- `js/config.js` enthält nur die öffentliche Worker-URL.
- Der Worker zeigt bereits das passende Muster für eine serverseitige Adapter-/Proxy-Schicht: CORS, Request-Validierung, Rate Limit, Provider-Abstraktion und Fehleraggregation.
- Es gibt bisher keinen KI-Provider-Adapter, keinen PDF-Service und keinen Dokumentenspeicher.

## 3. Relevante Datenmodelle

### Bewerbung (Ist-Zustand)

`addApplication()` erzeugt derzeit ungefähr:

```text
id, company, position, city, state, date, status, tag, url,
salutation, contactName, description, details, notes,
externalId, source, publishedAt, favorite, logo
```

`description` ist die Stellenbeschreibung als Freitext und damit der naheliegende Eingang für Phase 3/5. `details` und `notes` können Bewerbungszusatzinformationen enthalten, sind aber semantisch nicht weiter strukturiert. Es existieren keine Felder für Arbeitsmodell, Gehaltsvorstellung, Ansprechpartner-Typ, Anschreiben oder Stellenanalyse.

### Suchprofil (Ist-Zustand)

Suchprofile enthalten Such- und Filterdaten wie `position`, `location`, `radius`, `remote`, `employmentType`, `searchTerms`, `active`, `lastSearch` und `newJobs`. Das ist kein Bewerberprofil und sollte nicht als Quelle für Bewerbungsinhalte verwendet werden.

### Profil (Ist-Zustand)

Ein zentrales Bewerberprofil ist im Repository nicht vorhanden. Die Navigation enthält zwar einen nicht verdrahteten Eintrag „Profil“, aber weder Persistenz noch Formular oder Rendering dafür.

### Dokumente/PDF (Ist-Zustand)

Es gibt keine Dokument-Datenstruktur, keine Editor-Komponente und keinen PDF-Renderer. Die README führt Dokumentenverwaltung und PDF-Export noch als geplante Erweiterungen.

## 4. Vorhandene UI-Komponenten und Services

- Dashboard: `js/dashboard.js`, `js/dashboardPanels.js`, `js/applicationCards.js`.
- Bewerbungs-CRUD: `js/applications.js`, `js/applicationModal.js`, `js/applicationCards.js`.
- Modal-Grundsystem: `js/modal.js`.
- Suchprofile und Jobsuche: `js/searchProfileCards.js`, `js/searchJobs.js`, `worker/src/index.js`.
- Einstellungen und Datenverwaltung: `js/settings.js`, `js/dataManagement.js`.
- Validierung ist derzeit überwiegend formular- und feldbezogen; eine allgemeine JSON-Schema-Validierung oder Laufzeitvalidierung für neue Domänenmodelle fehlt.
- Tests verwenden Node Test Runner und VM-Laden einzelner Skripte (`tests/searchJobs.test.js`); es gibt keine Browser-/E2E-Testinfrastruktur.

## 5. Integrationspunkte und notwendige Änderungen

1. **Bewerbung erweitern:** vorhandene Bewerbung als Kontext verwenden; Stellenanzeige als eigenes, optionales Objekt oder versioniertes Feld ergänzen, statt `description` sofort umzudeuten.
2. **Profilseite und Profilmodell:** neue strukturierte Profilquelle einführen und Profilseite daraus rendern. Eine mögliche Domäne umfasst persönliche Daten, Berufserfahrung, Ausbildung, Skills/Technologien, Projekte und Zusatzinformationen.
3. **Gemeinsame Persistenzschicht:** `localStorage`-Zugriff hinter einer kleinen Repository-/Schema-Schicht kapseln; Migrationen und Export/Import für alle relevanten Domänen vorsehen.
4. **KI-Backend:** den Worker um einen separaten, validierten KI-Endpunkt erweitern oder einen eigenen Worker-Service anlegen. Providerzugriff, Secrets, Rate Limits, Datenschutz und Logging gehören ausschließlich dorthin.
5. **Pipeline-Daten:** Analyse, Matching, Entwurf, Qualitätsprüfung und Revision als getrennte, speicherbare Ergebnisse modellieren. Rohtext und strukturierte Ergebnisse müssen nachvollziehbar bleiben.
6. **Validierte KI-Ausgabe:** JSON-Schema bzw. explizite Validatoren für jede Pipeline-Stufe; ungültige oder unbelegte Aussagen dürfen nicht direkt gerendert werden.
7. **Editor/Vorschau:** neue Ansicht bzw. Bewerbungsdetailansicht mit Status, Lade-/Fehlerzuständen, manueller Bearbeitung und expliziter Nutzerfreigabe.
8. **PDF:** clientseitige oder serverseitige Rendering-Lösung anhand der vorhandenen Deployment-Ziele auswählen; Inhalt und Layout strikt trennen. Vorher Bibliothek und Lizenz/Bundle-Größe prüfen.
9. **Navigation:** die bisher nicht verdrahteten Bereiche „Bewerbungen“, „Dokumente“ und „Profil“ schrittweise als echte Views ergänzen, ohne den bestehenden Dashboard-Einstieg zu brechen.

## 6. Empfohlene Zielstruktur

```text
profileRepository        -> structured applicant profile
applicationRepository    -> applications + job posting context
coverLetterRepository    -> pipeline runs + editable document
aiService (frontend)     -> one backend endpoint, no provider logic
aiPipeline (backend)     -> analyze -> match -> draft -> review/revise
documentRenderer         -> structured cover-letter content -> PDF
views/components         -> profile, application, editor, preview
```

Das ist eine logische Trennung, keine Aufforderung, sofort ein Framework oder eine Parallelstruktur einzuführen. In der bestehenden Anwendung kann sie zunächst als kleine, klar benannte ES6-Module/Dateien umgesetzt werden.

## 7. Phasenplan 2–11

### Phase 2 – Profil-Datenmodell

Ein versioniertes Profilmodell und Repository entwerfen; bestehende Profilseite neu aufbauen, sodass sie ausschließlich aus diesen Daten rendert. Formularvalidierung, Import/Export und Migrationen ergänzen. Ergebnis: editierbares strukturiertes Profil ohne KI.

### Phase 3 – Stellenanzeigen-Datenmodell

Stellenanzeige von Bewerbungsmetadaten trennen: Rohtext, Quelle, URL, Erfassungsdatum und optional strukturierte Analyse. Bestehende `description` kompatibel migrieren. Ergebnis: eine Bewerbung kann eine belastbare Stellenanzeige referenzieren.

### Phase 4 – KI-Anbindung

Providerunabhängige Backend-Schnittstelle und einen ersten Adapter einführen. Secrets bleiben Worker-Secrets. Requests begrenzen, Fehler standardisieren, personenbezogene Daten minimieren und nur notwendige Profil-/Bewerbungsdaten übertragen.

### Phase 5 – Stellenanzeigenanalyse

Nur Rohtext -> validiertes `JobAnalysis`-Ergebnis. Kein Anschreiben in diesem Schritt. Mock-Provider und Tests zuerst, danach echter Provider.

### Phase 6 – Profil-Matching

`JobAnalysis` + strukturiertes Profil -> begründete Auswahl relevanter Skills, Erfahrungen und Projekte sowie nicht erfüllte Anforderungen. Jede Auswahl sollte auf Profil-IDs/Quellen verweisen, damit Aussagen prüfbar bleiben.

### Phase 7 – Anschreibengenerierung

Aus Bewerbungskontext, Analyse und Matching ein strukturiertes Dokument erzeugen (`recipient`, `subject`, `salutation`, `paragraphs`, `closing`). Keine freie Behauptung ohne belegte Quelle; Tonalität und Länge validieren.

### Phase 8 – Qualitätsprüfung

Separaten Review-Schritt mit Score, Issues, gematchten Anforderungen und unbelegten Claims. Bei kritischen Issues kontrollierte Revision mit begrenzter Anzahl Versuche; immer als Entwurf speichern.

### Phase 9 – Editor und Vorschau

Entwurf, Bewertung und Quellenhinweise anzeigen; Nutzer darf Text ändern, speichern und neu generieren. Statusmodell und verständliche Lade-/Fehlerzustände ergänzen. Manuelle Änderungen dürfen nicht unbemerkt überschrieben werden.

### Phase 10 – PDF-Export

Ein ApplyHQ-Layout als eigene Renderer-Komponente umsetzen. Strukturierte Inhalte in ein konsistentes Dokument übertragen; PDF lokal testen und visuell prüfen. Export erst nach Nutzerfreigabe.

### Phase 11 – Optimierung

Prompts und Tokenverbrauch optimieren, Caching/Idempotenz prüfen, Datenschutz- und Löschkonzept dokumentieren, Fehlertexte und UX verbessern, Tests und Refactoring ergänzen.

## 8. Risiken und Entscheidungen vor Phase 2

- **Persistenzgrenze:** Local Storage ist gerätegebunden und für sensible Profildaten begrenzt. Für den ersten lokalen Zwischenstand ist es möglich; Cloud-Sync/Accounts wären eine separate Architekturentscheidung.
- **Datenschutz:** Bewerbungsdaten und Profil können personenbezogene Daten enthalten. Vor echter KI-Anbindung braucht es Einwilligungs-/Hinweistexte, Datenminimierung, Anbieterprüfung und Löschbarkeit.
- **Modellzuverlässigkeit:** Structured Output ist kein Wahrheitsbeweis. Quellenreferenzen, Validierung und Review bleiben Pflicht.
- **Kompatibilität:** Alte Exporte müssen lesbar bleiben. Ein Schema-Wrapper mit `version` und Migrationsfunktionen ist daher wichtiger als zusätzliche UI.
- **Testbarkeit:** Die globale Script-Struktur erschwert isolierte Tests. Neue Domänenlogik sollte möglichst als reine Funktionen/Module geschrieben werden, bevor sie an DOM und `localStorage` gekoppelt wird.
- **PDF-Technik:** Erst in Phase 10 entscheiden, ob Rendering im Browser oder im Worker erfolgt; diese Entscheidung hängt von Offline-Anforderung, Fonts, Datenschutz und Deployment ab.

## 9. Ergebnis der Phase 1

Die bestehende Anwendung bietet wiederverwendbare Grundlagen für Bewerbungsdaten, Modals, Dashboard-Rendering, lokale Speicherung, JSON-Import/Export und einen serverseitigen API-Proxy. Sie besitzt jedoch noch kein zentrales Bewerberprofil, keine Dokumentenverwaltung, keine PDF-Erzeugung und keine KI-Abstraktion. Phase 2 sollte deshalb mit dem versionierten Profilmodell und der gemeinsamen Persistenz-/Migrationsschicht beginnen; bis dahin sollte keine KI-Pipeline in die bestehende UI eingebaut werden.
