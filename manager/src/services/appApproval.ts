// The approval controller: everything that must be true between the person's
// click on Approve and the page leaving for the app.
//
// Pure: every effect is a port, so node --test drives it without React or a
// browser (tests/app-approval.test.mjs). The page (pages/LoginApp.tsx) wires
// the ports to the real session, api and sealing code.
//
// The rules, in the order they are applied at a click:
//   - single flight, and one mint per page load: a second click while one is in
//     flight is `busy`, after a mint it is `already-approved`;
//   - the sealing code is loaded, and tried once on a throwaway string as long
//     as the answer's budget allows (MAX_CODE_LENGTH), all the way to the
//     address, before anything is minted: no code waits for a download, and none
//     is minted for a key the page cannot seal to or an address it cannot build.
//     A download that fails (the page gives it a time limit of its own) is
//     `seal-unavailable`, a key that cannot be sealed to is `bad-key`; neither
//     is `failed`, because for neither can another click help. Until the code is
//     asked for, Cancel still answers: nothing has been minted, and the click
//     that was waiting for the download stops there (`already-denied`);
//   - the request is checked again for age;
//   - the stored session is read again and must belong to the network the card
//     displayed (the card may be minutes old; another tab may have signed in
//     to something else), and the api server must still be the default one
//     (the bearer token is never sent to a server the person typed in);
//   - one code of 2 minutes and 1 use is minted, sealed to the app's key at
//     once and never stored, logged or returned in the clear.
import {
	BadPublicKeyError,
	CODE_MINUTES,
	CODE_USES,
	MAX_CODE_LENGTH,
	buildApproveReturn,
	buildDenyReturn,
	isFresh,
	type AppRequest,
	type Sealed,
} from "./appAuth.ts";

export type SealFn = (code: string, request: AppRequest) => Sealed;

/** What the dry run before the mint seals: not a secret, thrown away, and as
 * long as the answer's budget allows, so an address that cannot be built shows
 * up here and not after a code has been minted. */
const DRY_RUN_CODE = "A".repeat(MAX_CODE_LENGTH);

export type ApprovalOutcome =
	| { kind: "approved"; url: string }
	| { kind: "denied"; url: string }
	| { kind: "stale" }
	| { kind: "identity-changed" }
	| { kind: "signed-out" }
	| { kind: "custom-server" }
	| { kind: "too-many" }
	| { kind: "failed" }
	// the sealing code could not be loaded (the download failed, or took too long).
	// Nothing was minted. The browser keeps a failed import for the life of the
	// document, so another click is not the way out: the page has to be reloaded
	| { kind: "seal-unavailable" }
	// the request's public key is one the page cannot seal to (a point of small
	// order): no retry can work, so the request is not a valid one
	| { kind: "bad-key" }
	// a code was minted but could not become an answer: reload, do not retry
	| { kind: "broken" }
	| { kind: "busy" }
	| { kind: "already-approved" }
	| { kind: "already-denied" };

export interface CodeResult {
	auth_code?: string;
	error?: {
		auth_code_limit_exceeded?: boolean;
		message?: string;
		status?: number;
	};
}

export interface ApprovalPorts {
	now(): number;
	/** the stored session, read again at the click (not the copy the card was drawn from) */
	readToken(): string | null;
	networkIdOf(token: string): string | null;
	/** false when the person has pointed the dashboard at another api server */
	usesDefaultServer(): boolean;
	createAuthCode(
		token: string,
		minutes: number,
		uses: number,
	): Promise<CodeResult>;
	/** resolves to the sealing function (a lazy chunk); rejects if it cannot load.
	 * The page gives it a time limit, so a download that never ends rejects too:
	 * nothing here waits for ever. */
	loadSeal(): Promise<SealFn>;
}

export interface ApprovalController {
	/** `shownNetworkId` is the network the consent card displayed. `onMinting` is
	 * called once, just before the code is asked for, and not at all if the click
	 * ends before that: from then on Cancel is refused (`busy`), until then it is
	 * not. */
	approve(
		request: AppRequest,
		shownNetworkId: string,
		onMinting?: () => void,
	): Promise<ApprovalOutcome>;
	deny(request: AppRequest): ApprovalOutcome;
}

export function createApprovalController(
	ports: ApprovalPorts,
): ApprovalController {
	let inFlight = false;
	// the code is being asked for: it cannot be called back, so Cancel waits
	let minting = false;
	// idle: nothing settled. approved: the answer was handed out. denied: Cancel
	// was handed out. broken: a code was minted but could not be turned into an
	// answer; the page must be reloaded rather than mint a second one.
	let phase: "idle" | "approved" | "denied" | "broken" = "idle";
	// read through a function: a Cancel can land while an await is pending, and
	// the checks above must not make the compiler think the phase cannot change
	const wasDenied = () => phase === "denied";

	return {
		async approve(request, shownNetworkId, onMinting) {
			if (phase === "approved") return { kind: "already-approved" };
			if (phase === "denied") return { kind: "already-denied" };
			if (phase === "broken") return { kind: "broken" };
			if (inFlight) return { kind: "busy" };
			inFlight = true;
			try {
				let seal: SealFn;
				try {
					seal = await ports.loadSeal();
				} catch {
					// not `failed`: a failed import is kept by the browser, so this click
					// cannot be tried again. Nothing was minted, and nothing is latched.
					return wasDenied()
						? { kind: "already-denied" }
						: { kind: "seal-unavailable" };
				}
				// Cancel was answered while the sealing code was on its way: the person
				// said no, and no code is minted for a request that was refused
				if (wasDenied()) return { kind: "already-denied" };

				// prove the answer can be built before a code exists: the key can be
				// sealed to, and the longest code the budget allows still makes an
				// address that fits. A code is never minted for an answer that could
				// not be built.
				try {
					buildApproveReturn(request, seal(DRY_RUN_CODE, request));
				} catch (error) {
					// a key the page cannot seal to is no hiccup: another click cannot help
					return error instanceof BadPublicKeyError
						? { kind: "bad-key" }
						: { kind: "failed" };
				}

				if (!isFresh(request, ports.now())) return { kind: "stale" };
				const token = ports.readToken();
				if (!token) return { kind: "signed-out" };
				const networkId = ports.networkIdOf(token);
				if (
					!shownNetworkId ||
					!networkId ||
					networkId.toLowerCase() !== shownNetworkId.toLowerCase()
				) {
					return { kind: "identity-changed" };
				}
				if (!ports.usesDefaultServer())
					return { kind: "custom-server" };

				// from here a code is being asked for: no Cancel can call it back
				minting = true;
				onMinting?.();
				const result = await ports.createAuthCode(
					token,
					CODE_MINUTES,
					CODE_USES,
				);
				if (result.error?.status === 401) return { kind: "signed-out" };
				if (result.error?.auth_code_limit_exceeded)
					return { kind: "too-many" };
				const code = result.auth_code;
				if (result.error || typeof code !== "string" || code === "") {
					return { kind: "failed" };
				}

				// a code exists from here on: sealed before it leaves this function,
				// held nowhere else, and never minted twice for one page load
				phase = "broken";
				const url = buildApproveReturn(request, seal(code, request));
				phase = "approved";
				return { kind: "approved", url };
			} catch {
				// after a mint the page must be reloaded, not retried
				return phase === "broken"
					? { kind: "broken" }
					: { kind: "failed" };
			} finally {
				inFlight = false;
				minting = false;
			}
		},

		deny(request) {
			if (phase === "approved") return { kind: "already-approved" };
			if (phase === "denied") return { kind: "already-denied" };
			// a code that is being asked for cannot be called back; a sealing code
			// that is still loading can be given up
			if (minting) return { kind: "busy" };
			try {
				const url = buildDenyReturn(request);
				phase = "denied";
				return { kind: "denied", url };
			} catch {
				return { kind: "failed" };
			}
		},
	};
}

export interface NetworkUserLike {
	network_user?: {
		network_name?: string;
		auth_types?: string[];
	};
	error?: { message?: string; status?: number };
}

export type IdentityOutcome =
	| { kind: "ready"; networkId: string; networkName: string }
	| { kind: "signed-out" } // the api no longer accepts the session
	| { kind: "no-sign-in-method" } // nothing the app could use to get back in
	| { kind: "unreadable" } // the session names no network, or the api returned no name
	| { kind: "failed" }; // could not ask: try again

/** What the consent card may show: who would be signed in, as the server says it.
 * The name comes from the server, not from the session's claims (which may be
 * old); the network id is the session's, kept to compare at the click. */
export function resolveIdentity(
	token: string,
	response: NetworkUserLike,
	networkIdOf: (token: string) => string | null,
): IdentityOutcome {
	if (response.error) {
		return response.error.status === 401
			? { kind: "signed-out" }
			: { kind: "failed" };
	}
	const user = response.network_user;
	if (!user) return { kind: "failed" };
	const networkId = networkIdOf(token);
	const networkName =
		typeof user.network_name === "string" ? user.network_name.trim() : "";
	if (!networkId || !networkName) return { kind: "unreadable" };
	if (!Array.isArray(user.auth_types) || user.auth_types.length === 0) {
		return { kind: "no-sign-in-method" };
	}
	return { kind: "ready", networkId, networkName };
}
