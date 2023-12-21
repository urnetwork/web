"use client";

import { redirect, usePathname } from "next/navigation";

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

  return (
    <html lang="en" className="text-gray-900">
      <body className="bg-white">{children}</body>
    </html>
  );
}
