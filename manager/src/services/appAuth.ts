// The contract between a native app and the /login-app approval page (v1 and v2).
//
// A native app opens this page in the person's browser and asks them to approve
// its sign-in. The page answers by navigating to a fixed custom-scheme address
// that carries the answer; it never takes an address from the request.
//
// Version 1 is a request for the official network: the page works on its default
// api server. Version 2 is version 1 plus one key, `api`, the host of the api the
// app is on, so the same page can approve for a beta or self-hosted network, but
// only while this browser is set to that server (serverMatchesRequest). The
// request's host is text until the person chooses to switch to it.
//
// Pure: no React, no DOM, no network. Every function takes what it needs, so
// node --test loads this file directly (tests/app-auth.test.mjs). The sealing
// code (tweetnacl) is deliberately not here: appSeal.ts is loaded lazily, so
// the page's first load stays small. README.md ("Approving a native app") is
// the prose version of this file. /login-extension is a different, frozen
// contract (extensionAuth.ts) and shares nothing with it.
import bs58 from "bs58";

/** `v` of a request for the official network. */
export const APP_REQUEST_VERSION = "1";
/** `v` of a request that names its network: version 1 plus `api`. */
export const APP_REQUEST_VERSION_API = "2";

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
export const APP_CONTRACTS: readonly number[] = Object.freeze([1, 2]);

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
/** The fragment is at most this long, measured before any parsing. The longest
 * valid version 2 request is 337 characters (a test builds it), so the cap needs
 * no room made for `api`. */
export const FRAGMENT_MAX_LENGTH = 400;
/** The longest `api` value, `host[:port]` in all. */
export const API_MAX_LENGTH = 200;
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
	/** The host of the app's api, `host` or `host:port` with https implied
	 * (isValidApiHost). Present exactly when the request is version 2: a version 1
	 * request has no such key at all, not an empty one. It is text to show until
	 * the person chooses to switch to it; the request never names an address. */
	api?: string;
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
	"api",
	"ts",
	"stale",
	"query",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export type ParseResult =
	| { ok: true; request: AppRequest }
	| { ok: false; reason: RejectReason };

const KEYS: readonly string[] = ["v", "platform", "state", "pk", "ts"];
/** version 2 is version 1 plus `api`, and nothing else */
const KEYS_API: readonly string[] = [...KEYS, "api"];
/** Everything the fragment may contain: no percent escape, plus, space or
 * control character, so nothing needs decoding and nothing can hide. The dot and
 * the colon are there for `api` alone: every value is matched by a pattern of
 * its own below, and none but `api` admits either. */
const FRAGMENT_ALPHABET = /^[A-Za-z0-9_=&.:-]+$/;
const STATE_RE = /^[A-Za-z0-9_-]{43}$/;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const TS_RE = /^[0-9]{10}$/;
/** What may stand in an address: url-safe, nothing that needs escaping. */
const URL_VALUE_RE = /^[A-Za-z0-9_-]+$/;
/** One label of a host name: 1 to 63 of a-z 0-9 -, and a letter or digit at
 * both ends. */
const API_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
/** A port as written: no sign, no leading zero, at most five digits (the
 * range is checked apart). */
const API_PORT_RE = /^[1-9][0-9]{0,4}$/;
const ALL_DIGITS_RE = /^[0-9]+$/;
/** "0x" and any hex digits after it (0x, 0x10, 0xdeadbeef). A URL parser reads a
 * last label like that as a number, so `1.2.3.0x4` would be the address 1.2.3.4
 * and `0x7f.0x0.0x0.0x1` would be 127.0.0.1: never a name. */
const HEX_NUMBER_RE = /^0x[0-9a-f]*$/;

const refuse = (reason: RejectReason): ParseResult => ({ ok: false, reason });

/** The value of `api` (section 11 of the contract): the host of an api,
 * `host` or `host:port`, https implied. Lower-case ASCII letters, digits, hyphens
 * and dots only, so never a scheme, a path, userinfo or a query; at least two
 * labels of 1 to 63 characters that start and end with a letter or digit; the
 * last label is neither all digits nor "0x" and hex digits (a URL parser reads
 * both as a number), which keeps every IP literal out, in every spelling the
 * browser knows; a port is 1 to 65535 with no leading zero and is never 443 (the
 * default port of https is written by leaving it out, so a host has one
 * spelling); at most API_MAX_LENGTH characters in all. This one function is what
 * the parser and Switch both ask. */
export function isValidApiHost(value: unknown): value is string {
	if (typeof value !== "string") return false;
	if (value === "" || value.length > API_MAX_LENGTH) return false;
	const colon = value.indexOf(":");
	const host = colon < 0 ? value : value.slice(0, colon);
	if (colon >= 0) {
		const port = value.slice(colon + 1);
		if (!API_PORT_RE.test(port)) return false;
		const number = Number(port);
		if (number > 65535 || number === 443) return false;
	}
	const labels = host.split(".");
	if (labels.length < 2) return false;
	if (!labels.every((label) => API_LABEL_RE.test(label))) return false;
	const last = labels[labels.length - 1];
	return !ALL_DIGITS_RE.test(last) && !HEX_NUMBER_RE.test(last);
}

/** The base url a version 2 request's `api` stands for: https, no path. Null for
 * a value that is not a valid host, so nothing odd is ever made into an address. */
export function apiBaseOfHost(api: string): string | null {
	return isValidApiHost(api) ? `https://${api}` : null;
}

/** Is the api server this browser is set to the host the request names? `base`
 * is what the page would call (a custom server, or the default); a relative one
 * resolves against the page, and what it resolves to is compared. Only https can
 * match: an http server never does, whatever its host. Compared as `URL.host`, the
 * way the browser itself would send the request, so the case and the default
 * port are already normalised. `pageHref` is any absolute address of the page
 * (its origin is enough). Never throws. */
export function serverMatchesRequest(
	base: string,
	api: string,
	pageHref: string,
): boolean {
	// a host the grammar does not allow (an IP literal, say) matches nothing
	if (typeof base !== "string" || !isValidApiHost(api)) return false;
	const url = resolveBase(base, pageHref);
	return url !== null && url.protocol === "https:" && url.host === api;
}

function resolveBase(base: string, pageHref: string): URL | null {
	try {
		return new URL(base, pageHref);
	} catch {
		// an absolute base needs no page; a relative one cannot be placed without it
		try {
			return new URL(base);
		} catch {
			return null;
		}
	}
}

/** Is this browser's api server the one `request` is for: the default server for
 * a version 1 request (compared as text, as ever), the one it names for a
 * version 2 request. A request that carries `api` of any other type fits no
 * server. */
export function isServerForRequest(
	request: AppRequest,
	base: string,
	defaultBase: string,
	pageHref: string,
): boolean {
	if (request.api === undefined) return base === defaultBase;
	return serverMatchesRequest(base, request.api, pageHref);
}

export type ServerChoice =
	| { kind: "default" }
	| { kind: "custom"; base: string };

/** Where Switch points the browser for a version 2 request: back to the default
 * server (the stored override is removed) when the default already is the host the
 * request names, else https://{host}. Null when nothing should be stored: `api`
 * is not a valid host, or it is one the browser cannot turn into the same host
 * again (a bad punycode label is no name; whether one is, the browser's URL
 * parser decides, and it is not the same in every browser). The page stores no
 * server it would not then recognise. */
export function serverChoiceFor(
	api: string,
	defaultBase: string,
	pageHref: string,
): ServerChoice | null {
	const base = apiBaseOfHost(api);
	if (base === null) return null;
	if (serverMatchesRequest(defaultBase, api, pageHref)) {
		return { kind: "default" };
	}
	return serverMatchesRequest(base, api, pageHref)
		? { kind: "custom", base }
		: null;
}

function withinWindow(ts: number, nowMs: number): boolean {
	if (!Number.isFinite(nowMs)) return false;
	const now = Math.floor(nowMs / 1000);
	return now - ts <= REQUEST_MAX_AGE_S && ts - now <= REQUEST_MAX_AHEAD_S;
}

/** Strict parse of `location.hash`, with or without the leading '#'.
 *
 * Accepts exactly v=1, a platform from the table, a 43-character state, a
 * public key and a fresh timestamp, each once, and nothing else. Or v=2 and the
 * same five with a sixth key, `api`, once: a version 1 request that carries
 * `api` and a version 2 request that lacks it are both refused whole. Any other
 * key (redirect_uri, redirect_link, return, callback, auth_code, next, code,
 * error, in any case) refuses the whole request.
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
	const version = fields.get("v");
	if (
		version !== undefined &&
		version !== APP_REQUEST_VERSION &&
		version !== APP_REQUEST_VERSION_API
	) {
		return refuse("version");
	}
	// the version decides which keys there are: `api` belongs to version 2 alone
	const keys = version === APP_REQUEST_VERSION_API ? KEYS_API : KEYS;
	for (const key of fields.keys()) {
		if (!keys.includes(key)) return refuse("unknown-key");
	}
	if (fields.size !== keys.length) return refuse("shape");

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

	let api: string | undefined;
	if (version === APP_REQUEST_VERSION_API) {
		const apiText = fields.get("api") as string;
		if (!isValidApiHost(apiText)) return refuse("api");
		api = apiText;
	}

	const tsText = fields.get("ts") as string;
	if (!TS_RE.test(tsText)) return refuse("ts");
	const ts = Number(tsText);
	if (!withinWindow(ts, nowMs)) return refuse("stale");

	return {
		ok: true,
		request: {
			platform: platform as AppPlatform,
			state,
			pk,
			ts,
			...(api === undefined ? {} : { api }),
		},
	};
}

/** A request written the way the app writes it, without the '#': the keys in the
 * contract's order, `api` last and only for version 2. It validates nothing (the
 * request it is given has been through parseAppRequest, or is about to be run
 * through it again, as the stash does with the slot). */
export function appRequestFragment(request: AppRequest): string {
	const version =
		request.api === undefined
			? APP_REQUEST_VERSION
			: APP_REQUEST_VERSION_API;
	const head =
		`v=${version}&platform=${request.platform}&state=${request.state}` +
		`&pk=${request.pk}&ts=${request.ts}`;
	return request.api === undefined ? head : `${head}&api=${request.api}`;
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
