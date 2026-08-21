.PHONY: build build-main build-canary generate-legal generate-agent-assets letter-pdf deck-slides sync-public install-playwright-browser gates clean

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
# page, so the download always matches the copy on the page. It is intentionally
# not part of build-* because the generated PDF is a committed asset. Run it
# whenever the letter copy or its print styles change, and commit the result.
letter-pdf:
	node ../scripts/generate-letter-pdf.mjs --rebuild

# Rasterise the investor deck PDF into astro/public/investors/deck/*.webp and
# place the PDF itself as the download. Pass the export from Google Slides:
#   make deck-slides DECK=~/Downloads/deck.pdf
# Like letter-pdf, this updates committed assets and is not part of build-*.
# Update deck.slideCount in src/lib/investors.js to the count it prints.
deck-slides:
	node ../scripts/generate-deck-slides.mjs "$(DECK)"

# Mirror every static asset from react/public into astro/public. Astro only
# serves its own public/, so an image added on the react side is missing from
# the astro build until it is copied — a silent failure that ships a broken
# <img>. Additive, so the agent assets generated straight into astro/public
# above are untouched; astro's own robots.txt is preserved by name.
sync-public:
	node scripts/sync-public.mjs

# playwright-core supplies the browser API and CLI but not a browser binary.
# Install the revision pinned by react/package-lock.json into Playwright's shared
# cache. The gates launch headlessly, so the smaller Chromium shell is sufficient.
install-playwright-browser:
	(cd ../react && node node_modules/playwright-core/cli.js install --only-shell chromium)

# The gate battery runs against the finished build dir. `npx astro build`
# never fires npm lifecycle hooks, so the gates are wired here explicitly —
# the visual-parity postbuild had been wired only in package.json and
# therefore ran on NO real build path, which is how an Aug-19 build shipped
# the SPA _redirects catch-all and a missing letter PDF (SEO3.md §H2).
gates: install-playwright-browser
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
