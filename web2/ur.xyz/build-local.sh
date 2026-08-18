#!/usr/bin/env bash
#
# build-local.sh — build the ur.xyz Astro site for local testing.
#
# ur.xyz has no secret build env — just UR_ENV (main|canary), which selects
# astro/env/<UR_ENV>.json. Not for deployment — deploy via the real pipeline (build/all/run.sh → warpctl →
# web/web, which builds this tree).
#
# Usage:
#   ./build-local.sh                       build + serve at http://localhost:4321
#   ./build-local.sh --build-only          just build (astro/build/<env>), no server
#   UR_ENV=canary ./build-local.sh         build the canary env instead of main
#
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)/astro"

export UR_ENV="${UR_ENV:-main}"

serve=1
for arg in "$@"; do
  case "$arg" in
    --build-only|-b) serve=0 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  esac
done

# --- deps (the astro build bundles ../react/src, so both trees need node_modules) -----
[ -d ../react/node_modules ] || { echo "[build-local] installing react deps…"; ( cd ../react && npm ci ); }
[ -d node_modules ]          || { echo "[build-local] installing astro deps…"; npm ci; }

echo "[build-local] building ur.xyz (UR_ENV=$UR_ENV) — local test build"
npx astro build

if [ "$serve" = "1" ]; then
  echo "[build-local] serving http://localhost:4321   (Ctrl-C to stop)"
  exec npx astro preview --port 4321
fi
echo "[build-local] done → astro/build/$UR_ENV   (preview: cd astro && npx astro preview --port 4321)"
