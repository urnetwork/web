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
    <div className="fixed inset-0 z-[9999] bg-ur-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-visible">
      <div
        ref={modalRef}
        className="bg-ur-panel rounded-ur shadow-ur-flat max-w-lg w-full mx-auto animate-scaleIn border border-ur-border"
      >
        <div className="flex items-start justify-between p-6 border-b border-ur-border">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-ur-green rounded-lg">
              <Key size={20} className="text-ur-black" />
            </div>
            <h3 className="text-lg font-medium text-ur-white">
              API Key Created
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-ur-gray hover:text-ur-white focus:outline-none focus:text-ur-white transition-colors p-1 rounded-lg hover:bg-ur-raised"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 bg-ur-yellow-light/10 border border-ur-yellow-light/30 rounded-lg">
            <AlertTriangle
              size={20}
              className="text-ur-yellow-light flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-ur-yellow-light font-medium text-sm mb-1">
                Save this key now
              </p>
              <p className="text-ur-yellow-light/80 text-sm">
                This is the only time the full API key will be shown. Once you
                close this dialog, you will not be able to retrieve it again.
                Copy it and store it in a safe place.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ur-gray">
                Key Name
              </label>
            </div>
            <div className="bg-ur-black px-4 py-2.5 rounded-lg border border-ur-border text-sm text-ur-white">
              {keyName}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ur-gray">
                API Key
              </label>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
 copied
 ? "bg-ur-green text-ur-black border border-ur-green"
                    : "bg-ur-raised text-ur-gray hover:bg-ur-hover border border-ur-border"
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
            <div className="bg-ur-black p-4 rounded-lg border border-ur-border font-mono text-sm break-all">
              <code className="text-ur-green select-all">{apiKey}</code>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-ur-raised hover:bg-ur-hover text-ur-white rounded-lg transition-colors border border-ur-border font-medium text-sm"
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
