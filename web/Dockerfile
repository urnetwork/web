FROM ubuntu:22.04
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
http://nginx.org/packages/ubuntu `lsb_release -cs` nginx" \
    | tee /etc/apt/sources.list.d/nginx.list

RUN apt-get update && apt-get install -y \
	nginx \
	openssl

# RUN rm -rf /var/lib/apt/sources.list.d/*

# print the nginx version
RUN nginx -V

ADD nginx/build/ /etc/nginx/
ADD ../bringyour.com/build /www/bringyour.com

# make sure all static files can be read
RUN find /www/bringyour.com -type d -exec chmod ugo=rx {} +
RUN find /www/bringyour.com -type f -exec chmod ugo=r {} +

COPY build/${WARP_ENV}/status.json /srv/warp/status/status.json

COPY build/$TARGETPLATFORM/web /usr/local/sbin/web

# see https://ubuntu.com/blog/avoiding-dropped-connections-in-nginx-containers-with-stopsignal-sigquit
STOPSIGNAL SIGQUIT
CMD ["/usr/local/sbin/web"]
