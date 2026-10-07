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
    <div className="fixed inset-0 z-[9999] bg-ur-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-visible">
      <div
        ref={modalRef}
        className="bg-ur-panel rounded-ur shadow-ur-flat max-w-md w-full mx-auto animate-scaleIn border border-ur-border"
      >
        <div className="flex items-start justify-between p-6 border-b border-ur-border">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-ur-coral rounded-lg">
              <Trash2 size={20} className="text-ur-black" />
            </div>
            <h3 className="text-lg font-medium text-ur-white">Delete Account</h3>
          </div>
          {step !== "loading" && (
            <button
              onClick={onClose}
              className="text-ur-gray hover:text-ur-white focus:outline-none focus:text-ur-white transition-colors p-1 rounded-lg hover:bg-ur-raised"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === "warning" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-ur-coral/10 border border-ur-coral/40 rounded-lg mb-5">
                <AlertTriangle size={20} className="text-ur-coral flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-ur-coral font-medium text-sm mb-1">This action is permanent and cannot be undone</p>
                  <p className="text-ur-coral/80 text-sm">Deleting your account will immediately and permanently remove:</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {[
                  "Your account and all account data",
                  "All authentication clients and configurations",
                  "Your network subscription and access",
                  "All associated billing history and wallet balance",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ur-gray">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ur-coral flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-ur-raised hover:bg-ur-hover text-ur-white rounded-lg transition-colors border border-ur-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="px-4 py-2 bg-ur-coral hover:bg-ur-coral-hover text-ur-black rounded-lg transition-all duration-200 "
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="text-ur-gray mb-2">
                To confirm, type <span className="font-mono font-bold text-ur-coral">DELETE</span> in the field below:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-ur-raised border border-ur-border focus:border-ur-coral focus:ring-1 focus:ring-ur-coral text-ur-white placeholder-ur-gray-dark rounded-lg px-4 py-2.5 mb-5 outline-none transition-colors font-mono"
                autoFocus
              />

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setStep("warning"); setConfirmInput(""); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-ur-raised hover:bg-ur-hover text-ur-white rounded-lg transition-colors border border-ur-border"
                >
                  <ArrowLeft size={16} />
                  Go Back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmInput !== "DELETE"}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
 confirmInput === "DELETE"
                      ? "bg-ur-coral hover:bg-ur-coral-hover text-ur-black "
                      : "bg-ur-hover text-ur-gray cursor-not-allowed"
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-ur-coral/20 rounded-full mb-4">
                <svg
                  className="animate-spin h-8 w-8 text-ur-coral"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-ur-gray font-medium">Deleting your account...</p>
              <p className="text-ur-gray-dark text-sm mt-1">Please wait, do not close this window</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-ur-green/20 rounded-full mb-4">
                <CheckCircle size={32} className="text-ur-green" />
              </div>
              <h4 className="text-lg font-medium text-ur-green mb-2">Account Deleted</h4>
              <p className="text-ur-gray text-sm">
                Your account has been permanently deleted. You will be signed out shortly.
              </p>
            </div>
          )}

          {step === "error" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-ur-coral/10 border border-ur-coral/40 rounded-lg mb-5">
                <AlertTriangle size={20} className="text-ur-coral flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-ur-coral font-medium text-sm mb-1">Deletion failed</p>
                  <p className="text-ur-coral/80 text-sm">{errorMessage || "An unexpected error occurred. Please try again."}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-ur-raised hover:bg-ur-hover text-ur-white rounded-lg transition-colors border border-ur-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setStep("confirm"); setConfirmInput(""); }}
                  className="px-4 py-2 bg-ur-coral hover:bg-ur-coral-hover text-ur-black rounded-lg transition-all duration-200 "
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
