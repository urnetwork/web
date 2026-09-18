import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function useAutoLogin() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const authCode = searchParams.get("auth_code");
	const autoAuthAttemptedRef = useRef(false);
	const { login, isAuthenticated, isLoading, setIsAutoLoginAttempted } =
		useAuth();

	useEffect(() => {
		const loginHandler = async () => {
			if (!authCode) {
				return;
			}

			setIsAutoLoginAttempted(true);
			console.info("Attempting auto login");
			const response = await login(authCode);

			if (response?.by_jwt && !response.error) {
				console.info("Auto login successful");
				navigate(location.pathname, { replace: true });
			} else {
				console.error(
					"Auto login failed: ",
					response?.error?.message || "Invalid response received",
				);

				setIsAutoLoginAttempted(false);
			}
		};

		if (!autoAuthAttemptedRef.current && !isAuthenticated && authCode) {
			autoAuthAttemptedRef.current = true;
			loginHandler();
		}

		if (isAuthenticated && authCode) {
			navigate(location.pathname, { replace: true });
		}
	}, [
		authCode,
		navigate,
		location,
		isAuthenticated,
		login,
		setIsAutoLoginAttempted,
	]);

	return { inProgress: isLoading };
}
