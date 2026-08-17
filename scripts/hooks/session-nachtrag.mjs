#!/usr/bin/env node
// Nachtrag-Reaper (M0-T469): der SessionEnd-Hook (scripts/hooks/session-end.sh) meldet Kosten
// nur, wenn eine Session SAUBER endet — bei hartem Beenden (Terminal zu, Kill) feuert er nie
// (Live-Befund 14.08.: 75 von 79 Sessions mit kostenUsd=null). Dieses Skript holt das nachträglich
// nach, gestartet fire-and-forget am Ende von scripts/hooks/session-start.sh.
//
// Fundstelle für "gestartet, aber nie sauber beendet": scripts/agenthub-melde.mjs (cmdSessionStart/
// cmdSessionEnde) pflegt .claude/agenthub-sessions.json als ccSessionId -> {agenthubSessionId,
// gestartet} — ein erfolgreicher session-ende LÖSCHT den Eintrag (siehe cmdSessionEnde). Jeder
// Eintrag, der dort noch steht, hat also (aus lokaler Sicht) nie sauber session-ende gemeldet.
// Das ist zugleich der Dedupe-Schutz: ein erfolgreich nachgetragener session-ende-Aufruf löscht
// den Eintrag genauso wie ein regulärer — ein zweiter Lauf des Reapers sieht ihn nicht mehr.
//
// "Abgebrochen" heißt hier: das zugehörige Transkript (~/.claude/projects/*/<ccSessionId>.jsonl)
// ist seit mehr als 30 Minuten unverändert — eine noch laufende Session schreibt laufend weiter,
// ein hart beendetes Terminal nicht mehr.
//
// Fehlertoleranz wie der Rest der Melde-Kette: läuft im Hintergrund, darf nie eine Meldung in die
// Konsole werfen oder den SessionStart-Hook verzögern/blockieren.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { ermittleCommitSha, ermittleZuwachs, markiereGemeldet } from './session-end-summe.mjs'

const UNVERAENDERT_SCHWELLE_MS = 30 * 60 * 1000
const REPO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const STATE_PATH = join(REPO_DIR, '.claude', 'agenthub-sessions.json')
const PROJECTS_DIR = join(homedir(), '.claude', 'projects')

function ladeState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

// Sucht das Transkript einer ccSessionId über alle ~/.claude/projects/<projekt-dir>/ hinweg —
// welches Verzeichnis zu diesem Repo/Worktree gehört, ist nicht zuverlässig aus dem cwd
// herzuleiten (Claude Code kodiert den Pfad, Worktrees haben je eigenen cwd), darum die
// Session-Id selbst als eindeutiger Dateiname gesucht.
function findeTranskript(ccSessionId) {
  if (!existsSync(PROJECTS_DIR)) return null
  let verzeichnisse
  try {
    verzeichnisse = readdirSync(PROJECTS_DIR, { withFileTypes: true })
  } catch {
    return null
  }
  for (const eintrag of verzeichnisse) {
    if (!eintrag.isDirectory()) continue
    const pfad = join(PROJECTS_DIR, eintrag.name, `${ccSessionId}.jsonl`)
    if (existsSync(pfad)) return pfad
  }
  return null
}

async function main() {
  const trocken = process.argv.includes('--dry-run')
  if (!existsSync(join(REPO_DIR, 'scripts/agenthub-melde.mjs'))) return

  const state = ladeState()
  for (const [ccSessionId, eintrag] of Object.entries(state)) {
    const transkriptPfad = findeTranskript(ccSessionId)
    if (!transkriptPfad) continue // Transkript (noch) nicht auffindbar — nächster Lauf versucht erneut

    let mtimeMs
    try {
      mtimeMs = statSync(transkriptPfad).mtimeMs
    } catch {
      continue
    }
    if (Date.now() - mtimeMs < UNVERAENDERT_SCHWELLE_MS) continue // vermutlich noch aktiv

    // Zuwachs statt Gesamtsumme (M0-T469-Nachbesserung) — summiereTranskript() würde sonst bei
    // jedem Reaper-Lauf die GESAMTE Transkript-Historie erneut melden (Resume-Transkripte reichen
    // oft Tage zurück) UND zwei Registry-Einträge, die zufällig auf dasselbe Transkript zeigen,
    // würden beide die volle Summe melden (Doppelbuchung). ermittleZuwachs() grenzt über den
    // gemeinsamen Marker + die Registry-gestartet-Zeit ab, siehe session-end-summe.mjs.
    const ergebnis = ermittleZuwachs(transkriptPfad, ccSessionId, REPO_DIR)
    const gestartet = typeof eintrag?.gestartet === 'number' ? eintrag.gestartet : undefined
    const commitSha = ergebnis?.sessionStartMs !== undefined
      ? ermittleCommitSha(REPO_DIR, ergebnis.sessionStartMs)
      : gestartet !== undefined
        ? ermittleCommitSha(REPO_DIR, gestartet)
        : undefined

    const args = ['session-ende', ccSessionId]
    if (ergebnis) {
      args.push('--kosten', ergebnis.kostenUsd.toFixed(4))
      args.push('--token-eingabe', String(ergebnis.summe.tokenEingabe))
      args.push('--token-ausgabe', String(ergebnis.summe.tokenAusgabe))
      args.push('--token-cache-lesen', String(ergebnis.summe.tokenCacheLesen))
      args.push('--token-cache-schreiben', String(ergebnis.summe.tokenCacheSchreiben))
      if (ergebnis.modell) args.push('--modell', ergebnis.modell)
    }
    if (commitSha) args.push('--commit-sha', commitSha)

    if (trocken) {
      console.log(`[nachtrag] TROCKEN — würde nachmelden: ${ccSessionId} (${transkriptPfad})`)
      console.log(`[nachtrag]   node scripts/agenthub-melde.mjs ${args.join(' ')}`)
      continue
    }

    try {
      execFileSync('node', [join(REPO_DIR, 'scripts/agenthub-melde.mjs'), ...args], { cwd: REPO_DIR, timeout: 15000 })
      if (ergebnis) markiereGemeldet(ccSessionId, REPO_DIR, ergebnis.bisMs)
    } catch {
      // fail-open — nächster SessionStart versucht diesen Eintrag erneut
    }
  }
}

main().catch(() => {})
