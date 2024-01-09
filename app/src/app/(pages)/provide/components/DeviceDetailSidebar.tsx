import { postStatsProviderLast90 } from "@/app/_lib/api";
import { Provider24h } from "@/app/_lib/types";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";

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
            className="fixed z-20 top-0 right-0 h-full w-96 bg-white border border-gray-200 shadow-[-2px_0_15px_rgba(0,0,0,0.3)]"
          >
            <div className="mt-24 p-4">
              <div className="flex flex-row justify-end items-start">
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

              {!isPending && (
                <div>
                  <p className="text-gray-800 font-semibold">
                    {selectedProvider?.client_id}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Created on {provider?.created_time}
                  </p>
                </div>
              )}
            </div>
          </Popover.Panel>
        </Popover>
      </Transition.Child>
    </Transition>
  );
}
