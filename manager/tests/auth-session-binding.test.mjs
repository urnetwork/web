// A sign-in belongs to the API server that issued it (src/services/sessionBinding.ts and
// src/context/AuthContext.tsx). The browser holds one server for every tab and each request
// reads it when it is made, so a tab that keeps its session after another tab has pointed the
// browser at a different server would send it to a server that never issued it; and a sign-in
// whose answer arrives after such a change would store a session beside the wrong server.
//
// The pure helpers are tested directly. The provider is the real AuthContext.tsx, run on the
// minimal hooks runtime of tests/helpers with a fake browser (window, document, storage, the
// api, the toasts, and a clock for the 900 ms the page waits after an answer).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

import * as sessionBinding from "../src/services/sessionBinding.ts";
import { createHooksRuntime } from "./helpers/hooks-runtime.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const {
	DEFAULT_SERVER_MARK,
	SESSION_KEY,
	SESSION_SERVER_KEY,
	clearSession,
	forgetSession,
	readSession,
	serverMark,
	writeSession,
} = sessionBinding;

const DEFAULT_BASE = "https://api.default.test";
const BETA = "https://api.beta.test";
const OTHER = "https://api.other.test";

// ----- the helpers, on a fake storage -----

/** a Storage that logs what is done to it, and can be made to throw */
function fakeStorage(initial = {}, { throws = [] } = {}) {
	const data = new Map(Object.entries(initial));
	const log = [];
	const guard = (op, key) => {
		if (throws.includes(op) || throws.includes(`${op} ${key}`)) {
			throw new Error("the storage is blocked");
		}
	};
	return {
		data,
		log,
		getItem: (key) => {
			guard("get", key);
			return data.has(key) ? data.get(key) : null;
		},
		setItem: (key, value) => {
			guard("set", key);
			log.push(`set ${key}=${value}`);
			data.set(key, String(value));
		},
		removeItem: (key) => {
			guard("remove", key);
			log.push(`remove ${key}`);
			data.delete(key);
		},
	};
}

test("a server goes by its base, and the build's default by one mark wherever the build points it", () => {
	assert.equal(serverMark(BETA, DEFAULT_BASE), BETA);
	assert.equal(serverMark(DEFAULT_BASE, DEFAULT_BASE), DEFAULT_SERVER_MARK);
	// an override that spells the default is still the default
	assert.equal(serverMark("/api", "/api"), DEFAULT_SERVER_MARK);
	// a build that moves its default does not change what its sessions were issued by
	assert.equal(
		serverMark("https://api.moved.test", "https://api.moved.test"),
		serverMark(DEFAULT_BASE, DEFAULT_BASE),
	);
	// the mark is not an address a person could have typed as a server
	assert.equal(new URL(BETA).host.includes(DEFAULT_SERVER_MARK), false);
	assert.doesNotMatch(DEFAULT_SERVER_MARK, /[/:.]/);
});

test("readSession: a session with no record is taken as it always was, one whose record names this server is kept, one that names another is nobody's here", () => {
	assert.equal(readSession(null, BETA), null, "no storage, no session");
	assert.equal(readSession(fakeStorage(), BETA), null, "nothing stored");
	assert.deepEqual(readSession(fakeStorage({ [SESSION_KEY]: "T" }), BETA), {
		token: "T",
		server: null,
	});
	assert.deepEqual(
		readSession(
			fakeStorage({ [SESSION_KEY]: "T", [SESSION_SERVER_KEY]: BETA }),
			BETA,
		),
		{ token: "T", server: BETA },
	);
	assert.equal(
		readSession(
			fakeStorage({
				[SESSION_KEY]: "T",
				[SESSION_SERVER_KEY]: DEFAULT_SERVER_MARK,
			}),
			BETA,
		),
		null,
		"issued by the default server, the browser is set to B",
	);
	assert.equal(
		readSession(
			fakeStorage({ [SESSION_KEY]: "T", [SESSION_SERVER_KEY]: BETA }),
			OTHER,
		),
		null,
	);
	// an empty record is no record
	assert.deepEqual(
		readSession(
			fakeStorage({ [SESSION_KEY]: "T", [SESSION_SERVER_KEY]: "" }),
			BETA,
		),
		{ token: "T", server: null },
	);
	// a record without a session means nothing
	assert.equal(
		readSession(fakeStorage({ [SESSION_SERVER_KEY]: BETA }), BETA),
		null,
	);
	assert.equal(readSession(fakeStorage({ [SESSION_KEY]: "" }), BETA), null);
});

test("readSession removes nothing: a session of another server serves again if the browser goes back to it", () => {
	const storage = fakeStorage({
		[SESSION_KEY]: "T",
		[SESSION_SERVER_KEY]: BETA,
	});
	assert.equal(readSession(storage, OTHER), null);
	assert.deepEqual(storage.log, []);
	assert.deepEqual(readSession(storage, BETA), { token: "T", server: BETA });
});

test("none of the helpers throws on a storage that does: a read finds no session, a write says it failed", () => {
	for (const throws of [["get"], ["get byToken"], ["get byTokenServer"]]) {
		const storage = fakeStorage(
			{ [SESSION_KEY]: "T", [SESSION_SERVER_KEY]: BETA },
			{ throws },
		);
		assert.equal(readSession(storage, BETA), null, throws.join());
	}
	// forgetting reads the session first: where that fails there is nothing to forget
	for (const throws of [["get"], ["get byToken"]]) {
		const storage = fakeStorage({ [SESSION_KEY]: "T" }, { throws });
		assert.equal(forgetSession(storage, "T"), false, throws.join());
		assert.deepEqual(storage.log, []);
	}
	for (const throws of [["set"], ["set byToken"], ["set byTokenServer"]]) {
		assert.equal(
			writeSession(fakeStorage({}, { throws }), "T", BETA),
			false,
		);
	}
	assert.equal(writeSession(null, "T", BETA), false);
	// clearing goes on past a failure of the first removal
	const storage = fakeStorage(
		{ [SESSION_KEY]: "T", [SESSION_SERVER_KEY]: BETA },
		{ throws: ["remove byToken"] },
	);
	clearSession(storage);
	assert.equal(storage.data.has(SESSION_SERVER_KEY), false);
	clearSession(null);
	assert.equal(forgetSession(null, "T"), false);
});

test("writeSession puts the record first, so a reader that finds the new session finds its server beside it; clearSession takes the session first", () => {
	const storage = fakeStorage();
	assert.equal(writeSession(storage, "T", BETA), true);
	assert.deepEqual(storage.log, [
		`set ${SESSION_SERVER_KEY}=${BETA}`,
		`set ${SESSION_KEY}=T`,
	]);
	storage.log.length = 0;
	clearSession(storage);
	assert.deepEqual(storage.log, [
		`remove ${SESSION_KEY}`,
		`remove ${SESSION_SERVER_KEY}`,
	]);
	assert.equal(storage.data.size, 0);
});

test("forgetSession takes the stored session out only while it is still the one given: another tab may have signed in to something newer", () => {
	const storage = fakeStorage({
		[SESSION_KEY]: "NEWER",
		[SESSION_SERVER_KEY]: BETA,
	});
	assert.equal(forgetSession(storage, "OLD"), false);
	assert.deepEqual(storage.log, []);
	assert.equal(storage.data.get(SESSION_KEY), "NEWER");
	assert.equal(forgetSession(storage, "NEWER"), true);
	assert.equal(storage.data.size, 0);
	assert.equal(
		forgetSession(storage, "NEWER"),
		false,
		"nothing left to forget",
	);
});

// ----- the provider -----

const source = fs.readFileSync(
	new URL("../src/context/AuthContext.tsx", import.meta.url),
	"utf8",
);
const transpiled = ts.transpileModule(source, {
	compilerOptions: {
		module: ts.ModuleKind.CommonJS,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		esModuleInterop: true,
	},
}).outputText;

/** which of the two runs the test body is in (tests run one after the other) */
let strict = false;
function run(name, body) {
	for (const mode of [false, true]) {
		test(mode ? `${name} [StrictMode]` : name, async () => {
			strict = mode;
			await body();
		});
	}
}

function deferred() {
	let resolve;
	const promise = new Promise((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

/** The provider, mounted on a fake browser. `stored` is what the storage holds when the tab opens. */
function mountProvider({
	stored = {},
	base = DEFAULT_BASE,
	defaultBase = DEFAULT_BASE,
} = {}) {
	const data = new Map(Object.entries(stored));
	if (base !== defaultBase) data.set("urApiBase", base);
	const events = [];
	const toasts = [];
	const timers = [];
	let clock = 0;
	let timerId = 1;
	/** the calls the provider made to the api, each waiting for the test to answer it */
	const asked = { login: [], password: [], wallet: [], seedphrase: [] };

	const windowListeners = [];
	const documentListeners = [];
	const win = {
		addEventListener: (type, fn) => windowListeners.push({ type, fn }),
		removeEventListener: (type, fn) => {
			const at = windowListeners.findIndex(
				(l) => l.type === type && l.fn === fn,
			);
			if (at >= 0) windowListeners.splice(at, 1);
		},
	};
	const doc = {
		visibilityState: "visible",
		addEventListener: (type, fn) => documentListeners.push({ type, fn }),
		removeEventListener: (type, fn) => {
			const at = documentListeners.findIndex(
				(l) => l.type === type && l.fn === fn,
			);
			if (at >= 0) documentListeners.splice(at, 1);
		},
	};
	const localStorage = {
		getItem: (k) => (data.has(k) ? data.get(k) : null),
		setItem: (k, v) => {
			events.push(`set ${k}=${v}`);
			data.set(k, String(v));
		},
		removeItem: (k) => {
			events.push(`remove ${k}`);
			data.delete(k);
		},
	};

	const toast = Object.assign(
		(message) => toasts.push({ kind: "info", message }),
		{
			success: (message) => toasts.push({ kind: "success", message }),
			error: (message) => toasts.push({ kind: "error", message }),
		},
	);
	const ask = (list) => () => {
		const d = deferred();
		list.push(d);
		return d.promise;
	};
	const api = {
		DEFAULT_API_BASE: defaultBase,
		getApiBase: () => data.get("urApiBase") || defaultBase,
		login: ask(asked.login),
		loginWithPassword: ask(asked.password),
		loginWithWallet: ask(asked.wallet),
		loginWithSeedphrase: ask(asked.seedphrase),
	};

	const hooks = createHooksRuntime({ strict });
	const modules = {
		react: {
			...hooks.react,
			createContext: (fallback) => ({ Provider: "Provider", fallback }),
		},
		"react/jsx-runtime": {
			jsx: (type, props) => ({ type, props }),
			jsxs: (type, props) => ({ type, props }),
			Fragment: Symbol("fragment"),
		},
		"../services/api": api,
		"react-hot-toast": { __esModule: true, default: toast },
		"../services/sessionBinding": sessionBinding,
		"../services/types": {},
	};

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

	const mod = { exports: {} };
	// the module's own `setTimeout` is the test's clock (a parameter shadows the global)
	new Function("require", "module", "exports", "setTimeout", transpiled)(
		(name) => {
			if (!(name in modules))
				throw new Error(`unexpected import ${name}`);
			return modules[name];
		},
		mod,
		mod.exports,
		(fn, ms) => {
			const id = timerId++;
			timers.push({ id, at: clock + ms, fn });
			return id;
		},
	);
	hooks.mount(() => mod.exports.AuthContextProvider({ children: null }));

	const provider = {
		events,
		toasts,
		asked,
		data,
		windowListeners,
		documentListeners,
		value: () => hooks.latest().props.value,
		render: hooks.render,
		flush: hooks.flush,
		/** the clock moves: the timers that fall due run, in order */
		async advance(ms) {
			const end = clock + ms;
			for (;;) {
				const next = timers
					.filter((t) => t.at <= end)
					.sort((a, b) => a.at - b.at)[0];
				if (!next) break;
				timers.splice(timers.indexOf(next), 1);
				clock = next.at;
				next.fn();
				await hooks.flush();
			}
			clock = end;
			await hooks.flush();
		},
		/** another tab points the browser at a server (null: back to the default) */
		setServer(to) {
			if (to === null) data.delete("urApiBase");
			else data.set("urApiBase", to);
		},
		/** the browser tells the tab that storage changed in another one */
		async emitStorage() {
			for (const l of windowListeners.filter((x) => x.type === "storage"))
				l.fn({ type: "storage" });
			await hooks.flush();
		},
		async emitWindow(type) {
			for (const l of windowListeners.filter((x) => x.type === type))
				l.fn({ type });
			await hooks.flush();
		},
		async emitDocument(type) {
			for (const l of documentListeners.filter((x) => x.type === type))
				l.fn({ type });
			await hooks.flush();
		},
		close() {
			for (const [name, descriptor] of Object.entries(saved)) {
				if (descriptor)
					Object.defineProperty(globalThis, name, descriptor);
				else delete globalThis[name];
			}
		},
	};
	hooks.render();
	return provider;
}

async function withProvider(options, body) {
	const provider = mountProvider(options);
	try {
		await body(provider);
	} finally {
		provider.close();
	}
}

const sessionOf = (provider) => provider.value().token;
const errorToasts = (provider) =>
	provider.toasts.filter((t) => t.kind === "error").map((t) => t.message);
const SERVER_CHANGED =
	"The API server changed while you were signing in. Sign in again.";
const SIGNED_OUT =
	"You were signed out: this browser's API server was changed in another tab.";

run(
	"a tab opens with the stored session when no record names another server: with none, with the default's mark, with this server's",
	async () => {
		for (const stored of [
			{ byToken: "T" },
			{ byToken: "T", byTokenServer: DEFAULT_SERVER_MARK },
		]) {
			await withProvider({ stored }, async (provider) => {
				assert.equal(sessionOf(provider), "T");
				assert.equal(provider.value().isAuthenticated, true);
				assert.deepEqual(
					provider.events,
					[],
					"reading the session writes nothing",
				);
			});
		}
		await withProvider(
			{ stored: { byToken: "T", byTokenServer: BETA }, base: BETA },
			async (provider) => {
				assert.equal(sessionOf(provider), "T");
			},
		);
	},
);

run(
	"a tab does not open with a stored session that another server issued: it is signed out, and the stored session is left for that server",
	async () => {
		for (const options of [
			{ stored: { byToken: "T", byTokenServer: BETA }, base: OTHER },
			{
				stored: { byToken: "T", byTokenServer: BETA },
				base: DEFAULT_BASE,
			},
			{
				stored: { byToken: "T", byTokenServer: DEFAULT_SERVER_MARK },
				base: BETA,
			},
		]) {
			await withProvider(options, async (provider) => {
				assert.equal(sessionOf(provider), null);
				assert.equal(provider.value().isAuthenticated, false);
				assert.deepEqual(provider.events, []);
				assert.equal(provider.data.get("byToken"), "T");
			});
		}
	},
);

run(
	"a sign-in keeps its session beside the server that issued it, 900 ms after the answer, the record first",
	async () => {
		for (const [how, answer, call, message] of [
			[
				"password",
				{ network: { by_jwt: "JWT", name: "n" } },
				(v) => v.loginWithPassword("u", "p"),
				"Login successful",
			],
			[
				"wallet",
				{ network: { by_jwt: "JWT", name: "n" } },
				(v) => v.loginWithWallet({}),
				"Wallet login successful",
			],
			[
				"seed phrase",
				{ network: { by_jwt: "JWT", name: "n" } },
				(v) => v.loginWithSeedphrase("words"),
				"Login successful",
			],
			[
				"auth code",
				{ by_jwt: "JWT" },
				(v) => v.login("code"),
				"Login successful",
			],
		]) {
			await withProvider({ base: BETA }, async (provider) => {
				const pending = call(provider.value());
				await provider.flush();
				assert.equal(provider.value().isLoading, true, how);
				const list =
					how === "password"
						? provider.asked.password
						: how === "wallet"
							? provider.asked.wallet
							: how === "seed phrase"
								? provider.asked.seedphrase
								: provider.asked.login;
				list[0].resolve(answer);
				assert.ok(await pending, `${how}: the answer is handed back`);
				await provider.flush();
				assert.equal(provider.value().isTransitioning, true, how);
				assert.deepEqual(
					provider.toasts,
					[{ kind: "success", message }],
					how,
				);
				assert.equal(
					sessionOf(provider),
					null,
					`${how}: not before the 900 ms`,
				);
				await provider.advance(899);
				assert.equal(sessionOf(provider), null);
				await provider.advance(1);
				assert.equal(sessionOf(provider), "JWT", how);
				assert.equal(provider.value().isTransitioning, false);
				assert.deepEqual(
					provider.events,
					["set byTokenServer=" + BETA, "set byToken=JWT"],
					`${how}: the record, then the session`,
				);
			});
		}
	},
);

run(
	"on the default server the session carries the default's mark, not its address",
	async () => {
		await withProvider({}, async (provider) => {
			const pending = provider.value().loginWithPassword("u", "p");
			await provider.flush();
			provider.asked.password[0].resolve({
				network: { by_jwt: "JWT", name: "n" },
			});
			await pending;
			await provider.advance(900);
			assert.deepEqual(provider.events, [
				`set byTokenServer=${DEFAULT_SERVER_MARK}`,
				"set byToken=JWT",
			]);
		});
	},
);

run(
	"an answer that comes after the browser was pointed at another server is dropped, whichever way the person signed in: nothing is stored, nothing is signed in",
	async () => {
		const ways = [
			[
				"password",
				(v) => v.loginWithPassword("u", "p"),
				"password",
				{ network: { by_jwt: "JWT", name: "n" } },
			],
			[
				"wallet",
				(v) => v.loginWithWallet({}),
				"wallet",
				{ network: { by_jwt: "JWT", name: "n" } },
			],
			[
				"seed phrase",
				(v) => v.loginWithSeedphrase("words"),
				"seedphrase",
				{ network: { by_jwt: "JWT", name: "n" } },
			],
			["auth code", (v) => v.login("code"), "login", { by_jwt: "JWT" }],
		];
		for (const [how, call, key, answer] of ways) {
			await withProvider({}, async (provider) => {
				const pending = call(provider.value());
				await provider.flush();
				// another tab (Switch on the approval page) moves the browser while the request is out
				provider.setServer(BETA);
				provider.asked[key][0].resolve(answer);
				const result = await pending;
				await provider.flush();
				assert.equal(
					result,
					null,
					`${how}: the sign-in did not happen`,
				);
				assert.equal(provider.value().isTransitioning, false, how);
				assert.equal(provider.value().isLoading, false, how);
				await provider.advance(5000);
				assert.equal(sessionOf(provider), null, how);
				assert.deepEqual(
					provider.events,
					[],
					`${how}: nothing was stored`,
				);
				assert.equal(provider.data.has("byToken"), false);
				assert.equal(
					errorToasts(provider).some((m) =>
						m.includes(SERVER_CHANGED),
					),
					true,
					`${how}: the person is told`,
				);
				assert.equal(
					provider.toasts.some((t) => t.kind === "success"),
					false,
					`${how}: and not welcomed`,
				);
			});
		}
	},
);

run(
	"a server changed during the 900 ms is caught too: the session is not stored beside the new server",
	async () => {
		await withProvider({}, async (provider) => {
			const pending = provider.value().loginWithPassword("u", "p");
			await provider.flush();
			provider.asked.password[0].resolve({
				network: { by_jwt: "JWT", name: "n" },
			});
			await pending;
			await provider.advance(400);
			provider.setServer(BETA);
			await provider.advance(500);
			assert.equal(sessionOf(provider), null);
			assert.deepEqual(provider.events, []);
			assert.equal(
				provider.value().isTransitioning,
				false,
				"the animation ends",
			);
			assert.equal(errorToasts(provider).includes(SERVER_CHANGED), true);
		});
	},
);

run(
	"the browser put back where it was by the time the answer comes: the sign-in goes on",
	async () => {
		await withProvider({}, async (provider) => {
			const pending = provider.value().loginWithPassword("u", "p");
			await provider.flush();
			provider.setServer(BETA);
			provider.setServer(null);
			provider.asked.password[0].resolve({
				network: { by_jwt: "JWT", name: "n" },
			});
			await pending;
			await provider.advance(900);
			assert.equal(sessionOf(provider), "JWT");
		});
	},
);

run(
	"an auth code is exchanged on the server it was asked of: a session committed later is bound to that one, even after the browser moved",
	async () => {
		await withProvider({}, async (provider) => {
			const exchanged = provider.value().exchangeAuthCode("code");
			await provider.flush();
			provider.asked.login[0].resolve({ by_jwt: "JWT" });
			const response = await exchanged;
			assert.equal(response.by_jwt, "JWT");
			// the person is asked whether to switch accounts; meanwhile another tab moves the browser
			provider.setServer(BETA);
			provider.value().commitToken("JWT", "Switched accounts");
			await provider.flush();
			await provider.advance(900);
			assert.equal(
				sessionOf(provider),
				null,
				"issued by the default server, which the browser has left",
			);
			assert.deepEqual(provider.events, []);
			assert.equal(errorToasts(provider).includes(SERVER_CHANGED), true);
		});
		// and an exchange whose answer comes from a server the browser has left is an error to the caller
		await withProvider({}, async (provider) => {
			const exchanged = provider.value().exchangeAuthCode("code");
			await provider.flush();
			provider.setServer(BETA);
			provider.asked.login[0].resolve({ by_jwt: "JWT" });
			const response = await exchanged;
			await provider.flush();
			assert.deepEqual(response, { error: { message: SERVER_CHANGED } });
			assert.equal(provider.value().isLoading, false);
		});
		// a token committed with no exchange behind it is bound to the server it is committed on
		await withProvider({ base: BETA }, async (provider) => {
			provider.value().commitToken("JWT", "Login successful");
			await provider.advance(900);
			assert.equal(sessionOf(provider), "JWT");
			assert.deepEqual(provider.events, [
				"set byTokenServer=" + BETA,
				"set byToken=JWT",
			]);
		});
	},
);

run(
	"an error answer is told as it always was; a server change does not hide it",
	async () => {
		await withProvider({}, async (provider) => {
			const pending = provider.value().loginWithPassword("u", "p");
			await provider.flush();
			provider.asked.password[0].resolve({
				error: { message: "Invalid user or password." },
			});
			assert.equal(await pending, null);
			assert.deepEqual(errorToasts(provider), [
				"Login failed: Invalid user or password.",
			]);
			await provider.advance(5000);
			assert.equal(sessionOf(provider), null);
			assert.deepEqual(provider.events, []);
		});
		await withProvider({}, async (provider) => {
			const pending = provider.value().loginWithPassword("u", "p");
			await provider.flush();
			const verification = { verification_required: { user_auth: "u" } };
			provider.asked.password[0].resolve(verification);
			assert.deepEqual(
				await pending,
				verification,
				"a verification is handed to the caller, as ever",
			);
			assert.deepEqual(provider.toasts, []);
		});
	},
);

run(
	"another tab pointed the browser at a different server: this tab's session goes with the storage event, and the stored copy goes if it is still this one",
	async () => {
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			assert.equal(sessionOf(provider), "T");
			provider.setServer(BETA);
			await provider.emitStorage();
			assert.equal(sessionOf(provider), null);
			assert.equal(provider.value().isAuthenticated, false);
			assert.equal(
				provider.data.has("byToken"),
				false,
				"the stored copy went",
			);
			assert.deepEqual(provider.toasts, [
				{ kind: "info", message: SIGNED_OUT },
			]);
		});
		// the other tab put the session out before it moved the browser (Switch): nothing left to remove
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			provider.data.delete("byToken");
			provider.setServer(BETA);
			await provider.emitStorage();
			assert.equal(sessionOf(provider), null);
			assert.deepEqual(provider.events, []);
		});
		// and back to the default is a change of server too
		await withProvider(
			{ stored: { byToken: "T", byTokenServer: BETA }, base: BETA },
			async (provider) => {
				assert.equal(sessionOf(provider), "T");
				provider.setServer(null);
				await provider.emitStorage();
				assert.equal(sessionOf(provider), null);
			},
		);
	},
);

run(
	"a session that another tab has stored since is not this tab's to remove",
	async () => {
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			// another tab signed in to something newer on the server it moved the browser to
			provider.data.set("byToken", "NEWER");
			provider.data.set("byTokenServer", BETA);
			provider.setServer(BETA);
			await provider.emitStorage();
			assert.equal(
				sessionOf(provider),
				null,
				"this tab's own session is of no use there",
			);
			assert.equal(
				provider.data.get("byToken"),
				"NEWER",
				"the newer one is left alone",
			);
			assert.equal(provider.data.get("byTokenServer"), BETA);
			assert.deepEqual(provider.events, []);
		});
	},
);

run(
	"a change of storage that is not a change of server ends nothing",
	async () => {
		await withProvider(
			{ stored: { byToken: "T", byTokenServer: DEFAULT_SERVER_MARK } },
			async (provider) => {
				provider.data.set("something", "else");
				provider.data.set("byToken", "NEWER");
				await provider.emitStorage();
				assert.equal(sessionOf(provider), "T");
				await provider.emitWindow("focus");
				await provider.emitWindow("pageshow");
				await provider.emitDocument("visibilitychange");
				assert.equal(sessionOf(provider), "T");
				assert.deepEqual(provider.toasts, []);
				// the server set to what it already was is no change either
				provider.setServer(DEFAULT_BASE);
				await provider.emitStorage();
				assert.equal(sessionOf(provider), "T");
			},
		);
	},
);

run(
	"a tab that missed the storage event notices on its next sight of the person: a page restored from the cache, a window that gets the focus, a tab that is shown",
	async () => {
		for (const [target, type] of [
			["window", "pageshow"],
			["window", "focus"],
			["document", "visibilitychange"],
		]) {
			await withProvider(
				{ stored: { byToken: "T" } },
				async (provider) => {
					provider.setServer(BETA);
					assert.equal(
						sessionOf(provider),
						"T",
						"nobody has told the tab yet",
					);
					if (target === "window") await provider.emitWindow(type);
					else await provider.emitDocument(type);
					assert.equal(sessionOf(provider), null, type);
				},
			);
		}
	},
);

run(
	"a session opened with no record is bound to the server the tab opened on",
	async () => {
		await withProvider(
			{ stored: { byToken: "T" }, base: BETA },
			async (provider) => {
				provider.setServer(OTHER);
				await provider.emitStorage();
				assert.equal(sessionOf(provider), null);
			},
		);
	},
);

run(
	"the context's own setToken: null signs out, a session signs in as issued by the server the browser is set to now",
	async () => {
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			provider.value().setToken(null);
			await provider.flush();
			assert.equal(sessionOf(provider), null);
			// signed out: a change of server has no session to end
			provider.setServer(BETA);
			await provider.emitStorage();
			assert.deepEqual(provider.toasts, []);
			provider.value().setToken("NEW");
			await provider.flush();
			assert.equal(sessionOf(provider), "NEW");
			assert.deepEqual(provider.events, [
				"set byTokenServer=" + BETA,
				"set byToken=NEW",
			]);
			// and it is bound to BETA: the browser leaving BETA ends it
			provider.setServer(OTHER);
			await provider.emitStorage();
			assert.equal(sessionOf(provider), null);
		});
	},
);

run(
	"the setToken the context hands out is the same function on every render, so an effect that depends on it does not run again",
	async () => {
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			const first = provider.value().setToken;
			provider.render();
			provider.render();
			assert.equal(provider.value().setToken, first);
		});
	},
);

run(
	"logout clears the session and its record after the animation, and a change of server afterwards ends nothing",
	async () => {
		await withProvider(
			{ stored: { byToken: "T", byTokenServer: DEFAULT_SERVER_MARK } },
			async (provider) => {
				provider.value().logout();
				await provider.flush();
				assert.equal(provider.value().isLoggingOut, true);
				await provider.advance(900);
				assert.equal(sessionOf(provider), null);
				assert.equal(provider.data.has("byToken"), false);
				assert.equal(provider.data.has("byTokenServer"), false);
				assert.deepEqual(provider.events, [
					"remove byToken",
					"remove byTokenServer",
				]);
				assert.deepEqual(provider.toasts, [
					{ kind: "success", message: "Logged out" },
				]);
				provider.setServer(BETA);
				await provider.emitStorage();
				assert.equal(provider.toasts.length, 1, "no second message");
			},
		);
	},
);

run(
	"the provider listens for the storage event, a restored page, the focus and the tab being shown, and only on mount",
	async () => {
		await withProvider({ stored: { byToken: "T" } }, async (provider) => {
			assert.deepEqual(
				provider.windowListeners.map((l) => l.type).sort(),
				["focus", "pageshow", "storage"],
			);
			assert.deepEqual(
				provider.documentListeners.map((l) => l.type),
				["visibilitychange"],
			);
			provider.render();
			provider.render();
			await provider.flush();
			assert.equal(
				provider.windowListeners.length,
				3,
				"not again on a later render",
			);
			assert.equal(provider.documentListeners.length, 1);
		});
	},
);

// ----- source pins -----

const flat = (text) => text.replace(/\s+/g, " ");
/** emitted code of a source file with its comments and types gone */
function code(relative) {
	const { outputText } = ts.transpileModule(
		fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"),
		{
			fileName: relative,
			compilerOptions: {
				target: ts.ScriptTarget.ESNext,
				module: ts.ModuleKind.ESNext,
				jsx: ts.JsxEmit.Preserve,
				removeComments: true,
			},
		},
	);
	return flat(outputText);
}

test("the provider reaches storage through the helpers only, and every session it keeps is stored with its server", () => {
	const context = code("src/context/AuthContext.tsx");
	assert.doesNotMatch(
		context,
		/localStorage\.(get|set|remove)Item|localStorage\[/,
	);
	assert.doesNotMatch(context, /"byToken"|'byToken'/);
	// the one place a session is written, and the one place it is read
	assert.equal(
		context.split("writeSession(storage(),").length - 1,
		2,
		"keepSession and setSession",
	);
	assert.equal(context.split("readSession(storage(),").length - 1, 1);
	assert.equal(
		context.split("clearSession(storage())").length - 1,
		1,
		"logout",
	);
	assert.equal(
		context.split("forgetSession(storage(),").length - 1,
		1,
		"a server change",
	);
	// every way to sign in asks the server when it starts, and keeps its session through keepSession
	assert.equal(
		context.split("const server = currentServer();").length - 1,
		6,
		"the tab's start, setToken, the exchange, and the password, wallet and seed phrase logins",
	);
	assert.equal(
		context.split("keepSession(").length - 1,
		4,
		"the commit and the three logins",
	);
	// the 900 ms wait is asked the question again
	assert.ok(
		context.includes(
			"issuedBy.current.delete(jwt); if (currentServer() !== server) { setIsTransitioning(false); toast.error(SERVER_CHANGED); return; } hold(jwt, server);",
		),
	);
	// an answer is dropped when the server changed before it came
	assert.ok(
		context.includes(
			"if (currentServer() !== server) { return { error: { message: SERVER_CHANGED } }; }",
		),
	);
	assert.ok(
		context.includes(
			"if (currentServer() !== server) { toast.error(SERVER_CHANGED); return false; }",
		),
	);
	// the check and the four ways it is asked
	assert.ok(
		context.includes(
			"if (session === null || session.server === currentServer()) return;",
		),
	);
	for (const line of [
		'window.addEventListener("storage", checkServer);',
		'window.addEventListener("pageshow", checkServer);',
		'window.addEventListener("focus", checkServer);',
		'document.addEventListener("visibilitychange", checkServer);',
		'window.removeEventListener("storage", checkServer);',
		'window.removeEventListener("pageshow", checkServer);',
		'window.removeEventListener("focus", checkServer);',
		'document.removeEventListener("visibilitychange", checkServer);',
	]) {
		assert.ok(context.includes(line), line);
	}
	// the server a session goes by is the one the api layer reads, named the same way everywhere
	assert.ok(
		context.includes(
			"const currentServer = () => serverMark(getApiBase(), DEFAULT_API_BASE);",
		),
	);
	// the context's setToken is the one function that signs in or out without an answer
	assert.ok(context.includes("setToken: setSession,"));
});

test("nothing else keeps a session in storage: the approval page reads and takes it out, and the sign-up form hands its session to the context", () => {
	const holders = [];
	const visit = (dir) => {
		for (const entry of fs.readdirSync(
			new URL(`../${dir}/`, import.meta.url),
			{
				withFileTypes: true,
			},
		)) {
			const relative = `${dir}/${entry.name}`;
			if (entry.isDirectory()) visit(relative);
			else if (/\.(ts|tsx)$/.test(entry.name)) {
				const text = fs.readFileSync(
					new URL(`../${relative}`, import.meta.url),
					"utf8",
				);
				if (/["']byToken["']/.test(text)) holders.push(relative);
			}
		}
	};
	visit("src");
	assert.deepEqual(holders.sort(), [
		"src/components/AuthSection.tsx",
		"src/pages/LoginApp.tsx",
		"src/services/sessionBinding.ts",
	]);
	// the sign-up form writes its session and hands it to the context's setToken, which records
	// the server; a new writer that did not would leave a stale record beside its session
	const section = fs.readFileSync(
		new URL("../src/components/AuthSection.tsx", import.meta.url),
		"utf8",
	);
	assert.equal(section.split('"byToken"').length - 1, 1);
	assert.match(
		flat(section),
		/localStorage\.setItem\("byToken", jwt\); setToken\(jwt\);/,
	);
	// the page removes the session and never writes one
	const page = code("src/pages/LoginApp.tsx");
	assert.doesNotMatch(page, /setItem\("byToken"/);
});
