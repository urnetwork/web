// A one-time sign-in code handed to the manager in the url: ?auth_code=<code>.
// ur.io's "Operator Client UI" opens the manager with a code from
// POST /auth/code-create (one use, about a minute).
//
// The code is a bearer secret. It leaves the address bar as soon as the app
// sees it, whether or not it is needed and whether or not it works, and a code
// for another network than the signed-in one is never applied without asking.
// The same rules as ur.io (mmm ur.io/react/src/auth/urlAuthCode.js).
//
// Pure (tests/auth-code-url.test.mjs); useAutoLogin does the I/O.

export const AUTH_CODE_PARAM = "auth_code";

export interface TakenAuthCode {
	/** the first non-empty auth_code value, or null */
	authCode: string | null;
	/** the query without any auth_code parameter ("" when nothing is left),
	 * or null when it had none */
	search: string | null;
}

function decodeQueryComponent(text: string): string {
	try {
		return decodeURIComponent(text.replace(/\+/g, " "));
	} catch {
		return text;
	}
}

/** Split a query ("?a=1&auth_code=…") into the code and the query without it.
 * The other parameters keep their exact spelling and order. */
export function takeAuthCode(search: string | null | undefined): TakenAuthCode {
	const query = (search ?? "").replace(/^\?/, "");
	if (!query) {
		return { authCode: null, search: null };
	}
	let authCode: string | null = null;
	let found = false;
	const kept: string[] = [];
	for (const part of query.split("&")) {
		const eq = part.indexOf("=");
		const name = decodeQueryComponent(eq < 0 ? part : part.slice(0, eq));
		if (name !== AUTH_CODE_PARAM) {
			if (part) {
				kept.push(part);
			}
			continue;
		}
		found = true;
		const value = eq < 0 ? "" : decodeQueryComponent(part.slice(eq + 1)).trim();
		if (!authCode && value) {
			authCode = value;
		}
	}
	if (!found) {
		return { authCode: null, search: null };
	}
	return { authCode, search: kept.length ? `?${kept.join("&")}` : "" };
}

export interface JwtClaims {
	network_id?: string;
	network_name?: string;
}

/** The claims of a by_jwt, read without verifying it (only to compare
 * networks), or null when it cannot be read. */
export function parseJwtClaims(jwt: string | null | undefined): JwtClaims | null {
	if (typeof jwt !== "string") {
		return null;
	}
	const payload = jwt.split(".")[1];
	if (!payload) {
		return null;
	}
	try {
		const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
		const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
		const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
		return claims && typeof claims === "object" ? (claims as JwtClaims) : null;
	} catch {
		return null;
	}
}

export type AuthCodeDecision = "invalid" | "sign-in" | "same-account" | "ask-to-switch";

/** What a code means for the current session (network_id is the account):
 * - "invalid": no usable jwt came back, so the session stays as it is
 * - "sign-in": signed out, so sign in with the code's jwt
 * - "same-account": already signed in to that network, so nothing changes
 * - "ask-to-switch": signed in to another network, so ask first */
export function authCodeAccountDecision(
	current: JwtClaims | null,
	linked: JwtClaims | null,
): AuthCodeDecision {
	if (!linked?.network_id) {
		return "invalid";
	}
	if (!current?.network_id) {
		return "sign-in";
	}
	const same = String(current.network_id).toLowerCase() === String(linked.network_id).toLowerCase();
	return same ? "same-account" : "ask-to-switch";
}
