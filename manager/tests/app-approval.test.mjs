// /login-app, the approval controller (src/services/appApproval.ts): what must
// be true between the click on Approve and the page leaving for the app.
// Driven with injected ports, no React and no browser.
import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import bs58 from "bs58";

import {
	BadPublicKeyError,
	MAX_CODE_LENGTH,
	RETURN_MAX_LENGTH,
	buildDenyReturn,
} from "../src/services/appAuth.ts";
import {
	createApprovalController,
	resolveIdentity,
} from "../src/services/appApproval.ts";
import { sealCode } from "../src/services/appSeal.ts";
import { CODE, NOW, STATE, appKeys, request } from "./helpers/app-request.mjs";

const NETWORKS = new Map([
	["token-alpha", "network-alpha"],
	["token-alpha-refreshed", "NETWORK-ALPHA"],
	["token-beta", "network-beta"],
]);

function ports(over = {}) {
	const calls = [];
	let clock = NOW;
	const p = {
		calls,
		advance: (ms) => {
			clock += ms;
		},
		now: () => clock,
		readToken: () => "token-alpha",
		networkIdOf: (token) => NETWORKS.get(token) ?? null,
		usesDefaultServer: () => true,
		createAuthCode: async (token, minutes, uses) => {
			calls.push({ token, minutes, uses });
			return { auth_code: CODE };
		},
		loadSeal: async () => sealCode,
		...over,
	};
	return p;
}

const controllerFor = (p) => createApprovalController(p);
const approve = (p, shown = "network-alpha") =>
	controllerFor(p).approve(request(), shown);

function openAnswer(url) {
	const q = Object.fromEntries(new URL(url).searchParams);
	const shared = nacl.box.before(bs58.decode(q.epk), appKeys.secretKey);
	const opened = nacl.box.open.after(
		bs58.decode(q.d),
		bs58.decode(q.n),
		shared,
	);
	return {
		query: q,
		plain: opened && JSON.parse(new TextDecoder().decode(opened)),
	};
}

test("approve mints one code of 2 minutes and 1 use and answers with the sealed address", async () => {
	const p = ports();
	const outcome = await approve(p);
	assert.equal(outcome.kind, "approved");
	assert.deepEqual(p.calls, [{ token: "token-alpha", minutes: 2, uses: 1 }]);
	assert.match(
		outcome.url,
		/^urnetwork:\/\/auth\?state=[A-Za-z0-9_-]{43}&epk=[1-9A-HJ-NP-Za-km-z]+&n=[1-9A-HJ-NP-Za-km-z]+&d=[1-9A-HJ-NP-Za-km-z]+$/,
	);
	assert.ok(outcome.url.startsWith(`urnetwork://auth?state=${STATE}&epk=`));
	const { query, plain } = openAnswer(outcome.url);
	assert.deepEqual(Object.keys(query), ["state", "epk", "n", "d"]);
	assert.equal(query.state, STATE);
	assert.deepEqual(
		plain,
		{ c: CODE, s: STATE },
		"the code and the state travel inside the box only",
	);
	assert.equal(
		outcome.url.includes(CODE),
		false,
		"no clear code in the address",
	);
	assert.equal(outcome.url.includes(CODE.slice(0, 16)), false);
	assert.deepEqual(
		Object.keys(outcome),
		["kind", "url"],
		"the outcome carries the address and nothing else",
	);
});

test("the code is sealed to the request's key by the sealing function the ports gave", async () => {
	const sealed = [];
	const p = ports({
		loadSeal: async () => (code, req) => {
			sealed.push({ code, req });
			return sealCode(code, req);
		},
	});
	const outcome = await approve(p);
	assert.equal(outcome.kind, "approved");
	// one dry run before the mint (not a secret, as long as the budget allows), then the real code
	assert.equal(sealed.length, 2);
	assert.notEqual(sealed[0].code, CODE);
	assert.equal(sealed[0].code.length, MAX_CODE_LENGTH);
	assert.deepEqual(sealed[0].req, request());
	assert.equal(sealed[1].code, CODE);
	assert.deepEqual(sealed[1].req, request());
});

test("the dry run goes all the way to the address, so a code is never minted for one that cannot be built", async () => {
	// a sealing function whose answers are too long for the budget, whatever it seals
	const tooLong = ports({
		loadSeal: async () => (code, req) => ({
			...sealCode(code, req),
			d: "A".repeat(RETURN_MAX_LENGTH),
		}),
	});
	assert.deepEqual(await approve(tooLong), { kind: "failed" });
	assert.equal(tooLong.calls.length, 0, "nothing was minted");

	// one that fails only for a long code: the dry run is that long
	const refusesLong = ports({
		loadSeal: async () => (code, req) => {
			if (code.length > 100) throw new Error("no room");
			return sealCode(code, req);
		},
	});
	const controller = controllerFor(refusesLong);
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "failed",
	});
	assert.equal(refusesLong.calls.length, 0);
	// and it is a failure the person may try again: nothing was handed out
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "failed",
	});
});

test("the longest code the budget allows is answered, every time", async () => {
	// the code the dry run uses, and the server's own length, with random keys and nonces
	for (const length of [684, MAX_CODE_LENGTH]) {
		for (let i = 0; i < 40; i++) {
			const p = ports({
				createAuthCode: async (token, minutes, uses) => {
					p.calls.push({ token, minutes, uses });
					return { auth_code: "Q".repeat(length) };
				},
			});
			const outcome = await approve(p);
			assert.equal(
				outcome.kind,
				"approved",
				`${length} characters, try ${i}`,
			);
			assert.ok(outcome.url.length <= RETURN_MAX_LENGTH);
		}
	}
});

test("a code the budget does not allow is minted, then reported as broken, and never minted again", async () => {
	// the dry run passes (it is as long as the budget allows); the server's code is longer
	const p = ports({
		createAuthCode: async (token, minutes, uses) => {
			p.calls.push({ token, minutes, uses });
			return { auth_code: "Q".repeat(MAX_CODE_LENGTH + 200) };
		},
	});
	const controller = controllerFor(p);
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.equal(p.calls.length, 1, "the code was minted");
	for (let i = 0; i < 3; i++) {
		assert.deepEqual(await controller.approve(request(), "network-alpha"), {
			kind: "broken",
		});
	}
	assert.equal(p.calls.length, 1, "and not minted again");
	assert.deepEqual(controller.deny(request()).kind, "denied");
});

test("the sealing code is loaded before anything is minted", async () => {
	const order = [];
	const p = ports({
		loadSeal: async () => {
			order.push("load");
			return sealCode;
		},
		createAuthCode: async () => {
			order.push("mint");
			return { auth_code: CODE };
		},
	});
	assert.equal((await approve(p)).kind, "approved");
	assert.deepEqual(order, ["load", "mint"]);
});

/** a promise settled from the outside */
function deferred() {
	let resolve, reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

test("a sealing code that cannot be loaded mints nothing and is reported as its own outcome, not as a hiccup to try again", async () => {
	const failing = ports({
		loadSeal: async () => {
			throw new Error("chunk failed to load");
		},
	});
	assert.deepEqual(
		await approve(failing),
		{ kind: "seal-unavailable" },
		"not `failed`: the card must not invite a retry that cannot work",
	);
	assert.equal(failing.calls.length, 0, "nothing was minted");

	// a load that throws before it returns a promise is the same
	const sync = ports({
		loadSeal: () => {
			throw new Error("no chunk");
		},
	});
	assert.deepEqual(await approve(sync), { kind: "seal-unavailable" });
	assert.equal(sync.calls.length, 0);
});

test("a failed load is not latched: nothing was minted, so a later click asks again, and Cancel still answers", async () => {
	let loads = 0;
	const p = ports({
		loadSeal: async () => {
			if (++loads === 1) throw new Error("chunk failed to load");
			return sealCode;
		},
	});
	const controller = controllerFor(p);
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "seal-unavailable",
	});
	assert.equal(p.calls.length, 0);
	// the browser may have finished the download in the meantime: the next click finds it
	assert.equal(
		(await controller.approve(request(), "network-alpha")).kind,
		"approved",
	);
	assert.equal(loads, 2, "the second click asked again");
	assert.equal(p.calls.length, 1);

	// and a person who gives up after the failure can say so
	const other = controllerFor(
		ports({
			loadSeal: async () => {
				throw new Error("chunk failed to load");
			},
		}),
	);
	assert.equal(
		(await other.approve(request(), "network-alpha")).kind,
		"seal-unavailable",
	);
	assert.deepEqual(other.deny(request()), {
		kind: "denied",
		url: buildDenyReturn(request()),
	});
});

test("a key that cannot be sealed to is refused as such: nothing is minted, and a good request is still served", async () => {
	const smallOrder = request({
		pk: bs58.encode(
			Uint8Array.from({ length: 32 }, (_, i) => (i === 0 ? 1 : 0)),
		),
	});
	assert.equal(smallOrder.pk.length, 43, "u = 1 is written in 43 characters");
	const p = ports();
	const controller = controllerFor(p);
	assert.deepEqual(await controller.approve(smallOrder, "network-alpha"), {
		kind: "bad-key",
	});
	assert.equal(
		p.calls.length,
		0,
		"no code was minted for an answer that cannot be built",
	);
	// not latched: the controller holds nothing about the key
	assert.equal(
		(await controller.approve(request(), "network-alpha")).kind,
		"approved",
	);
	assert.equal(p.calls.length, 1);

	// every way a key can be unusable says so: not 32 bytes, the all-zero point, p - 1
	const keys = {
		"31 bytes": Uint8Array.from({ length: 31 }, (_, i) => i + 1),
		"33 bytes": Uint8Array.from({ length: 33 }, (_, i) => i + 1),
		zero: new Uint8Array(32),
		"p - 1": Uint8Array.from({ length: 32 }, (_, i) =>
			i === 0 ? 0xec : i === 31 ? 0x7f : 0xff,
		),
	};
	for (const [name, bytes] of Object.entries(keys)) {
		const q = ports();
		assert.deepEqual(
			await controllerFor(q).approve(
				request({ pk: bs58.encode(bytes) }),
				"network-alpha",
			),
			{ kind: "bad-key" },
			name,
		);
		assert.equal(q.calls.length, 0, name);
	}
});

test("only a key the page cannot seal to is `bad-key`: any other failure of the dry run is a hiccup", async () => {
	const generic = ports({
		loadSeal: async () => () => {
			throw new Error("something else went wrong");
		},
	});
	assert.deepEqual(await approve(generic), { kind: "failed" });
	const tooLong = ports({
		loadSeal: async () => (code, req) => ({
			...sealCode(code, req),
			d: "A".repeat(RETURN_MAX_LENGTH),
		}),
	});
	assert.deepEqual(await approve(tooLong), { kind: "failed" });
	assert.equal(generic.calls.length + tooLong.calls.length, 0);
	// the sealing code throws the page's own error type for a key it cannot use, both ways
	for (const bytes of [
		Uint8Array.from({ length: 31 }, (_, i) => i + 1),
		new Uint8Array(32),
	]) {
		assert.throws(
			() => sealCode(CODE, request({ pk: bs58.encode(bytes) })),
			(error) => error instanceof BadPublicKeyError,
		);
	}
});

test("Cancel answers while the sealing code is still loading, and no code is minted when it arrives", async () => {
	const load = deferred();
	const p = ports({ loadSeal: () => load.promise });
	const controller = controllerFor(p);
	const progress = [];
	const click = controller.approve(request(), "network-alpha", () =>
		progress.push("minting"),
	);
	// nothing but the download is under way: the person may still say no
	assert.deepEqual(controller.deny(request()), {
		kind: "denied",
		url: buildDenyReturn(request()),
	});
	load.resolve(sealCode);
	assert.deepEqual(await click, { kind: "already-denied" });
	assert.equal(p.calls.length, 0, "nothing was minted after the Cancel");
	assert.deepEqual(progress, [], "and the mint was never reached");
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "already-denied",
	});
	assert.equal(p.calls.length, 0);

	// the download that fails after the Cancel changes nothing about the answer
	const failing = deferred();
	const q = ports({ loadSeal: () => failing.promise });
	const second = controllerFor(q);
	const other = second.approve(request(), "network-alpha");
	assert.equal(second.deny(request()).kind, "denied");
	failing.reject(new Error("chunk failed to load"));
	assert.deepEqual(await other, { kind: "already-denied" });
	assert.equal(q.calls.length, 0);
});

test("Cancel cannot interrupt a mint: from the moment the code is asked for it is busy, and the page is told when that is", async () => {
	const mint = deferred();
	const reached = deferred();
	const p = ports({
		createAuthCode: (token, minutes, uses) => {
			p.calls.push({ token, minutes, uses });
			return mint.promise;
		},
	});
	const controller = controllerFor(p);
	const progress = [];
	const click = controller.approve(request(), "network-alpha", () => {
		progress.push({ minted: p.calls.length });
		reached.resolve();
	});
	// (a controller that never tells the page fails the assertion below, not by hanging)
	await Promise.race([
		reached.promise,
		new Promise((resolve) => setTimeout(resolve, 500)),
	]);
	assert.deepEqual(
		progress,
		[{ minted: 0 }],
		"told once, before the code is asked for",
	);
	assert.deepEqual(controller.deny(request()), { kind: "busy" });
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "busy",
	});
	mint.resolve({ auth_code: CODE });
	assert.equal((await click).kind, "approved");
	assert.deepEqual(progress, [{ minted: 0 }], "and not again");
	assert.deepEqual(controller.deny(request()), { kind: "already-approved" });

	// a mint that fails ends the click, whichever way it fails, and Cancel answers again
	for (const [name, createAuthCode] of [
		[
			"an error answer",
			async () => ({ error: { message: "x", status: 500 } }),
		],
		[
			"a thrown error",
			async () => {
				throw new Error("network down");
			},
		],
	]) {
		const failing = controllerFor(ports({ createAuthCode }));
		assert.equal(
			(await failing.approve(request(), "network-alpha")).kind,
			"failed",
			name,
		);
		assert.equal(failing.deny(request()).kind, "denied", name);
	}
});

test("the page is told about the mint only when there is one", async () => {
	for (const [name, over, outcome] of [
		[
			"load fails",
			{
				loadSeal: async () => {
					throw new Error("x");
				},
			},
			"seal-unavailable",
		],
		[
			"session changed",
			{ readToken: () => "token-beta" },
			"identity-changed",
		],
		["signed out", { readToken: () => null }, "signed-out"],
		["other server", { usesDefaultServer: () => false }, "custom-server"],
	]) {
		const progress = [];
		const p = ports(over);
		const result = await controllerFor(p).approve(
			request(),
			"network-alpha",
			() => progress.push("minting"),
		);
		assert.equal(result.kind, outcome, name);
		assert.deepEqual(progress, [], name);
	}
	// a request that went stale, and a key that cannot be used
	const stale = ports();
	stale.advance(241_000);
	const progress = [];
	await controllerFor(stale).approve(request(), "network-alpha", () =>
		progress.push("minting"),
	);
	assert.deepEqual(progress, []);
});

test("an identity change between the card and the click mints nothing", async () => {
	const p = ports({ readToken: () => "token-beta" });
	assert.deepEqual(await approve(p), { kind: "identity-changed" });
	assert.equal(p.calls.length, 0);
});

test("the session is read at the click, and the same network under a refreshed session is fine", async () => {
	let reads = 0;
	const p = ports({
		readToken: () => {
			reads++;
			return "token-alpha-refreshed";
		},
	});
	const outcome = await approve(p, "network-alpha");
	assert.equal(outcome.kind, "approved");
	assert.equal(reads, 1);
	assert.deepEqual(
		p.calls,
		[{ token: "token-alpha-refreshed", minutes: 2, uses: 1 }],
		"the code is minted with the session read at the click",
	);
});

test("a session that names no network, or a card without one, mints nothing", async () => {
	const unknown = ports({ readToken: () => "token-unknown" });
	assert.deepEqual(await approve(unknown), { kind: "identity-changed" });
	assert.equal(unknown.calls.length, 0);
	for (const shown of ["", undefined, null]) {
		const p = ports();
		assert.deepEqual(await controllerFor(p).approve(request(), shown), {
			kind: "identity-changed",
		});
		assert.equal(p.calls.length, 0);
	}
});

test("a signed-out session mints nothing, and a 401 from the api reads as signed out", async () => {
	const none = ports({ readToken: () => null });
	assert.deepEqual(await approve(none), { kind: "signed-out" });
	assert.equal(none.calls.length, 0);
	const empty = ports({ readToken: () => "" });
	assert.deepEqual(await approve(empty), { kind: "signed-out" });

	const expired = ports({
		createAuthCode: async () => ({
			error: { message: "HTTP error! status: 401", status: 401 },
		}),
	});
	assert.deepEqual(await approve(expired), { kind: "signed-out" });
	const forbidden = ports({
		createAuthCode: async () => ({
			error: { message: "HTTP error! status: 403", status: 403 },
		}),
	});
	assert.deepEqual(
		await approve(forbidden),
		{ kind: "failed" },
		"only 401 means the session is gone",
	);
});

test("two clicks mint once: busy while the first is in flight, then already approved", async () => {
	let release;
	const p = ports({
		createAuthCode: (token, minutes, uses) =>
			new Promise((resolve) => {
				p.calls.push({ token, minutes, uses });
				release = () => resolve({ auth_code: CODE });
			}),
	});
	const controller = controllerFor(p);
	const first = controller.approve(request(), "network-alpha");
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "busy",
	});
	// wait for the first click to reach the mint
	for (let i = 0; i < 20 && !release; i++)
		await new Promise((r) => setTimeout(r, 0));
	assert.deepEqual(
		controller.deny(request()),
		{ kind: "busy" },
		"Cancel cannot race a mint",
	);
	release();
	assert.equal((await first).kind, "approved");
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "already-approved",
	});
	assert.equal(p.calls.length, 1);
});

test("many parallel clicks still mint exactly once", async () => {
	const p = ports();
	const controller = controllerFor(p);
	const outcomes = await Promise.all(
		Array.from({ length: 12 }, () =>
			controller.approve(request(), "network-alpha"),
		),
	);
	assert.equal(outcomes.filter((o) => o.kind === "approved").length, 1);
	assert.equal(outcomes.filter((o) => o.kind === "busy").length, 11);
	assert.equal(p.calls.length, 1);
});

test("a request that went stale before the click mints nothing", async () => {
	const p = ports();
	p.advance(241_000);
	assert.deepEqual(await approve(p), { kind: "stale" });
	assert.equal(p.calls.length, 0);

	const edge = ports();
	edge.advance(240_000);
	assert.equal(
		(await approve(edge)).kind,
		"approved",
		"still fresh at 240 s",
	);
});

test("a pointed-away api server mints nothing and never receives the session", async () => {
	const p = ports({ usesDefaultServer: () => false });
	assert.deepEqual(await approve(p), { kind: "custom-server" });
	assert.equal(p.calls.length, 0);
});

test("the server's code limit and other failures are reported, and a failure may be retried", async () => {
	const limit = ports({
		createAuthCode: async () => ({
			error: {
				auth_code_limit_exceeded: true,
				message: "Auth code limit exceeded.",
			},
		}),
	});
	assert.deepEqual(await approve(limit), { kind: "too-many" });

	const cases = {
		"rejected promise": async () => {
			throw new Error("network down");
		},
		"error object": async () => ({ error: { message: "Something else" } }),
		"error beside a code": async () => ({
			auth_code: CODE,
			error: { message: "odd" },
		}),
		"empty object": async () => ({}),
		"empty code": async () => ({ auth_code: "" }),
		"numeric code": async () => ({ auth_code: 12345 }),
		null: async () => null,
		undefined: async () => undefined,
	};
	for (const [name, createAuthCode] of Object.entries(cases)) {
		const p = ports({ createAuthCode });
		assert.deepEqual(await approve(p), { kind: "failed" }, name);
	}

	let attempts = 0;
	const flaky = ports({
		createAuthCode: async () =>
			++attempts === 1
				? { error: { message: "try again" } }
				: { auth_code: CODE },
	});
	const controller = controllerFor(flaky);
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "failed",
	});
	assert.equal(
		(await controller.approve(request(), "network-alpha")).kind,
		"approved",
		"nothing was minted, so the person may retry",
	);
});

test("a port that throws is a failure, not a crash", async () => {
	for (const over of [
		{
			now: () => {
				throw new Error("clock");
			},
		},
		{
			readToken: () => {
				throw new Error("storage");
			},
		},
		{
			networkIdOf: () => {
				throw new Error("jwt");
			},
		},
		{
			usesDefaultServer: () => {
				throw new Error("storage");
			},
		},
	]) {
		const p = ports(over);
		assert.deepEqual(
			await approve(p),
			{ kind: "failed" },
			Object.keys(over)[0],
		);
		assert.equal(p.calls.length, 0);
	}
});

test("once a code is minted it is never minted again for this page load, even if the answer could not be built", async () => {
	let sealing = 0;
	const p = ports({
		loadSeal: async () => (code, req) => {
			if (++sealing === 2) throw new Error("boom after the mint");
			return sealCode(code, req);
		},
	});
	const controller = controllerFor(p);
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.equal(p.calls.length, 1, "the code was minted");
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.equal(p.calls.length, 1, "and not minted again");

	// an address that turns out too long only for the real code is the same
	const huge = ports({
		loadSeal: async () => (code, req) => {
			const sealed = sealCode(code, req);
			return code === CODE ? { ...sealed, d: "A".repeat(5000) } : sealed;
		},
	});
	const second = controllerFor(huge);
	assert.deepEqual(await second.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.deepEqual(await second.approve(request(), "network-alpha"), {
		kind: "broken",
	});
	assert.equal(
		huge.calls.length,
		1,
		"an address that is too long is not retried with a second code",
	);
});

test("Cancel returns exactly the access_denied address, with the state and nothing else", async () => {
	const p = ports();
	const controller = controllerFor(p);
	const outcome = controller.deny(request());
	assert.deepEqual(outcome, {
		kind: "denied",
		url: `urnetwork://auth?state=${STATE}&error=access_denied`,
	});
	assert.equal(outcome.url, buildDenyReturn(request()));
	assert.equal(p.calls.length, 0, "nothing is minted for a Cancel");
	assert.deepEqual(controller.deny(request()), { kind: "already-denied" });
	assert.deepEqual(await controller.approve(request(), "network-alpha"), {
		kind: "already-denied",
	});
	assert.equal(p.calls.length, 0, "an approval after a Cancel mints nothing");
});

test("Cancel after an approval hands out nothing", async () => {
	const p = ports();
	const controller = controllerFor(p);
	assert.equal(
		(await controller.approve(request(), "network-alpha")).kind,
		"approved",
	);
	assert.deepEqual(controller.deny(request()), { kind: "already-approved" });
});

test("a forged request cannot make a Cancel address either", () => {
	const controller = controllerFor(ports());
	assert.deepEqual(controller.deny(request({ platform: "__proto__" })), {
		kind: "failed",
	});
	assert.deepEqual(controller.deny(request({ state: "a&b" })), {
		kind: "failed",
	});
	assert.equal(
		controller.deny(request()).kind,
		"denied",
		"a failed attempt does not close the page",
	);
});

test("the code, the state and the keys never reach the console while approving", async () => {
	const seen = [];
	const original = {};
	for (const name of [
		"log",
		"warn",
		"error",
		"info",
		"debug",
		"trace",
		"dir",
	]) {
		original[name] = console[name];
		console[name] = (...args) => seen.push(args.map(String).join(" "));
	}
	try {
		await approve(ports());
		await approve(ports({ readToken: () => "token-beta" }));
		await approve(
			ports({
				createAuthCode: async () => {
					throw new Error("down");
				},
			}),
		);
		await approve(
			ports({
				createAuthCode: async () => ({
					error: { auth_code_limit_exceeded: true },
				}),
			}),
		);
		controllerFor(ports()).deny(request());
	} finally {
		Object.assign(console, original);
	}
	assert.deepEqual(
		seen,
		[],
		"the controller does not write to the console at all",
	);
});

test("the controller imports no storage, DOM or network of its own", async () => {
	const { default: fs } = await import("node:fs");
	const source = fs.readFileSync(
		new URL("../src/services/appApproval.ts", import.meta.url),
		"utf8",
	);
	for (const forbidden of [
		/\bwindow\b/,
		/\bdocument\b/,
		/localStorage/,
		/sessionStorage/,
		/\bfetch\(/,
		/console\./,
		/postMessage/,
	]) {
		assert.doesNotMatch(source.replace(/\/\/.*$/gm, ""), forbidden);
	}
});

// ----- the identity the card may show -----

const user = (over = {}) => ({
	network_user: { network_name: "alpha-net", auth_types: ["email"], ...over },
});
const idOf = (token) => NETWORKS.get(token) ?? null;

test("the card names the network as the server says it, and carries the session's network id", () => {
	assert.deepEqual(resolveIdentity("token-alpha", user(), idOf), {
		kind: "ready",
		networkId: "network-alpha",
		networkName: "alpha-net",
	});
	assert.deepEqual(
		resolveIdentity(
			"token-alpha",
			user({ network_name: "  spaced  " }),
			idOf,
		).networkName,
		"spaced",
	);
	for (const types of [
		["solana"],
		["google", "apple"],
		["seedphrase", "email"],
	]) {
		assert.equal(
			resolveIdentity("token-alpha", user({ auth_types: types }), idOf)
				.kind,
			"ready",
			types.join(),
		);
	}
});

test("an account with no sign-in method is refused, as is one the api does not describe", () => {
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ auth_types: [] }), idOf),
		{ kind: "no-sign-in-method" },
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ auth_types: undefined }), idOf),
		{ kind: "no-sign-in-method" },
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ auth_types: "email" }), idOf),
		{ kind: "no-sign-in-method" },
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ auth_types: null }), idOf),
		{ kind: "no-sign-in-method" },
	);
});

test("a 401 means signed out, any other error means try again, and an unreadable answer is refused", () => {
	assert.deepEqual(
		resolveIdentity(
			"token-alpha",
			{ error: { message: "HTTP error! status: 401", status: 401 } },
			idOf,
		),
		{ kind: "signed-out" },
	);
	assert.deepEqual(
		resolveIdentity(
			"token-alpha",
			{ error: { message: "HTTP error! status: 500", status: 500 } },
			idOf,
		),
		{ kind: "failed" },
	);
	assert.deepEqual(
		resolveIdentity(
			"token-alpha",
			{ error: { message: "Failed to fetch" } },
			idOf,
		),
		{ kind: "failed" },
	);
	assert.deepEqual(resolveIdentity("token-alpha", {}, idOf), {
		kind: "failed",
	});
	assert.deepEqual(
		resolveIdentity("token-alpha", { network_user: undefined }, idOf),
		{ kind: "failed" },
	);
	assert.deepEqual(
		resolveIdentity("token-unknown", user(), idOf),
		{ kind: "unreadable" },
		"the session names no network",
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ network_name: "" }), idOf),
		{ kind: "unreadable" },
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ network_name: "   " }), idOf),
		{ kind: "unreadable" },
	);
	assert.deepEqual(
		resolveIdentity("token-alpha", user({ network_name: 5 }), idOf),
		{ kind: "unreadable" },
	);
	// an error wins over a user, so a half answer is not a card
	assert.deepEqual(
		resolveIdentity(
			"token-alpha",
			{ ...user(), error: { status: 401 } },
			idOf,
		),
		{ kind: "signed-out" },
	);
});
