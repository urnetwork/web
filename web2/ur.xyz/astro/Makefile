.PHONY: build build-main build-canary sync-price generate-legal generate-agent-assets clean

BUILD_DIR := build

build: build-main build-canary

# Pull the published price sheet from the sn repo (override with SN_DIR=...)
# and regenerate price.yml / price.rss in both public/ directories.
sync-price:
	node ../scripts/sync-price.mjs

# Regenerate react/src/data/legal.js from docs/legal/ur.xyz/*.md (the
# canonical legal documents) so the terms/privacy/vdp pages ship current text.
generate-legal:
	node ../scripts/generate-legal.mjs

# Regenerate the machine-readable agent assets (whitepaper.md, docs-md mirror,
# openapi.yml, llms.txt) so crawlers and agents always get current documents.
generate-agent-assets:
	node ../scripts/generate-agent-assets.mjs

build-main: sync-price generate-legal generate-agent-assets
	(cd ../react && npm ci)
	npm ci
	UR_ENV=main npx astro build

build-canary: sync-price generate-legal generate-agent-assets
	(cd ../react && npm ci)
	npm ci
	UR_ENV=canary npx astro build

clean:
	rm -rf $(BUILD_DIR)/main $(BUILD_DIR)/canary
