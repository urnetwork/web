"use client";

import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { redirect, usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import {
  getJwt,
  getLoginUrl,
  getSubscriptionBalance,
  removeJwt,
} from "@/app/_lib/api";
import { classNames } from "@/app/_lib/utils";

const navigation = [
  {
    name: "Devices",
    href: "/devices",
    icon: "/devices_icon.svg",
    bg_color: "bg-[#2B3A82] hover:bg-[#2E3E9F]",
  },
  {
    name: "Provide",
    href: "/provide",
    icon: "/provide_icon.svg",
    bg_color: "bg-[#1E644E] hover:bg-[#24775B]",
  },
  {
    name: "Account",
    href: "/account",
    icon: "/account_icon.svg",
    bg_color: "bg-[#5A4E53] hover:bg-[#73636A]",
  },
];

// Copied from web/bringyour.com/client.js
// see https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
function parseJwt(jwt: string) {
  var base64Url = jwt.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

function SidebarContent() {
  const [networkName, setNetworkName] = useState<string | null>(null);

  const { isPending, data: subscriptionBalanceResult } = useQuery({
    queryKey: ["subscription", "balance"],
    queryFn: async () => await getSubscriptionBalance(),
  });

  const wallet = subscriptionBalanceResult?.wallet_info;

  useEffect(() => {
    const jwt = getJwt();
    const networkAddon = jwt ? parseJwt(jwt)?.network_name : null;
    setNetworkName(networkAddon ? `${networkAddon}.bringyour.network` : null);
  }, []);

  const signOut = () => {
    removeJwt();
    redirect(getLoginUrl());
  };

  return (
    <div className="w-76 flex flex-col gap-y-2 overflow-y-auto bg-primary text-gray-200">
      <div className="p-4">
        <img
          className="w-64 pointer-events-none select-none"
          src="/bringyour_logo_full.png"
          alt="BringYour logo"
        />
      </div>

      <div className="p-4 text-sm tracking-widest font-extralight break-all">
        {networkName && <p>{networkName}</p>}
        {
          !networkName && (
            <div className="h-[1.4em]" />
          ) /* Stops subsequent content from jumping up and down */
        }
      </div>

      <div className="p-4">
        {isPending && (
          <div className="w-full bg-slate-700 rounded-md h-[4.5em]" />
        )}

        {!isPending && (
          <>
            <p className="text-5xl tracking-wider font-light">
              {subscriptionBalanceResult?.balance_byte_count ||
                0 / 1_000_000_000}{" "}
              GiB
            </p>
            <Link href="/account/add-balance">
              <p className="mt-1 text-sm tracking-widest font-extralight">
                add balance
              </p>
            </Link>
          </>
        )}
      </div>

      <div className="p-4">
        {isPending && (
          <div className="w-full bg-slate-700 rounded-md h-[4.5em]" />
        )}

        {!isPending && (
          <>
            <p className="text-5xl tracking-wider font-light">
              {(
                wallet && wallet.balance_usdc_nano_cents / 1_000_000_000
              )?.toPrecision(3) || "-"}{" "}
              USDC
            </p>
            {!wallet && (
              <p className="mt-1 text-sm tracking-widest font-extralight">
                No wallet found
              </p>
            )}
            {wallet && (
              <p className="mt-1 text-sm tracking-widest font-extralight">
                earn by providing
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <p className="p-4 pb-2 tracking-widest font-light">
          Manage your network
        </p>
        <nav>
          <ul role="list" className="flex flex-1 flex-col">
            {navigation.map((item) => (
              <li key={`nav-menu-${item.href}`}>
                <Link
                  href={item.href}
                  className="font-extralight tracking-wider hover:no-underline hover:font-normal"
                >
                  <div
                    className={`${item.bg_color} flex flex-row items-center gap-4 p-2`}
                  >
                    <img src={item.icon} className="ml-2 h-16 w-14" />
                    <p>{item.name}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div id="spacer" className="grow" />

      <div className="p-4 flex flex-col gap-4 font-extralight text-gray-300 tracking-wider">
        <Link href="" onClick={() => signOut()}>
          Sign out
        </Link>
        <p>
          <Link href="https://bringyour.com/terms" target="_blank">
            Terms
          </Link>
          &nbsp;|&nbsp;
          <Link href="https://bringyour.com/privacy" target="_blank">
            Privacy
          </Link>
          &nbsp;|&nbsp;
          <Link href="https://bringyour.com/vdp" target="_blank">
            VDP
          </Link>
        </p>
        <p>Copyright 2024 BringYour, Inc.</p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname().split("?")[0];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Modal popup menu for mobile */}
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-10 lg:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex justify-center pt-5">
                      <button
                        type="button"
                        className="-m-2.5 p-2.5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  <SidebarContent />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>
      </div>

      {/* Desktop sidebar */}
      <section id="sidebar" className="h-full hidden md:fixed z-50 md:flex">
        <SidebarContent />
      </section>

      {/* Collapsed mobile sidebar */}
      <section className="w-full top-0 z-40 flex items-center gap-x-4 bg-primary px-4 py-4 shadow-sm sm:px-6 md:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex-1 text-sm font-semibold leading-6 text-white">
          BringYour
        </div>
      </section>
    </>
  );
}
