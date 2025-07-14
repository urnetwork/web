"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { getNetworkClients } from "@lib/api";

export default function Page() {
  const { isPending, data: clients } = useQuery({
    queryKey: ["network", "ffclients"],
    queryFn: async () => {
      const allClients = (await getNetworkClients()).clients;
      return allClients.filter((client) => client.provide_mode == 2);
    },
  });

  return (
    <>
      <div className="md:mt-12 p-4 max-w-3xl">
        <div className="flex flex-row justify-between items-end mb-8">
          <h1>Friends and Family Devices</h1>
        </div>

        {isPending && <Loading />}

        {!isPending && (
          <>
            <div className="flex flex-col gap-4">
              {clients?.length == 0 && (
                <div className="text-gray-600">No devices found</div>
              )}

              {clients?.map((client) => {
                return (
                  <div
                    key={client.client_id}
                    className="border border-gray-300 bg-gray-100 rounded-md p-4 flex flex-row gap-4 items-center cursor-pointer hover:border-primary transition-all duration-150 hover:scale-[1.02]"
                  >
                    <div className="w-8 h-8">
                      <DevicePhoneMobileIcon className="text-gray-400" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-gray-800 font-semibold">
                        {client.client_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {client.description}
                      </p>
                    </div>

                    <div className="flex-grow" />
                    <div className="flex flex-row gap-2 items-center">
                      {client.connections && client.connections.length > 0 && (
                        <>
                          <div className="w-3 h-3 rounded-full bg-ok"></div>
                          <div className="text-xs text-gray-500">Connected</div>
                        </>
                      )}
                      {!client.connections && (
                        <>
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <div className="text-xs text-gray-500">
                            Disconnected
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
