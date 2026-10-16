"""Exercise carry-hashed-assets.sh with a fake docker registry and warpctl.

The fake docker resolves image references to directories that hold an image's
files, runs the script's own export step for an extraction build, and records
a push as a new image, so stage, merge and publish run as they do in a release.
"""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SERVICE = Path(__file__).resolve().parent
SCRIPT = SERVICE / "carry-hashed-assets.sh"
# web serves one site; the second, other.site, exercises the script with several
SITES = ("preview.ur.xyz", "other.site")

FAKE_DOCKER = r'''#!/usr/bin/env python3
import os, shutil, subprocess, sys
from pathlib import Path

registry = Path(os.environ["FAKE_REGISTRY"])
args = sys.argv[1:]
with open(os.environ["FAKE_LOG"], "a") as log:
    log.write("docker " + " ".join(args) + "\n")

def root(ref):
    return registry / ref.replace("/", "%").replace(":", "@")

if args[:3] == ["buildx", "imagetools", "inspect"]:
    sys.exit(0 if root(args[3]).is_dir() else 1)
if args[:2] != ["buildx", "build"]:
    sys.exit("fake docker: unexpected " + " ".join(args))
options, context = args[2:-1], args[-1]
build_args, output, tag, push, dockerfile = {}, None, None, False, None
i = 0
while i < len(options):
    option = options[i]
    if option == "--push":
        push = True
    elif option in ("--build-arg", "--output", "-t", "--file", "--platform", "--progress"):
        value = options[i + 1]
        i += 1
        if option == "--build-arg":
            key, _, arg = value.partition("=")
            build_args[key] = arg
        elif option == "--output":
            output = value
        elif option == "-t":
            tag = value
        elif option == "--file":
            dockerfile = value
    i += 1
if output:
    # an extraction build: the script's export step against the image's files
    source = root(build_args["CARRY_IMAGE"])
    if not source.is_dir():
        sys.exit("fake docker: no image " + build_args["CARRY_IMAGE"])
    assert dockerfile == "-", dockerfile
    assert "export /carry /out $CARRY_SITES" in sys.stdin.read()
    dest = output.split("dest=", 1)[1]
    result = subprocess.run([str(Path(context) / "carry-hashed-assets.sh"), "export", str(source), dest]
                            + build_args["CARRY_SITES"].split())
    sys.exit(result.returncode)
if push and tag:
    # a companion image: FROM scratch, COPY . /
    assert Path(dockerfile).read_text() == "FROM scratch\nCOPY . /\n"
    shutil.copytree(context, root(tag))
    sys.exit(0)
sys.exit("fake docker: unexpected build " + " ".join(args))
'''

FAKE_WARPCTL = r'''#!/usr/bin/env python3
import os, sys
with open(os.environ["FAKE_LOG"], "a") as log:
    log.write("warpctl " + " ".join(sys.argv[1:]) + "\n")
if os.environ.get("FAKE_WARPCTL_FAIL"):
    sys.exit("panic: dynamo unavailable")
sys.stdout.write(os.environ.get("FAKE_VERSIONS", ""))
'''


class CarryHashedAssetsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="carry-hashed-assets-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.registry = self.root / "registry"
        self.registry.mkdir()
        self.log = self.root / "log"
        self.log.touch()
        bin_dir = self.root / "bin"
        bin_dir.mkdir()
        for name, source in (("docker", FAKE_DOCKER), ("warpctl", FAKE_WARPCTL)):
            (bin_dir / name).write_text(source)
            (bin_dir / name).chmod(0o755)
        self.service = self.root / "service"
        self.service.mkdir()
        shutil.copy(SCRIPT, self.service / SCRIPT.name)
        self.env = {**os.environ, "PATH": f"{bin_dir}:{os.environ['PATH']}",
                    "FAKE_REGISTRY": str(self.registry), "FAKE_LOG": str(self.log),
                    "CARRY_PLATFORMS": "linux/arm64/v8,linux/amd64",
                    "WARP_ENV": "main", "WARP_SERVICE": "web",
                    "WARP_DOCKER_NAMESPACE": "bringyour", "WARP_DOCKER_IMAGE": "main-web"}
        for name in ("CARRY_IMAGES", "FAKE_VERSIONS", "FAKE_WARPCTL_FAIL"):
            self.env.pop(name, None)

    def run_script(self, *args, check=True, **env):
        result = subprocess.run([str(self.service / SCRIPT.name), *args], cwd=self.service,
                                env={**self.env, **env}, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
        if check:
            self.assertEqual(result.returncode, 0, result.stdout)
        return result

    def image_root(self, ref):
        return self.registry / ref.replace("/", "%").replace(":", "@")

    def site_build(self, build, site, bundles, pages=("index.html",)):
        directory = build / site
        (directory / "_astro").mkdir(parents=True, exist_ok=True)
        for page in pages:
            (directory / page).write_text(f"{site} page\n")
        for name in bundles:
            (directory / "_astro" / name).write_text(f"{site} {name}\n")
        return directory

    def image(self, ref, sites, own=None):
        """An image's files: sites maps a site to its bundles; own, when given,
        maps a site to the bundles its .own list names (the others it carried)."""
        image_root = self.image_root(ref)
        for site, bundles in sites.items():
            self.site_build(image_root / "www", site, bundles)
            if own is not None:
                lists = image_root / "srv/hashed-assets"
                lists.mkdir(parents=True, exist_ok=True)
                (lists / f"{site}.own").write_text("".join(f"_astro/{name}\n" for name in sorted(own[site])))
        return image_root

    def staged(self, build, site):
        directory = build / "carried-assets" / site
        return sorted(str(path.relative_to(directory)) for path in directory.rglob("*") if path.is_file())

    def test_stage_lists_this_builds_bundles_and_carries_none_unless_named(self):
        build = self.service / "build"
        self.site_build(build, "preview.ur.xyz", ["b.Bbbbbbbb.js", "a.Aaaaaaaa.css", "a.Aaaaaaaa.css.br"])
        self.site_build(build, "other.site", [])
        self.run_script("stage", str(build), *SITES)
        self.assertEqual((build / "hashed-assets/preview.ur.xyz.own").read_text(),
                         "_astro/a.Aaaaaaaa.css\n_astro/a.Aaaaaaaa.css.br\n_astro/b.Bbbbbbbb.js\n")
        self.assertEqual((build / "hashed-assets/other.site.own").read_text(), "")
        for site in SITES:
            self.assertEqual(self.staged(build, site), [])
        self.assertNotIn("warpctl", self.log.read_text())
        self.assertNotIn("docker", self.log.read_text())

    def test_stage_carries_only_the_own_bundles_of_every_deployed_block(self):
        # g1 runs a release with a companion image; beta runs another without
        # one, which carried a bundle of its own predecessor.
        self.image("bringyour/main-web:hashed-assets-2026.10.15-100", {"preview.ur.xyz": ["g1.G1111111.js"]},
                   own={"preview.ur.xyz": ["g1.G1111111.js"]})
        self.image("bringyour/main-web:2026.10.15-100", {"preview.ur.xyz": ["g1.G1111111.js", "big.Bbbbbbbb.mp4.js"]},
                   own={"preview.ur.xyz": ["g1.G1111111.js", "big.Bbbbbbbb.mp4.js"]})
        self.image("bringyour/main-web:2026.10.14-hotfix-99",
                   {"preview.ur.xyz": ["beta.Beta1111.js", "older.Old11111.js"], "other.site": ["lag.Lag11111.js"]},
                   own={"preview.ur.xyz": ["beta.Beta1111.js"], "other.site": ["lag.Lag11111.js"]})
        build = self.service / "build"
        self.site_build(build, "preview.ur.xyz", ["new.New11111.js", "beta.Beta1111.js"])
        self.site_build(build, "other.site", ["lag.Lag22222.js"])
        versions = ("[web]\n[web][beta] 2026.10.14-hotfix+99\n[web][g1] 2026.10.15+100\n"
                    "[web][g2] \n[other][g1] 2020.1.1+1\n")
        result = self.run_script("stage", str(build), *SITES, CARRY_IMAGES="deployed", FAKE_VERSIONS=versions)

        self.assertIn("warpctl ls versions main web\n", self.log.read_text())
        # the companion of the g1 release, never its whole image
        self.assertIn("CARRY_IMAGE=bringyour/main-web:hashed-assets-2026.10.15-100", self.log.read_text())
        self.assertNotIn("CARRY_IMAGE=bringyour/main-web:2026.10.15-100 ", self.log.read_text())
        self.assertIn("bringyour/main-web:2026.10.14-hotfix-99 has no hashed-assets companion", result.stdout)
        self.assertNotIn("2020.1.1", self.log.read_text())
        # beta.Beta1111.js is in this build too, so only g1's bundle is staged
        self.assertEqual(self.staged(build, "preview.ur.xyz"), ["_astro/g1.G1111111.js"])
        self.assertEqual(self.staged(build, "other.site"), ["_astro/lag.Lag11111.js"])
        self.assertIn("bringyour/main-web:2026.10.14-hotfix-99: 1 hashed files of preview.ur.xyz, "
                      "0 of them not in this build", result.stdout)
        self.assertIn("bringyour/main-web:hashed-assets-2026.10.15-100: 1 hashed files of preview.ur.xyz, "
                      "1 of them not in this build", result.stdout)

    def test_stage_reads_an_image_from_before_the_lists_whole(self):
        self.image("bringyour/main-web:2026.10.1-50", {"preview.ur.xyz": ["old.Old11111.js", "old.Old11111.js.gz"]})
        build = self.service / "build"
        self.site_build(build, "preview.ur.xyz", ["new.New11111.js"])
        self.site_build(build, "other.site", [])
        result = self.run_script("stage", str(build), *SITES, CARRY_IMAGES="bringyour/main-web:2026.10.1-50")
        self.assertEqual(self.staged(build, "preview.ur.xyz"),
                         ["_astro/old.Old11111.js", "_astro/old.Old11111.js.gz"])
        self.assertEqual(self.staged(build, "other.site"), [])
        self.assertIn("has no other.site", result.stdout)

    def test_stage_with_nothing_deployed_carries_nothing(self):
        build = self.service / "build"
        for site in SITES:
            self.site_build(build, site, ["x.Xxxxxxxx.js"])
        result = self.run_script("stage", str(build), *SITES, CARRY_IMAGES="deployed",
                                 FAKE_VERSIONS="[web]\n[web][beta] \n[web][g1] \n")
        self.assertIn("carrying no image's hashed files", result.stdout)
        for site in SITES:
            self.assertEqual(self.staged(build, site), [])

    def test_stage_fails_when_the_deployed_versions_are_unknown(self):
        build = self.service / "build"
        for site in SITES:
            self.site_build(build, site, [])
        result = self.run_script("stage", str(build), *SITES, check=False, CARRY_IMAGES="deployed",
                                 FAKE_WARPCTL_FAIL="1")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("warpctl could not list the versions deployed to main web", result.stdout)
        env = {name: "" for name in ("WARP_ENV", "WARP_SERVICE", "WARP_DOCKER_NAMESPACE", "WARP_DOCKER_IMAGE")}
        result = self.run_script("stage", str(build), *SITES, check=False, CARRY_IMAGES="deployed", **env)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("needs WARP_ENV", result.stdout)

    def test_stage_fails_when_an_image_cannot_be_read(self):
        build = self.service / "build"
        for site in SITES:
            self.site_build(build, site, [])
        result = self.run_script("stage", str(build), *SITES, check=False,
                                 CARRY_IMAGES="bringyour/main-web:2026.10.15-404")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("could not read the hashed files of bringyour/main-web:2026.10.15-404", result.stdout)

    def test_a_list_that_leaves_the_hashed_directory_is_refused(self):
        image_root = self.image("evil:1", {"preview.ur.xyz": ["x.Xxxxxxxx.js"]}, own={"preview.ur.xyz": []})
        (image_root / "srv/hashed-assets/preview.ur.xyz.own").write_text("_astro/../../index.html\n")
        build = self.service / "build"
        for site in SITES:
            self.site_build(build, site, [])
        result = self.run_script("stage", str(build), *SITES, check=False, CARRY_IMAGES="evil:1")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("which is not a hashed file", result.stdout)
        self.assertEqual(self.staged(build, "preview.ur.xyz"), [])

    def test_merge_adds_only_the_bundles_a_site_lacks_and_lists_them(self):
        www = self.root / "www"
        site = self.site_build(www, "preview.ur.xyz", ["same.Ssssssss.js", "own.Owwwwwww.js"])
        self.site_build(www, "other.site", [])
        lists = self.root / "lists"
        lists.mkdir()
        (lists / "preview.ur.xyz.own").write_text("_astro/own.Owwwwwww.js\n_astro/same.Ssssssss.js\n")
        (lists / "other.site.own").write_text("")
        carried = self.root / "carried"
        self.site_build(carried, "preview.ur.xyz", ["same.Ssssssss.js", "old.Oldddddd.js", "old.Oldddddd.js.br"],
                        pages=())
        (carried / "preview.ur.xyz/_astro/same.Ssssssss.js").write_text("the previous build's copy\n")
        self.run_script("merge", str(carried), str(www), str(lists), *SITES)
        self.assertEqual((lists / "preview.ur.xyz.carried").read_text(),
                         "_astro/old.Oldddddd.js\n_astro/old.Oldddddd.js.br\n")
        self.assertEqual((lists / "other.site.carried").read_text(), "")
        self.assertEqual((site / "_astro/same.Ssssssss.js").read_text(), "preview.ur.xyz same.Ssssssss.js\n")
        self.assertEqual((site / "_astro/old.Oldddddd.js").read_text(), "preview.ur.xyz old.Oldddddd.js\n")

    def test_merge_refuses_a_list_that_is_not_the_build(self):
        www = self.root / "www"
        self.site_build(www, "preview.ur.xyz", ["own.Owwwwwww.js", "late.Lateeeee.js"])
        lists = self.root / "lists"
        lists.mkdir()
        (lists / "preview.ur.xyz.own").write_text("_astro/own.Owwwwwww.js\n")
        result = self.run_script("merge", str(self.root / "carried"), str(www), str(lists), "preview.ur.xyz",
                                 check=False)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("does not list the hashed files", result.stdout)

    def test_publish_pushes_only_this_builds_bundles(self):
        build = self.service / "build"
        self.site_build(build, "preview.ur.xyz", ["own.Owwwwwww.js"])
        self.site_build(build, "other.site", ["lag.Laaaaaaa.js"])
        self.run_script("stage", str(build), *SITES)
        # a carried bundle staged beside the build is not the build's own
        self.site_build(build / "carried-assets", "preview.ur.xyz", ["old.Oldddddd.js"], pages=())
        self.run_script("publish", "bringyour/main-web:hashed-assets-2026.10.15-100", str(build), *SITES)
        companion = self.image_root("bringyour/main-web:hashed-assets-2026.10.15-100")
        files = sorted(str(path.relative_to(companion)) for path in companion.rglob("*") if path.is_file())
        self.assertEqual(files, ["srv/hashed-assets/other.site.own", "srv/hashed-assets/preview.ur.xyz.own",
                                 "www/other.site/_astro/lag.Laaaaaaa.js", "www/preview.ur.xyz/_astro/own.Owwwwwww.js"])
        self.assertIn("--platform linux/arm64/v8,linux/amd64", self.log.read_text())

    def test_three_releases_carry_one_back_and_never_accumulate(self):
        """Each release is built, its companion published, and the next built
        while it is deployed: a release carries its predecessor's bundles and
        nothing older."""
        bundles = {1: ["shared.Shhhhhhh.js", "r1.R1111111.js"],
                   2: ["shared.Shhhhhhh.js", "r2.R2222222.js"],
                   3: ["shared.Shhhhhhh.js", "r3.R3333333.js"]}
        deployed = None
        for release in (1, 2, 3):
            build = self.service / "build"
            shutil.rmtree(build, ignore_errors=True)
            self.site_build(build, "preview.ur.xyz", bundles[release])
            self.site_build(build, "other.site", [])
            versions = f"[web][g1] 2026.10.{deployed}+{deployed}\n" if deployed else "[web][g1] \n"
            self.run_script("stage", str(build), *SITES, CARRY_IMAGES="deployed", FAKE_VERSIONS=versions)
            # the image build: the static stage's merge
            image_root = self.image_root(f"bringyour/main-web:2026.10.{release}-{release}")
            shutil.copytree(build / "preview.ur.xyz", image_root / "www/preview.ur.xyz")
            shutil.copytree(build / "other.site", image_root / "www/other.site")
            shutil.copytree(build / "hashed-assets", image_root / "srv/hashed-assets")
            self.run_script("merge", str(build / "carried-assets"), str(image_root / "www"),
                            str(image_root / "srv/hashed-assets"), *SITES)
            self.run_script("publish", f"bringyour/main-web:hashed-assets-2026.10.{release}-{release}",
                            str(build), *SITES)
            served = sorted(path.name for path in (image_root / "www/preview.ur.xyz/_astro").iterdir())
            expected = set(bundles[release]) | (set(bundles[deployed]) if deployed else set())
            self.assertEqual(served, sorted(expected), f"release {release}")
            carried = (image_root / "srv/hashed-assets/preview.ur.xyz.carried").read_text().split()
            self.assertEqual(carried, [f"_astro/r{deployed}.R{str(deployed) * 7}.js"] if deployed else [])
            deployed = release


if __name__ == "__main__":
    unittest.main()
