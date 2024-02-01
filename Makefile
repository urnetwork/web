

all: clean build

deps:
	npm install html-validate -g
	npm install html-minifier -g
	npm install uglify-js -g
	npm install clean-css-cli -g

clean:
	python webgen/webgen.py clean bringyour.com/gen.py
	python webgen/webgen.py clean nginx/gen.py
	rm -rf build

gen:
	python webgen/webgen.py build bringyour.com/gen.py
	# generate the api docs into the latest build
	npx -y @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/bringyour.yml -o bringyour.com/build/api.html
	# include the legal documents verbatim as per privacytxt.dev
	pandoc -f markdown -t plain legal/privacy.md -o bringyour.com/build/privacy.txt
	pandoc -f markdown -t plain legal/terms.md -o bringyour.com/build/terms.txt
	pandoc -f markdown -t plain legal/vdp.md -o bringyour.com/build/vdp.txt
	python webgen/webgen.py build nginx/gen.py

build:
	$(MAKE) gen
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

local_routing_on:
	sudo hostctl add domains bringyour_web_local bringyour.com api.bringyour.com

local_routing_off:
	sudo hostctl remove bringyour_web_local

run_local:
	$(MAKE) gen
	python webgen/webgen.py build nginx-local/gen.py
	mkdir nginx-local/build/log
	$(MAKE) local_routing_on
	trap "$(MAKE) local_routing_off" EXIT && $(MAKE) run_local_nginx

run_local_nginx:
	nginx -c ${BRINGYOUR_HOME}/web/nginx-local/build/nginx.conf -g 'daemon off;'
