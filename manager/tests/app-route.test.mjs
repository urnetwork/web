// /login-app, the way back after signing in (nextRouteAfterSignIn) and the
// wiring in Layout.tsx. The way back is for a tab that the approval page itself
// sent to sign in, and for no other. The published extension depends on the
// /login-extension route and its extension_return_to branch, so those are
// pinned as they were.
import assert from "node:assert/strict";
import test from "node:test";

import {
	APP_REQUEST_KEY,
	APP_SIGN_IN_KEY,
	SIGN_IN_MARKER_MAX_AGE_MS,
	markSignInPending,
	nextRouteAfterSignIn,
} from "../src/services/appRequestStash.ts";
import { NOW, PK, STATE, TS, source } from "./helpers/app-request.mjs";

/** a tab's storage: the request in its slot (if any) and, when `marked`, the page's marker */
function storageWith(raw, { marked = false } = {}) {
	const map = new Map();
	if (raw !== undefined) map.set(APP_REQUEST_KEY, raw);
	const storage = {
		map,
		getItem: (key) => (map.has(key) ? map.get(key) : null),
		setItem: (key, value) => {
			map.set(key, String(value));
		},
		removeItem: (key) => {
			map.delete(key);
		},
	};
	if (marked) markSignInPending(storage, NOW);
	return storage;
}
const slot = (over = {}) =>
	JSON.stringify({
		platform: "windows",
		state: STATE,
		pk: PK,
		ts: TS,
		...over,
	});

test("nothing is waiting: no route", () => {
	for (const pathname of [
		"/",
		"/stats",
		"/account",
		"/login-app",
		"/login-extension",
	]) {
		assert.equal(
			nextRouteAfterSignIn(storageWith(), pathname, NOW),
			null,
			pathname,
		);
	}
});

test("a fresh request waits and the page sent this tab to sign in: signing in on any other page returns to /login-app", () => {
	for (const pathname of [
		"/",
		"/stats",
		"/leaderboard",
		"/providers",
		"/wallet-stats",
		"/account",
		"/account/api-keys",
		"/balance-codes",
		"/something-else",
	]) {
		const storage = storageWith(slot(), { marked: true });
		assert.equal(
			nextRouteAfterSignIn(storage, pathname, NOW),
			"/login-app",
			pathname,
		);
		assert.equal(
			storage.map.has(APP_REQUEST_KEY),
			true,
			"the request is kept until the person decides",
		);
	}
});

test("a version 2 request, with its api, is followed back to /login-app like a version 1 one; one with a bad api is dropped, not followed", () => {
	for (const pathname of ["/", "/stats", "/account"]) {
		const storage = storageWith(slot({ api: "mock.localhost:5198" }), {
			marked: true,
		});
		assert.equal(
			nextRouteAfterSignIn(storage, pathname, NOW),
			"/login-app",
			pathname,
		);
		assert.equal(
			JSON.parse(storage.map.get(APP_REQUEST_KEY)).api,
			"mock.localhost:5198",
		);
	}
	// not sent by the page: left alone, as ever
	assert.equal(
		nextRouteAfterSignIn(
			storageWith(slot({ api: "api.beta-test.net" })),
			"/",
			NOW,
		),
		null,
	);
	for (const api of [
		"localhost",
		"API.beta-test.net",
		"api.beta-test.net:443",
		5,
		null,
	]) {
		const storage = storageWith(slot({ api }), { marked: true });
		assert.equal(
			nextRouteAfterSignIn(storage, "/", NOW),
			null,
			String(api),
		);
		assert.equal(
			storage.map.size,
			0,
			`${String(api)}: dropped, marker and all`,
		);
	}
});

test("a fresh request and no marker: this tab was not sent to sign in by the page, so it is left alone", () => {
	// a tab that holds a request and nothing more: the dashboard opened in it, a custom
	// api server, a window the page refused, a request from an earlier visit
	for (const pathname of ["/", "/stats", "/account", "/something-else"]) {
		const storage = storageWith(slot());
		assert.equal(
			nextRouteAfterSignIn(storage, pathname, NOW),
			null,
			pathname,
		);
		assert.equal(
			storage.map.has(APP_REQUEST_KEY),
			true,
			"the request is not taken away",
		);
	}
});

test("the marker is used up by the return: the same sign-in does not return twice", () => {
	const storage = storageWith(slot(), { marked: true });
	assert.equal(storage.map.has(APP_SIGN_IN_KEY), true);
	assert.equal(nextRouteAfterSignIn(storage, "/", NOW), "/login-app");
	assert.equal(storage.map.has(APP_SIGN_IN_KEY), false, "consumed");
	assert.equal(storage.map.has(APP_REQUEST_KEY), true);
	assert.equal(
		nextRouteAfterSignIn(storage, "/", NOW),
		null,
		"and not again",
	);
	assert.equal(nextRouteAfterSignIn(storage, "/stats", NOW + 1000), null);
});

test("the marker is short-lived: it counts for as long as the longest-lived request and no longer", () => {
	// a request whose ts is 120 s ahead stays fresh for 360 s: the marker never outlives that
	const ahead = slot({ ts: TS + 120 });
	for (const [age, route] of [
		[0, "/login-app"],
		[1_000, "/login-app"],
		[SIGN_IN_MARKER_MAX_AGE_MS, "/login-app"],
		[SIGN_IN_MARKER_MAX_AGE_MS + 1, null],
		[3_600_000, null],
	]) {
		const storage = storageWith(ahead);
		storage.setItem(APP_SIGN_IN_KEY, String(NOW - age));
		assert.equal(
			nextRouteAfterSignIn(storage, "/", NOW),
			route,
			`marker ${age} ms old`,
		);
		assert.equal(
			storage.map.has(APP_SIGN_IN_KEY),
			false,
			"used up either way",
		);
	}
});

test("a damaged marker, or one from the future, is no marker", () => {
	for (const raw of [
		"",
		"x",
		"-1",
		"1.5",
		"NaN",
		"Infinity",
		"1e9",
		"0x10",
		" 1790000000000",
		`${NOW}x`,
		"1".repeat(40),
		String(NOW + 1000),
		"true",
		"null",
	]) {
		const storage = storageWith(slot());
		storage.setItem(APP_SIGN_IN_KEY, raw);
		assert.equal(
			nextRouteAfterSignIn(storage, "/", NOW),
			null,
			JSON.stringify(raw),
		);
		assert.equal(storage.map.has(APP_SIGN_IN_KEY), false, "dropped");
		assert.equal(storage.map.has(APP_REQUEST_KEY), true);
	}
});

test("a marker with no request behind it is dropped", () => {
	for (const raw of [undefined, slot({ ts: TS - 3600 }), "junk"]) {
		const storage = storageWith(raw, { marked: true });
		assert.equal(nextRouteAfterSignIn(storage, "/", NOW), null);
		assert.equal(
			storage.map.size,
			0,
			"the marker and any bad request are gone",
		);
	}
});

test("already on /login-app: no route, so a hard load there cannot loop", () => {
	const storage = storageWith(slot(), { marked: true });
	assert.equal(nextRouteAfterSignIn(storage, "/login-app", NOW), null);
	assert.equal(
		storage.map.has(APP_REQUEST_KEY),
		true,
		"and the request is still there for the page",
	);
	// the load that follows has no fragment and finds the same slot
	assert.equal(
		nextRouteAfterSignIn(storage, "/login-app", NOW + 5_000),
		null,
	);
	assert.equal(
		nextRouteAfterSignIn(storageWith(slot()), "/login-app", NOW),
		null,
		"with no marker too",
	);
});

test("the canonical path is the only one that counts: other spellings are sent to it", () => {
	for (const pathname of [
		"/login-app/",
		"/Login-App",
		"/LOGIN-APP",
		"/login-app/x",
	]) {
		assert.equal(
			nextRouteAfterSignIn(
				storageWith(slot(), { marked: true }),
				pathname,
				NOW,
			),
			"/login-app",
			pathname,
		);
		assert.equal(
			nextRouteAfterSignIn(storageWith(slot()), pathname, NOW),
			null,
			`${pathname}, not sent by the page`,
		);
	}
});

test("a stale request is dropped, not followed", () => {
	const storage = storageWith(slot(), { marked: true });
	assert.equal(
		nextRouteAfterSignIn(storage, "/", NOW + 240_000),
		"/login-app",
		"still fresh at 240 s",
	);
	const late = storageWith(slot(), { marked: true });
	assert.equal(nextRouteAfterSignIn(late, "/", NOW + 241_000), null);
	assert.equal(late.map.size, 0, "cleared on the way, marker and all");
	assert.equal(nextRouteAfterSignIn(late, "/", NOW + 242_000), null);

	const stale = storageWith(slot({ ts: TS - 3600 }), { marked: true });
	assert.equal(nextRouteAfterSignIn(stale, "/", NOW), null);
	assert.equal(stale.map.size, 0);
});

test("a malformed slot is dropped, not followed", () => {
	for (const raw of [
		"junk",
		"null",
		"[]",
		slot({ platform: "linux" }),
		slot({ state: "short" }),
		slot({ pk: "1".repeat(44) }),
		slot({ ts: String(TS) }),
	]) {
		const storage = storageWith(raw, { marked: true });
		assert.equal(
			nextRouteAfterSignIn(storage, "/", NOW),
			null,
			raw.slice(0, 50),
		);
		assert.equal(storage.map.size, 0, raw.slice(0, 50));
	}
});

test("the extension page is never taken over by a waiting app request", () => {
	for (const pathname of [
		"/login-extension",
		"/login-extension/",
		"/login-extension/complete",
		"/login-extension?x=1",
	]) {
		const storage = storageWith(slot(), { marked: true });
		assert.equal(
			nextRouteAfterSignIn(storage, pathname, NOW),
			null,
			pathname,
		);
		assert.equal(storage.map.has(APP_REQUEST_KEY), true);
		assert.equal(
			storage.map.has(APP_SIGN_IN_KEY),
			true,
			"and the marker waits",
		);
	}
});

test("storage that throws, or no storage, means no route", () => {
	const throwing = () => {
		throw new Error("blocked");
	};
	assert.equal(
		nextRouteAfterSignIn(
			{ getItem: throwing, setItem: throwing, removeItem: throwing },
			"/",
			NOW,
		),
		null,
	);
	assert.equal(nextRouteAfterSignIn(null, "/", NOW), null);
	// a marker that cannot be read is no marker, and a marker that cannot be removed does not break it
	const readsFail = storageWith(slot(), { marked: true });
	readsFail.getItem = (key) => {
		if (key === APP_SIGN_IN_KEY) throw new Error("blocked");
		return readsFail.map.get(key) ?? null;
	};
	assert.equal(nextRouteAfterSignIn(readsFail, "/", NOW), null);
	const removeFails = storageWith(slot(), { marked: true });
	removeFails.removeItem = throwing;
	assert.equal(nextRouteAfterSignIn(removeFails, "/", NOW), "/login-app");
});

// ----- Layout.tsx: the wiring, and the extension's branch left as it was -----

const layout = source("src/components/Layout.tsx");

test("Layout keeps the extension_return_to branch unchanged, and first", () => {
	const extensionBranch = [
		"\t\tif (isAuthenticated) {",
		"\t\t\tconst returnTo = sessionStorage.getItem(EXTENSION_RETURN_KEY);",
		"\t\t\tif (returnTo && returnTo.startsWith('/login-extension')) {",
		"\t\t\t\tsessionStorage.removeItem(EXTENSION_RETURN_KEY);",
		"\t\t\t\tnavigate(returnTo, { replace: true });",
		"\t\t\t\treturn;",
		"\t\t\t}",
	].join("\n");
	assert.ok(
		layout.includes(extensionBranch),
		"the branch the published extension relies on is as it was",
	);
	assert.ok(
		layout.includes("const EXTENSION_RETURN_KEY = 'extension_return_to';"),
	);
	assert.ok(
		layout.includes(
			"const isExtensionRoute = location.pathname.startsWith('/login-extension');",
		),
	);
	assert.ok(
		layout.indexOf("navigate(returnTo, { replace: true });") <
			layout.indexOf("nextRouteAfterSignIn("),
		"the app's branch comes after the extension's",
	);
	assert.equal(layout.split("nextRouteAfterSignIn(").length - 1, 1);
});

test("Layout returns to the approval with one hard load of the canonical path", () => {
	assert.ok(
		layout.includes(
			"const appRoute = nextRouteAfterSignIn(appRequestStorage(), location.pathname, Date.now());",
		),
	);
	assert.ok(layout.includes("window.location.replace(appRoute);"));
	assert.equal(
		layout.split("window.location.replace(").length - 1,
		1,
		"the only navigation Layout adds",
	);
	assert.ok(
		layout.includes(
			"const isAppRoute = matchPath(APP_REQUEST_PATH, location.pathname) !== null;",
		),
	);
	assert.ok(
		layout.includes(
			"const hidesDashboard = isExtensionRoute || isAppRoute;",
		),
	);
	assert.ok(layout.includes("{isAuthenticated && hidesDashboard && ("));
	assert.ok(layout.includes("{isAuthenticated && !hidesDashboard && ("));
});

test("the route is in both Routes blocks and the extension's routes are still there", () => {
	assert.equal(
		layout.split('<Route path="/login-app" element={<LoginApp />} />')
			.length - 1,
		2,
	);
	assert.equal(
		layout.split(
			'<Route path="/login-extension" element={<LoginExtension />} />',
		).length - 1,
		2,
	);
	assert.ok(layout.includes('import LoginApp from "../pages/LoginApp";'));
	assert.ok(
		layout.includes(
			'import LoginExtension from "../pages/LoginExtension";',
		),
	);

	// signed out: the approval route sits before the catch-all sign-in screen
	const signedOut = layout.slice(layout.indexOf("{!isAuthenticated && ("));
	assert.ok(signedOut.indexOf('path="/login-app"') !== -1);
	assert.ok(
		signedOut.indexOf('path="/login-app"') < signedOut.indexOf('path="*"'),
	);
	// signed in: both pages share the one Routes block that hides the dashboard
	const signedIn = layout.slice(
		layout.indexOf("{isAuthenticated && hidesDashboard && ("),
		layout.indexOf("{isAuthenticated && !hidesDashboard && ("),
	);
	assert.ok(
		signedIn.includes('path="/login-app"') &&
			signedIn.includes('path="/login-extension"'),
	);
});

test("Layout does not touch the auto-login hook", () => {
	assert.ok(
		layout.includes(
			'import { useAutoLogin } from "../hooks/useAutoLogin";',
		),
	);
	assert.ok(
		layout.includes(
			"const { pendingSwitch, confirmSwitch, cancelSwitch } = useAutoLogin();",
		),
	);
});
