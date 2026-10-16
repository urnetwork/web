"""Check that immutable site content enters the runtime image only once."""

from pathlib import Path
import re
import stat
import subprocess
import tempfile
import unittest


DOCKERFILE = Path(__file__).with_name("Dockerfile")
SCRIPT = Path(__file__).with_name("carry-hashed-assets.sh")
SITES = ("preview.ur.xyz",)
# The paths the site stage's command may touch, all inside the stage.
STAGE_PATHS = ("/usr/local/sbin/carry-hashed-assets", "/carried-assets", "/srv/hashed-assets", "/www")


def stages():
    instructions = re.sub(r"\\\n\s*", " ", DOCKERFILE.read_text()).splitlines()
    result = []
    for line in instructions:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("FROM "):
            result.append([])
        result[-1].append(line)
    return result


class DockerImageTest(unittest.TestCase):
    def site_stage(self):
        matches = [stage for stage in stages() if stage[0].endswith(" AS static-sites")]
        self.assertEqual(len(matches), 1, "normalize sites in a disposable stage")
        return matches[0]

    def test_runtime_copies_normalized_sites_once_without_later_mutation(self):
        stage = self.site_stage()
        self.assertIn("--platform=$BUILDPLATFORM", stage[0])
        copies = [line for line in stage if line.startswith("COPY ")]
        self.assertEqual(copies, [f"COPY build/{site} /www/{site}" for site in SITES] + [
            "COPY build/hashed-assets /srv/hashed-assets",
            "COPY build/carried-assets /carried-assets",
            "COPY --chmod=755 carry-hashed-assets.sh /usr/local/sbin/carry-hashed-assets",
        ])
        runtime = stages()[-1]
        site_instructions = [line for line in runtime if "/www" in line]
        self.assertEqual(site_instructions, ["COPY --from=static-sites /www /www"],
                         "later chmod/RUN or another site COPY duplicates the payload layer")
        self.assertIn("COPY --from=static-sites /srv/hashed-assets /srv/hashed-assets", runtime)
        self.assertFalse(any(line.startswith(("ADD build/", "COPY build/"))
                             and any(site in line for site in SITES) for line in runtime))
        self.assertLess(runtime.index("COPY --from=static-sites /srv/hashed-assets /srv/hashed-assets"),
                        runtime.index("RUN /usr/local/sbin/nginx-smoke-test"))

    def test_stage_merges_carried_bundles_and_leaves_read_only_content(self):
        commands = [line.removeprefix("RUN ") for line in self.site_stage()
                    if line.startswith("RUN ")]
        self.assertEqual(len(commands), 1)
        with tempfile.TemporaryDirectory(prefix="web-image-modes-") as directory:
            root = Path(directory).resolve()
            # Execute the actual Dockerfile command against an isolated tree:
            # every absolute path it names moves under root, and it names no
            # other.
            command = commands[0]
            paths = set(re.findall(r"(?<![\w.-])/[\w./-]+", command))
            self.assertLessEqual({path.rstrip("/") for path in paths}, set(STAGE_PATHS), command)
            for path in STAGE_PATHS:
                target = str(SCRIPT) if path == "/usr/local/sbin/carry-hashed-assets" else f"{root}{path}"
                command = re.sub(rf"(?<![\w.-]){re.escape(path)}(?=[\s/]|$)", target, command)
            www = root / "www"
            www.mkdir(mode=0o755)
            lists = root / "srv/hashed-assets"
            lists.mkdir(parents=True)
            carried = root / "carried-assets"
            external = root / "external"
            external.write_bytes(b"symlinks must not change their targets\n")
            external.chmod(0o600)
            for site in SITES:
                destination = www / site
                destination.mkdir(mode=0o700)
                (destination / "nested").mkdir(mode=0o750)
                (destination / "empty").mkdir(mode=0o700)
                (destination / "_astro").mkdir(mode=0o700)
                for name, mode in (("index.html", 0o600), ("nested/asset.br", 0o751),
                                   ("_astro/own.Owwwwwww.js", 0o640)):
                    path = destination / name
                    path.write_bytes(f"{site}/{name}\n".encode())
                    path.chmod(mode)
                (destination / "link").symlink_to(external)
                (lists / f"{site}.own").write_text("_astro/own.Owwwwwww.js\n")
                (carried / site / "_astro").mkdir(parents=True)
                for name in ("own.Owwwwwww.js", "old.Oldddddd.js"):
                    (carried / site / "_astro" / name).write_bytes(b"the previous release\n")
            try:
                result = subprocess.run(["/bin/sh", "-ec", command], text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                        timeout=30)
                self.assertEqual(result.returncode, 0, result.stdout)
                self.assertFalse(carried.exists(), "the carried staging stays out of the image")
                for site in SITES:
                    destination = www / site
                    # a carried bundle the site lacked is added and listed;
                    # the site's own copy of a shared name stays
                    self.assertEqual((lists / f"{site}.carried").read_text(), "_astro/old.Oldddddd.js\n")
                    self.assertEqual((destination / "_astro/own.Owwwwwww.js").read_bytes(),
                                     f"{site}/_astro/own.Owwwwwww.js\n".encode())
                    self.assertEqual((destination / "_astro/old.Oldddddd.js").read_bytes(),
                                     b"the previous release\n")
                    self.assertEqual((destination / "link").readlink(), external)
                for path in [*www.rglob("*"), *lists.rglob("*")]:
                    with self.subTest(path=path.relative_to(root)):
                        metadata = path.lstat()
                        if path.is_symlink():
                            continue
                        if path.is_dir():
                            self.assertEqual(stat.S_IMODE(metadata.st_mode), 0o555)
                        else:
                            self.assertEqual(stat.S_IMODE(metadata.st_mode), 0o444)
                self.assertEqual(stat.S_IMODE(www.stat().st_mode), 0o555)
                self.assertEqual(stat.S_IMODE(external.stat().st_mode), 0o600)
                self.assertEqual(external.read_bytes(), b"symlinks must not change their targets\n")
            finally:
                for path in [root, *root.rglob("*")]:
                    if path.is_dir() and not path.is_symlink():
                        path.chmod(0o755)

    def test_runtime_retains_status_smoke_binary_and_shutdown_contract(self):
        runtime = stages()[-1]
        for instruction in (
            "ARG TARGETPLATFORM",
            "ARG warp_env",
            "ENV WARP_ENV=$warp_env",
            "COPY build/${WARP_ENV}/status.json /srv/warp/status/status.json",
            "RUN find /srv/warp/status -type d -exec chmod ugo=rx {} +",
            "RUN find /srv/warp/status -type f -exec chmod ugo=r {} +",
            "COPY --chmod=755 nginx-smoke-test.sh /usr/local/sbin/nginx-smoke-test",
            "RUN /usr/local/sbin/nginx-smoke-test",
            "COPY build/$TARGETPLATFORM/web /usr/local/sbin/web",
            "STOPSIGNAL SIGQUIT",
            'CMD ["/usr/local/sbin/web"]',
        ):
            self.assertIn(instruction, runtime)
        self.assertLess(runtime.index("COPY --from=static-sites /www /www"),
                        runtime.index("RUN /usr/local/sbin/nginx-smoke-test"))


if __name__ == "__main__":
    unittest.main()
