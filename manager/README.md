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

The contract lives in `src/services/appAuth.ts`; this section is its prose. The
page runs against the production API only, and refuses to run if the browser
holds a custom API server.

### Request: app to page

Everything is in the URL **fragment**, never the query, so no server, proxy or
Referer header ever receives it:

```
https://manager.bringyour.com/login-app#v=1&platform=windows&state=<S>&pk=<PK>&ts=<T>
```

| Key        | Rule |
| ---------- | ---- |
| `v`        | exactly `1`; any other value says "update the app" and offers no Approve |
| `platform` | a key of the platform table below, looked up as an own key (`__proto__`, `constructor` and the like are unknown) |
| `state`    | `^[A-Za-z0-9_-]{43}$`: 32 random bytes, base64url. A secret until the answer comes back |
| `pk`       | 43 or 44 base58 characters that decode to exactly 32 bytes: the app's per-attempt X25519 public key |
| `ts`       | `^[0-9]{10}$`, unix seconds. It may be up to 240 s old and up to 120 s ahead of the browser's clock, in whole seconds, and is checked again at the click |

The parser is strict (`parseAppRequest`). The fragment is at most 400
characters and uses only `A-Z a-z 0-9 _ = & -`: no percent escapes, plus signs,
spaces or control characters. Every value is non-empty, each of the five keys
appears exactly once, and any other key (`redirect_uri`, `redirect_link`,
`return`, `callback`, `auth_code`, `next`, `code`, `error`, in any case) refuses
the whole request. Nothing in a request can name where the answer goes. The
closed list of reasons a request is refused: `empty`, `shape`, `duplicate`,
`unknown-key`, `version`, `platform`, `state`, `pk`, `ts`, `stale`, `query`.

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
  most 15 s, as for the two API calls, by racing the import against a timer (an
  import cannot be aborted). A chunk that fails to load or does not come in time
  mints nothing, and the card says "Reload this page and approve again", turns
  Approve off and leaves Cancel working: the browser keeps a failed import for
  the life of the document, so another click cannot help, and the request
  survives a reload. While Approve is only waiting for the chunk, Cancel
  answers, and a chunk that arrives afterwards mints nothing; from the moment
  the code is being asked for, Cancel is refused.

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
3. Signed out: the page leaves a short-lived marker in the tab's sessionStorage
   (`app_sign_in`, the time, good for as long as the longest-lived request, six
   minutes) and sends the person to the sign-in page. After signing in, the
   manager returns to `/login-app` (a hard load) with the request kept, but only
   for a tab that carries the marker, and it uses the marker up. A tab that
   merely holds a request is left alone; so is `/login-extension`, whose own
   way back comes first.
4. A non-default API server is refused, with a button that removes it, so the
   session is never sent to a server that was typed in.
5. `GET /network/user` before the card: a 401 ends the session and shows sign-in;
   the network name shown is the server's; an account with no sign-in method is
   refused (a difference from the contract, listed below). Ending the session
   removes the stored one only if it is still the session the API turned away:
   another tab may have signed in to something newer since, and that is not this
   page's to end. The page signs itself out either way, and the way back from
   sign-in finds whatever is stored.
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
   and whenever the account on the card changes.
8. At the click: one flight at a time and one mint per page load; the request's
   age again; the stored session read again and required to be the network the
   card showed; the API server again; the sealing code is loaded and tried
   before a code is minted. Then one code is minted, sealed at once and the page
   navigates to the answer straight away. The sealed address is kept in memory
   for 60 s for an "Open URnetwork" button, for when the browser did not hand it
   on.

The two API calls the page makes (`GET /network/user` and
`POST /auth/code-create`) are given up after 15 s through an abort signal. A
hung account check gives the card a "Try again" button; a hung mint shows "We
couldn't approve this right now. Try again." and Approve works again. The
sealing chunk gets the same 15 s (see above), and its failure is the card that
says to reload, not a Try again. The extension's calls take no signal and behave
as they always did.

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

A request that is missing altogether is not a difference: it gets the same
generic "This sign-in link isn't valid" card as a damaged one, as the contract
says.

There is no `postMessage`, no opener or parent bridge, no HTML sink and no
redirect parameter anywhere in the page (`tests/app-auth-source.test.mjs` pins
that).

### Descriptor

`public/approval-contract.json` is served as `/approval-contract.json`:

```json
{"contracts":[1],"platforms":["windows"]}
```

It lists the contract versions this page serves (`APP_CONTRACTS`) and the keys
of the platform table (`APP_PLATFORMS`); a test ties the file to both. An app
offers its sign-in action only when it fetched this file in the run (a plain
GET, never redirected, within 3 s) and found the version it speaks and its
platform in it. Before a build that carries the file is deployed, that path
answers with the single-page app's HTML instead. After a deploy:

```sh
curl -s https://manager.bringyour.com/approval-contract.json
```

### Lifetimes

| What | Value |
| ---- | ----- |
| Auth code | 2 minutes, 1 use |
| Request | up to 240 s after `ts`, from 120 s before it; at load and at the click |
| The app's attempt | the app keeps its own clock (5 minutes) |
| Approve inert | about 800 ms once the tab is showing and the window has the focus |
| The two API calls, and the sealing chunk at the click | 15 s |
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

### Reserved: the check code (not displayed in v1)

Version 1 shows no check code. If a later version does, it is the first 6
characters of the RFC 4648 base32 alphabet (`A-Z2-7`) of SHA-256 over the ASCII
bytes of `state`, that is the first 30 bits of the digest as six 5-bit groups;
the test vector is SHA-256 of `abc`, which gives `XJ4BNP`.

### Tests

`npm test` runs `tests/app-auth.test.mjs` (parser, table, addresses, sealing),
`app-auth-vector.test.mjs`, `app-approval.test.mjs` (the controller),
`app-request-stash.test.mjs`, `app-route.test.mjs` (return after sign-in) and
`app-layout.test.mjs` (the effect in `Layout.tsx` that does it, run with a fake
router and clock), `app-approval-view.test.mjs` and `app-approval-render.test.mjs`
(what the page shows, and that every button runs its action),
`app-login-page.test.mjs` (the page itself, with a fake browser, document and
clock), `app-api-status.test.mjs` (the two api calls, their abort signal, and
that the minted code reaches no message or console line),
`app-auth-source.test.mjs` (source pins) and `app-typecheck.test.mjs` (no
TypeScript diagnostics in the files of this feature, which `vite build` does not
check), next to the existing `auth-code-url.test.mjs`. The page test and the
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
