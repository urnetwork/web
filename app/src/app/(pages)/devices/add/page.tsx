"use client";

import { postDeviceAdd, postDeviceShareStatus } from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import Button from "@/app/_lib/components/Button";
import PulseLoader from "@/app/_lib/components/LoadingSpinner";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Poll from "./components/Poll";

export default function Page() {
  // If there were moore fields, I would use a library like Formik for error handling
  const queryParams = useSearchParams();
  const [code, setCode] = useState<string>(queryParams.get("code") || "");
  const [isCodeTouched, setIsCodeTouched] = useState<boolean>(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState<string>();

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

  const {
    data: deviceAddResult,
    isError,
    mutateAsync,
  } = useMutation({
    mutationFn: async (code: string) => await postDeviceAdd({ code: code }),
  });

  const handleAddDevice = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    const result = await mutateAsync(code);
    if (result.error) {
      setCodeErrorMessage(result.error.message);
    }
  };

  const hasError = codeErrorMessage !== undefined;
  const shouldShowCodeError = codeErrorMessage !== undefined && isCodeTouched;

  useEffect(() => {
    validateCode(code);
  }, []);

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

        {isError && (
          <div>
            <p>Sorry, something went wrong...</p>
          </div>
        )}

        {deviceAddResult && !deviceAddResult.error && (
          <Poll result={deviceAddResult} />
        )}

        {(!deviceAddResult || deviceAddResult.error) && (
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
                onClick={handleAddDevice}
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
