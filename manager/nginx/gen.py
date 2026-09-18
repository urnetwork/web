import uuid
import time
from datetime import datetime, timezone

# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified
http_last_modified = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %Z")

# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
http_etag = uuid.uuid1().hex
