"use client";

import { getSubscriptionBalance } from "@/app/_lib/api";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import Link from "next/link";
import { prettyPrintByteCount } from "@/app/_lib/utils";

export default function Page() {
  const { isPending, data: result } = useQuery({
    queryKey: ["subscription", "balance"],
    queryFn: async () => await getSubscriptionBalance(),
  });

  const currentSubscription = result?.current_subscription;
  const wallet = result?.wallet_info;

  return (
    <>
      <div className="md:mt-12 p-4 max-w-3xl">
        <div className="mb-8">
          <h1>Account</h1>
        </div>

        {isPending && <Loading />}

        {!isPending && (
          <div className="flex flex-col gap-y-4">
            <div className="card flex flex-col gap-2">
              <div className="flex flex-row">
                <h2>Subscriptions</h2>
                <div className="grow" />
                <Link href="/account/add-balance">
                  <button className="button btn-primary">Add balance</button>
                </Link>
              </div>
              <p>
                <span className="font-semibold">Transfer balance:</span>{" "}
                {prettyPrintByteCount(result?.balance_byte_count!)}
              </p>
              {!currentSubscription && <p>No current subscriptions found</p>}
              {currentSubscription && <p>{currentSubscription.plan}</p>}
            </div>

            <div className="card flex flex-col gap-2">
              <h2>Wallet</h2>
              {!wallet && <p>No wallet found</p>}
              {wallet && (
                <>
                  <p>
                    <span className="font-semibold">Balance:</span>{" "}
                    {wallet.balance_usdc_nano_cents / 1_000_000_000} USDC
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
