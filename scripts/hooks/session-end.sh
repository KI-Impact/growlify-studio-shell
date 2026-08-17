#!/bin/bash
# Schleifenschutz (2026-08-12): von Hooks gespawnte headless-Sessions dürfen nie selbst Hooks ausführen.
[ -n "$AGENTHUB_HEADLESS_HOOK" ] && exit 0
# SessionEnd-Hook: summiert die Verbrauchszahlen aus dem Transkript und meldet die Session
# an AgentHub als beendet (M0-T388). Erzeugt zusätzlich automatisch ein Kurzfazit per
# `claude -p` und meldet es mit (M0-T412). Fire-and-forget im Hintergrund — darf das
# Session-Ende nie blocken oder verzögern, deshalb immer exit 0.
#
# Claude Code übergibt Hook-Input via stdin als JSON ({ session_id, transcript_path, ... }).

INPUT=$(cat)
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -f "$REPO_DIR/scripts/agenthub-melde.mjs" ]; then
  ( cd "$REPO_DIR" && echo "$INPUT" | node scripts/hooks/session-end-summe.mjs >/dev/null 2>&1 & )
  ( cd "$REPO_DIR" && echo "$INPUT" | node scripts/hooks/session-end-fazit.mjs >/dev/null 2>&1 & )
fi

exit 0
