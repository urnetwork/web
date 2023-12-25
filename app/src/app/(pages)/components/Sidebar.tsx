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
    name: "Your Devices",
    href: "/devices",
    icon: DevicePhoneMobileIcon,
  },
  {
    name: "Friends and Family Devices",
    href: "/ffdevices",
    icon: UsersIcon,
  },
  { name: "Provide", href: "/provide", icon: GlobeAltIcon },
  { name: "Account", href: "/account", icon: UserIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname().split("?")[0];
  const activeItem = navigation.find((item) => item.href == pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Modal popup menu for mobile */}
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50 lg:hidden"
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

                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6 pb-2 ring-1 ring-white/10">
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
                      <ul role="list" className="-mx-2 flex-1 space-y-1">
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
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6 pb-2">
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
          <nav className="flex flex-1 flex-col mt-6">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
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
              </li>
            </ul>
          </nav>
        </div>
      </section>

      {/* Collapsed mobile sidebar */}
      <section className="w-full top-0 z-40 flex items-center gap-x-4 bg-primary px-4 py-4 shadow-sm sm:px-6 lg:hidden">
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
