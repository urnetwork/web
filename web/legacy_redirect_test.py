"""Execute the actual legacy nginx routes and image-smoke assertions locally."""
import contextlib
import http.client
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest


HERE = pathlib.Path(__file__).parent
HOSTS = ("main-web.bringyour.com", "main-web.ur.network")
CASES = (
    ("/", 301, "https://ur.io/"),
    ("/?smoke=1", 301, "https://ur.io/?smoke=1"),
    ("/legacy/path?smoke=1", 301, "https://ur.io/legacy/path?smoke=1"),
    ("/res/emails/ur-wordmark-bg-240.jpg", 301, "https://ur.io/res/emails/ur-wordmark-bg-240.jpg"),
    ("/res/emails/ur-wordmark-bg-240.jpg?smoke=1", 301,
     "https://ur.io/res/emails/ur-wordmark-bg-240.jpg?smoke=1"),
    ("/download?source=legacy", 301, "https://ur.io/download?source=legacy"),
    ("/blog/", 301, "https://ur.io/blog"),
    ("/blog/visual/?source=legacy", 301, "https://ur.io/blog"),
    ("/status", 200, None),
)


def server_block(source, marker):
    start = source.rfind("server {", 0, source.index(marker))
    depth = 0
    for end in range(source.index("{", start), len(source)):
        depth += (source[end] == "{") - (source[end] == "}")
        if depth == 0:
            return source[start:end + 1]
    raise AssertionError("unterminated nginx server block")


@unittest.skipUnless(shutil.which("nginx"), "requires nginx (also covered by the image smoke test)")
class LegacyRedirectTest(unittest.TestCase):
    @contextlib.contextmanager
    def nginx(self, mutation=None):
        source = (HERE / "nginx/nginx.conf.j2").read_text()
        block = server_block(source, "listen 80 default_server;") + "\n" + server_block(
            source, "server_name main-web.bringyour.com main-web.ur.network;")
        if mutation:
            old, new = mutation
            self.assertIn(old, block)
            block = block.replace(old, new)
        with tempfile.TemporaryDirectory(prefix="legacy-nginx-") as temporary:
            root = pathlib.Path(temporary)
            status = root / "status.json"
            status.write_text('{"status":"ok"}')
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0))
                port = reservation.getsockname()[1]
            block = block.replace("listen 80", f"listen 127.0.0.1:{port}")
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
                        if process.poll() is not None:
                            self.fail("nginx did not start: " + process.stderr.read().decode())
                        if time.monotonic() >= deadline:
                            self.fail("nginx did not accept the private local connection")
                        time.sleep(.01)
                yield root, port, status
            finally:
                process.terminate()
                process.communicate(timeout=5)

    def run_smoke_assertions(self, root, port):
        # Run the production helper bodies and EVERY legacy-origin loop,
        # including one accidentally added much later in the script. A second,
        # correct loop must not conceal an obsolete earlier assertion.
        source = (HERE / "nginx-smoke-test.sh").read_text()
        helpers = []
        for name in ("fail", "expect_response", "header_value", "expect_location_on_site"):
            match = re.search(rf"^{name}\(\) \{{\n.*?^\}}\n", source, re.M | re.S)
            self.assertIsNotNone(match, name)
            helpers.append(match.group())
        loops = re.findall(r"^for [a-z_]+ in main-web\.bringyour\.com main-web\.ur\.network; do\n.*?^done\n",
                           source, re.M | re.S)
        self.assertTrue(loops, "the image must exercise the legacy origins")
        commands = root / "bin"
        commands.mkdir()
        # Only move the connection from port 80 to this fixture's private
        # listener. Real curl/Nginx supply the status, headers and body; never
        # follow a redirect or contact the public destination.
        curl = commands / "curl"
        curl.write_text(f"#!{sys.executable}\n" + r'''
import json,os,pathlib,sys
args=sys.argv[1:]
url=args[-1]
host=args[args.index('--header')+1].removeprefix('Host: ')
with pathlib.Path(os.environ['LEGACY_REQUESTS']).open('a') as stream:
    stream.write(json.dumps([host,url.removeprefix('http://127.0.0.1')])+"\n")
args[-1]=url.replace('http://127.0.0.1','http://127.0.0.1:'+os.environ['LEGACY_PORT'],1)
os.execv(os.environ['LEGACY_CURL'],['curl','--noproxy','*','--max-time','5',*args])
''')
        curl.chmod(0o755)
        requests = root / "requests.jsonl"
        environment = dict(os.environ, PATH=str(commands) + os.pathsep + os.environ["PATH"],
                           LEGACY_REQUESTS=str(requests), LEGACY_PORT=str(port), LEGACY_CURL=shutil.which("curl"))
        program = 'set -euo pipefail\ntest_dir="$1"\n' + "\n".join(helpers + loops)
        result = subprocess.run(["bash", "-c", program, "legacy-smoke-fixture", str(root)],
                                env=environment, capture_output=True, text=True, timeout=15)
        observed = [tuple(json.loads(line)) for line in requests.read_text().splitlines()]
        return result, observed

    def test_cloudfront_origin_redirects_to_public_successor(self):
        with self.nginx() as (_, port, status):
            for host in HOSTS:
                for path, code, location in CASES:
                    with self.subTest(host=host, path=path):
                        client = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
                        client.request("GET", path, headers={"Host": host})
                        response = client.getresponse()
                        self.assertEqual(code, response.status)
                        self.assertEqual(location, response.getheader("Location"))
                        if code == 200:
                            self.assertEqual(status.read_bytes(), response.read())
                        client.close()
            # These are origin-Host redirects only, not new web-host routes
            # for sites owned by MMM. Keep the actual default server.
            for host in ("ur.io", "bringyour.com", "unrelated.invalid"):
                client = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
                client.request("GET", "/products", headers={"Host": host})
                response = client.getresponse()
                self.assertEqual(response.status, 404)
                self.assertIsNone(response.getheader("Location"))
                client.close()

    def test_actual_image_smoke_assertions_match_routes_once(self):
        with self.nginx() as (root, port, _):
            result, observed = self.run_smoke_assertions(root, port)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertCountEqual(observed, [(host, path) for host in HOSTS for path, _, _ in CASES])

    def test_actual_smoke_rejects_wrong_status_host_and_lost_query(self):
        for replacement in ("return 302 https://ur.io$request_uri;",
                            "return 301 https://main-mmm.bringyour.com$request_uri;",
                            "return 301 https://ur.io$uri;"):
            with self.subTest(replacement=replacement):
                with self.nginx(("return 301 https://ur.io$request_uri;", replacement)) as (root, port, _):
                    result, _ = self.run_smoke_assertions(root, port)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("nginx smoke test:", result.stderr)


if __name__ == "__main__":
    unittest.main()
