# KI-Risikobewertung

Statischer Prototyp für eine geführte und nachvollziehbare Erstbewertung von KI-Anwendungen nach dem EU AI Act und mit ergänzender Prüfung des Cyber Resilience Act. Die Anwendung führt durch acht Prüfschritte und erzeugt einen kompakten Bewertungsbericht sowie einen vollständigen Nachweisbericht.

## Technologien

- HTML5
- CSS3
- JavaScript ohne Framework und ohne Build-Schritt
- Web Storage API für die lokale Speicherung im Browser
- JSON-Import und -Export für bewusst ausgelöste Datensicherung
- Browser-Druckfunktion für die PDF-Ausgabe

Die Anwendung verwendet kein Backend und ruft keine externen Dienste oder Programmierschnittstellen auf.

## Lokal starten

Im Projektordner einen lokalen Webserver starten:

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000/` im Browser öffnen. Alternativ kann `index.html` direkt geöffnet werden; ein lokaler Webserver entspricht jedoch besser der späteren Bereitstellung über GitHub Pages.

## Datenhaltung

Eingaben werden ausschließlich im lokalen Browser-Speicher des verwendeten Browsers und Ursprungs gespeichert. Es findet keine Übertragung an einen Server statt. Browserdaten können durch das Löschen der Website-Daten verloren gehen. Für eine dauerhafte Sicherung muss der JSON-Export verwendet und die Exportdatei sicher verwahrt werden.

Exportierte Bewertungen können sensible oder personenbezogene Angaben enthalten und dürfen nicht in dieses Repository aufgenommen werden. Das Repository enthält nur einen vollständig fiktiven Musterfall für Tests und Demonstration.

## GitHub Pages

Die Startdatei `index.html` und alle Laufzeitdateien liegen im Projektstamm. Relative Pfade ermöglichen den Betrieb unter dem Repository-Unterpfad `/ki-risikobewertung/`. Ein Build-Schritt ist nicht erforderlich.

Nach aktivierter Veröffentlichung ist die Anwendung voraussichtlich unter folgender Adresse erreichbar:

`https://kurtoglusinem.github.io/ki-risikobewertung/`

## Bekannte Einschränkungen

- Der Prototyp ersetzt keine fachliche, juristische oder organisatorische Genehmigung.
- Rechtsstand, Quellen und Regelbasis müssen regelmäßig fachlich geprüft und aktualisiert werden.
- Die Daten liegen nur im jeweils verwendeten Browserprofil vor; es gibt keine zentrale Synchronisierung oder Benutzerverwaltung.
- GitHub Pages stellt statische Inhalte öffentlich bereit. Deshalb dürfen keine echten Bewertungsdaten, Zugangsdaten, vertraulichen Dokumente oder personenbezogenen Informationen in das Repository aufgenommen werden.

