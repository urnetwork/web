import { Provider } from "@/app/_lib/types";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useState } from "react";

type DeviceDetailSidebarProps = {
  selectedProvider: Provider | undefined;
  setSelectedProvider: CallableFunction;
};

export default function DeviceDetailSidebar({
  selectedProvider,
  setSelectedProvider,
}: DeviceDetailSidebarProps) {
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
              <div className="flex flex-row justify-between items-start">
                <div>
                  <p className="text-gray-800 font-semibold">
                    {selectedProvider?.client_id}
                  </p>
                  <p className="text-gray-600 text-sm">Created on ...</p>
                </div>

                <XMarkIcon
                  className="h-6 w-6 text-gray-800 cursor-pointer"
                  onClick={() => setSelectedProvider(null)}
                />
              </div>
            </div>
          </Popover.Panel>
        </Popover>
      </Transition.Child>
    </Transition>
  );
}
