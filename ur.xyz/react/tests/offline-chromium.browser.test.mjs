// OFFLINE_CHROMIUM_ARGS in a real Chromium, with a proxy named in the
// environment as on many machines. A page on a local server asks for two
// external hosts. Without the arguments both requests go to the proxy, which
// would resolve and reach them; with them neither does, and both fail to
// resolve while the page still sees them requested. The proxy here is a local
// server that refuses everything.
//
// Run: node --test tests/offline-chromium.browser.test.mjs
import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { chromium } from "playwright-core";
import { OFFLINE_CHROMIUM_ARGS } from "./offline-chromium.mjs";

const PAGE = '<img src="https://cdn.offline-check.example/a.png"><script>fetch("http://api.offline-check.example/b").catch(() => {});</script><p>local</p>';
const PROXY_VARIABLES = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"];

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

async function load(port, args) {
  const browser = await chromium.launch({ args });
  try {
    const page = await browser.newPage();
    const requested = [];
    const failed = {};
    page.on("request", (request) => requested.push(new URL(request.url()).host));
    page.on("requestfailed", (request) => { failed[new URL(request.url()).host] = request.failure()?.errorText; });
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    assert.equal(await page.textContent("p"), "local");
    return { requested, failed };
  } finally {
    await browser.close();
  }
}

test("external requests never reach a proxy from the environment and fail to resolve", { timeout: 60_000 }, async (t) => {
  const proxied = [];
  const proxy = http.createServer((request, response) => { proxied.push(request.url); response.writeHead(403).end(); });
  proxy.on("connect", (request, socket) => { proxied.push(request.url); socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); });
  const proxyPort = await listen(proxy);
  t.after(() => proxy.close());
  const site = http.createServer((_request, response) => response.writeHead(200, { "content-type": "text/html" }).end(PAGE));
  const sitePort = await listen(site);
  t.after(() => site.close());
  const saved = PROXY_VARIABLES.map((name) => [name, process.env[name]]);
  t.after(() => { for (const [name, value] of saved) value === undefined ? delete process.env[name] : process.env[name] = value; });
  for (const name of PROXY_VARIABLES) process.env[name] = `http://127.0.0.1:${proxyPort}`;

  // control: Chromium takes the proxy from the environment
  const plain = await load(sitePort, []);
  assert.deepEqual(proxied.sort(), ["cdn.offline-check.example:443", "http://api.offline-check.example/b"]);
  assert.ok(plain.requested.includes("cdn.offline-check.example") && plain.requested.includes("api.offline-check.example"));

  proxied.length = 0;
  const offline = await load(sitePort, OFFLINE_CHROMIUM_ARGS);
  assert.deepEqual(proxied, []);
  assert.ok(offline.requested.includes("cdn.offline-check.example") && offline.requested.includes("api.offline-check.example"));
  assert.deepEqual(offline.failed, {
    "cdn.offline-check.example": "net::ERR_NAME_NOT_RESOLVED",
    "api.offline-check.example": "net::ERR_NAME_NOT_RESOLVED",
  });
});
