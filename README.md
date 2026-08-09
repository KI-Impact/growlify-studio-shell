# @ki-impact/studio-shell

Die geteilte Suite-Shell für alle Studios des KI Impact Business Studio. Eine Quelle der Wahrheit für Design-Tokens,
die Suite-Topbar (Modul-Switcher mit Live-Status), das CSS-Fundament und die einheitliche
System-Sektion. Framework-frei: jede Funktion gibt einen HTML-String zurück, passend zur
Server-Render-Lane der Studios (kein Next, kein Bundler).

Design-Spec: siehe [DESIGN.md](./DESIGN.md). Kein Studio bindet eigene Hex-Werte ein, alles zieht
aus den Tokens hier.

## Warum ein Paket statt Copy-Paste
Bisher lebten Header, Navigation und Farben als kopierte `<style>`-Blöcke in fünf Repos. Eine
Token-Änderung hieß: fünf Stellen pflegen, Drift garantiert. Mit diesem Paket liegt das an einer
Stelle. Die getrennte-Repos-Topologie (eigene DB je Studio = Produktmerkmal) bleibt unangetastet:
das hier ist nur die gemeinsame Haut, nicht ein Monorepo.

## Konsum (so bindet ein Studio die Shell ein)
GitHub-versioniert, kein privater Registry nötig, funktioniert mit dem Coolify-Build (`npm install`
beim Deploy):

```json
// package.json des Studios
"dependencies": {
  "@ki-impact/studio-shell": "github:denglermanuel/growlify-studio-shell#v0.1.0"
}
```

```js
import { baseCss, suiteTopbar, MODULES } from '@ki-impact/studio-shell';
// im <head>:  <style>${baseCss()}</style>
// im <body>:  ${suiteTopbar({ active: 'finance', health })}
```

## Update-Fluss (kontrolliert, kein Wildwuchs)
1. Änderung hier im Shell-Repo, in DESIGN.md begründen.
2. Version bumpen + git-Tag (`v0.2.0`).
3. Im Studio die Version anheben, pushen. Coolify deployt → neue Shell ist live.

So bekommt jedes Studio Shell-Updates bewusst, nicht versehentlich.

## API (Stand 0.1.0)
- `baseCss()` — Tokens als `:root` + ruhiger Reset + Basistypo. **final.**
- `TOKENS`, `MODULES` — die Roh-Tokens und die fünf Suite-Module. **final.**
- `suiteTopbar(opts)` — persistente Topbar mit Modul-Switcher + Status-Dots. **folgt nach
  Freigabe der visuellen Richtung** (DESIGN.md §5).
- `systemSection(opts)` — einheitliche System-Sektion (Feed + Gesundheit + Learnings). folgt.
