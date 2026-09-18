import React, { FormEvent, useRef, useState } from "react";
import { KeyRound, Shield, Lock, Mail, Eye, EyeOff, Check, Wallet, UserPlus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useWalletLogin, SolanaWalletType } from "../hooks/useWalletLogin";
import SignUpModal from "./SignUpModal";
import toast from "react-hot-toast";

type TabType = "code" | "password" | "wallet";

const TAB_ORDER: Record<TabType, number> = { code: 0, password: 1, wallet: 2 };

const PhantomLogo = () => (
	<svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M20 4C11.163 4 4 11.163 4 20v13l3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5V20C36 11.163 28.837 4 20 4z"
			fill="white"
		/>
		<circle cx="15" cy="18" r="2.5" fill="#9945FF" />
		<circle cx="25" cy="18" r="2.5" fill="#9945FF" />
	</svg>
);

const SolflareLogo = () => (
	<svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="20" cy="20" r="6" fill="white" />
		<path
			d="M20 5v6M20 29v6M5 20h6M29 20h6M9.1 9.1l4.2 4.2M26.7 26.7l4.2 4.2M30.9 9.1l-4.2 4.2M13.3 26.7l-4.2 4.2"
			stroke="white"
			strokeWidth="3"
			strokeLinecap="round"
		/>
	</svg>
);

const AuthSection: React.FC = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>("code");
	const [isSignUpOpen, setIsSignUpOpen] = useState(false);
	const [verificationUserAuth, setVerificationUserAuth] = useState<string | null>(null);
	const { login, loginWithPassword, loginWithWallet, isLoading, isAutoLoginAttempted, isTransitioning, isLoggingOut, setToken } = useAuth();
	const { connectAndSign, isPhantomAvailable, isSolflareAvailable } = useWalletLogin();
	const authCodeInputRef = useRef<HTMLInputElement>(null);
	const [isAuthCodeValid, setIsAuthCodeValid] = useState(false);
	const [isEmailValid, setIsEmailValid] = useState(false);
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [authCodeFocused, setAuthCodeFocused] = useState(false);
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const [loginWithPasswordError, setLoginWithPasswordError] = useState<string | null>(null);
	const [walletError, setWalletError] = useState<string | null>(null);
	const [walletLoading, setWalletLoading] = useState<SolanaWalletType | null>(null);
	const [previousTab, setPreviousTab] = useState<TabType>("code");
	const [iconKey, setIconKey] = useState(0);

	const getSlideClass = () =>
		TAB_ORDER[previousTab] > TAB_ORDER[activeTab]
			? "animate-slideInFromLeft"
			: "animate-slideInFromRight";

	const handleTabChange = (tab: TabType) => {
		if (tab !== activeTab) {
			setPreviousTab(activeTab);
			setActiveTab(tab);
			setIconKey((prev) => prev + 1);
			setLoginWithPasswordError(null);
			setWalletError(null);
		}
	};

	const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const code = authCodeInputRef.current?.value?.toString().trim();

		if (code) {
			await login(code);
		}
	};

	const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const username = formData.get("user_auth")?.toString()?.trim();
		const password = formData.get("password")?.toString()?.trim();

		if (!username && !password) {
			setLoginWithPasswordError(
				"Both username/email and password are required to log in!",
			);
			return;
		} else if (!username) {
			setLoginWithPasswordError(
				"A username/email is required to log in!",
			);
			return;
		} else if (!password) {
			setLoginWithPasswordError("Password is required to log in!");
			return;
		}

		const result = await loginWithPassword(username, password);
		if (result?.verification_required) {
			setVerificationUserAuth(result.verification_required.user_auth);
			setIsSignUpOpen(true);
		}
	};

	const handleWalletLogin = async (walletType: SolanaWalletType) => {
		setWalletError(null);
		setWalletLoading(walletType);

		try {
			const payload = await connectAndSign(walletType);
			if (payload) {
				await loginWithWallet(payload);
			}
		} catch (err) {
			setWalletError(
				err instanceof Error ? err.message : "Wallet connection failed",
			);
		} finally {
			setWalletLoading(null);
		}
	};

	const handleSignUpSuccess = (jwt: string) => {
		localStorage.setItem("byToken", jwt);
		setToken(jwt);
		toast.success("Account created! Welcome to URnetwork.");
	};

	const headerIcon = () => {
		if (activeTab === "code") return <KeyRound size={32} className="text-white" />;
		if (activeTab === "password") return <Mail size={32} className="text-white" />;
		return <Wallet size={32} className="text-white" />;
	};

	const headerSubtitle = () => {
		if (activeTab === "code") return "Enter your authentication code to access the dashboard";
		if (activeTab === "password") return "Sign in with your email/phone and password";
		return "Connect your Solana wallet to sign in";
	};

	if (isAutoLoginAttempted && isLoading) {
		return (
			<div className="max-w-lg mx-auto mt-12">
				<div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
					<div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-8 px-6 relative overflow-hidden animate-gradientShift">
						<div className="absolute inset-0 bg-black/20"></div>
						<div className="relative z-10">
							<div className="flex justify-center mb-4">
								<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30 animate-float">
									<KeyRound size={32} className="text-white" />
								</div>
							</div>
							<h2 className="text-white text-center text-2xl font-bold mb-2">
								Authenticating...
							</h2>
							<p className="text-blue-100 text-center text-sm">
								Processing your authentication code automatically
							</p>
						</div>
					</div>

					<div className="p-6 bg-gray-800">
						<div className="flex justify-center py-8">
							<div className="relative">
								<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
								<div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 animate-pulse"></div>
							</div>
						</div>
						<div className="text-center">
							<p className="text-sm text-gray-400">
								Please wait while we authenticate you with the provided code...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`max-w-lg mx-auto mt-12 ${isLoggingOut ? "animate-lockSequence" : isTransitioning ? "animate-unlockSequence" : ""}`}>
			<div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:shadow-3xl border border-gray-700">
				<div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-8 px-6 relative overflow-hidden animate-gradientShift">
					<div className="absolute inset-0 bg-black/20"></div>
					<div className="relative z-10">
						<div className="flex justify-center mb-4">
							<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30 transition-all duration-300 hover:scale-110">
								<div key={iconKey} className="animate-iconMorph">
									{headerIcon()}
								</div>
							</div>
						</div>
						<h2 className="text-white text-center text-2xl font-bold mb-2">
							Sign in to URnetwork
						</h2>
						<p className="text-blue-100 text-center text-sm transition-all duration-300">
							{headerSubtitle()}
						</p>
					</div>

					<div className="absolute top-4 right-4 opacity-20 animate-float">
						<Shield size={24} className="text-white" />
					</div>
					<div className="absolute bottom-4 left-4 opacity-20 animate-float" style={{ animationDelay: "1s" }}>
						<Lock size={20} className="text-white" />
					</div>
				</div>

				<div className="p-6 bg-gray-800">
					<div className="flex mb-6 bg-gray-700 rounded-lg p-1 gap-1">
						<button
							type="button"
							onClick={() => handleTabChange("code")}
							className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "code"
									? "bg-blue-600 text-white shadow-lg scale-105"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<KeyRound size={14} className="inline mr-1.5" />
							Auth Code
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("password")}
							className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "password"
									? "bg-blue-600 text-white shadow-lg scale-105"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<Mail size={14} className="inline mr-1.5" />
							Email/Phone
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("wallet")}
							className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "wallet"
									? "bg-blue-600 text-white shadow-lg scale-105"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<Wallet size={14} className="inline mr-1.5" />
							Wallet
						</button>
					</div>

					<div className="relative">
						{activeTab === "code" && (
							<form
								onSubmit={handleCodeSubmit}
								className={getSlideClass()}
							>
								<div className="mb-6">
									<label
										htmlFor="authCode"
										className={`block text-sm font-medium mb-2 transition-all duration-300 ${
											authCodeFocused || isAuthCodeValid
												? "text-blue-400"
												: "text-gray-300"
										}`}
									>
										Authentication Code
									</label>
									<div className="relative">
										<input
											id="authCode"
											type="text"
											ref={authCodeInputRef}
											onFocus={() => setAuthCodeFocused(true)}
											onBlur={() => setAuthCodeFocused(false)}
											onChange={(e) =>
												setIsAuthCodeValid(
													!!e.target.value.trim(),
												)
											}
											className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-400 ${
												authCodeFocused
													? "shadow-lg shadow-blue-500/20"
													: ""
											} ${
												isAuthCodeValid
													? "border-green-500"
													: "border-gray-600"
											}`}
											placeholder="Enter your one time auth code"
											disabled={isLoading}
											required
										/>
										{isAuthCodeValid && (
											<div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scaleIn">
												<Check size={20} className="text-green-500" />
											</div>
										)}
									</div>
								</div>

								<button
									type="submit"
									disabled={isLoading || !isAuthCodeValid}
									className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 ${
										isLoading || !isAuthCodeValid
											? "bg-gray-600 cursor-not-allowed opacity-60"
											: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]"
									}`}
								>
									{isLoading ? (
										<span className="flex items-center justify-center">
											<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Authenticating...
										</span>
									) : (
										"Access Dashboard"
									)}
								</button>
							</form>
						)}

						{activeTab === "password" && (
							<form
								onSubmit={handlePasswordSubmit}
								className={getSlideClass()}
							>
								<div className="mb-4">
									<label
										htmlFor="userAuth"
										className={`block text-sm font-medium mb-2 transition-all duration-300 ${
											emailFocused || isEmailValid
												? "text-blue-400"
												: "text-gray-300"
										}`}
									>
										Email or Phone Number
									</label>
									<div className="relative">
										<input
											id="userAuth"
											type="text"
											name="user_auth"
											onFocus={() => setEmailFocused(true)}
											onBlur={() => setEmailFocused(false)}
											onChange={(e) =>
												setIsEmailValid(!!e.target.value.trim())
											}
											className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-400 ${
												emailFocused ? "shadow-lg shadow-blue-500/20" : ""
											} ${
												isEmailValid
													? "border-green-500"
													: "border-gray-600"
											}`}
											placeholder="Enter your email or phone number"
											disabled={isLoading}
											required
										/>
										{isEmailValid && (
											<div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scaleIn">
												<Check size={20} className="text-green-500" />
											</div>
										)}
									</div>
								</div>

								<div className="mb-6">
									<label
										htmlFor="password"
										className={`block text-sm font-medium mb-2 transition-all duration-300 ${
											passwordFocused || isPasswordValid
												? "text-blue-400"
												: "text-gray-300"
										}`}
									>
										Password
									</label>
									<div className="relative">
										<input
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											onFocus={() => setPasswordFocused(true)}
											onBlur={() => setPasswordFocused(false)}
											onChange={(e) =>
												setIsPasswordValid(!!e.target.value.trim())
											}
											className={`w-full px-4 py-3 pr-12 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-400 ${
												passwordFocused
													? "shadow-lg shadow-blue-500/20"
													: ""
											} ${
												isPasswordValid
													? "border-green-500"
													: "border-gray-600"
											}`}
											placeholder="Enter your password"
											disabled={isLoading}
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword((s) => !s)}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-all duration-300 hover:scale-110"
											disabled={isLoading}
										>
											{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
										</button>
									</div>
								</div>

								{loginWithPasswordError && (
									<div className="text-red-400 py-3 px-4 bg-red-900/20 border border-red-500/30 rounded-lg mb-4 animate-shake text-sm">
										{loginWithPasswordError}
									</div>
								)}

								<button
									type="submit"
									disabled={isLoading}
									className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 ${
										isLoading
											? "bg-gray-600 cursor-not-allowed opacity-60"
											: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]"
									}`}
								>
									{isLoading ? (
										<span className="flex items-center justify-center">
											<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Signing In...
										</span>
									) : (
										"Sign In"
									)}
								</button>
							</form>
						)}

						{activeTab === "wallet" && (
							<div className={getSlideClass()}>
								<p className="text-gray-400 text-sm text-center mb-5">
									Choose your Solana wallet to connect and sign in
								</p>

								<div className="flex flex-col gap-3">
									<button
										type="button"
										onClick={() => handleWalletLogin("phantom")}
										disabled={!isPhantomAvailable || walletLoading !== null || isLoading}
										title={!isPhantomAvailable ? "Phantom extension not detected. Please install it first." : undefined}
										className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 border ${
											!isPhantomAvailable
												? "bg-gray-700/50 border-gray-600 opacity-50 cursor-not-allowed"
												: walletLoading === "phantom"
												? "bg-[#9945FF]/20 border-[#9945FF]/60 cursor-wait"
												: "bg-[#9945FF]/10 border-[#9945FF]/40 hover:bg-[#9945FF]/25 hover:border-[#9945FF]/70 active:scale-[0.98]"
										}`}
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#9945FF] flex items-center justify-center">
											{walletLoading === "phantom" ? (
												<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											) : (
												<PhantomLogo />
											)}
										</div>
										<div className="flex-1 text-left">
											<span className="block text-sm font-semibold text-white">
												Phantom
											</span>
											<span className="block text-xs text-gray-400">
												{walletLoading === "phantom"
													? "Waiting for signature..."
													: isPhantomAvailable
													? "Ready to connect"
													: "Extension not installed"}
											</span>
										</div>
										{!isPhantomAvailable && (
											<span className="text-xs text-gray-500 flex-shrink-0">Not found</span>
										)}
									</button>

									<button
										type="button"
										onClick={() => handleWalletLogin("solflare")}
										disabled={!isSolflareAvailable || walletLoading !== null || isLoading}
										title={!isSolflareAvailable ? "Solflare extension not detected. Please install it first." : undefined}
										className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 border ${
											!isSolflareAvailable
												? "bg-gray-700/50 border-gray-600 opacity-50 cursor-not-allowed"
												: walletLoading === "solflare"
												? "bg-[#FC7227]/20 border-[#FC7227]/60 cursor-wait"
												: "bg-[#FC7227]/10 border-[#FC7227]/40 hover:bg-[#FC7227]/25 hover:border-[#FC7227]/70 active:scale-[0.98]"
										}`}
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#FC7227] flex items-center justify-center">
											{walletLoading === "solflare" ? (
												<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											) : (
												<SolflareLogo />
											)}
										</div>
										<div className="flex-1 text-left">
											<span className="block text-sm font-semibold text-white">
												Solflare
											</span>
											<span className="block text-xs text-gray-400">
												{walletLoading === "solflare"
													? "Waiting for signature..."
													: isSolflareAvailable
													? "Ready to connect"
													: "Extension not installed"}
											</span>
										</div>
										{!isSolflareAvailable && (
											<span className="text-xs text-gray-500 flex-shrink-0">Not found</span>
										)}
									</button>
								</div>

								{walletError && (
									<div className="text-red-400 py-3 px-4 bg-red-900/20 border border-red-500/30 rounded-lg mt-4 animate-shake text-sm">
										{walletError}
									</div>
								)}

								{!isPhantomAvailable && !isSolflareAvailable && (
									<p className="text-center text-xs text-gray-500 mt-4">
										No Solana wallet detected. Install Phantom or Solflare to continue.
									</p>
								)}
							</div>
						)}
					</div>

					<div className="mt-6 pt-5 border-t border-gray-700">
						<div className="text-center mb-4">
							<p className="text-xs text-gray-500 mb-3">Don&apos;t have an account?</p>
							<button
								type="button"
								onClick={() => setIsSignUpOpen(true)}
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-teal-400 border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 hover:border-teal-500/60 transition-all duration-200 active:scale-[0.98]"
							>
								<UserPlus size={15} />
								Create Account
							</button>
						</div>
						<p className="text-xs text-gray-600 text-center">
							Beta Application &mdash; Major Changes Expected
						</p>
					</div>
				</div>
			</div>

			<SignUpModal
				isOpen={isSignUpOpen}
				onClose={() => { setIsSignUpOpen(false); setVerificationUserAuth(null); }}
				onSuccess={handleSignUpSuccess}
				initialStep={verificationUserAuth ? "verify" : undefined}
				initialUserAuth={verificationUserAuth ?? undefined}
			/>
		</div>
	);
};

export default AuthSection;
