"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Loading from "../loading";
import { getDeviceAssociations, getNetworkClients } from "@lib/api";
import Link from "next/link";
import ShareDeviceDialog from "./ShareDeviceDialog";
import { useState } from "react";
import { Client } from "@/app/_lib/types";

const PAGE_SIZE = 3;

export default function DeviceList() {
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [numItemsToShow, setNumItemsToShow] = useState(PAGE_SIZE);

  const { isPending: isClientsPending, data: clients } = useQuery({
    queryKey: ["network", "clients"],
    queryFn: async () => (await getNetworkClients()).clients,
  });

  const { isPending: isAssociationsPending, data: associations } = useQuery({
    queryKey: ["device", "associations"],
    queryFn: getDeviceAssociations,
  });

  const pendingAdoptionDevices = associations?.pending_adoption_devices;
  const incomingSharedDevices = associations?.incoming_shared_devices;
  const outgoingSharedDevices = associations?.outgoing_shared_devices;

  const isPending = isClientsPending || isAssociationsPending;

  const numItems = () => {
    return (clients?.length || 0) + (pendingAdoptionDevices?.length || 0);
  };

  const getNumOutgoingNetworks = (clientId: string) => {
    const networks = outgoingSharedDevices?.filter(
      (device) => device.client_id == clientId
    );
    const numNetworks = networks?.length || 0;

    if (numNetworks == 1) {
      return "1 network";
    }

    return `${numNetworks} networks`;
  };

  return (
    <>
      {selectedClient && (
        <ShareDeviceDialog
          device={selectedClient}
          isOpen={selectedClient != undefined}
          setIsOpen={(value: boolean) => {
            if (!value) {
              setSelectedClient(undefined);
            }
          }}
        />
      )}

      <div className="md:mt-12 p-4 max-w-3xl">
        <div className="flex flex-row justify-between items-end mb-8">
          <h1>Your Devices</h1>
          <Link href="/devices/add">
            <button className="button btn-primary">
              <div className="flex flex-row gap-2 items-center">
                <PlusIcon className="w-5 h-4 text-white font-semibold" />

                <p className="font-light">Add device</p>
              </div>
            </button>
          </Link>
        </div>

        {isPending && <Loading />}

        {!isPending && (
          <>
            <div className="flex flex-col gap-4 items-start">
              {clients?.length == 0 && (
                <div className="text-gray-600">No devices found</div>
              )}

              {clients?.slice(0, numItemsToShow)?.map((client) => {
                return (
                  <div key={client.client_id} className="card w-full">
                    <div className="flex flex-row gap-4 items-center">
                      <div className="w-8 h-8">
                        <DevicePhoneMobileIcon className="text-gray-400" />
                      </div>
                      <Link href={`/devices?client_id=${client.client_id}`}>
                        <div className="flex flex-col">
                          <p className="text-gray-800 font-semibold">
                            {client.client_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            {client.description}
                          </p>
                        </div>
                      </Link>
                      <div className="flex-grow" />
                      <div>
                        <button
                          className="button border border-primary text-primary"
                          onClick={() => setSelectedClient(client)}
                        >
                          Share device
                        </button>
                      </div>
                    </div>

                    {/* Outoing shared devices */}
                    <div className="ml-12 mt-2 text-sm text-gray-500">
                      <p>
                        Shared with <span className="font-semibold"></span>
                        {getNumOutgoingNetworks(client.client_id)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {pendingAdoptionDevices
                ?.slice(0, numItemsToShow - (clients?.length || 0))
                ?.map((device) => {
                  return (
                    <div key={device.client_id} className="card w-full">
                      <div className="flex flex-row gap-4 items-center">
                        <div className="w-8 h-8">
                          <DevicePhoneMobileIcon className="text-gray-400" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-gray-800 font-semibold">
                            {device.client_id}
                          </p>
                        </div>
                        <div className="flex-grow" />
                        <div>
                          <button className="button border border-red-400 text-red-500">
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="ml-12 mt-2 text-sm text-gray-500">
                        <p>Waiting for confirmation</p>
                      </div>
                    </div>
                  );
                })}

              {PAGE_SIZE < numItems() && numItemsToShow < numItems() && (
                <div
                  className="cursor-pointer active:translate-y-0.5"
                  onClick={() => setNumItemsToShow(999)}
                >
                  <p className="text-sm text-indigo-500 -mt-2">Show more</p>
                </div>
              )}

              {PAGE_SIZE < numItems() && numItemsToShow > numItems() && (
                <div
                  className="cursor-pointer active:translate-y-0.5"
                  onClick={() => setNumItemsToShow(PAGE_SIZE)}
                >
                  <p className="text-sm text-indigo-500 -mt-2">Show less</p>
                </div>
              )}
            </div>
          </>
        )}

        <h2 className="mt-8 mb-2">Devices shared with you</h2>
        {isAssociationsPending && <Loading />}
        {!isAssociationsPending && (
          <div className="flex flex-col gap-4">
            {incomingSharedDevices?.map((device) => (
              <div key={device.client_id} className="card">
                <div className="flex flex-row gap-4 items-center">
                  <div className="w-8 h-8">
                    <DevicePhoneMobileIcon className="text-gray-400" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-gray-800 font-semibold">
                      {device.client_id}
                    </p>
                  </div>
                  <div className="flex-grow" />
                  <div>
                    <button className="button border border-red-400 text-red-500">
                      Remove
                    </button>
                  </div>
                </div>
                <div className="ml-12 mt-2 text-sm text-gray-500">
                  {device.pending && (
                    <p>Waiting for confirmation from {device.network_name}</p>
                  )}
                  {!device.pending && <p>Shared by {device.network_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
