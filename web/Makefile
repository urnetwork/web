
NODE_VERSION := v22.14.0
MMM_HOME := ${WARP_HOME}/mmm
BRINGYOUR_SITE_DIR := ${MMM_HOME}/bringyour.com
UR_NETWORK_SITE_DIR := ${MMM_HOME}/ur.network
UR_IO_SITE_DIR := ${MMM_HOME}/ur.io

.PHONY: all init clean build build_external_sites check_external_sites build-preview warp_build warp_build_image

all: init clean build

# brew install pandoc
init:
	pip install -r ../requirements.txt
	(. ${NVM_DIR}/nvm.sh && \
		nvm install ${NODE_VERSION} && \
		nvm exec ${NODE_VERSION} npm install html-validate -g && \
		nvm exec ${NODE_VERSION} npm install html-minifier -g && \
		nvm exec ${NODE_VERSION} npm install uglify-js -g && \
		nvm exec ${NODE_VERSION} npm install clean-css-cli -g && \
		nvm exec ${NODE_VERSION} npm install purgecss -g)
	go clean -cache
	go clean -modcache

clean:
	if [ -f "${BRINGYOUR_SITE_DIR}/gen.py" ]; then python ../webgen/webgen.py clean "${BRINGYOUR_SITE_DIR}/gen.py"; fi
	if [ -f "${UR_NETWORK_SITE_DIR}/gen.py" ]; then python ../webgen/webgen.py clean "${UR_NETWORK_SITE_DIR}/gen.py"; fi
	rm -rf build

check_external_sites:
	test -f "${BRINGYOUR_SITE_DIR}/gen.py"
	test -f "${UR_NETWORK_SITE_DIR}/gen.py"
	test -f "${UR_IO_SITE_DIR}/astro/Makefile"

build_external_sites: check_external_sites
	(. ${NVM_DIR}/nvm.sh && \
		nvm use ${NODE_VERSION} && \
		python ../webgen/webgen.py build "${BRINGYOUR_SITE_DIR}/gen.py")
	# generate the api docs into the latest build
	npx -y @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/bringyour.yml -o "${BRINGYOUR_SITE_DIR}/build/api.html"
# 	npx -y @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/gpt.yml -o "${BRINGYOUR_SITE_DIR}/build/gpt.html"
	# include the legal documents verbatim as per privacytxt.dev
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/privacy.md -o "${BRINGYOUR_SITE_DIR}/build/privacy.txt"
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/terms.md -o "${BRINGYOUR_SITE_DIR}/build/terms.txt"
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/vdp.md -o "${BRINGYOUR_SITE_DIR}/build/vdp.txt"
	# temporarily exclude the AltStore archive from the web deployment
	rm -rf "${BRINGYOUR_SITE_DIR}/build/altstore"
	(. ${NVM_DIR}/nvm.sh && \
		nvm use ${NODE_VERSION} && \
		python ../webgen/webgen.py build "${UR_NETWORK_SITE_DIR}/gen.py")
	# Docker can only ADD files from this repository's build context. Mirror the
	# externally owned mmm sites into the same staging tree used by mmm/ur.io.
	rm -rf build/bringyour.com build/ur.network
	mkdir -p build
	cp -R -L "${BRINGYOUR_SITE_DIR}/build" build/bringyour.com
	cp -R -L "${UR_NETWORK_SITE_DIR}/build" build/ur.network

build: build_external_sites
	env GOOS=linux GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/arm64/
	env GOOS=linux GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/amd64/
	env GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/arm64/
	env GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/amd64/
	$(MAKE) build-preview

build-preview:
	mkdir -p build
	(. ${NVM_DIR}/nvm.sh && \
		nvm use ${NODE_VERSION} && \
		cd ${BRINGYOUR_HOME}/web/web2/ur.xyz/astro && \
		make clean build-main && \
		cp -r build/main ${BRINGYOUR_HOME}/web/web/build/preview.ur.xyz)
	(. ${NVM_DIR}/nvm.sh && \
		nvm use ${NODE_VERSION} && \
		cd ${UR_IO_SITE_DIR}/astro && \
		make clean build-main && \
		cp -r build/main ${BRINGYOUR_HOME}/web/web/build/preview.ur.io)
	

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
	sudo hostctl add domains bringyour_web_local bringyour.com api.bringyour.com

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
