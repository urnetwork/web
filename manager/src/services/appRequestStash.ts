// Keeps one /login-app request alive across the sign-in the page may need.
//
// The request arrives in the URL fragment. main.tsx hands it to
// captureAppRequest() before React starts: the request is validated, the one
// valid request is kept in a single slot of this tab's sessionStorage, and the
// fragment is removed from the address bar. Nothing but the validated request
// is ever stored (no other query parameter, no code, no sealed answer), and
// the slot lives until it goes stale (the request's own 4-minute window), the
// person approves or cancels, or the tab closes. A page address that carries a
// query string never holds a request: the manager acts on query parameters of
// its own (?auth_code= signs a visitor in on any route), and an approval must
// not ride on one.
//
// The way back to the card after signing in is for a tab that this page sent
// to sign in, and for no other: the page leaves a short-lived marker in the
// same tab's sessionStorage when it does, and nextRouteAfterSignIn needs it.
// A tab that merely holds a request (the dashboard opened in it later, a custom
// API server set, a window the page refused) is left alone.
//
// Pure apart from the objects passed in (a window-like, a Storage-like), so
// node --test drives it with fakes (tests/app-request-stash.test.mjs). Every
// storage access is wrapped: storage can throw (blocked, full, private mode).
import {
	APP_REQUEST_PATH,
	REQUEST_MAX_AGE_S,
	REQUEST_MAX_AHEAD_S,
	appRequestFragment,
	parseAppRequest,
	type AppPlatform,
	type AppRequest,
	type RejectReason,
} from "./appAuth.ts";

/** The one sessionStorage slot. A new link replaces it. */
export const APP_REQUEST_KEY = "app_request";

/** The marker the page leaves when it sends a signed-out person to sign in. */
export const APP_SIGN_IN_KEY = "app_sign_in";

/** The key the browser-extension sign-in keeps its way back in (Layout.tsx and
 * LoginExtension.tsx own it). Starting an app request removes a leftover one
 * from this tab, so the newest intent wins; the extension flow sets it again
 * when it starts. */
const EXTENSION_RETURN_KEY = "extension_return_to";

/** How long the marker counts: as long as the longest-lived request can still
 * be fresh, so it never outlives the request it belongs to. */
export const SIGN_IN_MARKER_MAX_AGE_MS =
	(REQUEST_MAX_AGE_S + REQUEST_MAX_AHEAD_S) * 1000;

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export interface CaptureWindow {
	location: { pathname: string; search: string; hash: string };
	history: {
		replaceState(
			data: unknown,
			unused: string,
			url?: string | URL | null,
		): void;
	};
}

export type CaptureResult =
	| { outcome: "skipped" } // not the approval page
	| { outcome: "unchanged" } // no fragment: an existing slot stays (the post-sign-in reload)
	| { outcome: "stored" }
	| { outcome: "unstored" } // valid, but this browser would not keep it
	| { outcome: "rejected"; reason: RejectReason };

let lastCapture: CaptureResult = { outcome: "skipped" };

/** This tab's sessionStorage, or null when the browser will not give it out. */
export function appRequestStorage(): StorageLike | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function removeKey(storage: StorageLike | null, key: string): void {
	try {
		storage?.removeItem(key);
	} catch {
		// storage that throws holds nothing we could use either
	}
}

/** Empties the slot and the marker: the marker never outlives its request. */
function remove(storage: StorageLike | null): void {
	removeKey(storage, APP_REQUEST_KEY);
	removeKey(storage, APP_SIGN_IN_KEY);
}

export function clearAppRequest(storage: StorageLike | null): void {
	remove(storage);
}

/** Runs once per page load, before React. On /login-app with a fragment: a valid
 * request replaces the slot, an invalid one empties it, and either way the
 * fragment leaves the address bar. With no fragment the slot is left alone,
 * because the reload after signing in arrives without one. A query string on
 * the address refuses the request, with or without a fragment, and empties the
 * slot. */
export function captureAppRequest(
	win: CaptureWindow,
	storage: StorageLike | null,
	nowMs: number,
): CaptureResult {
	const { pathname, search, hash } = win.location;
	let result: CaptureResult;
	if (pathname !== APP_REQUEST_PATH) {
		result = { outcome: "skipped" };
	} else if (search === "" && (hash === "" || hash === "#")) {
		result = { outcome: "unchanged" };
	} else {
		const parsed = parseAppRequest(hash, nowMs, search);
		if (parsed.ok) {
			result = write(storage, parsed.request)
				? { outcome: "stored" }
				: { outcome: "unstored" };
		} else {
			remove(storage);
			result = { outcome: "rejected", reason: parsed.reason };
		}
		if (hash !== "") {
			try {
				// the request is a secret until it is used: it must not stay in the
				// address bar, the history or a copied link. Query and path stay.
				win.history.replaceState(null, "", pathname + search);
			} catch {
				// the request is already in the slot; a failure here only leaves the bar as it was
			}
		}
	}
	lastCapture = result;
	return result;
}

function write(storage: StorageLike | null, request: AppRequest): boolean {
	if (!storage) return false;
	try {
		// `api` is in the slot exactly when the request has one (version 2)
		const slot: AppRequest = {
			platform: request.platform,
			state: request.state,
			pk: request.pk,
			ts: request.ts,
			...(request.api === undefined ? {} : { api: request.api }),
		};
		storage.setItem(APP_REQUEST_KEY, JSON.stringify(slot));
	} catch {
		remove(storage);
		return false;
	}
	// a new request has not sent this tab to sign in yet, and it is the newest
	// intent: an extension sign-in left behind in this tab no longer wins
	removeKey(storage, APP_SIGN_IN_KEY);
	removeKey(storage, EXTENSION_RETURN_KEY);
	return true;
}

export type StashRead =
	| { status: "ready"; request: AppRequest }
	| { status: "none" }
	| { status: "stale" } // a slot existed and has aged out: dropped
	| { status: "invalid" }; // a slot existed but is not a valid request: dropped

/** The slot's request if it is still valid and fresh. A stale or malformed slot
 * is removed. The slot is re-validated exactly like a fresh fragment: it is
 * rebuilt as one and run through parseAppRequest, so there is one validator. */
export function readAppRequest(
	storage: StorageLike | null,
	nowMs: number,
): StashRead {
	if (!storage) return { status: "none" };
	let raw: string | null;
	try {
		raw = storage.getItem(APP_REQUEST_KEY);
	} catch {
		return { status: "none" };
	}
	if (raw === null) return { status: "none" };

	const parsed = parseAppRequest(fragmentOfSlot(raw), nowMs);
	if (parsed.ok) return { status: "ready", request: parsed.request };
	remove(storage);
	return { status: parsed.reason === "stale" ? "stale" : "invalid" };
}

/** The slot as the fragment the app would have sent: version 1 for the four
 * fields, version 2 for the four and `api`. Any other set of keys, or a value of
 * the wrong type, is not a request ("!" is not a fragment). Nothing here judges
 * a value: parseAppRequest does that, with the same patterns as for a link. */
function fragmentOfSlot(raw: string): string {
	try {
		const slot: unknown = JSON.parse(raw);
		if (slot === null || typeof slot !== "object" || Array.isArray(slot))
			return "";
		const keys = Object.keys(slot).sort().join(",");
		const named = keys === "api,pk,platform,state,ts";
		if (!named && keys !== "pk,platform,state,ts") return "!";
		const { platform, state, pk, ts, api } = slot as Record<
			string,
			unknown
		>;
		if (
			typeof platform !== "string" ||
			typeof state !== "string" ||
			typeof pk !== "string" ||
			typeof ts !== "number" ||
			(named && typeof api !== "string")
		) {
			return "!";
		}
		return appRequestFragment({
			platform: platform as AppPlatform,
			state,
			pk,
			ts,
			...(named ? { api: api as string } : {}),
		});
	} catch {
		return "!";
	}
}

export type AppRequestStatus =
	| { kind: "ready"; request: AppRequest }
	| { kind: "none" } // nothing is waiting: opened without a request, or already used
	| { kind: "invalid" }
	| { kind: "stale" }
	| { kind: "unsupported" }; // another contract version

/** What the page should say about the request, in one place: the slot first,
 * and when it is empty, why this very page load rejected a link (by default
 * the capture that ran at the start of this page load). */
export function resolveAppRequest(
	storage: StorageLike | null,
	nowMs: number,
	captured: CaptureResult = lastCapture,
): AppRequestStatus {
	const read = readAppRequest(storage, nowMs);
	if (read.status === "ready")
		return { kind: "ready", request: read.request };
	if (read.status === "stale") return { kind: "stale" };
	if (read.status === "invalid") return { kind: "invalid" };
	if (captured.outcome === "rejected") {
		if (captured.reason === "stale") return { kind: "stale" };
		if (captured.reason === "version") return { kind: "unsupported" };
		return { kind: "invalid" };
	}
	if (captured.outcome === "unstored") return { kind: "invalid" };
	return { kind: "none" };
}

/** The page is about to send a signed-out person to sign in: leave the marker
 * that lets the way back find this tab. Short-lived, this tab's sessionStorage
 * only. False when the browser would not keep it (then the person lands on the
 * dashboard after signing in and starts again from the app). */
export function markSignInPending(
	storage: StorageLike | null,
	nowMs: number,
): boolean {
	if (!storage || !Number.isFinite(nowMs)) return false;
	try {
		storage.setItem(APP_SIGN_IN_KEY, String(Math.floor(nowMs)));
		return true;
	} catch {
		return false;
	}
}

/** True when this tab was sent to sign in by the page, not long ago. The marker
 * is used up either way: a stale or damaged one is simply dropped. */
function takeSignInMarker(storage: StorageLike, nowMs: number): boolean {
	let raw: string | null;
	try {
		raw = storage.getItem(APP_SIGN_IN_KEY);
	} catch {
		return false;
	}
	if (raw === null) return false;
	removeKey(storage, APP_SIGN_IN_KEY);
	if (!/^[0-9]{1,16}$/.test(raw)) return false;
	const age = nowMs - Number(raw);
	return age >= 0 && age <= SIGN_IN_MARKER_MAX_AGE_MS;
}

/** Signing in sends the person back to the approval they came from, as a hard
 * load of the one canonical path (so the page starts from a clean document).
 * Returns that path, or null when there is nothing to return to, the person is
 * already there, they are on the extension page (which is never taken over), or
 * this tab was not sent to sign in by the page (it holds a request and nothing
 * more). A stale or malformed slot is dropped on the way, and the marker is used
 * up by the return. */
export function nextRouteAfterSignIn(
	storage: StorageLike | null,
	pathname: string,
	nowMs: number,
): string | null {
	const read = readAppRequest(storage, nowMs);
	if (read.status !== "ready" || !storage) {
		removeKey(storage, APP_SIGN_IN_KEY);
		return null;
	}
	if (pathname === APP_REQUEST_PATH) return null;
	if (pathname.startsWith("/login-extension")) return null;
	if (!takeSignInMarker(storage, nowMs)) return null;
	return APP_REQUEST_PATH;
}
