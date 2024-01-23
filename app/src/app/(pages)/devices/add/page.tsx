"use client";

import { postDeviceAdd, postDeviceShareStatus } from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import Button from "@/app/_lib/components/Button";
import PulseLoader from "@/app/_lib/components/LoadingSpinner";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function Page() {
  // If there were moore fields, I would use a library like Formik for error handling
  const queryParams = useSearchParams();
  const [code, setCode] = useState<string>(queryParams.get("code") || "");
  const [isCodeTouched, setIsCodeTouched] = useState<boolean>(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState<string>();
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [codeType, setCodeType] = useState<string>();

  const validateCode = (code: string | undefined) => {
    if (!code || code == "" || code == undefined) {
      setCodeErrorMessage("Please enter a code");
    } else {
      setCodeErrorMessage(undefined);
    }
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
    validateCode(event.target.value);
  };

  const handleFormSubmit = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    await new Promise((r) => setTimeout(r, 1000));
    const result = await postDeviceAdd({ code: code });
    setCodeType(result.code_type);
    setIsPolling(true);
  };

  const hasError = codeErrorMessage !== undefined;
  const shouldShowCodeError = codeErrorMessage !== undefined && isCodeTouched;

  useEffect(() => {
    validateCode(code);
  }, []);

  const {
    isLoading,
    data: deviceShareStatus,
    isError,
  } = useQuery({
    queryKey: ["device", "add"],
    queryFn: async () => postDeviceShareStatus({ share_code: code }),
    enabled: isPolling != false,
    refetchInterval: (query) => {
      console.log(
        "Refetch interval; what's pending",
        query.state.data?.pending
      );
      console.log("Refetch interval, are we polling?", isPolling);
      if ((!query.state.data || query.state.data?.pending) && isPolling) {
        return 2000;
      }
      console.log("Setting polling to false");
      setIsPolling(false);
      return false;
    },
  });

  const pollForDeviceStatus = isLoading || isPolling;
  console.log("isLoading", isLoading);
  console.log("isPolling?", isPolling);
  console.log("poll for status?", pollForDeviceStatus);

  return (
    <>
      <div className="md:mt-10 p-4 max-w-lg">
        <Breadcrumbs
          items={[
            {
              title: "Devices",
              url: "/devices",
            },
          ]}
        />
        <h1>Add a new device</h1>

        {/* {!isRefetching && <p>Device added!</p>} */}
        {isError && (
          <div className="mt-6 w-full">
            <p>Sorry, something went wrong</p>
          </div>
        )}

        {pollForDeviceStatus && (
          <div className="w-full flex flex-col mt-8 items-center text-center px-8">
            <p>{`Waiting for ${codeType} confirmation`}</p>
            <PulseLoader className="my-12" />
            <p className="text-sm text-gray-500">
              You may leave this page. The device will show as pending in your
              devices list until it is confirmed.
            </p>
          </div>
        )}

        {deviceShareStatus && !deviceShareStatus.pending && (
          <div className="w-full flex flex-col mt-8 items-center text-center px-8">
            <p className="text-lg">Success!</p>
            <p className="text-lg">New device added</p>
            <CheckBadgeIcon className=" text-green-600 w-12 h-12 m-4" />
            <p className="text-sm text-gray-500">
              Your new device is viewable in the{" "}
              <a href="/devices">device list</a>
            </p>
          </div>
        )}

        {!pollForDeviceStatus && !deviceShareStatus && (
          <form onSubmit={() => {}}>
            <div className="mt-6 flex flex-col gap-6 items-start">
              <div className="w-full flex flex-col gap-2">
                <label
                  htmlFor="code"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Please enter your share or adopt code
                </label>
                <input
                  type="text"
                  name="code"
                  id="code"
                  value={code}
                  onChange={handleOnChange}
                  onBlur={() => setIsCodeTouched(true)}
                  placeholder="e.g. 249384883cf27ff2d844f379610da79e"
                  className={`w-full block rounded-md bg-transparent py-2 px-2 text-gray-900 placeholder:text-gray-400 ring-1 ring-gray-400 sm:text-sm sm:leading-6 ${
                    shouldShowCodeError ? "ring-red-500" : ""
                  }`}
                ></input>
                {shouldShowCodeError && (
                  <div className="text-red-600 text-xs">
                    <p>{codeErrorMessage}</p>
                  </div>
                )}
              </div>
              <Button
                className="button btn-primary self-end"
                disabled={hasError}
                onClick={handleFormSubmit}
              >
                Add device
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
