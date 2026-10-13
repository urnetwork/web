import React from "react";
import { AlertTriangle, CheckCircle, Loader2, Shield } from "lucide-react";
import type { ApprovalModel } from "../services/appApprovalView";

type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

export interface ApprovalActions {
	onCancel: ClickHandler;
	onApprove: ClickHandler;
	onOpenApp: ClickHandler;
	onSignOut: () => void;
	onUseDefaultServer: () => void;
	onRetry: () => void;
	onReload: () => void;
}

const CARD =
	"bg-ur-panel rounded-ur border border-ur-border shadow-ur-flat p-8";
const FOCUS =
	"focus:outline-none focus-visible:ring-2 focus-visible:ring-ur-blue-light";
const SECONDARY_BUTTON = `py-3 px-4 rounded-lg font-medium text-lg transition-all duration-200 bg-ur-raised hover:bg-ur-hover text-ur-white border border-ur-border disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS}`;
const PRIMARY_BUTTON = `py-3 px-4 rounded-lg font-medium text-lg transition-all duration-200 bg-ur-blue hover:bg-ur-blue text-ur-white shadow-ur-flat disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${FOCUS}`;
const LINK_BUTTON = `text-base text-ur-blue-light hover:text-ur-white underline underline-offset-2 ${FOCUS}`;

type Tone = "info" | "warn" | "ok";

const TONES: Record<Tone, string> = {
	info: "bg-ur-blue/20 text-ur-blue-light",
	warn: "bg-ur-coral/20 text-ur-coral",
	ok: "bg-ur-green/10 text-ur-green",
};

const Notice: React.FC<{
	tone: Tone;
	title: string;
	children?: React.ReactNode;
}> = ({ tone, title, children }) => (
	<div className="max-w-lg mx-auto">
		<div className={CARD} role="status" aria-live="polite">
			<div className="flex items-center space-x-3 mb-4">
				<div className={`p-2 rounded-lg ${TONES[tone]}`}>
					{tone === "ok" ? (
						<CheckCircle size={24} />
					) : tone === "warn" ? (
						<AlertTriangle size={24} />
					) : (
						<Shield size={24} />
					)}
				</div>
				<h2 className="text-xl font-bold text-ur-white">{title}</h2>
			</div>
			<div className="space-y-4 text-ur-gray leading-relaxed">
				{children}
			</div>
		</div>
	</div>
);

/** What /login-app shows. A pure function of the model: every decision is made
 * in deriveApprovalModel, every effect in the page that owns the actions.
 * Request values never reach this file; the platform name is the closed
 * table's label and the network name is the server's, rendered as text. */
export const AppApprovalView: React.FC<{
	model: ApprovalModel;
	actions: ApprovalActions;
}> = ({ model, actions }) => {
	switch (model.kind) {
		case "blocked":
			return (
				<Notice tone="warn" title="Open this from URnetwork">
					<p>
						{model.reason === "framed"
							? "For your security this page cannot be used inside another page."
							: "For your security this page cannot be used from a window that another page opened."}{" "}
						Start again from the URnetwork app.
					</p>
				</Notice>
			);

		case "request":
			return (
				<Notice
					tone="warn"
					title={
						model.problem === "stale"
							? "Request expired"
							: model.problem === "unsupported"
								? "Update URnetwork"
								: "Invalid request"
					}
				>
					<p>
						{model.problem === "stale"
							? "This request has expired. Start again from URnetwork."
							: model.problem === "unsupported"
								? "This version of URnetwork isn't supported yet. Update the app and try again."
								: "This sign-in link isn't valid. Start again from the URnetwork app."}
					</p>
				</Notice>
			);

		case "redirecting":
			return (
				<Notice tone="info" title="Sign in first">
					<p className="flex items-center space-x-2">
						<Loader2 size={16} className="animate-spin" />
						<span>Taking you to sign in...</span>
					</p>
				</Notice>
			);

		case "server":
			return (
				<Notice tone="warn" title="Different API server">
					<p>
						This browser is set to use a different API server,{" "}
						<span className="font-mono break-all">
							{model.apiHost}
						</span>
						. Approving a sign-in only works with the default
						server.
					</p>
					<button
						type="button"
						onClick={actions.onUseDefaultServer}
						className={SECONDARY_BUTTON}
					>
						Use the default server
					</button>
				</Notice>
			);

		case "checking":
			return (
				<Notice tone="info" title="Checking your account">
					<p className="flex items-center space-x-2">
						<Loader2 size={16} className="animate-spin" />
						<span>One moment...</span>
					</p>
				</Notice>
			);

		case "identity":
			return (
				<Notice
					tone="warn"
					title={
						model.problem === "no-sign-in-method"
							? "No sign-in method"
							: "Couldn't check your account"
					}
				>
					<p>
						{model.problem === "failed" &&
							"We couldn't check your account right now. Try again."}
						{model.problem === "unreadable" &&
							"We couldn't tell which account is signed in here. Sign out and sign in again."}
						{model.problem === "no-sign-in-method" &&
							"This account has no sign-in method, so it can't sign in other apps. Add one in Account Settings, then start again from the app, or use a different account."}
					</p>
					<div className="flex items-center space-x-4">
						{model.problem === "failed" && (
							<button
								type="button"
								onClick={actions.onRetry}
								className={SECONDARY_BUTTON}
							>
								Try again
							</button>
						)}
						<button
							type="button"
							onClick={actions.onSignOut}
							className={LINK_BUTTON}
						>
							Sign out and use a different account.
						</button>
					</div>
				</Notice>
			);

		case "consent":
			return (
				<div className="max-w-lg mx-auto">
					<div className={CARD}>
						<div className="flex items-center space-x-3 mb-6">
							<div className={`p-2 rounded-lg ${TONES.info}`}>
								<Shield size={24} />
							</div>
							<h2 className="text-xl font-bold text-ur-white">
								Sign in to {model.label}?
							</h2>
						</div>

						<div className="space-y-4 mb-6">
							<p className="text-ur-gray leading-relaxed">
								{model.label} is asking to sign in to your
								network{" "}
								<span className="font-semibold text-ur-white break-words">
									{model.networkName}
								</span>
								.
							</p>
							<p className="text-ur-gray text-sm leading-relaxed">
								If you approve, that app gets full access to
								this account, the same as signing in there
								yourself: balance, plans, payout wallet and
								settings.
							</p>
							<p className="text-ur-gray text-sm leading-relaxed">
								Signing out of this page does not sign that
								computer out.
							</p>
						</div>

						{model.problem !== null && (
							<div
								role="alert"
								className="mb-4 text-ur-coral py-3 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg text-sm"
							>
								{model.problem === "too-many" &&
									"Too many approvals are pending. Try again later."}
								{model.problem === "failed" &&
									"We couldn't approve this right now. Try again."}
								{model.problem === "broken" &&
									"Reload this page and approve again."}
							</div>
						)}

						<div className="flex space-x-3">
							<button
								type="button"
								onClick={actions.onCancel}
								disabled={model.minting}
								className={`flex-1 ${SECONDARY_BUTTON}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={actions.onApprove}
								disabled={!model.armed || model.busy}
								className={`flex-1 ${PRIMARY_BUTTON}`}
							>
								{model.busy ? (
									<>
										<Loader2
											size={16}
											className="animate-spin"
										/>
										<span>Approving...</span>
									</>
								) : (
									<span>Approve</span>
								)}
							</button>
						</div>

						<p className="mt-6 text-sm text-ur-gray">
							Not{" "}
							<span className="text-ur-white break-words">
								{model.networkName}
							</span>
							?{" "}
							<button
								type="button"
								onClick={actions.onSignOut}
								disabled={model.busy}
								className={LINK_BUTTON}
							>
								Sign out and use a different account.
							</button>
						</p>
					</div>
				</div>
			);

		case "approved":
			return (
				<Notice tone="ok" title="Approved">
					<p>
						{model.canOpen
							? "Approved. Return to URnetwork to finish signing in. If it did not open, choose Open URnetwork, or start again from the app."
							: "Approved. Return to URnetwork to finish signing in. If it did not open, start again from the app."}
					</p>
					{model.canOpen && (
						<button
							type="button"
							onClick={actions.onOpenApp}
							className={`w-full ${PRIMARY_BUTTON}`}
						>
							Open URnetwork
						</button>
					)}
				</Notice>
			);

		case "cancelled":
			return (
				<Notice tone="info" title="Cancelled">
					<p>
						Cancelled. Nothing was shared. You can close this tab.
					</p>
				</Notice>
			);

		case "expired":
			return (
				<Notice tone="warn" title="Request expired">
					<p>This request has expired. Start again from URnetwork.</p>
				</Notice>
			);

		case "session-changed":
			return (
				<Notice tone="warn" title="Account changed">
					<p>
						The account signed in to this browser changed while this
						page was open. Reload to see which account would be
						signed in.
					</p>
					<button
						type="button"
						onClick={actions.onReload}
						className={SECONDARY_BUTTON}
					>
						Reload
					</button>
				</Notice>
			);
	}
};
