import {
  getDeviceShareCodeQR,
  postDeviceCreateShareCode,
} from "@/app/_lib/api";
import { Client } from "@/app/_lib/types";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

type ShareDeviceDialogProps = {
  device: Client;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

export default function ShareDeviceDialog({
  device,
  isOpen,
  setIsOpen,
}: ShareDeviceDialogProps) {
  const {
    data: shareCodeResult,
    isPending,
    mutate: mutateDeviceCreateShareCode,
  } = useMutation({
    mutationKey: ["device", "create", "share", "code", device?.client_id],
    mutationFn: async () => {
      return await postDeviceCreateShareCode({
        client_id: device.client_id,
        device_name: device.client_id, // Todo(awais): There must be a better device name?
      });
    },
  });

  const {
    data: qrCodeURL,
    isPending: isQrImagePending,
    status,
  } = useQuery({
    queryKey: ["share", "code", "qr", shareCodeResult?.share_code],
    queryFn: async () =>
      await getDeviceShareCodeQR(shareCodeResult?.share_code || ""),
    enabled: !!shareCodeResult,
  });

  useEffect(() => {
    mutateDeviceCreateShareCode();
  }, []);

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed md:ml-76 inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed md:ml-76 inset-0 flex items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="w-96 rounded bg-white p-4">
          <div className="w-full flex justify-end">
            <XMarkIcon
              className="h-8 w-8 cursor-pointer text-gray-600"
              title="Close"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div className="p-4">
            <Dialog.Title className="mb-2">
              Share device {device.client_id}
            </Dialog.Title>
            {isPending && (
              <div className="w-full h-72 bg-gray-100 rounded-md" />
            )}

            {!isPending && shareCodeResult && (
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
                    {shareCodeResult.share_code}
                  </p>
                </div>
                <div>
                  <p className="text-sm">Waiting for code to be shared...</p>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
