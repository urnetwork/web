// /login-app, the request that names its network (contract version 2): the value
// of `api` (isValidApiHost), the parser's rules between the two versions, every
// case of the contract's conformance list (section 9) by name, the 400-character
// cap, and the small helpers that say which server a request is for and where
// Switch points the browser. The shared request vector is in
// app-auth-vector.test.mjs; the stash, the controller, the cards and the page
// have their own files.
import assert from "node:assert/strict";
import test from "node:test";
import bs58 from "bs58";

import {
	API_MAX_LENGTH,
	FRAGMENT_MAX_LENGTH,
	REJECT_REASONS,
	apiBaseOfHost,
	appRequestFragment,
	isFresh,
	isServerForRequest,
	isValidApiHost,
	parseAppRequest,
	serverChoiceFor,
	serverMatchesRequest,
} from "../src/services/appAuth.ts";
import {
	API,
	NOW,
	PK,
	STATE,
	TS,
	fragment,
	mulberry32,
	request,
} from "./helpers/app-request.mjs";

/** a version 2 fragment; `over` replaces fields, a null field is left out */
const V2 = (over = {}, options) =>
	fragment({ v: "2", api: API, ...over }, options);
/** a request of either version, with the fields of that version */
const either = (version, over = {}) =>
	version === 2 ? V2(over) : fragment(over);

const reasonOf = (text, now = NOW, search = "") => {
	const result = parseAppRequest(text, now, search);
	assert.equal(
		result.ok,
		false,
		`should be refused: ${JSON.stringify(text).slice(0, 140)}`,
	);
	assert.ok(
		REJECT_REASONS.includes(result.reason),
		`reason ${result.reason} is in the closed list`,
	);
	return result.reason;
};

const label = (length, char = "a") => char.repeat(length);

// ----- the grammar of `api` -----

/** Valid hosts, by name. */
const VALID_HOSTS = [
	["the contract's example", "api.beta-test.net"],
	["a port, as the contract's second example", "api.example.com:8443"],
	["two labels, the least", "a.bc"],
	["a one-letter last label", "a.b"],
	["a hyphen inside a label", "my-api.beta-test.net"],
	["two hyphens in a row inside a label", "ab--cd.example"],
	["a punycode label", "xn--bcher-kva.example"],
	["digits in the labels", "a1.b2.c3"],
	["an all-digit label that is not the last", "1.2.example"],
	["a last label that has a digit", "example.c0m"],
	["a last label that starts with digits", "example.1e3"],
	["a last label that starts like a hex number but is not one", "a.0xg"],
	["a last label that ends in x", "a.10x"],
	["a last label with a leading zero and a letter", "a.01a"],
	["a hex number that is not the last label", "0x7f.example"],
	["a label of 63 characters", `${label(63)}.net`],
	["many labels", "a.b.c.d.e.f.g.h"],
	["a name under localhost, with a port", "mock.localhost:5198"],
	["port 1", "api.beta-test.net:1"],
	["port 80", "api.beta-test.net:80"],
	["port 442, next to the one that is refused", "api.beta-test.net:442"],
	["port 444, next to the one that is refused", "api.beta-test.net:444"],
	["port 8443", "api.beta-test.net:8443"],
	["port 10000", "api.beta-test.net:10000"],
	["port 65535, the largest", "api.beta-test.net:65535"],
	[
		"200 characters, the most",
		`${label(63)}.${label(63)}.${label(63)}.ab:65535`,
	],
];

/** Hosts the grammar refuses, by name, with what stops each. */
const INVALID_HOSTS = [
	["empty", ""],
	["upper case", "API.BETA-TEST.NET"],
	["upper case in one letter", "Api.beta-test.net"],
	["a scheme", "https://api.beta-test.net"],
	["a scheme without the slashes", "https:api.beta-test.net"],
	["a path", "api.beta-test.net/v1"],
	["a trailing slash", "api.beta-test.net/"],
	["userinfo", "user@api.beta-test.net"],
	["userinfo with a password", "user:pass@api.beta-test.net"],
	["a query", "api.beta-test.net?x=1"],
	["a fragment", "api.beta-test.net#x"],
	["port 443", "api.beta-test.net:443"],
	["port 0", "api.beta-test.net:0"],
	["port 65536", "api.beta-test.net:65536"],
	["port 99999", "api.beta-test.net:99999"],
	["port 100000", "api.beta-test.net:100000"],
	["a leading-zero port", "api.beta-test.net:080"],
	["a leading-zero port that reads as 443", "api.beta-test.net:0443"],
	["a port of zeros", "api.beta-test.net:00"],
	["an empty port", "api.beta-test.net:"],
	["a port that is not a number", "api.beta-test.net:http"],
	["a signed port", "api.beta-test.net:+80"],
	["a negative port", "api.beta-test.net:-1"],
	["a hex port", "api.beta-test.net:0x50"],
	["a port with a fraction", "api.beta-test.net:80.5"],
	["two ports", "api.beta-test.net:80:90"],
	["a colon and nothing else", ":"],
	["only a port", ":8443"],
	["a single label", "localhost"],
	["a single label and a port", "localhost:5198"],
	["a single letter", "a"],
	["an ip literal", "192.168.0.1"],
	["an ip literal and a port", "127.0.0.1:5198"],
	["an all-digit last label", "example.123"],
	["a two-digit host", "1.1"],
	["a last label that reads as a hex number", "example.0x10"],
	["a last label of 0x and nothing after it", "a.0x"],
	["a last label that is a long hex number", "a.0xdeadbeef"],
	["a hex last label and a port", "a.0x10:8443"],
	["the address 1.2.3.4 with a hex last label", "1.2.3.0x4"],
	["the address 127.0.0.1 in hex", "0x7f.0x0.0x0.0x1"],
	["an ip6 literal", "[::1]"],
	["a bare ip6 address", "::1"],
	["an empty label", "api..beta-test.net"],
	["a leading dot", ".api.beta-test.net"],
	["a trailing dot", "api.beta-test.net."],
	["only dots", ".."],
	["a hyphen at the start of the first label", "-api.beta-test.net"],
	["a hyphen at the end of the first label", "api-.beta-test.net"],
	["a hyphen at the start of a middle label", "api.-beta-test.net"],
	["a hyphen at the end of a middle label", "api.beta-.test.net"],
	["a hyphen at the start of the last label", "api.beta-test.-net"],
	["a hyphen at the end of the last label", "api.beta-test.net-"],
	["a label that is only a hyphen", "-.beta-test.net"],
	["a label of 64 characters", `${label(64)}.net`],
	["an underscore", "api_x.beta-test.net"],
	["a non-ascii letter", "api.bétà-test.net"],
	["a full-width letter", "ａpi.beta-test.net"],
	["a combining mark", "api.beta-test.nét"],
	["a space", "api.beta test.net"],
	["a tab", "api.beta-test.net\t"],
	["a newline", "api.beta-test.net\n"],
	["a NUL", "api.beta-test.net\u0000"],
	["a percent escape", "api.beta%2Dtest.net"],
	["a plus", "api.beta+test.net"],
	["an equals sign", "api=beta-test.net"],
	["an ampersand", "api&x=y.beta-test.net"],
	["201 characters", `${label(63)}.${label(63)}.${label(63)}.abc:65535`],
	["a thousand characters", `${label(60)}.`.repeat(16) + "net"],
];

test("the grammar of api accepts the hosts the contract allows, each by name", () => {
	for (const [name, host] of VALID_HOSTS) {
		assert.equal(isValidApiHost(host), true, `${name}: ${host}`);
	}
	assert.equal(
		VALID_HOSTS.at(-1)[1].length,
		API_MAX_LENGTH,
		"the longest one is exactly the cap",
	);
});

test("the grammar of api refuses what the contract refuses, each by name", () => {
	for (const [name, host] of INVALID_HOSTS) {
		assert.equal(
			isValidApiHost(host),
			false,
			`${name}: ${JSON.stringify(host).slice(0, 80)}`,
		);
	}
	assert.equal(
		`${label(63)}.${label(63)}.${label(63)}.abc:65535`.length,
		201,
	);
});

test("only a string can be a host", () => {
	for (const value of [
		undefined,
		null,
		0,
		443,
		{},
		[],
		["api.beta-test.net"],
		true,
		() => API,
		Symbol.iterator,
		10n,
		new String(API),
	]) {
		assert.equal(isValidApiHost(value), false, String(typeof value));
	}
});

/** the grammar again, written another way (loops and character tests, not one
 * pattern), so the two can be compared on many strings */
function referenceIsValidApiHost(text) {
	if (typeof text !== "string") return false;
	if (text.length < 1 || text.length > 200) return false;
	const parts = text.split(":");
	if (parts.length > 2) return false;
	const [host, port] = parts;
	if (port !== undefined) {
		if (port.length < 1 || port.length > 5) return false;
		for (const c of port) if (c < "0" || c > "9") return false;
		if (port[0] === "0") return false;
		const number = parseInt(port, 10);
		if (number < 1 || number > 65535 || number === 443) return false;
	}
	const labels = host.split(".");
	if (labels.length < 2) return false;
	for (const part of labels) {
		if (part.length < 1 || part.length > 63) return false;
		for (const c of part) {
			const ok =
				(c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-";
			if (!ok) return false;
		}
		if (part[0] === "-" || part[part.length - 1] === "-") return false;
	}
	const last = labels[labels.length - 1];
	let digitsOnly = true;
	for (const c of last) if (c < "0" || c > "9") digitsOnly = false;
	if (digitsOnly) return false;
	// "0x" and nothing but hex digits after it is a number to a url parser
	if (last[0] === "0" && last[1] === "x") {
		let hexOnly = true;
		for (const c of last.slice(2)) {
			if (!((c >= "0" && c <= "9") || (c >= "a" && c <= "f")))
				hexOnly = false;
		}
		if (hexOnly) return false;
	}
	return true;
}

test("the grammar agrees with a second, independent writing of it on thousands of strings", () => {
	const rand = mulberry32(20261011);
	const pick = (list) => list[Math.floor(rand() * list.length)];
	const pieces = [
		"a",
		"b",
		"z",
		"0",
		"1",
		"9",
		"-",
		".",
		":",
		"A",
		"_",
		"x",
		"ab",
		"co",
		"net",
		"443",
		"80",
		"0",
		"65535",
		"65536",
		"/",
		"@",
		"é",
	];
	let valid = 0;
	let invalid = 0;
	const check = (text) => {
		const got = isValidApiHost(text);
		assert.equal(got, referenceIsValidApiHost(text), JSON.stringify(text));
		if (got) valid++;
		else invalid++;
	};
	for (const [, host] of [...VALID_HOSTS, ...INVALID_HOSTS]) check(host);
	for (let i = 0; i < 12000; i++) {
		let text = "";
		for (let n = 1 + Math.floor(rand() * 9); n > 0; n--)
			text += pick(pieces);
		check(text);
	}
	// near misses of valid hosts: one character changed, dropped or added
	const alphabet = "abcxyz019-.:A_/ é";
	for (let i = 0; i < 12000; i++) {
		let text = pick(VALID_HOSTS)[1];
		const at = Math.floor(rand() * (text.length + 1));
		const kind = Math.floor(rand() * 3);
		const c = alphabet[Math.floor(rand() * alphabet.length)];
		if (kind === 0) text = text.slice(0, at) + c + text.slice(at);
		else if (kind === 1) text = text.slice(0, at) + text.slice(at + 1);
		else text = text.slice(0, at) + c + text.slice(at + 1);
		check(text);
	}
	assert.ok(valid > 1000 && invalid > 1000, `${valid} valid, ${invalid} not`);
});

test("every valid host makes the same host again once it is an https address, so Switch never loops", () => {
	// the page stores https://{host} and later compares it with {host}: the url parser must give
	// back exactly what it was given, or Switch would end on the card it started from
	const page = "https://manager.example/login-app";
	const rand = mulberry32(7);
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789-";
	const hosts = VALID_HOSTS.map(([, host]) => host);
	for (let i = 0; i < 3000; i++) {
		const labels = [];
		for (let n = 2 + Math.floor(rand() * 3); n > 0; n--) {
			let text = "";
			for (let m = 1 + Math.floor(rand() * 12); m > 0; m--) {
				text += letters[Math.floor(rand() * letters.length)];
			}
			labels.push(text.replace(/^-+|-+$/g, "") || "x");
		}
		let host = labels.join(".");
		if (rand() < 0.4) host += `:${1 + Math.floor(rand() * 65535)}`;
		hosts.push(host);
	}
	let usable = 0;
	for (const host of hosts) {
		if (!isValidApiHost(host)) continue;
		const base = apiBaseOfHost(host);
		assert.equal(base, `https://${host}`);
		if (serverMatchesRequest(base, host, page)) {
			usable++;
			assert.equal(new URL(base).host, host, host);
			assert.deepEqual(
				serverChoiceFor(host, "https://api.default.example", page),
				{ kind: "custom", base },
				host,
			);
		} else {
			// a valid host the url parser cannot give back (a bad punycode label is no name, as far
			// as this engine is concerned): it is not a server to switch to
			assert.equal(
				serverChoiceFor(host, "https://api.default.example", page),
				null,
				host,
			);
		}
	}
	assert.ok(usable > 2000, `${usable} usable hosts`);
	// the one kind of host the grammar still lets through and the url parser may not give back as it
	// was: a bad punycode label is no name, and whether it is one is the engine's call (Node refuses
	// `xn--a.example`, other browsers have taken it). Where it is refused it matches no server and
	// cannot be switched to
	const bad = "xn--a.example";
	assert.equal(isValidApiHost(bad), true, bad);
	const engineGivesItBack = (() => {
		try {
			return new URL(`https://${bad}`).host === bad;
		} catch {
			return false;
		}
	})();
	assert.equal(
		serverMatchesRequest(`https://${bad}`, bad, page),
		engineGivesItBack,
		"it matches a server exactly when the engine gives the host back",
	);
	assert.equal(
		serverChoiceFor(bad, "https://api.default.example", page) !== null,
		engineGivesItBack,
		"and Switch has somewhere to go exactly then",
	);
});

test("no host the grammar accepts is an address in disguise: every last label that a url parser reads as a number is refused", () => {
	// A last label made of digits is a number to a url parser, and so is "0x" with hex digits after
	// it (0x, 0x10, 0xdeadbeef): `1.2.3.0x4` is the address 1.2.3.4, `0x7f.0x0.0x0.0x1` is 127.0.0.1
	// and `a.0x10` is no host at all. A host like that must never pass as a name, or the card would
	// offer to switch the browser to what is really an address, or to nothing. Every last label of
	// up to four characters from an alphabet that holds the digits, the hex letters and the letters
	// that end a number early, under several first labels:
	const page = "https://manager.example/login-app";
	const alphabet = "0189afgx-";
	const lasts = [];
	const build = (prefix, depth) => {
		if (prefix) lasts.push(prefix);
		if (depth === 0) return;
		for (const c of alphabet) build(prefix + c, depth - 1);
	};
	build("", 4);
	const fronts = ["a.", "1.2.3.", "0x7f.0x0.0x0.", "a.b.c.d.", "0x.", "00."];
	let accepted = 0;
	let refused = 0;
	for (const front of fronts) {
		for (const last of lasts) {
			const host = front + last;
			if (!isValidApiHost(host)) {
				refused++;
				continue;
			}
			accepted++;
			// accepted: the url parser hands the very same host back, so it is a name
			assert.equal(new URL(`https://${host}`).host, host, host);
		}
	}
	assert.ok(accepted > 1000 && refused > 1000, `${accepted} / ${refused}`);
	// and the numbers the parser reads are refused, each by name
	for (const host of [
		"a.0x",
		"a.0x0",
		"a.0x10",
		"a.0xff",
		"a.0xdeadbeef",
		"1.2.3.0x4",
		"0x7f.0x0.0x0.0x1",
		"a.0x00000000000000000001",
	]) {
		assert.equal(isValidApiHost(host), false, host);
		assert.equal(
			serverChoiceFor(host, "https://api.default.example", page),
			null,
			host,
		);
	}
});

// ----- section 9 of the contract, case by case -----

const ACCEPTED = [
	[
		"version 2 with api=api.beta-test.net",
		V2(),
		request({ api: "api.beta-test.net" }),
	],
	[
		"version 2 with api=api.beta-test.net, without the leading #",
		V2({}, { hash: false }),
		request({ api: "api.beta-test.net" }),
	],
	[
		"version 2 with api=api.example.com:8443",
		V2({ api: "api.example.com:8443" }),
		request({ api: "api.example.com:8443" }),
	],
	[
		"version 2 with api=api.example.com:8443, without the leading #",
		V2({ api: "api.example.com:8443" }, { hash: false }),
		request({ api: "api.example.com:8443" }),
	],
	[
		"version 2 with the keys in any order",
		`#api=${API}&ts=${TS}&pk=${PK}&state=${STATE}&platform=windows&v=2`,
		request({ api: API }),
	],
	[
		"version 2 with api first",
		`#api=${API}&v=2&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}`,
		request({ api: API }),
	],
	["version 1, as ever", fragment(), request()],
	[
		"version 1 without the leading #",
		fragment({}, { hash: false }),
		request(),
	],
];
for (const [name, text, expected] of ACCEPTED) {
	test(`section 9 accepts: ${name}`, () => {
		assert.deepEqual(parseAppRequest(text, NOW), {
			ok: true,
			request: expected,
		});
	});
}

for (const [name, host] of VALID_HOSTS) {
	test(`section 9 accepts: api that is ${name}`, () => {
		assert.deepEqual(parseAppRequest(V2({ api: host }), NOW), {
			ok: true,
			request: request({ api: host }),
		});
	});
}

test("a version 1 request has no api key at all in what the parser returns, a version 2 request has it", () => {
	const v1 = parseAppRequest(fragment(), NOW).request;
	assert.equal("api" in v1, false);
	assert.deepEqual(Object.keys(v1).sort(), ["pk", "platform", "state", "ts"]);
	const v2 = parseAppRequest(V2(), NOW).request;
	assert.deepEqual(Object.keys(v2).sort(), [
		"api",
		"pk",
		"platform",
		"state",
		"ts",
	]);
	assert.equal(v2.api, API);
});

/** [name, fragment, reason] of a request that must be refused */
const REJECTED = [];
const reject = (name, text, reason) => REJECTED.push([name, text, reason]);

// unknown keys, in both versions
for (const version of [1, 2]) {
	for (const key of [
		"redirect_uri",
		"redirect_link",
		"return",
		"callback",
		"auth_code",
		"next",
		"code",
		"error",
		"Redirect_Uri",
		"REDIRECT_LINK",
		"Return",
		"CALLBACK",
		"Auth_Code",
		"NEXT",
		"Code",
		"ERROR",
		"Api",
		"API",
		"V",
		"STATE",
		"api2",
		"a.b",
		"a:b",
		"__proto__",
		"constructor",
	]) {
		reject(
			`unknown key ${key} (version ${version})`,
			`${either(version)}&${key}=x`,
			"unknown-key",
		);
	}
}
reject(
	"unknown key redirect_uri first (version 2)",
	`#redirect_uri=x&${V2({}, { hash: false })}`,
	"unknown-key",
);
reject(
	"an unknown key in place of api (version 2)",
	V2({ api: null }) + "&redirect_uri=x",
	"unknown-key",
);
reject(
	"a wrongly spelled api in place of api (version 2)",
	V2({ api: null }) + `&API=${API}`,
	"unknown-key",
);

// repeated keys
for (const version of [1, 2]) {
	for (const key of ["state", "v", "platform", "pk", "ts"]) {
		const value = {
			state: STATE,
			v: String(version),
			platform: "windows",
			pk: PK,
			ts: String(TS),
		}[key];
		reject(
			`duplicate ${key} (version ${version})`,
			`${either(version)}&${key}=${value}`,
			"duplicate",
		);
		reject(
			`duplicate ${key} with another value (version ${version})`,
			`${either(version)}&${key}=${value.replace(/.$/, "Z")}`,
			"duplicate",
		);
	}
}
reject("duplicate api", `${V2()}&api=${API}`, "duplicate");
reject(
	"duplicate api with another value",
	`${V2()}&api=api.example.com`,
	"duplicate",
);
reject("duplicate v with both versions", `${V2()}&v=1`, "duplicate");
reject(
	"duplicate v, 1 then 2",
	`#v=1&v=2&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}&api=${API}`,
	"duplicate",
);

// a missing key
for (const key of ["platform", "state", "pk", "ts"]) {
	reject(`missing ${key} (version 1)`, fragment({ [key]: null }), "shape");
	reject(`missing ${key} (version 2)`, V2({ [key]: null }), "shape");
}
reject("missing v (version 1)", fragment({ v: null }), "shape");
reject(
	"missing v, with api: api reads as an unknown key",
	V2({ v: null }),
	"unknown-key",
);
reject("missing api (version 2)", V2({ api: null }), "shape");
reject("only v and platform (version 2)", "#v=2&platform=windows", "shape");
reject("only v=2", "#v=2", "shape");

// characters outside the alphabet
for (const version of [1, 2]) {
	const base = (over) => either(version, over);
	reject(
		`a percent escape in the platform (version ${version})`,
		base({ platform: "wind%6Fws" }),
		"shape",
	);
	reject(
		`a percent escape of an ampersand (version ${version})`,
		base({ platform: "windows%26state=x" }),
		"shape",
	);
	reject(
		`a plus (version ${version})`,
		base({ platform: "windows+x" }),
		"shape",
	);
	reject(
		`a space (version ${version})`,
		base({ platform: "win dows" }),
		"shape",
	);
	reject(`a trailing space (version ${version})`, base() + " ", "shape");
	reject(`a NUL (version ${version})`, base() + "\u0000", "shape");
	reject(`a double ampersand (version ${version})`, base() + "&&", "shape");
	reject(`a trailing ampersand (version ${version})`, base() + "&", "shape");
	reject(
		`a leading ampersand (version ${version})`,
		"#&" + either(version, {}).slice(1),
		"shape",
	);
	reject(`a newline (version ${version})`, base() + "\n", "shape");
	reject(
		`a slash (version ${version})`,
		base({ platform: "windows/x" }),
		"shape",
	);
	reject(
		`an at sign (version ${version})`,
		base({ platform: "windows@x" }),
		"shape",
	);
	reject(
		`a question mark (version ${version})`,
		base({ platform: "windows?x" }),
		"shape",
	);
	reject(`a second # (version ${version})`, base() + "#x", "shape");
	reject(
		`a bracket (version ${version})`,
		base({ platform: "windows[" }),
		"shape",
	);
	reject(
		`a backslash (version ${version})`,
		base({ platform: "windows\\" }),
		"shape",
	);
	reject(
		`20,000 characters (version ${version})`,
		"#" + "a=b&".repeat(5000),
		"shape",
	);
	reject(
		`20,000 characters of one value (version ${version})`,
		base({ platform: "w".repeat(20000) }),
		"shape",
	);
}
reject(
	"a percent escape inside api",
	V2({ api: "api.beta%2Dtest.net" }),
	"shape",
);
reject("a plus inside api", V2({ api: "api.beta+test.net" }), "shape");
reject("a space inside api", V2({ api: "api.beta test.net" }), "shape");
reject("a NUL inside api", V2({ api: "api.beta-test.net\u0000" }), "shape");
reject(
	"a double ampersand before api",
	`#v=2&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}&&api=${API}`,
	"shape",
);
reject("a trailing ampersand after api", V2() + "&", "shape");
reject("an api that is only an ampersand", V2({ api: "&" }), "shape");
reject(
	"an api that holds an ampersand: the rest is a key of its own",
	V2({ api: "api&x=y.beta-test.net" }),
	"unknown-key",
);
reject("an equals sign inside api", V2({ api: "api=beta-test.net" }), "shape");

// version
for (const withApi of [false, true]) {
	const tail = withApi ? { api: API } : {};
	for (const v of [
		"3",
		"01",
		"02",
		"0",
		"10",
		"20",
		"A",
		"-1",
		"2.0",
		"1.0",
		"2:",
		"1.",
		".1",
	]) {
		reject(
			`v=${v}${withApi ? " with api" : ""}`,
			fragment({ v, ...tail }),
			"version",
		);
	}
	reject(
		`v= empty${withApi ? " with api" : ""}`,
		fragment({ v: "", ...tail }),
		"shape",
	);
}
reject("v=3 with only v and platform", "#v=3&platform=windows", "version");
reject("v=3 alone", "#v=3", "version");
reject("v=2 without api", fragment({ v: "2" }), "shape");
reject("v=1 with api", fragment({ api: API }), "unknown-key");
reject(
	"v=1 with api, whatever its value",
	fragment({ api: "localhost" }),
	"unknown-key",
);
reject(
	"v=1 with api that is valid and has a port",
	fragment({ api: "api.example.com:8443" }),
	"unknown-key",
);
reject(
	"api without v at all",
	`#platform=windows&state=${STATE}&pk=${PK}&ts=${TS}&api=${API}`,
	"unknown-key",
);

// api values (after the shape rules: what the alphabet lets through is judged by the grammar)
for (const [name, host] of INVALID_HOSTS) {
	if (host === "") {
		reject("api that is empty", V2({ api: "" }), "shape");
		continue;
	}
	if (host.includes("&")) continue; // it splits the value: its own case below
	const text = V2({ api: host });
	// something outside the fragment alphabet, or a long value the cap sees first
	const outside = /[^A-Za-z0-9_=&.:-]/.test(host) || host.includes("=");
	reject(
		`api that is ${name}`,
		text,
		outside || text.length > FRAGMENT_MAX_LENGTH ? "shape" : "api",
	);
}
reject(
	"api that is more than 200 characters but still inside the cap",
	V2({ api: `${label(63)}.${label(63)}.${label(63)}.abc:65535` }),
	"api",
);

// platform
for (const version of [1, 2]) {
	for (const platform of [
		"linux",
		"__proto__",
		"constructor",
		"toString",
		"hasOwnProperty",
		"Windows",
		"WINDOWS",
		"windows.",
		"windows:",
		"valueOf",
	]) {
		reject(
			`platform ${platform} (version ${version})`,
			either(version, { platform }),
			"platform",
		);
	}
	reject(
		`platform empty (version ${version})`,
		either(version, { platform: "" }),
		"shape",
	);
}

// state
for (const version of [1, 2]) {
	reject(
		`state of 42 characters (version ${version})`,
		either(version, { state: STATE.slice(1) }),
		"state",
	);
	reject(
		`state of 44 characters (version ${version})`,
		either(version, { state: STATE + "A" }),
		"state",
	);
	reject(
		`state containing a dot (version ${version})`,
		either(version, { state: STATE.slice(0, 42) + "." }),
		"state",
	);
	reject(
		`state containing a colon (version ${version})`,
		either(version, { state: STATE.slice(0, 42) + ":" }),
		"state",
	);
	reject(
		`state of 43 characters with a dot in the middle (version ${version})`,
		either(version, { state: STATE.slice(0, 20) + "." + STATE.slice(21) }),
		"state",
	);
	reject(
		`state containing a plus (version ${version})`,
		either(version, { state: STATE.slice(0, 42) + "+" }),
		"shape",
	);
}

// pk
for (const version of [1, 2]) {
	for (const bad of ["0", "O", "I", "l"]) {
		reject(
			`pk containing ${bad} (version ${version})`,
			either(version, { pk: bad + PK.slice(1) }),
			"pk",
		);
	}
	reject(
		`pk too short (version ${version})`,
		either(version, { pk: PK.slice(0, 42) }),
		"pk",
	);
	reject(
		`pk too long (version ${version})`,
		either(version, { pk: PK + "A" + "A" }),
		"pk",
	);
	reject(
		`pk of 44 zero bytes (version ${version})`,
		either(version, { pk: "1".repeat(44) }),
		"pk",
	);
	reject(
		`pk that is not 32 bytes (version ${version})`,
		either(version, { pk: "z".repeat(44) }),
		"pk",
	);
	reject(
		`pk containing a dot (version ${version})`,
		either(version, { pk: PK.slice(0, 20) + "." + PK.slice(21) }),
		"pk",
	);
	reject(
		`pk containing a colon (version ${version})`,
		either(version, { pk: PK.slice(0, 20) + ":" + PK.slice(21) }),
		"pk",
	);
}

// ts
for (const version of [1, 2]) {
	reject(
		`ts not numeric (version ${version})`,
		either(version, { ts: "abcdefghij" }),
		"ts",
	);
	reject(
		`ts of 9 digits (version ${version})`,
		either(version, { ts: String(TS).slice(1) }),
		"ts",
	);
	reject(
		`ts of 11 digits (version ${version})`,
		either(version, { ts: String(TS) + "0" }),
		"ts",
	);
	reject(
		`ts with a dot (version ${version})`,
		either(version, { ts: "17900000.0" }),
		"ts",
	);
	reject(
		`ts with a colon (version ${version})`,
		either(version, { ts: "17900:0000" }),
		"ts",
	);
	reject(
		`ts 241 s old (version ${version})`,
		either(version, { ts: String(TS - 241) }),
		"stale",
	);
	reject(
		`ts 121 s ahead (version ${version})`,
		either(version, { ts: String(TS + 121) }),
		"stale",
	);
}

for (const [name, text, reason] of REJECTED) {
	test(`section 9 rejects: ${name}`, () => {
		assert.equal(reasonOf(text), reason);
	});
}

test("the freshness edges hold for version 2 too: 240 s old and 120 s ahead pass, one second more does not", () => {
	assert.equal(parseAppRequest(V2({ ts: String(TS - 240) }), NOW).ok, true);
	assert.equal(parseAppRequest(V2({ ts: String(TS + 120) }), NOW).ok, true);
	assert.equal(reasonOf(V2({ ts: String(TS - 241) })), "stale");
	assert.equal(reasonOf(V2({ ts: String(TS + 121) })), "stale");
	assert.equal(isFresh(request({ api: API }), NOW), true);
	assert.equal(isFresh(request({ api: API }), NOW + 241_000), false);
});

test("section 9 rejects: any query string on the page address, for both versions", () => {
	for (const search of [
		"?auth_code=ATTACKER",
		"?a=1",
		"?x",
		"?",
		"#",
		" ",
		"x",
	]) {
		for (const text of [fragment(), V2(), V2({}, { hash: false })]) {
			assert.deepEqual(
				parseAppRequest(text, NOW, search),
				{ ok: false, reason: "query" },
				`${search} ${text.slice(0, 30)}`,
			);
		}
	}
	// and the query is judged before anything about api
	assert.deepEqual(parseAppRequest(V2({ api: "localhost" }), NOW, "?x=1"), {
		ok: false,
		reason: "query",
	});
});

test("a bad api is its own reason, and the reason is in the closed list", () => {
	assert.ok(REJECT_REASONS.includes("api"));
	assert.deepEqual(parseAppRequest(V2({ api: "Api.example.com" }), NOW), {
		ok: false,
		reason: "api",
	});
	// the closed list is the whole list: each reason of it is reached by some case above
	const reached = new Set(REJECTED.map(([, , reason]) => reason));
	for (const reason of REJECT_REASONS) {
		if (reason === "empty" || reason === "query") continue;
		assert.ok(reached.has(reason), `no case reaches ${reason}`);
	}
});

test("a version 2 request is refused whole when anything but api is wrong, and api is judged after the shapes of the other values", () => {
	// a bad platform, state or key hides a bad api: the first problem in the contract's order is the answer
	assert.equal(
		reasonOf(V2({ platform: "linux", api: "localhost" })),
		"platform",
	);
	assert.equal(reasonOf(V2({ state: "short", api: "localhost" })), "state");
	assert.equal(
		reasonOf(V2({ pk: "0" + PK.slice(1), api: "localhost" })),
		"pk",
	);
	assert.equal(reasonOf(V2({ api: "localhost" })), "api");
	// and a stale request with a bad api is a bad api: shapes before the clock
	assert.equal(
		reasonOf(V2({ api: "localhost", ts: String(TS - 3600) })),
		"api",
	);
	assert.equal(reasonOf(V2({ ts: String(TS - 3600) })), "stale");
});

test("the dot and the colon are in the alphabet for api alone: no other key can use them", () => {
	const placed = (key, value) => {
		const fields = {
			v: "2",
			platform: "windows",
			state: STATE,
			pk: PK,
			ts: String(TS),
			api: API,
			[key]: value,
		};
		return (
			"#" +
			Object.entries(fields)
				.map(([k, v]) => `${k}=${v}`)
				.join("&")
		);
	};
	for (const [key, reason] of [
		["v", "version"],
		["platform", "platform"],
		["state", "state"],
		["pk", "pk"],
		["ts", "ts"],
	]) {
		for (const mark of [".", ":"]) {
			const value = {
				v: "2",
				platform: "windows",
				state: STATE,
				pk: PK,
				ts: String(TS),
			}[key];
			assert.equal(
				reasonOf(placed(key, value.slice(0, -1) + mark)),
				reason,
				`${key} with ${mark}`,
			);
			assert.equal(
				reasonOf(placed(key, mark + value.slice(1))),
				reason,
				`${key} starting with ${mark}`,
			);
		}
	}
	// a key that holds either is an unknown key
	for (const key of ["x.y", "x:y", ".", ":", "api.", "api:"]) {
		assert.equal(reasonOf(`${V2()}&${key}=x`), "unknown-key", key);
		assert.equal(reasonOf(`${fragment()}&${key}=x`), "unknown-key", key);
	}
	// and a request that was valid before the alphabet grew is still valid, with the same result
	assert.deepEqual(parseAppRequest(fragment(), NOW), {
		ok: true,
		request: request(),
	});
});

test("the old alphabet is intact: everything outside it that was refused is still refused", () => {
	const outside = [
		"%",
		"+",
		" ",
		"\u0000",
		"\t",
		"\r",
		"\n",
		"/",
		"\\",
		"@",
		"#",
		"?",
		"[",
		"]",
		"!",
		"*",
		"(",
		")",
		",",
		";",
		"'",
		'"',
		"<",
		">",
		"|",
		"~",
		"`",
		"$",
		"^",
		"{",
		"}",
		"é",
		"‮",
		"​",
		"＆",
		"＝",
		"\u{1F600}",
	];
	for (const char of outside) {
		for (const text of [fragment(), V2()]) {
			assert.equal(reasonOf(text + char), "shape", JSON.stringify(char));
			assert.equal(
				reasonOf(text.replace("windows", `win${char}dows`)),
				"shape",
				JSON.stringify(char),
			);
		}
		assert.equal(
			reasonOf(V2({ api: `api${char}beta-test.net` })),
			"shape",
			JSON.stringify(char),
		);
	}
});

test("the longest valid version 2 request fits the 400-character cap, with room to spare", () => {
	const api = `${label(63)}.${label(63)}.${label(63)}.ab:65535`;
	assert.equal(api.length, API_MAX_LENGTH);
	assert.equal(isValidApiHost(api), true);
	const largestKey = bs58.encode(new Uint8Array(32).fill(255));
	assert.equal(largestKey.length, 44, "the longest public key");
	const text = V2({ api, pk: largestKey }, { hash: false });
	assert.equal(text.length, 337);
	assert.ok(text.length <= FRAGMENT_MAX_LENGTH);
	assert.equal(FRAGMENT_MAX_LENGTH, 400, "the cap has not moved");
	assert.deepEqual(parseAppRequest(text, NOW), {
		ok: true,
		request: request({ api, pk: largestKey }),
	});
	assert.deepEqual(parseAppRequest("#" + text, NOW), {
		ok: true,
		request: request({ api, pk: largestKey }),
	});
	// the cap itself still refuses at 401, and api one character over 200 is refused by the grammar, not the cap
	const padded =
		text + "&x=" + "a".repeat(FRAGMENT_MAX_LENGTH - text.length - 3 + 1);
	assert.equal(padded.length, 401);
	assert.equal(reasonOf(padded), "shape");
	assert.equal(reasonOf(V2({ api: api + "x", pk: largestKey })), "api");
});

test("fuzz: a version 2 request is accepted only in the one shape the contract describes, and nothing throws", () => {
	const rand = mulberry32(20261011);
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-=&%+ #?/.:\u0000‮о";
	const pick = () => alphabet[Math.floor(rand() * alphabet.length)];
	const base = V2({}, { hash: false });
	let accepted = 0;
	for (let i = 0; i < 8000; i++) {
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
		// whatever got through is a request of one of the two versions, with every value valid
		assert.equal(bs58.decode(r.pk).length, 32);
		assert.match(r.state, /^[A-Za-z0-9_-]{43}$/);
		assert.ok(Number.isInteger(r.ts) && isFresh(r, NOW));
		assert.match(text, /^[A-Za-z0-9_=&.:-]+$/);
		if (r.api === undefined) {
			assert.equal(text.split("&").length, 5);
			assert.match(text, /(^|&)v=1(&|$)/);
		} else {
			assert.equal(text.split("&").length, 6);
			assert.match(text, /(^|&)v=2(&|$)/);
			assert.equal(referenceIsValidApiHost(r.api), true, r.api);
			assert.ok(text.includes(`api=${r.api}`));
		}
	}
	assert.ok(
		accepted > 0,
		"some mutations (a swapped character that stays valid) are still valid",
	);
});

// ----- the helpers -----

test("the request is written the way the app writes it: keys in the contract's order, api last and only for version 2", () => {
	assert.equal(appRequestFragment(request()), fragment({}, { hash: false }));
	assert.equal(
		appRequestFragment(request({ api: API })),
		V2({}, { hash: false }),
	);
	assert.equal(
		appRequestFragment(request({ api: API })),
		`v=2&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}&api=${API}`,
	);
	assert.equal(
		appRequestFragment(request()),
		`v=1&platform=windows&state=${STATE}&pk=${PK}&ts=${TS}`,
	);
	// what the parser returns, written out and read again, is the same request
	for (const text of [
		fragment(),
		V2(),
		V2({ api: "api.example.com:8443" }),
	]) {
		const { request: parsed } = parseAppRequest(text, NOW);
		assert.deepEqual(
			parseAppRequest("#" + appRequestFragment(parsed), NOW),
			{
				ok: true,
				request: parsed,
			},
		);
	}
});

test("the base for an api host is https and the host, and nothing is made of a host that is not one", () => {
	assert.equal(
		apiBaseOfHost("api.beta-test.net"),
		"https://api.beta-test.net",
	);
	assert.equal(
		apiBaseOfHost("mock.localhost:5198"),
		"https://mock.localhost:5198",
	);
	for (const bad of [
		"",
		"localhost",
		"API.beta-test.net",
		"https://api.beta-test.net",
		"api.beta-test.net/x",
		"api.beta-test.net:443",
		"127.0.0.1",
		undefined,
		null,
		5,
	]) {
		assert.equal(apiBaseOfHost(bad), null, String(bad));
	}
});

const PAGE = "https://manager.example/login-app";

test("a server matches a request when it is https and resolves to the very host the request names", () => {
	const cases = [
		[
			"the host",
			"https://api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"the host and the port",
			"https://mock.localhost:5198",
			"mock.localhost:5198",
			PAGE,
			true,
		],
		[
			"upper case in the base is the same host",
			"https://API.Beta-Test.NET",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"the default port spelled out is the same host",
			"https://api.beta-test.net:443",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"a trailing slash",
			"https://api.beta-test.net/",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"a path does not change the host",
			"https://api.beta-test.net/v1",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"userinfo does not change the host",
			"https://user:pw@api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"a relative base resolves against the page",
			"/api",
			"manager.example",
			PAGE,
			true,
		],
		[
			"a relative base on a page with a port",
			"/api",
			"manager.example:8443",
			"https://manager.example:8443/login-app",
			true,
		],
		["a path-relative base", "api", "manager.example", PAGE, true],
		[
			"a protocol-relative base takes the page's scheme",
			"//api.beta-test.net/x",
			"api.beta-test.net",
			PAGE,
			true,
		],
		[
			"an http base never matches",
			"http://api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"an http base with the right port never matches",
			"http://mock.localhost:5198",
			"mock.localhost:5198",
			PAGE,
			false,
		],
		[
			"an http base for a host with no port never matches",
			"http://api.beta-test.net:80",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"a relative base on an http page never matches",
			"/api",
			"manager.example",
			"http://manager.example/login-app",
			false,
		],
		[
			"a protocol-relative base on an http page never matches",
			"//api.beta-test.net",
			"api.beta-test.net",
			"http://manager.example/",
			false,
		],
		[
			"a relative base resolves to the page's host, not the request's",
			"/api",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"a different port",
			"https://api.beta-test.net:8443",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"a request port the base lacks",
			"https://api.beta-test.net",
			"api.beta-test.net:8443",
			PAGE,
			false,
		],
		[
			"the right port on another host",
			"https://other.example:5198",
			"mock.localhost:5198",
			PAGE,
			false,
		],
		[
			"a different host",
			"https://evil.example",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"a longer host with the right ending",
			"https://xapi.beta-test.net",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host as the front of a longer one",
			"https://api.beta-test.net.evil.example",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host as userinfo of another",
			"https://api.beta-test.net@evil.example",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host after a backslash",
			"https://evil.example\\@api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host in a path",
			"https://evil.example/api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host in a query",
			"https://evil.example/?api.beta-test.net",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"the host with a trailing dot",
			"https://api.beta-test.net.",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"a base that is not a url",
			"http://[",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"an empty base is the page itself",
			"",
			"api.beta-test.net",
			PAGE,
			false,
		],
		[
			"an empty base, when the page is the host",
			"",
			"manager.example",
			PAGE,
			true,
		],
		[
			"a javascript url",
			"javascript:alert(1)",
			"api.beta-test.net",
			PAGE,
			false,
		],
		["a data url", "data:text/plain,x", "api.beta-test.net", PAGE, false],
		[
			"an ip literal base, which no request can name",
			"https://127.0.0.1:5198",
			"127.0.0.1:5198",
			PAGE,
			false,
		],
		[
			"a host the grammar refuses never matches",
			"https://localhost",
			"localhost",
			PAGE,
			false,
		],
		[
			"an upper-case request host never matches",
			"https://api.beta-test.net",
			"API.beta-test.net",
			PAGE,
			false,
		],
		[
			"an empty request host never matches",
			"https://api.beta-test.net",
			"",
			PAGE,
			false,
		],
	];
	for (const [name, base, api, page, expected] of cases) {
		assert.equal(serverMatchesRequest(base, api, page), expected, name);
	}
	// an absolute base needs no page, and a relative one cannot be placed without it
	assert.equal(
		serverMatchesRequest(
			"https://api.beta-test.net",
			"api.beta-test.net",
			"",
		),
		true,
	);
	assert.equal(
		serverMatchesRequest(
			"https://api.beta-test.net",
			"api.beta-test.net",
			"garbage",
		),
		true,
	);
	assert.equal(serverMatchesRequest("/api", "manager.example", ""), false);
	assert.equal(
		serverMatchesRequest("/api", "manager.example", "garbage"),
		false,
	);
	// the page's origin is as good as its address
	assert.equal(
		serverMatchesRequest(
			"/api",
			"manager.example",
			"https://manager.example",
		),
		true,
	);
	// nothing that is not text matches, and nothing throws
	for (const bad of [undefined, null, 5, {}, []]) {
		assert.equal(
			serverMatchesRequest(bad, "api.beta-test.net", PAGE),
			false,
		);
		assert.equal(
			serverMatchesRequest("https://api.beta-test.net", bad, PAGE),
			false,
		);
	}
});

test("a version 1 request is for the default server as text, and a version 2 request is for the server it names", () => {
	const DEFAULT = "https://api.default.example";
	const v1 = request();
	const v2 = request({ api: API });
	// version 1: the stored base is the default, or it is not; no resolving, no https needed
	assert.equal(isServerForRequest(v1, DEFAULT, DEFAULT, PAGE), true);
	assert.equal(
		isServerForRequest(v1, "https://api.beta-test.net", DEFAULT, PAGE),
		false,
	);
	assert.equal(
		isServerForRequest(v1, DEFAULT + "/", DEFAULT, PAGE),
		false,
		"compared as text, as ever",
	);
	assert.equal(
		isServerForRequest(
			v1,
			"http://127.0.0.1:5199",
			"http://127.0.0.1:5199",
			PAGE,
		),
		true,
		"a default that is http is still the default",
	);
	assert.equal(isServerForRequest(v1, "/api", "/api", PAGE), true);
	// ... and nothing else, whatever host the browser is set to: no host is special to version 1,
	// the one a version 2 request would name included
	for (const host of [
		"x.y",
		"a.b",
		"api.beta-test.net",
		"mock.localhost:5198",
		"example.com",
		"manager.example",
	]) {
		assert.equal(
			isServerForRequest(v1, `https://${host}`, DEFAULT, PAGE),
			false,
			host,
		);
		assert.equal(isServerForRequest(v1, host, DEFAULT, PAGE), false, host);
	}
	// version 2: the base is resolved and compared with api, whatever the default is
	assert.equal(
		isServerForRequest(v2, "https://api.beta-test.net", DEFAULT, PAGE),
		true,
	);
	assert.equal(
		isServerForRequest(v2, DEFAULT, DEFAULT, PAGE),
		false,
		"the default is not the server it names",
	);
	assert.equal(
		isServerForRequest(
			v2,
			"https://api.beta-test.net",
			"https://api.beta-test.net",
			PAGE,
		),
		true,
	);
	assert.equal(
		isServerForRequest(
			v2,
			"http://api.beta-test.net",
			"http://api.beta-test.net",
			PAGE,
		),
		false,
		"an http default never matches a version 2 request",
	);
	assert.equal(
		isServerForRequest(
			request({ api: "manager.example" }),
			"/api",
			"/api",
			PAGE,
		),
		true,
		"a relative default resolves against the page",
	);
	// a request whose api is not text fits no server
	for (const api of [5, null, {}, [], ""]) {
		assert.equal(
			isServerForRequest({ ...request(), api }, DEFAULT, DEFAULT, PAGE),
			false,
			String(api),
		);
	}
});

test("Switch points the browser at https://host, or back to the default when the default already is that host", () => {
	const DEFAULT = "https://api.default.example";
	assert.deepEqual(serverChoiceFor("api.beta-test.net", DEFAULT, PAGE), {
		kind: "custom",
		base: "https://api.beta-test.net",
	});
	assert.deepEqual(serverChoiceFor("mock.localhost:5198", DEFAULT, PAGE), {
		kind: "custom",
		base: "https://mock.localhost:5198",
	});
	assert.deepEqual(serverChoiceFor("api.default.example", DEFAULT, PAGE), {
		kind: "default",
	});
	assert.deepEqual(
		serverChoiceFor("api.default.example", DEFAULT.toUpperCase(), PAGE),
		{ kind: "default" },
		"the same host in another case",
	);
	// the default has the host but not the scheme: the override is what makes it match
	assert.deepEqual(
		serverChoiceFor("api.beta-test.net", "http://api.beta-test.net", PAGE),
		{
			kind: "custom",
			base: "https://api.beta-test.net",
		},
	);
	// the default has the host but another port
	assert.deepEqual(
		serverChoiceFor("api.default.example:8443", DEFAULT, PAGE),
		{
			kind: "custom",
			base: "https://api.default.example:8443",
		},
	);
	// a relative default resolves against the page
	assert.deepEqual(serverChoiceFor("manager.example", "/api", PAGE), {
		kind: "default",
	});
	assert.deepEqual(
		serverChoiceFor("manager.example", "/api", "http://manager.example/"),
		{
			kind: "custom",
			base: "https://manager.example",
		},
	);
	// nothing is stored for a value that is not a valid host
	for (const bad of [
		"",
		"localhost",
		"API.beta-test.net",
		"https://api.beta-test.net",
		"api.beta-test.net/x",
		"api.beta-test.net:443",
		"127.0.0.1",
		undefined,
		null,
		5,
	]) {
		assert.equal(serverChoiceFor(bad, DEFAULT, PAGE), null, String(bad));
	}
});
