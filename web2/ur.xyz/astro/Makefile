.PHONY: build build-main build-canary generate-legal generate-agent-assets letter-pdf sync-public gates clean

BUILD_DIR := build

build: build-main build-canary

# Pull the published price sheet from the sn repo (override with SN_DIR=...)

# Regenerate react/src/data/legal.js from docs/legal/*.md (this site's
# canonical legal documents) so the terms/privacy/vdp pages ship current text.
generate-legal:
	node ../scripts/generate-legal.mjs

# Regenerate the machine-readable agent assets (whitepaper.md, docs-md mirror,
# openapi.yml, llms.txt) so crawlers and agents always get current documents.
generate-agent-assets:
	node ../scripts/generate-agent-assets.mjs

# Reprint the investor letter to astro/public/investors/*.pdf from the built
# page, so the download always matches the copy on the page. Needs a Chromium
# (`npx playwright install chromium`), which is why it is NOT part of build-*:
# the site build must stay runnable on a host with no browser. Run it whenever
# the letter copy or its print styles change, and commit the result.
letter-pdf:
	node ../scripts/generate-letter-pdf.mjs --rebuild

# Mirror every static asset from react/public into astro/public. Astro only
# serves its own public/, so an image added on the react side is missing from
# the astro build until it is copied — a silent failure that ships a broken
# <img>. Additive, so the agent assets generated straight into astro/public
# above are untouched; astro's own robots.txt is preserved by name.
sync-public:
	node scripts/sync-public.mjs

# The gate battery runs against the finished build dir. `npx astro build`
# never fires npm lifecycle hooks, so the gates are wired here explicitly —
# the visual-parity postbuild had been wired only in package.json and
# therefore ran on NO real build path, which is how an Aug-19 build shipped
# the SPA _redirects catch-all and a missing letter PDF (SEO3.md §H2).
gates:
	node ../react/tests/visual-parity.mjs
	node ../react/tests/network-privacy.mjs
	node scripts/link-audit.mjs build/$(UR_ENV_DIR)
	node scripts/seo-audit.mjs build/$(UR_ENV_DIR)

build-main: generate-legal generate-agent-assets sync-public
	(cd ../react && npm ci)
	npm ci
	UR_ENV=main npx astro build
	node scripts/modulepreload.mjs build/main
	$(MAKE) gates UR_ENV_DIR=main
	node scripts/precompress.mjs build/main

build-canary: generate-legal generate-agent-assets sync-public
	(cd ../react && npm ci)
	npm ci
	UR_ENV=canary npx astro build
	node scripts/modulepreload.mjs build/canary
	$(MAKE) gates UR_ENV_DIR=canary
	node scripts/precompress.mjs build/canary

clean:
	rm -rf $(BUILD_DIR)/main $(BUILD_DIR)/canary
