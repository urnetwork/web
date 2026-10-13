// /login-app, the request stash (src/services/appRequestStash.ts): the validated
// request is taken out of the address bar before React starts, kept in one
// sessionStorage slot, and dropped when stale or malformed. A page address with
// a query string never holds a request. Fake window, history and storage
// objects; nothing here touches a browser.
import assert from "node:assert/strict";
import test from "node:test";

import {
	APP_REQUEST_KEY,
	APP_SIGN_IN_KEY,
	SIGN_IN_MARKER_MAX_AGE_MS,
	captureAppRequest,
	clearAppRequest,
	markSignInPending,
	readAppRequest,
	resolveAppRequest,
} from "../src/services/appRequestStash.ts";
import {
	NOW,
	PK,
	STATE,
	TS,
	fragment,
	request,
} from "./helpers/app-request.mjs";

const EXTENSION_RETURN_KEY = "extension_return_to";

function fakeStorage(over = {}) {
	const map = new Map();
	return {
		map,
		getItem: (key) => (map.has(key) ? map.get(key) : null),
		setItem: (key, value) => {
			map.set(key, String(value));
		},
		removeItem: (key) => {
			map.delete(key);
		},
		...over,
	};
}

/** a window whose history.replaceState rewrites the location the way a browser does */
function fakeWindow({ pathname = "/login-app", search = "", hash = "" } = {}) {
	const win = {
		location: { pathname, search, hash },
		history: {
			calls: [],
			replaceState(data, unused, url) {
				this.calls.push({ data, unused, url });
				const parsed = new URL(url, "https://manager.example");
				win.location.pathname = parsed.pathname;
				win.location.search = parsed.search;
				win.location.hash = parsed.hash;
			},
		},
	};
	return win;
}

const slotOf = (storage) => JSON.parse(storage.map.get(APP_REQUEST_KEY));
const throwing = () => {
	throw new Error("storage is blocked");
};
const blocked = () => ({
	getItem: throwing,
	setItem: throwing,
	removeItem: throwing,
});

test("a valid request is stored once, alone, and the fragment leaves the address", () => {
	const storage = fakeStorage();
	const win = fakeWindow({ hash: fragment() });
	const result = captureAppRequest(win, storage, NOW);
	assert.deepEqual(result, { outcome: "stored" });
	assert.deepEqual([...storage.map.keys()], [APP_REQUEST_KEY], "one slot");
	assert.deepEqual(slotOf(storage), {
		platform: "windows",
		state: STATE,
		pk: PK,
		ts: TS,
	});
	assert.deepEqual(
		Object.keys(slotOf(storage)),
		["platform", "state", "pk", "ts"],
		"the validated request, no more",
	);
	assert.equal(win.location.hash, "", "the fragment is gone");
	assert.equal(win.history.calls.length, 1);
	assert.deepEqual(win.history.calls[0], {
		data: null,
		unused: "",
		url: "/login-app",
	});
	assert.deepEqual(readAppRequest(storage, NOW), {
		status: "ready",
		request: request(),
	});
});

test("the page can ask why there is no request without being told: it remembers what this page load's capture did", () => {
	const empty = () => fakeStorage();
	const cases = [
		[fragment({ state: "short" }), "invalid"],
		[fragment({ v: "2" }), "unsupported"],
		[fragment({ ts: String(TS - 3600) }), "stale"],
		[fragment() + "&redirect_uri=x", "invalid"],
	];
	for (const [hash, kind] of cases) {
		captureAppRequest(fakeWindow({ hash }), empty(), NOW);
		assert.deepEqual(
			resolveAppRequest(empty(), NOW),
			{ kind },
			hash.slice(0, 50),
		);
	}
	captureAppRequest(fakeWindow({ hash: "" }), empty(), NOW);
	assert.deepEqual(resolveAppRequest(empty(), NOW), { kind: "none" });
	captureAppRequest(fakeWindow({ pathname: "/" }), empty(), NOW);
	assert.deepEqual(resolveAppRequest(empty(), NOW), { kind: "none" });
	captureAppRequest(fakeWindow({ hash: fragment() }), blocked(), NOW);
	assert.deepEqual(resolveAppRequest(empty(), NOW), { kind: "invalid" });
});

test("a query string on the page address refuses the request: nothing is stored, the slot is emptied, the fragment still leaves", () => {
	// the manager signs a visitor in from ?auth_code= on any route: an approval must never ride on it
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	assert.equal(storage.map.size, 1, "an older, valid request is waiting");

	const win = fakeWindow({
		search: "?auth_code=SECRET-CODE&tab=clients",
		hash: fragment({ state: "Z".repeat(43) }),
	});
	const result = captureAppRequest(win, storage, NOW + 1000);
	assert.deepEqual(result, { outcome: "rejected", reason: "query" });
	assert.equal(
		storage.map.size,
		0,
		"the older request is not left approvable",
	);
	assert.equal(win.location.hash, "", "the fragment leaves the address");
	// the query stays where it was: the manager acts on it by itself
	assert.deepEqual(win.history.calls, [
		{
			data: null,
			unused: "",
			url: "/login-app?auth_code=SECRET-CODE&tab=clients",
		},
	]);
	assert.equal(win.location.search, "?auth_code=SECRET-CODE&tab=clients");
	assert.deepEqual(resolveAppRequest(storage, NOW + 1000, result), {
		kind: "invalid",
	});
	// and the page, asking again without being told, hears the same
	assert.deepEqual(resolveAppRequest(storage, NOW + 1000), {
		kind: "invalid",
	});
});

test("a query string refuses a load with no fragment too, and takes the waiting request with it", () => {
	for (const search of ["?auth_code=ATTACKER", "?x=1", "?a&b", "?="]) {
		const storage = fakeStorage();
		captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
		storage.setItem(APP_SIGN_IN_KEY, String(NOW));
		const win = fakeWindow({ search, hash: "" });
		const result = captureAppRequest(win, storage, NOW + 5_000);
		assert.deepEqual(
			result,
			{ outcome: "rejected", reason: "query" },
			search,
		);
		assert.equal(
			storage.map.size,
			0,
			`${search}: slot and marker are gone`,
		);
		assert.deepEqual(
			win.history.calls,
			[],
			"there is no fragment to strip",
		);
		assert.deepEqual(resolveAppRequest(storage, NOW + 5_000, result), {
			kind: "invalid",
		});
	}
	// no query: this is the reload after signing in, and the request is still there
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	assert.deepEqual(
		captureAppRequest(
			fakeWindow({ search: "", hash: "" }),
			storage,
			NOW + 5_000,
		),
		{ outcome: "unchanged" },
	);
	assert.equal(readAppRequest(storage, NOW + 5_000).status, "ready");
});

test("a bare # with a query is refused and removed; without a query it is left alone", () => {
	const withQuery = fakeWindow({ search: "?a=1", hash: "#" });
	assert.deepEqual(captureAppRequest(withQuery, fakeStorage(), NOW), {
		outcome: "rejected",
		reason: "query",
	});
	assert.equal(withQuery.location.hash, "");
	const plain = fakeWindow({ hash: "#" });
	assert.deepEqual(captureAppRequest(plain, fakeStorage(), NOW), {
		outcome: "unchanged",
	});
	assert.deepEqual(plain.history.calls, []);
});

test("only the validated request is stored: not the path, not the fragment's text", () => {
	const storage = fakeStorage();
	const win = fakeWindow({ hash: fragment() });
	captureAppRequest(win, storage, NOW);
	const raw = storage.map.get(APP_REQUEST_KEY);
	assert.equal(raw.includes("v="), false);
	assert.equal(raw.includes("/login-app"), false);
	assert.equal(raw.includes("auth_code"), false);
	assert.equal(raw.includes("#"), false);
});

test("a second link replaces the first", () => {
	const storage = fakeStorage();
	const second = "Z".repeat(43);
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	captureAppRequest(
		fakeWindow({ hash: fragment({ state: second }) }),
		storage,
		NOW + 1000,
	);
	assert.equal(storage.map.size, 1);
	assert.equal(slotOf(storage).state, second);
	assert.equal(resolveAppRequest(storage, NOW + 1000).request.state, second);
});

test("an invalid link stores nothing, empties the slot and still leaves the address", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	assert.equal(storage.map.size, 1);

	const win = fakeWindow({ hash: fragment({ state: "short" }) });
	const result = captureAppRequest(win, storage, NOW + 1000);
	assert.deepEqual(result, { outcome: "rejected", reason: "state" });
	assert.equal(
		storage.map.size,
		0,
		"the older request is not left approvable behind a newer, broken link",
	);
	assert.equal(win.location.hash, "");
	assert.equal(win.history.calls.length, 1);
	assert.deepEqual(resolveAppRequest(storage, NOW + 1000, result), {
		kind: "invalid",
	});
});

test("links the contract does not allow are refused whole, and leave the address", () => {
	const bad = [
		fragment() + "&redirect_uri=https%3A%2F%2Fevil.example",
		fragment() + "&redirect_link=urnetwork",
		fragment() + "&auth_code=AAAA",
		fragment({ platform: "linux" }),
		fragment({ platform: "__proto__" }),
		fragment({ v: "2" }),
		fragment({ ts: String(TS - 3600) }),
		"#" + "a=b&".repeat(500),
		`#v=1&platform=windows&ѕtate=${STATE}&pk=${PK}&ts=${TS}`,
		"#%76=1",
		"#x",
	];
	for (const hash of bad) {
		const storage = fakeStorage();
		const win = fakeWindow({ hash });
		const result = captureAppRequest(win, storage, NOW);
		assert.equal(result.outcome, "rejected", hash.slice(0, 60));
		assert.equal(storage.map.size, 0, hash.slice(0, 60));
		assert.equal(win.location.hash, "", hash.slice(0, 60));
	}
});

test("a load with no fragment leaves an existing slot alone: the reload after signing in", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	const before = storage.map.get(APP_REQUEST_KEY);

	for (const hash of ["", "#"]) {
		const win = fakeWindow({ hash });
		const result = captureAppRequest(win, storage, NOW + 60_000);
		assert.deepEqual(result, { outcome: "unchanged" });
		assert.equal(
			win.history.calls.length,
			0,
			"the address is not rewritten",
		);
		assert.equal(storage.map.get(APP_REQUEST_KEY), before);
	}
	assert.equal(resolveAppRequest(storage, NOW + 60_000).kind, "ready");
});

test("only the exact /login-app path is captured: elsewhere the address and the slot are untouched", () => {
	for (const pathname of [
		"/",
		"/login-app/",
		"/Login-App",
		"/LOGIN-APP",
		"/login-app/x",
		"/login-extension",
		"/login-app.html",
		"//login-app",
		"/x/login-app",
	]) {
		const storage = fakeStorage();
		const win = fakeWindow({ pathname, hash: fragment() });
		const result = captureAppRequest(win, storage, NOW);
		assert.deepEqual(result, { outcome: "skipped" }, pathname);
		assert.equal(storage.map.size, 0, pathname);
		assert.equal(win.history.calls.length, 0, pathname);
		assert.equal(win.location.hash, fragment(), pathname);
	}
});

test("a slot that went stale is dropped on read, and the edge is the same 240 seconds", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	assert.equal(readAppRequest(storage, NOW + 240_000).status, "ready");
	assert.equal(storage.map.size, 1);
	assert.deepEqual(readAppRequest(storage, NOW + 241_000), {
		status: "stale",
	});
	assert.equal(storage.map.size, 0, "dropped");
	assert.deepEqual(readAppRequest(storage, NOW + 241_000), {
		status: "none",
	});
	assert.deepEqual(
		resolveAppRequest(fakeStorage(), NOW, { outcome: "skipped" }),
		{ kind: "none" },
	);
});

test("a request from the future beyond the window is dropped too", () => {
	const storage = fakeStorage();
	storage.setItem(
		APP_REQUEST_KEY,
		JSON.stringify({
			platform: "windows",
			state: STATE,
			pk: PK,
			ts: TS + 500,
		}),
	);
	assert.deepEqual(readAppRequest(storage, NOW), { status: "stale" });
	assert.equal(storage.map.size, 0);
});

test("a malformed slot is dropped on read, whatever is in it", () => {
	const good = { platform: "windows", state: STATE, pk: PK, ts: TS };
	const slots = [
		"not json",
		"",
		"null",
		"[]",
		"[1,2,3]",
		"12",
		'"windows"',
		"true",
		"{}",
		JSON.stringify({ ...good, extra: 1 }),
		JSON.stringify({ ...good, v: "1" }),
		JSON.stringify({ platform: "windows", state: STATE, pk: PK }),
		JSON.stringify({ ...good, ts: String(TS) }),
		JSON.stringify({ ...good, ts: TS + 0.5 }),
		JSON.stringify({ ...good, ts: -1 }),
		JSON.stringify({ ...good, ts: null }),
		JSON.stringify({ ...good, platform: "__proto__" }),
		JSON.stringify({ ...good, platform: "linux" }),
		JSON.stringify({ ...good, platform: "windows&state=" + STATE }),
		JSON.stringify({ ...good, state: "short" }),
		JSON.stringify({ ...good, state: STATE + "&x=1" }),
		JSON.stringify({ ...good, state: "a=b" }),
		JSON.stringify({ ...good, pk: "1".repeat(44) }),
		JSON.stringify({ ...good, pk: PK + "&state=" + STATE }),
		JSON.stringify({ ...good, pk: 5 }),
		// a real "__proto__" member (an object literal would set the prototype instead)
		`{"platform":"windows","state":"${STATE}","pk":"${PK}","ts":${TS},"__proto__":{"x":1}}`,
		'{"platform":"windows","platform":"windows","state":"' +
			STATE +
			'","pk":"' +
			PK +
			'","ts":' +
			TS +
			"}x",
	];
	for (const raw of slots) {
		const storage = fakeStorage();
		storage.setItem(APP_REQUEST_KEY, raw);
		const read = readAppRequest(storage, NOW);
		assert.equal(read.status, "invalid", raw.slice(0, 80));
		assert.equal(storage.map.size, 0, `dropped: ${raw.slice(0, 80)}`);
	}
	// and a well-formed slot is read back as the same request
	const storage = fakeStorage();
	storage.setItem(APP_REQUEST_KEY, JSON.stringify(good));
	assert.deepEqual(readAppRequest(storage, NOW), {
		status: "ready",
		request: request(),
	});
});

test("a slot written in another key order, with other spacing, is still the same request", () => {
	const storage = fakeStorage();
	storage.setItem(
		APP_REQUEST_KEY,
		`{ "ts": ${TS}, "pk": "${PK}", "state": "${STATE}", "platform": "windows" }`,
	);
	assert.deepEqual(readAppRequest(storage, NOW), {
		status: "ready",
		request: request(),
	});
});

test("storage that throws never makes the page throw", () => {
	const storage = blocked();
	const win = fakeWindow({ hash: fragment() });
	assert.deepEqual(captureAppRequest(win, storage, NOW), {
		outcome: "unstored",
	});
	assert.equal(
		win.location.hash,
		"",
		"the fragment is stripped even when it cannot be kept",
	);
	assert.deepEqual(readAppRequest(storage, NOW), { status: "none" });
	assert.doesNotThrow(() => clearAppRequest(storage));
	assert.doesNotThrow(() => markSignInPending(storage, NOW));
	assert.deepEqual(resolveAppRequest(storage, NOW, { outcome: "unstored" }), {
		kind: "invalid",
	});

	const rejected = captureAppRequest(
		fakeWindow({ hash: fragment({ v: "9" }) }),
		storage,
		NOW,
	);
	assert.deepEqual(rejected, { outcome: "rejected", reason: "version" });

	// a read that fails but a write that works, and the reverse
	const onlyReadsFail = fakeStorage({ getItem: throwing });
	assert.deepEqual(
		captureAppRequest(fakeWindow({ hash: fragment() }), onlyReadsFail, NOW),
		{ outcome: "stored" },
	);
	assert.deepEqual(readAppRequest(onlyReadsFail, NOW), { status: "none" });
	const onlyWritesFail = fakeStorage({ setItem: throwing });
	assert.deepEqual(
		captureAppRequest(
			fakeWindow({ hash: fragment() }),
			onlyWritesFail,
			NOW,
		),
		{ outcome: "unstored" },
	);
	assert.equal(onlyWritesFail.map.size, 0);

	// no storage object at all
	assert.deepEqual(
		captureAppRequest(fakeWindow({ hash: fragment() }), null, NOW),
		{ outcome: "unstored" },
	);
	assert.deepEqual(readAppRequest(null, NOW), { status: "none" });
	assert.doesNotThrow(() => clearAppRequest(null));
	assert.equal(markSignInPending(null, NOW), false);
});

test("a write that fails leaves no older request behind to be approved instead", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	storage.setItem(APP_SIGN_IN_KEY, String(NOW));
	assert.equal(storage.map.size, 2, "an older request and its marker");

	// the browser will not keep the newer link (the quota is full, say)
	storage.setItem = throwing;
	const win = fakeWindow({ hash: fragment({ state: "Z".repeat(43) }) });
	const result = captureAppRequest(win, storage, NOW + 1000);
	assert.deepEqual(result, { outcome: "unstored" });
	assert.equal(
		storage.map.size,
		0,
		"neither the older request nor its marker is left",
	);
	assert.deepEqual(readAppRequest(storage, NOW + 1000), { status: "none" });
	assert.equal(win.location.hash, "", "the fragment still leaves");
	assert.deepEqual(resolveAppRequest(storage, NOW + 1000, result), {
		kind: "invalid",
	});
});

test("an address bar that cannot be rewritten does not lose the request", () => {
	const storage = fakeStorage();
	const win = fakeWindow({ hash: fragment() });
	win.history.replaceState = () => {
		throw new Error("SecurityError");
	};
	assert.deepEqual(captureAppRequest(win, storage, NOW), {
		outcome: "stored",
	});
	assert.equal(readAppRequest(storage, NOW).status, "ready");
});

test("clearing empties the slot and the marker, so a reload after approving or cancelling finds nothing", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	markSignInPending(storage, NOW);
	assert.equal(storage.map.size, 2);
	clearAppRequest(storage);
	assert.equal(storage.map.size, 0);
	assert.deepEqual(readAppRequest(storage, NOW), { status: "none" });
	assert.deepEqual(
		resolveAppRequest(storage, NOW, { outcome: "unchanged" }),
		{ kind: "none" },
	);
	// other keys of the tab are not this module's to remove
	storage.setItem("something_else", "kept");
	clearAppRequest(storage);
	assert.equal(storage.map.get("something_else"), "kept");
});

test("the page can say why there is no request", () => {
	const empty = fakeStorage();
	const cases = [
		[{ outcome: "rejected", reason: "stale" }, "stale"],
		[{ outcome: "rejected", reason: "version" }, "unsupported"],
		[{ outcome: "rejected", reason: "shape" }, "invalid"],
		[{ outcome: "rejected", reason: "unknown-key" }, "invalid"],
		[{ outcome: "rejected", reason: "pk" }, "invalid"],
		[{ outcome: "rejected", reason: "query" }, "invalid"],
		[{ outcome: "unstored" }, "invalid"],
		[{ outcome: "unchanged" }, "none"],
		[{ outcome: "skipped" }, "none"],
	];
	for (const [captured, kind] of cases) {
		assert.deepEqual(
			resolveAppRequest(empty, NOW, captured),
			{ kind },
			JSON.stringify(captured),
		);
	}
	// a slot wins over a note about an earlier rejection
	const full = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), full, NOW);
	assert.equal(
		resolveAppRequest(full, NOW, { outcome: "rejected", reason: "version" })
			.kind,
		"ready",
	);
});

test("the slot never holds a code, a sealed answer or an address to return to", () => {
	const storage = fakeStorage();
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW);
	const raw = storage.map.get(APP_REQUEST_KEY);
	for (const forbidden of [
		"urnetwork://",
		"epk",
		'"c"',
		"auth_code",
		"error",
		"access_denied",
		"redirect",
	]) {
		assert.equal(raw.includes(forbidden), false, forbidden);
	}
	assert.equal(raw.length < 200, true, `${raw.length} characters`);
});

// ----- an extension sign-in left behind in this tab -----

test("starting an app request removes a leftover extension sign-in from this tab: the newest intent wins", () => {
	const storage = fakeStorage();
	storage.setItem(
		EXTENSION_RETURN_KEY,
		"/login-extension?extension_name=X&state=12345678&redirect_uri=https%3A%2F%2Fabc.chromiumapp.org%2F",
	);
	storage.setItem("something_else", "kept");
	const result = captureAppRequest(
		fakeWindow({ hash: fragment() }),
		storage,
		NOW,
	);
	assert.deepEqual(result, { outcome: "stored" });
	assert.equal(storage.map.has(EXTENSION_RETURN_KEY), false);
	assert.equal(
		storage.map.get("something_else"),
		"kept",
		"nothing else is touched",
	);
	assert.equal(storage.map.has(APP_REQUEST_KEY), true);
});

test("only a request that was stored touches the extension's key", () => {
	const key = EXTENSION_RETURN_KEY;
	const value = "/login-extension?state=abc";
	const untouched = (storage, why) =>
		assert.equal(storage.map.get(key), value, why);

	for (const hash of [
		fragment({ state: "short" }),
		fragment({ v: "2" }),
		fragment() + "&redirect_uri=x",
		fragment({ ts: String(TS - 3600) }),
	]) {
		const storage = fakeStorage();
		storage.setItem(key, value);
		captureAppRequest(fakeWindow({ hash }), storage, NOW);
		untouched(storage, `rejected: ${hash.slice(0, 40)}`);
	}
	// a query string, with and without a fragment
	for (const hash of [fragment(), ""]) {
		const storage = fakeStorage();
		storage.setItem(key, value);
		captureAppRequest(
			fakeWindow({ search: "?auth_code=X", hash }),
			storage,
			NOW,
		);
		untouched(storage, "query");
	}
	// the reload after signing in, another page, a storage that will not keep the request
	for (const win of [
		fakeWindow({ hash: "" }),
		fakeWindow({ pathname: "/", hash: fragment() }),
	]) {
		const storage = fakeStorage();
		storage.setItem(key, value);
		captureAppRequest(win, storage, NOW);
		untouched(storage, win.location.pathname);
	}
	const full = fakeStorage();
	full.setItem(key, value);
	const realSet = full.setItem;
	full.setItem = (k, v) => {
		if (k === APP_REQUEST_KEY) throw new Error("quota");
		realSet(k, v);
	};
	assert.deepEqual(
		captureAppRequest(fakeWindow({ hash: fragment() }), full, NOW),
		{ outcome: "unstored" },
	);
	untouched(full, "an unstored request is no intent");
});

test("an extension key that cannot be removed does not stop the request from being kept", () => {
	const storage = fakeStorage();
	storage.setItem(EXTENSION_RETURN_KEY, "/login-extension?x=1");
	const realRemove = storage.removeItem;
	storage.removeItem = (key) => {
		if (key === EXTENSION_RETURN_KEY) throw new Error("blocked");
		realRemove(key);
	};
	assert.deepEqual(
		captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW),
		{ outcome: "stored" },
	);
	assert.equal(readAppRequest(storage, NOW).status, "ready");
});

// ----- the marker: this tab was sent to sign in by the page -----

test("the page leaves a marker with the time, and only in this tab's storage", () => {
	const storage = fakeStorage();
	assert.equal(markSignInPending(storage, NOW), true);
	assert.deepEqual([...storage.map], [[APP_SIGN_IN_KEY, String(NOW)]]);
	assert.equal(markSignInPending(storage, NOW + 0.9), true);
	assert.equal(
		storage.map.get(APP_SIGN_IN_KEY),
		String(NOW),
		"whole milliseconds",
	);
	for (const bad of [NaN, Infinity, undefined, "x"]) {
		const empty = fakeStorage();
		assert.equal(markSignInPending(empty, bad), false, String(bad));
		assert.equal(empty.map.size, 0);
	}
	assert.equal(markSignInPending(blocked(), NOW), false);
	assert.equal(
		SIGN_IN_MARKER_MAX_AGE_MS,
		360_000,
		"as long as the longest-lived request",
	);
});

test("a new request starts without a marker: it has not sent this tab to sign in yet", () => {
	const storage = fakeStorage();
	markSignInPending(storage, NOW);
	captureAppRequest(fakeWindow({ hash: fragment() }), storage, NOW + 1000);
	assert.equal(storage.map.has(APP_SIGN_IN_KEY), false);
	assert.equal(storage.map.has(APP_REQUEST_KEY), true);
	// the reload after signing in does not take it away
	markSignInPending(storage, NOW + 2000);
	captureAppRequest(fakeWindow({ hash: "" }), storage, NOW + 3000);
	assert.equal(storage.map.has(APP_SIGN_IN_KEY), true);
});
