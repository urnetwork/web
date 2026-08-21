FROM ubuntu:24.04
# see https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

ARG TARGETPLATFORM
ARG warp_env
ENV WARP_ENV=$warp_env

# use the latest stable nginx
# https://nginx.org/en/CHANGES
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    ca-certificates \
    lsb-release \
    ubuntu-keyring

RUN curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | tee /usr/share/keyrings/nginx-archive-keyring.gpg > /dev/null

RUN echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
    | tee /etc/apt/sources.list.d/nginx.list

RUN apt-get update && apt-get install -y nginx

# Build the ngx_brotli dynamic modules against this exact nginx version so
# `brotli_static on` can serve the .br siblings the site builds emit
# (astro/scripts/precompress.mjs) — maximum compression, zero runtime CPU.
# nginx.org ships no brotli module, so it is compiled here with --with-compat
# against the system libbrotli, then the toolchain is removed again.
RUN apt-get install -y --no-install-recommends         build-essential git libpcre2-dev zlib1g-dev libssl-dev libbrotli-dev &&     NGINX_VERSION=$(nginx -v 2>&1 | sed 's|.*nginx/||') &&     curl -sO https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz &&     tar xzf nginx-${NGINX_VERSION}.tar.gz &&     git clone --depth 1 https://github.com/google/ngx_brotli &&     cd nginx-${NGINX_VERSION} &&     ./configure --with-compat --add-dynamic-module=../ngx_brotli &&     make modules &&     mkdir -p /etc/nginx/modules /etc/nginx/modules-enabled &&     cp objs/ngx_http_brotli_filter_module.so objs/ngx_http_brotli_static_module.so /etc/nginx/modules/ &&     printf 'load_module /etc/nginx/modules/ngx_http_brotli_static_module.so;\n'         > /etc/nginx/modules-enabled/50-brotli.conf &&     cd .. && rm -rf nginx-${NGINX_VERSION} nginx-${NGINX_VERSION}.tar.gz ngx_brotli &&     apt-get purge -y build-essential git libpcre2-dev zlib1g-dev libssl-dev libbrotli-dev &&     apt-get autoremove -y && apt-get install -y libbrotli1

# RUN rm -rf /var/lib/apt/sources.list.d/*

# print the nginx version and verify the brotli module loads
RUN nginx -V
RUN nginx -t -g "error_log /dev/null;" 2>/dev/null || true

ADD nginx/build/ /etc/nginx/
ADD bringyour.com/build /www/bringyour.com
ADD ur.network/build /www/ur.network
ADD ur.xyz/build /www/ur.xyz
ADD build/preview.ur.xyz /www/preview.ur.xyz
ADD build/preview.ur.io /www/preview.ur.io

COPY build/${WARP_ENV}/status.json /srv/warp/status/status.json

# make sure all static files can be read
RUN find /www/bringyour.com -type d -exec chmod ugo=rx {} +
RUN find /www/bringyour.com -type f -exec chmod ugo=r {} +
RUN find /www/ur.network -type d -exec chmod ugo=rx {} +
RUN find /www/ur.network -type f -exec chmod ugo=r {} +
RUN find /www/ur.xyz -type d -exec chmod ugo=rx {} +
RUN find /www/ur.xyz -type f -exec chmod ugo=r {} +
RUN find /www/preview.ur.xyz -type d -exec chmod ugo=rx {} +
RUN find /www/preview.ur.xyz -type f -exec chmod ugo=r {} +
RUN find /www/preview.ur.io -type d -exec chmod ugo=rx {} +
RUN find /www/preview.ur.io -type f -exec chmod ugo=r {} +
RUN find /srv/warp/status -type d -exec chmod ugo=rx {} +
RUN find /srv/warp/status -type f -exec chmod ugo=r {} +

COPY build/$TARGETPLATFORM/web /usr/local/sbin/web

# see https://ubuntu.com/blog/avoiding-dropped-connections-in-nginx-containers-with-stopsignal-sigquit
STOPSIGNAL SIGQUIT
CMD ["/usr/local/sbin/web"]
