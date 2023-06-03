

all: clean build

clean:
	python webgen/webgen.py clean bringyour.com/gen.py

build:
	python webgen/webgen.py build bringyour.com/gen.py
	docker buildx build --platform linux/arm64/v8,linux/amd64 . -t bringyour/canary-web:2023.01.1 --no-cache --push

local_routing_on:
	sudo hostctl add domains bringyour_web_local bringyour.com api.bringyour.com

local_routing_off:
	sudo hostctl remove bringyour_web_local

run_local:
	$(MAKE) local_routing_on
	trap "$(MAKE) local_routing_off" EXIT && $(MAKE) run_local_nginx

run_local_nginx:
	nginx -c ${BRINGYOUR_HOME}/web/local-nginx.conf -g 'daemon off;'


# docker run -p 7441:80 --network warpsbs bringyour/canary-web:2023.01.1

# local dev:
# nginx -c /Users/brien/bringyour/web/local-nginx.conf -g 'daemon off;'
# add to /etc/hosts
# 127.0.0.1  bringyour.com

# export BRINGYOUR_REDIS_HOSTNAME=192.168.208.135; export BRINGYOUR_POSTGRES_HOSTNAME=192.168.208.135; ./api

#  npm i -g html-validate
# /Users/brien/.nvm/versions/node/v14.18.1/bin/html-validate bringyour.com/index.html

# sudo docker run --name web-beta -p 7441:80 --network warpsbs --add-host warpsbs:172.18.0.1 bringyour/canary-web:2023.01.1
