// A sign-in belongs to the API server that issued it.
//
// The manager can be pointed at another server while a tab is open: from the
// sign-in page ("Change Network API"), or by Switch on /login-app. Every request
// reads the server from storage when it is made, so a session that outlives a
// change of server would be sent to a server that never issued it. This is the
// pure part of keeping the two together: the name a server goes by, the record
// that is stored beside the session, and what to make of both when they are read
// back. AuthContext uses it to end a session whose server has been left, in this
// tab and in every other one.
//
// Pure apart from the Storage-like object passed in, so node --test drives it
// with fakes (tests/session-binding.test.mjs). Storage can throw (blocked, full,
// private mode), so none of these functions does: a read that fails finds no
// session, a write that fails says so.

/** The key the dashboard has always kept the session under. */
export const SESSION_KEY = "byToken";

/** The record of the server that issued the stored session. A session written by
 * a version that kept no record has none, and is taken as it always was. */
export const SESSION_SERVER_KEY = "byTokenServer";

/** What a session issued by the build's own default server carries, wherever the
 * build points it: the person never chose that server, so a build that moves its
 * default does not sign anybody out. */
export const DEFAULT_SERVER_MARK = "default";

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/** The name a server goes by in a session's record: the base itself, or the one
 * mark for the default (an override that spells the default is still the default). */
export function serverMark(base: string, defaultBase: string): string {
	return base === defaultBase ? DEFAULT_SERVER_MARK : base;
}

export interface StoredSession {
	token: string;
	/** the server that issued it, or null for a session stored with no record */
	server: string | null;
}

/** The stored session, if there is one that fits `current`, the mark of the server
 * the browser is set to right now. A record that names another server means the
 * session is of no use here: nothing is returned (and nothing is removed, so it
 * serves again if the browser goes back to that server). A session with no record
 * is returned, as it always was. */
export function readSession(
	storage: StorageLike | null,
	current: string,
): StoredSession | null {
	if (!storage) return null;
	try {
		const token = storage.getItem(SESSION_KEY);
		if (!token) return null;
		const recorded = storage.getItem(SESSION_SERVER_KEY);
		const server = recorded === "" ? null : recorded;
		if (server !== null && server !== current) return null;
		return { token, server };
	} catch {
		return null;
	}
}

/** Stores a session and the server that issued it. The record goes first, so a
 * reader that finds the new session finds its server beside it. False when the
 * browser would not keep it (the session then lives in this tab alone). */
export function writeSession(
	storage: StorageLike | null,
	token: string,
	server: string,
): boolean {
	if (!storage) return false;
	try {
		storage.setItem(SESSION_SERVER_KEY, server);
		storage.setItem(SESSION_KEY, token);
		return true;
	} catch {
		return false;
	}
}

/** Takes the stored session out, whatever it is: sign-out. The session goes
 * first, so no reader finds a record of its own. */
export function clearSession(storage: StorageLike | null): void {
	if (!storage) return;
	try {
		storage.removeItem(SESSION_KEY);
	} catch {
		// storage that throws holds nothing we could use either
	}
	try {
		storage.removeItem(SESSION_SERVER_KEY);
	} catch {
		// the record of a session that is gone means nothing
	}
}

/** Takes the stored session out only if it is still `token`: another tab may have
 * signed in to something newer since, and that is not this tab's to end. */
export function forgetSession(
	storage: StorageLike | null,
	token: string,
): boolean {
	if (!storage) return false;
	try {
		if (storage.getItem(SESSION_KEY) !== token) return false;
	} catch {
		return false;
	}
	clearSession(storage);
	return true;
}
