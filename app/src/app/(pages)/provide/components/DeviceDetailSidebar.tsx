import { postStatsProviderLast90 } from "@/app/_lib/api";
import { Provider24h } from "@/app/_lib/types";
import { Popover, Tab, Transition } from "@headlessui/react";
import { DevicePhoneMobileIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { BarChart } from "./Chart";
import { ChartBarIcon } from "@heroicons/react/24/solid";
import UptimeWidget from "./UptimeWidget";
import ActivityWidget from "./ActivityWidget";
import { formatTimeseriesData } from "@/app/_lib/utils";

type ChartItem = {
  name: string;
  key: string;
  pre_unit?: string;
  unit?: string;
};

const charts: Array<ChartItem> = [
  {
    name: "Data",
    key: "transfer_data",
    unit: "GiB",
  },
  {
    name: "Income",
    key: "payout",
    pre_unit: "$",
  },
  {
    name: "Uptime",
    key: "uptime",
    unit: "hours",
  },
  {
    name: "Searches",
    key: "search_interest",
  },
  {
    name: "Devices",
    key: "clients",
  },
];

type DeviceDetailSidebarProps = {
  selectedProvider: Provider24h | undefined;
  setSelectedProvider: CallableFunction;
};

export default function DeviceDetailSidebar({
  selectedProvider,
  setSelectedProvider,
}: DeviceDetailSidebarProps) {
  const { isPending, data: provider } = useQuery({
    queryKey: ["stats", "provider-last-90", selectedProvider?.client_id],
    queryFn: async () =>
      await postStatsProviderLast90({
        client_id: selectedProvider?.client_id || "",
      }),
    enabled: !!selectedProvider,
  });

  const isOpen = selectedProvider != null;

  return (
    <Transition show={isOpen} as={Popover}>
      <Transition.Child>
        <Popover>
          <Popover.Panel
            static
            className="fixed z-20 top-0 right-0 h-full w-128 bg-white border border-gray-200 shadow-[-2px_0_15px_rgba(0,0,0,0.3)] overflow-y-scroll focus:outline-none"
          >
            <div className="mt-6 p-4">
              <div className="flex flex-row justify-end items-start mb-4">
                <XMarkIcon
                  className="h-6 w-6 text-gray-800 cursor-pointer"
                  onClick={() => setSelectedProvider(null)}
                />
              </div>

              {isPending && (
                <>
                  <div className="w-full h-20 bg-gray-100 rounded-md"></div>
                </>
              )}

              {!isPending && provider && (
                <div className="flex flex-col gap-4">
                  {/* Title (device name) */}
                  <div>
                    <p className="text-gray-800 font-semibold">
                      {selectedProvider?.client_id}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Created on {provider?.created_time}
                    </p>
                  </div>
                  {/* Tab bar */}
                  <div></div>
                  <Tab.Group>
                    <Tab.List className="flex w-64 mx-auto space-x-1 rounded-xl bg-blue-900/10 p-1">
                      <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 focus:outline-none text-gray-400 hover:bg-white/[0.12] hover:text-indigo-400 ui-selected:bg-white ui-selected:text-indigo-600 ui-selected:shadow">
                        <div className="flex flex-col items-center gap-1">
                          <ChartBarIcon className="h-8 w-8" />
                          <p>Charts</p>
                        </div>
                      </Tab>
                      <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 focus:outline-none text-gray-400 hover:bg-white/[0.12] hover:text-indigo-400 ui-selected:bg-white ui-selected:text-blue-700 ui-selected:shadow">
                        <div className="flex flex-col items-center gap-1">
                          <DevicePhoneMobileIcon className="h-8 w-8" />
                          <p>Connections</p>
                        </div>
                      </Tab>
                    </Tab.List>
                    <Tab.Panels>
                      {/* Charts tab */}
                      <Tab.Panel>
                        <div className="flex flex-col gap-6 mt-2">
                          {/* Uptime graphic */}
                          <div className="">
                            <p className="text-sm text-gray-400 font-semibold mb-2">
                              Uptime (past 24 hours)
                            </p>
                            <div className="w-full h-8">
                              <UptimeWidget
                                data={
                                  selectedProvider?.connected_events_last_24h ||
                                  []
                                }
                              />
                            </div>
                          </div>
                          {/* Charts */}
                          <div className="">
                            <p className="text-sm text-gray-400 font-semibold mb-2">
                              Past 90 days
                            </p>
                            <div className="flex flex-col gap-2 mt-4">
                              {charts.map((chart) => (
                                <div
                                  key={`chart-${chart.key}`}
                                  className="relative bg-gray-100 w-full rounded-md h-40 pt-6"
                                >
                                  <div className="z-10 absolute top-2 left-2 text-sm font-semibold text-gray-400">
                                    {chart.name}
                                  </div>
                                  <BarChart
                                    name={chart.name}
                                    pre_unit={chart.pre_unit}
                                    unit={chart.unit}
                                    data={provider[chart.key]}
                                    tooltipStyle={"simple"}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Connections tab */}
                      <Tab.Panel>
                        {/* Connections table */}
                        <div className="w-full mt-2">
                          <p className="text-sm text-gray-400 font-semibold mb-2">
                            Connected devices
                          </p>
                          <table className="w-full mt-2">
                            <thead></thead>
                            <tbody className="divide-y divide-gray-200">
                              {provider.client_details?.length == 0 && (
                                <tr>
                                  <td className="text-center">
                                    No devices found
                                  </td>
                                </tr>
                              )}
                              {provider?.client_details.map((client) => (
                                <tr
                                  key={`connections-table-${client.client_id}`}
                                >
                                  <td className="py-2 px-1 text-gray-600 text-xs">
                                    {client.client_id}
                                  </td>
                                  <td>
                                    <ActivityWidget data={client} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </div>
              )}
            </div>
          </Popover.Panel>
        </Popover>
      </Transition.Child>
    </Transition>
  );
}
