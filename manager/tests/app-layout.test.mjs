// Layout.tsx, the effect that sends a signed-in person back to the approval they
// came from (the first useEffect). Run, not read: the real Layout is compiled
// and rendered with the real request stash and the same minimal hooks runtime
// the page test uses (tests/helpers/hooks-runtime.mjs). The router, the auth
// context, the sections and the clock are fakes. What matters is when Layout
// asks for a hard load of /login-app, and when it must not: a visitor who is
// signed out is never sent there (the page itself sends them to sign in, so a
// redirect from here would bounce between the two for ever), a signed-in person
// is sent once and only if the approval page sent this tab to sign in (its
// marker), the extension's own way back comes first, and moving around the
// dashboard does not run the effect again.
//
// Every test runs twice: as the production build runs Layout, and as React's
// StrictMode runs it in a development build, where the effects are set up, torn
// down and set up again when Layout mounts. Where the two differ the test says
// so: the dashboard's timer is started again (the first one is cleared, so the
// same one is live), and the extension's key, used up by the first run, is gone
// for the second.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import nodeTest from "node:test";

import * as appAuth from "../src/services/appAuth.ts";
import * as appRequestStash from "../src/services/appRequestStash.ts";
import { NOW, PK, STATE, TS } from "./helpers/app-request.mjs";
import { createHooksRuntime } from "./helpers/hooks-runtime.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { matchPath } = require("react-router-dom");

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

const transpiled = ts.transpileModule(
	fs.readFileSync(
		new URL("../src/components/Layout.tsx", import.meta.url),
		"utf8",
	),
	{
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			jsx: ts.JsxEmit.ReactJSX,
			esModuleInterop: true,
		},
	},
).outputText;

const { APP_REQUEST_KEY, APP_SIGN_IN_KEY } = appRequestStash;
const EXTENSION_RETURN_KEY = "extension_return_to";

/** a request as the stash keeps it; `over` replaces fields */
const request = (over = {}) =>
	JSON.stringify({
		platform: "windows",
		state: STATE,
		pk: PK,
		ts: TS,
		...over,
	});

/** every element of a rendered tree that `match` accepts */
function findAll(node, match, found = []) {
	if (Array.isArray(node)) {
		for (const child of node) findAll(child, match, found);
	} else if (node !== null && typeof node === "object") {
		if (match(node)) found.push(node);
		findAll(node.props?.children, match, found);
	}
	return found;
}

/**
 * Layout, mounted. `signedIn` is what the auth context says, `pathname` where the
 * router is, `stored` what the tab's sessionStorage holds (the app's request,
 * the marker the approval page leaves when it sends the tab to sign in, and, for
 * the extension, where to go back to).
 */
function mountLayout({
	signedIn,
	pathname = "/",
	appRequest,
	marked = false,
	extensionReturn,
} = {}) {
	const calls = []; // every navigation Layout asks for, in order
	const timers = []; // timers waiting to fire
	const started = []; // every timer ever started, and whether it was cleared
	let clock = 0;
	let timerId = 1;

	const stored = new Map();
	if (appRequest !== undefined) stored.set(APP_REQUEST_KEY, appRequest);
	if (marked)
		stored.set(APP_SIGN_IN_KEY, String(marked === true ? NOW : marked));
	if (extensionReturn !== undefined)
		stored.set(EXTENSION_RETURN_KEY, extensionReturn);
	const sessionStorage = {
		getItem: (key) => (stored.has(key) ? stored.get(key) : null),
		setItem: (key, value) => stored.set(key, String(value)),
		removeItem: (key) => stored.delete(key),
	};
	const win = {
		sessionStorage,
		location: { replace: (url) => calls.push({ replace: url }) },
	};
	const setTimeoutFake = (fn, ms) => {
		const id = timerId++;
		timers.push({ id, at: clock + ms, fn });
		started.push({ id, ms, cleared: false });
		return id;
	};
	const clearTimeoutFake = (id) => {
		const at = timers.findIndex((t) => t.id === id);
		if (at >= 0) timers.splice(at, 1);
		const timer = started.find((t) => t.id === id);
		if (timer) timer.cleared = true;
	};

	const hooks = createHooksRuntime({ strict });
	const auth = {
		isAuthenticated: signedIn,
		logout() {},
		isLoggingOut: false,
		isTransitioning: false,
	};
	const route = { pathname };
	const navigate = (to, options) => calls.push({ navigate: to, options });

	const Stub = () => null;
	const modules = {
		react: hooks.react,
		"react/jsx-runtime": {
			jsx: (type, props) => ({ type, props }),
			jsxs: (type, props) => ({ type, props }),
			Fragment: Symbol("fragment"),
		},
		"react-router-dom": {
			Routes: Stub,
			Route: Stub,
			matchPath,
			useNavigate: () => navigate,
			useLocation: () => ({ pathname: route.pathname }),
		},
		"lucide-react": {
			TerminalSquare: Stub,
			LogOut: Stub,
			ChevronDown: Stub,
		},
		"../hooks/useViewportType": {
			useViewportType: () => 0,
			ViewportType: { Desktop: 0, Mobile: 1 },
		},
		"../hooks/useAuth": { useAuth: () => auth },
		"../hooks/useAutoLogin": {
			useAutoLogin: () => ({
				pendingSwitch: null,
				confirmSwitch() {},
				cancelSwitch() {},
			}),
		},
		"../services/appAuth": appAuth,
		"../services/appRequestStash": appRequestStash,
	};
	// the sections and pages are drawn by Layout, never run by these tests
	const load = (name) => {
		if (name in modules) return modules[name];
		if (name.startsWith("./") || name.startsWith("../pages/"))
			return { __esModule: true, default: Stub };
		throw new Error(`unexpected import ${name}`);
	};

	// the stash reads the tab's storage through the global window
	const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	Object.defineProperty(globalThis, "window", {
		value: win,
		configurable: true,
		writable: true,
	});

	const mod = { exports: {} };
	new Function(
		"require",
		"module",
		"exports",
		"window",
		"sessionStorage",
		"setTimeout",
		"clearTimeout",
		"Date",
		transpiled,
	)(
		load,
		mod,
		mod.exports,
		win,
		sessionStorage,
		setTimeoutFake,
		clearTimeoutFake,
		{ now: () => NOW },
	);
	hooks.mount(() => mod.exports.default());

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
			await hooks.flush();
		}
		clock = end;
		await hooks.flush();
	};

	const layout = {
		calls,
		timers,
		/** the delay of every timer that was started and not cleared: the dashboard's, if it is on its way */
		get timerDelays() {
			return started.filter((t) => !t.cleared).map((t) => t.ms);
		},
		stored,
		flush: hooks.flush,
		advance,
		/** the auth context changes: the person signs in or out */
		setSignedIn(value) {
			auth.isAuthenticated = value;
			hooks.invalidate();
		},
		/** the router moves to another path */
		goTo(next) {
			route.pathname = next;
			hooks.invalidate();
		},
		/** 1 when the dashboard header is showing, 0 while it is still faded out, undefined without one */
		headerOpacity: () =>
			findAll(hooks.latest(), (n) => n.type === "header")[0]?.props.style
				.opacity,
		close() {
			if (savedWindow)
				Object.defineProperty(globalThis, "window", savedWindow);
			else delete globalThis.window;
		},
	};
	hooks.render(); // the first load: Layout renders and its effects run
	return layout;
}

/** run a test body with a Layout and always release the global window */
async function withLayout(options, body) {
	const layout = mountLayout(options);
	try {
		await body(layout);
	} finally {
		layout.close();
	}
}

test("signed out with a request waiting: Layout sends nobody anywhere and starts nothing", async () => {
	for (const marked of [false, true]) {
		for (const pathname of [
			"/",
			"/stats",
			"/login-app",
			"/login-extension",
		]) {
			await withLayout(
				{ signedIn: false, pathname, appRequest: request(), marked },
				async (layout) => {
					await layout.flush();
					assert.deepEqual(layout.calls, [], pathname);
					assert.deepEqual(layout.timerDelays, [], pathname);
					assert.equal(
						layout.stored.has(APP_REQUEST_KEY),
						true,
						"the request stays for the page that needs it",
					);
					assert.equal(
						layout.stored.has(APP_SIGN_IN_KEY),
						marked,
						"and so does the marker: it is for the sign-in that follows",
					);
					assert.equal(
						layout.headerOpacity(),
						undefined,
						"no dashboard",
					);
				},
			);
		}
	}
});

test("signed in, a request waiting and the approval page's marker: one hard load of /login-app, from any page but that one", async () => {
	for (const pathname of [
		"/",
		"/stats",
		"/leaderboard",
		"/providers",
		"/wallet-stats",
		"/account",
		"/account/api-keys",
		"/balance-codes",
	]) {
		await withLayout(
			{ signedIn: true, pathname, appRequest: request(), marked: true },
			async (layout) => {
				await layout.flush();
				assert.deepEqual(
					layout.calls,
					[{ replace: "/login-app" }],
					`${pathname}: exactly one hard load, and no soft navigation`,
				);
				assert.deepEqual(
					layout.timerDelays,
					[],
					"the dashboard is not started on the way out",
				);
				assert.equal(
					layout.stored.has(APP_REQUEST_KEY),
					true,
					"the request is kept until the person decides",
				);
				assert.equal(
					layout.stored.has(APP_SIGN_IN_KEY),
					false,
					"the marker is used up by the return",
				);
			},
		);
	}
});

test("signed in with a request waiting and no marker: a tab the approval page did not send to sign in is left alone", async () => {
	// the dashboard opened in a tab that holds a request (a custom api server, a window the
	// page refused, an earlier visit): it must not be pulled back to the approval
	for (const pathname of [
		"/",
		"/stats",
		"/leaderboard",
		"/providers",
		"/wallet-stats",
		"/account",
		"/account/api-keys",
		"/balance-codes",
	]) {
		await withLayout(
			{ signedIn: true, pathname, appRequest: request() },
			async (layout) => {
				await layout.flush();
				assert.deepEqual(layout.calls, [], `${pathname}: no redirect`);
				assert.deepEqual(
					layout.timerDelays,
					[300],
					"the dashboard comes up as it always did",
				);
				await layout.advance(300);
				assert.equal(layout.headerOpacity(), 1);
				assert.equal(
					layout.stored.has(APP_REQUEST_KEY),
					true,
					"the request is not taken away",
				);
			},
		);
	}
});

test("a marker that is too old is not followed", async () => {
	await withLayout(
		{
			signedIn: true,
			pathname: "/",
			appRequest: request(),
			marked: NOW - 7 * 60_000,
		},
		async (layout) => {
			await layout.flush();
			assert.deepEqual(layout.calls, []);
			assert.deepEqual(layout.timerDelays, [300]);
			assert.equal(layout.stored.has(APP_SIGN_IN_KEY), false, "dropped");
			assert.equal(layout.stored.has(APP_REQUEST_KEY), true);
		},
	);
});

test("the person signs in at the sign-in screen: Layout takes them back to the approval, once", async () => {
	await withLayout(
		{ signedIn: false, pathname: "/", appRequest: request(), marked: true },
		async (layout) => {
			await layout.flush();
			assert.deepEqual(layout.calls, [], "signed out: nothing yet");
			layout.setSignedIn(true);
			await layout.flush();
			assert.deepEqual(layout.calls, [{ replace: "/login-app" }]);
			assert.deepEqual(layout.timerDelays, []);
			await layout.advance(1_000);
			assert.deepEqual(layout.calls, [{ replace: "/login-app" }]);
		},
	);
});

test("already on /login-app, signed in: Layout leaves the page alone and carries on as it always did", async () => {
	await withLayout(
		{
			signedIn: true,
			pathname: "/login-app",
			appRequest: request(),
			marked: true,
		},
		async (layout) => {
			await layout.flush();
			assert.deepEqual(layout.calls, [], "no redirect, so no loop");
			assert.deepEqual(layout.timerDelays, [300]);
			assert.equal(layout.stored.has(APP_REQUEST_KEY), true);
			assert.equal(layout.headerOpacity(), 0);
			await layout.advance(299);
			assert.equal(layout.headerOpacity(), 0);
			await layout.advance(1);
			assert.equal(
				layout.headerOpacity(),
				1,
				"the header comes up at 300 ms",
			);
		},
	);
});

test("nothing waiting: the dashboard comes up after 300 ms, as it did before", async () => {
	await withLayout({ signedIn: true, pathname: "/" }, async (layout) => {
		await layout.flush();
		assert.deepEqual(layout.calls, []);
		assert.deepEqual(layout.timerDelays, [300]);
		assert.equal(layout.headerOpacity(), 0);
		await layout.advance(300);
		assert.equal(layout.headerOpacity(), 1);
	});
});

test("a request that is stale or unreadable is dropped on the way, not followed", async () => {
	for (const appRequest of [
		request({ ts: TS - 3600 }),
		request({ platform: "linux" }),
		"junk",
	]) {
		await withLayout(
			{ signedIn: true, pathname: "/", appRequest, marked: true },
			async (layout) => {
				await layout.flush();
				assert.deepEqual(layout.calls, [], appRequest.slice(0, 40));
				assert.equal(layout.stored.has(APP_REQUEST_KEY), false);
				assert.equal(layout.stored.has(APP_SIGN_IN_KEY), false);
				assert.deepEqual(layout.timerDelays, [300]);
			},
		);
	}
});

test("the extension's way back comes first, and leaves the app's request alone", async () => {
	const returnTo =
		"/login-extension?state=abc&redirect_uri=https%3A%2F%2Fid.chromiumapp.org%2F";
	for (const appRequest of [request(), undefined]) {
		await withLayout(
			{
				signedIn: true,
				pathname: "/",
				appRequest,
				marked: appRequest !== undefined,
				extensionReturn: returnTo,
			},
			async (layout) => {
				await layout.flush();
				const crossover = strict && appRequest !== undefined;
				assert.deepEqual(
					layout.calls,
					crossover
						? // StrictMode only: the first run took the extension's way and used its
							// key up, so the second finds the app's marker and takes the app's way.
							// A production build runs the effect once and ends on the extension.
							[
								{
									navigate: returnTo,
									options: { replace: true },
								},
								{ replace: "/login-app" },
							]
						: [{ navigate: returnTo, options: { replace: true } }],
				);
				assert.equal(
					layout.stored.has(EXTENSION_RETURN_KEY),
					false,
					"used up",
				);
				assert.equal(
					layout.stored.get(APP_REQUEST_KEY),
					appRequest,
					"the app's request is as it was",
				);
				assert.equal(
					layout.stored.has(APP_SIGN_IN_KEY),
					appRequest !== undefined && !crossover,
					"and so is its marker (the crossover uses it up)",
				);
				assert.deepEqual(
					layout.timerDelays,
					// StrictMode only: with nothing of the app's waiting, the second run
					// finds no extension key and starts the dashboard, which this route hides
					strict && appRequest === undefined ? [300] : [],
				);
			},
		);
	}

	// a value that does not name the extension page is neither followed nor taken
	await withLayout(
		{
			signedIn: true,
			pathname: "/",
			appRequest: request(),
			marked: true,
			extensionReturn: "/stats",
		},
		async (layout) => {
			await layout.flush();
			assert.deepEqual(layout.calls, [{ replace: "/login-app" }]);
			assert.equal(layout.stored.get(EXTENSION_RETURN_KEY), "/stats");
		},
	);
});

test("moving around the app does not run the effect again", async () => {
	// a request is waiting: one hard load, whatever the path does afterwards
	await withLayout(
		{ signedIn: true, pathname: "/", appRequest: request(), marked: true },
		async (layout) => {
			await layout.flush();
			for (const next of ["/stats", "/login-app", "/account"]) {
				layout.goTo(next);
				await layout.flush();
			}
			assert.deepEqual(layout.calls, [{ replace: "/login-app" }]);
		},
	);
	// nothing is waiting: the dashboard's timer is started once
	await withLayout({ signedIn: true, pathname: "/" }, async (layout) => {
		await layout.flush();
		for (const next of ["/stats", "/account"]) {
			layout.goTo(next);
			await layout.flush();
		}
		assert.deepEqual(layout.calls, []);
		assert.deepEqual(layout.timerDelays, [300]);
	});
});
