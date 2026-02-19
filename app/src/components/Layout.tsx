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

	useEffect(() => {
		if (isAuthenticated) {
			const timer = setTimeout(() => {
				setShowDashboard(true);
			}, 300);
			return () => clearTimeout(timer);
		} else {
			setShowDashboard(false);
		}
	}, [isAuthenticated]);

	useAutoLogin();

	// Get current tab from URL
	const getCurrentTab = (): TabType => {
		const path = location.pathname;
		if (path === "/stats") return "stats";
		if (path === "/leaderboard") return "leaderboard";
		if (path === "/providers") return "providers";
		if (path === "/wallet-stats") return "wallet-stats";
		if (path === "/account") return "account";
		if (path === "/balance-codes") return "balance-codes";
		return "clients"; // default
	};

	const activeTab = getCurrentTab();

	const tabs = [
		{ id: "clients", label: "Clients", color: "blue", index: 0 },
		{ id: "stats", label: "Statistics", color: "green", index: 1 },
		{ id: "leaderboard", label: "Leaderboard", color: "yellow", index: 2 },
		{ id: "providers", label: "Providers", color: "purple", index: 3 },
		{ id: "wallet-stats", label: "Wallet Stats", color: "indigo", index: 4 },
		{ id: "account", label: "Account Settings", color: "gray", index: 5 },
		{ id: "balance-codes", label: "Balance Codes", color: "emerald", index: 6 },
	];

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
		<div className="min-h-screen flex flex-col bg-gray-900">
			{isAuthenticated && (
				<header className={`bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white shadow-2xl border-b border-gray-700 ${isLoggingOut ? 'animate-unlockSequence' : showDashboard ? 'animate-slideInFromTop' : ''}`} style={{ opacity: showDashboard ? 1 : 0 }}>
					<div className="px-4 py-4">
						<div className="flex justify-between items-center gap-4">
							<div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
								<div className="p-2 bg-blue-600 rounded-lg shadow-lg">
									<TerminalSquare
										size={20}
										className="text-white md:w-6 md:h-6"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
										URnetwork
										<span className="hidden md:inline">
											&nbsp;Client Manager
										</span>
									</h1>
									<p className="text-xs text-gray-400 hidden md:block">
										Beta Application
									</p>
								</div>
							</div>

							<div className="flex items-center space-x-2 md:space-x-3">
								<button
									onClick={logout}
									disabled={isLoggingOut || isTransitioning}
									className={`flex items-center space-x-1 md:space-x-2 text-white px-3 md:px-4 py-2 rounded-lg transition-all duration-200 border shadow-lg flex-shrink-0 ${
										isLoggingOut || isTransitioning
											? "bg-gray-800 border-gray-700 cursor-not-allowed opacity-60"
											: "bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500 hover:shadow-xl"
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
				{isAuthenticated && (
					<>
						<div className={`bg-gray-800 rounded-xl border border-gray-700 shadow-2xl ${isLoggingOut ? 'animate-unlockSequence' : showDashboard ? 'animate-expandFromCenter' : ''}`} style={{ opacity: showDashboard ? 1 : 0, overflow: viewportType === ViewportType.Mobile ? 'visible' : 'hidden', position: 'relative', zIndex: 10 }}>
							{viewportType === ViewportType.Mobile ? (
								<div className="p-2" style={{ overflow: 'visible' }}>
									<div className="relative" style={{ zIndex: 1000 }}>
										<button
											onClick={() =>
												setShowMobileMenu(
													!showMobileMenu,
												)
											}
											className={`w-full flex items-center justify-between py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-gradient-to-r from-${activeTabData?.color}-600 to-${activeTabData?.color}-500 text-white shadow-lg`}
										>
											<span>{activeTabData?.label}</span>
											<ChevronDown
												size={16}
												className={`transition-transform duration-200 ${showMobileMenu ? "rotate-180" : ""}`}
											/>
										</button>

										{showMobileMenu && (
											<div className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl animate-fadeIn" style={{ backgroundColor: 'rgb(31, 41, 55)', border: '2px solid rgb(75, 85, 99)', zIndex: 9999 }}>
												{tabs.map((tab) => (
													<button
														key={tab.id}
														onClick={() =>
															handleTabChange(
																tab.id as TabType,
															)
														}
														className={`w-full text-left py-4 px-4 text-sm font-semibold transition-all duration-200 first:rounded-t-lg last:rounded-b-lg border-b last:border-b-0 ${
															activeTab === tab.id
																? `bg-gradient-to-r from-${tab.color}-600 to-${tab.color}-500 text-white`
																: "text-white hover:bg-gray-700 active:bg-gray-600"
														}`}
														style={{
															pointerEvents: 'auto',
															touchAction: 'manipulation',
															backgroundColor: activeTab === tab.id ? undefined : 'rgb(55, 65, 81)',
															borderColor: 'rgb(75, 85, 99)'
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
													tab.id as TabType,
												)
											}
											className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
												activeTab === tab.id
													? `bg-gradient-to-r from-${tab.color}-600 to-${tab.color}-500 text-white shadow-lg transform scale-105`
													: "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
									path="/balance-codes"
									element={<BalanceCodesSection />}
								/>
							</Routes>
						</div>
					</>
				)}
				{!isAuthenticated && (
					<Routes>
						<Route path="*" element={<AuthSection />} />
					</Routes>
				)}
			</main>
			<footer className="bg-gray-800 border-t border-gray-700 text-gray-300 py-6">
				<div className="container mx-auto px-4 text-center">
					<div className="flex items-center justify-center space-x-2 mb-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
						<p className="text-sm font-medium">
							URnetwork Client Manager
						</p>
					</div>
					<p className="text-xs text-gray-500">
						Beta Application
					</p>
				</div>
			</footer>
		</div>
	);
};

export default Layout;
