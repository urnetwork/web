import { Provider24h } from "@/app/_lib/types";
import { classNames } from "@/app/_lib/utils";
import { Switch } from "@headlessui/react";
import DeviceDetailSidebar from "./DeviceDetailSidebar";
import { useState } from "react";
import UptimeWidget from "./UptimeWidget";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getStatsProviders, postDeviceSetProvide } from "@/app/_lib/api";

type DevicesTableProps = {};

export default function DevicesTable({}: DevicesTableProps) {
  // Todo(awais): Move this into DevicesTable.tsx?
  const { isPending: isDevicesPending, data: devices } = useQuery({
    queryKey: ["stats", "providers"],
    queryFn: getStatsProviders,
  });
  const providers = devices?.providers;

  const [selectedProvider, setSelectedProvider] = useState<
    Provider24h | undefined
  >();

  const mutation = useMutation({
    mutationFn: () =>
      postDeviceSetProvide({ client_id: "lalala", provide_mode: 0 }),
  });

  const handleProvideToggle = (provider: Provider24h, newState: boolean) => {
    console.log(provider.client_id, "; Changed toggle to: ", newState);
  };

  if (isDevicesPending) {
    return <div className="w-full h-64 bg-gray-100 rounded-md" />;
  }

  return (
    <>
      <DeviceDetailSidebar
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
      />
      <div className="overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-300">
          <thead>
            <tr className="text-left text-xs font-light text-gray-500">
              <th scope="col" className="py-3 px-1" />
              <th scope="col" className="py-3 px-1" />
              <th scope="col" className="py-3 px-1">
                Data transferred
              </th>
              <th scope="col" className="py-3 px-1">
                Income
              </th>
              <th scope="col" className="py-3 px-1">
                Uptime
              </th>
              <th scope="col" className="py-3 px-1">
                Search interest
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {providers?.map((provider) => (
              <tr
                key={`device-row-${provider.client_id}`}
                className="whitespace-nowrap text-sm text-gray-800 cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedProvider(provider)}
              >
                <td className="py-2 px-1 font-semibold text-gray-800 overflow-ellipsis">
                  {provider.client_id}
                </td>
                <td className="py-2 px-1">
                  <div className="flex flex-row items-center gap-x-2 whitespace-nowrap">
                    <Switch
                      checked={provider.connected}
                      onChange={(newState) =>
                        handleProvideToggle(provider, newState)
                      }
                      className={classNames(
                        provider.connected ? "bg-green-600" : "bg-gray-200",
                        "relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                      )}
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={classNames(
                          provider.connected
                            ? "translate-x-3"
                            : "translate-x-0",
                          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        )}
                      />
                    </Switch>
                    <p>
                      {provider.clients_last_24h}
                      <span className="text-xs">&nbsp;connections</span>
                    </p>
                  </div>
                </td>
                <td className="py-2 px-1">
                  {provider.transfer_data_last_24h}{" "}
                  <span className="text-xs">GiB</span>
                </td>
                <td className="py-2 px-1">${provider.payout_last_24h}</td>
                <td className="py-2 px-1">
                  <div className="h-4 w-32">
                    <UptimeWidget data={provider.connected_events_last_24h} />
                  </div>
                </td>
                <td className="py-2 px-1">
                  {provider.search_interest_last_24h}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
