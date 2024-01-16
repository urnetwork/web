/**
 * Shows a github-like 'contributions' chart.
 *
 * A 1-d array of boxes where a more saturated colour indicates more activity
 * on that day.
 */

import { Timeseries } from "@/app/_lib/types";
import { formatTimeseriesData } from "@/app/_lib/utils";
import moment, { min } from "moment";
import { useState } from "react";

type ActivityWidgetProps = {
  data: {
    client_id: string;
    transfer_data: Timeseries;
  };
  maxValue: number; // Use this to set the 'max' value across multiple ActivityWidget instances
};

export default function ActivityWidget({
  data,
  maxValue,
}: ActivityWidgetProps) {
  // Scale factor to convert between dates, and pixel widths
  const [showTooltip, setShowTooltip] = useState(false);
  const handleShowTooltip = () => {};
  const hideTooltip = () => {};

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

  const formattedData = formatTimeseriesData(data.transfer_data);
  const max =
    maxValue || Math.max(...formattedData.map((entry) => Number(entry.value)));

  const calculateColor = (value: number) => {
    const percent = value / max;
    const maxLightness = 0.9;
    const minLightness = 0.4;
    const lightness =
      100 * (percent * (maxLightness - minLightness) + minLightness);

    return `hsl(225, 70%, ${lightness}%)`;
  };

  return (
    <div className="w-36 h-5 flex flex-row gap-1 justify-end">
      {formattedData.map((entry) => (
        <div
          className="w-4 h-full cursor-pointer rounded-sm"
          style={{ backgroundColor: calculateColor(Number(entry.value)) }}
        ></div>
      ))}
    </div>
  );
}
