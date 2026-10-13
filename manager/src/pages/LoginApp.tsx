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
	isFresh,
	isServerForRequest,
	logAppAuthEvent,
	serverChoiceFor,
	type AppGate,
	type AppRequest,
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
import { readSession, serverMark } from "../services/sessionBinding";
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
/** An api call is given up after this long: the account check gets a Try again
 * and the mint a message, instead of a card with nothing to press. 30 s, because
 * the api of some networks is slow. */
const API_TIMEOUT_MS = 30_000;
/** The sealing chunk (the one download Approve needs) gets its own, shorter
 * limit: it comes from this page's own host, not from the person's network, and
 * one that does not come gets the card that says to reload. */
const SEAL_TIMEOUT_MS = 15_000;

/** The stored session, if the server that issued it is the one this browser is set to
 * now (one stored with no record of its server counts, as it always did): a session
 * that belongs to another server is nobody's to send here. */
const readStoredToken = (): string | null => {
	try {
		return (
			readSession(
				localStorage,
				serverMark(getApiBase(), DEFAULT_API_BASE),
			)?.token ?? null
		);
	} catch {
		return null;
	}
};
const networkIdOf = (token: string): string | null =>
	parseJwtClaims(token)?.network_id ?? null;

/** Runs an api call with a signal that aborts it after API_TIMEOUT_MS, or sooner when
 * `cancel` aborts (the caller no longer wants the answer). The api layer reports an
 * aborted request like any other failure, as an error answer; a call that was called
 * back reports the caller's reason, so a line in the console says what happened. */
async function withTimeout<T>(
	run: (signal: AbortSignal) => Promise<T>,
	cancel?: AbortSignal,
): Promise<T> {
	const abort = new AbortController();
	const timer = window.setTimeout(() => abort.abort(), API_TIMEOUT_MS);
	const stop = () => abort.abort(cancel?.reason);
	cancel?.addEventListener("abort", stop);
	if (cancel?.aborted) stop();
	try {
		return await run(abort.signal);
	} finally {
		window.clearTimeout(timer);
		cancel?.removeEventListener("abort", stop);
	}
}

/** Gives a download SEAL_TIMEOUT_MS to arrive; after that it has failed. An
 * import cannot be aborted, so the wait is raced against a timer: the answer is
 * a rejection, and a chunk that comes in later is ignored. */
function withDeadline<T>(download: Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(
			() => reject(new Error("the download took too long")),
			SEAL_TIMEOUT_MS,
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

/** Is the api server this browser is set to, right now, the one `request` is
 * for: the default server (version 1) or the one it names (version 2). The
 * server is read from storage on every call, so this is always the live answer.
 * The page's origin stands in for its address: a relative api base resolves
 * against it. */
const serverFits = (request: AppRequest): boolean =>
	isServerForRequest(
		request,
		getApiBase(),
		DEFAULT_API_BASE,
		window.location.origin,
	);

// One controller for the whole page load, so "one mint per page load" also
// holds if this component is mounted again.
const controller = createApprovalController({
	now: () => Date.now(),
	readToken: readStoredToken,
	networkIdOf,
	serverMatches: serverFits,
	createAuthCode: (token, minutes, uses) =>
		withTimeout((signal) => createAuthCode(token, minutes, uses, signal)),
	// the one network dependency of Approve besides the api: it is given its own
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

/** The server for the card, as text: its host, and for a server that is not https
 * the scheme too, so that the same host over http cannot read as the same server.
 * A relative base is placed on this page's own host, as the api calls place it. */
const hostOf = (base: string): string => {
	try {
		const url = new URL(base, window.location.origin);
		return (
			url.protocol === "https:"
				? url.host
				: `${url.protocol}//${url.host}`
		).slice(0, 120);
	} catch {
		return base.slice(0, 120);
	}
};

/** Takes the stored session out of this browser. True only when it is really
 * gone: Switch changes the server after that and not before, so a session that
 * cannot be removed never meets the new server. */
function forgetStoredSession(): boolean {
	try {
		localStorage.removeItem("byToken");
		return localStorage.getItem("byToken") === null;
	} catch {
		return false;
	}
}

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
	// the card (and account) whose buttons have waited for their moment, or null
	const [armedFor, setArmedFor] = useState<string | null>(null);
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

	// The api server this browser is set to is the one the request is for. Judged
	// before anything else about the session: a mismatch sends nobody to sign in
	// and makes no api call with the session (see the effects below).
	const serverMatches = request !== null && serverFits(request);
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
	// ever taken over. Only once the server is the right one: a person whose
	// browser is set to another server sees that card first, and signs in after
	// Switch (which brings this very request back here).
	const needsSignIn =
		gate === "ok" && request !== null && serverMatches && !isAuthenticated;
	useEffect(() => {
		if (needsSignIn) {
			markSignInPending(appRequestStorage(), Date.now());
			window.location.replace("/");
		}
	}, [needsSignIn]);

	// Ask the api who this is before showing the card. A 401 ends the session.
	// Never on a server the request is not for: the session is not sent there.
	const checking =
		gate === "ok" &&
		request !== null &&
		isAuthenticated &&
		serverMatches &&
		done === null;
	useEffect(() => {
		if (!checking || !token) return;
		// The page's session must still be the one the browser has stored for this server.
		// Another tab may have signed out, moved the browser to another server (Switch) or
		// signed in to something else since, and this page hears of none of it: its copy is
		// then nobody's to send. It signs itself out instead; the way to sign-in finds
		// whatever is stored now.
		if (readStoredToken() !== token) {
			setToken(null);
			return;
		}
		let current = true;
		// a run that is torn down no longer wants its answer, and must not hold the
		// connection: the next run asks the very same question
		const cancel = new AbortController();
		setIdentity({ kind: "loading" });
		void withTimeout(
			(signal) => fetchNetworkUser(token, signal),
			cancel.signal,
		).then((response) => {
			if (!current) return;
			const outcome = resolveIdentity(token, response, networkIdOf);
			if (outcome.kind === "signed-out") endSession(token);
			setIdentity(outcome);
		});
		return () => {
			current = false;
			cancel.abort(
				new Error(
					"called back: this run of the account check was replaced",
				),
			);
		};
	}, [checking, token, retry, endSession, setToken]);

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

	// The buttons that do something are inert for a moment after their card is in front of
	// the person, and again whenever it stops being (the tab is hidden, the window loses
	// the focus), the account on the card changes, or another card takes its place. Two
	// cards have them: the consent card (Approve) and the one that offers to leave the
	// server (Switch, Use the default server). Armed is kept as the card it was earned on,
	// so a card that replaces the other under the pointer, as the server card does when
	// another tab moves the browser, is inert in the very render it appears: a second
	// click aimed at Approve must not land on Switch.
	const accountId = identity.kind === "ready" ? identity.networkId : null;
	const serverCardShown =
		gate === "ok" && request !== null && !serverMatches && done === null;
	const consentShown = identityReady && done === null;
	const cardKey = serverCardShown
		? "server"
		: consentShown
			? `consent:${accountId}`
			: null;
	useEffect(() => {
		if (cardKey === null || !attention) return;
		const timer = window.setTimeout(
			() => setArmedFor(cardKey),
			APPROVE_DELAY_MS,
		);
		return () => {
			window.clearTimeout(timer);
			setArmedFor(null);
		};
	}, [cardKey, attention]);
	const armed = cardKey !== null && armedFor === cardKey;
	// each button answers only on its own card: a click that reaches a handler while another
	// card is up (the render is a moment behind the storage) does nothing
	const consentArmed = armed && !serverCardShown;
	const serverArmed = armed && serverCardShown;

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
		if (!consentArmed || busy || settling || !hasAttention()) return;
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

	// "Use the default server" (a version 1 request): like Switch, it leaves the
	// server this browser is set to, so the stored session goes first. It belongs
	// to the server being left, and must not be sent to the default one in the
	// account check that follows. Like Approve and Switch it needs a trusted click
	// on a card that has been in front of the person for a moment.
	const handleUseDefaultServer = (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		if (!event.isTrusted) return;
		if (!serverArmed || !hasAttention()) return;
		if (settling || !forgetStoredSession()) return;
		setToken(null);
		try {
			localStorage.removeItem(CUSTOM_API_BASE_KEY);
		} catch {
			// nothing stored, nothing to remove
		}
		setServerChanges((n) => n + 1);
	};

	// Switch (a version 2 request only): this browser leaves its server for the
	// one the app is on. The stored session belongs to the server being left, so
	// it goes first, and the server changes only once it is gone: the session is
	// never sent to the new one. The auth context's copy is dropped before the
	// server is written, so no render has a session and the new server together
	// (the auth context of every other tab hears of the change and signs out too).
	// Not logout(): that animates and toasts. The needsSignIn effect then sends
	// the tab to sign in, and Layout brings it back to this request. The click
	// counts only on a card that has been in front of the person for a moment, as
	// Approve does: a click meant for the window that opened this one (the second
	// of a double click) must not land on it.
	// A request that has gone stale while the card was shown is told so before
	// anything is touched: the sign-in that follows would end on the dashboard of
	// the new server, with the app still waiting.
	const handleSwitchServer = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (!event.isTrusted) return;
		if (request === null || request.api === undefined || settling) return;
		if (!serverArmed || !hasAttention()) return;
		if (!isFresh(request, Date.now())) {
			clearAppRequest(appRequestStorage());
			setDone("expired");
			return;
		}
		const choice = serverChoiceFor(
			request.api,
			DEFAULT_API_BASE,
			window.location.origin,
		);
		if (choice === null) return;
		if (!forgetStoredSession()) return;
		setToken(null);
		try {
			if (choice.kind === "default") {
				localStorage.removeItem(CUSTOM_API_BASE_KEY);
			} else {
				localStorage.setItem(CUSTOM_API_BASE_KEY, choice.base);
			}
		} catch {
			// the server stays as it was, and so does the card
		}
		setServerChanges((n) => n + 1);
	};

	const model = deriveApprovalModel({
		gate,
		status,
		authenticated: isAuthenticated,
		serverMatches,
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
				onSwitchServer: handleSwitchServer,
				onRetry: () => setRetry((n) => n + 1),
				onReload: () => window.location.reload(),
			}}
		/>
	);
};

export default LoginApp;
