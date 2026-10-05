import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./useAuth";
import {
	authCodeAccountDecision,
	parseJwtClaims,
	takeAuthCode,
} from "../services/authCodeUrl";

export interface PendingAccountSwitch {
	currentNetwork: string;
	linkNetwork: string;
}

const AUTH_CODE_LINK_INVALID =
	"This sign-in link could not be used. It may have expired or already been used.";

// ?auth_code=<code> (ur.io's Operator Client UI; see services/authCodeUrl).
// The code leaves the url first, whether or not it is needed. Then it signs in
// a signed-out manager, changes nothing for the network already signed in, and
// waits for an answer (pendingSwitch) when another network is signed in.
export function useAutoLogin() {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		token,
		exchangeAuthCode,
		commitToken,
		isLoading,
		setIsAutoLoginAttempted,
	} = useAuth();
	const handledRef = useRef(false);
	const linkedJwtRef = useRef<string | null>(null);
	const [pendingSwitch, setPendingSwitch] =
		useState<PendingAccountSwitch | null>(null);

	useEffect(() => {
		const { authCode, search } = takeAuthCode(location.search);
		if (search === null) {
			return;
		}

		navigate(
			{ pathname: location.pathname, search, hash: location.hash },
			{ replace: true },
		);

		if (!authCode || handledRef.current) {
			return;
		}
		handledRef.current = true;

		const current = parseJwtClaims(token);
		setIsAutoLoginAttempted(true);
		console.info("Attempting auto login");

		exchangeAuthCode(authCode).then((response) => {
			const jwt = response.error ? null : (response.by_jwt ?? null);
			const linked = parseJwtClaims(jwt);

			switch (authCodeAccountDecision(current, linked)) {
				case "sign-in":
					if (jwt) {
						console.info("Auto login successful");
						commitToken(jwt, "Login successful");
					}
					return;
				case "same-account":
					setIsAutoLoginAttempted(false);
					return;
				case "ask-to-switch":
					linkedJwtRef.current = jwt;
					setPendingSwitch({
						currentNetwork: current?.network_name ?? "",
						linkNetwork: linked?.network_name ?? "",
					});
					setIsAutoLoginAttempted(false);
					return;
				default:
					console.error(
						"Auto login failed: ",
						response.error?.message || "Invalid response received",
					);
					toast.error(AUTH_CODE_LINK_INVALID);
					setIsAutoLoginAttempted(false);
			}
		});
	}, [
		location,
		navigate,
		token,
		exchangeAuthCode,
		commitToken,
		setIsAutoLoginAttempted,
	]);

	const confirmSwitch = () => {
		const jwt = linkedJwtRef.current;
		linkedJwtRef.current = null;
		setPendingSwitch(null);
		if (jwt) {
			commitToken(jwt, "Switched accounts");
		}
	};

	const cancelSwitch = () => {
		linkedJwtRef.current = null;
		setPendingSwitch(null);
	};

	return { inProgress: isLoading, pendingSwitch, confirmSwitch, cancelSwitch };
}
