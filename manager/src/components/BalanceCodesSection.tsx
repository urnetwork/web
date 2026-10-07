import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Ticket, TicketCheck, TicketSlash } from "lucide-react";
import { RedeemedTransferBalanceCode, SubscriptionBalanceResponse } from "../services/types";
import { fetchNetworkTransferBalanceCodes, fetchSubscriptionBalance } from "../services/api";
import RedeemTransferBalanceCodeModal from "./RedeemTransferBalanceCodeModal";

const BalanceCodesSection: React.FC = () => {
    const colorClasses = {
      iconBg: "p-2 bg-ur-green rounded-ur",
      headerBg: "bg-ur-raised px-6 py-4 border-b border-ur-border",
      headerText: "text-ur-gray text-sm mt-1",
      buttonBg: "bg-ur-green hover:bg-ur-green/90 text-ur-black border border-ur-green transform hover:scale-[1.02]",
    };

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
          <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
            <div className={colorClasses.iconBg}>
              <Ticket className="text-ur-black" size={28} />
            </div>
            Balance Codes
          </h2>
          <p className="text-ur-gray mt-2">
            Manage your account balance codes for more data.
          </p>
        </div>
      </div>

      <div className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className={colorClasses.headerBg}>
          <div className="flex items-center gap-3">
            <TicketCheck size={20} className="text-ur-green" />
            <div>
              <h3 className="font-medium text-ur-white">Account Transfer Balance Codes</h3>
              <p className={colorClasses.headerText}>Redeem a transfer balance code to add data to your account.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-ur-border">
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
            <table className="min-w-full divide-y divide-ur-border">
            <thead className="bg-ur-black sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Secret</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Redeemed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ur-gray uppercase tracking-wider">Valid Until</th>
              </tr>
            </thead>
            <tbody className="bg-ur-panel divide-y divide-ur-border">
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
              <div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketSlash className="text-ur-gray-dark" size={24} />
              </div>
              <h3 className="text-lg font-medium text-ur-white mb-2">No Transfer Balance Codes Redeemed</h3>
              <p className="text-ur-gray italic">No transfer balance codes found for your network.</p>
            </div>
          </div>
        )}

        <div className="p-6">
          <button
              onClick={() => setIsAddTransferBalanceCodeModalOpen(true)}
              disabled={isLoadingTransferBalanceCodes}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
 isLoadingTransferBalanceCodes
 ? 'bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray'
 : colorClasses.buttonBg
 }`}
          >
              <TicketCheck size={20} />
              <span>Redeem Transfer Balance Code</span>
          </button>
        </div>
      </div>

      <RedeemTransferBalanceCodeModal
        isOpen={isAddTransferBalanceCodeModalOpen}
        onClose={() => setIsAddTransferBalanceCodeModalOpen(false)}
        onSuccess={() => {
          // reload balance codes
          loadTransferBalanceCodes();
        }}
      />
    </div>
    )

}
export default BalanceCodesSection;
