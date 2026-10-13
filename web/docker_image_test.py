"""Check that immutable site content enters the runtime image only once."""

from pathlib import Path
import re
import stat
import subprocess
import tempfile
import unittest


DOCKERFILE = Path(__file__).with_name("Dockerfile")
SITES = ("preview.ur.xyz",)


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
        self.assertEqual(copies, [f"COPY build/{site} /www/{site}" for site in SITES])
        runtime = stages()[-1]
        site_instructions = [line for line in runtime if "/www" in line]
        self.assertEqual(site_instructions, ["COPY --from=static-sites /www /www"],
                         "later chmod/RUN or another site COPY duplicates the payload layer")
        self.assertFalse(any(line.startswith(("ADD build/", "COPY build/"))
                             and any(site in line for site in SITES) for line in runtime))

    def test_normalization_preserves_content_links_ownership_and_read_only_modes(self):
        commands = [line.removeprefix("RUN ") for line in self.site_stage()
                    if line.startswith("RUN ")]
        self.assertEqual(len(commands), 1)
        with tempfile.TemporaryDirectory(prefix="web-image-modes-") as directory:
            root = Path(directory)
            www = root / "www"
            www.mkdir(mode=0o755)
            external = root / "external"
            external.write_bytes(b"symlinks must not change their targets\n")
            external.chmod(0o600)
            for site in SITES:
                destination = www / site
                destination.mkdir(mode=0o700)
                (destination / "nested").mkdir(mode=0o750)
                (destination / "empty").mkdir(mode=0o700)
                for name, mode in (("index.html", 0o600), ("nested/asset.br", 0o751)):
                    path = destination / name
                    path.write_bytes(f"{site}/{name}\n".encode())
                    path.chmod(mode)
                (destination / "link").symlink_to(external)
            paths = sorted(www.rglob("*"))
            before = {path: (path.lstat().st_uid, path.lstat().st_gid,
                             path.readlink() if path.is_symlink() else
                             path.read_bytes() if path.is_file() else None) for path in paths}
            # Execute the actual Dockerfile normalization against an isolated tree.
            command = commands[0].replace("/www/", f"{www}/")
            try:
                result = subprocess.run(["/bin/sh", "-ec", command], text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                        timeout=10)
                self.assertEqual(result.returncode, 0, result.stdout)
                self.assertEqual(sorted(www.rglob("*")), paths)
                for path in paths:
                    with self.subTest(path=path.relative_to(www)):
                        metadata = path.lstat()
                        self.assertEqual((metadata.st_uid, metadata.st_gid), before[path][:2])
                        if path.is_symlink():
                            self.assertEqual(path.readlink(), before[path][2])
                        elif path.is_dir():
                            self.assertEqual(stat.S_IMODE(metadata.st_mode), 0o555)
                        else:
                            self.assertEqual(stat.S_IMODE(metadata.st_mode), 0o444)
                            self.assertEqual(path.read_bytes(), before[path][2])
                self.assertEqual(stat.S_IMODE(www.stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE(external.stat().st_mode), 0o600)
                self.assertEqual(external.read_bytes(), b"symlinks must not change their targets\n")
            finally:
                for path in paths:
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
