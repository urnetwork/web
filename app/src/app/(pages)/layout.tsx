"use client";

import {
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("?")[0];

  return (
    <>
      <section id="sidebar" className="h-full fixed z-50 flex bg-teal-800  ">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6 pb-2">
          <div className="flex h-16 shrink-0 items-center">
            <img
              className="h-8 w-auto"
              src="/bringyour-logo.webp"
              alt="Bringyour logo"
            />
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
      <main className="py-10 pl-72">{children}</main>
    </>
  );
}
