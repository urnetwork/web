import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Eye,
	EyeOff,
	Loader2,
	Mail,
	Sprout,
	UserPlus,
	Wallet,
	X,
	XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
	checkNetworkName,
	createNetwork,
	createNetworkInstant,
	sendVerificationCode,
	verifyCode,
} from "../services/api";
import type { WalletAuthPayload } from "../services/types";
import { useWalletLogin, SolanaWalletType } from "../hooks/useWalletLogin";
import SeedphraseDisplayModal from "./SeedphraseDisplayModal";

type SignUpMethod = "email" | "wallet" | "instant";
type ModalStep = "form" | "verify" | "success";

const PhantomLogo = () => (
	<svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M20 4C11.163 4 4 11.163 4 20v13l3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5 3.5-2.5 3.5 2.5V20C36 11.163 28.837 4 20 4z"
			fill="white"
		/>
		<circle cx="15" cy="18" r="2.5" fill="#9945FF" />
		<circle cx="25" cy="18" r="2.5" fill="#9945FF" />
	</svg>
);

const SolflareLogo = () => (
	<svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="20" cy="20" r="6" fill="white" />
		<path
			d="M20 5v6M20 29v6M5 20h6M29 20h6M9.1 9.1l4.2 4.2M26.7 26.7l4.2 4.2M30.9 9.1l-4.2 4.2M13.3 26.7l-4.2 4.2"
			stroke="white"
			strokeWidth="3"
			strokeLinecap="round"
		/>
	</svg>
);

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (jwt: string) => void;
	initialStep?: ModalStep;
	initialUserAuth?: string;
}

const SignUpModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialStep, initialUserAuth }) => {
	const [step, setStep] = useState<ModalStep>("form");
	const [method, setMethod] = useState<SignUpMethod>("email");

	const [networkName, setNetworkName] = useState("");
	const [userAuth, setUserAuth] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [termsAccepted, setTermsAccepted] = useState(false);

	const [networkAvailable, setNetworkAvailable] = useState<boolean | null>(null);
	const [networkChecking, setNetworkChecking] = useState(false);

	const [verifyCodeValue, setVerifyCodeValue] = useState("");
	const [pendingUserAuth, setPendingUserAuth] = useState("");

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [walletLoading, setWalletLoading] = useState<SolanaWalletType | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [resending, setResending] = useState(false);
	const [instantResult, setInstantResult] = useState<{
		seedphrase: string;
		networkName?: string;
		jwt: string;
	} | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { connectAndSign, isPhantomAvailable, isSolflareAvailable } = useWalletLogin();

	const resetForm = useCallback(() => {
		setStep("form");
		setMethod("email");
		setNetworkName("");
		setUserAuth("");
		setPassword("");
		setShowPassword(false);
		setTermsAccepted(false);
		setNetworkAvailable(null);
		setNetworkChecking(false);
		setVerifyCodeValue("");
		setPendingUserAuth("");
		setIsSubmitting(false);
		setWalletLoading(null);
		setError(null);
		setResending(false);
		setInstantResult(null);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		} else if (initialStep && initialUserAuth) {
			setPendingUserAuth(initialUserAuth);
			setStep(initialStep);
		}
	}, [isOpen, resetForm, initialStep, initialUserAuth]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Never close while a freshly generated seed phrase is on screen —
			// it is shown exactly once and the account already exists
			if (e.key === "Escape" && !instantResult) onClose();
		};
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, instantResult]);

	const handleNetworkNameChange = (value: string) => {
		setNetworkName(value);
		setNetworkAvailable(null);

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		if (!value.trim()) return;

		setNetworkChecking(true);
		debounceRef.current = setTimeout(async () => {
			const result = await checkNetworkName(value.trim());
			setNetworkAvailable(result.available);
			setNetworkChecking(false);
		}, 500);
	};

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!networkName.trim()) { setError("Network name is required"); return; }
		if (networkAvailable === false) { setError("That network name is not available"); return; }
		if (!userAuth.trim()) { setError("Email or phone is required"); return; }
		if (!password.trim()) { setError("Password is required"); return; }
		if (!termsAccepted) { setError("You must accept the Terms of Service and Privacy Policy"); return; }

		setIsSubmitting(true);
		const result = await createNetwork({
			user_name: networkName.trim(),
			user_auth: userAuth.trim(),
			password: password.trim(),
			network_name: networkName.trim(),
			terms: true,
		});
		setIsSubmitting(false);

		if (result.error?.message) {
			setError(result.error.message);
			return;
		}

		if (result.verification_required) {
			setPendingUserAuth(result.verification_required.user_auth);
			setStep("verify");
			return;
		}

		if (result.network?.by_jwt) {
			setStep("success");
			setTimeout(() => {
				onSuccess(result.network!.by_jwt);
				onClose();
			}, 1500);
		}
	};

	const handleWalletSignUp = async (walletType: SolanaWalletType) => {
		setError(null);

		if (!networkName.trim()) { setError("Network name is required"); return; }
		if (networkAvailable === false) { setError("That network name is not available"); return; }
		if (!termsAccepted) { setError("You must accept the Terms of Service and Privacy Policy"); return; }

		setWalletLoading(walletType);

		let payload: WalletAuthPayload | null = null;
		try {
			payload = await connectAndSign(walletType);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Wallet connection failed");
			setWalletLoading(null);
			return;
		}

		if (!payload) {
			setError("Failed to get wallet signature");
			setWalletLoading(null);
			return;
		}

		const result = await createNetwork({
			user_name: networkName.trim(),
			network_name: networkName.trim(),
			terms: true,
			wallet_auth: payload,
		});
		setWalletLoading(null);

		if (result.error?.message) {
			setError(result.error.message);
			return;
		}

		if (result.network?.by_jwt) {
			setStep("success");
			setTimeout(() => {
				onSuccess(result.network!.by_jwt);
				onClose();
			}, 1500);
		}
	};

	const handleInstantSubmit = async () => {
		setError(null);

		if (!termsAccepted) { setError("You must accept the Terms of Service and Privacy Policy"); return; }

		setIsSubmitting(true);
		const result = await createNetworkInstant();
		setIsSubmitting(false);

		if (result.error?.message) {
			setError(result.error.message);
			return;
		}

		if (result.seedphrase && result.network?.by_jwt) {
			setInstantResult({
				seedphrase: result.seedphrase,
				networkName: result.network.network_name,
				jwt: result.network.by_jwt,
			});
		} else {
			setError("Unexpected response from server — no seed phrase returned");
		}
	};

	const handleInstantConfirmed = () => {
		if (!instantResult) return;
		const jwt = instantResult.jwt;
		setInstantResult(null);
		onSuccess(jwt);
		onClose();
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!verifyCodeValue.trim()) { setError("Verification code is required"); return; }

		setIsSubmitting(true);
		const result = await verifyCode(pendingUserAuth, verifyCodeValue.trim());
		setIsSubmitting(false);

		if (result.error?.message) {
			setError(result.error.message);
			return;
		}

		if (result.network?.by_jwt) {
			setStep("success");
			setTimeout(() => {
				onSuccess(result.network!.by_jwt);
				onClose();
			}, 1500);
		}
	};

	const handleResend = async () => {
		setResending(true);
		const result = await sendVerificationCode(pendingUserAuth);
		setResending(false);

		if (result.error?.message) {
			toast.error(`Failed to resend: ${result.error.message}`);
		} else {
			toast.success("Verification code resent");
		}
	};

	if (!isOpen) return null;

	const portalRoot = document.getElementById("portal-root") || document.body;

	const networkNameIndicator = () => {
		if (!networkName.trim()) return null;
		if (networkChecking) return <Loader2 size={16} className="animate-spin text-ur-gray" />;
		if (networkAvailable === true) return <Check size={16} className="text-ur-green" />;
		if (networkAvailable === false) return <XCircle size={16} className="text-ur-coral" />;
		return null;
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			onClick={(e) => { if (e.target === e.currentTarget && !instantResult) onClose(); }}
		>
			<div className="absolute inset-0 bg-ur-black/70 backdrop-blur-sm" />

			<div className="relative z-10 w-full max-w-md bg-ur-panel rounded-ur shadow-ur-flat border border-ur-border overflow-hidden">
				<div className="bg-ur-blue py-6 px-6 relative overflow-hidden">
					<div className="absolute inset-0 bg-ur-black/20" />
					<div className="relative z-10 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-full border border-white/30">
								<UserPlus size={20} className="text-ur-white" />
							</div>
							<div>
								<h2 className="text-ur-white text-lg font-bold leading-tight">Create Account</h2>
								<p className="text-ur-blue-light text-xs">
									{step === "verify" ? "Verify your identity" : step === "success" ? "Account created!" : "Join URnetwork today"}
								</p>
							</div>
						</div>
						<button
							onClick={() => { if (!instantResult) onClose(); }}
							className="text-ur-white/70 hover:text-ur-white transition-colors p-1 rounded-lg hover:bg-white/10"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="p-6">
					{step === "success" && (
						<div className="flex flex-col items-center py-6">
							<div className="w-16 h-16 rounded-full bg-ur-green/20 border border-ur-green/40 flex items-center justify-center mb-4">
								<Check size={32} className="text-ur-green" />
							</div>
							<h3 className="text-ur-white text-lg font-semibold mb-1">Welcome to URnetwork!</h3>
							<p className="text-ur-gray text-sm text-center">Your account has been created. Logging you in...</p>
						</div>
					)}

					{step === "verify" && (
						<form onSubmit={handleVerify} className="space-y-4">
							<div className="text-center mb-2">
								<p className="text-ur-gray text-sm">
									A verification code was sent to
								</p>
								<p className="text-ur-white text-sm font-semibold mt-0.5">{pendingUserAuth}</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-ur-gray mb-2">Verification Code</label>
								<input
									type="text"
									value={verifyCodeValue}
									onChange={(e) => setVerifyCodeValue(e.target.value)}
									placeholder="Enter the code you received"
									className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all"
									disabled={isSubmitting}
									autoFocus
								/>
							</div>

							{error && (
								<div className="text-ur-coral text-sm py-2.5 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg">
									{error}
								</div>
							)}

							<button
								type="submit"
								disabled={isSubmitting || !verifyCodeValue.trim()}
								className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-200 ${
									isSubmitting || !verifyCodeValue.trim()
										? "bg-ur-hover cursor-not-allowed opacity-60"
										: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
								}`}
							>
								{isSubmitting ? (
									<span className="flex items-center justify-center gap-2">
										<Loader2 size={16} className="animate-spin" />
										Verifying...
									</span>
								) : (
									"Verify & Continue"
								)}
							</button>

							<div className="text-center">
								<button
									type="button"
									onClick={handleResend}
									disabled={resending}
									className="text-ur-green text-sm hover:text-ur-green transition-colors disabled:opacity-50"
								>
									{resending ? "Resending..." : "Resend code"}
								</button>
							</div>
						</form>
					)}

					{step === "form" && (
						<>
							<div className="flex bg-ur-raised rounded-lg p-1 gap-1 mb-5">
								<button
									type="button"
									onClick={() => { setMethod("email"); setError(null); }}
									className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
										method === "email"
											? "bg-ur-green text-ur-black shadow-md"
											: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
									}`}
								>
									<Mail size={14} />
									Email / Phone
								</button>
								<button
									type="button"
									onClick={() => { setMethod("wallet"); setError(null); }}
									className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
										method === "wallet"
											? "bg-ur-green text-ur-black shadow-md"
											: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
									}`}
								>
									<Wallet size={14} />
									Wallet
								</button>
								<button
									type="button"
									onClick={() => { setMethod("instant"); setError(null); }}
									className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
										method === "instant"
											? "bg-ur-green text-ur-black shadow-md"
											: "text-ur-gray hover:text-ur-white hover:bg-ur-hover"
									}`}
								>
									<Sprout size={14} />
									Instant
								</button>
							</div>

							<div className="space-y-4">
								{method !== "instant" && (
								<div>
									<label className="block text-sm font-medium text-ur-gray mb-1.5">Network Name</label>
									<div className="relative">
										<input
											type="text"
											value={networkName}
											onChange={(e) => handleNetworkNameChange(e.target.value)}
											placeholder="Pick a unique network name"
											className={`w-full px-4 py-2.5 pr-9 bg-ur-raised border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm ${
												networkAvailable === true
													? "border-ur-green"
													: networkAvailable === false
													? "border-ur-coral"
													: "border-ur-border"
											}`}
										/>
										<div className="absolute right-3 top-1/2 -translate-y-1/2">
											{networkNameIndicator()}
										</div>
									</div>
									{networkAvailable === false && (
										<p className="text-ur-coral text-xs mt-1">That network name is already taken</p>
									)}
									{networkAvailable === true && (
										<p className="text-ur-green text-xs mt-1">Network name is available</p>
									)}
								</div>
								)}

								{method === "email" && (
									<form onSubmit={handleEmailSubmit} className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-ur-gray mb-1.5">Email or Phone</label>
											<input
												type="text"
												value={userAuth}
												onChange={(e) => setUserAuth(e.target.value)}
												placeholder="Enter your email or phone number"
												className="w-full px-4 py-2.5 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-ur-gray mb-1.5">Password</label>
											<div className="relative">
												<input
													type={showPassword ? "text" : "password"}
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													placeholder="Create a password"
													className="w-full px-4 py-2.5 pr-10 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm"
												/>
												<button
													type="button"
													onClick={() => setShowPassword((s) => !s)}
													className="absolute right-3 top-1/2 -translate-y-1/2 text-ur-gray hover:text-ur-white transition-colors"
												>
													{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
												</button>
											</div>
										</div>

										<label className="flex items-start gap-3 cursor-pointer group">
											<input
												type="checkbox"
												checked={termsAccepted}
												onChange={(e) => setTermsAccepted(e.target.checked)}
												className="mt-0.5 accent-ur-blue w-4 h-4 flex-shrink-0"
											/>
											<span className="text-xs text-ur-gray leading-relaxed">
												I agree to the{" "}
												<a
													href="https://ur.io/terms"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Terms of Service
												</a>{" "}
												and{" "}
												<a
													href="https://ur.io/privacy"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Privacy Policy
												</a>
											</span>
										</label>

										{error && (
											<div className="text-ur-coral text-sm py-2.5 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg">
												{error}
											</div>
										)}

										<button
											type="submit"
											disabled={isSubmitting}
											className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-200 ${
												isSubmitting
													? "bg-ur-hover cursor-not-allowed opacity-60"
													: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
											}`}
										>
											{isSubmitting ? (
												<span className="flex items-center justify-center gap-2">
													<Loader2 size={16} className="animate-spin" />
													Creating Account...
												</span>
											) : (
												"Create Account"
											)}
										</button>
									</form>
								)}

								{method === "wallet" && (
									<>
										<label className="flex items-start gap-3 cursor-pointer group">
											<input
												type="checkbox"
												checked={termsAccepted}
												onChange={(e) => setTermsAccepted(e.target.checked)}
												className="mt-0.5 accent-ur-blue w-4 h-4 flex-shrink-0"
											/>
											<span className="text-xs text-ur-gray leading-relaxed">
												I agree to the{" "}
												<a
													href="https://ur.io/terms"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Terms of Service
												</a>{" "}
												and{" "}
												<a
													href="https://ur.io/privacy"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Privacy Policy
												</a>
											</span>
										</label>

										{error && (
											<div className="text-ur-coral text-sm py-2.5 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg">
												{error}
											</div>
										)}

										<div className="space-y-2.5">
											<button
												type="button"
												onClick={() => handleWalletSignUp("phantom")}
												disabled={!isPhantomAvailable || walletLoading !== null}
												title={!isPhantomAvailable ? "Phantom extension not detected" : undefined}
												className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-200 border ${
													!isPhantomAvailable
														? "bg-ur-raised/50 border-ur-border opacity-50 cursor-not-allowed"
														: walletLoading === "phantom"
														? "bg-[#9945FF]/20 border-[#9945FF]/60 cursor-wait"
														: "bg-[#9945FF]/10 border-[#9945FF]/40 hover:bg-[#9945FF]/25 hover:border-[#9945FF]/70 active:scale-[0.98]"
												}`}
											>
												<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#9945FF] flex items-center justify-center">
													{walletLoading === "phantom" ? (
														<Loader2 size={14} className="animate-spin text-ur-white" />
													) : (
														<PhantomLogo />
													)}
												</div>
												<div className="flex-1 text-left">
													<span className="block text-sm font-semibold">Phantom</span>
													<span className="block text-xs text-ur-gray">
														{walletLoading === "phantom"
															? "Waiting for signature..."
															: isPhantomAvailable
															? "Sign up with Phantom"
															: "Extension not installed"}
													</span>
												</div>
											</button>

											<button
												type="button"
												onClick={() => handleWalletSignUp("solflare")}
												disabled={!isSolflareAvailable || walletLoading !== null}
												title={!isSolflareAvailable ? "Solflare extension not detected" : undefined}
												className={`flex items-center gap-3 w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-200 border ${
													!isSolflareAvailable
														? "bg-ur-raised/50 border-ur-border opacity-50 cursor-not-allowed"
														: walletLoading === "solflare"
														? "bg-[#FC7227]/20 border-[#FC7227]/60 cursor-wait"
														: "bg-[#FC7227]/10 border-[#FC7227]/40 hover:bg-[#FC7227]/25 hover:border-[#FC7227]/70 active:scale-[0.98]"
												}`}
											>
												<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#FC7227] flex items-center justify-center">
													{walletLoading === "solflare" ? (
														<Loader2 size={14} className="animate-spin text-ur-white" />
													) : (
														<SolflareLogo />
													)}
												</div>
												<div className="flex-1 text-left">
													<span className="block text-sm font-semibold">Solflare</span>
													<span className="block text-xs text-ur-gray">
														{walletLoading === "solflare"
															? "Waiting for signature..."
															: isSolflareAvailable
															? "Sign up with Solflare"
															: "Extension not installed"}
													</span>
												</div>
											</button>

											{!isPhantomAvailable && !isSolflareAvailable && (
												<p className="text-xs text-ur-gray-dark text-center pt-1">
													No Solana wallet detected. Install Phantom or Solflare to continue.
												</p>
											)}
										</div>
									</>
								)}

								{method === "instant" && (
									<>
										<div className="bg-ur-blue/10 border border-ur-blue/40 rounded-lg p-4 space-y-2">
											<div className="flex items-center gap-2">
												<Sprout size={16} className="text-ur-blue-light" />
												<span className="text-sm font-medium text-ur-blue-light">Instant account</span>
											</div>
											<p className="text-xs text-ur-gray leading-relaxed">
												No email, password, or wallet needed. We generate a
												24-word secret recovery phrase — that phrase{" "}
												<span className="text-ur-white">is</span> your account.
												You&apos;ll see it exactly once on the next screen, so
												have somewhere safe ready to store it.
											</p>
											<p className="text-xs text-ur-gray-dark">
												A random network name is assigned; you can claim a
												custom one later from Account Settings.
											</p>
										</div>

										<label className="flex items-start gap-3 cursor-pointer group">
											<input
												type="checkbox"
												checked={termsAccepted}
												onChange={(e) => setTermsAccepted(e.target.checked)}
												className="mt-0.5 accent-ur-blue w-4 h-4 flex-shrink-0"
											/>
											<span className="text-xs text-ur-gray leading-relaxed">
												I agree to the{" "}
												<a
													href="https://ur.io/terms"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Terms of Service
												</a>{" "}
												and{" "}
												<a
													href="https://ur.io/privacy"
													target="_blank"
													rel="noopener noreferrer"
													className="text-ur-green hover:text-ur-green underline"
													onClick={(e) => e.stopPropagation()}
												>
													Privacy Policy
												</a>
											</span>
										</label>

										{error && (
											<div className="text-ur-coral text-sm py-2.5 px-4 bg-ur-coral/10 border border-ur-coral/30 rounded-lg">
												{error}
											</div>
										)}

										<button
											type="button"
											onClick={handleInstantSubmit}
											disabled={isSubmitting}
											className={`w-full py-3 px-4 rounded-lg font-medium text-ur-white transition-all duration-200 ${
												isSubmitting
													? "bg-ur-hover cursor-not-allowed opacity-60"
													: "bg-ur-blue hover:bg-ur-blue-hover active:scale-[0.98]"
											}`}
										>
											{isSubmitting ? (
												<span className="flex items-center justify-center gap-2">
													<Loader2 size={16} className="animate-spin" />
													Generating your account...
												</span>
											) : (
												"Create Instant Account"
											)}
										</button>
									</>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			{instantResult && (
				<SeedphraseDisplayModal
					isOpen={true}
					seedphrase={instantResult.seedphrase}
					networkName={instantResult.networkName}
					title="Secure Your New Account"
					confirmLabel="Enter Dashboard"
					onConfirm={handleInstantConfirmed}
				/>
			)}
		</div>,
		portalRoot
	);
};

export default SignUpModal;
