.PHONY: build build-main build-canary sync-price clean

BUILD_DIR := build

build: build-main build-canary

# Pull the published price sheet from the sn repo (override with SN_DIR=...)
# and regenerate price.yml / price.rss in both public/ directories.
sync-price:
	node ../scripts/sync-price.mjs

build-main: sync-price
	(cd ../react && npm ci)
	npm ci
	UR_ENV=main npx astro build

build-canary: sync-price
	(cd ../react && npm ci)
	npm ci
	UR_ENV=canary npx astro build

clean:
	rm -rf $(BUILD_DIR)/main $(BUILD_DIR)/canary
