import { createContext, FC, PropsWithChildren, useState } from "react";
import {
	login as apiLogin,
	loginWithPassword as apiLoginWithPassword,
	loginWithWallet as apiLoginWithWallet,
} from "../services/api";
import toast from "react-hot-toast";
import { AuthResponse, PasswordLoginResponse, WalletAuthPayload, WalletLoginResponse } from "../services/types";

interface AuthContextType {
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isAutoLoginAttempted: boolean;
	isTransitioning: boolean;
	isLoggingOut: boolean;
	setIsAutoLoginAttempted: (value: boolean) => void;
	setToken: (token: string) => void;
	login: (code: string) => Promise<AuthResponse | null>;
	/** POST /auth/code-login without signing in: the caller decides */
	exchangeAuthCode: (code: string) => Promise<AuthResponse>;
	/** sign in with a jwt, as a successful login does */
	commitToken: (token: string, message: string) => void;
	loginWithPassword: (
		username: string,
		password: string,
	) => Promise<PasswordLoginResponse | null>;
	loginWithWallet: (
		payload: WalletAuthPayload,
	) => Promise<WalletLoginResponse | null>;
	logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>({
	token: null,
	setToken: () => {},
	logout: () => {},
	login: async () => null,
	exchangeAuthCode: async () => ({}),
	commitToken: () => {},
	loginWithPassword: async () => null,
	loginWithWallet: async () => null,
	isLoading: false,
	isAutoLoginAttempted: false,
	isAuthenticated: false,
	isTransitioning: false,
	isLoggingOut: false,
	setIsAutoLoginAttempted: () => {},
});

export const AuthContextProvider: FC<PropsWithChildren> = ({ children }) => {
	const [token, setToken] = useState<string | null>(() =>
		localStorage.getItem("byToken"),
	);

	const [isLoading, setIsLoading] = useState(false);
	const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const exchangeAuthCode = async (code: string): Promise<AuthResponse> => {
		setIsLoading(true);
		try {
			return await apiLogin(code);
		} finally {
			setIsLoading(false);
		}
	};

	const commitToken = (jwt: string, message: string) => {
		setIsTransitioning(true);
		toast.success(message);

		setTimeout(() => {
			setToken(jwt);
			localStorage.setItem("byToken", jwt);
			setIsTransitioning(false);
		}, 900);
	};

	const login = async (code: string): Promise<AuthResponse | null> => {
		const response = await exchangeAuthCode(code);

		if (response.error || !response.by_jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		commitToken(response.by_jwt, "Login successful");

		return response;
	};

	const loginWithPassword = async (
		username: string,
		password: string,
	): Promise<PasswordLoginResponse | null> => {
		setIsLoading(true);
		const response = await apiLoginWithPassword(username, password);
		setIsLoading(false);

		if (response.verification_required) {
			return response;
		}

		if (response.error || !response.network?.by_jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		setIsTransitioning(true);
		toast.success("Login successful");

		setTimeout(() => {
			setToken(response.network?.by_jwt);
			localStorage.setItem("byToken", response.network?.by_jwt);
			setIsTransitioning(false);
		}, 900);

		return response;
	};

	const loginWithWallet = async (
		payload: WalletAuthPayload,
	): Promise<WalletLoginResponse | null> => {
		setIsLoading(true);
		const response = await apiLoginWithWallet(payload);
		setIsLoading(false);

		if (response.error || !response.network?.by_jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		setIsTransitioning(true);
		toast.success("Wallet login successful");

		setTimeout(() => {
			setToken(response.network!.by_jwt);
			localStorage.setItem("byToken", response.network!.by_jwt);
			setIsTransitioning(false);
		}, 900);

		return response;
	};

	const logout = () => {
		if (isLoggingOut || isTransitioning) {
			return;
		}

		setIsLoggingOut(true);

		setTimeout(() => {
			setToken(null);
			localStorage.removeItem("byToken");
			toast.success("Logged out");
			setIsLoggingOut(false);
		}, 900);
	};

	return (
		<AuthContext.Provider
			value={{
				token,
				setToken,
				login,
				exchangeAuthCode,
				commitToken,
				loginWithPassword,
				loginWithWallet,
				isLoading,
				isAuthenticated: !!token,
				isTransitioning,
				isLoggingOut,
				logout,
				isAutoLoginAttempted,
				setIsAutoLoginAttempted,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
