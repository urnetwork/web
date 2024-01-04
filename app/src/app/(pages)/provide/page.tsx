"use client";

import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { getStatsProvidersOverviewLast90 } from "@lib/api";
import { useState } from "react";

type HeaderItem = {
  name: string;
  key: string;
  pre_unit?: string;
  unit?: string;
  helpText?: string;
};

const headerItems: Array<HeaderItem> = [
  {
    name: "Data transferred",
    key: "transfer_data",
    unit: "GiB",
  },
  {
    name: "Income",
    key: "payout",
    pre_unit: "$",
  },
  {
    name: "Uptime",
    key: "uptime",
    unit: "hours",
  },
  {
    name: "Searches",
    key: "search_interest",
  },
  {
    name: "Devices",
    key: "clients",
  },
];

export default function Page() {
  const [activeStat, setActiveStat] = useState("transfer_data");

  const { isPending, data: stats } = useQuery({
    queryKey: ["stats", "providers", "overviewLast90"],
    queryFn: async () => await getStatsProvidersOverviewLast90(),
  });

  const getStatToday = (key: string) => {
    if (stats && stats[key]) {
      return stats[key]["2024-01-04"];
    }
    return "";
  };

  return (
    <>
      <div className="md:mt-12 p-4 max-w-3xl">
        <div className="flex flex-row justify-between items-end mb-8">
          <h1>Provide</h1>
        </div>

        {isPending && <Loading />}

        {!isPending && (
          <div className="flex flex-col gap-y-8">
            {/* Header showing stats */}
            <div className="statsBar">
              <p className="text-sm text-gray-400 font-semibold mb-2">
                Past 24 hours
              </p>
              <div className="flex flex-row w-full gap-2">
                {headerItems.map((item) => {
                  return (
                    <>
                      <div
                        onClick={() => {
                          setActiveStat(item.key);
                        }}
                        className={`w-1/${
                          headerItems.length || 1
                        } flex flex-col gap-y-2 justify-between items-start border py-2 px-3 rounded-md cursor-pointer hover:border-indigo-600 shadow-md ${
                          activeStat == item.key
                            ? "border-indigo-600 border-2"
                            : "border-gray-300"
                        }`}
                      >
                        <h3
                          className={`text-sm text-gray-500 ${
                            activeStat == item.key
                              ? "font-semibold text-indigo-600"
                              : ""
                          }`}
                        >
                          {item.name}
                        </h3>
                        <p>
                          <span
                            className={`text-2xl font-semibold ${
                              activeStat == item.key
                                ? "text-indigo-600"
                                : "text-gray-800"
                            }`}
                          >
                            {item.pre_unit}
                            {getStatToday(item.key)}
                          </span>{" "}
                          <span
                            className={`text-sm ${
                              activeStat == item.key
                                ? "text-indigo-600"
                                : "text-gray-500"
                            }`}
                          >
                            {item.unit}
                          </span>
                        </p>
                      </div>
                    </>
                  );
                })}
              </div>
            </div>

            {/* 90 Day chart */}
            <div className="statsChart">
              <p className="text-sm text-gray-400 font-semibold mb-2">
                Past 90 days
              </p>
              <div className="w-full h-64 bg-gray-100"></div>
            </div>
            <div className="devices">
              <h2 className="mb-2">Devices</h2>
              <div className="w-full h-64 bg-gray-100"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
