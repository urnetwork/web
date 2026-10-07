import React, { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Check, Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  changeNetworkName,
  checkNetworkName,
  fetchNetworkUser,
} from "../services/api";

/**
 * Account Settings card: view and change the network name.
 * POST /account/change-name (server PR #406) — requires a verified email or
 * SSO login on the account; the old name enters a 24h reclaim cooldown.
 */
const NetworkNameSection: React.FC = () => {
  const { token } = useAuth();

  const [currentName, setCurrentName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCurrentName = useCallback(async () => {
    if (!token) return;
    const response = await fetchNetworkUser(token);
    if (response.network_user?.network_name) {
      setCurrentName(response.network_user.network_name);
    } else {
      setCurrentName("(unavailable)");
    }
  }, [token]);

  useEffect(() => {
    loadCurrentName();
  }, [loadCurrentName]);

  const handleNameChange = (value: string) => {
    setNewName(value);
    setAvailable(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim() === currentName) return;

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      const result = await checkNetworkName(value.trim());
      setAvailable(result.available);
      setChecking(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    if (newName.trim() === currentName) {
      toast.error("That's already your network name");
      return;
    }

    setIsSubmitting(true);
    const result = await changeNetworkName(token, newName.trim());
    setIsSubmitting(false);

    if (result.error) {
      toast.error(`Could not change name: ${result.error.message}`, {
        duration: 6000,
      });
      return;
    }

    toast.success(`Network name changed to ${result.network_name}`);
    setCurrentName(result.network_name ?? newName.trim());
    setNewName("");
    setAvailable(null);
  };

  const indicator = () => {
    if (checking)
      return <Loader2 size={16} className="animate-spin text-ur-gray-dark" />;
    if (available === true)
      return <Check size={16} className="text-ur-green" />;
    if (available === false)
      return <XCircle size={16} className="text-ur-coral" />;
    return null;
  };

  return (
    <div
      className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp"
      style={{ animationDelay: "0.28s" }}
    >
      <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-ur-blue-light" />
          <div>
            <h3 className="font-medium text-ur-white">Network Name</h3>
            <p className="text-ur-gray text-sm mt-1">
              Your network&apos;s public identity across URnetwork
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-ur-gray">
          Current name:{" "}
          <span className="text-ur-white font-mono">
            {currentName ?? "loading..."}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative max-w-md">
            <input
              type="text"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="New network name"
              className={`w-full px-4 py-2.5 pr-9 bg-ur-raised border rounded-lg text-ur-white placeholder-ur-gray-dark focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all text-sm ${
                available === true
                  ? "border-ur-green"
                  : available === false
                    ? "border-ur-coral"
                    : "border-ur-border"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {indicator()}
            </div>
          </div>
          {available === false && (
            <p className="text-ur-coral text-xs">
              That network name is already taken
            </p>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting || !newName.trim() || available === false || checking
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-colors duration-100 ${
              isSubmitting || !newName.trim() || available === false || checking
                ? "bg-ur-hover text-ur-gray cursor-not-allowed"
                : "bg-ur-blue text-ur-white hover:bg-ur-blue-hover"
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Globe size={14} />
            )}
            Change Name
          </button>
        </form>

        <div className="bg-ur-blue/10 border border-ur-blue/40 rounded-lg p-3">
          <p className="text-xs text-ur-gray">
            <span className="text-ur-blue-light font-medium">
              Requirements:
            </span>{" "}
            changing the name needs a verified email or SSO sign-in bound to
            this account (a wallet or seed phrase alone doesn&apos;t qualify).
            Your old name is held in a 24-hour cooldown before anyone else can
            take it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NetworkNameSection;
