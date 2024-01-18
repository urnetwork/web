import { Provider24h } from "@/app/_lib/types";
import { classNames } from "@/app/_lib/utils";
import { Switch } from "@headlessui/react";
import DeviceDetailSidebar from "./DeviceDetailSidebar";
import { useState } from "react";
import UptimeWidget from "./UptimeWidget";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getNetworkClients,
  getStatsProviders,
  postDeviceSetProvide,
} from "@/app/_lib/api";

const PROVIDE_MODE_FRIENDS_AND_FAMILY = 2;
const PROVIDE_MODE_PUBLIC = 3;

type DevicesTableProps = {};

export default function DevicesTable({}: DevicesTableProps) {
  const [selectedProvider, setSelectedProvider] = useState<
    Provider24h | undefined
  >();

  // Network requests
  const { isPending: isDevicesPending, data: devices } = useQuery({
    queryKey: ["stats", "providers"],
    queryFn: getStatsProviders,
  });
  const providers = devices?.providers;

  const { isPending: isNetworkDevicesPending, data: clients } = useQuery({
    queryKey: ["network", "clients"],
    queryFn: getNetworkClients,
  });

  const mutation = useMutation({
    mutationFn: ({
      client_id,
      provide_mode,
    }: {
      client_id: string;
      provide_mode: number;
    }) =>
      postDeviceSetProvide({
        client_id: client_id,
        provide_mode: provide_mode,
      }),
    onMutate: async ({
      client_id,
      provide_mode,
    }: {
      client_id: string;
      provide_mode: number;
    }) => {
      console.log("On mutate was called with: ", { client_id, provide_mode });
      // Todo: Use setQueryData to optimistically update networkDevices
    },
    onSettled: () => {
      console.log("On settled called");
      // Todo: invalidate network devices query
    },
  });

  const handleProvideToggle = (provider: Provider24h, isProvideOn: boolean) => {
    console.log(provider.client_id, "; Changed toggle to: ", isProvideOn);
    const provideMode = isProvideOn
      ? PROVIDE_MODE_PUBLIC
      : PROVIDE_MODE_FRIENDS_AND_FAMILY;
    mutation.mutate({
      client_id: provider.client_id,
      provide_mode: provideMode,
    });
  };

  const getClient = (clientId: string) => {
    const client = clients?.clients.find(
      (client) => clientId == client.client_id
    );
    if (!client) {
      return null;
    }
    return client;
  };

  const getProvideMode = (clientId: string) => {
    const client = getClient(clientId);
    return client?.provide_mode;
  };

  const isProviding = (clientId: string) => {
    return getProvideMode(clientId) == PROVIDE_MODE_PUBLIC;
  };

  const getNumConnections = (clientId: string) => {
    const client = getClient(clientId);
    return client?.connections?.length || 0;
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
                onClick={() => {
                  console.log("Row on click");
                  setSelectedProvider(provider);
                }}
              >
                <td className="py-2 px-1 font-semibold text-gray-800 overflow-ellipsis">
                  {provider.client_id}
                </td>
                <td className="py-2 px-1">
                  <div className="flex flex-row items-center gap-x-2 whitespace-nowrap">
                    {isNetworkDevicesPending && (
                      <>
                        <div className="h-4 w-32 bg-gray-200 rounded-full" />
                      </>
                    )}

                    {!isNetworkDevicesPending && (
                      <>
                        <Switch
                          checked={isProviding(provider.client_id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(newState) =>
                            handleProvideToggle(provider, newState)
                          }
                          className={classNames(
                            isProviding(provider.client_id)
                              ? "bg-green-600"
                              : "bg-gray-200",
                            "relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                          )}
                        >
                          <span className="sr-only">Use setting</span>
                          <span
                            aria-hidden="true"
                            className={classNames(
                              isProviding(provider.client_id)
                                ? "translate-x-3"
                                : "translate-x-0",
                              "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                            )}
                          />
                        </Switch>
                        <p>
                          {getNumConnections(provider.client_id)}
                          <span className="text-xs">&nbsp;connections</span>
                        </p>
                      </>
                    )}
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
