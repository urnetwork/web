import { postStatsProviderLast90 } from "@/app/_lib/api";
import { Provider24h } from "@/app/_lib/types";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { BarChart } from "./Chart";

type ChartItem = {
  name: string;
  key: string;
  pre_unit?: string;
  unit?: string;
};

const charts: Array<ChartItem> = [
  {
    name: "Data transferred",
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
      await postStatsProviderLast90({ client_id: selectedProvider?.client_id }),
  });

  const isOpen = selectedProvider != null;

  return (
    <Transition show={isOpen} as={Popover}>
      <Transition.Child>
        <Popover>
          <Popover.Panel
            static
            className="fixed z-20 top-0 right-0 h-full w-96 bg-white border border-gray-200 shadow-[-2px_0_15px_rgba(0,0,0,0.3)] overflow-y-auto"
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
                <div className="flex flex-col gap-6">
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

                  {/* Uptime graphic */}
                  <div className="">
                    <p className="text-sm text-gray-400 font-semibold mb-2">
                      Uptime (past 24 hours)
                    </p>
                    <div className="w-full h-8 bg-primary" />
                  </div>

                  {/* Charts */}
                  <div className="">
                    <p className="text-sm text-gray-400 font-semibold mb-2">
                      Past 90 days
                    </p>
                    <div className="flex flex-col gap-2 mt-4">
                      {charts.map((chart) => (
                        <>
                          <div className="relative bg-gray-100 w-full rounded-md h-40 pt-6">
                            <div className="z-10 absolute top-2 left-2 text-sm font-semibold text-gray-400">
                              {chart.name}
                            </div>
                            <BarChart
                              name={chart.name}
                              unit={chart.unit}
                              data={provider[chart.key]}
                            />
                          </div>
                        </>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Popover.Panel>
        </Popover>
      </Transition.Child>
    </Transition>
  );
}
