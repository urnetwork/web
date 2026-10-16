
# web serves only the sites in this repo: ur.xyz. The mmm sites (ur.io,
# bringyour.com, ur.network, vpn.dev and lag.dev) are built and served by the
# mmm service, mmm/mmm (mmm/mmm/PLAN.md).
NODE_VERSION := v22.23.2
WEB_BUILD_CHECKS ?= 1

.PHONY: all init clean build check build-preview warp_build warp_build_image

all: init clean build

init:
	pip install -r ../requirements.txt
	(. ${NVM_DIR}/nvm.sh && nvm install ${NODE_VERSION})

clean:
	rm -rf build

build:
	env GOOS=linux GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/arm64/
	env GOOS=linux GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/amd64/
	env GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/arm64/
	env GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/amd64/
	$(MAKE) build-preview

# Release preflight always runs the full checks, even when the caller has a
# checks-disabled environment. No service binaries or images are published.
check:
	(. "${NVM_DIR}/nvm.sh" && nvm install ${NODE_VERSION})
	$(MAKE) build-preview WEB_BUILD_CHECKS=1

build-preview:
	rm -rf build/preview.ur.xyz
	mkdir -p build
	(. ${NVM_DIR}/nvm.sh && \
		nvm use ${NODE_VERSION} && \
		cd ${BRINGYOUR_HOME}/web/ur.xyz/astro && \
		$(MAKE) clean build-main WEB_BUILD_CHECKS=$(WEB_BUILD_CHECKS) && \
		cp -r build/main ${BRINGYOUR_HOME}/web/web/build/preview.ur.xyz)
	

warp_build:
	@echo "warp_build must be run through warpctl build so govulncheck gates image publication." >&2
	@false

warp_build_image:
	python ../webgen/webgen.py clean nginx/gen.py
	python ../webgen/webgen.py build nginx/gen.py
	mkdir -p build/${WARP_ENV}
	echo "{\"version\":\"${WARP_VERSION}\",\"status\":\"ok\"}" > build/${WARP_ENV}/status.json

	docker buildx build --progress plain \
		--build-arg warp_env=${WARP_ENV} \
		--platform linux/arm64/v8,linux/amd64 \
		-t ${WARP_DOCKER_NAMESPACE}/${WARP_DOCKER_IMAGE}:${WARP_DOCKER_VERSION} \
		--no-cache \
		--push \
		.


# LOCAL DEVELOPMENT
# note these will go away when `warpctl run-local` is fixed
# see https://guumaster.github.io/hostctl/docs/installation/#homebrew

local_routing_on:
	sudo hostctl add domains bringyour_web_local api.bringyour.com

local_routing_off:
	sudo hostctl remove bringyour_web_local

run_local:
	$(MAKE) build
	python ../webgen/webgen.py clean nginx-local/gen.py
	python ../webgen/webgen.py build nginx-local/gen.py
	mkdir nginx-local/build/log
	$(MAKE) local_routing_on
	trap "$(MAKE) local_routing_off" EXIT && $(MAKE) run_local_nginx

run_local_nginx:
	nginx -c ${BRINGYOUR_HOME}/web/nginx-local/build/nginx.conf -g 'daemon off;'
