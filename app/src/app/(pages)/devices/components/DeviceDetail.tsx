"use client";

import { getDeviceAssociations, getNetworkClients } from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Loading from "../loading";

type DeviceDetailProps = {
  clientId: string;
};

export default function DeviceDetail({ clientId }: DeviceDetailProps) {
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

  return (
    <>
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

        {isClientsPending && <Loading />}

        {!isClientsPending && (
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
                    <p>Shared with {network.network_name}</p>
                    <div className="grow" />
                    {network.pending && (
                      <div className="flex flex-row gap-2">
                        <button className="button bg-green-600 text-white">
                          Confirm
                        </button>
                        <button className="button border border-gray-400 text-gray-500">
                          Cancel
                        </button>
                      </div>
                    )}
                    {!network.pending && (
                      <div className="flex flex-row gap-2">
                        <button className="button border border-red-400 text-red-500">
                          Remove
                        </button>
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
