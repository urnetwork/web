import { Dialog } from "@headlessui/react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import Button from "./Button";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onConfirm: any;
  children: React.ReactNode;
};

export function ConfirmDeleteModal({
  isOpen,
  setIsOpen,
  onConfirm,
  children,
}: ConfirmDeleteModalProps) {
  const handleCancelClicked = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setIsOpen(false);
  };

  const handleConfirmClicked = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    await onConfirm();
    await new Promise((resolve) =>
      setTimeout(() => resolve(setIsOpen(false)), 500)
    );
  };

  return (
    <Dialog
      as="div"
      className="relative z-10"
      open={isOpen}
      onClose={() => setIsOpen(false)}
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed md:ml-76 inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed md:ml-76 inset-0 flex items-start justify-center p-4">
        <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-center sm:p-0">
          <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all mx-4 mt-12 md:mt-40 mb-auto w-96">
            <div className="w-full bg-white px-8 py-8">
              <div className="w-full flex justify-end">
                <XMarkIcon
                  className="h-8 w-8 cursor-pointer text-gray-600"
                  title="Close"
                  onClick={() => setIsOpen(false)}
                />
              </div>
              {children}
              <div className="mt-4 flex flex-row gap-4 mx-auto justify-center">
                <Button
                  className="button border border-gray-400 text-gray-600"
                  onClick={handleCancelClicked}
                >
                  Cancel
                </Button>
                <Button
                  className="button bg-red-400 text-white"
                  onClick={handleConfirmClicked}
                >
                  Remove
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
        <div className="invisible h-24"></div>
      </div>
    </Dialog>
  );
}
