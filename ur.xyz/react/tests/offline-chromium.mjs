// Chromium launch arguments that keep a browser check on this machine: every
// host name but the local servers fails to resolve, so a request that no stub
// answers (an unlisted host, a popup, a websocket) cannot leave. Requests are
// still issued and observable; page.route stubs answer before any lookup.
export const OFFLINE_CHROMIUM_ARGS = ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1"];
