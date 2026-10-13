// /login-app, the page itself (src/pages/LoginApp.tsx), run with the real
// services and a minimal hooks runtime in the style of the useAutoLogin test:
// the gates, the sign-in redirect, the identity check, the 800 ms inert time
// (which only runs while the tab is showing and the window has the focus), trusted
// clicks only, one mint, the single navigation, the 30 s limit on the two api calls
// and the 15 s one on the sealing chunk, and the 60 s Open button; and the server
// the request is for (the default one for version 1, the one it names for version 2),
// judged before any sign-in or any call, with Switch and Cancel on the card that
// says it is not. That card is inert for the same 800 ms as Approve, a request that
// goes stale before Switch is told so, and the page never sends a copy of the
// session that another tab has taken out of the storage or moved to another server
// (the last tests: those, and a seeded run of random events against the page). The
// api, the session, the window and the document are fakes; time is a fake clock.
//
// Every test runs twice: as the production build runs the page, and as React's
// StrictMode runs it in a development build, where the effects are set up, torn
// down and set up again when the page mounts. Where the two differ the test says
// so: idempotent work is done twice (the account lookup, the way to sign-in).
// Nothing that mints or navigates to the app is ever done twice.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import nodeTest from "node:test";

import * as appApproval from "../src/services/appApproval.ts";
import * as appApprovalView from "../src/services/appApprovalView.ts";
import * as appAuth from "../src/services/appAuth.ts";
import * as appRequestStash from "../src/services/appRequestStash.ts";
import * as appSeal from "../src/services/appSeal.ts";
import * as sessionBinding from "../src/services/sessionBinding.ts";
import * as authCodeUrl from "../src/services/authCodeUrl.ts";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { createHooksRuntime } from "./helpers/hooks-runtime.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

/** which of the two runs the test body is in (tests run one after the other) */
let strict = false;
function test(name, body) {
	for (const mode of [false, true]) {
		nodeTest(mode ? `${name} [StrictMode]` : name, async (t) => {
			strict = mode;
			await body(t);
		});
	}
}
/** A click handler's promise, waited for at most a second of real time: a page
 * that never finishes its click fails the test that waits for it, with a message,
 * instead of hanging it (and, with it, the tests after it). */
function answered(click) {
	let timer;
	const late = new Promise((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("the click never finished")),
			1000,
		);
	});
	return Promise.race([click, late]).finally(() => clearTimeout(timer));
}

/** What one run of the page's effects does (an idempotent lookup, the way to
 * sign-in), as often as the effects run: once in a production build, twice
 * under StrictMode. Never used for anything that mints or goes to the app. */
const perRun = (list) => (strict ? [...list, ...list] : list);

const pageSource = fs.readFileSync(
	new URL("../src/pages/LoginApp.tsx", import.meta.url),
	"utf8",
);
const transpiled = ts.transpileModule(pageSource, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		esModuleInterop: true,
	},
}).outputText;

const { APP_REQUEST_KEY, APP_SIGN_IN_KEY } = appRequestStash;

const b64u = (value) =>
	Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims) => `${b64u({ alg: "none" })}.${b64u(claims)}.sig`;
const ALPHA = jwt({ network_id: "net-alpha", network_name: "jwt-alpha" });
const BETA = jwt({ network_id: "net-beta", network_name: "beta" });
const CODE = "Z".repeat(683) + "=";
const DEFAULT_BASE = "https://api.example.test";
/** where the page itself is served from, and where a relative api base would resolve to */
const PAGE_ORIGIN = "https://manager.example";
/** the host a version 2 request names in most of these tests, and the base Switch makes of it */
const APP_API = "mock.localhost:5198";
const APP_BASE = `https://${APP_API}`;

const alphaUser = {
	network_user: { network_name: "alpha-net", auth_types: ["email"] },
};
const betaUser = {
	network_user: { network_name: "beta-net", auth_types: ["email"] },
};
/** what the api layer says when a request is aborted: an error answer with no status */
const aborted = { error: { message: "The operation was aborted." } };
/** an api call that never answers, until its signal aborts it (as fetch does) */
const hang = (signal) =>
	new Promise((resolve) =>
		signal.addEventListener("abort", () => resolve(aborted)),
	);
/** a promise settled from the outside */
function deferred() {
	let resolve;
	const promise = new Promise((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

const appKeys = nacl.box.keyPair();
function requestHash(over = {}) {
	const fields = {
		v: "1",
		platform: "windows",
		state: Buffer.from(nacl.randomBytes(32)).toString("base64url"),
		pk: bs58.encode(appKeys.publicKey),
		ts: String(Math.floor(Date.now() / 1000)),
		...over,
	};
	return `#${Object.entries(fields)
		.map(([k, v]) => `${k}=${v}`)
		.join("&")}`;
}
const stateOf = (hash) => /state=([^&]+)/.exec(hash)[1];

/** a fake browser: window, document, storage, a clock, and the hooks runtime for the page */
function mountPage({
	token = ALPHA,
	hash = requestHash(),
	pathname = "/login-app",
	search = "",
	framed = false,
	topThrows = false,
	opener = null,
	apiBase = DEFAULT_BASE,
	// the server this build calls when the person has chosen none, and the page's own origin
	defaultBase = DEFAULT_BASE,
	origin = PAGE_ORIGIN,
	userResponse = alphaUser,
	mint = async () => ({ auth_code: CODE }),
	isLoggingOut = false,
	isTransitioning = false,
	visible = true,
	focused = true,
	olderSlot = false,
	// a request already kept in this tab (the way back after signing in): what the slot holds
	seededSlot = null,
	sessionSetFails = false,
	// the browser's storage refuses to remove the session: by throwing, or by quietly keeping it
	removeSessionThrows = false,
	removeSessionKeeps = false,
	// the browser's storage refuses to write the server
	writeServerThrows = false,
	// what importing the sealing chunk does: "ok", "reject" (the download failed;
	// the browser keeps a failed import for the life of the document, so it fails
	// every time) or "hang" (it never arrives, until page.arrive())
	seal = "ok",
	// the browser refuses to navigate to the address
	assignThrows = false,
	// the record beside the stored session of the server that issued it (null: none was kept)
	sessionServer = null,
} = {}) {
	const calls = [];
	const timers = [];
	/** every import of the sealing chunk the page made, and how it went */
	const sealImports = [];
	/** the imports still waiting for the chunk */
	const sealWaiting = [];
	/** every signal the page handed to an api call, in order */
	const signals = [];
	let clock = 0;
	let timerId = 1;
	const listeners = [];
	const docListeners = [];
	const localData = new Map();
	if (token) localData.set("byToken", token);
	if (token && sessionServer !== null) {
		localData.set("byTokenServer", sessionServer);
	}
	if (apiBase !== defaultBase) localData.set("urApiBase", apiBase);
	/** the order of what touched the session and the server: storage writes and the context's token */
	const events = [];
	const sessionData = new Map();
	if (seededSlot !== null) {
		sessionData.set(APP_REQUEST_KEY, JSON.stringify(seededSlot));
	}
	if (olderSlot) {
		sessionData.set(
			APP_REQUEST_KEY,
			JSON.stringify({
				platform: "windows",
				state: Buffer.from(nacl.randomBytes(32)).toString("base64url"),
				pk: bs58.encode(appKeys.publicKey),
				ts: Math.floor(Date.now() / 1000),
			}),
		);
	}
	const win = {
		location: {
			pathname,
			search,
			hash,
			origin,
			assign: (url) => {
				calls.push({ assign: url });
				if (assignThrows)
					throw new Error("the browser refused the address");
			},
			replace: (url) => calls.push({ replace: url }),
			reload: () => calls.push({ reload: true }),
		},
		history: {
			replaceState: (data, unused, url) => {
				const parsed = new URL(url, "https://manager.example");
				win.location.pathname = parsed.pathname;
				win.location.search = parsed.search;
				win.location.hash = parsed.hash;
			},
		},
		sessionStorage: {
			getItem: (k) => (sessionData.has(k) ? sessionData.get(k) : null),
			setItem: (k, v) => {
				if (sessionSetFails) throw new Error("quota");
				sessionData.set(k, String(v));
			},
			removeItem: (k) => sessionData.delete(k),
		},
		setTimeout: (fn, ms) => {
			const id = timerId++;
			timers.push({ id, at: clock + ms, fn });
			return id;
		},
		clearTimeout: (id) => {
			const at = timers.findIndex((t) => t.id === id);
			if (at >= 0) timers.splice(at, 1);
		},
		addEventListener: (type, fn) => listeners.push({ type, fn }),
		removeEventListener: (type, fn) => {
			const at = listeners.findIndex(
				(l) => l.type === type && l.fn === fn,
			);
			if (at >= 0) listeners.splice(at, 1);
		},
	};
	win.self = win;
	if (topThrows) {
		Object.defineProperty(win, "top", {
			get() {
				throw new Error(
					"Blocked a frame from accessing a cross-origin frame.",
				);
			},
		});
	} else {
		win.top = framed ? {} : win;
	}
	win.opener = opener;
	const doc = {
		visibilityState: visible ? "visible" : "hidden",
		focused,
		hasFocus: () => doc.focused,
		addEventListener: (type, fn) => docListeners.push({ type, fn }),
		removeEventListener: (type, fn) => {
			const at = docListeners.findIndex(
				(l) => l.type === type && l.fn === fn,
			);
			if (at >= 0) docListeners.splice(at, 1);
		},
	};
	const localStorage = {
		getItem: (k) => (localData.has(k) ? localData.get(k) : null),
		setItem: (k, v) => {
			if (writeServerThrows && k === "urApiBase")
				throw new Error("the storage is full");
			events.push(`set ${k}=${v}`);
			localData.set(k, String(v));
		},
		removeItem: (k) => {
			if (removeSessionThrows && k === "byToken")
				throw new Error("the storage is blocked");
			events.push(`remove ${k}`);
			if (removeSessionKeeps && k === "byToken") return;
			localData.delete(k);
		},
	};

	// the hooks the page runs on (tests/helpers/hooks-runtime.mjs)
	const hooks = createHooksRuntime({ strict });

	// the page's session, as the auth context keeps it
	const auth = {
		token,
		isAuthenticated: !!token,
		isLoggingOut,
		isTransitioning,
		setToken: (value) => {
			const same = Object.is(auth.token, value);
			auth.token = value;
			auth.isAuthenticated = !!value;
			calls.push({ setToken: value });
			events.push(`setToken ${value === null ? "null" : "a session"}`);
			// as React's state does: setting what is already there renders nothing, so a page
			// that relied on this call alone to show a changed server would stay on its card
			if (!same) hooks.invalidate();
		},
		logout: () => calls.push({ logout: true }),
	};

	// the server a call goes to is read when the call is made, as the real api layer does
	const serverNow = () => localStorage.getItem("urApiBase") || defaultBase;
	const api = {
		CUSTOM_API_BASE_KEY: "urApiBase",
		DEFAULT_API_BASE: defaultBase,
		getApiBase: serverNow,
		fetchNetworkUser: async (t, signal) => {
			calls.push({ fetchNetworkUser: t });
			signals.push({
				api: "user",
				signal,
				base: serverNow(),
				token: t,
				stored: localStorage.getItem("byToken"),
			});
			return typeof userResponse === "function"
				? userResponse(t, signal)
				: userResponse;
		},
		createAuthCode: async (t, minutes, uses, signal) => {
			calls.push({ mint: { token: t, minutes, uses } });
			signals.push({
				api: "mint",
				signal,
				base: serverNow(),
				token: t,
				stored: localStorage.getItem("byToken"),
			});
			return mint(t, minutes, uses, signal);
		},
	};

	const View = (props) => props;
	const modules = {
		react: hooks.react,
		"react/jsx-runtime": {
			jsx: (type, props) => ({ type, props }),
			jsxs: (type, props) => ({ type, props }),
			Fragment: Symbol("fragment"),
		},
		"../hooks/useAuth": { useAuth: () => auth },
		"../services/api": api,
		"../services/authCodeUrl": authCodeUrl,
		"../services/appAuth": appAuth,
		"../services/appApproval": appApproval,
		"../services/appApprovalView": appApprovalView,
		"../services/appRequestStash": appRequestStash,
		"../services/sessionBinding": sessionBinding,
		"../components/AppApprovalView": { AppApprovalView: View },
	};
	// import("../services/appSeal") becomes require() here, asked at the moment the
	// page imports: so the chunk can fail, or be late, whenever a test says
	Object.defineProperty(modules, "../services/appSeal", {
		enumerable: true,
		get() {
			sealImports.push(seal);
			if (seal === "reject")
				throw new Error("Failed to fetch dynamically imported module");
			if (seal === "hang") {
				// a thenable never settles an import that adopts it, until the chunk arrives
				return { then: (resolve) => sealWaiting.push(resolve) };
			}
			return appSeal;
		},
	});

	// the globals the page and the services read, restored by close()
	const saved = {};
	const install = (name, value) => {
		saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
		Object.defineProperty(globalThis, name, {
			value,
			configurable: true,
			writable: true,
		});
	};
	install("window", win);
	install("document", doc);
	install("localStorage", localStorage);
	const warnings = [];
	const realWarn = console.warn;
	console.warn = (...args) => warnings.push(args.join(" "));

	const mod = { exports: {} };
	new Function("require", "module", "exports", transpiled)(
		(name) => {
			if (!(name in modules))
				throw new Error(`unexpected import ${name}`);
			return modules[name];
		},
		mod,
		mod.exports,
	);

	hooks.mount(() => mod.exports.default());
	const { render, flush } = hooks;
	const advance = async (ms) => {
		const end = clock + ms;
		for (;;) {
			const next = timers
				.filter((t) => t.at <= end)
				.sort((a, b) => a.at - b.at)[0];
			if (!next) break;
			timers.splice(timers.indexOf(next), 1);
			clock = next.at;
			next.fn();
			await flush();
		}
		clock = end;
		await flush();
	};
	/** deliver an event to the listeners of the window or the document, then let the page react */
	const emit = async (target, type) => {
		const list = target === "document" ? docListeners : listeners;
		for (const l of list.filter((x) => x.type === type)) l.fn({ type });
		await flush();
	};

	const page = {
		calls,
		events,
		warnings,
		auth,
		win,
		doc,
		localData,
		sessionData,
		timers,
		listeners,
		docListeners,
		signals,
		model: () => hooks.latest().props.model,
		actions: () => hooks.latest().props.actions,
		render,
		flush,
		advance,
		sealImports,
		/** the sealing chunk finally arrives, for every import that was waiting for it */
		async arrive() {
			for (const resolve of sealWaiting.splice(0)) resolve(appSeal);
			await flush();
		},
		trusted: { isTrusted: true },
		untrusted: { isTrusted: false },
		minted: () => calls.filter((c) => c.mint),
		assigned: () => calls.filter((c) => c.assign).map((c) => c.assign),
		replaced: () => calls.filter((c) => c.replace).map((c) => c.replace),
		/** another tab, or the account menu, replaced the session */
		async swapToken(next) {
			auth.token = next;
			auth.isAuthenticated = !!next;
			if (next) localData.set("byToken", next);
			else localData.delete("byToken");
			hooks.invalidate();
			await flush();
		},
		/** the tab goes to the background, or comes back: the browser says so */
		async setVisible(value) {
			doc.visibilityState = value ? "visible" : "hidden";
			await emit("document", "visibilitychange");
		},
		/** the window loses or gets the focus: the browser says so */
		async setFocused(value) {
			doc.focused = value;
			await emit("window", value ? "focus" : "blur");
		},
		close() {
			console.warn = realWarn;
			for (const [name, descriptor] of Object.entries(saved)) {
				if (descriptor)
					Object.defineProperty(globalThis, name, descriptor);
				else delete globalThis[name];
			}
		},
	};
	// first load: the capture runs before React, then the page renders and its effects run
	page.captured = appRequestStash.captureAppRequest(
		win,
		win.sessionStorage,
		Date.now(),
	);
	render();
	return page;
}

/** run a test body with a page and always release the globals */
async function withPage(options, body) {
	const page = mountPage(options);
	try {
		await body(page);
	} finally {
		page.close();
	}
}

const consentReady = async (page) => {
	await page.flush();
	assert.equal(page.model().kind, "consent");
};

// ----- signed out, and requests the page refuses -----

test("a signed-out visitor with a valid request is sent to sign in, and the request stays in the tab", async () => {
	const hash = requestHash();
	await withPage({ token: null, hash }, async (page) => {
		await page.flush();
		assert.equal(page.model().kind, "redirecting");
		// the way to sign-in is the same address, asked for again by the second run of the effect
		assert.deepEqual(page.replaced(), perRun(["/"]));
		assert.equal(
			JSON.parse(page.sessionData.get(APP_REQUEST_KEY)).state,
			stateOf(hash),
		);
		assert.equal(
			page.win.location.hash,
			"",
			"the fragment left the address",
		);
		assert.deepEqual(
			page.calls.filter((c) => c.fetchNetworkUser || c.mint),
			[],
		);
	});
});

test("the page leaves the marker that lets Layout bring this tab back, and only when it sends the tab to sign in", async () => {
	await withPage({ token: null }, async (page) => {
		await page.flush();
		const marker = page.sessionData.get(APP_SIGN_IN_KEY);
		assert.match(marker, /^[0-9]{13}$/, "the time, in milliseconds");
		assert.ok(Math.abs(Number(marker) - Date.now()) < 5_000);
		assert.deepEqual(
			[...page.sessionData.keys()].sort(),
			[APP_REQUEST_KEY, APP_SIGN_IN_KEY].sort(),
			"nothing else is written to the tab's storage",
		);
		assert.equal(
			page.localData.has(APP_SIGN_IN_KEY),
			false,
			"never in localStorage, which other tabs share",
		);
	});
	// signed in: nothing sends the tab anywhere, so there is no marker
	await withPage({}, async (page) => {
		await page.flush();
		assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
		assert.deepEqual(page.replaced(), []);
	});
});

test("a request that is not valid sends nobody to sign in and offers nothing", async () => {
	for (const hash of [
		"",
		requestHash({ v: "2" }),
		requestHash({ ts: "1000000000" }),
		`${requestHash()}&redirect_uri=x`,
		requestHash({ platform: "linux" }),
	]) {
		await withPage({ token: null, hash }, async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "request", hash.slice(0, 40));
			assert.deepEqual(
				page.calls.filter(
					(c) => c.replace || c.assign || c.fetchNetworkUser,
				),
				[],
			);
			assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
		});
	}
});

test("a query string on the page address makes the request invalid: no sign-in, no api call, nothing kept", async () => {
	// ?auth_code= signs a visitor in on any route of the manager: an approval must never ride on it
	for (const token of [null, ALPHA]) {
		for (const olderSlot of [false, true]) {
			const hash = requestHash();
			await withPage(
				{ token, hash, search: "?auth_code=ATTACKER", olderSlot },
				async (page) => {
					await page.flush();
					assert.deepEqual(
						page.captured,
						{ outcome: "rejected", reason: "query" },
						"the capture refused it",
					);
					assert.deepEqual(page.model(), {
						kind: "request",
						problem: "invalid",
					});
					assert.deepEqual(
						page.calls.filter(
							(c) =>
								c.replace ||
								c.assign ||
								c.fetchNetworkUser ||
								c.mint,
						),
						[],
					);
					assert.equal(
						page.sessionData.size,
						0,
						"no request, no marker, not even an older request",
					);
					assert.equal(page.win.location.hash, "");
					assert.equal(
						page.win.location.search,
						"?auth_code=ATTACKER",
					);
				},
			);
		}
	}
});

test("framed, or opened by another page: blocked at once, nothing called", async () => {
	for (const options of [{ framed: true }, { opener: {} }]) {
		await withPage({ ...options }, async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), {
				kind: "blocked",
				reason: options.framed ? "framed" : "opener",
			});
			assert.deepEqual(
				page.calls.filter(
					(c) => c.fetchNetworkUser || c.replace || c.mint,
				),
				[],
			);
			assert.equal(page.minted().length, 0);
		});
	}
});

test("framed, or opened by another page, and signed out: no way to sign in from there", async () => {
	for (const options of [
		{ framed: true },
		{ opener: {} },
		{ topThrows: true },
	]) {
		await withPage({ ...options, token: null }, async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "blocked");
			assert.deepEqual(
				page.replaced(),
				[],
				"the window is not sent anywhere",
			);
			assert.equal(
				page.sessionData.has(APP_SIGN_IN_KEY),
				false,
				"and no marker is left",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.fetchNetworkUser || c.mint),
				[],
			);
		});
	}
});

test("a parent window that cannot be read is a framed one", async () => {
	await withPage({ topThrows: true }, async (page) => {
		await page.flush();
		assert.deepEqual(page.model(), { kind: "blocked", reason: "framed" });
		assert.deepEqual(
			page.calls.filter((c) => c.fetchNetworkUser || c.mint || c.replace),
			[],
		);
	});
});

test("only the exact /login-app path is served: any other spelling is an invalid request", async () => {
	for (const pathname of ["/login-app/", "/Login-App", "/login-app/x"]) {
		await withPage({ pathname }, async (page) => {
			await page.flush();
			assert.deepEqual(
				page.model(),
				{ kind: "request", problem: "invalid" },
				pathname,
			);
			assert.equal(
				page.calls.some((c) => c.fetchNetworkUser),
				false,
			);
		});
	}
});

test("a request the browser would not keep leaves no older request to be approved in its place", async () => {
	await withPage(
		{ token: null, olderSlot: true, sessionSetFails: true },
		async (page) => {
			await page.flush();
			assert.deepEqual(page.captured, { outcome: "unstored" });
			assert.equal(
				page.sessionData.size,
				0,
				"the older request is gone, not left to be approved by this visit",
			);
			assert.deepEqual(page.model(), {
				kind: "request",
				problem: "invalid",
			});
			assert.deepEqual(page.replaced(), []);
		},
	);
	// and the same with a session that is signed in
	await withPage({ olderSlot: true, sessionSetFails: true }, async (page) => {
		await page.flush();
		assert.equal(page.sessionData.size, 0);
		assert.equal(page.model().kind, "request");
		assert.equal(
			page.calls.some((c) => c.fetchNetworkUser),
			false,
		);
	});
});

// ----- signed in: who is this, and the card -----

test("signed in: the api is asked who this is and the card shows the server's name, then Approve arms after 800 ms", async () => {
	const hash = requestHash();
	await withPage({ hash }, async (page) => {
		await page.flush();
		assert.deepEqual(
			page.calls.filter((c) => c.fetchNetworkUser),
			// a lookup is idempotent: StrictMode's second run of the effect asks again
			perRun([{ fetchNetworkUser: ALPHA }]),
		);
		const model = page.model();
		assert.deepEqual(Object.keys(model).sort(), [
			"armed",
			"busy",
			"kind",
			"label",
			"minting",
			"networkName",
			"problem",
			"server",
		]);
		assert.equal(model.kind, "consent");
		assert.equal(
			model.server,
			null,
			"a version 1 request is for the default server, which the card does not name",
		);
		assert.equal(
			model.networkName,
			"alpha-net",
			"the server's name, not the session's claim",
		);
		assert.equal(model.label, "URnetwork for Windows");
		assert.equal(model.armed, false, "inert at first");
		await page.advance(799);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, true, "armed at 800 ms");
		assert.equal(
			page.minted().length,
			0,
			"nothing minted by showing the card",
		);
	});
});

test("a 401 from the api ends the session and sends the person to sign in, request kept", async () => {
	const hash = requestHash();
	await withPage(
		{
			hash,
			userResponse: {
				error: { message: "HTTP error! status: 401", status: 401 },
			},
		},
		async (page) => {
			await page.flush();
			assert.equal(
				page.localData.has("byToken"),
				false,
				"the stored session is removed",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[{ setToken: null }],
			);
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.replaced(), ["/"]);
			assert.equal(
				JSON.parse(page.sessionData.get(APP_REQUEST_KEY)).state,
				stateOf(hash),
			);
			assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
		},
	);
});

test("an account with no sign-in method, and an api that is down, never get a card", async () => {
	await withPage(
		{
			userResponse: {
				network_user: { network_name: "x", auth_types: [] },
			},
		},
		async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), {
				kind: "identity",
				problem: "no-sign-in-method",
			});
		},
	);
	await withPage(
		{
			userResponse: {
				error: { message: "HTTP error! status: 500", status: 500 },
			},
		},
		async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), {
				kind: "identity",
				problem: "failed",
			});
			assert.equal(
				page.localData.has("byToken"),
				true,
				"a server error does not end the session",
			);
			const before = page.calls.filter((c) => c.fetchNetworkUser).length;
			assert.equal(before, perRun([0]).length);
			page.actions().onRetry();
			await page.flush();
			assert.equal(
				page.calls.filter((c) => c.fetchNetworkUser).length,
				before + 1,
				"Try again asks again, once",
			);
		},
	);
});

test("a different api server is refused before the session is sent, until the person removes it", async () => {
	await withPage({ apiBase: "https://other.example.test" }, async (page) => {
		await page.flush();
		assert.deepEqual(page.model(), {
			kind: "server",
			label: "URnetwork for Windows",
			apiHost: "other.example.test",
			requestedHost: null,
			armed: false,
		});
		assert.equal(
			page.calls.some((c) => c.fetchNetworkUser),
			false,
			"no call with the session",
		);
		// the button answers once the card has been in front of the person for a moment
		await page.advance(800);
		assert.equal(page.model().armed, true);
		page.actions().onUseDefaultServer(page.trusted);
		assert.equal(page.localData.has("urApiBase"), false);
		await page.flush();
		// the session belongs to the server that was left: it is gone, and the default server never
		// sees it; the person signs in there, and the request comes back with them
		assert.equal(page.localData.has("byToken"), false);
		assert.deepEqual(
			page.calls.filter((c) => c.fetchNetworkUser),
			[],
			"the session is not sent to the default server",
		);
		assert.deepEqual(page.events, [
			"remove byToken",
			"setToken null",
			"remove urApiBase",
		]);
		assert.equal(page.model().kind, "redirecting");
		assert.deepEqual(page.replaced(), ["/"]);
		assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
	});
});

test("Use the default server needs a settled session and a storage that really lets go of it; otherwise nothing changes", async () => {
	for (const options of [{ isLoggingOut: true }, { isTransitioning: true }]) {
		await withPage(
			{ apiBase: "https://other.example.test", ...options },
			async (page) => {
				await page.flush();
				await page.advance(800);
				page.actions().onUseDefaultServer(page.trusted);
				await page.flush();
				assert.deepEqual(page.events, []);
				assert.equal(
					page.localData.get("urApiBase"),
					"https://other.example.test",
				);
			},
		);
	}
	for (const options of [
		{ removeSessionThrows: true },
		{ removeSessionKeeps: true },
	]) {
		await withPage(
			{ apiBase: "https://other.example.test", ...options },
			async (page) => {
				await page.flush();
				await page.advance(800);
				page.actions().onUseDefaultServer(page.trusted);
				await page.flush();
				assert.equal(
					page.localData.get("urApiBase"),
					"https://other.example.test",
					"the server did not change",
				);
				assert.deepEqual(
					page.calls.filter(
						(c) => c.setToken !== undefined || c.fetchNetworkUser,
					),
					[],
				);
				assert.equal(page.model().kind, "server");
			},
		);
	}
});

// ----- the account on the card changes -----

test("another session replaces the one on the card: the card goes back to checking, Approve is off again, and the new account has its own 800 ms", async () => {
	const beta = deferred();
	await withPage(
		{
			userResponse: (t) => (t === ALPHA ? alphaUser : beta.promise),
		},
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			assert.equal(page.model().armed, true);
			assert.equal(page.model().networkName, "alpha-net");

			await page.swapToken(BETA);
			assert.deepEqual(
				page.model(),
				{ kind: "checking" },
				"no card for an account nobody has looked up yet",
			);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(
				page.minted().length,
				0,
				"nothing to approve while checking",
			);

			beta.resolve(betaUser);
			await page.flush();
			assert.equal(page.model().kind, "consent");
			assert.equal(page.model().networkName, "beta-net");
			assert.equal(
				page.model().armed,
				false,
				"inert again for the new account",
			);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(
				page.minted().length,
				0,
				"and a click in that time does nothing",
			);
			await page.advance(799);
			assert.equal(page.model().armed, false);
			await page.advance(1);
			assert.equal(page.model().armed, true);
		},
	);
});

test("an answer that arrives late for a session that was replaced neither ends the new session nor changes the card", async () => {
	const late = deferred();
	await withPage(
		{
			userResponse: (t) => (t === ALPHA ? late.promise : betaUser),
		},
		async (page) => {
			await page.flush();
			assert.equal(
				page.model().kind,
				"checking",
				"the first answer is pending",
			);
			await page.swapToken(BETA);
			assert.equal(page.model().kind, "consent");
			assert.equal(page.model().networkName, "beta-net");

			// the api finally says the old session is no good
			late.resolve({
				error: { message: "HTTP error! status: 401", status: 401 },
			});
			await page.flush();
			assert.equal(
				page.localData.get("byToken"),
				BETA,
				"the new session is still stored",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[],
				"nothing ended a session",
			);
			assert.equal(page.model().kind, "consent");
			assert.equal(page.model().networkName, "beta-net");
		},
	);
});

// ----- Approve, Cancel, Sign out -----

test("Approve: untrusted clicks and clicks before 800 ms do nothing; a trusted click mints once and navigates once", async () => {
	const hash = requestHash();
	await withPage({ hash }, async (page) => {
		await consentReady(page);
		// inert at first, even for a trusted click
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0);
		await page.advance(800);
		// armed, but not a real click
		await page.actions().onApprove(page.untrusted);
		await page.flush();
		assert.equal(
			page.minted().length,
			0,
			"a script-made click does nothing",
		);
		assert.deepEqual(page.assigned(), []);

		const first = page.actions().onApprove(page.trusted);
		const second = page.actions().onApprove(page.trusted);
		await Promise.all([first, second]);
		await page.flush();
		assert.deepEqual(
			page.minted(),
			[{ mint: { token: ALPHA, minutes: 2, uses: 1 } }],
			"one code, 2 minutes, 1 use",
		);
		const [address] = page.assigned();
		assert.equal(page.assigned().length, 1, "one navigation");
		assert.match(
			address,
			/^urnetwork:\/\/auth\?state=[A-Za-z0-9_-]{43}&epk=[1-9A-HJ-NP-Za-km-z]+&n=[1-9A-HJ-NP-Za-km-z]+&d=[1-9A-HJ-NP-Za-km-z]+$/,
		);
		const q = Object.fromEntries(new URL(address).searchParams);
		assert.equal(q.state, stateOf(hash));
		const shared = nacl.box.before(bs58.decode(q.epk), appKeys.secretKey);
		const opened = JSON.parse(
			new TextDecoder().decode(
				nacl.box.open.after(bs58.decode(q.d), bs58.decode(q.n), shared),
			),
		);
		assert.deepEqual(
			opened,
			{ c: CODE, s: stateOf(hash) },
			"the app opens it",
		);
		assert.equal(address.includes(CODE), false);
		assert.deepEqual(page.model(), { kind: "approved", canOpen: true });
		assert.equal(
			page.sessionData.has(APP_REQUEST_KEY),
			false,
			"the request is used up",
		);
		assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
		assert.deepEqual(page.warnings, [
			"[AppAuth] action=approve platform=windows",
		]);
		assert.equal(
			JSON.stringify([...page.sessionData, ...page.localData]).includes(
				CODE,
			),
			false,
			"the code is in no storage",
		);
	});
});

test("while the mint is under way the card is busy, and neither a second Approve nor a Cancel gets in", async () => {
	const mint = deferred();
	await withPage({ mint: () => mint.promise }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().busy, true, "busy while the mint is pending");
		assert.equal(page.model().problem, null);
		assert.equal(page.minted().length, 1);

		await page.actions().onApprove(page.trusted);
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 1, "no second mint");
		assert.deepEqual(
			page.assigned(),
			[],
			"and nothing was cancelled or approved yet",
		);
		assert.equal(page.model().kind, "consent");

		mint.resolve({ auth_code: CODE });
		await answered(click);
		await page.flush();
		assert.equal(page.model().kind, "approved");
		assert.equal(page.assigned().length, 1);
	});
});

test("onApprove does nothing until the request, the identity and the 800 ms are all there", async () => {
	// no request: nothing to approve
	await withPage({ hash: "" }, async (page) => {
		await page.flush();
		await page.actions().onApprove(page.trusted);
		assert.equal(page.minted().length, 0);
	});
	// identity not yet known
	const pending = deferred();
	await withPage({ userResponse: () => pending.promise }, async (page) => {
		await page.flush();
		assert.equal(page.model().kind, "checking");
		await page.advance(5_000);
		await page.actions().onApprove(page.trusted);
		assert.equal(page.minted().length, 0);
		pending.resolve(alphaUser);
		await page.flush();
		assert.equal(page.model().kind, "consent");
	});
});

test("Sign out runs the auth context's logout, and nothing else", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		page.actions().onSignOut();
		assert.deepEqual(
			page.calls.filter((c) => c.logout),
			[{ logout: true }],
		);
		assert.deepEqual(page.assigned(), [], "nothing is sent to the app");
		assert.equal(page.minted().length, 0);
		assert.equal(
			page.localData.get("byToken"),
			ALPHA,
			"the page does not clear the session itself",
		);
	});
});

test("after approval the sealed address is held for 60 seconds for the Open button, then dropped", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		const [address] = page.assigned();
		assert.deepEqual(page.model(), { kind: "approved", canOpen: true });
		// the button needs a real click, then navigates to the same address
		page.actions().onOpenApp(page.untrusted);
		assert.equal(page.assigned().length, 1);
		page.actions().onOpenApp(page.trusted);
		assert.deepEqual(page.assigned(), [address, address]);
		await page.advance(59_000);
		assert.equal(page.model().canOpen, true);
		await page.advance(1_000);
		assert.deepEqual(page.model(), { kind: "approved", canOpen: false });
		page.actions().onOpenApp(page.trusted);
		assert.equal(page.assigned().length, 2, "nothing is held any more");
	});
});

test("Cancel: a trusted click returns access_denied with the state, mints nothing and uses the request up", async () => {
	const hash = requestHash();
	await withPage({ hash }, async (page) => {
		await consentReady(page);
		page.actions().onCancel(page.untrusted);
		assert.deepEqual(page.assigned(), []);
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), [
			`urnetwork://auth?state=${stateOf(hash)}&error=access_denied`,
		]);
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.model(), { kind: "cancelled" });
		assert.equal(page.sessionData.has(APP_REQUEST_KEY), false);
		assert.deepEqual(page.warnings, [
			"[AppAuth] action=deny platform=windows",
		]);
		// Cancel works at once, with no inert time
	});
});

test("Cancel needs no waiting: it answers before Approve is armed", async () => {
	const hash = requestHash();
	await withPage({ hash }, async (page) => {
		await consentReady(page);
		assert.equal(page.model().armed, false);
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), [
			`urnetwork://auth?state=${stateOf(hash)}&error=access_denied`,
		]);
	});
	// and in a window that is not in front
	await withPage({ visible: false, focused: false }, async (page) => {
		await consentReady(page);
		page.actions().onCancel(page.trusted);
		assert.equal(page.assigned().length, 1);
	});
});

test("the session changed in another tab: the click mints nothing", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.set("byToken", BETA);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.deepEqual(page.model(), { kind: "session-changed" });
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.assigned(), []);
	});
});

test("the session ended in another tab: the click mints nothing and sign-in shows", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.delete("byToken");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0);
		assert.equal(page.model().kind, "redirecting");
		assert.deepEqual(page.replaced(), ["/"]);
		assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
	});
});

test("the mint's failures are shown, none navigates, and the person can try again", async () => {
	let next = { error: { auth_code_limit_exceeded: true, message: "limit" } };
	await withPage({ mint: async () => next }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().problem, "too-many");
		assert.equal(page.model().busy, false);
		next = { error: { message: "HTTP error! status: 500", status: 500 } };
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().problem, "failed");
		assert.deepEqual(page.assigned(), []);
		next = { auth_code: CODE };
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().kind, "approved");
		assert.equal(page.assigned().length, 1);
	});
	await withPage(
		{
			mint: async () => ({
				error: { message: "HTTP error! status: 401", status: 401 },
			}),
		},
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(
				page.localData.has("byToken"),
				false,
				"a 401 on the mint ends the session",
			);
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.assigned(), []);
		},
	);
});

test("a code that cannot become an answer is reported as broken: reload, no second code, nothing navigated", async () => {
	// longer than the budget allows: the sealing works, the address does not
	const tooLong = "Q".repeat(appAuth.MAX_CODE_LENGTH + 200);
	await withPage(
		{ mint: async () => ({ auth_code: tooLong }) },
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.minted().length, 1, "the code was minted");
			assert.equal(page.model().kind, "consent");
			assert.equal(page.model().problem, "broken");
			assert.equal(page.model().busy, false);
			assert.equal(
				page.model().armed,
				false,
				"another try would only be refused: the card says to reload",
			);
			assert.deepEqual(page.assigned(), []);
			assert.equal(
				page.sessionData.has(APP_REQUEST_KEY),
				true,
				"the reload finds the request",
			);
			// a click that gets through anyway mints nothing more
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(
				page.minted().length,
				1,
				"never a second code for this page load",
			);
			assert.equal(page.model().problem, "broken");
			// Reload is the way out
			page.actions().onReload();
			assert.deepEqual(
				page.calls.filter((c) => c.reload),
				[{ reload: true }],
			);
		},
	);
});

test("while the session is being ended or swapped, Approve is inert", async () => {
	for (const options of [{ isLoggingOut: true }, { isTransitioning: true }]) {
		await withPage(options, async (page) => {
			await consentReady(page);
			await page.advance(800);
			assert.equal(page.model().armed, false);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.minted().length, 0);
			assert.deepEqual(page.assigned(), []);
		});
	}
});

test("a different api server chosen after the card appeared mints nothing and shows the refusal", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.set("urApiBase", "https://evil.example.test");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0, "the session is not sent there");
		assert.equal(page.model().kind, "server");
	});
});

test("an edit of the fragment in this tab starts the page over; an empty one does not", async () => {
	await withPage({}, async (page) => {
		await page.flush();
		const [listener] = page.listeners.filter(
			(l) => l.type === "hashchange",
		);
		assert.ok(listener, "the page listens for a changed fragment");
		page.win.location.hash = "";
		listener.fn();
		assert.deepEqual(
			page.calls.filter((c) => c.reload),
			[],
		);
		page.win.location.hash = "#v=1&platform=windows";
		listener.fn();
		assert.deepEqual(
			page.calls.filter((c) => c.reload),
			[{ reload: true }],
		);
	});
});

test("nothing is held in the page's state after a Cancel or an approval but the one boolean the card needs", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		const props = JSON.stringify(Object.keys(page.model()));
		assert.equal(props, JSON.stringify(["kind", "canOpen"]));
		assert.equal(
			JSON.stringify(page.model()).includes("urnetwork"),
			false,
			"the address never reaches the view",
		);
	});
});

// ----- Approve only counts while the card is in front of the person -----

test("a card loaded in a background tab is never armed by the clock alone: it waits for the tab to be shown, then for 800 ms", async () => {
	await withPage({ visible: false }, async (page) => {
		await consentReady(page);
		await page.advance(60_000);
		assert.equal(page.model().armed, false, "a minute in the background");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0);

		await page.setVisible(true);
		assert.equal(page.model().armed, false, "shown: the 800 ms start now");
		await page.advance(799);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, true);
	});
});

test("a card in a window that does not have the focus waits for the focus, then for 800 ms", async () => {
	await withPage({ focused: false }, async (page) => {
		await consentReady(page);
		await page.advance(30_000);
		assert.equal(page.model().armed, false);
		await page.setFocused(true);
		assert.equal(page.model().armed, false);
		await page.advance(799);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, true);
	});
});

test("an armed card is disarmed when the tab is hidden or the window loses the focus, and arms again 800 ms after it is back", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		assert.equal(page.model().armed, true);

		await page.setVisible(false);
		assert.equal(page.model().armed, false, "hidden");
		await page.advance(5_000);
		assert.equal(
			page.model().armed,
			false,
			"and the time in the background does not count",
		);
		await page.setVisible(true);
		assert.equal(page.model().armed, false);
		await page.advance(799);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, true);

		await page.setFocused(false);
		assert.equal(page.model().armed, false, "focus lost");
		await page.advance(5_000);
		assert.equal(page.model().armed, false);
		await page.setFocused(true);
		assert.equal(page.model().armed, false);
		await page.advance(800);
		assert.equal(page.model().armed, true);
	});
});

test("a hidden tab restarts the 800 ms even when it comes back before the first 800 ms are over", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(700);
		await page.setVisible(false);
		await page.setVisible(true);
		await page.advance(799);
		assert.equal(
			page.model().armed,
			false,
			"700 ms of the old wait do not count",
		);
		await page.advance(1);
		assert.equal(page.model().armed, true);
	});
});

test("a click is refused while the tab is hidden or the window unfocused, even before the page has heard of it", async () => {
	for (const change of [
		(doc) => {
			doc.visibilityState = "hidden";
		},
		(doc) => {
			doc.focused = false;
		},
	]) {
		await withPage({}, async (page) => {
			await consentReady(page);
			await page.advance(800);
			assert.equal(page.model().armed, true);
			change(page.doc); // no event delivered yet
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.minted().length, 0);
			assert.deepEqual(page.assigned(), []);
		});
	}
});

test("the page listens for focus, blur and visibility changes, and nothing else on the document", async () => {
	await withPage({}, async (page) => {
		await page.flush();
		assert.deepEqual(page.listeners.map((l) => l.type).sort(), [
			"blur",
			"focus",
			"hashchange",
		]);
		assert.deepEqual(
			page.docListeners.map((l) => l.type),
			["visibilitychange"],
		);
	});
});

test("a document that cannot say whether it has the focus counts as not in front", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		assert.equal(page.model().armed, true);
		page.doc.hasFocus = () => {
			throw new Error("no");
		};
		await page.setVisible(true);
		assert.equal(page.model().armed, false);
	});
});

// ----- the api calls give up after 30 seconds -----

test("an api that never answers the identity check is given up after 30 seconds, and the person gets Try again", async () => {
	let behaviour = "hang";
	await withPage(
		{
			userResponse: (t, signal) =>
				behaviour === "hang" ? hang(signal) : alphaUser,
		},
		async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), { kind: "checking" });
			assert.equal(page.signals.length, perRun([0]).length);
			// the request that counts is the last one (StrictMode's first run was torn down)
			const { api, signal } = page.signals.at(-1);
			assert.equal(api, "user");
			assert.ok(
				signal instanceof AbortSignal,
				"the page hands the call a signal",
			);
			await page.advance(29_999);
			assert.equal(signal.aborted, false);
			assert.deepEqual(page.model(), { kind: "checking" });
			await page.advance(1);
			assert.equal(signal.aborted, true, "aborted at 30 s");
			assert.equal(
				signal.reason.name,
				"AbortError",
				"the time limit gives the ordinary reason, not the one of a call that was called back",
			);
			assert.deepEqual(page.model(), {
				kind: "identity",
				problem: "failed",
			});
			assert.equal(
				page.localData.has("byToken"),
				true,
				"a timeout does not end the session",
			);

			behaviour = "ok";
			const before = page.signals.length;
			page.actions().onRetry();
			await page.flush();
			assert.equal(
				page.signals.length,
				before + 1,
				"Try again asks again, with a signal of its own",
			);
			assert.notEqual(page.signals.at(-1).signal, signal);
			assert.equal(page.model().kind, "consent");
		},
	);
});

test("an answer that comes in time stops the clock: the signal is never aborted afterwards", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(60_000);
		assert.equal(page.signals.length, perRun([0]).length);
		// the request that counts is the last one; a first run that was torn down (StrictMode)
		// has been called back, and the clock of the last one is what this is about
		assert.equal(page.signals.at(-1).signal.aborted, false);
		assert.equal(page.model().kind, "consent");
	});
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		await page.advance(60_000);
		const mint = page.signals.find((s) => s.api === "mint");
		assert.ok(mint.signal instanceof AbortSignal);
		assert.equal(mint.signal.aborted, false);
	});
});

test("an api that never answers the mint is given up after 30 seconds: nothing is navigated, the person can try again", async () => {
	let behaviour = "hang";
	await withPage(
		{
			mint: (t, minutes, uses, signal) =>
				behaviour === "hang" ? hang(signal) : { auth_code: CODE },
		},
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			const click = page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.model().busy, true);
			const signal = page.signals.find((s) => s.api === "mint").signal;
			assert.ok(signal instanceof AbortSignal);
			await page.advance(29_999);
			assert.equal(signal.aborted, false);
			assert.equal(page.model().busy, true);
			await page.advance(1);
			await answered(click);
			await page.flush();
			assert.equal(signal.aborted, true, "aborted at 30 s");
			assert.equal(page.model().busy, false);
			assert.equal(page.model().problem, "failed");
			assert.deepEqual(page.assigned(), []);

			behaviour = "ok";
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.model().kind, "approved");
			assert.equal(page.assigned().length, 1);
		},
	);
});

// ----- the sealing chunk: the one download Approve waits for -----

/** the address Cancel answers with, for a request made by requestHash() */
const denyAddress = (hash) =>
	`urnetwork://auth?state=${stateOf(hash)}&error=access_denied`;

test("the sealing chunk failed to load: the click says to reload, Approve stays off, nothing is minted, and Cancel still answers", async () => {
	const hash = requestHash();
	await withPage({ hash, seal: "reject" }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		assert.equal(page.model().armed, true, "the card cannot know yet");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0, "no code was minted");
		assert.deepEqual(page.assigned(), []);
		const model = page.model();
		assert.equal(model.kind, "consent");
		assert.equal(
			model.problem,
			"broken",
			"the reload text, not the try-again one: the browser keeps a failed import",
		);
		assert.equal(model.armed, false, "another click cannot help");
		assert.equal(model.busy, false, "the wait is over");
		assert.equal(model.minting, false, "and Cancel is live");
		assert.equal(
			page.sessionData.has(APP_REQUEST_KEY),
			true,
			"the request survives a reload",
		);

		// a click that gets through anyway still mints nothing
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0);
		assert.equal(page.model().problem, "broken");

		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), [denyAddress(hash)]);
		assert.deepEqual(page.model(), { kind: "cancelled" });
		assert.equal(page.minted().length, 0);
	});
});

test("the sealing chunk never arrives: Cancel answers while it is awaited, and after 15 seconds the card says to reload", async () => {
	const hash = requestHash();
	await withPage({ hash, seal: "hang" }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().busy, true, "Approving...");
		assert.equal(
			page.model().minting,
			false,
			"no code is being asked for: Cancel is live",
		);
		assert.equal(page.minted().length, 0);

		await page.advance(14_999);
		assert.equal(page.model().busy, true);
		assert.equal(page.model().problem, null);
		await page.advance(1);
		await answered(click);
		await page.flush();
		assert.equal(page.model().busy, false, "the limit ended the wait");
		assert.equal(page.model().problem, "broken");
		assert.equal(page.model().armed, false);
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.assigned(), []);

		// the chunk coming in late changes nothing: no code, no answer
		await page.arrive();
		await page.advance(60_000);
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.assigned(), []);
		assert.equal(page.model().problem, "broken");

		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), [denyAddress(hash)]);
		assert.deepEqual(page.model(), { kind: "cancelled" });
	});
});

test("Cancel answers while the sealing chunk is still being awaited, and a chunk that arrives afterwards mints nothing", async () => {
	const hash = requestHash();
	await withPage({ hash, seal: "hang" }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().busy, true);
		assert.equal(page.model().minting, false);

		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), [denyAddress(hash)]);
		assert.deepEqual(page.model(), { kind: "cancelled" });

		await page.arrive();
		await answered(click);
		await page.advance(60_000);
		assert.equal(page.minted().length, 0, "the person said no");
		assert.deepEqual(
			page.assigned(),
			[denyAddress(hash)],
			"one navigation: the Cancel",
		);
		assert.deepEqual(page.model(), { kind: "cancelled" });
		assert.deepEqual(page.warnings, [
			"[AppAuth] action=deny platform=windows",
		]);
	});
});

test("a chunk that is slow but in time is used: the wait ends with the approval, and the clock stops", async () => {
	await withPage({ seal: "hang" }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		await page.advance(9_000);
		assert.equal(page.model().busy, true);
		await page.arrive();
		await answered(click);
		await page.flush();
		assert.equal(page.model().kind, "approved");
		assert.equal(page.minted().length, 1);
		assert.equal(page.assigned().length, 1);
		await page.advance(60_000);
		assert.equal(
			page.minted().length,
			1,
			"the limit does not fire afterwards",
		);
	});
});

test("once a code is being minted Cancel is refused and shows as such", async () => {
	const mint = deferred();
	await withPage({ mint: () => mint.promise }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const before = page.actions(); // what an earlier render handed out
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().busy, true);
		assert.equal(page.model().minting, true, "Cancel is off from here");
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.deepEqual(page.assigned(), []);

		// a second click that was already on its way (it still sees the card as idle)
		// does not take the card back from minting to loading
		await before.onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().minting, true, "still minting");
		assert.equal(page.minted().length, 1, "and still the one code");

		mint.resolve({ auth_code: CODE });
		await answered(click);
		await page.flush();
		assert.equal(page.model().kind, "approved");
	});
	// and when the mint fails, Cancel is back, for the card and for the controller
	await withPage(
		{
			mint: async () => ({
				error: { message: "HTTP error! status: 500", status: 500 },
			}),
		},
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.model().minting, false);
			assert.equal(page.model().busy, false);
			assert.equal(page.model().problem, "failed");
			page.actions().onCancel(page.trusted);
			await page.flush();
			assert.equal(page.assigned().length, 1, "Cancel answers");
			assert.deepEqual(page.model(), { kind: "cancelled" });
		},
	);
});

test("a public key the page cannot seal to ends as an invalid link: no code, the request is dropped, and nothing invites another try", async () => {
	// u = 1 is a point of small order: 43 characters, so the parser takes it, and only sealing refuses it
	const smallOrder = bs58.encode(
		Uint8Array.from({ length: 32 }, (_, i) => (i === 0 ? 1 : 0)),
	);
	assert.equal(smallOrder.length, 43);
	await withPage({ hash: requestHash({ pk: smallOrder }) }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		assert.equal(page.model().armed, true);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.deepEqual(page.model(), { kind: "request", problem: "invalid" });
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.assigned(), []);
		assert.equal(
			page.sessionData.has(APP_REQUEST_KEY),
			false,
			"dropped: a reload has nothing to show either",
		);
		assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
		assert.deepEqual(page.warnings, []);

		// nothing is left to click, and a click that gets through mints nothing
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.model(), { kind: "request", problem: "invalid" });
	});
});

// ----- the session on the page and the session in storage -----

test("a late 401 for a session another tab has since replaced signs this page out but leaves the newer session stored", async () => {
	const late = deferred();
	await withPage(
		{ userResponse: (t) => (t === ALPHA ? late.promise : betaUser) },
		async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "checking");
			// another tab signs in to something else; nothing tells this page's context
			page.localData.set("byToken", BETA);
			late.resolve({
				error: { message: "HTTP error! status: 401", status: 401 },
			});
			await page.flush();
			assert.equal(
				page.localData.get("byToken"),
				BETA,
				"the other tab's session is not this page's to end",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[{ setToken: null }],
				"this page's own, rejected, session is ended",
			);
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(
				page.replaced(),
				["/"],
				"and the way back to sign-in finds the newer session",
			);
			assert.equal(page.minted().length, 0);
		},
	);
});

test("the network is the session's network_id claim: a renamed network is the same one, another network with the same name is not", async () => {
	// ALPHA is network net-alpha with the name claim jwt-alpha
	const RENAMED = jwt({ network_id: "net-alpha", network_name: "renamed" });
	const IMPOSTOR = jwt({
		network_id: "net-other",
		network_name: "jwt-alpha",
	});
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.set("byToken", RENAMED);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().kind, "approved");
		assert.deepEqual(page.minted(), [
			{ mint: { token: RENAMED, minutes: 2, uses: 1 } },
		]);
	});
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.set("byToken", IMPOSTOR);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.deepEqual(page.model(), { kind: "session-changed" });
		assert.equal(page.minted().length, 0);
		assert.deepEqual(page.assigned(), []);
	});
});

// ----- what the person sees after a refused address, and between two tries -----

test("a browser that refuses the address does not stop the page: Approve still ends on the approved card with its button, Cancel on the cancelled one", async () => {
	await withPage({ assignThrows: true }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.assigned().length, 1, "it tried the address once");
		assert.deepEqual(page.model(), { kind: "approved", canOpen: true });
		assert.equal(page.sessionData.has(APP_REQUEST_KEY), false);
		assert.deepEqual(page.warnings, [
			"[AppAuth] action=approve platform=windows",
		]);
	});
	await withPage({ assignThrows: true }, async (page) => {
		await consentReady(page);
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.equal(page.assigned().length, 1);
		assert.deepEqual(page.model(), { kind: "cancelled" });
		assert.equal(page.sessionData.has(APP_REQUEST_KEY), false);
		assert.deepEqual(page.warnings, [
			"[AppAuth] action=deny platform=windows",
		]);
	});
});

test("the problem from the last try is gone while the next mint is pending", async () => {
	const next = deferred();
	let attempt = 0;
	await withPage(
		{
			mint: async () =>
				++attempt === 1
					? {
							error: {
								auth_code_limit_exceeded: true,
								message: "limit",
							},
						}
					: next.promise,
		},
		async (page) => {
			await consentReady(page);
			await page.advance(800);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.model().problem, "too-many");

			const click = page.actions().onApprove(page.trusted);
			await page.flush();
			assert.equal(page.model().busy, true);
			assert.equal(
				page.model().problem,
				null,
				"the old message does not sit beside the new attempt",
			);
			next.resolve({ auth_code: CODE });
			await answered(click);
			await page.flush();
			assert.equal(page.model().kind, "approved");
		},
	);
});

// ----- version 2: a request that names its network -----

const v2Hash = (over = {}) => requestHash({ v: "2", api: APP_API, ...over });

/** the slot the page keeps for a version 2 request, as the hard load after signing in finds it */
const v2Slot = (over = {}) => ({
	platform: "windows",
	state: Buffer.from(nacl.randomBytes(32)).toString("base64url"),
	pk: bs58.encode(appKeys.publicKey),
	ts: Math.floor(Date.now() / 1000),
	api: APP_API,
	...over,
});

/** what the card for a browser on the wrong server says, for a request that names APP_API
 * (inert, as it is when it appears: its buttons answer 800 ms after the person has it in front of them) */
const wrongServer = (apiHost = "api.example.test", over = {}) => ({
	kind: "server",
	label: "URnetwork for Windows",
	apiHost,
	requestedHost: APP_API,
	armed: false,
	...over,
});

/** every call that carries the session or asks for a code */
const apiCalls = (page) =>
	page.calls.filter((c) => c.fetchNetworkUser || c.mint);

test("a version 2 request while the browser is set to another server: the card names the app's host, and nothing is called, nobody is sent to sign in", async () => {
	for (const token of [ALPHA, null]) {
		await withPage({ token, hash: v2Hash() }, async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), wrongServer());
			// time passes, the tab is hidden and shown, the window loses the focus: still nothing
			await page.advance(60_000);
			await page.setVisible(false);
			await page.setVisible(true);
			await page.setFocused(false);
			await page.setFocused(true);
			assert.equal(page.model().kind, "server");
			assert.deepEqual(
				apiCalls(page),
				[],
				"no call with the session, and none without",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.replace || c.assign),
				[],
				"nobody is sent anywhere",
			);
			assert.equal(
				page.sessionData.has(APP_SIGN_IN_KEY),
				false,
				"no marker",
			);
			assert.equal(
				JSON.parse(page.sessionData.get(APP_REQUEST_KEY)).api,
				APP_API,
				"the request is kept",
			);
			assert.equal(
				page.localData.get("byToken") ?? null,
				token,
				"the session is as it was",
			);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[],
			);
			assert.deepEqual(
				page.events,
				[],
				"and nothing was written to the storage",
			);
		});
	}
});

test("Switch: the session goes first, then the server is set to https://host, then the tab is sent to sign in; no call is made with the session", async () => {
	const hash = v2Hash();
	for (const token of [ALPHA, null]) {
		await withPage({ token, hash }, async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "server");
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.deepEqual(
				page.events,
				[
					"remove byToken",
					"setToken null",
					`set urApiBase=${APP_BASE}`,
				],
				"the stored session, the page's copy, then the server: in that order",
			);
			assert.equal(page.localData.has("byToken"), false);
			assert.equal(page.localData.get("urApiBase"), APP_BASE);
			assert.equal(page.auth.token, null);
			// the person is sent to sign in on the server that was just set, with the way back
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.replaced(), ["/"]);
			assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
			const kept = JSON.parse(page.sessionData.get(APP_REQUEST_KEY));
			assert.equal(kept.state, stateOf(hash));
			assert.equal(kept.api, APP_API);
			// not once was the api called, with the session or without it, and the app was not answered
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(page.assigned(), []);
			assert.deepEqual(
				page.warnings,
				[],
				"Switch writes no console line, and is not logout",
			);
			assert.equal(
				page.calls.some((c) => c.logout),
				false,
			);
		});
	}
});

test("the way back after Switch and sign-in: the stored version 2 request meets the server it names, the account check and the mint go there, and the answer is the contract's", async () => {
	const slot = v2Slot();
	await withPage(
		{ hash: "", seededSlot: slot, apiBase: APP_BASE },
		async (page) => {
			await consentReady(page);
			assert.deepEqual(
				page.signals.filter((s) => s.api === "user").map((s) => s.base),
				perRun([APP_BASE]),
				"the account check went to the server the app is on",
			);
			assert.equal(page.model().networkName, "alpha-net");
			await page.advance(800);
			await page.actions().onApprove(page.trusted);
			await page.flush();
			assert.deepEqual(
				page.signals.filter((s) => s.api === "mint").map((s) => s.base),
				[APP_BASE],
				"and so did the one mint",
			);
			assert.equal(page.minted().length, 1);
			const [address] = page.assigned();
			assert.equal(page.assigned().length, 1);
			const q = Object.fromEntries(new URL(address).searchParams);
			assert.deepEqual(Object.keys(q), ["state", "epk", "n", "d"]);
			assert.equal(q.state, slot.state);
			const shared = nacl.box.before(
				bs58.decode(q.epk),
				appKeys.secretKey,
			);
			const opened = JSON.parse(
				new TextDecoder().decode(
					nacl.box.open.after(
						bs58.decode(q.d),
						bs58.decode(q.n),
						shared,
					),
				),
			);
			assert.deepEqual(
				opened,
				{ c: CODE, s: slot.state },
				"the box holds the code and the state, as in version 1",
			);
			assert.equal(
				address.includes(APP_API),
				false,
				"the host is in no address",
			);
			assert.deepEqual(page.model(), { kind: "approved", canOpen: true });
			assert.equal(
				page.sessionData.has(APP_REQUEST_KEY),
				false,
				"the request is used up",
			);
			assert.deepEqual(page.warnings, [
				"[AppAuth] action=approve platform=windows",
			]);
		},
	);
});

test("a version 2 request on the server it names: signed out, the tab is sent to sign in at once, with no card in between", async () => {
	await withPage(
		{ token: null, hash: v2Hash(), apiBase: APP_BASE },
		async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.replaced(), perRun(["/"]));
			assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(
				page.events,
				[],
				"the server and the storage are as they were",
			);
		},
	);
});

test("a version 2 request is for the server it names and for no other, at the click as well as at the card", async () => {
	await withPage({ hash: v2Hash(), apiBase: APP_BASE }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		// another tab, or Change Network API, moves the browser after the card was drawn
		page.localData.set("urApiBase", "https://evil.example.test");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.minted().length, 0, "no code is asked for anywhere");
		assert.deepEqual(page.assigned(), []);
		assert.deepEqual(page.model(), wrongServer("evil.example.test"));
		assert.deepEqual(
			page.signals.filter((s) => s.api === "mint"),
			[],
		);
		// Switch from there goes to the server the app is on, and signs out of the one it leaves
		// (the card that has just replaced the consent card starts inert, like any card)
		await page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.equal(
			page.model().kind,
			"server",
			"still inert: the card is new",
		);
		assert.equal(page.localData.has("urApiBase"), true);
		assert.equal(
			page.localData.get("urApiBase"),
			"https://evil.example.test",
		);
		await page.advance(800);
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.equal(page.localData.get("urApiBase"), APP_BASE);
		assert.equal(page.localData.has("byToken"), false);
		assert.equal(page.model().kind, "redirecting");
		assert.equal(page.minted().length, 0);
	});
	// and the default server is not the server it names
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		assert.equal(page.model().kind, "server");
		assert.equal(page.minted().length, 0);
		await page.actions().onApprove(page.trusted);
		assert.equal(
			page.minted().length,
			0,
			"there is no Approve to press, and a stray call mints nothing",
		);
	});
});

test("Cancel on the Different API server card answers the app like any Cancel: access_denied with the state, nothing called, nothing written", async () => {
	for (const token of [ALPHA, null]) {
		const hash = v2Hash();
		await withPage({ token, hash }, async (page) => {
			await page.flush();
			page.actions().onCancel(page.untrusted);
			await page.flush();
			assert.deepEqual(
				page.assigned(),
				[],
				"a script-made click does nothing",
			);
			page.actions().onCancel(page.trusted);
			await page.flush();
			assert.deepEqual(page.assigned(), [denyAddress(hash)]);
			assert.deepEqual(page.model(), { kind: "cancelled" });
			assert.equal(
				page.sessionData.has(APP_REQUEST_KEY),
				false,
				"the request is used up",
			);
			assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(
				page.events,
				[],
				"the session and the server are left as they were",
			);
			assert.equal(page.localData.get("byToken") ?? null, token);
			assert.deepEqual(page.warnings, [
				"[AppAuth] action=deny platform=windows",
			]);
		});
	}
});

test("Switch needs a trusted click and a settled session, and a storage that really lets go of the session; otherwise nothing changes", async () => {
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		await page.advance(800);
		page.actions().onSwitchServer(page.untrusted);
		await page.flush();
		assert.deepEqual(page.events, [], "a script-made click does nothing");
		assert.equal(page.model().kind, "server");
	});
	for (const options of [{ isLoggingOut: true }, { isTransitioning: true }]) {
		await withPage({ hash: v2Hash(), ...options }, async (page) => {
			await page.flush();
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.deepEqual(
				page.events,
				[],
				`${Object.keys(options)[0]}: the session is about to change`,
			);
			assert.equal(page.model().kind, "server");
		});
	}
	for (const options of [
		{ removeSessionThrows: true },
		{ removeSessionKeeps: true },
	]) {
		await withPage({ hash: v2Hash(), ...options }, async (page) => {
			await page.flush();
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			const why = Object.keys(options)[0];
			assert.equal(
				page.localData.has("urApiBase"),
				false,
				`${why}: the server did not change`,
			);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[],
				`${why}: nothing was half done`,
			);
			assert.equal(page.model().kind, "server", `${why}: the card stays`);
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(page.replaced(), []);
		});
	}
	// the session went but the server cannot be written: the card stays, signed out, nothing is called
	await withPage(
		{ hash: v2Hash(), writeServerThrows: true },
		async (page) => {
			await page.flush();
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.deepEqual(page.events, ["remove byToken", "setToken null"]);
			assert.equal(page.localData.has("urApiBase"), false);
			assert.equal(page.model().kind, "server");
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(page.replaced(), []);
		},
	);
});

test("Switch does nothing for a host the page could not use: the card stays, the session stays, nothing is written", async () => {
	// each passes the grammar and the url parser of the engine running this test does not give it
	// back as the same host: a bad punycode label is no name (a last label that reads as a number is
	// refused by the grammar itself, and never gets a card: the next test)
	const unusable = [
		"xn--a.example",
		"xn--aa.example",
		"xn--zzzz.example",
		"a.xn--a",
	].filter((host) => {
		try {
			return new URL(`https://${host}`).host !== host;
		} catch {
			return true;
		}
	});
	assert.ok(
		unusable.length > 0,
		"this engine refuses at least one bad punycode label",
	);
	for (const api of unusable) {
		await withPage({ hash: requestHash({ v: "2", api }) }, async (page) => {
			await page.flush();
			assert.deepEqual(
				page.model(),
				wrongServer("api.example.test", { requestedHost: api }),
				api,
			);
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.deepEqual(page.events, [], `${api}: nothing was touched`);
			assert.equal(
				page.localData.get("byToken"),
				ALPHA,
				`${api}: still signed in`,
			);
			assert.equal(page.localData.has("urApiBase"), false);
			assert.deepEqual(page.replaced(), []);
			assert.deepEqual(apiCalls(page), []);
			// and Cancel still answers the app
			page.actions().onCancel(page.trusted);
			assert.equal(page.assigned().length, 1, `${api}: Cancel answers`);
		});
	}
});

test("Switch is not a version 1 action: no request names a server to go to, so a stray call changes nothing", async () => {
	await withPage({ apiBase: "https://other.example.test" }, async (page) => {
		await page.flush();
		assert.equal(page.model().requestedHost, null);
		await page.advance(800);
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, []);
		assert.equal(
			page.localData.get("urApiBase"),
			"https://other.example.test",
		);
		assert.equal(page.localData.get("byToken"), ALPHA);
	});
	// no request at all
	await withPage({ hash: "" }, async (page) => {
		await page.flush();
		await page.advance(800);
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, []);
	});
});

test("two clicks on Switch do what one does", async () => {
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		await page.advance(800);
		const { onSwitchServer } = page.actions();
		onSwitchServer(page.trusted);
		onSwitchServer(page.trusted);
		await page.flush();
		assert.equal(page.localData.get("urApiBase"), APP_BASE);
		assert.equal(page.localData.has("byToken"), false);
		assert.deepEqual(page.replaced(), ["/"], "sent to sign in once");
		assert.deepEqual(apiCalls(page), []);
		for (const event of page.events) {
			assert.ok(
				[
					"remove byToken",
					"setToken null",
					`set urApiBase=${APP_BASE}`,
				].includes(event),
				event,
			);
		}
	});
});

test("Switch to the host the default server already has removes the override instead of setting one", async () => {
	// the browser is on some other server; the app is on the default server's host
	const hash = requestHash({ v: "2", api: "api.example.test" });
	await withPage(
		{ hash, apiBase: "https://other.example.test" },
		async (page) => {
			await page.flush();
			assert.deepEqual(
				page.model(),
				wrongServer("other.example.test", {
					requestedHost: "api.example.test",
				}),
			);
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.equal(page.localData.has("urApiBase"), false);
			assert.deepEqual(page.events, [
				"remove byToken",
				"setToken null",
				"remove urApiBase",
			]);
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.replaced(), ["/"]);
		},
	);
	// the browser already is on the default server: that is the server the request names
	await withPage({ hash }, async (page) => {
		await consentReady(page);
		assert.deepEqual(
			page.signals.filter((s) => s.api === "user").map((s) => s.base),
			perRun([DEFAULT_BASE]),
		);
	});
});

test("a default server that is http can never be the one a version 2 request names: Switch sets the https one", async () => {
	const plain = "http://mock.localhost:5198";
	await withPage(
		{ hash: v2Hash(), defaultBase: plain, apiBase: plain },
		async (page) => {
			await page.flush();
			assert.deepEqual(
				page.model(),
				wrongServer("http://mock.localhost:5198"),
				"the same host over http reads as another server",
			);
			assert.deepEqual(apiCalls(page), []);
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.equal(
				page.localData.get("urApiBase"),
				APP_BASE,
				"set, not removed",
			);
			assert.deepEqual(page.events, [
				"remove byToken",
				"setToken null",
				`set urApiBase=${APP_BASE}`,
			]);
		},
	);
});

test("a relative default server resolves against the page: on an https page it can be the one the request names, on an http page it cannot", async () => {
	const onThePage = requestHash({ v: "2", api: "manager.example" });
	await withPage(
		{
			hash: onThePage,
			defaultBase: "/api",
			apiBase: "/api",
			origin: "https://manager.example",
		},
		async (page) => {
			await consentReady(page);
			assert.deepEqual(
				page.signals.filter((s) => s.api === "user").map((s) => s.base),
				perRun(["/api"]),
			);
		},
	);
	await withPage(
		{
			hash: onThePage,
			defaultBase: "/api",
			apiBase: "/api",
			origin: "http://manager.example",
		},
		async (page) => {
			await page.flush();
			assert.deepEqual(
				page.model(),
				wrongServer("http://manager.example", {
					requestedHost: "manager.example",
				}),
				"a relative base on an http page is shown with its scheme",
			);
			assert.deepEqual(apiCalls(page), []);
		},
	);
	// version 1 compares the base with the default as text, and a relative default is the default
	await withPage(
		{
			defaultBase: "/api",
			apiBase: "/api",
			origin: "http://manager.example",
		},
		async (page) => {
			await consentReady(page);
		},
	);
});

test("a version 1 request is for the default server only, even where a version 2 request would be at home", async () => {
	// the browser is on the very server a version 2 request would name: still not the default
	await withPage({ apiBase: APP_BASE }, async (page) => {
		await page.flush();
		assert.deepEqual(page.model(), {
			kind: "server",
			label: "URnetwork for Windows",
			apiHost: APP_API,
			requestedHost: null,
			armed: false,
		});
		assert.deepEqual(apiCalls(page), []);
	});
});

test("a version 1 request on another server is judged first, signed out too: the card, no sign-in; the default server then brings the sign-in", async () => {
	await withPage(
		{ token: null, apiBase: "https://other.example.test" },
		async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "server");
			assert.deepEqual(page.replaced(), []);
			assert.equal(page.sessionData.has(APP_SIGN_IN_KEY), false);
			assert.deepEqual(apiCalls(page), []);
			await page.advance(800);
			page.actions().onUseDefaultServer(page.trusted);
			await page.flush();
			assert.equal(page.model().kind, "redirecting");
			assert.deepEqual(page.replaced(), ["/"]);
			assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
		},
	);
});

test("an api that takes 20 seconds to say who this is, or to mint, is waited for: the limit is 30", async () => {
	const slow = deferred();
	await withPage({ userResponse: () => slow.promise }, async (page) => {
		await page.flush();
		assert.equal(page.model().kind, "checking");
		await page.advance(20_000);
		assert.equal(page.model().kind, "checking", "not Try again");
		slow.resolve(alphaUser);
		await page.flush();
		assert.equal(page.model().kind, "consent");
		assert.equal(
			page.signals.at(-1).signal.aborted,
			false,
			"the request that counts was never given up",
		);
	});
	const slowMint = deferred();
	await withPage({ mint: () => slowMint.promise }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		await page.advance(20_000);
		assert.equal(page.model().busy, true);
		assert.equal(page.model().problem, null, "not a failure yet");
		slowMint.resolve({ auth_code: CODE });
		await answered(click);
		await page.flush();
		assert.equal(page.model().kind, "approved");
	});
});

test("the sealing chunk keeps its own, shorter limit while the api calls wait 30 seconds", async () => {
	await withPage({ seal: "hang" }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		const click = page.actions().onApprove(page.trusted);
		await page.flush();
		await page.advance(14_999);
		assert.equal(page.model().busy, true);
		await page.advance(1);
		await answered(click);
		await page.flush();
		assert.equal(
			page.model().problem,
			"broken",
			"given up at 15 s, not at 30",
		);
		assert.equal(page.minted().length, 0);
	});
});

test("a version 2 request that is not valid is the generic card, and calls and writes nothing", async () => {
	for (const api of [
		"localhost",
		"API.beta-test.net",
		"api.beta-test.net:443",
		"127.0.0.1:5198",
		// last labels a url parser reads as a number: an address in disguise, or no host at all
		"example.0x10",
		"1.2.3.0x4",
		"0x7f.0x0.0x0.0x1",
		"a.0x",
		"x".repeat(300),
	]) {
		for (const token of [ALPHA, null]) {
			await withPage(
				{ token, hash: requestHash({ v: "2", api }) },
				async (page) => {
					await page.flush();
					assert.deepEqual(
						page.model(),
						{ kind: "request", problem: "invalid" },
						api.slice(0, 30),
					);
					assert.deepEqual(apiCalls(page), []);
					assert.deepEqual(page.replaced(), []);
					assert.equal(page.sessionData.has(APP_REQUEST_KEY), false);
					assert.deepEqual(page.events, []);
				},
			);
		}
	}
	// version 2 without api, version 1 with api, and a version the page does not know
	for (const hash of [
		requestHash({ v: "2" }),
		requestHash({ api: APP_API }),
	]) {
		await withPage({ hash }, async (page) => {
			await page.flush();
			assert.deepEqual(page.model(), {
				kind: "request",
				problem: "invalid",
			});
		});
	}
	await withPage({ hash: requestHash({ v: "3" }) }, async (page) => {
		await page.flush();
		assert.deepEqual(page.model(), {
			kind: "request",
			problem: "unsupported",
		});
	});
});

test("framed, or opened by another page, a version 2 request is blocked and sends nobody anywhere", async () => {
	for (const options of [{ framed: true }, { opener: {} }]) {
		await withPage({ hash: v2Hash(), ...options }, async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "blocked");
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(page.replaced(), []);
		});
	}
});

// ----- the review round: the session of another tab, the inert server card, a stale request, a torn-down check -----

/** Tab 2 pressed Switch (or Change Network API): the stored session is gone and the browser is
 * set to another server. This page's tab was not told; its copy of the session is still in memory. */
const anotherTabSwitched = (page, base = APP_BASE) => {
	page.localData.delete("byToken");
	page.localData.set("urApiBase", base);
};

test("the person leaves a card, switches in another tab and comes back: this tab's copy of the session is not sent to the new server, the page signs itself out", async () => {
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		assert.equal(
			page.model().kind,
			"server",
			"the browser is on another server",
		);
		await page.setVisible(false);
		anotherTabSwitched(page);
		// back in this tab: the server is the one the request names, and the page still holds the session
		await page.setVisible(true);
		await page.setFocused(true);
		assert.deepEqual(
			apiCalls(page),
			[],
			"the session was not sent to the server it never belonged to",
		);
		assert.deepEqual(
			page.calls.filter((c) => c.setToken !== undefined),
			[{ setToken: null }],
			"the page's copy is dropped",
		);
		assert.equal(page.auth.token, null);
		// signed out on the right server: the way to sign-in, as ever
		assert.equal(page.model().kind, "redirecting");
		assert.deepEqual(page.replaced(), ["/"]);
		assert.match(page.sessionData.get(APP_SIGN_IN_KEY), /^[0-9]{13}$/);
	});
});

test("another tab signed in to something else: the page does not send its own copy either, and signs out to find what is stored", async () => {
	await withPage({ hash: v2Hash(), apiBase: APP_BASE }, async (page) => {
		// the account check is under way on the right server when the other tab replaces the session
		await consentReady(page);
		await page.advance(800);
		page.localData.set("byToken", BETA);
		// anything that makes the page look again: a retry of the account check
		page.actions().onRetry();
		await page.flush();
		assert.deepEqual(
			page.signals.filter((s) => s.token === ALPHA && s.stored !== ALPHA),
			[],
			"no request carried a session the browser no longer has",
		);
		assert.equal(page.auth.token, null);
		assert.equal(page.model().kind, "redirecting");
	});
});

test("a stored session that names another server is nobody's to send here: the page treats it as no session", async () => {
	// the record beside the stored session says the default server issued it; the browser is set to B
	await withPage(
		{ hash: v2Hash(), apiBase: APP_BASE, sessionServer: "default" },
		async (page) => {
			await page.flush();
			assert.deepEqual(
				page.signals,
				[],
				"no account check went out with it",
			);
			assert.equal(page.auth.token, null);
			assert.equal(page.model().kind, "redirecting");
		},
	);
	// a record that names this very server changes nothing; neither does having none
	for (const record of [APP_BASE, null]) {
		await withPage(
			{ hash: v2Hash(), apiBase: APP_BASE, sessionServer: record },
			async (page) => {
				await consentReady(page);
				assert.equal(page.model().kind, "consent");
			},
		);
	}
});

test("the Different API server card is inert for 800 ms, like Approve: Switch answers after that and not before, Cancel at once", async () => {
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		assert.equal(page.model().armed, false);
		const { onSwitchServer } = page.actions();
		onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, [], "an early click changes nothing");
		await page.advance(798);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, false, "799 ms");
		onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, [], "still nothing at 799 ms");
		await page.advance(1);
		assert.equal(page.model().armed, true, "armed at 800 ms");
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.equal(page.localData.get("urApiBase"), APP_BASE);
	});
	// Cancel never waits: the person can always say no
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		page.actions().onCancel(page.trusted);
		await page.flush();
		assert.equal(page.assigned().length, 1);
		assert.equal(page.model().kind, "cancelled");
	});
});

test("Use the default server (version 1) is inert for 800 ms and needs a trusted click", async () => {
	await withPage({ apiBase: "https://other.example.test" }, async (page) => {
		await page.flush();
		assert.equal(page.model().armed, false);
		page.actions().onUseDefaultServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, [], "too early");
		await page.advance(800);
		assert.equal(page.model().armed, true);
		page.actions().onUseDefaultServer(page.untrusted);
		await page.flush();
		assert.deepEqual(page.events, [], "a script-made click does nothing");
		assert.equal(
			page.localData.get("urApiBase"),
			"https://other.example.test",
		);
		assert.equal(page.localData.get("byToken"), ALPHA);
		page.actions().onUseDefaultServer(page.trusted);
		await page.flush();
		assert.equal(page.localData.has("urApiBase"), false);
		assert.equal(page.localData.has("byToken"), false);
	});
});

test("the server card is armed only while it is in front of the person: a hidden tab waits, a window that loses the focus is inert again", async () => {
	await withPage({ hash: v2Hash(), visible: false }, async (page) => {
		await page.flush();
		await page.advance(10_000);
		assert.equal(page.model().armed, false, "never by the clock alone");
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, []);
		await page.setVisible(true);
		await page.advance(799);
		assert.equal(page.model().armed, false);
		await page.advance(1);
		assert.equal(page.model().armed, true);
		await page.setFocused(false);
		assert.equal(page.model().armed, false, "the window lost the focus");
		await page.setFocused(true);
		await page.advance(799);
		assert.equal(page.model().armed, false, "the 800 ms start over");
		await page.advance(1);
		assert.equal(page.model().armed, true);
	});
	// a click is refused while the window has lost the focus, even before the page has heard of it
	await withPage({ hash: v2Hash() }, async (page) => {
		await page.flush();
		await page.advance(800);
		page.doc.focused = false;
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, []);
	});
	await withPage({ apiBase: "https://other.example.test" }, async (page) => {
		await page.flush();
		await page.advance(800);
		page.doc.focused = false;
		page.actions().onUseDefaultServer(page.trusted);
		await page.flush();
		assert.deepEqual(page.events, []);
	});
});

test("the server card that takes the place of the consent card is inert in the very render it appears: a second click aimed at Approve cannot reach Switch", async () => {
	await withPage({ hash: v2Hash(), apiBase: APP_BASE }, async (page) => {
		await consentReady(page);
		await page.advance(800);
		assert.equal(page.model().armed, true);
		// another tab moves the browser, and the click on Approve finds out
		page.localData.set("urApiBase", "https://evil.example.test");
		await page.actions().onApprove(page.trusted);
		const first = page.render().props.model;
		assert.equal(first.kind, "server");
		assert.equal(
			first.armed,
			false,
			"the first frame of the new card is inert",
		);
		page.actions().onSwitchServer(page.trusted);
		await page.flush();
		assert.deepEqual(
			page.events,
			[],
			"the second click of a double click lands on nothing",
		);
		await page.advance(800);
		assert.equal(page.model().armed, true);
	});
});

test("after a server mismatch at the click, putting the server back gives a consent card that is not busy", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		await page.advance(800);
		page.localData.set("urApiBase", "https://evil.example.test");
		await page.actions().onApprove(page.trusted);
		await page.flush();
		assert.equal(page.model().kind, "server");
		// another tab puts the server back; any render finds the right server again
		page.localData.delete("urApiBase");
		await page.setFocused(false);
		await page.setFocused(true);
		await page.advance(900);
		const model = page.model();
		assert.equal(model.kind, "consent", "the consent card is back");
		assert.equal(model.busy, false, "and it is not stuck busy");
		assert.equal(model.armed, true, "and Approve can be armed again");
	});
});

test("Switch for a request that has gone stale while the card was shown says so, and touches neither the session nor the server", async () => {
	const realNow = Date.now;
	// 232 s old when the page loads: still good for the card
	const hash = v2Hash({ ts: String(Math.floor(realNow() / 1000) - 232) });
	try {
		await withPage({ hash }, async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "server");
			await page.advance(800);
			Date.now = () => realNow() + 10_000; // 242 s old at the click
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.deepEqual(page.model(), { kind: "expired" });
			assert.deepEqual(
				page.events,
				[],
				"the session and the server are as they were",
			);
			assert.equal(page.localData.get("byToken"), ALPHA);
			assert.equal(page.localData.has("urApiBase"), false);
			assert.equal(
				page.sessionData.has(APP_REQUEST_KEY),
				false,
				"the request is used up",
			);
			assert.deepEqual(
				page.replaced(),
				[],
				"nobody is sent to sign in on a server for nothing",
			);
			assert.deepEqual(apiCalls(page), []);
			assert.deepEqual(page.assigned(), []);
		});
		// a request that is still fresh at the click is switched for, as ever
		Date.now = realNow;
		await withPage({ hash }, async (page) => {
			await page.flush();
			await page.advance(800);
			page.actions().onSwitchServer(page.trusted);
			await page.flush();
			assert.equal(page.localData.get("urApiBase"), APP_BASE);
		});
	} finally {
		Date.now = realNow;
	}
});

test("an account check that is torn down is called back: a session that changes aborts the request it replaced, and the late answer is ignored", async () => {
	await withPage(
		{
			userResponse: (t, signal) =>
				t === ALPHA ? hang(signal) : betaUser,
		},
		async (page) => {
			await page.flush();
			assert.equal(page.model().kind, "checking");
			const asked = page.signals.length;
			await page.swapToken(BETA);
			const [...all] = page.signals;
			assert.equal(all.length, asked + 1);
			for (const s of all.filter((s) => s.token === ALPHA)) {
				assert.equal(
					s.signal.aborted,
					true,
					"the replaced session's request was called back",
				);
				// and it says why, so the one console line the api layer writes for it explains itself
				assert.ok(s.signal.reason instanceof Error);
				assert.match(s.signal.reason.message, /^called back: /);
			}
			assert.equal(all.at(-1).token, BETA);
			assert.equal(all.at(-1).signal.aborted, false);
			assert.equal(page.model().kind, "consent");
			assert.equal(page.model().networkName, "beta-net");
			assert.equal(page.localData.get("byToken"), BETA);
			assert.deepEqual(
				page.calls.filter((c) => c.setToken !== undefined),
				[],
				"the late answer for the old session ended nothing",
			);
		},
	);
});

test("StrictMode's first run of the account check is called back before the second one asks, so the browser has no request to hold the second behind", async () => {
	await withPage({}, async (page) => {
		await consentReady(page);
		const users = page.signals.filter((s) => s.api === "user");
		assert.equal(users.length, perRun([0]).length);
		// the run that counts is open; the one that was torn down at mount is not
		assert.equal(users.at(-1).signal.aborted, false);
		for (const s of users.slice(0, -1)) {
			assert.equal(s.signal.aborted, true);
			assert.match(s.signal.reason.message, /^called back: /);
		}
	});
});

// ----- random events against the real page code -----

function fuzzRng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

test("random sequences of events: no session goes to a server the request is not for or that no longer backs it, the card is never busy with no click in flight, one navigation and one mint at most, the server is written only after the session is taken out and only from an armed card", async () => {
	const SEEDS = Number(process.env.FUZZ_SEEDS || 150);
	const STEPS = 28;
	const violations = [];
	for (let seed = 1; seed <= SEEDS; seed++) {
		const rnd = fuzzRng(seed * 7919 + (strict ? 1 : 0));
		const pick = (list) => list[Math.floor(rnd() * list.length)];
		const version2 = rnd() < 0.6;
		const hash = version2 ? v2Hash() : requestHash();
		const parsed = appAuth.parseAppRequest(hash, Date.now());
		const request = parsed.ok ? parsed.request : null;
		const startServer = pick([
			DEFAULT_BASE,
			APP_BASE,
			"https://other.example.test",
		]);
		const startToken = pick([ALPHA, BETA, null]);
		const log = [
			`seed ${seed}: ${version2 ? "v2" : "v1"}, server ${startServer}, token ${startToken ? (startToken === ALPHA ? "alpha" : "beta") : "none"}`,
		];
		await withPage(
			{ hash, apiBase: startServer, token: startToken },
			async (page) => {
				const fail = (what) =>
					violations.push(`${log.join(" | ")} :: ${what}`);
				const serverNow = () =>
					page.localData.get("urApiBase") || DEFAULT_BASE;
				const fits = () =>
					request !== null &&
					appAuth.isServerForRequest(
						request,
						serverNow(),
						DEFAULT_BASE,
						PAGE_ORIGIN,
					);
				await page.flush();
				let writes = 0;
				for (let step = 0; step < STEPS; step++) {
					const action = pick([
						"advance",
						"advance",
						"focus",
						"visible",
						"server",
						"token",
						"other-tab-switch",
						"approve",
						"approve",
						"cancel",
						"switch",
						"switch",
						"default",
						"retry",
						"render",
					]);
					log.push(action);
					let armedBefore = false;
					try {
						switch (action) {
							case "advance": {
								const ms = pick([0, 100, 800, 900, 5000]);
								log[log.length - 1] += ` ${ms}`;
								await page.advance(ms);
								break;
							}
							case "focus":
								await page.setFocused(rnd() < 0.5);
								break;
							case "visible":
								await page.setVisible(rnd() < 0.5);
								break;
							case "server": {
								const to = pick([
									null,
									APP_BASE,
									"https://other.example.test",
									DEFAULT_BASE,
								]);
								log[log.length - 1] += ` ${to}`;
								if (to === null)
									page.localData.delete("urApiBase");
								else page.localData.set("urApiBase", to);
								break;
							}
							case "token":
								await page.swapToken(pick([ALPHA, BETA, null]));
								break;
							case "other-tab-switch": {
								// what Switch in another tab does to the storage of this one, with nobody telling the page
								const to = pick([
									APP_BASE,
									"https://other.example.test",
									DEFAULT_BASE,
								]);
								log[log.length - 1] += ` ${to}`;
								page.localData.delete("byToken");
								if (to === DEFAULT_BASE)
									page.localData.delete("urApiBase");
								else page.localData.set("urApiBase", to);
								break;
							}
							case "approve":
								await answered(
									Promise.resolve(
										page
											.actions()
											.onApprove(
												pick([
													page.trusted,
													page.trusted,
													page.untrusted,
												]),
											),
									),
								);
								break;
							case "cancel":
								page.actions().onCancel(
									pick([page.trusted, page.untrusted]),
								);
								break;
							case "switch":
							case "default": {
								const event = pick([
									page.trusted,
									page.trusted,
									page.untrusted,
								]);
								const model = page.model();
								armedBefore =
									model.kind === "server" &&
									model.armed === true;
								if (action === "switch")
									page.actions().onSwitchServer(event);
								else page.actions().onUseDefaultServer(event);
								break;
							}
							case "retry":
								page.actions().onRetry();
								break;
							case "render":
								page.render();
								break;
						}
						await page.flush();
					} catch (error) {
						fail(`${action} threw: ${error.message}`);
						break;
					}
					// no api call was ever made on a server the request is not for ...
					for (const s of page.signals) {
						if (
							request !== null &&
							!appAuth.isServerForRequest(
								request,
								s.base,
								DEFAULT_BASE,
								PAGE_ORIGIN,
							)
						) {
							fail(
								`an api call (${s.api}) went to ${s.base}, which the request is not for`,
							);
						}
						// ... and none carried a session the browser no longer had stored
						if (s.token !== s.stored) {
							fail(
								`an api call (${s.api}) carried a session that was not the stored one`,
							);
						}
					}
					// at most one navigation to the app, and only to the contract's addresses
					const goes = page.assigned();
					if (goes.length > 1)
						fail(`more than one navigation: ${goes.length}`);
					for (const g of goes) {
						if (
							!/^urnetwork:\/\/auth\?state=[A-Za-z0-9_-]{43}&(error=access_denied|epk=)/.test(
								g,
							)
						) {
							fail(`odd navigation ${g.slice(0, 40)}`);
						}
					}
					// the consent card only on the right server, and never busy once every click has finished
					// (it is drawn from storage on every render, so look after one)
					page.render();
					await page.flush();
					const model = page.model();
					if (model.kind === "consent") {
						if (!fits())
							fail(
								"the consent card shows on a server the request is not for",
							);
						if (model.busy)
							fail(
								"the consent card is busy with no click in flight",
							);
						if (model.minting)
							fail(
								"the consent card says minting with no click in flight",
							);
					}
					// the page writes the server only right after it has taken the session out, in this order,
					// only the server the request names (or removes the override), and only from an armed card
					const ev = page.events;
					for (let k = 0; k < ev.length; k++) {
						if (/^(set|remove) urApiBase/.test(ev[k])) {
							if (
								!(
									ev[k - 1] === "setToken null" &&
									ev[k - 2] === "remove byToken"
								)
							) {
								fail(
									`the server was written without the session going first: ${ev.slice(Math.max(0, k - 2), k + 1).join(", ")}`,
								);
							}
							if (
								ev[k].startsWith("set urApiBase=") &&
								(request === null ||
									ev[k] !==
										`set urApiBase=https://${request.api}`)
							) {
								fail(
									`the page set a server the request does not name: ${ev[k]}`,
								);
							}
						}
					}
					const written = ev.filter((e) =>
						/^(set|remove) urApiBase/.test(e),
					).length;
					if (written > writes) {
						if (!armedBefore)
							fail(
								"the server was written from a card that was not armed",
							);
						writes = written;
					}
					if (page.minted().length > 1)
						fail(`minted ${page.minted().length} codes`);
					if (violations.length > 12) break;
				}
			},
		);
		if (violations.length > 12) break;
	}
	assert.deepEqual(
		violations.slice(0, 6),
		[],
		`${violations.length} violation(s)`,
	);
});
