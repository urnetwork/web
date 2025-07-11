/**
 * Function to poll an endpoint every 2 seconds
 *
 * Todo(Awais): This can probably be factored out into a separate, reusable polling
 * component.
 */

import { postDeviceAdoptStatus, postDeviceShareStatus } from "@/app/_lib/api";
import PulseLoader from "@/app/_lib/components/LoadingSpinner";
import { DeviceAddResult } from "@/app/_lib/types";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const POLLING_INTERVAL = 2000; // milliseconds

type PollProps = {
  result: DeviceAddResult;
};

export default function Poll({ result }: PollProps) {
  const [isPolling, setIsPolling] = useState<boolean>(true);

  const codeType = result.code_type;
  const code = result.code;

  const pollingFunction = () => {
    if (codeType == "share") return postDeviceShareStatus;
    else if (codeType == "adopt") return postDeviceAdoptStatus;
    else throw new Error(`Uknown code_type: ${codeType}`);
  };

  const {
    isLoading,
    data: deviceShareStatus,
    isError,
  } = useQuery({
    queryKey: ["device", codeType, "status", code],
    queryFn: async () => pollingFunction()({ share_code: code }),
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
    <div className="w-full flex flex-col mt-8 items-center text-center px-8">
      <p>{`Waiting for ${codeType} confirmation`}</p>
      <PulseLoader className="my-12" />
      <p className="text-sm text-gray-500">
        You may leave this page. The device will show as pending in your devices
        list until it is confirmed.
      </p>
    </div>
  );

  const SuccessState = () => (
    <div className="w-full flex flex-col mt-8 items-center text-center px-8">
      <p className="text-lg">Success!</p>
      <p className="text-lg">New device added</p>
      <CheckBadgeIcon className=" text-green-600 w-12 h-12 m-4" />
      <p className="text-sm text-gray-500">
        Your new device is viewable in the <a href="/devices">devices list</a>
      </p>
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
