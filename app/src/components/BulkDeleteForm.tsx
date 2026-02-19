import React, { useRef, useState } from "react";
import { Trash2, AlertTriangle, Clock, Users } from "lucide-react";
import { useAuth } from '../hooks/useAuth';
import { removeClient } from "../services/api";
import type { Client } from "../services/api";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

interface BulkDeleteFormProps {
  clients: Client[];
  onClientsRemoved: (clientIds: string[]) => void;
}

const BulkDeleteForm: React.FC<BulkDeleteFormProps> = ({
  clients,
  onClientsRemoved,
}) => {
  const { token } = useAuth();
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({
    current: 0,
    total: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate which clients would be deleted
  const getClientsToDelete = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return clients.filter((client) => {
      // Never delete connected clients
      const isConnected = client.connections && client.connections.length > 0;
      if (isConnected) return false;

      // Check if client is offline for the specified number of days
      const authTime = new Date(client.auth_time);
      return authTime < cutoffDate;
    });
  };

  const clientsToDelete = getClientsToDelete(selectedDays);

  const handleBulkDelete = async () => {
    if (!token || clientsToDelete.length === 0) return;

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: clientsToDelete.length });

    const deletedClientIds: string[] = [];
    const failedClients: string[] = [];
    let aborted = false;

    // Create abort controller once for the entire operation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      for (let i = 0; i < clientsToDelete.length; i++) {
        // Check if operation was canceled before processing next client
        if (abortController.signal.aborted) {
          aborted = true;
          break;
        }

        const client = clientsToDelete[i];
        setDeleteProgress({ current: i + 1, total: clientsToDelete.length });

        try {
          const response = await removeClient(
            token,
            client.client_id,
            abortController.signal
          );

          if (response.error) {
            if (response.error.isAborted) {
              console.log("Aborted");
              aborted = true;
              break;
            }

            failedClients.push(client.client_id);
            console.error(
              `Failed to delete client ${client.client_id}:`,
              response.error.message
            );
          } else {
            deletedClientIds.push(client.client_id);
          }
        } catch (error) {
          failedClients.push(client.client_id);
          console.error(`Error deleting client ${client.client_id}:`, error);
        }

        // Add a small delay to avoid overwhelming the API
        if (i < clientsToDelete.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (aborted) {
        onClientsRemoved(deletedClientIds);
        toast.success(
          `Operation canceled. Removed ${deletedClientIds.length} offline clients successfully, ${failedClients.length} failed`
        );
      }

      // Update the UI with successfully deleted clients
      else if (deletedClientIds.length > 0) {
        onClientsRemoved(deletedClientIds);
        toast.success(
          `Successfully removed ${deletedClientIds.length} offline clients`
        );
      } else if (failedClients.length > 0) {
        toast.error(`Failed to remove ${failedClients.length} clients`);
      }
    } catch (error) {
      toast.error("Bulk delete operation failed");
      console.error("Bulk delete error:", error);
    } finally {
      abortControllerRef.current = null;
      setIsDeleting(false);
      setShowModal(false);
      setDeleteProgress({ current: 0, total: 0 });
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
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">
              Bulk Delete Warning
            </span>
          </div>
          <p className="text-xs text-yellow-200 mb-2">
            This will permanently remove multiple clients from your network.
            Connected clients will never be deleted.
          </p>
          <div className="text-xs text-yellow-300">
            <strong>Safety Features:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Online/connected clients are automatically protected</li>
              <li>
                Only offline clients past the selected time threshold are
                removed
              </li>
              <li>
                Each deletion is processed individually with error handling
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
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
                    className="mt-1 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                    disabled={isDeleting}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-200">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Users size={16} className="text-blue-400" />
              Deletion Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <div className="text-gray-400">Total Clients</div>
                <div className="text-lg font-semibold text-white">
                  {clients.length}
                </div>
              </div>
              <div className="bg-green-900/30 p-3 rounded border border-green-700">
                <div className="text-green-300">Protected (Online)</div>
                <div className="text-lg font-semibold text-green-200">
                  {
                    clients.filter(
                      (c) => c.connections && c.connections.length > 0
                    ).length
                  }
                </div>
              </div>
              <div className="bg-red-900/30 p-3 rounded border border-red-700">
                <div className="text-red-300">Will Be Deleted</div>
                <div className="text-lg font-semibold text-red-200">
                  {clientsToDelete.length}
                </div>
              </div>
            </div>

            {clientsToDelete.length > 0 && (
              <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                <div className="text-xs text-gray-400 mb-2">
                  Sample clients to be deleted:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {clientsToDelete.slice(0, 5).map((client) => (
                    <div
                      key={client.client_id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-300 font-mono truncate flex-1 mr-2">
                        {client.device_name || client.client_id}
                      </span>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(client.auth_time)}
                      </span>
                    </div>
                  ))}
                  {clientsToDelete.length > 5 && (
                    <div className="text-xs text-gray-500 italic">
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
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
              isDeleting || clientsToDelete.length === 0
                ? "bg-gray-600 cursor-not-allowed border border-gray-600"
                : "bg-red-600 hover:bg-red-700 border border-red-500 hover:shadow-lg transform hover:scale-105"
            }`}
          >
            {isDeleting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                Deleting... ({deleteProgress.current}/{deleteProgress.total})
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
              <p className="text-sm text-gray-400 italic">
                No offline clients found matching the selected criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => {
          if (isDeleting) {
            abortControllerRef.current?.abort();
          } else {
            setShowModal(false);
          }
        }}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Delete"
        isLoading={isDeleting}
        icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-medium text-white">
              {clientsToDelete.length}
            </span>{" "}
            offline clients?
          </p>

          <div className="bg-red-900/50 p-3 rounded-lg border border-red-700">
            <p className="text-sm text-red-300 font-medium mb-2">
              ⚠️ This action will:
            </p>
            <ul className="text-sm text-red-200 space-y-1">
              <li>
                • Permanently remove {clientsToDelete.length} clients from your
                network
              </li>
              <li>• Process deletions one by one (may take a few minutes)</li>
              <li>• Skip any connected clients automatically</li>
              <li>• Cannot be undone once completed</li>
            </ul>
          </div>

          <div className="bg-blue-900/50 p-3 rounded-lg border border-blue-700">
            <p className="text-sm text-blue-300">
              <strong>Criteria:</strong> Clients offline for{" "}
              {selectedDays === 0
                ? "any amount of time"
                : `${selectedDays}+ days`}
            </p>
          </div>

          {isDeleting && (
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                <span>Progress</span>
                <span>
                  {deleteProgress.current} / {deleteProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (deleteProgress.current / deleteProgress.total) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </ConfirmModal>
    </>
  );
};

export default BulkDeleteForm;
