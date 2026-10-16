"""Execute the actual transitional nginx server block on a private local port."""
import http.client
import pathlib
import re
import shutil
import socket
import subprocess
import tempfile
import time
import unittest


@unittest.skipUnless(shutil.which("nginx"), "requires nginx (also covered by the image smoke test)")
class LegacyRedirectTest(unittest.TestCase):
    def test_cloudfront_origin_redirects_to_public_successor(self):
        source = (pathlib.Path(__file__).parent / "nginx/nginx.conf.j2").read_text()
        name = "server_name main-web.bringyour.com main-web.ur.network;"
        start = source.rfind("server {", 0, source.index(name))
        end = start
        depth = 0
        for end in range(source.index("{", start), len(source)):
            depth += (source[end] == "{") - (source[end] == "}")
            if depth == 0:
                break
        block = source[start:end + 1]
        with tempfile.TemporaryDirectory(prefix="legacy-nginx-") as temporary:
            root = pathlib.Path(temporary)
            status = root / "status.json"
            status.write_text('{"status":"ok"}')
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0))
                port = reservation.getsockname()[1]
            block = block.replace("listen 80;", f"listen 127.0.0.1:{port};")
            block = block.replace("/srv/warp/status/status.json", str(status))
            config = root / "nginx.conf"
            config.write_text(f"daemon off;\nmaster_process off;\npid {root}/nginx.pid;\n"
                              f"error_log {root}/error.log;\nevents {{}}\nhttp {{ access_log off; {block} }}\n")
            process = subprocess.Popen([shutil.which("nginx"), "-p", str(root), "-c", str(config)],
                                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            try:
                deadline = time.monotonic() + 5
                while True:
                    try:
                        with socket.create_connection(("127.0.0.1", port), timeout=.1):
                            break
                    except OSError:
                        if process.poll() is not None or time.monotonic() >= deadline:
                            self.fail("nginx did not start: " + process.stderr.read().decode())
                        time.sleep(.01)
                for host in ("main-web.bringyour.com", "main-web.ur.network"):
                    for path, code, location in (
                        ("/", 301, "https://ur.io/"),
                        ("/download?source=legacy", 301, "https://ur.io/download?source=legacy"),
                        ("/blog/", 301, "https://ur.io/blog"),
                        ("/blog/visual/?source=legacy", 301, "https://ur.io/blog"),
                        ("/status", 200, None),
                    ):
                        with self.subTest(host=host, path=path):
                            client = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
                            client.request("GET", path, headers={"Host": host})
                            response = client.getresponse()
                            self.assertEqual(code, response.status)
                            self.assertEqual(location, response.getheader("Location"))
                            if code == 200:
                                self.assertEqual(status.read_bytes(), response.read())
                            client.close()
            finally:
                process.terminate()
                process.communicate(timeout=5)


if __name__ == "__main__":
    unittest.main()
