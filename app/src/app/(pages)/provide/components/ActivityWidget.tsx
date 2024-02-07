/**
 * Shows a github-like 'contributions' chart.
 *
 * A 1-d array of boxes where a more saturated colour indicates more activity
 * on that day.
 */

import { TimeseriesEntry } from "@/app/_lib/types";
import moment from "moment";
import { useState } from "react";

// How many days of data do we want to show in this widget?
export const NUM_DAYS = 7;

type ActivityWidgetProps = {
  data: TimeseriesEntry[];
  maxValue?: number; // Use this to set the 'max' value across multiple ActivityWidget instances
};

export default function ActivityWidget({
  data,
  maxValue,
}: ActivityWidgetProps) {
  const [tooltipEntry, setTooltipEntry] = useState<TimeseriesEntry>();

  if (!data || data.length == 0) {
    return (
      <div className="w-36 h-5 flex flex-row gap-1 justify-end">
        {Array(NUM_DAYS)
          .fill(0)
          .map(() => (
            <div className="w-4 h-full bg-gray-400 cursor-pointer rounded-sm" />
          ))}
      </div>
    );
  }

  const max = maxValue || Math.max(...data.map((entry) => Number(entry.value)));

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
      {data.map((entry) => (
        <div
          key={`${entry.date}-${entry.value}`}
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
