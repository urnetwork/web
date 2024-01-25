"use client";

import {
  getDeviceAssociations,
  getNetworkClients,
  postDeviceConfirmShare,
  postDeviceRemoveAssociation,
} from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../loading";
import Button from "@/app/_lib/components/Button";
import { useState } from "react";
import { ConfirmDeleteModal } from "@/app/_lib/components/ConfirmDeleteModal";

type DeviceDetailProps = {
  clientId: string;
};

export default function DeviceDetail({ clientId }: DeviceDetailProps) {
  const queryClient = useQueryClient();
  const [networkToRemove, setNetworkToRemove] = useState<{
    code: string;
    network_name: string;
  }>();

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

  const { data: confirmShareResult, mutateAsync } = useMutation({
    mutationKey: ["device", "confirm", "share"],
    mutationFn: async ({ code, confirm }: { code: string; confirm: boolean }) =>
      await postDeviceConfirmShare({ share_code: code, confirm: confirm }),
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const {
    data: removeAssociationResult,
    mutateAsync: mutateRemoveAssociationAsync,
  } = useMutation({
    mutationKey: ["device", "remove", "association"],
    mutationFn: async (code: string) =>
      await postDeviceRemoveAssociation({ code }),
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const handleConfirmShare = async (code: string) => {
    await mutateAsync({ code: code, confirm: true });
  };

  const handleConfirmCancel = async (code: string) => {
    await mutateAsync({ code: code, confirm: false });
  };

  const handleRemoveAssociation = async (code: string) => {
    await mutateRemoveAssociationAsync(code);
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
          {isClientsPending && (
            <div className="bg-gray-100 w-96 rounded-md h-4" />
          )}
          {!isClientsPending && client && (
            <p className="text-sm text-gray-600">{client.description}</p>
          )}
        </div>
        <h2 className="mt-12 mb-2">Shared with</h2>

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
                    <p>
                      Shared with {network.network_name}{" "}
                      {network.pending && "(awaiting confirmation)"}
                    </p>
                    <div className="grow" />
                    {network.pending && (
                      <div className="flex flex-row gap-2">
                        <Button
                          className="button bg-green-600 text-white"
                          onClick={() => handleConfirmShare(network.code)}
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
                    )}
                    {!network.pending && (
                      <div className="flex flex-row gap-2">
                        <Button
                          className="button border border-red-400 text-red-500 dark"
                          onClick={async () => setNetworkToRemove(network)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
