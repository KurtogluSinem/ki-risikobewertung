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

## Versionsstand

- Prototyp 1.11
- Datenmodell 16
- Regelwerk 2.10
- Leitfaden Version 2.0 – vorläufige Fassung

Das Datenmodell unterstützt die dokumentierte Migration älterer Arbeitsstände. Die mitgelieferten Version-13-, Version-14- und Version-15-Dateien dienen ausschließlich als fiktive Regressionstestdaten. Importierte Berechnungsergebnisse werden nicht ungeprüft übernommen, sondern aus den Eingaben mit dem aktuellen Regelwerk neu berechnet.

Die CRA-Rollenauswahl wird aus den fünf sichtbaren Einzelrollen in einen stabilen internen Code überführt. Speicherung und Export werden vor dem Schreiben vollständig validiert. Nicht lesbare Altstände werden nicht still überschrieben: Eine getrennte Rohsicherung kann über die nur in diesem Fall eingeblendete Schaltfläche heruntergeladen werden. Fehlgeschlagene Importe lassen Arbeitsstand, lokalen Speicher und bereits erzeugte Berichtssnapshots unverändert.

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

Nach aktivierter Veröffentlichung wird die konkrete Adresse im Repository unter „Settings → Pages“ angezeigt.

## Lokale Prüfungen

Die zentralen Konsistenztests werden aus dem Projektordner gestartet:

```bash
node tests/consistency-regression-tests.cjs
node tests/run-tests.cjs
node tests/report-tests.cjs
```

Die Browser- und PDF-Prüfungen benötigen eine lokale Chromium- oder Chrome-Installation sowie Playwright. Die Berichtsgeneratoren verwenden die unveränderten produktiven Dateien `guide-reference.js` und `styles.css`. Erzeugte Prüfstände und Berichte liegen unter `output/`; dieser Ausgabeordner ist nicht Bestandteil der veröffentlichten Anwendung.

## Bekannte Einschränkungen

- Der Prototyp ersetzt keine fachliche, juristische oder organisatorische Genehmigung.
- Rechtsstand, Quellen und Regelbasis müssen regelmäßig fachlich geprüft und aktualisiert werden.
- Die Daten liegen nur im jeweils verwendeten Browserprofil vor; es gibt keine zentrale Synchronisierung oder Benutzerverwaltung.
- GitHub Pages stellt statische Inhalte öffentlich bereit. Deshalb dürfen keine echten Bewertungsdaten, Zugangsdaten, vertraulichen Dokumente oder personenbezogenen Informationen in das Repository aufgenommen werden.
