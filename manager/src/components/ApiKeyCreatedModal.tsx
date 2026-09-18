import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, CheckCircle, AlertTriangle, Key } from "lucide-react";
import toast from "react-hot-toast";

interface ApiKeyCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  keyName: string;
}

const ApiKeyCreatedModal: React.FC<ApiKeyCreatedModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  keyName,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success("API key copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (!isOpen) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-visible">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-auto animate-scaleIn border border-gray-700"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-green-600 rounded-lg">
              <Key size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-100">
              API Key Created
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <AlertTriangle
              size={20}
              className="text-amber-400 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-amber-300 font-medium text-sm mb-1">
                Save this key now
              </p>
              <p className="text-amber-400/80 text-sm">
                This is the only time the full API key will be shown. Once you
                close this dialog, you will not be able to retrieve it again.
                Copy it and store it in a safe place.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Key Name
              </label>
            </div>
            <div className="bg-gray-900 px-4 py-2.5 rounded-lg border border-gray-600 text-sm text-gray-200">
              {keyName}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                API Key
              </label>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                  copied
                    ? "bg-green-600 text-white border border-green-500"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-600 font-mono text-sm break-all">
              <code className="text-green-400 select-all">{apiKey}</code>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600 font-medium text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default ApiKeyCreatedModal;
