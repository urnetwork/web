import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { deleteNetwork } from "../services/api";
import toast from "react-hot-toast";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onDeleteSuccess: () => void;
}

type ModalStep = "warning" | "confirm" | "loading" | "success" | "error";

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  token,
  onDeleteSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<ModalStep>("warning");
  const [confirmInput, setConfirmInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("warning");
      setConfirmInput("");
      setErrorMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        onDeleteSuccess();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, onDeleteSuccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "loading") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, step]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen &&
        step !== "loading"
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, step]);

  const handleDelete = async () => {
    if (!token) return;
    setStep("loading");
    setErrorMessage("");

    try {
      const response = await deleteNetwork(token);
      if (response.error) {
        setErrorMessage(response.error.message);
        setStep("error");
        toast.error("Account deletion failed");
      } else {
        setStep("success");
        toast.success("Account deleted successfully");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete account";
      setErrorMessage(msg);
      setStep("error");
      toast.error("Account deletion failed");
    }
  };

  if (!isOpen) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-visible">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto animate-scaleIn border border-gray-700"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-red-600 rounded-lg">
              <Trash2 size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-100">Delete Account</h3>
          </div>
          {step !== "loading" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === "warning" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-lg mb-5">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium text-sm mb-1">This action is permanent and cannot be undone</p>
                  <p className="text-red-400/80 text-sm">Deleting your account will immediately and permanently remove:</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {[
                  "Your account and all account data",
                  "All authentication clients and configurations",
                  "Your network subscription and access",
                  "All associated billing history and wallet balance",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="text-gray-300 mb-2">
                To confirm, type <span className="font-mono font-bold text-red-400">DELETE</span> in the field below:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-gray-700 border border-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2.5 mb-5 outline-none transition-colors font-mono"
                autoFocus
              />

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setStep("warning"); setConfirmInput(""); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600"
                >
                  <ArrowLeft size={16} />
                  Go Back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmInput !== "DELETE"}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    confirmInput === "DELETE"
                      ? "bg-red-600 hover:bg-red-700 text-white hover:shadow-lg"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mb-4">
                <svg
                  className="animate-spin h-8 w-8 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-gray-300 font-medium">Deleting your account...</p>
              <p className="text-gray-500 text-sm mt-1">Please wait, do not close this window</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h4 className="text-lg font-medium text-green-300 mb-2">Account Deleted</h4>
              <p className="text-gray-400 text-sm">
                Your account has been permanently deleted. You will be signed out shortly.
              </p>
            </div>
          )}

          {step === "error" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-lg mb-5">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium text-sm mb-1">Deletion failed</p>
                  <p className="text-red-400/80 text-sm">{errorMessage || "An unexpected error occurred. Please try again."}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setStep("confirm"); setConfirmInput(""); }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default DeleteAccountModal;
