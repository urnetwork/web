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
import moment from "moment";

type ChartProps = {
  data: Array<any>;
};

export default function Chart({ data }: ChartProps) {
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

  return (
    <>
      <ResponsiveContainer width="100%">
        <BarChart data={formattedData}>
          <Tooltip />
          <Bar dataKey="value" fill="#818cf8" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
