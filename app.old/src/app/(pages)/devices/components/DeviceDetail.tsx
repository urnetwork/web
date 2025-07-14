"use client";

import {
  getDeviceAssociations,
  getNetworkClients,
  postDeviceConfirmShare,
  postDeviceCreateShareCode,
  postDeviceRemoveAssociation,
  postRemoveNetworkClient,
} from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../loading";
import Button from "@/app/_lib/components/Button";
import { useState } from "react";
import { ConfirmDeleteModal } from "@/app/_lib/components/ConfirmDeleteModal";
import { redirect, useRouter } from "next/navigation";
import ShareDeviceDialog from "./ShareDeviceDialog";

type DeviceDetailProps = {
  clientId: string;
};

export default function DeviceDetail({ clientId }: DeviceDetailProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [networkToRemove, setNetworkToRemove] = useState<{
    code: string;
    network_name?: string;
  }>();
  const [showDeleteDeviceModal, setShowDeleteDeviceModal] = useState(false);
  const [showShareDeviceModal, setShowShareDeviceModal] = useState(false);

  const { isPending: isClientsPending, data: clients } = useQuery({
    queryKey: ["network", "clients"],
    queryFn: async () => (await getNetworkClients()).clients,
  });

  const { isPending: isAssociationsPending, data: associations } = useQuery({
    queryKey: ["device", "associations"],
    queryFn: getDeviceAssociations,
  });

  const outgoingSharedDevices = associations?.outgoing_shared_devices;
  const client = clients?.filter((client) => client.client_id == clientId)[0];

  if (!isClientsPending && !client) {
    return (
      <div className="md:mt-10 p-4 max-w-3xl">
        <Breadcrumbs
          items={[
            {
              title: "Devices",
              url: "/devices",
            },
          ]}
        />

        <div className="flex flex-col">
          <h1 className="text-2xl">{clientId}</h1>
          <p>No device found.</p>
        </div>
      </div>
    );
  }

  const getOutgoingNetworks = (clientId: string) => {
    return outgoingSharedDevices?.filter(
      (device) => device.client_id == clientId
    );
  };

  const {
    data: shareCodeResult,
    mutateAsync: mutateDeviceCreateShareCodeAsync,
  } = useMutation({
    mutationKey: ["device", "create", "share", "code", clientId],
    mutationFn: async () => {
      return await postDeviceCreateShareCode({
        client_id: clientId,
        device_name: clientId, // Todo(awais): There must be a better device name?
      });
    },
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const { mutateAsync: mutateConfirmShareAsync } = useMutation({
    mutationKey: ["device", "confirm", "share"],
    mutationFn: async ({
      code,
      associated_network_name,
    }: {
      code: string;
      associated_network_name: string | null;
    }) =>
      await postDeviceConfirmShare({
        share_code: code,
        associated_network_name,
      }),
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const { mutateAsync: mutateRemoveAssociationAsync } = useMutation({
    mutationKey: ["device", "remove", "association"],
    mutationFn: async (code: string) =>
      await postDeviceRemoveAssociation({ code }),
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const { mutateAsync: mutateRemoveNetworkClientAsync } = useMutation({
    mutationKey: ["remove", "network", "client"],
    mutationFn: async (clientId: string) =>
      await postRemoveNetworkClient({ client_id: clientId }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["network", "clients"] }),
  });

  const handleConfirmShare = async (
    code: string,
    associated_network_name: string
  ) => {
    await mutateConfirmShareAsync({
      code: code,
      associated_network_name: associated_network_name,
    });
  };

  const handleShareDevice = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    await mutateDeviceCreateShareCodeAsync();
    setShowShareDeviceModal(true);
  };

  const handleConfirmCancel = async (code: string) => {
    await mutateRemoveAssociationAsync(code);
  };

  const handleRemoveAssociation = async (code: string) => {
    await mutateRemoveAssociationAsync(code);
  };

  const handleRemoveNetworkClient = async (clientId: string) => {
    await mutateRemoveNetworkClientAsync(clientId);
  };

  return (
    <>
      {networkToRemove && (
        <ConfirmDeleteModal
          isOpen={Boolean(networkToRemove)}
          setIsOpen={(value: boolean) => {
            if (!value) {
              setNetworkToRemove(undefined);
            }
          }}
          onConfirm={async () =>
            await handleRemoveAssociation(networkToRemove.code)
          }
        >
          <p className="font-semibold">
            Are you sure you want to stop sharing with{" "}
            <span className="font-medium">{networkToRemove.network_name}</span>?
          </p>
          <p className="mt-4">You won't be able to undo this action.</p>
        </ConfirmDeleteModal>
      )}

      {shareCodeResult && showShareDeviceModal && (
        <ShareDeviceDialog
          clientId={clientId}
          shareCodeResult={shareCodeResult}
          isOpen={showShareDeviceModal}
          setIsOpen={setShowShareDeviceModal}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteDeviceModal}
        setIsOpen={setShowDeleteDeviceModal}
        onConfirm={async () => {
          await handleRemoveNetworkClient(clientId);
          router.push("/devices");
        }}
      >
        <p className="font-semibold">
          Are you sure you want to delete{" "}
          <span className="font-medium">{clientId}</span>?
        </p>
        <p className="mt-4">You won't be able to undo this action.</p>
      </ConfirmDeleteModal>

      <div className="md:mt-10 p-4 max-w-3xl min-h-full">
        <Breadcrumbs
          items={[
            {
              title: "Devices",
              url: "/devices",
            },
          ]}
        />

        <div className="flex flex-col">
          <h1 className="text-2xl">{clientId}</h1>
          {isClientsPending && (
            <div className="bg-gray-100 w-96 rounded-md h-4" />
          )}
          {!isClientsPending && client && (
            <p className="text-sm text-gray-600">{client.description}</p>
          )}
        </div>
        <div className="flex flex-row items-start">
          <h2 className="mt-12 mb-2">Shared with</h2>
          <div className="grow" />
          <Button className="button btn-primary" onClick={handleShareDevice}>
            Share device
          </Button>
        </div>

        {(isClientsPending || isAssociationsPending) && <Loading />}

        {!isClientsPending && !isAssociationsPending && (
          <>
            {(!getOutgoingNetworks(clientId) ||
              getOutgoingNetworks(clientId)?.length == 0) && (
              <div className="w-full border-t border-gray-300 pt-2">
                <p className="text-sm">Not shared with any networks</p>
              </div>
            )}

            {(getOutgoingNetworks(clientId)?.length || 0) > 0 && (
              <div className="flex flex-col mt-2 divide-y border-t border-gray-300">
                {getOutgoingNetworks(clientId)?.map((network) => (
                  <div
                    key={`${clientId}-${network.network_name}`}
                    className="flex flex-row items-center w-full text-sm text-gray-600 py-2"
                  >
                    {network.pending && !network.network_name && (
                      <>
                        <p>
                          Code generated:{" "}
                          <span className="font-semibold">{network.code}</span>
                        </p>
                        <div className="grow" />
                        <div className="flex flex-row gap-2">
                          <Button
                            className="button border border-gray-400 text-gray-500 dark"
                            onClick={() => handleConfirmCancel(network.code)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}

                    {network.pending && network.network_name && (
                      <>
                        <p>
                          Shared with {network.network_name}{" "}
                          {network.pending && "(awaiting confirmation)"}
                        </p>
                        <div className="grow" />

                        <div className="flex flex-row gap-2">
                          <Button
                            className="button bg-green-600 text-white"
                            onClick={() =>
                              handleConfirmShare(
                                network.code,
                                network.network_name!
                              )
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            className="button border border-gray-400 text-gray-500 dark"
                            onClick={() => handleConfirmCancel(network.code)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                    {!network.pending && (
                      <>
                        <p>
                          Shared with {network.network_name}{" "}
                          {network.pending && "(awaiting confirmation)"}
                        </p>
                        <div className="grow" />

                        <div className="flex flex-row gap-2">
                          <Button
                            className="button border border-red-400 text-red-500 dark"
                            onClick={async () => setNetworkToRemove(network)}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-24">
              <button
                className="button border border-red-400 text-red-500 dark"
                onClick={() => setShowDeleteDeviceModal(true)}
              >
                Delete device
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
