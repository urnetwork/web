# webgen.py renders nginx.conf.j2 with this module's public names. The config
# needs none: pages carry nginx's own Last-Modified and ETag (the file's mtime
# and size), the validators its 304 check compares, rather than hand-set ones.
