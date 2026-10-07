import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Key,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createApiKey, fetchApiKeys, deleteApiKey } from "../services/api";
import type { ApiKeyMetadata } from "../services/api";
import toast from "react-hot-toast";
import ApiKeyCreatedModal from "./ApiKeyCreatedModal";
import ApiKeyDeleteModal from "./ApiKeyDeleteModal";

const ApiKeysSection: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<ApiKeyMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [createdKey, setCreatedKey] = useState<{
    apiKey: string;
    name: string;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ApiKeyMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await fetchApiKeys(token);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        setKeys(result.api_keys);
      }
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!token || !newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createApiKey(token, newKeyName.trim());
      if (result.error) {
        toast.error(result.error.message);
      } else if (result.api_key) {
        setCreatedKey({ apiKey: result.api_key, name: newKeyName.trim() });
        setNewKeyName("");
        toast.success("API key created successfully!");
        loadKeys();
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;

    setIsDeleting(true);
    try {
      const result = await deleteApiKey(token, deleteTarget.id);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success("API key deleted");
        setDeleteTarget(null);
        loadKeys();
      }
    } catch {
      toast.error("Failed to delete API key");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-staggerFadeUp"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/account")}
            className="p-2 bg-ur-raised hover:bg-ur-hover rounded-lg transition-colors border border-ur-border"
          >
            <ArrowLeft size={20} className="text-ur-gray" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-ur-white flex items-center gap-3">
              <div className="p-2 bg-ur-yellow-light rounded-ur">
                <Key className="text-ur-black" size={28} />
              </div>
              API Key Management
            </h2>
            <p className="text-ur-gray mt-2">
              Create and manage API keys for programmatic access
            </p>
          </div>
        </div>
      </div>

      <div
        className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Plus size={20} className="text-ur-white" />
            <div>
              <h3 className="font-medium text-ur-white">Create New API Key</h3>
              <p className="text-ur-gray text-sm mt-1">
                Generate a new key for programmatic access to your account
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-ur-yellow-light/10 p-4 rounded-lg border border-ur-yellow-light/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-ur-yellow-light" />
              <span className="text-sm font-medium text-ur-yellow-light">
                Security Notice
              </span>
            </div>
            <p className="text-xs text-ur-yellow-light">
              API keys grant full access to your account via the API. Keep them
              secret and never share them publicly. The key value is only shown
              once at creation time.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ur-gray mb-2">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production Server, CI/CD Pipeline"
              className="w-full px-4 py-3 bg-ur-raised border border-ur-border rounded-lg focus:ring-2 focus:ring-ur-blue focus:border-ur-blue transition-all duration-200 text-ur-white placeholder-ur-gray-dark"
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newKeyName.trim()) handleCreate();
              }}
            />
            <p className="text-xs text-ur-gray mt-1">
              A descriptive name to help you identify this key later
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating || !newKeyName.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
 isCreating || !newKeyName.trim()
 ? "bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray"
                : "bg-ur-yellow-light hover:bg-ur-yellow-light/90 text-ur-black border border-ur-yellow-light transform hover:scale-[1.02]"
            }`}
          >
            {isCreating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-ur-gray"
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
                Creating API Key...
              </>
            ) : (
              <>
                <Plus size={20} />
                Generate API Key
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="bg-ur-panel rounded-ur shadow-ur-flat overflow-hidden border border-ur-border animate-staggerFadeUp"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="bg-ur-raised px-6 py-4 border-b border-ur-border">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-ur-white" />
            <div>
              <h3 className="font-medium text-ur-white">Your API Keys</h3>
              <p className="text-ur-white text-sm mt-1">
                {keys.length} key{keys.length !== 1 ? "s" : ""} registered
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-ur-gray"
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
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-ur-raised/50 rounded-full mb-4">
                <Key size={28} className="text-ur-gray-dark" />
              </div>
              <p className="text-ur-gray font-medium">No API keys yet</p>
              <p className="text-ur-gray-dark text-sm mt-1">
                Create your first API key above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 bg-ur-raised/50 rounded-lg border border-ur-border hover:border-ur-active transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-2 bg-ur-hover rounded-lg flex-shrink-0">
                      <Key size={16} className="text-ur-yellow-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-ur-white font-medium truncate">
                        {key.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock size={12} className="text-ur-gray-dark" />
                        <span className="text-xs text-ur-gray">
                          Created {formatDate(key.create_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(key)}
                    className="flex-shrink-0 p-2 text-ur-gray hover:text-ur-coral hover:bg-ur-coral/10 rounded-lg transition-all duration-200 ml-3"
                    title="Delete key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoading && keys.length > 0 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-ur-raised/30 rounded-lg border border-ur-border/50">
              <AlertCircle
                size={14}
                className="text-ur-gray-dark flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-ur-gray-dark">
                API key values are not stored and cannot be retrieved after
                creation. If you lose a key, delete it and create a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      <ApiKeyCreatedModal
        isOpen={!!createdKey}
        onClose={() => setCreatedKey(null)}
        apiKey={createdKey?.apiKey ?? ""}
        keyName={createdKey?.name ?? ""}
      />

      <ApiKeyDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        keyName={deleteTarget?.name ?? ""}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default ApiKeysSection;
