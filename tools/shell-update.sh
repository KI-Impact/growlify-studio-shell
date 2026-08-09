#!/usr/bin/env bash
# Zieht ALLE Konsumenten-Repos der Suite-Shell konsistent auf eine getaggte Version hoch.
#
# Hintergrund: npm löst github:-Tags im Lockfile NICHT neu auf — "npm install" ohne explizite
# Versionsangabe lässt den alten Commit im Lock stehen. Einziger verlässlicher Weg:
#   npm install @ki-impact/studio-shell@github:denglermanuel/growlify-studio-shell#vX.Y.Z
# Genau das macht dieses Skript für jedes Konsumenten-Repo: Version in package.json bumpen,
# Lock auf den Tag-Commit neu auflösen, committen (und mit --push pushen → Coolify-Auto-Deploy).
#
# Aufruf (aus beliebigem Verzeichnis):
#   tools/shell-update.sh v0.17.0          # bumpen + committen
#   tools/shell-update.sh v0.17.0 --push   # zusätzlich pushen (löst Auto-Deploys aus)
# Ohne Argument wird der neueste Tag dieses Repos genommen.
set -euo pipefail

DEV="$HOME/Developer"
SHELL_REPO="$DEV/growlify-studio-shell"
SPEC_BASE="github:denglermanuel/growlify-studio-shell"
# Alle Repos, die die Shell über package.json/Lockfile beziehen (Standard-Muster: npm ci im Dockerfile).
# growlify-marketing statt growlify-content: die Coolify-App "Marketing Studio" baut aus
# denglermanuel/growlify-marketing. growlify-content ist eine veraltete Kopie und wird nicht
# deployt. Stand hier falsch, dadurch wäre das Marketing Studio bei jedem Rollout stumm
# ausgelassen worden (am 29.07. an der Coolify-Konfiguration nachgemessen).
# prozess-studio am 02.08. nachgetragen: es bezieht die Shell seit v0.20.0, stand aber nie in
# dieser Liste und wäre bei jedem Rollout stumm auf der alten Version zurückgeblieben.
CONSUMERS=(business-brain eingang sales-studio growlify-crm transkripte growlify-portal finance-studio growlify-marketing prozess-studio)

PUSH=0
VERSION=""
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    v*) VERSION="$arg" ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

if [ -z "$VERSION" ]; then
  VERSION=$(git -C "$SHELL_REPO" tag --sort=-v:refname | head -1)
  echo "Keine Version angegeben — nehme neuesten Tag: $VERSION"
fi

# Tag muss existieren und gepusht sein, sonst läuft npm gegen einen fehlenden Ref.
if ! git -C "$SHELL_REPO" rev-parse "refs/tags/$VERSION" >/dev/null 2>&1; then
  echo "FEHLER: Tag $VERSION existiert nicht in $SHELL_REPO" >&2; exit 1
fi
if ! git -C "$SHELL_REPO" ls-remote --tags origin "$VERSION" | grep -q .; then
  echo "FEHLER: Tag $VERSION ist nicht auf origin gepusht (git push origin $VERSION)" >&2; exit 1
fi
TAG_COMMIT=$(git -C "$SHELL_REPO" rev-parse "$VERSION^{commit}")
echo "Shell $VERSION = $TAG_COMMIT"

FAILED=()
for repo in "${CONSUMERS[@]}"; do
  dir="$DEV/$repo"
  echo ""
  echo "== $repo"
  if [ ! -f "$dir/package.json" ]; then
    echo "   übersprungen (kein package.json)"; continue
  fi
  if ! node -e "process.exit(require('$dir/package.json').dependencies?.['@ki-impact/studio-shell'] ? 0 : 1)"; then
    echo "   übersprungen (keine Shell-Dependency)"; continue
  fi
  (
    cd "$dir"
    npm install --no-audit --no-fund "@ki-impact/studio-shell@$SPEC_BASE#$VERSION"
    # Nachweis: Lock zeigt auf den Tag-Commit?
    locked=$(node -e "const s=require('./package-lock.json').packages['node_modules/@ki-impact/studio-shell'];console.log((s.resolved.match(/#([0-9a-f]{40})/)||[])[1]||'?')")
    if [ "$locked" != "$TAG_COMMIT" ]; then
      echo "   FEHLER: Lock zeigt auf $locked statt $TAG_COMMIT" >&2; exit 1
    fi
    if git diff --quiet package.json package-lock.json; then
      echo "   bereits auf $VERSION — nichts zu committen"
    else
      git add package.json package-lock.json
      git commit -m "chore: studio-shell auf $VERSION"
      echo "   committed"
    fi
    if [ "$PUSH" = 1 ]; then git push && echo "   gepusht"; fi
  ) || FAILED+=("$repo")
done

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "FERTIG MIT FEHLERN in: ${FAILED[*]}" >&2; exit 1
fi
echo "FERTIG: alle Konsumenten auf $VERSION."
[ "$PUSH" = 1 ] || echo "Hinweis: noch nicht gepusht — erneut mit --push oder je Repo 'git push' (löst Coolify-Auto-Deploy aus)."
