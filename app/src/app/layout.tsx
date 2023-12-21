"use client";

import { redirect, usePathname } from "next/navigation";
import "./globals.css";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("?")[0];
  const isLoggedIn = true;

  if (!isLoggedIn && pathname != "/") {
    redirect("/");
  }

  if (isLoggedIn && pathname == "/") {
    redirect("/devices");
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
    <html lang="en" className="text-gray-900">
      <body className="bg-white">{children}</body>
    </html>
  );
}
