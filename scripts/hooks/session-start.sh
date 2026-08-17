#!/bin/bash
# Schleifenschutz (2026-08-12): von Hooks gespawnte headless-Sessions dürfen nie selbst Hooks ausführen.
[ -n "$AGENTHUB_HEADLESS_HOOK" ] && exit 0
# SessionStart-Hook: registriert die Session im lokalen Task-Gate-Cache und meldet
# den Start an AgentHub (fire-and-forget, im Hintergrund — darf den Start nie blocken).
# Schlanke Portierung des relevanten Ausschnitts aus growlify/.claude/hooks/session-start.sh.
#
# Claude Code übergibt Hook-Input via stdin als JSON ({ session_id, source, ... }).

INPUT=$(cat)
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Lokalen Cache-Eintrag anlegen (liest dasselbe INPUT erneut über stdin).
if [ -f "$REPO_DIR/scripts/claim.mjs" ]; then
  echo "$INPUT" | node "$REPO_DIR/scripts/claim.mjs" register >/dev/null 2>&1
fi

# AgentHub-Session-Start im Hintergrund — Netzwerk darf den Start nie verzögern.
CC_SESSION_ID=$(echo "$INPUT" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).session_id||"")}catch{console.log("")}})' 2>/dev/null)
if [ -n "$CC_SESSION_ID" ] && [ -f "$REPO_DIR/scripts/agenthub-melde.mjs" ]; then
  ( cd "$REPO_DIR" && node scripts/agenthub-melde.mjs session-start "$CC_SESSION_ID" lokal --start-art interaktiv >/dev/null 2>&1 & )
fi

# Nachtrag-Reaper (M0-T469): meldet Kosten hart beendeter Sessions (Terminal zu, Kill) nach, die
# der SessionEnd-Hook nie erreicht hat — fire-and-forget im Hintergrund, darf den Start nie
# verzögern. timeout schützt gegen ein hängendes Transkript-Verzeichnis auf einer trägen Platte.
if [ -f "$REPO_DIR/scripts/hooks/session-nachtrag.mjs" ]; then
  ( cd "$REPO_DIR" && timeout 20 node scripts/hooks/session-nachtrag.mjs >/dev/null 2>&1 & )
fi

# Brain-Kontext (M0-T468): Profil + aktive Arbeit + Top-Learnings als additionalContext an die
# Session anhängen — anders als der Session-Start oben MUSS das synchron laufen (der Output wird
# gebraucht), darum kein Hintergrund-Aufruf. cmdKontext ist selbst fail-open (4s-Timeout, stiller
# Exit ohne Output bei Server-/Config-Fehler) — bei leerem Output einfach kein additionalContext.
if [ -f "$REPO_DIR/scripts/agenthub-melde.mjs" ]; then
  KONTEXT=$(cd "$REPO_DIR" && node scripts/agenthub-melde.mjs kontext 2>/dev/null)
  if [ -n "$KONTEXT" ]; then
    node -e '
      let d = "";
      process.stdin.on("data", c => d += c).on("end", () => {
        console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: d } }));
      });
    ' <<< "$KONTEXT"
  fi
fi

exit 0
