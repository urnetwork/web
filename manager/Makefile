
NODE_VERSION := v22.14.0

.PHONY: all init clean build warp_build warp_build_image

all: init clean build

init:
	pip install -r ../requirements.txt
	go clean -cache
	go clean -modcache

clean:
	rm -rf build
	rm -rf dist

webpack:
	# Outputs build artifacts to ./dist
	. ${NVM_DIR}/nvm.sh && \
		nvm exec ${NODE_VERSION} npm ci && \
		nvm exec ${NODE_VERSION} npm run build

build:
	$(MAKE) webpack
	python ../webgen/webgen.py clean nginx/gen.py
	python ../webgen/webgen.py build nginx/gen.py
	env GOOS=linux GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/arm64/
	env GOOS=linux GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/linux/amd64/
	env GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/arm64/
	env GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.Version=${WARP_VERSION}" -o build/darwin/amd64/

warp_build:
	@echo "warp_build must be run through warpctl build so govulncheck gates image publication." >&2
	@false

warp_build_image:
	mkdir -p build/${WARP_ENV}
	echo "{\"version\":\"${WARP_VERSION}\",\"status\":\"ok\"}" > build/${WARP_ENV}/status.json
	docker buildx build --progress plain \
		--build-arg warp_env=${WARP_ENV} \
		--platform linux/arm64/v8,linux/amd64 \
		-t ${WARP_DOCKER_NAMESPACE}/${WARP_DOCKER_IMAGE}:${WARP_DOCKER_VERSION} \
		--no-cache \
		--push \
		.
