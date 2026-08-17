// AgentHub-Projekt-Hooks — konfiguriert scripts/agenthub-melde.mjs für dieses Repo.
// Alle Exports sind optional; fehlt einer, entfällt der zugehörige Schritt (kein Fehler).
// Details zur Hook-API: siehe ~/Developer/agenthub/paket/README.md

// Überschreibt den projektSlug aus ~/.config/agenthub.json fuer DIESES Repo — nur setzen,
// wenn dieses Repo nicht dem globalen Default-Projekt entspricht.
export const projektSlug = 'business-studio'

// Seit-Filter fürs `spiegel`-Kommando (ISO-Zeitstempel). Fehlt → spiegel tut nichts.
// export const cutoverIso = '2026-01-01T00:00:00Z'

// MitgliedName → Zieldatei (relativ zu diesem Repo-Root). Fehlt → spiegel tut nichts.
// export const spiegelDateien = {
//   Name: 'docs/beispiel-learnings.md',
// }

// Session-Hygiene fürs `sync`-Kommando: true = lebt, false = beenden, null = kein Urteil.
// export function sessionLebt(ccSessionId) {
//   return null
// }

// Board-Anbindung fürs `sync`-Kommando. ctx = { config, rufeAuf, holeAb, log }.
// export async function boardSync(ctx) {
//   return { aufgaben: 0 }
// }
