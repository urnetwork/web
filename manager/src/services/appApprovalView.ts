// What /login-app shows, as a plain value: the page gathers its inputs (the
// gates, the request, the session, the identity check) and this decides, in one
// ordered list, which card the person sees. Pure, so node --test checks the
// order (tests/app-approval-view.test.mjs): the Approve button can only appear
// at the end of a list in which every earlier check has passed.
import { platformRow, type AppGate } from "./appAuth.ts";
import type { AppRequestStatus } from "./appRequestStash.ts";
import type { IdentityOutcome } from "./appApproval.ts";

/** What the identity check (GET /network/user) has found so far. */
export type IdentityState =
	| { kind: "idle" }
	| { kind: "loading" }
	| IdentityOutcome;

export type DoneState =
	| null
	| "approved"
	| "cancelled"
	| "expired"
	| "session-changed";

/** What went wrong at the last Approve: `failed` and `too-many` invite another
 * try, `broken` does not: the page has to be reloaded, because a code was
 * minted that could not be turned into an answer, or because the sealing code
 * could not be loaded (the browser keeps a failed import for the life of the
 * document). Either way Cancel still answers. */
export type ApprovalProblem = null | "failed" | "too-many" | "broken";

export interface ViewInputs {
	gate: AppGate;
	status: AppRequestStatus;
	authenticated: boolean;
	/** the api server this browser is set to is the one the request is for: the
	 * default server for a version 1 request, the one it names for version 2 */
	serverMatches: boolean;
	/** the host of the api server the browser is set to, for the message */
	apiHost: string;
	done: DoneState;
	identity: IdentityState;
	armed: boolean;
	/** Approve was clicked and has not finished: the sealing code is loading or the code is being minted */
	busy: boolean;
	/** ... and a code is being minted: nothing can call that back, so Cancel waits too */
	minting: boolean;
	problem: ApprovalProblem;
	/** the sealed address is still held for the Open URnetwork button */
	canOpen: boolean;
}

export type ApprovalModel =
	| { kind: "blocked"; reason: "framed" | "opener" }
	| { kind: "request"; problem: "invalid" | "stale" | "unsupported" }
	| { kind: "redirecting" }
	// the browser is set to a server the request is not for. `requestedHost` is
	// the host a version 2 request names (the card offers Switch to it) and null
	// for a version 1 request (the card offers the default server). `armed`: the
	// card has been in front of the person for a moment, and only then do Switch
	// and Use the default server answer (Cancel always does)
	| {
			kind: "server";
			label: string;
			apiHost: string;
			requestedHost: string | null;
			armed: boolean;
	  }
	| { kind: "checking" }
	| {
			kind: "identity";
			problem: "failed" | "unreadable" | "no-sign-in-method";
	  }
	| {
			kind: "consent";
			label: string;
			networkName: string;
			// the host of the api server the code would be minted on, for a version 2
			// request (the default server is not named); null for version 1
			server: string | null;
			armed: boolean;
			busy: boolean;
			minting: boolean;
			problem: ApprovalProblem;
	  }
	| { kind: "approved"; canOpen: boolean }
	| { kind: "cancelled" }
	| { kind: "expired" }
	| { kind: "session-changed" };

export function deriveApprovalModel(i: ViewInputs): ApprovalModel {
	// the end states first: once the answer has gone out, nothing else matters
	if (i.done === "approved") return { kind: "approved", canOpen: i.canOpen };
	if (i.done === "cancelled") return { kind: "cancelled" };
	if (i.done === "expired") return { kind: "expired" };
	if (i.done === "session-changed") return { kind: "session-changed" };

	if (i.gate !== "ok") return { kind: "blocked", reason: i.gate };

	// a request that is missing is as invalid as one that is damaged: the contract
	// gives both the same generic card, and nothing else about it
	if (i.status.kind !== "ready") {
		return {
			kind: "request",
			problem: i.status.kind === "none" ? "invalid" : i.status.kind,
		};
	}
	const row = platformRow(i.status.request.platform);
	if (row === null) return { kind: "request", problem: "invalid" };

	// The server comes before the sign-in and before the account check: a browser
	// that is set to another server is not sent to sign in there, and no call is
	// made with its session.
	if (!i.serverMatches) {
		return {
			kind: "server",
			label: row.label,
			apiHost: i.apiHost,
			requestedHost: i.status.request.api ?? null,
			armed: i.armed,
		};
	}
	if (!i.authenticated) return { kind: "redirecting" };

	switch (i.identity.kind) {
		case "idle":
		case "loading":
			return { kind: "checking" };
		case "signed-out":
			return { kind: "redirecting" };
		case "failed":
		case "unreadable":
		case "no-sign-in-method":
			return { kind: "identity", problem: i.identity.kind };
		case "ready":
			break;
	}

	return {
		kind: "consent",
		label: row.label,
		networkName: i.identity.networkName,
		// the server is the one the request names (the card is only here because it is),
		// and the person is told which, since the network's name is the server's own word
		server: i.status.request.api === undefined ? null : i.apiHost,
		// after `broken` another Approve could only be refused: the page says to reload
		armed: i.armed && i.problem !== "broken",
		busy: i.busy,
		minting: i.minting,
		problem: i.problem,
	};
}
