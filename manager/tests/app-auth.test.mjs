// /login-app, the contract module (src/services/appAuth.ts) and the sealing
// (src/services/appSeal.ts): the strict request parser, the closed platform
// table, the addresses the page may navigate to and the sealed answer. The
// cross-implementation vector is in app-auth-vector.test.mjs.
import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import bs58 from "bs58";

import {
	API_MAX_LENGTH,
	APP_CONTRACTS,
	APP_PLATFORMS,
	APP_REQUEST_PATH,
	APP_REQUEST_VERSION,
	APP_REQUEST_VERSION_API,
	CODE_MINUTES,
	CODE_USES,
	FRAGMENT_MAX_LENGTH,
	MAX_CODE_LENGTH,
	REJECT_REASONS,
	REQUEST_MAX_AGE_S,
	REQUEST_MAX_AHEAD_S,
	RETURN_MAX_LENGTH,
	buildApproveReturn,
	buildDenyReturn,
	evaluateAppGate,
	isFresh,
	logAppAuthEvent,
	parseAppRequest,
	platformRow,
} from "../src/services/appAuth.ts";
import { sealCode } from "../src/services/appSeal.ts";
import {
	API,
	CODE,
	NOW,
	PK,
	STATE,
	TS,
	appKeys,
	fragment,
	mulberry32,
	request,
} from "./helpers/app-request.mjs";

const reasonOf = (text, now = NOW) => {
	const result = parseAppRequest(text, now);
	assert.equal(
		result.ok,
		false,
		`should be refused: ${JSON.stringify(text).slice(0, 120)}`,
	);
	assert.ok(
		REJECT_REASONS.includes(result.reason),
		`reason ${result.reason} is in the closed list`,
	);
	return result.reason;
};

test("the contract constants are the ones the app and the page agree on", () => {
	assert.equal(APP_REQUEST_VERSION, "1");
	assert.equal(APP_REQUEST_VERSION_API, "2");
	assert.equal(APP_REQUEST_PATH, "/login-app");
	assert.equal(REQUEST_MAX_AGE_S, 240);
	assert.equal(REQUEST_MAX_AHEAD_S, 120);
	assert.equal(CODE_MINUTES, 2);
	assert.equal(CODE_USES, 1);
	assert.equal(FRAGMENT_MAX_LENGTH, 400);
	assert.equal(API_MAX_LENGTH, 200);
	assert.equal(RETURN_MAX_LENGTH, 2000);
	assert.equal(MAX_CODE_LENGTH, 1277);
	assert.deepEqual([...REJECT_REASONS].sort(), [
		"api",
		"duplicate",
		"empty",
		"pk",
		"platform",
		"query",
		"shape",
		"stale",
		"state",
		"ts",
		"unknown-key",
		"version",
	]);
	assert.equal(STATE.length, 43);
});

test("the contract versions the page serves are the two versions its parser accepts", () => {
	assert.deepEqual([...APP_CONTRACTS], [1, 2]);
	assert.deepEqual(APP_CONTRACTS.map(String), [
		APP_REQUEST_VERSION,
		APP_REQUEST_VERSION_API,
	]);
	assert.equal(Object.isFrozen(APP_CONTRACTS), true);
	assert.throws(() => {
		APP_CONTRACTS.push(3);
	}, TypeError);
	// the only versions the parser lets through are the ones listed, each with its own keys:
	// version 1 as it is, version 2 with `api`
	for (const v of ["1", "2", "3", "0", "01", "02"]) {
		const text = v === "2" ? fragment({ v, api: API }) : fragment({ v });
		assert.equal(
			parseAppRequest(text, NOW).ok,
			APP_CONTRACTS.map(String).includes(v),
			`v=${v}`,
		);
	}
	// and version 2 is not version 1 with another number: each lacks what the other has
	assert.equal(parseAppRequest(fragment({ v: "2" }), NOW).ok, false);
	assert.equal(parseAppRequest(fragment({ api: API }), NOW).ok, false);
});

test("a well-formed request parses, with or without the leading #, in any field order", () => {
	assert.deepEqual(parseAppRequest(fragment(), NOW), {
		ok: true,
		request: request(),
	});
	assert.deepEqual(parseAppRequest(fragment({}, { hash: false }), NOW), {
		ok: true,
		request: request(),
	});
	const reordered = `#ts=${TS}&pk=${PK}&state=${STATE}&platform=windows&v=1`;
	assert.deepEqual(parseAppRequest(reordered, NOW), {
		ok: true,
		request: request(),
	});
});

test("every key outside the five, in any spelling, refuses the whole request", () => {
	const names = [
		"redirect_link",
		"redirect_uri",
		"return",
		"callback",
		"auth_code",
		"next",
		"code",
		"error",
		"returnTo",
		"return_to",
		"continue",
		"url",
		"u",
		"jwt",
		"token",
		"by_jwt",
		"redirect",
		"STATE",
		"State",
		"Platform",
		"PLATFORM",
		"V",
		"PK",
		"Pk",
		"TS",
		"Ts",
		"Auth_Code",
		"ERROR",
		"__proto__",
		"constructor",
		"prototype",
		"toString",
		"hasOwnProperty",
		"valueOf",
		"isPrototypeOf",
		"v1",
		"v_",
		"state_",
		"_state",
		"ts0",
		"x",
	];
	for (const name of names) {
		assert.equal(reasonOf(`${fragment()}&${name}=x`), "unknown-key", name);
		assert.equal(
			reasonOf(`#${name}=x&${fragment({}, { hash: false })}`),
			"unknown-key",
			`first: ${name}`,
		);
	}
	// a wrongly spelled key cannot stand in for a required one
	assert.equal(
		reasonOf(fragment({ state: null }) + `&STATE=${STATE}`),
		"unknown-key",
	);
	assert.equal(reasonOf(fragment({ pk: null }) + `&PK=${PK}`), "unknown-key");
	// and an unknown key cannot hide behind a bad version
	assert.equal(reasonOf(fragment({ v: "3" }) + "&redirect_uri=x"), "version");
	// api is a key of version 2 alone: to version 1 it is as unknown as any other
	assert.equal(reasonOf(`${fragment()}&api=${API}`), "unknown-key");
	assert.equal(
		reasonOf(`${fragment({ v: "2", api: API })}&redirect_uri=x`),
		"unknown-key",
	);
});

test("a repeated key refuses the request, whichever copy would have been first", () => {
	assert.equal(reasonOf(`${fragment()}&state=${STATE}`), "duplicate");
	assert.equal(
		reasonOf(`${fragment()}&state=${STATE.replace(/^./, "Z")}`),
		"duplicate",
	);
	assert.equal(reasonOf(`${fragment()}&v=1`), "duplicate");
	assert.equal(reasonOf(`${fragment()}&platform=windows`), "duplicate");
	assert.equal(reasonOf(`${fragment()}&pk=${PK}`), "duplicate");
	assert.equal(reasonOf(`${fragment()}&ts=${TS}`), "duplicate");
	assert.equal(reasonOf(`${fragment()}&x=1&x=2`), "duplicate");
	assert.equal(
		reasonOf(`#v=1&v=1&platform=windows&state=${STATE}&pk=${PK}`),
		"duplicate",
	);
});

test("a missing key refuses the request", () => {
	for (const key of ["v", "platform", "state", "pk", "ts"]) {
		assert.equal(
			reasonOf(fragment({ [key]: null })),
			"shape",
			`without ${key}`,
		);
	}
	assert.equal(reasonOf(`#v=1&platform=windows`), "shape");
	assert.equal(reasonOf(`#v=1`), "shape");
});

test("nothing outside [A-Za-z0-9_=&.:-] is accepted: no escapes, no plus, no space, no control characters", () => {
	assert.equal(reasonOf(""), "empty");
	assert.equal(reasonOf("#"), "empty");
	assert.equal(reasonOf("##"), "shape");
	assert.equal(reasonOf(" "), "shape");
	const bad = [
		["percent escape", fragment({ platform: "wind%6Fws" })],
		[
			"percent escape of an ampersand",
			fragment({ platform: "windows%26state=x" }),
		],
		[
			"encoded key",
			`#v=1&platform=windows&st%61te=${STATE}&pk=${PK}&ts=${TS}`,
		],
		["plus", fragment({ platform: "windows+x" })],
		["plus in the state", fragment({ state: STATE.slice(0, 42) + "+" })],
		["trailing space", fragment() + " "],
		["leading space", " " + fragment()],
		["inner space", fragment({ platform: "win dows" })],
		["NUL", fragment() + "\u0000"],
		["NUL inside", fragment({ platform: "win\u0000dows" })],
		["newline", fragment() + "\n"],
		["carriage return", fragment() + "\r"],
		["tab", fragment({ ts: `${TS}\t` })],
		["unit separator", fragment() + "\u001f"],
		["delete", fragment() + "\u007f"],
		["bidi override", fragment({ platform: "‮windows" })],
		["zero width space", fragment({ platform: "win​dows" })],
		[
			"fullwidth ampersand",
			`#v=1＆platform=windows&state=${STATE}&pk=${PK}&ts=${TS}`,
		],
		[
			"fullwidth equals",
			`#v＝1&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}`,
		],
		[
			"cyrillic a in the platform",
			fragment({ platform: "windows".replace("o", "о") }),
		],
		[
			"cyrillic s in a key",
			`#v=1&platform=windows&ѕtate=${STATE}&pk=${PK}&ts=${TS}`,
		],
		["fullwidth digits", fragment({ ts: "１７９０００００００" })],
		["a second #", fragment() + "#x"],
		["a # first", "#" + fragment()],
		["a ? inside", fragment({ platform: "windows?x" })],
		["a slash", fragment({ platform: "windows/x" })],
		["an emoji", fragment() + "\u{1F600}"],
		["a double ampersand", fragment() + "&&"],
		["a trailing ampersand", fragment() + "&"],
		["a leading ampersand", "#&" + fragment({}, { hash: false })],
		["a field without a value sign", fragment() + "&x"],
		["an empty key", fragment() + "&=x"],
		["an empty value", fragment({ platform: "" })],
		["an empty last value", fragment({ ts: "" })],
		["a second equals sign", fragment({ state: STATE.slice(0, 42) + "=" })],
		["two equals signs", fragment({ platform: "windows=x" })],
	];
	for (const [what, text] of bad) {
		assert.equal(reasonOf(text), "shape", what);
	}
	// the dot and the colon joined the alphabet for api: a version 1 value that holds one is
	// no longer a shape problem, and is refused by the pattern of its own key all the same
	assert.equal(
		reasonOf(fragment({ platform: "windows." })),
		"platform",
		"a dot",
	);
	assert.equal(
		reasonOf(fragment({ platform: "windows:" })),
		"platform",
		"a colon",
	);
	assert.equal(
		reasonOf(fragment({ v: "1.0" })),
		"version",
		"a dot in the version",
	);
});

test("the fragment is refused over 400 characters before anything is parsed", () => {
	const base = fragment({}, { hash: false });
	const padded = (total) =>
		`${base}&x=${"a".repeat(total - base.length - 3)}`;
	assert.equal(padded(400).length, 400);
	assert.equal(
		reasonOf("#" + padded(400)),
		"unknown-key",
		"400 characters pass the size check (the # is not counted)",
	);
	assert.equal(reasonOf(padded(400)), "unknown-key");
	assert.equal(reasonOf("#" + padded(401)), "shape");
	assert.equal(reasonOf(padded(401)), "shape");
	assert.equal(
		reasonOf("#" + "a=b&".repeat(5000)),
		"shape",
		"20,000 characters",
	);
	assert.equal(
		reasonOf("#" + "A".repeat(1_000_000)),
		"shape",
		"a million characters, quickly",
	);
	assert.equal(reasonOf(fragment({ platform: "w".repeat(3000) })), "shape");
});

test("anything but v=1 and v=2 is a version the page does not speak", () => {
	for (const v of [
		"3",
		"0",
		"01",
		"10",
		"A",
		"-1",
		"11",
		"22",
		"2.0",
		"1.0",
	]) {
		assert.equal(reasonOf(fragment({ v })), "version", `v=${v}`);
		assert.equal(
			reasonOf(fragment({ v, api: API })),
			"version",
			`v=${v}, with api`,
		);
	}
	assert.equal(reasonOf(fragment({ v: "" })), "shape");
	assert.equal(
		reasonOf("#v=3&platform=windows"),
		"version",
		"a later version may carry other fields",
	);
	assert.equal(reasonOf("#v=3"), "version");
	// version 2 is spoken, with its sixth key: without it the request is a damaged one, not a later one
	assert.equal(reasonOf(fragment({ v: "2" })), "shape");
	assert.equal(reasonOf("#v=2&platform=windows"), "shape");
	assert.equal(reasonOf("#v=2"), "shape");
});

test("the platform must be an own key of the closed table", () => {
	const names = [
		"linux",
		"macos",
		"android",
		"ios",
		"windows2",
		"windows-",
		"-windows",
		"Windows",
		"WINDOWS",
		"wiNdows",
		"__proto__",
		"constructor",
		"prototype",
		"toString",
		"hasOwnProperty",
		"valueOf",
		"isPrototypeOf",
		"propertyIsEnumerable",
		"toLocaleString",
		"__defineGetter__",
		"__lookupGetter__",
	];
	for (const platform of names) {
		assert.equal(reasonOf(fragment({ platform })), "platform", platform);
	}
	assert.equal(reasonOf(fragment({ platform: "" })), "shape");
});

test("the state is exactly 43 url-safe base64 characters", () => {
	assert.equal(reasonOf(fragment({ state: STATE.slice(1) })), "state");
	assert.equal(reasonOf(fragment({ state: STATE + "A" })), "state");
	assert.equal(reasonOf(fragment({ state: "S".repeat(42) })), "state");
	assert.equal(reasonOf(fragment({ state: "S".repeat(44) })), "state");
	assert.equal(reasonOf(fragment({ state: STATE.slice(1) + "." })), "state");
	assert.equal(reasonOf(fragment({ state: STATE.slice(1) + ":" })), "state");
	assert.equal(reasonOf(fragment({ state: STATE.slice(1) + "+" })), "shape");
	assert.equal(reasonOf(fragment({ state: STATE.slice(1) + "/" })), "shape");
	for (const state of [
		"S".repeat(43),
		"-".repeat(21) + "_".repeat(22),
		"0".repeat(43),
		"Z".repeat(43),
	]) {
		assert.equal(parseAppRequest(fragment({ state }), NOW).ok, true, state);
	}
});

test("the public key is 43 or 44 base58 characters that decode to exactly 32 bytes", () => {
	const refusePk = (pk, why) =>
		assert.equal(reasonOf(fragment({ pk })), "pk", why);
	assert.equal(PK.length, 44);
	assert.equal(
		parseAppRequest(fragment({ pk: PK.slice(1) }), NOW).ok,
		true,
		"43 characters that decode to 32 bytes are another valid key",
	);
	refusePk(PK.slice(0, 42), "42 characters");
	// a whole 32-byte key that is only 42 characters long (two zero bytes make two '1's and the
	// rest is small): it decodes to 32 bytes, so only the length rule refuses it, as the README says
	const short = Uint8Array.from({ length: 32 }, (_, i) =>
		i < 2 ? 0 : i === 2 ? 1 : (i * 37 + 11) & 255,
	);
	const short58 = bs58.encode(short);
	assert.equal(short58.length, 42);
	assert.equal(bs58.decode(short58).length, 32, "it is a whole key");
	assert.equal(short58, "11JBvniijo7XjdCdeELRr7T5qhCmPWVHMubNAdzbCy");
	refusePk(short58, "a 32-byte key written in 42 characters");
	refusePk(PK.slice(0, 41), "41 characters");
	refusePk(PK.slice(2, 44), "42 characters from the end");
	refusePk(PK.padEnd(45, "1"), "45 characters");
	refusePk(PK + PK, "twice the length");
	refusePk("1".repeat(44), "44 zero bytes");
	refusePk("1".repeat(43), "43 zero bytes");
	refusePk("1".repeat(32), "the 32 zero bytes (and 32 characters)");
	for (const bad of ["0", "O", "I", "l"])
		refusePk(bad + PK.slice(1), `${bad} is not base58`);
	refusePk(PK.slice(0, 20) + "0" + PK.slice(21), "a zero in the middle");
	refusePk("z".repeat(44), "44 z: more than 32 bytes");
	refusePk("2".repeat(43), "43 twos decode to a different length");
	assert.equal(
		reasonOf(fragment({ pk: PK.slice(0, 20) + "_" + PK.slice(21) })),
		"pk",
		"_ is in the fragment alphabet but not base58",
	);
	assert.equal(
		reasonOf(fragment({ pk: PK.slice(0, 20) + "-" + PK.slice(21) })),
		"pk",
	);

	// 31 and 33 bytes written in 43 or 44 characters are still not a key
	const rand = mulberry32(7);
	const bytes = (n) =>
		Uint8Array.from({ length: n }, () => Math.floor(rand() * 256));
	let refused31 = 0,
		refused33 = 0,
		accepted32 = 0;
	for (
		let i = 0;
		i < 4000 && (refused31 < 3 || refused33 < 3 || accepted32 < 3);
		i++
	) {
		const b31 = bytes(31);
		b31[0] |= 0x80;
		const e31 = bs58.encode(b31);
		if (e31.length >= 43 && e31.length <= 44) {
			refusePk(e31, "31 bytes");
			refused31++;
		}
		const b33 = bytes(33);
		b33[0] = 0;
		const e33 = bs58.encode(b33);
		if (e33.length >= 43 && e33.length <= 44) {
			refusePk(e33, "33 bytes with a leading zero");
			refused33++;
		}
		const b32 = bytes(32);
		b32[0] = 0;
		b32[1] |= 0x80;
		const e32 = bs58.encode(b32);
		if (e32.length >= 43 && e32.length <= 44) {
			// a key that starts with a zero byte begins with '1' and is still accepted
			assert.equal(e32[0], "1");
			assert.equal(
				parseAppRequest(fragment({ pk: e32 }), NOW).ok,
				true,
				e32,
			);
			accepted32++;
		}
	}
	assert.ok(
		refused31 >= 3 && refused33 >= 3 && accepted32 >= 3,
		`${refused31} ${refused33} ${accepted32}`,
	);
	assert.equal(
		parseAppRequest(
			fragment({ pk: bs58.encode(new Uint8Array(32).fill(255)) }),
			NOW,
		).ok,
		true,
		"the largest key (44 characters)",
	);
});

test("the timestamp is ten digits and inside [now-240 s, now+120 s]", () => {
	for (const ts of [
		"1790000000a",
		"179000000",
		"17900000000",
		"-179000000",
		"0x6b1a0c80",
		"17900000.0",
		"1e9999999",
		"NaN",
	]) {
		const reason = reasonOf(fragment({ ts }));
		assert.ok(reason === "ts" || reason === "shape", `${ts}: ${reason}`);
	}
	assert.equal(reasonOf(fragment({ ts: "0000000000" })), "stale");
	assert.equal(reasonOf(fragment({ ts: "9999999999" })), "stale");
	assert.equal(
		parseAppRequest(fragment({ ts: String(TS - 240) }), NOW).ok,
		true,
	);
	assert.equal(reasonOf(fragment({ ts: String(TS - 241) })), "stale");
	assert.equal(
		parseAppRequest(fragment({ ts: String(TS + 120) }), NOW).ok,
		true,
	);
	assert.equal(reasonOf(fragment({ ts: String(TS + 121) })), "stale");
});

test("the clock is read in whole seconds, rounded down, and a clock that is not a number is never fresh", () => {
	const oldest = fragment({ ts: String(TS - 240) });
	assert.equal(
		parseAppRequest(oldest, NOW + 999).ok,
		true,
		"240.999 s old rounds to 240",
	);
	assert.equal(reasonOf(oldest, NOW + 1000), "stale");
	const furthest = fragment({ ts: String(TS + 120) });
	assert.equal(parseAppRequest(furthest, NOW).ok, true);
	assert.equal(
		parseAppRequest(furthest, NOW - 1).ok,
		false,
		"120.001 s ahead rounds to 121",
	);
	for (const bad of [
		NaN,
		Infinity,
		-Infinity,
		undefined,
		null,
		"1790000000000",
	]) {
		assert.deepEqual(
			parseAppRequest(fragment(), bad),
			{ ok: false, reason: "stale" },
			String(bad),
		);
		assert.equal(isFresh(request(), bad), false, String(bad));
	}
});

test("freshness is checked again at the click with the same window", () => {
	const r = request();
	assert.equal(isFresh(r, NOW), true);
	assert.equal(isFresh(r, NOW + 240_000), true);
	assert.equal(isFresh(r, NOW + 240_999), true);
	assert.equal(isFresh(r, NOW + 241_000), false);
	assert.equal(isFresh(r, NOW - 120_000), true);
	assert.equal(isFresh(r, NOW - 121_000), false);
});

test("input that is not a string never throws", () => {
	for (const value of [
		undefined,
		null,
		0,
		1,
		{},
		[],
		["#v=1"],
		true,
		() => "x",
		Symbol.iterator,
		10n,
	]) {
		assert.deepEqual(parseAppRequest(value, NOW), {
			ok: false,
			reason: "shape",
		});
	}
});

test("fuzz: a request is accepted only in the one shape the contract describes, and nothing throws", () => {
	const rand = mulberry32(20261009);
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-=&%+ #?/.\u0000‮о";
	const pick = () => alphabet[Math.floor(rand() * alphabet.length)];
	const base = fragment({}, { hash: false });
	let accepted = 0;
	for (let i = 0; i < 6000; i++) {
		let text = base;
		for (let m = 0, count = 1 + Math.floor(rand() * 3); m < count; m++) {
			const at = Math.floor(rand() * (text.length + 1));
			const kind = Math.floor(rand() * 3);
			if (kind === 0) text = text.slice(0, at) + pick() + text.slice(at);
			else if (kind === 1) text = text.slice(0, at) + text.slice(at + 1);
			else text = text.slice(0, at) + pick() + text.slice(at + 1);
		}
		const result = parseAppRequest("#" + text, NOW);
		if (!result.ok) continue;
		accepted++;
		const r = result.request;
		assert.ok(platformRow(r.platform) !== null);
		assert.match(r.state, /^[A-Za-z0-9_-]{43}$/);
		assert.equal(bs58.decode(r.pk).length, 32);
		assert.ok(Number.isInteger(r.ts) && isFresh(r, NOW));
		assert.match(text, /^[A-Za-z0-9_=&-]+$/);
		assert.equal(text.split("&").length, 5, "exactly five fields");
	}
	assert.ok(
		accepted > 0,
		"some mutations (a swapped character that stays valid) are still valid",
	);
	for (let i = 0; i < 2000; i++) {
		const length = Math.floor(rand() * 200);
		let text = "";
		for (let j = 0; j < length; j++) text += pick();
		const result = parseAppRequest(text, NOW);
		assert.equal(typeof result.ok, "boolean");
	}
});

test("a query string on the page address refuses the request, whatever the fragment says", () => {
	// the manager signs a visitor in from ?auth_code= on any route: an approval must never ride on that
	const searches = [
		"?auth_code=ATTACKER",
		"?auth_code=" + "A".repeat(700),
		"?a=1",
		"?x",
		"?=",
		"??",
		"?a=1&b=2",
		"?redirect_uri=https%3A%2F%2Fevil.example",
		"?return=1",
		"? ",
		"?%",
		"?\u0000",
		"?#",
		// a bare ? is no query to a browser (location.search is ""), but a caller that passes it is refused too
		"?",
		"#",
		" ",
		"x",
	];
	for (const search of searches) {
		const where = JSON.stringify(search).slice(0, 60);
		assert.deepEqual(
			parseAppRequest(fragment(), NOW, search),
			{ ok: false, reason: "query" },
			where,
		);
		assert.deepEqual(
			parseAppRequest(fragment({}, { hash: false }), NOW, search),
			{ ok: false, reason: "query" },
			`${where}, no leading #`,
		);
	}
	// the query is judged before everything else about the request
	for (const bad of [
		"",
		"#",
		fragment({ v: "2" }),
		fragment({ ts: String(TS - 3600) }),
		fragment({ platform: "linux" }),
		fragment() + "&redirect_uri=x",
		"#%",
	]) {
		assert.equal(
			parseAppRequest(bad, NOW, "?auth_code=X").reason,
			"query",
			bad.slice(0, 40),
		);
	}
	// anything that is not the empty string counts, so a missing or odd value fails closed
	for (const odd of [null, 0, false, {}, [], ["?a=1"], 10n]) {
		assert.deepEqual(
			parseAppRequest(fragment(), NOW, odd),
			{ ok: false, reason: "query" },
			String(odd),
		);
	}
	// no query: the request is as valid as it was
	assert.deepEqual(parseAppRequest(fragment(), NOW, ""), {
		ok: true,
		request: request(),
	});
	assert.deepEqual(parseAppRequest(fragment(), NOW, undefined), {
		ok: true,
		request: request(),
	});
	assert.deepEqual(parseAppRequest(fragment(), NOW), {
		ok: true,
		request: request(),
	});
	// and a fragment that is not a string is still a shape problem, not a query one
	assert.deepEqual(parseAppRequest(5, NOW, "?a=1"), {
		ok: false,
		reason: "shape",
	});
});

/** the ciphertext of a code is random: a seeded generator makes these counts repeat */
function seededSeal(code, rand) {
	const bytes = (n) =>
		Uint8Array.from({ length: n }, () => Math.floor(rand() * 256));
	return sealCode(code, request(), {
		keyPair: () => nacl.box.keyPair.fromSecretKey(bytes(32)),
		nonce: () => bytes(24),
	});
}

test("MAX_CODE_LENGTH is the longest code whose answer always fits the 2,000-character budget", () => {
	// the exact bound: the box is the code plus 74 bytes (58 of JSON around it, 16 of tag),
	// base58 of N bytes is at most floor(N * log58(256)) + 1 characters, and the rest of
	// the address is 77 characters plus a public key of at most 44 and a nonce of at most 33
	const rest =
		"urnetwork://auth?state=".length +
		43 +
		"&epk=".length +
		"&n=".length +
		"&d=".length;
	assert.equal(rest, 77);
	const worst = (length) =>
		rest +
		44 +
		33 +
		Math.floor((length + 74) * (Math.log(256) / Math.log(58))) +
		1;
	assert.equal(
		worst(MAX_CODE_LENGTH),
		RETURN_MAX_LENGTH,
		"exactly at the budget",
	);
	assert.equal(
		worst(MAX_CODE_LENGTH + 1),
		RETURN_MAX_LENGTH + 1,
		"one more goes over",
	);
	assert.equal(
		JSON.stringify({ c: "", s: STATE }).length,
		58,
		"the JSON around the code",
	);

	// and what the page really builds, with seeded keys and nonces
	const rand = mulberry32(2026);
	let longest = 0;
	for (let i = 0; i < 1500; i++) {
		const sealed = seededSeal("A".repeat(MAX_CODE_LENGTH), rand);
		const url = buildApproveReturn(request(), sealed);
		longest = Math.max(longest, url.length);
		assert.ok(url.length <= RETURN_MAX_LENGTH, `${url.length}`);
	}
	assert.ok(
		longest >= RETURN_MAX_LENGTH - 5,
		`the budget is nearly used: ${longest}`,
	);
	let fitted = 0;
	let refused = 0;
	for (let i = 0; i < 1500; i++) {
		const sealed = seededSeal("A".repeat(MAX_CODE_LENGTH + 1), rand);
		try {
			buildApproveReturn(request(), sealed);
			fitted++;
		} catch (error) {
			assert.match(error.message, /too long/);
			refused++;
		}
	}
	assert.ok(
		fitted > 0 && refused > 0,
		`one more sometimes fits (${fitted}) and sometimes not (${refused})`,
	);
});

test("the platform table is closed, frozen and holds one constant return base", () => {
	assert.deepEqual(Object.keys(APP_PLATFORMS), ["windows"]);
	assert.deepEqual(
		{ ...APP_PLATFORMS.windows },
		{
			label: "URnetwork for Windows",
			returnBase: "urnetwork://auth",
		},
		"a label and a return base, and no operating-system column",
	);
	assert.equal(Object.isFrozen(APP_PLATFORMS), true);
	assert.equal(Object.isFrozen(APP_PLATFORMS.windows), true);
	assert.throws(() => {
		APP_PLATFORMS.windows.returnBase = "https://evil.example";
	}, TypeError);
	assert.throws(() => {
		APP_PLATFORMS.macos = APP_PLATFORMS.windows;
	}, TypeError);
	assert.equal(platformRow("windows"), APP_PLATFORMS.windows);
	for (const name of [
		"",
		" windows",
		"windows ",
		"Windows",
		"__proto__",
		"constructor",
		"toString",
		"hasOwnProperty",
		"valueOf",
		"windows\u0000",
		"linux",
	]) {
		assert.equal(platformRow(name), null, JSON.stringify(name));
	}
});

test("a polluted Object.prototype adds no platform", () => {
	Object.prototype.polluted = {
		label: "x",
		returnBase: "https://evil.example",
	};
	try {
		assert.equal(platformRow("polluted"), null);
		assert.equal(reasonOf(fragment({ platform: "polluted" })), "platform");
		assert.equal(parseAppRequest(fragment(), NOW).ok, true);
	} finally {
		delete Object.prototype.polluted;
	}
});

test("the answers are built from the table's constant and url-safe values only", () => {
	assert.equal(
		buildDenyReturn(request()),
		`urnetwork://auth?state=${STATE}&error=access_denied`,
	);
	const sealed = sealCode(CODE, request());
	const url = buildApproveReturn(request(), sealed);
	assert.match(
		url,
		/^urnetwork:\/\/auth\?state=[A-Za-z0-9_-]{43}&epk=[1-9A-HJ-NP-Za-km-z]{43,44}&n=[1-9A-HJ-NP-Za-km-z]{32,33}&d=[1-9A-HJ-NP-Za-km-z]+$/,
	);
	assert.ok(
		url.length < 1300 && url.length <= RETURN_MAX_LENGTH,
		`the answer is ${url.length} characters`,
	);
	assert.equal(url.includes(CODE), false, "the code is nowhere in the clear");
	assert.equal(url.includes(CODE.slice(0, 20)), false);

	// the browser reads it as exactly: scheme urnetwork, host auth, nothing else
	for (const address of [url, buildDenyReturn(request())]) {
		const parsed = new URL(address);
		assert.equal(parsed.protocol, "urnetwork:");
		assert.equal(parsed.host, "auth");
		assert.equal(parsed.pathname, "");
		assert.equal(parsed.username, "");
		assert.equal(parsed.password, "");
		assert.equal(parsed.port, "");
		assert.equal(parsed.hash, "");
	}
	assert.deepEqual(
		[...new URL(url).searchParams.keys()],
		["state", "epk", "n", "d"],
	);
	assert.deepEqual(
		[...new URL(buildDenyReturn(request())).searchParams.keys()],
		["state", "error"],
	);
	assert.equal(
		new URL(buildDenyReturn(request())).searchParams.get("error"),
		"access_denied",
	);
});

test("a value outside the url-safe alphabet can never reach an address", () => {
	const sealed = sealCode(CODE, request());
	const bad = [
		"a&b",
		"a/b",
		"a#b",
		"a%41",
		"a b",
		"a?b",
		"a=b",
		"a+b",
		"a.b",
		"a:b",
		"a\\b",
		"a\nb",
		"é",
		"‮",
		"",
		"x&redirect=https://evil.example",
		"../x",
		"a@b",
	];
	for (const value of bad) {
		const where = JSON.stringify(value);
		assert.throws(
			() => buildApproveReturn(request(), { ...sealed, d: value }),
			/url-safe/,
			`d ${where}`,
		);
		assert.throws(
			() => buildApproveReturn(request(), { ...sealed, n: value }),
			/url-safe/,
			`n ${where}`,
		);
		assert.throws(
			() => buildApproveReturn(request(), { ...sealed, epk: value }),
			/url-safe/,
			`epk ${where}`,
		);
		assert.throws(
			() => buildApproveReturn(request({ state: value }), sealed),
			/url-safe/,
			`state ${where}`,
		);
		assert.throws(
			() => buildDenyReturn(request({ state: value })),
			/url-safe/,
			`deny state ${where}`,
		);
	}
	assert.throws(
		() => buildApproveReturn(request(), { ...sealed, d: undefined }),
		/url-safe/,
	);
	assert.throws(
		() => buildApproveReturn(request(), { ...sealed, d: 5 }),
		/url-safe/,
	);
});

test("a forged platform or an oversized answer cannot build an address", () => {
	const sealed = sealCode(CODE, request());
	for (const platform of [
		"__proto__",
		"constructor",
		"toString",
		"linux",
		"",
		undefined,
	]) {
		assert.throws(
			() => buildApproveReturn(request({ platform }), sealed),
			/unknown platform/,
			String(platform),
		);
		assert.throws(
			() => buildDenyReturn(request({ platform })),
			/unknown platform/,
			String(platform),
		);
	}
	assert.throws(
		() =>
			buildApproveReturn(request(), {
				...sealed,
				d: "A".repeat(RETURN_MAX_LENGTH),
			}),
		/too long/,
	);
	assert.equal(
		buildApproveReturn(request(), { ...sealed, d: "A".repeat(700) })
			.length < RETURN_MAX_LENGTH,
		true,
	);
});

test("the sealed answer opens with the app's key, carries the state inside, and nothing else opens it", () => {
	const sealed = sealCode(CODE, request());
	const shared = nacl.box.before(bs58.decode(sealed.epk), appKeys.secretKey);
	const opened = nacl.box.open.after(
		bs58.decode(sealed.d),
		bs58.decode(sealed.n),
		shared,
	);
	assert.notEqual(opened, null);
	const text = new TextDecoder().decode(opened);
	assert.equal(text, JSON.stringify({ c: CODE, s: STATE }));
	assert.deepEqual(JSON.parse(text), { c: CODE, s: STATE });
	assert.equal(bs58.decode(sealed.epk).length, 32);
	assert.equal(bs58.decode(sealed.n).length, 24);
	assert.equal(
		bs58.decode(sealed.d).length,
		text.length + nacl.box.overheadLength,
	);
	assert.ok(sealed.epk.length >= 43 && sealed.epk.length <= 44);
	assert.ok(sealed.n.length >= 32 && sealed.n.length <= 33);

	const stranger = nacl.box.before(
		bs58.decode(sealed.epk),
		nacl.box.keyPair().secretKey,
	);
	assert.equal(
		nacl.box.open.after(
			bs58.decode(sealed.d),
			bs58.decode(sealed.n),
			stranger,
		),
		null,
	);
	for (const at of [0, 5, 100, 757]) {
		const flipped = bs58.decode(sealed.d);
		flipped[at] ^= 1;
		assert.equal(
			nacl.box.open.after(flipped, bs58.decode(sealed.n), shared),
			null,
			`ciphertext byte ${at}`,
		);
	}
	const otherNonce = bs58.decode(sealed.n);
	otherNonce[0] ^= 1;
	assert.equal(
		nacl.box.open.after(bs58.decode(sealed.d), otherNonce, shared),
		null,
	);
	assert.equal(
		nacl.box.open.after(
			bs58.decode(sealed.d).slice(1),
			bs58.decode(sealed.n),
			shared,
		),
		null,
	);
	// the page's own ephemeral key is not the app's, and not derivable from the answer
	assert.notEqual(sealed.epk, PK);
	assert.equal(sealed.d.includes(CODE.slice(0, 12)), false);
});

test("every approval uses a fresh ephemeral key and a fresh nonce", () => {
	const seen = { epk: new Set(), n: new Set(), d: new Set() };
	for (let i = 0; i < 25; i++) {
		const sealed = sealCode(CODE, request());
		seen.epk.add(sealed.epk);
		seen.n.add(sealed.n);
		seen.d.add(sealed.d);
	}
	assert.equal(seen.epk.size, 25);
	assert.equal(seen.n.size, 25);
	assert.equal(seen.d.size, 25);
});

test("the ephemeral secret key, the shared key and the plaintext are zeroed afterwards", () => {
	const captured = {};
	const realBefore = nacl.box.before;
	const realEncode = TextEncoder.prototype.encode;
	nacl.box.before = (pk, sk) => (captured.shared = realBefore(pk, sk));
	TextEncoder.prototype.encode = function (text) {
		const bytes = realEncode.call(this, text);
		if (typeof text === "string" && text.includes(CODE))
			captured.message = bytes;
		return bytes;
	};
	try {
		const ephemeral = nacl.box.keyPair();
		captured.secret = ephemeral.secretKey;
		const sealed = sealCode(CODE, request(), { keyPair: () => ephemeral });
		assert.equal(sealed.epk, bs58.encode(ephemeral.publicKey));
	} finally {
		nacl.box.before = realBefore;
		TextEncoder.prototype.encode = realEncode;
	}
	for (const name of ["secret", "shared", "message"]) {
		assert.ok(
			captured[name] && captured[name].length > 0,
			`${name} was seen`,
		);
		assert.equal(
			captured[name].every((b) => b === 0),
			true,
			`${name} is zeroed`,
		);
	}
});

test("sealing refuses what it cannot do, and still zeroes the key", () => {
	const key = () => nacl.box.keyPair();
	assert.throws(() => sealCode("", request()), /no code/);
	assert.throws(() => sealCode(undefined, request()), /no code/);
	assert.throws(() => sealCode(12345, request()), /no code/);
	const b31 = Uint8Array.from({ length: 31 }, (_, i) => i + 1);
	assert.throws(
		() => sealCode(CODE, request({ pk: bs58.encode(b31) })),
		/bad public key/,
	);
	const ephemeral = key();
	assert.throws(
		() =>
			sealCode(CODE, request(), {
				keyPair: () => ephemeral,
				nonce: () => new Uint8Array(23),
			}),
		/bad nonce/,
	);
	assert.equal(
		ephemeral.secretKey.every((b) => b === 0),
		true,
		"zeroed on the error path too",
	);
	assert.throws(
		() => sealCode(CODE, request(), { nonce: () => new Uint8Array(25) }),
		/bad nonce/,
	);
});

test("a public key of small order cannot be sealed to", () => {
	// u-coordinates whose multiples all collapse to the all-zero point would make every
	// shared secret the same: each candidate is first shown to be of small order by the
	// library itself, then sealing to it must be refused
	const littleEndian = (value) => {
		const bytes = new Uint8Array(32);
		for (let i = 0; i < 32; i++)
			bytes[i] = Number((value >> BigInt(8 * i)) & 255n);
		return bytes;
	};
	const p = (1n << 255n) - 19n;
	const candidates = {
		0: 0n,
		1: 1n,
		"p-1": p - 1n,
		p: p,
		"p+1": p + 1n,
		"order 8 (a)":
			325606250916557431795983626356110631294008115727848805560023387167927233504n,
		"order 8 (b)":
			39382357235489614581723060781553021112529911719440698176882885853963445705823n,
	};
	for (const [name, u] of Object.entries(candidates)) {
		const bytes = littleEndian(u);
		assert.equal(
			nacl
				.scalarMult(nacl.box.keyPair().secretKey, bytes)
				.every((b) => b === 0),
			true,
			`${name} is of small order`,
		);
		const pk = bs58.encode(bytes);
		assert.throws(
			() => sealCode(CODE, request({ pk })),
			/bad public key/,
			name,
		);
	}
	// a point of full order is fine
	assert.doesNotThrow(() =>
		sealCode(CODE, request({ pk: bs58.encode(littleEndian(9n)) })),
	);
});

test("nothing is interactive unless this is the top window and nothing opened it", () => {
	const top = {};
	assert.equal(evaluateAppGate({ self: top, top, opener: null }), "ok");
	assert.equal(evaluateAppGate({ self: {}, top, opener: null }), "framed");
	assert.equal(
		evaluateAppGate({ self: {}, top, opener: {} }),
		"framed",
		"framing is reported first",
	);
	assert.equal(evaluateAppGate({ self: top, top, opener: {} }), "opener");
	assert.equal(
		evaluateAppGate({ self: top, top, opener: undefined }),
		"opener",
		"only null counts as no opener",
	);
	assert.equal(evaluateAppGate({ self: top, top, opener: 0 }), "opener");
});

test("the one console line names the action and the platform and carries nothing else", () => {
	const lines = [];
	const real = console.warn;
	console.warn = (...args) => lines.push(args);
	try {
		logAppAuthEvent("approve", "windows");
		logAppAuthEvent("deny", "windows");
	} finally {
		console.warn = real;
	}
	assert.deepEqual(lines, [
		["[AppAuth] action=approve platform=windows"],
		["[AppAuth] action=deny platform=windows"],
	]);
});
