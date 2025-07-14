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
import { Dispatch, SetStateAction, useState } from "react";
import { Timeseries } from "@/app/_lib/types";
import { formatTimeseriesData } from "@/app/_lib/utils";

type BarChartProps = {
  name: string;
  pre_unit?: string;
  unit?: string;
  data: Timeseries;
  syncId?: string;
  tooltipStyle?: "normal" | "simple";
  showTooltip?: boolean;
  setShowTooltip?: Dispatch<SetStateAction<boolean>>;
};

export function BarChart({
  name,
  pre_unit,
  unit,
  data,
  syncId,
  tooltipStyle = "normal",
  showTooltip,
  setShowTooltip,
}: BarChartProps) {
  const [tooltipPostion, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [_isTooltipVisible, _setIsTooltipVisible] = useState(false);
  const isTooltipVisible = showTooltip || _isTooltipVisible;
  const setIsTooltipVisible = setShowTooltip || _setIsTooltipVisible;

  const formattedData = formatTimeseriesData(data);

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
                <span className="font-semibold">
                  {pre_unit}
                  {typeof payload[0].value == "number"
                    ? payload[0].value.toPrecision(4)
                    : payload[0].value}
                </span>{" "}
                <span className="text-xs">{unit}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  const SimpleTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-50 rounded-md p-2 border border-gray-300 shadow-sm">
          <div className="flex flex-col gap-y-1 items-stretch">
            <p className="text-gray-500 text-xs pl-1">{label}</p>
            <div className="bg-gray-200 shadow-inner rounded-md p-1 text-gray-600 text-sm">
              <p>
                {name}
                &emsp;
                <span className="font-semibold">
                  {pre_unit}
                  {typeof payload[0].value == "number"
                    ? payload[0].value.toPrecision(4)
                    : payload[0].value}
                </span>{" "}
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
        <ReBarChart data={formattedData} syncId={syncId}>
          <Tooltip
            active={isTooltipVisible}
            wrapperStyle={{ zIndex: 15 }}
            position={{ y: -20 }}
            content={
              tooltipStyle == "simple" ? <SimpleTooltip /> : <CustomTooltip />
            }
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar
            dataKey="value"
            fill="#818cf8"
            activeBar={{ fill: "#4f46e5" }}
            onMouseEnter={(event) => {
              setIsTooltipVisible(true);
            }}
            onMouseLeave={() => setIsTooltipVisible(false)}
            cursor="pointer"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            fontSize={"0.8rem"}
          />
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
  const formattedData = formatTimeseriesData(data);

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
