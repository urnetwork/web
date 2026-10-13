"""Exercise production make recipes without npm, browsers or image publication."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[1]
STUB = r'''#!/bin/sh
printf '%s:%s\n' "${0##*/}" "$*" >> "$EVENTS"
if [ "$*" = "$FAIL_COMMAND" ]; then exit 37; fi
case "${0##*/}:$*" in
    'npx:astro build')
        mkdir -p "build/$UR_ENV"
        printf 'fresh site\n' > "build/$UR_ENV/index.html" ;;
    'node:scripts/precompress.mjs '*)
        printf 'compressed\n' > "$2/index.html.br" ;;
esac
'''


class BuildChecksTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="web-build-checks-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.events = self.root / "events"
        self.events.touch()
        self.astro = self.root / "web/ur.xyz/astro"
        self.astro.mkdir(parents=True)
        (self.astro.parent / "react").mkdir()
        shutil.copy(REPO / "ur.xyz/astro/Makefile", self.astro / "Makefile")
        self.service = self.root / "web/web"
        self.service.mkdir()
        shutil.copy(REPO / "web/Makefile", self.service / "Makefile")
        fake_bin = self.root / "bin"
        fake_bin.mkdir()
        for name in ("node", "npm", "npx", "python"):
            command = fake_bin / name
            command.write_text(STUB)
            command.chmod(0o755)
        nvm = self.root / "nvm"
        nvm.mkdir()
        (nvm / "nvm.sh").write_text('nvm() { printf "nvm:%s\\n" "$*" >> "$EVENTS"; }\n')
        self.env = {**os.environ, "PATH": f"{fake_bin}:{os.environ['PATH']}",
                    "EVENTS": str(self.events), "FAIL_COMMAND": "",
                    "NVM_DIR": str(nvm), "WARP_HOME": str(self.root),
                    "BRINGYOUR_HOME": str(self.root), "URNETWORK_ROOT": str(self.root)}
        self.env.pop("WEB_BUILD_CHECKS", None)
        self.env.pop("MAKEFLAGS", None)

    def run_make(self, target, *, checks=None, failure="", service=False):
        self.events.write_text("")
        env = {**self.env, "FAIL_COMMAND": failure}
        if checks is not None:
            env["WEB_BUILD_CHECKS"] = checks
        return subprocess.run(["make", target], cwd=self.service if service else self.astro,
                              env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                              timeout=15)

    def test_default_builds_remain_checked_and_compressed(self):
        for target in ("main", "canary"):
            with self.subTest(target=target):
                result = self.run_make(f"build-{target}")
                self.assertEqual(result.returncode, 0, result.stdout)
                events = self.events.read_text()
                self.assertIn("node:../react/tests/visual-parity.mjs\n", events)
                self.assertIn(f"node:scripts/seo-audit.mjs build/{target}\n", events)
                self.assertTrue((self.astro / f"build/{target}/index.html.br").is_file())

    def test_failed_gate_stops_before_compression(self):
        result = self.run_make("build-main", failure="../react/tests/visual-parity.mjs")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("node:scripts/precompress.mjs", self.events.read_text())

    def test_artifact_build_skips_gates_but_keeps_generation_and_compression(self):
        for target in ("main", "canary"):
            with self.subTest(target=target):
                result = self.run_make(f"build-{target}", checks="0",
                                       failure="../react/tests/visual-parity.mjs")
                self.assertEqual(result.returncode, 0, result.stdout)
                events = self.events.read_text()
                self.assertNotIn("playwright", events)
                self.assertNotIn("audit.mjs", events)
                self.assertNotIn("tests/", events)
                self.assertIn("node:../scripts/generate-legal.mjs\n", events)
                self.assertIn(f"node:scripts/modulepreload.mjs build/{target}\n", events)
                self.assertTrue((self.astro / f"build/{target}/index.html.br").is_file())

    def test_preflight_forces_checks(self):
        result = self.run_make("check", checks="0", service=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        events = self.events.read_text()
        self.assertIn("node:../react/tests/visual-parity.mjs\n", events)
        self.assertIn("node:scripts/seo-audit.mjs build/main\n", events)

    def test_preflight_stops_on_a_failed_gate(self):
        result = self.run_make("check", failure="../react/tests/visual-parity.mjs", service=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("node:scripts/precompress.mjs", self.events.read_text())
        self.assertFalse((self.service / "build/preview.ur.xyz").exists())

    def test_final_build_forwards_skip_and_stages_fresh_artifacts(self):
        previous = self.service / "build/preview.ur.xyz"
        previous.mkdir(parents=True)
        (previous / "stale.html").write_text("previous build")
        result = self.run_make("build-preview", checks="0", service=True,
                               failure="../react/tests/visual-parity.mjs")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn("tests/", self.events.read_text())
        self.assertEqual((self.service / "build/preview.ur.xyz/index.html").read_text(), "fresh site\n")
        self.assertFalse((self.service / "build/preview.ur.xyz/stale.html").exists())

    def test_web_builds_no_mmm_site(self):
        # The mmm sites belong to the mmm service (mmm/mmm). This tree has no
        # mmm checkout, and web's builds must not need one.
        self.assertFalse((self.root / "mmm").exists())
        result = self.run_make("build-preview", checks="0", service=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(sorted(path.name for path in (self.service / "build").iterdir()),
                         ["preview.ur.xyz"])
        makefile = (REPO / "web/Makefile").read_text()
        for reference in ("MMM_HOME", "WARP_HOME}/mmm", "preview.ur.io", "BRINGYOUR_SITE_DIR",
                          "UR_NETWORK_SITE_DIR", "UR_IO_SITE_DIR", "pandoc", "redocly"):
            self.assertNotIn(reference, makefile)


if __name__ == "__main__":
    unittest.main()
