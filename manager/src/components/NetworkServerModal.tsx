import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Server, X, AlertTriangle, RotateCcw, Check } from "lucide-react";
import toast from "react-hot-toast";
import {
  CUSTOM_API_BASE_KEY,
  DEFAULT_API_BASE,
  getApiBase,
} from "../services/api";

interface NetworkServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Normalize + validate an API base; returns null when invalid.
 * Accepts a full http(s) URL, or a same-origin path like "/api". A path only
 * works where the host proxies it (the vite dev server proxies /api); the
 * production image serves static files and proxies nothing.
 */
const normalizeApiUrl = (raw: string): string | null => {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    return /^\/[A-Za-z0-9\-_/]+$/.test(trimmed) ? trimmed : null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
};

/**
 * "Change Network API" modal — web port of the mobile apps'
 * NetworkServerSheet, API server only (the dashboard has no connect
 * socket). Lets the user point the dashboard at a self-hosted or beta
 * API server. Persists to localStorage; applies without a reload.
 */
const NetworkServerModal: React.FC<NetworkServerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState("");

  const currentBase = getApiBase();
  const isCustomActive = currentBase !== DEFAULT_API_BASE;

  useEffect(() => {
    if (isOpen) {
      setInput(isCustomActive ? currentBase : "");
    }
  }, [isOpen, isCustomActive, currentBase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  const normalized = normalizeApiUrl(input);
  const isInsecure =
    normalized !== null &&
    normalized.startsWith("http://") &&
    !/^http:\/\/(localhost|127\.0\.0\.1)/.test(normalized);

  const handleApply = () => {
    if (!normalized) {
      toast.error("Enter a valid http(s) URL, e.g. https://api.example.com");
      return;
    }
    try {
      localStorage.setItem(CUSTOM_API_BASE_KEY, normalized);
    } catch {
      toast.error("Could not save — localStorage unavailable");
      return;
    }
    toast.success(`API server set to ${normalized}`);
    onClose();
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(CUSTOM_API_BASE_KEY);
    } catch {
      // ignore
    }
    toast.success("Using the default API server");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ur-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-server-title"
    >
      <div className="bg-ur-panel rounded-ur shadow-ur-flat w-full max-w-md border border-ur-border animate-scaleIn">
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server size={20} className="text-ur-blue-light" />
            <h2 id="network-server-title" className="font-medium text-ur-white">
              Change Network API
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-ur-gray hover:text-ur-white transition-colors p-1 rounded-lg hover:bg-ur-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-ur-gray">
            Point the dashboard at a different API server — self-hosted, beta,
            or an alternate deployment. Applies to all requests immediately.
          </p>

          <div className="text-xs text-ur-gray-dark space-y-0.5">
            <p>
              Current API:{" "}
              <span className="font-mono text-ur-gray">{currentBase}</span>
              {isCustomActive && (
                <span className="ml-2 text-[10px] uppercase tracking-wide bg-ur-blue/15 text-ur-blue-light border border-ur-blue/40 px-1.5 py-0.5 rounded">
                  custom
                </span>
              )}
            </p>
            <p>
              Default:{" "}
              <span className="font-mono">{DEFAULT_API_BASE}</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="apiServerUrl"
              className="block text-sm font-medium text-ur-gray mb-1.5"
            >
              API URL
            </label>
            <input
              id="apiServerUrl"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={DEFAULT_API_BASE}
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-4 py-2.5 bg-ur-raised border rounded-lg text-ur-white placeholder-ur-gray-dark font-mono text-sm focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all ${
                input.trim() === ""
                  ? "border-ur-border"
                  : normalized
                    ? "border-ur-green"
                    : "border-ur-coral"
              }`}
            />
            <p className="text-xs text-ur-gray-dark mt-1.5">
              Full URL (https://api.example.com), or a same-origin path that
              your host proxies. Direct URLs need CORS enabled on the target
              server.
            </p>
          </div>

          {isInsecure && (
            <div className="bg-ur-yellow-light/10 border border-ur-yellow-light/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle
                size={14}
                className="text-ur-yellow-light mt-0.5 flex-shrink-0"
              />
              <p className="text-xs text-ur-gray">
                This endpoint is not using HTTPS. Credentials and traffic to it
                may be unencrypted.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-transparent text-ur-gray-dark border border-ur-gray-dark rounded-ur hover:bg-ur-tint hover:text-ur-gray transition-colors duration-100 text-sm"
            >
              <RotateCcw size={14} />
              Use Default
            </button>
            <button
              onClick={handleApply}
              disabled={!normalized}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ur-blue text-ur-white border border-ur-blue rounded-ur hover:bg-ur-blue-hover hover:border-ur-blue-hover disabled:bg-ur-blue-disabled disabled:border-ur-blue-disabled disabled:cursor-not-allowed transition-colors duration-100 text-sm"
            >
              <Check size={14} />
              Apply Network API
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default NetworkServerModal;
