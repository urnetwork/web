

# docker buildx build --platform linux/arm64/v8,linux/amd64 . -t bringyour/canary-web:2023.01.1 --no-cache --push
# docker run -p 7441:80 --network warpsbs bringyour/canary-web:2023.01.1

# local dev:
# nginx -c /Users/brien/bringyour/web/local-nginx.conf -g 'daemon off;'

#  npm i -g html-validate
# /Users/brien/.nvm/versions/node/v14.18.1/bin/html-validate bringyour.com/index.html

