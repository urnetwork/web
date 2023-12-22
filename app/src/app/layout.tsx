"use client";

import { redirect, usePathname } from "next/navigation";
import "./globals.css";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getJwt } from "./_lib/api";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("?")[0];
  let isLoggedIn = Boolean(getJwt());

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

  // Set up Tanstack Query
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="en" className="text-gray-900">
        <body className="bg-white">{children}</body>
      </html>
    </QueryClientProvider>
  );
}
