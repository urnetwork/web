import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, AlertTriangle } from "lucide-react";

interface ApiKeyDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  keyName: string;
  isDeleting: boolean;
}

const ApiKeyDeleteModal: React.FC<ApiKeyDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  keyName,
  isDeleting,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isDeleting]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen &&
        !isDeleting
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, isDeleting]);

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
            <h3 className="text-lg font-medium text-gray-100">
              Delete API Key
            </h3>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-lg mb-5">
            <AlertTriangle
              size={20}
              className="text-red-400 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-red-300 font-medium text-sm mb-1">
                This action cannot be undone
              </p>
              <p className="text-red-400/80 text-sm">
                Any applications or services using this key will lose access
                immediately.
              </p>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-5">
            Are you sure you want to delete the API key{" "}
            <span className="font-semibold text-white">"{keyName}"</span>?
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Key
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default ApiKeyDeleteModal;
