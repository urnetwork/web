import React, { useCallback, useEffect, useState } from "react";
import {
  Fingerprint,
  Mail,
  Phone,
  Apple,
  Chrome,
  Wallet,
  Sprout,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  addAuthMethod,
  fetchNetworkUser,
  generateSeedphrase,
  regenerateSeedphrase,
  removeAuthMethod,
} from "../services/api";
import { useWalletLogin, SolanaWalletType } from "../hooks/useWalletLogin";
import ConfirmModal from "./ConfirmModal";
import SeedphraseDisplayModal from "./SeedphraseDisplayModal";

const AUTH_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; removable: boolean }
> = {
  email: { label: "Email & password", icon: Mail, removable: true },
  phone: { label: "Phone & password", icon: Phone, removable: true },
  apple: { label: "Apple", icon: Apple, removable: true },
  google: { label: "Google", icon: Chrome, removable: true },
  solana: { label: "Solana wallet", icon: Wallet, removable: true },
  seedphrase: { label: "Seed phrase", icon: Sprout, removable: true },
};

type AddMode = "none" | "password" | "wallet";

/**
 * Account Settings card: lists every sign-in method bound to the account
 * (from GET /network/user auth_types), lets the user add email/password or
 * Solana wallet auth, remove methods (server refuses to drop the last one),
 * and generate/regenerate a seed phrase. Server PR #406.
 */
const SignInMethodsSection: React.FC = () => {
  const { token } = useAuth();
  const { connectAndSign, isPhantomAvailable, isSolflareAvailable } =
    useWalletLogin();

  const [authTypes, setAuthTypes] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addMode, setAddMode] = useState<AddMode>("none");
  const [newUserAuth, setNewUserAuth] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletLoading, setWalletLoading] = useState<SolanaWalletType | null>(
    null
  );

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [seedphraseBusy, setSeedphraseBusy] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [displayedSeedphrase, setDisplayedSeedphrase] = useState<string | null>(
    null
  );

  const loadAuthTypes = useCallback(async () => {
    if (!token) return;
    setLoadError(null);

    const response = await fetchNetworkUser(token);
    if (response.error || !response.network_user) {
      setLoadError(response.error?.message || "Failed to load sign-in methods");
    } else {
      setAuthTypes(response.network_user.auth_types ?? []);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    loadAuthTypes();
  }, [loadAuthTypes]);

  const hasSeedphrase = authTypes?.includes("seedphrase") ?? false;
  const isLastMethod = (authTypes?.length ?? 0) <= 1;

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newUserAuth.trim() || !newPassword.trim()) {
      toast.error("Email/phone and password are both required");
      return;
    }

    setIsSubmitting(true);
    const result = await addAuthMethod(token, {
      user_auth: newUserAuth.trim(),
      password: newPassword.trim(),
    });
    setIsSubmitting(false);

    if (result.error) {
      toast.error(`Could not add method: ${result.error.message}`);
      return;
    }

    toast.success("Sign-in method added");
    setNewUserAuth("");
    setNewPassword("");
    setAddMode("none");
    loadAuthTypes();
  };

  const handleAddWallet = async (walletType: SolanaWalletType) => {
    if (!token) return;
    setWalletLoading(walletType);

    try {
      const payload = await connectAndSign(walletType);
      if (!payload) {
        toast.error("Failed to get wallet signature");
        return;
      }
      const result = await addAuthMethod(token, { wallet_auth: payload });
      if (result.error) {
        toast.error(`Could not add wallet: ${result.error.message}`);
        return;
      }
      toast.success("Wallet added as a sign-in method");
      setAddMode("none");
      loadAuthTypes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Wallet connection failed"
      );
    } finally {
      setWalletLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!token || !removeTarget) return;
    setIsRemoving(true);
    const result = await removeAuthMethod(token, removeTarget);
    setIsRemoving(false);

    if (result.error) {
      toast.error(`Could not remove method: ${result.error.message}`);
    } else {
      toast.success("Sign-in method removed");
      loadAuthTypes();
    }
    setRemoveTarget(null);
  };

  const handleGenerateSeedphrase = async () => {
    if (!token) return;
    setSeedphraseBusy(true);
    const result = await generateSeedphrase(token);
    setSeedphraseBusy(false);

    if (result.error || !result.seedphrase) {
      toast.error(
        `Could not generate seed phrase: ${result.error?.message || "no phrase returned"}`
      );
      return;
    }
    setDisplayedSeedphrase(result.seedphrase);
  };

  const handleRegenerateSeedphrase = async () => {
    if (!token) return;
    setShowRegenerateConfirm(false);
    setSeedphraseBusy(true);
    const result = await regenerateSeedphrase(token);
    setSeedphraseBusy(false);

    if (result.error || !result.seedphrase) {
      toast.error(
        `Could not regenerate seed phrase: ${result.error?.message || "no phrase returned"}`
      );
      return;
    }
    setDisplayedSeedphrase(result.seedphrase);
  };

  const handleSeedphraseConfirmed = () => {
    setDisplayedSeedphrase(null);
    loadAuthTypes();
  };

  return (
    <div
      className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp"
      style={{ animationDelay: "0.25s" }}
    >
      <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
        <div className="flex items-center gap-3">
          <Fingerprint size={20} className="text-ur-pink" />
          <div>
            <h3 className="font-medium text-ur-white">Sign-In Methods</h3>
            <p className="text-ur-gray text-sm mt-1">
              Manage how you sign in to this account — add backups so you never
              lose access
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-ur-gray text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading sign-in methods...
          </div>
        ) : loadError ? (
          <div className="bg-ur-coral/10 border border-ur-coral/40 rounded-lg p-4 flex items-center justify-between gap-3">
            <span className="text-sm text-ur-coral">{loadError}</span>
            <button
              onClick={() => {
                setIsLoading(true);
                loadAuthTypes();
              }}
              className="flex items-center gap-1.5 text-sm text-ur-gray hover:text-ur-white transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(authTypes ?? []).map((type) => {
                const meta = AUTH_TYPE_META[type] ?? {
                  label: type,
                  icon: Fingerprint,
                  removable: true,
                };
                const Icon = meta.icon;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between bg-ur-raised border border-ur-border rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-ur-pink" />
                      <span className="text-sm text-ur-white">
                        {meta.label}
                      </span>
                    </div>
                    <button
                      onClick={() => setRemoveTarget(type)}
                      disabled={isLastMethod}
                      title={
                        isLastMethod
                          ? "You can't remove your only sign-in method"
                          : `Remove ${meta.label}`
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-100 border ${
                        isLastMethod
                          ? "text-ur-gray-dark border-ur-border cursor-not-allowed opacity-50"
                          : "text-ur-coral border-ur-coral/40 hover:bg-ur-coral/10"
                      }`}
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                );
              })}
              {(authTypes ?? []).length === 0 && (
                <p className="text-sm text-ur-gray italic">
                  No sign-in methods reported. Your server may not support
                  auth-method management yet.
                </p>
              )}
            </div>

            <div className="border-t border-ur-border pt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-ur-white">
                  Add a sign-in method
                </h4>
                {addMode !== "none" && (
                  <button
                    onClick={() => setAddMode("none")}
                    className="text-xs text-ur-gray-dark hover:text-ur-gray transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {addMode === "none" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setAddMode("password")}
                    className="flex items-center gap-2 px-4 py-2 bg-ur-raised text-ur-gray border border-ur-border rounded-lg hover:bg-ur-hover hover:text-ur-white transition-colors duration-100 text-sm"
                  >
                    <Plus size={14} />
                    <Mail size={14} />
                    Email / Password
                  </button>
                  <button
                    onClick={() => setAddMode("wallet")}
                    className="flex items-center gap-2 px-4 py-2 bg-ur-raised text-ur-gray border border-ur-border rounded-lg hover:bg-ur-hover hover:text-ur-white transition-colors duration-100 text-sm"
                  >
                    <Plus size={14} />
                    <Wallet size={14} />
                    Solana Wallet
                  </button>
                </div>
              )}

              {addMode === "password" && (
                <form onSubmit={handleAddPassword} className="space-y-3">
                  <input
                    type="text"
                    value={newUserAuth}
                    onChange={(e) => setNewUserAuth(e.target.value)}
                    placeholder="Email or phone number"
                    className="w-full px-4 py-2.5 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-ur-raised border border-ur-border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-colors duration-100 ${
                      isSubmitting
                        ? "bg-ur-hover text-ur-gray cursor-not-allowed"
                        : "bg-ur-blue text-ur-white hover:bg-ur-blue-hover"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Add Method
                  </button>
                </form>
              )}

              {addMode === "wallet" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAddWallet("phantom")}
                    disabled={!isPhantomAvailable || walletLoading !== null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors duration-100 ${
                      !isPhantomAvailable
                        ? "bg-ur-raised/50 text-ur-gray-dark border-ur-border opacity-50 cursor-not-allowed"
                        : "bg-[#9945FF]/10 text-ur-white border-[#9945FF]/40 hover:bg-[#9945FF]/25"
                    }`}
                  >
                    {walletLoading === "phantom" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wallet size={14} />
                    )}
                    {walletLoading === "phantom"
                      ? "Waiting for signature..."
                      : "Phantom"}
                  </button>
                  <button
                    onClick={() => handleAddWallet("solflare")}
                    disabled={!isSolflareAvailable || walletLoading !== null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors duration-100 ${
                      !isSolflareAvailable
                        ? "bg-ur-raised/50 text-ur-gray-dark border-ur-border opacity-50 cursor-not-allowed"
                        : "bg-[#FC7227]/10 text-ur-white border-[#FC7227]/40 hover:bg-[#FC7227]/25"
                    }`}
                  >
                    {walletLoading === "solflare" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wallet size={14} />
                    )}
                    {walletLoading === "solflare"
                      ? "Waiting for signature..."
                      : "Solflare"}
                  </button>
                  {!isPhantomAvailable && !isSolflareAvailable && (
                    <p className="text-xs text-ur-gray-dark w-full">
                      No Solana wallet extension detected.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-ur-border pt-5">
              <h4 className="text-sm font-medium text-ur-white mb-1">
                Seed phrase
              </h4>
              <p className="text-xs text-ur-gray mb-3">
                {hasSeedphrase
                  ? "A seed phrase is bound to this account. Regenerating replaces it — the old phrase stops working immediately."
                  : "Generate a 24-word recovery phrase you can use to sign in without email or wallet."}
              </p>
              {hasSeedphrase ? (
                <button
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={seedphraseBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-ur-coral border border-ur-coral/40 hover:bg-ur-coral/10 transition-colors duration-100 disabled:opacity-50"
                >
                  {seedphraseBusy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Regenerate Seed Phrase
                </button>
              ) : (
                <button
                  onClick={handleGenerateSeedphrase}
                  disabled={seedphraseBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-ur-blue text-ur-white hover:bg-ur-blue-hover transition-colors duration-100 disabled:opacity-50"
                >
                  {seedphraseBusy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sprout size={14} />
                  )}
                  Generate Seed Phrase
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={removeTarget !== null}
        onClose={() => {
          if (!isRemoving) setRemoveTarget(null);
        }}
        onConfirm={handleRemove}
        title="Remove Sign-In Method"
        isLoading={isRemoving}
        icon={<AlertTriangle className="h-6 w-6 text-ur-coral" />}
      >
        <p className="text-ur-gray">
          Remove{" "}
          <span className="text-ur-white font-medium">
            {removeTarget ? AUTH_TYPE_META[removeTarget]?.label ?? removeTarget : ""}
          </span>{" "}
          from this account? You will no longer be able to sign in with it.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerateSeedphrase}
        title="Regenerate Seed Phrase"
        isLoading={false}
        icon={<AlertTriangle className="h-6 w-6 text-ur-coral" />}
      >
        <p className="text-ur-gray">
          Your current seed phrase will{" "}
          <span className="text-ur-coral font-medium">
            stop working immediately
          </span>{" "}
          and be replaced by a new one. Anything that uses the old phrase to
          sign in must be updated. Continue?
        </p>
      </ConfirmModal>

      {displayedSeedphrase && (
        <SeedphraseDisplayModal
          isOpen={true}
          seedphrase={displayedSeedphrase}
          title="Your Seed Phrase"
          confirmLabel="Done"
          onConfirm={handleSeedphraseConfirmed}
        />
      )}
    </div>
  );
};

export default SignInMethodsSection;
