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
EMAILS = HERE / "bringyour.com/res/emails"
HOSTS = ("main-web.bringyour.com", "main-web.ur.network")
CASES = (
    ("/", 301, "https://ur.io/"),
    ("/?smoke=1", 301, "https://ur.io/?smoke=1"),
    ("/legacy/path?smoke=1", 301, "https://ur.io/?smoke=1"),
    ("/pricing", 301, "https://ur.io/products"),
    ("/download?source=legacy", 301, "https://ur.io/install?source=legacy"),
    ("/faq.html", 301, "https://ur.io/docs/faq"),
    ("/privacy.txt", 301, "https://ur.io/privacy"),
    ("/warrant-canary", 301, "https://ur.io/"),
    ("/blog/", 301, "https://ur.io/blog"),
    ("/blog/visual/?source=legacy", 301, "https://ur.io/blog?source=legacy"),
    ("/res/emails/ur-wordmark-bg-240.jpg", 200, None),
    ("/res/emails/ur-wordmark-bg-240.jpg?smoke=1", 200, None),
    ("/res/emails/missing.jpg", 404, None),
    ("/status", 200, None),
)
# Every image any server email template has linked as
# https://bringyour.com/res/emails/... (server controller/email_templates,
# all history; the templates moved off bringyour.com on 2026-09-01). Sent
# emails keep these URLs forever.
EMAIL_ASSETS = (
    "bringyour-wordmark-bg-240.jpg",
    "ur-welcome-header-1080.jpg",
    "ur-wordmark-bg-240.jpg",
    "urnetwork-goodbye-vpn.gif",
    "urnetwork-spin.gif",
    "welcome-header-1080.jpg",
)
EMAIL_CACHE_CONTROL = "public, max-age=2592000, stale-while-revalidate=86400"
# Old bringyour.com pages (this repo before the mmm split, d0905ed6, and its
# earlier history) and the ur.io page that replaced each. A path ur.io has no
# page for lands on the homepage, never on a 404.
PATH_MAP = {
    "/index.html": "/",
    "/about": "/about",
    "/about.html": "/about",
    "/blog": "/blog",
    "/blog.html": "/blog",
    "/blog/visual/": "/blog",
    "/buy-data.html": "/buy-data",
    "/pricing.html": "/products",
    "/pricing/": "/products",
    "/products": "/products",
    "/download": "/install",
    "/install": "/install",
    "/login.html": "/app",
    "/connect": "/app",
    "/app": "/app",
    "/faq": "/docs/faq",
    "/developers.html": "/docs/developers",
    "/api": "/docs/api",
    "/api.html": "/docs/api",
    "/docs": "/docs",
    "/docs/": "/docs",
    "/privacy": "/privacy",
    "/privacy.html": "/privacy",
    "/terms": "/terms",
    "/terms.txt": "/terms",
    "/vdp.html": "/vdp",
    "/vdp.txt": "/vdp",
    "/pgp-key.txt": "/.well-known/pgp-key.txt",
    "/.well-known/pgp-key.txt": "/.well-known/pgp-key.txt",
    "/.well-known/security.txt": "/.well-known/security.txt",
    "/.well-known/assetlinks.json": "/.well-known/assetlinks.json",
    "/robots.txt": "/robots.txt",
    "/sitemap.txt": "/sitemap-index.xml",
    "/sitemap.xml": "/sitemap-index.xml",
    "/support": "/support",
    "/changelog": "/changelog",
    "/location": "/location",
    # No ur.io page.
    "/aknowledgements.html": "/",
    "/community.html": "/",
    "/economic-model": "/",
    "/extra-room.html": "/",
    "/network.html": "/",
    "/participate": "/",
    "/partner.html": "/",
    "/transparency-report": "/",
    "/trust-and-safety": "/",
    "/warrant-canary": "/",
    "/manifest.json": "/",
    "/.well-known/privacy.txt": "/",
    "/certs/bimi/bringyour_inc.pem": "/",
    "/res-ur/videos/solana_urnetwork_final.mp4": "/",
    "/privacy-policy": "/",
    "/docs/missing": "/",
    "/res/emails": "/",
}


def nginx_block(source, start):
    depth = 0
    for end in range(source.index("{", start), len(source)):
        depth += (source[end] == "{") - (source[end] == "}")
        if depth == 0:
            return source[start:end + 1]
    raise AssertionError("unterminated nginx block")


def server_block(source, marker):
    return nginx_block(source, source.rfind("server {", 0, source.index(marker)))


@unittest.skipUnless(shutil.which("nginx"), "requires nginx (also covered by the image smoke test)")
class LegacyRedirectTest(unittest.TestCase):
    @contextlib.contextmanager
    def nginx(self, mutation=None):
        source = (HERE / "nginx/nginx.conf.j2").read_text()
        successor_map = source.find("map $uri $bringyour_successor")
        block = (nginx_block(source, successor_map) if successor_map >= 0 else "") + "\n" + server_block(
            source, "listen 80 default_server;") + "\n" + server_block(
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
            block = block.replace("root /www/bringyour.com;", f"root {HERE / 'bringyour.com'};")
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
                        if path == "/status":
                            self.assertEqual(status.read_bytes(), response.read())
                        elif code == 200:
                            self.assertEqual(EMAILS.joinpath(path.split("?")[0].removeprefix("/res/emails/"))
                                             .read_bytes(), response.read())
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

    def get(self, port, host, path):
        client = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
        try:
            client.request("GET", path, headers={"Host": host})
            response = client.getresponse()
            return response.status, response.getheader("Location"), response.getheader("Cache-Control"), \
                response.read()
        finally:
            client.close()

    def test_old_email_images_are_served_from_this_image(self):
        self.assertTrue(set(EMAIL_ASSETS) <= {path.name for path in EMAILS.iterdir()})
        with self.nginx() as (_, port, _):
            for host in HOSTS:
                for name in EMAIL_ASSETS:
                    with self.subTest(host=host, name=name):
                        status, location, cache_control, body = self.get(port, host, "/res/emails/" + name)
                        self.assertEqual(status, 200)
                        self.assertIsNone(location)
                        self.assertEqual(cache_control, EMAIL_CACHE_CONTROL)
                        self.assertEqual(body, EMAILS.joinpath(name).read_bytes())

    def test_old_pages_redirect_to_their_ur_io_successor(self):
        with self.nginx() as (_, port, _):
            for host in HOSTS:
                for path, successor in PATH_MAP.items():
                    with self.subTest(host=host, path=path):
                        status, location, _, _ = self.get(port, host, path)
                        self.assertEqual(status, 301)
                        self.assertEqual(location, "https://ur.io" + successor)
                        status, location, _, _ = self.get(port, host, path + "?utm_source=email")
                        self.assertEqual(location, "https://ur.io" + successor + "?utm_source=email")

    def test_actual_image_smoke_assertions_match_routes_once(self):
        with self.nginx() as (root, port, _):
            result, observed = self.run_smoke_assertions(root, port)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertCountEqual(observed, [(host, path) for host in HOSTS for path, _, _ in CASES])

    def test_actual_smoke_rejects_wrong_status_host_and_lost_query(self):
        catch_all = "return 301 https://ur.io$bringyour_successor$is_args$args;"
        for replacement in ("return 302 https://ur.io$bringyour_successor$is_args$args;",
                            "return 301 https://main-mmm.bringyour.com$bringyour_successor$is_args$args;",
                            "return 301 https://ur.io$bringyour_successor;",
                            "return 301 https://ur.io$request_uri;"):
            with self.subTest(replacement=replacement):
                with self.nginx((catch_all, replacement)) as (root, port, _):
                    result, _ = self.run_smoke_assertions(root, port)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("nginx smoke test:", result.stderr)


if __name__ == "__main__":
    unittest.main()
