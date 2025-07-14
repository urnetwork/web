
NODE_VERSION := v20.10.0


all: init clean build gen_components

# brew install pandoc
init:
	pip install -r requirements.txt
	(. ${NVM_DIR}/nvm.sh && \
		nvm install ${NODE_VERSION} && \
		nvm exec ${NODE_VERSION} npm install html-validate -g && \
		nvm exec ${NODE_VERSION} npm install html-minifier -g && \
		nvm exec ${NODE_VERSION} npm install uglify-js -g && \
		nvm exec ${NODE_VERSION} npm install clean-css-cli -g && \
		nvm exec ${NODE_VERSION} npm install purgecss -g)

clean:
	python webgen/webgen.py clean bringyour.com/gen.py
	rm -rf build

build:
	python webgen/webgen.py build bringyour.com/gen.py
	# generate the api docs into the latest build
	npx -y @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/bringyour.yml -o bringyour.com/build/api.html
# 	npx -y @redocly/cli build-docs ${BRINGYOUR_HOME}/connect/api/gpt.yml -o bringyour.com/build/gpt.html
	# include the legal documents verbatim as per privacytxt.dev
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/privacy.md -o bringyour.com/build/privacy.txt
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/terms.md -o bringyour.com/build/terms.txt
	pandoc -f markdown -t plain ${BRINGYOUR_HOME}/docs/legal/vdp.md -o bringyour.com/build/vdp.txt
	# include altstore
	cp -r altstore bringyour.com/build/altstore

warp_build:
	$(MAKE) all
	python webgen/webgen.py clean nginx/gen.py
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


# COMPONENTS

gen_components:
	$(MAKE) gen_my_ip_info
	$(MAKE) gen_my_ip_widget

gen_my_ip_info:
	# Outputs build artifacts to ./build
	(cd components/whereami/my-ip-info && . ${NVM_DIR}/nvm.sh && \
		nvm exec ${NODE_VERSION} npm ci && \
		nvm exec ${NODE_VERSION} npm run build)
	cp components/whereami/my-ip-info/dist/my-ip-info.js bringyour.com/build/lib-ur/

gen_my_ip_widget:
	# Outputs build artifacts to ./build
	(cd components/whereami/my-ip-widget && . ${NVM_DIR}/nvm.sh && \
		nvm exec ${NODE_VERSION} npm ci && \
		nvm exec ${NODE_VERSION} npm run build)
	cp components/whereami/my-ip-widget/dist/my-ip-widget.js bringyour.com/build/lib-ur/


# LOCAL DEVELOPMENT
# note these will go away when `warpctl run-local` is fixed
# see https://guumaster.github.io/hostctl/docs/installation/#homebrew

local_routing_on:
	sudo hostctl add domains bringyour_web_local bringyour.com api.bringyour.com

local_routing_off:
	sudo hostctl remove bringyour_web_local

run_local:
	$(MAKE) build
	python webgen/webgen.py clean nginx-local/gen.py
	python webgen/webgen.py build nginx-local/gen.py
	mkdir nginx-local/build/log
	$(MAKE) local_routing_on
	trap "$(MAKE) local_routing_off" EXIT && $(MAKE) run_local_nginx

run_local_nginx:
	nginx -c ${BRINGYOUR_HOME}/web/nginx-local/build/nginx.conf -g 'daemon off;'
