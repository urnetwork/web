import React, { useState, useEffect, useRef, useMemo } from "react";
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
	Star,
	Sparkles,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { fetchAccountPayments, fetchAccountPoints } from "../services/api";
import type { AccountPayment, AccountPoint } from "../services/api";
import toast from "react-hot-toast";

const StatCard = ({
	title,
	value,
	icon: Icon,
	accent,
}: {
	title: string;
	value: string | number;
	icon: React.ElementType;
	accent: string;
}) => (
	<div className="bg-ur-panel rounded-ur shadow-ur-flat p-6 border border-ur-border hover:border-ur-border transition-all duration-300">
		<div className="flex items-center justify-between">
			<div>
				<p className="text-sm text-ur-gray">{title}</p>
				<p className="text-2xl font-semibold mt-1 text-ur-white">
					{value}
				</p>
			</div>
			<div className={`${accent} p-3 rounded-ur shadow-ur-flat`}>
				<Icon className="h-6 w-6 text-ur-black" />
			</div>
		</div>
	</div>
);

const formatNumber = (num: number): string => {
	if (num >= 1_000_000_000) {
		return `${(num / 1_000_000_000).toFixed(2)}B`;
	} else if (num >= 1_000_000) {
		return `${(num / 1_000_000).toFixed(2)}M`;
	} else if (num >= 1_000) {
		return `${(num / 1_000).toFixed(2)}K`;
	}
	return num.toLocaleString("en-US");
};

const PayoutStatsSection: React.FC = () => {
	const { token } = useAuth();
	const [payments, setPayments] = useState<AccountPayment[]>([]);
	const [points, setPoints] = useState<AccountPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string>("");
	const tableWrapperRef = useRef<HTMLDivElement | null>(null);
	const initialRenderRef = useRef<boolean>(true);

	const pointsByPaymentId = useMemo(() => {
		const map = new Map<string, AccountPoint>();
		for (const point of points) {
			map.set(point.account_payment_id, point);
		}
		return map;
	}, [points]);

	/**
	 * Typical gap between the gross payout the network books for a payment and
	 * the tokens that actually land in the wallet, taken as the median over the
	 * payments that already settled. It is a wallet/transfer fee, so it stays
	 * roughly constant per payment rather than scaling with the amount — the
	 * median keeps a one-off outlier from skewing the estimate. Only the most
	 * recent payments are sampled, because the fee has changed over time and
	 * old payouts would drag the estimate towards a fee that no longer applies.
	 */
	const settlementFee = useMemo(() => {
		const FEE_SAMPLE_SIZE = 10;

		const fees = payments
			.filter((payment) => payment.token_amount && payment.payout_nano_cents)
			.sort(
				(a, b) =>
					new Date(b.payment_time).getTime() -
					new Date(a.payment_time).getTime(),
			)
			.slice(0, FEE_SAMPLE_SIZE)
			.map(
				(payment) =>
					(payment.payout_nano_cents as number) / 1e9 -
					payment.token_amount,
			)
			.filter((fee) => fee >= 0)
			.sort((a, b) => a - b);

		if (fees.length === 0) return 0;
		return fees[Math.floor(fees.length / 2)];
	}, [payments]);

	/**
	 * Estimated payout for a payment that has not settled yet. The network has
	 * already booked the gross amount, so only the fee has to be predicted.
	 */
	const estimateFor = (payment: AccountPayment): number | null => {
		if (payment.token_amount || !payment.payout_nano_cents) return null;
		return Math.max(payment.payout_nano_cents / 1e9 - settlementFee, 0);
	};

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
			const [paymentsResponse, pointsResponse] = await Promise.all([
				fetchAccountPayments(token),
				fetchAccountPoints(token),
			]);

			if (paymentsResponse.error) {
				setError(paymentsResponse.error.message);
				toast.error(paymentsResponse.error.message);
			} else {
				setPayments(paymentsResponse.account_payments || []);
				setPoints(pointsResponse.account_points || []);
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
		const paymentTotals = payments.reduce(
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

		const totalPoints = points.reduce(
			(acc, point) => acc + point.point_value / 1_000_000,
			0,
		);

		return { ...paymentTotals, totalPoints };
	};

	const totals = calculateTotals();
	const estimatedPending = payments.reduce(
		(sum, payment) => sum + (estimateFor(payment) ?? 0),
		0,
	);

	return (
		<div className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
				<div>
					<h3 className="text-2xl font-bold text-ur-white flex items-center gap-3">
						<CreditCard className="text-ur-green" size={24} />
						Payout Statistics
					</h3>
					<p className="text-ur-gray mt-2">
						Detailed history of all payouts and earnings
					</p>
					{lastUpdated && (
						<p className="text-sm text-ur-gray-dark mt-1">
							Last updated: {formatDate(lastUpdated)}
						</p>
					)}
				</div>

				<button
					onClick={() => loadPayments(true)}
					disabled={isLoading}
					className="flex items-center gap-2 bg-ur-green hover:bg-ur-green/90 text-ur-black px-6 py-3 rounded-lg transition-all duration-200 border border-ur-green "
				>
					<RefreshCw
						size={16}
						className={isLoading ? "animate-spin" : ""}
					/>
					Refresh Payouts
				</button>
			</div>

			{error && (
				<div className="bg-ur-coral/15 border border-ur-coral p-4 rounded-ur flex items-start gap-3">
					<AlertCircle
						size={20}
						className="text-ur-coral mt-0.5 flex-shrink-0"
					/>
					<div>
						<h3 className="font-medium text-ur-coral">
							Error loading payout data
						</h3>
						<p className="text-ur-coral">{error}</p>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="flex justify-center py-12">
					<div className="relative">
						<div className="animate-spin rounded-full h-16 w-16 border-4 border-ur-border border-t-ur-green"></div>
						<div className="absolute inset-0 rounded-full bg-gradient-to-r from-ur-green/20 to-ur-blue/20 animate-pulse"></div>
					</div>
				</div>
			) : (
				<div className="space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 animate-staggerFadeUp" style={{ animationDelay: '0.2s' }}>
						<StatCard
							title="Total USDC Earned"
							value={`$${totals.totalPayouts.toFixed(4)}`}
							icon={DollarSign}
							accent="bg-ur-green"
						/>
						<StatCard
							title="Estimated Pending"
							value={
								estimatedPending > 0
									? `~$${estimatedPending.toFixed(4)}`
									: "—"
							}
							icon={Sparkles}
							accent="bg-ur-pink"
						/>
						<StatCard
							title="Total Points Earned"
							value={formatNumber(totals.totalPoints)}
							icon={Star}
							accent="bg-ur-yellow-light"
						/>
						<StatCard
							title="Total Data Paid"
							value={formatBytes(totals.totalBytes)}
							icon={Database}
							accent="bg-ur-blue-light"
						/>
						<StatCard
							title="Completed Payments"
							value={totals.completedPayments}
							icon={CheckCircle}
							accent="bg-ur-green"
						/>
						<StatCard
							title="Total Payments"
							value={payments.length}
							icon={TrendingUp}
							accent="bg-ur-gray"
						/>
					</div>

					<div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-chartSlideUp" style={{ animationDelay: '0.25s' }}>
						<div className="bg-ur-raised px-4 py-2 lg:px-6 lg:py-4 border-b border-ur-border">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-base lg:text-lg font-medium text-ur-white flex items-center gap-2">
										<CreditCard
											size={20}
											className="text-ur-green"
										/>
										Payment Timeline
									</h3>
									<p className="text-xs lg:text-sm text-ur-gray mt-1">
										History of payouts and earnings
									</p>
								</div>
								<div className="bg-ur-hover text-ur-white px-3 py-1 rounded-lg border border-ur-active text-xs lg:text-sm">
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
									<div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
										<CreditCard
											className="text-ur-gray-dark"
											size={24}
										/>
									</div>
									<h3 className="text-lg font-medium text-ur-white mb-2">
										No Payments Found
									</h3>
									<p className="text-ur-gray italic px-3">
										No payout data available. Try refreshing
										the data.
									</p>
								</div>
							) : (
								<table className="min-w-full divide-y divide-ur-border -rotate-180">
									<thead className="bg-ur-black">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Amount
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Points Earned
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Data Transferred
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Payment Time
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Transaction
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">
												Blockchain
											</th>
										</tr>
									</thead>
									<tbody className="bg-ur-panel divide-y divide-ur-border">
										{payments.map((payment, index) => (
											<tr
												key={payment.payment_id}
												className={`hover:bg-ur-raised/50 transition-colors ${index === 0 ? "bg-ur-green/10 border-l-4 border-ur-green" : ""}`}
											>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															payment.completed
																? "bg-ur-green/10 text-ur-green border border-ur-green"
																: payment.canceled
																	? "bg-ur-coral/10 text-ur-coral border border-ur-coral"
																	: "bg-ur-yellow-light/10 text-ur-yellow-light border border-ur-yellow-light/40"
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
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-green font-medium">
													{payment.token_amount ? <>$
													{payment.token_amount.toFixed(
														4,
													)}{" "}
													{payment.token_type}</> : (() => {
														const estimate = estimateFor(payment);
														return estimate !== null ? (
															<span
																className="text-ur-pink"
																title="Estimated from the booked payout minus the typical fee on your previous payments"
															>
																~${estimate.toFixed(4)}
															</span>
														) : (
															<>&mdash;</>
														);
													})()}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-yellow-light font-medium">
													{(() => {
														const point = pointsByPaymentId.get(payment.payment_id);
														return point ? formatNumber(point.point_value / 1_000_000) : <>&mdash;</>;
													})()}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-blue-light font-medium">
													{formatBytes(
														payment.payout_byte_count,
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-gray">
													<div className="flex items-center gap-2">
														<Calendar
															size={14}
															className="text-ur-gray-dark"
														/>
														{payment.payment_time ? formatDate(
															payment.payment_time,
														) : <>&mdash;</>}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-gray">
													<div className="flex items-center gap-2">
														<Hash
															size={14}
															className="text-ur-gray-dark"
														/>
														<span className="font-mono text-xs">
															{payment.tx_hash ? <>{payment.tx_hash.substring(
																0,
																Math.floor(
																	(payment
																		.tx_hash?.length ?? 0) /
																		4,
																),
															)}
															...
															{payment.tx_hash.substring(
																Math.floor(
																	(payment
																		.tx_hash?.length ?? 0) *
																		(3 / 4),
																),
															)}</> : ""}
														</span>
														<a
															href={payment.tx_hash ? `https://solscan.io/tx/${payment.tx_hash}` : '#'}
															target="_blank"
															rel="noopener noreferrer"
															className="text-ur-blue-light hover:text-ur-blue-light transition-colors"
														>
															{payment.tx_hash ? <ExternalLink
																size={12}
															/> : <>&mdash;</>}
														</a>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-ur-pink font-medium">
													{payment.blockchain || <>&mdash;</>}
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
