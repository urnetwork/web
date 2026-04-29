.PHONY: build build-main build-canary clean

BUILD_DIR := build

build: build-main build-canary

build-main:
	npm ci
	UR_ENV=main npx astro build

build-canary:
	npm ci
	UR_ENV=canary npx astro build

clean:
	rm -rf $(BUILD_DIR)/main $(BUILD_DIR)/canary
