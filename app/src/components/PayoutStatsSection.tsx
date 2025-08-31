import React, { useState, useEffect, useRef } from "react";
import {
	CreditCard,
	RefreshCw,
	AlertCircle,
	DollarSign,
	Calendar,
	Hash,
	ExternalLink,
	CheckCircle,
	Clock,
	TrendingUp,
	Database,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { fetchAccountPayments } from "../services/api";
import type { AccountPayment } from "../services/api";
import toast from "react-hot-toast";

const StatCard = ({
	title,
	value,
	icon: Icon,
	gradient,
}: {
	title: string;
	value: string | number;
	icon: React.ElementType;
	gradient: string;
}) => (
	<div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300">
		<div className="flex items-center justify-between">
			<div>
				<p className="text-sm text-gray-400">{title}</p>
				<p className="text-2xl font-semibold mt-1 text-white">
					{value}
				</p>
			</div>
			<div className={`${gradient} p-3 rounded-xl shadow-lg`}>
				<Icon className="h-6 w-6 text-white" />
			</div>
		</div>
	</div>
);

const PayoutStatsSection: React.FC = () => {
	const { token } = useAuth();
	const [payments, setPayments] = useState<AccountPayment[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string>("");
	const tableWrapperRef = useRef<HTMLDivElement | null>(null);
	const initialRenderRef = useRef<boolean>(true);

	useEffect(() => {
		if (!initialRenderRef.current || isLoading) {
			return;
		}

		setTimeout(
			() =>
				tableWrapperRef.current?.scroll({
					left: 100000,
				}),
			120,
		);

		initialRenderRef.current = false;
	}, [isLoading]);

	const loadPayments = async (showToast: boolean = false) => {
		if (!token) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetchAccountPayments(token);

			if (response.error) {
				setError(response.error.message);
				toast.error(response.error.message);
			} else {
				setPayments(response.account_payments || []);
				setLastUpdated(new Date().toISOString());
				if (showToast) {
					toast.success("Payout Stats updated successfully");
				}
			}
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to load payout data";
			setError(message);
			if (showToast) {
				toast.error(message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadPayments(false);
	}, [token]); // eslint-disable-line react-hooks/exhaustive-deps

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	const formatBytes = (bytes: number): string => {
		const gb = bytes / (1000 * 1000 * 1000);
		const tb = gb / 1000;

		if (tb >= 1) {
			return `${tb.toFixed(2)} TB`;
		} else {
			return `${gb.toFixed(2)} GB`;
		}
	};

	const calculateTotals = () => {
		return payments.reduce(
			(acc, payment) => ({
				totalPayouts: acc.totalPayouts + payment.token_amount,
				totalBytes: acc.totalBytes + payment.payout_byte_count,
				completedPayments:
					acc.completedPayments + (payment.completed ? 1 : 0),
				pendingPayments:
					acc.pendingPayments +
					(!payment.completed && !payment.canceled ? 1 : 0),
			}),
			{
				totalPayouts: 0,
				totalBytes: 0,
				completedPayments: 0,
				pendingPayments: 0,
			},
		);
	};

	const totals = calculateTotals();

	return (
		<div className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h3 className="text-2xl font-bold text-white flex items-center gap-3">
						<CreditCard className="text-green-400" size={24} />
						Payout Statistics
					</h3>
					<p className="text-gray-400 mt-2">
						Detailed history of all payouts and earnings
					</p>
					{lastUpdated && (
						<p className="text-sm text-gray-500 mt-1">
							Last updated: {formatDate(lastUpdated)}
						</p>
					)}
				</div>

				<button
					onClick={() => loadPayments(true)}
					disabled={isLoading}
					className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all duration-200 border border-green-500 hover:shadow-lg"
				>
					<RefreshCw
						size={16}
						className={isLoading ? "animate-spin" : ""}
					/>
					Refresh Payouts
				</button>
			</div>

			{error && (
				<div className="bg-red-900/50 border border-red-700 p-4 rounded-xl flex items-start gap-3">
					<AlertCircle
						size={20}
						className="text-red-400 mt-0.5 flex-shrink-0"
					/>
					<div>
						<h3 className="font-medium text-red-300">
							Error loading payout data
						</h3>
						<p className="text-red-200">{error}</p>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="flex justify-center py-12">
					<div className="relative">
						<div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-green-500"></div>
						<div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 animate-pulse"></div>
					</div>
				</div>
			) : (
				<div className="space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<StatCard
							title="Total USDC Earned"
							value={`$${totals.totalPayouts.toFixed(4)}`}
							icon={DollarSign}
							gradient="bg-gradient-to-r from-green-600 to-emerald-600"
						/>
						<StatCard
							title="Total Data Paid"
							value={formatBytes(totals.totalBytes)}
							icon={Database}
							gradient="bg-gradient-to-r from-blue-600 to-indigo-600"
						/>
						<StatCard
							title="Completed Payments"
							value={totals.completedPayments}
							icon={CheckCircle}
							gradient="bg-gradient-to-r from-emerald-600 to-teal-600"
						/>
						<StatCard
							title="Total Payments"
							value={payments.length}
							icon={TrendingUp}
							gradient="bg-gradient-to-r from-purple-600 to-pink-600"
						/>
					</div>

					<div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
						<div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-2 lg:px-6 lg:py-4 border-b border-gray-600">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-base lg:text-lg font-medium text-gray-100 flex items-center gap-2">
										<CreditCard
											size={20}
											className="text-green-400"
										/>
										Payment Timeline
									</h3>
									<p className="text-xs lg:text-sm text-gray-300 mt-1">
										History of payouts and earnings
									</p>
								</div>
								<div className="bg-gray-600 text-gray-200 px-3 py-1 rounded-lg border border-gray-500 text-xs lg:text-sm">
									{payments.length} payments
								</div>
							</div>
						</div>
						<div
							className="rotate-180 overflow-x-scroll"
							ref={tableWrapperRef}
						>
							{payments.length === 0 && !isLoading ? (
								<div className="text-center py-12 -rotate-180">
									<div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
										<CreditCard
											className="text-gray-500"
											size={24}
										/>
									</div>
									<h3 className="text-lg font-medium text-gray-200 mb-2">
										No Payments Found
									</h3>
									<p className="text-gray-400 italic px-3">
										No payout data available. Try refreshing
										the data.
									</p>
								</div>
							) : (
								<table className="min-w-full divide-y divide-gray-700 -rotate-180">
									<thead className="bg-gray-900">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Amount
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Data Transferred
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Payment Time
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Transaction
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
												Blockchain
											</th>
										</tr>
									</thead>
									<tbody className="bg-gray-800 divide-y divide-gray-700">
										{payments.map((payment, index) => (
											<tr
												key={payment.payment_id}
												className={`hover:bg-gray-700/50 transition-colors ${index === 0 ? "bg-green-900/20 border-l-4 border-green-500" : ""}`}
											>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															payment.completed
																? "bg-green-900 text-green-300 border border-green-700"
																: payment.canceled
																	? "bg-red-900 text-red-300 border border-red-700"
																	: "bg-yellow-900 text-yellow-300 border border-yellow-700"
														}`}
													>
														{payment.completed ? (
															<>
																<CheckCircle
																	size={12}
																	className="mr-1"
																/>
																Completed
															</>
														) : payment.canceled ? (
															"Canceled"
														) : (
															<>
																<Clock
																	size={12}
																	className="mr-1"
																/>
																Pending
															</>
														)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
													$
													{payment.token_amount.toFixed(
														4,
													)}{" "}
													{payment.token_type}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 font-medium">
													{formatBytes(
														payment.payout_byte_count,
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
													<div className="flex items-center gap-2">
														<Calendar
															size={14}
															className="text-gray-500"
														/>
														{formatDate(
															payment.payment_time,
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
													<div className="flex items-center gap-2">
														<Hash
															size={14}
															className="text-gray-500"
														/>
														<span className="font-mono text-xs">
															{payment.tx_hash.substring(
																0,
																Math.floor(
																	payment
																		.tx_hash
																		.length /
																		4,
																),
															)}
															...
															{payment.tx_hash.substring(
																Math.floor(
																	payment
																		.tx_hash
																		.length *
																		(3 / 4),
																),
															)}
														</span>
														<a
															href={`https://solscan.io/tx/${payment.tx_hash}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-blue-400 hover:text-blue-300 transition-colors"
														>
															<ExternalLink
																size={12}
															/>
														</a>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400 font-medium">
													{payment.blockchain}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PayoutStatsSection;
