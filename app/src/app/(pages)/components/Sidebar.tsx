import Link from "next/link";
import {
  Bars3Icon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UserIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

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

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
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
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
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

                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-4 pb-2 ring-1 ring-white/10">
                    <div className="flex h-16 shrink-0 items-center gap-x-4">
                      <img
                        className="h-8 w-auto"
                        src="/bringyour-logo.webp"
                        alt="Bringyour logo"
                      />
                      <div className="text-sm font-semibold leading-6 text-white">
                        BringYour
                      </div>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="-ml-2 flex-1 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={classNames(
                                pathname == item.href
                                  ? "bg-primary-semidark text-white shadow-inner"
                                  : "text-indigo-100 hover:text-white hover:bg-primary-semidark hover:shadow-inner",
                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                              )}
                            >
                              <item.icon
                                className={classNames(
                                  pathname == item.href
                                    ? "text-white"
                                    : "text-indigo-100 group-hover:text-white",
                                  "h-6 w-6 shrink-0"
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>
      </div>

      {/* Desktop sidebar */}
      <section id="sidebar" className="h-full hidden lg:fixed z-50 lg:flex">
        <div className="w-76 flex flex-col gap-y-4 overflow-y-auto bg-primary text-gray-200">
          <div className="p-4">
            <img
              className="w-64"
              src="/bringyour_logo_full.png"
              alt="BringYour logo"
            />
          </div>

          <div className="p-4 text-sm tracking-widest font-extralight break-all">
            <p>awaishussain.bringyour.network</p>
          </div>

          <div className="p-4">
            <p className="text-5xl tracking-wider font-light">30 GiB</p>
            <Link href="#">
              <p className="mt-1 text-sm tracking-widest font-extralight">
                add balance
              </p>
            </Link>
          </div>

          <div className="p-4">
            <p className="text-5xl tracking-wider font-light">0 USDC</p>
            <p className="mt-1 text-sm tracking-widest font-extralight">
              earn by providing
            </p>
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
            <Link href="">Sign out</Link>
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

          {/* <div className="-ml-1 flex flex-row h-16 shrink-0 items-center gap-x-4">
            <img
              className="h-8 w-auto"
              src="/bringyour-logo.webp"
              alt="Bringyour logo"
            />
            <div className="text-sm font-semibold leading-6 text-white">
              BringYour
            </div>
          </div>
          <nav className="flex flex-1 flex-col mt-6">
            <ul role="list" className="-mx-2 flex flex-1 flex-col space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <div>
                    <Link
                      href={item.href}
                      className={classNames(
                        pathname == item.href
                          ? "bg-primary-semidark text-white shadow-inner"
                          : "text-indigo-100 hover:text-white hover:bg-primary-semidark hover:shadow-inner",
                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                      )}
                    >
                      <item.icon
                        className={classNames(
                          pathname == item.href
                            ? "text-white"
                            : "text-indigo-100 group-hover:text-white",
                          "h-6 w-6 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </nav> */}
        </div>
      </section>

      {/* Narrow desktop sidebar */}
      {/* <section
        id="sidebar"
        className="h-full hidden md:fixed lg:hidden z-99 md:flex"
      >
        <div className="flex flex-col items-center gap-y-5 overflow-y-auto bg-primary px-2 pb-2">
          <div className="flex h-16 shrink-0 items-center">
            <img
              className="h-8 w-auto"
              src="/bringyour-logo.webp"
              alt="Bringyour logo"
            />
          </div>
          <nav className="flex flex-1 flex-col mt-6">
            <ul role="list" className="flex flex-1 flex-col space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      pathname == item.href
                        ? "bg-primary-semidark text-white shadow-inner"
                        : "text-indigo-100 hover:text-white hover:bg-primary-semidark hover:shadow-inner",
                      "rounded-md p-2 flex items-center justify-center"
                    )}
                  >
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section> */}

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
        <img
          className="h-8 w-auto"
          src="/bringyour-logo.webp"
          alt="Bringyour logo"
        />
        <div className="flex-1 text-sm font-semibold leading-6 text-white">
          BringYour
        </div>
      </section>
    </>
  );
}
