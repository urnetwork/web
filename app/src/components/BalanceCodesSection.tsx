import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Ticket, TicketCheck, TicketSlash } from "lucide-react";
import { RedeemedTransferBalanceCode } from "../services/types";
import { fetchNetworkTransferBalanceCodes } from "../services/api";
import RedeemTransferBalanceCodeModal from "./RedeemTransferBalanceCodeModal";

const BalanceCodesSection: React.FC = () => {

    const { token } = useAuth();
    const [transferBalanceCodes, setTransferBalanceCodes] = useState<RedeemedTransferBalanceCode[]>([]);
    const [isAddTransferBalanceCodeModalOpen, setIsAddTransferBalanceCodeModalOpen] = useState(false);
    const [isLoadingTransferBalanceCodes, setIsLoadingTransferBalanceCodes] = useState(true);

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

    useEffect(() => {
      loadTransferBalanceCodes();
    }, [token, loadTransferBalanceCodes]);

    const maskSecret = (secret: string) => {
      if (!secret || secret.length <= 6) return secret;
      return `${secret.slice(0, 3)}...${secret.slice(-3)}`;
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString();
    };

    const sectionColor = "emerald"

    return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp" style={{ animationDelay: '0.05s' }}>
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-r from-${sectionColor}-600 to-${sectionColor}-600 rounded-xl`}>
              <Ticket className="text-white" size={28} />
            </div>
            Balance Codes
          </h2>
          <p className="text-gray-400 mt-2">
            Manage your account balance codes for more data.
          </p>
        </div>
      </div>


      <div className={`bg-${sectionColor}-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 animate-staggerFadeUp`} style={{ animationDelay: '0.1s' }}>
        <div className={`bg-gradient-to-r from-${sectionColor}-600 to-${sectionColor}-600 px-6 py-4 border-b border-gray-600`}>
          <div className="flex items-center gap-3">
            <TicketCheck size={20} className="text-white" />
            <div>
              <h3 className="font-medium text-white">Account Transfer Balance Codes</h3>
              <p className="text-blue-100 text-sm mt-1">Redeem a transfer balance code to add data to your account.</p>
            </div>
          </div>
        </div>

        {transferBalanceCodes.length === 0 && !isLoadingTransferBalanceCodes ? (
          <div className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketSlash className="text-gray-500" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">No Transfer Balance Codes Redeemed</h3>
              <p className="text-gray-400 italic">No transfer balance codes found for your network.</p>
            </div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Secret</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Redeemed</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
                {transferBalanceCodes.map((code) => (
                <tr key={code.balance_code_id}>
                  <td className="px-6 py-4 whitespace-nowrap">{maskSecret(code.secret)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(code.redeem_time)}</td>
                </tr>
                ))}
            </tbody>
            </table>
          </div>
        )}

        <div className="p-6">
          <button
              onClick={() => setIsAddTransferBalanceCodeModalOpen(true)}
              disabled={isLoadingTransferBalanceCodes}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
              isLoadingTransferBalanceCodes
                  ? 'bg-gray-600 cursor-not-allowed border border-gray-600 text-gray-400'
                  : `bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 hover:shadow-lg transform hover:scale-[1.02]`
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