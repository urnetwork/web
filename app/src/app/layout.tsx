"use client";

import "./globals.css";
import {
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";

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

  if (pathname == "/") {
    redirect(navigation[0].href);
  }

  // Receive the JWT from bringyour.com
  useEffect(() => {
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.origin == "https://bringyour.com") {
        const jwtToken = JSON.parse(event.data);
        if (jwtToken.byJwt) {
          localStorage.setItem("byJwt", jwtToken.byJwt);
        } else {
          localStorage.removeItem("byJwt");
        }
      }
    });
  }, []);

  return (
    <html lang="en" className="h-full text-gray-900">
      <body className="h-full bg-white">
        <section id="sidebar" className="h-full fixed z-50 flex bg-teal-800  ">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-indigo-600 px-6 pb-2">
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
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          className={classNames(
                            pathname == item.href
                              ? "bg-indigo-700 text-white"
                              : "text-indigo-200 hover:text-white hover:bg-indigo-700",
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                          )}
                        >
                          <item.icon
                            className={classNames(
                              pathname == item.href
                                ? "text-white"
                                : "text-indigo-200 group-hover:text-white",
                              "h-6 w-6 shrink-0"
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </section>
        <main className="min-h-full py-10 pl-72">{children}</main>
      </body>
    </html>
  );
}
