# Suite-Shell Einbau pro Studio (Checkliste)

Stand: Fundament fertig (v0.3.0). Dieser Einbau ist die geschmackssensible Phase, bewusst
gemeinsam mit Manuel, ein Studio nach dem anderen, jeweils mit Blick auf das Ergebnis.

## Voraussetzung (einmalig): Brain-Branch mergen
Damit die Live-Status-Punkte funktionieren, muss der Branch `feat/suite-shell` im Repo
`business-brain` nach `main` gemergt und deployt werden. Er fügt nur einen additiven,
öffentlichen Endpunkt hinzu: `GET /business/api/status` (CORS-offen, Modul-Gesundheit als JSON).
Lokal gegen die echte DB getestet, Ergebnis: `{"brain":"warn","crm":"ok","finance":"ok","marketing":"ok","sales":"ok"}`.

## Pro Studio (gleiche fünf Schritte)
1. **Paket als Abhängigkeit** in die `package.json` des Studios:
   ```json
   "@ki-impact/studio-shell": "github:denglermanuel/growlify-studio-shell#v0.3.0"
   ```
   Dann `npm install` (lokal mit Tunnel oder beim nächsten Deploy).
2. **CSS-Fundament** statt eigenem `<style>`-Block, im `<head>`:
   ```js
   import { baseCss, suiteTopbar, systemSection } from '@ki-impact/studio-shell';
   // <head>:  <style>${baseCss()}</style>
   ```
3. **Eigenen Header durch die Topbar ersetzen** (oben im `<body>`):
   ```js
   ${suiteTopbar({
     active: 'finance', // bzw. crm | sales | marketing | brain
     statusUrl: 'http://sfb9da0vaien08of59th70v7.178.104.27.120.sslip.io/business/api/status',
   })}
   ```
   Die Modul-Links sind als Defaults im Paket hinterlegt (echte Studio-URLs). Eigene Studio-Nav
   (die Reiter) bleibt darunter wie gehabt.
4. **System-Reiter vereinheitlichen** (optional, wo sinnvoll): den Inhalt des System-Reiters durch
   `systemSection({ feed, health, learnings })` ersetzen, damit alle Studios denselben Aufbau zeigen.
5. **Verifizieren**: lokal starten, Browser bei 1280 und 375 px, Konsole sauber, dann auf einem
   Branch committen und nach Sichtprüfung mergen (= Deploy).

## Besonderheiten je Studio
- **crm, sales**: server-rendered (`server/ui.mjs`), haben schon `nav.tabs`. Sauberster Einstieg.
- **finance, content**: statischer Build (`tools/build-studio.mjs`), Header wird beim Build erzeugt.
  Die Topbar wird dort beim Build eingesetzt, der Live-Status-Fetch läuft trotzdem clientseitig.
  finance navigiert zudem per JS-Tabs statt URL-Routen, das ist ein separater, größerer Umbau,
  nicht Teil des Shell-Einbaus.
- **brain**: ist das Herz, bekommt die Topbar zuletzt, plus die große Übersichts-/Graph-Seite als
  Signature (eigener Schritt nach dem Einbau).

## Reihenfolge-Empfehlung
crm → sales (server-render, schnell und sichtbar) → content → finance (statischer Build) → brain
(zuletzt, mit der Signatur-Übersicht). So sieht man den Suite-Effekt früh und arbeitet sich zum
aufwändigsten Fall vor.
