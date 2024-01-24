/**
 * Function to poll an endpoint every
 */

import { postDeviceShareStatus } from "@/app/_lib/api";
import PulseLoader from "@/app/_lib/components/LoadingSpinner";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const POLLING_INTERVAL = 2000; // milliseconds

type PollShareProps = {
  code: string;
  setIsModalOpen: (value: boolean) => void;
};

export default function PollShare({ code, setIsModalOpen }: PollShareProps) {
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
      if ((!query.state.data || query.state.data?.pending) && isPolling) {
        return POLLING_INTERVAL;
      }

      // Success! We're no longer pending
      setIsPolling(false);
      return false;
    },
  });

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

  const SuccessState = () => (
    <div className="w-full flex flex-col mt-4 items-center text-center px-8">
      <button className="btn-primary button flex flex-col items-center gap-1">
        <p>Confirm</p>
        <p className="text-xs text-gray-300">
          Share with {deviceShareStatus?.associated_network_name}
        </p>
      </button>
      <button
        className="mt-4 text-sm cursor-pointer underline"
        onClick={() => setIsModalOpen(false)}
      >
        Cancel
      </button>
    </div>
  );

  return (
    <>
      {isError && <ErrorState />}
      {(isLoading || isPolling) && <PendingState />}
      {deviceShareStatus && !deviceShareStatus.pending && <SuccessState />}
    </>
  );
}
