import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, TicketCheck } from "lucide-react";
import { redeemTransferBalanceCode } from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

interface RedeemTransferBalanceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = "initial" | "loading" | "success";

const RedeemTransferBalanceCodeModal: React.FC<RedeemTransferBalanceCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ModalState>("initial");
  const balanceCodeInputRef = useRef<HTMLInputElement>(null);
  const [balanceCodeFocused, setBalanceCodeFocused] = useState<boolean>(false);
  const [isBalanceCodeValid, setIsBalanceCodeValid] = useState<boolean>(false);


  useEffect(() => {
    if (isOpen) {
      setState("initial");
      setIsBalanceCodeValid(false);
      if (balanceCodeInputRef.current) {
        balanceCodeInputRef.current.value = "";
      }
      setTimeout(() => {
        balanceCodeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && state !== "loading") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, state]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen &&
        state !== "loading"
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, state]);

  const handleRedeemTransferBalance = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!token) {
        toast.error("You must be logged in to redeem a balance code.");
        return
    }

    const balanceCode = balanceCodeInputRef.current?.value?.toString().trim();

    if (!balanceCode || balanceCode.length !== 26) {
      toast.error("Please enter a valid 26-character balance code.");
      return;
    }

    setState("loading");

    try {
      const response = await redeemTransferBalanceCode(balanceCode, token);

      if (response.error) {
        toast.error(response.error.message);
        setState("initial");
      } else {
        setState("success");
        toast.success("Transfer balance redeemed!");
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to redeem balance code"
      );
      setState("initial");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto animate-scaleIn border border-gray-700"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-emerald-600 rounded-lg">
              <TicketCheck size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-100">Redeem Transfer Balance Code</h3>
          </div>
          {state !== "loading" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {state === "success" ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h4 className="text-lg font-medium text-green-300 mb-2">
                Transfer Balance Code Redeemed Successfully
              </h4>
            </div>
          ) : (
            <form onSubmit={handleRedeemTransferBalance}>
              <div className="mb-6">
                <input
                    id="redeemBalanceCode"
                    type="text"
                    ref={balanceCodeInputRef}
                    onFocus={() => setBalanceCodeFocused(true)}
                    onBlur={() => setBalanceCodeFocused(false)}
                    onChange={(e) =>
                        setIsBalanceCodeValid(
                            e.target.value.trim().length === 26,
                        )
                    }
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-400 ${
                        balanceCodeFocused
                            ? "shadow-lg shadow-blue-500/20"
                            : ""
                    } ${
                        isBalanceCodeValid
                            ? "border-green-500"
                            : "border-gray-600"
                    }`}
                    placeholder="Enter your transfer balance code"
                    disabled={state === "loading"}
                    aria-label="Transfer balance code"
                    aria-describedby="balance-code-help"
                    maxLength={26}
                    autoComplete="off"
                    required
                />

                <p id="balance-code-help" className="text-gray-500 text-sm mt-3">
                  Redeeming transfer balance will add data credit to your network.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600"
                  disabled={state === "loading"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state === "loading" || !isBalanceCodeValid}
                  className={`px-4 py-2 bg-emerald-600 text-white rounded-lg transition-all duration-200 ${
                    state === "loading" || !isBalanceCodeValid
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-emerald-700 hover:shadow-lg"
                  }`}
                >
                  {state === "loading" ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Redeeming...
                    </span>
                  ) : (
                    "Redeem"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RedeemTransferBalanceCodeModal;
