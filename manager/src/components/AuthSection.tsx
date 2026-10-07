import React, { FormEvent, useRef, useState } from "react";
import { KeyRound, Shield, Lock, Mail, Eye, EyeOff, Check, Wallet, UserPlus, Sprout, Server } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useWalletLogin, SolanaWalletType } from "../hooks/useWalletLogin";
import SignUpModal from "./SignUpModal";
import NetworkServerModal from "./NetworkServerModal";
import { getApiBase, DEFAULT_API_BASE } from "../services/api";
import toast from "react-hot-toast";

type TabType = "code" | "password" | "wallet" | "seedphrase";

const TAB_ORDER: Record<TabType, number> = { code: 0, password: 1, wallet: 2, seedphrase: 3 };

/** BIP39 mnemonics come in these word counts */
const VALID_SEED_WORD_COUNTS = [12, 15, 18, 21, 24];

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
	const { login, loginWithPassword, loginWithWallet, loginWithSeedphrase, isLoading, isAutoLoginAttempted, isTransitioning, isLoggingOut, setToken } = useAuth();
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
	const [seedphraseInput, setSeedphraseInput] = useState("");
	const [seedphraseFocused, setSeedphraseFocused] = useState(false);
	const [isServerModalOpen, setIsServerModalOpen] = useState(false);

	// Re-derived on every render, so closing the server modal reflects changes
	const apiBase = getApiBase();
	const isCustomServer = apiBase !== DEFAULT_API_BASE;
	const apiHost = (() => {
		try {
			return new URL(apiBase).host;
		} catch {
			return apiBase;
		}
	})();

	const seedWordCount = seedphraseInput.trim() === ""
		? 0
		: seedphraseInput.trim().split(/\s+/).length;
	const isSeedphraseValid = VALID_SEED_WORD_COUNTS.includes(seedWordCount);

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

	const handleSeedphraseSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// Normalize: trim and collapse all whitespace runs to single spaces
		const normalized = seedphraseInput.trim().split(/\s+/).join(" ");
		if (!normalized) return;

		const result = await loginWithSeedphrase(normalized);
		if (result?.network?.by_jwt) {
			setSeedphraseInput("");
		}
	};

	const handleSignUpSuccess = (jwt: string) => {
		localStorage.setItem("byToken", jwt);
		setToken(jwt);
		toast.success("Account created! Welcome to URnetwork.");
	};

	const headerIcon = () => {
		if (activeTab === "code") return <KeyRound size={32} className="text-ur-white" />;
		if (activeTab === "password") return <Mail size={32} className="text-ur-white" />;
		if (activeTab === "seedphrase") return <Sprout size={32} className="text-ur-white" />;
		return <Wallet size={32} className="text-ur-white" />;
	};

	const headerSubtitle = () => {
		if (activeTab === "code") return "Enter your authentication code to access the dashboard";
		if (activeTab === "password") return "Sign in with your email/phone and password";
		if (activeTab === "seedphrase") return "Sign in with your secret recovery phrase";
		return "Connect your Solana wallet to sign in";
	};

	if (isAutoLoginAttempted && isLoading) {
		return (
			<div className="max-w-lg mx-auto mt-12">
				<div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border">
					<div className="bg-ur-blue py-8 px-6 relative overflow-hidden">
						<div className="absolute inset-0 bg-ur-black/20"></div>
						<div className="relative z-10">
							<div className="flex justify-center mb-4">
								<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30 animate-float">
									<KeyRound size={32} className="text-ur-white" />
								</div>
							</div>
							<h2 className="text-ur-white text-center text-2xl font-bold mb-2">
								Authenticating...
							</h2>
							<p className="text-ur-blue-light text-center text-sm">
								Processing your authentication code automatically
							</p>
						</div>
					</div>

					<div className="p-6 bg-ur-panel">
						<div className="flex justify-center py-8">
							<div className="relative">
								<div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-blue"></div>
								<div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-blue/20 to-ur-blue/20 animate-pulse"></div>
							</div>
						</div>
						<div className="text-center">
							<p className="text-sm text-ur-gray">
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
			<div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden transform transition-all hover:shadow-3xl border border-ur-border">
				<div className="bg-ur-blue py-8 px-6 relative overflow-hidden">
					<div className="absolute inset-0 bg-ur-black/20"></div>
					<div className="relative z-10">
						<div className="flex justify-center mb-4">
							<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30 transition-all duration-300 hover:scale-110">
								<div key={iconKey} className="animate-iconMorph">
									{headerIcon()}
								</div>
							</div>
						</div>
						<h2 className="text-ur-white text-center text-2xl font-bold mb-2">
							Sign in to URnetwork
						</h2>
						<p className="text-ur-blue-light text-center text-sm transition-all duration-300">
							{headerSubtitle()}
						</p>
					</div>

					<div className="absolute top-4 right-4 opacity-20 animate-float">
						<Shield size={24} className="text-ur-white" />
					</div>
					<div className="absolute bottom-4 left-4 opacity-20 animate-float" style={{ animationDelay: "1s" }}>
						<Lock size={20} className="text-ur-white" />
					</div>
				</div>

				<div className="p-6 bg-ur-panel">
					<div className="flex mb-6 bg-ur-raised rounded-lg p-1 gap-1">
						<button
							type="button"
							onClick={() => handleTabChange("code")}
							className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "code"
									? "bg-ur-blue text-ur-white shadow-ur-flat scale-105"
									: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
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
									? "bg-ur-blue text-ur-white shadow-ur-flat scale-105"
									: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
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
									? "bg-ur-blue text-ur-white shadow-ur-flat scale-105"
									: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
							}`}
						>
							<Wallet size={14} className="inline mr-1.5" />
							Wallet
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("seedphrase")}
							className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "seedphrase"
									? "bg-ur-blue text-ur-white shadow-ur-flat scale-105"
									: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
							}`}
						>
							<Sprout size={14} className="inline mr-1.5" />
							Seed Phrase
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
												? "text-ur-blue-light"
												: "text-ur-gray"
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
											className={`w-full px-4 py-3 bg-ur-raised border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-300 text-ur-white placeholder-ur-gray-dark ${
												authCodeFocused
													? "shadow-ur-flat"
													: ""
											} ${
												isAuthCodeValid
													? "border-ur-green"
													: "border-ur-border"
											}`}
											placeholder="Enter your one time auth code"
											disabled={isLoading}
											required
										/>
										{isAuthCodeValid && (
											<div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scaleIn">
												<Check size={20} className="text-ur-green" />
											</div>
										)}
									</div>
								</div>

								<button
									type="submit"
									disabled={isLoading || !isAuthCodeValid}
									className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-300 ${
										isLoading || !isAuthCodeValid
											? "bg-ur-hover cursor-not-allowed opacity-60"
											: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
									}`}
								>
									{isLoading ? (
										<span className="flex items-center justify-center">
											<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ur-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
												? "text-ur-blue-light"
												: "text-ur-gray"
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
											className={`w-full px-4 py-3 bg-ur-raised border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-300 text-ur-white placeholder-ur-gray-dark ${
												emailFocused ? "shadow-ur-flat" : ""
											} ${
												isEmailValid
													? "border-ur-green"
													: "border-ur-border"
											}`}
											placeholder="Enter your email or phone number"
											disabled={isLoading}
											required
										/>
										{isEmailValid && (
											<div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scaleIn">
												<Check size={20} className="text-ur-green" />
											</div>
										)}
									</div>
								</div>

								<div className="mb-6">
									<label
										htmlFor="password"
										className={`block text-sm font-medium mb-2 transition-all duration-300 ${
											passwordFocused || isPasswordValid
												? "text-ur-blue-light"
												: "text-ur-gray"
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
											className={`w-full px-4 py-3 pr-12 bg-ur-raised border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-300 text-ur-white placeholder-ur-gray-dark ${
												passwordFocused
													? "shadow-ur-flat"
													: ""
											} ${
												isPasswordValid
													? "border-ur-green"
													: "border-ur-border"
											}`}
											placeholder="Enter your password"
											disabled={isLoading}
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword((s) => !s)}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-ur-gray hover:text-ur-white transition-all duration-300 hover:scale-110"
											disabled={isLoading}
										>
											{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
										</button>
									</div>
								</div>

								{loginWithPasswordError && (
									<div className="text-ur-coral py-3 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg mb-4 animate-shake text-sm">
										{loginWithPasswordError}
									</div>
								)}

								<button
									type="submit"
									disabled={isLoading}
									className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-300 ${
										isLoading
											? "bg-ur-hover cursor-not-allowed opacity-60"
											: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
									}`}
								>
									{isLoading ? (
										<span className="flex items-center justify-center">
											<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ur-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
								<p className="text-ur-gray text-sm text-center mb-5">
									Choose your Solana wallet to connect and sign in
								</p>

								<div className="flex flex-col gap-3">
									<button
										type="button"
										onClick={() => handleWalletLogin("phantom")}
										disabled={!isPhantomAvailable || walletLoading !== null || isLoading}
										title={!isPhantomAvailable ? "Phantom extension not detected. Please install it first." : undefined}
										className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-300 border ${
											!isPhantomAvailable
												? "bg-ur-raised/50 border-ur-border opacity-50 cursor-not-allowed"
												: walletLoading === "phantom"
												? "bg-[#9945FF]/20 border-[#9945FF]/60 cursor-wait"
												: "bg-[#9945FF]/10 border-[#9945FF]/40 hover:bg-[#9945FF]/25 hover:border-[#9945FF]/70 active:scale-[0.98]"
										}`}
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#9945FF] flex items-center justify-center">
											{walletLoading === "phantom" ? (
												<svg className="animate-spin h-4 w-4 text-ur-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											) : (
												<PhantomLogo />
											)}
										</div>
										<div className="flex-1 text-left">
											<span className="block text-sm font-semibold text-ur-white">
												Phantom
											</span>
											<span className="block text-xs text-ur-gray">
												{walletLoading === "phantom"
													? "Waiting for signature..."
													: isPhantomAvailable
													? "Ready to connect"
													: "Extension not installed"}
											</span>
										</div>
										{!isPhantomAvailable && (
											<span className="text-xs text-ur-gray-dark flex-shrink-0">Not found</span>
										)}
									</button>

									<button
										type="button"
										onClick={() => handleWalletLogin("solflare")}
										disabled={!isSolflareAvailable || walletLoading !== null || isLoading}
										title={!isSolflareAvailable ? "Solflare extension not detected. Please install it first." : undefined}
										className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-300 border ${
											!isSolflareAvailable
												? "bg-ur-raised/50 border-ur-border opacity-50 cursor-not-allowed"
												: walletLoading === "solflare"
												? "bg-[#FC7227]/20 border-[#FC7227]/60 cursor-wait"
												: "bg-[#FC7227]/10 border-[#FC7227]/40 hover:bg-[#FC7227]/25 hover:border-[#FC7227]/70 active:scale-[0.98]"
										}`}
									>
										<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#FC7227] flex items-center justify-center">
											{walletLoading === "solflare" ? (
												<svg className="animate-spin h-4 w-4 text-ur-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											) : (
												<SolflareLogo />
											)}
										</div>
										<div className="flex-1 text-left">
											<span className="block text-sm font-semibold text-ur-white">
												Solflare
											</span>
											<span className="block text-xs text-ur-gray">
												{walletLoading === "solflare"
													? "Waiting for signature..."
													: isSolflareAvailable
													? "Ready to connect"
													: "Extension not installed"}
											</span>
										</div>
										{!isSolflareAvailable && (
											<span className="text-xs text-ur-gray-dark flex-shrink-0">Not found</span>
										)}
									</button>
								</div>

								{walletError && (
									<div className="text-ur-coral py-3 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg mt-4 animate-shake text-sm">
										{walletError}
									</div>
								)}

								{!isPhantomAvailable && !isSolflareAvailable && (
									<p className="text-center text-xs text-ur-gray-dark mt-4">
										No Solana wallet detected. Install Phantom or Solflare to continue.
									</p>
								)}
							</div>
						)}

						{activeTab === "seedphrase" && (
							<form
								onSubmit={handleSeedphraseSubmit}
								className={getSlideClass()}
							>
								<div className="mb-6">
									<div className="flex items-center justify-between mb-2">
										<label
											htmlFor="seedphrase"
											className={`block text-sm font-medium transition-all duration-300 ${
												seedphraseFocused || isSeedphraseValid
													? "text-ur-blue-light"
													: "text-ur-gray"
											}`}
										>
											Secret Recovery Phrase
										</label>
										{seedWordCount > 0 && (
											<span
												className={`text-xs font-mono ${
													isSeedphraseValid
														? "text-ur-green"
														: "text-ur-gray-dark"
												}`}
											>
												{seedWordCount} {seedWordCount === 1 ? "word" : "words"}
											</span>
										)}
									</div>
									<div className="relative">
										<textarea
											id="seedphrase"
											value={seedphraseInput}
											onChange={(e) => setSeedphraseInput(e.target.value)}
											onFocus={() => setSeedphraseFocused(true)}
											onBlur={() => setSeedphraseFocused(false)}
											rows={3}
											autoComplete="off"
											autoCapitalize="off"
											spellCheck={false}
											className={`w-full px-4 py-3 bg-ur-raised border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-300 text-ur-white placeholder-ur-gray-dark font-mono text-sm resize-none ${
												seedphraseFocused ? "shadow-ur-flat" : ""
											} ${
												isSeedphraseValid
													? "border-ur-green"
													: "border-ur-border"
											}`}
											placeholder="Enter your 24-word recovery phrase, separated by spaces"
											disabled={isLoading}
											required
										/>
										{isSeedphraseValid && (
											<div className="absolute right-3 top-3 animate-scaleIn">
												<Check size={20} className="text-ur-green" />
											</div>
										)}
									</div>
									<p className="text-xs text-ur-gray-dark mt-2">
										Your phrase is sent only to the URnetwork API to sign you
										in. It is never stored in this browser.
									</p>
								</div>

								<button
									type="submit"
									disabled={isLoading || !isSeedphraseValid}
									className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-300 ${
										isLoading || !isSeedphraseValid
											? "bg-ur-hover cursor-not-allowed opacity-60"
											: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
									}`}
								>
									{isLoading ? (
										<span className="flex items-center justify-center">
											<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ur-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
					</div>

					<div className="mt-6 pt-5 border-t border-ur-border">
						<div className="text-center mb-4">
							<p className="text-xs text-ur-gray-dark mb-3">Don&apos;t have an account?</p>
							<button
								type="button"
								onClick={() => setIsSignUpOpen(true)}
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-ur-green border border-ur-green/40 bg-ur-green/10 hover:bg-ur-green/20 hover:border-ur-green/60 transition-all duration-200 active:scale-[0.98]"
							>
								<UserPlus size={15} />
								Create Account
							</button>
						</div>
						<p className="text-xs text-ur-gray-dark text-center">
							Beta Application &mdash; Major Changes Expected
						</p>
						<div className="flex justify-center mt-3">
							<button
								type="button"
								onClick={() => setIsServerModalOpen(true)}
								title="Change the API server this dashboard talks to"
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors duration-100 border ${
									isCustomServer
										? "text-ur-blue-light border-ur-blue/40 bg-ur-blue/10 hover:bg-ur-blue/20"
										: "text-ur-gray-dark border-transparent hover:text-ur-gray hover:bg-ur-tint"
								}`}
							>
								<Server size={12} />
								{apiHost}
								{isCustomServer && (
									<span className="text-[10px] uppercase tracking-wide">
										&middot; custom
									</span>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			<NetworkServerModal
				isOpen={isServerModalOpen}
				onClose={() => setIsServerModalOpen(false)}
			/>

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
