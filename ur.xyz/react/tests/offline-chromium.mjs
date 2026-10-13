// Chromium launch arguments that keep a browser check on this machine: it
// connects directly, never through a proxy from the environment (which would
// resolve and reach any host for it), and every host name but the local
// servers fails to resolve. So a request that no stub answers (an unlisted
// host, a popup, a websocket) cannot leave. Requests are still issued and
// observable; page.route stubs answer before any lookup.
export const OFFLINE_CHROMIUM_ARGS = [
  "--proxy-server=direct://",
  "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1",
];
