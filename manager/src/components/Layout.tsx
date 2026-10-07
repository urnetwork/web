import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { TerminalSquare, LogOut } from "lucide-react";
import AuthSection from "./AuthSection";
import ClientsSection from "./ClientsSection";
import StatsSection from "./StatsSection";
import LeaderboardSection from "./LeaderboardSection";
import ProvidersSection from "./ProvidersSection";
import WalletStatsSection from "./WalletStatsSection";
import AccountSettingsSection from "./AccountSettingsSection";
import { ChevronDown } from "lucide-react";
import { useViewportType, ViewportType } from "../hooks/useViewportType";
import { useAuth } from "../hooks/useAuth";
import { useAutoLogin } from "../hooks/useAutoLogin";
import BalanceCodesSection from "./BalanceCodesSection";
import ApiKeysSection from "./ApiKeysSection";
import LoginExtension from "../pages/LoginExtension";
import ConfirmModal from "./ConfirmModal";

const EXTENSION_RETURN_KEY = 'extension_return_to';

const Layout: React.FC = () => {
	type TabType =
		| "clients"
		| "stats"
		| "leaderboard"
		| "providers"
		| "wallet-stats"
		| "account"
		| "balance-codes";

	const { isAuthenticated, logout, isLoggingOut, isTransitioning } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [showDashboard, setShowDashboard] = useState(false);
	const [previousTab, setPreviousTab] = useState<TabType>("clients");
	const [animationDirection, setAnimationDirection] = useState<"left" | "right" | "none">("none");
	const viewportType = useViewportType();

	const isExtensionRoute = location.pathname.startsWith('/login-extension');

	useEffect(() => {
		if (isAuthenticated) {
			const returnTo = sessionStorage.getItem(EXTENSION_RETURN_KEY);
			if (returnTo && returnTo.startsWith('/login-extension')) {
				sessionStorage.removeItem(EXTENSION_RETURN_KEY);
				navigate(returnTo, { replace: true });
				return;
			}

			const timer = setTimeout(() => {
				setShowDashboard(true);
			}, 300);
			return () => clearTimeout(timer);
		} else {
			setShowDashboard(false);
		}
	}, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

	// a sign-in link (?auth_code=…) for another network waits for an answer
	const { pendingSwitch, confirmSwitch, cancelSwitch } = useAutoLogin();

	// Get current tab from URL
	const getCurrentTab = (): TabType => {
		const path = location.pathname;
		if (path === "/stats") return "stats";
		if (path === "/leaderboard") return "leaderboard";
		if (path === "/providers") return "providers";
		if (path === "/wallet-stats") return "wallet-stats";
		if (path.startsWith("/account")) return "account";
		if (path === "/balance-codes") return "balance-codes";
		return "clients"; // default
	};

	const activeTab = getCurrentTab();

	const tabs: { id: TabType; label: string; index: number }[] = [
		{ id: "clients", label: "Clients", index: 0 },
		{ id: "stats", label: "Statistics", index: 1 },
		{ id: "leaderboard", label: "Leaderboard", index: 2 },
		{ id: "providers", label: "Providers", index: 3 },
		{ id: "wallet-stats", label: "Wallet Stats", index: 4 },
		{ id: "account", label: "Account Settings", index: 5 },
		{ id: "balance-codes", label: "Balance Codes", index: 6 },
	];

	// Static class map — Tailwind can't generate classes from template
	// interpolation, so every active-tab style must be a complete literal.
	const TAB_ACTIVE_STYLES: Record<TabType, string> = {
		clients: "bg-ur-green text-ur-black shadow-ur-flat",
		stats: "bg-ur-blue-light text-ur-black shadow-ur-flat",
		leaderboard: "bg-ur-yellow-light text-ur-black shadow-ur-flat",
		providers: "bg-ur-pink text-ur-black shadow-ur-flat",
		"wallet-stats": "bg-ur-blue text-ur-white shadow-ur-flat",
		account: "bg-ur-gray text-ur-black shadow-ur-flat",
		"balance-codes": "bg-ur-navy text-ur-white shadow-ur-flat",
	};

	const activeTabData = tabs.find((tab) => tab.id === activeTab);

	const handleTabChange = (tabId: TabType) => {
		// Don't do anything if clicking the same tab
		if (tabId === activeTab) {
			setShowMobileMenu(false);
			return;
		}

		const currentIndex = tabs.find(tab => tab.id === activeTab)?.index || 0;
		const newIndex = tabs.find(tab => tab.id === tabId)?.index || 0;

		if (currentIndex < newIndex) {
			setAnimationDirection("left");
		} else if (currentIndex > newIndex) {
			setAnimationDirection("right");
		} else {
			setAnimationDirection("none");
		}

		setPreviousTab(activeTab);

		const path = tabId === "clients" ? "/" : `/${tabId}`;
		navigate(path);
		setShowMobileMenu(false);
	};

	useEffect(() => {
		const currentTab = getCurrentTab();
		if (currentTab !== previousTab) {
			setPreviousTab(currentTab);
		}
	}, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="min-h-screen flex flex-col bg-ur-black">
			{isAuthenticated && (
				<header className={`bg-ur-black text-ur-white border-b border-ur-border ${isLoggingOut ? 'animate-unlockSequence' : showDashboard ? 'animate-slideInFromTop' : ''}`} style={{ opacity: showDashboard ? 1 : 0 }}>
					<div className="px-4 py-4">
						<div className="flex justify-between items-center gap-4">
							<div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
								<div className="p-2 bg-ur-blue rounded-ur-sm">
									<TerminalSquare
										size={20}
										className="text-ur-white md:w-6 md:h-6"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<h1 className="text-lg md:text-xl font-display text-ur-white truncate">
										URnetwork
										<span className="hidden md:inline">
											&nbsp;Client Manager
										</span>
									</h1>
									<p className="text-xs text-ur-gray-dark hidden md:block">
										Beta Application
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-2 md:space-x-3">
								<button
									onClick={logout}
									disabled={isLoggingOut || isTransitioning}
									className={`flex items-center space-x-1 md:space-x-2 font-pixel text-base px-3 md:px-4 py-2 rounded-ur transition-colors duration-100 border flex-shrink-0 ${
										isLoggingOut || isTransitioning
											? "bg-transparent text-ur-gray-dark border-ur-border cursor-not-allowed opacity-60"
											: "bg-transparent text-ur-gray-dark border-ur-gray-dark hover:bg-ur-tint hover:text-ur-gray"
									}`}
								>
									<LogOut
										size={14}
										className="md:w-4 md:h-4"
									/>
									<span className="text-sm md:text-base">
										Logout
									</span>
								</button>
							</div>
						</div>
					</div>
				</header>
			)}
			<main className="flex-grow container mx-auto px-4 py-8">
				{isAuthenticated && isExtensionRoute && (
					<Routes>
						<Route path="/login-extension" element={<LoginExtension />} />
					</Routes>
				)}
				{isAuthenticated && !isExtensionRoute && (
					<>
						<div className={`bg-ur-panel rounded-ur border border-ur-border shadow-ur-flat ${isLoggingOut ? 'animate-unlockSequence' : showDashboard ? 'animate-expandFromCenter' : ''}`} style={{ opacity: showDashboard ? 1 : 0, overflow: viewportType === ViewportType.Mobile ? 'visible' : 'hidden', position: 'relative', zIndex: 10 }}>
							{viewportType === ViewportType.Mobile ? (
								<div className="p-2" style={{ overflow: 'visible' }}>
									<div className="relative" style={{ zIndex: 1000 }}>
										<button
											onClick={() =>
												setShowMobileMenu(
													!showMobileMenu,
												)
											}
											className={`w-full flex items-center justify-between py-3 px-4 rounded-ur-sm font-pixel text-base transition-colors duration-100 ${TAB_ACTIVE_STYLES[activeTab]}`}
										>
											<span>{activeTabData?.label}</span>
											<ChevronDown
												size={16}
												className={`transition-transform duration-200 ${showMobileMenu ? "rotate-180" : ""}`}
											/>
										</button>

										{showMobileMenu && (
											<div className="absolute top-full left-0 right-0 mt-2 rounded-ur-sm shadow-ur-flat bg-ur-panel border-2 border-ur-border animate-fadeIn" style={{ zIndex: 9999 }}>
												{tabs.map((tab) => (
													<button
														key={tab.id}
														onClick={() =>
															handleTabChange(
																tab.id,
															)
														}
														className={`w-full text-left py-4 px-4 text-sm font-semibold transition-colors duration-100 first:rounded-t-lg last:rounded-b-lg border-b border-ur-border last:border-b-0 ${
															activeTab === tab.id
																? TAB_ACTIVE_STYLES[tab.id]
																: "bg-ur-raised text-ur-white hover:bg-ur-hover active:bg-ur-active"
														}`}
														style={{
															pointerEvents: 'auto',
															touchAction: 'manipulation',
														}}
													>
														{tab.label}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							) : (
								<nav className="flex space-x-1 p-2">
									{tabs.map((tab) => (
										<button
											key={tab.id}
											onClick={() =>
												handleTabChange(
													tab.id,
												)
											}
											className={`flex-1 py-3 px-4 rounded-ur-sm font-pixel text-base transition-all duration-200 ${
												activeTab === tab.id
													? `${TAB_ACTIVE_STYLES[tab.id]} transform scale-105`
													: "text-ur-gray hover:text-ur-white hover:bg-ur-raised"
											}`}
										>
											{tab.label}
										</button>
									))}
								</nav>
							)}
						</div>

						<div
							className={`mt-8 tab-content-wrapper ${
								isLoggingOut
									? "animate-unlockSequence"
									: animationDirection === "left"
									? "animate-tabSlideFadeLeft"
									: animationDirection === "right"
									? "animate-tabSlideFadeRight"
									: ""
							}`}
							key={location.pathname}
						>
							<Routes>
								<Route path="/" element={<ClientsSection />} />
								<Route
									path="/stats"
									element={<StatsSection />}
								/>
								<Route
									path="/leaderboard"
									element={<LeaderboardSection />}
								/>
								<Route
									path="/providers"
									element={<ProvidersSection />}
								/>
								<Route
									path="/wallet-stats"
									element={<WalletStatsSection />}
								/>
								<Route
									path="/account"
									element={<AccountSettingsSection />}
								/>
								<Route
									path="/account/api-keys"
									element={<ApiKeysSection />}
								/>
								<Route
									path="/balance-codes"
									element={<BalanceCodesSection />}
								/>
							</Routes>
						</div>
					</>
				)}
				{!isAuthenticated && (
					<Routes>
						<Route path="/login-extension" element={<LoginExtension />} />
						<Route path="*" element={<AuthSection />} />
					</Routes>
				)}
			</main>
			<footer className="bg-ur-black border-t border-ur-border text-ur-gray py-6">
				<div className="container mx-auto px-4 text-center">
					<div className="flex items-center justify-center space-x-2 mb-2">
						<div className="w-2 h-2 bg-ur-green rounded-full animate-pulse"></div>
						<p className="text-sm font-medium">
							URnetwork Client Manager
						</p>
					</div>
					<p className="text-xs text-ur-gray-dark">
						Beta Application
					</p>
				</div>
			</footer>
			<ConfirmModal
				isOpen={pendingSwitch !== null}
				onClose={cancelSwitch}
				onConfirm={confirmSwitch}
				title="Switch accounts?"
			>
				<p className="text-ur-gray break-words">
					This link signs in to{" "}
					<span className="font-medium text-ur-white">{pendingSwitch?.linkNetwork}</span>.
					You are signed in to{" "}
					<span className="font-medium text-ur-white">{pendingSwitch?.currentNetwork}</span>.
				</p>
			</ConfirmModal>
		</div>
	);
};

export default Layout;
