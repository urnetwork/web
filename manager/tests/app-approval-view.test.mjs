// /login-app, which card the person sees (src/services/appApprovalView.ts):
// one ordered list of checks, and the consent card (the only place an Approve
// button exists) only at the end of it.
import assert from "node:assert/strict";
import test from "node:test";

import { deriveApprovalModel } from "../src/services/appApprovalView.ts";
import { API, mulberry32, request } from "./helpers/app-request.mjs";

const base = (over = {}) => ({
	gate: "ok",
	status: { kind: "ready", request: request() },
	authenticated: true,
	serverMatches: true,
	apiHost: "api.example.test",
	done: null,
	identity: {
		kind: "ready",
		networkId: "network-alpha",
		networkName: "alpha",
	},
	armed: true,
	busy: false,
	minting: false,
	problem: null,
	canOpen: false,
	...over,
});

test("with every check passed the card is the consent card, named from the table and the server", () => {
	assert.deepEqual(deriveApprovalModel(base()), {
		kind: "consent",
		label: "URnetwork for Windows",
		networkName: "alpha",
		server: null,
		armed: true,
		busy: false,
		minting: false,
		problem: null,
	});
	// the button state and the error pass straight through
	assert.equal(deriveApprovalModel(base({ armed: false })).armed, false);
	assert.equal(deriveApprovalModel(base({ busy: true })).busy, true);
	assert.equal(deriveApprovalModel(base({ busy: true })).minting, false);
	assert.equal(
		deriveApprovalModel(base({ busy: true, minting: true })).minting,
		true,
	);
	for (const problem of ["failed", "too-many"]) {
		const model = deriveApprovalModel(base({ problem }));
		assert.equal(model.problem, problem);
		assert.equal(model.armed, true, `${problem} invites another try`);
	}
});

test("after a broken answer the card says so and Approve stays off: the page has to be reloaded", () => {
	const model = deriveApprovalModel(base({ problem: "broken", armed: true }));
	assert.equal(model.kind, "consent");
	assert.equal(model.problem, "broken");
	assert.equal(model.armed, false, "another click could only be refused");
	assert.equal(model.busy, false);
	// nothing else about the card changes
	assert.deepEqual(
		{ ...model, armed: true, problem: null },
		deriveApprovalModel(base()),
	);
});

test("a framed page, or one that has an opener, is blocked before anything else", () => {
	assert.deepEqual(deriveApprovalModel(base({ gate: "framed" })), {
		kind: "blocked",
		reason: "framed",
	});
	assert.deepEqual(deriveApprovalModel(base({ gate: "opener" })), {
		kind: "blocked",
		reason: "opener",
	});
	// even with a request that is invalid, and a signed-out session
	assert.equal(
		deriveApprovalModel(
			base({
				gate: "framed",
				status: { kind: "invalid" },
				authenticated: false,
			}),
		).kind,
		"blocked",
	);
});

test("a request that is missing, invalid, stale or from another version offers nothing, and never sends anyone to sign in", () => {
	// a missing request is the generic invalid-link card, as the contract says (section 7)
	for (const [kind, problem] of [
		["none", "invalid"],
		["invalid", "invalid"],
		["stale", "stale"],
		["unsupported", "unsupported"],
	]) {
		assert.deepEqual(deriveApprovalModel(base({ status: { kind } })), {
			kind: "request",
			problem,
		});
		assert.deepEqual(
			deriveApprovalModel(
				base({ status: { kind }, authenticated: false }),
			),
			{ kind: "request", problem },
			`${kind}, signed out`,
		);
	}
});

test("signed out on the right server: sent to sign in; on another server: the server card, version 1 as it was", () => {
	assert.deepEqual(deriveApprovalModel(base({ authenticated: false })), {
		kind: "redirecting",
	});
	assert.deepEqual(deriveApprovalModel(base({ serverMatches: false })), {
		kind: "server",
		label: "URnetwork for Windows",
		apiHost: "api.example.test",
		requestedHost: null,
		armed: true,
	});
});

test("the server card is inert exactly when the page says so: its buttons wait for the same 800 ms as Approve", () => {
	const named = { kind: "ready", request: request({ api: API }) };
	for (const status of [{ kind: "ready", request: request() }, named]) {
		for (const armed of [true, false]) {
			const model = deriveApprovalModel(
				base({ status, serverMatches: false, armed }),
			);
			assert.equal(model.kind, "server");
			assert.equal(model.armed, armed);
		}
	}
});

test("the server is judged first: before the sign-in and before the account check, whatever they say", () => {
	const identities = [
		{ kind: "idle" },
		{ kind: "loading" },
		{ kind: "signed-out" },
		{ kind: "failed" },
		{ kind: "unreadable" },
		{ kind: "no-sign-in-method" },
		{ kind: "ready", networkId: "n", networkName: "a" },
	];
	for (const status of [
		{ kind: "ready", request: request() },
		{ kind: "ready", request: request({ api: API }) },
	]) {
		for (const authenticated of [true, false]) {
			for (const identity of identities) {
				const model = deriveApprovalModel(
					base({
						status,
						serverMatches: false,
						authenticated,
						identity,
					}),
				);
				assert.equal(
					model.kind,
					"server",
					`${authenticated ? "signed in" : "signed out"}, ${identity.kind}`,
				);
			}
		}
	}
	// on the right server the sign-in and the account check go on as before
	assert.equal(
		deriveApprovalModel(base({ authenticated: false })).kind,
		"redirecting",
	);
	assert.equal(
		deriveApprovalModel(base({ identity: { kind: "loading" } })).kind,
		"checking",
	);
});

test("a version 2 request names its host on the server card; a version 1 request names none", () => {
	const named = {
		kind: "ready",
		request: request({ api: "mock.localhost:5198" }),
	};
	assert.deepEqual(
		deriveApprovalModel(base({ status: named, serverMatches: false })),
		{
			kind: "server",
			label: "URnetwork for Windows",
			apiHost: "api.example.test",
			requestedHost: "mock.localhost:5198",
			armed: true,
		},
	);
	// signed out makes no difference, and nor does the account check
	assert.equal(
		deriveApprovalModel(
			base({ status: named, serverMatches: false, authenticated: false }),
		).requestedHost,
		"mock.localhost:5198",
	);
	assert.equal(
		deriveApprovalModel(base({ serverMatches: false })).requestedHost,
		null,
	);
	// on the right server a version 2 request gets the consent card, which names the api server the
	// code would be minted on (the browser's host: the request's host is the card's text only on the
	// server card), and a version 1 request, which is for the default server, names none
	const consent = deriveApprovalModel(base({ status: named }));
	assert.equal(consent.kind, "consent");
	assert.equal(consent.server, "api.example.test");
	assert.equal(JSON.stringify(consent).includes("localhost"), false);
	assert.deepEqual(
		{ ...consent, server: null },
		deriveApprovalModel(base()),
		"and it is otherwise the very card a version 1 request gets",
	);
	assert.equal(deriveApprovalModel(base()).server, null);
});

test("what comes before the server still comes first: the end states, the gates, a request that is not valid", () => {
	const named = { kind: "ready", request: request({ api: API }) };
	const mismatch = { serverMatches: false, status: named };
	assert.deepEqual(
		deriveApprovalModel(base({ ...mismatch, done: "cancelled" })),
		{
			kind: "cancelled",
		},
	);
	assert.deepEqual(
		deriveApprovalModel(
			base({ ...mismatch, done: "approved", canOpen: true }),
		),
		{
			kind: "approved",
			canOpen: true,
		},
	);
	assert.equal(
		deriveApprovalModel(base({ ...mismatch, done: "expired" })).kind,
		"expired",
	);
	assert.equal(
		deriveApprovalModel(base({ ...mismatch, gate: "framed" })).kind,
		"blocked",
	);
	assert.equal(
		deriveApprovalModel(base({ ...mismatch, gate: "opener" })).kind,
		"blocked",
	);
	for (const kind of ["none", "invalid", "stale", "unsupported"]) {
		assert.equal(
			deriveApprovalModel(base({ ...mismatch, status: { kind } })).kind,
			"request",
			kind,
		);
	}
	// a platform the table lacks is an invalid request, not a server problem
	assert.deepEqual(
		deriveApprovalModel(
			base({
				serverMatches: false,
				status: {
					kind: "ready",
					request: request({ platform: "linux", api: API }),
				},
			}),
		),
		{ kind: "request", problem: "invalid" },
	);
});

test("until the api has answered who this is there is no card", () => {
	for (const kind of ["idle", "loading"]) {
		assert.deepEqual(deriveApprovalModel(base({ identity: { kind } })), {
			kind: "checking",
		});
	}
	for (const problem of ["failed", "unreadable", "no-sign-in-method"]) {
		assert.deepEqual(
			deriveApprovalModel(base({ identity: { kind: problem } })),
			{ kind: "identity", problem },
		);
	}
	assert.deepEqual(
		deriveApprovalModel(base({ identity: { kind: "signed-out" } })),
		{ kind: "redirecting" },
	);
});

test("once the person has decided, that is what the page says", () => {
	assert.deepEqual(
		deriveApprovalModel(base({ done: "approved", canOpen: true })),
		{ kind: "approved", canOpen: true },
	);
	assert.deepEqual(
		deriveApprovalModel(base({ done: "approved", canOpen: false })),
		{ kind: "approved", canOpen: false },
	);
	assert.deepEqual(deriveApprovalModel(base({ done: "cancelled" })), {
		kind: "cancelled",
	});
	assert.deepEqual(deriveApprovalModel(base({ done: "expired" })), {
		kind: "expired",
	});
	assert.deepEqual(deriveApprovalModel(base({ done: "session-changed" })), {
		kind: "session-changed",
	});
	// the stash is gone after an approval, so a remount sees no request; the answer still shows first
	assert.equal(
		deriveApprovalModel(
			base({
				done: "approved",
				status: { kind: "none" },
				authenticated: false,
			}),
		).kind,
		"approved",
	);
});

test("a request whose platform is not in the table cannot reach the consent card", () => {
	for (const platform of [
		"__proto__",
		"constructor",
		"linux",
		"",
		undefined,
	]) {
		const model = deriveApprovalModel(
			base({ status: { kind: "ready", request: request({ platform }) } }),
		);
		assert.deepEqual(
			model,
			{ kind: "request", problem: "invalid" },
			String(platform),
		);
	}
});

test("property: the consent card appears only when every check has passed", () => {
	const rand = mulberry32(99);
	const pick = (list) => list[Math.floor(rand() * list.length)];
	let consents = 0;
	for (let i = 0; i < 30000; i++) {
		const inputs = {
			gate: pick(["ok", "ok", "ok", "ok", "framed", "opener"]),
			status: pick([
				{ kind: "ready", request: request() },
				{ kind: "ready", request: request() },
				{ kind: "none" },
				{ kind: "invalid" },
				{ kind: "stale" },
				{ kind: "unsupported" },
				{ kind: "ready", request: request({ platform: "linux" }) },
				{ kind: "ready", request: request({ api: API }) },
				{ kind: "ready", request: request({ api: API }) },
			]),
			authenticated: pick([true, true, true, false]),
			serverMatches: pick([true, true, true, false]),
			apiHost: "h",
			done: pick([
				null,
				null,
				null,
				null,
				null,
				null,
				"approved",
				"cancelled",
				"expired",
				"session-changed",
			]),
			identity: pick([
				{ kind: "idle" },
				{ kind: "loading" },
				{ kind: "signed-out" },
				{ kind: "failed" },
				{ kind: "unreadable" },
				{ kind: "no-sign-in-method" },
				{ kind: "ready", networkId: "n", networkName: "a" },
				{ kind: "ready", networkId: "n", networkName: "a" },
			]),
			armed: pick([true, false]),
			busy: pick([true, false]),
			minting: pick([true, false]),
			problem: pick([null, "failed", "too-many", "broken"]),
			canOpen: pick([true, false]),
		};
		const model = deriveApprovalModel(inputs);
		if (model.kind !== "consent") continue;
		consents++;
		assert.equal(inputs.gate, "ok");
		assert.equal(inputs.status.kind, "ready");
		assert.equal(inputs.status.request.platform, "windows");
		assert.equal(inputs.authenticated, true);
		assert.equal(inputs.serverMatches, true);
		assert.equal(inputs.done, null);
		assert.equal(inputs.identity.kind, "ready");
		assert.equal(
			model.armed,
			inputs.armed && inputs.problem !== "broken",
			"armed only when asked and not after a broken answer",
		);
		assert.equal(model.busy, inputs.busy);
		assert.equal(model.minting, inputs.minting);
	}
	assert.ok(
		consents > 100,
		`the generator reaches the consent card (${consents} times)`,
	);
});
