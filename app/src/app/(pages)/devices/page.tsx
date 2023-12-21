"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";

async function getData() {
  let byJwt = null;
  if (typeof window != "undefined") {
    byJwt = localStorage.getItem("byJwt");
  }

  if (!byJwt) {
    return;
  }

  const result = await fetch("http://test.bringyour.com/network/clients", {
    headers: {
      Authorization: `Bearer ${byJwt}`,
    },
  });

  if (!result.ok) {
    throw new Error("Failed to fetch");
  }
  return result.json();
}

export default function Page() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    getData().then((data) => {
      if (data) {
        setClients(data.clients);
      }
    });
  }, []);

  return (
    <>
      <div className="mt-12 p-4 max-w-3xl">
        <div className="flex flex-row justify-between items-end mb-8">
          <h1>Your Devices</h1>
          <button className="button btn-primary">
            <div className="flex flex-row gap-2 items-center">
              <PlusIcon className="w-5 h-4 text-white font-semibold" />
              <p className="font-light">Add device</p>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {clients.map((client) => {
            return (
              <div
                key={client.client_id}
                className="border border-gray-300 bg-gray-100 rounded-md p-4 flex flex-row gap-4 items-center cursor-pointer hover:border-primary"
              >
                <div className="w-8 h-8">
                  <DevicePhoneMobileIcon className="text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <p className="text-gray-800 font-semibold">
                    {client.client_id}
                  </p>
                  <p className="text-sm text-gray-600">{client.description}</p>
                </div>

                <div className="flex-grow" />
                <div className="flex flex-row gap-2 items-center">
                  {client.connections && client.connections.length > 0 && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-ok"></div>
                      <div className="text-xs text-gray-500">Connected</div>
                    </>
                  )}
                  {!client.connections && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <div className="text-xs text-gray-500">Disonnected</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
