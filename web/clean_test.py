"""Run the real service init/clean recipes without touching shared host caches."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[1]


class CleanTest(unittest.TestCase):
    def check_service(self, service, outputs, uses_nvm):
        with tempfile.TemporaryDirectory(prefix="web-clean-") as temporary:
            root = Path(temporary)
            component = root / service
            component.mkdir()
            # No recipe extraction or rewriting: exercise the production file.
            shutil.copyfile(REPO / service / "Makefile", component / "Makefile")
            for output in outputs:
                directory = component / output / "nested"
                directory.mkdir(parents=True)
                (directory / "stale-output").write_text("old build")
            source = component / "main.go"
            source.write_text("source must survive")
            unrelated = root / "other-component/build/output"
            unrelated.parent.mkdir(parents=True)
            unrelated.write_text("unrelated build")
            caches = {key: root / key.lower() for key in ("GOCACHE", "GOMODCACHE")}
            for cache in caches.values():
                cache.mkdir()
                (cache / "sentinel").write_text("shared cache")
            events = root / "events"
            events.touch()
            fake_bin = root / "bin"
            fake_bin.mkdir()
            for name in ("pip", "go"):
                executable = fake_bin / name
                executable.write_text(
                    '#!/bin/sh\nprintf "%s:%s\\n" "${0##*/}" "$*" >> "$EVENTS"\n'
                    + ("exit 97\n" if name == "go" else "exit 0\n"))
                executable.chmod(0o755)
            nvm = root / "nvm"
            nvm.mkdir()
            (nvm / "nvm.sh").write_text(
                'nvm() { printf "nvm:%s\\n" "$*" >> "$EVENTS"; }\n')
            env = {**os.environ, "PATH": f"{fake_bin}:{os.environ['PATH']}",
                   "EVENTS": str(events), "NVM_DIR": str(nvm),
                   **{key: str(path) for key, path in caches.items()}}
            for key in ("MAKEFLAGS", "MFLAGS", "MAKEOVERRIDES"):
                env.pop(key, None)
            result = subprocess.run(["make", "--no-print-directory", "init", "clean"],
                                    cwd=component, env=env, text=True, capture_output=True,
                                    timeout=15)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            calls = events.read_text().splitlines()
            self.assertIn("pip:install -r ../requirements.txt", calls)
            self.assertEqual(any(call.startswith("nvm:install ") for call in calls), uses_nvm)
            self.assertFalse(any(call.startswith("go:") for call in calls), calls)
            for cache in caches.values():
                self.assertEqual((cache / "sentinel").read_text(), "shared cache")
            for output in outputs:
                self.assertFalse((component / output).exists(), output)
            self.assertEqual(source.read_text(), "source must survive")
            self.assertEqual(unrelated.read_text(), "unrelated build")

    def test_web_init_and_clean_preserve_shared_go_caches(self):
        self.check_service("web", ("build",), uses_nvm=True)

    def test_manager_init_and_clean_preserve_shared_go_caches(self):
        self.check_service("manager", ("build", "dist"), uses_nvm=False)


if __name__ == "__main__":
    unittest.main()
