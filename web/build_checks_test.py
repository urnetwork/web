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
    pandoc:*)
        [ "$#" = 7 ] && [ "$1 $2 $3 $4 $6" = '-f markdown -t plain -o' ] || exit 41
        cp "$5" "$7" ;;
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
        for name in ("node", "npm", "npx", "python", "pandoc"):
            command = fake_bin / name
            command.write_text(STUB)
            command.chmod(0o755)
        nvm = self.root / "nvm"
        nvm.mkdir()
        (nvm / "nvm.sh").write_text('nvm() { printf "nvm:%s\\n" "$*" >> "$EVENTS"; }\n')
        other = self.root / "mmm/ur.io/astro"
        other.mkdir(parents=True)
        (other / "Makefile").write_text(""".PHONY: generate-locales clean build-main
generate-locales:
\t@printf 'ur.io:locales:%s\\n' "$$URNETWORK_ROOT" >> "$$EVENTS"
\t@test "$$FAIL_COMMAND" != ur.io-locales
clean:
\trm -rf build
build-main:
\t@printf 'ur.io:checks:%s\\n' "$(WEB_BUILD_CHECKS)" >> "$$EVENTS"
\tmkdir -p build/main
\tprintf 'fresh ur.io\\n' > build/main/index.html
""")
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

    def test_preflight_forces_checks_after_locale_generation(self):
        result = self.run_make("check", checks="0", service=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        events = self.events.read_text()
        self.assertLess(events.index(f"ur.io:locales:{self.root}\n"),
                        events.index("node:../react/tests/visual-parity.mjs\n"))
        self.assertIn("ur.io:checks:1\n", events)

    def test_preflight_stops_on_locale_failure(self):
        result = self.run_make("check", failure="ur.io-locales", service=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("npx:astro build", self.events.read_text())

    def test_final_build_forwards_skip_and_stages_fresh_artifacts(self):
        for site in ("ur.xyz", "ur.io"):
            previous = self.service / f"build/preview.{site}"
            previous.mkdir(parents=True)
            (previous / "stale.html").write_text("previous build")
        result = self.run_make("build-preview", checks="0", service=True,
                               failure="../react/tests/visual-parity.mjs")
        self.assertEqual(result.returncode, 0, result.stdout)
        events = self.events.read_text()
        self.assertNotIn("tests/", events)
        self.assertIn("ur.io:checks:0\n", events)
        self.assertEqual((self.service / "build/preview.ur.xyz/index.html").read_text(), "fresh site\n")
        self.assertEqual((self.service / "build/preview.ur.io/index.html").read_text(), "fresh ur.io\n")
        for site in ("ur.xyz", "ur.io"):
            self.assertFalse((self.service / f"build/preview.{site}/stale.html").exists())

    def prepare_external_sites(self):
        for site in ("bringyour.com", "ur.network"):
            directory = self.root / "mmm" / site
            (directory / "build").mkdir(parents=True)
            (directory / "gen.py").touch()
            (directory / "build/index.html").write_text(f"{site}\n")
        legal = self.root / "mmm/ur.io/docs/legal"
        legal.mkdir(parents=True)
        for name in ("privacy", "terms", "vdp"):
            (legal / f"{name}.md").write_text(f"Current {name} document\n")
        return legal

    def test_external_sites_build_without_the_retired_docs_checkout(self):
        legal = self.prepare_external_sites()
        self.assertFalse((self.root / "docs").exists())
        result = self.run_make("build_external_sites", service=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        for name in ("privacy", "terms", "vdp"):
            self.assertEqual((self.service / f"build/bringyour.com/{name}.txt").read_text(),
                             (legal / f"{name}.md").read_text())

    def test_missing_current_legal_document_fails_even_with_an_archived_copy(self):
        legal = self.prepare_external_sites()
        archived = self.root / "docs/legal"
        archived.mkdir(parents=True)
        for name in ("privacy", "terms", "vdp"):
            (archived / f"{name}.md").write_text(f"Archived {name} document\n")
        for name in ("privacy", "terms", "vdp"):
            with self.subTest(document=name):
                source = legal / f"{name}.md"
                content = source.read_text()
                source.unlink()
                result = self.run_make("build_external_sites", service=True)
                source.write_text(content)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertFalse((self.service / "build/bringyour.com").exists())

    def test_legal_conversion_failure_stops_site_staging(self):
        legal = self.prepare_external_sites()
        failure = (f"-f markdown -t plain {legal}/terms.md -o "
                   f"{self.root}/mmm/bringyour.com/build/terms.txt")
        result = self.run_make("build_external_sites", service=True, failure=failure)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("Error 37", result.stdout)
        self.assertNotIn(f"{legal}/vdp.md", self.events.read_text())
        self.assertFalse((self.service / "build/bringyour.com").exists())


if __name__ == "__main__":
    unittest.main()
