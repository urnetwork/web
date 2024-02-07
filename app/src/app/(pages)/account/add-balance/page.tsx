"use client";

import {
  postSubscriptionCheckBalanceCode,
  postSubscriptionRedeemBalanceCode,
} from "@/app/_lib/api";
import { Breadcrumbs } from "@/app/_lib/components/Breadcrumbs";
import Button from "@/app/_lib/components/Button";
import { prettyPrintByteCount } from "@/app/_lib/utils";
import {
  CheckBadgeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const queryClient = useQueryClient();
  const queryParams = useSearchParams();
  const paramCode = queryParams.get("redeem-balance-code") || "";

  const [code, setCode] = useState<string>(paramCode);
  const [isCodeTouched, setIsCodeTouched] = useState<boolean>(
    Boolean(paramCode)
  );
  const [isCodeValid, setIsCodeValid] = useState<boolean>(Boolean(paramCode));
  const [codeErrorMessage, setCodeErrorMessage] = useState<string>();

  const validateCodeAsync = async (code: string) => {
    try {
      const result = await postSubscriptionCheckBalanceCode({
        secret: code,
      });

      if (result.balance) {
        setIsCodeValid(true);
        setCodeErrorMessage(undefined);
      } else {
        setIsCodeValid(false);
        setCodeErrorMessage(
          result.error?.message || "This code is not valid, or has expired"
        );
      }
      return result;
    } catch (error) {
      setIsCodeValid(false);
      setCodeErrorMessage("Sorry, we're unable to check if the code is valid");
    }
    return null;
  };

  const handleOnChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const code = event.target.value;
    setCode(code);

    if (!code || code == "" || code == undefined) {
      setIsCodeValid(false);
      setCodeErrorMessage("Please enter a code");
    } else {
      setIsCodeValid(true);
      setCodeErrorMessage(undefined);
    }
  };

  const shouldShowError = codeErrorMessage && isCodeTouched;

  const { data: redeemBalanceResult, mutateAsync: mutateRedeemBalanceAsync } =
    useMutation({
      mutationKey: ["subscription", "redeem", "code", code],
      mutationFn: (code: string) =>
        postSubscriptionRedeemBalanceCode({ secret: code }),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["subscription", "balance"],
        });
      },
    });

  const handleSubmitCode = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!code) {
      return;
    }
    const result = await validateCodeAsync(code);

    if (!result || result.error || !result.balance) {
      return;
    }
    await mutateRedeemBalanceAsync(code);
  };

  return (
    <div className="md:mt-10 p-4 max-w-lg">
      <Breadcrumbs
        items={[
          {
            title: "Account",
            url: "/account",
          },
        ]}
      />
      <h1>Add balance</h1>

      {true && (
        <form onSubmit={() => {}}>
          <div className="mt-6 flex flex-col gap-6 items-start">
            <div className="w-full flex flex-col gap-2">
              <label
                htmlFor="code"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Please enter your balance code
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  type="text"
                  name="code"
                  id="code"
                  value={code}
                  onChange={handleOnChange}
                  onFocus={handleOnChange}
                  onBlur={() => setIsCodeTouched(true)}
                  placeholder="e.g. 249384883cf27ff2d844f379610da79e"
                  className={`w-full block rounded-md bg-transparent py-2 px-2 pr-12 text-gray-900 placeholder:text-gray-400 ring-1 ring-gray-400 sm:text-sm sm:leading-6 ${
                    shouldShowError ? "ring-red-500" : ""
                  }`}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {shouldShowError && (
                    <ExclamationCircleIcon
                      className="h-6 w-6 text-red-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
              {shouldShowError && (
                <div className="text-red-600 text-xs">
                  <p>{codeErrorMessage}</p>
                </div>
              )}
            </div>
            <Button
              className="button btn-primary self-end"
              disabled={!isCodeValid}
              onClick={handleSubmitCode}
            >
              Redeem code
            </Button>
          </div>
          {redeemBalanceResult && redeemBalanceResult.transfer_balance && (
            <div className="w-full flex flex-col mt-8 items-center text-center px-8">
              <p className="text-lg">Success!</p>
              <CheckBadgeIcon className=" text-green-600 w-12 h-12 m-4" />
              <p className="text-sm text-gray-500">
                {prettyPrintByteCount(
                  redeemBalanceResult.transfer_balance?.balance_byte_count!
                )}{" "}
                was added to your balance
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
