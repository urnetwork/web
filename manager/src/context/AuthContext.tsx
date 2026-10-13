import {
	createContext,
	FC,
	PropsWithChildren,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	DEFAULT_API_BASE,
	getApiBase,
	login as apiLogin,
	loginWithPassword as apiLoginWithPassword,
	loginWithWallet as apiLoginWithWallet,
	loginWithSeedphrase as apiLoginWithSeedphrase,
} from "../services/api";
import toast from "react-hot-toast";
import {
	clearSession,
	forgetSession,
	readSession,
	serverMark,
	writeSession,
	type StorageLike,
} from "../services/sessionBinding";
import { AuthResponse, PasswordLoginResponse, SeedphraseLoginResponse, WalletAuthPayload, WalletLoginResponse } from "../services/types";

interface AuthContextType {
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isAutoLoginAttempted: boolean;
	isTransitioning: boolean;
	isLoggingOut: boolean;
	setIsAutoLoginAttempted: (value: boolean) => void;
	/** null signs out without the logout animation (the approval page uses it when the api rejects the session); a jwt signs in at once, as issued by the server the browser is set to now */
	setToken: (token: string | null) => void;
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
	loginWithSeedphrase: (
		seedphrase: string,
	) => Promise<SeedphraseLoginResponse | null>;
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
	loginWithSeedphrase: async () => null,
	isLoading: false,
	isAutoLoginAttempted: false,
	isAuthenticated: false,
	isTransitioning: false,
	isLoggingOut: false,
	setIsAutoLoginAttempted: () => {},
});

// A session belongs to the API server that issued it (services/sessionBinding). The browser
// holds one server for every tab and each request reads it when it is made, so a tab that
// keeps its session after the server was changed would send it to a server that never
// issued it. Below, a tab remembers which server its session came from, drops an answer
// that comes from a server the browser has since left, and signs itself out when it finds
// the browser pointed at another one.

const SERVER_CHANGED =
	"The API server changed while you were signing in. Sign in again.";
const SIGNED_OUT_ELSEWHERE =
	"You were signed out: this browser's API server was changed in another tab.";

/** The server the browser is set to right now, by the name sessions carry. */
const currentServer = () => serverMark(getApiBase(), DEFAULT_API_BASE);

/** This browser's storage, or null where it will not give it out. */
const storage = (): StorageLike | null => {
	try {
		return localStorage;
	} catch {
		return null;
	}
};

/** The session this tab holds, and the server that issued it. */
interface Held {
	token: string;
	server: string;
}

/** What a tab starts with: the stored session, if the server that issued it is the one the
 * browser is set to; one stored with no record of its server is taken as it always was. */
const openSession = () => {
	const server = currentServer();
	const stored = readSession(storage(), server);
	return { token: stored?.token ?? null, server: stored?.server ?? server };
};

export const AuthContextProvider: FC<PropsWithChildren> = ({ children }) => {
	const [opened] = useState(openSession);
	const [token, setToken] = useState<string | null>(opened.token);
	// the state says what to draw; this says what the checks below ask, and an event handler
	// cannot read the state
	const held = useRef<Held | null>(
		opened.token === null
			? null
			: { token: opened.token, server: opened.server },
	);

	const [isLoading, setIsLoading] = useState(false);
	const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	// the server that answered each auth code exchanged and not yet committed
	const issuedBy = useRef(new Map<string, string>());

	const hold = useCallback((jwt: string, server: string) => {
		held.current = { token: jwt, server };
		setToken(jwt);
	}, []);

	const release = useCallback(() => {
		held.current = null;
		setToken(null);
	}, []);

	// the context's own setToken: signing out, or signing in with a jwt the caller has
	// already stored
	const setSession = useCallback(
		(next: string | null) => {
			if (next === null) {
				release();
				return;
			}
			const server = currentServer();
			hold(next, server);
			writeSession(storage(), next, server);
		},
		[hold, release],
	);

	// The browser can be pointed at another server from any tab. When it has been, the session
	// this tab holds belongs to the server it left: it goes (and so does the stored copy, if it
	// is still this one). The storage event says so as it happens. The others catch a tab that
	// was not running when it did (restored from the back-forward cache, woken up) and cost
	// nothing: all of them ask the one question.
	const checkServer = useCallback(() => {
		const session = held.current;
		if (session === null || session.server === currentServer()) return;
		release();
		forgetSession(storage(), session.token);
		toast(SIGNED_OUT_ELSEWHERE);
	}, [release]);

	useEffect(() => {
		window.addEventListener("storage", checkServer);
		window.addEventListener("pageshow", checkServer);
		window.addEventListener("focus", checkServer);
		document.addEventListener("visibilitychange", checkServer);
		return () => {
			window.removeEventListener("storage", checkServer);
			window.removeEventListener("pageshow", checkServer);
			window.removeEventListener("focus", checkServer);
			document.removeEventListener("visibilitychange", checkServer);
		};
	}, [checkServer]);

	const exchangeAuthCode = async (code: string): Promise<AuthResponse> => {
		const server = currentServer();
		setIsLoading(true);
		try {
			const response = await apiLogin(code);
			// an answer from a server the browser has left since is not used
			if (currentServer() !== server) {
				return { error: { message: SERVER_CHANGED } };
			}
			if (response.by_jwt) issuedBy.current.set(response.by_jwt, server);
			return response;
		} finally {
			setIsLoading(false);
		}
	};

	/** Signs in with `jwt`, which `server` issued in answer to a request made while the browser
	 * was set to it. False when the browser has been pointed elsewhere since: the answer belongs
	 * to a server the person has left, and is dropped. */
	const keepSession = (
		jwt: string,
		server: string,
		message: string,
	): boolean => {
		if (currentServer() !== server) {
			toast.error(SERVER_CHANGED);
			return false;
		}
		setIsTransitioning(true);
		toast.success(message);

		setTimeout(() => {
			issuedBy.current.delete(jwt);
			// the same question again: the answer waited for the animation
			if (currentServer() !== server) {
				setIsTransitioning(false);
				toast.error(SERVER_CHANGED);
				return;
			}
			hold(jwt, server);
			writeSession(storage(), jwt, server);
			setIsTransitioning(false);
		}, 900);
		return true;
	};

	const commitToken = (jwt: string, message: string) => {
		// the server that answered the exchange, which may not be the one the browser is set to now
		keepSession(jwt, issuedBy.current.get(jwt) ?? currentServer(), message);
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
		const server = currentServer();
		setIsLoading(true);
		const response = await apiLoginWithPassword(username, password);
		setIsLoading(false);

		if (response.verification_required) {
			return response;
		}

		const jwt = response.network?.by_jwt;
		if (response.error || !jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		return keepSession(jwt, server, "Login successful") ? response : null;
	};

	const loginWithWallet = async (
		payload: WalletAuthPayload,
	): Promise<WalletLoginResponse | null> => {
		const server = currentServer();
		setIsLoading(true);
		const response = await apiLoginWithWallet(payload);
		setIsLoading(false);

		const jwt = response.network?.by_jwt;
		if (response.error || !jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		return keepSession(jwt, server, "Wallet login successful")
			? response
			: null;
	};

	const loginWithSeedphrase = async (
		seedphrase: string,
	): Promise<SeedphraseLoginResponse | null> => {
		const server = currentServer();
		setIsLoading(true);
		const response = await apiLoginWithSeedphrase(seedphrase);
		setIsLoading(false);

		const jwt = response.network?.by_jwt;
		if (response.error || !jwt) {
			toast.error(
				`Login failed: ${response.error?.message || "Invalid response received"}`,
			);
			return null;
		}

		return keepSession(jwt, server, "Login successful") ? response : null;
	};

	const logout = () => {
		if (isLoggingOut || isTransitioning) {
			return;
		}

		setIsLoggingOut(true);

		setTimeout(() => {
			release();
			clearSession(storage());
			toast.success("Logged out");
			setIsLoggingOut(false);
		}, 900);
	};

	return (
		<AuthContext.Provider
			value={{
				token,
				setToken: setSession,
				login,
				exchangeAuthCode,
				commitToken,
				loginWithPassword,
				loginWithWallet,
				loginWithSeedphrase,
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
