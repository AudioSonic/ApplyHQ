# ApplyHQ  
<img width="1206" height="972" alt="grafik" src="https://github.com/user-attachments/assets/7a9ca264-abb1-4845-badb-5cd4cee5f195" />
 
## Projektübersicht

ApplyHQ ist eine moderne Web-App zur Verwaltung von Bewerbungen. 
In Version 0.1 können Bewerbungen erstellt, verwaltet und gelöscht werden. Ein Dashboard liefert einen schnellen Überblick über offene Bewerbungen sowie den aktuellen Stand des Bewerbungsprozesses. Durch die Unterstützung als Progressive Web App (PWA) kann ApplyHQ auf Desktop- und Mobilgeräten installiert und wie eine native Anwendung verwendet werden.

---

## Ziel des Projekts

ApplyHQ entstand als praxisorientiertes Lernprojekt im Rahmen meiner Reise in die Web- und Softwareentwicklung.

Der Ausgangspunkt war ein ganz konkretes Problem: Während meiner Jobsuche musste ich regelmäßig nach offenen Stellen suchen und den Überblick über Unternehmen, Bewerbungen und den aktuellen Stand des Bewerbungsprozesses behalten. Ich wollte mir dafür eine möglichst einfache und komfortable Lösung schaffen, die alle wichtigen Informationen an einem Ort bündelt und den Bewerbungsprozess erleichtert.

Anstatt einzelne Tutorials nachzubauen, verfolge ich einen projektbasierten Lernansatz. Ziel ist es, reale Anwendungen zu entwickeln, die sich über viele Versionen hinweg kontinuierlich weiterentwickeln. Jede Version führt neue Technologien und Konzepte ein und erweitert die Anwendung Schritt für Schritt. So entsteht nicht nur ein Portfolio-Projekt, sondern gleichzeitig ein Werkzeug, das ich selbst aktiv im Alltag nutze.

Version 0.1 konzentriert sich bewusst auf die Grundlagen moderner Webentwicklung:

* HTML5
* CSS3
* JavaScript (ES6)
* DOM-Manipulation
* Formulare und Event Handling
* CRUD-Operationen
* Dynamisches Rendering
* Local Storage
* Responsive Design
* Progressive Web Apps (PWA)

---

## Mobile Ansicht

ApplyHQ wurde von Beginn an responsiv entwickelt und passt sich automatisch an unterschiedliche Bildschirmgrößen an.

Die Anwendung funktioniert sowohl auf Desktop-PCs als auch auf Tablets und Smartphones. Dank der PWA-Unterstützung kann ApplyHQ direkt auf dem Startbildschirm installiert und ohne Browseroberfläche genutzt werden.  
<img width="481" height="839" alt="grafik" src="https://github.com/user-attachments/assets/eeb3f2a1-fecf-4fa3-85b3-3d79ca63caf3" />
<img width="481" height="838" alt="grafik" src="https://github.com/user-attachments/assets/436aca31-8620-46ec-94e6-4a4d8b24f41b" />

---

## Technischer Aufbau

Die Anwendung besitzt eine bewusst einfache und übersichtliche Architektur.

* **HTML** strukturiert die Benutzeroberfläche.
* **CSS** übernimmt Layout, Responsive Design und Animationen.
* **JavaScript** bildet die gesamte Anwendungslogik.

Die JavaScript-Dateien sind nach Verantwortlichkeiten aufgeteilt:

* `app.js` – Initialisierung und Steuerung der Anwendung
* `applications.js` – Datenmodell und Verarbeitung der Bewerbungen
* `render.js` – Dynamisches Erzeugen und Aktualisieren der Benutzeroberfläche
* `storage.js` – Speichern und Laden der Daten über den Local Storage

Alle Bewerbungsdaten werden lokal im Browser gespeichert. Dadurch kann die Anwendung vollständig ohne Backend betrieben werden.

---

## Zielgruppe

ApplyHQ richtet sich an Personen, die ihre Bewerbungen strukturiert verwalten möchten, ohne dafür komplexe Bewerbungsportale oder Tabellen verwenden zu müssen.

Darüber hinaus dient das Projekt als Portfolio-Anwendung, die den schrittweisen Aufbau einer modernen Webanwendung dokumentiert.

---

## Status

**Aktuelle Version:** v0.1

### Bereits umgesetzt

* Bewerbungen erstellen
* Bewerbungen löschen
* Dashboard mit Statistiken
* Dynamisches Rendering
* Local Storage
* Responsive Design
* Progressive Web App (PWA)
* Installation auf Desktop und Smartphone

### Geplante Erweiterungen

Die Entwicklung von ApplyHQ erfolgt schrittweise in mehreren Versionen.

Geplante Funktionen umfassen unter anderem:

* Einstellungen
* Import und Export von Bewerbungsdaten
* Suche, Filter und Sortierung
* Bearbeiten bestehender Bewerbungen
* Mehrsprachigkeit
* Individuelle Anschreiben
* KI-gestützte Unterstützung im Bewerbungsprozess
* Cloud-Synchronisation und Benutzerkonten
