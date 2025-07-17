import React, { FormEvent, useRef, useState } from "react";
import { KeyRound, Shield, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const AuthSection: React.FC = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [activeTab, setActiveTab] = useState<"code" | "password">("code");
	const { login, loginWithPassword, isLoading, isAutoLoginAttempted } = useAuth();
	const authCodeInputRef = useRef<HTMLInputElement>(null);
	const [isAuthCodeValid, setIsAuthCodeValid] = useState(false);
	const [loginWithPasswordError, setLoginWithPasswordError] = useState<
		string | null
	>(null);

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

		const response = await loginWithPassword(username, password);

		if (response?.verification_required) {
			// Handle verification required case - could show a verification form
			console.log(
				"Verification required for:",
				response.verification_required.user_auth,
			);
		}
	};

	// Show loading state if auto-login is being attempted and we're loading
	if (isAutoLoginAttempted && isLoading) {
		return (
			<div className="max-w-lg mx-auto mt-12">
				<div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
					<div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 py-8 px-6 relative overflow-hidden">
						<div className="absolute inset-0 bg-black/20"></div>
						<div className="relative z-10">
							<div className="flex justify-center mb-4">
								<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
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
								<div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse"></div>
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
		<div className="max-w-lg mx-auto mt-12">
			<div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:shadow-3xl border border-gray-700">
				<div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 py-8 px-6 relative overflow-hidden">
					<div className="absolute inset-0 bg-black/20"></div>
					<div className="relative z-10">
						<div className="flex justify-center mb-4">
							<div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
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
						<h2 className="text-white text-center text-2xl font-bold mb-2">
							Secure Authentication
						</h2>
						<p className="text-blue-100 text-center text-sm">
							{activeTab === "code"
								? "Enter your authentication code to access the dashboard"
								: "Sign in with your email/phone and password"}
						</p>
					</div>

					{/* Decorative elements */}
					<div className="absolute top-4 right-4 opacity-20">
						<Shield size={24} className="text-white" />
					</div>
					<div className="absolute bottom-4 left-4 opacity-20">
						<Lock size={20} className="text-white" />
					</div>
				</div>

				<div className="p-6 bg-gray-800">
					{/* Tab Selector */}
					<div className="flex mb-6 bg-gray-700 rounded-lg p-1">
						<button
							type="button"
							onClick={() => setActiveTab("code")}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
								activeTab === "code"
									? "bg-blue-600 text-white shadow-lg"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<KeyRound size={16} className="inline mr-2" />
							Auth Code
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("password")}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
								activeTab === "password"
									? "bg-blue-600 text-white shadow-lg"
									: "text-gray-300 hover:text-white hover:bg-gray-600"
							}`}
						>
							<Mail size={16} className="inline mr-2" />
							Email/Phone
						</button>
					</div>

					{/* Auth Code Form */}
					{activeTab === "code" && (
						<form onSubmit={handleCodeSubmit}>
							<div className="mb-6">
								<label
									htmlFor="authCode"
									className="block text-sm font-medium text-gray-300 mb-2"
								>
									Authentication Code
								</label>
								<input
									id="authCode"
									type="text"
									ref={authCodeInputRef}
									onChange={(e) =>
										setIsAuthCodeValid(
											!!e.target.value.trim(),
										)
									}
									className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white placeholder-gray-400"
									placeholder="Enter your one time auth code"
									disabled={isLoading}
									required
								/>
							</div>

							<button
								type="submit"
								disabled={isLoading || !isAuthCodeValid}
								className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 transform ${
									isLoading || !isAuthCodeValid
										? "bg-gray-600 cursor-not-allowed"
										: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl"
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

					{/* Email/Password Form */}
					{activeTab === "password" && (
						<form onSubmit={handlePasswordSubmit}>
							<div className="mb-4">
								<label
									htmlFor="userAuth"
									className="block text-sm font-medium text-gray-300 mb-2"
								>
									Email or Phone Number
								</label>
								<input
									id="userAuth"
									type="text"
									name="user_auth"
									className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white placeholder-gray-400"
									placeholder="Enter your email or phone number"
									disabled={isLoading}
									required
								/>
							</div>

							<div className="mb-6">
								<label
									htmlFor="password"
									className="block text-sm font-medium text-gray-300 mb-2"
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
										className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white placeholder-gray-400"
										placeholder="Enter your password"
										disabled={isLoading}
										required
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword((s) => !s)
										}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
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

              {loginWithPasswordError && <div className="text-red-500 py-3">
                  {loginWithPasswordError}
                </div>}

							<button
								type="submit"
								disabled={isLoading}
								className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 transform ${
									isLoading
										? "bg-gray-600 cursor-not-allowed"
										: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl"
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

					<div className="mt-4 text-center">
						<p className="text-xs text-gray-500">
							Preview Application • Data Stored Locally
						</p>
						<p className="text-xs text-gray-600 mt-1">
							Supports automatic authentication via URL parameter
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthSection;
