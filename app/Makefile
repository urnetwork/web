
NODE_VERSION := v22.14.0

all: clean build

clean:
	rm -rf build
	rm -rf dist

webpack:
	# Outputs build artifacts to ./dist
	. ${NVM_DIR}/nvm.sh && \
		nvm exec ${NODE_VERSION} npm ci && \
		nvm exec ${NODE_VERSION} npm audit && \
		nvm exec ${NODE_VERSION} npm run build

build:
	$(MAKE) webpack
	python ../webgen/webgen.py clean nginx/gen.py
	python ../webgen/webgen.py build nginx/gen.py

warp_build:
	$(MAKE) all
	mkdir -p build/${WARP_ENV}
	echo "{\"version\":\"${WARP_VERSION}\",\"status\":\"ok\"}" > build/${WARP_ENV}/status.json
	docker buildx build --progress plain \
		--build-arg warp_env=${WARP_ENV} \
		--platform linux/arm64/v8,linux/amd64 \
		-t ${WARP_DOCKER_NAMESPACE}/${WARP_DOCKER_IMAGE}:${WARP_DOCKER_VERSION} \
		--no-cache \
		--push \
		.
