# DESIGN.md — Growlify Suite (Shell)

> Source of truth fürs Design der gesamten Suite. Erst hier entscheiden, dann coden.
> Jeder Farb-/Größenwert in den Studios muss auf ein Token hier zurückführbar sein.
> Diese Datei ist die geteilte Spec über alle Studios (business-brain, crm, sales,
> finance, marketing). Studio-spezifische Abweichungen kommen in ein dünnes Delta-Doc
> im jeweiligen Repo, nicht hierher.

## 0. Intent (1 Satz)
Eine zusammenhängende Business-Suite für Growlify, in der die einzelnen Studios als Module
hängen und das Brain als Herz im Zentrum steht: ruhig, warm, datenklar, und an genau einer
Stelle (dem Brain-Graphen) visuell beeindruckend.

## 1. Taste-Lane & Signature
- **Lane:** minimalist-ui (warm-monochrom, editoriale Typo, viel Weißraum, dezente Motion).
  Datendichte Studio-Innenflächen nehmen Anleihen vom `dashboard`-Skill (States-Matrix, ruhige Tabellen).
- **Signature-Element (genau eines):** der **Brain-Graph** (Obsidian-Look) auf der Brain-Startseite.
  Das ist der eine mutige Moment, der „das System ist das Produkt" sichtbar macht, auch für Kunden
  und Investoren. Überall sonst: ruhig, zurückhaltend, kein zweites Feuerwerk.
- **Bewusst vermieden:** generischer SaaS-Admin-Look, kalte Blau-Graus, Neon-Tech, bunte Gradients
  ohne Grund, Inter/Roboto als Display, Modul-Sprung in ein fremd aussehendes Fenster.

## 2. Color-Tokens (warm, aus dem Ist-Stand destilliert)
Basis sind die real verwendeten Marken-Werte, ergänzt um eine vollständige semantische Schicht.
- `--bg`         #F8F8F4   Seitengrund, warmes Papier (nicht reinweiß)
- `--surface`    #FFFFFF   Karten/Panels auf dem Papiergrund
- `--surface-2`  #F2F2EC   leicht vertiefte Flächen (Toolbars, Tabellenkopf)
- `--fg1`        #18221B   Text primär, grünstichiges Fast-Schwarz (nie #000)
- `--fg2`        #5B6660   Text sekundär/muted
- `--fg3`        #8A938D   Hinweise, Platzhalter
- `--border`     #E7E7DF   warme 1px-Haarlinie
- `--brand`      #13E489   Marken-Grün: primäre Aktion, „gesund/live"-Signal. Sparsam.
- `--brand-ink`  #04342C   Text auf Brand-Flächen (nie schwarz auf Grün)
- `--accent`     #23B2CF   Sekundär-Akzent: Links, Datenflüsse, aktive Kanten im Graphen
- `--onDark`     #F8F8F4   Text auf dunklen Pillen/Flächen
- **Status:** `--ok` #13E489 · `--warn` #EF9F27 · `--fail` #E24B4A (Health-Punkte, System-Reiter)

Dark-Mode ist Stufe 2 (Studios laufen heute hell). Tokens so benannt, dass ein späterer
Dark-Layer nur die Werte tauscht.

## 3. Typografie
- **Display & Body:** Plus Jakarta Sans (bereits überall im Einsatz). Eine Familie, zwei Gewichte
  aktiv: 400 regular, 600 für Titel/Labels. Kein 700-Fett gegen die ruhige Anmutung.
- Display-Titel: tracking -0.02em, line-height 1.1. Body 15–16px, line-height 1.6.
- Skala: 12 / 13 / 15 / 18 / 22 / 28 / clamp() für Brain-Startseiten-Headline.
- Zahlen/Meta in Tabellen: `tabular-nums`.

## 4. Spacing & Layout
- 8pt-Grid (Vielfache von 8/4). Karten-Innenabstand 16/20px, Sektion-Rhythmus 32/48px.
- Studio-Inhalt `max-width` ~1120px, zentriert. Radius: 10px Karten, 8px Controls.
  Kein `rounded-full` für Container; Pillen (Nav, Status) dürfen voll rund sein.
- Relationship-based spacing: Zusammengehöriges enger, Gruppen klar getrennt.

## 5. Die Suite-Anatomie (das Kernstück dieses Pakets)
Drei feste Ebenen, in jedem Studio identisch (aus der Shell, nicht kopiert):

1. **Suite-Topbar** (persistent, ~52px): links Wortmarke „Growlify" + dezenter „Suite"-Tag.
   Mitte/links der **Modul-Switcher**: Brain · CRM · Sales · Finance · Marketing, jedes eine
   Pille mit **Live-Status-Punkt** (grün/gelb/rot aus `system_health`). Rechts ein globaler
   Gesundheits-Puls (wie viele Module grün) + Umgebungs-Tag. Das ist der „Heimweg": von überall
   in jedes Modul, ohne in ein fremd aussehendes Fenster zu springen.
2. **Studio-Nav** (`nav.tabs`, bestehend je Studio): die Reiter des aktiven Studios.
3. **System-Sektion** (überall gleich): Feed (system_log) + Gesundheit (eigene Checks) +
   Learnings/Insights (lokale Erkenntnis-Schicht). Referenz-Ausprägung: sales-studio.

Das Brain ist im Switcher visuell das Herz (erste Position, eigene Akzentbehandlung), nicht nur
ein Reiter unter vielen.

## 6. Primitives & States
Vor Screens: Button, Link, Pille/Tab, Karte, Tabelle, Status-Punkt, Empty/Loading/Error-Panel,
Toast. Alle States: default · hover · focus-visible · active · disabled · loading · empty · error.
Touch-Target ≥ 44px, sichtbarer Keyboard-Focus. Empty/Error als Handlungsaufforderung, nie Sackgasse.

## 7. Motion
- Dezent: fade + translateY(8–12px), 500–600ms cubic-bezier(0.16,1,0.3,1), nur transform/opacity.
- Der Brain-Graph darf lebendiger sein (sanftes force-layout-Settling, Hover-Highlight der Kanten),
  bleibt aber Schau-Werkzeug, kein Zappel-Effekt.
- `prefers-reduced-motion`: Graph statisch, alle Entries ohne Bewegung.

## 8. Responsive & akzeptierte Schulden
- Geprüft bei 375 / 768 / 1280 px. Modul-Switcher kollabiert mobil zu einem Dropdown.
- Bewusst (noch) nicht gelöst: Dark-Mode (Stufe 2), der voll-interaktive Graph (Stufe 3, startet
  als gepflegtes statisches SVG), Tabellen-Virtualisierung bei sehr großen Datenmengen.

## 9. Copy-Prinzipien
Kernaussage zuerst, aktiv, aus Nutzersicht. Konsistentes Vokabular (Modul, Reiter, Erkenntnis,
Gesundheit). Keine Em-Dashes als Einschub. Status-Texte konkret: „finance meldet seit 14h nicht"
statt „Fehler". Aus `frontend-design`: Worte sind Design-Material. Fehler erklären was und wie zu
beheben, Empty-States sind eine Handlungsaufforderung, ein Control sagt was es tut („Erkenntnis
adeln", nicht „Absenden").

## 10. Skill-Synthese (was aus welchem Skill kam, nachvollziehbar)
- **ui-ux-pro-max** (Such-CLI, „business suite studios dashboard"): übernommen das Strukturmuster
  **Data-Dense + Drill-Down** (KPI-Karten, Datentabellen, dichtes Grid), die Primitives **Row-Hover,
  Hover-Tooltips, Filter** und die A11y-Gates (Kontrast 4.5:1, sichtbarer Focus, reduced-motion,
  Breakpoints 375/768/1024/1440, keine Emoji als Icons). **Bewusst verworfen:** dessen Default-Dunkel-
  Palette (#020617) und Fira-Code/Sans. Begründung: die warme Lane und Plus Jakarta Sans sind
  Marken-Vorgabe (Brief gewinnt). Das ist akzeptierte, dokumentierte Schuld, kein Versehen.
- **frontend-design** (Keystone): Anti-Templating-Bewusstsein. „Warmes Creme + Serif + Terracotta"
  ist selbst ein AI-Default. Unsere warme Fläche bleibt (Marke), die Distinktion verdienen wir NICHT
  über Dekor, sondern über drei subjekt-gegründete Entscheidungen:
  1. **Signature = die Suite-Übersichtsseite („Cockpit") mit dem Brain als lebendiger Konstellation**
     (Obsidian-Look). Das ist der eine mutige Ort, hier darf Design „krachen". Jeder Studio-Header
     bleibt bewusst ruhig und diszipliniert. (Deckt sich mit Manuels Wunsch, das Brain zentral auf
     einer Übersicht zu inszenieren, nicht im Switcher.)
  2. **Struktur kodiert Wahrheit, nicht Dekor:** Status-Punkte = echte `system_health`. Der
     Aufwärts-Pfeil = realer Rauf-Fluss. Keine schmückenden 01/02/03-Nummern.
  3. **Utility-Face für Zahlen:** Plus Jakarta Sans für Text, plus **Spline Sans Mono** mit
     `tabular-nums` für Geldbeträge, KPIs, Zähler. Gibt den datendichten Studios eine präzise,
     instrumentenhafte Anmutung (das System als Messinstrument), grounded im Subjekt. Genau ein
     zusätzlicher Face, keine Typo-Sammlung.
- **minimalist-ui** (Default-Lane via web-design-haus): warm-monochrom, Weißraum, dezente Motion.
  Bleibt das ruhige Fundament rund um die eine Signature.

## 11. Suite v2 — Next Level (Apple-Logik, ohne Bruch)
Ziel: moderner, eleganter, aufgeräumter. Wir werfen nichts um, wir **heben das Bestehende**.
Leitprinzip aus Apples Designsprache: **Klarheit, Zurückhaltung, Tiefe.** Inhalt führt, Chrome
tritt zurück, Material gibt sanfte Tiefe. Quelle: ui-ux-pro-max (Bento + sanfte Tiefe + ruhige
Motion), frontend-design (Hierarchie/Anti-Templated), minimalist-ui (warme Ruhe). Palette und
Plus Jakarta Sans bleiben.

**Die sieben Hebel (jeder klein, zusammen ein Sprung):**

1. **Tiefe statt Linien.** Heute: weiße Karten mit harter 1px-Linie auf Creme. v2: Karten
   schweben über **sehr weichen, geschichteten Schatten** statt Rahmen.
   `--shadow-sm: 0 1px 2px rgba(24,34,27,.04); --shadow: 0 1px 3px rgba(24,34,27,.05), 0 10px 30px rgba(24,34,27,.04)`.
   Rahmen nur noch als optionale Haarlinie `rgba(24,34,27,.06)`. Das ist der größte Modern-Sprung.
2. **Surface-Staffelung — warmes Weiß statt Creme.** Entscheidung 2026-06-26: das beige
   Creme als Vollfläche wird abgelöst. Seitengrund **`--bg:#FAFAF9`** (warmes Weiß, ein Hauch
   Wärme, nicht steril), Karten reines `--surface:#FFFFFF`, vertiefte Flächen `--surface-2:#F4F4F1`.
   Trennung der Karten über die sanfte Tiefe (Schatten), nicht über Farbkontrast. Die Wärme lebt
   jetzt in Akzent (Grün/Cyan), Text (`#18221B`) und warmen Grautönen, nicht im Hintergrund.
   Ein Token-Flip Richtung kühler (reines Growly-Weiß `#FBFBFC`) oder wärmer jederzeit möglich.
3. **Großzügiger Takt.** Karten-Innenabstand 20→**24px**, Sektion-Rhythmus 32→**44/56px**,
   striktes 8pt-Grid. Mehr Luft = ruhiger, teurer.
4. **Schärfere Typo-Hierarchie.** Headline-Skala mit `clamp()`, tracking -0.025em; Sektion-Titel
   18→20px/600; Body 15→**16px**, line-height **1.65**; Zahlen/KPIs in **Spline Sans Mono**,
   `tabular-nums`, größer und ruhiger. Genau zwei Gewichte (400/600).
5. **Weichere Rundungen.** Karten 10→**14px**, große Panels **18px**, Controls **10px**.
6. **Bento-Dashboards.** Studio-Überblicke als **modulares Bento-Grid** (verschieden große Karten:
   eine große KPI-Kachel, mehrere kleine), statt gleichförmiger Reihen. Apple-typisch, scannbar.
7. **Ruhige Motion (Motion.dev/CSS).** Karten beim Laden **gestaffelt** ein (opacity + translateY 8px,
   500ms cubic-bezier(0.16,1,0.3,1), stagger index×60ms). Hover: Karte hebt 2px + Schatten wächst,
   150ms. Nur transform/opacity. `prefers-reduced-motion` schaltet alles ab. Ein Akzent pro Ansicht.

**Bewusst NICHT:** kein Font-Wechsel (Satoshi/General Sans verworfen, Jakarta bleibt Marke), keine
fremde Palette (Teal/Orange verworfen), kein Glass/Neon, keine schweren Schatten. Apple heißt hier
**weniger, aber präziser**.

**Komponenten-Refresh (im Shell-Paket zentral):** Karte (`--shadow` + 14px + 24px Padding),
Button (Primär = ruhiger Grünverlauf, Sekundär = weich gefüllt, beide mit Hover-Lift), Pille/Tab,
Badge, Tabelle (luftiger, Zeilen-Hover, mono-Zahlen rechts), KPI-Kachel (große mono-Zahl + Label +
Mikro-Trend). Alle States: default/hover/focus-visible/active/disabled/empty/error.

**Rollout-Weg:** Diese Tokens + Komponenten kommen ins `baseCss()` des Shell-Pakets. Ein
Versions-Bump, jedes Studio zieht es. Server-Render-Studios sofort, statische beim nächsten Build.
So wird der Sprung an EINER Stelle gemacht und überall sichtbar, ohne fünf Repos einzeln zu stylen.
