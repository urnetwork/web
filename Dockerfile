FROM ubuntu:22.04
# see https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
RUN apt-get update && apt-get install -y \
	nginx \
 && rm -rf /var/lib/apt/lists/*
COPY nginx.conf /etc/nginx/nginx.conf
COPY bringyour.com /www/bringyour.com
COPY bringyour.com-placeholder /www/bringyour.com-placeholder
EXPOSE 80
EXPOSE 443
# see https://ubuntu.com/blog/avoiding-dropped-connections-in-nginx-containers-with-stopsignal-sigquit
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
