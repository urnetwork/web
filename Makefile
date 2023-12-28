

all: clean build

clean:
	python webgen/webgen.py clean bringyour.com/gen.py
	python webgen/webgen.py clean nginx/gen.py
	rm -rf build

build:
	python webgen/webgen.py build bringyour.com/gen.py
	# generate the api docs into the latest build
	npx @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/bringyour.yml -o bringyour.com/build/api.html
	python webgen/webgen.py build nginx/gen.py
	mkdir -p build/${WARP_ENV}
	echo "{\"version\":\"${WARP_VERSION}\",\"status\":\"ok\"}" > build/${WARP_ENV}/status.json
	docker buildx build --progress plain \
		--build-arg warp_env=${WARP_ENV} \
		--platform linux/arm64/v8,linux/amd64 \
		-t ${WARP_DOCKER_NAMESPACE}/${WARP_DOCKER_IMAGE}:${WARP_DOCKER_VERSION} \
		--no-cache \
		--push \
		.
