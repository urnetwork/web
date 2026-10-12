// The browser checks (the parity suites, the responsive shell, the static
// affordances and the network privacy guard) run against local servers only.
// Each launches Chromium with OFFLINE_CHROMIUM_ARGS, so a host that no stub
// answers fails to resolve instead of reaching production, the chain or a
// third party. The privacy guard answers the hosts allowed on each route
// itself and still records every host requested.
//
// Usage: node --test tests/offline-chromium.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { OFFLINE_CHROMIUM_ARGS } from "./offline-chromium.mjs";

const SCRIPTS = ["network-privacy.mjs", "visual-parity.mjs", "interactive-wiring.mjs", "responsive-shell.mjs", "static-affordances.mjs"];
const source = (name) => readFileSync(new URL(name, import.meta.url), "utf8");

test("the browser resolves only the local servers", () => {
  assert.deepEqual(OFFLINE_CHROMIUM_ARGS, ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1"]);
});

test("every browser check launches Chromium offline", () => {
  for (const name of SCRIPTS) {
    const text = source(name);
    const launches = text.split("chromium.launch(").length - 1;
    const offline = text.match(/chromium\.launch\(\{\s*args: OFFLINE_CHROMIUM_ARGS[,\s}]/g) || [];
    assert.ok(launches > 0, name);
    assert.equal(offline.length, launches, name);
  }
});

test("the privacy guard answers the hosts allowed on each route and records every request", () => {
  const guard = source("network-privacy.mjs");
  assert.match(guard, /page\.context\(\)\.route\(\(url\) => !isLocal\(url\.host\) && isAllowed\(url\.host, route\), \(r\) => r\.fulfill\(\{ json: \{\} \}\)/);
  assert.match(guard, /page\.on\("request", /);
});
