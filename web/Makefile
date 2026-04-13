
NODE_VERSION := v22.14.0

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
	rm -rf build

build:
	env GOOS=linux GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/arm64/
	env GOOS=linux GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/amd64/
	env GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/arm64/
	env GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/amd64/

warp_build:
	$(MAKE) all
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
