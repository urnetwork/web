import uuid
from email.utils import formatdate

# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified
# An HTTP date is the RFC 7231 IMF-fixdate, "Fri, 25 Sep 2026 03:18:15 GMT".
# strftime("... %Z") printed "UTC", which is not one, and its %a/%b names follow
# the build host's locale; formatdate(usegmt=True) is exactly the HTTP form.
http_last_modified = formatdate(usegmt=True)

# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
http_etag = uuid.uuid1().hex
