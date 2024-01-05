"use client";

import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { getStatsProvidersOverviewLast90 } from "@lib/api";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Listbox } from "@headlessui/react";
import { BarChart, PlainAreaChart } from "./components/chart";

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
  const [selectedStat, setSelectedStat] = useState(headerItems[0]);

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

  const getStatAllTime = (key: string) => {
    if (stats && stats[key]) {
      return stats[key];
    }
    return [];
  };

  return (
    <>
      <div className="md:mt-12 p-4 max-w-5xl">
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
                    <div
                      key={`header-${item.key}`}
                      onClick={() => {
                        setSelectedStat(item);
                      }}
                      className={`w-1/5 flex flex-col gap-0 border rounded-md overflow-hidden cursor-pointer hover:border-indigo-600 shadow-md ${
                        selectedStat.key == item.key
                          ? "border-indigo-600 border-2"
                          : "border-gray-300"
                      }`}
                    >
                      <div className="z-10 relative flex flex-col grow gap-y-2 justify-between items-start py-2 px-3">
                        <h3
                          className={`text-sm text-gray-500 ${
                            selectedStat.key == item.key
                              ? "font-semibold text-indigo-600"
                              : ""
                          }`}
                        >
                          {item.name}
                        </h3>
                        <p>
                          <span
                            className={`text-2xl font-semibold ${
                              selectedStat.key == item.key
                                ? "text-indigo-600"
                                : "text-gray-800"
                            }`}
                          >
                            {item.pre_unit}
                            {getStatToday(item.key)}
                          </span>{" "}
                          <span
                            className={`text-sm ${
                              selectedStat.key == item.key
                                ? "text-indigo-600"
                                : "text-gray-500"
                            }`}
                          >
                            {item.unit}
                          </span>
                        </p>
                      </div>
                      <div className="z-1 relative h-12 -mt-4 w-full">
                        <PlainAreaChart
                          data={getStatAllTime(item.key)}
                          color={
                            selectedStat.key == item.key ? "#c7d2fe" : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 90 Day chart */}
            <div className="statsChart">
              <p className="text-sm text-gray-400 font-semibold mb-2">
                Past 90 days
              </p>
              <div className="w-full h-72 p-4 pt-16 relative bg-gray-100 rounded-md">
                <BarChart
                  name={selectedStat.name}
                  unit={selectedStat.unit}
                  data={getStatAllTime(selectedStat.key)}
                />
                {/* Select item to choose graph type */}
                <Listbox value={selectedStat} onChange={setSelectedStat}>
                  <Listbox.Button className="z-10 absolute cursor-pointer top-4 left-4 bg-gray-200 flex flex-row gap-2 items-center pl-3 pr-2 py-1 rounded-full text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-300">
                    <p className="text-sm">{selectedStat.name}</p>
                    <ChevronDownIcon className="w-5 h-5" />
                  </Listbox.Button>
                  <Listbox.Options className="absolute top-14 left-6 flex flex-col bg-gray-50 divide-y text-sm rounded-md p-2 shadow-md border-gray-300 border">
                    {headerItems.map((item) => (
                      <Listbox.Option
                        key={`graph-select-${item.key}`}
                        value={item}
                        className={`cursor-pointer px-2 py-1  hover:text-indigo-600 ${
                          selectedStat.key == item.key
                            ? "text-indigo-600"
                            : "text-gray-500"
                        }`}
                      >
                        {item.name}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Listbox>
              </div>
            </div>
            <div className="devices">
              <h2 className="mb-2">Devices</h2>
              <div className="w-full h-64 bg-gray-100 rounded-md"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
