import React, { useState } from "react";
import { Trash2, AlertTriangle, Clock, Users } from "lucide-react";
import { useAuth } from '../hooks/useAuth';
import { removeClients } from "../services/api";
import type { Client } from "../services/api";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

interface BulkDeleteFormProps {
  clients: Client[];
  onClientsRemoved: (clientIds: string[]) => void;
}

/** Server applies larger requests as a background task (server PR #406) */
const SYNC_BATCH_LIMIT = 10000;

const BulkDeleteForm: React.FC<BulkDeleteFormProps> = ({
  clients,
  onClientsRemoved,
}) => {
  const { token } = useAuth();
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getClientsToDelete = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return clients.filter((client) => {
      const isConnected = client.connections && client.connections.length > 0;
      if (isConnected) return false;
      const authTime = new Date(client.auth_time);
      return authTime < cutoffDate;
    });
  };

  const clientsToDelete = getClientsToDelete(selectedDays);

  const handleBulkDelete = async () => {
    if (!token || clientsToDelete.length === 0) return;

    setIsDeleting(true);
    const clientIds = clientsToDelete.map((client) => client.client_id);

    try {
      const result = await removeClients(token, clientIds);

      if (result.error) {
        toast.error(`Bulk delete failed: ${result.error.message}`);
      } else if (result.already_in_progress) {
        toast.error(
          "A bulk delete is already running for this network. Wait for it to finish, then try again.",
          { duration: 6000 }
        );
      } else if (result.scheduled) {
        onClientsRemoved(clientIds);
        toast.success(
          `Removal of ${clientIds.length.toLocaleString()} clients scheduled — the server is processing them in the background`,
          { duration: 6000 }
        );
      } else {
        onClientsRemoved(clientIds);
        toast.success(
          `Successfully removed ${clientIds.length.toLocaleString()} offline clients`
        );
      }
    } catch (error) {
      toast.error("Bulk delete operation failed");
      console.error("Bulk delete error:", error);
    } finally {
      setIsDeleting(false);
      setShowModal(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return "1 day ago";
    } else {
      return `${diffInDays} days ago`;
    }
  };

  const dayOptions = [
    {
      value: 0,
      label: "Offline Only (Any Time)",
      description:
        "Remove all offline clients regardless of when they were last seen",
    },
    {
      value: 1,
      label: "1+ Days Offline",
      description: "Remove clients offline for more than 1 day",
    },
    {
      value: 7,
      label: "7+ Days Offline",
      description: "Remove clients offline for more than 7 days (recommended)",
    },
    {
      value: 30,
      label: "30+ Days Offline",
      description: "Remove clients offline for more than 30 days",
    },
  ];

  return (
    <>
      <div className="max-w-2xl">
        <div className="mb-6 p-4 bg-ur-yellow-light/10 border border-ur-yellow-light/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-ur-yellow-light" />
            <span className="text-sm font-medium text-ur-yellow-light">
              Bulk Delete Warning
            </span>
          </div>
          <p className="text-xs text-ur-yellow-light mb-2">
            This will permanently remove multiple clients from your network.
            Connected clients will never be deleted.
          </p>
          <div className="text-xs text-ur-gray">
            <strong className="text-ur-white">Safety Features:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Online/connected clients are automatically protected</li>
              <li>
                Only offline clients past the selected time threshold are
                removed
              </li>
              <li>
                Deletions are processed server-side in a single batched
                operation; very large batches (over{" "}
                {SYNC_BATCH_LIMIT.toLocaleString()}) run as a background task
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ur-gray mb-3">
              Select Offline Duration Threshold
            </label>
            <div className="space-y-3">
              {dayOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start space-x-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="days"
                    value={option.value}
                    checked={selectedDays === option.value}
                    onChange={(e) => setSelectedDays(Number(e.target.value))}
                    className="mt-1 rounded border-ur-border bg-ur-raised text-ur-coral focus:ring-ur-coral focus:ring-offset-ur-black"
                    disabled={isDeleting}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ur-white">
                      {option.label}
                    </div>
                    <div className="text-xs text-ur-gray">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-ur-black p-4 rounded-lg border border-ur-border">
            <h4 className="text-sm font-medium text-ur-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-ur-blue-light" />
              Deletion Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-ur-panel p-3 rounded border border-ur-border">
                <div className="text-ur-gray">Total Clients</div>
                <div className="text-lg font-semibold text-ur-white">
                  {clients.length}
                </div>
              </div>
              <div className="bg-ur-green/10 p-3 rounded border border-ur-green">
                <div className="text-ur-green">Protected (Online)</div>
                <div className="text-lg font-semibold text-ur-green">
                  {
                    clients.filter(
                      (c) => c.connections && c.connections.length > 0
                    ).length
                  }
                </div>
              </div>
              <div className="bg-ur-coral/10 p-3 rounded border border-ur-coral">
                <div className="text-ur-coral">Will Be Deleted</div>
                <div className="text-lg font-semibold text-ur-coral">
                  {clientsToDelete.length}
                </div>
              </div>
            </div>

            {clientsToDelete.length > 0 && (
              <div className="mt-4 p-3 bg-ur-panel rounded border border-ur-border">
                <div className="text-xs text-ur-gray mb-2">
                  Sample clients to be deleted:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {clientsToDelete.slice(0, 5).map((client) => (
                    <div
                      key={client.client_id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-ur-gray font-mono truncate flex-1 mr-2">
                        {client.device_name || client.client_id}
                      </span>
                      <span className="text-ur-gray-dark flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(client.auth_time)}
                      </span>
                    </div>
                  ))}
                  {clientsToDelete.length > 5 && (
                    <div className="text-xs text-ur-gray-dark italic">
                      ...and {clientsToDelete.length - 5} more clients
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            disabled={isDeleting || clientsToDelete.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
 isDeleting || clientsToDelete.length === 0
 ? "bg-ur-hover cursor-not-allowed border border-ur-border text-ur-gray"
                : "bg-ur-coral hover:bg-ur-coral-hover border border-ur-coral text-ur-black transform hover:scale-105"
            }`}
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Bulk Delete {clientsToDelete.length} Offline Clients
              </>
            )}
          </button>

          {clientsToDelete.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-ur-gray italic">
                No offline clients found matching the selected criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => {
          if (!isDeleting) {
            setShowModal(false);
          }
        }}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Delete"
        isLoading={isDeleting}
        icon={<AlertTriangle className="h-6 w-6 text-ur-coral" />}
      >
        <div className="space-y-4">
          <p className="text-ur-gray">
            Are you sure you want to delete{" "}
            <span className="font-medium text-ur-white">
              {clientsToDelete.length}
            </span>{" "}
            offline clients?
          </p>

          <div className="bg-ur-coral/15 p-3 rounded-lg border border-ur-coral">
            <p className="text-sm text-ur-coral font-medium mb-2">
              This action will:
            </p>
            <ul className="text-sm text-ur-coral space-y-1">
              <li>
                Permanently remove {clientsToDelete.length} clients from your
                network
              </li>
              <li>Skip any connected clients automatically</li>
              <li>Cannot be undone once completed</li>
            </ul>
          </div>

          <div className="bg-ur-blue/15 p-3 rounded-lg border border-ur-blue/40">
            <p className="text-sm text-ur-blue-light">
              <strong>Criteria:</strong> Clients offline for{" "}
              {selectedDays === 0
                ? "any amount of time"
                : `${selectedDays}+ days`}
            </p>
            {clientsToDelete.length > SYNC_BATCH_LIMIT && (
              <p className="text-sm text-ur-blue-light mt-2">
                <strong>Note:</strong> This batch exceeds{" "}
                {SYNC_BATCH_LIMIT.toLocaleString()} clients, so the server will
                process it as a background task. Clients may take a few minutes
                to disappear from the list.
              </p>
            )}
          </div>
        </div>
      </ConfirmModal>
    </>
  );
};

export default BulkDeleteForm;
