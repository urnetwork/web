"use client";

import { redirect, usePathname, useSearchParams } from "next/navigation";
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getJwt, postAuthCodeLogin, removeJwt } from "@lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("?")[0];
  const queryParams = useSearchParams();
  const authParam = queryParams.get("auth");
  const isLoggedIn = Boolean(getJwt());
  const router = useRouter();

  // Remove "auth" query paramter if it exists
  const queryParamsWithoutAuth = new URLSearchParams(queryParams);
  queryParamsWithoutAuth.delete("auth");

  useEffect(() => {
    if (!authParam && !isLoggedIn) {
      // User needs to log in
      redirect("https://bringyour.com?auth");
    }

    async function handleAuth() {
      if (!authParam) {
        return;
      }

      try {
        const result = await postAuthCodeLogin(authParam);
        localStorage.setItem("byJwt", result.auth_jwt);
      } catch (e: any) {
        removeJwt();
        router.push("https://bringyour.com?auth");
      }
    }

    handleAuth();
    // Redirect to URL without ?auth param
    router.push(`${pathname}?${queryParamsWithoutAuth}`);
  }, [authParam]);

  if (isLoggedIn && pathname == "/") {
    // Hard refresh to /devices page
    if (typeof window !== "undefined") {
      window.location.href = "/devices";
    }
  }

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
