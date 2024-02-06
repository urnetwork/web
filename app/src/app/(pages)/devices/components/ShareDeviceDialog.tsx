import {
  getDeviceShareCodeQR,
  postDeviceCreateShareCode,
} from "@/app/_lib/api";
import { Client, DeviceCreateShareCodeResult } from "@/app/_lib/types";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import PollShare from "./PollShare";

type ShareDeviceDialogProps = {
  clientId: string;
  shareCodeResult: DeviceCreateShareCodeResult;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

export default function ShareDeviceDialog({
  clientId,
  shareCodeResult,
  isOpen,
  setIsOpen,
}: ShareDeviceDialogProps) {
  const { data: qrCodeURL, isPending: isQrImagePending } = useQuery({
    queryKey: ["share", "code", "qr", shareCodeResult?.share_code],
    queryFn: async () => {
      return await getDeviceShareCodeQR(shareCodeResult?.share_code || "");
    },
  });

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed md:ml-76 inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed md:ml-76 inset-0 flex items-start justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="w-112 mt-12 md:mt-40 rounded-lg bg-white p-4">
          <div className="w-full flex justify-end">
            <XMarkIcon
              className="h-8 w-8 cursor-pointer text-gray-600"
              title="Close"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div className="p-4">
            <Dialog.Title className="mb-2">
              Share device {clientId}
            </Dialog.Title>

            {shareCodeResult && (
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  Send this code to the network owner you want to share your
                  device with
                </p>

                <div className="w-36 h-36 bg-gray-100 rounded-md mx-auto">
                  {!isQrImagePending && qrCodeURL && (
                    <img src={qrCodeURL} alt="share code qr" />
                  )}
                </div>
                <div className="text-sm text-center border border-gray-400 rounded-md p-2">
                  <p className="text-clip whitespace-pre-wrap">
                    https://app.bringyour.com/devices/add?code=
                    {shareCodeResult.share_code.replaceAll(" ", "+")}
                  </p>
                </div>
                <div>
                  {/* <p className="text-sm">Waiting for code to be shared...</p> */}
                  <PollShare
                    code={shareCodeResult.share_code}
                    setIsModalOpen={setIsOpen}
                  />
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
