"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { getNetworkClients } from "@lib/api";

export default function Page() {
  const { isPending, data: clients } = useQuery({
    queryKey: ["network", "clients"],
    queryFn: async () => (await getNetworkClients()).clients,
  });

  return (
    <>
      <div className="md:mt-12 p-4 max-w-3xl">
        <div className="flex flex-row justify-between items-end mb-8">
          <h1>Provide</h1>
        </div>

        {isPending && <Loading />}

        {!isPending && (
          <>
            <div className="flex flex-row flex-wrap gap-4">
              {clients?.length == 0 && (
                <div className="text-gray-600">No devices found</div>
              )}

              {clients?.map((client) => (
                <div className="border border-gray-300 bg-gray-100 rounded-md w-40 h-96 p-4 flex flex-col gap-4 items-center cursor-pointer hover:border-primary transition-all duration-150 hover:scale-[1.02] text-center">
                  <div className="mt-4 flex-flex-col gap-2">
                    <div className="flex flex-row gap-2 items-center justify-end">
                      <p className="text-xs text-gray-500">Interest</p>
                      <div className="w-16 h-3 bg-gray-300 rounded-sm"></div>
                    </div>
                    <div className="flex flex-row gap-2 items-center justify-end">
                      <p className="text-xs text-gray-500">Usage</p>
                      <div className="w-16 h-3 bg-gray-300 rounded-sm"></div>
                    </div>
                  </div>

                  <div className="w-8 h-8 mt-6">
                    <DevicePhoneMobileIcon className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">{client.description}</p>

                  <p className="text-xs text-gray-400">
                    This is just a placeholder for now
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
