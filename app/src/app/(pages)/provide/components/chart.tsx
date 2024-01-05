import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Rectangle,
  BarChart,
  Bar,
  Tooltip,
} from "recharts";
import moment from "moment";
import { useState } from "react";

type ChartProps = {
  name: string;
  unit: string;
  data: Array<any>;
};

export default function Chart({ name, unit, data }: ChartProps) {
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const formattedData = Object.entries(data)
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

  const formatDate = (date: string): string => {
    return moment(date).format("MMM Do");
  };

  const CustomTooltip = ({ active, payload, label }) => {
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

  const onMouseEnter = (e) => {
    const tooltipHeight = 85; // assumes height of tooltip is fixed
    setTooltipPosition({ x: e.x, y: e.y - tooltipHeight });
  };

  return (
    <>
      <ResponsiveContainer width="100%">
        <BarChart data={formattedData}>
          <Tooltip
            cursor={false}
            position={tooltipPosition}
            wrapperStyle={{ zIndex: 99 }}
            content={<CustomTooltip />}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar
            dataKey="value"
            fill="#818cf8"
            activeBar={{ fill: "#4f46e5" }}
            onMouseEnter={onMouseEnter}
            cursor="pointer"
          />
          <XAxis dataKey="date" tickFormatter={formatDate} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
