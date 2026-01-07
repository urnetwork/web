import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock, CheckCircle, Mail } from "lucide-react";
import { requestPasswordReset } from "../services/api";
import toast from "react-hot-toast";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

type ModalState = "initial" | "loading" | "success";

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ModalState>("initial");

  useEffect(() => {
    if (isOpen) {
      setState("initial");
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

  const handleSendResetEmail = async () => {
    setState("loading");

    try {
      const response = await requestPasswordReset(userEmail);

      if (response.error) {
        toast.error(response.error.message);
        setState("initial");
      } else {
        setState("success");
        toast.success("Password reset email sent!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset email"
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
            <div className="flex-shrink-0 p-2 bg-blue-600 rounded-lg">
              <Lock size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-100">Password Reset</h3>
          </div>
          {state !== "loading" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
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
                Email Sent Successfully
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                A password reset link has been sent to:
              </p>
              <div className="bg-gray-700/50 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                <Mail size={16} className="text-blue-400" />
                <span className="text-blue-300 font-medium">{userEmail}</span>
              </div>
              <p className="text-gray-500 text-xs mt-4">
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  A password reset link will be sent to the email address
                  associated with your account:
                </p>
                <div className="bg-gray-700/50 px-4 py-3 rounded-lg flex items-center gap-3">
                  <Mail size={18} className="text-blue-400" />
                  <span className="text-blue-300 font-medium">{userEmail}</span>
                </div>
                <p className="text-gray-500 text-sm mt-3">
                  Please check your email and follow the link to reset your
                  password.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600"
                  disabled={state === "loading"}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendResetEmail}
                  disabled={state === "loading"}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-all duration-200 ${
                    state === "loading"
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-blue-700 hover:shadow-lg"
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
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Email"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PasswordResetModal;
