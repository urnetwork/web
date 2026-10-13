import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
	CUSTOM_API_BASE_KEY,
	DEFAULT_API_BASE,
	createAuthCode,
	fetchNetworkUser,
	getApiBase,
} from "../services/api";
import { parseJwtClaims } from "../services/authCodeUrl";
import {
	APP_REQUEST_PATH,
	evaluateAppGate,
	logAppAuthEvent,
	type AppGate,
} from "../services/appAuth";
import {
	createApprovalController,
	resolveIdentity,
} from "../services/appApproval";
import {
	deriveApprovalModel,
	type ApprovalProblem,
	type DoneState,
	type IdentityState,
} from "../services/appApprovalView";
import {
	appRequestStorage,
	clearAppRequest,
	markSignInPending,
	resolveAppRequest,
	type AppRequestStatus,
} from "../services/appRequestStash";
import { AppApprovalView } from "../components/AppApprovalView";

// A native app (today: URnetwork for Windows) asks the signed-in person to
// approve its sign-in. The contract, the checks and the one navigation this
// page makes are described in README.md ("Approving a native app"); this file
// is the thin shell around services/appAuth, appApproval and appRequestStash.
// It is not the browser-extension flow: /login-extension is a separate,
// frozen contract and shares nothing with this page.

/** Approve ignores the person for this long after the card is in front of them
 * (visible, and the window has the focus), so an Enter that was already queued
 * cannot approve. */
const APPROVE_DELAY_MS = 800;
/** The sealed address is kept for the Open URnetwork button this long. */
const OPEN_BUTTON_MS = 60_000;
/** What this page waits on is given up after this long: the two api calls get
 * a Try again instead of a card with nothing to press, and the sealing chunk
 * (the one download Approve needs) gets the card that says to reload. */
const API_TIMEOUT_MS = 15_000;

const readStoredToken = (): string | null => {
	try {
		return localStorage.getItem("byToken");
	} catch {
		return null;
	}
};
const networkIdOf = (token: string): string | null =>
	parseJwtClaims(token)?.network_id ?? null;

/** Runs an api call with a signal that aborts it after API_TIMEOUT_MS. The api
 * layer reports an aborted request like any other failure, as an error answer. */
async function withTimeout<T>(
	run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const abort = new AbortController();
	const timer = window.setTimeout(() => abort.abort(), API_TIMEOUT_MS);
	try {
		return await run(abort.signal);
	} finally {
		window.clearTimeout(timer);
	}
}

/** Gives a download API_TIMEOUT_MS to arrive; after that it has failed. An
 * import cannot be aborted, so the wait is raced against a timer: the answer is
 * a rejection, and a chunk that comes in later is ignored. */
function withDeadline<T>(download: Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(
			() => reject(new Error("the download took too long")),
			API_TIMEOUT_MS,
		);
		download.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				window.clearTimeout(timer);
				reject(error);
			},
		);
	});
}

// the NaCl code is its own chunk, fetched only when an approval is near
const importSeal = () => import("../services/appSeal");

// One controller for the whole page load, so "one mint per page load" also
// holds if this component is mounted again.
const controller = createApprovalController({
	now: () => Date.now(),
	readToken: readStoredToken,
	networkIdOf,
	usesDefaultServer: () => getApiBase() === DEFAULT_API_BASE,
	createAuthCode: (token, minutes, uses) =>
		withTimeout((signal) => createAuthCode(token, minutes, uses, signal)),
	// the one network dependency of Approve besides the api: it is given the same
	// 15 s, and a chunk that fails or does not come is a card that says to reload
	loadSeal: async () => (await withDeadline(importSeal())).sealCode,
});

/** Read once, before the first paint: nothing on the page is interactive unless
 * this is the top window and nothing opened it. */
function readGate(): AppGate {
	try {
		return evaluateAppGate({
			self: window.self,
			top: window.top,
			opener: window.opener,
		});
	} catch {
		// cross-origin access to a parent can throw; treat that as framed
		return "framed";
	}
}

/** Is this window in front of the person: the tab is showing and the window has
 * the focus. Approve only counts while it is. */
function hasAttention(): boolean {
	try {
		return document.visibilityState === "visible" && document.hasFocus();
	} catch {
		return false;
	}
}

const hostOf = (base: string): string => {
	try {
		return new URL(base).host.slice(0, 120);
	} catch {
		return base.slice(0, 120);
	}
};

const LoginApp: React.FC = () => {
	const {
		isAuthenticated,
		token,
		setToken,
		logout,
		isLoggingOut,
		isTransitioning,
	} = useAuth();

	// decided once, synchronously: the gates and the request. Only the one
	// canonical path counts; any other spelling of it is not this page.
	const [gate] = useState<AppGate>(readGate);
	// changes only to `invalid`, when Approve finds the request names a key
	// nothing can be sealed to
	const [status, setStatus] = useState<AppRequestStatus>(() =>
		window.location.pathname === APP_REQUEST_PATH
			? resolveAppRequest(appRequestStorage(), Date.now())
			: { kind: "invalid" },
	);
	const request = status.kind === "ready" ? status.request : null;

	const [identity, setIdentity] = useState<IdentityState>({ kind: "idle" });
	const [attention, setAttention] = useState<boolean>(hasAttention);
	const [armed, setArmed] = useState(false);
	// what Approve is waiting for: the sealing code to load, or the code to be
	// minted. Cancel still answers during the first and never during the second.
	const [pending, setPending] = useState<null | "loading" | "minting">(null);
	const busy = pending !== null;
	const [problem, setProblem] = useState<ApprovalProblem>(null);
	const [done, setDone] = useState<DoneState>(null);
	const [openUrl, setOpenUrl] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);
	// the api server is read on every render; this only re-renders after it changed
	const [, setServerChanges] = useState(0);

	const defaultServer = getApiBase() === DEFAULT_API_BASE;
	// while the session is being swapped or ended, the stored one is about to change
	const settling = isLoggingOut || isTransitioning;

	// The api turned this session away. The stored copy goes only if it is still
	// that one: another tab may have signed in to something newer since (nothing
	// here hears of it), and that session is not this page's to end. This page's
	// own session ends either way, and signing in again finds whatever is stored.
	const endSession = useCallback(
		(rejected: string | null) => {
			if (rejected !== null && readStoredToken() === rejected) {
				try {
					localStorage.removeItem("byToken");
				} catch {
					// nothing stored, nothing to remove
				}
			}
			setToken(null);
		},
		[setToken],
	);

	// Signed out: the request is already kept in this tab (the stash), so go and
	// sign in. The marker tells the way back (Layout) that this tab was sent
	// here by this page, so it returns to the card afterwards and no other tab is
	// ever taken over.
	const needsSignIn = gate === "ok" && request !== null && !isAuthenticated;
	useEffect(() => {
		if (needsSignIn) {
			markSignInPending(appRequestStorage(), Date.now());
			window.location.replace("/");
		}
	}, [needsSignIn]);

	// Ask the api who this is before showing the card. A 401 ends the session.
	const checking =
		gate === "ok" &&
		request !== null &&
		isAuthenticated &&
		defaultServer &&
		done === null;
	useEffect(() => {
		if (!checking || !token) return;
		let current = true;
		setIdentity({ kind: "loading" });
		void withTimeout((signal) => fetchNetworkUser(token, signal)).then(
			(response) => {
				if (!current) return;
				const outcome = resolveIdentity(token, response, networkIdOf);
				if (outcome.kind === "signed-out") endSession(token);
				setIdentity(outcome);
			},
		);
		return () => {
			current = false;
		};
	}, [checking, token, retry, endSession]);

	// Fetch the sealing chunk while the person reads the card. A failure here is
	// not shown: the click that needs the chunk finds out, and says to reload.
	const identityReady = identity.kind === "ready";
	useEffect(() => {
		if (identityReady) {
			void importSeal().catch(() => undefined);
		}
	}, [identityReady]);

	// Whether the card is in front of the person: the tab showing and the window
	// focused. It changes when the tab is hidden or shown and when the window
	// loses or gets the focus.
	useEffect(() => {
		const update = () => setAttention(hasAttention());
		window.addEventListener("focus", update);
		window.addEventListener("blur", update);
		document.addEventListener("visibilitychange", update);
		update();
		return () => {
			window.removeEventListener("focus", update);
			window.removeEventListener("blur", update);
			document.removeEventListener("visibilitychange", update);
		};
	}, []);

	// Approve is inert for a moment after the card is in front of the person,
	// and again whenever it stops being (the tab is hidden, the window loses the
	// focus) or the account on the card changes.
	const accountId = identity.kind === "ready" ? identity.networkId : null;
	const consentShown = identityReady && done === null;
	useEffect(() => {
		if (!consentShown || !attention) return;
		const timer = window.setTimeout(() => setArmed(true), APPROVE_DELAY_MS);
		return () => {
			window.clearTimeout(timer);
			setArmed(false);
		};
	}, [consentShown, attention, accountId]);

	// A second link opened in this tab by editing only the fragment: start over
	// with it (the first script keeps the new request and strips the address).
	useEffect(() => {
		const onHashChange = () => {
			if (window.location.hash) window.location.reload();
		};
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	// The sealed address is held for the Open URnetwork button, then dropped.
	useEffect(() => {
		if (openUrl === null) return;
		const timer = window.setTimeout(() => setOpenUrl(null), OPEN_BUTTON_MS);
		return () => window.clearTimeout(timer);
	}, [openUrl]);

	const handleApprove = async (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		if (!event.isTrusted) return;
		if (request === null || identity.kind !== "ready") return;
		if (!armed || busy || settling || !hasAttention()) return;
		// (a click that raced this one never takes `minting` back to `loading`)
		setPending((now) => now ?? "loading");
		setProblem(null);
		const outcome = await controller.approve(
			request,
			identity.networkId,
			// from here a code is being asked for, and Cancel cannot call it back
			() => setPending("minting"),
		);
		switch (outcome.kind) {
			case "approved":
				// straight away, while the click still counts as a user action
				try {
					window.location.assign(outcome.url);
				} catch {
					// the Open URnetwork button below tries again
				}
				logAppAuthEvent("approve", request.platform);
				clearAppRequest(appRequestStorage());
				setOpenUrl(outcome.url);
				setDone("approved");
				break;
			case "signed-out":
				setPending(null);
				// the mint used the stored session: that is the one the api turned away
				endSession(readStoredToken());
				break;
			case "stale":
				clearAppRequest(appRequestStorage());
				setDone("expired");
				break;
			case "identity-changed":
				setDone("session-changed");
				break;
			case "custom-server":
				setPending(null);
				setServerChanges((n) => n + 1);
				break;
			case "too-many":
				setPending(null);
				setProblem("too-many");
				break;
			case "seal-unavailable":
				// nothing was minted, and the browser keeps a failed import for the life
				// of the document: another click cannot help, a reload can
				setPending(null);
				setProblem("broken");
				break;
			case "bad-key":
				// the link names a key nothing can be sealed to: it is not a valid link,
				// and no try would change that
				clearAppRequest(appRequestStorage());
				setPending(null);
				setStatus({ kind: "invalid" });
				break;
			case "broken":
				// a code was minted that could not become an answer: reload, not retry
				setPending(null);
				setProblem("broken");
				break;
			case "busy":
			case "already-approved":
			case "already-denied":
				// another click owns this
				break;
			default:
				setPending(null);
				setProblem("failed");
		}
	};

	const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (!event.isTrusted) return;
		if (request === null) return;
		// answered while Approve is only waiting for the sealing code; refused
		// (busy) from the moment a code is being minted
		const outcome = controller.deny(request);
		if (outcome.kind !== "denied") return;
		try {
			window.location.assign(outcome.url);
		} catch {
			// nothing was shared either way
		}
		logAppAuthEvent("deny", request.platform);
		clearAppRequest(appRequestStorage());
		setDone("cancelled");
	};

	const handleOpenApp = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (!event.isTrusted || openUrl === null) return;
		window.location.assign(openUrl);
	};

	const handleUseDefaultServer = () => {
		try {
			localStorage.removeItem(CUSTOM_API_BASE_KEY);
		} catch {
			// nothing stored, nothing to remove
		}
		setServerChanges((n) => n + 1);
	};

	const model = deriveApprovalModel({
		gate,
		status,
		authenticated: isAuthenticated,
		defaultServer,
		apiHost: hostOf(getApiBase()),
		done,
		identity,
		armed: armed && !settling,
		busy,
		minting: pending === "minting",
		problem,
		canOpen: openUrl !== null,
	});

	return (
		<AppApprovalView
			model={model}
			actions={{
				onCancel: handleCancel,
				onApprove: handleApprove,
				onOpenApp: handleOpenApp,
				onSignOut: () => logout(),
				onUseDefaultServer: handleUseDefaultServer,
				onRetry: () => setRetry((n) => n + 1),
				onReload: () => window.location.reload(),
			}}
		/>
	);
};

export default LoginApp;
