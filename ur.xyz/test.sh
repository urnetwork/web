#!/usr/bin/env bash
#
# test.sh — parity suite: the ur.xyz Astro build must faithfully match the React SPA.
#
# Runs both automated parity checks, each on THREE screens (desktop 1280×900, iPhone 15,
# Galaxy S24 Ultra @3×):
#   1. visual-parity      — per-pixel diff of every main route, React SPA (vite) vs the
#                           Astro islands build. Fails on any real rendering divergence.
#   2. interactive-wiring — taps every button and checks it reaches the SAME end state
#                           (URL + which dialog opens) on Astro as on React.
#
# It builds a fresh Astro output (UR_ENV=main; no secret env) and diffs it against the live
# React SPA. Needs a Playwright chromium (once: `npx playwright install chromium`);
# playwright-core + pngjs are react/ devDeps.
#
# Usage:
#   ./test.sh                 both suites (the tap suite is slow — ~20 min for 3 screens)
#   ./test.sh pixel           just the per-pixel suite (fast)
#   ./test.sh tap             just the tap/wiring suite
#   UR_ENV=canary ./test.sh                  test the canary env instead of main
#   WIRING_PROFILES=iphone ./test.sh tap     one screen only (desktop|iphone|galaxy, comma-sep)
#
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here/react" || { echo "test.sh: cannot find react/ workspace"; exit 1; }

what="${1:-all}"
case "$what" in
  all|pixel|tap) ;;
  -h|--help) grep '^#' "$here/$(basename "$0")" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "usage: ./test.sh [pixel|tap]"; exit 2 ;;
esac
export UR_ENV="${UR_ENV:-main}"

# --- deps (the astro build bundles ../react/src, so both trees need node_modules) -----
[ -d node_modules ]          || { echo "[test] installing react deps…"; npm ci; }
[ -d ../astro/node_modules ] || { echo "[test] installing astro deps…"; ( cd ../astro && npm ci ); }
# rebuild fresh so we always test CURRENT source (both tests build the output when absent)
rm -rf "../astro/build/$UR_ENV"

fail=0
run() {  # $1 label, $2 script
  echo
  echo "──────────────────────────────────────────────────────────────"
  echo "▶ $1"
  echo "──────────────────────────────────────────────────────────────"
  if node "$2"; then echo "✓ $1 passed"; else echo "✗ $1 FAILED"; fail=1; fi
}

if [ "$what" != tap ];   then run "visual parity  (React → Astro, per-pixel, 3 screens)" tests/visual-parity.mjs; fi
if [ "$what" != pixel ]; then run "interactive wiring  (tap parity, 3 screens)"          tests/interactive-wiring.mjs; fi

echo
if [ "$fail" -eq 0 ]; then echo "✓ ALL PARITY TESTS PASSED"; else echo "✗ PARITY FAILURES ABOVE"; fi
exit "$fail"
