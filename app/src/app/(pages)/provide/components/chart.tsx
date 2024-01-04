import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Tooltip,
} from "recharts";

type ChartProps = {
  data: Array<any>;
};

export default function Chart({ data }: ChartProps) {
  const formattedData = Object.entries(data).map(([key, value]) => ({
    date: key,
    value: value,
  }));
  debugger;

  return (
    <>
      <ResponsiveContainer width="100%">
        <BarChart data={formattedData}>
          <Tooltip />
          <Bar dataKey="value" fill="#818cf8" />
          <XAxis dataKey="date" />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
