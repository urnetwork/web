// Shared fixtures for the /login-app tests: one valid request with fixed,
// non-secret keys, a fixed clock, and a few helpers. Not a test file (the
// test script only runs tests/*.test.mjs).
import fs from "node:fs";
import nacl from "tweetnacl";
import bs58 from "bs58";

/** the clock every test runs on: a whole second, in milliseconds */
export const NOW = 1_790_000_000_000;
export const TS = Math.floor(NOW / 1000);

/** the app's per-attempt key pair, fixed so a failure reproduces */
export const appSecretKey = Uint8Array.from(
	{ length: 32 },
	(_, i) => (i * 7 + 3) & 255,
);
export const appKeys = nacl.box.keyPair.fromSecretKey(appSecretKey);
export const PK = bs58.encode(appKeys.publicKey);

/** 43 characters, base64url of 32 bytes, with both url-safe punctuation marks */
export const STATE = Buffer.from(
	Uint8Array.from({ length: 32 }, (_, i) => 248 - i * 7 + (i % 3) * 63),
).toString("base64url");

/** a code like the server's: 683 url-safe base64 characters and a padding '=' */
export const CODE = "Q".repeat(683) + "=";

/** the api host of a version 2 request in most tests: valid, no port */
export const API = "api.beta-test.net";

/** the fragment of a request; `over` replaces fields, a null field is left out.
 * A version 2 request is fragment({ v: "2", api: API }): `api` comes last, where
 * the app writes it. */
export function fragment(over = {}, { hash = true } = {}) {
	const fields = {
		v: "1",
		platform: "windows",
		state: STATE,
		pk: PK,
		ts: String(TS),
		...over,
	};
	const text = Object.entries(fields)
		.filter(([, value]) => value !== null)
		.map(([key, value]) => `${key}=${value}`)
		.join("&");
	return hash ? `#${text}` : text;
}

/** the request object parseAppRequest returns for fragment() */
export function request(over = {}) {
	return { platform: "windows", state: STATE, pk: PK, ts: TS, ...over };
}

/** a seeded generator, so a fuzz failure can be replayed */
export function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function readFixture() {
	return JSON.parse(
		fs.readFileSync(
			new URL("../fixtures/app-auth-vector.json", import.meta.url),
			"utf8",
		),
	);
}

/** the shared version 2 request vector (tests/fixtures/app-request-vector-v2.json) */
export function readRequestVectorV2() {
	return JSON.parse(
		fs.readFileSync(
			new URL("../fixtures/app-request-vector-v2.json", import.meta.url),
			"utf8",
		),
	);
}

/** the source of a repo file with the line endings of the checkout removed */
export function source(relativeToManager) {
	return fs
		.readFileSync(
			new URL(`../../${relativeToManager}`, import.meta.url),
			"utf8",
		)
		.replace(/\r\n/g, "\n");
}
