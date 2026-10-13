// /login-app, the page itself (src/pages/LoginApp.tsx), run with the real
// services and a minimal hooks runtime in the style of the useAutoLogin test:
// the gates, the sign-in redirect, the identity check, the 800 ms inert time
// (which only runs while the tab is showing and the window has the focus), trusted
// clicks only, one mint, the single navigation, the 15 s limit on the two api calls
// and on the sealing chunk, and the 60 s Open button. The api, the session, the
// window and the document are fakes; time is a fake clock.
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
	userResponse = alphaUser,
	mint = async () => ({ auth_code: CODE }),
	isLoggingOut = false,
	isTransitioning = false,
	visible = true,
	focused = true,
	olderSlot = false,
	sessionSetFails = false,
	// what importing the sealing chunk does: "ok", "reject" (the download failed;
	// the browser keeps a failed import for the life of the document, so it fails
	// every time) or "hang" (it never arrives, until page.arrive())
	seal = "ok",
	// the browser refuses to navigate to the address
	assignThrows = false,
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
	if (apiBase !== DEFAULT_BASE) localData.set("urApiBase", apiBase);
	const sessionData = new Map();
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
		setItem: (k, v) => localData.set(k, String(v)),
		removeItem: (k) => localData.delete(k),
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
			auth.token = value;
			auth.isAuthenticated = !!value;
			calls.push({ setToken: value });
			hooks.invalidate();
		},
		logout: () => calls.push({ logout: true }),
	};

	const api = {
		CUSTOM_API_BASE_KEY: "urApiBase",
		DEFAULT_API_BASE: DEFAULT_BASE,
		getApiBase: () => localStorage.getItem("urApiBase") || DEFAULT_BASE,
		fetchNetworkUser: async (t, signal) => {
			calls.push({ fetchNetworkUser: t });
			signals.push({ api: "user", signal });
			return typeof userResponse === "function"
				? userResponse(t, signal)
				: userResponse;
		},
		createAuthCode: async (t, minutes, uses, signal) => {
			calls.push({ mint: { token: t, minutes, uses } });
			signals.push({ api: "mint", signal });
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
		]);
		assert.equal(model.kind, "consent");
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
			apiHost: "other.example.test",
		});
		assert.equal(
			page.calls.some((c) => c.fetchNetworkUser),
			false,
			"no call with the session",
		);
		page.actions().onUseDefaultServer();
		assert.equal(page.localData.has("urApiBase"), false);
		await page.flush();
		assert.equal(page.model().kind, "consent");
		assert.deepEqual(
			page.calls.filter((c) => c.fetchNetworkUser),
			[{ fetchNetworkUser: ALPHA }],
		);
	});
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

// ----- the api calls give up after 15 seconds -----

test("an api that never answers the identity check is given up after 15 seconds, and the person gets Try again", async () => {
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
			await page.advance(14_999);
			assert.equal(signal.aborted, false);
			assert.deepEqual(page.model(), { kind: "checking" });
			await page.advance(1);
			assert.equal(signal.aborted, true, "aborted at 15 s");
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
		assert.equal(
			page.signals.every((s) => s.signal.aborted === false),
			true,
		);
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

test("an api that never answers the mint is given up after 15 seconds: nothing is navigated, the person can try again", async () => {
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
			await page.advance(14_999);
			assert.equal(signal.aborted, false);
			assert.equal(page.model().busy, true);
			await page.advance(1);
			await answered(click);
			await page.flush();
			assert.equal(signal.aborted, true, "aborted at 15 s");
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
