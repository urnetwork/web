"use client";

import Sidebar from "./components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="py-10 px-4 md:pl-16 lg:pl-80">{children}</main>
    </>
  );
}
