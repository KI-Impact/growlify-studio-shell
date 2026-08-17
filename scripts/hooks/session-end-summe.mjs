#!/usr/bin/env node
// Helfer für scripts/hooks/session-end.sh (M0-T388): liest den Hook-Input ({ session_id,
// transcript_path }) von stdin, summiert alle usage-Blöcke aus dem Transkript-JSONL und ruft
// agenthub-melde.mjs session-ende mit den Summen auf.
//
// summiereTranskript() ist exportiert (M0-T469) — scripts/hooks/session-nachtrag.mjs (Reaper für
// hart beendete Sessions ohne SessionEnd-Hook-Aufruf) nutzt exakt dieselbe Zähl-/Preis-Logik statt
// sie zu duplizieren.
//
// Fehlertoleranz-Prinzip wie der Rest der Melde-Kette (siehe agenthub-melde.mjs-Kopfkommentar):
// jeder Fehler wird verschluckt, das Skript beendet sich still — ein SessionEnd-Hook darf nie
// eine Fehlermeldung in die Konsole des Nutzers werfen.

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Registry (ccSessionId -> {agenthubSessionId, gestartet}) und Zuwachs-Marker (ccSessionId ->
// letzter gemeldeter Transkript-Zeitstempel) liegen beide im Repo-Root unter .claude/ — siehe
// STATE_PATH/MARKER_PATH in ermittleUndMarkiereZuwachs().

// Letzten Commit des Repos ermitteln (M0-T395) — nur, wenn er NACH Session-Start entstand,
// sonst ist es ein alter Commit einer fremden Session (kein Beleg für diese Sitzung).
export function ermittleCommitSha(repoDir, sessionStartMs) {
  try {
    const zeile = execFileSync('git', ['log', '-1', '--format=%H %ct'], { cwd: repoDir, timeout: 5000 }).toString().trim()
    if (!zeile) return undefined
    const [sha, unixSek] = zeile.split(' ')
    if (!sha || !unixSek) return undefined
    if (Number(unixSek) * 1000 < sessionStartMs) return undefined
    return sha
  } catch {
    return undefined
  }
}

// Preise je Modell in USD je Mio Tokens (Stand 2026-08-14, Anthropic-Listenpreise).
// Cache-Lesen kostet 0,1× Input, Cache-Schreiben 1,25× Input (5-Minuten-TTL, der Normalfall).
// ponytail: unbekannte Modelle fallen auf den Opus-Preis zurück — lieber leicht überschätzen als 0 melden.
const PREISE = [
  [/fable|mythos/, { input: 10, output: 50 }],
  [/opus/, { input: 5, output: 25 }],
  [/sonnet/, { input: 3, output: 15 }],
  [/haiku/, { input: 1, output: 5 }],
]

function preisFuer(modellId) {
  for (const [muster, preis] of PREISE) if (muster.test(modellId)) return preis
  return { input: 5, output: 25 }
}

function kostenFuer(modellId, usage) {
  const p = preisFuer(modellId || '')
  return (
    ((usage.input_tokens ?? 0) * p.input +
      (usage.output_tokens ?? 0) * p.output +
      (usage.cache_read_input_tokens ?? 0) * p.input * 0.1 +
      (usage.cache_creation_input_tokens ?? 0) * p.input * 1.25) /
    1_000_000
  )
}

// Kurzname fürs modell-Feld (M0-T469) — dasselbe grobe Muster wie PREISE, aber als lesbares Label
// statt der vollen Modell-Id (z.B. 'claude-sonnet-5-20260701' -> 'sonnet'). Unbekannt -> null.
function kurzname(modellId) {
  if (!modellId) return null
  if (/fable|mythos/.test(modellId)) return 'fable'
  if (/opus/.test(modellId)) return 'opus'
  if (/sonnet/.test(modellId)) return 'sonnet'
  if (/haiku/.test(modellId)) return 'haiku'
  return null
}

// Liest ein Transkript-JSONL und summiert Verbrauch/Kosten + ermittelt das dominante Modell
// (häufigstes message.model, als Kurzname). Gibt null zurück, wenn die Datei fehlt oder keine
// usage-Blöcke enthält (nichts zu melden).
//
// seitMs (M0-T469-Nachbesserung): Resume/Fork-Transkripte enthalten oft Tage an Verlauf VOR
// dieser AgentHub-Session — ohne Abgrenzung summiert dieselbe Funktion den GESAMTEN Verlauf und
// meldet ihn erneut (Live-Befund 15.08.: eine über Tage fortgeführte Session wurde mit $243,60
// statt dem echten Tageszuwachs gebucht). Ist seitMs gesetzt, zählen nur Zeilen mit
// timestamp > seitMs — der robusteste Cutoff, weil er nicht von Dateipfad/Registry abhängt,
// sondern direkt am Transkript-Inhalt greift. bisMs im Rückgabewert ist der höchste gezählte
// Zeitstempel — Aufrufer nutzen ihn, um den Marker (siehe ermittleUndMarkiereZuwachs) fortzuschreiben.
export function summiereTranskript(transcriptPath, { seitMs } = {}) {
  if (!existsSync(transcriptPath)) return null

  const summe = { tokenEingabe: 0, tokenAusgabe: 0, tokenCacheLesen: 0, tokenCacheSchreiben: 0 }
  let hatUsage = false
  let kostenUsd = 0
  let sessionStartMs
  let bisMs = seitMs
  const modellHaeufigkeit = new Map()
  const zeilen = readFileSync(transcriptPath, 'utf-8').split('\n')
  for (const zeile of zeilen) {
    if (!zeile.trim()) continue
    let eintrag
    try { eintrag = JSON.parse(zeile) } catch { continue }
    if (sessionStartMs === undefined && eintrag?.timestamp) sessionStartMs = Date.parse(eintrag.timestamp)
    const usage = eintrag?.message?.usage
    if (!usage) continue
    const zeitMs = eintrag?.timestamp ? Date.parse(eintrag.timestamp) : undefined
    // Zeilen ohne Timestamp werden NICHT übersprungen (robuster gegen fehlendes Feld) — nur
    // Zeilen mit bekanntem, zu frühem Timestamp fallen aus dem Zuwachs raus.
    if (seitMs !== undefined && zeitMs !== undefined && zeitMs <= seitMs) continue
    hatUsage = true
    summe.tokenEingabe += usage.input_tokens ?? 0
    summe.tokenAusgabe += usage.output_tokens ?? 0
    summe.tokenCacheLesen += usage.cache_read_input_tokens ?? 0
    summe.tokenCacheSchreiben += usage.cache_creation_input_tokens ?? 0
    kostenUsd += kostenFuer(eintrag?.message?.model, usage)
    const kurz = kurzname(eintrag?.message?.model)
    if (kurz) modellHaeufigkeit.set(kurz, (modellHaeufigkeit.get(kurz) ?? 0) + 1)
    if (zeitMs !== undefined && (bisMs === undefined || zeitMs > bisMs)) bisMs = zeitMs
  }
  if (!hatUsage) return null

  let modell = null
  let maxAnzahl = 0
  for (const [name, anzahl] of modellHaeufigkeit) {
    if (anzahl > maxAnzahl) { modell = name; maxAnzahl = anzahl }
  }

  return { summe, kostenUsd, sessionStartMs, modell, bisMs }
}

// Gemeinsame Zuwachs-/Dedupe-Abgrenzung für session-end.sh (sauberes Ende) UND
// session-nachtrag.mjs (Reaper) — beide riefen vorher summiereTranskript() ohne Cutoff auf und
// meldeten so bei jedem Aufruf die GESAMTE Transkript-Historie erneut. Das führte live am
// 15.08. zu zwei Fehlbildern: (1) ein über Tage fortgeführtes Transkript wurde mit seiner
// kompletten Summe statt dem Tageszuwachs gebucht, (2) zwei AgentHub-Sessions, die auf
// dasselbe Transkript zeigten (Resume/Fork), meldeten beide die volle Summe → Doppelbuchung.
//
// Fix: ein Marker (.claude/agenthub-kosten-marker.json, ccSessionId -> zuletzt gemeldeter
// Zeitstempel) wird NACH jedem erfolgreichen Melden fortgeschrieben. Der nächste Aufruf für
// dieselbe ccSessionId zählt nur, was danach kam — unabhängig davon, wie viele AgentHub-
// Sessions/Aufrufer denselben ccSessionId beobachten (Dedupe fällt damit von selbst raus, ohne
// dass Aufrufer wissen müssen, ob sie die "richtige" Session sind). Fehlt der Marker (erster
// Aufruf), fällt der Cutoff auf den Session-Start aus der Registry zurück (.claude/
// agenthub-sessions.json) statt auf 0 — sonst würde die erste Meldung wieder die komplette
// Transkript-Vorgeschichte mitzählen.
//
// ponytail: kein Aufräumen alter Marker-Einträge (Ceiling: Datei wächst mit jeder je gesehenen
// ccSessionId um eine Zeile, ~60 Byte — bei realistischem Sessionvolumen erst nach Jahren
// spürbar; einfacher, das zu akzeptieren als eine Alters-Bereinigung zu bauen).
//
// Der Marker wird BEWUSST erst von markiereGemeldet() geschrieben — NICHT schon hier —, damit
// ein fehlgeschlagener Melde-Versuch (Netzwerk down) den Zuwachs beim nächsten Lauf erneut
// versucht, statt ihn durch einen vorzeitig gesetzten Marker stillschweigend zu verlieren.
const MARKER_PFAD = (repoDir) => join(repoDir, '.claude', 'agenthub-kosten-marker.json')
const ladeJson = (pfad) => {
  try { return JSON.parse(readFileSync(pfad, 'utf-8')) } catch { return {} }
}

export function ermittleZuwachs(transcriptPath, ccSessionId, repoDir) {
  const statePfad = join(repoDir, '.claude', 'agenthub-sessions.json')
  const marker = ladeJson(MARKER_PFAD(repoDir))
  const registry = ladeJson(statePfad)
  const seitMs = marker[ccSessionId] ?? registry[ccSessionId]?.gestartet
  return summiereTranskript(transcriptPath, { seitMs })
}

// Erst NACH erfolgreichem Melden aufrufen — schreibt den Marker fort, damit der nächste Lauf
// nur noch den Zuwachs danach zählt.
export function markiereGemeldet(ccSessionId, repoDir, bisMs) {
  if (bisMs === undefined) return
  const markerPfad = MARKER_PFAD(repoDir)
  const marker = ladeJson(markerPfad)
  marker[ccSessionId] = bisMs
  try { writeFileSync(markerPfad, JSON.stringify(marker, null, 2)) } catch { /* fail-open */ }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const hookInput = JSON.parse(input)
  const sessionId = hookInput.session_id
  const transcriptPath = hookInput.transcript_path
  if (!sessionId || !transcriptPath) return

  const REPO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
  const ergebnis = ermittleZuwachs(transcriptPath, sessionId, REPO_DIR)
  if (!ergebnis) return
  const { summe, kostenUsd, sessionStartMs, modell, bisMs } = ergebnis

  const commitSha = sessionStartMs !== undefined ? ermittleCommitSha(REPO_DIR, sessionStartMs) : undefined
  execFileSync('node', [
    join(REPO_DIR, 'scripts/agenthub-melde.mjs'), 'session-ende', sessionId,
    '--kosten', kostenUsd.toFixed(4),
    '--token-eingabe', String(summe.tokenEingabe),
    '--token-ausgabe', String(summe.tokenAusgabe),
    '--token-cache-lesen', String(summe.tokenCacheLesen),
    '--token-cache-schreiben', String(summe.tokenCacheSchreiben),
    ...(commitSha ? ['--commit-sha', commitSha] : []),
    ...(modell ? ['--modell', modell] : []),
  ], { cwd: REPO_DIR, timeout: 15000 })
  markiereGemeldet(sessionId, REPO_DIR, bisMs)
}

main().catch(() => {})
