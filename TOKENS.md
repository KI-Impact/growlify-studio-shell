# TOKENS.md — Der Farb- und Nav-Vertrag der Growlify-Suite

Soll-Konvention für alle sechs Module (Brain, CRM, Sales, Finance, Marketing,
Transkripte). Stand 2026-07-02. Dieses Dokument ist der **Vertrag** für die
spätere Token-Konsolidierung: Heute fahren die Studios noch drei Tokensätze
(Brain/Transkripte `--cream/--ink/--green/--cyan`, CRM/Sales `--bg/--brand/--accent`
über dieses Paket, Finance/Marketing statisch mit `--brand`). Die Hex-Werte sind
identisch, nur Variablennamen und Graustufen driften. Neue Arbeit richtet sich
nach diesem Vertrag; die Konsolidierung auf EIN Token-File ist ein eigener Schritt.

Quelle der Ist-Werte in diesem Paket: `src/tokens.mjs` (Begründungen in `DESIGN.md`).

## Farben (kanonisch)

| Rolle | Wert | Kanonischer Name | Aliasse heute |
|---|---|---|---|
| Canvas / Hintergrund | `#FAFAF9` | cream | `--bg`, `--cream` |
| Karte / Fläche | `#FFFFFF` | surface | `--surface`, `--card`, `--paper` |
| Fläche 2 / subtle | `#F2F2EC` | surface2 | `--surface2`, `--subtle` |
| Text primär | `#18221B` | ink | `--fg1`, `--ink` |
| Text sekundär | `#5B6660` | ink2 | `--fg2`, `--ink2` |
| Text gedämpft | `#8A938D` | muted | `--fg3`, `--muted` |
| Linie / Border | `#E7E7DF` | border | `--border`, `--line` |
| Marke Grün | `#13E489` | green | `--brand`, `--green`, `--ok` |
| Marke dunkel (auf Grün) | `#04342C` | brandInk | `--brandInk` |
| Akzent Cyan | `#23B2CF` | cyan | `--accent`, `--cyan` |
| Status ok | `#13E489` | ok | `--ok` |
| Status warn | `#EF9F27` | warn | `--warn` |
| Status fail | `#E24B4A` | fail | `--fail` |

## Der Signatur-Gradient

**green → cyan**: `linear-gradient(135deg, #13E489, #23B2CF)`.
Das Marken-Element (wie im Logo). Dosiert einsetzen: ein Farb-Statement pro
Fläche, nicht flächig.

## Nav-Aktiv-Konvention (eine „aktiv"-Sprache für die ganze Suite)

Der aktive Nav-Tab ist der **Brain-Gradient-Stil** (weiche grün-cyan-Pille),
NICHT die dunkle Pille:

```css
nav a.on{color:#0B6B43;background:linear-gradient(135deg,rgba(19,228,137,.16),rgba(35,178,207,.16))}
```

Hover bleibt neutral hell (`#F0F1ED` bzw. `--surface2`). Referenz-Implementierung:
`business-brain/server/render.mjs`. CRM/Sales sind seit 2026-07-02 angeglichen.

## Typografie

- UI-Font: `'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`
- Mono (Zahlen, Preise, IDs): `'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace`

## Suite-Launcher

EIN Launcher, EINE Modulliste (alle sechs Module inkl. Transkripte), Quelle:
`src/shell.mjs` → `suiteLauncher()` + `src/tokens.mjs` → `MODULES`.
CRM/Sales/Finance ziehen das Paket per npm (Git-Tag). Brain und Transkripte
vendoren den generierten String bewusst (Auth-Autorität / kein Build-Risiko),
ihre Kopien (`server/suite-launcher.mjs`) müssen mit diesem Paket synchron
gehalten werden — bei jeder Launcher-Änderung neu generieren.
