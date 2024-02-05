/**
 * Function to poll an endpoint every 2 seconds
 *
 * Todo(Awais): This component can probably be merged with Poll.tsx. Not doing
 * that now since it's only used in two places, but another polling use case
 * would warrant factoring out the common code.
 */

import {
  postDeviceConfirmShare,
  postDeviceRemoveAssociation,
  postDeviceShareStatus,
} from "@/app/_lib/api";
import Button from "@/app/_lib/components/Button";
import PulseLoader from "@/app/_lib/components/LoadingSpinner";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const POLLING_INTERVAL = 2000; // milliseconds

type PollShareProps = {
  code: string;
  setIsModalOpen: (value: boolean) => void;
};

export default function PollShare({ code, setIsModalOpen }: PollShareProps) {
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState<boolean>(true);

  const {
    isLoading,
    data: deviceShareStatus,
    isError,
  } = useQuery({
    queryKey: ["device", "share", "status", code],
    queryFn: async () => postDeviceShareStatus({ share_code: code }),
    enabled: isPolling,
    refetchInterval: (query) => {
      console.log("Refetch interval function called");
      console.log(query);
      console.log(query.state.data);

      if (
        (!query.state.data || !query.state.data?.associated_network_name) &&
        isPolling
      ) {
        return POLLING_INTERVAL;
      }

      // Success! We're no longer pending
      setIsPolling(false);
      return false;
    },
  });

  const { data: confirmShareResult, mutateAsync: mutateConfirmShareAsync } =
    useMutation({
      mutationKey: ["device", "confirm", "share", code],
      mutationFn: async ({
        code,
        associated_network_name,
      }: {
        code: string;
        associated_network_name: string | null;
      }) =>
        await postDeviceConfirmShare({
          share_code: code,
          associated_network_name,
        }),
      onSettled: (data) =>
        queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
    });

  const { mutateAsync: mutateRemoveAssociationAsync } = useMutation({
    mutationKey: ["device", "remove", "association"],
    mutationFn: async (code: string) =>
      await postDeviceRemoveAssociation({ code }),
    onSettled: (data) =>
      queryClient.invalidateQueries({ queryKey: ["device", "associations"] }),
  });

  const handleConfirmShare = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!deviceShareStatus?.associated_network_name) {
      alert("Sorry, something went wrong with the confirmation.");
      return;
    }
    // Todo(Awais): This mutation seems to be triggering a re-render
    // which is why the loading spinner on the button is not working.
    await mutateConfirmShareAsync({
      code,
      associated_network_name: deviceShareStatus?.associated_network_name,
    });
  };

  const handleCancelShare = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    await mutateRemoveAssociationAsync(code);
    setIsModalOpen(false);
  };

  const ErrorState = () => (
    <div className="w-full flex flex-col mt-8 items-center text-center px-8">
      <p>Sorry, something went wrong</p>
    </div>
  );

  const PendingState = () => (
    <div className="w-full flex flex-col mt-8 items-center">
      <p className="text-sm w-full text-left">
        Waiting for code to be shared...
      </p>
      <PulseLoader className="my-4" />
    </div>
  );

  const AwaitConfirmationState = () => (
    <div className="w-full flex flex-col mt-4 items-center text-center px-8">
      <Button className="btn-primary button" onClick={handleConfirmShare}>
        <div className="flex flex-col items-center gap-1">
          <p>Confirm</p>
          <p className="text-xs text-gray-300">
            Share with {deviceShareStatus?.associated_network_name}
          </p>
        </div>
      </Button>
      <button
        className="mt-4 text-sm cursor-pointer underline"
        onClick={handleCancelShare}
      >
        Cancel
      </button>
    </div>
  );

  const ConfirmedState = () => {
    return (
      <div className="w-full flex flex-col mt-4 items-center text-center px-8">
        <p>Success!</p>
        <CheckBadgeIcon className=" text-green-600 w-12 h-12" />
        <p className="text-sm text-gray-600">
          Your device is now shared with{" "}
          {confirmShareResult?.associated_network_name}
        </p>
      </div>
    );
  };

  return (
    <>
      {isError && <ErrorState />}
      {(isLoading || isPolling) && <PendingState />}
      {deviceShareStatus &&
        deviceShareStatus.associated_network_name &&
        !confirmShareResult && <AwaitConfirmationState />}
      {confirmShareResult && <ConfirmedState />}
    </>
  );
}
