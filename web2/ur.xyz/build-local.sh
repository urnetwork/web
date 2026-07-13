#!/usr/bin/env bash
#
# build-local.sh — build the ur.xyz Astro site for local testing.
#
# ur.xyz has no secret build env — just UR_ENV (main|canary), which selects
# astro/env/<UR_ENV>.json. The α→USD price feed hits GeckoTerminal at RUNTIME (not build),
# so there is nothing to fake here; the committed price.yml is used unless you point at the
# sn repo. Not for deployment — deploy via the real pipeline (build/all/run.sh → warpctl →
# web/web, which builds this tree).
#
# Usage:
#   ./build-local.sh                       build + serve at http://localhost:4321
#   ./build-local.sh --build-only          just build (astro/build/<env>), no server
#   UR_ENV=canary ./build-local.sh         build the canary env instead of main
#   SN_DIR=/path/to/sn ./build-local.sh    also refresh the price sheet from the sn repo
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

# --- price sheet: only refresh from the sn repo when SN_DIR is given; otherwise the
#     committed price.yml is used (fine for local testing) --------------------------------
if [ -n "${SN_DIR:-}" ]; then
  echo "[build-local] refreshing price sheet from $SN_DIR…"
  node ../scripts/sync-price.mjs
fi

echo "[build-local] building ur.xyz (UR_ENV=$UR_ENV) — local test build"
npx astro build

if [ "$serve" = "1" ]; then
  echo "[build-local] serving http://localhost:4321   (Ctrl-C to stop)"
  exec npx astro preview --port 4321
fi
echo "[build-local] done → astro/build/$UR_ENV   (preview: cd astro && npx astro preview --port 4321)"
