// /login-app, which card the person sees (src/services/appApprovalView.ts):
// one ordered list of checks, and the consent card (the only place an Approve
// button exists) only at the end of it.
import assert from "node:assert/strict";
import test from "node:test";

import { deriveApprovalModel } from "../src/services/appApprovalView.ts";
import { mulberry32, request } from "./helpers/app-request.mjs";

const base = (over = {}) => ({
	gate: "ok",
	status: { kind: "ready", request: request() },
	authenticated: true,
	defaultServer: true,
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

test("signed out: sent to sign in; a different api server: refused", () => {
	assert.deepEqual(deriveApprovalModel(base({ authenticated: false })), {
		kind: "redirecting",
	});
	assert.deepEqual(deriveApprovalModel(base({ defaultServer: false })), {
		kind: "server",
		apiHost: "api.example.test",
	});
	assert.equal(
		deriveApprovalModel(
			base({ defaultServer: false, authenticated: false }),
		).kind,
		"redirecting",
		"sign in first, then the server is judged",
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
			]),
			authenticated: pick([true, true, true, false]),
			defaultServer: pick([true, true, true, false]),
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
		assert.equal(inputs.defaultServer, true);
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
