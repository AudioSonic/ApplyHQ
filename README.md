# ApplyHQ

<img width="1895" height="929" alt="grafik" src="https://github.com/user-attachments/assets/8d21b32d-aa32-4dbe-97dc-75013b2ec0ba" />


## Projektübersicht

ApplyHQ ist eine moderne Webanwendung zur Verwaltung und schrittweisen Automatisierung des gesamten Bewerbungsprozesses.

Die Anwendung entstand ursprünglich als praxisorientiertes Lernprojekt und wurde kontinuierlich zu einer umfangreichen persönlichen Bewerbungsplattform weiterentwickelt. Ziel ist es, möglichst viele wiederkehrende Aufgaben der Jobsuche an einem zentralen Ort zu bündeln – von der Suche nach passenden Stellenanzeigen über die Verwaltung von Bewerbungen bis hin zur KI-gestützten Analyse und Erstellung von Anschreiben.

ApplyHQ verbindet dabei klassische Webentwicklung mit API-Integration, lokaler Datenhaltung, KI-gestützten Funktionen und automatisierter Dokumentenerstellung.

---

## Funktionen

### Bewerbungsverwaltung

- Vollständige CRUD-Verwaltung von Bewerbungen
- Verwaltung von Unternehmen, Stellenanzeigen und Ansprechpartnern
- Bewerbungsstatus und weitere Bewerbungsinformationen
- Suche, Filterung und Sortierung
- Dynamische Benutzeroberfläche
- Datenvalidierung
- JSON-Import und -Export
- Lokale Speicherung von Bewerbungsdaten

### Automatisierte Stellensuche

ApplyHQ kann anhand individuell konfigurierbarer Suchprofile passende Stellenanzeigen recherchieren.

Dabei können unter anderem Stellenangebote aus folgenden Quellen berücksichtigt werden:

- Bundesagentur für Arbeit
- Arbeitnow

Suchprofile können beispielsweise hinsichtlich Suchbegriffen und weiterer Kriterien konfiguriert werden. Gefundene Stellenanzeigen können anschließend als Bewerbungen in ApplyHQ übernommen und dort weiterverarbeitet werden.

### KI-gestützte Stellenanalyse

Stellenanzeigen können automatisiert durch eine KI analysiert werden.

Dabei werden unter anderem strukturierte Informationen ermittelt wie:

- Aufgaben
- Muss-Anforderungen
- Wünschenswerte Anforderungen
- Technologien
- Soft Skills
- Benefits

Die Analyse bildet anschließend die Grundlage für weitere Verarbeitungsschritte.

### KI-gestütztes Matching

Die analysierten Stellenanforderungen können mit dem persönlichen Bewerberprofil abgeglichen werden.

Dabei berücksichtigt ApplyHQ unter anderem:

- Muss-Anforderungen
- Technische Kenntnisse
- Berufserfahrung
- Ausbildung
- Projekte
- Soft Skills

Das Ergebnis wird als prozentuale Einschätzung der Passung dargestellt und soll eine schnelle Einschätzung ermöglichen, wie gut eine Stelle zum eigenen Profil passt.

### KI-gestützte Anschreiben

Auf Grundlage der Stellenanzeige, der Stellenanalyse und des persönlichen Bewerberprofils kann ApplyHQ automatisch ein individuelles Anschreiben erstellen.

Der Workflow berücksichtigt dabei unter anderem:

- konkrete Anforderungen der Stelle
- vorhandene Kenntnisse und Erfahrungen
- relevante Projekte
- Ansprechpartner
- Unternehmensinformationen
- persönliche Motivation für die jeweilige Position

Erstellte Anschreiben können anschließend geprüft und überarbeitet werden.

### PDF-Erstellung

Anschreiben können direkt aus ApplyHQ als PDF exportiert werden.

Der PDF-Export erfolgt lokal und verwendet:

- DIN-A4-Layout
- individuelles Bewerbungsdesign
- dunkle Seitenleiste
- eingebettete Carlito-Schriftarten
- Unterstützung deutscher Sonderzeichen
- Mehrseitige Dokumente
- automatisch erzeugte Empfänger- und Bewerbungsdaten

Die PDF-Erzeugung benötigt keinen KI-Aufruf.

---

## Technischer Aufbau

ApplyHQ wurde schrittweise entwickelt und verwendet unter anderem:

- HTML5
- CSS3
- JavaScript (ES6+)
- DOM-Manipulation
- Modularisierung
- Local Storage
- JSON
- REST-/API-Anbindungen
- C#/.NET-basierte Backend-Komponenten
- SQL-basierte Datenverarbeitung
- OpenAI API
- `pdf-lib`
- `fontkit`
- TrueType-Font-Einbettung
- Progressive Web App (PWA)

Besonderer Wert wurde auf eine modulare Struktur gelegt. Datenmodelle, Services, UI-Komponenten und Verarbeitungslogik sind voneinander getrennt, sodass die Anwendung schrittweise erweitert werden kann.

---

## Projektarchitektur

Die Verarbeitung einer Bewerbung folgt inzwischen einem mehrstufigen Workflow:

```text
Suchprofil
    ↓
Automatisierte Stellensuche
    ↓
Stellenanzeige
    ↓
Stellenanalyse
    ↓
Bewerberprofil
    ↓
KI-Matching
    ↓
Anschreiben
    ↓
Qualitätsprüfung / Überarbeitung
    ↓
PDF-Export
