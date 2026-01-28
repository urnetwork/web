import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Ticket, TicketCheck, TicketSlash } from "lucide-react";
import { RedeemedTransferBalanceCode, SubscriptionBalanceResponse } from "../services/types";
import { fetchNetworkTransferBalanceCodes, fetchSubscriptionBalance } from "../services/api";
import RedeemTransferBalanceCodeModal from "./RedeemTransferBalanceCodeModal";

const BalanceCodesSection: React.FC = () => {
    const sectionColor = "emerald";

    const colorConfig = {
      emerald: {
        iconBg: "p-2 bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-emerald-600 to-emerald-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-emerald-100 text-sm mt-1",
        buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
      blue: {
        iconBg: "p-2 bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-blue-600 to-blue-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-blue-100 text-sm mt-1",
        buttonBg: "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
      purple: {
        iconBg: "p-2 bg-gradient-to-r from-purple-600 to-purple-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-purple-600 to-purple-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-purple-100 text-sm mt-1",
        buttonBg: "bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
      red: {
        iconBg: "p-2 bg-gradient-to-r from-red-600 to-red-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-red-600 to-red-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-red-100 text-sm mt-1",
        buttonBg: "bg-red-600 hover:bg-red-700 text-white border border-red-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
      amber: {
        iconBg: "p-2 bg-gradient-to-r from-amber-600 to-amber-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-amber-600 to-amber-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-amber-100 text-sm mt-1",
        buttonBg: "bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
      teal: {
        iconBg: "p-2 bg-gradient-to-r from-teal-600 to-teal-600 rounded-xl",
        headerBg: "bg-gradient-to-r from-teal-600 to-teal-600 px-6 py-4 border-b border-gray-600",
        headerText: "text-teal-100 text-sm mt-1",
        buttonBg: "bg-teal-600 hover:bg-teal-700 text-white border border-teal-500 hover:shadow-lg transform hover:scale-[1.02]",
      },
    };

    const colorClasses = colorConfig[sectionColor as keyof typeof colorConfig];

    const { token } = useAuth();
    const [transferBalanceCodes, setTransferBalanceCodes] = useState<RedeemedTransferBalanceCode[]>([]);
    const [isAddTransferBalanceCodeModalOpen, setIsAddTransferBalanceCodeModalOpen] = useState(false);
    const [isLoadingTransferBalanceCodes, setIsLoadingTransferBalanceCodes] = useState(true);
    const [isLoadingSubscriptionBalance, setIsLoadingSubscriptionBalance] = useState(true);
    const [subscriptionBalance, setSubscriptionBalance] = useState<SubscriptionBalanceResponse | null>(null);
    
    const loadTransferBalanceCodes = useCallback(async () => {
        if (!token) {
            setIsLoadingTransferBalanceCodes(false);
            return;
        }

        setIsLoadingTransferBalanceCodes(true);

        try {
            const response = await fetchNetworkTransferBalanceCodes(token);
            if (response.balance_codes) {
            setTransferBalanceCodes(response.balance_codes);
            }
        } catch (error) {
            console.error('Failed to fetch network transfer balance codes:', error);
        } finally {
            setIsLoadingTransferBalanceCodes(false);
        }
    }, [token]);

    const loadSubscriptionBalance = useCallback(async () => {

      if (!token) {
        setIsLoadingSubscriptionBalance(false);
        return;
      }

      setIsLoadingSubscriptionBalance(true);

      try {
        const response = await fetchSubscriptionBalance(token);
        if (response && 'error' in response) {
          console.error('Error fetching subscription balance:', response.error.message);
          return;
        }
        setSubscriptionBalance(response);
      } catch (error) {
        console.error('Failed to fetch subscription balance:', error);
      } finally {
        setIsLoadingSubscriptionBalance(false);
      }

    }, [token]);

    useEffect(() => {
      loadTransferBalanceCodes();
      loadSubscriptionBalance();
    }, [token, loadTransferBalanceCodes, loadSubscriptionBalance]);

    const maskSecret = (secret: string) => {
      if (!secret || secret.length <= 6) return secret;
      return `${secret.slice(0, 3)}...${secret.slice(-3)}`;
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString();
    };

    const formatDataBalance = (bytes: number) => {
      if (typeof bytes !== "number" || isNaN(bytes)) return "-";
      const TIB = 1099511627776;
      const GIB = 1073741824;
      if (bytes < TIB) {
        const gib = bytes / GIB;
        return `${gib.toFixed(2)} GiB`;
      } else {
        const tib = bytes / TIB;
        return `${tib.toFixed(2)} TiB`;
      }
    };

    return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className={colorClasses.iconBg}>
              <Ticket className="text-white" size={28} />
            </div>
            AppSumo Codes
          </h2>
          <p className="text-gray-400 mt-2">
            Manage your account AppSumo codes for more data.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className={colorClasses.headerBg}>
          <div className="flex items-center gap-3">
            <TicketCheck size={20} className="text-white" />
            <div>
              <h3 className="font-medium text-white">Account AppSumo Codes</h3>
              <p className={colorClasses.headerText}>Redeem an AppSumo code to add data to your account.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-700">
          <p>
            Total Data Balance: 
            <span className="ml-1">
              {isLoadingSubscriptionBalance 
                ? " Loading..." 
                : subscriptionBalance 
                  ? formatDataBalance(subscriptionBalance.balance_byte_count) 
                  : "-"
              }
            </span>
          </p>
        </div>

        {transferBalanceCodes.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Secret</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Redeemed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valid Until</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
                {transferBalanceCodes.map((code) => (
                <tr key={code.balance_code_id}>
                  <td className="px-6 py-4 whitespace-nowrap">{maskSecret(code.secret)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{`+${formatDataBalance(code.balance_byte_count)}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(code.redeem_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(code.end_time)}</td>
                </tr>
                ))}
            </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketSlash className="text-gray-500" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">No AppSumo Codes Redeemed</h3>
              <p className="text-gray-400 italic">No AppSumo codes found for your network.</p>
            </div>
          </div>
        )}

        <div className="p-6">
          <button
              onClick={() => setIsAddTransferBalanceCodeModalOpen(true)}
              disabled={isLoadingTransferBalanceCodes}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
              isLoadingTransferBalanceCodes
                  ? 'bg-gray-600 cursor-not-allowed border border-gray-600 text-gray-400'
                  : colorClasses.buttonBg
              }`}
          >
              <TicketCheck size={20} />
              <span>Redeem AppSumo Code</span>
          </button>
        </div>
      </div>

      <RedeemTransferBalanceCodeModal
        isOpen={isAddTransferBalanceCodeModalOpen}
        onClose={() => setIsAddTransferBalanceCodeModalOpen(false)}
        onSuccess={() => {
          // reload balance codes
          loadTransferBalanceCodes();
		  loadSubscriptionBalance();
        }}
      />
    </div>
    )

}
export default BalanceCodesSection;
