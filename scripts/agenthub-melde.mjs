#!/usr/bin/env node
// GENERIERT aus agenthub/paket (Welle A, M0-Z29) — NICHT hier editieren, Aenderungen in ~/Developer/agenthub/paket/agenthub-melde.mjs, dann install.mjs erneut ausfuehren.
// AgentHub-Melde-Client — generischer Melde-Client, projektunabhängig (Welle A, M0-Z29 Kriterium 5).
// Ursprünglich aus dem Growlify-Client (#519/M0-T266) extrahiert: alles Projektspezifische läuft
// über optionale Hooks aus `<cwd>/.agenthub.mjs` (siehe README.md für die Hook-API).
//
// Bewusst reines Standalone-Skript OHNE Framework-Import — läuft aus Hooks (SessionStart) und
// Cron, beides ohne z.B. Next.js-Runtime.
//
// Fehlertoleranz ist die Kern-Eigenschaft für Hook-/Cron-Pfade (session-start, session-ende,
// lauf, sync): die enden IMMER mit exit 0 — ein Hook/Cron darf wegen dieser Meldung NIE
// scheitern oder spürbar warten. Diagnose ausschließlich auf stderr. Interaktive Kommandos
// (board-*, aufgabe-claim, chat, learning, export) setzen bei Fehlern process.exitCode = 1,
// damit z.B. Shell-Skripte den Fehlschlag erkennen können.
//
// Aufruf:
//   node scripts/agenthub-melde.mjs session-start <ccSessionId> [quelle] [--mitglied <Name>] [--task <taskId>] [--start-art <art>] [--automatik-name <name>] [--eltern-session <id>]
//   node scripts/agenthub-melde.mjs session-ende <ccSessionId> [--kosten <usd>] [--mitglied <Name>] [--token-eingabe N] [--token-ausgabe N] [--token-cache-lesen N] [--token-cache-schreiben N] [--fazit "..."] [--commit-sha <sha>]
//   node scripts/agenthub-melde.mjs lauf <ccSessionId> <gruen|rot|laeuft> <dauerSek> <text...> [--routine <name>] [--stufe melden|vorschlagen|heilen] [--kosten <usd>] [--wirkung gewirkt|leerlauf]
//   node scripts/agenthub-melde.mjs sync
//   node scripts/agenthub-melde.mjs learning --mitglied <Name> --text "..." [--stufe lernLog|uebergreifend] [--quelle <text>]
//   node scripts/agenthub-melde.mjs learning-verworfen --id <learningId> --grund "..."   (markiert eine Erkenntnis als überholt, löscht nichts, siehe M0-T413)
//   node scripts/agenthub-melde.mjs spiegel
//   node scripts/agenthub-melde.mjs briefing
//   node scripts/agenthub-melde.mjs kontext   (kompakter Start-Kontext: Profil, aktive Arbeit, Top-Learnings — für SessionStart-Hooks/Runner)
//   node scripts/agenthub-melde.mjs board-voll
//   node scripts/agenthub-melde.mjs board-neu --praefix M0 [--titel "..."] [--kurztitel "..."] [--zielbild M0-Z29] [--projekt <slug>] [--mitglied <Name>] --hintergrund "..." (--text = Alias für --titel; --hintergrund ist bei einer Aufgabe Pflicht, Ausnahme --ohne-hintergrund, siehe M0-T415; --kurztitel ist optional, max. 60 Zeichen, steht später in allen Listen, siehe M0-T432; meldet sich als herkunft='cli', Auftraggeber aus --mitglied bzw. personSecret, siehe M0-T431)
//   node scripts/agenthub-melde.mjs board-neu --op --text "..." [--projekt <slug>]
//   node scripts/agenthub-melde.mjs board-update <taskId> [--patch '<json>'] [--projekt <slug>] [--fazit "..."]   (Patch bevorzugt über stdin; stellt der Patch auf Abnahme, wird gewarnt + lokal gemerkt, siehe M0-T484; fehlt dabei ein Beleg, wird er automatisch aus dem HEAD-Commit gesammelt, siehe M0-T394)
//   node scripts/agenthub-melde.mjs abgenommen <taskId> [--projekt <slug>] [--beleg "kurzer Text"]   (bucht eine im Chat erteilte Zustimmung direkt als Abnahme: Aufgabe -> fertig, löscht den Abnahme-Marker, M0-T484)
//   node scripts/agenthub-melde.mjs board-export [--projekt <slug>]
//   node scripts/agenthub-melde.mjs metrik
//   node scripts/agenthub-melde.mjs budget   (druckt {budgetTagUsd,verbrauchtHeuteUsd,erlaubt} als JSON auf stdout)
//   node scripts/agenthub-melde.mjs aufgabe-claim <taskId> [ccSessionId]   (sessionId sonst über AGENTHUB_SESSION_ID)
//   node scripts/agenthub-melde.mjs chat "<nachricht>" [--projekt <slug>]   (spricht den Orchestrator direkt an, kein lokaler Verlauf in V1; --projekt Default 'agenthub')
//   node scripts/agenthub-melde.mjs paul "<nachricht>"   (spricht Paul übers lokale claude-CLI/Abo an, kein API-Chat, meldet die Unterhaltung anschließend ins Cockpit)
//   node scripts/agenthub-melde.mjs einrichten <personSecret>   (Selbst-Einrichtung für neue Teammitglieder: schreibt personSecret in ~/.config/agenthub.json, legt die Datei bei Bedarf mit Grundgerüst an, Rechte 0600 — siehe M0-T405)
//   node scripts/agenthub-melde.mjs session-bereinigung --von <iso> --bis <iso> [--trocken] [--nur-unbekannte]   (löscht Geister-Sessions ohne Aufgabe/Fazit/Commit, die als Kurzläufer <10min beendet wurden, im Zeitfenster; --trocken zählt nur, siehe M0-T432; --nur-unbekannte löscht stattdessen beendete Sessions ganz ohne Zuordnung, unabhängig von Laufzeit, siehe M0-T446)
//   node scripts/agenthub-melde.mjs automatik --name <name> --zweck "..." --modell <sonnet|...> --deckel "..."   (Automatik meldet sich beim Register an, Upsert per Name, siehe M0-T428/docs/automatische-sessions.md)
//   node scripts/agenthub-melde.mjs spiegel-regeln   (spiegelt Projekt.steckbrief.spielregeln in den AGENTHUB-REGELN-Block in CLAUDE.md, siehe M0-T408)

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, statSync, chmodSync } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { homedir, totalmem, freemem, loadavg, hostname } from 'node:os'
import { execSync, execFileSync } from 'node:child_process'
// regel-scan.mjs liegt nur im agenthub-Heimat-Repo (../src/lib/) — in kopierten Fremd-Repos
// (paket/install.mjs) fehlt die Datei. Bewusst NICHT als Top-Level-Import, sonst crasht jedes
// Kommando dort schon beim Laden. cmdSpiegelRegeln() lädt lazy per dynamischem Import und
// degradiert sauber (nur spiegel-regeln entfällt), falls die Datei fehlt (M0-T525).

const THIS_FILE = fileURLToPath(import.meta.url)
const REPO = join(dirname(THIS_FILE), '..')
const CONFIG_PATH = join(homedir(), '.config', 'agenthub.json')
const STATE_PATH = join(REPO, '.claude', 'agenthub-sessions.json')
const TIMEOUT_MS = 4000
// Voll-Operationen (board-voll POSTet das komplette Board hoch, board-export holt es komplett ab)
// brauchen deutlich länger als eine Einzelmeldung — bei 500+ Aufgaben lief der generische 4s-Wert
// regelmäßig in „This operation was aborted", der zweite Anlauf ging durch (OP-223). Ein still
// fehlgeschlagener Voll-Sync lässt DB und Spiegel auseinanderlaufen, deshalb hier großzügig.
const TIMEOUT_VOLL_MS = 60_000
const SESSION_MAX_ALTER_MS = 12 * 60 * 60 * 1000 // 12h

const SPIEGEL_MARKER = '<!-- AGENTHUB-SPIEGEL — ab hier automatisch aus AgentHub gespiegelt, nicht von Hand editieren -->'

function log(...args) {
  console.error('[agenthub-melde]', ...args)
}

// DHCP-vergebene Hostnamen (z.B. macOS im Fritzbox-Netz) sehen aus wie "<uuid>.fritz.box" oder
// "<uuid>.local" — als Session-Titel unlesbar (M0-T-Sessions-lesbar). Prüft nur den ersten
// Label-Teil vor dem ersten Punkt.
const DHCP_UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

// Stabiler Maschinenname für Melde-Aufrufe: Config-Override zuerst (`maschine` in
// ~/.config/agenthub.json), sonst auf macOS der vom Nutzer vergebene Rechnername
// (`scutil --get ComputerName`, übersteht DHCP-Neuvergaben anders als hostname()), sonst
// hostname() — außer der sieht wie eine DHCP-UUID aus, dann wird ComputerName trotzdem
// bevorzugt versucht. Wirft nie (execSync im try/catch, kurzer Timeout).
function ermittleMaschinenname(config) {
  if (config?.maschine) return config.maschine
  const host = hostname()
  if (process.platform === 'darwin') {
    try {
      const name = execSync('scutil --get ComputerName', { timeout: 2000, encoding: 'utf8' }).trim()
      if (name) return name
    } catch {
      // scutil nicht verfügbar/fehlgeschlagen — auf hostname() zurückfallen.
    }
  }
  return host
}

// Lädt optionale Projekt-Hooks aus `<cwd>/.agenthub.mjs` (siehe README.md Hook-API). Fehlt die
// Datei oder schlägt der Import fehl → alle Hooks leer, kein Crash (Fail-safe-Prinzip).
async function ladeHooks() {
  const pfad = join(process.cwd(), '.agenthub.mjs')
  if (!existsSync(pfad)) return {}
  try {
    return await import(pathToFileURL(pfad).href)
  } catch (e) {
    log('.agenthub.mjs nicht ladbar:', e.message || e)
    return {}
  }
}

function ladeConfig() {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    if (!raw.url || !raw.secret || !raw.projektSlug) return null
    return raw
  } catch (e) {
    log('Config nicht lesbar:', e.message)
    return null
  }
}

function ladeState() {
  return ladeStateAus(STATE_PATH)
}

function ladeStateAus(pfad) {
  if (!existsSync(pfad)) return {}
  try {
    return JSON.parse(readFileSync(pfad, 'utf8'))
  } catch (e) {
    log('State nicht lesbar, starte leer:', pfad, e.message)
    return {}
  }
}

// Läuft dieser Prozess in einem Worktree (.claude/worktrees/<name>/...), liefert den Pfad des
// Haupt-Repos (alles vor "/.claude/worktrees/") — sonst REPO selbst (schon Haupt-Repo).
function hauptRepoPfad() {
  const marker = `${sep}.claude${sep}worktrees${sep}`
  const idx = REPO.indexOf(marker)
  return idx === -1 ? REPO : REPO.slice(0, idx)
}

// Eltern-Session fürs implizite Anlegen von Unter-Agent-Sessions (M0-T388-Ausbaustufe,
// Marcus-Zusatz): Subagenten laufen in einem eigenen Worktree mit eigenem State-File
// (.claude/agenthub-sessions.json liegt je Worktree separat) und haben eine eigene
// CLAUDE_CODE_SESSION_ID — die Zuordnung "welche Haupt-Session hat mich gestartet" lässt sich
// von hier aus nicht exakt herleiten. Pragmatischer Fallback: AGENTHUB_SESSION_ID (falls explizit
// gesetzt) hat Vorrang, sonst die zuletzt gestartete Session aus dem State-File des HAUPT-Repos
// (nicht dieses Worktrees) — auf einer Einzelentwickler-Maschine fast immer die richtige.
// Nur relevant, wenn wir wirklich in einem Worktree laufen; im Haupt-Repo selbst gibt es keine
// sinnvolle Eltern-Session.
function ermittleElternSessionId() {
  if (process.env.AGENTHUB_SESSION_ID) return process.env.AGENTHUB_SESSION_ID
  const hauptRepo = hauptRepoPfad()
  if (hauptRepo === REPO) return null
  const hauptState = ladeStateAus(join(hauptRepo, '.claude', 'agenthub-sessions.json'))
  const eintraege = Object.values(hauptState)
  if (eintraege.length === 0) return null
  eintraege.sort((a, b) => (b.gestartet ?? 0) - (a.gestartet ?? 0))
  return eintraege[0].agenthubSessionId ?? null
}

// Atomarer Schreib-Primitiv (Muster aus growlify scripts/claims.mjs atomicWrite übernommen,
// #627/M0-T336): Temp-Datei im selben Verzeichnis + renameSync — rename ist auf demselben
// Dateisystem eine atomare OS-Operation, es gibt daher nie einen Moment mit halb geschriebener Datei.
function atomicWrite(pfad, inhalt) {
  const tmp = `${pfad}.tmp-${process.pid}`
  writeFileSync(tmp, inhalt)
  renameSync(tmp, pfad)
}
function schreibeState(state) {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true })
    atomicWrite(STATE_PATH, JSON.stringify(state, null, 2))
  } catch (e) {
    log('State nicht schreibbar:', e.message)
  }
}

// ── State-Lock (#627/M0-T336, Muster aus growlify scripts/claims.mjs mitRegistryLock übernommen) ──
// atomicWrite allein schützt nur den einzelnen Save vor halb geschriebenen Dateien — verhindert
// KEIN Lost Update, wenn mehrere Kindprozesse (Nacht-Runner-Tasks, Cron-Sync, parallele CC-
// Sessions, projektübergreifend) gleichzeitig load→mutate→save auf STATE_PATH machen (der zweite
// Save überschreibt die Änderung des ersten — genau das ließ Deletes verschwinden und
// Session-Waisen entstehen, Befund im Growlify-Projekt 2026-08-09). mkdirSync ist auf allen
// unterstützten Plattformen atomar (POSIX mkdir(2)) — EEXIST heißt zuverlässig „ein anderer
// Prozess war zuerst da".
const STATE_LOCK_DIR = `${STATE_PATH}.lock`
const STATE_LOCK_RETRY_MS = 25
const STATE_LOCK_MAX_WAIT_MS = 6000
const STATE_LOCK_STALE_MS = 10000 // Lock-Verzeichnis älter als das → verwaist (abgestürzter Prozess)

function holeStateLock() {
  const start = Date.now()
  for (;;) {
    try {
      mkdirSync(STATE_LOCK_DIR)
      return true
    } catch (err) {
      if (!err || err.code !== 'EEXIST') return false // unerwarteter Fehler (z.B. Rechte) — nicht endlos retryen
      try {
        const alter = Date.now() - statSync(STATE_LOCK_DIR).mtimeMs
        if (alter > STATE_LOCK_STALE_MS) {
          rmSync(STATE_LOCK_DIR, { recursive: true, force: true })
          continue // sofort erneut versuchen, kein Sleep nötig
        }
      } catch { /* Lock inzwischen weg — nächster mkdirSync-Versuch holt es normal */ }
      if (Date.now() - start >= STATE_LOCK_MAX_WAIT_MS) return false
      try { execSync(`sleep ${STATE_LOCK_RETRY_MS / 1000}`) } catch { /* best effort */ }
    }
  }
}
function gibStateLockFrei() {
  try { rmSync(STATE_LOCK_DIR, { recursive: true, force: true }) } catch { /* best effort */ }
}
// Wrappt einen mutierenden load→mutate→save-Block auf STATE_PATH atomar. Bewusst NUR um
// synchrone Mutation herum verwendet (nie um einen await/Netzwerk-Call) — sonst blockiert ein
// langsamer Sync-Lauf jeden parallelen session-start/-ende zu lange. Fehlertoleranz-Prinzip
// dieser Datei bleibt gewahrt: Lock nicht bekommen → Block still übersprungen, kein Crash.
function mitStateLock(fn) {
  if (!holeStateLock()) { log('State-Lock belegt, State-Update übersprungen:', STATE_PATH); return }
  try { fn() } finally { gibStateLockFrei() }
}

// Ruft eine Route auf. Gibt { ok, status, json } zurück — wirft NIE.
async function rufeAuf(config, pfad, body, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${config.url}${pfad}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agenthub-secret': config.secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    let json = null
    try { json = await res.json() } catch { /* leerer/kein Body */ }
    if (!res.ok) log(`${pfad} → ${res.status}`, json?.error || '')
    return { ok: res.ok, status: res.status, json }
  } catch (e) {
    log(`${pfad} fehlgeschlagen:`, e.message || e)
    return { ok: false, status: 0, json: null }
  } finally {
    clearTimeout(timer)
  }
}

// GET-Variante für lesende Kommandos (z.B. spiegel). Gleiches Fehlertoleranz-Prinzip — wirft NIE.
async function holeAb(config, pfad, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${config.url}${pfad}`, {
      method: 'GET',
      headers: { 'x-agenthub-secret': config.secret },
      signal: controller.signal,
    })
    let json = null
    try { json = await res.json() } catch { /* leerer/kein Body */ }
    if (!res.ok) log(`${pfad} → ${res.status}`, json?.error || '')
    return { ok: res.ok, status: res.status, json }
  } catch (e) {
    log(`${pfad} fehlgeschlagen:`, e.message || e)
    return { ok: false, status: 0, json: null }
  } finally {
    clearTimeout(timer)
  }
}

// argv: <ccSessionId> [quelle] [--mitglied <Name>] [--task <taskId>] [--start-art <art>]
// [--automatik-name <name>] [--eltern-session <id>] — quelle bleibt Positionsargument
// (bestehende Aufrufer wie session-start.sh übergeben sie so), --mitglied und --task sind
// additiv (M0-T388 bzw. M0-T431: Task-Kennung schon beim Start, wenn bekannt — z.B.
// Runner-Worker, die ihre Aufgabe schon beim Spawnen kennen). --start-art/--automatik-name/
// --eltern-session sind M0-T449: Herkunft der Session (interaktiv/subagent/runner-worker/
// automatik), Name des Zeitplans bei automatik, Eltern-Session bei implizit gestarteten
// Unter-Agenten.
async function cmdSessionStart(config, argv) {
  const { flags, rest } = extrahiereFlags(argv, ['mitglied', 'task', 'start-art', 'automatik-name', 'eltern-session'])
  const [ccSessionId, quelle] = rest
  if (!ccSessionId) { log('session-start: keine ccSessionId übergeben'); return }
  const { ok, json } = await rufeAuf(config, '/api/melde/session-start', {
    projektSlug: config.projektSlug,
    quelle: quelle === 'remote' || quelle === 'runner' ? quelle : 'lokal',
    maschine: ermittleMaschinenname(config),
    ...(flags.mitglied ? { mitgliedName: flags.mitglied } : {}),
    ...(flags.task ? { taskId: flags.task } : {}),
    ...(flags['start-art'] ? { startArt: flags['start-art'] } : {}),
    ...(flags['automatik-name'] ? { automatikName: flags['automatik-name'] } : {}),
    ...(flags['eltern-session'] ? { elternSessionId: flags['eltern-session'] } : {}),
    ...(config.personSecret ? { personSecret: config.personSecret } : {}),
  })
  if (!ok || !json?.sessionId) return
  mitStateLock(() => {
    const state = ladeState()
    state[ccSessionId] = { agenthubSessionId: json.sessionId, gestartet: Date.now() }
    schreibeState(state)
  })
  log('session-start ok:', json.sessionId)
}

// argv: <ccSessionId> [--kosten <usd>] [--mitglied <Name>] [--token-eingabe N] [--token-ausgabe N]
// [--token-cache-lesen N] [--token-cache-schreiben N] — meldet optional Gesamtkosten (USD),
// ausführendes Mitglied und Verbrauchssummen mit ans Backend. Sync/Reaper (syncSessions) rufen
// /api/melde/session-ende direkt ohne diese Zusatzfelder auf — die kennen sie nicht und sollen
// keine 0 vortäuschen.
async function cmdSessionEnde(config, argv) {
  const { flags, rest, unbekannt } = extrahiereFlags(argv, [
    'kosten', 'mitglied', 'token-eingabe', 'token-ausgabe', 'token-cache-lesen', 'token-cache-schreiben',
    'fazit', 'commit-sha', 'abo', 'modell',
  ])
  if (unbekannt.length > 0) {
    log('session-ende: unbekannte Flags:', unbekannt.join(' '))
    return
  }
  const [ccSessionId] = rest
  if (!ccSessionId) { log('session-ende: keine ccSessionId übergeben'); return }
  const kostenUsd = flags.kosten !== undefined ? Number(flags.kosten) : undefined
  if (flags.kosten !== undefined && !Number.isFinite(kostenUsd)) {
    log('session-ende: ungültige kosten (erwartet Zahl in USD):', flags.kosten)
    return
  }
  const zuZahl = (wert) => (wert !== undefined ? Number(wert) : undefined)
  const tokenEingabe = zuZahl(flags['token-eingabe'])
  const tokenAusgabe = zuZahl(flags['token-ausgabe'])
  const tokenCacheLesen = zuZahl(flags['token-cache-lesen'])
  const tokenCacheSchreiben = zuZahl(flags['token-cache-schreiben'])
  for (const [name, wert] of [
    ['token-eingabe', tokenEingabe], ['token-ausgabe', tokenAusgabe],
    ['token-cache-lesen', tokenCacheLesen], ['token-cache-schreiben', tokenCacheSchreiben],
  ]) {
    if (wert !== undefined && !Number.isFinite(wert)) {
      log(`session-ende: ungültiger Wert für --${name}:`, wert)
      return
    }
  }
  // Lesen unter Lock, damit der Nachschlag nicht mitten in einen fremden Save fällt — die
  // eigentliche Löschung passiert unten NACH dem await NOCHMAL frisch (siehe Kommentar dort).
  let eintrag
  mitStateLock(() => { eintrag = ladeState()[ccSessionId] })
  if (!eintrag) { log('session-ende: keine bekannte AgentHub-Session für', ccSessionId); return }
  await rufeAuf(config, '/api/melde/session-ende', {
    sessionId: eintrag.agenthubSessionId,
    ...(kostenUsd !== undefined ? { kostenUsd } : {}),
    ...(flags.mitglied ? { mitgliedName: flags.mitglied } : {}),
    ...(tokenEingabe !== undefined ? { tokenEingabe } : {}),
    ...(tokenAusgabe !== undefined ? { tokenAusgabe } : {}),
    ...(tokenCacheLesen !== undefined ? { tokenCacheLesen } : {}),
    ...(tokenCacheSchreiben !== undefined ? { tokenCacheSchreiben } : {}),
    ...(flags.fazit ? { fazit: flags.fazit } : {}),
    ...(flags['commit-sha'] ? { commitSha: flags['commit-sha'] } : {}),
    ...(flags.abo || config.abo ? { abo: flags.abo || config.abo } : {}),
    ...(flags.modell ? { modell: flags.modell } : {}),
  })
  // State HIER erst neu laden statt den Stand von vor dem await zurückzuschreiben (#627/M0-T336):
  // während des Netzwerk-awaits kann ein anderer Prozess Einträge hinzugefügt/gelöscht haben — ein
  // Save des veralteten Snapshots hätte genau das wieder verloren (die Kern-Ursache der Waisen).
  mitStateLock(() => {
    const state = ladeState()
    delete state[ccSessionId]
    schreibeState(state)
  })
  log('session-ende ok:', eintrag.agenthubSessionId)
}

// argv: --von <iso> --bis <iso> [--trocken] — löscht Geister-Sessions (leer + Kurzläufer <10min)
// in einem Zeitfenster über /api/melde/session-bereinigung. Interaktives Kommando (kein
// Hook-Pfad) — Fehler werden ausgegeben und process.exitCode = 1 gesetzt.
async function cmdSessionBereinigung(config, argv) {
  const { flags, unbekannt } = extrahiereFlags(argv, ['von', 'bis'], ['trocken', 'nur-unbekannte'])
  if (unbekannt.length > 0) {
    log('session-bereinigung: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  if (!flags.von || !flags.bis) {
    log('session-bereinigung: --von <iso> und --bis <iso> sind Pflicht')
    process.exitCode = 1
    return
  }
  const trocken = flags.trocken !== undefined
  const nurUnbekannte = flags['nur-unbekannte'] !== undefined
  const { ok, json } = await rufeAuf(config, '/api/melde/session-bereinigung', {
    vonIso: flags.von,
    bisIso: flags.bis,
    ...(trocken ? { trocken: true } : {}),
    ...(nurUnbekannte ? { nurUnbekannte: true } : {}),
  })
  if (!ok) {
    log('session-bereinigung fehlgeschlagen:', json?.error || '')
    process.exitCode = 1
    return
  }
  log(`session-bereinigung ok: gefunden=${json.gefunden} geloescht=${json.geloescht}${trocken ? ' (trocken)' : ''}`)
}

function kappeLauf(text) {
  if (typeof text !== 'string') return undefined
  return text.length > 2000 ? text.slice(0, 2000) : text
}

// Einzel-Lauf-Meldung (z.B. je Runner-Task) an eine bereits laufende AgentHub-Session gehängt. Die
// agenthubSessionId wird per ccSessionId aus dem State nachgeschlagen — fehlt sie (z.B. Session-Start
// ist fehlgeschlagen oder liegt außerhalb des 12h-Fensters), wird der Lauf TROTZDEM gemeldet, nur
// ohne sessionId-Verknüpfung (kein Grund, den Lauf zu verwerfen).
//
// Positionsargumente bleiben rückwärtskompatibel: <ccSessionId> <gruen|rot|laeuft> <dauerSek> <text...>.
// Optional NACH den Positionsargumenten: --routine <name> (setzt ausloeser:'routine' + routineName),
// --stufe <melden|vorschlagen|heilen>, --kosten <usd> (echte Kosten des Laufs, kein Default 0),
// --mitglied <Name> (ordnet den Lauf einem Mitglied zu, z.B. 'System' für Cron-/Runner-Melder) und
// --wirkung <gewirkt|leerlauf> (P13-Bremse: hat der Lauf etwas bewirkt oder war er Leerlauf?).
async function cmdLauf(config, argv) {
  const { flags, rest } = extrahiereFlags(argv, ['routine', 'stufe', 'kosten', 'mitglied', 'wirkung', 'abo', 'modell'])
  const [ccSessionId, ergebnis, dauerSek, ...textTeile] = rest
  if (!ccSessionId) { log('lauf: keine ccSessionId übergeben'); return }
  if (ergebnis !== 'gruen' && ergebnis !== 'rot' && ergebnis !== 'laeuft') {
    log('lauf: ungültiges ergebnis (erwartet gruen|rot|laeuft):', ergebnis)
    return
  }
  if (flags.stufe && !['melden', 'vorschlagen', 'heilen'].includes(flags.stufe)) {
    log('lauf: ungültige stufe (erwartet melden|vorschlagen|heilen):', flags.stufe)
    return
  }
  const kostenUsd = flags.kosten !== undefined ? Number(flags.kosten) : undefined
  if (flags.kosten !== undefined && !Number.isFinite(kostenUsd)) {
    log('lauf: ungültige kosten (erwartet Zahl in USD):', flags.kosten)
    return
  }
  if (flags.wirkung && !['gewirkt', 'leerlauf'].includes(flags.wirkung)) {
    log('lauf: ungültige wirkung (erwartet gewirkt|leerlauf):', flags.wirkung)
    return
  }
  // Bewusst KEIN implizites Anlegen wie bei aufgabe-claim/learning/board-*: `lauf` wird auch von
  // Routinen/Runnern mit eigener, oft historischer ccSessionId aufgerufen — ein unbekannter Wert
  // hier ist meist einfach "keine Session-Zuordnung bekannt", kein Subagent-Registrierungsfehler.
  // Implizites Anlegen würde bei jedem Routinen-Lauf ungewollt neue Session-Zeilen erzeugen.
  const state = ladeState()
  const sessionId = state[ccSessionId]?.agenthubSessionId
  const { ok, json } = await rufeAuf(config, '/api/melde/lauf', {
    projektSlug: config.projektSlug,
    ausloeser: flags.routine ? 'routine' : 'session',
    ...(flags.routine ? { routineName: flags.routine } : {}),
    ...(sessionId ? { sessionId } : {}),
    ergebnis,
    ...(flags.stufe ? { stufe: flags.stufe } : {}),
    ...(kostenUsd !== undefined ? { kostenUsd } : {}),
    ...(flags.mitglied ? { mitgliedName: flags.mitglied } : {}),
    ...(flags.wirkung ? { wirkung: flags.wirkung } : {}),
    text: kappeLauf(textTeile.join(' ')),
    dauerSek: Number.isFinite(Number(dauerSek)) ? Number(dauerSek) : undefined,
    ...(flags.abo || config.abo ? { abo: flags.abo || config.abo } : {}),
    ...(flags.modell ? { modell: flags.modell } : {}),
  })
  if (!ok) return
  log('lauf ok:', json?.laufId)
}

// Löscht EINEN Eintrag aus STATE_PATH, frisch geladen + unter kurzem Lock (#627/M0-T336) — NICHT
// (wie früher) am Ende der ganzen Sync-Schleife einmal den kompletten In-Memory-Snapshot
// zurückschreiben. Der Snapshot wird während der Schleife über mehrere Netzwerk-awaits (Sekunden)
// hinweg veraltet — ein Save am Ende hätte Adds/Deletes anderer, in der Zwischenzeit gelaufener
// Prozesse (Nacht-Runner-Tasks, parallele CC-Sessions) überschrieben. Bewusst kein Lock um die
// awaits selbst (siehe mitStateLock-Kommentar) — sonst blockiert ein langer Sync-Lauf jeden
// parallelen session-start/-ende zu lange.
function entferneAusState(ccSessionId) {
  mitStateLock(() => {
    const state = ladeState()
    if (ccSessionId in state) { delete state[ccSessionId]; schreibeState(state) }
  })
}

// Liest den lokal geclaimten Task einer Claude-Code-Session aus scripts/claim.mjs (M0-T404),
// damit der Heartbeat die Aufgaben-Zuordnung laufend nachträgt statt nur beim Claim selbst.
// Optional/fail-open, analog ladeHooks(): Zielrepo ohne scripts/claim.mjs (dieses Paket läuft
// projektunabhängig in vielen Repos) oder ein fehlgeschlagener Import liefert einfach null.
export async function leseGeclaimtenTask(ccSessionId) {
  if (!ccSessionId) return null
  const pfad = join(REPO, 'scripts', 'claim.mjs')
  if (!existsSync(pfad)) return null
  try {
    const mod = await import(pathToFileURL(pfad).href)
    const state = typeof mod.loadState === 'function' ? mod.loadState() : {}
    return state?.[ccSessionId]?.aktivTask ?? null
  } catch (e) {
    log('claim.mjs nicht ladbar (Task-Heartbeat übersprungen):', e.message || e)
    return null
  }
}

// Heartbeat für alle bekannten Sessions — verwaiste/zu alte Einträge austragen. Ob eine Session
// noch "lebt", entscheidet ausschließlich der Projekt-Hook `sessionLebt` (fehlt/liefert null →
// keine Hygiene-Entscheidung, nur der Alters-Timeout greift als Netz).
async function syncSessions(config, sessionLebt) {
  const state = ladeState()
  const now = Date.now()
  let aktiv = 0
  for (const [ccSessionId, eintrag] of Object.entries(state)) {
    const lebt = typeof sessionLebt === 'function' ? sessionLebt(ccSessionId) : null
    if (lebt === false) {
      await rufeAuf(config, '/api/melde/session-ende', { sessionId: eintrag.agenthubSessionId })
      entferneAusState(ccSessionId)
      log('sync: Session laut Projekt-Hook inaktiv, beendet:', ccSessionId)
      continue
    }
    if (now - (eintrag.gestartet || 0) > SESSION_MAX_ALTER_MS) {
      await rufeAuf(config, '/api/melde/session-ende', { sessionId: eintrag.agenthubSessionId })
      entferneAusState(ccSessionId)
      log('sync: Session zu alt, ausgetragen:', ccSessionId)
      continue
    }
    const taskId = await leseGeclaimtenTask(ccSessionId)
    const { ok, status } = await rufeAuf(config, '/api/melde/heartbeat', {
      sessionId: eintrag.agenthubSessionId,
      ...(taskId ? { taskId } : {}),
    })
    if (!ok && status === 404) {
      entferneAusState(ccSessionId)
      log('sync: Session 404 im Cockpit, ausgetragen:', ccSessionId)
      continue
    }
    if (ok) aktiv++
  }
  return aktiv
}

async function cmdSync(config, hooks) {
  const start = Date.now()
  const sessions = await syncSessions(config, hooks.sessionLebt)

  let board = 0
  if (typeof hooks.boardSync === 'function') {
    try {
      const ergebnis = await hooks.boardSync({ config, rufeAuf, holeAb, log })
      board = ergebnis?.aufgaben ?? 0
    } catch (e) {
      log('boardSync-Hook fehlgeschlagen:', e.message || e)
    }
  }

  const dauerSek = Math.round((Date.now() - start) / 1000)
  await rufeAuf(config, '/api/melde/lauf', {
    projektSlug: config.projektSlug,
    ausloeser: 'routine',
    ergebnis: 'gruen',
    text: `Cockpit-Sync: ${sessions} Sessions, ${board} Aufgaben aktualisiert`,
    dauerSek,
  })
  log(`sync fertig: ${sessions} Sessions, ${board} Aufgaben, ${dauerSek}s`)
}

// Filtert bekannte --flag <wert>-Paare aus argv heraus (in beliebiger Reihenfolge, auch nach
// Positionsargumenten) und gibt { flags, rest, unbekannt } zurück — rest sind die verbleibenden
// Positionsargumente in ursprünglicher Reihenfolge, unbekannt sind nicht erkannte --Tokens (für
// Kommandos, die unbekannte Flags statt sie stillschweigend zu ignorieren ablehnen wollen).
// `booleanFlags` sind Flags ohne Folgewert (z.B. --op) — die verschlucken kein nächstes Token.
// Für Kommandos, die Positions- UND Flag-Argumente mischen (lauf), ohne bestehende Aufrufer zu
// brechen — bestehende Aufrufer nutzen nur { flags, rest } und ignorieren unbekannt.
function extrahiereFlags(argv, bekannteFlags, booleanFlags = []) {
  const flags = {}
  const rest = []
  const unbekannt = []
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    const name = tok?.startsWith('--') ? tok.slice(2) : null
    if (name && booleanFlags.includes(name)) {
      flags[name] = true
    } else if (name && bekannteFlags.includes(name)) {
      flags[name] = argv[i + 1]
      i++
    } else if (name) {
      unbekannt.push(tok)
    } else {
      rest.push(tok)
    }
  }
  return { flags, rest, unbekannt }
}

// Simpler --flag-Wert-Parser für Kommandos mit benannten Argumenten (learning).
function parseFlags(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      flags[argv[i].slice(2)] = argv[i + 1]
      i++
    }
  }
  return flags
}

// Ein Mitglied meldet ein Learning direkt an AgentHub. Fehlende Pflichtfelder sind KEIN Crash,
// nur eine Usage-Meldung auf stderr.
async function cmdLearning(config, argv) {
  const flags = parseFlags(argv)
  if (!flags.mitglied || !flags.text) {
    log('learning: Nutzung: node scripts/agenthub-melde.mjs learning --mitglied <Name> --text "..." [--stufe lernLog|uebergreifend] [--quelle <text>]')
    process.exitCode = 1
    return
  }
  const sessionId = await holeAktuelleSessionId(config)
  const { ok, json } = await rufeAuf(config, '/api/melde/learning', {
    projektSlug: config.projektSlug,
    text: flags.text,
    mitgliedName: flags.mitglied,
    stufe: flags.stufe === 'uebergreifend' ? 'uebergreifend' : 'lernLog',
    quelle: flags.quelle || 'api/cli',
    einmalig: true,
    ...(sessionId ? { sessionId } : {}),
  })
  if (!ok) return
  log('learning ok:', json?.id ?? '')
}

// Markiert eine Erkenntnis als überholt (M0-T413) — setzt verworfenAm, löscht nichts.
// Grund ist Pflicht, damit nachvollziehbar bleibt, warum sie nicht mehr gilt.
async function cmdLearningVerworfen(config, argv) {
  const flags = parseFlags(argv)
  if (!flags.id || !flags.grund) {
    log('learning-verworfen: Nutzung: node scripts/agenthub-melde.mjs learning-verworfen --id <learningId> --grund "..."')
    process.exitCode = 1
    return
  }
  const { ok, json } = await rufeAuf(config, '/api/melde/learning-verworfen', {
    learningId: flags.id,
    grund: flags.grund,
  })
  if (!ok) return
  log(json?.bereitsVerworfen ? 'learning-verworfen: war schon verworfen:' : 'learning-verworfen ok:', json?.learningId ?? '')
}

// Eine Automatik (Runner/Hook/Routine) meldet sich beim Register an (M0-T428) — Upsert per
// Name, damit wiederholtes Melden nur zuletztGemeldet auffrischt statt Duplikate anzulegen.
async function cmdAutomatik(config, argv) {
  const flags = parseFlags(argv)
  if (!flags.name || !flags.zweck || !flags.modell || !flags.deckel) {
    log('automatik: Nutzung: node scripts/agenthub-melde.mjs automatik --name <name> --zweck "..." --modell <sonnet|...> --deckel "..."')
    process.exitCode = 1
    return
  }
  const { ok } = await rufeAuf(config, '/api/melde/automatik', {
    name: flags.name,
    zweck: flags.zweck,
    modell: flags.modell,
    deckel: flags.deckel,
  })
  if (!ok) return
  log('automatik ok:', flags.name)
}

// Spiegelt AgentHub-Learnings (seit hooks.cutoverIso) in die per hooks.spiegelDateien konfigurierten
// eingefrorenen Wissens-Dateien zurück — ersetzt jeweils NUR den Abschnitt nach SPIEGEL_MARKER
// (idempotent). Ohne Hook-Konfiguration tut das Kommando nichts (kein Fehler).
async function cmdSpiegel(config, hooks) {
  if (!hooks.cutoverIso) { log('spiegel: kein cutoverIso konfiguriert'); return }
  if (!hooks.spiegelDateien || Object.keys(hooks.spiegelDateien).length === 0) {
    log('spiegel: keine spiegelDateien konfiguriert')
    return
  }

  const pfad = `/api/melde/learnings?projekt=${encodeURIComponent(config.projektSlug)}&seit=${encodeURIComponent(hooks.cutoverIso)}`
  const { ok, json } = await holeAb(config, pfad)
  if (!ok || !Array.isArray(json?.learnings)) { log('spiegel: keine Learnings abrufbar — übersprungen.'); return }

  // Nach Ziel-Datei gruppieren, pro Datei aufsteigend nach erstelltAm sortiert.
  const proDatei = {}
  for (const l of json.learnings) {
    const relPfad = hooks.spiegelDateien[l.mitgliedName]
    if (!relPfad) continue // unbekanntes/kein Mitglied — überspringen
    ;(proDatei[relPfad] ??= []).push(l)
  }

  // Immer ALLE konfigurierten Ziel-Dateien neu schreiben — auch mit leerer Liste, sonst bleiben
  // Zeilen gelöschter Learnings stehen.
  let geschrieben = 0
  for (const relPfad of Object.values(hooks.spiegelDateien)) {
    const dateiPfad = join(REPO, relPfad)
    const learnings = proDatei[relPfad] ?? []
    learnings.sort((a, b) => new Date(a.erstelltAm) - new Date(b.erstelltAm))
    let inhalt
    try {
      inhalt = readFileSync(dateiPfad, 'utf8')
    } catch (e) {
      log('spiegel:', dateiPfad, 'nicht lesbar:', e.message)
      continue
    }
    const idx = inhalt.indexOf(SPIEGEL_MARKER)
    if (idx === -1) {
      log('spiegel:', dateiPfad, '— Marker fehlt, Datei übersprungen.')
      continue
    }
    const zeilen = learnings.map((l) => `- ${String(l.erstelltAm).slice(0, 10)} — ${l.text}`)
    const neuerInhalt = `${inhalt.slice(0, idx)}${SPIEGEL_MARKER}\n${zeilen.join('\n')}\n`
    if (neuerInhalt === inhalt) continue // unverändert — kein Write (stündlicher Sync!)
    try {
      writeFileSync(dateiPfad, neuerInhalt)
      geschrieben++
    } catch (e) {
      log('spiegel:', dateiPfad, 'nicht schreibbar:', e.message)
    }
  }
  log(`spiegel fertig: ${geschrieben} Datei(en) aktualisiert, ${json.learnings.length} Learning(s) gesamt.`)
}

// Spiegelt Projekt.steckbrief.spielregeln (EINE Quelle für projektweite Spielregeln, M0-T408)
// in den markierten AGENTHUB-REGELN-Block in CLAUDE.md — Guard-Test src/regel-quelle-guard.test.ts
// macht rot, wenn der Block von Hand geändert wird oder außerhalb neue Dauerregeln dazukommen.
// Nutzt briefing (liefert steckbrief inzwischen mit) statt eines eigenen Endpunkts.
async function cmdSpiegelRegeln(config) {
  let regelScan
  try {
    regelScan = await import(pathToFileURL(join(REPO, 'src', 'lib', 'regel-scan.mjs')).href)
  } catch {
    log('spiegel-regeln: src/lib/regel-scan.mjs fehlt in diesem Repo — übersprungen (nur im agenthub-Heimat-Repo vorhanden).')
    return
  }
  const { baueBlock, setzeBlock, pruefsumme } = regelScan

  const pfad = `/api/melde/briefing?projekt=${encodeURIComponent(config.projektSlug)}`
  const { ok, json } = await holeAb(config, pfad)
  if (!ok || !json) { log('spiegel-regeln: Briefing nicht abrufbar — übersprungen.'); return }

  const spielregeln = json.projekt?.steckbrief?.spielregeln
  if (!Array.isArray(spielregeln)) {
    log('spiegel-regeln: keine spielregeln im Steckbrief hinterlegt — übersprungen.')
    return
  }

  const claudeMdPfad = join(REPO, 'CLAUDE.md')
  let inhalt
  try {
    inhalt = readFileSync(claudeMdPfad, 'utf8')
  } catch (e) {
    log('spiegel-regeln: CLAUDE.md nicht lesbar:', e.message)
    return
  }

  const block = baueBlock(spielregeln)
  const neuerInhalt = setzeBlock(inhalt, block)
  if (neuerInhalt !== inhalt) {
    try {
      writeFileSync(claudeMdPfad, neuerInhalt)
    } catch (e) {
      log('spiegel-regeln: CLAUDE.md nicht schreibbar:', e.message)
      return
    }
  }

  const standPfad = join(REPO, 'src', 'regel-spiegel-stand.json')
  try {
    writeFileSync(standPfad, JSON.stringify({ pruefsumme: pruefsumme(block), aktualisiertAm: new Date().toISOString() }, null, 2) + '\n')
  } catch (e) {
    log('spiegel-regeln: Stand-Datei nicht schreibbar:', e.message)
    return
  }
  log(`spiegel-regeln fertig: ${spielregeln.length} Spielregel(n) gespiegelt.`)
}

// Holt das Projekt-Briefing (Team, Routinen, Aufgaben-Zaehlung, Learnings) und druckt es als
// kompaktes deutsches Markdown auf stdout. Fail-safe: bei Fehler nur eine Meldung, kein Crash.
async function cmdBriefing(config) {
  const pfad = `/api/melde/briefing?projekt=${encodeURIComponent(config.projektSlug)}`
  const { ok, json } = await holeAb(config, pfad)
  if (!ok || !json) { log('briefing: nicht abrufbar — übersprungen.'); return }

  const zeilen = []
  zeilen.push(`# Briefing: ${json.projekt?.name ?? config.projektSlug}`)

  zeilen.push('', '## Team')
  const team = Array.isArray(json.team) ? json.team : []
  const kinderVon = {}
  const wurzeln = []
  for (const m of team) {
    if (m.vorgesetzterName) {
      ;(kinderVon[m.vorgesetzterName] ??= []).push(m)
    } else {
      wurzeln.push(m)
    }
  }
  function druckeMitglied(m, tiefe) {
    const einrueckung = '  '.repeat(tiefe)
    zeilen.push(`${einrueckung}- ${m.name} (${m.rolle}${m.aktiv ? '' : ', inaktiv'}) — ${m.verantwortung ?? 'ohne Beschreibung'}`)
    for (const kind of kinderVon[m.name] ?? []) druckeMitglied(kind, tiefe + 1)
  }
  for (const wurzel of wurzeln) druckeMitglied(wurzel, 0)

  zeilen.push('', '## Routinen')
  const routinen = Array.isArray(json.routinen) ? json.routinen : []
  if (routinen.length === 0) zeilen.push('- keine aktiven Routinen')
  for (const r of routinen) zeilen.push(`- ${r.name}: ${r.zeitplan} (Eskalation: ${r.eskalation})`)

  zeilen.push('', '## Aufgaben')
  const a = json.aufgaben ?? {}
  zeilen.push(`Aufgaben: ${a.geplant ?? 0} geplant · ${a.inUmsetzung ?? 0} in Umsetzung · ${a.wartetAbnahme ?? 0} wartet Abnahme · ${a.fertig ?? 0} fertig`)

  zeilen.push('', '## Learnings (übergreifend)')
  const learnings = Array.isArray(json.learnings) ? json.learnings : []
  if (learnings.length === 0) zeilen.push('- keine')
  for (const l of learnings) zeilen.push(`- ${l.text} (${String(l.erstelltAm).slice(0, 10)})`)

  console.log(zeilen.join('\n'))
}

// Kompakter Start-Kontext (M0-T468): ergänzt briefing (Team/Routinen) um den personenbezogenen
// Teil — Marcus-Profil, aktive Arbeit, Top-Learnings — für SessionStart-Hooks und den
// Headless-Runner. Fail-open wie briefing: kein Server/keine Config → stiller Exit ohne Output,
// darf einen Session-Start nie blockieren.
export function formatiereKontext(json, projektSlug) {
  const zeilen = []
  zeilen.push('# Kontext von AgentHub')

  if (json.profil) {
    zeilen.push('', '## Wer hier arbeitet', String(json.profil))
  }

  // Rolle + Projekt-Steckbrief (M0-T501): kompakt halten, deshalb ohne die eigene
  // "Projekt-Steckbrief:"-Kopfzeile aus dem Klartext-Block — die Überschrift unten reicht.
  if (json.rolle) {
    zeilen.push('', '## Deine Rolle', String(json.rolle))
  }
  if (json.steckbrief) {
    const steckbriefOhneKopf = String(json.steckbrief).replace(/^Projekt-Steckbrief:\n?/, '')
    zeilen.push('', '## Projekt', steckbriefOhneKopf)
  }

  zeilen.push('', '## Woran gerade gearbeitet wird')
  const aktiveArbeit = Array.isArray(json.aktiveArbeit) ? json.aktiveArbeit : []
  const zielbilderMitAufgaben = aktiveArbeit.filter((z) => (z.aufgaben ?? []).length > 0)
  if (zielbilderMitAufgaben.length === 0) {
    zeilen.push('- gerade keine offenen Aufgaben')
  }
  for (const z of zielbilderMitAufgaben) {
    zeilen.push(`- ${z.titel} (${z.code}):`)
    for (const a of z.aufgaben) zeilen.push(`  - [${a.status}] ${a.titel} (${a.code})`)
  }

  // Prüfmuster (M0-T501) — der wichtigste neue Block: was beim Abschluss einer Aufgabe belegt
  // werden muss, damit sie nicht ohne Nachweis als "fertig" gilt.
  zeilen.push('', '## Was du beim Abschluss belegen musst')
  const pruefmuster = Array.isArray(json.pruefmuster) ? json.pruefmuster : []
  if (pruefmuster.length === 0) {
    zeilen.push('- keine besonderen Nachweise hinterlegt')
  }
  for (const m of pruefmuster) zeilen.push(`- [${m.aufgabenart}]${m.pflicht ? ' (Pflicht)' : ''} ${m.text}`)

  zeilen.push('', '## Wichtigste Learnings')
  const learnings = Array.isArray(json.learnings) ? json.learnings : []
  if (learnings.length === 0) zeilen.push('- keine')
  for (const l of learnings) zeilen.push(`- ${l.text}`)

  if (json.arbeitsregeln) {
    zeilen.push('', '## So arbeiten wir', String(json.arbeitsregeln))
  }

  return zeilen.join('\n')
}

async function cmdKontext(config) {
  // personSecret durchreichen, wenn lokal eingerichtet (M0-T495, "eigene Spur") — die Route
  // filtert dann Zielbilder auf die dieser Person + "gemeinsame"; ohne Secret unverändert.
  const personSecretPart = config.personSecret ? `&personSecret=${encodeURIComponent(config.personSecret)}` : ''
  const pfad = `/api/melde/kontext?projekt=${encodeURIComponent(config.projektSlug)}${personSecretPart}`
  const { ok, json } = await holeAb(config, pfad)
  if (!ok || !json) { log('kontext: nicht abrufbar — übersprungen.'); return }
  console.log(formatiereKontext(json, config.projektSlug))
}

// Voller Board-Umzug (Welle D, #519/M0-T266): ruft den optionalen Projekt-Hook boardVollDump()
// auf (liefert das komplette Bulk-Payload) und POSTet es an /api/melde/board-voll. Ohne Hook
// nur ein Hinweis, kein Fehler — additiv zum bestehenden stündlichen Teil-Sync (sync-Kommando).
async function cmdBoardVoll(config, hooks) {
  if (typeof hooks.boardVollDump !== 'function') {
    log('board-voll: kein boardVollDump-Hook in .agenthub.mjs konfiguriert — übersprungen.')
    return
  }
  let payload
  try {
    payload = await hooks.boardVollDump()
  } catch (e) {
    log('board-voll: boardVollDump-Hook fehlgeschlagen:', e.message || e)
    return
  }
  if (!payload) { log('board-voll: boardVollDump lieferte kein Payload — übersprungen.'); return }

  const { ok, json } = await rufeAuf(config, '/api/melde/board-voll', {
    projektSlug: config.projektSlug,
    ...payload,
  }, TIMEOUT_VOLL_MS)
  if (!ok) { log('board-voll: fehlgeschlagen.'); return }
  log(
    `board-voll fertig: ${json?.milestones ?? 0} Milestones, ${json?.zielbilder ?? 0} Zielbilder, ` +
      `${json?.aufgaben ?? 0} Aufgaben, ${json?.offenePunkte ?? 0} offene Punkte, ${json?.bloecke ?? 0} Blöcke.`,
  )
}

// Liest stdin komplett synchron ein (leer/kein Pipe → leerer String). Für `board-update`, wo
// der Patch wegen Shell-Quoting bei Prosa bevorzugt über stdin statt --patch kommt.
function leseStdinSync() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

// Vergibt atomar eine neue Board-Nummer bei AgentHub — Nachfolger der früheren lokalen
// `claims.mjs neu`-Reservierung (Welle E, #519/M0-T266-Nachfolge). `--op` legt einen offenen
// Punkt an (`art:'op'`), sonst eine Aufgabe (`art:'aufgabe'`, `--praefix` Pflicht). Mit
// `--titel`(+`--zielbild`)/`--text` wird die Row direkt angelegt, sonst nur reserviert.
// (fix M0-T370/M0-T381: --text bei Aufgaben ist Alias für --titel — vorher wurde es still
// verworfen und nur die Nummer reserviert, verbrannte Task-IDs M0-T344/345/368.)
async function cmdBoardNeu(config, argv) {
  const { flags, unbekannt } = extrahiereFlags(
    argv,
    ['praefix', 'titel', 'kurztitel', 'zielbild', 'text', 'projekt', 'hintergrund', 'mitglied'],
    ['op', 'ohne-hintergrund'],
  )
  if (unbekannt.length > 0) {
    log('board-neu: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  const projektSlug = flags.projekt || config.projektSlug
  const sessionId = await holeAktuelleSessionId(config)
  if (flags.op) {
    const { ok, json } = await rufeAuf(config, '/api/melde/board-neu', {
      projektSlug,
      art: 'op',
      text: flags.text,
      ...(sessionId ? { sessionId } : {}),
    })
    if (!ok || !json) { log('board-neu: fehlgeschlagen.'); process.exitCode = 1; return }
    console.log(JSON.stringify(json))
    log('board-neu ok:', json.opId)
    return
  }
  if (!flags.praefix) {
    log('board-neu: --praefix ist bei einer Aufgabe Pflicht (z.B. --praefix M0).')
    process.exitCode = 1
    return
  }
  // Hintergrund ist Pflicht (M0-T415): jede neue Aufgabe trägt mit sich, warum sie existiert.
  // Prüfung VOR der Nummernvergabe (die passiert serverseitig in legeAufgabeAn) — sonst
  // verbrennt ein abgelehnter Aufruf trotzdem eine Task-Nummer.
  if (!flags.hintergrund && !flags['ohne-hintergrund']) {
    log(
      'board-neu: --hintergrund fehlt. Schreib in 2–5 Sätzen, warum die Aufgabe existiert, was schon bekannt ist und wo die Details liegen (Datei/Doku/Learning). Ausnahme: --ohne-hintergrund.',
    )
    process.exitCode = 1
    return
  }
  // --text bei Aufgaben als Alias für --titel — vorher wurde es still verworfen und die
  // Task-Nummer trotzdem reserviert (Geisternummern M0-T344/345/368, Brain-Seite
  // board-neu-text-reserviert-nur-nummer-verbrannte-task-ids)
  const titel = flags.titel ?? flags.text
  const { ok, json } = await rufeAuf(config, '/api/melde/board-neu', {
    projektSlug,
    art: 'aufgabe',
    praefix: flags.praefix,
    ...(titel ? { titel } : {}),
    // Kurzes Klartext-Label für Listen (M0-T432) — optional, keine Pflicht auf diesem Weg.
    ...(flags.kurztitel ? { kurztitel: flags.kurztitel } : {}),
    ...(flags.zielbild ? { zielbildCode: flags.zielbild } : {}),
    // Wert geht als `kontext` raus — dieselbe Spalte, die /api/melde/aufgabe pflegt und die UI
    // als "Hintergrund" zeigt (M0-T415-Nachbesserung: kein zweites Feld).
    ...(flags.hintergrund ? { kontext: flags.hintergrund } : {}),
    ...(sessionId ? { sessionId } : {}),
    // Auftraggeber-Kette (M0-T431): die CLI meldet sich immer als 'cli', der Auftraggeber
    // kommt aus derselben Melde-Identität wie bei session-start (--mitglied bzw. das in
    // ~/.config/agenthub.json hinterlegte personSecret).
    herkunft: 'cli',
    ...(flags.mitglied ? { mitgliedName: flags.mitglied } : {}),
    ...(config.personSecret ? { personSecret: config.personSecret } : {}),
  })
  if (!ok || !json) { log('board-neu: fehlgeschlagen.'); process.exitCode = 1; return }
  console.log(JSON.stringify(json))
  log('board-neu ok:', json.taskId)
}

// Erkennt, ob ein board-update-Patch die Aufgabe auf "wartet Abnahme" stellt — dieselbe
// Normalisierung wie src/lib/board-status.ts leiteAufgabeStatusAb (abnahme:true ODER ein
// status-Wert, der normalisiert "abnahme" enthält). Bewusst als reine, exportierte Funktion
// (M0-T484), damit cmdBoardUpdate testbar bleibt, ohne HTTP/State anzufassen.
export function patchStelltAufAbnahme(patch) {
  if (!patch || typeof patch !== 'object') return false
  if (patch.abnahme === true) return true
  const status = typeof patch.status === 'string' ? patch.status : ''
  const normalisiert = status.toLowerCase().replace(/[\s_-]/g, '')
  return normalisiert.includes('abnahme')
}

// Beleg-Feldnamen, wie sie board-update auf Aufgabe-Ebene entgegennimmt (siehe
// src/app/api/melde/board-update/route.ts) — hier zentral, damit Sammel- und Prüf-Logik nicht
// auseinanderlaufen.
const BELEG_FELDER = ['belegFazit', 'belegCommitSha', 'belegCommitBetreff', 'belegDateien']
const BELEG_DATEIEN_MAX = 20

// Sammelt den Beleg (Kurzfazit, HEAD-Commit, geänderte Dateien) aus dem lokalen Git-Repo für
// board-update (M0-T394) — Mechanik statt Disziplin: eine Session muss den Beleg nicht von
// Hand mitgeben, der Client holt ihn sich selbst, sobald eine Aufgabe auf "wartet Abnahme"
// gestellt wird. Bewusst simpel gehalten: nur der HEAD-Commit dieses Repos, nicht alle Commits
// seit dem Claim. Fail-open: jeder Fehler (kein Repo, kein Commit, git fehlt) liefert `{}`
// zurück und wird nur auf stderr gewarnt — die Meldung darf deswegen nie scheitern.
// `git` ist injizierbar (Standard: echtes execFileSync-git) — Tests geben einen Fake-Ausführer
// mit festen Rückgaben herein, statt sich auf ein echtes .git-Verzeichnis zu verlassen (M0-T394:
// Docker-Bau hat kein .git im Arbeitsverzeichnis).
function echtesGit(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', timeout: 4000 })
}

export function sammleBelegAusGit(fazitOverride, git = echtesGit) {
  try {
    const sha = git(['rev-parse', '--short', 'HEAD']).trim()
    const betreff = git(['log', '-1', '--format=%s']).trim()
    if (!sha || !betreff) return {}
    const dateien = git(['show', '--name-only', '--format='])
      .split('\n')
      .map((z) => z.trim())
      .filter(Boolean)
    const dateienText =
      dateien.length > BELEG_DATEIEN_MAX
        ? [...dateien.slice(0, BELEG_DATEIEN_MAX), `+${dateien.length - BELEG_DATEIEN_MAX} weitere`].join('\n')
        : dateien.join('\n')
    return {
      belegFazit: fazitOverride || betreff,
      belegCommitSha: sha,
      belegCommitBetreff: betreff,
      belegDateien: dateienText,
    }
  } catch (e) {
    log('board-update: Beleg aus Git nicht sammelbar (fail-open):', e.message || e)
    return {}
  }
}

// Lädt optional die lokalen Claim-State-Helfer aus scripts/claim.mjs (M0-T484) — Teil der
// Anti-Dopplungs-Portierung DIESES Repos, nicht des generischen Pakets. Andere Repos, die
// dieses Paket per install.mjs übernehmen, haben scripts/claim.mjs meist gar nicht — dann
// still leer zurückgeben statt zu crashen (gleiches Fail-safe-Prinzip wie ladeHooks()).
async function ladeClaimHelfer() {
  const pfad = join(dirname(THIS_FILE), 'claim.mjs')
  if (!existsSync(pfad)) return {}
  try {
    return await import(pathToFileURL(pfad).href)
  } catch (e) {
    log('claim.mjs nicht ladbar:', e.message || e)
    return {}
  }
}

// Partielles Update EINER Aufgabe per taskId — Patch wird flach in `daten` gemergt (null löscht
// einen Key). Bevorzugt Patch über stdin (Shell-Quoting bei Prosa-Text ist sonst fehleranfällig),
// `--patch '<json>'` als Alternative für kurze Patches.
//
// M0-T484: stellt der Patch die Aufgabe auf "wartet Abnahme", wird nach dem Update laut gewarnt
// (Marcus soll JETZT im Chat gefragt werden) und ein lokaler Marker gesetzt, den `claim.mjs
// status` bei jedem Prompt als Mahnzeile zeigt, bis `abgenommen` ihn wieder löscht.
async function cmdBoardUpdate(config, argv) {
  const { flags, rest, unbekannt } = extrahiereFlags(argv, ['patch', 'projekt', 'fazit'])
  const [taskId] = rest
  if (!taskId) {
    log('board-update: Nutzung: node scripts/agenthub-melde.mjs board-update <taskId> [--patch \'<json>\'] [--projekt <slug>] [--fazit "..."]  (Patch bevorzugt über stdin)')
    process.exitCode = 1
    return
  }
  if (unbekannt.length > 0) {
    log('board-update: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  const patchRoh = flags.patch ?? leseStdinSync()
  let patch
  try {
    patch = JSON.parse(patchRoh)
  } catch (e) {
    log('board-update: Patch ist kein gültiges JSON:', e.message)
    process.exitCode = 1
    return
  }
  const sessionId = await holeAktuelleSessionId(config)
  // M0-T394: stellt der Patch auf "wartet Abnahme" und bringt selbst noch keinen Beleg mit,
  // wird er automatisch aus git gesammelt — siehe sammleBelegAusGit().
  const hatSchonBeleg = BELEG_FELDER.some((feld) => patch[feld] !== undefined)
  const beleg = patchStelltAufAbnahme(patch) && !hatSchonBeleg ? sammleBelegAusGit(flags.fazit) : {}
  const { ok, json } = await rufeAuf(config, '/api/melde/board-update', {
    projektSlug: flags.projekt || config.projektSlug,
    taskId,
    patch,
    ...beleg,
    ...(sessionId ? { sessionId } : {}),
  })
  if (!ok || !json) { log('board-update: fehlgeschlagen.'); process.exitCode = 1; return }
  console.log(JSON.stringify(json))
  log('board-update ok:', taskId)

  if (patchStelltAufAbnahme(patch)) {
    const ccSessionId = process.env.CLAUDE_CODE_SESSION_ID
    const claimHelfer = await ladeClaimHelfer()
    if (ccSessionId && typeof claimHelfer.loadState === 'function' && typeof claimHelfer.saveState === 'function') {
      const state = claimHelfer.loadState()
      const eintrag = state[ccSessionId] || (state[ccSessionId] = { since: Date.now() })
      eintrag.wartetAbnahme = { taskId, seit: Date.now() }
      claimHelfer.saveState(state)
    }
    console.log('')
    console.log(`ACHTUNG: ${taskId} wartet jetzt auf Abnahme.`)
    console.log('Regel: frag Marcus JETZT direkt im Chat, ob es so passt.')
    console.log(`Sagt er ok → sofort \`node scripts/agenthub-melde.mjs abgenommen ${taskId} --projekt ${flags.projekt || config.projektSlug}\` buchen.`)
    console.log('Nur wenn er nicht antwortet, darf die Aufgabe im Abnahme-Stapel liegen bleiben.')
  }
}

// Sucht eine Aufgabe per taskId im board-export-Ergebnis (Milestones→Zielbilder→Aufgaben UND
// zielbilderOhneMilestone) — es gibt dort keine flache Liste, siehe cmdBoardExport.
function suchAufgabeImExport(board, taskId) {
  const zielbilder = [
    ...(board?.milestones ?? []).flatMap((m) => m.zielbilder ?? []),
    ...(board?.zielbilderOhneMilestone ?? []),
  ]
  for (const z of zielbilder) {
    const treffer = (z.aufgaben ?? []).find((a) => a.taskId === taskId)
    if (treffer) return treffer
  }
  return null
}

// Bucht die in der Session erteilte Zustimmung direkt als Abnahme: Aufgabe → fertig (M0-T484).
// Hängt einen Abnahme-Satz an daten.kommentare an (derselbe Freitext-Speicherort, den
// aufgabeZurueckgeben() in src/app/actions.ts für Rückgabe-Kommentare nutzt) — dafür wird
// zuerst der aktuelle Kommentar-Stand per board-export nachgeschlagen, damit das flache Merge
// von board-update keine bestehenden Kommentare überschreibt. Löscht danach den lokalen
// "wartet auf Abnahme"-Marker aus Punkt 2/claim.mjs.
async function cmdAbgenommen(config, argv) {
  const { flags, rest, unbekannt } = extrahiereFlags(argv, ['projekt', 'beleg'])
  const [taskId] = rest
  if (!taskId) {
    log('abgenommen: Nutzung: node scripts/agenthub-melde.mjs abgenommen <taskId> [--projekt <slug>] [--beleg "kurzer Text"]')
    process.exitCode = 1
    return
  }
  if (unbekannt.length > 0) {
    log('abgenommen: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  const projektSlug = flags.projekt || config.projektSlug
  const exportPfad = `/api/melde/board-export?projekt=${encodeURIComponent(projektSlug)}`
  const { ok: exportOk, json: board } = await holeAb(config, exportPfad, TIMEOUT_VOLL_MS)
  if (!exportOk || !board) { log('abgenommen: Board nicht abrufbar — abgebrochen.'); process.exitCode = 1; return }
  const aufgabe = suchAufgabeImExport(board, taskId)
  const bisherigeKommentare = Array.isArray(aufgabe?.daten?.kommentare) ? aufgabe.daten.kommentare : []

  const heute = new Date().toISOString().slice(0, 10)
  let text = `Von Marcus direkt in der Session abgenommen am ${heute}.`
  if (flags.beleg) text += ` ${flags.beleg}`

  const sessionId = await holeAktuelleSessionId(config)
  const { ok, json } = await rufeAuf(config, '/api/melde/board-update', {
    projektSlug,
    taskId,
    patch: {
      status: 'erledigt',
      abnahme: false,
      erledigtAm: heute,
      kommentare: [...bisherigeKommentare, { text, am: new Date().toISOString() }],
    },
    ...(sessionId ? { sessionId } : {}),
  })
  if (!ok || !json) { log('abgenommen: fehlgeschlagen.'); process.exitCode = 1; return }
  console.log(JSON.stringify(json))
  log('abgenommen ok:', taskId)

  const ccSessionId = process.env.CLAUDE_CODE_SESSION_ID
  const claimHelfer = await ladeClaimHelfer()
  if (ccSessionId && typeof claimHelfer.loadState === 'function' && typeof claimHelfer.saveState === 'function') {
    const state = claimHelfer.loadState()
    const eintrag = state[ccSessionId]
    if (eintrag?.wartetAbnahme?.taskId === taskId) {
      delete eintrag.wartetAbnahme
      claimHelfer.saveState(state)
    }
  }
}

// Holt das komplette Board (Milestones → Zielbilder → Aufgaben, offene Punkte, Blöcke) —
// Gegenstück zu `board-voll`, für Pipes/den Spiegel-Generator. Druckt das rohe JSON auf stdout.
async function cmdBoardExport(config, argv) {
  // --projekt durchreichen statt still config.projektSlug zu exportieren (M0-T352, Muster M0-T343/T349)
  // --nur-eigene (M0-T495, "eigene Spur"): schränkt auf Zielbilder ein, deren Besitzer die
  // lokal eingerichtete Person ist oder die "gemeinsam" (kein Besitzer) gehören — braucht
  // config.personSecret, sonst bleibt der Export unverändert voll (Standard, z.B. Mandanten-Spiegel).
  const { flags, unbekannt } = extrahiereFlags(argv, ['projekt'], ['nur-eigene'])
  if (unbekannt.length > 0) {
    log('board-export: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  const nurEigenePart = flags['nur-eigene'] && config.personSecret
    ? `&nurEigene=1&personSecret=${encodeURIComponent(config.personSecret)}`
    : ''
  const pfad = `/api/melde/board-export?projekt=${encodeURIComponent(flags.projekt || config.projektSlug)}${nurEigenePart}`
  const { ok, json } = await holeAb(config, pfad, TIMEOUT_VOLL_MS)
  if (!ok || !json) { log('board-export: nicht abrufbar.'); process.exitCode = 1; return }
  console.log(JSON.stringify(json))
}

// Führt einen Befehl still aus, liefert stdout oder null (nie einen Wurf) — Bordmittel-Aufrufe
// (df/docker) sollen einen fehlenden Befehl oder eine fremde Plattform nie zum Absturz bringen.
function sicherAusfuehren(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}

// Wandelt eine docker-Größenangabe ("1.23GB", "512MB", "0B") in GB um.
function groesseZuGb(text) {
  const m = /^([\d.]+)\s*([KMGT]?B)$/i.exec(text?.trim() ?? '')
  if (!m) return 0
  const wert = Number(m[1])
  const einheit = m[2].toUpperCase()
  const faktor = { B: 1 / 1024 ** 3, KB: 1 / 1024 ** 2, MB: 1 / 1024, GB: 1, TB: 1024 }[einheit] ?? 0
  return Number.isFinite(wert) ? wert * faktor : 0
}

// Disk-Auslastung des Root-Filesystems per `df` — funktioniert auf Ubuntu wie macOS gleich.
function sammleDisk() {
  const out = sicherAusfuehren('df -k /')
  if (!out) return null
  const zeile = out.trim().split('\n')[1]
  const teile = zeile?.trim().split(/\s+/)
  if (!teile || teile.length < 4) return null
  const gesamtKb = Number(teile[1])
  const benutztKb = Number(teile[2])
  if (!Number.isFinite(gesamtKb) || !Number.isFinite(benutztKb)) return null
  return {
    diskGesamtGb: Math.round((gesamtKb / 1024 / 1024) * 100) / 100,
    diskBenutztGb: Math.round((benutztKb / 1024 / 1024) * 100) / 100,
  }
}

// Summierte "Reclaimable"-Spalte über `docker system df` (Images/Container/Volumes/Build-Cache) —
// fehlt Docker (z.B. lokal auf dem Mac), liefert die Funktion `undefined` statt eines Fehlers.
function sammleDockerReclaimableGb() {
  const out = sicherAusfuehren('docker system df --format "{{.Reclaimable}}"')
  if (out === null) return undefined
  const zeilen = out.trim().split('\n').filter(Boolean)
  if (zeilen.length === 0) return undefined
  const summeGb = zeilen.reduce((s, z) => s + groesseZuGb(z.split(' ')[0]), 0)
  return Math.round(summeGb * 100) / 100
}

// DB-Größe optional via psql, nur wenn AGENTHUB_METRIK_DB_URL konfiguriert ist — kein Rateversuch
// mit fremden Zugangsdaten. Fehlt psql/Env, wird das Feld schlicht weggelassen.
function sammleDbGroesseMb() {
  const url = process.env.AGENTHUB_METRIK_DB_URL
  if (!url) return undefined
  const out = sicherAusfuehren(`psql "${url}" -tAc "SELECT pg_database_size(current_database())"`)
  if (out === null) return undefined
  const bytes = Number(out.trim())
  return Number.isFinite(bytes) ? Math.round(bytes / 1024 / 1024) : undefined
}

async function cmdMetrik(config) {
  const ramGesamtMb = Math.round(totalmem() / 1024 / 1024)
  const ramBenutztMb = Math.round((totalmem() - freemem()) / 1024 / 1024)
  const load1 = Math.round(loadavg()[0] * 100) / 100

  const disk = sammleDisk()
  if (!disk) { log('metrik: Disk-Auslastung nicht ermittelbar (df fehlgeschlagen) — übersprungen.'); return }

  const payload = {
    ramGesamtMb,
    ramBenutztMb,
    ...disk,
    load1,
  }
  const dockerReclaimableGb = sammleDockerReclaimableGb()
  if (dockerReclaimableGb !== undefined) payload.dockerReclaimableGb = dockerReclaimableGb
  const dbGroesseMb = sammleDbGroesseMb()
  if (dbGroesseMb !== undefined) payload.dbGroesseMb = dbGroesseMb

  const { ok } = await rufeAuf(config, '/api/melde/metrik', payload)
  if (!ok) return
  log('metrik ok:', `RAM ${ramBenutztMb}/${ramGesamtMb}MB, Disk ${disk.diskBenutztGb}/${disk.diskGesamtGb}GB, Load ${load1}`)
}

// Tagesbudget ueber alle Maschinen (#584/M0-T306, Zielbild M0-Z29 Kriterium F): GENAU vor dem
// Start eines neuen autonomen Laufs vom aufrufenden Runner-Skript abgefragt (z.B.
// scripts/nacht-runner/runner.mjs, synchron per execSync — anders als die sonstigen
// Fire-and-forget-Meldungen hier braucht der Aufrufer das Ergebnis, um zu entscheiden). Druckt
// bei Erfolg EINE JSON-Zeile auf STDOUT (nicht stderr wie log()) — das ist die einzige Stelle in
// diesem Skript, die stdout als Ergebniskanal nutzt. Bei Fehler/nicht erreichbar: kein stdout,
// nur log() auf stderr — der Aufrufer wertet ein leeres stdout als "kein Urteil" und faellt
// bewusst fail-open zurueck (ein Cockpit-Ausfall darf den Runner nie stilllegen).
async function cmdBudget(config) {
  const pfad = `/api/melde/budget?projekt=${encodeURIComponent(config.projektSlug)}`
  const { ok, json } = await holeAb(config, pfad)
  if (!ok || !json) { log('budget: nicht abrufbar — kein stdout, Aufrufer faellt fail-open zurueck.'); return }
  console.log(JSON.stringify(json))
}

// Löst die AgentHub-sessionId auf, legt bei fehlendem State-Eintrag implizit eine neue Session
// an, statt die rohe Claude-Code-sessionId ungeprüft als AgentHub-sessionId zu verwenden
// (M0-T388-Nachtrag): Subagent-/Worktree-Sessions (per Agent-/Task-Tool gestartet) bekommen den
// SessionStart-Hook nie ausgeführt — der lief nur bei Top-Level-Sessions. Ohne diesen Fallback
// blieb aufgabe-claim für sie dauerhaft mit 404 "Session nicht gefunden" blockiert.
async function loeseOderErzeugeAgenthubSessionId(config, sessionArg) {
  if (!sessionArg) return process.env.AGENTHUB_SESSION_ID || null
  let eintrag = ladeState()[sessionArg]

  // M0-T447: kurze Wartezeit gegen eine Race mit dem SessionStart-Hook. Der Hook meldet die
  // echte interaktive Sitzung im Hintergrund (node ... & in scripts/hooks/session-start.sh),
  // damit der Sitzungsstart nie durch Netzwerk verzögert wird. Läuft direkt danach (wie im
  // Dirigenten-Ritual vorgeschrieben) `claim.mjs task <id>`, kann dieser Hintergrund-Aufruf noch
  // unterwegs sein — ohne diese Wartezeit legt der Claim dann fälschlich eine zusätzliche
  // "Phantom"-Sitzung (startArt: subagent) an, auf der die Aufgabe landet, statt auf der echten
  // interaktiven Sitzung (die dann für immer ohne aufgabeId bleibt — belegt in der DB: Sitzung
  // cmsu25qcn... entstand exakt zwischen zwei echten interaktiven Sitzungen desselben Rechners).
  // Fünf Versuche à 300ms (1,5s) reichen erfahrungsgemäß für einen einzelnen HTTP-POST; danach
  // greift wie bisher der Fallback (Fail-open geht vor Warten).
  for (let versuch = 0; !eintrag && versuch < 5; versuch++) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    eintrag = ladeState()[sessionArg]
  }
  if (eintrag) return eintrag.agenthubSessionId

  const elternSessionId = ermittleElternSessionId()
  const { ok, json } = await rufeAuf(config, '/api/melde/session-start', {
    projektSlug: config.projektSlug,
    quelle: 'lokal',
    maschine: ermittleMaschinenname(config),
    // Implizit angelegte Session ohne eigenen SessionStart-Hook — das ist per Definition ein
    // Unter-Agent (Agent-/Task-Tool), siehe Kopfkommentar dieser Funktion (M0-T449).
    startArt: 'subagent',
    ...(elternSessionId ? { elternSessionId } : {}),
    ...(config.personSecret ? { personSecret: config.personSecret } : {}),
  })
  if (!ok || !json?.sessionId) return sessionArg // Server nicht erreichbar: altes Verhalten als Fallback
  mitStateLock(() => {
    const state = ladeState()
    state[sessionArg] = { agenthubSessionId: json.sessionId, gestartet: Date.now() }
    schreibeState(state)
  })
  log('aufgabe-claim: keine registrierte Session gefunden, implizit angelegt:', json.sessionId)
  return json.sessionId
}

// Ermittelt automatisch die AgentHub-sessionId für DIESEN Prozess (M0-T388-Ausbaustufe): Claude
// Code exportiert CLAUDE_CODE_SESSION_ID an jeden Tool-Unterprozess, Bash-Aufrufe dieser CLI
// eingeschlossen — Melde-Kommandos ohne eigenes ccSessionId-Argument (learning, board-neu,
// board-update) nutzen das, um ihre Meldung automatisch der laufenden Session zuzuordnen. Fehlt
// die Env-Variable (CI/Cron/Runner ohne Claude Code), liefert sie still null — Aufrufer bleiben
// dann wie bisher ohne sessionId (tolerant, kein Fehler).
async function holeAktuelleSessionId(config) {
  const ccSessionId = process.env.CLAUDE_CODE_SESSION_ID
  if (!ccSessionId) return null
  return loeseOderErzeugeAgenthubSessionId(config, ccSessionId)
}

// Beansprucht (oder gibt frei mit taskId === null) eine Board-Aufgabe exklusiv für diese
// Session (Anti-Dopplung, siehe docs/runner-vertrag.md). Exit-Code ≠ 0 bei Fehlschlag/409 —
// damit ein aufrufender Hook das Blockieren erzwingen kann. Halter-Info geht auf stderr.
async function cmdAufgabeClaim(config, argv) {
  // --projekt durchreichen + Flags aus den Positionsargumenten halten (Bug 2026-08-09:
  // `aufgabe-claim <id> --projekt x` machte "--projekt" zur ccSessionId)
  const { flags, rest, unbekannt } = extrahiereFlags(argv, ['projekt'])
  if (unbekannt.length > 0) {
    log('aufgabe-claim: unbekannte Flags:', unbekannt.join(' '))
    process.exitCode = 1
    return
  }
  const [taskId, sessionArg] = rest
  if (!taskId) {
    log('aufgabe-claim: Nutzung: node scripts/agenthub-melde.mjs aufgabe-claim <taskId> [ccSessionId]  (sessionId sonst über AGENTHUB_SESSION_ID)')
    process.exitCode = 1
    return
  }
  const sessionId = await loeseOderErzeugeAgenthubSessionId(config, sessionArg)
  if (!sessionId) {
    log('aufgabe-claim: keine AgentHub-sessionId gefunden — zuerst session-start ausführen, ccSessionId übergeben, oder AGENTHUB_SESSION_ID setzen.')
    process.exitCode = 1
    return
  }
  const { ok, status, json } = await rufeAuf(config, '/api/melde/aufgabe-claim', {
    projektSlug: flags.projekt || config.projektSlug,
    sessionId,
    taskId,
  })
  if (ok) {
    log('aufgabe-claim ok:', taskId)
    return
  }
  if (status === 409) {
    const halter = json?.halter
    if (halter) {
      log(
        'aufgabe-claim: BLOCKIERT —', taskId, 'wird bereits bearbeitet.',
        `Halter: Session ${halter.sessionId} (${halter.quelle}, zuletzt aktiv ${halter.lastTouch})`,
      )
    } else {
      // Kein Halter → kein Nebenbuhler, sondern z.B. die Zielbild-Spur-Sperre (M0-T495):
      // json.error trägt dann den eigentlichen Klartext-Grund.
      log('aufgabe-claim: BLOCKIERT —', taskId, json?.error || 'abgelehnt.')
    }
    process.exitCode = 1
    return
  }
  log('aufgabe-claim: fehlgeschlagen.', json?.error || '')
  process.exitCode = 1
}

// Spricht den Orchestrator direkt an (POST /api/melde/chat, non-streaming — EINE Wahrheit mit
// dem UI-Chat unter /chat: gleiche Instructions, gleiche Tools, gleicher Tagesdeckel). V1 hat
// bewusst KEINEN lokalen Verlaufs-Speicher (YAGNI) — jeder Aufruf ist ein Einzel-Turn. Ein
// `auftrag_vorschlagen`-Tool-Aufruf liefert nur Vorschlagsdaten zurück, KEINE Freigabe — die
// bleibt exklusiv im Cockpit unter /chat.
async function cmdChat(config, argv) {
  const { rest, flags } = extrahiereFlags(argv, ['projekt'])
  const [nachricht] = rest
  if (!nachricht) {
    log('chat: Nutzung: node scripts/agenthub-melde.mjs chat "<nachricht>" [--projekt <slug>]')
    process.exitCode = 1
    return
  }
  // Orchestrator-Antworten brauchen LLM-Zeit — das 8s-Standard-Timeout reißt hier zuverlässig (OP-223-Muster).
  // Wartezeit ist sonst stumm (kein Streaming im CLI-Pfad) — bei TTY-stderr ein schlichter
  // Punkt-Spinner, der sich vor der Ausgabe wieder sauber löscht (M0-T338-Nachtrag).
  const spinnerLaeuft = process.stderr.isTTY
  let spinnerTimer = null
  if (spinnerLaeuft) {
    let punkte = 0
    spinnerTimer = setInterval(() => {
      punkte = (punkte % 3) + 1
      process.stderr.write(`\r[agenthub-melde] Orchestrator denkt ${'.'.repeat(punkte)}   `)
    }, 2000)
  }
  const { ok, status, json } = await rufeAuf(
    config,
    '/api/melde/chat',
    { nachricht, ...(flags.projekt ? { projektSlug: flags.projekt } : {}) },
    120000,
  )
  if (spinnerTimer) {
    clearInterval(spinnerTimer)
    process.stderr.write('\r\x1b[2K')
  }
  if (!ok) {
    if (status === 429) {
      log('chat: Tagesbudget erreicht —', json?.error || '')
    } else {
      log('chat: fehlgeschlagen.', json?.error || '')
    }
    process.exitCode = 1
    return
  }
  console.log(json.text)
  if (Array.isArray(json.auftragsVorschlaege) && json.auftragsVorschlaege.length > 0) {
    console.log('')
    console.log(`--- ${json.auftragsVorschlaege.length} Auftrags-Vorschlag/Vorschläge — Freigabe im Cockpit unter /projekt/${flags.projekt || 'agenthub'}?tab=chat ---`)
    for (const vorschlag of json.auftragsVorschlaege) {
      console.log(JSON.stringify(vorschlag))
    }
  }
}

// Paul übers Abo (M0-T366): spricht das Projektleiter-Mitglied NICHT über die API (Kosten pro
// Token, /api/melde/chat) an, sondern über das lokale `claude`-CLI im Abo (claude -p, OAuth/
// Keychain) — Vorbild ist paket/runner-mac.mjs (stelleHeadlessAuthSicher), das genau deshalb
// ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN aus der Env entfernt, bevor es `claude` aufruft: bleiben
// die Keys gesetzt, rechnet das CLI still über die API statt übers Abo (27-$-Vorfall dort).
//
// V1 bewusst schlicht (YAGNI): kein Streaming, keine Tools, kein Mehrturn-Verlauf — jeder Aufruf
// ist ein Einzel-Turn mit Pauls `instructions` als Systemkontext. Ausbaupfad für einen echten
// Mehrturn-Verlauf: den bisherigen Cockpit-Verlauf der Unterhaltung vor dem Aufruf abholen (z.B.
// über eine neue GET-Route) und wie bei /api/melde/chat als `verlauf` in den Prompt einweben.
// Sucht ein CLAUDE_CODE_OAUTH_TOKEN für den headless `claude -p`-Aufruf — dieselbe Logik wie
// runner-mac.mjs stelleHeadlessAuthSicher() (Second Brain: fehler/claude-headless-oauth-token-
// noetig), nur OHNE process.env zu mutieren (die läuft hier im interaktiven `paul`-Kommando,
// nicht im Runner-Prozess, und env bleibt eine lokale Kopie). Reihenfolge: bereits gesetztes
// env.CLAUDE_CODE_OAUTH_TOKEN gewinnt, sonst arbeitsDir aus ~/.config/agenthub-runner.json,
// sonst der von runner-mac.mjs fest verdrahtete Ort ~/Developer/growlify. Gibt das Token nie
// aus (weder Rückgabewert loggen noch in Fehlermeldungen einbetten).
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
  } catch { /* Datei fehlt → oben/unten melden */ }
  return null
}

async function cmdPaul(config, argv) {
  const nachricht = argv.join(' ').trim()
  if (!nachricht) {
    log('paul: Nutzung: node scripts/agenthub-melde.mjs paul "<nachricht>"')
    process.exitCode = 1
    return
  }

  const mitgliedPfad = `/api/melde/mitglied?projekt=${encodeURIComponent(config.projektSlug)}&rolle=${encodeURIComponent('projektleiter')}`
  const { ok: mitgliedOk, json: mitgliedJson } = await holeAb(config, mitgliedPfad)
  if (!mitgliedOk || !mitgliedJson?.id) {
    log('paul: Projektleiter-Mitglied nicht abrufbar — antworte ohne Pauls Systemkontext.')
  }

  const claudeArgs = ['-p', nachricht, '--output-format', 'json']
  if (mitgliedJson?.instructions) {
    claudeArgs.push('--append-system-prompt', mitgliedJson.instructions)
  }

  // Env-Kopie OHNE ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN (Muster runner-mac.mjs
  // stelleHeadlessAuthSicher) — das Abo-Token liegt in Keychain/OAuth-Session des lokalen
  // `claude`-Logins, keine der beiden Env-Variablen wird hier gebraucht oder gesetzt. Die
  // interaktive Keychain-Session refresht headless aber NICHT (Second Brain:
  // fehler/claude-headless-oauth-token-noetig) — deshalb zusätzlich CLAUDE_CODE_OAUTH_TOKEN
  // auflösen, exakt wie runner-mac.mjs es für den Nacht-Runner tut.
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN

  const oauthToken = holeOauthToken(env)
  if (!oauthToken) {
    log(
      'paul: kein CLAUDE_CODE_OAUTH_TOKEN gefunden (weder Env noch .env.local) — headless würde an OAuth scheitern.',
      'Einmalig `claude setup-token` ausführen und das Token als CLAUDE_CODE_OAUTH_TOKEN in <arbeitsDir>/.env.local legen.',
    )
    process.exitCode = 1
    return
  }
  env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken

  let antwortText
  try {
    const stdout = execFileSync('claude', claudeArgs, { encoding: 'utf8', env, maxBuffer: 20 * 1024 * 1024, timeout: 120000 })
    const parsed = JSON.parse(stdout)
    antwortText = typeof parsed.result === 'string' ? parsed.result : stdout.trim()
  } catch (e) {
    log('paul: claude-CLI-Aufruf fehlgeschlagen:', e.message || e)
    process.exitCode = 1
    return
  }

  console.log(antwortText)

  if (mitgliedJson?.id) {
    const { ok } = await rufeAuf(config, '/api/melde/chat-log', {
      mitgliedId: mitgliedJson.id,
      titel: `CC: ${nachricht.slice(0, 60)}`,
      nachrichten: [
        { rolle: 'user', text: nachricht },
        { rolle: 'assistent', text: antwortText },
      ],
    })
    if (!ok) log('paul: Antwort steht, aber Melde-Server hat die Unterhaltung nicht übernommen (siehe oben).')
  } else {
    log('paul: kein Mitglied gefunden — Unterhaltung wurde NICHT ins Cockpit gemeldet.')
  }
}

// Selbst-Einrichtung für neue Teammitglieder (Mensch): ein einziger Satz an Claude Code
// ("Richte mich bei AgentHub ein: <secret>") soll ohne weitere Rückfragen genügen (M0-T405).
// Läuft bewusst VOR dem ladeConfig()-Gate in main() — die Config kann hier noch fehlen oder
// unvollständig sein (url/secret fehlen noch), genau das ist der Fall, den dieser Befehl behebt.
function cmdEinrichten(argv) {
  const personSecret = argv[0]
  if (!personSecret) {
    log('einrichten: Nutzung: node scripts/agenthub-melde.mjs einrichten <personSecret>')
    process.exitCode = 1
    return
  }

  let bestehend = {}
  if (existsSync(CONFIG_PATH)) {
    try {
      bestehend = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    } catch (e) {
      log('einrichten: bestehende Config nicht lesbar, wird nicht überschrieben:', e.message)
      process.exitCode = 1
      return
    }
  }

  // Maschinenname direkt mit einrichten, damit er stabil bleibt statt später erst durch einen
  // DHCP-Hostname-Wechsel aufzufallen (M0-T-Sessions-lesbar) — nutzt denselben Ermittlungsweg
  // wie die Melde-Aufrufe selbst, nur ohne Config-Override (den gibt es hier noch nicht).
  const neu = { ...bestehend, personSecret, maschine: bestehend.maschine ?? ermittleMaschinenname(null) }
  mkdirSync(dirname(CONFIG_PATH), { recursive: true })
  atomicWrite(CONFIG_PATH, JSON.stringify(neu, null, 2))
  chmodSync(CONFIG_PATH, 0o600)

  const fehlend = ['url', 'secret'].filter((feld) => !neu[feld])
  if (fehlend.length > 0) {
    log(
      `einrichten: personSecret gespeichert, aber es fehlt noch: ${fehlend.join(', ')} — ohne die beiden meldet sich diese Maschine gar nicht bei AgentHub. Bitte in ${CONFIG_PATH} ergänzen.`,
    )
    return
  }

  console.log('Fertig — deine Arbeit läuft ab jetzt unter deinem Namen, sobald die nächste Session startet.')
}

async function main() {
  if (process.argv[2] === 'einrichten') {
    cmdEinrichten(process.argv.slice(3))
    return
  }
  const [cmd] = process.argv.slice(2)
  const hooks = await ladeHooks()
  const config = ladeConfig()
  if (!config) { log('keine Config unter', CONFIG_PATH, '— stiller Exit'); return }
  // Per-Projekt-Override: `.agenthub.mjs` kann `projektSlug` exportieren und damit die globale
  // ~/.config/agenthub.json überschreiben — nötig, sobald mehrere Repos dieselbe Maschine teilen
  // (M0-Z29 Kriterium 3, Dogfooding-Projekt agenthub neben growlify).
  if (hooks.projektSlug) config.projektSlug = hooks.projektSlug

  if (cmd === 'session-start') await cmdSessionStart(config, process.argv.slice(3))
  else if (cmd === 'session-ende') await cmdSessionEnde(config, process.argv.slice(3))
  else if (cmd === 'session-bereinigung') await cmdSessionBereinigung(config, process.argv.slice(3))
  else if (cmd === 'lauf') await cmdLauf(config, process.argv.slice(3))
  else if (cmd === 'sync') await cmdSync(config, hooks)
  else if (cmd === 'learning') await cmdLearning(config, process.argv.slice(3))
  else if (cmd === 'learning-verworfen') await cmdLearningVerworfen(config, process.argv.slice(3))
  else if (cmd === 'automatik') await cmdAutomatik(config, process.argv.slice(3))
  else if (cmd === 'spiegel') await cmdSpiegel(config, hooks)
  else if (cmd === 'briefing') await cmdBriefing(config)
  else if (cmd === 'spiegel-regeln') await cmdSpiegelRegeln(config)
  else if (cmd === 'kontext') await cmdKontext(config)
  else if (cmd === 'board-voll') await cmdBoardVoll(config, hooks)
  else if (cmd === 'board-neu') await cmdBoardNeu(config, process.argv.slice(3))
  else if (cmd === 'board-update') await cmdBoardUpdate(config, process.argv.slice(3))
  else if (cmd === 'abgenommen') await cmdAbgenommen(config, process.argv.slice(3))
  else if (cmd === 'board-export') await cmdBoardExport(config, process.argv.slice(3))
  else if (cmd === 'metrik') await cmdMetrik(config)
  else if (cmd === 'budget') await cmdBudget(config)
  else if (cmd === 'aufgabe-claim') await cmdAufgabeClaim(config, process.argv.slice(3))
  else if (cmd === 'chat') await cmdChat(config, process.argv.slice(3))
  else if (cmd === 'paul') await cmdPaul(config, process.argv.slice(3))
  else {
    log('unbekanntes Kommando:', cmd)
    process.exitCode = 1
  }
}

// Nur main() ausführen, wenn diese Datei direkt als CLI aufgerufen wird — nicht beim Import
// aus einer Testdatei (M0-T484, Muster runner-mac.mjs/runner-b.mjs). Ohne diesen Guard würde
// schon der Import den Prozess per process.exit() im .finally() unten beenden.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((e) => log('unerwarteter Fehler:', e.message || e))
    // Leerer write als Flush-Gate: der Callback feuert erst, wenn alle zuvor gepufferten
    // stdout-Writes (z.B. das große board-export-JSON, >64 KB Pipe-Buffer) durch sind —
    // sofortiges process.exit() würde die Pipe-Ausgabe abschneiden
    // (Second Brain: fehler/execfilesync-process-exit-stdout-pipe-truncation).
    .finally(() => process.stdout.write('', () => process.exit(process.exitCode ?? 0)))
}
