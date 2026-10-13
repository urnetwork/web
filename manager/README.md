# URnetwork Client Manager (Beta)

Web dashboard for managing URnetwork clients, providers, wallets, and network
statistics. Built with React 19, Vite, Tailwind CSS, and Chart.js.

## Development

Create an `.env` file and add `VITE_API_BASE=/api`, so the dev server proxies
API requests (see `vite.config.ts`).

```sh
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npm test         # node --experimental-strip-types --test tests/*.test.mjs
```

Node `>=22.6` is required (`engines` in `package.json`; the Makefile builds with
v22.14.0). The tests import the TypeScript sources directly, which needs Node's
type stripping: the flag in `npm test` exists from Node 22.6 (older versions stop
on it), is needed before Node 22.18, and does nothing after.

## Approving a native app (`/login-app`)

A native app (today: URnetwork for Windows) can ask a person who is signed in
here to approve its sign-in. The app opens `https://manager.bringyour.com/login-app`
in the person's browser. The page shows which network would be signed in, the
person approves or cancels, and the page answers by navigating to a fixed
custom-scheme address (`urnetwork://auth?...`) that the system hands to the
app. The credential travels inside a NaCl box that only the app can open, and
the app redeems it with the existing `POST /auth/code-login`. No server changes.

This is **not** the browser-extension flow. `/login-extension`
(`LoginExtension.tsx`, `extensionAuth.ts`) is a separate contract that published
browser extensions depend on. It is frozen, and nothing here applies to it.

The contract lives in `src/services/appAuth.ts`; this section is its prose. It
has two versions. Version 1 is a request for the official network: the page works
on its default API server and nowhere else. Version 2 is version 1 plus one key,
`api`, the host of the API the app is on, so the same page can approve a sign-in
for a beta or self-hosted network, but only while this browser is set to that
server (see "A request that names its network" below). A browser that is set to
another server than the request is for gets the "Different API server" card
before anything else.

### Request: app to page

Everything is in the URL **fragment**, never the query, so no server, proxy or
Referer header ever receives it:

```
https://manager.bringyour.com/login-app#v=1&platform=windows&state=<S>&pk=<PK>&ts=<T>
```

| Key        | Rule |
| ---------- | ---- |
| `v`        | `1`, or `2` with the `api` key of the next section; any other value says "update the app" and offers no Approve |
| `platform` | a key of the platform table below, looked up as an own key (`__proto__`, `constructor` and the like are unknown) |
| `state`    | `^[A-Za-z0-9_-]{43}$`: 32 random bytes, base64url. A secret until the answer comes back |
| `pk`       | 43 or 44 base58 characters that decode to exactly 32 bytes: the app's per-attempt X25519 public key |
| `ts`       | `^[0-9]{10}$`, unix seconds. It may be up to 240 s old and up to 120 s ahead of the browser's clock, in whole seconds, and is checked again at the click |

The parser is strict (`parseAppRequest`). The fragment is at most 400
characters and uses only `A-Z a-z 0-9 _ = & . : -`: no percent escapes, plus
signs, spaces or control characters. The dot and the colon are there for `api`
alone: every value is matched by a pattern of its own, and none but `api`
admits either. Every value is non-empty, each key of the request's version
appears exactly once, and any other key (`redirect_uri`, `redirect_link`,
`return`, `callback`, `auth_code`, `next`, `code`, `error`, in any case) refuses
the whole request. Nothing in a request can name where the answer goes. The
closed list of reasons a request is refused: `empty`, `shape`, `duplicate`,
`unknown-key`, `version`, `platform`, `state`, `pk`, `api`, `ts`, `stale`,
`query`.

A request is valid only on a page address with no query string. The manager
signs a visitor in from `?auth_code=` on any route, and an approval must never
ride on that: a non-empty query string refuses the request (`query`), with or
without a fragment, empties the slot below, and shows the generic "This sign-in
link isn't valid" card.

A 32-byte key that starts with a zero byte can be written in fewer than 43
base58 characters (about one key in 460,000). The page refuses it, so the app
generates another key pair.

Before React starts, `main.tsx` hands the fragment to `captureAppRequest`
(`src/services/appRequestStash.ts`). A valid request is kept in one
`sessionStorage` slot (`app_request`, the validated fields only; a newer link
replaces it), an invalid one empties the slot, and the fragment is removed from
the address bar either way. A load without a fragment, such as the reload after
signing in, keeps the slot. The slot is dropped when it goes stale, and when the
person approves or cancels. Starting a request also removes a leftover
`extension_return_to` from the tab's sessionStorage: the newest intent wins, and
the extension flow sets the key again when it starts.

**Where the request can still be read.** Stripping the fragment covers the
address bar, the session history, the Referer header and server logs. It does
not cover Navigation Timing: `performance.getEntriesByType("navigation")[0].name`
keeps the original address, with `state` and `pk`, for the life of the document.
So no third-party script may run on this origin, and the page loads none.

### A request that names its network (version 2)

Version 1 means the official network: the page signs in on its default API
server. A person who points the app at another network (a beta or self-hosted
deployment, through the app's "Change Network API") has an account there and not
on the default server. The page is a static app that can talk to any API that
allows its origin, so the request can say which API the app is on, and the page
can approve for that network if its browser is set to the same server.

```
https://manager.bringyour.com/login-app#v=2&platform=windows&state=<S>&pk=<PK>&ts=<T>&api=<A>
```

Version 2 is version 1 plus one key, `api`, written last. Every other rule above
holds. A version 1 request that carries `api` and a version 2 request that lacks
it are both refused whole (the first as an `unknown-key`, the second as a
`shape`): neither version is the other with a number changed.

| Key   | Rule |
| ----- | ---- |
| `api` | the host of the app's API, `host` or `host:port`, https implied (`isValidApiHost`): ASCII lower-case letters, digits, hyphens and dots, never a scheme, path, userinfo or query. Labels of 1 to 63 characters that start and end with a letter or digit; at least two labels; the last label is neither all digits nor `0x` and hex digits (a URL parser reads both as a number: `1.2.3.0x4` is the address 1.2.3.4 and `a.0x10` is no host at all), so no IP literal in any spelling a browser knows; a port is 1 to 65535 without a leading zero and is never 443; at most 200 characters in all. A value that fails is refused with the reason `api` |

The longest valid version 2 request is 337 characters, so the 400-character cap
needed no change (a test builds it). The app sends version 2 only for a network
other than the official one, whose API address is exactly `https://` plus a valid
`api` value, and only when the descriptor below lists 2; for the official network
it sends version 1, as before.

The request's host is text on the page and is not used as an address until the
person clicks Switch. No token, code or session goes to any server except the one
the browser was already set to or the one Switch has just set. That holds for the
whole browser and not only for the tab that clicked: see "A session belongs to the
server that issued it" below.

**Which server the request is for.** `serverMatchesRequest(base, api, pageHref)`
compares `api` with the host the browser's API server resolves to
(`new URL(base, pageHref).host`: a relative base resolves against the page, and a
base that is not `https` never matches). For a version 1 request the server must
be the default one, compared as text, as it always was. This is judged before
anything else about the session:

- the server is the one the request is for: the card works as described below, on
  that server, including when it is not the default;
- it is not: before any sign-in redirect and before any call to any API, the card
  is "Different API server". It names the hosts as plain text. A version 1
  request keeps its one action, "Use the default server". A version 2 request
  offers Cancel (which answers the app like the Cancel of the consent card) and
  "Switch to {host}", behind the sentence
  "Only continue if you set this server in URnetwork yourself." A signed-in
  session's token is not sent anywhere while the card is up, and a signed-out
  visitor is not sent to sign in.

**Switch** needs a trusted click, as Approve and Cancel do, on a card that has
been in front of the person for about 800 ms: the same inert time as Approve (the
tab showing and the window focused, restarted whenever that stops being true or
another card takes the place of this one), and the window has to have the focus
at the click, so that a click aimed at something else (the second of a double
click) cannot reach it. Cancel never waits. A request that went stale while the
card was shown is told so
("Request expired") before anything is touched. Switch removes the stored session
first (the session belongs to the server being left and is never sent to the new
one) and reads it back, so that a session the browser will not let go of stops
Switch with the server unchanged. It then drops the page's copy of the session
(`setToken(null)`, not `logout()`, which animates and toasts), and only then
points the browser at `https://{host}`, or back to the default when the default
already is that host, by writing or removing the `urApiBase` override that
"Change Network API" keeps. The page re-reads the server, finds a signed-out
visitor on the right server, and sends the tab to sign in as it always does;
signing in returns to this very request, which the tab kept, and the card works
on the server just chosen. Switch is ignored while the session is being swapped
or ended. A host that the grammar allows but the browser's URL parser does not
give back as it was (a bad `xn--` label: whether one is a name is the engine's
call) is never stored: Switch does nothing for it.

The override stays set, for the whole browser, until somebody chooses Use Default
under "Change Network API" on the sign-in page. The card says so, and says that
what the person types next (a password, a seed phrase, a wallet signature) goes to
that server; the consent card that follows names the API server the code would be
minted on (a version 2 request only; a version 1 request is for the default
server).

Approve itself is unchanged: the identity check, the mint, the seal and the
return are version 1's, and the return does not carry `api`. At the click the
controller asks again whether the server is the one the request is for, and a
server that is not mints nothing (`custom-server`).

### A session belongs to the server that issued it

The browser holds one API server for every tab, and each request reads it when it
is made. So a session is good for the server that issued it and for no other, and
a tab must not keep one, or store one that arrives late, once the browser has
been pointed at a different server. Switch, "Use the default server" and "Change
Network API" all make that change, from any tab, so the dashboard's auth context
(`src/context/AuthContext.tsx`, with the pure helpers in
`src/services/sessionBinding.ts`) binds a session to its server:

- A sign-in notes the server it is made on when it starts. If the browser is set
  to another server when the answer arrives, or 900 ms later when the session
  would be kept, the answer is dropped with a message ("The API server changed
  while you were signing in. Sign in again.") and nothing is stored. An auth code
  is bound to the server it was exchanged on, however long the person takes to
  confirm a switch of accounts.
- The stored session carries a record of its server (`byTokenServer`, written
  before the session). The build's own default server goes by one mark,
  `default`, so a build that moves its default signs nobody out. A tab opens
  signed out when the record names another server; the stored session is left
  where it is, for that server. A session stored by an earlier version has no
  record and is taken as it always was.
- Every tab asks one question, whether the browser is still set to the server its
  session came from: when the storage event arrives, and again when a page is
  restored from the back-forward cache, the window gets the focus or the tab is
  shown (a tab that was not running when the event fired). When the answer is no
  the tab signs itself out, with a message, and takes the stored session out only
  if it is still the one the tab held: another tab may have signed in to
  something newer.
- `/login-app` also checks for itself. It reads the stored session through the
  same record, and before its account check it signs itself out if the stored
  session is no longer the one it holds (another tab signed out, switched, or
  signed in to something else), so a card left open in a background tab never
  sends its copy of the session to a server it was not issued by.

### Answer: page to app

The page navigates the top window to one of two addresses, built from the
constants of the platform table and url-safe values only (every value must match
`^[A-Za-z0-9_-]+$` or the builder throws). The whole address is at most
2,000 characters, about 1,190 today; the longest code that always fits is 1,277
characters (`MAX_CODE_LENGTH`), and the server's is 684.

| Case    | Address |
| ------- | ------- |
| Approve | `urnetwork://auth?state=<S>&epk=<b58>&n=<b58>&d=<b58>` |
| Cancel  | `urnetwork://auth?state=<S>&error=access_denied` |

There is no plain-code answer. `d` is a NaCl box (`nacl.box`: X25519,
XSalsa20-Poly1305) of the UTF-8 JSON `{"c":"<auth code>","s":"<S>"}`, sealed to
`pk` with a fresh ephemeral key pair (`epk` is its public half) and a fresh
random 24-byte nonce `n`. `epk`, `n` and `d` are base58. The page zeroes the
ephemeral secret key and the shared key afterwards, and refuses a public key of
small order. The app computes the shared secret from its secret key and `epk`
and opens `d` with the SDK's own `GenerateSharedSecret` and `DecryptData`, then
compares the inner `s` with its attempt.

The auth code comes from `POST /auth/code-create` with `duration_minutes: 2`
and `uses: 1`, made with the person's own session. It lives only in memory of
the click handler: never in storage, the DOM, the page's address, the console or
a log. The one console line the page writes is
`[AppAuth] action=approve|deny platform=windows`. The reply to that request is
read by a parser of its own (`createAuthCode` in `src/services/api.ts`): a reply
that is not JSON, or does not parse, is reported with one of two fixed messages,
never with a piece of the body, in the returned error or in the console.

Before it mints anything, the page seals a throwaway code as long as the budget
allows and builds the whole address from it, so a code is never minted for an
answer that cannot be built. If a minted code still cannot become an answer, the
card says "Reload this page and approve again", turns Approve off, and the page
mints no second code until it is reloaded.

Two more things can stop that dry run, and neither is a hiccup to try again:

- A public key the page cannot seal to. A point of small order (`u = 1` is
  written in 43 characters) passes the parser, and only sealing refuses it,
  because it would make every shared secret the same. The click then ends as the
  generic "This sign-in link isn't valid" card, the request is dropped, and
  nothing is minted: no second try can work for such a key.
- The sealing code itself. It is its own chunk, fetched while the person reads
  the card (a failure there is not shown). At the click the page waits for it at
  most 15 s, a limit of its own (the two API calls get 30 s), by
  racing the import against a timer (an import cannot be aborted). A chunk that
  fails to load or does not come in time mints nothing, and the card says
  "Reload this page and approve again", turns Approve off and leaves Cancel
  working: the browser keeps a failed import for the life of the document, so
  another click cannot help, and the request survives a reload. While Approve is
  only waiting for the chunk, Cancel answers, and a chunk that arrives
  afterwards mints nothing; from the moment the code is being asked for, Cancel
  is refused.

### Platform table

| `platform` | Label | Answer goes to |
| ---------- | ----- | -------------- |
| `windows`  | URnetwork for Windows | `urnetwork://auth` |

The table is closed (`APP_PLATFORMS`, frozen). The label and the address come
from it, never from the request. A row is added only when that app enforces the
same attempt gate and opens the sealed answer.

### What the page does

In this order, and Approve exists only if every step passed:

1. The page is interactive only in a top-level window with no opener
   (`window.top === window.self`, `window.opener === null`), decided before the
   first paint. In a framed window or one with an opener,
   no approval control is interactive: the page says to start again from the app
   and sends nobody anywhere. (The dashboard header's Logout button belongs to
   the manager, not to this page, and stays live.) Today the load balancer's
   frame header and these gates are what protect the route.
2. The request must be valid and fresh, and only the exact path `/login-app`
   counts; otherwise the page says so and offers no Approve.
3. The API server must be the one the request is for: the default server for
   version 1, the one the request names for version 2. If it is not, the page
   shows the "Different API server" card and does nothing else: no sign-in
   redirect, no call to any API, no use of a stored session (see "A request that
   names its network"). Version 1 offers "Use the default server", which, like
   Switch, signs this browser out of the server it leaves (the stored session
   belongs to that server and is never sent to the default one) and removes the
   override; version 2 offers Cancel and "Switch to {host}". Those two buttons
   are inert for the first 800 ms (see 7) and need a trusted click.
4. Signed out: the page leaves a short-lived marker in the tab's sessionStorage
   (`app_sign_in`, the time, good for as long as the longest-lived request, six
   minutes) and sends the person to the sign-in page. After signing in, the
   manager returns to `/login-app` (a hard load) with the request kept, but only
   for a tab that carries the marker, and it uses the marker up. A tab that
   merely holds a request is left alone; so is `/login-extension`, whose own
   way back comes first.
5. `GET /network/user` before the card: a 401 ends the session and shows sign-in;
   the network name shown is the server's; an account with no sign-in method is
   refused (a difference from the contract, listed below). Ending the session
   removes the stored one only if it is still the session the API turned away:
   another tab may have signed in to something newer since, and that is not this
   page's to end. The page signs itself out either way, and the way back from
   sign-in finds whatever is stored. The same goes before the call: if the stored
   session is no longer the one the page holds (see "A session belongs to the
   server that issued it"), the page signs itself out instead of sending its copy.
6. The card says what it must and no more: the app's name from the table, the
   network's name from the server, that approving gives the app "full access to
   this account, the same as signing in there yourself: balance, plans, payout
   wallet and settings", that signing out of this page does not sign that
   computer out, and "Not {network}? Sign out and use a different account".
   Cancel comes before Approve in tab order, nothing is focused, and only a
   trusted click (`event.isTrusted`) counts.
7. Approve is armed only while the tab is showing (`document.visibilityState`
   is `visible`) and the window has the focus, and only about 800 ms after both
   are true. The wait restarts on `visibilitychange`, on `focus` and `blur`,
   and whenever the account on the card changes. The buttons of the Different
   API server card (Switch, Use the default server; Cancel never waits) wait
   the same way, and a card that takes the place of another, as that card
   does when another tab moves the browser under a consent card, starts inert
   in its first render.
8. At the click: one flight at a time and one mint per page load; the request's
   age again; the stored session read again and required to be the network the
   card showed; the API server again, for this very request (a server that is
   not the one it is for mints nothing); the sealing code is loaded and tried
   before a code is minted. Then one code is minted, sealed at once and the page
   navigates to the answer straight away. The sealed address is kept in memory
   for 60 s for an "Open URnetwork" button, for when the browser did not hand it
   on.

The two API calls the page makes (`GET /network/user` and
`POST /auth/code-create`) are given up after 30 s through an abort signal
(`API_TIMEOUT_MS`), because the API of some networks is slow. A hung account
check gives the card a "Try again" button; a hung mint shows "We couldn't approve
this right now. Try again." and Approve works again. A run of the account check
that is torn down (the session changed, or React's StrictMode sets the page up
twice in development) calls its request back at once, so a slow API is not asked
twice at the same time. The sealing chunk keeps its
own, shorter 15 s (`SEAL_TIMEOUT_MS`, see above: it comes from this page's own
host, not from the person's network), and its failure is the card that says to
reload, not a Try again. The request window of 240 s is unchanged. The
extension's calls take no signal and behave as they always did.

### Where this page differs from the contract's tables

The contract that the apps and the pages implement has a table of the page's
cases (its section 7), and that table is normative. Where this page does
something the table does not say, or says differently, it is listed here, so
another page that implements the same contract can do the same or choose
otherwise. In each the app receives nothing either way, so it cannot tell.

- **The account differs between the card and the click.** The contract says the
  page mints nothing and re-renders the card. This page mints nothing and shows
  a final "Account changed" card with a Reload button; the reload shows the card
  for the account that is signed in now.
- **An account with no sign-in method** (the API lists no `auth_types`, as for a
  guest) is refused with "No sign-in method" before any card, and the card for
  it offers Sign out. The contract lists guest refusal as out of scope for v1,
  so this is more than it asks; another page need not do it.
- **An `api` that is an address in disguise.** A URL parser reads a last label of
  `0x` and hex digits as a number: `1.2.3.0x4` is the address 1.2.3.4, and
  `a.0x10` is no host at all. The grammar (`isValidApiHost`) refuses such a last
  label, as it refuses an all-digit one, so no IP literal gets through in any
  spelling and the request gets the generic "This sign-in link isn't valid"
  card. Another page that implements the contract needs the same rule.
- **An `api` the grammar allows and the browser cannot use.** What is left is a
  name the browser's own URL parser will not give back as it was (a bad `xn--`
  label; whether one is a name is the engine's call). Such a request parses, the
  card names the host, and where the engine refuses it Switch does nothing (it
  never stores a server that this page would not then recognise); Cancel
  answers the app as usual.

A request that is missing altogether is not a difference: it gets the same
generic "This sign-in link isn't valid" card as a damaged one, as the contract
says.

There is no `postMessage`, no opener or parent bridge, no HTML sink and no
redirect parameter anywhere in the page (`tests/app-auth-source.test.mjs` pins
that).

### Descriptor

`public/approval-contract.json` is served as `/approval-contract.json`:

```json
{"contracts":[1,2],"platforms":["windows"]}
```

It lists the contract versions this page serves (`APP_CONTRACTS`) and the keys
of the platform table (`APP_PLATFORMS`); a test ties the file to both. An app
offers its sign-in action only when it fetched this file in the run (a plain
GET, never redirected, within 3 s) and found the version it would send and its
platform in it: 1 for the official network, 2 for another. A page that lists
only `[1]` keeps working for the official network, and never gets a version 2
request. Before a build that carries the file is deployed, that path answers
with the single-page app's HTML instead. After a deploy:

```sh
curl -s https://manager.bringyour.com/approval-contract.json
```

### Lifetimes

| What | Value |
| ---- | ----- |
| Auth code | 2 minutes, 1 use |
| Request | up to 240 s after `ts`, from 120 s before it; at load and at the click |
| The app's attempt | the app keeps its own clock (5 minutes) |
| Approve inert (and Switch, Use the default server) | about 800 ms once the tab is showing and the window has the focus |
| The two API calls | 30 s |
| The sealing chunk at the click | 15 s |
| Sign-in marker | 6 minutes |
| Sealed address kept for Open URnetwork | 60 s |

### Cross-implementation vector

`tests/fixtures/app-auth-vector.json` holds fixed, non-secret keys (app secret
key = bytes 1..32, ephemeral secret key = bytes 101..132, nonce = bytes 200 down
to 177), the plaintext, the sealed `epk`, `n` and `d` (1,036 characters) and the
whole answer address. The page's `sealCode` must reproduce it byte for byte
(`tests/app-auth-vector.test.mjs`), and the SDK's Go
`GenerateSharedSecret`/`DecryptData` must open it (checked, in both directions,
against verbatim copies of those functions). The Windows app is expected to pin
the same file in its own tests.

`tests/fixtures/app-request-vector-v2.json` is the shared vector for the version 2
request: the app builds, from state = 43 `S`, the public key of the same app
secret key (bytes 1..32), `ts` = 1790000000 and `api` = `api.beta-test.net`,
exactly

```
v=2&platform=windows&state=SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS&pk=WpSggvhoqoVW4XJvfjsB52dvVunYSQWrz6XiuMQVsCf&ts=1790000000&api=api.beta-test.net
```

(153 characters, the keys in this order) after the page address and the `#`, and
the page parses it, with its clock at `ts`, into those values and nothing else
(`tests/app-auth-vector.test.mjs`). The Windows app commits the same string.

### Reserved: the check code (not displayed in v1)

Version 1 shows no check code. If a later version does, it is the first 6
characters of the RFC 4648 base32 alphabet (`A-Z2-7`) of SHA-256 over the ASCII
bytes of `state`, that is the first 30 bits of the digest as six 5-bit groups;
the test vector is SHA-256 of `abc`, which gives `XJ4BNP`.

### Tests

`npm test` runs `tests/app-auth.test.mjs` (parser, table, addresses, sealing),
`app-auth-api.test.mjs` (version 2: the grammar of `api`, every case of the
contract's conformance list by name, and the helpers that say which server a
request is for), `app-auth-vector.test.mjs` (both shared vectors),
`app-approval.test.mjs` (the controller),
`app-request-stash.test.mjs`, `app-route.test.mjs` (return after sign-in) and
`app-layout.test.mjs` (the effect in `Layout.tsx` that does it, run with a fake
router and clock), `app-approval-view.test.mjs` and `app-approval-render.test.mjs`
(what the page shows, and that every button runs its action),
`app-login-page.test.mjs` (the page itself, with a fake browser, document and
clock, and a seeded run of random events against it), `app-api-status.test.mjs` (the two api calls, their abort signal, and
that the minted code reaches no message or console line),
`auth-session-binding.test.mjs` (the helpers that keep a session with its server,
and the dashboard's auth context run against a fake browser), `app-auth-source.test.mjs`
(source pins) and `app-typecheck.test.mjs` (no TypeScript diagnostics in the files
of this feature, which `vite build` does not check), next to the existing
`auth-code-url.test.mjs`. The page test, the auth context test and the
Layout test run on one minimal hooks runtime (`tests/helpers/hooks-runtime.mjs`),
and run every test twice: as the production build runs the component, and as
React's StrictMode runs it in a development build (every effect is set up, torn
down and set up again when the component mounts). Where the two differ the test
says so: idempotent work (the account lookup, the way to sign-in) is done twice,
and nothing that mints or navigates to the app is. One difference stays on
purpose: with the extension's return key in the same tab, a development build
ends on the approval page where a production build ends on the extension's,
because the first run uses the key up and the second takes the app's way back;
the extension's branch is a published contract and is not touched.

## Branding

The UI follows the URnetwork design system defined in
[urnetwork/elements](https://github.com/urnetwork/elements). Design tokens
(colors, radii, shadows, fonts) live in `tailwind.config.js` and
`src/index.css`; chart colors in `src/theme/chartColors.ts`; per-country
location colors in `src/theme/locationColors.ts`.

**Fonts:** `src/assets/fonts/` contains licensed commercial fonts used across
URnetwork apps — ABC Gravity ([ABC Dinamo](https://abcdinamo.com/typefaces/gravity)),
PP Neue Bit and PP Neue Montreal ([Pangram Pangram](https://pangrampangram.com)).
Do not reuse them outside URnetwork projects.
