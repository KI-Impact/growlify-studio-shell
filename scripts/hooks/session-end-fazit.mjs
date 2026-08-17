#!/usr/bin/env node
// Helfer für scripts/hooks/session-end.sh (M0-T412): liest den Hook-Input ({ session_id,
// transcript_path }) von stdin, lässt aus den letzten Transkript-Einträgen per `claude -p`
// (Abo, kein API-Key) ein Kurzfazit erzeugen und meldet es über agenthub-melde.mjs
// session-ende --fazit an AgentHub. Das DB-Feld Session.fazit und die Anzeige (Ergebnis-
// Kachel, M0-T395) existieren bereits — dieses Skript befüllt es nur noch automatisch.
//
// Fehlertoleranz-Prinzip wie session-end-summe.mjs: jeder Fehler wird verschluckt, das
// Skript beendet sich still — ein SessionEnd-Hook darf das Session-Ende nie blockieren.
//
// OAuth-Token-Auflösung dupliziert bewusst holeOauthToken() aus agenthub-melde.mjs (dort
// nicht exportiert, siehe Kopfkommentar dort: das File ist generiert aus paket/, nicht hier
// editieren) — Muster: runner-mac.mjs stelleHeadlessAuthSicher() (Second Brain:
// fehler/claude-headless-oauth-token-noetig).

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const MAX_ZEILEN = 200

function holeOauthToken(env) {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return env.CLAUDE_CODE_OAUTH_TOKEN

  let arbeitsDir = join(homedir(), 'Developer', 'growlify')
  const RUNNER_CONFIG_PATH = join(homedir(), '.config', 'agenthub-runner.json')
  try {
    const runnerConfig = JSON.parse(readFileSync(RUNNER_CONFIG_PATH, 'utf8'))
    if (runnerConfig.arbeitsDir) arbeitsDir = runnerConfig.arbeitsDir
  } catch { /* Datei fehlt/ungültig → Fallback-arbeitsDir bleibt stehen */ }

  try {
    const zeile = readFileSync(join(arbeitsDir, '.env.local'), 'utf8')
      .split('\n').find((z) => z.startsWith('CLAUDE_CODE_OAUTH_TOKEN='))
    if (zeile) return zeile.slice('CLAUDE_CODE_OAUTH_TOKEN='.length).trim()
  } catch { /* Datei fehlt → null unten */ }
  return null
}

// Baut aus den letzten Transkript-Zeilen einen kompakten Text (nur user-/assistant-Turns,
// keine Tool-Rohdaten) — reicht als Kontext für ein Fazit, ohne den Prompt zu sprengen.
function bauePrompt(transcriptPath) {
  const zeilen = readFileSync(transcriptPath, 'utf-8').split('\n').filter((z) => z.trim())
  const relevante = zeilen.slice(-MAX_ZEILEN)
  const turns = []
  for (const zeile of relevante) {
    let eintrag
    try { eintrag = JSON.parse(zeile) } catch { continue }
    const rolle = eintrag?.message?.role
    if (rolle !== 'user' && rolle !== 'assistant') continue
    const inhalt = eintrag.message.content
    let text = ''
    if (typeof inhalt === 'string') text = inhalt
    else if (Array.isArray(inhalt)) {
      text = inhalt.filter((teil) => teil?.type === 'text').map((teil) => teil.text).join(' ')
    }
    text = text.trim()
    if (!text) continue
    turns.push(`${rolle === 'user' ? 'Nutzer' : 'Claude'}: ${text.slice(0, 1500)}`)
  }
  if (turns.length === 0) return null

  return [
    'Du bekommst einen Ausschnitt einer Claude-Code-Session. Antworte NUR mit einem JSON-Objekt',
    '(kein Fließtext davor/danach, keine Markdown-Codeblöcke) mit genau diesen zwei Feldern:',
    '',
    '"fazit": ein String in genau diesem Schema',
    '(Alltagssprache, keine Technik-Fachbegriffe, jede Zeile kurz, "keine" wenn ein Punkt leer ist):',
    'Ziel: ...',
    'Erledigt: ...',
    'Offen: ...',
    'Blockiert: ...',
    'Entscheidungen: ...',
    'Nächste Schritte: ...',
    '',
    '"erkenntnisse": eine Liste von 0 bis 3 Strings mit NUR nicht-trivialen Erkenntnissen aus der',
    'Session — überraschende Ursachen, Konfigurations- oder Infrastruktur-Probleme, Dinge die sich',
    'wiederholen könnten. Jede Erkenntnis im Muster "Symptom → Ursache → Lösung → künftig',
    'vermeiden". Ausdrücklich NICHT aufnehmen: Tippfehler, triviale Einzeiler, normaler',
    'Projektfortschritt ("Feature X gebaut"). Im Zweifel lieber weniger oder gar keine Erkenntnisse',
    'als schwache. Ist nichts Nennenswertes passiert: leere Liste.',
    '',
    'Session-Ausschnitt:',
    turns.join('\n'),
  ].join('\n')
}

// Parst die Modell-Antwort defensiv: erwartet {"fazit": "...", "erkenntnisse": [...]}, fällt bei
// kaputtem/fehlendem JSON auf den rohen Text als Fazit zurück (altes Verhalten vor M0-T497) —
// die Erkenntnis-Erweiterung darf das bestehende Fazit-Verhalten nie verschlechtern.
function parseModellAntwort(rohtext) {
  if (typeof rohtext !== 'string' || !rohtext.trim()) return { fazit: undefined, erkenntnisse: [] }
  const bereinigt = rohtext.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const geparst = JSON.parse(bereinigt)
    const fazit = typeof geparst.fazit === 'string' ? geparst.fazit.trim() : undefined
    const erkenntnisse = Array.isArray(geparst.erkenntnisse)
      ? geparst.erkenntnisse.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim()).slice(0, 3)
      : []
    return { fazit: fazit || undefined, erkenntnisse }
  } catch {
    return { fazit: rohtext.trim() || undefined, erkenntnisse: [] }
  }
}

// Meldet jede Erkenntnis einzeln als Learning über den bestehenden Melde-Weg (gleiches Muster
// wie der Notaus-Learning-Aufruf oben). Best-effort: ein Fehler beim Melden darf den Hook nie
// scheitern lassen. `ausfuehren` ist per Default execFileSync, für Tests austauschbar.
function meldeErkenntnisse(erkenntnisse, sessionId, repoDir, ausfuehren = execFileSync) {
  for (const text of erkenntnisse) {
    try {
      ausfuehren('node', [
        join(repoDir, 'scripts/agenthub-melde.mjs'), 'learning',
        '--mitglied', 'System',
        '--text', text,
        '--stufe', 'uebergreifend',
        // Quelle bewusst ohne Session-ID: sonst bekaeme jede Session einen eigenen
        // Quell-String und der Bestand zersplittert (Befund 17.08.2026).
        '--quelle', 'agenthub/session-ende',
      ], { cwd: repoDir, timeout: 15000 })
    } catch { /* fail-open: Melden darf den Hook nie scheitern lassen */ }
  }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const hookInput = JSON.parse(input)
  const sessionId = hookInput.session_id
  const transcriptPath = hookInput.transcript_path
  if (!sessionId || !transcriptPath || !existsSync(transcriptPath)) return

  const prompt = bauePrompt(transcriptPath)
  if (!prompt) return
  // Rekursions-Bremse (2026-08-12): Fazit-Sessions liefen mit cwd im Repo, erbten damit
  // diesen SessionEnd-Hook und fassten sich gegenseitig zusammen — Endlosschleife
  // (~1000 Sessions/h über Nacht). Eigene Fazit-Prompts nie erneut zusammenfassen.
  if (prompt.includes('Session-Ausschnitt:\nNutzer: Fasse den folgenden Ausschnitt')) return

  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
  const oauthToken = holeOauthToken(env)
  if (!oauthToken) return
  env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken
  // Schleifenschutz (2026-08-12): markiert die gespawnte Session als headless-Hook-Kind —
  // deren Hooks brechen selbst sofort ab (siehe session-end.sh/session-start.sh).
  env.AGENTHUB_HEADLESS_HOOK = '1'

  const REPO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

  // Notaus-Zähler (2026-08-12): erkennt eine mögliche Hook-Schleife anhand der Spawn-Rate
  // und stoppt weitere claude-Spawns, statt unbegrenzt weiterzulaufen. Komplett fail-open:
  // jeder Fehler im Zähler selbst darf den normalen Fazit-Lauf nicht verhindern.
  try {
    const stateDir = join(homedir(), '.local', 'var', 'run')
    const statePath = join(stateDir, 'agenthub-fazit-spawns.json')
    mkdirSync(stateDir, { recursive: true })

    let state = { spawns: [], gemeldet: null }
    try {
      const geladen = JSON.parse(readFileSync(statePath, 'utf8'))
      if (Array.isArray(geladen?.spawns)) state = geladen
    } catch { /* Datei fehlt/kaputt → leerer Zustand */ }

    const jetzt = Date.now()
    const EINE_STUNDE_MS = 60 * 60 * 1000
    state.spawns = state.spawns.filter((t) => jetzt - t < EINE_STUNDE_MS)

    if (state.spawns.length >= 20) {
      const zuletztGemeldet = state.gemeldet ? jetzt - state.gemeldet : Infinity
      if (zuletztGemeldet >= EINE_STUNDE_MS) {
        try {
          execFileSync('node', [
            join(REPO_DIR, 'scripts/agenthub-melde.mjs'), 'learning',
            '--mitglied', 'System',
            '--text', 'Notaus: Fazit-Hook hat 20 Spawns/Stunde überschritten — mögliche Hook-Schleife, Spawns gestoppt',
            '--stufe', 'uebergreifend',
            '--quelle', 'agenthub/session-end-fazit',
          ], { cwd: REPO_DIR, timeout: 15000 })
        } catch { /* fail-open */ }
        state.gemeldet = jetzt
        writeFileSync(statePath, JSON.stringify(state))
      }
      return
    }

    state.spawns.push(jetzt)
    writeFileSync(statePath, JSON.stringify(state))
  } catch { /* Zähler-Fehler darf den Fazit-Lauf nicht verhindern (fail-open) */ }

  let fazit
  let erkenntnisse = []
  try {
    const stdout = execFileSync(
      'claude',
      ['-p', prompt, '--model', 'haiku', '--output-format', 'json'],
      // cwd außerhalb des Repos: die Fazit-Session darf die Projekt-Hooks (inkl. dieses
      // SessionEnd-Hooks) nicht erben — das war die Wurzel der Endlosschleife.
      { encoding: 'utf8', env, cwd: homedir(), maxBuffer: 5 * 1024 * 1024, timeout: 60000 },
    )
    const parsed = JSON.parse(stdout)
    const modellText = typeof parsed.result === 'string' ? parsed.result : undefined
    ;({ fazit, erkenntnisse } = parseModellAntwort(modellText))
  } catch {
    return
  }
  if (!fazit) return

  try {
    execFileSync('node', [
      join(REPO_DIR, 'scripts/agenthub-melde.mjs'), 'session-ende', sessionId,
      '--fazit', fazit,
    ], { cwd: REPO_DIR, timeout: 15000 })
  } catch { /* fail-open */ }

  // Erkenntnis-Meldung (M0-T497): darf komplett fehlschlagen, ohne dass das Fazit oben leidet —
  // deshalb erst NACH dem Fazit-Melden, in eigenem try/catch.
  try {
    if (erkenntnisse.length > 0) meldeErkenntnisse(erkenntnisse, sessionId, REPO_DIR)
  } catch { /* fail-open */ }
}

// Nur beim direkten CLI-Aufruf ausführen, nicht beim Import in Tests (Muster wie paket/runner-b.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {})
}

export { parseModellAntwort, meldeErkenntnisse }
