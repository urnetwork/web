"use client";

import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import { ChevronLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";

export default function Page() {
  // If there were more fields, I would use a library like Formik for error handling
  const [code, setCode] = useState<string>("");
  const [isCodeTouched, setIsCodeTouched] = useState(false);
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

  const handleFormSubmit = () => {
    // Send post request to backend
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
            <button
              className="button btn-primary self-end"
              disabled={hasError}
              onClick={() => {}}
            >
              Add device
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
