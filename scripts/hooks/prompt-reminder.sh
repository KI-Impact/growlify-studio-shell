#!/bin/bash
# UserPromptSubmit-Hook: leiser Status-Reminder + Heartbeat. Blockiert NIE (kein
# exit 2 in dieser Datei) — reine Sichtbarkeit, damit eine Session ihren
# Task-Gate-Status sieht, ohne extra `claim.mjs status` aufzurufen. Zusätzlich
# gedrosselter Heartbeat an AgentHub (fire-and-forget, im Hintergrund).
#
# Claude Code übergibt Hook-Input via stdin als JSON ({ session_id, prompt, ... }).

INPUT=$(cat)
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -f "$REPO_DIR/scripts/claim.mjs" ]; then
  node "$REPO_DIR/scripts/claim.mjs" status 2>/dev/null
fi

exit 0
