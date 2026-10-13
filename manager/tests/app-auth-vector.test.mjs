// The cross-implementation vector: what the page seals, the app must open with
// the SDK's own Go functions (GenerateSharedSecret + DecryptData, urnetwork/sdk
// sdk.go), and the SDK's EncryptData must produce the same bytes. The vector
// holds only fixed, non-secret keys (tests/fixtures/app-auth-vector.json); the
// Windows app's header test pins the same file. The Go side was run against
// this file with the SDK's functions copied verbatim (see the README).
import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import bs58 from "bs58";

import {
	buildApproveReturn,
	buildDenyReturn,
	parseAppRequest,
} from "../src/services/appAuth.ts";
import { sealCode } from "../src/services/appSeal.ts";
import { readFixture } from "./helpers/app-request.mjs";

const vector = readFixture();
const bytes = (length, at) => Uint8Array.from({ length }, (_, i) => at(i));

test("the vector's inputs are the documented fixed values", () => {
	assert.equal(vector.contract, 1);
	assert.deepEqual(vector.recipe, {
		appSecretKey: "bytes 1..32",
		ephemeralSecretKey: "bytes 101..132",
		nonce: "24 bytes, 200 down to 177",
		code: "683 x 'A' followed by '=' (684 characters, the length of a server code)",
		state: "43 x 'S'",
	});
	const appSecretKey = bytes(32, (i) => i + 1);
	const ephemeralSecretKey = bytes(32, (i) => 101 + i);
	const nonce = bytes(24, (i) => 200 - i);
	assert.equal(vector.appSk, bs58.encode(appSecretKey));
	assert.equal(vector.eSk, bs58.encode(ephemeralSecretKey));
	assert.equal(vector.n, bs58.encode(nonce));
	assert.equal(
		vector.appPk,
		bs58.encode(nacl.box.keyPair.fromSecretKey(appSecretKey).publicKey),
	);
	assert.equal(
		vector.epk,
		bs58.encode(
			nacl.box.keyPair.fromSecretKey(ephemeralSecretKey).publicKey,
		),
	);
	assert.equal(
		vector.plaintext,
		JSON.stringify({ c: "A".repeat(683) + "=", s: "S".repeat(43) }),
	);
	assert.equal(vector.plaintext.length, 742);
});

test("the page's sealCode, given the fixed key and nonce, reproduces the vector byte for byte", () => {
	const request = {
		platform: "windows",
		state: "S".repeat(43),
		pk: vector.appPk,
		ts: vector.request.ts,
	};
	assert.deepEqual(vector.request, request);
	const sealed = sealCode("A".repeat(683) + "=", request, {
		keyPair: () =>
			nacl.box.keyPair.fromSecretKey(bytes(32, (i) => 101 + i)),
		nonce: () => bytes(24, (i) => 200 - i),
	});
	assert.equal(sealed.d.length, 1036);
	assert.equal(vector.dLength, 1036);
	assert.deepEqual(sealed, { epk: vector.epk, n: vector.n, d: vector.d });
	// and the whole address the page would navigate to
	assert.equal(buildApproveReturn(request, sealed), vector.approveAddress);
	assert.equal(vector.approveAddress.length, 1190);
	assert.equal(buildDenyReturn(request), vector.denyAddress);
	assert.equal(
		vector.denyAddress,
		`urnetwork://auth?state=${"S".repeat(43)}&error=access_denied`,
	);
});

test("the app side opens the vector: shared secret from its secret key and the page's public key", () => {
	// the app's steps, with the same primitives the SDK wraps (box.Precompute, box.OpenAfterPrecomputation)
	const shared = nacl.box.before(
		bs58.decode(vector.epk),
		bs58.decode(vector.appSk),
	);
	const opened = nacl.box.open.after(
		bs58.decode(vector.d),
		bs58.decode(vector.n),
		shared,
	);
	assert.notEqual(opened, null);
	assert.equal(new TextDecoder().decode(opened), vector.plaintext);
	assert.deepEqual(JSON.parse(new TextDecoder().decode(opened)), {
		c: "A".repeat(683) + "=",
		s: "S".repeat(43),
	});
	// the other half of the agreement gives the same key
	const same = nacl.box.before(
		bs58.decode(vector.appPk),
		bs58.decode(vector.eSk),
	);
	assert.deepEqual(same, shared);
	// a flipped bit, a wrong key and a wrong nonce are refused
	const flipped = bs58.decode(vector.d);
	flipped[5] ^= 1;
	assert.equal(
		nacl.box.open.after(flipped, bs58.decode(vector.n), shared),
		null,
	);
	const wrong = nacl.box.before(
		bs58.decode(vector.epk),
		bytes(32, (i) => 7 * i + 1),
	);
	assert.equal(
		nacl.box.open.after(
			bs58.decode(vector.d),
			bs58.decode(vector.n),
			wrong,
		),
		null,
	);
	assert.equal(
		nacl.box.open.after(
			bs58.decode(vector.d),
			bytes(24, (i) => i),
			shared,
		),
		null,
	);
});

test("the vector's request is a request the page accepts", () => {
	const fragment = `#v=1&platform=windows&state=${vector.request.state}&pk=${vector.request.pk}&ts=${vector.request.ts}`;
	assert.deepEqual(parseAppRequest(fragment, vector.request.ts * 1000), {
		ok: true,
		request: vector.request,
	});
	// the same request on an address with a query string is not
	assert.deepEqual(
		parseAppRequest(fragment, vector.request.ts * 1000, "?auth_code=X"),
		{ ok: false, reason: "query" },
	);
});

test("the fixture carries nothing but the documented fields", () => {
	assert.deepEqual(Object.keys(vector).sort(), [
		"appPk",
		"appSk",
		"approveAddress",
		"contract",
		"d",
		"dLength",
		"denyAddress",
		"description",
		"eSk",
		"epk",
		"n",
		"plaintext",
		"recipe",
		"request",
	]);
});
