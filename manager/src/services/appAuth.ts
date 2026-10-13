// The contract between a native app and the /login-app approval page (v1).
//
// A native app opens this page in the person's browser and asks them to approve
// its sign-in. The page answers by navigating to a fixed custom-scheme address
// that carries the answer; it never takes an address from the request.
//
// Pure: no React, no DOM, no network. Every function takes what it needs, so
// node --test loads this file directly (tests/app-auth.test.mjs). The sealing
// code (tweetnacl) is deliberately not here: appSeal.ts is loaded lazily, so
// the page's first load stays small. README.md ("Approving a native app") is
// the prose version of this file. /login-extension is a different, frozen
// contract (extensionAuth.ts) and shares nothing with it.
import bs58 from "bs58";

export const APP_REQUEST_VERSION = "1";

/** The only route that serves the request. The capture, the stash and the
 * return-after-sign-in redirect are all keyed to exactly this path, and the
 * page refuses to run on any other spelling of it. */
export const APP_REQUEST_PATH = "/login-app";

export interface PlatformRow {
	/** the name the consent card uses, never taken from the request */
	readonly label: string;
	/** where the answer goes: the only address the page ever navigates to */
	readonly returnBase: string;
}

/** The closed platform table. Nothing a request says can add a row or change
 * one; look names up with platformRow(), never with `in` or a bare index. */
export const APP_PLATFORMS = Object.freeze({
	windows: Object.freeze({
		label: "URnetwork for Windows",
		returnBase: "urnetwork://auth",
	}),
});
export type AppPlatform = keyof typeof APP_PLATFORMS;

/** The contract versions this page serves (the `v` of a request). With the
 * platform table, this is what public/approval-contract.json tells an app, and
 * a test ties that file to both. */
export const APP_CONTRACTS: readonly number[] = Object.freeze([1]);

/** The row for a platform name, or null for anything that is not an own key of
 * the table (`__proto__`, `constructor`, `toString`, ...). */
export function platformRow(name: string): PlatformRow | null {
	return Object.prototype.hasOwnProperty.call(APP_PLATFORMS, name)
		? APP_PLATFORMS[name as AppPlatform]
		: null;
}

/** A request is approvable up to 4 minutes after its `ts` (the app waits 5) ... */
export const REQUEST_MAX_AGE_S = 240;
/** ... and from 2 minutes before it (clock skew between app and browser). */
export const REQUEST_MAX_AHEAD_S = 120;
/** The auth code the page mints: 2 minutes cover the browser's first-use prompt. */
export const CODE_MINUTES = 2;
export const CODE_USES = 1;
/** The fragment is at most this long, measured before any parsing. */
export const FRAGMENT_MAX_LENGTH = 400;
/** An answer is at most this long (the contract's budget). A sealed one is
 * about 1,190 characters today; a longer one (a code of another size) is
 * refused here rather than risk being cut short on its way through the browser
 * and the operating system to the app. */
export const RETURN_MAX_LENGTH = 2000;
/** The longest auth code whose answer always fits RETURN_MAX_LENGTH: the sealed
 * box is the code plus 74 bytes (the JSON around it and the 16-byte tag),
 * written in base58, and the worst case has a 44-character public key and a
 * 33-character nonce. A code one character longer sometimes fits and sometimes
 * does not. The server's is 684. The approval seals a code this long before it
 * mints one (appApproval.ts), so no code is minted for an answer that cannot be
 * built. */
export const MAX_CODE_LENGTH = 1277;

export interface AppRequest {
	platform: AppPlatform;
	/** 43 characters, base64url of 32 random bytes: a secret until consumed */
	state: string;
	/** base58 of the attempt's 32-byte X25519 public key */
	pk: string;
	/** unix seconds at attempt start */
	ts: number;
}

/** Why a request was refused: a closed list, so a message can never carry
 * request text. */
export const REJECT_REASONS = [
	"empty",
	"shape",
	"duplicate",
	"unknown-key",
	"version",
	"platform",
	"state",
	"pk",
	"ts",
	"stale",
	"query",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export type ParseResult =
	| { ok: true; request: AppRequest }
	| { ok: false; reason: RejectReason };

const KEYS: readonly string[] = ["v", "platform", "state", "pk", "ts"];
/** Everything the fragment may contain: no percent escape, plus, space or
 * control character, so nothing needs decoding and nothing can hide. */
const FRAGMENT_ALPHABET = /^[A-Za-z0-9_=&-]+$/;
const STATE_RE = /^[A-Za-z0-9_-]{43}$/;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const TS_RE = /^[0-9]{10}$/;
/** What may stand in an address: url-safe, nothing that needs escaping. */
const URL_VALUE_RE = /^[A-Za-z0-9_-]+$/;

const refuse = (reason: RejectReason): ParseResult => ({ ok: false, reason });

function withinWindow(ts: number, nowMs: number): boolean {
	if (!Number.isFinite(nowMs)) return false;
	const now = Math.floor(nowMs / 1000);
	return now - ts <= REQUEST_MAX_AGE_S && ts - now <= REQUEST_MAX_AHEAD_S;
}

/** Strict parse of `location.hash`, with or without the leading '#'.
 *
 * Accepts exactly v=1, a platform from the table, a 43-character state, a
 * public key and a fresh timestamp, each once, and nothing else. Any other key
 * (redirect_uri, redirect_link, return, callback, auth_code, next, code, error,
 * in any case) refuses the whole request.
 *
 * `search` is the page address's own `location.search`. A request is valid
 * only on an address with no query string: the manager signs a visitor in from
 * `?auth_code=` on any route, and an approval must never ride on that. Anything
 * but the empty string refuses the request, whatever the fragment says. A slot
 * read back from storage has no address to look at and passes none. */
export function parseAppRequest(
	fragment: string,
	nowMs: number,
	search: string = "",
): ParseResult {
	if (typeof fragment !== "string") return refuse("shape");
	if (search !== "") return refuse("query");
	const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;
	if (raw === "") return refuse("empty");
	if (raw.length > FRAGMENT_MAX_LENGTH || !FRAGMENT_ALPHABET.test(raw)) {
		return refuse("shape");
	}

	const fields = new Map<string, string>();
	for (const part of raw.split("&")) {
		const eq = part.indexOf("=");
		if (eq <= 0) return refuse("shape");
		const key = part.slice(0, eq);
		const value = part.slice(eq + 1);
		if (value === "" || value.includes("=")) return refuse("shape");
		if (fields.has(key)) return refuse("duplicate");
		fields.set(key, value);
	}

	// a different version says so before anything else is judged
	if (fields.has("v") && fields.get("v") !== APP_REQUEST_VERSION) {
		return refuse("version");
	}
	for (const key of fields.keys()) {
		if (!KEYS.includes(key)) return refuse("unknown-key");
	}
	if (fields.size !== KEYS.length) return refuse("shape");

	const platform = fields.get("platform") as string;
	if (platformRow(platform) === null) return refuse("platform");

	const state = fields.get("state") as string;
	if (!STATE_RE.test(state)) return refuse("state");

	const pk = fields.get("pk") as string;
	if (!BASE58_RE.test(pk)) return refuse("pk");
	try {
		if (bs58.decode(pk).length !== 32) return refuse("pk");
	} catch {
		return refuse("pk");
	}

	const tsText = fields.get("ts") as string;
	if (!TS_RE.test(tsText)) return refuse("ts");
	const ts = Number(tsText);
	if (!withinWindow(ts, nowMs)) return refuse("stale");

	return {
		ok: true,
		request: { platform: platform as AppPlatform, state, pk, ts },
	};
}

/** The same window parseAppRequest applies, checked again at the Approve click.
 * Whole seconds: the clock is rounded down. A clock that is not a number never
 * counts as fresh. */
export function isFresh(request: AppRequest, nowMs: number): boolean {
	return withinWindow(request.ts, nowMs);
}

/** The sealed answer: base58 strings of the page's ephemeral public key, the
 * nonce and the NaCl box (appSeal.ts makes it). */
export interface Sealed {
	epk: string;
	n: string;
	d: string;
}

/** What sealing throws for a public key it cannot seal to: not 32 bytes, or a
 * point of small order. It lives here, with the rest of the contract, so the
 * approval can tell such a key from a failure that a second try could cure
 * without loading the sealing code itself: for this key no try can work. */
export class BadPublicKeyError extends Error {
	constructor() {
		super("bad public key");
		this.name = "BadPublicKeyError";
	}
}

function urlValue(value: string): string {
	if (typeof value !== "string" || !URL_VALUE_RE.test(value)) {
		throw new Error("value outside the url-safe alphabet");
	}
	return value;
}

function returnBaseOf(request: AppRequest): string {
	const row = platformRow(request.platform);
	if (row === null) throw new Error("unknown platform");
	return row.returnBase;
}

function finish(address: string): string {
	if (address.length > RETURN_MAX_LENGTH)
		throw new Error("return address too long");
	return address;
}

/** The only address the page navigates to on approval: a constant from the
 * table plus url-safe values. Throws on anything else. */
export function buildApproveReturn(
	request: AppRequest,
	sealed: Sealed,
): string {
	return finish(
		`${returnBaseOf(request)}?state=${urlValue(request.state)}` +
			`&epk=${urlValue(sealed.epk)}&n=${urlValue(sealed.n)}&d=${urlValue(sealed.d)}`,
	);
}

/** The only address the page navigates to on Cancel. */
export function buildDenyReturn(request: AppRequest): string {
	return finish(
		`${returnBaseOf(request)}?state=${urlValue(request.state)}&error=access_denied`,
	);
}

export type AppGate = "ok" | "framed" | "opener";

/** Nothing on the page is interactive unless it is the top window and nothing
 * opened it: a page that frames or opened this one could otherwise steer or
 * watch the person's click. Pass window.self, window.top and window.opener. */
export function evaluateAppGate(w: {
	self: unknown;
	top: unknown;
	opener: unknown;
}): AppGate {
	if (w.self !== w.top) return "framed";
	if (w.opener !== null) return "opener";
	return "ok";
}

/** The one line the page writes to the console, as /login-extension does: the
 * platform is a key of the closed table; no state, key, code or answer. */
export function logAppAuthEvent(
	action: "approve" | "deny",
	platform: AppPlatform,
): void {
	console.warn(`[AppAuth] action=${action} platform=${platform}`);
}
