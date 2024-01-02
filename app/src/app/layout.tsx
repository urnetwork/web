"use client";

import "./globals.css";
import { redirect, usePathname, useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LOGIN_URL, getJwt, postAuthCodeLogin, removeJwt } from "@lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("?")[0];
  const queryParams = useSearchParams();
  const authParam = queryParams.get("auth_code");
  const isLoggedIn = Boolean(getJwt());
  const router = useRouter();

  // Remove "auth_code" query paramter if it exists
  const queryParamsWithoutAuth = new URLSearchParams(queryParams);
  queryParamsWithoutAuth.delete("auth_code");

  useEffect(() => {
    /**
     * Route the user to the correct place, depending on whether they are logged in (i.e. have a
     * JWT token in localstorage), or have provided an ?auth_code= URL parameter.
     *
     * If the user has a JWT token, and provides a new ?auth_code=, use the code to fetch a new JWT.
     */
    if (!authParam && !isLoggedIn) {
      // User needs to log in
      redirect(LOGIN_URL);
    }

    if (!authParam && isLoggedIn && pathname == "/") {
      redirect("/devices");
    }

    if (!authParam) {
      return;
    }

    async function handleAuthParam(authParam: string) {
      try {
        const result = await postAuthCodeLogin(authParam);
        localStorage.setItem("byJwt", result.by_jwt);
      } catch (e: any) {
        alert("Failed to log in. Please try again.");
        removeJwt();
        router.push(LOGIN_URL);
      }
    }
    handleAuthParam(authParam);

    router.push(`${pathname}?${queryParamsWithoutAuth}`);
  }, [authParam]);

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
