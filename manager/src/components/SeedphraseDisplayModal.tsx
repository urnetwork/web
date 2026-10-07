import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, ShieldAlert, KeyRound } from "lucide-react";

interface SeedphraseDisplayModalProps {
  isOpen: boolean;
  /** The BIP39 mnemonic to display — shown exactly once */
  seedphrase: string;
  /** Server-assigned network name (instant signup) */
  networkName?: string;
  title?: string;
  confirmLabel?: string;
  /** Called only after the user has explicitly confirmed they saved the phrase */
  onConfirm: () => void;
}

/**
 * Displays a seed phrase as a numbered word grid with a copy button and an
 * explicit "I saved it" confirmation gate. Mirrors the iOS
 * SeedphraseDisplayView: there is intentionally no close button, backdrop
 * dismiss, or escape hatch — the only way forward is confirming.
 */
const SeedphraseDisplayModal: React.FC<SeedphraseDisplayModalProps> = ({
  isOpen,
  seedphrase,
  networkName,
  title = "Secure Your Account",
  confirmLabel = "Continue",
  onConfirm,
}) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Normalize: trim and collapse whitespace (matches iOS implementation)
  const words = useMemo(
    () =>
      seedphrase
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0),
    [seedphrase]
  );

  if (!isOpen) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(" "));
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy seed phrase:", err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ur-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seedphrase-modal-title"
    >
      <div className="bg-ur-panel rounded-ur shadow-ur-flat w-full max-w-lg max-h-[90vh] overflow-y-auto border border-ur-border animate-scaleIn">
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-ur-green" />
            <h2
              id="seedphrase-modal-title"
              className="font-medium text-ur-white"
            >
              {title}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {networkName && (
            <p className="text-sm text-ur-gray">
              Your network:{" "}
              <span className="text-ur-white font-mono">{networkName}</span>
            </p>
          )}

          <div className="bg-ur-coral/10 border border-ur-coral/40 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert size={18} className="text-ur-coral mt-0.5 flex-shrink-0" />
            <div className="text-xs text-ur-gray space-y-1">
              <p className="text-ur-coral font-medium">
                This phrase is the key to your account.
              </p>
              <p>
                Anyone with these words can control the account. URnetwork
                cannot recover them for you — write them down and store them
                somewhere safe. They will not be shown again.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {words.map((word, i) => (
              <div
                key={`${i}-${word}`}
                className="flex items-baseline gap-2 bg-ur-raised border border-ur-border rounded-lg px-3 py-2"
              >
                <span className="text-xs text-ur-gray-dark font-mono w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-ur-white font-mono break-all">
                  {word}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent text-ur-gray-dark border border-ur-gray-dark rounded-ur hover:bg-ur-tint hover:text-ur-gray transition-colors duration-100 text-base"
          >
            {hasCopied ? (
              <>
                <Check size={16} className="text-ur-green" />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy all {words.length} words
              </>
            )}
          </button>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="mt-0.5 accent-ur-blue w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-ur-gray">
              I have written down or securely saved my seed phrase. I
              understand it cannot be recovered if lost.
            </span>
          </label>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!hasAcknowledged}
            className="w-full px-6 py-3 bg-ur-blue text-ur-white border border-ur-blue rounded-ur hover:bg-ur-blue-hover hover:border-ur-blue-hover disabled:bg-ur-blue-disabled disabled:border-ur-blue-disabled disabled:cursor-not-allowed transition-colors duration-100 text-lg"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default SeedphraseDisplayModal;
