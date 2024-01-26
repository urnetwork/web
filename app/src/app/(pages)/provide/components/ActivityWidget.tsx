/**
 * Shows a github-like 'contributions' chart.
 *
 * A 1-d array of boxes where a more saturated colour indicates more activity
 * on that day.
 */

import { Timeseries, TimeseriesEntry } from "@/app/_lib/types";
import { formatTimeseriesData } from "@/app/_lib/utils";
import moment from "moment";
import { useState } from "react";

type ActivityWidgetProps = {
  data: {
    client_id: string;
    transfer_data: Timeseries;
  };
  maxValue?: number; // Use this to set the 'max' value across multiple ActivityWidget instances
};

export default function ActivityWidget({ data }: ActivityWidgetProps) {
  const [tooltipEntry, setTooltipEntry] = useState<TimeseriesEntry>();

  if (
    !data ||
    !data.transfer_data ||
    Object.keys(data.transfer_data).length === 0
  ) {
    return (
      <div className="w-36 h-5 flex flex-row gap-1 justify-end">
        {Array(7)
          .fill(0)
          .map(() => (
            <div className="w-4 h-full bg-gray-400 cursor-pointer rounded-sm" />
          ))}
      </div>
    );
  }

  const formattedData = formatTimeseriesData(data.transfer_data).slice(-7);
  const max = Math.max(...formattedData.map((entry) => Number(entry.value)));

  const calculateColor = (value: number) => {
    const normedValue = value / max;
    const maxLightness = 0.4; // lightness for the largest value
    const minLightness = 0.9; // lightness for the smallest value
    const lightnessPercentage =
      100 * (normedValue * (maxLightness - minLightness) + minLightness);

    return `hsl(225, 70%, ${lightnessPercentage}%)`;
  };

  return (
    <div className="w-36 h-5 flex flex-row gap-1 justify-end">
      {formattedData.map((entry) => (
        <div
          className="relative w-4 h-full cursor-pointer rounded-sm hover:border-2 border-indigo-900"
          style={{ backgroundColor: calculateColor(Number(entry.value)) }}
          onMouseEnter={() => setTooltipEntry(entry)}
          onMouseLeave={() => setTooltipEntry(undefined)}
        >
          {tooltipEntry && tooltipEntry.date === entry.date && (
            <div
              id="tooltip"
              className={
                "absolute whitespace-nowrap min-w-20 z-20 bg-gray-600 text-gray-100 border border-gray-800 p-2 rounded-md bottom-6 -left-8"
              }
            >
              <div className="text-xs flex flex-col gap-1">
                <p>{moment(tooltipEntry.date).format("YYYY-MM-DD")}</p>
                <p className="font-medium">
                  Data:{" "}
                  {typeof tooltipEntry.value == "number"
                    ? tooltipEntry.value.toPrecision(4)
                    : tooltipEntry.value}{" "}
                  GiB
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
