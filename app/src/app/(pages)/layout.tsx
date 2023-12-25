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
      <main className="py-10 px-4 lg:pl-72">{children}</main>
    </>
  );
}
