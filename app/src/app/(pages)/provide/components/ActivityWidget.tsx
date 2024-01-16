/**
 * Shows a github-like 'contributions' chart.
 *
 * A 1-d array of boxes where a more saturated colour indicates more activity
 * on that day.
 */

import moment, { min } from "moment";
import { useState } from "react";

type ActivityWidgetProps = {};

export default function ActivityWidget({}: ActivityWidgetProps) {
  // Scale factor to convert between dates, and pixel widths
  const [showTooltip, setShowTooltip] = useState(false);

  const handleShowTooltip = () => {};
  const hideTooltip = () => {};

  const calculateColor = (value: number) => {
    const percent = value / 7;
    const maxLightness = 0.9;
    const minLightness = 0.4;
    const lightness =
      100 * (percent * (maxLightness - minLightness) + minLightness);

    return `hsl(225, 70%, ${lightness}%)`;
  };

  return (
    <div className="w-36 h-5 flex flex-row gap-1 justify-end">
      {Array(7)
        .fill(0)
        .map((item, index) => (
          <div
            className="w-4 h-full cursor-pointer rounded-sm"
            style={{ backgroundColor: calculateColor(index) }}
          ></div>
        ))}
    </div>
  );
}
