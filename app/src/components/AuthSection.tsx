import React, { FormEvent, useRef, useState } from "react";
import { KeyRound, Shield, Lock, Mail, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const AuthSection: React.FC = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [activeTab, setActiveTab] = useState<"code" | "password">("code");
	const { login, loginWithPassword, isLoading, isAutoLoginAttempted, isTransitioning, isLoggingOut } = useAuth();
	const authCodeInputRef = useRef<HTMLInputElement>(null);
	const [isAuthCodeValid, setIsAuthCodeValid] = useState(false);
	const [isEmailValid, setIsEmailValid] = useState(false);
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [authCodeFocused, setAuthCodeFocused] = useState(false);
	const [emailFocused, setEmailFocused] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const [loginWithPasswordError, setLoginWithPasswordError] = useState<
		string | null
	>(null);
	const [previousTab, setPreviousTab] = useState<"code" | "password">("code");
	const [iconKey, setIconKey] = useState(0);

	const handleTabChange = (tab: "code" | "password") => {
		if (tab !== activeTab) {
			setPreviousTab(activeTab);
			setActiveTab(tab);
			setIconKey((prev) => prev + 1);
			setLoginWithPasswordError(null);
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

		await loginWithPassword(username, password);
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
									<KeyRound
										size={32}
										className="text-white"
									/>
								</div>
							</div>
							<h2 className="text-white text-center text-2xl font-bold mb-2">
								Authenticating...
							</h2>
							<p className="text-blue-100 text-center text-sm">
								Processing your authentication code
								automatically
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
								Please wait while we authenticate you with the
								provided code...
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
									{activeTab === "code" ? (
										<KeyRound
											size={32}
											className="text-white"
										/>
									) : (
										<Mail size={32} className="text-white" />
									)}
								</div>
							</div>
						</div>
						<h2 className="text-white text-center text-2xl font-bold mb-2">
							Sign in to URnetwork
						</h2>
						<p className="text-blue-100 text-center text-sm transition-all duration-300">
							{activeTab === "code"
								? "Enter your authentication code to access the dashboard"
								: "Sign in with your email/phone and password"}
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
					<div className="flex mb-6 bg-gray-700 rounded-lg p-1">
						<button
							type="button"
							onClick={() => handleTabChange("code")}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "code"
									? "bg-blue-600 text-white shadow-lg scale-105"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<KeyRound size={16} className="inline mr-2" />
							Auth Code
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("password")}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
								activeTab === "password"
									? "bg-blue-600 text-white shadow-lg scale-105"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<Mail size={16} className="inline mr-2" />
							Email/Phone
						</button>
					</div>

					<div className="relative">
						{activeTab === "code" && (
							<form
								onSubmit={handleCodeSubmit}
								className={previousTab === "password" ? "animate-slideInFromLeft" : "animate-slideInFromRight"}
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
											<svg
												className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
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
								className={previousTab === "code" ? "animate-slideInFromRight" : "animate-slideInFromLeft"}
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
											type={
												showPassword ? "text" : "password"
											}
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
											onClick={() =>
												setShowPassword((s) => !s)
											}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-all duration-300 hover:scale-110"
											disabled={isLoading}
										>
											{showPassword ? (
												<EyeOff size={20} />
											) : (
												<Eye size={20} />
											)}
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
											<svg
												className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											Signing In...
										</span>
									) : (
										"Sign In"
									)}
								</button>
							</form>
						)}
					</div>

					<div className="mt-6 text-center">
						<p className="text-xs text-gray-500">
							Beta Application
						</p>
						<p className="text-xs text-gray-600 mt-1">
							Unfinished Product. Major Changes Expected.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthSection;
