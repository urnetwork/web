"use client";

import { useSearchParams } from "next/navigation";
import DeviceDetail from "./components/DeviceDetail";
import DeviceList from "./components/DeviceList";

export default function Page() {
  // This is somewhat of a hack. NextJS static sites don't like dynamic URLS so instead of
  // /devices/[client_id] we use the route /devices?client_id=[client_id] to show the client
  // detail page
  const queryParams = useSearchParams();
  const clientId = queryParams.get("client_id");

  if (clientId) {
    return <DeviceDetail clientId={clientId} />;
  }

  return <DeviceList />;
}
