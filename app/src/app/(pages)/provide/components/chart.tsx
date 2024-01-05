import {
  ResponsiveContainer,
  XAxis,
  BarChart as ReBarChart,
  AreaChart,
  Area,
  Bar,
  Tooltip,
  TooltipProps,
} from "recharts";
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import moment from "moment";
import { useState } from "react";
import { Timeseries } from "@/app/_lib/types";

type BarChartProps = {
  name: string;
  unit?: string;
  data: Timeseries;
};

/**
 * Take timeseries data as it arrives from the API:
 * {
 *  "yyyy-mm-dd1": 0,
 *  "yyyy-mm-dd2": 0,
 * }
 *
 * and convert it into the format required by the charting library:
 * [
 *  {
 *     date: "yyyy-mm-dd",
 *     value: 0,
 *  },
 * ]
 *
 * This function also sorts the data chronologically by date.
 */
function formatData(data: Timeseries) {
  return Object.entries(data)
    .map(([key, value]) => ({
      date: key,
      value: value,
    }))
    .toSorted((a, b) => {
      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);

      if (dateA == dateB) {
        return 0;
      } else if (dateA > dateB) {
        return 1;
      } else {
        return -1;
      }
    });
}

export function BarChart({ name, unit, data }: BarChartProps) {
  const [tooltipPostion, setTooltipPosition] = useState({ x: 0, y: 0 });
  const formattedData = formatData(data);

  const formatDate = (date: string): string => {
    return moment(date).format("MMM Do");
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className=" bg-gray-600 rounded-md p-2 border border-gray-700 shadow-sm">
          <div className="flex flex-col gap-y-2 items-stretch">
            <p className="text-gray-200 text-xs pl-2">{label}</p>
            <div className="bg-gray-700 shadow-inner rounded-md p-2 text-gray-50 text-sm">
              <p>
                {name}
                &emsp;
                <span className="font-semibold">{payload[0].value}</span>{" "}
                <span className="text-xs">{unit}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <ResponsiveContainer width="100%">
        <ReBarChart data={formattedData}>
          <Tooltip
            cursor={false}
            position={tooltipPostion}
            wrapperStyle={{ zIndex: 99 }}
            content={<CustomTooltip />}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar
            dataKey="value"
            fill="#818cf8"
            activeBar={{ fill: "#4f46e5" }}
            onMouseOver={(data) => {
              setTooltipPosition({ x: data.x, y: data.y - 85 });
            }}
            cursor="pointer"
          />
          <XAxis dataKey="date" tickFormatter={formatDate} />
        </ReBarChart>
      </ResponsiveContainer>
    </>
  );
}
type PlainAreaChartProps = {
  data: Timeseries;
  color?: string;
};

export function PlainAreaChart({
  data,
  color = "#d1d5db",
}: PlainAreaChartProps) {
  const formattedData = formatData(data);

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          barCategoryGap={2}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Area
            dataKey="value"
            fill={color}
            fillOpacity={0.7}
            stroke="false"
            cursor={"pointer"}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
